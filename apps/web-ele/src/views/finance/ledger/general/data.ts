export type GeneralLedgerColumn = {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
  minWidth?: number;
};

export const GENERAL_LEDGER_COLUMNS: GeneralLedgerColumn[] = [
  { key: 'subjectCode', title: '科目编码', width: 110, align: 'left' },
  { key: 'subjectName', title: '科目名称', minWidth: 140, align: 'left' },
  { key: 'dateLabel', title: '日期', width: 130, align: 'left' },
  { key: 'period', title: '期间', width: 100, align: 'left' },
  { key: 'debit', title: '借方金额', width: 120, align: 'right' },
  { key: 'credit', title: '贷方金额', width: 120, align: 'right' },
  { key: 'directionText', title: '方向', width: 60, align: 'center' },
  { key: 'balanceAbs', title: '余额', width: 130, align: 'right' },
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
