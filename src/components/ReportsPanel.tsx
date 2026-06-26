"use client";

import type { ReviewResult } from "@/lib/tanseeq/types";

interface Props {
  result: ReviewResult | null;
  onDownloadMarkdown: () => void;
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
  onPrint: () => void;
}

export default function ReportsPanel({
  result,
  onDownloadMarkdown,
  onDownloadJson,
  onDownloadCsv,
  onPrint,
}: Props) {
  const ready = !!result;

  return (
    <div className="no-print tamm-card mt-5 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-soft text-teal-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-ink">Reports &amp; export</h3>
          <p className="text-[11px] text-muted">Download the brief · تنزيل الموجز</p>
        </div>
      </div>

      {ready ? (
        <p className="mt-3 rounded-lg border border-line bg-surface-soft px-3 py-2 text-[11px] text-muted">
          Case file <span className="font-mono font-semibold text-ink">{result!.evidence.caseFileId}</span> ·{" "}
          <span className="font-medium text-ink">{result!.brief.decisionLabel}</span>
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-line bg-surface-soft px-3 py-2 text-[11px] text-muted">
          Run a review to enable downloads.
        </p>
      )}

      <div className="mt-3 space-y-2">
        <ReportBtn
          disabled={!ready}
          onClick={onDownloadMarkdown}
          label="Conditions brief"
          ext=".md"
          hint="Full committee-style brief"
        />
        <ReportBtn
          disabled={!ready}
          onClick={onDownloadCsv}
          label="Coordination checks"
          ext=".csv"
          hint="Five checks + scores for spreadsheets"
        />
        <ReportBtn
          disabled={!ready}
          onClick={onDownloadJson}
          label="Evidence packet"
          ext=".json"
          hint="Audit trail — every signal used"
        />
        <ReportBtn
          disabled={!ready}
          onClick={onPrint}
          label="Print / save as PDF"
          ext=""
          hint="Opens the print dialog"
        />
      </div>

      <p className="mt-3 text-[10px] leading-snug text-muted">
        Outputs are advisory and support — but do not replace — a human review committee.
      </p>
    </div>
  );
}

function ReportBtn({
  label,
  ext,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  ext: string;
  hint: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition enabled:hover:border-teal/40 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>
        <span className="block text-[13px] font-semibold text-ink">
          {label}
          {ext && <span className="ml-1 font-mono text-[11px] text-muted">{ext}</span>}
        </span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      <span className="text-muted transition group-enabled:group-hover:text-teal-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
