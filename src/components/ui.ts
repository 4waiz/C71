import type { CheckTone, DecisionLabel } from "@/lib/tanseeq/types";

// Visual tone for the five-check scores in the dark intelligence room.
export const TONE_STYLE: Record<
  CheckTone,
  { text: string; bar: string; chip: string; dot: string }
> = {
  strong: {
    text: "text-teal",
    bar: "bg-teal",
    chip: "border-teal/40 bg-teal/10 text-teal",
    dot: "bg-teal",
  },
  adequate: {
    text: "text-emerald-300",
    bar: "bg-emerald-400/80",
    chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  watch: {
    text: "text-amber-300",
    bar: "bg-amber-400/80",
    chip: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  constrained: {
    text: "text-rose-300",
    bar: "bg-rose-400/80",
    chip: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
  },
};

// Visual tone for the advisory decision label.
export const DECISION_STYLE: Record<DecisionLabel, { chip: string; dot: string; ring: string }> = {
  "Support for review": {
    chip: "border-teal/40 bg-teal/10 text-teal",
    dot: "bg-teal",
    ring: "ring-teal/30",
  },
  "Support with light conditions": {
    chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
  },
  "Support with conditions": {
    chip: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    ring: "ring-amber-400/30",
  },
  "Re-scope before review": {
    chip: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    dot: "bg-orange-400",
    ring: "ring-orange-400/30",
  },
  "Hold for additional evidence": {
    chip: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
    ring: "ring-rose-400/30",
  },
};

export const DECISION_AR: Record<DecisionLabel, string> = {
  "Support for review": "دعم للمراجعة",
  "Support with light conditions": "دعم بشروط طفيفة",
  "Support with conditions": "دعم بشروط",
  "Re-scope before review": "إعادة تحديد النطاق قبل المراجعة",
  "Hold for additional evidence": "تعليق لطلب أدلة إضافية",
};
