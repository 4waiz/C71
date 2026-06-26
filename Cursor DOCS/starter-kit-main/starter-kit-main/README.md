# Abu Dhabi AI PropTech Challenge — Starter Kit

**Building the Intelligence Layer for Land, Investment and Communities**

[![Starter kit health](https://github.com/abu-dhabi-ai-proptech-challenge/starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/abu-dhabi-ai-proptech-challenge/starter-kit/actions/workflows/ci.yml) — every example, dataset and notebook here is exercised by CI on every change and weekly. If this badge is green, everything below works.

A one-day AI challenge hosted by **[Cursor](https://cursor.com)** and **[eVoost AI](https://evoost.ai)** at **Hub71, Abu Dhabi**. In a single day, teams design and ship working AI prototypes that make a city's land, capital, and communities easier to understand and act on.

This repo is your starting point: the challenge brief, the tracks, synthetic datasets, runnable example agents, and everything you need to go from idea to demo.

## Event details

| | |
|---|---|
| **Date** | Friday, 26 June 2026 |
| **Format** | One-day, in-person AI challenge |
| **Venue** | Hub71, Abu Dhabi |
| **Hosts** | Cursor × eVoost AI |
| **Teams** | 1–3 people |
| **Deliverable** | Working prototype + demo (deployed link or 2–3 min video) |
| **Submission** | GitHub Issue in the [`submissions`](https://github.com/abu-dhabi-ai-proptech-challenge/submissions) repo |

## Challenge tracks

| Track | Build something that... |
|---|---|
| 🗺️ **Land Intelligence** | Understands land — scoring parcels, recommending land use, surfacing development potential |
| 💼 **Investment Intelligence** | Connects capital to opportunity — matching investors to assets, analyzing market signals |
| 🏙️ **Future Communities** | Improves how people live — service demand, mobility, resident experience |
| 🧭 **Decision Intelligence** | Helps decision-makers act — copilots, briefings, scenario analysis across city data |

Full details in [`docs/tracks.md`](docs/tracks.md).

## Quick start

**One command** (macOS / Linux / WSL — needs Python 3.10+):

```bash
git clone https://github.com/abu-dhabi-ai-proptech-challenge/starter-kit.git
cd starter-kit && ./quickstart.sh
```

That creates a virtualenv, installs everything, and runs an example agent end to end.

**Zero-install option:** open the data walkthrough straight in Google Colab — nothing to set up:
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/abu-dhabi-ai-proptech-challenge/starter-kit/blob/main/notebooks/explore_sample_data.ipynb)

**Windows (PowerShell) — also one command:**

```powershell
git clone https://github.com/abu-dhabi-ai-proptech-challenge/starter-kit.git
cd starter-kit
powershell -ExecutionPolicy Bypass -File .\quickstart.ps1
```

The example agents also run **without the data folder** — if `data/` isn't next to them, they pull the CSVs from Hugging Face automatically.

Want a web app instead? Generate a repo from the [`project-template`](https://github.com/abu-dhabi-ai-proptech-challenge/project-template) — a Next.js + TypeScript + Tailwind dashboard ready for your prototype.

## Datasets

Six synthetic datasets in [`data/`](data/), internally consistent and grounded in 20 real Abu Dhabi districts:

| File | Rows | Describes |
|---|---|---|
| `districts.csv` | 20 | Reference table: base price/sqm, yield, infrastructure score, centroid per district |
| `sample_parcels.csv` | 600 | Land parcels: zoning, size, status, infrastructure and potential scores |
| `sample_transactions.csv` | 5,000 | Property transactions 2023–2026: asset, value, price/sqm, seasonality |
| `sample_investors.csv` | 200 | Investor profiles: type, sector, capital range, risk, horizon |
| `sample_communities.csv` | 90 | Community metrics: population, occupancy, services, mobility, experience |
| `sample_listings.csv` | 6,000 | Residential rent/buy listings with lat/long (portal-style) |
| `osm_amenities.csv` | 3,155 | **REAL** Abu Dhabi amenities from OpenStreetMap (lat/long + district) |

Everything keys on `district`, so the datasets join cleanly; `sample_listings.csv` and `osm_amenities.csv` carry their own coordinates for map work. The `sample_*`/`districts` files are **synthetic** (regenerate via [`datagen/generate.py`](datagen/)); **`osm_amenities.csv` is real** OpenStreetMap data (© OSM contributors, ODbL — attribute if you redistribute, refresh via [`datagen/fetch_osm.py`](datagen/)). Column definitions in [`docs/datasets.md`](docs/datasets.md). You're welcome to bring your own public datasets too.

> 🎁 **Bonus — real live data:** want messy, real Abu Dhabi listings? The [`live-data-connector`](examples/live-data-connector/) example pulls them from eVoost's UAE data API. Optional and advanced — the synthetic data above is your guaranteed foundation. API key is in Discord (not in this repo).

## How to submit

1. Build in your own repo (or from the [`project-template`](https://github.com/abu-dhabi-ai-proptech-challenge/project-template)).
2. Before the deadline, open an Issue in [`submissions`](https://github.com/abu-dhabi-ai-proptech-challenge/submissions) using the **Project Submission** form.
3. Include your repo link, demo link, and what you built during the day.

Full instructions: [`docs/submission-guide.md`](docs/submission-guide.md). Judging criteria: [`docs/judging-criteria.md`](docs/judging-criteria.md).

## Repo map

```
docs/        Challenge brief, tracks, datasets, judging, submission guide, FAQ
data/        Synthetic CSV datasets
examples/    Three runnable example agents (no API keys required)
notebooks/   Jupyter notebook to explore the data
assets/      Brand assets
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `python3: command not found` | Install Python 3.10+ from [python.org](https://python.org) (Windows: tick "Add to PATH") |
| `command not found: pip` | Don't use bare `pip` — run `./quickstart.sh`, which sets everything up inside a virtualenv |
| Windows: `python` opens the Microsoft Store | That's a Windows stub, not Python — install from [python.org](https://python.org) ("Add to PATH"); `quickstart.ps1` detects and avoids the stub |
| Windows: "running scripts is disabled" | Use the exact command above (`-ExecutionPolicy Bypass`) — it bypasses the policy for this one script only |
| `ModuleNotFoundError: pandas` | You're outside the virtualenv — use `.venv/bin/python` (or `.venv\Scripts\python` on Windows) |
| Notebook plots fail | `pip install matplotlib` (included in `quickstart.sh`) |
| Corporate laptop blocks pip | Use the [Colab notebook](https://colab.research.google.com/github/abu-dhabi-ai-proptech-challenge/starter-kit/blob/main/notebooks/explore_sample_data.ipynb) — runs in the browser |
| Anything else | Ask in [Discord](https://discord.gg/jy3QDxQ3jK) `#help-desk` — the AI assistant + mentors answer fast |

## Links

- 🌐 Website: https://challenge.evoost.ai
- 💬 Discord: https://discord.gg/jy3QDxQ3jK
- 🐙 GitHub Org: https://github.com/abu-dhabi-ai-proptech-challenge
- 🤗 Hugging Face: https://huggingface.co/datasets/eVoost/abu-dhabi-ai-proptech-challenge
- 📝 Registration: https://challenge.evoost.ai/#register

## Code of conduct

Be excellent to each other. Full text: [`docs/code-of-conduct.md`](docs/code-of-conduct.md).

---

Licensed under the [MIT License](LICENSE).
