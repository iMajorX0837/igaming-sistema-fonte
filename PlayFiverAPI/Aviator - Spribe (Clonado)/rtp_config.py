"""Configuração dinâmica de RTP — busca parâmetros do motor Node/Supabase."""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request

DEFAULT_RTP_FACTOR = 0.97
DEFAULT_MIN_CRASH_MUL = 101
DEFAULT_MAX_CRASH_MUL = 50000
DEFAULT_QUEUE_SIZE = 50

_config_lock = threading.Lock()
_runtime = {
    "rtp_factor": DEFAULT_RTP_FACTOR,
    "min_crash_mul": DEFAULT_MIN_CRASH_MUL,
    "max_crash_mul": DEFAULT_MAX_CRASH_MUL,
    "queue_size": DEFAULT_QUEUE_SIZE,
    "config_version": "",
    "last_fetch_ms": 0,
}
_fetch_interval_ms = int(os.environ.get("AVIATOR_CONFIG_REFRESH_MS", "12000"))


def _bridge_url(path: str) -> str:
    base = os.environ.get("WALLET_BRIDGE_URL", "").rstrip("/")
    if not base:
        return ""
    return f"{base}{path}"


def _fetch_engine_config() -> dict | None:
    url = _bridge_url("/engine-config")
    if not url:
        return None
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            if payload.get("ok"):
                return payload
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        print(f"[RTP CONFIG] Falha ao buscar engine-config: {exc}")
    return None


def refresh_runtime(force: bool = False) -> dict:
    now_ms = int(time.time() * 1000)
    with _config_lock:
        if (
            not force
            and _runtime.get("last_fetch_ms")
            and now_ms - int(_runtime["last_fetch_ms"]) < _fetch_interval_ms
        ):
            return dict(_runtime)

    payload = _fetch_engine_config()
    if not payload:
        with _config_lock:
            return dict(_runtime)

    with _config_lock:
        prev_version = str(_runtime.get("config_version") or "")
        new_version = str(payload.get("config_version") or "")
        version_changed = bool(new_version and new_version != prev_version)

        _runtime.update(
            {
                "rtp_factor": float(payload.get("rtp_factor") or payload.get("effective_rtp") or DEFAULT_RTP_FACTOR),
                "min_crash_mul": int(payload.get("min_crash_mul") or DEFAULT_MIN_CRASH_MUL),
                "max_crash_mul": int(payload.get("max_crash_mul") or DEFAULT_MAX_CRASH_MUL),
                "queue_size": int(payload.get("queue_size") or DEFAULT_QUEUE_SIZE),
                "config_version": new_version,
                "effective_rtp": float(payload.get("effective_rtp") or payload.get("rtp_factor") or DEFAULT_RTP_FACTOR),
                "recovery_adjustment": float(payload.get("recovery_adjustment") or 0),
                "rtp_real_pct": float(payload.get("rtp_real_pct") or 0),
                "ggr_pct": float(payload.get("ggr_pct") or 0),
                "last_fetch_ms": now_ms,
            }
        )
        result = dict(_runtime)
        result["version_changed"] = version_changed
        return result


def get_rtp_factor() -> float:
    cfg = refresh_runtime()
    return float(cfg.get("rtp_factor") or DEFAULT_RTP_FACTOR)


def get_crash_bounds() -> tuple[int, int]:
    cfg = refresh_runtime()
    min_mul = int(cfg.get("min_crash_mul") or DEFAULT_MIN_CRASH_MUL)
    max_mul = int(cfg.get("max_crash_mul") or DEFAULT_MAX_CRASH_MUL)
    return min_mul, max_mul


def get_queue_size() -> int:
    cfg = refresh_runtime()
    return max(10, int(cfg.get("queue_size") or DEFAULT_QUEUE_SIZE))


def get_config_version() -> str:
    cfg = refresh_runtime()
    return str(cfg.get("config_version") or "")


def runtime_snapshot() -> dict:
    return refresh_runtime(force=False)
