"use client";

import { useId } from "react";
import {
  LAND_USE_LABELS,
  SERVICE_STATUS_LABELS,
  type DevelopmentProposal,
  type LandUse,
  type ServiceStatus,
  type UtilityServices,
  type ZoneCode,
} from "@/lib/tanseeq/types";
import { ZONE_OPTIONS, ZONE_REGULATIONS } from "@/lib/tanseeq/regulations";
import { deriveMetrics } from "@/lib/tanseeq/engine";
import { fmtPct, fmtRatio } from "@/lib/tanseeq/format";

const LAND_USE_OPTIONS = Object.keys(LAND_USE_LABELS) as LandUse[];
const SERVICE_OPTIONS = Object.keys(SERVICE_STATUS_LABELS) as ServiceStatus[];

export default function ProposalForm({
  value,
  onChange,
}: {
  value: DevelopmentProposal;
  onChange: (next: DevelopmentProposal) => void;
}) {
  const set = <K extends keyof DevelopmentProposal>(key: K, v: DevelopmentProposal[K]) =>
    onChange({ ...value, [key]: v });

  const setUtility = (key: keyof UtilityServices, v: ServiceStatus) =>
    onChange({ ...value, utilities: { ...value.utilities, [key]: v } });

  const setConstraint = (key: keyof DevelopmentProposal["siteConstraints"], v: boolean) =>
    onChange({ ...value, siteConstraints: { ...value.siteConstraints, [key]: v } });

  const reg = ZONE_REGULATIONS[value.zoneCode];
  const metrics = deriveMetrics(value, reg);

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Fieldset legend="Project identity">
        <TextField label="Project name" value={value.projectName} onChange={(v) => set("projectName", v)} placeholder="e.g. Al Noor Residences" />
        <TextField label="Applicant" value={value.applicant} onChange={(v) => set("applicant", v)} placeholder="Developer / owner" />
        <TextField label="Parcel ID" value={value.parcelId} onChange={(v) => set("parcelId", v)} placeholder="e.g. PLT-2207-R2" />
        <TextField label="Locality" value={value.locality} onChange={(v) => set("locality", v)} placeholder="District / area" />
      </Fieldset>

      <Fieldset legend="Planning context">
        <SelectField
          label="Zone"
          value={value.zoneCode}
          onChange={(v) => set("zoneCode", v as ZoneCode)}
          options={ZONE_OPTIONS.map((z) => ({ value: z, label: ZONE_REGULATIONS[z].name }))}
        />
        <SelectField
          label="Proposed use"
          value={value.proposedUse}
          onChange={(v) => set("proposedUse", v as LandUse)}
          options={LAND_USE_OPTIONS.map((u) => ({ value: u, label: LAND_USE_LABELS[u] }))}
        />
        <p className="col-span-2 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-600">{reg.code} limits:</span> FAR ≤ {fmtRatio(reg.maxPlotRatio)} · height ≤ {reg.maxHeightM} m / {reg.maxStoreys} st · coverage ≤ {fmtPct(reg.maxSiteCoverPct, 0)} · landscaping ≥ {fmtPct(reg.minLandscapePct, 0)}
        </p>
      </Fieldset>

      <Fieldset legend="Built form">
        <NumberField label="Plot area" unit="m²" value={value.plotAreaSqm} onChange={(v) => set("plotAreaSqm", v)} />
        <NumberField label="Gross floor area" unit="m²" value={value.grossFloorAreaSqm} onChange={(v) => set("grossFloorAreaSqm", v)} />
        <NumberField label="Building footprint" unit="m²" value={value.buildingFootprintSqm} onChange={(v) => set("buildingFootprintSqm", v)} />
        <NumberField label="Landscaped area" unit="m²" value={value.landscapeAreaSqm} onChange={(v) => set("landscapeAreaSqm", v)} />
        <NumberField label="Building height" unit="m" value={value.buildingHeightM} onChange={(v) => set("buildingHeightM", v)} />
        <NumberField label="Storeys" value={value.storeys} onChange={(v) => set("storeys", v)} />
        <NumberField label="Dwelling units" value={value.dwellingUnits} onChange={(v) => set("dwellingUnits", v)} />
        <NumberField label="Parking spaces" value={value.parkingSpaces} onChange={(v) => set("parkingSpaces", v)} />
      </Fieldset>

      <Fieldset legend="Setbacks & sustainability">
        <NumberField label="Front setback" unit="m" value={value.frontSetbackM} onChange={(v) => set("frontSetbackM", v)} />
        <NumberField label="Side setback" unit="m" value={value.sideSetbackM} onChange={(v) => set("sideSetbackM", v)} />
        <NumberField label="Rear setback" unit="m" value={value.rearSetbackM} onChange={(v) => set("rearSetbackM", v)} />
        <NumberField label="Green rating" unit="★" value={value.greenRating} onChange={(v) => set("greenRating", v)} max={5} />
      </Fieldset>

      <Fieldset legend="Servicing & access">
        {(["water", "sewer", "power", "stormwater"] as (keyof UtilityServices)[]).map((k) => (
          <SelectField
            key={k}
            label={k.charAt(0).toUpperCase() + k.slice(1)}
            value={value.utilities[k]}
            onChange={(v) => setUtility(k, v as ServiceStatus)}
            options={SERVICE_OPTIONS.map((s) => ({ value: s, label: SERVICE_STATUS_LABELS[s] }))}
          />
        ))}
        <label className="col-span-2 flex items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.hasLegalAccess}
            onChange={(e) => set("hasLegalAccess", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
          />
          Legal vehicular &amp; pedestrian access to a public road
        </label>
      </Fieldset>

      <Fieldset legend="Site constraints">
        <CheckboxField label="Flood-prone land" checked={value.siteConstraints.floodZone} onChange={(v) => setConstraint("floodZone", v)} />
        <CheckboxField label="Heritage overlay" checked={value.siteConstraints.heritageOverlay} onChange={(v) => setConstraint("heritageOverlay", v)} />
        <CheckboxField label="Contamination risk" checked={value.siteConstraints.contaminationRisk} onChange={(v) => setConstraint("contaminationRisk", v)} />
      </Fieldset>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
        <LivePreview label="Plot ratio" value={fmtRatio(metrics.plotRatio)} ok={metrics.plotRatio <= reg.maxPlotRatio} />
        <LivePreview label="Coverage" value={fmtPct(metrics.siteCoverPct)} ok={metrics.siteCoverPct <= reg.maxSiteCoverPct} />
        <LivePreview label="Parking" value={`${metrics.parkingProvided}/${metrics.parkingRequired}`} ok={metrics.parkingProvided >= metrics.parkingRequired} />
      </div>
    </form>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {legend}
      </legend>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </fieldset>
  );
}

function fieldLabelCls() {
  return "mb-1 block text-xs font-medium text-slate-600";
}
function inputCls() {
  return "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20";
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={fieldLabelCls()}>
        {label}
      </label>
      <input id={id} className={inputCls()} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  max?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={fieldLabelCls()}>
        {label} {unit ? <span className="text-slate-400">({unit})</span> : null}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={max}
        inputMode="decimal"
        className={inputCls()}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={fieldLabelCls()}>
        {label}
      </label>
      <select id={id} className={inputCls()} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
      />
      {label}
    </label>
  );
}

function LivePreview({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${ok ? "text-emerald-600" : "text-orange-600"}`}>{value}</p>
    </div>
  );
}
