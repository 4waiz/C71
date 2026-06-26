#!/usr/bin/env python3
"""Fetch a REAL Abu Dhabi amenities layer from OpenStreetMap → ../data/osm_amenities.csv.

This is the one REAL (non-synthetic) dataset in the kit: schools, clinics,
pharmacies, supermarkets, malls, parks, transit stops, banks and more — with
coordinates — for the whole Abu Dhabi city + islands area. Great for Future
Communities / mobility / map prototypes; joins to the synthetic data by the
nearest canonical district (and by raw lat/long).

Data © OpenStreetMap contributors, licensed under the ODbL
(https://www.openstreetmap.org/copyright) — attribution required if you ship it.

Run (from the starter-kit root; needs network, NOT run in CI):
    .venv/bin/python datagen/fetch_osm.py

Bounding box is Abu Dhabi only (excludes Dubai/Sharjah by construction).
"""

import csv
import json
import math
import time
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data"
BBOX = (24.20, 54.25, 24.62, 54.85)  # south, west, north, east — Abu Dhabi area
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# OSM tag -> (category, subtype). Curated for the four tracks.
TAGS = {
    'amenity=school': ("education", "school"),
    'amenity=kindergarten': ("education", "kindergarten"),
    'amenity=university': ("education", "university"),
    'amenity=college': ("education", "college"),
    'amenity=hospital': ("healthcare", "hospital"),
    'amenity=clinic': ("healthcare", "clinic"),
    'amenity=doctors': ("healthcare", "doctors"),
    'amenity=pharmacy': ("healthcare", "pharmacy"),
    'shop=supermarket': ("retail", "supermarket"),
    'shop=mall': ("retail", "mall"),
    'amenity=marketplace': ("retail", "marketplace"),
    'amenity=bank': ("services", "bank"),
    'amenity=fuel': ("services", "fuel_station"),
    'leisure=park': ("community", "park"),
    'leisure=playground': ("community", "playground"),
    'amenity=community_centre': ("community", "community_centre"),
    'amenity=place_of_worship': ("community", "place_of_worship"),
    'highway=bus_stop': ("mobility", "bus_stop"),
    'amenity=bus_station': ("mobility", "bus_station"),
    'amenity=ferry_terminal': ("mobility", "ferry_terminal"),
}


def build_query() -> str:
    s, w, n, e = BBOX
    parts = []
    for tag in TAGS:
        k, v = tag.split("=")
        for typ in ("node", "way"):
            parts.append(f'{typ}["{k}"="{v}"]({s},{w},{n},{e});')
    return f"[out:json][timeout:120];({''.join(parts)});out center tags;"


def fetch() -> list:
    q = build_query().encode()
    for url in ENDPOINTS:
        try:
            print(f"querying {url} ...")
            req = urllib.request.Request(url, data=b"data=" + urllib.parse.quote(q.decode()).encode(),
                                         headers={"User-Agent": "adcc-osm/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())["elements"]
        except Exception as exc:
            print(f"  failed: {exc}; trying next endpoint")
            time.sleep(2)
    raise SystemExit("All Overpass endpoints failed — try again later.")


def load_districts():
    rows = list(csv.DictReader(open(OUT / "districts.csv")))
    return [(d["district"], float(d["latitude"]), float(d["longitude"])) for d in rows]


def nearest_district(lat, lon, districts):
    best, bestd = None, 1e9
    for name, dlat, dlon in districts:
        d = (lat - dlat) ** 2 + (lon - dlon) ** 2
        if d < bestd:
            best, bestd = name, d
    return best


import urllib.parse  # noqa: E402 (used in fetch)


def main():
    districts = load_districts()
    elements = fetch()
    seen, rows = set(), []
    for el in elements:
        tags = el.get("tags", {})
        cat = sub = None
        for tag, (c, s) in TAGS.items():
            k, v = tag.split("=")
            if tags.get(k) == v:
                cat, sub = c, s
                break
        if not cat:
            continue
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue
        key = (el["type"], el["id"])
        if key in seen:
            continue
        seen.add(key)
        name = (tags.get("name:en") or tags.get("name") or f"(unnamed {sub})").strip()
        rows.append([f"{el['type'][0].upper()}{el['id']}", cat, sub, name,
                     round(lat, 6), round(lon, 6), nearest_district(lat, lon, districts)])
    rows.sort(key=lambda r: (r[1], r[6], r[3]))
    header = ["amenity_id", "category", "subtype", "name", "latitude", "longitude", "district"]
    with (OUT / "osm_amenities.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"\nwrote osm_amenities.csv: {len(rows)} amenities")
    from collections import Counter
    print("by category:", dict(Counter(r[1] for r in rows)))


if __name__ == "__main__":
    main()
