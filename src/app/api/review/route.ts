import { NextRequest, NextResponse } from "next/server";
import { ZONE_REGULATIONS } from "@/lib/tanseeq/regulations";
import { buildCoordinationFile } from "@/lib/tanseeq/coordination";
import type { DevelopmentProposal, LandUse, ServiceStatus, ZoneCode } from "@/lib/tanseeq/types";

const LAND_USES: LandUse[] = [
  "residential",
  "commercial",
  "mixed_use",
  "industrial",
  "hospitality",
  "community",
];
const SERVICE_STATUSES: ServiceStatus[] = ["available", "planned", "absent"];

function num(value: unknown): number {
  const n = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function service(value: unknown): ServiceStatus {
  return SERVICE_STATUSES.includes(value as ServiceStatus) ? (value as ServiceStatus) : "absent";
}

/**
 * Coerce arbitrary JSON into a well-formed proposal so the engine never sees
 * undefined fields, regardless of what the client submits.
 */
function normalizeProposal(body: Record<string, unknown>): DevelopmentProposal {
  const zoneCode = (Object.keys(ZONE_REGULATIONS).includes(str(body.zoneCode))
    ? body.zoneCode
    : "R2") as ZoneCode;
  const proposedUse = (LAND_USES.includes(body.proposedUse as LandUse)
    ? body.proposedUse
    : "residential") as LandUse;
  const u = (body.utilities ?? {}) as Record<string, unknown>;
  const c = (body.siteConstraints ?? {}) as Record<string, unknown>;

  return {
    projectName: str(body.projectName),
    applicant: str(body.applicant),
    parcelId: str(body.parcelId),
    locality: str(body.locality),
    zoneCode,
    proposedUse,
    plotAreaSqm: num(body.plotAreaSqm),
    grossFloorAreaSqm: num(body.grossFloorAreaSqm),
    buildingFootprintSqm: num(body.buildingFootprintSqm),
    buildingHeightM: num(body.buildingHeightM),
    storeys: num(body.storeys),
    dwellingUnits: num(body.dwellingUnits),
    parkingSpaces: num(body.parkingSpaces),
    frontSetbackM: num(body.frontSetbackM),
    sideSetbackM: num(body.sideSetbackM),
    rearSetbackM: num(body.rearSetbackM),
    landscapeAreaSqm: num(body.landscapeAreaSqm),
    greenRating: num(body.greenRating),
    hasLegalAccess: Boolean(body.hasLegalAccess),
    utilities: {
      water: service(u.water),
      power: service(u.power),
      sewer: service(u.sewer),
      stormwater: service(u.stormwater),
    },
    siteConstraints: {
      floodZone: Boolean(c.floodZone),
      heritageOverlay: Boolean(c.heritageOverlay),
      contaminationRisk: Boolean(c.contaminationRisk),
    },
    estimatedJobs: num(body.estimatedJobs),
    notes: str(body.notes),
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const proposal = normalizeProposal(body);
  const file = buildCoordinationFile(proposal);
  return NextResponse.json(file);
}
