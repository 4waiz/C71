"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProposalForm from "@/components/ProposalForm";
import CoordinationView from "@/components/CoordinationView";
import { VERDICT_STYLE } from "@/components/styles";
import { PRESETS, blankProposal } from "@/lib/tanseeq/presets";
import { renderMarkdown } from "@/lib/tanseeq/coordination";
import type { CoordinationFile, DevelopmentProposal, Verdict } from "@/lib/tanseeq/types";

const VERDICTS: Verdict[] = ["Proceed", "Approve with Conditions", "Re-scope", "Hold"];

export default function Home() {
  const [proposal, setProposal] = useState<DevelopmentProposal>(PRESETS[0].proposal);
  const [activePreset, setActivePreset] = useState<string | null>(PRESETS[0].id);
  const [file, setFile] = useState<CoordinationFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const reviewProposal = useCallback(async (p: DevelopmentProposal): Promise<CoordinationFile> => {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) throw new Error(`Review service returned ${res.status}`);
    return (await res.json()) as CoordinationFile;
  }, []);

  const generate = useCallback(
    async (p: DevelopmentProposal, scrollIntoView = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await reviewProposal(p);
        setFile(data);
        if (scrollIntoView && outputRef.current) {
          outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to generate coordination file");
      } finally {
        setLoading(false);
      }
    },
    [reviewProposal],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await reviewProposal(PRESETS[0].proposal);
        if (!cancelled) setFile(data);
      } catch {
        /* initial load failure is non-fatal; user can retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewProposal]);

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setProposal(preset.proposal);
    void generate(preset.proposal);
  };

  const onFormChange = (next: DevelopmentProposal) => {
    setProposal(next);
    setActivePreset(null);
  };

  const handleReset = () => {
    setProposal(blankProposal);
    setActivePreset(null);
    setFile(null);
  };

  const handleDownload = () => {
    if (!file) return;
    const md = renderMarkdown(file);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.reference}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-backdrop min-h-screen">
      {/* Header */}
      <header className="no-print sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white shadow-sm"
              style={{ background: "var(--brand)" }}
            >
              T
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-800">
                Tanseeq <span className="font-normal text-slate-400">تنسيق</span>
              </h1>
              <p className="text-xs text-slate-500">AI Development Conditions Officer</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {VERDICTS.map((v) => (
              <span
                key={v}
                className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${VERDICT_STYLE[v].chip}`}
              >
                <span className={`h-2 w-2 rounded-full ${VERDICT_STYLE[v].dot}`} />
                {v}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        {/* Scenario presets */}
        <section className="no-print mb-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Demonstration scenarios
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PRESETS.map((preset) => {
              const active = activePreset === preset.id;
              const vs = VERDICT_STYLE[preset.expectedVerdict];
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`group rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-500 bg-white shadow-md ring-2 ring-cyan-500/20"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{preset.label}</span>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${vs.dot}`} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">
                    {preset.blurb}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-slate-400">
                    Expected: {preset.expectedVerdict}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <div className="no-print lg:col-span-2">
            <div className="lg:sticky lg:top-[76px]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-slate-700">Development proposal</h2>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                  >
                    Clear
                  </button>
                </div>
                <div className="tnsq-scroll max-h-[calc(100vh-230px)] overflow-y-auto px-5 py-4">
                  <ProposalForm value={proposal} onChange={onFormChange} />
                </div>
                <div className="border-t border-slate-100 p-4">
                  <button
                    type="button"
                    onClick={() => generate(proposal, true)}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "var(--brand)" }}
                  >
                    {loading ? (
                      <>
                        <Spinner /> Reviewing proposal…
                      </>
                    ) : (
                      <>Generate coordination file</>
                    )}
                  </button>
                  {error ? (
                    <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Output panel */}
          <div ref={outputRef} className="lg:col-span-3">
            <div className="no-print mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Coordination file</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!file}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Download .md
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!file}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Print / PDF
                </button>
              </div>
            </div>

            {file ? (
              <CoordinationView file={file} />
            ) : (
              <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 text-sm text-slate-400">
                {loading ? "Reviewing proposal…" : "Generate a coordination file to see the determination."}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="no-print border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        Tanseeq is a knowledge-based planning assistant. Determinations are advisory and support —
        but do not replace — statutory development consent.
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
