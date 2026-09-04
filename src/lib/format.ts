export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatQuantity(n: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(n);
}

// Truncates rather than rounds, so a sum that's a hair under/over 100% from
// floating-point arithmetic shows the real value (e.g. "99.999") instead of
// being rounded up into a falsely clean "100.000".
export function formatPercentTruncated(n: number, decimals = 3): string {
  const factor = 10 ** decimals;
  const truncated = Math.trunc(n * factor) / factor;
  return truncated.toFixed(decimals);
}
