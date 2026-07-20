#!/usr/bin/env python3
"""Motor de jogo Aviator compartilhado (tempo real para todos os clientes)."""
from __future__ import annotations

import math
import queue
import random
import string
import threading
import time
from typing import Any, Callable, Dict, List, Optional

try:
    import wallet_bridge as wb
except ImportError:
    wb = None

GOLD_MULTIPLE = 100
BET_TIME_MS = 5000
FRAME_MS = 0.1
INITIAL_GOLD = 10_000_000
ENDING_DELAY_S = 3.0

ServerMethod_Login = 1
ServerMethod_Gamble = 1001
ServerMethod_Frame = 1002
ServerMethod_CancelBetGamble = 2002
ServerMethod_GameEnd = 2003
ServerMethod_GameStart = 2004
ServerMethod_ChangeHeadIcon = 2005
ServerMethod_NotifyChatList = 2006
ServerMethod_LikeChat = 2007
ServerMethod_ChatHistory = 2008
ServerMethod_PING = 29

GS_BETTING = 1
GS_PLAYING = 2
GS_ENDING = 3

BOT_NAMES = [
    "Player***", "Lucky***", "Win***", "Ace***", "Pro***",
    "Star***", "King***", "Max***", "Top***", "Bet***",
]


def _now_ms() -> int:
    return int(time.time() * 1000)


def _rand_str(n: int = 20) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choice(chars) for _ in range(n))


def _calc_mul(elapsed_ms: float) -> int:
    return max(100, int(100 * math.exp(0.00008 * elapsed_ms)))


def _flight_ms_for_crash(crash_mul: int) -> float:
    """Tempo de voo até atingir o multiplicador de crash (inverso de _calc_mul)."""
    target = max(100, int(crash_mul or 100))
    if target <= 100:
        return 0.0
    return math.log(target / 100.0) / 0.00008


def _game_state_label(state: int) -> str:
    if state == GS_BETTING:
        return "Apostas"
    if state == GS_PLAYING:
        return "Voando"
    if state == GS_ENDING:
        return "Encerrando"
    return "—"


def _bet_key(bet: dict) -> str:
    return f"{bet.get('userid')}_{bet.get('betId')}"


def _public_bet(bet: dict) -> dict:
    return {
        "userid": bet.get("userid"),
        "name": bet.get("name"),
        "betId": bet.get("betId"),
        "betUsd": int(bet.get("betUsd") or 0),
        "coUsd": int(bet.get("coUsd") or 0),
        "coRate": int(bet.get("coRate") or 0),
        "iocn": str(bet.get("iocn") or "1"),
    }


class LiveGame:
    def __init__(
        self,
        *,
        get_crash: Callable[[Optional[int]], dict],
        save_history: Callable[[dict], Any],
        notify_discord: Optional[Callable[[dict], Any]] = None,
        save_chat: Optional[Callable[[dict], dict]] = None,
        like_chat: Optional[Callable[[dict], dict]] = None,
        list_chat: Optional[Callable[..., dict]] = None,
        list_history: Optional[Callable[..., dict]] = None,
    ):
        self.get_crash = get_crash
        self.save_history = save_history
        self.notify_discord = notify_discord
        self.save_chat = save_chat
        self.like_chat = like_chat
        self.list_chat = list_chat
        self.list_history = list_history

        self.lock = threading.RLock()
        self.subscribers: List[dict] = []  # {queue, user_id}
        self.players: Dict[str, dict] = {}

        self.round_id = 8273700
        self.game_state = GS_BETTING
        self.bet_start_time = _now_ms()
        self.fly_start_time = 0
        self.ending_start_time = 0
        self.round_started_at = None
        self.current_mul = 100
        self.crash_mul = 200
        self.server_seed = _rand_str(20)
        self.his_muls: List[dict] = []
        self.last_bet_info: List[dict] = []
        self.player_bets: Dict[str, dict] = {}  # f"{userId}:{betId}" -> bet
        self.bot_bets: List[dict] = []
        self.announced_bet_keys = set()
        self.announced_cashout_keys = set()
        self.chat_id = 1
        self._started = False
        self._thread: Optional[threading.Thread] = None

    # ── subscribers ──────────────────────────────────────────────

    def subscribe(self, user_id: str = "") -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=200)
        with self.lock:
            self.subscribers.append({"queue": q, "user_id": str(user_id or "")})
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        with self.lock:
            self.subscribers = [s for s in self.subscribers if s["queue"] is not q]

    def _broadcast(self, action: int, payload: dict, only_user: Optional[str] = None) -> None:
        msg = {"a": action, "p": payload}
        dead = []
        with self.lock:
            subs = list(self.subscribers)
        for sub in subs:
            if only_user and sub["user_id"] and sub["user_id"] != only_user:
                continue
            try:
                sub["queue"].put_nowait(msg)
            except queue.Full:
                dead.append(sub["queue"])
        for q in dead:
            self.unsubscribe(q)

    # ── players ──────────────────────────────────────────────────

    def ensure_player(
        self,
        user_id: str,
        nick_name: str = "",
        head_icon: str = "32",
        account_email: str = "",
    ) -> dict:
        uid = str(user_id or "guest&&demo")
        email = str(account_email or "").strip()
        with self.lock:
            p = self.players.get(uid)
            if not p:
                p = {
                    "userId": uid,
                    "nickName": nick_name or f"demo_{uid.split('&&')[0]}",
                    "headIcon": str(head_icon or "32").replace("av-", "").replace(".png", ""),
                    "gold": INITIAL_GOLD,
                    "accountEmail": email,
                }
                self.players[uid] = p
            else:
                if nick_name:
                    p["nickName"] = nick_name
                if head_icon:
                    p["headIcon"] = str(head_icon).replace("av-", "").replace(".png", "")
                if email:
                    p["accountEmail"] = email
            if wb and wb.wallet_enabled() and p.get("accountEmail"):
                bal = wb.fetch_balance(p["accountEmail"])
                if bal:
                    p["gold"] = int(bal.get("gold") or 0)
                    if bal.get("nickName"):
                        p["nickName"] = str(bal["nickName"])
            return dict(p)

    # ── lifecycle ────────────────────────────────────────────────

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        self._load_history()
        self._begin_round(first=True)
        self._thread = threading.Thread(target=self._loop, name="aviator-live", daemon=True)
        self._thread.start()
        print("[LIVE] Motor de jogo compartilhado iniciado")

    def _load_history(self) -> None:
        if not self.list_history:
            return
        try:
            data = self.list_history(27, 0)
            velas = data.get("velas") or []
            if not velas:
                return
            self.his_muls = [{"roundid": v["round_id"], "mul": v["crash_mul"]} for v in velas]
            last = max(v["round_id"] for v in velas)
            if last >= self.round_id:
                self.round_id = last + 1
            print(f"[LIVE] Histórico: {len(velas)} velas, próxima rodada #{self.round_id}")
        except Exception as exc:
            print(f"[LIVE] Falha ao carregar histórico: {exc}")

    def _begin_round(self, first: bool = False) -> None:
        with self.lock:
            if not first:
                self.round_id += 1
            self.game_state = GS_BETTING
            self.bet_start_time = _now_ms()
            self.fly_start_time = 0
            self.ending_start_time = 0
            self.current_mul = 100
            self.server_seed = _rand_str(20)
            self.player_bets.clear()
            self.bot_bets = []
            self.announced_bet_keys.clear()
            self.announced_cashout_keys.clear()
            try:
                nxt = self.get_crash(self.round_id)
                self.crash_mul = int(nxt.get("crashMul") or 200)
            except Exception as exc:
                print(f"[LIVE] RTP falhou: {exc}")
                try:
                    from rtp_config import generate_crash_entry

                    fallback = generate_crash_entry()
                    self.crash_mul = int(fallback.get("crashMul") or 200)
                except Exception:
                    self.crash_mul = 200
            for _ in range(random.randint(8, 18)):
                self.bot_bets.append(self._make_bot())
            self.round_started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            snap = self._history_payload("open")
            start_body = {
                "roundId": self.round_id,
                "betStartTime": self.bet_start_time,
                "gs": GS_BETTING,
                "serverSeed": self.server_seed,
            }
        try:
            self.save_history(snap)
        except Exception as exc:
            print(f"[LIVE] save open: {exc}")
        if self.notify_discord:
            try:
                self.notify_discord(
                    {
                        "type": "round_start",
                        "roundId": self.round_id,
                        "crashMul": self.crash_mul,
                        "crashX": f"{self.crash_mul / 100:.2f}",
                        "serverSeed": self.server_seed,
                        "startedAt": self.round_started_at,
                    }
                )
            except Exception:
                pass
        if not first:
            self._broadcast(ServerMethod_GameStart, {"body": start_body})

    def _make_bot(self) -> dict:
        max_target = max(110, min(self.crash_mul - 5, 800))
        return {
            "userid": f"bot{random.randint(1000, 99999)}&&demo",
            "betId": random.randint(1, 2),
            "betUsd": random.randint(1, 500) * GOLD_MULTIPLE,
            "name": random.choice(BOT_NAMES),
            "iocn": str(random.randint(1, 72)),
            "coUsd": 0,
            "coRate": 0,
            "targetCashout": random.randint(110, max_target),
            "removed": False,
            "isBot": True,
        }

    def _collect_active(self) -> List[dict]:
        bets = [b for b in self.bot_bets if not b.get("removed")]
        for b in self.player_bets.values():
            if not b.get("canceled") and not b.get("removed"):
                bets.append(b)
        return bets

    def _history_payload(self, status: str) -> dict:
        bets = []
        if status == "crashed":
            for b in self._collect_active():
                bets.append(
                    {
                        "userid": b.get("userid"),
                        "name": b.get("name"),
                        "betId": b.get("betId"),
                        "betUsd": int(b.get("betUsd") or 0),
                        "coUsd": int(b.get("coUsd") or 0),
                        "coRate": int(b.get("coRate") or 0),
                        "iocn": b.get("iocn") or "1",
                        "isBot": bool(b.get("isBot")),
                    }
                )
        return {
            "roundId": self.round_id,
            "crashMul": self.crash_mul,
            "crashX": round(self.crash_mul / 100, 2),
            "serverSeed": self.server_seed,
            "startedAt": self.round_started_at,
            "crashedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) if status == "crashed" else None,
            "status": status,
            "bets": bets,
        }

    def _push_frame(self, extra: Optional[dict] = None) -> None:
        all_bets = self._collect_active()
        cashed = [b for b in all_bets if int(b.get("coUsd") or 0) > 0]
        delta = []
        for bet in all_bets:
            key = _bet_key(bet)
            is_new = key not in self.announced_bet_keys
            is_co = int(bet.get("coUsd") or 0) > 0 and key not in self.announced_cashout_keys
            if is_new or is_co:
                delta.append(_public_bet(bet))
                self.announced_bet_keys.add(key)
                if int(bet.get("coUsd") or 0) > 0:
                    self.announced_cashout_keys.add(key)
        body = {
            "gs": self.game_state,
            "roundId": self.round_id,
            "maxMul": self.current_mul,
            "betInfo": delta,
            "delBetInfo": [],
            "PlayerCount": random.randint(120, 350),
            "currBetPlayer": len(all_bets),
            "outBetPlayer": len(cashed),
            "TotalCashOut": sum(int(b.get("coUsd") or 0) for b in cashed),
        }
        if extra:
            body.update(extra)
        self._broadcast(ServerMethod_Frame, {"body": body})

    def _cashout_player_bet(self, bet: dict, mul: int, player: dict) -> dict:
        win = int((bet["betUsd"] * mul) / GOLD_MULTIPLE)
        email = player.get("accountEmail") or ""
        if wb and wb.wallet_enabled() and email:
            credited = wb.credit(
                email,
                win,
                bet_id=int(bet.get("betId") or 0),
                round_id=self.round_id,
                bet_gold=int(bet.get("betUsd") or 0),
                cashout_multiplier=int(mul),
            )
            if not credited:
                return {"result": 0}
            player["gold"] = int(credited.get("gold") or player["gold"])
        else:
            player["gold"] = int(player["gold"]) + win
        bet["coUsd"] = win
        bet["coRate"] = mul
        self.players[player["userId"]]["gold"] = player["gold"]
        return {
            "result": 1,
            "userGold": player["gold"],
            "betUsd": bet["betUsd"],
            "winUsd": win,
            "cashMul": mul,
            "betId": bet["betId"],
        }

    def _process_auto_cashouts(self) -> None:
        for key, bet in list(self.player_bets.items()):
            if int(bet.get("coUsd") or 0) > 0:
                continue
            auto = int(bet.get("autoCashOut") or 0)
            if auto and self.current_mul >= auto:
                player = self.players.get(bet["userid"])
                if not player:
                    continue
                body = self._cashout_player_bet(bet, auto, player)
                self._broadcast(ServerMethod_Gamble, {"body": body}, only_user=bet["userid"])
        for bot in self.bot_bets:
            if int(bot.get("coUsd") or 0) > 0:
                continue
            target = int(bot.get("targetCashout") or random.randint(110, min(self.crash_mul - 5, 800)))
            if self.current_mul >= target:
                bot["coUsd"] = int((bot["betUsd"] * target) / GOLD_MULTIPLE)
                bot["coRate"] = target

    def _end_round(self) -> None:
        with self.lock:
            self.game_state = GS_ENDING
            self.ending_start_time = _now_ms()
            all_bets = self._collect_active()
            self.last_bet_info = [
                {
                    "betUsd": b.get("betUsd"),
                    "coUsd": b.get("coUsd") or 0,
                    "coRate": b.get("coRate") or 0,
                    "name": b.get("name"),
                    "iocn": b.get("iocn"),
                }
                for b in all_bets
            ]
            self.his_muls.insert(0, {"roundid": self.round_id, "mul": self.crash_mul})
            self.his_muls = self.his_muls[:50]
            snap = self._history_payload("crashed")
            end_common = {
                "roundId": self.round_id,
                "LastBetInfo": self.last_bet_info,
                "betStartTime": self.bet_start_time,
                "maxMul": self.crash_mul,
                "gs": GS_ENDING,
            }
            players_snapshot = {uid: dict(p) for uid, p in self.players.items()}

        try:
            self.save_history(snap)
        except Exception as exc:
            print(f"[LIVE] save crash: {exc}")
        if wb and wb.wallet_enabled():
            for key, bet in list(self.player_bets.items()):
                if bet.get("isBot"):
                    continue
                if int(bet.get("coUsd") or 0) > 0:
                    continue
                email = bet.get("accountEmail") or ""
                uid = bet.get("userid") or ""
                if not email:
                    p = players_snapshot.get(uid) or {}
                    email = p.get("accountEmail") or ""
                if email:
                    wb.record_loss(
                        email,
                        int(bet.get("betUsd") or 0),
                        bet_id=int(bet.get("betId") or 0),
                        round_id=snap["roundId"],
                    )
        if self.notify_discord:
            try:
                self.notify_discord(
                    {
                        "type": "crash",
                        "roundId": snap["roundId"],
                        "crashMul": snap["crashMul"],
                        "crashX": f"{snap['crashX']:.2f}",
                        "serverSeed": snap["serverSeed"],
                        "startedAt": snap["startedAt"],
                        "crashedAt": snap["crashedAt"],
                        "bets": snap["bets"],
                    }
                )
            except Exception:
                pass

        with self.lock:
            subs = list(self.subscribers)
        for sub in subs:
            uid = sub["user_id"]
            body = dict(end_common)
            body["userid"] = uid or ""
            body["userGold"] = players_snapshot.get(uid, {}).get("gold", INITIAL_GOLD)
            try:
                sub["queue"].put_nowait({"a": ServerMethod_GameEnd, "p": {"body": body}})
            except queue.Full:
                pass

        time.sleep(ENDING_DELAY_S)
        self._begin_round(first=False)

    def _loop(self) -> None:
        while True:
            should_end = False
            gs = GS_BETTING
            try:
                with self.lock:
                    gs = self.game_state
                    if gs == GS_BETTING:
                        if random.random() < 0.35 and len(self.bot_bets) < 30:
                            self.bot_bets.append(self._make_bot())
                        self._push_frame()
                        if _now_ms() - self.bet_start_time >= BET_TIME_MS:
                            self.game_state = GS_PLAYING
                            self.fly_start_time = _now_ms()
                            self.current_mul = 100
                            self._push_frame({"gs": GS_PLAYING, "maxMul": 100})
                    elif gs == GS_PLAYING:
                        elapsed = _now_ms() - self.fly_start_time
                        self.current_mul = min(_calc_mul(elapsed), self.crash_mul)
                        self._process_auto_cashouts()
                        self._push_frame()
                        if self.current_mul >= self.crash_mul:
                            should_end = True
                if should_end:
                    self._end_round()
                    continue
            except Exception as exc:
                print(f"[LIVE] tick error: {exc}")
            time.sleep(FRAME_MS)

    # ── RPC ──────────────────────────────────────────────────────

    def handle_rpc(
        self,
        server_code: int,
        data: dict,
        user_id: str,
        nick_name: str = "",
        head_icon: str = "32",
        account_email: str = "",
    ) -> dict:
        player = self.ensure_player(user_id, nick_name, head_icon, account_email)
        data = data or {}

        if server_code == ServerMethod_Login:
            return self._rpc_login(player)
        if server_code == ServerMethod_Gamble:
            return self._rpc_gamble(player, data)
        if server_code == ServerMethod_CancelBetGamble:
            return self._rpc_cancel(player, data)
        if server_code == ServerMethod_PING:
            return {"code": 0, "data": {"body": {"result": 1}}}
        if server_code == ServerMethod_ChangeHeadIcon:
            with self.lock:
                player["headIcon"] = str(data.get("headIcon") or "32").replace("av-", "").replace(".png", "")
                self.players[player["userId"]]["headIcon"] = player["headIcon"]
            return {"code": 0, "data": {"body": {"result": 1}}}
        if server_code == ServerMethod_ChatHistory:
            return self._rpc_chat_history(player)
        if server_code == ServerMethod_NotifyChatList:
            return self._rpc_chat_send(player, data)
        if server_code == ServerMethod_LikeChat:
            return self._rpc_chat_like(player, data)
        return {"code": 0, "data": {"body": {"result": 1}}}

    def get_timing_snapshot(self) -> dict:
        with self.lock:
            return {
                "round_id": int(self.round_id),
                "game_state": int(self.game_state),
                "game_state_label": _game_state_label(self.game_state),
                "crash_mul": int(self.crash_mul),
                "crash_x": round(self.crash_mul / 100, 2),
                "bet_start_time": int(self.bet_start_time or 0),
                "fly_start_time": int(self.fly_start_time or 0),
                "ending_start_time": int(self.ending_start_time or 0),
                "current_mul": int(self.current_mul),
                "server_time": _now_ms(),
            }

    def _build_context(self) -> dict:
        now = _now_ms()
        active = self._collect_active()
        return {
            "_gameStatus": self.game_state,
            "roundId": self.round_id,
            "betStartTime": self.bet_start_time or now,
            "serverSeed": self.server_seed,
            "serverTime": now,
            "playerCount": random.randint(120, 350),
            "currBetPlayer": len(active),
            "outBetPlayer": sum(1 for b in active if int(b.get("coUsd") or 0) > 0),
            "TotalCashOut": sum(int(b.get("coUsd") or 0) for b in active),
            "maxMul": self.current_mul if self.game_state == GS_PLAYING else 0,
            "lastMul": self.his_muls[0]["mul"] if self.his_muls else 234,
            "hisMuls": self.his_muls[:25],
            "curBetInfo": [_public_bet(b) for b in active],
            "LastBetInfo": self.last_bet_info,
        }

    def _rpc_login(self, player: dict) -> dict:
        import json as _json

        with self.lock:
            context = self._build_context()
            endtime = self.bet_start_time + BET_TIME_MS
            # If already flying/ending, Endtime in the past is fine
            return {
                "code": 0,
                "data": {
                    "body": {
                        "result": 1,
                        "Context": _json.dumps(context),
                        "Endtime": endtime,
                    },
                    "userid": player["userId"],
                    "NickName": player["nickName"],
                    "gold": player["gold"],
                    "headIcon": player["headIcon"],
                    "tableid": 1,
                    "token": "live-" + player["userId"],
                },
            }

    def _rpc_gamble(self, player: dict, data: dict) -> dict:
        play_type = int(data.get("playType") or 0)
        with self.lock:
            if play_type == 0:
                bet_usd = int(data.get("betUsd") or 0)
                bet_id = int(data.get("betId") or 1)
                if self.game_state != GS_BETTING:
                    return {"code": 0, "data": {"body": {"result": 0}}}
                email = player.get("accountEmail") or ""
                if wb and wb.wallet_enabled() and email:
                    debited = wb.debit(email, bet_usd, bet_id=bet_id, round_id=self.round_id)
                    if not debited:
                        return {"code": 0, "data": {"body": {"result": 0}}}
                    player["gold"] = int(debited.get("gold") or 0)
                else:
                    if player["gold"] < bet_usd:
                        return {"code": 0, "data": {"body": {"result": 0}}}
                    player["gold"] -= bet_usd
                self.players[player["userId"]]["gold"] = player["gold"]
                key = f"{player['userId']}:{bet_id}"
                self.player_bets[key] = {
                    "userid": player["userId"],
                    "betId": bet_id,
                    "betUsd": bet_usd,
                    "name": player["nickName"],
                    "iocn": player["headIcon"],
                    "coUsd": 0,
                    "coRate": 0,
                    "autoCashOut": int(data.get("coRate") or 0),
                    "canceled": False,
                    "removed": False,
                    "isBot": False,
                    "accountEmail": player.get("accountEmail") or "",
                }
                return {
                    "code": 0,
                    "data": {
                        "body": {
                            "result": 1,
                            "userGold": player["gold"],
                            "betUsd": bet_usd,
                            "betId": bet_id,
                        }
                    },
                }

            if play_type == 1:
                bet_id = int(data.get("betId") or 1)
                key = f"{player['userId']}:{bet_id}"
                bet = self.player_bets.get(key)
                if not bet or int(bet.get("coUsd") or 0) > 0 or self.game_state != GS_PLAYING:
                    return {"code": 0, "data": {"body": {"result": 0}}}
                body = self._cashout_player_bet(bet, self.current_mul, player)
                self.players[player["userId"]]["gold"] = player["gold"]
                return {"code": 0, "data": {"body": body}}

        return {"code": 0, "data": {"body": {"result": 0}}}

    def _rpc_cancel(self, player: dict, data: dict) -> dict:
        bet_id = int(data.get("betId") or 1)
        key = f"{player['userId']}:{bet_id}"
        with self.lock:
            bet = self.player_bets.get(key)
            if not bet or self.game_state != GS_BETTING:
                return {"code": 0, "data": {"body": {"result": 0}}}
            email = player.get("accountEmail") or ""
            bet_usd = int(bet["betUsd"])
            if wb and wb.wallet_enabled() and email:
                refunded = wb.refund(email, bet_usd, bet_id=bet_id, round_id=self.round_id)
                if not refunded:
                    return {"code": 0, "data": {"body": {"result": 0}}}
                player["gold"] = int(refunded.get("gold") or player["gold"])
            else:
                player["gold"] += bet_usd
            self.players[player["userId"]]["gold"] = player["gold"]
            del self.player_bets[key]
            return {
                "code": 0,
                "data": {"body": {"result": 1, "userGold": player["gold"], "betId": bet_id}},
            }

    def _rpc_chat_history(self, player: dict) -> dict:
        messages = []
        if self.list_chat:
            try:
                data = self.list_chat(70, player["userId"])
                messages = data.get("messages") or []
            except Exception as exc:
                print(f"[LIVE] chat history: {exc}")
        return {"code": 0, "data": {"body": {"result": 1, "chatMessages": messages}}}

    def _rpc_chat_send(self, player: dict, data: dict) -> dict:
        msg = {
            "id": 0,
            "messageId": 0,
            "message": str(data.get("message") or ""),
            "messageType": str(data.get("messageType") or "message"),
            "username": player["nickName"],
            "profileImage": f"av-{player['headIcon']}.png",
            "userId": player["userId"],
            "createDate": _now_ms(),
            "likes": {"isMeLiked": False, "usersLikesNumber": 0},
        }
        if self.save_chat:
            try:
                saved = self.save_chat(msg)
                msg = saved.get("message") or msg
            except Exception as exc:
                print(f"[LIVE] chat save: {exc}")
                with self.lock:
                    mid = self.chat_id
                    self.chat_id += 1
                msg["id"] = mid
                msg["messageId"] = mid
        else:
            with self.lock:
                mid = self.chat_id
                self.chat_id += 1
            msg["id"] = mid
            msg["messageId"] = mid

        body = {"result": 1, "chatMessages": [msg]}
        self._broadcast(ServerMethod_NotifyChatList, {"body": body})
        return {"code": 0, "data": {"body": body}}

    def _rpc_chat_like(self, player: dict, data: dict) -> dict:
        message_id = int(data.get("messageId") or data.get("id") or 0)
        blike = data.get("blike")
        if blike is None:
            blike = data.get("setLike")
        blike = bool(blike) if blike is not None else True
        likes_count = 0
        if self.like_chat:
            try:
                saved = self.like_chat(
                    {"messageId": message_id, "userId": player["userId"], "blike": blike}
                )
                likes_count = int(saved.get("usersLikesNumber") or 0)
            except Exception as exc:
                print(f"[LIVE] chat like: {exc}")
        body = {
            "result": 1,
            "messageId": message_id,
            "blike": blike,
            "usersLikesNumber": likes_count,
        }
        self._broadcast(ServerMethod_LikeChat, {"body": body})
        return {"code": 0, "data": {"body": body}}
