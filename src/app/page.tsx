"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CaseIntake from "@/components/CaseIntake";
import DecisionRoom from "@/components/DecisionRoom";
import type { ScenarioComparison } from "@/components/ScenarioLab";
import { DEFAULT_SCENARIO } from "@/lib/tanseeq/scenarios";
import type { ScenarioKey } from "@/lib/tanseeq/scenarios";
import { renderBriefMarkdown } from "@/lib/tanseeq/export";
import type { Parcel, ReviewResult, ScenarioSettings } from "@/lib/tanseeq/types";

interface VacantParcel {
  parcel_id: string;
  district: string;
  development_potential_score: number;
  recommended_use: string;
}

const DOMAINS = [
  { title: "Land", ar: "الأرض", icon: "🏗️", blurb: "Vacant land, development potential & value.", grad: "from-[#2f5fb0] to-[#3f7bd6]" },
  { title: "Capital", ar: "رأس المال", icon: "💼", blurb: "Investor mandates, capital range & fit.", grad: "from-[#4b3aa0] to-[#6b58c9]" },
  { title: "Market", ar: "السوق", icon: "📈", blurb: "Transactions, price trend & momentum.", grad: "from-[#9a6b2e] to-[#c08a3e]" },
  { title: "Community", ar: "المجتمع", icon: "🏘️", blurb: "Services, amenities & service demand.", grad: "from-[#1f7a52] to-[#2f9e6a]" },
  { title: "Mobility", ar: "التنقل", icon: "🚌", blurb: "Transit, access & readiness.", grad: "from-[#0c8a7e] to-[#16b6a6]" },
];

const STEPS = [
  { icon: "📂", title: "Load challenge data", sub: "Real Abu Dhabi parcels, transactions, investors, communities, listings & OSM amenities." },
  { icon: "🎯", title: "Find the demo case", sub: "Auto-selects a vacant, high-potential parcel where community absorption lags." },
  { icon: "🧭", title: "Run five checks", sub: "Land · Demand/Supply · Mobility · Capital Fit · Market Momentum." },
  { icon: "⚖️", title: "Pressure vs absorption", sub: "Coordinate development pressure against community absorption into one divergence." },
  { icon: "📝", title: "Conditions brief", sub: "A grounded, advisory brief for the human review committee — exportable." },
];

function scenarioKeyFor(s: ScenarioSettings): ScenarioKey | null {
  const f = s.communityFacility;
  const m = s.mobilityCondition;
  if (f === "none" && m === "none") return "A";
  if (f === "clinic" && m === "none") return "B";
  if (f === "none" && m === "bus_stop") return "C";
  if (f === "clinic" && m === "bus_stop") return "D";
  if (f === "clinic" && m === "shaded_walkway") return "E";
  return null;
}

export default function Home() {
  const [demoParcel, setDemoParcel] = useState<Parcel | null>(null);
  const [vacantParcels, setVacantParcels] = useState<VacantParcel[]>([]);
  const [scenario, setScenario] = useState<ScenarioSettings>({ parcelId: "", ...DEFAULT_SCENARIO });
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [comparisons, setComparisons] = useState<ScenarioComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);
  const reviewRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const runReview = useCallback(async (s: ScenarioSettings, scroll = false) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [reviewRes, scenRes] = await Promise.all([
        fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }),
        fetch("/api/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }),
      ]);
      if (!reviewRes.ok) throw new Error(`Review service ${reviewRes.status}`);
      const review = (await reviewRes.json()) as ReviewResult;
      const scen = (await scenRes.json()) as { comparisons: ScenarioComparison[] };
      if (reqId.current !== id) return;
      setResult(review);
      setComparisons(scen.comparisons ?? []);
      if (scroll && reviewRef.current) reviewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      if (reqId.current === id) setError(err instanceof Error ? err.message : "Unable to run review");
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/review");
        const data = (await res.json()) as { demoParcel: Parcel; vacantParcels: VacantParcel[] };
        if (cancelled) return;
        setDemoParcel(data.demoParcel);
        setVacantParcels(data.vacantParcels);
        const s: ScenarioSettings = { parcelId: data.demoParcel.parcel_id, ...DEFAULT_SCENARIO };
        setScenario(s);
        void runReview(s);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runReview]);

  const handleSelectScenario = (c: ScenarioComparison) => {
    setScenario(c.scenario);
    void runReview(c.scenario);
  };

  const handleDownload = () => {
    if (!result) return;
    const md = renderBriefMarkdown(result);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.evidence.caseFileId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollRail = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  const activeScenarioKey = result ? scenarioKeyFor(result.evidence.scenario) : null;

  return (
    <div className="min-h-screen">
      {/* Utility strip */}
      <div className="no-print bg-ink text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-1.5 text-[11px]">
          <span className="opacity-80">Decision Intelligence · Abu Dhabi PropTech Challenge</span>
          <span className="flex items-center gap-3 opacity-80">
            <span>EN</span>
            <span className="opacity-40">|</span>
            <span dir="rtl">عربي</span>
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Tanseeq" className="h-11 w-11 rounded-2xl object-cover shadow-sm" />
            <div>
              <h1 className="text-lg font-bold leading-tight text-ink">
                Tanseeq <span className="font-normal text-muted">تنسيق</span>
              </h1>
              <p className="text-[12px] text-muted">AI Development Conditions Briefing Officer</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill dot="bg-teal" className="border-teal/30 bg-teal-soft text-teal-ink">System online</Pill>
            <Pill className="border-line bg-surface text-muted">Track 4 · Decision Intelligence</Pill>
            <Pill dot="bg-gold" className="border-gold/30 bg-gold-soft text-gold">Human review required</Pill>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5">
        {/* Hero */}
        <section className="tamm-wash py-12 text-center">
          <span className="tag mx-auto bg-teal-soft text-teal-ink">Coordinate. Don&apos;t review in silos.</span>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            One coordinated review for every new development.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-relaxed text-muted">
            Abu Dhabi is growing fast, and every new development adds pressure on the surrounding community. A
            parcel can look ready — vacant land, an active market, interested investors — but if nearby services,
            amenities and mobility access are not ready, the project can create future pressure for residents and
            operators. Tanseeq coordinates land, capital, market, community and mobility into one advisory{" "}
            <span className="font-medium text-ink">conditions brief for a human review committee.</span>
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Open the demo case →
            </button>
            <span className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[11px] text-muted">
              Sample datasets are synthetic · OSM amenities are real OpenStreetMap data
            </span>
          </div>
        </section>

        {/* Discover the signals — category rail */}
        <section className="py-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold text-ink">What Tanseeq coordinates</h3>
              <p className="mt-1 text-sm text-muted">Five signal domains, usually reviewed separately — connected into one.</p>
            </div>
            <div className="no-print hidden gap-2 sm:flex">
              <RailBtn onClick={() => scrollRail(-1)} label="Previous">‹</RailBtn>
              <RailBtn onClick={() => scrollRail(1)} label="Next">›</RailBtn>
            </div>
          </div>
          <div ref={railRef} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
            {DOMAINS.map((d) => (
              <div
                key={d.title}
                className={`relative flex min-w-[230px] snap-start flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${d.grad} p-5 text-white shadow-md sm:min-w-[250px]`}
                style={{ height: 220 }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{d.icon}</span>
                  <span className="text-sm font-medium opacity-80" dir="rtl">{d.ar}</span>
                </div>
                <div>
                  <div className="text-xl font-bold">{d.title}</div>
                  <p className="mt-1 text-[13px] leading-snug opacity-90">{d.blurb}</p>
                </div>
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </section>

        {/* How it works — light service-style grid */}
        <section className="py-8">
          <h3 className="text-2xl font-bold text-ink">How the review works</h3>
          <p className="mt-1 text-sm text-muted">A deterministic, auditable core — with an optional AI brief on top.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-line bg-surface-soft p-4 transition hover:bg-surface hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-[11px] font-semibold text-muted">0{i + 1}</span>
                </div>
                <div className="mt-3 text-sm font-semibold text-ink">{s.title}</div>
                <p className="mt-1 text-[12px] leading-snug text-muted">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The review tool */}
        <section ref={reviewRef} className="scroll-mt-20 py-8">
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-ink">Run a coordinated review</h3>
            <p className="mt-1 text-sm text-muted">
              Adjust the proposal, then read the decision room — checks, divergence and the conditions brief.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <div className="xl:sticky xl:top-[84px]">
                <CaseIntake
                  value={scenario}
                  onChange={setScenario}
                  demoParcel={demoParcel}
                  vacantParcels={vacantParcels}
                  onRun={() => runReview(scenario, false)}
                  loading={loading}
                />
                {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              </div>
            </div>

            <div className="xl:col-span-8">
              {result ? (
                <DecisionRoom
                  result={result}
                  comparisons={comparisons}
                  activeScenarioKey={activeScenarioKey}
                  onSelectScenario={handleSelectScenario}
                  onDownload={handleDownload}
                  onPrint={() => window.print()}
                />
              ) : (
                <div className="grid h-96 place-items-center rounded-3xl border border-dashed border-line bg-surface text-sm text-muted">
                  {loading ? "Coordinating signals…" : "Run a Tanseeq review to open the decision room."}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="no-print mt-6 border-t border-line bg-surface py-6 text-center text-xs text-muted">
        Tanseeq / تنسيق — a Decision Intelligence prototype. Determinations are advisory and support, but do not
        replace, a human review committee. Sample datasets are synthetic; OSM amenities © OpenStreetMap contributors.
      </footer>

      {/* Floating side actions (TAMM-style) */}
      <div className="no-print fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3">
        <FloatBtn label="Run review" onClick={() => runReview(scenario, true)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 3l14 9-14 9V3z" strokeLinejoin="round" />
          </svg>
        </FloatBtn>
        <FloatBtn label="Jump to review" onClick={() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </FloatBtn>
        <FloatBtn label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </FloatBtn>
      </div>
    </div>
  );
}

function Pill({ children, className, dot }: { children: React.ReactNode; className: string; dot?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}

function RailBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-lg text-muted transition hover:border-teal/40 hover:text-teal-ink"
    >
      {children}
    </button>
  );
}

function FloatBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-md transition hover:border-teal/50 hover:text-teal-ink"
    >
      {children}
    </button>
  );
}
