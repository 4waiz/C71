// Core domain model for Tanseeq — the AI Development Conditions Officer.

export type LandUse =
  | "residential"
  | "commercial"
  | "mixed_use"
  | "industrial"
  | "hospitality"
  | "community";

export const LAND_USE_LABELS: Record<LandUse, string> = {
  residential: "Residential",
  commercial: "Commercial",
  mixed_use: "Mixed-use",
  industrial: "Industrial",
  hospitality: "Hospitality",
  community: "Community / Civic",
};

export type ZoneCode = "R1" | "R2" | "R3" | "C1" | "MU" | "IND" | "HOS";

export type ServiceStatus = "available" | "planned" | "absent";

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  available: "Available at boundary",
  planned: "Planned / committed",
  absent: "Not available",
};

/**
 * Planning regulations applicable to a development zone. These encode the
 * "development conditions" that Tanseeq assesses a proposal against.
 */
export interface ZoneRegulation {
  code: ZoneCode;
  name: string;
  summary: string;
  permittedUses: LandUse[];
  maxPlotRatio: number; // Floor Area Ratio = GFA / plot area
  maxHeightM: number;
  maxStoreys: number;
  maxSiteCoverPct: number; // building footprint as % of plot area
  minFrontSetbackM: number;
  minSideSetbackM: number;
  minRearSetbackM: number;
  minLandscapePct: number; // soft landscaping as % of plot area
  minParkingPerUnit: number; // applied to dwelling units
  parkingPer100SqmGfa: number; // applied to non-residential GFA
  maxDensityUnitsPerHa: number; // 0 = not applicable
  minGreenRating: number; // sustainability stars (0-5)
}

export interface UtilityServices {
  water: ServiceStatus;
  power: ServiceStatus;
  sewer: ServiceStatus;
  stormwater: ServiceStatus;
}

export interface SiteConstraints {
  floodZone: boolean;
  heritageOverlay: boolean;
  contaminationRisk: boolean;
}

/**
 * A proposed real estate development submitted for review.
 */
export interface DevelopmentProposal {
  projectName: string;
  applicant: string;
  parcelId: string;
  locality: string;
  zoneCode: ZoneCode;
  proposedUse: LandUse;
  plotAreaSqm: number;
  grossFloorAreaSqm: number;
  buildingFootprintSqm: number;
  buildingHeightM: number;
  storeys: number;
  dwellingUnits: number;
  parkingSpaces: number;
  frontSetbackM: number;
  sideSetbackM: number;
  rearSetbackM: number;
  landscapeAreaSqm: number;
  greenRating: number;
  hasLegalAccess: boolean;
  utilities: UtilityServices;
  siteConstraints: SiteConstraints;
  estimatedJobs: number;
  notes: string;
}

/**
 * Status of an individual assessment check, ordered by escalating severity.
 * - pass:      compliant, no action.
 * - advisory:  compliant but worth noting; informational.
 * - condition: minor non-compliance, resolvable via a consent condition.
 * - major:     material non-compliance; the scheme must be revised (re-scope).
 * - blocker:   fundamental impediment; consent cannot be granted (hold).
 */
export type CheckStatus = "pass" | "advisory" | "condition" | "major" | "blocker";

export const CHECK_SEVERITY: Record<CheckStatus, number> = {
  pass: 0,
  advisory: 1,
  condition: 2,
  major: 3,
  blocker: 4,
};

export interface ReviewCheck {
  id: string;
  category: string;
  title: string;
  status: CheckStatus;
  requirement: string;
  observed: string;
  detail: string;
  condition?: string; // condition text when status === "condition"
  remedy?: string; // re-scope directive when status === "major"
  hold?: string; // hold reason when status === "blocker"
}

export type Verdict = "Proceed" | "Approve with Conditions" | "Re-scope" | "Hold";

export interface DerivedMetrics {
  plotRatio: number;
  siteCoverPct: number;
  landscapePct: number;
  densityUnitsPerHa: number;
  parkingRequired: number;
  parkingProvided: number;
  efficiencyRatio: number; // GFA / footprint, ~ effective storeys
}

export interface ReviewResult {
  verdict: Verdict;
  complianceScore: number; // 0-100
  headline: string;
  checks: ReviewCheck[];
  conditions: string[];
  rescopeDirectives: string[];
  holdReasons: string[];
  routing: string[];
  narrative: string[];
  metrics: DerivedMetrics;
  validityNote: string;
  counts: Record<CheckStatus, number>;
}

export interface CoordinationFile {
  reference: string;
  issuedAt: string; // ISO timestamp
  officer: string;
  proposal: DevelopmentProposal;
  zone: ZoneRegulation;
  review: ReviewResult;
}
