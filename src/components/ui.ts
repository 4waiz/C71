import type { CheckTone, DecisionLabel } from "@/lib/tanseeq/types";

// Visual tone for the five-check scores (light TAMM-style palette).
export const TONE_STYLE: Record<
  CheckTone,
  { text: string; bar: string; chip: string; dot: string; ring: string }
> = {
  strong: {
    text: "text-teal-ink",
    bar: "bg-teal",
    chip: "border-teal/30 bg-teal-soft text-teal-ink",
    dot: "bg-teal",
    ring: "ring-teal/20",
  },
  adequate: {
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  watch: {
    text: "text-amber-700",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
  },
  constrained: {
    text: "text-rose-700",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
  },
};

// Visual tone for the advisory decision label.
export const DECISION_STYLE: Record<DecisionLabel, { chip: string; dot: string }> = {
  "Support for review": {
    chip: "border-teal/30 bg-teal-soft text-teal-ink",
    dot: "bg-teal",
  },
  "Support with light conditions": {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "Support with conditions": {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  "Re-scope before review": {
    chip: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  "Hold for additional evidence": {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

export const DECISION_AR: Record<DecisionLabel, string> = {
  "Support for review": "دعم للمراجعة",
  "Support with light conditions": "دعم بشروط طفيفة",
  "Support with conditions": "دعم بشروط",
  "Re-scope before review": "إعادة تحديد النطاق قبل المراجعة",
  "Hold for additional evidence": "تعليق لطلب أدلة إضافية",
};
