"""
Utility functions for VIN decoding and AI description generation.
"""
import os
import re
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


# ── Scoped CSS for AI-generated vehicle descriptions ─────────
VEHICLE_CSS_TEMPLATE = """<style>
.ad-vehicle-container {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    line-height: 1.8;
    max-width: 100%;
}
.ad-vehicle-container .ad-vehicle-heading {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    margin: 1.5rem 0 0.5rem;
    padding-bottom: 0.3rem;
    border-bottom: 3px solid #E20505;
    display: inline-block;
}
.ad-vehicle-container .ad-vehicle-paragraph {
    font-size: 1rem;
    color: #334155;
    margin-bottom: 0.85rem;
}
.ad-vehicle-container .ad-vehicle-highlight-box {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-left: 4px solid #E20505;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
}
.ad-vehicle-container .ad-vehicle-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.ad-vehicle-container .ad-vehicle-list li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.4rem;
    font-size: 0.95rem;
    color: #334155;
}
.ad-vehicle-container .ad-vehicle-list li::before {
    content: '\\2713';
    position: absolute;
    left: 0;
    color: #E20505;
    font-weight: 700;
}
.ad-vehicle-container .ad-vehicle-brand {
    color: #E20505;
    font-weight: 600;
}
</style>
"""

# ── Instruction block for the AI prompt ──────────────────────
VEHICLE_HTML_STRUCTURE = """
CRITICAL: You must output RAW HTML only. Do not use Markdown. Do not use ```html code blocks.
You must use the following CSS classes for styling:
- Container: wrap ALL content inside <div class="ad-vehicle-container">
- Section headings: <h2 class="ad-vehicle-heading">
- Paragraphs: <p class="ad-vehicle-paragraph">
- Feature/spec lists: <ul class="ad-vehicle-list"> placed inside <div class="ad-vehicle-highlight-box">
- Vehicle make/model/trim names: <span class="ad-vehicle-brand">
Do NOT include a <style> tag in your output. I will prepend it manually.
Do NOT include any call-to-action, button, link, or contact prompt — end the description after the final section paragraph.

REQUIRED SECTIONS (in this order, each with an <h2 class="ad-vehicle-heading">):
1. Overview — 3-4 sentence hook: introduce the vehicle's overall character, positioning (luxury/practical/sporty/family), and who it is ideal for.
2. Performance & Powertrain — 3-4 sentences: engine, transmission type, drivetrain, fuel type, and what the driving experience is like. Reference every spec that was provided.
3. Key Specifications — a highlight-box list with one bullet per provided spec: year, make, model, trim, body style, condition, mileage, exterior colour, engine, transmission, drivetrain, fuel type, doors. Only include bullets for specs that are actually present.
4. Exterior Design & Style — 2-3 sentences describing the body style, colour, and visual character/appeal of the vehicle.
5. Interior & Comfort — 2-3 sentences covering seating, cabin quality, space, and comfort based on the features provided. Only mention what the feature list supports; do not invent.
6. Technology & Infotainment — 2-3 sentences covering connectivity, audio, navigation, and driver-assistance technology drawn strictly from the feature list. Omit this section entirely if no relevant features were provided.
7. Safety & Driver Assistance — 2-3 sentences covering safety tech and driver-assistance systems drawn strictly from the feature list. Omit this section entirely if no relevant features were provided.
8. Features & Equipment — a highlight-box list of every provided feature name, one bullet each, with a short (3-6 word) benefit note per bullet (e.g. "Heated front seats — year-round comfort"). Omit this section if no features were provided.
9. Why Choose This Vehicle — 3-4 sentences: overall value proposition, condition reassurance, ideal ownership scenario, lifestyle fit.
"""


def decode_vin_nhtsa(vin: str) -> dict:
    """
    Decode a VIN using the free NHTSA API.
    
    Args:
        vin: 17-character Vehicle Identification Number
        
    Returns:
        Dictionary with vehicle details mapped to model field names and TextChoices values.
    """
    # Normalize pasted VINs (users often include spaces or dashes).
    normalized_vin = re.sub(r'[^A-Za-z0-9]', '', (vin or '').upper())

    if len(normalized_vin) != 17:
        return {'error': 'Invalid VIN. Must be 17 characters.'}

    # Map of NHTSA variable names to our field names
    variable_mapping = {
        'Make': 'make',
        'Model': 'model',
        'Model Year': 'year',
        'Trim': 'trim',
        'Series': 'series',  # Alternative to Trim
        'Body Class': 'body_style',
        'Exterior / Body Color': 'color',
        'Exterior Body Color': 'color',
        'Color': 'color',
        'Fuel Type - Primary': 'fuel_type',
        'Transmission Style': 'transmission',
        'Drive Type': 'drivetrain',
        'Doors': 'doors',
        'Engine Number of Cylinders': 'cylinders',
        'Displacement (L)': 'engine_size',
    }

    # DecodeVinValuesExtended returns a flatter schema that is useful as a fallback.
    extended_mapping = {
        'Make': 'make',
        'Model': 'model',
        'ModelYear': 'year',
        'Trim': 'trim',
        'Series': 'series',
        'BodyClass': 'body_style',
        'ExteriorColor': 'color',
        'ExteriorBodyColor': 'color',
        'BodyColor': 'color',
        'Color': 'color',
        'FuelTypePrimary': 'fuel_type',
        'TransmissionStyle': 'transmission',
        'DriveType': 'drivetrain',
        'Doors': 'doors',
        'EngineCylinders': 'cylinders',
        'DisplacementL': 'engine_size',
    }

    def _parse_year(raw_value):
        try:
            return int(raw_value)
        except (ValueError, TypeError):
            return raw_value

    def _normalize_color(raw_value):
        if not isinstance(raw_value, str):
            return None

        value = raw_value.strip()
        if not value:
            return None

        lower = value.lower()
        if lower in {'not applicable', 'unknown', 'n/a'}:
            return None

        if 'black' in lower:
            return 'Black'
        if 'white' in lower:
            return 'White'
        if 'silver' in lower:
            return 'Silver'
        if 'gray' in lower or 'grey' in lower:
            return 'Gray'
        if 'red' in lower:
            return 'Red'
        if 'blue' in lower:
            return 'Blue'
        if 'green' in lower:
            return 'Green'
        if 'brown' in lower:
            return 'Brown'
        if 'beige' in lower or 'tan' in lower:
            return 'Beige'

        return 'Other'

    def _extract_from_decodevin_results(results):
        extracted = {}
        for item in results or []:
            variable = (item.get('Variable') or '').strip()
            value = item.get('Value')

            # Some responses surface useful values in ValueId when Value is null.
            if value is None:
                value = item.get('ValueId')

            if isinstance(value, str):
                value = value.strip()

            if variable in variable_mapping and value not in (None, ''):
                field_name = variable_mapping[variable]
                extracted[field_name] = _parse_year(value) if field_name == 'year' else value

        return extracted

    def _extract_from_extended_results(results):
        if not results:
            return {}

        row = results[0]
        extracted = {}

        for source_field, field_name in extended_mapping.items():
            value = row.get(source_field)

            if isinstance(value, str):
                value = value.strip()

            if value not in (None, ''):
                extracted[field_name] = _parse_year(value) if field_name == 'year' else value

        return extracted
    
    try:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{normalized_vin}?format=json"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('Results'):
            return {'error': 'No data returned from NHTSA API'}

        result = _extract_from_decodevin_results(data['Results'])

        # Fallback endpoint helps when DecodeVin starts returning sparse data.
        if not result.get('make') or not result.get('model'):
            fallback_url = (
                f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/"
                f"{normalized_vin}?format=json"
            )
            try:
                fallback_response = requests.get(fallback_url, timeout=10)
                fallback_response.raise_for_status()
                fallback_data = fallback_response.json()
                fallback_result = _extract_from_extended_results(fallback_data.get('Results'))

                for field, value in fallback_result.items():
                    result.setdefault(field, value)
            except requests.exceptions.RequestException as e:
                logger.warning("NHTSA fallback decode failed for VIN %s: %s", normalized_vin, str(e))
            except ValueError as e:
                logger.warning("Invalid fallback response for VIN %s: %s", normalized_vin, str(e))
        
        # Use 'series' as fallback for 'trim' if trim is empty
        if not result.get('trim') and result.get('series'):
            result['trim'] = result.pop('series')
        elif 'series' in result:
            del result['series']  # Remove series if we have trim

        # Some valid VINs decode only partially, so require at least one core field.
        if not any(result.get(field) for field in ('make', 'model', 'year')):
            return {'error': 'Could not decode vehicle information from VIN'}

        if not result.get('model'):
            logger.warning("VIN %s decoded without model; returning partial data.", normalized_vin)

        # NHTSA color values are free-text; normalize to the frontend color choices.
        normalized_color = _normalize_color(result.get('color'))
        if normalized_color:
            result['color'] = normalized_color
        else:
            result.pop('color', None)

        # ── Map raw NHTSA values to our TextChoices ──

        # Transmission mapping
        raw_trans = (result.get('transmission') or '').lower()
        if 'manual' in raw_trans:
            result['transmission'] = 'MANUAL'
        elif 'cvt' in raw_trans:
            result['transmission'] = 'CVT'
        elif raw_trans:
            result['transmission'] = 'AUTOMATIC'

        # Fuel type mapping
        raw_fuel = (result.get('fuel_type') or '').lower()
        if 'diesel' in raw_fuel:
            result['fuel_type'] = 'DIESEL'
        elif 'electric' in raw_fuel and 'hybrid' not in raw_fuel:
            result['fuel_type'] = 'ELECTRIC'
        elif 'plug' in raw_fuel:
            result['fuel_type'] = 'PHEV'
        elif 'hybrid' in raw_fuel:
            result['fuel_type'] = 'HYBRID'
        elif raw_fuel:
            result['fuel_type'] = 'GASOLINE'

        # Body style mapping
        raw_body = (result.get('body_style') or '').lower()
        body_map = {
            'sedan': 'SEDAN', 'suv': 'SUV', 'sport utility': 'SUV',
            'hatchback': 'HATCHBACK', 'coupe': 'COUPE', 'truck': 'TRUCK',
            'pickup': 'TRUCK', 'minivan': 'MINIVAN', 'van': 'MINIVAN',
            'wagon': 'WAGON', 'convertible': 'CONVERTIBLE',
        }
        matched_body = None
        for keyword, choice in body_map.items():
            if keyword in raw_body:
                matched_body = choice
                break
        result['body_style'] = matched_body or ('OTHER' if raw_body else None)
        if result['body_style'] is None:
            result.pop('body_style', None)

        # Drivetrain mapping
        raw_drive = (result.get('drivetrain') or '').lower()
        if '4' in raw_drive or 'four' in raw_drive:
            result['drivetrain'] = '4WD'
        elif 'all' in raw_drive or 'awd' in raw_drive:
            result['drivetrain'] = 'AWD'
        elif 'rear' in raw_drive or 'rwd' in raw_drive:
            result['drivetrain'] = 'RWD'
        elif raw_drive:
            result['drivetrain'] = 'FWD'

        # Build engine string from displacement + cylinders  (e.g. "2.5L 4-Cylinder")
        engine_size = result.pop('engine_size', None)
        cylinders = result.pop('cylinders', None)
        if engine_size or cylinders:
            parts = []
            if engine_size:
                parts.append(f"{engine_size}L")
            if cylinders:
                parts.append(f"{cylinders}-Cylinder")
            result['engine'] = ' '.join(parts)

        # Doors as integer
        if result.get('doors'):
            try:
                result['doors'] = int(result['doors'])
            except (ValueError, TypeError):
                result.pop('doors', None)
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error(f"NHTSA API timeout for VIN: {normalized_vin}")
        return {'error': 'VIN decode service timed out. Please try again.'}
    except requests.exceptions.RequestException as e:
        logger.error(f"NHTSA API request failed: {str(e)}")
        return {'error': 'VIN decode service is unavailable. Please try again later.'}
    except Exception as e:
        logger.error(f"VIN decode error: {str(e)}")
        return {'error': 'An unexpected error occurred during VIN decoding.'}


def generate_car_description(vehicle_data: dict) -> dict:
    """
    Generate a compelling car listing description using Google Gemini AI.

    Args:
        vehicle_data: Dictionary with year, make, model, trim, mileage, condition,
            color, transmission, fuel_type, body_style, drivetrain, engine, doors, features

    Returns:
        Dictionary with 'description' key containing the generated text
    """
    year = vehicle_data.get('year', '')
    make = vehicle_data.get('make', '')
    model = vehicle_data.get('model', '')
    trim = vehicle_data.get('trim', '')
    mileage = vehicle_data.get('mileage', '')
    condition = vehicle_data.get('condition', 'used')
    color = vehicle_data.get('color', '')
    transmission = vehicle_data.get('transmission', '')
    fuel_type = vehicle_data.get('fuel_type', '')
    body_style = vehicle_data.get('body_style', '')
    drivetrain = vehicle_data.get('drivetrain', '')
    engine = vehicle_data.get('engine', '')
    doors = vehicle_data.get('doors', '')
    features = vehicle_data.get('features', []) or []

    # Format the vehicle name
    vehicle_name = f"{year} {make} {model}"
    if trim:
        vehicle_name += f" {trim}"

    # Humanize TextChoices values for the prompt
    transmission_map = {
        'AUTOMATIC': 'Automatic', 'MANUAL': 'Manual', 'CVT': 'CVT (continuously variable)',
        'OTHER': '', '': '',
    }
    fuel_map = {
        'GASOLINE': 'Gasoline', 'DIESEL': 'Diesel', 'ELECTRIC': 'All-electric',
        'HYBRID': 'Hybrid', 'PHEV': 'Plug-in Hybrid', 'OTHER': '', '': '',
    }
    body_map = {
        'SEDAN': 'Sedan', 'SUV': 'SUV', 'HATCHBACK': 'Hatchback', 'COUPE': 'Coupe',
        'TRUCK': 'Truck', 'MINIVAN': 'Minivan', 'WAGON': 'Wagon',
        'CONVERTIBLE': 'Convertible', 'OTHER': '', '': '',
    }
    drivetrain_map = {
        'FWD': 'Front-Wheel Drive (FWD)', 'RWD': 'Rear-Wheel Drive (RWD)',
        'AWD': 'All-Wheel Drive (AWD)', '4WD': 'Four-Wheel Drive (4WD)', '': '',
    }

    transmission_label = transmission_map.get(str(transmission).upper(), str(transmission))
    fuel_label = fuel_map.get(str(fuel_type).upper(), str(fuel_type))
    body_label = body_map.get(str(body_style).upper(), str(body_style))
    drivetrain_label = drivetrain_map.get(str(drivetrain).upper(), str(drivetrain))

    # Build a labeled spec sheet for the prompt — only include fields that are present.
    spec_pairs = [
        ('Year', year),
        ('Make', make),
        ('Model', model),
        ('Trim', trim),
        ('Body Style', body_label),
        ('Condition', 'Brand new' if str(condition).upper() == 'NEW' else 'Pre-owned'),
        ('Mileage', f"{int(mileage):,} miles" if mileage not in ('', None) else ''),
        ('Exterior Color', color),
        ('Engine', engine),
        ('Transmission', transmission_label),
        ('Drivetrain', drivetrain_label),
        ('Fuel Type', fuel_label),
        ('Doors', str(doors) if doors not in ('', None) else ''),
    ]
    spec_sheet = '\n'.join(f"- {label}: {value}" for label, value in spec_pairs if value)

    features_text = ', '.join(features) if features else 'standard features'

    if features:
        features_block = '\n'.join(f"- {f}" for f in features)
    else:
        features_block = "(No specific features supplied — keep claims generic and do not invent features.)"

    # Check if Google API key is configured
    google_api_key = getattr(settings, 'GOOGLE_API_KEY', None) or os.environ.get('GOOGLE_API_KEY')

    if google_api_key:
        try:
            import google.generativeai as genai

            # Configure the API
            genai.configure(api_key=google_api_key)

            # Create the model
            model_ai = genai.GenerativeModel('gemini-2.0-flash')

            prompt = (
                "You are a senior automotive copywriter writing a comprehensive, detailed online vehicle "
                "listing for a Canadian dealership. Your job is to turn the structured spec sheet below "
                "into a long, polished, dealership-quality description that gives a shopper everything "
                "they need to feel confident about this vehicle.\n\n"
                "=== VEHICLE SPEC SHEET ===\n"
                f"{spec_sheet}\n\n"
                "=== FEATURES & EQUIPMENT ===\n"
                f"{features_block}\n\n"
                f"{VEHICLE_HTML_STRUCTURE}\n"
                "WRITING REQUIREMENTS:\n"
                "- LENGTH: The total description MUST be at least 600 words. Do not cut sections short to save space. "
                "Every required section must be fully written out. If you finish all sections and are under 600 words, "
                "expand the narrative paragraphs with more detail before stopping.\n"
                "- Tone: authoritative, specific, enthusiastic but never gimmicky. "
                "Avoid cliché openers like 'Look no further' or 'Don't miss out'.\n"
                "- Be SPECIFIC: weave every provided spec (engine, transmission, drivetrain, fuel type, "
                "body style, mileage, colour) into the relevant prose sections. Do not write generic filler.\n"
                "- GROUND every claim strictly in the data above. Do NOT invent horsepower numbers, "
                "fuel-economy figures, safety ratings, trim packages, or any feature/option not listed.\n"
                "- If a spec or feature is not provided, simply omit it — never say 'unknown' or guess.\n"
                "- Refer to the vehicle by year/make/model (wrapped in <span class=\"ad-vehicle-brand\">) "
                "at least three times across the description.\n"
                "- For pre-owned vehicles, include a sentence of reassurance about condition in the final section.\n"
                "- Do NOT include any call-to-action, button, link, or contact prompt anywhere in the output.\n"
                "- Do NOT include price, financing terms, dealership name, phone numbers, or promotional offers.\n"
                "- Do NOT include placeholder text like [Dealership Name] or [Insert X].\n"
                "- Do NOT add a top-level title or H1 — start directly with the first "
                "<h2 class=\"ad-vehicle-heading\"> section.\n"
                "Output ONLY the raw HTML, beginning with <div class=\"ad-vehicle-container\"> and ending with </div>."
            )

            # Generate the response
            response = model_ai.generate_content(prompt)
            
            if response.text:
                # Clean the output
                ai_html = response.text.strip()
                ai_html = re.sub(r'^```(?:html)?\s*', '', ai_html)
                ai_html = re.sub(r'\s*```$', '', ai_html)
                ai_html = re.sub(r'<style[\s\S]*?</style>', '', ai_html, flags=re.IGNORECASE)

                # Combine: prepend the scoped CSS to the AI-generated HTML
                final_html = VEHICLE_CSS_TEMPLATE + ai_html.strip()
                return {'description': final_html}
            else:
                logger.warning("Empty response from Gemini API")
                return {'description': _generate_fallback_description(vehicle_name, features_text, mileage)}
                
        except ImportError:
            logger.error("google-generativeai package not installed")
            return {'description': _generate_fallback_description(vehicle_name, features_text, mileage)}
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {'description': _generate_fallback_description(vehicle_name, features_text, mileage)}
    else:
        logger.info("GOOGLE_API_KEY not configured, using fallback description")
        return {'description': _generate_fallback_description(vehicle_name, features_text, mileage)}


def _generate_fallback_description(vehicle_name: str, features_text: str, mileage=None) -> str:
    """
    Generate a fallback description when AI is not available.
    Uses the same scoped CSS classes for consistent styling.
    """
    mileage_text = f" with only {int(mileage):,} miles on the odometer" if mileage else ""
    
    fallback_html = (
        '<div class="ad-vehicle-container">'
        '<h2 class="ad-vehicle-heading">Overview</h2>'
        f'<p class="ad-vehicle-paragraph">Experience the exceptional '
        f'<span class="ad-vehicle-brand">{vehicle_name}</span>{mileage_text}. '
        f'This vehicle combines style, performance, and reliability in one impressive package, '
        f'making it an outstanding choice for drivers who demand quality.</p>'
        '<h2 class="ad-vehicle-heading">Features &amp; Equipment</h2>'
        '<div class="ad-vehicle-highlight-box">'
        '<ul class="ad-vehicle-list">'
        f'<li>{features_text}</li>'
        '<li>Meticulously maintained and thoroughly inspected</li>'
        '<li>Exceptional driving dynamics and ride comfort</li>'
        '</ul>'
        '</div>'
        '<h2 class="ad-vehicle-heading">Why Choose This Vehicle</h2>'
        f'<p class="ad-vehicle-paragraph">Whether commuting, running errands, or embarking on a road trip, '
        f'the <span class="ad-vehicle-brand">{vehicle_name}</span> delivers every time. '
        f'An excellent value for discerning buyers who demand quality and dependability.</p>'
        '</div>'
    )
    return VEHICLE_CSS_TEMPLATE + fallback_html
