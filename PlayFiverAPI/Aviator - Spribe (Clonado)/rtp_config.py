"""Configuração dinâmica de RTP — busca parâmetros do motor Node/Supabase."""
from __future__ import annotations

import json
import os
import random
import threading
import time
import urllib.error
import urllib.request
from decimal import Decimal, ROUND_HALF_UP

DEFAULT_RTP_GERAL = 0.97
DEFAULT_MIN_CRASH = 1.01
DEFAULT_MAX_CRASH = 500.00
DEFAULT_MIN_CRASH_MUL = 101
DEFAULT_MAX_CRASH_MUL = 50000
DEFAULT_QUEUE_SIZE = 50
DEFAULT_PCT_AZUL = 52.0
DEFAULT_PCT_ROXA = 38.0
DEFAULT_PCT_ROSA = 10.0
DEFAULT_MODO = "velas"

_config_lock = threading.Lock()
_runtime = {
    "rtp_geral": DEFAULT_RTP_GERAL,
    "pct_vela_azul": DEFAULT_PCT_AZUL,
    "pct_vela_roxa": DEFAULT_PCT_ROXA,
    "pct_vela_rosa": DEFAULT_PCT_ROSA,
    "min_crash": DEFAULT_MIN_CRASH,
    "max_crash": DEFAULT_MAX_CRASH,
    "min_crash_mul": DEFAULT_MIN_CRASH_MUL,
    "max_crash_mul": DEFAULT_MAX_CRASH_MUL,
    "queue_size": DEFAULT_QUEUE_SIZE,
    "modo_geracao": DEFAULT_MODO,
    "crash_technical_max": 1000.0,
    "config_version": "",
    "last_fetch_ms": 0,
}
_fetch_interval_ms = int(os.environ.get("AVIATOR_CONFIG_REFRESH_MS", "5000"))


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
        prev_version_key = str(_runtime.get("version_key") or "")
        new_engine_version = str(payload.get("engine_version") or "")
        new_config_version = str(payload.get("config_version") or "")
        version_key = new_engine_version or new_config_version
        version_changed = bool(version_key and version_key != prev_version_key)

        min_crash = float(payload.get("min_crash") or DEFAULT_MIN_CRASH)
        max_crash = float(payload.get("max_crash") or DEFAULT_MAX_CRASH)
        _runtime.update(
            {
                "rtp_geral": float(payload.get("rtp_geral") or payload.get("rtp_base") or DEFAULT_RTP_GERAL),
                "pct_vela_azul": float(payload.get("pct_vela_azul") or DEFAULT_PCT_AZUL),
                "pct_vela_roxa": float(payload.get("pct_vela_roxa") or DEFAULT_PCT_ROXA),
                "pct_vela_rosa": float(payload.get("pct_vela_rosa") or DEFAULT_PCT_ROSA),
                "min_crash": min_crash,
                "max_crash": max_crash,
                "min_crash_mul": int(payload.get("min_crash_mul") or DEFAULT_MIN_CRASH_MUL),
                "max_crash_mul": int(payload.get("max_crash_mul") or DEFAULT_MAX_CRASH_MUL),
                "queue_size": int(payload.get("queue_size") or DEFAULT_QUEUE_SIZE),
                "modo_geracao": str(payload.get("modo_geracao") or DEFAULT_MODO),
                "crash_technical_max": float(payload.get("crash_technical_max") or 1000),
                "config_version": new_config_version,
                "engine_version": new_engine_version,
                "version_key": version_key,
                "last_fetch_ms": now_ms,
            }
        )
        result = dict(_runtime)
        result["version_changed"] = version_changed
        return result


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


TIER_BOUNDS: dict[str, tuple[Decimal, Decimal]] = {
    "low": (Decimal("1.00"), Decimal("1.99")),   # azul  < 2x
    "mid": (Decimal("2.00"), Decimal("9.99")),   # roxo  2x–9,99x
    "high": (Decimal("10.00"), Decimal("999999")),  # rosa  ≥ 10x
}


def _tier_effective_range(
    tier: str, min_x: Decimal, max_x: Decimal
) -> tuple[Decimal, Decimal] | None:
    tier_min, tier_max = TIER_BOUNDS[tier]
    eff_min = max(min_x, tier_min)
    eff_max = min(max_x, tier_max)
    if eff_min > eff_max:
        return None
    return eff_min, eff_max


def _pick_color_tier(cfg: dict, min_x: Decimal, max_x: Decimal) -> str:
    """Sorteia cor por peso, considerando apenas faixas válidas no intervalo global."""
    weights = {
        "low": float(cfg.get("pct_vela_azul") or DEFAULT_PCT_AZUL),
        "mid": float(cfg.get("pct_vela_roxa") or DEFAULT_PCT_ROXA),
        "high": float(cfg.get("pct_vela_rosa") or DEFAULT_PCT_ROSA),
    }
    valid = {
        tier: w
        for tier, w in weights.items()
        if w > 0 and _tier_effective_range(tier, min_x, max_x) is not None
    }
    if not valid:
        for tier in ("low", "mid", "high"):
            if _tier_effective_range(tier, min_x, max_x) is not None:
                return tier
        return "low"

    total = sum(valid.values())
    roll = random.random() * total
    acc = 0.0
    for tier, weight in valid.items():
        acc += weight
        if roll < acc:
            return tier
    return next(reversed(valid))


def _generate_crash_x_for_tier(
    cfg: dict, tier: str, min_x: Decimal, max_x: Decimal
) -> Decimal:
    bounds = _tier_effective_range(tier, min_x, max_x)
    if bounds is None:
        tier = _pick_color_tier(cfg, min_x, max_x)
        bounds = _tier_effective_range(tier, min_x, max_x)
    if bounds is None:
        return min_x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    eff_min, eff_max = bounds
    if eff_min == eff_max:
        return eff_min.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    span = eff_max - eff_min
    rand = Decimal(str(random.random()))
    crash_x = eff_min + span * rand
    return crash_x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _tier_from_crash_x(crash_x: Decimal) -> str:
    if crash_x >= Decimal("10"):
        return "high"
    if crash_x >= Decimal("2"):
        return "mid"
    return "low"


def _generate_rtp_mode(cfg: dict) -> dict:
    rtp = float(cfg.get("rtp_geral") or DEFAULT_RTP_GERAL)
    min_mul = int(cfg.get("min_crash_mul") or DEFAULT_MIN_CRASH_MUL)
    max_mul = int(cfg.get("max_crash_mul") or DEFAULT_MAX_CRASH_MUL)
    if min_mul > max_mul:
        min_mul, max_mul = max_mul, min_mul

    r = random.random()
    mul = int((rtp / (1 - min(r, 0.99))) * 100)
    mul = min(max(mul, min_mul), max_mul)
    crash_x = (Decimal(mul) / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tier = _tier_from_crash_x(crash_x)
    return {
        "crashMul": int(crash_x * 100),
        "crashX": float(crash_x),
        "colorTier": tier,
    }


def _generate_velas_mode(cfg: dict) -> dict:
    min_x = Decimal(str(cfg.get("min_crash") or DEFAULT_MIN_CRASH)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    max_x = Decimal(str(cfg.get("max_crash") or cfg.get("crash_technical_max") or 1000)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    if min_x > max_x:
        min_x, max_x = max_x, min_x
    tier = _pick_color_tier(cfg, min_x, max_x)
    crash_x = _generate_crash_x_for_tier(cfg, tier, min_x, max_x)
    return {
        "crashMul": int(crash_x * 100),
        "crashX": float(crash_x),
        "colorTier": tier,
    }


def _generate_crash_mode(cfg: dict) -> dict:
    min_mul = int(cfg.get("min_crash_mul") or DEFAULT_MIN_CRASH_MUL)
    max_mul = int(cfg.get("max_crash_mul") or DEFAULT_MAX_CRASH_MUL)
    if min_mul > max_mul:
        min_mul, max_mul = max_mul, min_mul
    if min_mul == max_mul:
        crash_mul = min_mul
    else:
        crash_mul = random.randint(min_mul, max_mul)
    crash_x = (Decimal(crash_mul) / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tier = _tier_from_crash_x(crash_x)
    return {
        "crashMul": crash_mul,
        "crashX": float(crash_x),
        "colorTier": tier,
    }


def generate_crash_entry(cfg: dict | None = None) -> dict:
    active = cfg if cfg is not None else refresh_runtime(force=True)
    modo = str(active.get("modo_geracao") or DEFAULT_MODO).strip().lower()
    if modo == "rtp_geral":
        return _generate_rtp_mode(active)
    if modo == "crash":
        return _generate_crash_mode(active)
    return _generate_velas_mode(active)
