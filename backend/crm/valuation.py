"""
Heuristic trade-in valuation.

This module produces an *estimated* trade-in value for a used vehicle from a
small number of inputs (year, make, model, mileage, condition). It is an
internal estimator — not a market-data feed. Numbers are intended as a rough
guide for the customer and a starting point for the dealer's appraiser.

Method:
    estimate = base_msrp
             * depreciation_factor(age)
             * mileage_factor(age, mileage_km)
             * condition_factor(condition)
             * trade_in_discount    (wholesale-vs-retail haircut)

`base_msrp` is looked up from a small make/model table. When the exact model
is unknown we fall back to a make-tier default. The number is approximate;
real MSRPs vary by trim. The whole point of this estimator is "ballpark".

A range (±15%) is returned around the point estimate to communicate
uncertainty honestly to the customer.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP


# Approx Canadian MSRP (CAD, new) for common models. This is intentionally
# small — extend over time as new models come through. Keys are lowercase.
# Values are the typical MSRP of a mid-trim of a recent generation.
_MSRP_TABLE: dict[tuple[str, str], int] = {
    # Toyota
    ('toyota', 'corolla'): 25000,
    ('toyota', 'camry'): 32000,
    ('toyota', 'rav4'): 35000,
    ('toyota', 'highlander'): 48000,
    ('toyota', 'tacoma'): 42000,
    ('toyota', 'tundra'): 55000,
    ('toyota', 'sienna'): 45000,
    ('toyota', 'prius'): 32000,
    # Honda
    ('honda', 'civic'): 26000,
    ('honda', 'accord'): 33000,
    ('honda', 'cr-v'): 36000,
    ('honda', 'crv'): 36000,
    ('honda', 'pilot'): 50000,
    ('honda', 'odyssey'): 47000,
    ('honda', 'hr-v'): 30000,
    ('honda', 'hrv'): 30000,
    # Ford
    ('ford', 'f-150'): 50000,
    ('ford', 'f150'): 50000,
    ('ford', 'escape'): 32000,
    ('ford', 'edge'): 40000,
    ('ford', 'explorer'): 48000,
    ('ford', 'mustang'): 38000,
    ('ford', 'ranger'): 38000,
    # Chevrolet / GM
    ('chevrolet', 'silverado'): 48000,
    ('chevrolet', 'equinox'): 32000,
    ('chevrolet', 'trax'): 25000,
    ('chevrolet', 'malibu'): 30000,
    ('chevrolet', 'tahoe'): 65000,
    ('gmc', 'sierra'): 50000,
    ('gmc', 'terrain'): 35000,
    # Nissan
    ('nissan', 'rogue'): 32000,
    ('nissan', 'sentra'): 24000,
    ('nissan', 'altima'): 30000,
    ('nissan', 'pathfinder'): 47000,
    ('nissan', 'frontier'): 38000,
    # Hyundai / Kia
    ('hyundai', 'elantra'): 23000,
    ('hyundai', 'sonata'): 30000,
    ('hyundai', 'tucson'): 32000,
    ('hyundai', 'santa fe'): 38000,
    ('hyundai', 'kona'): 26000,
    ('kia', 'forte'): 22000,
    ('kia', 'sportage'): 32000,
    ('kia', 'sorento'): 38000,
    ('kia', 'soul'): 24000,
    # Mazda
    ('mazda', 'mazda3'): 24000,
    ('mazda', 'cx-5'): 33000,
    ('mazda', 'cx5'): 33000,
    ('mazda', 'cx-30'): 28000,
    ('mazda', 'cx-9'): 45000,
    # Volkswagen
    ('volkswagen', 'jetta'): 26000,
    ('volkswagen', 'tiguan'): 35000,
    ('volkswagen', 'atlas'): 48000,
    ('volkswagen', 'golf'): 28000,
    # Subaru
    ('subaru', 'outback'): 35000,
    ('subaru', 'forester'): 33000,
    ('subaru', 'crosstrek'): 30000,
    ('subaru', 'impreza'): 24000,
    # RAM / Jeep / Dodge
    ('ram', '1500'): 50000,
    ('jeep', 'wrangler'): 45000,
    ('jeep', 'grand cherokee'): 52000,
    ('jeep', 'cherokee'): 38000,
    ('jeep', 'compass'): 32000,
    ('dodge', 'charger'): 40000,
    ('dodge', 'challenger'): 42000,
    # Premium
    ('bmw', '3 series'): 52000,
    ('bmw', 'x3'): 55000,
    ('bmw', 'x5'): 72000,
    ('mercedes-benz', 'c-class'): 55000,
    ('mercedes-benz', 'c class'): 55000,
    ('mercedes-benz', 'glc'): 60000,
    ('audi', 'a4'): 50000,
    ('audi', 'q5'): 55000,
    ('lexus', 'rx'): 60000,
    ('lexus', 'nx'): 50000,
    ('acura', 'mdx'): 60000,
    ('acura', 'rdx'): 50000,
    # EV
    ('tesla', 'model 3'): 55000,
    ('tesla', 'model y'): 65000,
}

# When no model match, fall back to a per-make tier.
_MAKE_TIER_DEFAULTS: dict[str, int] = {
    'toyota': 32000, 'honda': 32000, 'ford': 38000, 'chevrolet': 35000,
    'gmc': 40000, 'nissan': 30000, 'hyundai': 28000, 'kia': 28000,
    'mazda': 30000, 'volkswagen': 32000, 'subaru': 32000, 'ram': 48000,
    'jeep': 40000, 'dodge': 38000, 'mitsubishi': 28000, 'chrysler': 35000,
    'buick': 38000, 'cadillac': 55000, 'lincoln': 55000,
    'bmw': 55000, 'mercedes-benz': 58000, 'audi': 52000, 'lexus': 55000,
    'acura': 50000, 'infiniti': 50000, 'volvo': 55000, 'porsche': 90000,
    'tesla': 60000, 'genesis': 55000, 'land rover': 75000, 'jaguar': 70000,
}

_DEFAULT_MSRP = 30000  # last-resort fallback

# Condition multipliers applied to the depreciated value.
_CONDITION_FACTORS: dict[str, Decimal] = {
    'EXCELLENT': Decimal('1.05'),
    'GOOD': Decimal('1.00'),
    'FAIR': Decimal('0.85'),
    'POOR': Decimal('0.65'),
}

# Wholesale haircut: a dealer pays less than retail for trade-ins.
# This is what separates "what your car is worth on Kijiji" from
# "what we'd give you on a trade".
_TRADE_IN_DISCOUNT = Decimal('0.85')

# Baseline annual mileage assumption (km). Vehicles above this depreciate
# faster; below it, slower.
_BASELINE_KM_PER_YEAR = 20000

# Width of the returned range (±15% around the point estimate).
_RANGE_WIDTH = Decimal('0.15')

# Floor — never return less than this for a running vehicle.
_MIN_ESTIMATE = Decimal('500')


def _normalize(s: str) -> str:
    return (s or '').strip().lower()


def _lookup_msrp(make: str, model: str) -> int:
    make_n = _normalize(make)
    model_n = _normalize(model)
    if (make_n, model_n) in _MSRP_TABLE:
        return _MSRP_TABLE[(make_n, model_n)]
    # Try matching just the first word of the model (e.g. "F-150 XLT" → "f-150")
    if ' ' in model_n:
        first = model_n.split(' ', 1)[0]
        if (make_n, first) in _MSRP_TABLE:
            return _MSRP_TABLE[(make_n, first)]
    return _MAKE_TIER_DEFAULTS.get(make_n, _DEFAULT_MSRP)


def _depreciation_factor(age_years: int) -> Decimal:
    """
    Standard depreciation curve:
      Year 1: ~20% off (new-car cliff)
      Years 2-3: ~15% per year
      Years 4-7: ~10% per year
      Years 8+: ~7% per year, floored at 10% of MSRP
    """
    if age_years <= 0:
        return Decimal('0.90')  # current model year, lightly used
    factor = Decimal('0.80') if age_years >= 1 else Decimal('1.00')
    for yr in range(2, age_years + 1):
        if yr <= 3:
            factor *= Decimal('0.85')
        elif yr <= 7:
            factor *= Decimal('0.90')
        else:
            factor *= Decimal('0.93')
    return max(factor, Decimal('0.10'))


def _mileage_factor(age_years: int, mileage_km: int) -> Decimal:
    """
    Adjusts for usage relative to baseline 20,000 km/year.
    Each 10,000 km over expected reduces value ~3%; under expected adds up to ~5%.
    """
    expected = max(_BASELINE_KM_PER_YEAR * max(age_years, 1), _BASELINE_KM_PER_YEAR)
    delta_km = mileage_km - expected
    if delta_km > 0:
        # over-driven: -3% per 10k km, capped at -25%
        adjustment = -min(Decimal('0.25'), Decimal(delta_km) / Decimal(10000) * Decimal('0.03'))
    else:
        # under-driven: +1.5% per 10k km under, capped at +8%
        adjustment = min(Decimal('0.08'), Decimal(-delta_km) / Decimal(10000) * Decimal('0.015'))
    return Decimal('1.00') + adjustment


def _quantize(d: Decimal) -> Decimal:
    return d.quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def estimate_trade_in_value(
    *,
    make: str,
    model: str,
    year: int,
    mileage: int,
    condition: str = 'GOOD',
) -> dict:
    """
    Return an estimated trade-in value plus a range and the inputs used.

    Output:
      {
        'estimate': Decimal,        # point estimate, CAD
        'low': Decimal,             # ~ -15%
        'high': Decimal,            # ~ +15%
        'currency': 'CAD',
        'method': 'heuristic-v1',
        'inputs': {...echoed...},
      }
    """
    if not make or not model or not year or mileage is None:
        raise ValueError('make, model, year, and mileage are required')

    cond = (condition or 'GOOD').upper()
    if cond not in _CONDITION_FACTORS:
        cond = 'GOOD'

    current_year = date.today().year
    age_years = max(0, current_year - int(year))
    mileage_km = max(0, int(mileage))

    msrp = Decimal(_lookup_msrp(make, model))
    point = (
        msrp
        * _depreciation_factor(age_years)
        * _mileage_factor(age_years, mileage_km)
        * _CONDITION_FACTORS[cond]
        * _TRADE_IN_DISCOUNT
    )
    point = max(point, _MIN_ESTIMATE)

    low = point * (Decimal('1.00') - _RANGE_WIDTH)
    high = point * (Decimal('1.00') + _RANGE_WIDTH)

    return {
        'estimate': _quantize(point),
        'low': _quantize(low),
        'high': _quantize(high),
        'currency': 'CAD',
        'method': 'heuristic-v1',
        'inputs': {
            'make': make,
            'model': model,
            'year': int(year),
            'mileage': mileage_km,
            'condition': cond,
            'age_years': age_years,
        },
    }


# ── MarketCheck-backed valuation with heuristic fallback ─────────────────

def _marketcheck_to_trade_in(prediction: dict, condition: str) -> dict:
    """
    Convert a MarketCheck retail-listing USD prediction into a Canadian
    trade-in CAD range.

    Pipeline:
        USD listing prediction
        × USD→CAD
        × wholesale_discount  (retail → trade-in)
        × condition_factor    (excellent/good/fair/poor adjustment)
    """
    from django.conf import settings as django_settings

    cond = (condition or 'GOOD').upper()
    if cond not in _CONDITION_FACTORS:
        cond = 'GOOD'

    fx = Decimal(str(getattr(django_settings, 'MARKETCHECK_USD_TO_CAD', 1.35)))
    cond_factor = _CONDITION_FACTORS[cond]

    def _convert(usd_value: float) -> Decimal:
        return (
            Decimal(str(usd_value))
            * fx
            * _TRADE_IN_DISCOUNT
            * cond_factor
        )

    point = max(_convert(prediction['predicted_price_usd']), _MIN_ESTIMATE)
    low = max(_convert(prediction['low_usd']), _MIN_ESTIMATE)
    high = max(_convert(prediction['high_usd']), _MIN_ESTIMATE)

    return {
        'estimate': _quantize(point),
        'low': _quantize(low),
        'high': _quantize(high),
        'currency': 'CAD',
        'method': 'marketcheck',
        'source_specs': prediction.get('specs', {}),
    }


def get_valuation(
    *,
    vin: str = '',
    make: str,
    model: str,
    year: int,
    mileage: int,
    condition: str = 'GOOD',
    trim: str = 'Base',
) -> dict:
    """
    Orchestrator: try MarketCheck first, fall back to heuristic.

    Always returns a result. The `method` field tells callers which path
    produced the number ('marketcheck' or 'heuristic-v1').
    """
    from .marketcheck import get_price_prediction

    if not make or not model or not year or mileage is None:
        raise ValueError('make, model, year, and mileage are required')

    prediction = get_price_prediction(
        vin=vin or '',
        year=int(year),
        make=make,
        model=model,
        trim=trim or 'Base',
        miles=int(mileage),
    )

    # Always compute the heuristic — we use it as a sanity bound on MarketCheck.
    heuristic = estimate_trade_in_value(
        make=make, model=model, year=year,
        mileage=mileage, condition=condition,
    )

    if prediction:
        mc_result = _marketcheck_to_trade_in(prediction, condition)

        # Sanity check: MarketCheck data is noisy. Reject when it deviates
        # from the heuristic by more than 2x in either direction.
        h = heuristic['estimate']
        m = mc_result['estimate']
        ratio = (m / h) if h > 0 else Decimal('1')
        if Decimal('0.5') <= ratio <= Decimal('2.0'):
            mc_result['inputs'] = {
                'make': make, 'model': model, 'year': int(year),
                'mileage': int(mileage), 'condition': (condition or 'GOOD').upper(),
                'vin': vin or '',
            }
            return mc_result
        # Out of bounds — use heuristic.

    return heuristic
