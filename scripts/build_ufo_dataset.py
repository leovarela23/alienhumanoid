#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path('/tmp/alienhumanoid-inspect')
RAW = ROOT / 'data' / 'raw' / 'corgis-ufo-sightings.json'
OUT = ROOT / 'data' / 'processed' / 'ufo-full.json'

with RAW.open() as f:
    rows = json.load(f)

items = []
for i, row in enumerate(rows):
    loc = row.get('Location', {})
    coords = loc.get('Coordinates', {})
    data = row.get('Data', {})
    dates = row.get('Dates', {})
    sighted = dates.get('Sighted', {})
    documented = dates.get('Documented', {})
    date_sighted = row.get('Date', {}).get('Sighted', {})

    lat = coords.get('Latitude ')
    lon = coords.get('Longitude ')
    if lat is None or lon is None:
        continue

    year = sighted.get('Year')
    month = sighted.get('Month')
    day = date_sighted.get('Day')
    hour = sighted.get('Hour', 0)
    minute = sighted.get('Minute', 0)

    occurred_at = None
    if year and month and day:
        occurred_at = f"{int(year):04d}-{int(month):02d}-{int(day):02d} {int(hour):02d}:{int(minute):02d}"
    elif year and month:
        occurred_at = f"{int(year):04d}-{int(month):02d}-01 {int(hour):02d}:{int(minute):02d}"
    elif year:
        occurred_at = f"{int(year):04d}-01-01 {int(hour):02d}:{int(minute):02d}"

    reported_at = None
    doc_year = documented.get('Year')
    doc_month = documented.get('Month')
    doc_day = documented.get('Day')
    if doc_year and doc_month and doc_day:
        reported_at = f"{int(doc_year):04d}-{int(doc_month):02d}-{int(doc_day):02d}"

    city = str(loc.get('City') or '').strip()
    state = str(loc.get('State') or '').strip()
    country = str(loc.get('Country') or '').strip()
    shape = str(data.get('Shape') or 'unknown').strip()
    description = str(data.get('Description excerpt') or '').strip()
    duration = data.get('Encounter duration')

    title_bits = []
    if shape:
        title_bits.append(shape.title())
    if city:
        title_bits.append(f"over {city.title()}")
    title = ' '.join(title_bits) if title_bits else f'Sighting {i+1}'

    items.append({
        'id': f'corgis-{i+1}',
        'source': 'corgis',
        'sourceName': 'CORGIS',
        'sourceUrl': 'https://corgis-edu.github.io/corgis/json/ufo_sightings/',
        'title': title,
        'shape': shape.title(),
        'city': city.title(),
        'state': state,
        'country': country,
        'lat': float(lat),
        'lon': float(lon),
        'occurredAt': occurred_at,
        'reportedAt': reported_at,
        'durationSeconds': duration,
        'duration': f"{int(duration)} sec" if isinstance(duration, (int, float)) else 'Unknown',
        'description': description,
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(items, separators=(',', ':')))
print(f'wrote {len(items)} records to {OUT}')
