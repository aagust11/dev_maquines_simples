export const formatNumber = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('ca-ES', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: Math.min(1, decimals)
  });
};
