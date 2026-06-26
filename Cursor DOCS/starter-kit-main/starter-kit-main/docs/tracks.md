# Challenge Tracks

Four tracks, one question each. Pick the one that fits your team — depth beats breadth.

---

## 🗺️ Track 1: Land Intelligence

**How can AI make land understandable?**

Land is the city's base layer, but raw parcel data — zoning codes, sizes, statuses — doesn't tell anyone what to do. Build something that turns parcel data into judgment.

**Example directions**

- A parcel scoring engine that ranks development potential and explains its reasoning
- A land-use recommender: given a parcel, what should be built there and why
- A natural-language interface over parcel data ("show me underused commercial land near high-demand districts")
- An anomaly finder that flags parcels whose status, value, or use looks inconsistent
- An underutilized-land detector with monetization recommendations
- A strategic land-allocation advisor: given city priorities, which parcels serve them best

**Data to use**
- `sample_parcels.csv` — the core: `development_potential_score`, `current_status` (filter `vacant`), `infrastructure_score`, `estimated_value_aed`, `recommended_use`
- `districts.csv` — base price/sqm + centroid per district · `sample_transactions.csv` — synthetic comps for valuation
- `osm_amenities.csv` (**real** OSM data) — what's actually around a parcel, by coordinates

**Example code:** [`examples/land-intelligence-agent/`](../examples/land-intelligence-agent/) (runs with no API key)

---

## 💼 Track 2: Investment Intelligence

**How can AI connect capital to opportunity?**

Investors have mandates; cities have assets. Matching them today is manual, slow, and relationship-driven. Build something that does it with intelligence.

**Example directions**

- An investor–opportunity matching engine that pairs mandates with parcels or assets, with explained fit scores
- A market signal analyzer over transaction data: trends, momentum, pricing anomalies by district
- A deal memo generator: given an asset and an investor profile, draft the one-page investment case
- A portfolio construction tool that assembles district/asset mixes to fit a risk profile
- An investor segmentation engine that detects demand signals before they show up in transactions
- A capital-allocation recommender across districts and asset types

**Data to use**
- `sample_investors.csv` — mandates: `preferred_sector`, `preferred_district`, `capital_range_aed`, `risk_profile`, `investment_horizon`
- `sample_transactions.csv` — **5,000 rows, a synthetic 2023–2026 time series with seasonality** (ideal for forecasting/momentum)
- `sample_listings.csv` — 6,000 rent/buy listings · `districts.csv` — yields & base prices · `sample_parcels.csv`
- 🎁 **Bonus:** real live listings via the [`live-data-connector`](../examples/live-data-connector/)

**Example code:** [`examples/investment-matching-agent/`](../examples/investment-matching-agent/)

---

## 🏙️ Track 3: Future Communities

**How can AI improve how people live?**

Communities generate demand for services, mobility, and experience — and the data to see it. Build something that helps a city respond before residents have to complain.

**Example directions**

- A service demand forecaster: where will schools, clinics, or retail be under- or over-supplied
- A mobility insight tool that finds districts where movement scores lag and proposes interventions
- A resident experience dashboard that explains *why* a community scores low and what would move it
- A community matching tool: given a household profile, which district fits best and why
- A community operations copilot: amenity and service optimization for operators
- A community performance scorer that explains what drives the score and what would move it

**Data to use**
- `sample_communities.csv` — `service_demand_index`, `mobility_score`, `resident_experience_score`, `optimization_opportunity`
- `osm_amenities.csv` (**real** OSM — 3,155 schools/clinics/parks/transit with lat/long): **join by `district` to compare a community's demand against the amenities actually on the ground** — the standout idea for this track
- `sample_listings.csv` (coordinates for maps) · `districts.csv`

**Starter:** no dedicated agent here — start from the [exploration notebook](../notebooks/explore_sample_data.ipynb) and the decision-copilot pattern. Coordinates everywhere make maps an easy demo win.

---

## 🧭 Track 4: Decision Intelligence

**How can AI help decision-makers act?**

The hardest part of city data isn't collecting it — it's getting a clear answer out of it at the moment a decision is made. Build the layer between the data and the decision.

**Example directions**

- A decision copilot that answers cross-dataset questions in plain language, with sources
- An automated morning briefing: what changed across land, investment, and communities, and what needs attention
- A scenario tool: "if district X adds 5,000 residents, what happens to services, land demand, and prices?"
- A recommendation engine that proposes the next three actions for a given district, with evidence
- A policy & planning support tool that evaluates city-scale development scenarios
- A multi-agent system where land, investment and community agents negotiate a recommendation

**Data to use:** *all seven datasets, joined on `district`* — `districts.csv` is the spine; `sample_parcels`, `sample_transactions`, `sample_investors`, `sample_communities`, `sample_listings` and the real `osm_amenities` all hang off it.
**Example code:** [`examples/decision-copilot/`](../examples/decision-copilot/) (Q&A across the datasets)

---

## Choosing a track

- You submit under **one** track (selected in the submission form).
- Cross-cutting projects are welcome — pick the track that names your primary user.
- Judges score within tracks for track prizes and across tracks for Best Overall.
