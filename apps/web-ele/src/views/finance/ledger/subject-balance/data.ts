export function toMoney(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n * 100) / 100;
  if (Object.is(rounded, -0) || rounded === 0) return '';
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function monthLabel(v: string) {
  const [y, m] = String(v || '').split('-');
  if (!y || !m) return '';
  return `${y}年${Number(m)}月`;
}
