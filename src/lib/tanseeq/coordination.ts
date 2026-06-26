import { getRegulation } from "./regulations";
import { runReview } from "./engine";
import { fmtArea, fmtNumber, fmtPct, fmtRatio } from "./format";
import {
  CHECK_SEVERITY,
  LAND_USE_LABELS,
  SERVICE_STATUS_LABELS,
  type CheckStatus,
  type CoordinationFile,
  type DevelopmentProposal,
} from "./types";

export const OFFICER_NAME = "Tanseeq — AI Development Conditions Officer";

function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildReference(proposal: DevelopmentProposal, issuedAt: Date): string {
  const year = issuedAt.getUTCFullYear();
  const seed = hashCode(`${proposal.projectName}|${proposal.parcelId}|${proposal.zoneCode}`);
  const serial = (seed % 9000) + 1000; // 4 digits
  return `TNSQ-${year}-${serial}`;
}

export interface BuildOptions {
  issuedAt?: Date;
  reference?: string;
}

export function buildCoordinationFile(
  proposal: DevelopmentProposal,
  options: BuildOptions = {},
): CoordinationFile {
  const issuedAt = options.issuedAt ?? new Date();
  const zone = getRegulation(proposal.zoneCode);
  const review = runReview(proposal);
  return {
    reference: options.reference ?? buildReference(proposal, issuedAt),
    issuedAt: issuedAt.toISOString(),
    officer: OFFICER_NAME,
    proposal,
    zone,
    review,
  };
}

const STATUS_MARK: Record<CheckStatus, string> = {
  pass: "PASS",
  advisory: "NOTE",
  condition: "COND",
  major: "MAJOR",
  blocker: "BLOCK",
};

export function renderMarkdown(file: CoordinationFile): string {
  const { proposal: p, zone, review: r } = file;
  const issued = new Date(file.issuedAt);
  const lines: string[] = [];

  lines.push(`# Development Coordination File`);
  lines.push("");
  lines.push(`**Reference:** ${file.reference}  `);
  lines.push(`**Issued:** ${issued.toUTCString()}  `);
  lines.push(`**Officer:** ${file.officer}`);
  lines.push("");
  lines.push(`## Determination: ${r.verdict.toUpperCase()}`);
  lines.push("");
  lines.push(`> ${r.headline}`);
  lines.push("");
  lines.push(`**Compliance score:** ${r.complianceScore}/100`);
  lines.push("");

  lines.push(`## 1. Proposal`);
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Project | ${p.projectName || "—"} |`);
  lines.push(`| Applicant | ${p.applicant || "—"} |`);
  lines.push(`| Parcel | ${p.parcelId || "—"} |`);
  lines.push(`| Locality | ${p.locality || "—"} |`);
  lines.push(`| Zone | ${zone.name} |`);
  lines.push(`| Proposed use | ${LAND_USE_LABELS[p.proposedUse]} |`);
  lines.push(`| Plot area | ${fmtArea(p.plotAreaSqm)} |`);
  lines.push(`| Gross floor area | ${fmtArea(p.grossFloorAreaSqm)} |`);
  lines.push(`| Plot ratio (FAR) | ${fmtRatio(r.metrics.plotRatio)} (max ${fmtRatio(zone.maxPlotRatio)}) |`);
  lines.push(`| Site coverage | ${fmtPct(r.metrics.siteCoverPct)} (max ${fmtPct(zone.maxSiteCoverPct, 0)}) |`);
  lines.push(`| Height | ${fmtNumber(p.buildingHeightM)} m / ${p.storeys} storeys (max ${zone.maxHeightM} m / ${zone.maxStoreys}) |`);
  if (p.dwellingUnits > 0) {
    lines.push(`| Dwelling units | ${fmtNumber(p.dwellingUnits)} (${fmtNumber(r.metrics.densityUnitsPerHa, 1)} units/ha) |`);
  }
  lines.push(`| Parking | ${fmtNumber(r.metrics.parkingProvided)} provided / ${fmtNumber(r.metrics.parkingRequired)} required |`);
  lines.push(`| Landscaping | ${fmtPct(r.metrics.landscapePct)} (min ${fmtPct(zone.minLandscapePct, 0)}) |`);
  lines.push(`| Utilities | W:${SERVICE_STATUS_LABELS[p.utilities.water]} · S:${SERVICE_STATUS_LABELS[p.utilities.sewer]} · P:${SERVICE_STATUS_LABELS[p.utilities.power]} · SW:${SERVICE_STATUS_LABELS[p.utilities.stormwater]} |`);
  lines.push("");

  lines.push(`## 2. Assessment`);
  lines.push("");
  lines.push(`| # | Check | Category | Result | Requirement | Observed |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  r.checks
    .slice()
    .sort((a, b) => CHECK_SEVERITY[b.status] - CHECK_SEVERITY[a.status])
    .forEach((c, i) => {
      lines.push(
        `| ${i + 1} | ${c.title} | ${c.category} | ${STATUS_MARK[c.status]} | ${c.requirement} | ${c.observed} |`,
      );
    });
  lines.push("");

  if (r.holdReasons.length > 0) {
    lines.push(`## 3. Reasons for Hold`);
    lines.push("");
    r.holdReasons.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    lines.push("");
  }

  if (r.rescopeDirectives.length > 0) {
    lines.push(`## ${r.holdReasons.length > 0 ? 4 : 3}. Re-scope Directives`);
    lines.push("");
    r.rescopeDirectives.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
    lines.push("");
  }

  if (r.conditions.length > 0) {
    lines.push(`## Schedule of Conditions`);
    lines.push("");
    r.conditions.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push("");
  }

  lines.push(`## Officer's Assessment`);
  lines.push("");
  r.narrative.forEach((para) => {
    lines.push(para);
    lines.push("");
  });

  lines.push(`## Coordination Routing`);
  lines.push("");
  r.routing.forEach((dept) => lines.push(`- ${dept}`));
  lines.push("");

  lines.push(`## Validity`);
  lines.push("");
  lines.push(r.validityNote);
  lines.push("");
  lines.push(`---`);
  lines.push(`_Generated by ${file.officer}. This coordination file is advisory and supports — but does not replace — statutory development consent._`);

  return lines.join("\n");
}
