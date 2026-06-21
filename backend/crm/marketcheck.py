"""
MarketCheck API client (used-car price prediction).

Free trial gives ~1000 calls — we cache results in Django's cache for 24h to
preserve quota. The API returns USD listing prices for the US market; callers
must apply USD→CAD conversion and a wholesale haircut for trade-in use.

The API can return nonsense values (negative or near-zero predictions for
older / high-mileage cars). We validate every response and return None on
anything suspicious so the caller falls back to the heuristic.
"""

from __future__ import annotations

import json
import logging
from typing import Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

from django.conf import settings
from django.core.cache import cache

log = logging.getLogger(__name__)

_BASE_URL = 'https://mc-api.marketcheck.com/v2/predict/car/price'
_TIMEOUT_SECONDS = 6
_CACHE_TTL = 60 * 60 * 24  # 24h
_MIN_VALID_PRICE = 1000     # anything below this is treated as garbage


def _bucket_miles(miles: int) -> int:
    """Round mileage to nearest 5,000 for cache-key stability."""
    return (max(0, int(miles)) // 5000) * 5000


def _make_cache_key(*, vin: str, year: int, make: str, model: str, trim: str, miles: int) -> str:
    if vin:
        return f'mc:vin:{vin.upper()}:{_bucket_miles(miles)}'
    return (
        f'mc:ymmt:{year}:{(make or "").lower()}:{(model or "").lower()}:'
        f'{(trim or "Base").lower()}:{_bucket_miles(miles)}'
    )


def _validate(payload: dict) -> Optional[dict]:
    """Return the payload only if it looks sane. Otherwise None."""
    if not isinstance(payload, dict):
        return None
    if 'predicted_price' not in payload or 'price_range' not in payload:
        return None

    price = payload.get('predicted_price')
    rng = payload.get('price_range') or {}
    low = rng.get('lower_bound')
    high = rng.get('upper_bound')

    try:
        price = float(price)
        low = float(low)
        high = float(high)
    except (TypeError, ValueError):
        return None

    # Reject negative / near-zero predictions and inverted ranges.
    if price < _MIN_VALID_PRICE or low < _MIN_VALID_PRICE or high < low:
        log.info('MarketCheck returned suspicious values; falling back. payload=%s', payload)
        return None

    return {
        'predicted_price_usd': price,
        'low_usd': low,
        'high_usd': high,
        'specs': payload.get('specs') or {},
    }


def get_price_prediction(
    *,
    vin: str = '',
    year: int = 0,
    make: str = '',
    model: str = '',
    trim: str = 'Base',
    miles: int = 0,
) -> Optional[dict]:
    """
    Hit MarketCheck's /predict/car/price.

    Returns a dict with USD prices on success; None on any failure or
    invalid response so the caller can fall back to the heuristic.

    Tries VIN-based lookup first when a VIN is provided — that returns
    far better data than year/make/model.
    """
    api_key = getattr(settings, 'MARKETCHECK_API_KEY', None)
    if not api_key:
        return None

    if miles is None or int(miles) <= 0:
        return None

    cache_key = _make_cache_key(
        vin=vin or '', year=year, make=make, model=model,
        trim=trim or 'Base', miles=int(miles),
    )
    cached = cache.get(cache_key)
    if cached is not None:
        # Cache stores either a validated dict or the sentinel string 'MISS'.
        return None if cached == 'MISS' else cached

    # Build query params — VIN form takes precedence.
    params = {
        'api_key': api_key,
        'miles': int(miles),
        'car_type': 'used',
    }
    if vin and len(vin) == 17:
        params['vin'] = vin.upper()
    elif year and make and model:
        params['year'] = int(year)
        params['make'] = make
        params['model'] = model
        params['trim'] = trim or 'Base'
    else:
        return None

    url = f'{_BASE_URL}?{urlencode(params)}'

    try:
        req = Request(url, headers={'Accept': 'application/json'})
        with urlopen(req, timeout=_TIMEOUT_SECONDS) as resp:
            body = resp.read().decode('utf-8')
        payload = json.loads(body)
    except HTTPError as exc:
        # 400 = bad params (missing trim, etc.) — cache the miss briefly
        # so a flood of identical bad inputs doesn't burn quota.
        log.info('MarketCheck HTTP %s for %s', exc.code, cache_key)
        cache.set(cache_key, 'MISS', 60 * 60)
        return None
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        log.warning('MarketCheck request failed: %s', exc)
        return None

    validated = _validate(payload)
    if validated is None:
        cache.set(cache_key, 'MISS', _CACHE_TTL)
        return None

    cache.set(cache_key, validated, _CACHE_TTL)
    return validated
