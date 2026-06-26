import { describe, expect, it } from "vitest";
import { runReview, deriveMetrics } from "./engine";
import { getRegulation } from "./regulations";
import { buildCoordinationFile, buildReference, renderMarkdown } from "./coordination";
import { PRESETS, blankProposal, getPreset } from "./presets";
import type { DevelopmentProposal } from "./types";

function clone(p: DevelopmentProposal): DevelopmentProposal {
  return JSON.parse(JSON.stringify(p));
}

describe("preset verdicts", () => {
  it.each(PRESETS.map((p) => [p.label, p.id, p.expectedVerdict] as const))(
    "%s resolves to %s",
    (_label, id, expected) => {
      const preset = getPreset(id)!;
      const result = runReview(preset.proposal);
      expect(result.verdict).toBe(expected);
    },
  );
});

describe("verdict ordering by severity", () => {
  const base = getPreset("compliant-residential")!.proposal;

  it("compliant proposal proceeds with a high score", () => {
    const r = runReview(base);
    expect(r.verdict).toBe("Proceed");
    expect(r.complianceScore).toBeGreaterThanOrEqual(92);
    expect(r.conditions).toHaveLength(0);
    expect(r.holdReasons).toHaveLength(0);
    expect(r.rescopeDirectives).toHaveLength(0);
  });

  it("a single minor exceedance yields Approve with Conditions", () => {
    const p = clone(base);
    p.landscapeAreaSqm = 600; // 15% vs 25% required -> condition
    const r = runReview(p);
    expect(r.verdict).toBe("Approve with Conditions");
    expect(r.conditions.length).toBeGreaterThan(0);
  });

  it("a material exceedance escalates to Re-scope", () => {
    const p = clone(base);
    p.grossFloorAreaSqm = 12000; // ratio 3.0 vs max 1.8 -> major
    const r = runReview(p);
    expect(r.verdict).toBe("Re-scope");
    expect(r.rescopeDirectives.length).toBeGreaterThan(0);
  });

  it("a blocker forces Hold even when other checks are major", () => {
    const p = clone(base);
    p.grossFloorAreaSqm = 12000; // major
    p.hasLegalAccess = false; // blocker
    const r = runReview(p);
    expect(r.verdict).toBe("Hold");
    expect(r.holdReasons.length).toBeGreaterThan(0);
  });
});

describe("specific checks", () => {
  const base = getPreset("compliant-residential")!.proposal;

  it("flags disallowed land use as a hold", () => {
    const p = clone(base);
    p.proposedUse = "industrial"; // not permitted in R2
    const r = runReview(p);
    expect(r.verdict).toBe("Hold");
    expect(r.holdReasons.join(" ")).toMatch(/not permitted/i);
  });

  it("treats absent water as a blocker", () => {
    const p = clone(base);
    p.utilities.water = "absent";
    const r = runReview(p);
    const infra = r.checks.find((c) => c.id === "infrastructure")!;
    expect(infra.status).toBe("blocker");
    expect(r.verdict).toBe("Hold");
  });

  it("treats planned utilities as a condition", () => {
    const p = clone(base);
    p.utilities.stormwater = "planned";
    const r = runReview(p);
    const infra = r.checks.find((c) => c.id === "infrastructure")!;
    expect(infra.status).toBe("condition");
  });

  it("incomplete submission blocks and short-circuits other checks", () => {
    const p = clone(base);
    p.plotAreaSqm = 0;
    const r = runReview(p);
    expect(r.verdict).toBe("Hold");
    expect(r.checks).toHaveLength(1);
    expect(r.checks[0].id).toBe("submission");
  });

  it("computes parking requirement for residential by units", () => {
    const reg = getRegulation("R2");
    const m = deriveMetrics(base, reg);
    expect(m.parkingRequired).toBe(Math.ceil(base.dwellingUnits * reg.minParkingPerUnit));
  });

  it("computes parking requirement for commercial by GFA", () => {
    const preset = getPreset("rescope-commercial")!.proposal;
    const reg = getRegulation("C1");
    const m = deriveMetrics(preset, reg);
    expect(m.parkingRequired).toBe(Math.ceil((preset.grossFloorAreaSqm / 100) * reg.parkingPer100SqmGfa));
  });

  it("minor plot-ratio overrun is a condition, large overrun is major", () => {
    const minor = clone(base);
    minor.grossFloorAreaSqm = base.plotAreaSqm * 1.85; // ratio 1.85 vs 1.8 (~3% over)
    expect(runReview(minor).checks.find((c) => c.id === "plot-ratio")!.status).toBe("condition");

    const major = clone(base);
    major.grossFloorAreaSqm = base.plotAreaSqm * 2.5; // ratio 2.5 vs 1.8 (>25% over)
    expect(runReview(major).checks.find((c) => c.id === "plot-ratio")!.status).toBe("major");
  });
});

describe("coordination file", () => {
  it("produces a stable reference for the same proposal", () => {
    const d = new Date("2026-06-26T00:00:00Z");
    const preset = getPreset("conditions-tower")!.proposal;
    expect(buildReference(preset, d)).toBe(buildReference(preset, d));
    expect(buildReference(preset, d)).toMatch(/^TNSQ-2026-\d{4}$/);
  });

  it("renders markdown that contains the verdict and conditions", () => {
    const file = buildCoordinationFile(getPreset("conditions-tower")!.proposal, {
      issuedAt: new Date("2026-06-26T00:00:00Z"),
    });
    const md = renderMarkdown(file);
    expect(md).toContain("Development Coordination File");
    expect(md).toContain(file.review.verdict.toUpperCase());
    expect(md).toContain("Schedule of Conditions");
  });

  it("blank proposal is treated as an incomplete submission", () => {
    const r = runReview(blankProposal);
    expect(r.verdict).toBe("Hold");
  });
});
