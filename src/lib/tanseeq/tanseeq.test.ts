import { describe, expect, it } from "vitest";
import { parseCsv, num, bool } from "./csv";
import { loadDataset, selectDemoParcel } from "./data";
import {
  decideLabel,
  parseCapitalRange,
  runReview,
  transactionTrend,
} from "./scoring";
import { SCENARIO_PRESETS, DEFAULT_SCENARIO } from "./scenarios";
import { deterministicBrief } from "./evidence";
import type { ScenarioSettings } from "./types";

describe("csv parsing", () => {
  it("parses headers and rows into records", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('name,note\n"Doe, John",ok');
    expect(rows[0].name).toBe("Doe, John");
    expect(rows[0].note).toBe("ok");
  });

  it("coerces numbers and booleans safely", () => {
    expect(num("12.5")).toBe(12.5);
    expect(num("")).toBe(0);
    expect(num("abc")).toBe(0);
    expect(bool("true")).toBe(true);
    expect(bool("false")).toBe(false);
  });
});

describe("capital range parsing", () => {
  it("parses M and B suffixes", () => {
    expect(parseCapitalRange("15M-60M")).toEqual([15e6, 60e6]);
    expect(parseCapitalRange("500M-2B")).toEqual([500e6, 2e9]);
  });
  it("parses decimal billions", () => {
    const [lo, hi] = parseCapitalRange("400M-1.5B");
    expect(lo).toBe(400e6);
    expect(hi).toBe(1.5e9);
  });
});

describe("decision label mapping", () => {
  it("maps divergence bands to labels", () => {
    expect(decideLabel(10, "balanced", true)).toBe("Support for review");
    expect(decideLabel(22, "balanced", true)).toBe("Support with light conditions");
    expect(decideLabel(40, "balanced", true)).toBe("Support with conditions");
    expect(decideLabel(60, "balanced", true)).toBe("Re-scope before review");
  });
  it("holds when data is incomplete", () => {
    expect(decideLabel(5, "balanced", false)).toBe("Hold for additional evidence");
  });
  it("community priority is stricter than ROI", () => {
    // At divergence 17, community shift makes it harsher, ROI more lenient.
    expect(decideLabel(17, "roi", true)).toBe("Support for review");
    expect(decideLabel(17, "community", true)).toBe("Support with light conditions");
  });
});

describe("dataset + demo selection", () => {
  const data = loadDataset();

  it("loads all datasets", () => {
    expect(data.parcels.length).toBeGreaterThan(100);
    expect(data.amenities.length).toBeGreaterThan(1000);
    expect(data.communities.length).toBeGreaterThan(10);
  });

  it("selects a vacant demo parcel", () => {
    const demo = selectDemoParcel(data);
    expect(demo.current_status).toBe("vacant");
    expect(demo.development_potential_score).toBeGreaterThan(0);
  });

  it("demo selection is deterministic", () => {
    expect(selectDemoParcel(data).parcel_id).toBe(selectDemoParcel(data).parcel_id);
  });
});

describe("review engine", () => {
  const data = loadDataset();
  const demo = selectDemoParcel(data);
  const base: ScenarioSettings = { parcelId: demo.parcel_id, ...DEFAULT_SCENARIO };

  it("produces five checks with bounded scores", () => {
    const e = runReview(data, base);
    expect(e.checks).toHaveLength(5);
    for (const c of e.checks) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      expect(c.fieldsUsed.length).toBeGreaterThan(0);
    }
  });

  it("computes divergence as pressure minus absorption", () => {
    const e = runReview(data, base);
    expect(e.pressure.coordinationDivergence).toBe(
      e.pressure.developmentPressure - e.pressure.communityAbsorption,
    );
  });

  it("adding a community facility raises absorption and lowers divergence", () => {
    const asSubmitted = runReview(data, base);
    const withFacility = runReview(data, { ...base, communityFacility: "clinic" });
    expect(withFacility.pressure.communityAbsorption).toBeGreaterThanOrEqual(
      asSubmitted.pressure.communityAbsorption,
    );
    expect(withFacility.pressure.coordinationDivergence).toBeLessThanOrEqual(
      asSubmitted.pressure.coordinationDivergence,
    );
  });

  it("adding a mobility condition raises the mobility check", () => {
    const asSubmitted = runReview(data, base);
    const withMobility = runReview(data, { ...base, mobilityCondition: "bus_stop" });
    const m0 = asSubmitted.checks.find((c) => c.id === "mobility")!.score;
    const m1 = withMobility.checks.find((c) => c.id === "mobility")!.score;
    expect(m1).toBeGreaterThanOrEqual(m0);
  });

  it("holds when the programme is empty", () => {
    const e = runReview(data, { ...base, residentialUnits: 0, retailSharePct: 0 });
    expect(e.decisionLabel).toBe("Hold for additional evidence");
  });

  it("builds a transaction trend across years", () => {
    const e = runReview(data, base);
    expect(e.transactionTrend.length).toBeGreaterThan(0);
    for (const t of e.transactionTrend) {
      expect(t.year).toBeGreaterThanOrEqual(2023);
      expect(t.volume).toBeGreaterThan(0);
    }
  });

  it("never emits legacy zoning verdicts", () => {
    const e = runReview(data, base);
    const banned = ["Proceed", "Approve with Conditions", "approval-ready"];
    expect(banned).not.toContain(e.decisionLabel);
  });
});

describe("scenario lab presets", () => {
  const data = loadDataset();
  const demo = selectDemoParcel(data);
  const base: ScenarioSettings = { parcelId: demo.parcel_id, ...DEFAULT_SCENARIO };

  it("scenario E phases units down vs base", () => {
    const e = SCENARIO_PRESETS.find((p) => p.key === "E")!.apply(base);
    expect(e.residentialUnits).toBeLessThan(base.residentialUnits);
  });

  it("each preset yields a valid review", () => {
    for (const preset of SCENARIO_PRESETS) {
      const e = runReview(data, preset.apply(base));
      expect(e.checks).toHaveLength(5);
      expect(e.caseFileId).toContain("TNSQ");
    }
  });
});

describe("deterministic brief (fallback with no API keys)", () => {
  const data = loadDataset();
  const demo = selectDemoParcel(data);
  const base: ScenarioSettings = { parcelId: demo.parcel_id, ...DEFAULT_SCENARIO };

  it("generates a complete brief grounded in evidence", () => {
    const e = runReview(data, base);
    const brief = deterministicBrief(e);
    expect(brief.generatedBy).toBe("deterministic");
    expect(brief.committeeSummary).toContain(e.caseFileId);
    expect(brief.decisionLabel).toBe(e.decisionLabel);
    expect(brief.requiredConditions.length).toBeGreaterThan(0);
    expect(brief.limitations.join(" ")).toMatch(/OpenStreetMap/);
  });

  it("never uses risky approval wording", () => {
    const e = runReview(data, base);
    const brief = deterministicBrief(e);
    const blob = JSON.stringify(brief).toLowerCase();
    for (const phrase of ["regulatory approval", "consent granted", "official approval"]) {
      expect(blob).not.toContain(phrase);
    }
  });
});

describe("transactionTrend helper indirectly", () => {
  it("is exported and callable via runReview output", () => {
    expect(typeof transactionTrend).toBe("function");
  });
});
