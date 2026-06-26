#!/usr/bin/env python3
"""Synthetic dataset generator for the Abu Dhabi AI PropTech Challenge.

Produces six internally-consistent CSVs in ../data, grounded in real Abu Dhabi
districts and plausible market ranges. Everything is SYNTHETIC — district names
are real, but every value is generated. Deterministic (fixed SEED), stdlib-only.

Regenerate (from the starter-kit root):
    .venv/bin/python datagen/generate.py      # or any Python 3.10+

Consistency model (so cross-dataset prototypes actually work):
- A canonical DISTRICTS table assigns each district a base sale price per sqm,
  a gross rental yield, an infrastructure score and a centroid (lat/lng).
- Parcel valuations, transaction prices, and listing prices all derive from the
  district base × asset/type multipliers × mild time appreciation × noise.
- Communities, investors, parcels, transactions and listings all key on
  `district`, so they join cleanly. Listings also carry their own lat/lng.
"""

import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 20260626
rng = random.Random(SEED)
OUT = Path(__file__).resolve().parents[1] / "data"
OUT.mkdir(exist_ok=True)

START = date(2023, 1, 1)
END = date(2026, 5, 31)
SPAN_MONTHS = (END.year - START.year) * 12 + (END.month - START.month)
APPRECIATION_PER_MONTH = 0.006  # ~7.4%/yr compounding, modest

# district, area_type, profile, base_sale_aed_per_sqm, gross_yield_pct, infra, lat, lng, established
DISTRICTS = [
    ("Saadiyat Island",          "island",   "premium",      19000, 6.0, 92, 24.5450, 54.4310, 2009),
    ("Al Maryah Island",         "island",   "premium",      22000, 6.0, 96, 24.5000, 54.3900, 2014),
    ("Yas Island",               "island",   "leisure",      14000, 7.0, 88, 24.4900, 54.6030, 2009),
    ("Al Reem Island",           "island",   "mid_high",     13000, 7.5, 86, 24.4930, 54.4060, 2010),
    ("Al Raha Beach",            "waterfront","high",         14500, 7.0, 87, 24.4600, 54.6100, 2011),
    ("Al Bateen",                "waterfront","premium",      16000, 6.0, 90, 24.4520, 54.3320, 1990),
    ("Corniche",                 "central",  "established",   15000, 6.5, 93, 24.4720, 54.3380, 1980),
    ("Al Khalidiyah",            "central",  "established",   13500, 6.8, 89, 24.4660, 54.3490, 1985),
    ("Al Zahiyah",               "central",  "mid",          11000, 7.5, 80, 24.4900, 54.3720, 1982),
    ("Danet Abu Dhabi",          "central",  "mid_high",     12000, 7.0, 82, 24.4310, 54.3900, 2008),
    ("Masdar City",              "mainland", "innovation",   12000, 7.0, 90, 24.4300, 54.6140, 2010),
    ("Khalifa City",             "mainland", "mid",           9500, 7.5, 72, 24.4200, 54.5800, 2002),
    ("Mohammed Bin Zayed City",  "mainland", "mid_affordable",8500, 8.0, 68, 24.3200, 54.5400, 2001),
    ("Zayed City",               "mainland", "emerging",      9000, 7.5, 70, 24.3300, 54.5500, 2018),
    ("Al Maqta",                 "mainland", "mid",           9000, 7.5, 74, 24.4000, 54.5100, 2004),
    ("Al Shamkha",               "mainland", "affordable",    7500, 8.5, 63, 24.3400, 54.7200, 2012),
    ("Al Reef",                  "mainland", "affordable",    7000, 8.5, 65, 24.4300, 54.7000, 2009),
    ("Al Ghadeer",               "border",   "affordable",    6500, 9.0, 60, 24.3000, 54.7800, 2011),
    ("Al Bahia",                 "coastal",  "mid",           8000, 8.0, 67, 24.5500, 54.6600, 2006),
    ("Mussafah",                 "mainland", "industrial",    6000, 8.5, 66, 24.3500, 54.5000, 1995),
]
DCOLS = ["district", "area_type", "profile", "base_sale_aed_sqm", "gross_yield_pct",
         "infrastructure_score", "latitude", "longitude", "established_year"]
DMAP = {d[0]: dict(zip(DCOLS, d)) for d in DISTRICTS}
NAMES = [d[0] for d in DISTRICTS]


def noise(pct):
    """Multiplicative lognormal-ish noise, ~1.0 mean, +/- pct one-sigma."""
    return max(0.4, math.exp(rng.gauss(0, pct)))


def jitter(val, deg):
    return round(val + rng.uniform(-deg, deg), 5)


def appreciation(months_from_start):
    return (1 + APPRECIATION_PER_MONTH) ** months_from_start


def weighted(choices):
    items, weights = zip(*choices)
    return rng.choices(items, weights=weights, k=1)[0]


def write(name, header, rows):
    path = OUT / name
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  {name}: {len(rows)} rows")


# --- districts (NEW dimension table) ---------------------------------------
def gen_districts():
    write("districts.csv", DCOLS, [[DMAP[n][c] for c in DCOLS] for n in NAMES])


# --- parcels ----------------------------------------------------------------
LAND_USES = [("residential", 5), ("mixed_use", 3), ("commercial", 3),
             ("hospitality", 2), ("community", 2), ("industrial", 2)]
ZONE_PREFIX = {"residential": "RES", "mixed_use": "MIX", "commercial": "COM",
               "hospitality": "HOS", "community": "CMU", "industrial": "IND"}
STATUS = [("vacant", 4), ("under_development", 3), ("developed", 4), ("reserved", 1)]
REC = {
    "residential": ["high_rise_residential", "low_rise_residential", "beachfront_residential",
                    "affordable_housing", "mid_rise_residential", "sustainable_residential"],
    "mixed_use": ["transit_oriented_development", "waterfront_mixed_use", "cultural_mixed_use",
                  "premium_mixed_use", "marina_mixed_use"],
    "commercial": ["financial_offices", "innovation_offices", "neighborhood_retail",
                   "coworking_offices", "entertainment_retail"],
    "hospitality": ["resort_hospitality", "marina_hotel", "urban_boutique_hotel"],
    "community": ["school_campus", "healthcare_cluster", "university_expansion", "civic_center"],
    "industrial": ["light_logistics", "cleantech_manufacturing", "ev_assembly_facility",
                   "warehousing_hub"],
}
LANDUSE_SQM = {"residential": (6000, 26000), "mixed_use": (6000, 30000),
               "commercial": (3500, 12000), "hospitality": (5000, 22000),
               "community": (8000, 18000), "industrial": (12000, 45000)}
LAND_VALUE_FACTOR = 0.35  # raw land per-sqm vs built sale per-sqm


def gen_parcels(n=600):
    rows = []
    for i in range(1, n + 1):
        d = rng.choice(NAMES)
        info = DMAP[d]
        use = weighted(LAND_USES)
        lo, hi = LANDUSE_SQM[use]
        size = rng.randint(lo, hi)
        infra = int(min(100, max(35, info["infrastructure_score"] + rng.gauss(0, 6))))
        potential = int(min(100, max(30, rng.gauss(74, 14))))
        status = weighted(STATUS)
        value = info["base_sale_aed_sqm"] * LAND_VALUE_FACTOR * size * noise(0.18)
        rows.append([
            f"PRC-{i:04d}", d, f"Z-{ZONE_PREFIX[use]}-{rng.randint(1,5):02d}", use, size,
            status, infra, potential, int(round(value, -4)), rng.choice(REC[use]),
        ])
    header = ["parcel_id", "district", "zone", "land_use", "parcel_size_sqm", "current_status",
              "infrastructure_score", "development_potential_score", "estimated_value_aed",
              "recommended_use"]
    write("sample_parcels.csv", header, rows)


# --- transactions -----------------------------------------------------------
ASSET = [("apartment", 5, (60, 260), 1.0), ("villa", 3, (250, 700), 1.12),
         ("townhouse", 2, (180, 360), 1.05), ("office", 2, (120, 1500), 1.10),
         ("retail", 2, (60, 900), 1.22), ("land", 2, (3000, 30000), LAND_VALUE_FACTOR),
         ("warehouse", 1, (1500, 6000), 0.25), ("hotel", 1, (4000, 12000), 0.6)]
BUYER = [("individual", 5), ("corporate", 3), ("fund", 2), ("developer", 2)]
SEASON = {1: 1.05, 2: 1.05, 3: 1.10, 4: 1.0, 5: 0.95, 6: 0.85, 7: 0.8, 8: 0.8,
          9: 0.95, 10: 1.1, 11: 1.15, 12: 1.0}  # Q4/spring active, summer slow


def gen_transactions(n=5000):
    days = (END - START).days
    rows = []
    for i in range(1, n + 1):
        dt = START + timedelta(days=rng.randint(0, days))
        # bias volume by season via rejection-ish weighting
        if rng.random() > SEASON[dt.month]:
            dt = START + timedelta(days=rng.randint(0, days))
        d = rng.choice(NAMES)
        info = DMAP[d]
        name, _, (lo, hi), mult = rng.choices(ASSET, weights=[a[1] for a in ASSET], k=1)[0]
        size = rng.randint(lo, hi)
        months = (dt.year - START.year) * 12 + (dt.month - START.month)
        ppsqm = info["base_sale_aed_sqm"] * mult * appreciation(months) * noise(0.16)
        ppsqm = int(round(ppsqm))
        value = int(round(ppsqm * size, -3))
        rows.append([f"TXN-{i:05d}", dt.isoformat(), d, name, value, size, ppsqm, weighted(BUYER)])
    rows.sort(key=lambda r: r[1])
    header = ["transaction_id", "date", "district", "asset_type", "transaction_value_aed",
              "size_sqm", "price_per_sqm", "buyer_type"]
    write("sample_transactions.csv", header, rows)


# --- investors --------------------------------------------------------------
INV_TYPE = [("sovereign_fund", 1), ("institutional", 2), ("private_equity", 3),
            ("family_office", 3), ("developer", 3), ("reit", 2), ("hnwi", 4)]
SECTOR = [("residential", 5), ("commercial", 3), ("hospitality", 3),
          ("mixed_use", 3), ("logistics", 2), ("industrial", 2), ("community", 1)]
RISK = [("conservative", 4), ("balanced", 4), ("aggressive", 3)]
HORIZON = [("short", 2), ("medium", 4), ("long", 4)]
CAP_BANDS = ["8M-40M", "15M-60M", "30M-120M", "50M-200M", "100M-400M",
             "150M-600M", "200M-800M", "400M-1.5B", "500M-2B", "600M-2.5B"]


def gen_investors(n=200):
    rows = []
    for i in range(1, n + 1):
        rows.append([
            f"INV-{i:03d}", weighted(INV_TYPE), weighted(SECTOR), rng.choice(NAMES),
            rng.choice(CAP_BANDS), weighted(RISK), weighted(HORIZON),
            int(min(100, max(45, rng.gauss(80, 10)))),
        ])
    header = ["investor_id", "investor_type", "preferred_sector", "preferred_district",
              "capital_range_aed", "risk_profile", "investment_horizon", "strategic_fit_score"]
    write("sample_investors.csv", header, rows)


# --- communities ------------------------------------------------------------
OPT = ["expand_school_capacity", "add_clinic_capacity", "improve_bus_coverage",
       "improve_last_mile_transit", "add_grocery_retail", "improve_park_access",
       "reduce_parking_pressure", "accelerate_transit_link", "expand_retail_offering",
       "add_nursery_capacity", "improve_cycle_paths", "add_community_events"]
SUFFIX = ["Towers", "Gardens", "Residences", "Square", "Park", "Views", "Heights",
          "Quarter", "Commons", "Bay"]


def gen_communities(n=90):
    rows = []
    used = set()
    for i in range(1, n + 1):
        d = rng.choice(NAMES)
        info = DMAP[d]
        name = f"{d} {rng.choice(SUFFIX)}"
        while name in used:
            name = f"{d} {rng.choice(SUFFIX)}"
        used.add(name)
        pop = int(max(4000, rng.gauss(60000, 45000)))
        occ = round(min(0.98, max(0.65, rng.gauss(0.88, 0.07))), 2)
        # affordable/industrial districts carry more unmet service demand
        demand_base = {"premium": 48, "established": 55, "mid_high": 60, "leisure": 58,
                       "high": 57, "innovation": 45, "mid": 70, "emerging": 74,
                       "mid_affordable": 80, "affordable": 84, "industrial": 86,
                       "border": 82, "coastal": 67}.get(info["profile"], 65)
        demand = int(min(95, max(35, rng.gauss(demand_base, 7))))
        mobility = int(min(95, max(45, info["infrastructure_score"] - 5 + rng.gauss(0, 8))))
        experience = int(min(95, max(50, 150 - demand + rng.gauss(0, 6) - (5 if info["profile"]=="industrial" else 0))))
        experience = min(95, max(50, experience if experience < 96 else 90))
        rows.append([f"COM-{i:03d}", d, pop, occ, demand, mobility,
                     min(92, experience), rng.choice(OPT)])
    header = ["community_id", "district", "population_estimate", "occupancy_rate",
              "service_demand_index", "mobility_score", "resident_experience_score",
              "optimization_opportunity"]
    write("sample_communities.csv", header, rows)


# --- listings (NEW — modeled on a residential rent/buy portal API) ----------
PTYPE = [  # type, weight, (sqm lo, hi), (beds lo, hi), sale_mult
    ("studio", 3, (28, 50), (0, 0), 1.05),
    ("apartment", 6, (55, 240), (1, 4), 1.0),
    ("townhouse", 2, (170, 360), (2, 5), 1.05),
    ("villa", 2, (260, 720), (3, 7), 1.12),
    ("penthouse", 1, (190, 520), (3, 5), 1.35),
]
AMENITIES = ["pool", "gym", "covered_parking", "balcony", "maids_room", "study",
             "shared_garden", "kids_play_area", "security_24h", "beach_access",
             "concierge", "central_ac", "built_in_wardrobes", "smart_home", "ev_charger"]
LISTING_TYPE = [("rent", 6), ("sale", 4)]
LSTATUS_RENT = [("available", 6), ("under_offer", 2), ("let", 2)]
LSTATUS_SALE = [("available", 6), ("under_offer", 2), ("sold", 2)]
AGENCY = [("brokerage", 5), ("developer_direct", 3), ("private_owner", 2)]


def gen_listings(n=6000):
    rows = []
    end_ord = END.toordinal()
    for i in range(1, n + 1):
        d = rng.choice(NAMES)
        info = DMAP[d]
        ptype, _, (slo, shi), (blo, bhi), mult = rng.choices(PTYPE, weights=[p[1] for p in PTYPE], k=1)[0]
        size = rng.randint(slo, shi)
        beds = 0 if ptype == "studio" else rng.randint(blo, bhi)
        baths = max(1, beds + rng.choice([-1, 0, 0, 1]))
        ltype = weighted(LISTING_TYPE)
        sale_value = info["base_sale_aed_sqm"] * mult * size * noise(0.15)
        if ltype == "sale":
            price = int(round(sale_value, -3))
            status = weighted(LSTATUS_SALE)
        else:
            annual_rent = sale_value * (info["gross_yield_pct"] / 100) * noise(0.12)
            price = int(round(annual_rent, -3))
            status = weighted(LSTATUS_RENT)
        ppsqm = int(round(price / size))
        k = rng.randint(2, 6)
        amenities = ";".join(sorted(rng.sample(AMENITIES, k)))
        listed = date.fromordinal(end_ord - rng.randint(0, 365))
        rows.append([
            f"LST-{i:05d}", d, f"{d} {rng.choice(SUFFIX)}", ltype, ptype, beds, baths, size,
            price, ppsqm, rng.choice(["true", "false"]), amenities,
            jitter(info["latitude"], 0.018), jitter(info["longitude"], 0.022),
            listed.isoformat(), status, weighted(AGENCY),
        ])
    header = ["listing_id", "district", "community", "listing_type", "property_type", "bedrooms",
              "bathrooms", "size_sqm", "price_aed", "price_per_sqm_aed", "furnished", "amenities",
              "latitude", "longitude", "listed_date", "status", "agency_type"]
    write("sample_listings.csv", header, rows)


def main():
    print("Generating synthetic datasets (SEED=%d) ..." % SEED)
    gen_districts()
    gen_parcels()
    gen_transactions()
    gen_investors()
    gen_communities()
    gen_listings()
    print("Done. All values are synthetic.")


if __name__ == "__main__":
    main()
