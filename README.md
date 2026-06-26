# Tanseeq — AI Development Conditions Officer

**Tanseeq** (Arabic: تنسيق, *coordination*) is an AI Development Conditions Officer. It reviews a
proposed real estate development against the applicable planning code and issues an
**approval-ready coordination file** with one of four determinations:

| Determination | Meaning |
| --- | --- |
| **Proceed** | The proposal complies with the development conditions; positive determination. |
| **Approve with Conditions** | Acceptable in principle; minor departures are resolved through a schedule of conditions. |
| **Re-scope** | One or more material non-compliances require the scheme to be revised and re-submitted. |
| **Hold** | A fundamental impediment (e.g. disallowed use, no legal access, missing servicing) prevents determination. |

The coordination file is an officer-style report containing the determination, a compliance
score, a full assessment against every development condition, a schedule of conditions /
re-scope directives / reasons for hold, an officer's narrative, and the inter-departmental
coordination routing. It can be exported as Markdown or printed to PDF.

## How it works

Tanseeq is a **knowledge-based (expert-system) reviewer**. The reasoning core is deterministic
and fully auditable — every determination traces back to an explicit check against the zoning
regulations.

```
DevelopmentProposal ─▶ Review engine ─▶ ReviewResult ─▶ CoordinationFile
                         │
                         ├─ Submission completeness
                         ├─ Permitted land use            (blocker → Hold)
                         ├─ Plot ratio (FAR)              (condition / major)
                         ├─ Building height & storeys
                         ├─ Site coverage
                         ├─ Boundary setbacks
                         ├─ Residential density
                         ├─ Parking provision             (use-aware requirement)
                         ├─ Landscaping / open space
                         ├─ Site access                   (blocker → Hold)
                         ├─ Utility servicing             (planned → condition, absent → block/major)
                         ├─ Environmental & heritage       (flood, heritage, contamination)
                         └─ Sustainability rating
```

Each check yields a status ordered by escalating severity:
`pass → advisory → condition → major → blocker`. The overall determination is driven by the
worst status present:

- any **blocker** → **Hold**
- else any **major** → **Re-scope**
- else any **condition** → **Approve with Conditions**
- else → **Proceed**

A compliance score (0–100) is computed from weighted penalties and clamped into a band that is
consistent with the determination, so the headline number always reads sensibly.

The zoning regulations live in `src/lib/tanseeq/regulations.ts` and the assessment logic in
`src/lib/tanseeq/engine.ts`. Both are framework-agnostic TypeScript and unit-tested, so the
reasoning core can be reused outside the web app.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vitest** for unit tests
- A server route (`POST /api/review`) runs the engine and returns the coordination file.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Use the **demonstration scenario** cards to load proposals that resolve to each of the four
determinations, or edit any field in the proposal form and click **Generate coordination file**.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Production build (type-checks the whole project). |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run the Vitest engine test suite. |

## Project structure

```
src/
  app/
    page.tsx              # Application shell: form, presets, coordination file
    api/review/route.ts   # Server endpoint that runs the engine
  components/
    ProposalForm.tsx      # Development proposal input form (+ live metric preview)
    CoordinationView.tsx  # The rendered coordination file
    styles.ts             # Verdict / status visual styling
  lib/tanseeq/
    types.ts              # Domain model
    regulations.ts        # Per-zone development control regulations
    engine.ts             # Review engine (checks → verdict → conditions → narrative)
    coordination.ts       # Coordination file builder + Markdown renderer
    presets.ts            # Sample proposals for each determination
    engine.test.ts        # Unit tests
```

> Tanseeq's determinations are advisory and support — but do not replace — statutory
> development consent.
