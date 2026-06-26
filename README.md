# Tanseeq / تنسيق

**AI Development Conditions Briefing Officer** · Track: **Decision Intelligence**

> _Tanseeq_ (Arabic: تنسيق) means **coordination, arrangement, organizing.**

Tanseeq reviews **one vacant parcel** and **one proposed real estate development**, then produces an
**advisory conditions brief for a human review committee**. It is **not** a regulatory approval tool,
**not** a parcel-scoring app, **not** a generic chatbot, and **not** only a zoning checker. It is a
Decision Intelligence prototype that coordinates **land, capital, market, community and mobility**
signals into one review brief.

The committee sees one of four advisory positions:

| Decision readiness | Meaning |
| --- | --- |
| **Support for review** | Signals are aligned; can be supported substantially as submitted. |
| **Support with light conditions** | Minor coordination gap; a couple of light conditions. |
| **Support with conditions** | Material gap between development pressure and community absorption; conditions required. |
| **Re-scope before review** | The gap is wide enough that the scheme should be revised before committee. |
| **Hold for additional evidence** | Inputs are incomplete; Tanseeq will not take a position. |

---

## The problem

Abu Dhabi is growing fast, and every new development adds pressure on the surrounding community. A
parcel can look ready because the land is vacant, the market looks active and investors are
interested — but if nearby **services, amenities and mobility access are not ready**, the project may
create future pressure for residents and operators.

Today these signals are usually reviewed **separately**: land potential, investor fit, market
momentum, service demand, amenity supply, mobility readiness. **Tanseeq connects them into one
coordinated review** so a human committee can see whether a proposal should be supported as
submitted, supported with conditions, re-scoped, or held for more evidence.

## The solution

A **deterministic, auditable reasoning core** runs five coordination checks, computes development
pressure vs community absorption, derives the advisory decision label, and assembles a grounded
**evidence packet**. An **optional AI layer** then writes the committee-style narrative using **only**
that evidence packet — never inventing facts and never claiming approval. With no API keys, a
complete deterministic brief is produced instead, so the app never breaks.

### The five coordination checks

1. **Land / Value** — vacancy, use alignment, development potential, infrastructure, value vs district transaction comps.
2. **Demand / Supply** — service demand index, resident experience, OSM amenity counts (healthcare, education, retail, community, services, parks), added service pressure.
3. **Mobility / Access** — community mobility score, OSM transit amenities (bus stops/stations, fuel, parking), residential density, added access pressure.
4. **Capital Fit** — investor mandates matching district + sector, capital range vs parcel value, risk profile, horizon, strategic fit. Surfaces the matching investors.
5. **Market Momentum** — 2023–2026 transaction trend and price/sqm, listing-status absorption, district yield.

### Core scoring model

```
development_pressure   = land_signal*0.28 + capital_fit*0.22 + market_momentum*0.22
                       + infrastructure_readiness*0.18 + proposal_intensity*0.10

community_absorption   = amenity_support*0.25 + mobility_access*0.25 + resident_experience*0.20
                       + inverse_service_demand*0.20 + community_facility_support*0.10

coordination_divergence = development_pressure − community_absorption
```

Divergence bands → decision: `0–15` Support for review · `16–30` Support with light conditions ·
`31–50` Support with conditions · `51+` Re-scope before review. Missing/incomplete inputs →
Hold for additional evidence. Decision priority (ROI / community / balanced) tilts the thresholds.

## Demo flow

1. App auto-selects a **strong demo case**: a **vacant** parcel with **high development potential**,
   strong land/capital/market signals, but **weak community absorption** and **constrained mobility**
   → **high coordination divergence**. (Live demo lands on `PRC-0096`, Al Ghadeer: potential 87,
   capital fit 95, market 65 — but demand 36, mobility 26 → pressure **69** vs absorption **34**.)
2. Choose **proposed use** and scenario settings (units, retail share, community facility, mobility
   condition, decision priority).
3. **Run Tanseeq Review** → five checks, divergence meter, conditions brief.
4. **Scenario Lab** — compare A (as submitted) · B (add facility) · C (add mobility) · D (both) ·
   E (phase units + conditions). Divergence and decision update live.
5. **Download / print** the advisory conditions brief.

## Data used

All datasets live in [`/data`](data/) so the app runs and deploys independently (no absolute paths at
runtime):

| File | Used by |
| --- | --- |
| `districts.csv` | Land/Value, Market |
| `sample_parcels.csv` | Land/Value, Capital, demo selection |
| `sample_transactions.csv` | Land/Value (comps), Market (trend) |
| `sample_investors.csv` | Capital Fit |
| `sample_communities.csv` | Demand/Supply, Mobility, absorption |
| `sample_listings.csv` | Mobility (density), Market (absorption) |
| `osm_amenities.csv` | Demand/Supply, Mobility |

> Challenge sample datasets are **synthetic** and used for prototype scoring. **`osm_amenities.csv`
> is real OpenStreetMap data** © OpenStreetMap contributors ([ODbL](https://www.openstreetmap.org/copyright)) — attribution shown in the UI and exported brief.

## How AI is used

- The **deterministic layer** computes the five checks, pressure, absorption, divergence, decision
  label and the evidence packet.
- The **AI layer** generates the committee-style explanation (summary, why-not-as-submitted,
  required conditions, evidence references, questions for human review, limitations) from **only**
  the evidence packet, with a strict safety rule: use only the evidence, invent no statistics, claim
  no legal/regulatory approval, say "insufficient evidence" when data is missing, stay advisory.
- The decision label is always **pinned** to the deterministic result — the model can rephrase but
  never override it.

### What works without API keys

**Everything.** With no keys the app produces a complete, grounded **deterministic** conditions brief.
The AI layer is strictly additive.

### Optional LLM environment variables

| Variable | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Use the Anthropic API (`claude-opus-4-8` by default). |
| `ANTHROPIC_MODEL` | Override the Anthropic model id. |
| `OPENAI_API_KEY` | Used if no Anthropic key (`gpt-4o-mini` by default). |
| `OPENAI_MODEL` | Override the OpenAI model id. |

Provider order: Anthropic → OpenAI → deterministic fallback. Any provider error falls back silently.

## How to run

```bash
npm install
npm run dev      # http://localhost:3000
```

| Command | Description |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Production build (type-checks the whole project). |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint. |
| `npm run test` | Vitest suite (CSV parsing, scoring, decision labels, demo selection, scenario divergence, deterministic brief). |

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vitest** for the reasoning-core tests
- Server routes `POST /api/review` (full review + brief) and `POST /api/scenarios` (Scenario Lab comparison)

## Project structure

```
data/                         # CSV datasets (copied in, app-local)
src/
  app/
    page.tsx                  # Portal shell + intelligence room composition
    api/review/route.ts       # Full review (engine + optional LLM)
    api/scenarios/route.ts    # Scenario Lab comparison (engine only)
  components/
    CaseIntake.tsx            # Government-service intake form
    DecisionRoom.tsx          # Dark Cursor-style dashboard
    CheckCard.tsx             # One of the five coordination checks
    DivergenceMeter.tsx       # Pressure vs absorption + decision
    ScenarioLab.tsx           # A–E scenario comparison
    ConditionsBrief.tsx       # Government-style conditions brief
    ui.ts                     # Tone / decision styling
  lib/tanseeq/
    types.ts                  # Domain model
    csv.ts                    # Dependency-free CSV parser
    data.ts                   # Dataset loader + demo-case selection
    scoring.ts                # Five checks → pressure → divergence → label
    evidence.ts               # Evidence packet + deterministic brief
    llm.ts                    # Optional Anthropic / OpenAI layer
    scenarios.ts              # Scenario Lab presets
    export.ts                 # Markdown brief renderer
    tanseeq.test.ts           # Unit tests
```

## Design

A fusion of **TAMM** Abu Dhabi government services (off-white official portal shell), a **Cursor**-style
dark intelligence command center (the Decision Room), and premium real-estate intelligence — teal
accents, subtle gold, Arabic/English microcopy, rounded service cards, status pills, evidence chips,
animated meters.

## What was built during the hackathon

- A new, fully **Decision-Intelligence** reasoning core (the previous build was a deterministic zoning
  compliance officer — that concept and all "approval-ready / Proceed / Approve with Conditions"
  wording was removed).
- Five coordination checks over six real challenge datasets + real OSM amenities.
- The pressure-vs-absorption-vs-divergence model and the advisory decision labels.
- Deterministic, grounded conditions brief + optional Anthropic/OpenAI narrative layer.
- Government-portal + dark-command-center UI, Scenario Lab, and Markdown/PDF export.
- A Vitest suite covering parsing, scoring, decision mapping, demo selection, scenario divergence and
  the no-key fallback brief.

## Cursor usage summary

The initial scaffold was generated in Cursor but built the wrong concept (a zoning-compliance
officer). This iteration refactored it into the final Decision Intelligence brief: replacing the
engine, data layer, API, components and tests; wiring the real challenge CSVs into `/data`; and
adding the optional LLM layer with a deterministic fallback.

---

> Tanseeq's outputs are **advisory** and support — but do not replace — a human review committee. They
> do not grant statutory consent or approval.
