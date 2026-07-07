import { getSubjectOpeningList, type BilSubjectOpeningApi } from '#/api/erp/finance/settings/initial';
import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { getVoucherDetails, getVoucherPage, type ErpVoucherApi } from '#/api/erp/finance/voucher';
import { subjectYearBeginningToDebitPositiveRaw } from '#/utils/finance/subject-opening';


export type SubjectRunningBalanceRow = {
  subjectCode: string;
  subjectName?: string;
  balanceDirection?: number | string;
  openingBalance: number;
  beforeMonthDebit: number;
  beforeMonthCredit: number;
  currentMonthDebit: number;
  currentMonthCredit: number;
  currentBalance: number;
};

const SUBJECT_RUNNING_BALANCE_FORM_ID = '90818FF13C82F9290207BAC312F04867';
const SUBJECT_RUNNING_BALANCE_VIEW = 'v_bil_subject_running_balance_by_voucher';
const SUBJECT_RUNNING_BALANCE_DB = 'LMBill';
const SUBJECT_RUNNING_BALANCE_PK = 'subject_code';

function pickItems(payload: any) {
  const result = payload?.Result ?? payload?.result ?? payload;
  const data = result?.data ?? result?.Data ?? result;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(result?.Items)) return result.Items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(result)) return result;
  return [];
}

export async function getSubjectRunningBalancesByVoucherId(voucherId: string) {
  const id = String(voucherId || '').trim();
  if (!id) return [] as SubjectRunningBalanceRow[];

  const table = createFinanceDataTableCurrent(
    SUBJECT_RUNNING_BALANCE_FORM_ID,
    SUBJECT_RUNNING_BALANCE_VIEW,
    SUBJECT_RUNNING_BALANCE_DB,
    SUBJECT_RUNNING_BALANCE_PK,
  );
  table.Filter = and(cond('as_of_voucher_id', 'equal', id));
  table.Fields = [];

  const queryParam = table.getQueryParam('Table', table.Filter, null, null, 0, 1);
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);
  table.execQueryResult(resQuery);

  return pickItems(resQuery.data ?? {}).map((row: any) => ({
    subjectCode: String(row?.subject_code ?? '').trim(),
    subjectName: String(row?.subject_name ?? '').trim(),
    balanceDirection: row?.balance_direction,
    openingBalance: money(row?.opening_balance),
    beforeMonthDebit: money(row?.before_month_debit),
    beforeMonthCredit: money(row?.before_month_credit),
    currentMonthDebit: money(row?.current_month_debit),
    currentMonthCredit: money(row?.current_month_credit),
    currentBalance: money(row?.current_balance),
  })).filter((row: SubjectRunningBalanceRow) => !!row.subjectCode);
}

export type SubjectBalanceRow = {
  rowId: string;
  subjectCode: string;
  subjectName: string;
  openingDebit: number;
  openingCredit: number;
  currentDebit: number;
  currentCredit: number;
  yearDebit?: number;
  yearCredit?: number;
  endingDebit: number;
  endingCredit: number;
  level?: number;
  isLeaf?: boolean;
  isTotal?: boolean;
};

export type LedgerSubject = {
  rowid?: string;
  subject_number?: string;
  subject_code?: string;
  subject_name?: string;
  parent_subject_number?: string;
  balance_direction?: number | string;
  is_leaf_subject?: number | string;
};

type Agg = {
  ytdDebit: number;
  ytdCredit: number;
  beforePeriodDebit: number;
  beforePeriodCredit: number;
  periodDebit: number;
  periodCredit: number;
};

type BalanceCalc = {
  openingRaw: number;
  endingRaw: number;
  periodDebit: number;
  periodCredit: number;
  ytdDebit: number;
  ytdCredit: number;
};

type AmountCols = {
  openingDebit: number;
  openingCredit: number;
  currentDebit: number;
  currentCredit: number;
  yearDebit: number;
  yearCredit: number;
  endingDebit: number;
  endingCredit: number;
};

type SubjectNode = {
  code: string;
  name: string;
  parentCode: string;
  balanceDirection: '借' | '贷';
  own: Agg;
  children: SubjectNode[];
};

function parseMonth(month: string) {
  const [year, value] = String(month || '').split('-').map(Number);
  if (!year || !value) return null;
  return { year, month: value };
}

function monthRange(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  return {
    start: new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0),
    end: new Date(parsed.year, parsed.month, 0, 23, 59, 59),
  };
}

function yearStartOf(month: string) {
  const parsed = parseMonth(month);
  const year = parsed?.year || new Date().getFullYear();
  return new Date(year, 0, 1, 0, 0, 0);
}

function toIsoDateTime(d: Date) {
  return d.toISOString();
}

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

function codeOf(item: any) {
  return pickNonEmptyText(item?.subject_number, item?.subject_code, item?.account_code);
}

function parentCodeOf(item: any) {
  const explicitParent = pickNonEmptyText(item?.parent_subject_number, item?.parent_subject_code);
  if (explicitParent) return explicitParent;
  const code = codeOf(item);
  if (!code || code.length <= 4) return '';
  if (code.length <= 6) return code.slice(0, 4);
  return code.slice(0, -2);
}

function money(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isNonZero(value: any) {
  return Math.abs(money(value)) > 0.000001;
}

function normalizeDirection(value: any): '借' | '贷' {
  const text = String(value ?? '').trim();
  return text === '2' || text === '贷' || text === '贷方' || text.toLowerCase() === 'credit' ? '贷' : '借';
}

function emptyAgg(): Agg {
  return {
    ytdDebit: 0,
    ytdCredit: 0,
    beforePeriodDebit: 0,
    beforePeriodCredit: 0,
    periodDebit: 0,
    periodCredit: 0,
  };
}

function emptyAmountCols(): AmountCols {
  return {
    openingDebit: 0,
    openingCredit: 0,
    currentDebit: 0,
    currentCredit: 0,
    yearDebit: 0,
    yearCredit: 0,
    endingDebit: 0,
    endingCredit: 0,
  };
}

function addCalc(target: BalanceCalc, source: BalanceCalc) {
  target.openingRaw += source.openingRaw;
  target.endingRaw += source.endingRaw;
  target.periodDebit += source.periodDebit;
  target.periodCredit += source.periodCredit;
  target.ytdDebit += source.ytdDebit;
  target.ytdCredit += source.ytdCredit;
  return target;
}

function addAmountCols(target: AmountCols, source: AmountCols) {
  target.openingDebit += source.openingDebit;
  target.openingCredit += source.openingCredit;
  target.currentDebit += source.currentDebit;
  target.currentCredit += source.currentCredit;
  target.yearDebit += source.yearDebit;
  target.yearCredit += source.yearCredit;
  target.endingDebit += source.endingDebit;
  target.endingCredit += source.endingCredit;
  return target;
}

function splitRawBalance(raw: number) {
  const value = money(raw);
  return value >= 0 ? { debit: Math.abs(value), credit: 0 } : { debit: 0, credit: Math.abs(value) };
}

function hasAnyAmount(row: AmountCols) {
  return [
    row.openingDebit,
    row.openingCredit,
    row.currentDebit,
    row.currentCredit,
    row.yearDebit,
    row.yearCredit,
    row.endingDebit,
    row.endingCredit,
  ].some(isNonZero);
}

function getOpeningRaw(opening: BilSubjectOpeningApi.SubjectOpening | undefined, direction: '借' | '贷') {
  return subjectYearBeginningToDebitPositiveRaw(opening, direction);
}

function buildOwnCalc(node: SubjectNode, openingMap: Map<string, BilSubjectOpeningApi.SubjectOpening>): BalanceCalc {
  const own = node.own;
  const yearOpeningRaw = getOpeningRaw(openingMap.get(node.code), node.balanceDirection);
  const openingRaw = yearOpeningRaw + own.beforePeriodDebit - own.beforePeriodCredit;
  const endingRaw = yearOpeningRaw + own.ytdDebit - own.ytdCredit;
  return {
    openingRaw,
    endingRaw,
    periodDebit: own.periodDebit,
    periodCredit: own.periodCredit,
    ytdDebit: own.ytdDebit,
    ytdCredit: own.ytdCredit,
  };
}

function toAmountCols(calc: BalanceCalc): AmountCols {
  const opening = splitRawBalance(calc.openingRaw);
  const ending = splitRawBalance(calc.endingRaw);
  return {
    openingDebit: opening.debit,
    openingCredit: opening.credit,
    currentDebit: calc.periodDebit,
    currentCredit: calc.periodCredit,
    yearDebit: calc.ytdDebit,
    yearCredit: calc.ytdCredit,
    endingDebit: ending.debit,
    endingCredit: ending.credit,
  };
}

export async function fetchSubjectBalanceRows(params: {
  month?: string;
  periodStart?: string;
  periodEnd?: string;
  keyword?: string;
  accountId?: string;
}) {
  const startMonth = String(params.periodStart || params.month || '').trim();
  const endMonth = String(params.periodEnd || params.periodStart || params.month || '').trim();
  if (!startMonth && !endMonth) return [] as SubjectBalanceRow[];

  const normalizedStartMonth = startMonth && endMonth && startMonth > endMonth ? endMonth : startMonth || endMonth;
  const normalizedEndMonth = startMonth && endMonth && startMonth > endMonth ? startMonth : endMonth || startMonth;
  const { start: periodStartDate } = monthRange(normalizedStartMonth);
  const { end: periodEndDate } = monthRange(normalizedEndMonth);
  const yearStart = yearStartOf(normalizedEndMonth);

  const [subjectRes, openingRes, voucherPage] = await Promise.all([
    getAllSubjectList({
      pageNo: 1,
      page: 0,
      keyword: params.keyword,
      account_id: params.accountId,
      lingma_sys_is_delete: 0,
    } as any),
    getSubjectOpeningList({
      pageNo: 1,
      page: 9999,
      account_id: params.accountId,
      lingma_sys_is_delete: 0,
    } as any),
    getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(periodEndDate)],
    } as any),
  ]);

  const subjects = ((subjectRes?.list || []) as LedgerSubject[])
    .map((item) => ({ ...item, subject_number: codeOf(item), parent_subject_number: parentCodeOf(item) }))
    .filter((s) => !!s.subject_number && !!String(s.subject_name ?? '').trim())
    .sort((a, b) => String(a.subject_number).localeCompare(String(b.subject_number), 'zh-Hans-CN-u-kn-true', { numeric: true }));

  const openingMap = new Map<string, BilSubjectOpeningApi.SubjectOpening>();
  for (const opening of (openingRes?.list || []) as BilSubjectOpeningApi.SubjectOpening[]) {
    const code = codeOf(opening);
    if (code) openingMap.set(code, opening);
  }

  const mains = (voucherPage?.list || []) as ErpVoucherApi.VoucherMain[];
  const voucherIds = mains.map((m) => pickNonEmptyText((m as any)?.rowid, (m as any)?.row_id)).filter(Boolean);
  const detailEntries = await Promise.all(
    voucherIds.map(async (voucherId) => [voucherId, await getVoucherDetails(voucherId)] as const),
  );
  const detailsByVoucherId = new Map<string, ErpVoucherApi.VoucherDetail[]>(detailEntries);

  const aggMap = new Map<string, Agg>();
  for (const main of mains as any[]) {
    const dateStr = formatDate(pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime));
    const time = dateStr ? new Date(dateStr).getTime() : 0;
    const inPeriod = time >= periodStartDate.getTime() && time <= periodEndDate.getTime();
    const beforePeriod = time > 0 && time < periodStartDate.getTime();
    const voucherId = pickNonEmptyText(main.rowid, main.row_id);
    const details = detailsByVoucherId.get(voucherId) || [];

    for (const detail of details as any[]) {
      const code = codeOf(detail);
      if (!code) continue;
      const debit = money(detail.debit_amount);
      const credit = money(detail.credit_amount);
      if (!isNonZero(debit) && !isNonZero(credit)) continue;

      const agg = aggMap.get(code) || emptyAgg();
      agg.ytdDebit += debit;
      agg.ytdCredit += credit;
      if (beforePeriod) {
        agg.beforePeriodDebit += debit;
        agg.beforePeriodCredit += credit;
      }
      if (inPeriod) {
        agg.periodDebit += debit;
        agg.periodCredit += credit;
      }
      aggMap.set(code, agg);
    }
  }

  const nodeMap = new Map<string, SubjectNode>();
  for (const subject of subjects) {
    const code = String(subject.subject_number || '').trim();
    nodeMap.set(code, {
      code,
      name: String(subject.subject_name || '').trim(),
      parentCode: String(subject.parent_subject_number || '').trim(),
      balanceDirection: normalizeDirection(subject.balance_direction),
      own: aggMap.get(code) || emptyAgg(),
      children: [],
    });
  }

  const roots: SubjectNode[] = [];
  for (const node of nodeMap.values()) {
    const parent = node.parentCode ? nodeMap.get(node.parentCode) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  for (const node of nodeMap.values()) node.children.sort((a, b) => a.code.localeCompare(b.code, 'zh-Hans-CN-u-kn-true', { numeric: true }));
  roots.sort((a, b) => a.code.localeCompare(b.code, 'zh-Hans-CN-u-kn-true', { numeric: true }));

  const levelCache = new Map<string, number>();
  const resolveLevel = (node: SubjectNode): number => {
    const cached = levelCache.get(node.code);
    if (cached) return cached;
    const parent = node.parentCode ? nodeMap.get(node.parentCode) : undefined;
    const level = parent ? resolveLevel(parent) + 1 : 1;
    levelCache.set(node.code, level);
    return level;
  };

  const calcCache = new Map<string, BalanceCalc>();
  const rowCache = new Map<string, AmountCols>();
  const collectCalc = (node: SubjectNode): BalanceCalc => {
    const cached = calcCache.get(node.code);
    if (cached) return cached;
    const calc = buildOwnCalc(node, openingMap);
    for (const child of node.children) addCalc(calc, collectCalc(child));
    calcCache.set(node.code, calc);
    rowCache.set(node.code, toAmountCols(calc));
    return calc;
  };
  roots.forEach(collectCalc);

  const rows: SubjectBalanceRow[] = [];
  const total = emptyAmountCols();
  const appendRows = (node: SubjectNode) => {
    const amountCols = rowCache.get(node.code) || emptyAmountCols();
    if (hasAnyAmount(amountCols)) {
      rows.push({
        rowId: node.code,
        subjectCode: node.code,
        subjectName: node.name,
        openingDebit: amountCols.openingDebit,
        openingCredit: amountCols.openingCredit,
        currentDebit: amountCols.currentDebit,
        currentCredit: amountCols.currentCredit,
        yearDebit: amountCols.yearDebit,
        yearCredit: amountCols.yearCredit,
        endingDebit: amountCols.endingDebit,
        endingCredit: amountCols.endingCredit,
        level: resolveLevel(node),
        isLeaf: node.children.length === 0,
      });
    }
    for (const child of node.children) appendRows(child);
  };

  for (const root of roots) {
    appendRows(root);
    addAmountCols(total, rowCache.get(root.code) || emptyAmountCols());
  }

  rows.push({
    rowId: 'total',
    subjectCode: '',
    subjectName: '合计',
    openingDebit: total.openingDebit,
    openingCredit: total.openingCredit,
    currentDebit: total.currentDebit,
    currentCredit: total.currentCredit,
    yearDebit: total.yearDebit,
    yearCredit: total.yearCredit,
    endingDebit: total.endingDebit,
    endingCredit: total.endingCredit,
    isTotal: true,
  });

  return rows;
}
