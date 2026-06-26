// Small dependency-free CSV parser. The challenge datasets are well-formed
// (no embedded newlines, simple quoting), so a compact RFC-4180-ish parser is
// enough and keeps the app deployable without extra packages.

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitRows(text.trim());
  if (rows.length === 0) return [];
  const header = splitLine(rows[0]);
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const line = rows[i];
    if (line.length === 0) continue;
    const cells = splitLine(line);
    const record: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      record[header[c]] = (cells[c] ?? "").trim();
    }
    out.push(record);
  }
  return out;
}

// Split into physical rows, honouring quoted fields that might contain commas
// but (per these datasets) not newlines.
function splitRows(text: string): string[] {
  return text.split(/\r?\n/);
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export function num(value: string | undefined): number {
  if (value == null || value === "") return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function bool(value: string | undefined): boolean {
  return value === "true" || value === "True" || value === "1";
}
