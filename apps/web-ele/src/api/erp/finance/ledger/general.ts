import { getSubjectOpeningList, type BilSubjectOpeningApi } from '#/api/erp/finance/settings/initial';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { getVoucherDetails, getVoucherPage, type ErpVoucherApi } from '#/api/erp/finance/voucher';
import { calculateSubjectYearBeginning } from '#/utils/finance/subject-opening';

export type LedgerSubject = {
  rowid?: string;
  subject_number?: string;
  subject_name?: string;
  balance_direction?: number | string; // 1借 2贷
};

export type GeneralLedgerRow = {
  /** 用于 tree-table 展开 */
  rowId: string;
  subjectCode: string;
  subjectName: string;
  dateLabel: string;
  period: string;
  summary: string;
  debit: number;
  credit: number;
  directionText: string;
  balanceAbs: number;
  children?: GeneralLedgerRow[];
};

function formatMonthLabel(month: string) {
  const [y, m] = String(month || '').split('-');
  if (!y || !m) return '';
  return `${y}年${Number(m)}月`;
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0);
  const end = new Date(y!, m!, 0, 23, 59, 59);
  return { start, end };
}

function yearStartOf(month: string) {
  const [y] = month.split('-').map(Number);
  return new Date(y!, 0, 1, 0, 0, 0);
}

function getMonthKeysInRange(periodStart: string, periodEnd: string) {
  const start = String(periodStart || periodEnd || '').trim();
  const end = String(periodEnd || periodStart || '').trim();
  if (!start || !end) return [] as string[];

  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  if (!startYear || !startMonth || !endYear || !endMonth) return [] as string[];

  const out: string[] = [];
  const cursor = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth - 1, 1);
  while (cursor.getTime() <= endDate.getTime()) {
    out.push(cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0'));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}


function toIsoDateTime(d: Date) {
  return d.toISOString();
}

function dirTextFromNumber(balanceDirection: any) {
  const d = Number(balanceDirection ?? 1);
  return d === 2 ? '贷' : '借';
}

function oppositeDir(d: '借' | '贷') {
  return d === '借' ? '贷' : '借';
}

function pickNonEmptyText(...candidates: any[]) {
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

function formatDate(d: any): string {
  if (!d) return '';
  const t = typeof d === 'string' ? d : (d as Date).toISOString();
  return t.slice(0, 10);
}

function isNonZero(value: any) {
  return Math.abs(Number(value ?? 0) || 0) > 0;
}

function hasGeneralLedgerAmounts(...values: any[]) {
  return values.some(isNonZero);
}

function getParentSubjectNumber(subjectNumber: string) {
  const code = String(subjectNumber || '').trim();
  if (!code || code.length <= 4) return '';
  if (code.length <= 6) return code.slice(0, 4);
  return code.slice(0, -2);
}

function getAncestorSubjectNumbers(subjectNumber: string, existingCodes: Set<string>) {
  const ancestors: string[] = [];
  let parent = getParentSubjectNumber(subjectNumber);
  while (parent) {
    if (existingCodes.has(parent)) ancestors.push(parent);
    parent = getParentSubjectNumber(parent);
  }
  return ancestors;
}

function buildSubjectTreeRows(rows: GeneralLedgerRow[], monthKeys: string[]) {
  const subjectRowMap = new Map<string, GeneralLedgerRow>();
  const subjectChildrenMap = new Map<string, string[]>();
  const rootCodes: string[] = [];

  rows.forEach((row) => {
    const code = String(row.subjectCode || '').trim();
    if (code) subjectRowMap.set(code, row);
  });

  rows.forEach((row) => {
    const code = String(row.subjectCode || '').trim();
    if (!code) return;
    const parentCode = getParentSubjectNumber(code);
    if (parentCode && subjectRowMap.has(parentCode)) {
      const list = subjectChildrenMap.get(parentCode) || [];
      list.push(code);
      subjectChildrenMap.set(parentCode, list);
    } else {
      rootCodes.push(code);
    }
  });

  const sortCodes = (codes: string[]) => codes.sort((a, b) => String(a).localeCompare(String(b)));
  const getChildCodes = (code: string) => sortCodes([...(subjectChildrenMap.get(code) || [])]);

  const isMonthRow = (row: GeneralLedgerRow, monthKey: string) =>
    row.dateLabel === formatMonthLabel(monthKey)
    && ['期初余额', '本期合计', '本年累计'].includes(String(row.period || ''));

  const getMonthRows = (subjectRow: GeneralLedgerRow, monthKey: string, includeOpening: boolean) => {
    const source = Array.isArray(subjectRow.children) ? subjectRow.children : [];
    const rows = source.filter((row) => isMonthRow(row, monthKey));
    return includeOpening ? rows : rows.filter((row) => row.period !== '期初余额');
  };

  const createGroupRow = (
    subjectRow: GeneralLedgerRow,
    monthKey: string,
    children: GeneralLedgerRow[],
  ): GeneralLedgerRow => ({
    rowId: subjectRow.rowId + '-' + monthKey + '-group',
    subjectCode: subjectRow.subjectCode,
    subjectName: subjectRow.subjectName,
    dateLabel: formatMonthLabel(monthKey),
    period: '',
    summary: '__subject-merged__',
    debit: 0,
    credit: 0,
    directionText: '',
    balanceAbs: 0,
    children,
  });

  const createYearCloseRow = (subjectRow: GeneralLedgerRow): GeneralLedgerRow => ({
    rowId: subjectRow.rowId + '-year-close',
    subjectCode: subjectRow.subjectCode,
    subjectName: subjectRow.subjectName,
    dateLabel: subjectRow.dateLabel,
    period: '本年累计',
    summary: '__subject-merged__',
    debit: 0,
    credit: 0,
    directionText: '',
    balanceAbs: 0,
  });

  const openingShown = new Set<string>();

  const buildSubjectForMonth = (code: string, monthKey: string): GeneralLedgerRow | undefined => {
    const subjectRow = subjectRowMap.get(code);
    if (!subjectRow) return undefined;

    const includeOpening = !openingShown.has(code);
    const ownMonthRows = getMonthRows(subjectRow, monthKey, includeOpening);
    if (ownMonthRows.some((row) => row.period === '期初余额')) openingShown.add(code);

    const childGroupRows = getChildCodes(code)
      .map((childCode) => buildSubjectForMonth(childCode, monthKey))
      .filter(Boolean) as GeneralLedgerRow[];

    const children = [...ownMonthRows, ...childGroupRows];
    if (children.length === 0) return undefined;
    return createGroupRow(subjectRow, monthKey, children);
  };

  const out: GeneralLedgerRow[] = [];
  for (const rootCode of sortCodes([...rootCodes])) {
    const rootRow = subjectRowMap.get(rootCode);
    if (!rootRow) continue;

    for (const monthKey of monthKeys) {
      const section = buildSubjectForMonth(rootCode, monthKey);
      if (section) out.push(section);
    }

    if (getChildCodes(rootCode).length > 0) {
      out.push(createYearCloseRow(rootRow));
    }
  }

  return out;
}

export async function fetchGeneralLedgerSubjects(params?: {
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

export async function fetchGeneralLedgerRows(params: {
  month?: string; // YYYY-MM
  periodStart?: string;
  periodEnd?: string;
  keyword?: string;
  accountId?: string;
}) {
  const startMonth = String(params.periodStart || params.month || '').trim();
  const endMonth = String(params.periodEnd || params.periodStart || params.month || '').trim();
  if (!startMonth && !endMonth) return [] as GeneralLedgerRow[];

  const normalizedStartMonth = startMonth && endMonth && startMonth > endMonth ? endMonth : startMonth || endMonth;
  const normalizedEndMonth = startMonth && endMonth && startMonth > endMonth ? startMonth : endMonth || startMonth;
  const monthKeys = getMonthKeysInRange(normalizedStartMonth, normalizedEndMonth);
  const { end: periodEndDate } = monthRange(normalizedEndMonth);
  const yearStart = yearStartOf(normalizedStartMonth);

  // 1) 科目列表：先取全部科目用于父级汇总，keyword 只作为最终展示过滤
  const allSubjects = (await fetchGeneralLedgerSubjects({
    account_id: params.accountId,
  }))
    .filter((s) => {
      const code = String(s.subject_number ?? '').trim();
      const name = String(s.subject_name ?? '').trim();
      return !!code && !!name;
    })
    .sort((a, b) => String(a.subject_number).localeCompare(String(b.subject_number)));

  const subjectMap = new Map<string, LedgerSubject>();
  allSubjects.forEach((item) => {
    const code = String(item.subject_number || '').trim();
    if (code) subjectMap.set(code, item);
  });
  const subjectCodeSet = new Set(subjectMap.keys());
  const keyword = String(params.keyword || '').trim();
  const matchedCodeSet = new Set<string>();
  if (keyword) {
    allSubjects.forEach((item) => {
      const code = String(item.subject_number || '').trim();
      const name = String(item.subject_name || '').trim();
      if (code.includes(keyword) || name.includes(keyword)) {
        matchedCodeSet.add(code);
        getAncestorSubjectNumbers(code, subjectCodeSet).forEach((ancestor) =>
          matchedCodeSet.add(ancestor),
        );
      }
    });
  }

  const subjects = keyword
    ? allSubjects.filter((item) =>
        matchedCodeSet.has(String(item.subject_number || '').trim()),
      )
    : allSubjects;

  // 2) 期初/年初余额（Bil_Subject_Opening）
  const openingRes = await getSubjectOpeningList({
    pageNo: 1,
    page: 9999,
    account_id: params.accountId,
    lingma_sys_is_delete: 0,
  } as any);

  const openingAmountMap = new Map<string, number>();
  for (const o of (openingRes?.list || []) as BilSubjectOpeningApi.SubjectOpening[]) {
    const code = String((o as any)?.subject_code ?? '').trim();
    if (!code) continue;
    const subject = subjectMap.get(code);
    const amount = calculateSubjectYearBeginning(
      o,
      subject?.balance_direction ?? o?.balance_direction,
    );
    openingAmountMap.set(code, (openingAmountMap.get(code) || 0) + amount);
    for (const ancestorCode of getAncestorSubjectNumbers(code, subjectCodeSet)) {
      openingAmountMap.set(
        ancestorCode,
        (openingAmountMap.get(ancestorCode) || 0) + amount,
      );
    }
  }

  // 3) 拉取年初到月末所有凭证，汇总到科目
  const page = await getVoucherPage({
    pageNo: 1,
    page: 0, // 0 通常代表“全部”
    voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(periodEndDate)],
  } as any);

  const mains = (page.list || []) as ErpVoucherApi.VoucherMain[];
  const detailList = await Promise.all(
    mains.map((m) => getVoucherDetails(String(m.rowid ?? ''))),
  );

  type Agg = {
    ytdDebit: number;
    ytdCredit: number;
    monthly: Map<string, { debit: number; credit: number }>;
  };
  const createAgg = (): Agg => ({ ytdDebit: 0, ytdCredit: 0, monthly: new Map() });
  const addMonthly = (agg: Agg, monthKey: string, debit: number, credit: number) => {
    if (!monthKey) return;
    const current = agg.monthly.get(monthKey) || { debit: 0, credit: 0 };
    current.debit += debit;
    current.credit += credit;
    agg.monthly.set(monthKey, current);
  };
  const aggMap = new Map<string, Agg>();

  mains.forEach((m, idx) => {
    const dateStr = formatDate(pickNonEmptyText(m.voucher_date, m.createtime, m.updatetime));
    const t = dateStr ? new Date(dateStr).getTime() : 0;
    if (!t || t > periodEndDate.getTime()) return;
    const monthKey = dateStr.slice(0, 7);
    const details = detailList[idx] || [];

    for (const d of details as any[]) {
      const code = String(d.account_code ?? '').trim();
      if (!code) continue;
      const debit = Number(d.debit_amount ?? 0) || 0;
      const credit = Number(d.credit_amount ?? 0) || 0;

      const agg = aggMap.get(code) || createAgg();

      agg.ytdDebit += debit;
      agg.ytdCredit += credit;
      addMonthly(agg, monthKey, debit, credit);

      aggMap.set(code, agg);

      for (const ancestorCode of getAncestorSubjectNumbers(code, subjectCodeSet)) {
        const parentAgg = aggMap.get(ancestorCode) || createAgg();
        parentAgg.ytdDebit += debit;
        parentAgg.ytdCredit += credit;
        addMonthly(parentAgg, monthKey, debit, credit);
        aggMap.set(ancestorCode, parentAgg);
      }
    }
  });

  // 4) 组装 tree-table 数据：只过滤空科目；保留查询区间内每一个月份的期初/本月/本年行
  const out: GeneralLedgerRow[] = [];

  for (const s of subjects) {
    const code = String(s.subject_number ?? '').trim();
    const name = String(s.subject_name ?? '').trim();
    const dir = dirTextFromNumber(s.balance_direction) as '借' | '贷';
    const yearOpeningAbs = openingAmountMap.get(code) || 0;
    const agg = aggMap.get(code) || createAgg();
    const selectedMonthTotals = monthKeys.reduce(
      (total, monthKey) => {
        const monthAgg = agg.monthly.get(monthKey) || { debit: 0, credit: 0 };
        total.debit += monthAgg.debit;
        total.credit += monthAgg.credit;
        return total;
      },
      { debit: 0, credit: 0 },
    );
    let ytdDebitBeforeMonth = 0;
    let ytdCreditBeforeMonth = 0;
    agg.monthly.forEach((amount, key) => {
      if (key < (monthKeys[0] || normalizedStartMonth)) {
        ytdDebitBeforeMonth += amount.debit;
        ytdCreditBeforeMonth += amount.credit;
      }
    });
    const selectedOpeningSigned = yearOpeningAbs
      + (dir === '借'
        ? ytdDebitBeforeMonth - ytdCreditBeforeMonth
        : ytdCreditBeforeMonth - ytdDebitBeforeMonth);
    const hasSelectedSubjectData = hasGeneralLedgerAmounts(
      selectedOpeningSigned,
      selectedMonthTotals.debit,
      selectedMonthTotals.credit,
    );
    if (!hasSelectedSubjectData) continue;

    const children: GeneralLedgerRow[] = [];

    for(const monthKey of monthKeys){
      const periodText = formatMonthLabel(monthKey);
      const monthAgg = agg.monthly.get(monthKey) || { debit: 0, credit: 0 };
      const monthOpeningSigned = yearOpeningAbs + (dir==='借'?ytdDebitBeforeMonth-ytdCreditBeforeMonth:ytdCreditBeforeMonth-ytdDebitBeforeMonth);
      const monthOpeningDir = monthOpeningSigned>=0?dir:oppositeDir(dir);
      const ytdThroughMonthDebit = ytdDebitBeforeMonth + monthAgg.debit;
      const ytdThroughMonthCredit = ytdCreditBeforeMonth + monthAgg.credit;
      const monthEndingSigned = monthOpeningSigned + (dir==='借'?monthAgg.debit-monthAgg.credit:monthAgg.credit-monthAgg.debit);
      const yearEndingSigned = yearOpeningAbs + (dir==='借'?ytdThroughMonthDebit-ytdThroughMonthCredit:ytdThroughMonthCredit-ytdThroughMonthDebit);

      children.push({
        rowId: code + '-' + monthKey + '-opening',
        subjectCode: code,
        subjectName: name,
        dateLabel: periodText,
        period: '期初余额',
        summary: '',
        debit: 0,
        credit: 0,
        directionText: monthOpeningDir,
        balanceAbs: Math.abs(monthOpeningSigned),
      });
      children.push({
        rowId: code + '-' + monthKey + '-month',
        subjectCode: code,
        subjectName: name,
        dateLabel: periodText,
        period: '本期合计',
        summary: '',
        debit: monthAgg.debit,
        credit: monthAgg.credit,
        directionText: monthEndingSigned>=0?dir:oppositeDir(dir),
        balanceAbs: Math.abs(monthEndingSigned),
      });
      children.push({
        rowId: code + '-' + monthKey + '-year',
        subjectCode: code,
        subjectName: name,
        dateLabel: periodText,
        period: '本年累计',
        summary: '',
        debit: ytdThroughMonthDebit,
        credit: ytdThroughMonthCredit,
        directionText: yearEndingSigned >= 0 ? dir : oppositeDir(dir),
        balanceAbs: Math.abs(yearEndingSigned),
      });

      ytdDebitBeforeMonth = ytdThroughMonthDebit;
      ytdCreditBeforeMonth = ytdThroughMonthCredit;
    }

    if (children.length === 0) continue;

    const lastMonth = monthKeys[monthKeys.length-1]||normalizedEndMonth;
    const firstMonth = monthKeys[0] || normalizedStartMonth;
    const lastAgg = agg.monthly.get(lastMonth)||{debit:0,credit:0};

    out.push({
      rowId: code+'-subject-root',
      subjectCode: code,
      subjectName: name,
      dateLabel: monthKeys.length > 1
        ? formatMonthLabel(firstMonth) + ' 至 ' + formatMonthLabel(lastMonth)
        : formatMonthLabel(lastMonth),
      period: String(code).length <= 4 ? '期初余额' : '科目汇总',
      summary: '',
      debit: lastAgg.debit,
      credit: lastAgg.credit,
      directionText: '',
      balanceAbs: 0,
      children,
    });
  }
  return buildSubjectTreeRows(out, monthKeys);
}
