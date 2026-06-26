"use client";

import type { ReviewResult } from "@/lib/tanseeq/types";
import type { ScenarioKey } from "@/lib/tanseeq/scenarios";
import CheckCard from "./CheckCard";
import DivergenceMeter from "./DivergenceMeter";
import ScenarioLab, { type ScenarioComparison } from "./ScenarioLab";
import ConditionsBrief from "./ConditionsBrief";

interface Props {
  result: ReviewResult;
  comparisons: ScenarioComparison[];
  activeScenarioKey: ScenarioKey | null;
  onSelectScenario: (c: ScenarioComparison) => void;
  onDownload: () => void;
  onPrint: () => void;
}

export default function DecisionRoom({
  result,
  comparisons,
  activeScenarioKey,
  onSelectScenario,
  onDownload,
  onPrint,
}: Props) {
  const { evidence: e } = result;

  return (
    <section className="room-grid rounded-3xl border border-room-line p-5 text-room-ink shadow-2xl sm:p-6">
      {/* Room header */}
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="tnsq-pulse h-2 w-2 rounded-full bg-teal" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-room-muted">
            Decision Room · غرفة القرار
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg border border-room-line bg-room-panel px-3 py-1.5 text-xs font-medium text-room-ink transition hover:border-teal/40"
          >
            Download brief (.md)
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="rounded-lg border border-room-line bg-room-panel px-3 py-1.5 text-xs font-medium text-room-ink transition hover:border-teal/40"
          >
            Print / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT — selected parcel / district evidence */}
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-room-line bg-room-panel p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-room-muted">Selected parcel</h3>
            <div className="mt-2 font-mono text-lg font-bold text-room-ink">{e.parcel.parcel_id}</div>
            <div className="text-[13px] text-room-muted">
              {e.parcel.district} · {e.parcel.zone}
            </div>

            <dl className="mt-4 space-y-2 text-[12px]">
              <Row k="Status" v={e.parcel.current_status.replace(/_/g, " ")} />
              <Row k="Dev. potential" v={`${e.parcel.development_potential_score}/100`} />
              <Row k="Infrastructure" v={`${e.parcel.infrastructure_score}/100`} />
              <Row k="Est. value" v={fmtAed(e.parcel.estimated_value_aed)} />
              <Row k="Recommended" v={e.parcel.recommended_use.replace(/_/g, " ")} />
            </dl>

            <div className="mt-4 border-t border-room-line pt-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-room-muted">
                District signals
              </h4>
              <dl className="mt-2 space-y-2 text-[12px]">
                {e.community ? (
                  <>
                    <Row k="Service demand" v={`${e.community.service_demand_index}/100`} />
                    <Row k="Mobility score" v={`${e.community.mobility_score}/100`} />
                    <Row k="Resident exp." v={`${e.community.resident_experience_score}/100`} />
                    <Row k="Population" v={e.community.population_estimate.toLocaleString()} />
                  </>
                ) : (
                  <p className="text-room-muted">No community record (insufficient evidence).</p>
                )}
              </dl>
            </div>

            <div className="mt-4 border-t border-room-line pt-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-room-muted">
                OSM amenities · هذا الحي
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(e.amenityCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, n]) => (
                    <span
                      key={cat}
                      className="rounded-md border border-room-line bg-room-bg/40 px-1.5 py-0.5 text-[11px] capitalize text-room-muted"
                    >
                      {cat} {n}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER — divergence meter + five checks */}
        <div className="space-y-5 lg:col-span-5">
          <DivergenceMeter evidence={e} />
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-room-muted">
              Five coordination checks · فحوصات التنسيق الخمسة
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {e.checks.map((c) => (
                <CheckCard key={c.id} check={c} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — conditions brief */}
        <div className="lg:col-span-4">
          <ConditionsBrief result={result} />
        </div>
      </div>

      {/* BOTTOM — scenario lab */}
      <div className="no-print mt-5">
        <ScenarioLab comparisons={comparisons} activeKey={activeScenarioKey} onSelect={onSelectScenario} />
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-room-muted">{k}</dt>
      <dd className="truncate text-right font-medium capitalize text-room-ink">{v}</dd>
    </div>
  );
}

function fmtAed(value: number): string {
  if (value >= 1e9) return `AED ${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `AED ${(value / 1e6).toFixed(1)}M`;
  return `AED ${Math.round(value).toLocaleString()}`;
}
