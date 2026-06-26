export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function fmtNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function fmtArea(sqm: number): string {
  return `${fmtNumber(sqm)} m²`;
}

export function fmtPct(value: number, decimals = 1): string {
  return `${fmtNumber(value, decimals)}%`;
}

export function fmtRatio(value: number): string {
  return value.toFixed(2);
}
