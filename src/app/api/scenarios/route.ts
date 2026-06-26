import { NextRequest, NextResponse } from "next/server";
import { loadDataset, selectDemoParcel } from "@/lib/tanseeq/data";
import { runReview } from "@/lib/tanseeq/scoring";
import { SCENARIO_PRESETS } from "@/lib/tanseeq/scenarios";
import type {
  CommunityFacility,
  DecisionPriority,
  MobilityCondition,
  ProposedUse,
  ScenarioSettings,
} from "@/lib/tanseeq/types";

export const runtime = "nodejs";

const USES: ProposedUse[] = ["residential", "mixed_use", "retail_commercial", "community_facility", "hospitality"];
const FACILITIES: CommunityFacility[] = ["none", "clinic", "school", "park", "grocery"];
const MOBILITY: MobilityCondition[] = ["none", "shuttle", "bus_stop", "shaded_walkway"];
const PRIORITIES: DecisionPriority[] = ["roi", "community", "balanced"];

function pick<T>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
function int(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

// Returns the five Scenario Lab comparisons (deterministic, no LLM) for one base
// scenario, so the UI can render the full A–E comparison in a single round trip.
export async function POST(request: NextRequest) {
  const data = loadDataset();
  const demo = selectDemoParcel(data);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* fall through to demo defaults */
  }

  const base: ScenarioSettings = {
    parcelId: typeof body.parcelId === "string" && body.parcelId ? body.parcelId : demo.parcel_id,
    proposedUse: pick(body.proposedUse, USES, "residential"),
    residentialUnits: int(body.residentialUnits, 320),
    retailSharePct: Math.min(100, int(body.retailSharePct, 15)),
    communityFacility: pick(body.communityFacility, FACILITIES, "none"),
    mobilityCondition: pick(body.mobilityCondition, MOBILITY, "none"),
    priority: pick(body.priority, PRIORITIES, "balanced"),
  };

  const comparisons = SCENARIO_PRESETS.map((preset) => {
    const scenario = preset.apply(base);
    const e = runReview(data, scenario);
    return {
      key: preset.key,
      label: preset.label,
      blurb: preset.blurb,
      scenario,
      developmentPressure: e.pressure.developmentPressure,
      communityAbsorption: e.pressure.communityAbsorption,
      coordinationDivergence: e.pressure.coordinationDivergence,
      decisionLabel: e.decisionLabel,
      requiredConditionsCount: e.checks.filter(
        (c) => (c.id === "demand" || c.id === "mobility") && c.score < 60,
      ).length,
    };
  });

  return NextResponse.json({ comparisons });
}
