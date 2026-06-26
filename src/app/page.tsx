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
  const [scenario, setScenario] = useState<ScenarioSettings>({
    parcelId: "",
    ...DEFAULT_SCENARIO,
  });
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [comparisons, setComparisons] = useState<ScenarioComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);
  const roomRef = useRef<HTMLDivElement>(null);

  const runReview = useCallback(async (s: ScenarioSettings, scroll = false) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [reviewRes, scenRes] = await Promise.all([
        fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        }),
        fetch("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        }),
      ]);
      if (!reviewRes.ok) throw new Error(`Review service ${reviewRes.status}`);
      const review = (await reviewRes.json()) as ReviewResult;
      const scen = (await scenRes.json()) as { comparisons: ScenarioComparison[] };
      if (reqId.current !== id) return; // superseded
      setResult(review);
      setComparisons(scen.comparisons ?? []);
      if (scroll && roomRef.current) {
        roomRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      if (reqId.current === id) setError(err instanceof Error ? err.message : "Unable to run review");
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, []);

  // On load: pull the auto-selected demo case, then run it once.
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
        /* non-fatal — user can still run manually once a parcel is chosen */
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

  const activeScenarioKey = result ? scenarioKeyFor(result.evidence.scenario) : null;

  return (
    <div className="portal-grid min-h-screen">
      {/* Header */}
      <header className="no-print sticky top-0 z-20 border-b border-portal-line bg-portal-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-portal-ink text-lg font-bold text-white shadow-sm">
              ت
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-portal-ink">
                Tanseeq <span className="font-normal text-portal-muted">تنسيق</span>
              </h1>
              <p className="text-[12px] text-portal-muted">AI Development Conditions Briefing Officer</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill dot="bg-teal" className="border-teal/30 bg-teal/10 text-[var(--teal)]">
              System online
            </Pill>
            <Pill className="border-portal-line bg-white text-portal-muted">Track 4 · Decision Intelligence</Pill>
            <Pill dot="bg-gold" className="border-gold/30 bg-gold/10 text-[#9a7a2e]">
              Human review required
            </Pill>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-7">
        {/* Problem / product intro */}
        <section className="mb-7">
          <h2 className="max-w-4xl text-2xl font-bold leading-tight text-portal-ink sm:text-3xl">
            Tanseeq coordinates land, capital, market, community and mobility signals into one
            conditions brief for human review.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-portal-muted">
            Abu Dhabi is growing fast, and every new development adds pressure on the surrounding
            community. A parcel can look ready because the land is vacant, the market is active and
            investors are interested — but if nearby services, amenities and mobility access are not
            ready, the project may create future pressure for residents and operators. These signals
            are usually reviewed separately. Tanseeq connects them into one coordinated review so a
            human committee can see whether a proposal should be{" "}
            <span className="font-medium text-portal-ink">supported as submitted, supported with conditions,
            re-scoped, or held for more evidence.</span>
          </p>
          <p className="mt-3 inline-block rounded-lg border border-portal-line bg-white px-3 py-1.5 text-[11px] text-portal-muted">
            Challenge sample datasets are synthetic and used for prototype scoring. OSM amenities are
            real OpenStreetMap data © OpenStreetMap contributors.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Case intake (portal) */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[84px]">
              <CaseIntake
                value={scenario}
                onChange={setScenario}
                demoParcel={demoParcel}
                vacantParcels={vacantParcels}
                onRun={() => runReview(scenario, true)}
                loading={loading}
              />
              {error && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
              )}
            </div>
          </div>

          {/* Decision room (dark) */}
          <div ref={roomRef} className="lg:col-span-8">
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
              <div className="room-grid grid h-96 place-items-center rounded-3xl border border-room-line text-sm text-room-muted">
                {loading ? "Coordinating signals…" : "Run a Tanseeq review to open the decision room."}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="no-print border-t border-portal-line py-6 text-center text-xs text-portal-muted">
        Tanseeq / تنسيق — a Decision Intelligence prototype. Determinations are advisory and support,
        but do not replace, a human review committee.
      </footer>
    </div>
  );
}

function Pill({
  children,
  className,
  dot,
}: {
  children: React.ReactNode;
  className: string;
  dot?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}
