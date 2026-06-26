import type { CheckStatus, Verdict } from "@/lib/tanseeq/types";

export interface VerdictStyle {
  label: string;
  blurb: string;
  chip: string; // badge classes
  bar: string; // score bar fill
  dot: string;
  ring: string;
  glyph: string;
}

export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  Proceed: {
    label: "Proceed",
    blurb: "Compliant — positive determination",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-300",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-300",
    glyph: "✓",
  },
  "Approve with Conditions": {
    label: "Approve with Conditions",
    blurb: "Acceptable subject to conditions",
    chip: "bg-amber-50 text-amber-700 border-amber-300",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    ring: "ring-amber-300",
    glyph: "◐",
  },
  "Re-scope": {
    label: "Re-scope",
    blurb: "Material non-compliance — revise",
    chip: "bg-orange-50 text-orange-700 border-orange-300",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    ring: "ring-orange-300",
    glyph: "↻",
  },
  Hold: {
    label: "Hold",
    blurb: "Fundamental impediment",
    chip: "bg-rose-50 text-rose-700 border-rose-300",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-300",
    glyph: "✕",
  },
};

export interface StatusStyle {
  label: string;
  pill: string;
}

export const STATUS_STYLE: Record<CheckStatus, StatusStyle> = {
  pass: { label: "Pass", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  advisory: { label: "Advisory", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  condition: { label: "Condition", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  major: { label: "Major", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  blocker: { label: "Blocker", pill: "bg-rose-50 text-rose-700 border-rose-200" },
};
