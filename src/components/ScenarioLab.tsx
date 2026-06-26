"use client";

import type { DecisionLabel, ScenarioSettings } from "@/lib/tanseeq/types";
import type { ScenarioKey } from "@/lib/tanseeq/scenarios";
import { DECISION_STYLE } from "./ui";

export interface ScenarioComparison {
  key: ScenarioKey;
  label: string;
  blurb: string;
  scenario: ScenarioSettings;
  developmentPressure: number;
  communityAbsorption: number;
  coordinationDivergence: number;
  decisionLabel: DecisionLabel;
  requiredConditionsCount: number;
}

interface Props {
  comparisons: ScenarioComparison[];
  activeKey: ScenarioKey | null;
  onSelect: (c: ScenarioComparison) => void;
}

export default function ScenarioLab({ comparisons, activeKey, onSelect }: Props) {
  return (
    <div className="tamm-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Scenario Lab · مختبر السيناريوهات</h3>
          <p className="text-[11px] text-muted">Compare conditions before review — divergence updates live.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {comparisons.map((c) => {
          const active = c.key === activeKey;
          const ds = DECISION_STYLE[c.decisionLabel];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c)}
              className={`group flex flex-col rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-teal bg-teal-soft ring-2 ring-teal/20"
                  : "border-line bg-surface hover:border-teal/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-surface-soft text-xs font-bold text-ink">
                  {c.key}
                </span>
                <span className={`h-2 w-2 rounded-full ${ds.dot}`} />
              </div>
              <div className="mt-2 text-[13px] font-semibold text-ink">{c.label}</div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{c.blurb}</p>

              <div className="mt-3 space-y-1.5">
                <MiniBar label="Pressure" value={c.developmentPressure} color="bg-gold" />
                <MiniBar label="Absorption" value={c.communityAbsorption} color="bg-teal" />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
                <span className="text-[10px] uppercase tracking-wide text-muted">Divergence</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    c.coordinationDivergence > 30
                      ? "text-rose-600"
                      : c.coordinationDivergence > 15
                        ? "text-amber-600"
                        : "text-teal-ink"
                  }`}
                >
                  {c.coordinationDivergence > 0 ? "+" : ""}
                  {c.coordinationDivergence}
                </span>
              </div>
              <span className={`mt-2 truncate rounded-md border px-1.5 py-0.5 text-center text-[10px] font-medium ${ds.chip}`}>
                {c.decisionLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-soft">
        <div className={`meter-fill h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
