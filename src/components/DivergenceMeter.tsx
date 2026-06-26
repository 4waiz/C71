"use client";

import type { EvidencePacket } from "@/lib/tanseeq/types";
import { DECISION_AR, DECISION_STYLE } from "./ui";

export default function DivergenceMeter({ evidence }: { evidence: EvidencePacket }) {
  const { pressure, decisionLabel } = evidence;
  const ds = DECISION_STYLE[decisionLabel];
  const gap = pressure.coordinationDivergence;
  const aha = gap > 15;

  return (
    <div className="rounded-2xl border border-room-line bg-room-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-room-ink">Coordination divergence</h3>
          <p className="text-[11px] text-room-muted" dir="rtl">
            ضغط التطوير مقابل قدرة المجتمع على الاستيعاب
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ds.chip}`}
        >
          <span className={`h-2 w-2 rounded-full ${ds.dot}`} />
          {decisionLabel}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <Bar label="Development Pressure" labelAr="ضغط التطوير" value={pressure.developmentPressure} color="bg-gold" />
        <Bar
          label="Community Absorption"
          labelAr="قدرة المجتمع على الاستيعاب"
          value={pressure.communityAbsorption}
          color="bg-teal"
        />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-room-line bg-room-bg/60 px-4 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-room-muted">Divergence</div>
          <div className={`text-3xl font-bold tabular-nums ${gap > 0 ? "text-gold" : "text-teal"}`}>
            {gap > 0 ? "+" : ""}
            {gap}
          </div>
        </div>
        <div className="max-w-[58%] text-right text-[12px] leading-snug text-room-muted">
          {aha ? (
            <span>
              <span className="font-semibold text-room-ink">Land, capital &amp; market may be ready,</span> but
              community absorption is lower — the gap is what the committee must condition for.
            </span>
          ) : (
            <span>Development pressure and community absorption are broadly aligned for this scenario.</span>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-room-muted">
        Decision readiness / جاهزية القرار —{" "}
        <span dir="rtl">{DECISION_AR[decisionLabel]}</span>
      </p>
    </div>
  );
}

function Bar({
  label,
  labelAr,
  value,
  color,
}: {
  label: string;
  labelAr: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-room-ink">
          {label} <span className="text-[11px] text-room-muted" dir="rtl">{labelAr}</span>
        </span>
        <span className="text-sm font-bold tabular-nums text-room-ink">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
        <div className={`meter-fill h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
