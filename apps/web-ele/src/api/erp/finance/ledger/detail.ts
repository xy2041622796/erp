import { getSubjectOpeningList, type BilSubjectOpeningApi } from '#/api/erp/finance/settings/initial';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { getVoucherDetails, getVoucherPage } from '#/api/erp/finance/voucher';
import type { ErpVoucherApi } from '#/api/erp/finance/voucher';
import { moneyNumber, toDecimal } from '#/utils/finance/decimal-money';

export type LedgerSubject = {
  rowid?: string;
  subject_number?: string;
  subject_name?: string;
  is_leaf_subject?: number | string;
  balance_direction?: number | string; // 1借 2贷
  __hasOwnEntries?: number;
};

export type LedgerEntry = {
  voucherId?: string;
  detailId?: string;
  sortNo?: number;
  date: string;
  voucherNo: string;
  subject: string;
  summary: string;
  debit: number;
  credit: number;
};

export type LedgerSubjectOpening = BilSubjectOpeningApi.SubjectOpening;

function formatDate(d: any): string {
  if (!d) return '';
  const t = typeof d === 'string' ? d : (d as Date).toISOString();
  return t.slice(0, 10);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

async function fetchVoucherMainsAndDetails(params: { startISO: string; endISO: string }) {
  const page = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [params.startISO, params.endISO],
  } as any);

  const mains = (page.list || []) as ErpVoucherApi.VoucherMain[];
  const detailList = await Promise.all(
    mains.map((m) => getVoucherDetails(String(m.rowid ?? ''))),
  );

  return { mains, detailList };
}

export async function fetchLedgerSubjects(params?: {
  keyword?: string;
  subject_type?: string | number;
  subject_state?: string | number;
  account_id?: string;
}) {
  const res = await getAllSubjectList({
    pageNo: 1,
    page: 0,
    keyword: params?.keyword,
    subject_type: params?.subject_type,
    subject_state: params?.subject_state,
    account_id: params?.account_id,
    lingma_sys_is_delete: 0,
  } as any);

  return (res?.list || []) as LedgerSubject[];
}

export async function fetchLedgerSubjectOpenings(params?: {
  account_id?: string;
  account_set_id?: string;
  keyword?: string;
}) {
  const res = await getSubjectOpeningList({
    pageNo: 1,
    page: 0,
    account_id: params?.account_id,
    account_set_id: params?.account_set_id,
    keyword: params?.keyword,
    lingma_sys_is_delete: 0,
  });

  return (res?.list || []) as LedgerSubjectOpening[];
}

export async function fetchLedgerSubjectNumbersWithEntries(params: {
  startISO: string;
  endISO: string;
}) {
  const { detailList } = await fetchVoucherMainsAndDetails(params);
  const subjectNumbers = new Set<string>();

  detailList.forEach((details) => {
    (details || []).forEach((d: any) => {
      const code = String(d.account_code ?? '').trim();
      const debit = moneyNumber(d.debit_amount ?? 0);
      const credit = moneyNumber(d.credit_amount ?? 0);
      if (!code) return;
      if (toDecimal(debit).isZero() && toDecimal(credit).isZero()) return;
      subjectNumbers.add(code);
    });
  });

  return subjectNumbers;
}

export async function fetchLedgerEntries(params: {
  subjectNumber: string;
  startISO: string;
  endISO: string;
  includeChildren?: boolean;
}) {
  const subjectNumber = String(params.subjectNumber || '').trim();
  if (!subjectNumber) return [] as LedgerEntry[];

  const { mains, detailList } = await fetchVoucherMainsAndDetails({
    startISO: params.startISO,
    endISO: params.endISO,
  });

  const out: LedgerEntry[] = [];

  mains.forEach((m, idx) => {
    const voucherId = String(m.rowid ?? '').trim();
    const date = formatDate(pickNonEmptyText(m.voucher_date, m.createtime, m.updatetime));
    const voucherNo = pickNonEmptyText(m.voucher_code, m.ReportID, m.business_code);
    const details = detailList[idx] || [];

    details.forEach((d: any) => {
      const code = String(d.account_code ?? '').trim();
      const matched = params.includeChildren
        ? code === subjectNumber || code.startsWith(subjectNumber)
        : code === subjectNumber;
      if (!matched) return;

      out.push({
        voucherId,
        detailId: pickNonEmptyText(d.rowid, d.row_id),
        sortNo: Number.isFinite(Number(d.sort_no)) ? Number(d.sort_no) : undefined,
        date,
        voucherNo,
        subject: [code, String(d.account_name ?? '').trim()].filter(Boolean).join(' '),
        summary: String(d.abstract_content ?? ''),
        debit: Number(d.debit_amount ?? 0) || 0,
        credit: Number(d.credit_amount ?? 0) || 0,
      });
    });
  });

  out.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    const voucherCompare = String(a.voucherNo).localeCompare(String(b.voucherNo));
    if (voucherCompare !== 0) return voucherCompare;
    const sortA = Number(a.sortNo);
    const sortB = Number(b.sortNo);
    const hasSortA = Number.isFinite(sortA);
    const hasSortB = Number.isFinite(sortB);
    if (hasSortA && hasSortB && sortA !== sortB) return sortA - sortB;
    if (hasSortA !== hasSortB) return hasSortA ? -1 : 1;
    return String(a.detailId || '').localeCompare(String(b.detailId || ''));
  });

  return out;
}


export async function fetchLedgerEntriesForSubjects(params: {
  subjectNumbers: string[];
  startISO: string;
  endISO: string;
  includeChildren?: boolean;
}) {
  const subjectNumbers = Array.from(
    new Set((params.subjectNumbers || []).map((item) => String(item || '').trim()).filter(Boolean)),
  );
  const out: Record<string, LedgerEntry[]> = {};
  subjectNumbers.forEach((subjectNumber) => {
    out[subjectNumber] = [];
  });
  if (subjectNumbers.length === 0) return out;

  const { mains, detailList } = await fetchVoucherMainsAndDetails({
    startISO: params.startISO,
    endISO: params.endISO,
  });

  mains.forEach((m, idx) => {
    const voucherId = String(m.rowid ?? '').trim();
    const date = formatDate(pickNonEmptyText(m.voucher_date, m.createtime, m.updatetime));
    const voucherNo = pickNonEmptyText(m.voucher_code, m.ReportID, m.business_code);
    const details = detailList[idx] || [];

    details.forEach((d: any) => {
      const code = String(d.account_code ?? '').trim();
      if (!code) return;

      for (const subjectNumber of subjectNumbers) {
        const matched = params.includeChildren
          ? code === subjectNumber || code.startsWith(subjectNumber)
          : code === subjectNumber;
        if (!matched) continue;

        out[subjectNumber]!.push({
          voucherId,
          detailId: pickNonEmptyText(d.rowid, d.row_id),
          sortNo: Number.isFinite(Number(d.sort_no)) ? Number(d.sort_no) : undefined,
          date,
          voucherNo,
          subject: [code, String(d.account_name ?? '').trim()].filter(Boolean).join(' '),
          summary: String(d.abstract_content ?? ''),
          debit: Number(d.debit_amount ?? 0) || 0,
          credit: Number(d.credit_amount ?? 0) || 0,
        });
      }
    });
  });

  Object.keys(out).forEach((subjectNumber) => {
    out[subjectNumber]!.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      const voucherCompare = String(a.voucherNo).localeCompare(String(b.voucherNo));
      if (voucherCompare !== 0) return voucherCompare;
      const sortA = Number(a.sortNo);
      const sortB = Number(b.sortNo);
      const hasSortA = Number.isFinite(sortA);
      const hasSortB = Number.isFinite(sortB);
      if (hasSortA && hasSortB && sortA !== sortB) return sortA - sortB;
      if (hasSortA !== hasSortB) return hasSortA ? -1 : 1;
      return String(a.detailId || '').localeCompare(String(b.detailId || ''));
    });
  });

  return out;
}
