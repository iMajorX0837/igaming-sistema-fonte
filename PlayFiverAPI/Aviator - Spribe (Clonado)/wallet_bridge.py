"""Ponte de carteira Aviator → PlayFiverAPI (Supabase)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

WALLET_BRIDGE_URL = os.environ.get("WALLET_BRIDGE_URL", "").rstrip("/")
AVIATOR_INTERNAL_SECRET = os.environ.get("AVIATOR_INTERNAL_SECRET", "").strip()
GOLD_MULTIPLE = 100


def _internal_headers(extra: dict | None = None) -> dict:
    headers = dict(extra or {})
    if AVIATOR_INTERNAL_SECRET:
        headers["X-Aviator-Internal"] = AVIATOR_INTERNAL_SECRET
    return headers


def wallet_enabled() -> bool:
    return bool(WALLET_BRIDGE_URL)


def _post(path: str, payload: dict) -> dict:
    url = f"{WALLET_BRIDGE_URL}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers=_internal_headers({"Content-Type": "application/json"}),
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get(path: str) -> dict:
    url = f"{WALLET_BRIDGE_URL}{path}"
    req = urllib.request.Request(url, method="GET", headers=_internal_headers())
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_balance(user_code: str) -> dict | None:
    if not wallet_enabled() or not user_code:
        return None
    try:
        from urllib.parse import quote

        data = _get(f"/balance?user_code={quote(user_code)}")
        if data.get("ok"):
            return data
    except Exception as exc:
        print(f"[WALLET] fetch_balance falhou: {exc}")
    return None


def debit(user_code: str, gold: int, bet_id: int = 0, round_id: int = 0) -> dict | None:
    if not wallet_enabled() or not user_code:
        return None
    try:
        data = _post(
            "/debit",
            {
                "user_code": user_code,
                "gold": int(gold),
                "betId": int(bet_id),
                "roundId": int(round_id),
            },
        )
        if data.get("ok"):
            return data
        print(f"[WALLET] debit recusado: {data}")
    except Exception as exc:
        print(f"[WALLET] debit falhou: {exc}")
    return None


def credit(
    user_code: str,
    gold: int,
    bet_id: int = 0,
    round_id: int = 0,
    bet_gold: int = 0,
    tipo: str = "Ganhou",
    cashout_multiplier: int = 0,
) -> dict | None:
    if not wallet_enabled() or not user_code:
        return None
    try:
        data = _post(
            "/credit",
            {
                "user_code": user_code,
                "gold": int(gold),
                "betId": int(bet_id),
                "roundId": int(round_id),
                "betGold": int(bet_gold),
                "tipo": tipo,
                "cashoutMultiplier": int(cashout_multiplier or gold),
            },
        )
        if data.get("ok"):
            return data
        print(f"[WALLET] credit recusado: {data}")
    except Exception as exc:
        print(f"[WALLET] credit falhou: {exc}")
    return None


def refund(user_code: str, gold: int, bet_id: int = 0, round_id: int = 0) -> dict | None:
    if not wallet_enabled() or not user_code:
        return None
    try:
        data = _post(
            "/refund",
            {
                "user_code": user_code,
                "gold": int(gold),
                "betId": int(bet_id),
                "roundId": int(round_id),
            },
        )
        if data.get("ok"):
            return data
        print(f"[WALLET] refund recusado: {data}")
    except Exception as exc:
        print(f"[WALLET] refund falhou: {exc}")
    return None


def record_loss(user_code: str, bet_gold: int, bet_id: int = 0, round_id: int = 0) -> None:
    if not wallet_enabled() or not user_code:
        return
    try:
        _post(
            "/loss",
            {
                "user_code": user_code,
                "betGold": int(bet_gold),
                "betId": int(bet_id),
                "roundId": int(round_id),
            },
        )
    except Exception as exc:
        print(f"[WALLET] loss falhou: {exc}")


def sync_round(payload: dict) -> dict | None:
    if not wallet_enabled():
        return None
    try:
        data = _post("/round", payload)
        if data.get("ok"):
            return data
        print(f"[WALLET] round sync recusado: {data}")
    except Exception as exc:
        print(f"[WALLET] round sync falhou: {exc}")
    return None


def fetch_history(limit: int = 27, offset: int = 0) -> dict | None:
    if not wallet_enabled():
        return None
    try:
        from urllib.parse import quote

        data = _get(f"/history?limit={quote(str(limit))}&offset={quote(str(offset))}")
        if data.get("ok"):
            return data
        print(f"[WALLET] history recusado: {data}")
    except Exception as exc:
        print(f"[WALLET] history falhou: {exc}")
    return None


def fetch_vela(round_id: int) -> dict | None:
    if not wallet_enabled():
        return None
    try:
        data = _get(f"/history/{int(round_id)}")
        if data.get("ok") is False:
            return None
        return data
    except Exception as exc:
        print(f"[WALLET] fetch_vela falhou: {exc}")
    return None
