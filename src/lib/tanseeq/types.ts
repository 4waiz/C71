// Domain model for Tanseeq — AI Development Conditions Briefing Officer.
//
// Tanseeq coordinates land, capital, market, community and mobility signals from
// the Abu Dhabi PropTech challenge datasets into one advisory conditions brief
// for a human review committee. Nothing here grants regulatory approval — every
// output is advisory and traces back to an explicit signal in the data.

// ---------------------------------------------------------------------------
// Raw dataset row shapes (parsed from the CSVs in /data)
// ---------------------------------------------------------------------------

export interface District {
  district: string;
  area_type: string;
  profile: string;
  base_sale_aed_sqm: number;
  gross_yield_pct: number;
  infrastructure_score: number;
  latitude: number;
  longitude: number;
  established_year: number;
}

export interface Parcel {
  parcel_id: string;
  district: string;
  zone: string;
  land_use: string;
  parcel_size_sqm: number;
  current_status: string; // vacant | under_development | developed | reserved
  infrastructure_score: number;
  development_potential_score: number;
  estimated_value_aed: number;
  recommended_use: string;
}

export interface Transaction {
  transaction_id: string;
  date: string;
  district: string;
  asset_type: string;
  transaction_value_aed: number;
  size_sqm: number;
  price_per_sqm: number;
  buyer_type: string;
}

export interface Investor {
  investor_id: string;
  investor_type: string;
  preferred_sector: string;
  preferred_district: string;
  capital_range_aed: string; // e.g. "15M-60M", "500M-2B"
  risk_profile: string;
  investment_horizon: string;
  strategic_fit_score: number;
}

export interface Community {
  community_id: string;
  district: string;
  population_estimate: number;
  occupancy_rate: number;
  service_demand_index: number;
  mobility_score: number;
  resident_experience_score: number;
  optimization_opportunity: string;
}

export interface Listing {
  listing_id: string;
  district: string;
  community: string;
  listing_type: string; // rent | sale
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  price_aed: number;
  price_per_sqm_aed: number;
  furnished: boolean;
  amenities: string;
  latitude: number;
  longitude: number;
  listed_date: string;
  status: string; // available | let | sold | under_offer
  agency_type: string;
}

export interface Amenity {
  amenity_id: string;
  category: string; // community | mobility | healthcare | retail | services | education
  subtype: string;
  name: string;
  latitude: number;
  longitude: number;
  district: string;
}

export interface Dataset {
  districts: District[];
  parcels: Parcel[];
  transactions: Transaction[];
  investors: Investor[];
  communities: Community[];
  listings: Listing[];
  amenities: Amenity[];
}

// ---------------------------------------------------------------------------
// Scenario inputs chosen by the review officer
// ---------------------------------------------------------------------------

export type ProposedUse =
  | "residential"
  | "mixed_use"
  | "retail_commercial"
  | "community_facility"
  | "hospitality";

export type CommunityFacility = "none" | "clinic" | "school" | "park" | "grocery";
export type MobilityCondition = "none" | "shuttle" | "bus_stop" | "shaded_walkway";
export type DecisionPriority = "roi" | "community" | "balanced";

export interface ScenarioSettings {
  parcelId: string;
  proposedUse: ProposedUse;
  residentialUnits: number;
  retailSharePct: number;
  communityFacility: CommunityFacility;
  mobilityCondition: MobilityCondition;
  priority: DecisionPriority;
}

// ---------------------------------------------------------------------------
// Check + evidence output shapes
// ---------------------------------------------------------------------------

export type CheckTone = "strong" | "adequate" | "watch" | "constrained";

export interface MatchingInvestor {
  investor_id: string;
  investor_type: string;
  preferred_sector: string;
  capital_range_aed: string;
  risk_profile: string;
  investment_horizon: string;
  strategic_fit_score: number;
}

export interface CheckResult {
  id: "land" | "demand" | "mobility" | "capital" | "market";
  title: string;
  titleAr: string;
  score: number; // 0–100
  status: string;
  tone: CheckTone;
  finding: string;
  evidence: string[];
  risk: string;
  recommendation: string;
  fieldsUsed: string[];
  // Capital fit also surfaces the investors that matched.
  matchingInvestors?: MatchingInvestor[];
}

export type DecisionLabel =
  | "Support for review"
  | "Support with light conditions"
  | "Support with conditions"
  | "Re-scope before review"
  | "Hold for additional evidence";

export interface PressureModel {
  developmentPressure: number;
  communityAbsorption: number;
  coordinationDivergence: number;
  // Component breakdowns (for the meter / brief transparency)
  pressureComponents: { label: string; value: number; weight: number }[];
  absorptionComponents: { label: string; value: number; weight: number }[];
}

// The grounded evidence packet — the ONLY thing the AI layer may use.
export interface EvidencePacket {
  caseFileId: string;
  parcel: Parcel;
  district: District;
  community: Community | null;
  proposedUseLabel: string;
  scenario: ScenarioSettings;
  checks: CheckResult[];
  pressure: PressureModel;
  decisionLabel: DecisionLabel;
  amenityCounts: Record<string, number>;
  transactionTrend: { year: number; volume: number; avgPricePerSqm: number }[];
  dataComplete: boolean;
  missingEvidence: string[];
}

// The AI / committee-style explanation generated from the evidence packet.
export interface ConditionsBriefNarrative {
  decisionLabel: DecisionLabel;
  committeeSummary: string;
  whyNotAsSubmitted: string;
  requiredConditions: string[];
  evidenceReferences: string[];
  questionsForHumanReview: string[];
  limitations: string[];
  generatedBy: "anthropic" | "openai" | "deterministic";
}

// The full review payload returned by /api/review.
export interface ReviewResult {
  evidence: EvidencePacket;
  brief: ConditionsBriefNarrative;
}
