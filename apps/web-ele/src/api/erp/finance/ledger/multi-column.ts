import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { getVoucherDetails, getVoucherPage } from '#/api/erp/finance/voucher';
import type { ErpVoucherApi } from '#/api/erp/finance/voucher';

export type MultiColumnSubject = {
  rowid?: string;
  subject_number?: string;
  subject_name?: string;
  parent_subject_number?: string;
  is_leaf_subject?: number | string;
  balance_direction?: number | string;
};

export type MultiColumnVoucherEntry = {
  rowId: string;
  voucherId: string;
  date: string;
  voucherNo: string;
  summary: string;
  subjectCode: string;
  subjectName: string;
  debit: number;
  credit: number;
};

function formatDate(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const text = String(item ?? '').trim();
    if (text) return text;
  }
  return '';
}

function compareCode(a: string, b: string) {
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN-u-kn-true', {
    numeric: true,
    sensitivity: 'base',
  });
}

function parseVoucherWordNo(code: string): { word: string; no: number } {
  const s = String(code ?? '').trim();
  const m = s.match(/^(.+?)(\d+)$/);
  if (!m) return { word: s || '记', no: Number.MAX_SAFE_INTEGER };
  const word = String(m[1] ?? '').trim() || '记';
  const no = Number(m[2]);
  return {
    word,
    no: Number.isFinite(no) ? Math.trunc(no) : Number.MAX_SAFE_INTEGER,
  };
}

function compareVoucherNo(a: string, b: string) {
  const pa = parseVoucherWordNo(a);
  const pb = parseVoucherWordNo(b);
  const word = pa.word.localeCompare(pb.word, 'zh-Hans-CN');
  if (word !== 0) return word;
  if (pa.no !== pb.no) return pa.no - pb.no;
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN');
}

export async function fetchMultiColumnSubjects(params?: { keyword?: string }) {
  const res = await getAllSubjectList({
    pageNo: 1,
    page: 0,
    keyword: params?.keyword,
    lingma_sys_is_delete: 0,
    subject_state: 1,
  } as any);

  return ((res?.list || []) as MultiColumnSubject[]).sort((a, b) =>
    compareCode(String(a.subject_number || ''), String(b.subject_number || '')),
  );
}

export function getMultiColumnChildren(params: {
  subjects: MultiColumnSubject[];
  subjectCode: string;
  mode: 'children' | 'leaf';
}) {
  const subjectCode = String(params.subjectCode || '').trim();
  if (!subjectCode) return [] as MultiColumnSubject[];

  const list = params.subjects || [];
  const children = list.filter((item) => {
    const code = String(item.subject_number || '').trim();
    if (!code || code === subjectCode || !code.startsWith(subjectCode)) return false;

    if (params.mode === 'leaf') {
      return Number(item.is_leaf_subject ?? 0) === 1;
    }

    const parent = String(item.parent_subject_number || '').trim();
    return parent === subjectCode;
  });

  const fallback =
    params.mode === 'children' && children.length === 0
      ? list.filter((item) => {
          const code = String(item.subject_number || '').trim();
          return code && code !== subjectCode && code.startsWith(subjectCode);
        })
      : children;

  return fallback.sort((a, b) =>
    compareCode(String(a.subject_number || ''), String(b.subject_number || '')),
  );
}

export async function fetchMultiColumnVoucherEntries(params: {
  startISO: string;
  endISO: string;
  subjectCode: string;
}) {
  const subjectCode = String(params.subjectCode || '').trim();
  if (!subjectCode) return [] as MultiColumnVoucherEntry[];

  const page = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [params.startISO, params.endISO],
  } as any);

  const mains = ((page?.list || []) as ErpVoucherApi.VoucherMain[]).filter(
    (item: any) => Number(item?.lingma_sys_is_delete ?? 0) !== 1,
  );

  const detailGroups = await Promise.all(
    mains.map((main: any) =>
      getVoucherDetails(String(main.rowid ?? main.row_id ?? '')),
    ),
  );

  const rows: MultiColumnVoucherEntry[] = [];

  mains.forEach((main: any, mainIndex) => {
    const voucherId = String(main.rowid ?? main.row_id ?? '').trim();
    const voucherNo = pickNonEmptyText(
      main.voucher_code,
      main.ReportID,
      main.business_code,
    );
    const date = formatDate(
      pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime),
    );
    const details = detailGroups[mainIndex] || [];

    details.forEach((detail: any, detailIndex) => {
      const accountCode = String(detail.account_code ?? '').trim();
      if (!accountCode || !accountCode.startsWith(subjectCode)) return;

      rows.push({
        rowId: String(detail.rowid ?? detail.row_id ?? `${voucherId}-${detailIndex}`),
        voucherId,
        date,
        voucherNo,
        summary: pickNonEmptyText(detail.abstract_content, detail.description, main.description),
        subjectCode: accountCode,
        subjectName: String(detail.account_name ?? '').trim(),
        debit: Number(detail.debit_amount ?? 0) || 0,
        credit: Number(detail.credit_amount ?? 0) || 0,
      });
    });
  });

  return rows.sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
    if (dateCompare !== 0) return dateCompare;
    const voucherCompare = compareVoucherNo(a.voucherNo, b.voucherNo);
    if (voucherCompare !== 0) return voucherCompare;
    return String(a.rowId || '').localeCompare(String(b.rowId || ''));
  });
}
