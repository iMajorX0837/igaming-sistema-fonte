#!/usr/bin/env python3
"""Servidor estático + Discord webhook + histórico via Supabase (sem SQLite local)."""
import json
import os
import random
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from game_live import (
    BET_TIME_MS,
    ENDING_DELAY_S,
    GS_BETTING,
    GS_ENDING,
    GS_PLAYING,
    LiveGame,
    _flight_ms_for_crash,
    _now_ms,
)
from rtp_config import (
    generate_crash_entry,
    get_queue_size,
    refresh_runtime,
    runtime_snapshot,
)

PORT = int(os.environ.get("PORT", "8000"))
AVIATOR_INTERNAL_SECRET = os.environ.get("AVIATOR_INTERNAL_SECRET", "").strip()
WEBHOOK_URL = os.environ.get(
    "DISCORD_WEBHOOK",
    "https://discord.com/api/webhooks/1525271167731105884/"
    "efF0ULxLSurZeMdJWtJ_4vszcBeUXN9ElfeOX7kVM98usxYSK_87JGsI3pX5oXp9CA-m",
)

# Ícones hashed do build Angular ficam em images/icons/,
# mas o bundle pede na raiz (ex.: /burger.xxx.svg).
ICON_DIR = os.path.join("images", "icons")

MAX_VELAS = 27
MAX_CHAT_MESSAGES = 200

_rtp_lock = threading.Lock()
_rtp_upcoming = []  # [{"crashMul": int, "crashX": float}, ...]
_rtp_current = None  # {"roundId", "crashMul", "crashX"} | None
_rtp_queue_version = ""

_chat_lock = threading.Lock()
_chat_messages = OrderedDict()  # message_id -> dict
_chat_likes = {}  # (message_id, user_id) -> bool
_next_message_id = 1

_round_lock = threading.Lock()
_round_cache = OrderedDict()  # round_id -> payload completo (fallback local)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def _sync_rtp_config(force=False):
    """Atualiza parâmetros do motor e invalida fila se RTP/GGR mudou."""
    global _rtp_queue_version
    cfg = refresh_runtime(force=force)
    version = str(cfg.get("engine_version") or cfg.get("version_key") or cfg.get("config_version") or "")
    if version and version != _rtp_queue_version:
        _rtp_queue_version = version
        _rtp_upcoming.clear()
    elif cfg.get("version_changed"):
        _rtp_queue_version = version
        _rtp_upcoming.clear()
    return cfg


def generate_crash_entry_local():
    """Gera entrada usando config fresca do motor."""
    cfg = _sync_rtp_config(force=True)
    return generate_crash_entry(cfg)


def _crash_entry(mul=None, tier=None, cfg=None):
    if mul is not None:
        crash_mul = int(mul)
        return {
            "crashMul": crash_mul,
            "crashX": round(crash_mul / 100, 2),
            "colorTier": tier or "low",
        }
    return generate_crash_entry(cfg)


def ensure_rtp_queue(force=False):
    cfg = _sync_rtp_config(force=force)
    target_size = get_queue_size()
    while len(_rtp_upcoming) < target_size:
        _rtp_upcoming.append(_crash_entry(cfg=cfg))


def invalidate_rtp_queue():
    with _rtp_lock:
        _rtp_upcoming.clear()
        ensure_rtp_queue(force=True)
    return {"ok": True, "cleared": True}


def _ms_to_iso(ms: int) -> str:
    if not ms:
        return ""
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _schedule_entry(
    *,
    index: int,
    round_id,
    crash_mul: int,
    crash_x: float,
    bet_start_ms: int,
    crash_at_ms: int,
    now_ms: int,
    status: str,
    phase: str,
    is_live: bool,
    queue_position=None,
):
    seconds_until = max(0, int(round((crash_at_ms - now_ms) / 1000)))
    return {
        "index": index,
        "round_id": round_id,
        "queue_position": queue_position,
        "crash_mul": crash_mul,
        "crash_x": crash_x,
        "bet_start_ms": bet_start_ms,
        "bet_start_at": _ms_to_iso(bet_start_ms),
        "crash_at_ms": crash_at_ms,
        "crash_at": _ms_to_iso(crash_at_ms),
        "seconds_until_crash": seconds_until,
        "status": status,
        "phase": phase,
        "is_live": is_live,
    }


def _iso_to_ms(value) -> int:
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        n = int(value)
        return n if n > 1_000_000_000_000 else n * 1000
    try:
        text = str(value).strip().replace("Z", "+00:00")
        return int(datetime.fromisoformat(text).timestamp() * 1000)
    except (TypeError, ValueError, OSError):
        return 0


def _past_entry_from_vela(vela: dict) -> dict:
    crash_mul = int(vela.get("crash_mul") or 0)
    crash_x = float(vela.get("crash_x") or (crash_mul / 100 if crash_mul else 0))
    round_id = int(vela.get("round_id") or 0)
    crashed_raw = vela.get("crashed_at") or vela.get("created_at") or ""
    crash_at_ms = _iso_to_ms(crashed_raw)
    crash_at = crashed_raw if isinstance(crashed_raw, str) and crashed_raw else _ms_to_iso(crash_at_ms)
    return {
        "round_id": round_id,
        "crash_mul": crash_mul,
        "crash_x": crash_x,
        "crash_at": crash_at,
        "crash_at_ms": crash_at_ms,
        "seconds_until_crash": 0,
        "status": "crashed",
        "phase": "Finalizada",
        "is_live": False,
        "is_past": True,
    }


def build_rtp_schedule(upcoming, max_items=30, past_limit=15):
    """Monta cronograma real: rodada ao vivo + fila pré-gerada com horários estimados."""
    now_ms = _now_ms()
    ending_delay_ms = int(ENDING_DELAY_S * 1000)
    snap = live_game.get_timing_snapshot()
    schedule = []

    crash_mul = int(snap.get("crash_mul") or 100)
    crash_x = float(snap.get("crash_x") or round(crash_mul / 100, 2))
    flight_ms = _flight_ms_for_crash(crash_mul)
    game_state = int(snap.get("game_state") or GS_BETTING)
    bet_start = int(snap.get("bet_start_time") or now_ms)
    fly_start = int(snap.get("fly_start_time") or 0)
    ending_start = int(snap.get("ending_start_time") or 0)
    round_id = int(snap.get("round_id") or 0)

    if game_state == GS_BETTING:
        crash_at = bet_start + BET_TIME_MS + flight_ms
        phase = "Apostas"
        status = "live"
    elif game_state == GS_PLAYING:
        crash_at = fly_start + flight_ms
        phase = "Voando"
        status = "live"
    else:
        crash_at = (fly_start + flight_ms) if fly_start else now_ms
        phase = "Encerrando"
        status = "live"

    schedule.append(
        _schedule_entry(
            index=0,
            round_id=round_id,
            crash_mul=crash_mul,
            crash_x=crash_x,
            bet_start_ms=bet_start,
            crash_at_ms=int(crash_at),
            now_ms=now_ms,
            status=status,
            phase=phase,
            is_live=True,
            queue_position=0,
        )
    )

    if game_state == GS_ENDING:
        cursor = (ending_start or now_ms) + ending_delay_ms
    else:
        cursor = int(crash_at) + ending_delay_ms

    for i, vela in enumerate(list(upcoming)[:max_items]):
        mul = int(vela.get("crashMul") or 100)
        cx = float(vela.get("crashX") or round(mul / 100, 2))
        bet_start_ms = int(cursor)
        crash_at_ms = int(bet_start_ms + BET_TIME_MS + _flight_ms_for_crash(mul))
        schedule.append(
            _schedule_entry(
                index=i + 1,
                round_id=round_id + i + 1,
                crash_mul=mul,
                crash_x=cx,
                bet_start_ms=bet_start_ms,
                crash_at_ms=crash_at_ms,
                now_ms=now_ms,
                status="queued",
                phase="Na fila",
                is_live=False,
                queue_position=i + 1,
            )
        )
        cursor = crash_at_ms + ending_delay_ms

    live_entry = schedule[0] if schedule else None
    upcoming_entries = schedule[1:] if len(schedule) > 1 else []

    past_entries = []
    try:
        hist = list_velas(limit=max(1, min(int(past_limit), MAX_VELAS)))
        for vela in hist.get("velas") or []:
            rid = int(vela.get("round_id") or 0)
            if rid <= 0 or rid >= round_id:
                continue
            past_entries.append(_past_entry_from_vela(vela))
    except Exception as exc:
        print(f"[RTP] Falha ao carregar velas anteriores: {exc}")

    return {
        "server_time_ms": now_ms,
        "server_time": _ms_to_iso(now_ms),
        "betting_ms": BET_TIME_MS,
        "ending_delay_ms": ending_delay_ms,
        "live": snap,
        "live_round": live_entry,
        "upcoming": upcoming_entries,
        "past": past_entries,
        "schedule": schedule,
    }


def get_rtp_state():
    runtime = refresh_runtime(force=True)
    with _rtp_lock:
        ensure_rtp_queue(force=False)
        upcoming = [dict(x) for x in _rtp_upcoming]
        payload = {
            "ok": True,
            "current": dict(_rtp_current) if _rtp_current else None,
            "upcoming": upcoming,
            "count": len(_rtp_upcoming),
            "engine": {
                "modo_geracao": runtime.get("modo_geracao"),
                "rtp_geral": runtime.get("rtp_geral"),
                "min_crash": runtime.get("min_crash"),
                "max_crash": runtime.get("max_crash"),
                "min_crash_mul": runtime.get("min_crash_mul"),
                "max_crash_mul": runtime.get("max_crash_mul"),
                "config_version": runtime.get("config_version"),
                "engine_version": runtime.get("engine_version"),
            },
        }
    payload["timeline"] = build_rtp_schedule(upcoming)
    return payload


def _is_internal_rtp_request(handler):
    if not AVIATOR_INTERNAL_SECRET:
        client = handler.client_address[0] if handler.client_address else ""
        return client in ("127.0.0.1", "::1", "localhost")
    provided = handler.headers.get("X-Aviator-Internal") or handler.headers.get("x-aviator-internal")
    return provided == AVIATOR_INTERNAL_SECRET


def consume_next_vela(round_id=None):
    global _rtp_current
    with _rtp_lock:
        ensure_rtp_queue()
        nxt = _rtp_upcoming.pop(0)
        _rtp_current = {
            "roundId": int(round_id) if round_id is not None else None,
            "crashMul": nxt["crashMul"],
            "crashX": nxt["crashX"],
        }
        ensure_rtp_queue()
        return {"ok": True, **_rtp_current, "remaining": len(_rtp_upcoming)}


def _cache_round(payload):
    round_id = int(payload["roundId"])
    with _round_lock:
        if round_id in _round_cache:
            _round_cache.move_to_end(round_id)
        _round_cache[round_id] = dict(payload)
        while len(_round_cache) > MAX_VELAS:
            _round_cache.popitem(last=False)


def _payload_to_vela_detail(payload):
    crash_mul = int(payload.get("crashMul") or 0)
    crash_x = float(payload.get("crashX") or (crash_mul / 100 if crash_mul else 0))
    bets = payload.get("bets") or []
    return {
        "ok": True,
        "vela": {
            "round_id": int(payload["roundId"]),
            "crash_mul": crash_mul,
            "crash_x": crash_x,
            "server_seed": payload.get("serverSeed") or "",
            "started_at": payload.get("startedAt"),
            "crashed_at": payload.get("crashedAt"),
            "bet_count": len(bets),
            "player_bet_count": sum(1 for b in bets if not b.get("isBot")),
            "total_bet_usd": sum(int(b.get("betUsd") or 0) for b in bets),
            "total_cashout_usd": sum(int(b.get("coUsd") or 0) for b in bets),
            "player_gold": payload.get("playerGold"),
            "status": payload.get("status") or "crashed",
            "created_at": payload.get("crashedAt") or utc_now(),
        },
        "bets": [
            {
                "userid": b.get("userid") or "",
                "name": b.get("name") or "",
                "bet_id": int(b.get("betId") or 0),
                "bet_usd": int(b.get("betUsd") or 0),
                "co_usd": int(b.get("coUsd") or 0),
                "co_rate": int(b.get("coRate") or 0),
                "is_bot": 1 if b.get("isBot") else 0,
                "icon": str(b.get("iocn") or b.get("icon") or ""),
            }
            for b in bets
        ],
    }


def _list_velas_from_cache(limit=MAX_VELAS, offset=0):
    with _round_lock:
        crashed = [
            p for p in reversed(_round_cache.values())
            if str(p.get("status") or "crashed").lower() in ("crashed", "")
        ]
    sliced = crashed[offset : offset + limit]
    velas = []
    for payload in sliced:
        detail = _payload_to_vela_detail(payload)
        velas.append(detail["vela"])
    return {"ok": True, "total": len(crashed), "velas": velas}


def list_chat(limit=70, user_id=None):
    limit = max(1, min(int(limit), 200))
    with _chat_lock:
        rows = sorted(
            _chat_messages.values(),
            key=lambda row: (row["created_at"], row["message_id"]),
        )[-limit:]
        liked_ids = set()
        if user_id:
            uid = str(user_id)
            liked_ids = {
                message_id
                for (message_id, liker_id), liked in _chat_likes.items()
                if liked and liker_id == uid
            }

    messages = []
    for row in rows:
        message_id = row["message_id"]
        messages.append(
            {
                "id": message_id,
                "messageId": message_id,
                "userId": row["user_id"],
                "username": row["username"],
                "profileImage": row["profile_image"] or "av-6.png",
                "message": row["message"] or "",
                "messageType": row["message_type"] or "message",
                "createDate": row["created_at"],
                "likes": {
                    "isMeLiked": message_id in liked_ids,
                    "usersLikesNumber": int(row["likes_count"] or 0),
                },
            }
        )
    return {"ok": True, "messages": messages}


def save_chat_message(payload):
    global _next_message_id

    message_id = int(payload.get("id") or payload.get("messageId") or 0)
    user_id = str(payload.get("userId") or payload.get("user_id") or "")
    username = str(payload.get("username") or payload.get("playerName") or "Jogador")
    profile_image = str(payload.get("profileImage") or payload.get("profile_image") or "av-6.png")
    message = str(payload.get("message") or "")
    message_type = str(payload.get("messageType") or payload.get("message_type") or "message")
    created_at = int(payload.get("createDate") or payload.get("created_at") or 0)
    if created_at <= 0:
        created_at = int(time.time() * 1000)

    with _chat_lock:
        if message_id <= 0:
            message_id = _next_message_id
            _next_message_id += 1
        elif message_id >= _next_message_id:
            _next_message_id = message_id + 1

        _chat_messages[message_id] = {
            "message_id": message_id,
            "user_id": user_id,
            "username": username,
            "profile_image": profile_image,
            "message": message,
            "message_type": message_type,
            "likes_count": int(_chat_messages.get(message_id, {}).get("likes_count") or 0),
            "created_at": created_at,
        }
        _chat_messages.move_to_end(message_id)

        while len(_chat_messages) > MAX_CHAT_MESSAGES:
            old_id, _ = _chat_messages.popitem(last=False)
            stale_keys = [key for key in _chat_likes if key[0] == old_id]
            for key in stale_keys:
                _chat_likes.pop(key, None)

    return {
        "ok": True,
        "message": {
            "id": message_id,
            "messageId": message_id,
            "userId": user_id,
            "username": username,
            "profileImage": profile_image,
            "message": message,
            "messageType": message_type,
            "createDate": created_at,
            "likes": {"isMeLiked": False, "usersLikesNumber": 0},
        },
    }


def toggle_chat_like(payload):
    message_id = int(payload.get("messageId") or payload.get("id") or 0)
    user_id = str(payload.get("userId") or payload.get("user_id") or "")
    blike = payload.get("blike")
    if blike is None:
        blike = payload.get("setLike")
    blike = bool(blike) if blike is not None else True

    if message_id <= 0 or not user_id:
        raise ValueError("messageId e userId são obrigatórios")

    with _chat_lock:
        row = _chat_messages.get(message_id)
        if not row:
            raise ValueError("Mensagem não encontrada")

        key = (message_id, user_id)
        if blike:
            _chat_likes[key] = True
        else:
            _chat_likes.pop(key, None)

        likes_count = sum(
            1 for (mid, _), liked in _chat_likes.items() if liked and mid == message_id
        )
        row["likes_count"] = likes_count

    return {
        "ok": True,
        "messageId": message_id,
        "blike": blike,
        "usersLikesNumber": likes_count,
    }


def save_vela(payload):
    """Persiste rodada no Supabase (via wallet bridge) e cache local leve."""
    round_id = int(payload["roundId"])
    crash_mul = int(payload.get("crashMul") or 0)
    crash_x = float(payload.get("crashX") or (crash_mul / 100 if crash_mul else 0))
    status = payload.get("status") or "crashed"
    server_seed = payload.get("serverSeed") or ""
    started_at = payload.get("startedAt") or None
    crashed_at = payload.get("crashedAt") or (utc_now() if status == "crashed" else None)
    bets = payload.get("bets") or []

    _cache_round(payload)

    try:
        import wallet_bridge as wb

        if wb.wallet_enabled():
            wb.sync_round(
                {
                    "roundId": round_id,
                    "crashMul": crash_mul,
                    "crashX": crash_x,
                    "serverSeed": server_seed,
                    "startedAt": started_at,
                    "crashedAt": crashed_at,
                    "status": status,
                    "bets": bets,
                }
            )
    except Exception as exc:
        print(f"[HIST] Falha ao sincronizar rodada no Supabase: {exc}")

    return {"ok": True, "roundId": round_id, "crashX": crash_x}


def list_velas(limit=MAX_VELAS, offset=0):
    limit = max(1, min(int(limit), MAX_VELAS))
    offset = max(0, int(offset))

    try:
        import wallet_bridge as wb

        if wb.wallet_enabled():
            data = wb.fetch_history(limit, offset)
            if data and data.get("ok"):
                return data
    except Exception as exc:
        print(f"[HIST] Falha ao buscar histórico no Supabase: {exc}")

    return _list_velas_from_cache(limit, offset)


def get_vela(round_id):
    round_id = int(round_id)

    with _round_lock:
        cached = _round_cache.get(round_id)
    if cached:
        return _payload_to_vela_detail(cached)

    try:
        import wallet_bridge as wb

        if wb.wallet_enabled():
            detail = wb.fetch_vela(round_id)
            if detail:
                return detail
    except Exception as exc:
        print(f"[HIST] Falha ao buscar rodada no Supabase: {exc}")

    return None


def read_json_body(handler):
    length = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode("utf-8"))


def send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **getattr(SimpleHTTPRequestHandler, "extensions_map", {}),
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".wasm": "application/wasm",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".mp3": "audio/mpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".html": "text/html",
    }

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def translate_path(self, path):
        # Collapse accidental "//assets/..." into "/assets/..."
        if isinstance(path, str) and path.startswith("//"):
            path = "/" + path.lstrip("/")
        mapped = self._map_root_icon(path)
        if mapped is not None:
            return mapped
        return super().translate_path(path)

    def _map_root_icon(self, path):
        # /nome.hash.svg -> images/icons/nome.hash.svg
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if not clean.startswith("/") or clean.count("/") != 1:
            return None
        name = clean.lstrip("/")
        if not name.endswith(".svg") or ".." in name or "/" in name or "\\" in name:
            return None
        candidate = os.path.join(os.getcwd(), ICON_DIR, name)
        if os.path.isfile(candidate):
            return candidate
        return None

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # Normalize path: "//assets/..." must not be parsed as netloc="assets"
        raw = self.path or "/"
        if raw.startswith("//"):
            raw = "/" + raw.lstrip("/")
            self.path = raw
        parsed = urlparse(raw)
        path = parsed.path.rstrip("/")

        if path == "/rtp":
            rtp_path = os.path.join(os.getcwd(), "rtp.html")
            try:
                with open(rtp_path, "rb") as f:
                    body = f.read()
            except OSError:
                self.send_error(404, "rtp.html não encontrado")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/rtp":
            if not _is_internal_rtp_request(self):
                send_json(self, 403, {"ok": False, "error": "Acesso negado"})
                return
            send_json(self, 200, get_rtp_state())
            return

        if path == "/api/history":
            qs = parse_qs(parsed.query)
            limit = (qs.get("limit") or ["50"])[0]
            offset = (qs.get("offset") or ["0"])[0]
            try:
                send_json(self, 200, list_velas(limit, offset))
            except Exception as exc:
                print(f"[DB] Erro ao listar: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path.startswith("/api/history/"):
            round_id = path.rsplit("/", 1)[-1]
            try:
                detail = get_vela(round_id)
                if not detail:
                    send_json(self, 404, {"ok": False, "error": "Rodada não encontrada"})
                    return
                send_json(self, 200, detail)
            except Exception as exc:
                print(f"[DB] Erro ao buscar rodada: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/chat":
            qs = parse_qs(parsed.query)
            limit = (qs.get("limit") or ["70"])[0]
            user_id = (qs.get("userId") or qs.get("user_id") or [None])[0]
            try:
                send_json(self, 200, list_chat(limit, user_id))
            except Exception as exc:
                print(f"[DB] Erro ao listar chat: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/game/events":
            self._sse_game_events(parsed)
            return

        return super().do_GET()

    def _sse_game_events(self, parsed):
        qs = parse_qs(parsed.query)
        user_id = (qs.get("userId") or qs.get("user_id") or [""])[0]
        q = live_game.subscribe(user_id)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                    raw = json.dumps(msg, separators=(",", ":")).encode("utf-8")
                    self.wfile.write(b"data: " + raw + b"\n\n")
                    self.wfile.flush()
                except Exception:
                    # heartbeat keep-alive
                    try:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
                    except Exception:
                        break
        finally:
            live_game.unsubscribe(q)

    def do_POST(self):
        path = self.path.rstrip("/")

        if path == "/api/rtp/invalidate":
            if not _is_internal_rtp_request(self):
                send_json(self, 403, {"ok": False, "error": "Acesso negado"})
                return
            try:
                _sync_rtp_config(force=True)
                result = invalidate_rtp_queue()
                send_json(self, 200, result)
            except Exception as exc:
                print(f"[RTP] Erro ao invalidar fila: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/rtp/next":
            try:
                payload = read_json_body(self)
            except json.JSONDecodeError:
                payload = {}
            try:
                round_id = payload.get("roundId")
                result = consume_next_vela(round_id)
                send_json(self, 200, result)
            except Exception as exc:
                print(f"[RTP] Erro ao consumir: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/history":
            try:
                payload = read_json_body(self)
                result = save_vela(payload)
                send_json(self, 200, result)
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                send_json(self, 400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                print(f"[DB] Erro ao salvar: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/chat":
            try:
                payload = read_json_body(self)
                result = save_chat_message(payload)
                send_json(self, 200, result)
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                send_json(self, 400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                print(f"[DB] Erro ao salvar chat: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/chat/like":
            try:
                payload = read_json_body(self)
                result = toggle_chat_like(payload)
                send_json(self, 200, result)
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                send_json(self, 400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                print(f"[DB] Erro ao curtir chat: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path == "/api/game/rpc":
            try:
                payload = read_json_body(self)
                result = live_game.handle_rpc(
                    int(payload.get("serverCode") or 0),
                    payload.get("data") or {},
                    str(payload.get("userId") or ""),
                    str(payload.get("nickName") or ""),
                    str(payload.get("headIcon") or "32"),
                    str(payload.get("accountEmail") or payload.get("account") or ""),
                )
                send_json(self, 200, result)
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                send_json(self, 400, {"ok": False, "error": str(exc)})
            except Exception as exc:
                print(f"[LIVE] RPC erro: {exc}")
                send_json(self, 500, {"ok": False, "error": str(exc)})
            return

        if path != "/api/discord-notify":
            self.send_error(404)
            return

        try:
            payload = read_json_body(self)
        except json.JSONDecodeError:
            self.send_error(400, "JSON inválido")
            return

        # Também persiste no Supabase quando o Discord recebe crash/start
        try:
            if payload.get("type") in ("round_start", "crash") and payload.get("roundId") is not None:
                save_vela(
                    {
                        "roundId": payload["roundId"],
                        "crashMul": payload.get("crashMul"),
                        "crashX": payload.get("crashX"),
                        "serverSeed": payload.get("serverSeed"),
                        "startedAt": payload.get("startedAt"),
                        "crashedAt": payload.get("crashedAt"),
                        "bets": payload.get("bets") or [],
                        "playerGold": payload.get("playerGold"),
                        "status": "open" if payload.get("type") == "round_start" else "crashed",
                    }
                )
        except Exception as exc:
            print(f"[DB] Falha ao salvar via discord-notify: {exc}")

        discord_body = build_discord_payload(payload)
        try:
            req = Request(
                WEBHOOK_URL,
                data=json.dumps(discord_body).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "AviatorLocal/1.0",
                },
                method="POST",
            )
            with urlopen(req, timeout=10) as resp:
                status = resp.status
        except URLError as exc:
            print(f"[Discord] Erro ao enviar: {exc}")
            self.send_error(502, "Falha ao enviar webhook")
            return

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, fmt, *args):
        if args and isinstance(args[0], str) and "GET" in args[0]:
            path = args[0].split()[1] if len(args[0].split()) > 1 else ""
            if path.endswith((".js", ".css", ".png", ".svg", ".woff", ".mp3", ".json", ".ttf")):
                return
        super().log_message(fmt, *args)


def build_discord_payload(data):
    event = data.get("type", "info")
    round_id = data.get("roundId", "?")
    crash_x = data.get("crashX", "?")

    if event == "round_start":
        return {
            "embeds": [
                {
                    "title": f"Nova rodada #{round_id}",
                    "description": f"Vai crashar em **{crash_x}x**",
                    "color": 0xFF4444,
                    "fields": [
                        {"name": "Rodada", "value": str(round_id), "inline": True},
                        {"name": "Crash previsto", "value": f"{crash_x}x", "inline": True},
                        {"name": "Fase", "value": "Apostas abertas", "inline": True},
                    ],
                }
            ]
        }

    if event == "crash":
        return {
            "embeds": [
                {
                    "title": f"CRASH — Rodada #{round_id}",
                    "description": f"Crashou em **{crash_x}x**",
                    "color": 0x2B2D31,
                    "fields": [
                        {"name": "Rodada", "value": str(round_id), "inline": True},
                        {"name": "Resultado", "value": f"{crash_x}x", "inline": True},
                    ],
                }
            ]
        }

    return {"content": str(data)}


def fire_discord(payload):
    """Notifica Discord em background (não bloqueia o tick)."""
    def _run():
        try:
            body = build_discord_payload(payload)
            req = Request(
                WEBHOOK_URL,
                data=json.dumps(body).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "AviatorLocal/1.0",
                },
                method="POST",
            )
            with urlopen(req, timeout=10) as resp:
                resp.read()
        except Exception as exc:
            print(f"[Discord] live notify falhou: {exc}")

    threading.Thread(target=_run, daemon=True).start()


live_game = LiveGame(
    get_crash=consume_next_vela,
    save_history=save_vela,
    notify_discord=fire_discord,
    save_chat=save_chat_message,
    like_chat=toggle_chat_like,
    list_chat=list_chat,
    list_history=list_velas,
)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    _sync_rtp_config(force=True)
    ensure_rtp_queue()
    live_game.start()
    server = ThreadingHTTPServer(("", PORT), Handler)
    print(f"Aviator local em http://localhost:{PORT}")
    print(f"RTP das próximas velas em http://localhost:{PORT}/rtp")
    print("Webhook Discord ativo via POST /api/discord-notify")
    print("Histórico de velas via Supabase (GET/POST /api/history)")
    print("Chat em memória via GET/POST /api/chat e POST /api/chat/like")
    print("Jogo ao vivo (SSE) em GET /api/game/events + POST /api/game/rpc")
    server.serve_forever()
