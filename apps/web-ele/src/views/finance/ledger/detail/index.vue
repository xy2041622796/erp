<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import ExcelJS from 'exceljs';

import { addMoney, moneyNumber, subMoney, sumByMoney } from '#/utils/finance/decimal-money';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { useAccountSetStore } from '#/store/account-set';


import {
  fetchLedgerEntriesForSubjects,
  fetchLedgerSubjectNumbersWithEntries,
  fetchLedgerSubjectOpenings,
  fetchLedgerSubjects,
  type LedgerEntry,
  type LedgerSubject,
  type LedgerSubjectOpening,
} from '#/api/erp/finance/ledger/detail';
import { fetchSubjectBalanceRows } from '#/api/erp/finance/ledger/subject-balance';
import { subjectYearBeginningToDebitPositiveRaw } from '#/utils/finance/subject-opening';
import { createVoucher, getNextVoucherCodeByDate, type ErpVoucherApi } from '#/api/erp/finance/voucher';

import {
  buildDetailLedgerPrintDocument,
  buildDetailLedgerPrintHtml,
  buildDetailLedgerPrintSection,
} from '#/views/finance/print-templates/detail-ledger';
import VoucherForm from '#/views/finance/Voucher/modules/form.vue';
import DetailLedgerFilter, { type DetailLedgerFilterParams } from '#/views/finance/ledger/detail/DetailLedgerFilter.vue';
import { monthEndDate, monthLabel, monthRangeISO, LEDGER_COLUMNS, toMoney } from '#/views/finance/ledger/detail/data';

import {
  ElButton,
  ElDatePicker,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElLink,
  ElMessage,
  ElMessageBox,
} from 'element-plus';

defineOptions({ name: 'FinanceDetailLedger' });

const route = useRoute();
const accountSetStore = useAccountSetStore();

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function getSubjectLevel(subjectNumber: string) {
  const code = String(subjectNumber || '').trim();
  if (!code) return 0;
  if (code.length <= 4) return 1;
  return Math.floor((code.length - 4) / 2) + 1;
}

function getParentSubjectNumber(subjectNumber: string) {
  const code = String(subjectNumber || '').trim();
  if (!code || code.length <= 4) return '';
  if (code.length <= 6) return code.slice(0, 4);
  return code.slice(0, -2);
}

function getRangeISO(periodStart: string, periodEnd: string) {
  const startMonth = String(periodStart || '').trim() || String(periodEnd || '').trim();
  const endMonth = String(periodEnd || '').trim() || String(periodStart || '').trim();
  if (!startMonth || !endMonth) return { startISO: '', endISO: '' };

  const start = monthRangeISO(startMonth).startISO;
  const end = monthRangeISO(endMonth).endISO;
  return { startISO: start, endISO: end };
}

function getYearToPeriodEndRangeISO(periodStart: string, periodEnd: string) {
  const startMonth = String(periodStart || '').trim() || String(periodEnd || '').trim();
  const endMonth = String(periodEnd || '').trim() || String(periodStart || '').trim();
  if (!startMonth || !endMonth) return { startISO: '', endISO: '' };

  const startYear = Number(startMonth.slice(0, 4));
  const endYear = Number(endMonth.slice(0, 4));
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return { startISO: '', endISO: '' };

  const normalizedStartYear = Math.min(startYear, endYear);
  const startISO = new Date(normalizedStartYear, 0, 1, 0, 0, 0).toISOString();
  const endISO = monthRangeISO(endMonth).endISO;
  return { startISO, endISO };
}

function getBeforePeriodStartRangeISO(periodStart: string, periodEnd: string) {
  const startMonth = String(periodStart || '').trim() || String(periodEnd || '').trim();
  if (!startMonth) return { startISO: '', endISO: '' };

  const [year, month] = startMonth.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { startISO: '', endISO: '' };
  }

  const beforePeriodStart = new Date(year, month - 1, 0, 23, 59, 59);
  return {
    startISO: new Date(1900, 0, 1, 0, 0, 0).toISOString(),
    endISO: beforePeriodStart.toISOString(),
  };
}

function getYearOccurrenceRangeISO(periodStart: string, periodEnd: string) {
  const startMonth = String(periodStart || '').trim() || String(periodEnd || '').trim();
  const endMonth = String(periodEnd || '').trim() || String(periodStart || '').trim();
  if (!startMonth || !endMonth) return { startISO: '', endISO: '' };

  const startYear = Number(startMonth.slice(0, 4));
  const endYear = Number(endMonth.slice(0, 4));
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    return { startISO: '', endISO: '' };
  }

  const normalizedStartYear = Math.min(startYear, endYear);
  const normalizedEndYear = Math.max(startYear, endYear);
  const startISO = new Date(normalizedStartYear, 0, 1, 0, 0, 0).toISOString();
  const endISO = new Date(normalizedEndYear, 11, 31, 23, 59, 59).toISOString();
  return { startISO, endISO };
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
function parseVoucherWordNo(code: string): { no: number; word: string } {
  const s = String(code ?? '').trim();
  const m = s.match(/^(.+?)(\d+)$/);
  if (!m) return { no: 1, word: s || '记' };
  const word = String(m[1] ?? '').trim() || '记';
  const no = Number(m[2]);
  return { no: Number.isFinite(no) && no > 0 ? Math.trunc(no) : 1, word };
}

function getVoucherWordSortWeight(word: string) {
  const normalized = String(word || '').trim();
  if (normalized.includes('记')) return 1;
  if (normalized.includes('收')) return 2;
  if (normalized.includes('付')) return 3;
  if (normalized.includes('转')) return 4;
  return 99;
}

function compareVoucherNo(a: string, b: string) {
  const pa = parseVoucherWordNo(a);
  const pb = parseVoucherWordNo(b);
  const wa = getVoucherWordSortWeight(pa.word);
  const wb = getVoucherWordSortWeight(pb.word);
  if (wa !== wb) return wa - wb;
  if (pa.no !== pb.no) return pa.no - pb.no;
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN');
}

function getEntryMonthKey(entry: LedgerEntry) {
  return String(entry.date || '').slice(0, 7);
}

function sortLedgerEntries(data: LedgerEntry[], sortBy: DetailLedgerFilterParams['sortBy']) {
  return [...data].sort((a, b) => {
    if (sortBy === 'voucherDate') {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return compareVoucherNo(String(a.voucherNo || ''), String(b.voucherNo || ''));
    }

    const monthCompare = getEntryMonthKey(a).localeCompare(getEntryMonthKey(b));
    if (monthCompare !== 0) return monthCompare;

    const voucherCompare = compareVoucherNo(String(a.voucherNo || ''), String(b.voucherNo || ''));
    if (voucherCompare !== 0) return voucherCompare;

    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

type SubjectTreeNode = LedgerSubject & {
  children: SubjectTreeNode[];
  level: number;
  hasOwnEntries: boolean;
};

type LedgerRow = {
  type: 'opening' | 'entry' | 'sumMonth' | 'sumYear';
  date: string;
  voucherId?: string;
  voucherNo: string;
  subject: string;
  summary: string;
  debit: number;
  credit: number;
  directionText: string;
  balanceAbs: number;
};

const queryParams = ref<DetailLedgerFilterParams>({
  periodStart: getCurrentMonth(),
  periodEnd: getCurrentMonth(),
  startSubject: '',
  endSubject: '',
  subjectLevelStart: 1,
  subjectLevelEnd: 4,
  summary: '',
  sortBy: 'voucherNo',
  showAssistAccounting: false,
  onlyShowLowestDetail: false,
  showOppositeDirectionSubjects: false,
  hideZeroBalance: false,
  hideNoOccurrenceAndZeroBalance: false,
  hideNoOccurrenceSummaryRows: false,
});

const filterPopoverVisible = ref(false);

const keyword = ref('');
const subjectList = ref<LedgerSubject[]>([]);
const activeSubject = ref<LedgerSubject | null>(null);
const expandedSubjectNumbers = ref<Record<string, boolean>>({});

const loading = ref(false);
const subjectLoading = ref(false);
const printLoading = ref(false);
const entries = ref<LedgerEntry[]>([]);
const yearEntriesForActive = ref<LedgerEntry[]>([]);
const openingBalance = ref(0);
const yearDebit = ref(0);
const yearCredit = ref(0);
const printFrameRef = ref<HTMLIFrameElement>();
const importFileRef = ref<HTMLInputElement>();
const importLoading = ref(false);
const exportLoading = ref(false);
const balanceRowsCache = ref<Awaited<ReturnType<typeof fetchSubjectBalanceRows>>>([]);
const openingRowsCache = ref<LedgerSubjectOpening[]>([]);
const periodEntriesCache = ref<Record<string, LedgerEntry[]>>({});
const priorEntriesCache = ref<Record<string, LedgerEntry[]>>({});
const yearEntriesCache = ref<Record<string, LedgerEntry[]>>({});
const entriesCacheKey = ref('');
const subjectOccurrenceRangeMode = ref<'fullYear' | 'yearToPeriodEnd'>('fullYear');
const loadedSubjectPeriodEnd = ref('');

const displayPeriodText = computed(() => {
  const start = String(queryParams.value.periodStart || '').trim();
  const end = String(queryParams.value.periodEnd || '').trim();
  if (!start && !end) return '未选择期间';
  if (start && end && start !== end) return `${monthLabel(start)} 至 ${monthLabel(end)}`;
  return monthLabel(start || end);
});

const periodRange = computed<[string, string] | null>({
  get: () => {
    const start = String(queryParams.value.periodStart || '').trim();
    const end = String(
      queryParams.value.periodEnd || queryParams.value.periodStart || '',
    ).trim();
    if (!start && !end) return null;
    return [start || end, end || start];
  },
  set: (value) => {
    const [start = '', end = ''] = value || [];
    queryParams.value = normalizeFilterPeriods({
      ...queryParams.value,
      periodStart: start,
      periodEnd: end || start,
    });
  },
});

const filteredSubjects = computed(() => {
  const k = String(keyword.value || '').trim();
  if (!k) return subjectList.value;
  return subjectList.value.filter((s) => {
    const code = String(s.subject_number ?? '');
    const name = String(s.subject_name ?? '');
    return code.includes(k) || name.includes(k);
  });
});

const subjectTitle = computed(() => {
  const s = activeSubject.value;
  if (!s) return '请选择科目';
  return `${s.subject_number ?? ''} ${s.subject_name ?? ''}`.trim();
});

const subjectCountText = computed(() => `${filteredSubjects.value.length} 个科目`);

const totalDebit = computed(() => moneyNumber(sumByMoney(entries.value, (item) => item.debit)));
const totalCredit = computed(() => moneyNumber(sumByMoney(entries.value, (item) => item.credit)));

function hasNonZeroAmount(...values: any[]) {
  return values.some((value) => Math.abs(Number(value ?? 0) || 0) > 0.000001);
}
const endingBalance = computed(() => {
  const endingRow = [...rows.value].reverse().find((row) => row.type === 'sumYear' || row.type === 'sumMonth');
  return Number(endingRow?.balanceAbs || 0);
});
const activeSubjectMeta = computed(() => {
  const subject = activeSubject.value;
  if (!subject) return '未选择科目';
  const level = getSubjectLevel(String(subject.subject_number || ''));
  const leafText = Number(subject.is_leaf_subject || 0) === 1 ? '末级' : '父级';
  return `${level}级 / ${leafText} / 方向${balanceDirection.value}`;
});

const balanceDirection = computed(() => {
  const d = Number(activeSubject.value?.balance_direction ?? 1);
  return d === 2 ? '贷' : '借';
});

const subjectTree = computed<SubjectTreeNode[]>(() => {
  const map = new Map<string, SubjectTreeNode>();
  const roots: SubjectTreeNode[] = [];

  filteredSubjects.value.forEach((item) => {
    const code = String(item.subject_number ?? '').trim();
    if (!code) return;
    map.set(code, {
      ...item,
      children: [],
      level: getSubjectLevel(code),
      hasOwnEntries: Number((item as any).__hasOwnEntries ?? 0) === 1,
    });
  });

  const sortedNodes = [...map.values()].sort((a, b) =>
    String(a.subject_number ?? '').localeCompare(String(b.subject_number ?? '')),
  );

  sortedNodes.forEach((node) => {
    const parentCode = getParentSubjectNumber(String(node.subject_number ?? ''));
    const parent = parentCode ? map.get(parentCode) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
});

const visibleSubjectNodes = computed<SubjectTreeNode[]>(() => {
  const out: SubjectTreeNode[] = [];
  const walk = (nodes: SubjectTreeNode[]) => {
    nodes.forEach((node) => {
      out.push(node);
      const code = String(node.subject_number ?? '').trim();
      if (node.children.length > 0 && expandedSubjectNumbers.value[code] !== false) {
        walk(node.children);
      }
    });
  };
  walk(subjectTree.value);
  return out;
});

function getDirectionTextByRunning(running: number, dir: '借' | '贷') {
  return running >= 0 ? dir : dir === '借' ? '贷' : '借';
}

function normalizeFilterPeriods(params: DetailLedgerFilterParams) {
  const start = String(params.periodStart || '').trim();
  const end = String(params.periodEnd || '').trim();

  if (!start && !end) return { ...params, periodStart: '', periodEnd: '' };
  if (!start) return { ...params, periodStart: end, periodEnd: end };
  if (!end) return { ...params, periodStart: start, periodEnd: start };
  if (start > end) return { ...params, periodStart: end, periodEnd: start };
  return { ...params, periodStart: start, periodEnd: end };
}

function getOpeningBalanceFromBalanceRows(
  balanceRows: Awaited<ReturnType<typeof fetchSubjectBalanceRows>>,
  subjectCode: string,
  balanceDirection: number | string | undefined,
) {
  const code = String(subjectCode || '').trim();
  if (!code) return 0;

  const row = (balanceRows || []).find(
    (item) => String(item?.subjectCode ?? '').trim() === code,
  );
  if (!row) return 0;

  const openingDebit = moneyNumber(row.openingDebit);
  const openingCredit = moneyNumber(row.openingCredit);
  return Number(balanceDirection ?? 1) === 2
    ? moneyNumber(subMoney(openingCredit, openingDebit))
    : moneyNumber(subMoney(openingDebit, openingCredit));
}

function getOpeningSubjectCode(opening: LedgerSubjectOpening) {
  return String(
    (opening as any)?.subject_code
      ?? (opening as any)?.subject_number
      ?? (opening as any)?.account_code
      ?? '',
  ).trim();
}

function isSameOrChildSubject(code: string, subjectCode: string) {
  const normalizedCode = String(code || '').trim();
  const normalizedSubjectCode = String(subjectCode || '').trim();
  return Boolean(
    normalizedCode
      && normalizedSubjectCode
      && (normalizedCode === normalizedSubjectCode || normalizedCode.startsWith(normalizedSubjectCode)),
  );
}

function getOpeningRawAmount(opening: LedgerSubjectOpening) {
  return moneyNumber(
    subjectYearBeginningToDebitPositiveRaw(
      opening as any,
      (opening as any)?.balance_direction,
    ),
  );
}

function toSubjectDirectionBalance(rawBalance: number, balanceDirection: number | string | undefined) {
  return Number(balanceDirection ?? 1) === 2
    ? moneyNumber(-rawBalance)
    : moneyNumber(rawBalance);
}

function getSubjectNumbersForEntryCache() {
  return filteredSubjects.value
    .map((subject) => String(subject.subject_number ?? '').trim())
    .filter(Boolean);
}

function buildEntriesCacheKey(subjectNumbers = getSubjectNumbersForEntryCache()) {
  return JSON.stringify({
    periodStart: queryParams.value.periodStart,
    periodEnd: queryParams.value.periodEnd,
    subjects: [...subjectNumbers].sort(),
  });
}

function buildSubjectScopeKey(params = queryParams.value) {
  return JSON.stringify({
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    startSubject: params.startSubject,
    endSubject: params.endSubject,
    subjectLevelStart: params.subjectLevelStart,
    subjectLevelEnd: params.subjectLevelEnd,
    onlyShowLowestDetail: params.onlyShowLowestDetail,
  });
}

function isPeriodChanged(prev: DetailLedgerFilterParams, next: DetailLedgerFilterParams) {
  return String(prev.periodStart || '') !== String(next.periodStart || '')
    || String(prev.periodEnd || '') !== String(next.periodEnd || '');
}

function getPeriodEndMonth(params = queryParams.value) {
  const normalized = normalizeFilterPeriods({ ...params });
  return String(normalized.periodEnd || normalized.periodStart || '').trim();
}

function updateSubjectOccurrenceRangeMode(nextParams: DetailLedgerFilterParams, previousParams?: DetailLedgerFilterParams) {
  const nextEnd = getPeriodEndMonth(nextParams);
  const previousEnd = previousParams ? getPeriodEndMonth(previousParams) : loadedSubjectPeriodEnd.value;
  subjectOccurrenceRangeMode.value = previousEnd && nextEnd && nextEnd < previousEnd
    ? 'yearToPeriodEnd'
    : 'fullYear';
  loadedSubjectPeriodEnd.value = nextEnd;
}

function getSubjectOccurrenceRangeISO() {
  return subjectOccurrenceRangeMode.value === 'yearToPeriodEnd'
    ? getYearToPeriodEndRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd)
    : getYearOccurrenceRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd);
}

function resetEntryCaches() {
  entriesCacheKey.value = '';
  balanceRowsCache.value = [];
  openingRowsCache.value = [];
  periodEntriesCache.value = {};
  priorEntriesCache.value = {};
  yearEntriesCache.value = {};
}

function applyActiveSubjectFromCache() {
  const subject = activeSubject.value;
  if (!subject?.subject_number) {
    entries.value = [];
    yearEntriesForActive.value = [];
    openingBalance.value = 0;
    yearDebit.value = 0;
    yearCredit.value = 0;
    return;
  }

  const subjectCode = String(subject.subject_number).trim();
  let data = periodEntriesCache.value[subjectCode] || [];
  const summaryKeyword = String(queryParams.value.summary || '').trim();
  if (summaryKeyword) {
    data = data.filter((item) => String(item.summary || '').includes(summaryKeyword));
  }

  const yearEntries = yearEntriesCache.value[subjectCode] || [];
  const balanceRows = balanceRowsCache.value || [];
  const balanceRow = balanceRows.find(
    (item) => String(item?.subjectCode ?? '').trim() === subjectCode,
  );
  const balanceOpening = getOpeningBalanceFromBalanceRows(
    balanceRows,
    subjectCode,
    subject.balance_direction,
  );
  const priorOpening = getOpeningBalanceFromPriorData({
    openings: openingRowsCache.value,
    priorEntries: priorEntriesCache.value[subjectCode] || [],
    subjectCode,
    balanceDirection: subject.balance_direction,
  });
  openingBalance.value = priorOpening.hasSource ? priorOpening.value : balanceOpening;

  const fallbackYearDebit = moneyNumber(sumByMoney(yearEntries, (item) => item.debit));
  const fallbackYearCredit = moneyNumber(sumByMoney(yearEntries, (item) => item.credit));
  const balanceYearDebit = moneyNumber(balanceRow?.yearDebit ?? 0);
  const balanceYearCredit = moneyNumber(balanceRow?.yearCredit ?? 0);
  yearDebit.value = hasNonZeroAmount(balanceYearDebit, balanceYearCredit)
    ? balanceYearDebit
    : fallbackYearDebit;
  yearCredit.value = hasNonZeroAmount(balanceYearDebit, balanceYearCredit)
    ? balanceYearCredit
    : fallbackYearCredit;

  entries.value = sortLedgerEntries(data, queryParams.value.sortBy);
  yearEntriesForActive.value = sortLedgerEntries(yearEntries, queryParams.value.sortBy);
}

async function ensureEntriesCache(force = false) {
  const subjectNumbers = getSubjectNumbersForEntryCache();
  const nextKey = buildEntriesCacheKey(subjectNumbers);
  if (!force && entriesCacheKey.value === nextKey) return;

  if (subjectNumbers.length === 0) {
    resetEntryCaches();
    entriesCacheKey.value = nextKey;
    return;
  }

  const { startISO, endISO } = getRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd);
  if (!startISO || !endISO) {
    resetEntryCaches();
    return;
  }

  const priorRange = getBeforePeriodStartRangeISO(
    queryParams.value.periodStart,
    queryParams.value.periodEnd,
  );
  const yearRange = getYearToPeriodEndRangeISO(
    queryParams.value.periodStart,
    queryParams.value.periodEnd,
  );

  const [balanceRows, openingRows, periodEntriesMap, priorEntriesMap, yearEntriesMap] = await Promise.all([
    fetchSubjectBalanceRows({
      periodStart: queryParams.value.periodStart,
      periodEnd: queryParams.value.periodEnd,
    }),
    fetchLedgerSubjectOpenings(),
    fetchLedgerEntriesForSubjects({
      subjectNumbers,
      startISO,
      endISO,
      includeChildren: true,
    }),
    priorRange.startISO && priorRange.endISO
      ? fetchLedgerEntriesForSubjects({
          subjectNumbers,
          startISO: priorRange.startISO,
          endISO: priorRange.endISO,
          includeChildren: true,
        })
      : Promise.resolve({} as Record<string, LedgerEntry[]>),
    yearRange.startISO && yearRange.endISO
      ? fetchLedgerEntriesForSubjects({
          subjectNumbers,
          startISO: yearRange.startISO,
          endISO: yearRange.endISO,
          includeChildren: true,
        })
      : Promise.resolve({} as Record<string, LedgerEntry[]>),
  ]);

  balanceRowsCache.value = balanceRows;
  openingRowsCache.value = openingRows;
  periodEntriesCache.value = periodEntriesMap;
  priorEntriesCache.value = priorEntriesMap;
  yearEntriesCache.value = yearEntriesMap;
  entriesCacheKey.value = nextKey;
}

function getOpeningBalanceFromPriorData(data: {
  openings: LedgerSubjectOpening[];
  priorEntries: LedgerEntry[];
  subjectCode: string;
  balanceDirection: number | string | undefined;
}) {
  const subjectCode = String(data.subjectCode || '').trim();
  if (!subjectCode) return { hasSource: false, value: 0 };

  let hasOpeningSource = false;
  let yearOpeningRaw = 0;
  for (const opening of data.openings || []) {
    const code = getOpeningSubjectCode(opening);
    if (!isSameOrChildSubject(code, subjectCode)) continue;
    hasOpeningSource = true;
    yearOpeningRaw = moneyNumber(addMoney([yearOpeningRaw, getOpeningRawAmount(opening)]));
  }

  const priorDebit = moneyNumber(sumByMoney(data.priorEntries || [], (item) => item.debit));
  const priorCredit = moneyNumber(sumByMoney(data.priorEntries || [], (item) => item.credit));
  const priorRaw = moneyNumber(subMoney(priorDebit, priorCredit, 'round', 6));
  const rawBalance = moneyNumber(addMoney([yearOpeningRaw, priorRaw]));

  return {
    hasSource: hasOpeningSource || (data.priorEntries || []).length > 0,
    value: toSubjectDirectionBalance(rawBalance, data.balanceDirection),
  };
}

function buildRowsByEntries(data: {
  periodStart: string;
  periodEnd: string;
  subjectTitle: string;
  direction: '借' | '贷';
  entries: LedgerEntry[];
  openingBalance?: number;
  yearDebit?: number;
  yearCredit?: number;
  yearEntries?: LedgerEntry[];
}) {
  const dir = data.direction;
  const opening = moneyNumber(data.openingBalance);
  const monthKeys = getMonthKeysInRange(data.periodStart, data.periodEnd);
  const endingMonth = monthKeys[monthKeys.length - 1] || String(data.periodEnd || data.periodStart || '').trim();
  let running = opening;

  const out: LedgerRow[] = [];
  const sortedEntries = sortLedgerEntries(data.entries || [], queryParams.value.sortBy);
  const sortedYearEntries = sortLedgerEntries(
    data.yearEntries && data.yearEntries.length > 0 ? data.yearEntries : data.entries || [],
    queryParams.value.sortBy,
  );
  const entriesByMonth = new Map<string, LedgerEntry[]>();
  sortedEntries.forEach((entry) => {
    const monthKey = getEntryMonthKey(entry);
    if (!entriesByMonth.has(monthKey)) entriesByMonth.set(monthKey, []);
    entriesByMonth.get(monthKey)!.push(entry);
  });

  const openingMonth = monthKeys[0] || String(data.periodStart || data.periodEnd || '').trim();
  if (openingMonth) {
    out.push({
      type: 'opening',
      date: openingMonth + '-01',
      voucherNo: '',
      subject: data.subjectTitle,
      summary: '期初余额',
      debit: 0,
      credit: 0,
      directionText: getDirectionTextByRunning(running, dir),
      balanceAbs: moneyNumber(Math.abs(running)),
    });
  }

  for (const monthKey of monthKeys) {
    const monthEntries = entriesByMonth.get(monthKey) || [];
    let monthDebit = 0;
    let monthCredit = 0;

    for (const e of monthEntries) {
      const debit = moneyNumber(e.debit);
      const credit = moneyNumber(e.credit);
      monthDebit = moneyNumber(addMoney([monthDebit, debit]));
      monthCredit = moneyNumber(addMoney([monthCredit, credit]));
      if (dir === '借') running = moneyNumber(addMoney([running, subMoney(debit, credit, 'round', 6)]));
      else running = moneyNumber(addMoney([running, subMoney(credit, debit, 'round', 6)]));

      out.push({
        type: 'entry',
        date: e.date,
        voucherId: e.voucherId,
        voucherNo: e.voucherNo,
        subject: e.subject,
        summary: e.summary,
        debit,
        credit,
        directionText: getDirectionTextByRunning(running, dir),
        balanceAbs: moneyNumber(Math.abs(running)),
      });
    }

    out.push({
      type: 'sumMonth',
      date: monthEndDate(monthKey),
      voucherNo: '',
      subject: data.subjectTitle,
      summary: '本月合计',
      debit: monthDebit,
      credit: monthCredit,
      directionText: getDirectionTextByRunning(running, dir),
      balanceAbs: moneyNumber(Math.abs(running)),
    });

    const monthYearStart = monthKey.slice(0, 4) + '-01';
    const yearEntriesThroughMonth = sortedYearEntries.filter((entry) => {
      const entryMonth = getEntryMonthKey(entry);
      return entryMonth >= monthYearStart && entryMonth <= monthKey;
    });
    const computedYearDebit = moneyNumber(sumByMoney(yearEntriesThroughMonth, (item) => item.debit));
    const computedYearCredit = moneyNumber(sumByMoney(yearEntriesThroughMonth, (item) => item.credit));
    const yearDebitValue = monthKey === endingMonth && data.yearDebit !== undefined
      ? moneyNumber(data.yearDebit)
      : computedYearDebit;
    const yearCreditValue = monthKey === endingMonth && data.yearCredit !== undefined
      ? moneyNumber(data.yearCredit)
      : computedYearCredit;

    out.push({
      type: 'sumYear',
      date: monthEndDate(monthKey),
      voucherNo: '',
      subject: data.subjectTitle,
      summary: '本年累计',
      debit: yearDebitValue,
      credit: yearCreditValue,
      directionText: getDirectionTextByRunning(running, dir),
      balanceAbs: moneyNumber(Math.abs(running)),
    });
  }

  return out;
}

const rows = computed<LedgerRow[]>(() => {
  const dir = balanceDirection.value as '借' | '贷';
  let nextRows = buildRowsByEntries({
    periodStart: queryParams.value.periodStart,
    periodEnd: queryParams.value.periodEnd,
    subjectTitle: subjectTitle.value,
    direction: dir,
    entries: entries.value,
    openingBalance: openingBalance.value,
    yearDebit: yearDebit.value,
    yearCredit: yearCredit.value,
    yearEntries: yearEntriesForActive.value,
  });

  if (queryParams.value.hideNoOccurrenceSummaryRows && entries.value.length === 0) {
    // 当前期间无发生时仍保留“本年累计”，用于核对年初至查询结束期间的累计发生额。
    nextRows = nextRows.filter((row) => row.type !== 'sumMonth');
  }

  if (queryParams.value.hideZeroBalance) {
    const endingRow = [...nextRows].reverse().find((row) => row.type === 'sumYear' || row.type === 'sumMonth');
    if (endingRow && Number(endingRow.balanceAbs || 0) === 0 && entries.value.length === 0) {
      return [];
    }
  }

  if (queryParams.value.hideNoOccurrenceAndZeroBalance) {
    const hasOccurrence = entries.value.length > 0;
    const endingRow = [...nextRows].reverse().find((row) => row.type === 'sumYear' || row.type === 'sumMonth');
    const endingBalanceAbs = Number(endingRow?.balanceAbs || 0);
    if (!hasOccurrence && endingBalanceAbs === 0) {
      return [];
    }
  }

  return nextRows;
});

function expandAllParents(subjects: LedgerSubject[]) {
  const nextState: Record<string, boolean> = {};
  subjects.forEach((item) => {
    const code = String(item.subject_number ?? '').trim();
    if (!code) return;
    let parentCode = getParentSubjectNumber(code);
    while (parentCode) {
      nextState[parentCode] = true;
      parentCode = getParentSubjectNumber(parentCode);
    }
  });
  expandedSubjectNumbers.value = {
    ...nextState,
    ...expandedSubjectNumbers.value,
  };
}

async function loadSubjects() {
  const { startISO, endISO } = getSubjectOccurrenceRangeISO();
  if (!startISO || !endISO) {
    subjectList.value = [];
    activeSubject.value = null;
    resetEntryCaches();
    return;
  }

  subjectLoading.value = true;
  try {
    const [list, subjectNumbersWithEntries] = await Promise.all([
      fetchLedgerSubjects(),
      fetchLedgerSubjectNumbersWithEntries({ startISO, endISO }),
    ]);

    const allMap = new Map<string, LedgerSubject>();
    list.forEach((item) => {
      const code = String(item.subject_number ?? '').trim();
      if (code) allMap.set(code, item);
    });

    const startSubject = String(queryParams.value.startSubject || '').trim();
    const endSubject = String(queryParams.value.endSubject || '').trim();
    const minLevel = Number(queryParams.value.subjectLevelStart || 1);
    const maxLevel = Number(queryParams.value.subjectLevelEnd || 10);

    const entryCodes = Array.isArray(subjectNumbersWithEntries)
      ? subjectNumbersWithEntries
      : Array.from(subjectNumbersWithEntries || []);
    const entryCodeSet = new Set(entryCodes.map((code) => String(code || '').trim()).filter(Boolean));
    const displayCodeSet = new Set<string>();
    entryCodeSet.forEach((code) => {
      displayCodeSet.add(code);
      let parentCode = getParentSubjectNumber(code);
      while (parentCode) {
        displayCodeSet.add(parentCode);
        parentCode = getParentSubjectNumber(parentCode);
      }
    });
    const isSingleSubjectRange = Boolean(startSubject && endSubject && startSubject === endSubject);

    const nextList = list
      .filter((item) => {
        const code = String(item.subject_number ?? '').trim();
        if (!code) return false;

        if (isSingleSubjectRange) {
          if (code !== startSubject && !code.startsWith(startSubject)) return false;
        } else {
          if (startSubject && code.localeCompare(startSubject) < 0) return false;
          if (endSubject && code.localeCompare(endSubject) > 0) return false;
        }

        const level = getSubjectLevel(code);
        if (level < minLevel || level > maxLevel) return false;

        if (!displayCodeSet.has(code)) return false;

        if (queryParams.value.onlyShowLowestDetail && Number(item.is_leaf_subject ?? 0) !== 1) {
          return false;
        }

        return true;
      })
      .map((item) => ({
        ...item,
        __hasOwnEntries: entryCodeSet.has(String(item.subject_number ?? '').trim()) ? 1 : 0,
      }))
      .sort((a, b) => String(a.subject_number ?? '').localeCompare(String(b.subject_number ?? '')));

    subjectList.value = nextList;
    loadedSubjectPeriodEnd.value = getPeriodEndMonth();
    expandAllParents(nextList);

    const currentSubjectNumber = String(activeSubject.value?.subject_number ?? '').trim();
    const currentInList = nextList.find(
      (s) => String(s.subject_number ?? '').trim() === currentSubjectNumber,
    );
    activeSubject.value = currentInList || nextList[0] || null;
  } catch (e) {
    console.error(e);
    ElMessage.error('加载科目失败');
    subjectList.value = [];
    activeSubject.value = null;
  } finally {
    subjectLoading.value = false;
  }
}

async function loadEntries(force = false) {
  loading.value = true;
  try {
    await ensureEntriesCache(force);
    applyActiveSubjectFromCache();
  } catch (e) {
    console.error(e);
    ElMessage.error('加载明细账失败');
  } finally {
    loading.value = false;
  }
}

function pickSubject(s: LedgerSubject) {
  activeSubject.value = s;
}

function toggleSubjectExpand(subject: SubjectTreeNode) {
  const code = String(subject.subject_number ?? '').trim();
  if (!code || subject.children.length === 0) return;
  expandedSubjectNumbers.value = {
    ...expandedSubjectNumbers.value,
    [code]: expandedSubjectNumbers.value[code] === false,
  };
}

function isSubjectExpanded(subject: SubjectTreeNode) {
  const code = String(subject.subject_number ?? '').trim();
  return expandedSubjectNumbers.value[code] !== false;
}

const [VoucherFormModal, voucherFormModalApi] = useVbenModal({
  connectedComponent: VoucherForm,
  destroyOnClose: true,
});

function openVoucherByRow(row: LedgerRow) {
  if (!row.voucherId || row.type !== 'entry') {
    ElMessage.warning('当前行没有可查看的凭证');
    return;
  }
  voucherFormModalApi.setData({ type: 'edit', id: row.voucherId }).open();
}

async function getPrintContext() {
  await nextTick();
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return null;
  }
  return { win, doc };
}

function printHtml(html: string, win: Window, doc: Document) {
  printLoading.value = true;
  doc.open();
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      printLoading.value = false;
    }
  }, 120);
}

async function printCurrent() {
  if (!activeSubject.value?.subject_number) {
    ElMessage.warning('请先选择科目');
    return;
  }

  if (rows.value.length === 0) {
    ElMessage.warning('当前科目没有可打印的明细账数据');
    return;
  }

  const ctx = await getPrintContext();
  if (!ctx) return;

  const html = buildDetailLedgerPrintHtml({
    title: '明细账',
    monthLabel: displayPeriodText.value,
    subjectTitle: subjectTitle.value,
    keyword: String(keyword.value || '').trim(),
    rows: rows.value,
  });

  printHtml(html, ctx.win, ctx.doc);
}

async function printAllSubjects() {
  const allSubjects = filteredSubjects.value;
  if (allSubjects.length === 0) {
    ElMessage.warning('当前没有可打印的科目');
    return;
  }

  const ctx = await getPrintContext();
  if (!ctx) return;

  const { startISO, endISO } = getRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd);
  printLoading.value = true;

  try {
    const sections: string[] = [];
    const subjectNumbers = allSubjects
      .map((subject) => String(subject.subject_number ?? '').trim())
      .filter(Boolean);
    const priorRange = getBeforePeriodStartRangeISO(
      queryParams.value.periodStart,
      queryParams.value.periodEnd,
    );
    const subjectYearRange = getYearToPeriodEndRangeISO(
      queryParams.value.periodStart,
      queryParams.value.periodEnd,
    );
    const [balanceRows, openingRows, periodEntriesMap, priorEntriesMap, yearEntriesMap] = await Promise.all([
      fetchSubjectBalanceRows({
        periodStart: queryParams.value.periodStart,
        periodEnd: queryParams.value.periodEnd,
      }),
      openingRowsCache.value.length > 0 ? Promise.resolve(openingRowsCache.value) : fetchLedgerSubjectOpenings(),
      entriesCacheKey.value === buildEntriesCacheKey(subjectNumbers)
        ? Promise.resolve(periodEntriesCache.value)
        : fetchLedgerEntriesForSubjects({
            subjectNumbers,
            startISO,
            endISO,
            includeChildren: true,
          }),
      entriesCacheKey.value === buildEntriesCacheKey(subjectNumbers)
        ? Promise.resolve(priorEntriesCache.value)
        : priorRange.startISO && priorRange.endISO
          ? fetchLedgerEntriesForSubjects({
            subjectNumbers,
            startISO: priorRange.startISO,
            endISO: priorRange.endISO,
            includeChildren: true,
          })
        : Promise.resolve({} as Record<string, LedgerEntry[]>),
      entriesCacheKey.value === buildEntriesCacheKey(subjectNumbers)
        ? Promise.resolve(yearEntriesCache.value)
        : subjectYearRange.startISO && subjectYearRange.endISO
          ? fetchLedgerEntriesForSubjects({
            subjectNumbers,
            startISO: subjectYearRange.startISO,
            endISO: subjectYearRange.endISO,
            includeChildren: true,
          })
          : Promise.resolve({} as Record<string, LedgerEntry[]>),
    ]);

    for (const subject of allSubjects) {
      const subjectNumber = String(subject.subject_number ?? '').trim();
      if (!subjectNumber) continue;

      const subjectName = String(subject.subject_name ?? '').trim();
      const direction = Number(subject.balance_direction ?? 1) === 2 ? '贷' : '借';
      let subjectEntries = periodEntriesMap[subjectNumber] || [];

      const summaryKeyword = String(queryParams.value.summary || '').trim();
      if (summaryKeyword) {
        subjectEntries = subjectEntries.filter((item) =>
          String(item.summary || '').includes(summaryKeyword),
        );
      }

      subjectEntries = sortLedgerEntries(subjectEntries, queryParams.value.sortBy);
      const subjectBalanceOpening = getOpeningBalanceFromBalanceRows(
        balanceRows,
        subjectNumber,
        subject.balance_direction,
      );
      const subjectPriorEntries = priorEntriesMap[subjectNumber] || [];
      const subjectPriorOpening = getOpeningBalanceFromPriorData({
        openings: openingRows,
        priorEntries: subjectPriorEntries,
        subjectCode: subjectNumber,
        balanceDirection: subject.balance_direction,
      });
      const subjectOpeningBalance = subjectPriorOpening.hasSource
        ? subjectPriorOpening.value
        : subjectBalanceOpening;

      const subjectBalanceRow = (balanceRows || []).find(
        (item) => String(item?.subjectCode ?? '').trim() === subjectNumber,
      );
      const subjectYearEntries = yearEntriesMap[subjectNumber] || [];
      const subjectBalanceYearDebit = moneyNumber(subjectBalanceRow?.yearDebit ?? 0);
      const subjectBalanceYearCredit = moneyNumber(subjectBalanceRow?.yearCredit ?? 0);
      const subjectFallbackYearDebit = moneyNumber(sumByMoney(subjectYearEntries, (item) => item.debit));
      const subjectFallbackYearCredit = moneyNumber(sumByMoney(subjectYearEntries, (item) => item.credit));

      const subjectRows = buildRowsByEntries({
        periodStart: queryParams.value.periodStart,
        periodEnd: queryParams.value.periodEnd,
        subjectTitle: [subjectNumber, subjectName].filter(Boolean).join(' '),
        direction,
        entries: subjectEntries,
        openingBalance: subjectOpeningBalance,
        yearDebit: hasNonZeroAmount(subjectBalanceYearDebit, subjectBalanceYearCredit)
          ? subjectBalanceYearDebit
          : subjectFallbackYearDebit,
        yearCredit: hasNonZeroAmount(subjectBalanceYearDebit, subjectBalanceYearCredit)
          ? subjectBalanceYearCredit
          : subjectFallbackYearCredit,
        yearEntries: subjectYearEntries,
      });

      if (subjectRows.length === 0) continue;

      sections.push(
        buildDetailLedgerPrintSection({
          title: '明细账',
          monthLabel: displayPeriodText.value,
          subjectTitle: [subjectNumber, subjectName].filter(Boolean).join(' '),
          keyword: String(keyword.value || '').trim(),
          rows: subjectRows,
        }),
      );
    }

    if (sections.length === 0) {
      printLoading.value = false;
      ElMessage.warning('当前筛选科目都没有可打印的明细账数据');
      return;
    }

    const html = buildDetailLedgerPrintDocument(sections, '明细账');
    printHtml(html, ctx.win, ctx.doc);
  } catch (e) {
    printLoading.value = false;
    console.error(e);
    ElMessage.error('打印全部科目失败');
  }
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

function safeFileNamePart(value: string) {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').slice(0, 40) || '明细账';
}

function normalizeExcelCellText(value: any) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray((value as any).richText)) return (value as any).richText.map((x: any) => x?.text || '').join('').trim();
    if ((value as any).text) return String((value as any).text || '').trim();
    if ((value as any).result !== undefined) return normalizeExcelCellText((value as any).result);
  }
  return String(value).trim();
}

function normalizeExcelDate(value: any) {
  if (!value) return '';
  if (value instanceof Date) return value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0');
  const text = normalizeExcelCellText(value).replace(/\//g, '-');
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return text.slice(0, 10);
  return m[1] + '-' + String(Number(m[2])).padStart(2, '0') + '-' + String(Number(m[3])).padStart(2, '0');
}

function normalizeExcelMoney(value: any) {
  const text = normalizeExcelCellText(value).replace(/,/g, '');
  const n = Number(text || 0);
  return Number.isFinite(n) ? n : 0;
}

function splitSubjectText(text: string) {
  const raw = String(text || '').trim();
  const m = raw.match(/^(\d{4,})(?:\s+|[-—])?(.*)$/);
  if (m) return { code: m[1] || '', name: String(m[2] || '').trim() };
  return { code: '', name: raw };
}

function getSubjectInfoByCode(code: string) {
  const normalized = String(code || '').trim();
  const found = subjectList.value.find((sub) => String(sub.subject_number || '').trim() === normalized);
  return { code: normalized || String(found?.subject_number || '').trim(), name: String(found?.subject_name || '').trim() };
}

function buildExportMatrix(subjectTitleText: string, dataRows: LedgerRow[]) {
  const matrix: any[][] = [];
  matrix.push([subjectTitleText + ' 明细账']);
  matrix.push(['账套', getAccountSetNameForFile(), '期间', displayPeriodText.value]);
  matrix.push(['日期', '凭证字号', '科目编码', '科目名称', '摘要', '借方', '贷方', '方向', '余额']);
  dataRows.forEach((row) => {
    const subject = splitSubjectText(row.subject);
    matrix.push([row.date, row.voucherNo, subject.code, subject.name, row.summary, moneyNumber(row.debit || 0), moneyNumber(row.credit || 0), row.directionText, moneyNumber(row.balanceAbs || 0)]);
  });
  return matrix;
}

async function downloadDetailLedgerWorkbook(fileName: string, sheets: { name: string; subjectTitle: string; rows: LedgerRow[] }[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lingma ERP';
  workbook.created = new Date();
  sheets.forEach((item) => {
    const sheet = workbook.addWorksheet(String(item.name || '明细账').replace(/[\\/*?:[\]]/g, '').slice(0, 31) || '明细账');
    buildExportMatrix(item.subjectTitle, item.rows).forEach((row) => sheet.addRow(row));
    sheet.mergeCells(1, 1, 1, 9);
    sheet.getCell(1, 1).font = { bold: true, size: 16 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(3).font = { bold: true };
    sheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 3 }];
    sheet.columns = [{ width: 14 }, { width: 14 }, { width: 14 }, { width: 24 }, { width: 36 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 14 }];
    ['F', 'G', 'I'].forEach((col) => { sheet.getColumn(col).numFmt = '#,##0.00'; });
    sheet.eachRow((row) => row.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; cell.alignment = { vertical: 'middle', wrapText: true }; }));
  });
  const note = workbook.addWorksheet('导入说明');
  note.addRow(['说明', '内容']);
  note.addRow(['账套范围', '导出数据来自当前选中账套；导入时会写入当前选中账套。请先切换到目标账套再导入。']);
  note.addRow(['导入字段', '日期、凭证字号、科目编码、科目名称、摘要、借方、贷方。方向和余额导入时忽略。']);
  note.addRow(['凭证生成', '同一日期 + 凭证字号的多行会合并成一张凭证；借贷必须平衡。']);
  note.addRow(['文件格式', '建议使用本页面导出的 xlsx 模板导入；旧版 BIFF .xls 请先另存为 .xlsx。']);
  note.columns = [{ width: 18 }, { width: 96 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function exportCurrent() {
  if (!activeSubject.value?.subject_number) { ElMessage.warning('请先选择科目'); return; }
  if (rows.value.length === 0) { ElMessage.warning('当前科目没有可导出的明细账数据'); return; }
  exportLoading.value = true;
  try {
    const subject = safeFileNamePart(subjectTitle.value);
    const period = safeFileNamePart(String(queryParams.value.periodStart || '') + '-' + String(queryParams.value.periodEnd || ''));
    const accountSet = safeFileNamePart(getAccountSetNameForFile());
    await downloadDetailLedgerWorkbook('明细账_' + subject + '_' + period + '_' + accountSet + '.xlsx', [{ name: subject || '当前科目', subjectTitle: subjectTitle.value, rows: rows.value }]);
  } catch (e: any) { console.error(e); ElMessage.error(e?.message || '导出失败'); }
  finally { exportLoading.value = false; }
}

async function exportAll() {
  const allSubjects = filteredSubjects.value;
  if (allSubjects.length === 0) { ElMessage.warning('当前没有可导出的科目'); return; }
  exportLoading.value = true;
  try {
    const { startISO, endISO } = getRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd);
    const subjectNumbers = allSubjects
      .map((subject) => String(subject.subject_number ?? '').trim())
      .filter(Boolean);
    const priorRange = getBeforePeriodStartRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd);
    const subjectYearRange = getYearToPeriodEndRangeISO(queryParams.value.periodStart, queryParams.value.periodEnd);
    const [balanceRows, openingRows, periodEntriesMap, priorEntriesMap, yearEntriesMap] = await Promise.all([
      fetchSubjectBalanceRows({ periodStart: queryParams.value.periodStart, periodEnd: queryParams.value.periodEnd }),
      openingRowsCache.value.length > 0 ? Promise.resolve(openingRowsCache.value) : fetchLedgerSubjectOpenings(),
      entriesCacheKey.value === buildEntriesCacheKey(subjectNumbers)
        ? Promise.resolve(periodEntriesCache.value)
        : fetchLedgerEntriesForSubjects({ subjectNumbers, startISO, endISO, includeChildren: true }),
      entriesCacheKey.value === buildEntriesCacheKey(subjectNumbers)
        ? Promise.resolve(priorEntriesCache.value)
        : priorRange.startISO && priorRange.endISO
          ? fetchLedgerEntriesForSubjects({ subjectNumbers, startISO: priorRange.startISO, endISO: priorRange.endISO, includeChildren: true })
          : Promise.resolve({} as Record<string, LedgerEntry[]>),
      entriesCacheKey.value === buildEntriesCacheKey(subjectNumbers)
        ? Promise.resolve(yearEntriesCache.value)
        : subjectYearRange.startISO && subjectYearRange.endISO
          ? fetchLedgerEntriesForSubjects({ subjectNumbers, startISO: subjectYearRange.startISO, endISO: subjectYearRange.endISO, includeChildren: true })
          : Promise.resolve({} as Record<string, LedgerEntry[]>),
    ]);
    const sheets: { name: string; subjectTitle: string; rows: LedgerRow[] }[] = [];
    for (const subject of allSubjects) {
      const subjectNumber = String(subject.subject_number ?? '').trim();
      const subjectName = String(subject.subject_name ?? '').trim();
      let subjectEntries = periodEntriesMap[subjectNumber] || [];
      const summaryKeyword = String(queryParams.value.summary || '').trim();
      if (summaryKeyword) subjectEntries = subjectEntries.filter((item) => String(item.summary || '').includes(summaryKeyword));
      subjectEntries = sortLedgerEntries(subjectEntries, queryParams.value.sortBy);
      const subjectBalanceRow = (balanceRows || []).find((item) => String(item?.subjectCode ?? '').trim() === subjectNumber);
      const subjectYearEntries = yearEntriesMap[subjectNumber] || [];
      const subjectBalanceYearDebit = moneyNumber(subjectBalanceRow?.yearDebit ?? 0);
      const subjectBalanceYearCredit = moneyNumber(subjectBalanceRow?.yearCredit ?? 0);
      const subjectFallbackYearDebit = moneyNumber(sumByMoney(subjectYearEntries, (item) => item.debit));
      const subjectFallbackYearCredit = moneyNumber(sumByMoney(subjectYearEntries, (item) => item.credit));
      const subjectBalanceOpening = getOpeningBalanceFromBalanceRows(balanceRows, subjectNumber, subject.balance_direction);
      const subjectPriorEntries = priorEntriesMap[subjectNumber] || [];
      const subjectPriorOpening = getOpeningBalanceFromPriorData({ openings: openingRows, priorEntries: subjectPriorEntries, subjectCode: subjectNumber, balanceDirection: subject.balance_direction });
      const subjectRows = buildRowsByEntries({ periodStart: queryParams.value.periodStart, periodEnd: queryParams.value.periodEnd, subjectTitle: [subjectNumber, subjectName].filter(Boolean).join(' '), direction: Number(subject.balance_direction ?? 1) === 2 ? '贷' : '借', entries: subjectEntries, openingBalance: subjectPriorOpening.hasSource ? subjectPriorOpening.value : subjectBalanceOpening, yearDebit: hasNonZeroAmount(subjectBalanceYearDebit, subjectBalanceYearCredit) ? subjectBalanceYearDebit : subjectFallbackYearDebit, yearCredit: hasNonZeroAmount(subjectBalanceYearDebit, subjectBalanceYearCredit) ? subjectBalanceYearCredit : subjectFallbackYearCredit, yearEntries: subjectYearEntries });
      if (subjectRows.length > 0) sheets.push({ name: subjectNumber + subjectName, subjectTitle: [subjectNumber, subjectName].filter(Boolean).join(' '), rows: subjectRows });
    }
    if (sheets.length === 0) { ElMessage.warning('当前筛选科目都没有可导出的明细账数据'); return; }
    const period = safeFileNamePart(String(queryParams.value.periodStart || '') + '-' + String(queryParams.value.periodEnd || ''));
    const accountSet = safeFileNamePart(getAccountSetNameForFile());
    await downloadDetailLedgerWorkbook('明细账_全部科目_' + period + '_' + accountSet + '.xlsx', sheets);
  } catch (e: any) { console.error(e); ElMessage.error(e?.message || '导出失败'); }
  finally { exportLoading.value = false; }
}

type ImportLedgerLine = { rowNo: number; date: string; voucherNo: string; subjectCode: string; subjectName: string; summary: string; debit: number; credit: number };

function findHeaderRow(sheet: ExcelJS.Worksheet) {
  let headerRow = 0;
  sheet.eachRow((row, rowNumber) => { if (headerRow) return; const text = (row.values as any[]).map(normalizeExcelCellText).join('|'); if (text.includes('日期') && text.includes('凭证字号') && text.includes('科目编码')) headerRow = rowNumber; });
  return headerRow;
}

async function importDetailLedgerWorkbook(file: File) {
  if (!accountSetStore.currentId) { ElMessage.warning('请先选择账套'); return; }
  if (/\.xls$/i.test(file.name) && !/\.xlsx$/i.test(file.name)) throw new Error('当前导入使用 ExcelJS，只支持 .xlsx；请将该 .xls 明细账另存为 .xlsx 后再导入。');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const imported: ImportLedgerLine[] = [];
  workbook.worksheets.forEach((sheet) => {
    if (sheet.name === '导入说明') return;
    const headerRow = findHeaderRow(sheet);
    if (!headerRow) return;
    const header = (sheet.getRow(headerRow).values as any[]).map(normalizeExcelCellText);
    const indexOf = (names: string[]) => header.findIndex((h) => names.some((name) => h.includes(name)));
    const dateCol = indexOf(['日期']); const voucherCol = indexOf(['凭证字号']); const codeCol = indexOf(['科目编码']); const nameCol = indexOf(['科目名称']); const summaryCol = indexOf(['摘要']); const debitCol = indexOf(['借方']); const creditCol = indexOf(['贷方']);
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;
      const date = normalizeExcelDate(row.getCell(dateCol).value);
      const summary = normalizeExcelCellText(row.getCell(summaryCol).value);
      const debit = normalizeExcelMoney(row.getCell(debitCol).value);
      const credit = normalizeExcelMoney(row.getCell(creditCol).value);
      const subjectCode = normalizeExcelCellText(row.getCell(codeCol).value);
      if (!date && !summary && debit === 0 && credit === 0) return;
      if (['期初余额', '本期合计', '本年累计'].includes(summary)) return;
      if (!date) throw new Error('第 ' + rowNumber + ' 行日期不能为空');
      if (!summary) throw new Error('第 ' + rowNumber + ' 行摘要不能为空');
      if (!subjectCode) throw new Error('第 ' + rowNumber + ' 行科目编码不能为空');
      if (debit <= 0 && credit <= 0) throw new Error('第 ' + rowNumber + ' 行借方/贷方金额不能同时为 0');
      if (debit > 0 && credit > 0) throw new Error('第 ' + rowNumber + ' 行不能同时填写借方和贷方金额');
      const subject = getSubjectInfoByCode(subjectCode);
      imported.push({ rowNo: rowNumber, date, voucherNo: normalizeExcelCellText(row.getCell(voucherCol).value), subjectCode, subjectName: normalizeExcelCellText(row.getCell(nameCol).value) || subject.name, summary, debit, credit });
    });
  });
  if (imported.length === 0) { ElMessage.warning('导入文件没有可导入的明细账分录'); return; }
  const groups = new Map<string, ImportLedgerLine[]>();
  imported.forEach((line) => { const key = line.date + '|' + (line.voucherNo || 'AUTO_' + line.rowNo); if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(line); });
  for (const [key, lines] of groups) {
    const debitTotal = moneyNumber(sumByMoney(lines, (item) => item.debit)); const creditTotal = moneyNumber(sumByMoney(lines, (item) => item.credit));
    if (debitTotal !== creditTotal) throw new Error('凭证借贷不平：' + key + '，借方 ' + debitTotal.toFixed(2) + '，贷方 ' + creditTotal.toFixed(2));
  }
  await ElMessageBox.confirm('将导入 ' + imported.length + ' 条明细账分录，生成 ' + groups.size + ' 张凭证到当前账套【' + getAccountSetNameForFile() + '】，是否继续？', '导入明细账', { type: 'warning', confirmButtonText: '导入', cancelButtonText: '取消' });
  importLoading.value = true;
  try {
    let count = 0;
    for (const [key, lines] of groups) {
      const [date, rawVoucherNo] = key.split('|');
      const voucherCode = rawVoucherNo && !rawVoucherNo.startsWith('AUTO_') ? rawVoucherNo : await getNextVoucherCodeByDate(date || getCurrentMonth(), '记');
      const details: ErpVoucherApi.VoucherDetail[] = lines.map((line, index) => ({ account_code: line.subjectCode, account_name: line.subjectName, abstract_content: line.summary, debit_amount: line.debit, credit_amount: line.credit, sort_no: index + 1 }));
      await createVoucher({ business_name: '明细账导入', business_code: voucherCode, voucher_type: '明细账导入', voucher_code: voucherCode, voucher_date: date, description: lines.map((line) => line.summary).filter(Boolean).join('；').slice(0, 200), is_posted: 0 }, details);
      count += 1;
    }
    ElMessage.success('导入完成：生成凭证 ' + count + ' 张');
    await loadSubjects(); await loadEntries();
  } finally { importLoading.value = false; }
}

function openImportFilePicker() {
  if (!accountSetStore.currentId) { ElMessage.warning('请先选择账套'); return; }
  importFileRef.value?.click();
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0]; input.value = '';
  if (!file) return;
  try { await importDetailLedgerWorkbook(file); }
  catch (e: any) { if (e === 'cancel' || e?.action === 'cancel' || e?.action === 'close') return; console.error(e); ElMessage.error(e?.message || '导入失败'); }
}

async function downloadImportTemplate() {
  const sampleSubject = activeSubject.value ? subjectTitle.value : '1002 银行存款';
  const sampleRows: LedgerRow[] = [
    { type: 'entry', date: String(queryParams.value.periodStart || getCurrentMonth()) + '-01', voucherNo: '记1', subject: sampleSubject, summary: '示例摘要', debit: 100, credit: 0, directionText: '借', balanceAbs: 100 },
    { type: 'entry', date: String(queryParams.value.periodStart || getCurrentMonth()) + '-01', voucherNo: '记1', subject: '1001 库存现金', summary: '示例摘要', debit: 0, credit: 100, directionText: '借', balanceAbs: 0 },
  ];
  await downloadDetailLedgerWorkbook('明细账导入模板_' + safeFileNamePart(getAccountSetNameForFile()) + '.xlsx', [{ name: '导入模板', subjectTitle: sampleSubject, rows: sampleRows }]);
}

function applyRoutePreset() {
  const month = String(route.query.month || '').trim();
  const periodStart = String(route.query.periodStart || '').trim();
  const periodEnd = String(route.query.periodEnd || '').trim();
  const subjectCode = String(route.query.subjectCode || '').trim();
  const subjectName = String(route.query.subjectName || '').trim();

  const start = periodStart || month;
  const end = periodEnd || periodStart || month;

  if (start || end) {
    queryParams.value.periodStart = start || end;
    queryParams.value.periodEnd = end || start;
  }

  if (subjectCode) {
    queryParams.value.startSubject = subjectCode;
    queryParams.value.endSubject = subjectCode;
    keyword.value = subjectCode || subjectName;
  }
}

async function applyFilters(params: DetailLedgerFilterParams) {
  const previousParams = { ...queryParams.value };
  const oldScopeKey = buildSubjectScopeKey(previousParams);
  const nextParams = normalizeFilterPeriods(params);
  const nextScopeKey = buildSubjectScopeKey(nextParams);
  const periodChanged = isPeriodChanged(previousParams, nextParams);
  updateSubjectOccurrenceRangeMode(nextParams, previousParams);
  queryParams.value = nextParams;

  if (!periodChanged && oldScopeKey === nextScopeKey && entriesCacheKey.value) {
    applyActiveSubjectFromCache();
    return;
  }

  resetEntryCaches();
  await loadSubjects();
  await loadEntries(true);
}

async function handlePeriodQuickQuery() {
  updateSubjectOccurrenceRangeMode(queryParams.value);
  resetEntryCaches();
  await loadSubjects();
  await loadEntries(true);
}

onMounted(async () => {
  applyRoutePreset();
  await loadSubjects();

  const routeSubjectCode = String(route.query.subjectCode || '').trim();
  if (routeSubjectCode) {
    const matched = subjectList.value.find(
      (s) => String(s.subject_number ?? '').trim() === routeSubjectCode,
    );
    if (matched) {
      activeSubject.value = matched;
    }
  }

  await loadEntries();
});

watch(activeSubject, () => {
  applyActiveSubjectFromCache();
});
</script>

<template>
  <Page auto-content-height class="h-full detail-ledger-page">
    <VoucherFormModal />

    <div class="detail-ledger-container">
      <div class="detail-ledger-toolbar">
        <div class="detail-ledger-toolbar__filters">
          <div class="filter-item filter-item--period">
            <span class="filter-label">会计期间</span>
            <ElDatePicker
              v-model="periodRange"
              class="period-picker"
              type="monthrange"
              range-separator="至"
              start-placeholder="开始月份"
              end-placeholder="结束月份"
              value-format="YYYY-MM"
              clearable
              @change="handlePeriodQuickQuery"
            />
          </div>

          <DetailLedgerFilter
            v-model:visible="filterPopoverVisible"
            :value="queryParams"
            embedded
            @confirm="applyFilters"
          >
            <template #reference>
              <ElButton>筛选条件</ElButton>
            </template>
          </DetailLedgerFilter>
        </div>

        <div class="detail-ledger-toolbar__actions">
          <ElButton type="primary" @click="handlePeriodQuickQuery">刷新</ElButton>

          <ElDropdown>
            <ElButton type="primary" :loading="printLoading">
              打印<span class="ml-1">▼</span>
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="printCurrent">打印当前科目</ElDropdownItem>
                <ElDropdownItem @click="printAllSubjects">打印全部科目</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <ElButton :loading="importLoading" @click="openImportFilePicker">导入</ElButton>
          <ElButton @click="downloadImportTemplate">下载导入模板</ElButton>

          <ElDropdown>
            <ElButton type="primary" :loading="exportLoading">
              导出<span class="ml-1">▼</span>
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="exportCurrent">导出当前科目</ElDropdownItem>
                <ElDropdownItem @click="exportAll">导出全部科目</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </div>

      <div class="detail-ledger-layout">
        <div class="subject-panel">
          <div class="subject-panel__header">
            <span>科目列表</span>
            <span class="subject-panel__count">{{ subjectCountText }}</span>
          </div>

          <div class="subject-panel__body">
            <div
              v-for="s in visibleSubjectNodes"
              :key="String(s.rowid || s.subject_number)"
              class="subject-tree-row"
              :class="{
                'subject-tree-row--active': activeSubject?.subject_number === s.subject_number,
              }"
              :style="{ paddingLeft: (8 + Math.max(s.level - 1, 0) * 16) + 'px' }"
              :title="[s.subject_number, s.subject_name].filter(Boolean).join(' ')"
              @click="pickSubject(s)"
            >
              <button
                class="subject-tree-toggle"
                type="button"
                @click.stop="toggleSubjectExpand(s)"
              >
                {{ s.children.length > 0 ? (isSubjectExpanded(s) ? '▼' : '▶') : '' }}
              </button>

              <div class="subject-tree-content">
                <span class="subject-tree-code">{{ s.subject_number }}</span>
                <span class="subject-tree-name">{{ s.subject_name }}</span>
                <span
                  v-if="!s.hasOwnEntries && s.children.length > 0"
                  class="subject-tree-tag"
                >
                  父级
                </span>
              </div>
            </div>

            <div
              v-if="!subjectLoading && filteredSubjects.length === 0"
              class="subject-panel__empty"
            >
              当前筛选条件下没有科目
            </div>
          </div>
        </div>

        <div class="ledger-panel">
          <div class="ledger-table-scroll">
            <table class="e2e-detail-ledger-table border-collapse border border-border text-sm">
              <colgroup>
                <col
                  v-for="c in LEDGER_COLUMNS"
                  :key="c.key"
                  :style="c.width ? 'width:' + c.width + 'px' : ''"
                />
              </colgroup>
              <thead>
                <tr class="bg-background">
                  <th
                    v-for="c in LEDGER_COLUMNS"
                    :key="c.key"
                    class="border border-border px-2 py-2 font-normal text-muted-foreground"
                    :class="{
                      'text-left': (c.align || 'left') === 'left',
                      'text-center': c.align === 'center',
                      'text-right': c.align === 'right',
                    }"
                  >
                    {{ c.title }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(r, idx) in rows"
                  :key="idx"
                  class="transition-colors hover:bg-muted"
                >
                  <td class="border border-border px-2 py-2">{{ r.date }}</td>
                  <td class="border border-border px-2 py-2">
                    <ElLink
                      v-if="r.type === 'entry' && r.voucherId"
                      type="primary"
                      :underline="false"
                      @click="openVoucherByRow(r)"
                    >
                      {{ r.voucherNo }}
                    </ElLink>
                    <span v-else>{{ r.voucherNo }}</span>
                  </td>
                  <td class="border border-border px-2 py-2">{{ r.subject }}</td>
                  <td class="border border-border px-2 py-2">{{ r.summary }}</td>
                  <td class="border border-border px-2 py-2 text-right">
                    {{ toMoney(r.debit) }}
                  </td>
                  <td class="border border-border px-2 py-2 text-right">
                    {{ toMoney(r.credit) }}
                  </td>
                  <td class="border border-border px-2 py-2 text-center">
                    {{ r.directionText }}
                  </td>
                  <td class="border border-border px-2 py-2 text-right">
                    {{ toMoney(r.balanceAbs) }}
                  </td>
                </tr>

                <tr v-if="loading || subjectLoading">
                  <td
                    colspan="8"
                    class="px-2 py-6 text-center text-sm text-muted-foreground"
                  >
                    加载中...
                  </td>
                </tr>

                <tr v-if="!loading && !subjectLoading && rows.length === 0">
                  <td
                    colspan="8"
                    class="px-2 py-6 text-center text-sm text-muted-foreground"
                  >
                    {{ activeSubject ? '当前科目及下级科目暂无发生明细' : '暂无数据' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="ledger-tip">
            左侧支持父子科目树形展开/收起；点击明细行“凭证字号”可直接查看对应凭证。
          </div>
        </div>
      </div>
    </div>

    <input ref="importFileRef" class="import-file-input" type="file" accept=".xlsx,.xls" @change="onImportFileChange" />
    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.detail-ledger-page :deep(.vben-page-content) {
  padding: 0;
}

.detail-ledger-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--el-fill-color-blank);
}

.detail-ledger-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.detail-ledger-toolbar__filters {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.filter-item--period {
  flex: 0 0 auto;
}

.period-picker {
  width: 260px;
}


.filter-label {
  flex: 0 0 auto;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}


.subject-count,
.subject-panel__count {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.detail-ledger-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.detail-ledger-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.subject-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.subject-panel__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.subject-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 6px 0;
}

.subject-tree-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 32px;
  padding: 0 8px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  cursor: pointer;
}

.subject-tree-row:hover,
.subject-tree-row--active {
  background: var(--el-fill-color-light);
}

.subject-tree-toggle {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  cursor: pointer;
}

.subject-tree-content {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.subject-tree-code {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.subject-tree-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject-tree-tag {
  flex: 0 0 auto;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.subject-panel__empty {
  padding: 24px 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
}

.ledger-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}

.ledger-table-scroll {
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.ledger-table-scroll::-webkit-scrollbar,
.subject-panel__body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.ledger-table-scroll::-webkit-scrollbar-track,
.subject-panel__body::-webkit-scrollbar-track {
  background: var(--el-fill-color-light);
}

.ledger-table-scroll::-webkit-scrollbar-thumb,
.subject-panel__body::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker);
  border: 2px solid var(--el-fill-color-light);
  border-radius: 999px;
}

.e2e-detail-ledger-table {
  width: 100%;
  min-width: 1040px;
  table-layout: fixed;
}

.e2e-detail-ledger-table th {
  white-space: nowrap;
  word-break: keep-all;
}

.e2e-detail-ledger-table td {
  word-break: normal;
}

.e2e-detail-ledger-table th:nth-child(4),
.e2e-detail-ledger-table td:nth-child(4) {
  min-width: 260px;
  white-space: normal;
  word-break: break-word;
}

.ledger-tip {
  flex: 0 0 auto;
  padding: 6px 12px 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.import-file-input {
  display: none;
}

.print-frame {
  position: fixed;
  right: 100%;
  bottom: 100%;
  width: 0;
  height: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 1180px) {
  .detail-ledger-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .detail-ledger-toolbar__filters,
  .detail-ledger-toolbar__actions {
    width: 100%;
  }

  .detail-ledger-toolbar__actions {
    justify-content: flex-start;
  }

  .detail-ledger-layout {
    grid-template-columns: 230px minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .detail-ledger-toolbar__filters {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }


  .detail-ledger-layout {
    grid-template-columns: 1fr;
  }

  .subject-panel {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}
</style>
