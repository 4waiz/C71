// Builds the deterministic conditions brief from an evidence packet, and the
// compact JSON evidence packet handed to the optional LLM layer.
//
// The deterministic brief is the guaranteed fallback: the app produces a
// complete, grounded, committee-style brief with no API keys at all. The LLM
// layer (llm.ts) only ever rephrases the SAME evidence — it can never introduce
// a fact that isn't here.

import type { ConditionsBriefNarrative, EvidencePacket } from "./types";

// A compact, fact-only view of the packet. This is the contract the LLM is told
// to stay within.
export function toLlmEvidence(packet: EvidencePacket) {
  return {
    caseFileId: packet.caseFileId,
    parcel: {
      id: packet.parcel.parcel_id,
      district: packet.parcel.district,
      status: packet.parcel.current_status,
      land_use: packet.parcel.land_use,
      recommended_use: packet.parcel.recommended_use,
      development_potential_score: packet.parcel.development_potential_score,
      infrastructure_score: packet.parcel.infrastructure_score,
      estimated_value_aed: packet.parcel.estimated_value_aed,
    },
    proposedUse: packet.proposedUseLabel,
    scenario: packet.scenario,
    community: packet.community
      ? {
          service_demand_index: packet.community.service_demand_index,
          mobility_score: packet.community.mobility_score,
          resident_experience_score: packet.community.resident_experience_score,
          population_estimate: packet.community.population_estimate,
        }
      : null,
    amenityCounts: packet.amenityCounts,
    transactionTrend: packet.transactionTrend,
    checks: packet.checks.map((c) => ({
      title: c.title,
      score: c.score,
      status: c.status,
      finding: c.finding,
      risk: c.risk,
      recommendation: c.recommendation,
      evidence: c.evidence,
    })),
    developmentPressure: packet.pressure.developmentPressure,
    communityAbsorption: packet.pressure.communityAbsorption,
    coordinationDivergence: packet.pressure.coordinationDivergence,
    decisionLabel: packet.decisionLabel,
    dataComplete: packet.dataComplete,
    missingEvidence: packet.missingEvidence,
  };
}

// Deterministic, dependency-free conditions brief. Always available.
export function deterministicBrief(packet: EvidencePacket): ConditionsBriefNarrative {
  const { pressure, decisionLabel, checks } = packet;
  const weakest = [...checks].sort((a, b) => a.score - b.score).slice(0, 2);

  if (!packet.dataComplete) {
    return {
      decisionLabel,
      committeeSummary: `Case file ${packet.caseFileId} cannot be assessed as submitted: ${packet.missingEvidence.join("; ")}. Tanseeq is holding the proposal for additional evidence rather than producing an advisory position on incomplete inputs.`,
      whyNotAsSubmitted:
        "Required inputs are missing, so development pressure and community absorption cannot be coordinated reliably for a committee.",
      requiredConditions: [
        "Provide the missing evidence listed above before re-running the review.",
      ],
      evidenceReferences: packet.missingEvidence,
      questionsForHumanReview: [
        "Which body owns the missing data, and what is the timeline to supply it?",
      ],
      limitations: limitations(packet),
      generatedBy: "deterministic",
    };
  }

  const ready = checks.filter((c) => c.id !== "demand" && c.id !== "mobility");
  const readyScore = Math.round(ready.reduce((a, c) => a + c.score, 0) / ready.length);

  const committeeSummary =
    `Case file ${packet.caseFileId} — a ${packet.proposedUseLabel.toLowerCase()} proposal on vacant parcel ${packet.parcel.parcel_id} in ${packet.parcel.district}. ` +
    `Land, capital and market signals average ${readyScore}/100, giving a development pressure of ${pressure.developmentPressure}/100, ` +
    `but community absorption sits at ${pressure.communityAbsorption}/100 — a coordination divergence of ${pressure.coordinationDivergence}. ` +
    `On that basis Tanseeq advises: ${decisionLabel}. This is an advisory position for the human review committee, not a regulatory approval.`;

  const whyNotAsSubmitted =
    pressure.coordinationDivergence <= 15
      ? `Development pressure (${pressure.developmentPressure}) and community absorption (${pressure.communityAbsorption}) are broadly aligned, so the scheme can be supported substantially as submitted.`
      : `The land/capital/market case is ready, but community absorption is lower (${pressure.communityAbsorption} vs ${pressure.developmentPressure}). ` +
        `The widest gaps are ${weakest.map((c) => `${c.title} (${c.score}/100)`).join(" and ")}, meaning residents and operators could face future pressure if the scheme proceeds unchanged.`;

  const requiredConditions = buildConditions(packet);

  return {
    decisionLabel,
    committeeSummary,
    whyNotAsSubmitted,
    requiredConditions,
    evidenceReferences: weakest.flatMap((c) => c.evidence.slice(0, 2)),
    questionsForHumanReview: buildQuestions(packet),
    limitations: limitations(packet),
    generatedBy: "deterministic",
  };
}

function buildConditions(packet: EvidencePacket): string[] {
  const conditions: string[] = [];
  const demand = packet.checks.find((c) => c.id === "demand")!;
  const mobility = packet.checks.find((c) => c.id === "mobility")!;
  const { scenario } = packet;

  if (demand.score < 60 && scenario.communityFacility === "none") {
    conditions.push(
      "Condition: deliver a community facility (clinic, school, grocery or park) phased with occupancy to offset added service demand.",
    );
  }
  if (mobility.score < 60 && scenario.mobilityCondition === "none") {
    conditions.push(
      "Condition: secure a mobility measure (shuttle, bus stop or shaded walkway) before new residents take occupancy.",
    );
  }
  if (packet.pressure.coordinationDivergence > 50) {
    conditions.push(
      "Re-scope directive: reduce or phase residential units so development pressure does not outrun community absorption.",
    );
  }
  if (scenario.communityFacility !== "none") {
    conditions.push(
      `Acknowledged: scenario already includes a ${scenario.communityFacility} — confirm delivery is bound to a phasing trigger.`,
    );
  }
  if (scenario.mobilityCondition !== "none") {
    conditions.push(
      `Acknowledged: scenario already includes a ${scenario.mobilityCondition.replace(/_/g, " ")} — confirm it is funded and programmed.`,
    );
  }
  if (conditions.length === 0) {
    conditions.push("No material conditions required; proceed to committee for confirmation.");
  }
  return conditions;
}

function buildQuestions(packet: EvidencePacket): string[] {
  const questions: string[] = [
    `Does the committee accept a development pressure of ${packet.pressure.developmentPressure} against community absorption of ${packet.pressure.communityAbsorption} for this district?`,
  ];
  const capital = packet.checks.find((c) => c.id === "capital")!;
  if (capital.matchingInvestors && capital.matchingInvestors.length) {
    questions.push(
      `Is the lead investor mandate (${capital.matchingInvestors[0].investor_id}) confirmed for risk profile and horizon?`,
    );
  } else {
    questions.push("No investor mandate matched — has a funding route been identified outside the dataset?");
  }
  if (packet.scenario.priority === "community") {
    questions.push("Under a community-first priority, are the proposed conditions sufficient to protect resident experience?");
  }
  questions.push("Are there local plans for services or transit not captured in these datasets that change the absorption picture?");
  return questions;
}

function limitations(packet: EvidencePacket): string[] {
  return [
    "Tanseeq is an advisory decision-intelligence prototype; it does not grant regulatory approval, consent or official authority.",
    "Challenge sample datasets (parcels, transactions, investors, communities, listings, districts) are synthetic and used for prototype scoring only.",
    "OpenStreetMap amenities are real © OpenStreetMap contributors and reflect mapped data only — unmapped facilities are not counted.",
    packet.community
      ? "Community metrics are district-level averages and may not reflect parcel-level conditions."
      : "No community record was available for this district; absorption uses conservative defaults.",
  ];
}
