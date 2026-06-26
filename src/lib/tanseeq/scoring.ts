// Deterministic reasoning core for Tanseeq.
//
// Given a vacant parcel and a proposed development scenario, this module runs
// five coordination checks, computes development pressure vs community
// absorption, derives the advisory decision label, and assembles a grounded
// evidence packet. Everything is auditable: every number traces back to a field
// in the challenge datasets. This layer never talks to an LLM and never claims
// regulatory approval.

import type {
  Amenity,
  CheckResult,
  CheckTone,
  Community,
  Dataset,
  DecisionLabel,
  District,
  EvidencePacket,
  Investor,
  MatchingInvestor,
  Parcel,
  PressureModel,
  ProposedUse,
  ScenarioSettings,
  Transaction,
} from "./types";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

export const PROPOSED_USE_LABEL: Record<ProposedUse, string> = {
  residential: "Residential",
  mixed_use: "Mixed-use",
  retail_commercial: "Retail / commercial",
  community_facility: "Community facility",
  hospitality: "Hospitality",
};

// Maps a UI proposed-use onto the dataset's sector vocabulary used by parcels
// and investors.
const USE_SECTOR: Record<ProposedUse, string> = {
  residential: "residential",
  mixed_use: "mixed_use",
  retail_commercial: "commercial",
  community_facility: "community",
  hospitality: "hospitality",
};

function toneFromScore(score: number): CheckTone {
  if (score >= 72) return "strong";
  if (score >= 56) return "adequate";
  if (score >= 40) return "watch";
  return "constrained";
}

// Parse investor capital ranges like "15M-60M", "500M-2B", "1.5B".
function parseCapital(token: string): number {
  const t = token.trim().toUpperCase();
  const m = t.match(/([\d.]+)\s*([MB])/);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  return m[2] === "B" ? value * 1e9 : value * 1e6;
}

export function parseCapitalRange(range: string): [number, number] {
  const parts = range.split("-");
  if (parts.length === 2) return [parseCapital(parts[0]), parseCapital(parts[1])];
  const single = parseCapital(range);
  return [single, single];
}

function fmtAed(value: number): string {
  if (value >= 1e9) return `AED ${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `AED ${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `AED ${Math.round(value / 1e3)}K`;
  return `AED ${Math.round(value)}`;
}

// ---------------------------------------------------------------------------
// Dataset-derived context for a single parcel/district
// ---------------------------------------------------------------------------

interface Context {
  parcel: Parcel;
  district: District;
  community: Community | null;
  districtTransactions: Transaction[];
  districtListings: Dataset["listings"];
  districtAmenities: Amenity[];
  amenityCounts: Record<string, number>; // by category
  mobilityCounts: Record<string, number>; // by mobility subtype
  investors: Investor[];
}

function buildContext(data: Dataset, parcel: Parcel): Context {
  const district =
    data.districts.find((d) => d.district === parcel.district) ??
    ({
      district: parcel.district,
      area_type: "",
      profile: "",
      base_sale_aed_sqm: 0,
      gross_yield_pct: 0,
      infrastructure_score: parcel.infrastructure_score,
      latitude: 0,
      longitude: 0,
      established_year: 0,
    } as District);

  const community = data.communities.find((c) => c.district === parcel.district) ?? null;
  const districtTransactions = data.transactions.filter((t) => t.district === parcel.district);
  const districtListings = data.listings.filter((l) => l.district === parcel.district);
  const districtAmenities = data.amenities.filter((a) => a.district === parcel.district);

  const amenityCounts: Record<string, number> = {};
  const mobilityCounts: Record<string, number> = {};
  for (const a of districtAmenities) {
    amenityCounts[a.category] = (amenityCounts[a.category] ?? 0) + 1;
    if (a.category === "mobility") {
      mobilityCounts[a.subtype] = (mobilityCounts[a.subtype] ?? 0) + 1;
    }
  }

  return {
    parcel,
    district,
    community,
    districtTransactions,
    districtListings,
    districtAmenities,
    amenityCounts,
    mobilityCounts,
    investors: data.investors,
  };
}

// ---------------------------------------------------------------------------
// 1. Land / Value Check
// ---------------------------------------------------------------------------

function landCheck(ctx: Context, scenario: ScenarioSettings): CheckResult {
  const { parcel, district, districtTransactions } = ctx;
  const sector = USE_SECTOR[scenario.proposedUse];

  const vacant = parcel.current_status === "vacant";
  const aligned =
    parcel.land_use === sector ||
    parcel.recommended_use.includes(sector) ||
    (scenario.proposedUse === "mixed_use" && parcel.recommended_use.includes("mixed")) ||
    (scenario.proposedUse === "residential" && parcel.recommended_use.includes("residential")) ||
    (scenario.proposedUse === "retail_commercial" &&
      (parcel.recommended_use.includes("retail") || parcel.recommended_use.includes("office")));

  // District comp: median transaction price/sqm → implied land value.
  const prices = districtTransactions.map((t) => t.price_per_sqm).filter((p) => p > 0).sort((a, b) => a - b);
  const medianPricePerSqm = prices.length ? prices[Math.floor(prices.length / 2)] : district.base_sale_aed_sqm;
  const impliedValue = parcel.parcel_size_sqm * medianPricePerSqm;
  const valueRatio = impliedValue > 0 ? parcel.estimated_value_aed / impliedValue : 1;
  // Closer to 1.0 is "reasonable"; far above 1 = priced rich, far below = cheap.
  const valueReasonableness = clamp(100 - Math.abs(valueRatio - 1) * 120);

  const score = round(
    clamp(
      parcel.development_potential_score * 0.4 +
        parcel.infrastructure_score * 0.3 +
        (aligned ? 100 : 45) * 0.15 +
        valueReasonableness * 0.15,
    ),
  );

  const tone = toneFromScore(score);
  const evidence = [
    `Parcel ${parcel.parcel_id} status: ${parcel.current_status.replace(/_/g, " ")} in ${parcel.district} (zone ${parcel.zone}).`,
    `Development potential score ${parcel.development_potential_score}/100, infrastructure ${parcel.infrastructure_score}/100.`,
    `Recommended use on record: ${parcel.recommended_use.replace(/_/g, " ")}.`,
    `Estimated value ${fmtAed(parcel.estimated_value_aed)} vs district comp ${fmtAed(impliedValue)} (median ${Math.round(medianPricePerSqm)} AED/sqm across ${districtTransactions.length} transactions).`,
  ];

  return {
    id: "land",
    title: "Land / Value",
    titleAr: "الأرض / القيمة",
    score,
    status: vacant ? `Developable land — ${tone}` : `Status flag — ${parcel.current_status.replace(/_/g, " ")}`,
    tone: vacant ? tone : "watch",
    finding: aligned
      ? `Vacant parcel with ${tone} development potential; proposed ${PROPOSED_USE_LABEL[scenario.proposedUse].toLowerCase()} aligns with the parcel's recommended use.`
      : `Vacant parcel with ${tone} potential, but proposed ${PROPOSED_USE_LABEL[scenario.proposedUse].toLowerCase()} differs from the recommended use of ${parcel.recommended_use.replace(/_/g, " ")}.`,
    evidence,
    risk: !vacant
      ? "Parcel is not currently vacant; intake assumption should be confirmed before review."
      : valueRatio > 1.3
        ? "Estimated value sits materially above district comparables — value assumption needs validation."
        : "Land risk is contained; main sensitivity is build-out cost against the recommended use.",
    recommendation: aligned
      ? "Carry the land/value signal forward; no land-side condition required."
      : "Ask the committee to confirm the proposed use against the parcel's recommended use before supporting.",
    fieldsUsed: [
      "sample_parcels.current_status",
      "sample_parcels.development_potential_score",
      "sample_parcels.infrastructure_score",
      "sample_parcels.estimated_value_aed",
      "sample_parcels.recommended_use",
      "districts.base_sale_aed_sqm",
      "sample_transactions.price_per_sqm",
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Demand / Supply Check  (amenity supply vs service demand)
// ---------------------------------------------------------------------------

function amenitySupportScore(ctx: Context): number {
  const { amenityCounts, community } = ctx;
  const pop = community?.population_estimate ?? 40000;
  const total =
    (amenityCounts.healthcare ?? 0) +
    (amenityCounts.education ?? 0) +
    (amenityCounts.retail ?? 0) +
    (amenityCounts.community ?? 0) +
    (amenityCounts.services ?? 0);
  // Amenities per 1,000 residents, scaled to 0–100.
  const perThousand = total / Math.max(1, pop / 1000);
  return clamp(perThousand * 16);
}

function demandCheck(ctx: Context, scenario: ScenarioSettings): CheckResult {
  const { community, amenityCounts } = ctx;
  const amenitySupport = amenitySupportScore(ctx);
  const serviceDemand = community?.service_demand_index ?? 60;
  const residentExperience = community?.resident_experience_score ?? 60;

  // Added units add service pressure proportionally.
  const addedPressure = clamp((scenario.residentialUnits / 600) * 40);

  const score = round(
    clamp(
      amenitySupport * 0.4 +
        (100 - serviceDemand) * 0.3 +
        residentExperience * 0.2 +
        (100 - addedPressure) * 0.1,
    ),
  );
  const tone = toneFromScore(score);

  const parks = ctx.districtAmenities.filter((a) => a.subtype === "park").length;
  const evidence = [
    `District amenity supply — healthcare ${amenityCounts.healthcare ?? 0}, education ${amenityCounts.education ?? 0}, retail ${amenityCounts.retail ?? 0}, community ${amenityCounts.community ?? 0}, services ${amenityCounts.services ?? 0} (incl. ${parks} parks).`,
    community
      ? `Service demand index ${serviceDemand}/100, resident experience ${residentExperience}/100, population ≈ ${community.population_estimate.toLocaleString()}.`
      : "No community record for this district — demand baseline assumed.",
    `Proposed ${scenario.residentialUnits} residential units add an estimated ${round(addedPressure)}/100 incremental service pressure.`,
    scenario.communityFacility !== "none"
      ? `Scenario adds a ${scenario.communityFacility} as a community facility.`
      : "No community facility included in this scenario.",
  ];

  return {
    id: "demand",
    title: "Demand / Supply",
    titleAr: "الطلب / العرض",
    score,
    status: `Community absorption — ${tone}`,
    tone,
    finding:
      tone === "constrained" || tone === "watch"
        ? `Existing amenity supply is thin relative to service demand (${serviceDemand}/100); new units would add pressure on local services.`
        : `Amenity supply broadly keeps pace with demand; the scheme adds manageable service pressure.`,
    evidence,
    risk:
      serviceDemand >= 65
        ? "High service-demand district — adding residents without new facilities risks degrading resident experience."
        : "Service pressure is moderate; monitor as units phase in.",
    recommendation:
      scenario.communityFacility === "none" && (tone === "watch" || tone === "constrained")
        ? "Recommend a community facility condition (clinic, school, grocery or park) to offset added demand."
        : "Maintain amenity provision in line with phased occupancy.",
    fieldsUsed: [
      "sample_communities.service_demand_index",
      "sample_communities.resident_experience_score",
      "sample_communities.population_estimate",
      "osm_amenities.category (healthcare/education/retail/community/services)",
      "osm_amenities.subtype=park",
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Mobility / Access Check
// ---------------------------------------------------------------------------

function mobilityAccessScore(ctx: Context, scenario: ScenarioSettings): number {
  const { community, mobilityCounts, districtListings } = ctx;
  const mobilityScore = community?.mobility_score ?? 60;
  const transitStops =
    (mobilityCounts.bus_stop ?? 0) +
    (mobilityCounts.bus_station ?? 0) +
    (mobilityCounts.ferry_terminal ?? 0);
  const transitSupport = clamp(transitStops * 1.2);
  // Residential listing density signals existing access load.
  const densityPenalty = clamp((districtListings.length / 600) * 25, 0, 25);
  // Scenario mobility condition lifts access.
  const conditionLift =
    scenario.mobilityCondition === "none"
      ? 0
      : scenario.mobilityCondition === "shuttle"
        ? 12
        : scenario.mobilityCondition === "bus_stop"
          ? 16
          : 8; // shaded_walkway
  return clamp(mobilityScore * 0.6 + transitSupport * 0.4 - densityPenalty + conditionLift);
}

function mobilityCheck(ctx: Context, scenario: ScenarioSettings): CheckResult {
  const { community, mobilityCounts } = ctx;
  const score = round(mobilityAccessScore(ctx, scenario));
  const tone = toneFromScore(score);
  const busStops = mobilityCounts.bus_stop ?? 0;
  const busStations = mobilityCounts.bus_station ?? 0;
  const parking = mobilityCounts.parking ?? 0;

  const evidence = [
    community
      ? `Community mobility score ${community.mobility_score}/100.`
      : "No community mobility score on record for this district.",
    `OSM mobility amenities — bus stops ${busStops}, bus stations ${busStations}, fuel ${mobilityCounts.fuel_station ?? 0}${parking ? `, parking ${parking}` : ""}.`,
    `${ctx.districtListings.length} active residential listings indicate current access load in the district.`,
    scenario.mobilityCondition !== "none"
      ? `Scenario adds a ${scenario.mobilityCondition.replace(/_/g, " ")} mobility condition.`
      : "No mobility condition included in this scenario.",
  ];

  return {
    id: "mobility",
    title: "Mobility / Access",
    titleAr: "إمكانية الوصول والتنقل",
    score,
    status: `Access readiness — ${tone}`,
    tone,
    finding:
      tone === "constrained" || tone === "watch"
        ? `Transit and access provision is constrained; added units would increase mobility pressure on the surrounding network.`
        : `Mobility provision is adequate to absorb the proposed scheme with monitoring.`,
    evidence,
    risk:
      busStops + busStations === 0
        ? "No mapped public-transit stops in the district — car dependence and access pressure are likely."
        : "Access pressure is moderate; peak-load on existing stops should be reviewed.",
    recommendation:
      scenario.mobilityCondition === "none" && (tone === "watch" || tone === "constrained")
        ? "Recommend a mobility condition (shuttle, bus stop or shaded walkway) before added occupancy."
        : "Coordinate phasing with transport so access keeps pace with occupancy.",
    fieldsUsed: [
      "sample_communities.mobility_score",
      "osm_amenities.category=mobility (bus_stop, bus_station, parking, fuel_station)",
      "sample_listings (district density)",
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. Capital Fit Check
// ---------------------------------------------------------------------------

function capitalCheck(ctx: Context, scenario: ScenarioSettings): CheckResult {
  const { parcel, investors } = ctx;
  const sector = USE_SECTOR[scenario.proposedUse];
  const value = parcel.estimated_value_aed;

  const scored = investors
    .map((inv) => {
      const [lo, hi] = parseCapitalRange(inv.capital_range_aed);
      const districtMatch = inv.preferred_district === parcel.district;
      const sectorMatch = inv.preferred_sector === sector;
      const capitalFit = value >= lo * 0.5 && value <= hi * 1.2;
      let fit = 0;
      if (districtMatch) fit += 35;
      if (sectorMatch) fit += 35;
      if (capitalFit) fit += 20;
      fit += inv.strategic_fit_score * 0.1;
      return { inv, fit, districtMatch, sectorMatch, capitalFit };
    })
    .filter((s) => s.districtMatch || s.sectorMatch)
    .sort((a, b) => b.fit - a.fit);

  const top = scored.slice(0, 4);
  const matchingInvestors: MatchingInvestor[] = top.map((s) => ({
    investor_id: s.inv.investor_id,
    investor_type: s.inv.investor_type,
    preferred_sector: s.inv.preferred_sector,
    capital_range_aed: s.inv.capital_range_aed,
    risk_profile: s.inv.risk_profile,
    investment_horizon: s.inv.investment_horizon,
    strategic_fit_score: s.inv.strategic_fit_score,
  }));

  const sectorMatches = scored.filter((s) => s.sectorMatch).length;
  const capitalReady = scored.filter((s) => s.capitalFit && s.sectorMatch).length;
  const avgFit = top.length ? top.reduce((a, s) => a + s.inv.strategic_fit_score, 0) / top.length : 0;

  const score = round(
    clamp(
      Math.min(100, sectorMatches * 6) * 0.4 +
        Math.min(100, capitalReady * 12) * 0.3 +
        avgFit * 0.3,
    ),
  );
  const tone = toneFromScore(score);

  return {
    id: "capital",
    title: "Capital Fit",
    titleAr: "ملاءمة رأس المال",
    score,
    status: `Investor appetite — ${tone}`,
    tone,
    finding:
      sectorMatches > 0
        ? `${sectorMatches} investor mandate${sectorMatches === 1 ? "" : "s"} target ${sector.replace(/_/g, " ")}; ${capitalReady} can fund a project at ${fmtAed(value)}.`
        : `No investor mandate currently targets ${sector.replace(/_/g, " ")} for this district.`,
    evidence: [
      `Proposed sector: ${sector.replace(/_/g, " ")}; parcel value ${fmtAed(value)}.`,
      top.length
        ? `Top matches: ${top.map((s) => `${s.inv.investor_id} (${s.inv.investor_type}, fit ${s.inv.strategic_fit_score})`).join("; ")}.`
        : "No district/sector investor matches found.",
      `Average strategic fit among matches: ${round(avgFit)}/100.`,
    ],
    risk:
      capitalReady === 0
        ? "No mandate is both sector-aligned and capital-ready — funding route is unproven."
        : "Capital appetite exists; terms and risk profile still need confirmation at committee.",
    recommendation:
      capitalReady > 0
        ? "Capital signal supports review; confirm risk-profile and horizon fit with the lead mandate."
        : "Recommend broadening the sourcing list or re-scoping the use to match available mandates.",
    fieldsUsed: [
      "sample_investors.preferred_district",
      "sample_investors.preferred_sector",
      "sample_investors.capital_range_aed",
      "sample_investors.risk_profile",
      "sample_investors.investment_horizon",
      "sample_investors.strategic_fit_score",
      "sample_parcels.estimated_value_aed",
    ],
    matchingInvestors,
  };
}

// ---------------------------------------------------------------------------
// 5. Market Momentum Check
// ---------------------------------------------------------------------------

export function transactionTrend(ctx: Context): { year: number; volume: number; avgPricePerSqm: number }[] {
  const byYear = new Map<number, { count: number; priceSum: number }>();
  for (const t of ctx.districtTransactions) {
    const year = parseInt(t.date.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const entry = byYear.get(year) ?? { count: 0, priceSum: 0 };
    entry.count += 1;
    entry.priceSum += t.price_per_sqm;
    byYear.set(year, entry);
  }
  return [...byYear.entries()]
    .map(([year, e]) => ({ year, volume: e.count, avgPricePerSqm: round(e.priceSum / Math.max(1, e.count)) }))
    .sort((a, b) => a.year - b.year);
}

function marketCheck(ctx: Context, scenario: ScenarioSettings): CheckResult {
  const trend = transactionTrend(ctx);
  const { districtListings } = ctx;

  // Price momentum: last year vs first year.
  const first = trend[0];
  const last = trend[trend.length - 1];
  const priceGrowth = first && last && first.avgPricePerSqm > 0
    ? (last.avgPricePerSqm - first.avgPricePerSqm) / first.avgPricePerSqm
    : 0;
  const priceMomentum = clamp(50 + priceGrowth * 200);

  // Listing absorption: sold + let + under_offer share.
  const absorbed = districtListings.filter((l) => l.status !== "available").length;
  const absorptionRate = districtListings.length ? absorbed / districtListings.length : 0;
  const absorptionScore = clamp(absorptionRate * 130);

  const volumeScore = clamp((last?.volume ?? 0) * 2.2);

  const score = round(clamp(priceMomentum * 0.4 + absorptionScore * 0.35 + volumeScore * 0.25));
  const tone = toneFromScore(score);

  return {
    id: "market",
    title: "Market Momentum",
    titleAr: "زخم السوق",
    score,
    status: `Market signal — ${tone}`,
    tone,
    finding:
      priceGrowth >= 0
        ? `District price/sqm is up ${round(priceGrowth * 100)}% across the transaction window with ${round(absorptionRate * 100)}% listing absorption — momentum supports the proposed ${PROPOSED_USE_LABEL[scenario.proposedUse].toLowerCase()}.`
        : `District price/sqm softened ${round(priceGrowth * 100)}% over the window; momentum is muted.`,
    evidence: [
      `Transaction trend: ${trend.map((t) => `${t.year}: ${t.volume} txns @ ${t.avgPricePerSqm} AED/sqm`).join("; ")}.`,
      `Listing status mix: ${absorbed}/${districtListings.length} not available (sold / let / under offer) → ${round(absorptionRate * 100)}% absorption.`,
      `District base price ${ctx.district.base_sale_aed_sqm} AED/sqm, gross yield ${ctx.district.gross_yield_pct}%.`,
    ],
    risk:
      priceGrowth < 0
        ? "Negative price momentum — demand timing risk for the proposed use."
        : "Momentum is supportive; watch for over-supply as nearby pipeline delivers.",
    recommendation:
      score >= 56
        ? "Market signal supports review at the proposed use."
        : "Recommend phasing delivery to match absorption and re-test pricing assumptions.",
    fieldsUsed: [
      "sample_transactions.date",
      "sample_transactions.price_per_sqm",
      "sample_listings.status",
      "districts.base_sale_aed_sqm",
      "districts.gross_yield_pct",
    ],
  };
}

// ---------------------------------------------------------------------------
// Core scoring model: pressure vs absorption
// ---------------------------------------------------------------------------

function proposalIntensity(scenario: ScenarioSettings): number {
  const unitIntensity = clamp((scenario.residentialUnits / 600) * 100);
  return clamp(unitIntensity * 0.7 + scenario.retailSharePct * 0.3);
}

function communityFacilitySupport(ctx: Context, scenario: ScenarioSettings): number {
  const base = clamp((ctx.amenityCounts.community ?? 0) * 2.2, 0, 70);
  const bonus =
    scenario.communityFacility === "none"
      ? 0
      : scenario.communityFacility === "school"
        ? 24
        : scenario.communityFacility === "clinic"
          ? 22
          : scenario.communityFacility === "grocery"
            ? 16
            : 14; // park
  return clamp(base + bonus);
}

function buildPressureModel(
  ctx: Context,
  scenario: ScenarioSettings,
  checks: CheckResult[],
): PressureModel {
  const byId = (id: string) => checks.find((c) => c.id === id)!.score;

  const landSignal = byId("land");
  const capitalFit = byId("capital");
  const marketMomentum = byId("market");
  const infrastructureReadiness = ctx.parcel.infrastructure_score;
  const intensity = proposalIntensity(scenario);

  const amenitySupport = amenitySupportScore(ctx);
  const mobilityAccess = byId("mobility");
  const residentExperience = ctx.community?.resident_experience_score ?? 55;
  const inverseServiceDemand = 100 - (ctx.community?.service_demand_index ?? 60);
  const facilitySupport = communityFacilitySupport(ctx, scenario);

  const pressureComponents = [
    { label: "Land signal", value: round(landSignal), weight: 0.28 },
    { label: "Capital fit", value: round(capitalFit), weight: 0.22 },
    { label: "Market momentum", value: round(marketMomentum), weight: 0.22 },
    { label: "Infrastructure readiness", value: round(infrastructureReadiness), weight: 0.18 },
    { label: "Proposal intensity", value: round(intensity), weight: 0.1 },
  ];
  const absorptionComponents = [
    { label: "Amenity support", value: round(amenitySupport), weight: 0.25 },
    { label: "Mobility access", value: round(mobilityAccess), weight: 0.25 },
    { label: "Resident experience", value: round(residentExperience), weight: 0.2 },
    { label: "Inverse service demand", value: round(inverseServiceDemand), weight: 0.2 },
    { label: "Community facility support", value: round(facilitySupport), weight: 0.1 },
  ];

  const developmentPressure = round(
    clamp(pressureComponents.reduce((a, c) => a + c.value * c.weight, 0)),
  );
  const communityAbsorption = round(
    clamp(absorptionComponents.reduce((a, c) => a + c.value * c.weight, 0)),
  );
  const coordinationDivergence = developmentPressure - communityAbsorption;

  return {
    developmentPressure,
    communityAbsorption,
    coordinationDivergence,
    pressureComponents,
    absorptionComponents,
  };
}

// ---------------------------------------------------------------------------
// Decision label
// ---------------------------------------------------------------------------

export function decideLabel(
  divergence: number,
  priority: ScenarioSettings["priority"],
  dataComplete: boolean,
): DecisionLabel {
  if (!dataComplete) return "Hold for additional evidence";
  // Priority tilts the thresholds: a community-first review is stricter,
  // an ROI-first review is more permissive. Balanced uses the base bands.
  const shift = priority === "community" ? -4 : priority === "roi" ? 4 : 0;
  const d = divergence - shift;
  if (d <= 15) return "Support for review";
  if (d <= 30) return "Support with light conditions";
  if (d <= 50) return "Support with conditions";
  return "Re-scope before review";
}

// ---------------------------------------------------------------------------
// Public entrypoint: assemble the full evidence packet
// ---------------------------------------------------------------------------

export function runReview(data: Dataset, scenario: ScenarioSettings): EvidencePacket {
  const parcel = data.parcels.find((p) => p.parcel_id === scenario.parcelId) ?? data.parcels[0];
  const ctx = buildContext(data, parcel);

  const checks: CheckResult[] = [
    landCheck(ctx, scenario),
    demandCheck(ctx, scenario),
    mobilityCheck(ctx, scenario),
    capitalCheck(ctx, scenario),
    marketCheck(ctx, scenario),
  ];

  // Completeness: we need a parcel and a community record, plus a non-zero
  // residential / retail programme to assess pressure.
  const missingEvidence: string[] = [];
  if (!ctx.community) missingEvidence.push("No community record for this district");
  if (scenario.residentialUnits <= 0 && scenario.retailSharePct <= 0)
    missingEvidence.push("Proposed programme is empty (no units and no retail)");
  if (ctx.districtTransactions.length === 0) missingEvidence.push("No district transactions to test the market");
  const dataComplete = missingEvidence.length === 0;

  const pressure = buildPressureModel(ctx, scenario, checks);
  const decisionLabel = decideLabel(pressure.coordinationDivergence, scenario.priority, dataComplete);

  const caseFileId = `TNSQ-${parcel.parcel_id}-${scenario.proposedUse
    .slice(0, 3)
    .toUpperCase()}-${scenario.residentialUnits}`;

  return {
    caseFileId,
    parcel,
    district: ctx.district,
    community: ctx.community,
    proposedUseLabel: PROPOSED_USE_LABEL[scenario.proposedUse],
    scenario,
    checks,
    pressure,
    decisionLabel,
    amenityCounts: ctx.amenityCounts,
    transactionTrend: transactionTrend(ctx),
    dataComplete,
    missingEvidence,
  };
}
