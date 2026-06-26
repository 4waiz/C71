"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/tanseeq/types";
import { TONE_STYLE } from "./ui";

export default function CheckCard({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false);
  const tone = TONE_STYLE[check.tone];

  return (
    <div className="tnsq-rise rounded-2xl border border-room-line bg-room-panel p-4 transition hover:border-teal/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-room-ink">{check.title}</div>
          <div className="text-[11px] text-room-muted" dir="rtl">
            {check.titleAr}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${tone.text}`}>{check.score}</div>
          <div className="text-[10px] uppercase tracking-wider text-room-muted">/ 100</div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={`meter-fill h-full rounded-full ${tone.bar}`} style={{ width: `${check.score}%` }} />
      </div>

      <span
        className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.chip}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        {check.status}
      </span>

      <p className="mt-2 text-[13px] leading-snug text-room-muted">{check.finding}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-[11px] font-medium text-teal transition hover:text-[var(--teal-soft)]"
      >
        {open ? "Hide evidence" : "Show evidence & fields"}
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-room-line pt-2 text-[12px] text-room-muted">
          <ul className="space-y-1">
            {check.evidence.map((e, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-teal">▸</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <p>
            <span className="font-semibold text-rose-300">Risk: </span>
            {check.risk}
          </p>
          <p>
            <span className="font-semibold text-teal">Recommendation: </span>
            {check.recommendation}
          </p>
          {check.matchingInvestors && check.matchingInvestors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {check.matchingInvestors.map((m) => (
                <span
                  key={m.investor_id}
                  className="rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[11px] text-gold"
                  title={`${m.investor_type} · ${m.capital_range_aed} · ${m.risk_profile} · ${m.investment_horizon} · fit ${m.strategic_fit_score}`}
                >
                  {m.investor_id} · {m.preferred_sector}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {check.fieldsUsed.map((f) => (
              <span
                key={f}
                className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-room-muted"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
