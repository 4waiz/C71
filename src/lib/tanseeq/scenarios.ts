// Scenario Lab — the five comparison scenarios judges can flip between. Each one
// is a deterministic transform of the officer's base scenario settings, so the
// divergence meter and conditions update live as the scenario changes.

import type { ScenarioSettings } from "./types";

export type ScenarioKey = "A" | "B" | "C" | "D" | "E";

export interface ScenarioPreset {
  key: ScenarioKey;
  label: string;
  blurb: string;
  apply: (base: ScenarioSettings) => ScenarioSettings;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    key: "A",
    label: "As submitted",
    blurb: "The proposal exactly as the applicant submitted it.",
    apply: (b) => ({ ...b, communityFacility: "none", mobilityCondition: "none" }),
  },
  {
    key: "B",
    label: "Add community facility",
    blurb: "Attach a clinic to offset added service demand.",
    apply: (b) => ({ ...b, communityFacility: "clinic", mobilityCondition: "none" }),
  },
  {
    key: "C",
    label: "Add mobility access",
    blurb: "Attach a bus stop / shuttle access condition.",
    apply: (b) => ({ ...b, communityFacility: "none", mobilityCondition: "bus_stop" }),
  },
  {
    key: "D",
    label: "Facility + mobility",
    blurb: "Both a community facility and a mobility condition.",
    apply: (b) => ({ ...b, communityFacility: "clinic", mobilityCondition: "bus_stop" }),
  },
  {
    key: "E",
    label: "Phase units + conditions",
    blurb: "Phase residential units down and keep both conditions.",
    apply: (b) => ({
      ...b,
      residentialUnits: Math.round(b.residentialUnits * 0.6),
      communityFacility: "clinic",
      mobilityCondition: "shaded_walkway",
    }),
  },
];

export const DEFAULT_SCENARIO: Omit<ScenarioSettings, "parcelId"> = {
  proposedUse: "residential",
  residentialUnits: 360,
  retailSharePct: 15,
  communityFacility: "none",
  mobilityCondition: "none",
  priority: "balanced",
};
