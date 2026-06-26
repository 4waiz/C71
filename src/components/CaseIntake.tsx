"use client";

import type { Parcel, ScenarioSettings } from "@/lib/tanseeq/types";

interface VacantParcel {
  parcel_id: string;
  district: string;
  development_potential_score: number;
  recommended_use: string;
}

interface Props {
  value: ScenarioSettings;
  onChange: (next: ScenarioSettings) => void;
  demoParcel: Parcel | null;
  vacantParcels: VacantParcel[];
  onRun: () => void;
  loading: boolean;
}

export default function CaseIntake({ value, onChange, demoParcel, vacantParcels, onRun, loading }: Props) {
  const set = <K extends keyof ScenarioSettings>(key: K, v: ScenarioSettings[K]) =>
    onChange({ ...value, [key]: v });

  const selected =
    vacantParcels.find((p) => p.parcel_id === value.parcelId) ??
    (demoParcel
      ? {
          parcel_id: demoParcel.parcel_id,
          district: demoParcel.district,
          development_potential_score: demoParcel.development_potential_score,
          recommended_use: demoParcel.recommended_use,
        }
      : null);

  return (
    <div className="tamm-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface-soft/60 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Case Intake · طلب المراجعة</h2>
          <p className="text-xs text-muted">Government-service review request · auto-selected demo case</p>
        </div>
        <span className="tag bg-teal-soft text-teal-ink">Auto-selected</span>
      </div>

      <div className="space-y-5 px-6 py-5">
        <Field label="Demo parcel" hint="Vacant · high development potential">
          <select className="form-input" value={value.parcelId} onChange={(e) => set("parcelId", e.target.value)}>
            {selected && !vacantParcels.some((p) => p.parcel_id === selected.parcel_id) && (
              <option value={selected.parcel_id}>
                {selected.parcel_id} — {selected.district} (potential {selected.development_potential_score})
              </option>
            )}
            {vacantParcels.map((p) => (
              <option key={p.parcel_id} value={p.parcel_id}>
                {p.parcel_id} — {p.district} (potential {p.development_potential_score})
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <ReadOnly label="District" value={selected?.district ?? "—"} />
          <ReadOnly label="Parcel ID" value={value.parcelId} mono />
          <ReadOnly label="Current status" value="vacant" />
          <ReadOnly label="Recommended use" value={(selected?.recommended_use ?? "—").replace(/_/g, " ")} />
        </div>

        <Field label="Proposed land use">
          <select className="form-input" value={value.proposedUse} onChange={(e) => set("proposedUse", e.target.value as ScenarioSettings["proposedUse"])}>
            <option value="residential">Residential</option>
            <option value="mixed_use">Mixed-use</option>
            <option value="retail_commercial">Retail / commercial</option>
            <option value="community_facility">Community facility</option>
            <option value="hospitality">Hospitality</option>
          </select>
        </Field>

        <Slider label="Residential units" value={value.residentialUnits} min={0} max={1200} step={20} onChange={(v) => set("residentialUnits", v)} />
        <Slider label="Retail share" suffix="%" value={value.retailSharePct} min={0} max={100} step={5} onChange={(v) => set("retailSharePct", v)} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Community facility">
            <select className="form-input" value={value.communityFacility} onChange={(e) => set("communityFacility", e.target.value as ScenarioSettings["communityFacility"])}>
              <option value="none">None</option>
              <option value="clinic">Clinic</option>
              <option value="school">School</option>
              <option value="park">Park</option>
              <option value="grocery">Grocery</option>
            </select>
          </Field>
          <Field label="Mobility condition">
            <select className="form-input" value={value.mobilityCondition} onChange={(e) => set("mobilityCondition", e.target.value as ScenarioSettings["mobilityCondition"])}>
              <option value="none">None</option>
              <option value="shuttle">Shuttle</option>
              <option value="bus_stop">Bus stop</option>
              <option value="shaded_walkway">Shaded walkway</option>
            </select>
          </Field>
        </div>

        <Field label="Decision priority">
          <div className="grid grid-cols-3 gap-2">
            {(["roi", "balanced", "community"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("priority", p)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition ${
                  value.priority === p
                    ? "border-teal bg-teal-soft text-teal-ink"
                    : "border-line bg-surface text-muted hover:border-muted/40"
                }`}
              >
                {p === "roi" ? "ROI" : p}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner /> Running Tanseeq Review…
            </>
          ) : (
            <>Run Tanseeq Review →</>
          )}
        </button>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--line);
          background: #fff;
          padding: 0.55rem 0.75rem;
          font-size: 0.85rem;
          color: var(--ink);
          outline: none;
        }
        .form-input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(15,166,151,0.13); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">{label}</span>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface-soft px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`truncate text-sm font-medium capitalize text-ink ${mono ? "font-mono normal-case" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">{label}</span>
        <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-[var(--teal)]"
      />
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
