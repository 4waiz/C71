"use client";

import {
  CHECK_SEVERITY,
  LAND_USE_LABELS,
  SERVICE_STATUS_LABELS,
  type CoordinationFile,
} from "@/lib/tanseeq/types";
import { fmtArea, fmtNumber, fmtPct, fmtRatio } from "@/lib/tanseeq/format";
import { STATUS_STYLE, VERDICT_STYLE } from "./styles";

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      <span className="grid h-5 w-5 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-600">
        {index}
      </span>
      {children}
    </h3>
  );
}

function MetricRow({
  label,
  value,
  limit,
  flagged,
}: {
  label: string;
  value: string;
  limit?: string;
  flagged?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">
        <span className={flagged ? "text-orange-600" : undefined}>{value}</span>
        {limit ? <span className="ml-1 text-xs font-normal text-slate-400">{limit}</span> : null}
      </span>
    </div>
  );
}

export default function CoordinationView({ file }: { file: CoordinationFile }) {
  const { proposal: p, zone, review: r } = file;
  const vstyle = VERDICT_STYLE[r.verdict];
  const issued = new Date(file.issuedAt);
  const sortedChecks = r.checks
    .slice()
    .sort((a, b) => CHECK_SEVERITY[b.status] - CHECK_SEVERITY[a.status]);

  let sectionNo = 2; // sections 1 (proposal) & 2 (assessment) are fixed; dynamic ones continue
  const nextSection = () => String(++sectionNo);

  return (
    <article
      id="coordination-file"
      className="print-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Letterhead */}
      <header className="bg-brand px-6 py-5 text-white" style={{ background: "var(--brand)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
              Development Coordination File
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">{file.officer}</h2>
          </div>
          <div className="text-right text-xs leading-relaxed text-cyan-100/90">
            <p>
              Ref <span className="font-mono font-semibold text-white">{file.reference}</span>
            </p>
            <p>{issued.toUTCString()}</p>
          </div>
        </div>
      </header>

      {/* Verdict hero */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${vstyle.chip}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-xl font-bold">
              {vstyle.glyph}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                Determination
              </p>
              <p className="text-xl font-bold leading-tight">{r.verdict}</p>
            </div>
          </div>

          <div className="min-w-[180px] flex-1">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Compliance score</span>
              <span className="font-semibold text-slate-700">{r.complianceScore}/100</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${vstyle.bar} transition-all`}
                style={{ width: `${r.complianceScore}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <CountChip n={r.counts.pass} label="pass" tone="bg-emerald-100 text-emerald-700" />
              <CountChip n={r.counts.condition} label="conditions" tone="bg-amber-100 text-amber-700" />
              <CountChip n={r.counts.major} label="major" tone="bg-orange-100 text-orange-700" />
              <CountChip n={r.counts.blocker} label="blockers" tone="bg-rose-100 text-rose-700" />
            </div>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700">{r.headline}</p>
      </div>

      <div className="space-y-7 px-6 py-6">
        {/* 1. Proposal */}
        <section className="space-y-3">
          <SectionTitle index="1">Proposal</SectionTitle>
          <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
            <div>
              <MetricRow label="Project" value={p.projectName || "—"} />
              <MetricRow label="Applicant" value={p.applicant || "—"} />
              <MetricRow label="Parcel" value={p.parcelId || "—"} />
              <MetricRow label="Locality" value={p.locality || "—"} />
              <MetricRow label="Zone" value={zone.name} />
              <MetricRow label="Proposed use" value={LAND_USE_LABELS[p.proposedUse]} />
            </div>
            <div>
              <MetricRow
                label="Plot ratio (FAR)"
                value={fmtRatio(r.metrics.plotRatio)}
                limit={`/ max ${fmtRatio(zone.maxPlotRatio)}`}
                flagged={r.metrics.plotRatio > zone.maxPlotRatio}
              />
              <MetricRow
                label="Site coverage"
                value={fmtPct(r.metrics.siteCoverPct)}
                limit={`/ max ${fmtPct(zone.maxSiteCoverPct, 0)}`}
                flagged={r.metrics.siteCoverPct > zone.maxSiteCoverPct}
              />
              <MetricRow
                label="Height"
                value={`${fmtNumber(p.buildingHeightM)} m / ${p.storeys} st`}
                limit={`/ max ${zone.maxHeightM} m / ${zone.maxStoreys}`}
                flagged={p.buildingHeightM > zone.maxHeightM || p.storeys > zone.maxStoreys}
              />
              {p.dwellingUnits > 0 ? (
                <MetricRow
                  label="Units / density"
                  value={`${fmtNumber(p.dwellingUnits)} · ${fmtNumber(r.metrics.densityUnitsPerHa, 1)}/ha`}
                  limit={zone.maxDensityUnitsPerHa ? `/ max ${fmtNumber(zone.maxDensityUnitsPerHa)}/ha` : undefined}
                  flagged={!!zone.maxDensityUnitsPerHa && r.metrics.densityUnitsPerHa > zone.maxDensityUnitsPerHa}
                />
              ) : (
                <MetricRow label="Gross floor area" value={fmtArea(p.grossFloorAreaSqm)} />
              )}
              <MetricRow
                label="Parking"
                value={`${fmtNumber(r.metrics.parkingProvided)} / ${fmtNumber(r.metrics.parkingRequired)} req`}
                flagged={r.metrics.parkingProvided < r.metrics.parkingRequired}
              />
              <MetricRow
                label="Landscaping"
                value={fmtPct(r.metrics.landscapePct)}
                limit={`/ min ${fmtPct(zone.minLandscapePct, 0)}`}
                flagged={r.metrics.landscapePct < zone.minLandscapePct}
              />
            </div>
          </div>
        </section>

        {/* 2. Assessment */}
        <section className="space-y-3">
          <SectionTitle index="2">Assessment against development conditions</SectionTitle>
          <ul className="space-y-2">
            {sortedChecks.map((c) => {
              const s = STATUS_STYLE[c.status];
              return (
                <li
                  key={c.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {c.category}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.pill}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                    <span>
                      <span className="text-slate-400">Requirement:</span> {c.requirement}
                    </span>
                    <span>
                      <span className="text-slate-400">Observed:</span> {c.observed}
                    </span>
                  </div>
                  {c.condition ? (
                    <Callout tone="amber" label="Condition">
                      {c.condition}
                    </Callout>
                  ) : null}
                  {c.remedy ? (
                    <Callout tone="orange" label="Re-scope">
                      {c.remedy}
                    </Callout>
                  ) : null}
                  {c.hold ? (
                    <Callout tone="rose" label="Hold">
                      {c.hold}
                    </Callout>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Dynamic: hold reasons */}
        {r.holdReasons.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle index={nextSection()}>Reasons for hold</SectionTitle>
            <OrderedList items={r.holdReasons} tone="rose" />
          </section>
        ) : null}

        {/* Dynamic: re-scope directives */}
        {r.rescopeDirectives.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle index={nextSection()}>Re-scope directives</SectionTitle>
            <OrderedList items={r.rescopeDirectives} tone="orange" />
          </section>
        ) : null}

        {/* Dynamic: conditions */}
        {r.conditions.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle index={nextSection()}>Schedule of conditions</SectionTitle>
            <OrderedList items={r.conditions} tone="amber" />
          </section>
        ) : null}

        {/* Officer's assessment */}
        <section className="space-y-3">
          <SectionTitle index={nextSection()}>Officer&rsquo;s assessment</SectionTitle>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
            {r.narrative.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {/* Routing */}
        <section className="space-y-3">
          <SectionTitle index={nextSection()}>Coordination routing</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {r.routing.map((dept) => (
              <span
                key={dept}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
              >
                {dept}
              </span>
            ))}
          </div>
        </section>

        {/* Utilities footnote */}
        <section className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 sm:grid-cols-2">
          <span>Water — {SERVICE_STATUS_LABELS[p.utilities.water]}</span>
          <span>Sewer — {SERVICE_STATUS_LABELS[p.utilities.sewer]}</span>
          <span>Power — {SERVICE_STATUS_LABELS[p.utilities.power]}</span>
          <span>Stormwater — {SERVICE_STATUS_LABELS[p.utilities.stormwater]}</span>
        </section>

        {/* Validity */}
        <footer className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-600">Validity</p>
          <p className="mt-1">{r.validityNote}</p>
          <p className="mt-3 italic">
            Generated by {file.officer}. This coordination file is advisory and supports — but does
            not replace — statutory development consent.
          </p>
        </footer>
      </div>
    </article>
  );
}

function CountChip({ n, label, tone }: { n: number; label: string; tone: string }) {
  if (!n) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${tone}`}>
      {n} {label}
    </span>
  );
}

function Callout({
  tone,
  label,
  children,
}: {
  tone: "amber" | "orange" | "rose";
  label: string;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    orange: "border-orange-200 bg-orange-50 text-orange-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };
  return (
    <div className={`mt-2 rounded-md border px-3 py-2 text-sm leading-relaxed ${tones[tone]}`}>
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
        {label}:
      </span>
      {children}
    </div>
  );
}

function OrderedList({
  items,
  tone,
}: {
  items: string[];
  tone: "amber" | "orange" | "rose";
}) {
  const tones: Record<string, string> = {
    amber: "border-amber-200 text-amber-700",
    orange: "border-orange-200 text-orange-700",
    rose: "border-rose-200 text-rose-700",
  };
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700">
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border bg-white text-xs font-bold ${tones[tone]}`}
          >
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
