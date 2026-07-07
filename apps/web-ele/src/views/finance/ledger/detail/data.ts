export type LedgerRowType = 'opening' | 'entry' | 'sumMonth' | 'sumYear';

export type LedgerColumn = {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
};

export const LEDGER_COLUMNS: LedgerColumn[] = [
  { key: 'date', title: '日期', width: 110, align: 'left' },
  { key: 'voucherNo', title: '凭证字号', width: 90, align: 'left' },
  { key: 'subject', title: '科目', width: 200, align: 'left' },
  { key: 'summary', title: '摘要', width: 260, align: 'left' },
  { key: 'debit', title: '借方', width: 120, align: 'right' },
  { key: 'credit', title: '贷方', width: 120, align: 'right' },
  { key: 'directionText', title: '方向', width: 80, align: 'center' },
  { key: 'balanceAbs', title: '余额', width: 140, align: 'right' },
];

export function toMoney(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function monthLabel(v: string) {
  const [y, m] = String(v || '').split('-');
  if (!y || !m) return '';
  return `${y}年${Number(m)}月`;
}

export function monthRangeISO(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0);
  const end = new Date(y!, m!, 0, 23, 59, 59);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function monthPeriodRangeISO(periodStart: string, periodEnd: string) {
  const normalizedStart = String(periodStart || '').trim();
  const normalizedEnd = String(periodEnd || '').trim();
  const startMonth = normalizedStart || normalizedEnd;
  const endMonth = normalizedEnd || normalizedStart;
  if (!startMonth || !endMonth) {
    return { startISO: '', endISO: '' };
  }

  const startRange = monthRangeISO(startMonth);
  const endRange = monthRangeISO(endMonth);
  return {
    startISO: startRange.startISO,
    endISO: endRange.endISO,
  };
}

export function monthEndDate(month: string) {
  const [y, m] = String(month || '').split('-').map(Number);
  if (!y || !m) return '';
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function getSubjectLevel(subjectNumber: string) {
  const code = String(subjectNumber || '').trim();
  if (!code) return 0;
  if (code.length <= 4) return 1;
  return Math.floor((code.length - 4) / 2) + 1;
}
