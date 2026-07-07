import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { getVoucherDetails, getVoucherPage, type ErpVoucherApi } from '#/api/erp/finance/voucher';

export type SubjectSummaryRow = {
  rowId: string;
  subjectType: string;
  subjectTypeLabel: string;
  subjectCode: string;
  subjectName: string;
  displaySubjectName?: string;
  currentDebit: number;
  currentCredit: number;
  parentSubjectCode?: string;
  level?: number;
  isLeaf?: boolean;
  isCategoryTotal?: boolean;
  isGrandTotal?: boolean;
};

export type SubjectSummaryResult = {
  rows: SubjectSummaryRow[];
  voucherCount: number;
  attachmentCount: number;
};

export type LedgerSubject = {
  rowid?: string;
  subject_number?: string;
  subject_name?: string;
  subject_type?: number | string;
  parent_subject_number?: string;
  is_leaf_subject?: number;
};

const SUBJECT_TYPE_LABEL_MAP: Record<string, string> = {
  '1': '资产',
  '2': '负债',
  '3': '权益',
  '4': '成本',
  '5': '损益',
};

const SUBJECT_TYPE_ORDER = ['1', '2', '3', '4', '5'];
const SUBJECT_SEGMENT_RULE = [4, 3, 2, 2] as const;

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0);
  const end = new Date(y!, m!, 0, 23, 59, 59);
  return { start, end };
}

function toIsoDateTime(d: Date) {
  return d.toISOString();
}

function getSubjectTypeLabel(subjectType: unknown) {
  const key = String(subjectType ?? '').trim();
  return SUBJECT_TYPE_LABEL_MAP[key] || '未分类';
}

function normalizeCode(value: unknown) {
  return String(value ?? '').trim();
}

function getSubjectLevelByCode(code: string) {
  const normalizedCode = normalizeCode(code);
  const length = normalizedCode.length;
  let total = 0;
  for (let index = 0; index < SUBJECT_SEGMENT_RULE.length; index += 1) {
    total += SUBJECT_SEGMENT_RULE[index]!;
    if (total === length) return index;
  }
  return 0;
}

function buildDisplaySubjectName(code: string, subjectMap: Map<string, LedgerSubject>) {
  const chain: string[] = [];
  let currentCode = normalizeCode(code);
  const visited = new Set<string>();

  while (currentCode && !visited.has(currentCode)) {
    visited.add(currentCode);
    const subject = subjectMap.get(currentCode);
    if (!subject) break;
    const subjectName = String(subject.subject_name ?? '').trim();
    if (subjectName) {
      chain.unshift(subjectName);
    }
    currentCode = normalizeCode(subject.parent_subject_number);
  }

  return chain.join('-');
}

export async function fetchSubjectSummaryRows(params: {
  month?: string;
  periodStart?: string;
  periodEnd?: string;
  keyword?: string;
  accountId?: string;
}) {
  const startMonth = String(params.periodStart || params.month || '').trim();
  const endMonth = String(params.periodEnd || params.periodStart || params.month || '').trim();
  if (!startMonth && !endMonth) {
    return {
      rows: [] as SubjectSummaryRow[],
      voucherCount: 0,
      attachmentCount: 0,
    } satisfies SubjectSummaryResult;
  }

  const normalizedStartMonth = startMonth && endMonth && startMonth > endMonth ? endMonth : startMonth || endMonth;
  const normalizedEndMonth = startMonth && endMonth && startMonth > endMonth ? startMonth : endMonth || startMonth;
  const { start: periodStartDate } = monthRange(normalizedStartMonth);
  const { end: periodEndDate } = monthRange(normalizedEndMonth);

  const subjectRes = await getAllSubjectList({
    pageNo: 1,
    page: 0,
    keyword: params.keyword,
    account_id: params.accountId,
    lingma_sys_is_delete: 0,
  } as any);

  const subjectMap = new Map<string, LedgerSubject>();
  for (const subject of (subjectRes?.list || []) as LedgerSubject[]) {
    const code = normalizeCode(subject.subject_number);
    const name = String(subject.subject_name ?? '').trim();
    if (!code || !name) continue;
    subjectMap.set(code, subject);
  }

  const voucherPage = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [toIsoDateTime(periodStartDate), toIsoDateTime(periodEndDate)],
  } as any);

  const mains = (voucherPage.list || []) as ErpVoucherApi.VoucherMain[];
  const detailList = await Promise.all(
    mains.map((m) => getVoucherDetails(String(m.rowid ?? ''))),
  );

  type Agg = {
    subjectType: string;
    subjectTypeLabel: string;
    subjectCode: string;
    subjectName: string;
    displaySubjectName: string;
    parentSubjectCode: string;
    currentDebit: number;
    currentCredit: number;
    level: number;
    isLeaf: boolean;
  };

  const directAmountMap = new Map<string, { debit: number; credit: number }>();

  for (const details of detailList) {
    for (const d of details as any[]) {
      const code = normalizeCode(d.account_code);
      if (!code) continue;

      const subject = subjectMap.get(code);
      if (!subject) continue;

      const subjectName = String(subject.subject_name ?? '').trim();
      if (!subjectName) continue;

      const debit = Number(d.debit_amount ?? 0) || 0;
      const credit = Number(d.credit_amount ?? 0) || 0;
      const current = directAmountMap.get(code) || { debit: 0, credit: 0 };
      current.debit += debit;
      current.credit += credit;
      directAmountMap.set(code, current);
    }
  }

  const includedCodeSet = new Set<string>();
  for (const code of directAmountMap.keys()) {
    let currentCode = code;
    while (currentCode) {
      if (includedCodeSet.has(currentCode)) break;
      includedCodeSet.add(currentCode);
      const currentSubject = subjectMap.get(currentCode);
      currentCode = normalizeCode(currentSubject?.parent_subject_number);
    }
  }

  const childrenMap = new Map<string, string[]>();
  for (const code of includedCodeSet) {
    const subject = subjectMap.get(code);
    const parentCode = normalizeCode(subject?.parent_subject_number);
    if (!parentCode || !includedCodeSet.has(parentCode)) continue;
    const list = childrenMap.get(parentCode) || [];
    list.push(code);
    childrenMap.set(parentCode, list);
  }

  const aggregateCache = new Map<string, { debit: number; credit: number }>();
  const aggregateAmounts = (code: string): { debit: number; credit: number } => {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) return { debit: 0, credit: 0 };
    const cached = aggregateCache.get(normalizedCode);
    if (cached) return cached;

    const own = directAmountMap.get(normalizedCode) || { debit: 0, credit: 0 };
    let debit = own.debit;
    let credit = own.credit;

    for (const childCode of childrenMap.get(normalizedCode) || []) {
      const childAmount = aggregateAmounts(childCode);
      debit += childAmount.debit;
      credit += childAmount.credit;
    }

    const result = { debit, credit };
    aggregateCache.set(normalizedCode, result);
    return result;
  };

  const grouped = new Map<string, Agg[]>();

  for (const code of includedCodeSet) {
    const subject = subjectMap.get(code);
    if (!subject) continue;

    const subjectCode = normalizeCode(subject.subject_number);
    const subjectName = String(subject.subject_name ?? '').trim();
    if (!subjectCode || !subjectName) continue;

    const totalAmount = aggregateAmounts(subjectCode);
    const item: Agg = {
      subjectType: String(subject.subject_type ?? '').trim(),
      subjectTypeLabel: getSubjectTypeLabel(subject.subject_type),
      subjectCode,
      subjectName,
      displaySubjectName: buildDisplaySubjectName(subjectCode, subjectMap) || subjectName,
      parentSubjectCode: normalizeCode(subject.parent_subject_number),
      currentDebit: totalAmount.debit,
      currentCredit: totalAmount.credit,
      level: getSubjectLevelByCode(subjectCode),
      isLeaf: Number(subject.is_leaf_subject ?? 0) === 1,
    };

    const key = item.subjectType || '0';
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }

  const rows: SubjectSummaryRow[] = [];
  const allTypeKeys = Array.from(new Set([...SUBJECT_TYPE_ORDER, ...Array.from(grouped.keys())]));

  for (const typeKey of allTypeKeys) {
    const items = (grouped.get(typeKey) || []).sort((a, b) =>
      a.subjectCode.localeCompare(b.subjectCode),
    );
    if (items.length === 0) continue;

    for (const item of items) {
      rows.push({
        rowId: `${typeKey}-${item.subjectCode}`,
        subjectType: item.subjectType,
        subjectTypeLabel: item.subjectTypeLabel,
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        displaySubjectName: item.displaySubjectName,
        currentDebit: item.currentDebit,
        currentCredit: item.currentCredit,
        parentSubjectCode: item.parentSubjectCode,
        level: item.level,
        isLeaf: item.isLeaf,
      });
    }
  }

  return {
    rows,
    voucherCount: mains.length,
    attachmentCount: 0,
  } satisfies SubjectSummaryResult;
}
