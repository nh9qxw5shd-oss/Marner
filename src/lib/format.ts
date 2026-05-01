export function fmtGBP(n: number, opts: { decimals?: number } = {}): string {
  if (!isFinite(n)) return '£—';
  const { decimals = 0 } = opts;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtPct(n: number, dp = 1): string {
  return `${(n * 100).toFixed(dp)}%`;
}
