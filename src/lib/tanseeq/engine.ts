import { getRegulation } from "./regulations";
import { fmtArea, fmtNumber, fmtPct, fmtRatio, round } from "./format";
import {
  CHECK_SEVERITY,
  LAND_USE_LABELS,
  SERVICE_STATUS_LABELS,
  type CheckStatus,
  type DerivedMetrics,
  type DevelopmentProposal,
  type ReviewCheck,
  type ReviewResult,
  type ServiceStatus,
  type UtilityServices,
  type Verdict,
  type ZoneRegulation,
} from "./types";

const AVG_UNIT_GFA = 110; // assumed average dwelling GFA for parking apportionment

const CATEGORY_DEPARTMENTS: Record<string, string> = {
  Submission: "Development Intake & Records",
  "Land Use": "Land Policy & Zoning Committee",
  "Massing & Form": "Planning & Urban Design",
  "Mobility & Parking": "Roads & Transport Authority",
  "Infrastructure": "Utilities Coordination Office",
  "Environment & Heritage": "Environment, Heritage & Drainage",
  "Open Space": "Parks & Public Realm",
  Sustainability: "Sustainability & Building Performance",
};

const SCORE_PENALTY: Record<CheckStatus, number> = {
  pass: 0,
  advisory: 2,
  condition: 7,
  major: 17,
  blocker: 34,
};

// Upper bound on the compliance score implied by each verdict, so the headline
// number always reads consistently with the determination.
const SCORE_CAP: Record<Verdict, number> = {
  Proceed: 100,
  "Approve with Conditions": 90,
  "Re-scope": 66,
  Hold: 44,
};

function worstStatus(statuses: CheckStatus[]): CheckStatus {
  return statuses.reduce<CheckStatus>(
    (worst, s) => (CHECK_SEVERITY[s] > CHECK_SEVERITY[worst] ? s : worst),
    "pass",
  );
}

function parkingRequirement(p: DevelopmentProposal, reg: ZoneRegulation): number {
  const { proposedUse: use, dwellingUnits: units, grossFloorAreaSqm: gfa } = p;
  if (use === "residential" || use === "community") {
    return Math.ceil(units * reg.minParkingPerUnit);
  }
  if (use === "mixed_use") {
    const resGfa = Math.min(gfa, units * AVG_UNIT_GFA);
    const nonResGfa = Math.max(0, gfa - resGfa);
    return Math.ceil(units * reg.minParkingPerUnit + (nonResGfa / 100) * reg.parkingPer100SqmGfa);
  }
  return Math.ceil((gfa / 100) * reg.parkingPer100SqmGfa);
}

export function deriveMetrics(p: DevelopmentProposal, reg: ZoneRegulation): DerivedMetrics {
  const area = p.plotAreaSqm > 0 ? p.plotAreaSqm : 1;
  return {
    plotRatio: round(p.grossFloorAreaSqm / area, 2),
    siteCoverPct: round((p.buildingFootprintSqm / area) * 100, 1),
    landscapePct: round((p.landscapeAreaSqm / area) * 100, 1),
    densityUnitsPerHa: round(p.dwellingUnits / (area / 10000), 1),
    parkingRequired: parkingRequirement(p, reg),
    parkingProvided: p.parkingSpaces,
    efficiencyRatio: round(p.grossFloorAreaSqm / (p.buildingFootprintSqm > 0 ? p.buildingFootprintSqm : 1), 2),
  };
}

// ---------------------------------------------------------------------------
// Individual assessment checks
// ---------------------------------------------------------------------------

function checkSubmission(p: DevelopmentProposal): ReviewCheck {
  const missing: string[] = [];
  if (!p.projectName.trim()) missing.push("project name");
  if (!p.parcelId.trim()) missing.push("parcel identifier");
  if (p.plotAreaSqm <= 0) missing.push("plot area");
  if (p.grossFloorAreaSqm <= 0) missing.push("gross floor area");
  if (p.buildingFootprintSqm <= 0) missing.push("building footprint");

  if (missing.length > 0) {
    return {
      id: "submission",
      category: "Submission",
      title: "Submission completeness",
      status: "blocker",
      requirement: "All mandatory development parameters provided",
      observed: `Missing: ${missing.join(", ")}`,
      detail:
        "The application cannot be validated because mandatory development parameters are absent. A complete submission is a precondition for any determination.",
      hold: `Submission is incomplete — the following mandatory parameters are missing: ${missing.join(", ")}. Re-lodge a complete application package.`,
    };
  }
  return {
    id: "submission",
    category: "Submission",
    title: "Submission completeness",
    status: "pass",
    requirement: "All mandatory development parameters provided",
    observed: "Complete",
    detail: "The submission contains the mandatory parameters required to validate and assess the application.",
  };
}

function checkLandUse(p: DevelopmentProposal, reg: ZoneRegulation): ReviewCheck {
  const permitted = reg.permittedUses.includes(p.proposedUse);
  const useLabel = LAND_USE_LABELS[p.proposedUse];
  if (!permitted) {
    return {
      id: "land-use",
      category: "Land Use",
      title: "Permitted land use",
      status: "blocker",
      requirement: `Use permitted in ${reg.code}: ${reg.permittedUses.map((u) => LAND_USE_LABELS[u]).join(", ")}`,
      observed: `Proposed: ${useLabel}`,
      detail: `A ${useLabel.toLowerCase()} use is not contemplated by the ${reg.name} zone. Consent cannot be granted on the current land-use designation.`,
      hold: `${useLabel} use is not permitted within the ${reg.code} zone. A land-use amendment or rezoning must be secured before a development application can be entertained.`,
    };
  }
  return {
    id: "land-use",
    category: "Land Use",
    title: "Permitted land use",
    status: "pass",
    requirement: `Use permitted in ${reg.code}`,
    observed: `Proposed: ${useLabel}`,
    detail: `A ${useLabel.toLowerCase()} use is permitted within the ${reg.name} zone.`,
  };
}

function checkPlotRatio(m: DerivedMetrics, reg: ZoneRegulation): ReviewCheck {
  const ratio = m.plotRatio;
  const max = reg.maxPlotRatio;
  const requirement = `Plot ratio ≤ ${fmtRatio(max)}`;
  const observed = `Plot ratio ${fmtRatio(ratio)}`;
  if (ratio <= max) {
    return mk("plot-ratio", "Massing & Form", "Plot ratio (FAR)", "pass", requirement, observed,
      `The development intensity of ${fmtRatio(ratio)} is within the permissible plot ratio of ${fmtRatio(max)}.`);
  }
  const overPct = round(((ratio - max) / max) * 100, 1);
  if (ratio <= max * 1.08) {
    return mk("plot-ratio", "Massing & Form", "Plot ratio (FAR)", "condition", requirement, observed,
      `The proposed plot ratio of ${fmtRatio(ratio)} exceeds the ${fmtRatio(max)} cap by ${overPct}%. The minor overrun can be regularised by trimming gross floor area.`,
      { condition: `Reduce gross floor area to achieve a plot ratio of no more than ${fmtRatio(max)} (currently ${fmtRatio(ratio)}); submit a revised area schedule for sign-off prior to building permit.` });
  }
  const reductionPct = round(((ratio - max) / ratio) * 100, 0);
  return mk("plot-ratio", "Massing & Form", "Plot ratio (FAR)", "major", requirement, observed,
    `The proposed plot ratio of ${fmtRatio(ratio)} materially exceeds the ${fmtRatio(max)} cap (by ${overPct}%). This represents over-development that cannot be conditioned away.`,
    { remedy: `Re-scope the massing to bring the plot ratio within ${fmtRatio(max)} — an approximate ${reductionPct}% reduction in gross floor area. Re-submit revised floor plates and area schedule.` });
}

function checkHeight(p: DevelopmentProposal, reg: ZoneRegulation): ReviewCheck {
  const requirement = `Height ≤ ${reg.maxHeightM} m / ${reg.maxStoreys} storeys`;
  const observed = `${fmtNumber(p.buildingHeightM)} m / ${p.storeys} storeys`;
  const overH = p.buildingHeightM - reg.maxHeightM;
  const overS = p.storeys - reg.maxStoreys;
  if (overH <= 0 && overS <= 0) {
    return mk("height", "Massing & Form", "Building height", "pass", requirement, observed,
      `Building height of ${fmtNumber(p.buildingHeightM)} m over ${p.storeys} storeys complies with the ${reg.maxHeightM} m / ${reg.maxStoreys}-storey envelope.`);
  }
  const minorH = p.buildingHeightM <= reg.maxHeightM * 1.1;
  const minorS = p.storeys <= reg.maxStoreys + 1;
  if (minorH && minorS) {
    return mk("height", "Massing & Form", "Building height", "condition", requirement, observed,
      `Height of ${fmtNumber(p.buildingHeightM)} m / ${p.storeys} storeys marginally exceeds the ${reg.maxHeightM} m / ${reg.maxStoreys}-storey limit.`,
      { condition: `Lower the building to ${reg.maxHeightM} m and ${reg.maxStoreys} storeys, or obtain a documented height concession from Planning & Urban Design, prior to building permit.` });
  }
  return mk("height", "Massing & Form", "Building height", "major", requirement, observed,
    `Height of ${fmtNumber(p.buildingHeightM)} m / ${p.storeys} storeys substantially breaches the ${reg.maxHeightM} m / ${reg.maxStoreys}-storey envelope${overS > 0 ? ` (${overS} storeys over)` : ""}.`,
    { remedy: `Re-scope the building envelope to no more than ${reg.maxHeightM} m and ${reg.maxStoreys} storeys, or pursue a formal envelope variation supported by shadow, skyline and view-corridor studies.` });
}

function checkSiteCover(m: DerivedMetrics, reg: ZoneRegulation): ReviewCheck {
  const requirement = `Site coverage ≤ ${fmtPct(reg.maxSiteCoverPct, 0)}`;
  const observed = `${fmtPct(m.siteCoverPct)}`;
  if (m.siteCoverPct <= reg.maxSiteCoverPct) {
    return mk("site-cover", "Massing & Form", "Site coverage", "pass", requirement, observed,
      `Building footprint covers ${fmtPct(m.siteCoverPct)} of the plot, within the ${fmtPct(reg.maxSiteCoverPct, 0)} maximum.`);
  }
  if (m.siteCoverPct <= reg.maxSiteCoverPct + 5) {
    return mk("site-cover", "Massing & Form", "Site coverage", "condition", requirement, observed,
      `Footprint coverage of ${fmtPct(m.siteCoverPct)} slightly exceeds the ${fmtPct(reg.maxSiteCoverPct, 0)} maximum.`,
      { condition: `Reduce building footprint so that site coverage does not exceed ${fmtPct(reg.maxSiteCoverPct, 0)}; reflect the change on revised site plans.` });
  }
  return mk("site-cover", "Massing & Form", "Site coverage", "major", requirement, observed,
    `Footprint coverage of ${fmtPct(m.siteCoverPct)} significantly exceeds the ${fmtPct(reg.maxSiteCoverPct, 0)} maximum, leaving inadequate open ground.`,
    { remedy: `Re-scope the ground-floor footprint to achieve site coverage of ${fmtPct(reg.maxSiteCoverPct, 0)} or less.` });
}

function checkSetbacks(p: DevelopmentProposal, reg: ZoneRegulation): ReviewCheck {
  const fronts: { label: string; provided: number; min: number }[] = [
    { label: "front", provided: p.frontSetbackM, min: reg.minFrontSetbackM },
    { label: "side", provided: p.sideSetbackM, min: reg.minSideSetbackM },
    { label: "rear", provided: p.rearSetbackM, min: reg.minRearSetbackM },
  ];
  const breaches = fronts.filter((f) => f.provided < f.min);
  const requirement = `Setbacks ≥ F ${reg.minFrontSetbackM} / S ${reg.minSideSetbackM} / R ${reg.minRearSetbackM} m`;
  const observed = `F ${p.frontSetbackM} / S ${p.sideSetbackM} / R ${p.rearSetbackM} m`;
  if (breaches.length === 0) {
    return mk("setbacks", "Massing & Form", "Boundary setbacks", "pass", requirement, observed,
      "All boundary setbacks satisfy the minimum standards.");
  }
  const list = breaches.map((b) => `${b.label} ${b.provided} m (min ${b.min} m)`).join("; ");
  const severe = breaches.some((b) => b.provided < b.min * 0.85);
  if (!severe) {
    return mk("setbacks", "Massing & Form", "Boundary setbacks", "condition", requirement, observed,
      `Minor setback shortfall: ${list}.`,
      { condition: `Adjust the building line to meet the minimum ${breaches.map((b) => b.label).join(" and ")} setback(s), or secure a documented relaxation; update site plans accordingly.` });
  }
  return mk("setbacks", "Massing & Form", "Boundary setbacks", "major", requirement, observed,
    `Substantial setback encroachment: ${list}.`,
    { remedy: `Re-scope the footprint to honour the minimum ${breaches.map((b) => b.label).join(" and ")} setback(s); encroachment of this scale affects amenity, fire separation and servicing.` });
}

function checkParking(p: DevelopmentProposal, m: DerivedMetrics): ReviewCheck {
  const requirement = `≥ ${fmtNumber(m.parkingRequired)} parking spaces`;
  const observed = `${fmtNumber(m.parkingProvided)} provided`;
  if (m.parkingProvided >= m.parkingRequired) {
    return mk("parking", "Mobility & Parking", "Parking provision", "pass", requirement, observed,
      `Parking provision of ${fmtNumber(m.parkingProvided)} meets the required ${fmtNumber(m.parkingRequired)} spaces.`);
  }
  const shortfall = m.parkingRequired - m.parkingProvided;
  const shortfallPct = round((shortfall / m.parkingRequired) * 100, 0);
  if (shortfallPct <= 10) {
    return mk("parking", "Mobility & Parking", "Parking provision", "condition", requirement, observed,
      `Parking is ${fmtNumber(shortfall)} spaces short (${shortfallPct}%) of the ${fmtNumber(m.parkingRequired)} required.`,
      { condition: `Provide the ${fmtNumber(shortfall)} shortfall space(s), or enter a cash-in-lieu / shared-parking agreement with the Roads & Transport Authority before occupancy.` });
  }
  return mk("parking", "Mobility & Parking", "Parking provision", "major", requirement, observed,
    `Parking is ${fmtNumber(shortfall)} spaces short (${shortfallPct}%) of the ${fmtNumber(m.parkingRequired)} required — a material mobility deficit.`,
    { remedy: `Re-scope to provide adequate parking (additional basement/podium levels) or reduce development intensity; a Transport Impact Assessment is required to support any reduced provision.` });
}

function checkLandscape(m: DerivedMetrics, reg: ZoneRegulation): ReviewCheck {
  const requirement = `Soft landscaping ≥ ${fmtPct(reg.minLandscapePct, 0)}`;
  const observed = `${fmtPct(m.landscapePct)}`;
  if (m.landscapePct >= reg.minLandscapePct) {
    return mk("landscape", "Open Space", "Landscaping & open space", "pass", requirement, observed,
      `Soft landscaping of ${fmtPct(m.landscapePct)} meets the ${fmtPct(reg.minLandscapePct, 0)} minimum.`);
  }
  if (m.landscapePct >= reg.minLandscapePct * 0.6) {
    return mk("landscape", "Open Space", "Landscaping & open space", "condition", requirement, observed,
      `Soft landscaping of ${fmtPct(m.landscapePct)} falls below the ${fmtPct(reg.minLandscapePct, 0)} minimum.`,
      { condition: `Increase soft landscaping to ${fmtPct(reg.minLandscapePct, 0)} of the plot and submit a detailed landscape plan (species, irrigation, maintenance) for approval.` });
  }
  return mk("landscape", "Open Space", "Landscaping & open space", "major", requirement, observed,
    `Soft landscaping of ${fmtPct(m.landscapePct)} is far below the ${fmtPct(reg.minLandscapePct, 0)} minimum, undermining amenity and microclimate.`,
    { remedy: `Re-scope the ground plane to deliver at least ${fmtPct(reg.minLandscapePct, 0)} soft landscaping; this may require reducing footprint or surface parking.` });
}

function checkDensity(p: DevelopmentProposal, m: DerivedMetrics, reg: ZoneRegulation): ReviewCheck | null {
  if (reg.maxDensityUnitsPerHa <= 0 || p.dwellingUnits <= 0) return null;
  const requirement = `≤ ${fmtNumber(reg.maxDensityUnitsPerHa)} units/ha`;
  const observed = `${fmtNumber(m.densityUnitsPerHa, 1)} units/ha`;
  if (m.densityUnitsPerHa <= reg.maxDensityUnitsPerHa) {
    return mk("density", "Land Use", "Residential density", "pass", requirement, observed,
      `Net density of ${fmtNumber(m.densityUnitsPerHa, 1)} units/ha is within the ${fmtNumber(reg.maxDensityUnitsPerHa)} units/ha ceiling.`);
  }
  if (m.densityUnitsPerHa <= reg.maxDensityUnitsPerHa * 1.15) {
    return mk("density", "Land Use", "Residential density", "condition", requirement, observed,
      `Net density of ${fmtNumber(m.densityUnitsPerHa, 1)} units/ha slightly exceeds the ${fmtNumber(reg.maxDensityUnitsPerHa)} units/ha ceiling.`,
      { condition: `Rationalise the unit mix to bring net density to ${fmtNumber(reg.maxDensityUnitsPerHa)} units/ha or below; confirm via a revised unit schedule.` });
  }
  return mk("density", "Land Use", "Residential density", "major", requirement, observed,
    `Net density of ${fmtNumber(m.densityUnitsPerHa, 1)} units/ha materially exceeds the ${fmtNumber(reg.maxDensityUnitsPerHa)} units/ha ceiling, with consequent pressure on services and amenity.`,
    { remedy: `Re-scope the unit count to respect the ${fmtNumber(reg.maxDensityUnitsPerHa)} units/ha density ceiling.` });
}

function checkAccess(p: DevelopmentProposal): ReviewCheck {
  const requirement = "Legal vehicular & pedestrian access to a public road";
  if (p.hasLegalAccess) {
    return mk("access", "Mobility & Parking", "Site access", "pass", requirement, "Confirmed",
      "The site benefits from legal access to the public road network.");
  }
  return {
    id: "access",
    category: "Mobility & Parking",
    title: "Site access",
    status: "blocker",
    requirement,
    observed: "Not demonstrated",
    detail: "No legal access to a public road has been demonstrated. A development cannot be serviced or occupied without lawful access.",
    hold: "Legal access to a public road has not been demonstrated. Secure a registered access easement or frontage before the application can proceed.",
  };
}

function checkInfrastructure(p: DevelopmentProposal): ReviewCheck {
  const u: UtilityServices = p.utilities;
  const entries: [string, keyof UtilityServices, boolean][] = [
    ["Water", "water", true],
    ["Sewer", "sewer", true],
    ["Power", "power", false],
    ["Stormwater", "stormwater", false],
  ];
  const requirement = "Water, sewer, power & stormwater serviceable";
  const observed = entries.map(([l, k]) => `${l}: ${shortStatus(u[k])}`).join(" · ");

  const absentCritical = entries.filter(([, k, critical]) => critical && u[k] === "absent");
  if (absentCritical.length > 0) {
    const names = absentCritical.map(([l]) => l.toLowerCase()).join(" and ");
    return {
      id: "infrastructure",
      category: "Infrastructure",
      title: "Utility servicing",
      status: "blocker",
      requirement,
      observed,
      detail: `Essential ${names} servicing is neither available nor committed. The site is not developable until trunk infrastructure is secured.`,
      hold: `No ${names} servicing is available or planned for the site. A servicing strategy and utility-authority commitment are prerequisites to any consent.`,
    };
  }

  const absentOther = entries.filter(([, k, critical]) => !critical && u[k] === "absent");
  if (absentOther.length > 0) {
    const names = absentOther.map(([l]) => l.toLowerCase()).join(" and ");
    return mk("infrastructure", "Infrastructure", "Utility servicing", "major", requirement, observed,
      `${capitalise(names)} servicing is not available, which the scheme presently relies upon.`,
      { remedy: `Provide a servicing strategy for ${names} (on-site attenuation/generation or an approved extension) and re-submit; the layout may require adjustment to accommodate it.` });
  }

  const planned = entries.filter(([, k]) => u[k] === "planned");
  if (planned.length > 0) {
    const names = planned.map(([l]) => l.toLowerCase()).join(", ");
    return mk("infrastructure", "Infrastructure", "Utility servicing", "condition", requirement, observed,
      `${capitalise(names)} servicing is committed but not yet available at the boundary.`,
      { condition: `Obtain written connection agreements from the relevant utility authority for ${names} prior to building permit; no occupancy until live connections are commissioned.` });
  }

  return mk("infrastructure", "Infrastructure", "Utility servicing", "pass", requirement, observed,
    "All essential utilities are available at the site boundary.");
}

function checkEnvironment(p: DevelopmentProposal): ReviewCheck {
  const c = p.siteConstraints;
  const requirement = "No unmitigated environmental, flood or heritage constraint";
  const active: string[] = [];
  if (c.floodZone) active.push("flood-prone land");
  if (c.heritageOverlay) active.push("heritage overlay");
  if (c.contaminationRisk) active.push("potential land contamination");
  const observed = active.length ? capitalise(active.join(", ")) : "None identified";

  if (active.length === 0) {
    return mk("environment", "Environment & Heritage", "Environmental & heritage constraints", "pass", requirement, observed,
      "No flood, contamination or heritage constraints are recorded against the site.");
  }

  if (c.contaminationRisk) {
    const others = [c.floodZone ? "flood risk" : null, c.heritageOverlay ? "heritage significance" : null].filter(Boolean);
    return mk("environment", "Environment & Heritage", "Environmental & heritage constraints", "major", requirement, observed,
      `The site carries potential land contamination${others.length ? ` together with ${others.join(" and ")}` : ""}. Suitability for the proposed use is not yet established.`,
      { remedy: `Commission a Phase II Environmental Site Assessment and remediation strategy; the layout and basement extent may need re-scoping based on findings${c.floodZone ? ", and a Flood Risk Assessment is required in parallel" : ""}.` });
  }

  const conditions: string[] = [];
  if (c.floodZone) conditions.push("a Flood Risk Assessment with finished floor levels set at least 300 mm above the design flood level and a sustainable drainage (SuDS) scheme");
  if (c.heritageOverlay) conditions.push("a Heritage Impact Assessment with conservation and materials conditions agreed with the heritage authority");
  return mk("environment", "Environment & Heritage", "Environmental & heritage constraints", "condition", requirement, observed,
    `${capitalise(active.join(" and "))} affect the site and require specialist mitigation prior to permit.`,
    { condition: `Submit and obtain approval of ${conditions.join("; and ")} prior to building permit.` });
}

function checkSustainability(p: DevelopmentProposal, reg: ZoneRegulation): ReviewCheck | null {
  if (reg.minGreenRating <= 0) return null;
  const requirement = `Green building rating ≥ ${reg.minGreenRating}★`;
  const observed = `${p.greenRating}★ committed`;
  if (p.greenRating >= reg.minGreenRating) {
    return mk("sustainability", "Sustainability", "Sustainability rating", "pass", requirement, observed,
      `The committed ${p.greenRating}★ rating meets the ${reg.minGreenRating}★ minimum for this zone.`);
  }
  return mk("sustainability", "Sustainability", "Sustainability rating", "condition", requirement, observed,
    `The committed ${p.greenRating}★ rating is below the ${reg.minGreenRating}★ minimum.`,
    { condition: `Commit to and demonstrate a minimum ${reg.minGreenRating}★ green building rating; submit a sustainability report and provisional assessment prior to building permit.` });
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function determineVerdict(checks: ReviewCheck[]): Verdict {
  const worst = worstStatus(checks.map((c) => c.status));
  switch (worst) {
    case "blocker":
      return "Hold";
    case "major":
      return "Re-scope";
    case "condition":
      return "Approve with Conditions";
    default:
      return "Proceed";
  }
}

function computeScore(checks: ReviewCheck[], verdict: Verdict): number {
  const penalty = checks.reduce((sum, c) => sum + SCORE_PENALTY[c.status], 0);
  const raw = Math.max(5, 100 - penalty);
  return Math.min(raw, SCORE_CAP[verdict]);
}

function buildRouting(p: DevelopmentProposal, checks: ReviewCheck[]): string[] {
  const routing = new Set<string>(["Planning & Urban Design"]);
  for (const c of checks) {
    if (c.status === "pass") continue;
    const dept = CATEGORY_DEPARTMENTS[c.category];
    if (dept) routing.add(dept);
  }
  if (["commercial", "hospitality", "industrial", "mixed_use"].includes(p.proposedUse)) {
    routing.add("Economic Development & Investment");
  }
  return Array.from(routing);
}

function buildNarrative(
  p: DevelopmentProposal,
  reg: ZoneRegulation,
  m: DerivedMetrics,
  verdict: Verdict,
  checks: ReviewCheck[],
): string[] {
  const useLabel = LAND_USE_LABELS[p.proposedUse].toLowerCase();
  const paras: string[] = [];

  paras.push(
    `${p.projectName || "The proposal"} seeks consent for a ${useLabel} development of ${fmtArea(p.grossFloorAreaSqm)} gross floor area on the ${fmtArea(p.plotAreaSqm)} parcel ${p.parcelId}${p.locality ? ` in ${p.locality}` : ""}, within the ${reg.name} zone. The scheme comprises ${p.dwellingUnits > 0 ? `${fmtNumber(p.dwellingUnits)} dwelling unit(s) ` : ""}rising to ${fmtNumber(p.buildingHeightM)} m over ${p.storeys} storeys.`,
  );

  const massing = checks.filter((c) => c.category === "Massing & Form");
  const massingIssues = massing.filter((c) => c.status !== "pass");
  if (massingIssues.length === 0) {
    paras.push(
      `On built form, the scheme sits comfortably within the development envelope: a plot ratio of ${fmtRatio(m.plotRatio)} against ${fmtRatio(reg.maxPlotRatio)}, ${fmtPct(m.siteCoverPct)} site coverage against ${fmtPct(reg.maxSiteCoverPct, 0)}, and compliant boundary setbacks.`,
    );
  } else {
    paras.push(
      `On built form, ${massingIssues.length} parameter(s) require attention: ${massingIssues.map((c) => `${c.title.toLowerCase()} (${c.observed.toLowerCase()} vs ${c.requirement.toLowerCase()})`).join("; ")}. ${massingIssues.some((c) => c.status === "major") ? "These are material and drive the determination below." : "Each is minor and capable of resolution by condition."}`,
    );
  }

  const parking = checks.find((c) => c.id === "parking");
  const access = checks.find((c) => c.id === "access");
  paras.push(
    `On mobility, ${access?.status === "blocker" ? "legal site access has not been demonstrated, which is a fundamental impediment. " : "the site has lawful road access and "}parking provision stands at ${fmtNumber(m.parkingProvided)} space(s) against a calculated requirement of ${fmtNumber(m.parkingRequired)}${parking && parking.status !== "pass" && access?.status !== "blocker" ? ` — ${parking.status === "major" ? "a material shortfall" : "a modest shortfall addressed by condition"}.` : "."}`,
  );

  const infra = checks.find((c) => c.id === "infrastructure");
  const env = checks.find((c) => c.id === "environment");
  paras.push(
    `On servicing and environment, ${infra?.status === "pass" ? "all essential utilities are available at the boundary" : infra?.detail.replace(/\.$/, "") || "utility servicing requires coordination"}. ${env?.status === "pass" ? "No environmental or heritage constraints are recorded." : env?.detail || ""}`,
  );

  const closing: Record<Verdict, string> = {
    Proceed:
      "Weighing the assessment as a whole, the proposal accords with the applicable development conditions and warrants a positive determination without the need for corrective conditions.",
    "Approve with Conditions":
      "Weighing the assessment as a whole, the proposal is acceptable in principle. The departures identified are minor and can be satisfactorily resolved through the schedule of conditions, on which basis consent is recommended.",
    "Re-scope":
      "Weighing the assessment as a whole, one or more material non-compliances go beyond what conditions can reasonably regularise. The scheme must be re-scoped against the directives below and re-submitted before consent can be considered.",
    Hold:
      "Weighing the assessment as a whole, a fundamental impediment prevents determination. The application is placed on hold until the matters identified below are resolved.",
  };
  paras.push(closing[verdict]);
  return paras;
}

function headlineFor(verdict: Verdict, p: DevelopmentProposal): string {
  const name = p.projectName || "the proposal";
  switch (verdict) {
    case "Proceed":
      return `${name} complies with the applicable development conditions and may proceed.`;
    case "Approve with Conditions":
      return `${name} is approvable subject to discharge of the conditions scheduled below.`;
    case "Re-scope":
      return `${name} requires re-scoping to address material non-compliances before consent.`;
    case "Hold":
      return `${name} is on hold pending resolution of a fundamental impediment.`;
  }
}

function validityNoteFor(verdict: Verdict): string {
  switch (verdict) {
    case "Proceed":
      return "This coordination determination is valid for 12 months from the issue date. Commence within that period or seek renewal.";
    case "Approve with Conditions":
      return "Conditions must be discharged in the sequence noted (pre-permit vs pre-occupancy). This determination lapses if conditions are not actioned within 12 months.";
    case "Re-scope":
      return "Re-submit a revised scheme addressing every directive. A fresh coordination review will be undertaken on receipt.";
    case "Hold":
      return "No statutory clock runs while on hold. Resolve the impediment(s) and re-lodge to resume assessment.";
  }
}

export function runReview(proposal: DevelopmentProposal): ReviewResult {
  const reg = getRegulation(proposal.zoneCode);
  const metrics = deriveMetrics(proposal, reg);

  const submission = checkSubmission(proposal);
  let checks: ReviewCheck[];

  if (submission.status === "blocker") {
    // Without a complete submission, downstream metrics are unreliable.
    checks = [submission];
  } else {
    checks = [
      submission,
      checkLandUse(proposal, reg),
      checkPlotRatio(metrics, reg),
      checkHeight(proposal, reg),
      checkSiteCover(metrics, reg),
      checkSetbacks(proposal, reg),
      checkDensity(proposal, metrics, reg),
      checkParking(proposal, metrics),
      checkLandscape(metrics, reg),
      checkAccess(proposal),
      checkInfrastructure(proposal),
      checkEnvironment(proposal),
      checkSustainability(proposal, reg),
    ].filter((c): c is ReviewCheck => c !== null);
  }

  const verdict = determineVerdict(checks);
  const complianceScore = computeScore(checks, verdict);

  const conditions = checks.filter((c) => c.status === "condition" && c.condition).map((c) => c.condition!);
  const rescopeDirectives = checks.filter((c) => c.status === "major" && c.remedy).map((c) => c.remedy!);
  const holdReasons = checks.filter((c) => c.status === "blocker" && c.hold).map((c) => c.hold!);

  const counts = checks.reduce(
    (acc, c) => {
      acc[c.status] += 1;
      return acc;
    },
    { pass: 0, advisory: 0, condition: 0, major: 0, blocker: 0 } as Record<CheckStatus, number>,
  );

  return {
    verdict,
    complianceScore,
    headline: headlineFor(verdict, proposal),
    checks,
    conditions,
    rescopeDirectives,
    holdReasons,
    routing: buildRouting(proposal, checks),
    narrative: buildNarrative(proposal, reg, metrics, verdict, checks),
    metrics,
    validityNote: validityNoteFor(verdict),
    counts,
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function mk(
  id: string,
  category: string,
  title: string,
  status: CheckStatus,
  requirement: string,
  observed: string,
  detail: string,
  extra?: { condition?: string; remedy?: string; hold?: string },
): ReviewCheck {
  return { id, category, title, status, requirement, observed, detail, ...extra };
}

function shortStatus(s: ServiceStatus): string {
  return SERVICE_STATUS_LABELS[s];
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
