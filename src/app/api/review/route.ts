import { NextRequest, NextResponse } from "next/server";
import { loadDataset, selectDemoParcel } from "@/lib/tanseeq/data";
import { runReview } from "@/lib/tanseeq/scoring";
import { generateBrief } from "@/lib/tanseeq/llm";
import type {
  CommunityFacility,
  DecisionPriority,
  MobilityCondition,
  ProposedUse,
  ReviewResult,
  ScenarioSettings,
} from "@/lib/tanseeq/types";

// The engine reads CSVs from the filesystem — force the Node runtime.
export const runtime = "nodejs";

const USES: ProposedUse[] = [
  "residential",
  "mixed_use",
  "retail_commercial",
  "community_facility",
  "hospitality",
];
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

function normalizeScenario(body: Record<string, unknown>, demoParcelId: string): ScenarioSettings {
  return {
    parcelId: typeof body.parcelId === "string" && body.parcelId ? body.parcelId : demoParcelId,
    proposedUse: pick(body.proposedUse, USES, "residential"),
    residentialUnits: int(body.residentialUnits, 320),
    retailSharePct: Math.min(100, int(body.retailSharePct, 15)),
    communityFacility: pick(body.communityFacility, FACILITIES, "none"),
    mobilityCondition: pick(body.mobilityCondition, MOBILITY, "none"),
    priority: pick(body.priority, PRIORITIES, "balanced"),
  };
}

export async function POST(request: NextRequest) {
  const data = loadDataset();
  const demo = selectDemoParcel(data);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty / invalid body → assess the demo scenario as submitted
  }

  const scenario = normalizeScenario(body, demo.parcel_id);
  const evidence = runReview(data, scenario);
  const brief = await generateBrief(evidence);

  const result: ReviewResult = { evidence, brief };
  return NextResponse.json(result);
}

// GET returns the auto-selected demo case so the UI can hydrate the intake form
// without guessing a parcel id.
export async function GET() {
  const data = loadDataset();
  const demo = selectDemoParcel(data);
  return NextResponse.json({
    demoParcel: demo,
    districts: data.districts.map((d) => d.district),
    vacantParcels: data.parcels
      .filter((p) => p.current_status === "vacant")
      .slice(0, 40)
      .map((p) => ({
        parcel_id: p.parcel_id,
        district: p.district,
        development_potential_score: p.development_potential_score,
        recommended_use: p.recommended_use,
      })),
  });
}
