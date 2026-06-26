// Loads the Abu Dhabi PropTech challenge datasets from the local /data folder
// and exposes typed, cached accessors. Runs on the Node server runtime only
// (the API route), so reading from the filesystem at process.cwd() is safe and
// keeps the app self-contained / deployable without an external data service.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bool, num, parseCsv } from "./csv";
import type {
  Amenity,
  Community,
  Dataset,
  District,
  Investor,
  Listing,
  Parcel,
  Transaction,
} from "./types";

let cache: Dataset | null = null;

function read(file: string): Record<string, string>[] {
  const path = join(process.cwd(), "data", file);
  return parseCsv(readFileSync(path, "utf8"));
}

export function loadDataset(): Dataset {
  if (cache) return cache;

  const districts: District[] = read("districts.csv").map((r) => ({
    district: r.district,
    area_type: r.area_type,
    profile: r.profile,
    base_sale_aed_sqm: num(r.base_sale_aed_sqm),
    gross_yield_pct: num(r.gross_yield_pct),
    infrastructure_score: num(r.infrastructure_score),
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    established_year: num(r.established_year),
  }));

  const parcels: Parcel[] = read("sample_parcels.csv").map((r) => ({
    parcel_id: r.parcel_id,
    district: r.district,
    zone: r.zone,
    land_use: r.land_use,
    parcel_size_sqm: num(r.parcel_size_sqm),
    current_status: r.current_status,
    infrastructure_score: num(r.infrastructure_score),
    development_potential_score: num(r.development_potential_score),
    estimated_value_aed: num(r.estimated_value_aed),
    recommended_use: r.recommended_use,
  }));

  const transactions: Transaction[] = read("sample_transactions.csv").map((r) => ({
    transaction_id: r.transaction_id,
    date: r.date,
    district: r.district,
    asset_type: r.asset_type,
    transaction_value_aed: num(r.transaction_value_aed),
    size_sqm: num(r.size_sqm),
    price_per_sqm: num(r.price_per_sqm),
    buyer_type: r.buyer_type,
  }));

  const investors: Investor[] = read("sample_investors.csv").map((r) => ({
    investor_id: r.investor_id,
    investor_type: r.investor_type,
    preferred_sector: r.preferred_sector,
    preferred_district: r.preferred_district,
    capital_range_aed: r.capital_range_aed,
    risk_profile: r.risk_profile,
    investment_horizon: r.investment_horizon,
    strategic_fit_score: num(r.strategic_fit_score),
  }));

  const communities: Community[] = read("sample_communities.csv").map((r) => ({
    community_id: r.community_id,
    district: r.district,
    population_estimate: num(r.population_estimate),
    occupancy_rate: num(r.occupancy_rate),
    service_demand_index: num(r.service_demand_index),
    mobility_score: num(r.mobility_score),
    resident_experience_score: num(r.resident_experience_score),
    optimization_opportunity: r.optimization_opportunity,
  }));

  const listings: Listing[] = read("sample_listings.csv").map((r) => ({
    listing_id: r.listing_id,
    district: r.district,
    community: r.community,
    listing_type: r.listing_type,
    property_type: r.property_type,
    bedrooms: num(r.bedrooms),
    bathrooms: num(r.bathrooms),
    size_sqm: num(r.size_sqm),
    price_aed: num(r.price_aed),
    price_per_sqm_aed: num(r.price_per_sqm_aed),
    furnished: bool(r.furnished),
    amenities: r.amenities,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    listed_date: r.listed_date,
    status: r.status,
    agency_type: r.agency_type,
  }));

  const amenities: Amenity[] = read("osm_amenities.csv").map((r) => ({
    amenity_id: r.amenity_id,
    category: r.category,
    subtype: r.subtype,
    name: r.name,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    district: r.district,
  }));

  cache = { districts, parcels, transactions, investors, communities, listings, amenities };
  return cache;
}

// ---------------------------------------------------------------------------
// Demo-case selection
// ---------------------------------------------------------------------------

// Finds the strongest "coordination divergence" demo parcel: a vacant parcel
// with high development potential in a district whose community absorption
// (amenity supply + mobility) is comparatively weak — i.e. the land looks ready
// but the surrounding community may not be. This is the aha case judges should
// see first. Selection is deterministic (no randomness).
export function selectDemoParcel(data: Dataset): Parcel {
  const communityByDistrict = new Map(data.communities.map((c) => [c.district, c]));
  const amenityByDistrict = new Map<string, number>();
  for (const a of data.amenities) {
    amenityByDistrict.set(a.district, (amenityByDistrict.get(a.district) ?? 0) + 1);
  }

  const candidates = data.parcels.filter(
    (p) => p.current_status === "vacant" && p.development_potential_score >= 55,
  );

  let best: Parcel | null = null;
  let bestScore = -Infinity;

  for (const p of candidates) {
    const community = communityByDistrict.get(p.district);
    if (!community) continue;

    // Development pressure proxy: land potential + infra + value scale.
    const pressureProxy =
      p.development_potential_score * 0.5 +
      p.infrastructure_score * 0.3 +
      Math.min(100, (p.estimated_value_aed / 60_000_000) * 100) * 0.2;

    // Absorption proxy: amenity density + mobility + resident experience minus
    // service-demand pressure. Lower means the community is less ready.
    const amenityDensity = Math.min(
      100,
      ((amenityByDistrict.get(p.district) ?? 0) / Math.max(1, community.population_estimate / 1000)) *
        20,
    );
    const absorptionProxy =
      amenityDensity * 0.35 +
      community.mobility_score * 0.3 +
      community.resident_experience_score * 0.2 +
      (100 - community.service_demand_index) * 0.15;

    // We want HIGH pressure and LOW absorption → large divergence.
    const divergence = pressureProxy - absorptionProxy;
    if (divergence > bestScore) {
      bestScore = divergence;
      best = p;
    }
  }

  // Fall back to the first vacant parcel, then the first parcel, so the app
  // never has nothing to show.
  return best ?? data.parcels.find((p) => p.current_status === "vacant") ?? data.parcels[0];
}
