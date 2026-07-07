<script lang="ts" setup>
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { useUserStore } from '@vben/stores';
import { useRoute, useRouter } from 'vue-router';
import { useAccountSetStore } from '#/store/account-set';
import { formatDate } from '@vben/utils';

import {
  ArrowLeft,
  ArrowRight,
  Document,
  FolderOpened,
  Printer,
} from '@element-plus/icons-vue';
import {
  ElButton,
  ElDatePicker,
  ElDrawer,
  ElInput,
  ElInputNumber,
  ElLink,
  ElMessage,
  ElOption,
  ElPopover,
  ElSelect,
} from 'element-plus';

import { fetchLedgerEntries } from '#/api/erp/finance/ledger/detail';
import { fetchSubjectBalanceRows } from '#/api/erp/finance/ledger/subject-balance';
import { addMoney, moneyNumber, moneyText, subMoney, sumByMoney, toDecimal } from '#/utils/finance/decimal-money';
import { getFinanceAuxiliaryValueOptions } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import {
  assertPeriodNotClosedByDate,
  getClosedPeriodStatusByDate,
  getPeriodStatusByMonth,
  getPeriodStatusList,
} from '#/api/erp/finance/period-status';
import { linkBankjournalVoucher } from '#/api/erp/finance/funds/bankjournal';
import { linkCashdayVoucher } from '#/api/erp/finance/funds/cashday';
import {
  fetchAssetDepreciationList,
  saveAssetDepreciation,
} from '#/api/erp/finance/assets/summary';
import {
  fetchAssetChangeList,
  updateAssetChangeVoucher,
} from '#/api/erp/finance/assets/check-ledger';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import {
  createVoucher,
  getVoucher,
  getVoucherDetails,
  getVoucherDetailAuxiliaries,
  getVoucherMain,
  getVoucherPage,
  saveVoucherDetails,
  saveVoucherDetailAuxiliaries,
  updateVoucherMain,
} from '#/api/erp/finance/voucher';
import { generateDimensionByVoucherSave } from '#/api/erp/finance/dimension';
import { FileUpload } from '#/components/upload';
import VoucherEntryTable from '#/views/finance/Voucher/modules/VoucherEntryTable.vue';
import {
  buildVoucherPrintHtml,
  type VoucherPrintData,
} from '#/views/finance/print-templates/voucher';

defineOptions({ name: 'FinanceVoucherCreate' });
const emit = defineEmits<{ (e: 'success', v: any): void }>();
const route = useRoute();
const router = useRouter();
const tabs = useTabs();
const accountSetStore = useAccountSetStore();

type Mode = 'create' | 'detail' | 'edit';

type VoucherAuxiliaryValue = {
  dimCode: string;
  label: string;
  value?: string;
  valueName?: string;
};

type VoucherEntry = {
  auxiliaries?: VoucherAuxiliaryValue[];
  credit?: number;
  creditUpper?: string;
  debit?: number;
  debitUpper?: string;
  detailId?: string;
  rowid: string;
  sortNo?: number;
  subject?: string;
  summary?: string;
};

type VoucherFormData = {
  attachmentsCount: number;
  date: number;
  entries: VoucherEntry[];
  maker?: string;
  makerId?: string;
  mode: Mode;
  note?: string;
  voucherNo: number;
  voucherWord: string;
};

type NavigatorState = {
  currentIndex: number;
  insertionIndex: number;
  voucherDateRange: [string, string];
  voucherIds: string[];
};

type VoucherNavigatorCache = {
  auxiliaryMap: Record<string, any[]>;
  detailMap: Record<string, any[]>;
  key: string;
  mainMap: Record<string, any>;
  mains: any[];
  voucherIds: string[];
};

type SubjectLedgerCache = {
  balanceRowsMap: Record<string, Awaited<ReturnType<typeof fetchSubjectBalanceRows>>>;
  ledgerEntriesMap: Record<string, Awaited<ReturnType<typeof fetchLedgerEntries>>>;
};

type JournalVoucherSource = 'asset-change' | 'asset-depreciation' | 'bankjournal' | 'cashday';

type JournalVoucherSaveContext = {
  accountId?: string;
  returnPath?: string;
  rowIds: string[];
  source: JournalVoucherSource;
};

type VoucherSaveSuccessPayload = {
  closeAfter: boolean;
  voucherCode: string;
  voucherMainId: string;
};

type VoucherSaveSuccessHandler = (payload: VoucherSaveSuccessPayload) => Promise<boolean | void> | boolean | void;

const VOUCHER_LAST_DATE_STORAGE_KEY = 'finance_voucher_last_date';

const userStore = useUserStore();

function genId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toNumber(v: any, fallback = 0) {
  const n = toDecimal(v, fallback);
  return n.isFinite() ? n.toNumber() : fallback;
}

function getCurrentUserName() {
  const rawUserInfo = (userStore.userInfo as any)?.rawUserInfo ?? {};
  return String(
    (userStore.userInfo as any)?.nickname ??
      rawUserInfo?.UserName ??
      rawUserInfo?.username ??
      rawUserInfo?.userName ??
      rawUserInfo?.name ??
      '',
  ).trim();
}

function getCurrentUserId() {
  const rawUserInfo = (userStore.userInfo as any)?.rawUserInfo ?? {};
  return String(
    (userStore.userInfo as any)?.id ??
      rawUserInfo?.ROWID ??
      rawUserInfo?.ID ??
      rawUserInfo?.id ??
      '',
  ).trim();
}

function syncMakerFromCurrentUser() {
  const currentName = getCurrentUserName();
  const currentId = getCurrentUserId();
  if (currentName) form.maker = currentName;
  if (currentId) form.makerId = currentId;
}

function toMysqlDateTime(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function parseSubjectDisplay(text: string | undefined) {
  const s = String(text ?? '').trim();
  if (!s) return { code: '', name: '' };
  const parts = s.split(/\s+/);
  if (parts.length <= 1) return { code: s, name: '' };
  const [code, ...rest] = parts;
  const name = rest.join(' ').trim();
  return { code: code ?? '', name: name || '' };
}

function getVoucherNoteText(raw: any) {
  return pickNonEmptyText(
    raw?.note,
    raw?.remark,
    raw?.remarks,
    raw?.description,
  );
}

function getSubjectDisplayName(raw: any) {
  return String(
    raw?.subject_name ??
      raw?.subjectName ??
      raw?.account_name ??
      raw?.accountName ??
      raw?.name ??
      raw?.description ??
      '',
  ).trim();
}

function normalizeSubjectCurrentBalance(raw: any) {
  const candidates = [
    raw?.currentBalance,
    raw?.current_balance,
    raw?.endingBalance,
    raw?.ending_balance,
    raw?.subject_balance,
    raw?.balance,
    raw?.yue,
    raw?.remain,
    raw?.available,
    raw?.left,
  ];
  for (const item of candidates) {
    const n = Number(item);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
function getSubjectOpeningRawBalance(row: any) {
  return moneyNumber(subMoney(row?.openingDebit, row?.openingCredit));
}

function getSubjectEndingRawBalance(row: any) {
  return moneyNumber(subMoney(row?.endingDebit, row?.endingCredit));
}

function normalizeSubjectBalanceKey(code: any) {
  return String(code ?? '').trim().replace(/[\s._-]+/g, '');
}

function setBalanceMapValue(map: Map<string, number>, code: any, value: number) {
  const rawKey = String(code ?? '').trim();
  const normalizedKey = normalizeSubjectBalanceKey(code);
  if (rawKey) map.set(rawKey, value);
  if (normalizedKey) map.set(normalizedKey, value);
}

function addBalanceMapDelta(map: Map<string, number>, code: any, delta: number) {
  const rawKey = String(code ?? '').trim();
  const normalizedKey = normalizeSubjectBalanceKey(code);
  const key = normalizedKey || rawKey;
  if (!key) return;
  const base =
    (rawKey ? map.get(rawKey) : undefined) ??
    (normalizedKey ? map.get(normalizedKey) : undefined) ??
    0;
  setBalanceMapValue(map, code, moneyNumber(addMoney([base, delta])));
}

function getVoucherEntrySignedDelta(detail: any) {
  return moneyNumber(subMoney(detail?.debit_amount, detail?.credit_amount, 'round', 6));
}

function getLedgerPeriodStartMonth() {
  const start = formatDate(accountSetStore.currentStartDate).slice(0, 7);
  return start || formatDate(form.date).slice(0, 7);
}

function getLedgerRangeIsoForCurrentVoucher() {
  const startMonth = getLedgerPeriodStartMonth();
  const endMonth = formatDate(form.date).slice(0, 7);
  const [startISO] = getMonthIsoRange(new Date((startMonth || endMonth) + '-01').getTime());
  const [, endISO] = getMonthIsoRange(form.date);
  return {
    periodStart: startMonth || endMonth,
    periodEnd: endMonth || startMonth,
    startISO,
    endISO,
  };
}

function getSubjectDirectionByCode(code: string) {
  const opt = getSubjectOptionByCode(code);
  return Number((opt?.raw as any)?.balance_direction ?? 1) === 2 ? '贷' : '借';
}

function getOpeningBalanceFromBalanceRowsByLedger(
  balanceRows: Awaited<ReturnType<typeof fetchSubjectBalanceRows>>,
  subjectCode: string,
) {
  const code = normalizeSubjectBalanceKey(subjectCode);
  if (!code) return 0;
  const row = (balanceRows || []).find(
    (item) => normalizeSubjectBalanceKey(item?.subjectCode) === code,
  );
  if (!row) return 0;
  const direction = getSubjectDirectionByCode(subjectCode);
  const openingDebit = moneyNumber(row.openingDebit);
  const openingCredit = moneyNumber(row.openingCredit);
  return direction === '贷'
    ? moneyNumber(subMoney(openingCredit, openingDebit))
    : moneyNumber(subMoney(openingDebit, openingCredit));
}

function applyLedgerEntryToRunning(
  running: number,
  entry: { credit?: number; debit?: number },
  subjectCode: string,
) {
  const direction = getSubjectDirectionByCode(subjectCode);
  const debit = moneyNumber(entry.debit);
  const credit = moneyNumber(entry.credit);
  return direction === '贷'
    ? moneyNumber(addMoney([running, subMoney(credit, debit, 'round', 6)]))
    : moneyNumber(addMoney([running, subMoney(debit, credit, 'round', 6)]));
}

function isSameLedgerVoucher(entryVoucherNo: any, currentVoucherCode: string) {
  return compareVoucherCode(String(entryVoucherNo || ''), currentVoucherCode) === 0;
}

async function buildSubjectBalanceMapFromLedgerFlow(subjectCodes: string[]) {
  const uniqueCodes = Array.from(
    new Set(
      (subjectCodes || [])
        .map((code) => String(code ?? '').trim())
        .filter(Boolean),
    ),
  );
  if (uniqueCodes.length === 0) return { subjectBalanceMap: {}, rowBalanceMap: {} };

  const { periodStart, periodEnd, startISO, endISO } = getLedgerRangeIsoForCurrentVoucher();
  if (!periodStart || !periodEnd || !startISO || !endISO) return { subjectBalanceMap: {}, rowBalanceMap: {} };

  const currentVoucherCode = buildVoucherCode(form.voucherWord, form.voucherNo);
  const balanceRows = await getCachedSubjectBalanceRows(periodStart, periodEnd);
  const subjectBalanceMap: Record<string, number> = {};
  const rowBalanceMap: Record<string, number> = {};
  const currentVoucherId = String(editId.value || '').trim();

  for (const subjectCode of uniqueCodes) {
    let running = getOpeningBalanceFromBalanceRowsByLedger(balanceRows, subjectCode);
    let ledgerEntries = await getCachedLedgerEntries(subjectCode, startISO, endISO);
    if ((ledgerEntries || []).length === 0) {
      ledgerEntries = await getCachedLedgerEntries(
        normalizeSubjectBalanceKey(subjectCode),
        startISO,
        endISO,
      );
    }

    const sortedEntries = [...(ledgerEntries || [])].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      const vc = compareVoucherCode(a.voucherNo, b.voucherNo);
      if (vc !== 0) return vc;
      const sortA = Number((a as any).sortNo);
      const sortB = Number((b as any).sortNo);
      const hasSortA = Number.isFinite(sortA);
      const hasSortB = Number.isFinite(sortB);
      if (hasSortA && hasSortB && sortA !== sortB) return sortA - sortB;
      if (hasSortA !== hasSortB) return hasSortA ? -1 : 1;
      return String((a as any).detailId || '').localeCompare(String((b as any).detailId || ''));
    });

    let beforeCurrentVoucherBalance: number | undefined;
    for (const entry of sortedEntries) {
      const isCurrentVoucher =
        (currentVoucherId && String((entry as any).voucherId || '').trim() === currentVoucherId) ||
        isSameLedgerVoucher(entry.voucherNo, currentVoucherCode);

      if (isCurrentVoucher && beforeCurrentVoucherBalance === undefined) {
        beforeCurrentVoucherBalance = running;
      }

      running = applyLedgerEntryToRunning(running, entry, subjectCode);

      if (isCurrentVoucher) {
        const detailId = String((entry as any).detailId || '').trim();
        if (detailId) rowBalanceMap[detailId] = running;
      }

      if (!isCurrentVoucher && compareVoucherCode(entry.voucherNo, currentVoucherCode) > 0) break;
    }

    const balanceBeforeCurrentVoucher = beforeCurrentVoucherBalance ?? running;
    const rawKey = String(subjectCode).trim();
    const normalizedKey = normalizeSubjectBalanceKey(subjectCode);
    if (rawKey) subjectBalanceMap[rawKey] = balanceBeforeCurrentVoucher;
    if (normalizedKey) subjectBalanceMap[normalizedKey] = balanceBeforeCurrentVoucher;
  }

  return { rowBalanceMap, subjectBalanceMap };
}

function buildVoucherCode(word: string, no: number) {
  const w = String(word ?? '').trim();
  const n = Number(no);
  return `${w}${Number.isFinite(n) ? Math.trunc(n) : ''}`;
}
function getRawVoucherCode(raw: any) {
  return pickNonEmptyText(
    raw?.voucher_code,
    raw?.ReportID,
    raw?.business_code,
  );
}

function pickNonEmptyText(...candidates: any[]) {
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

function parseVoucherWordNo(code: string): { no: number; word: string } {
  const s = String(code ?? '').trim();
  const m = s.match(/^(.+?)(\d+)$/);
  if (!m) return { word: '记', no: 1 };
  const word = String(m[1] ?? '').trim() || '记';
  const no = Number(m[2]);
  return { word, no: Number.isFinite(no) && no > 0 ? Math.trunc(no) : 1 };
}

function toTimestamp(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = new Date(v as any).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function getMonthIsoRange(value: number) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0).toISOString();
  const end = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
  return [start, end] as const;
}

function getStoredVoucherDate(): null | number {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(VOUCHER_LAST_DATE_STORAGE_KEY);
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function setStoredVoucherDate(value: Date | number | string) {
  if (typeof window === 'undefined') return;
  const ts = toTimestamp(value);
  if (!Number.isFinite(ts)) return;
  const formatted = formatDate(ts);
  if (!formatted) return;
  window.localStorage.setItem(VOUCHER_LAST_DATE_STORAGE_KEY, formatted);
}

function addMonths(dateValue: Date | number | string, months: number) {
  const date =
    dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return new Date();
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const monthEnd = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(day, monthEnd));
  return date;
}

function getMonthStartTimestamp(dateValue: Date | number | string) {
  const date =
    dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return Date.now();
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).getTime();
}

async function resolveCreateDefaultDate() {
  const storedDate = getStoredVoucherDate();
  if (storedDate !== null) {
    try {
      const closedRow = await getClosedPeriodStatusByDate({ date: storedDate });
      if (!closedRow) {
        createDateClosedTip.value = '';
        return storedDate;
      }
      createDateClosedTip.value = `期间 ${closedRow.period_code || formatDate(storedDate).slice(0, 7)} 已关账，新增凭证日期已自动调整到可用期间`;
      window.localStorage.removeItem(VOUCHER_LAST_DATE_STORAGE_KEY);
    } catch (error) {
      console.error(error);
    }
  }

  try {
    const rows = await getPeriodStatusList();
    const closedRows = (rows || []).filter(
      (item) => Number(item?.close_status || 0) === 1,
    );
    if (closedRows.length === 0) {
      createDateClosedTip.value = '';
      return Date.now();
    }

    closedRows.sort((a, b) => {
      const yearDiff =
        Number(b?.fiscal_year || 0) - Number(a?.fiscal_year || 0);
      if (yearDiff !== 0) return yearDiff;
      return Number(b?.period_month || 0) - Number(a?.period_month || 0);
    });

    const latestClosed = closedRows[0];
    const baseDate = new Date(
      Number(latestClosed?.fiscal_year || 0),
      Number(latestClosed?.period_month || 1) - 1,
      1,
    );
    return getMonthStartTimestamp(addMonths(baseDate, 1));
  } catch (error) {
    console.error(error);
    return Date.now();
  }
}

function parseNoFromVoucherCode(code: string, word: string): null | number {
  const w = String(word ?? '').trim();
  const s = String(code ?? '').trim();
  const m = s.match(new RegExp(String.raw`^${w}[-]?\s*(\d+)$`));
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function getVoucherWordSortWeight(word: string) {
  const normalized = String(word || '').trim();
  if (normalized.includes('记')) return 1;
  if (normalized.includes('收')) return 2;
  if (normalized.includes('付')) return 3;
  if (normalized.includes('转')) return 4;
  return 99;
}

function compareVoucherCode(a: string, b: string) {
  const pa = parseVoucherWordNo(a);
  const pb = parseVoucherWordNo(b);
  const wa = getVoucherWordSortWeight(pa.word);
  const wb = getVoucherWordSortWeight(pb.word);
  if (wa !== wb) return wa - wb;
  if (pa.no !== pb.no) return pa.no - pb.no;
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN');
}

function sortVoucherMains(list: any[]) {
  return [...(list || [])].sort((a, b) =>
    compareVoucherCode(getRawVoucherCode(a), getRawVoucherCode(b)),
  );
}

function getVoucherMainId(raw: any) {
  return pickNonEmptyText(raw?.rowid, raw?.row_id, raw?.id, raw?.voucher_id);
}

function getVoucherNavigatorCacheKey(voucherDateRange: [string, string]) {
  return voucherDateRange.join('~');
}

function clearVoucherNavigatorCache() {
  voucherNavigatorCache.value = null;
  subjectLedgerCache.value = {
    balanceRowsMap: {},
    ledgerEntriesMap: {},
  };
}

async function getCachedSubjectBalanceRows(periodStart: string, periodEnd: string) {
  const cacheKey = [periodStart, periodEnd].join('~');
  const cached = subjectLedgerCache.value.balanceRowsMap[cacheKey];
  if (cached) return cached;

  const rows = await fetchSubjectBalanceRows({ periodStart, periodEnd });
  subjectLedgerCache.value = {
    ...subjectLedgerCache.value,
    balanceRowsMap: {
      ...subjectLedgerCache.value.balanceRowsMap,
      [cacheKey]: rows || [],
    },
  };
  return rows || [];
}

async function getCachedLedgerEntries(subjectNumber: string, startISO: string, endISO: string) {
  const normalizedSubjectNumber = String(subjectNumber || '').trim();
  const cacheKey = [normalizedSubjectNumber, startISO, endISO].join('~');
  const cached = subjectLedgerCache.value.ledgerEntriesMap[cacheKey];
  if (cached) return cached;

  const rows = await fetchLedgerEntries({
    subjectNumber: normalizedSubjectNumber,
    startISO,
    endISO,
    includeChildren: false,
  });
  subjectLedgerCache.value = {
    ...subjectLedgerCache.value,
    ledgerEntriesMap: {
      ...subjectLedgerCache.value.ledgerEntriesMap,
      [cacheKey]: rows || [],
    },
  };
  return rows || [];
}

async function getMonthLastVoucherNo(word: string, dateValue: number) {
  const [start, end] = getMonthIsoRange(dateValue);
  const listRes = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [start, end],
    voucherCodePrefix: word,
  } as any);

  const items = Array.isArray(listRes?.list) ? (listRes.list as any[]) : [];
  let maxNo = 0;
  for (const it of items) {
    const raw = String(
      it?.voucher_code ?? it?.ReportID ?? it?.business_code ?? '',
    ).trim();
    const n = parseNoFromVoucherCode(raw, word);
    if (n !== null && n > maxNo) maxNo = n;
  }
  return maxNo;
}

async function syncVoucherNoByMonth(options?: { silent?: boolean }) {
  if (form.mode !== 'create') return;
  const word = String(form.voucherWord || '').trim() || '记';
  const maxNo = await getMonthLastVoucherNo(word, form.date);
  const nextNo = Math.max(1, maxNo + 1);
  const changed = form.voucherNo !== nextNo;
  form.voucherNo = nextNo;
  if (changed && !options?.silent) {
    ElMessage.info({
      message: `已按当前月份自动续号：${buildVoucherCode(word, nextNo)}`,
      duration: 1400,
      showClose: false,
    });
  }
}

function addMonthsKeepDay(dateValue: number | string | Date, months: number) {
  const date = dateValue instanceof Date ? new Date(dateValue.getTime()) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) throw new Error('日期无效，无法判断结转月份');
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

async function resolveVoucherDateNotClosed(dateValue: number | string | Date) {
  let currentDate = dateValue instanceof Date ? new Date(dateValue.getTime()) : new Date(dateValue);
  if (Number.isNaN(currentDate.getTime())) throw new Error('日期无效，无法判断结账月份');

  for (let i = 0; i < 24; i += 1) {
    const period = await getPeriodStatusByMonth({
      accountSetId: '',
      fiscalYear: currentDate.getFullYear(),
      periodMonth: currentDate.getMonth() + 1,
    });
    // 已结转损益但未结账的月份仍允许保存；只有已结账月份才自动顺延。
    if (Number(period?.close_status || 0) !== 1) {
      return { date: currentDate, period, shifted: i > 0 };
    }
    currentDate = addMonthsKeepDay(currentDate, 1);
  }

  throw new Error('后续期间均已结账，无法自动确定可用凭证月份');
}

async function ensureUniqueVoucherNoForCreate() {
  const word = String(form.voucherWord || '').trim() || '记';
  const maxNo = await getMonthLastVoucherNo(word, form.date);
  const nextNo = Math.max(maxNo + 1, Number(form.voucherNo) || 1);
  if (nextNo !== form.voucherNo) {
    form.voucherNo = nextNo;
    ElMessage.warning({
      message: `凭证字号重复，已自动调整为：${buildVoucherCode(word, nextNo)}`,
      duration: 1800,
      showClose: false,
    });
  }
}

function newEntry(sortNo?: number): VoucherEntry {
  return {
    rowid: genId(),
    sortNo,
    summary: '',
    subject: '',
    debit: undefined,
    credit: undefined,
    debitUpper: '',
    creditUpper: '',
    auxiliaries: [],
  };
}

function ensureMinVoucherEntryRows(minRows = 4) {
  if (!Array.isArray(form.entries)) {
    form.entries = [];
  }
  while (form.entries.length < minRows) {
    form.entries.push(newEntry());
  }
}

async function resetCreateStateForPagingFallback(options?: { keepDate?: boolean }) {
  returnToCreateAfterPaging.value = false;
  form.mode = 'create';
  editId.value = undefined;
  reverseSourceId.value = null;
  reverseCreatedId.value = null;
  deletedDetailIds.value = [];
  sourceBizType.value = '';
  form.attachmentsCount = 0;
  form.note = undefined;
  form.entries = Array.from({ length: 4 }, () => newEntry());
  attachmentUrls.value = [];
  attachmentDrawerVisible.value = false;
  syncMakerFromCurrentUser();
  if (!options?.keepDate) {
    form.date = await resolveCreateDefaultDate();
  }
  await syncVoucherNoByMonth({ silent: true }).catch((error) => {
    console.error('sync voucher no failed when fallback to create', error);
  });
}

const saving = ref(false);
const printLoading = ref(false);
const printFrameRef = ref<HTMLIFrameElement>();
const editId = ref<string | undefined>(undefined);
const deletedDetailIds = ref<string[]>([]);
const reverseSourceId = ref<null | string>(null);
const reverseCreatedId = ref<null | string>(null);
const modalOpen = ref(false);
const attachmentDrawerVisible = ref(false);
const attachmentUrls = ref<string[]>([]);
const paging = ref(false);
const navigatorState = ref<NavigatorState | null>(null);
const voucherNavigatorCache = ref<VoucherNavigatorCache | null>(null);
const subjectLedgerCache = ref<SubjectLedgerCache>({
  balanceRowsMap: {},
  ledgerEntriesMap: {},
});
const createDateClosedTip = ref('');
const voucherSwitchSeq = ref(0);
const journalVoucherSaveContext = ref<JournalVoucherSaveContext | null>(null);

type SubjectOption = {
  label: string;
  raw: BilSubjectApi.Subject & { currentBalance?: number };
  value: string;
};
const subjectLoading = ref(false);
const subjectOptions = ref<SubjectOption[]>([]);
const subjectOptionMap = ref<Record<string, SubjectOption>>({});
const subjectCurrentBalanceMap = ref<Record<string, number>>({});
const subjectLedgerRowBalanceMap = ref<Record<string, number>>({});
const subjectLoaded = ref(false);
const returnToCreateAfterPaging = ref(false);
const initializing = ref(false);
const sourceBizType = ref('');
const allowNonLeafSubjectInVoucher = computed(() => {
  const text = String(sourceBizType.value || '').trim();
  return text.includes('现金日记账') || text.includes('银行日记账');
});

type AuxiliaryOption = { label: string; value: string };
const auxiliaryOptionsMap = ref<Record<string, AuxiliaryOption[]>>({});

function normalizeAuxiliaryItemCode(item: any): string {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).trim();
  }
  if (typeof item === 'object') {
    return pickNonEmptyText(
      item.dimCode,
      item.dim_code,
      item.code,
      item.value,
      item.typeCode,
      item.type_code,
      item.auxCode,
      item.aux_code,
      item.name,
      item.label,
      item.title,
    );
  }
  return String(item).trim();
}

function normalizeAuxiliaryCodes(raw: any): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => normalizeAuxiliaryItemCode(x)).filter(Boolean);
  }
  if (typeof raw === 'object') {
    const code = normalizeAuxiliaryItemCode(raw);
    return code ? [code] : [];
  }
  const text = String(raw ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => normalizeAuxiliaryItemCode(x)).filter(Boolean);
    }
    const parsedCode = normalizeAuxiliaryItemCode(parsed);
    if (parsedCode) return [parsedCode];
  } catch {}
  return text.split(/[,，;；\s]+/).map((x) => x.trim()).filter(Boolean);
}

function normalizeAuxiliaryCode(code: string) {
  const key = String(code || '').trim().toLowerCase();
  const map: Record<string, string> = {
    aux001: 'CUSTOMER',
    aux002: 'SUPPLIER',
    aux003: 'STAFF',
    aux004: 'DEPT',
    aux005: 'PROJECT',
    aux006: 'PRODUCT',
    aux007: 'CASHFLOW',
    department: 'DEPT',
    dept: 'DEPT',
    '部门': 'DEPT',
    project: 'PROJECT',
    '项目': 'PROJECT',
    staff: 'STAFF',
    employee: 'STAFF',
    '职员': 'STAFF',
    partner: 'PARTNER',
    '往来单位': 'PARTNER',
    customer: 'CUSTOMER',
    '客户': 'CUSTOMER',
    supplier: 'SUPPLIER',
    '供应商': 'SUPPLIER',
    product: 'PRODUCT',
    '产品': 'PRODUCT',
  };
  return map[key] || String(code || '').trim().toUpperCase();
}

function getAuxiliaryLabel(code: string) {
  const map: Record<string, string> = {
    DEPT: '部门',
    PROJECT: '项目',
    STAFF: '职员',
    PARTNER: '往来单位',
    CUSTOMER: '客户',
    SUPPLIER: '供应商',
    PRODUCT: '存货',
    CASHFLOW: '现金流',
  };
  return map[normalizeAuxiliaryCode(code)] || code;
}

function normalizeAuxiliaryLabel(label: unknown, dimCode: string) {
  const raw = String(label ?? '').trim();
  const resolved = getAuxiliaryLabel(dimCode);
  if (!raw || /^AUX\d+$/i.test(raw) || raw === String(dimCode || '').trim()) return resolved;
  return raw;
}

function getAuxiliarySelectedName(dimCode: string, value?: string) {
  const normalizedCode = normalizeAuxiliaryCode(dimCode);
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return '';
  const options = auxiliaryOptionsMap.value?.[normalizedCode] || [];
  return String(
    options.find((item) => String(item.value) === normalizedValue)?.label ?? '',
  ).trim();
}

function normalizeVoucherAuxiliariesForSave(row: VoucherEntry) {
  return (row.auxiliaries || [])
    .map((aux) => {
      const dimCode = normalizeAuxiliaryCode(aux.dimCode);
      const value = String(aux.value ?? '').trim();
      if (!dimCode || !value) return null;
      return {
        dimCode,
        label: normalizeAuxiliaryLabel(aux.label, dimCode),
        value,
        valueName: getAuxiliarySelectedName(dimCode, value) || aux.valueName || value,
      };
    })
    .filter(Boolean) as VoucherAuxiliaryValue[];
}


function getSubjectAuxiliaryRawCodes(raw: any, kind: 'all' | 'required') {
  if (!raw) return [] as string[];
  const allCandidates = [
    raw?.auxiliary_accounting,
    raw?.auxiliaryAccounting,
    raw?.auxiliary_accounts,
    raw?.auxiliaryAccounts,
    raw?.auxiliary_items,
    raw?.auxiliaryItems,
    raw?.assist_accounting,
    raw?.assistAccounting,
    raw?.assist_items,
    raw?.assistItems,
    raw?.accounting_dimensions,
    raw?.accountingDimensions,
    raw?.dimension_codes,
    raw?.dimensionCodes,
    raw?.auxiliary_required,
    raw?.auxiliaryRequired,
  ];
  const requiredCandidates = [
    raw?.auxiliary_required,
    raw?.auxiliaryRequired,
    raw?.required_auxiliary,
    raw?.requiredAuxiliary,
    raw?.required_auxiliaries,
    raw?.requiredAuxiliaries,
    raw?.required_dimensions,
    raw?.requiredDimensions,
  ];
  const candidates = kind === 'required' ? requiredCandidates : allCandidates;
  return candidates.flatMap((item) => normalizeAuxiliaryCodes(item));
}

function collectSubjectAndParentOptions(subjectCode?: string) {
  const result: SubjectOption[] = [];
  const visited = new Set<string>();
  let current = getSubjectOptionByCode(subjectCode);

  while (current) {
    const currentNo = String(current.raw?.subject_number ?? current.value ?? '').trim();
    if (!currentNo || visited.has(currentNo)) break;
    visited.add(currentNo);
    result.push(current);

    const parentNo = String(current.raw?.parent_subject_number ?? '').trim();
    if (!parentNo || visited.has(parentNo)) break;
    current = getSubjectOptionByCode(parentNo);
  }

  return result;
}

function getSubjectAuxiliaryCodes(subjectCode?: string) {
  return [
    ...new Set(
      collectSubjectAndParentOptions(subjectCode)
        .flatMap((opt) => getSubjectAuxiliaryRawCodes(opt?.raw as any, 'all'))
        .map(normalizeAuxiliaryCode)
        .filter(Boolean),
    ),
  ];
}

function getSubjectAuxiliaryRequiredCodes(subjectCode?: string) {
  return [
    ...new Set(
      collectSubjectAndParentOptions(subjectCode)
        .flatMap((opt) => getSubjectAuxiliaryRawCodes(opt?.raw as any, 'required'))
        .map(normalizeAuxiliaryCode)
        .filter(Boolean),
    ),
  ];
}

function validateRequiredAuxiliaries(entries: VoucherEntry[]) {
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (!isEffectiveEntry(entry)) continue;
    const requiredCodes = getSubjectAuxiliaryRequiredCodes(entry.subject);
    if (requiredCodes.length === 0) continue;

    const list = Array.isArray(entry.auxiliaries) ? entry.auxiliaries : [];
    for (const code of requiredCodes) {
      const aux = list.find(
        (item) => normalizeAuxiliaryCode(item.dimCode) === code,
      );
      if (!String(aux?.value ?? '').trim()) {
        return {
          index,
          code,
          label: getAuxiliaryLabel(code),
        };
      }
    }
  }

  return null;
}

function syncRowAuxiliaries(row: VoucherEntry) {
  const subjectCodes = getSubjectAuxiliaryCodes(row.subject);
  const oldList = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
  const oldSelectedCodes = oldList
    .filter((item) => String(item.value ?? '').trim())
    .map((item) => normalizeAuxiliaryCode(item.dimCode))
    .filter(Boolean);

  // 科目辅助核算配置可能来自远程科目缓存。保存前如果缓存暂时取不到配置，
  // 不能把用户已选的部门/项目等辅助核算清空，否则明细 payload 会变成 auxiliaries: []。
  const codes = [
    ...new Set(subjectCodes.length > 0 ? subjectCodes : oldSelectedCodes),
  ];
  if (codes.length === 0) {
    row.auxiliaries = [];
    return;
  }

  const requiredCodes = new Set(getSubjectAuxiliaryRequiredCodes(row.subject));
  row.auxiliaries = codes.map((code) => {
    const old = oldList.find((item) => normalizeAuxiliaryCode(item.dimCode) === code);
    return {
      dimCode: code,
      label: normalizeAuxiliaryLabel(old?.label, code),
      required: requiredCodes.has(code),
      value: old?.value,
      valueName: old?.valueName,
    };
  });
}

async function loadAuxiliaryValueOptions() {
  try {
    const optionsMap = await getFinanceAuxiliaryValueOptions({
      dimCodes: ['CUSTOMER', 'SUPPLIER', 'DEPT', 'PROJECT', 'STAFF'],
    });
    auxiliaryOptionsMap.value = {
      ...auxiliaryOptionsMap.value,
      ...optionsMap,
      EMPLOYEE: optionsMap.EMPLOYEE || optionsMap.STAFF || [],
      STAFF: optionsMap.STAFF || optionsMap.EMPLOYEE || [],
    };
  } catch (error) {
    console.error('load auxiliary value options failed', error);
  }
}


function rememberSubjectOptions(list: SubjectOption[]) {
  const nextMap = { ...subjectOptionMap.value };
  for (const item of list) {
    const key = String(item?.value ?? '').trim();
    if (!key) continue;
    nextMap[key] = item;
  }
  subjectOptionMap.value = nextMap;
}

function getSubjectOptionByCode(code?: string) {
  const key = String(code ?? '').trim();
  if (!key) return undefined;
  return (
    subjectOptions.value.find((item) => String(item.value).trim() === key) ||
    subjectOptionMap.value[key]
  );
}

function patchSubjectCurrentBalance(code: string, delta: number) {
  const key = String(code ?? '').trim();
  const amount = Number(delta);
  if (!key || !Number.isFinite(amount) || Math.abs(amount) < 0.0001) return;

  const patch = (option?: SubjectOption) => {
    if (!option) return option;
    return {
      ...option,
      raw: {
        ...option.raw,
        currentBalance: moneyNumber(addMoney([normalizeSubjectCurrentBalance(option.raw), amount])),
      },
    } as SubjectOption;
  };

  let patchedOption: SubjectOption | undefined;
  let foundInList = false;
  subjectOptions.value = subjectOptions.value.map((item) => {
    if (String(item.value).trim() !== key) return item;
    foundInList = true;
    patchedOption = patch(item)!;
    return patchedOption;
  });

  const cached = subjectOptionMap.value[key];
  if (cached) {
    patchedOption = patch(cached)!;
  }

  if (!patchedOption) {
    patchedOption = {
      label: key,
      value: key,
      raw: {
        subject_number: key,
        subject_name: '',
        currentBalance: amount,
      } as any,
    };
  }

  if (!foundInList) {
    subjectOptions.value = [...subjectOptions.value, patchedOption];
  }

  subjectOptionMap.value = {
    ...subjectOptionMap.value,
    [key]: patchedOption,
  };
}

function applyCreatedVoucherToSubjectBalances(entries: VoucherEntry[]) {
  const deltaBySubject = new Map<string, number>();
  for (const entry of entries || []) {
    const subject = String(entry.subject ?? '').trim();
    if (!subject) continue;
    const delta = moneyNumber(subMoney(entry.debit, entry.credit));
    if (Math.abs(delta) < 0.0001) continue;
    deltaBySubject.set(subject, moneyNumber(addMoney([deltaBySubject.get(subject) || 0, delta])));
  }
  for (const [subject, delta] of deltaBySubject) {
    patchSubjectCurrentBalance(subject, delta);
  }
}

function setSubjectCurrentBalance(code: string, balance: number) {
  const key = String(code ?? '').trim();
  const amount = moneyNumber(balance);
  if (!key || !Number.isFinite(amount)) return;

  const patch = (option?: SubjectOption) => {
    if (!option) return option;
    return {
      ...option,
      raw: {
        ...option.raw,
        currentBalance: amount,
      },
    } as SubjectOption;
  };

  let patchedOption: SubjectOption | undefined;
  let foundInList = false;
  subjectOptions.value = subjectOptions.value.map((item) => {
    if (String(item.value).trim() !== key) return item;
    foundInList = true;
    patchedOption = patch(item)!;
    return patchedOption;
  });

  const cached = subjectOptionMap.value[key];
  if (cached) patchedOption = patch(cached)!;

  if (!patchedOption) {
    patchedOption = {
      label: key,
      value: key,
      raw: {
        subject_number: key,
        subject_name: '',
        currentBalance: amount,
      } as any,
    };
  }

  if (!foundInList) subjectOptions.value = [...subjectOptions.value, patchedOption];

  subjectOptionMap.value = {
    ...subjectOptionMap.value,
    [key]: patchedOption,
  };
}

function voucherOrderValue(raw: any) {
  const code = pickNonEmptyText(raw?.voucher_code, raw?.ReportID, raw?.business_code);
  return parseVoucherWordNo(code).no || 0;
}

async function refreshSubjectBalancesForCurrentVoucher() {
  const subjectCodes = form.entries
    .map((entry) => String(entry.subject ?? '').trim())
    .filter(Boolean);
  if (subjectCodes.length === 0) {
    subjectCurrentBalanceMap.value = {};
    subjectLedgerRowBalanceMap.value = {};
    return;
  }

  await loadSubjectOptions();

  try {
    const ledgerBalance = await buildSubjectBalanceMapFromLedgerFlow(subjectCodes);
    subjectCurrentBalanceMap.value = ledgerBalance.subjectBalanceMap;
    subjectLedgerRowBalanceMap.value = ledgerBalance.rowBalanceMap;
  } catch (error) {
    console.error('refresh subject balances from ledger flow failed', error);
    subjectCurrentBalanceMap.value = {};
    subjectLedgerRowBalanceMap.value = {};
  }
}

function getSubjectNameByOption(option?: SubjectOption) {
  const raw = option?.raw ?? {};
  const subjectName = getSubjectDisplayName(raw);
  if (subjectName) return subjectName;
  const parsed = parseSubjectDisplay(option?.label);
  return parsed.name;
}

function getParentSubjectNoByOption(option?: SubjectOption) {
  return String(option?.raw?.parent_subject_number ?? '').trim();
}

function buildSubjectNamePathByCode(code?: string) {
  const key = String(code ?? '').trim();
  if (!key) return '';

  const names: string[] = [];
  let current = getSubjectOptionByCode(key);
  let guard = 0;

  while (current && guard < 20) {
    const name = getSubjectNameByOption(current);
    if (name) names.unshift(name);
    const parentNo = getParentSubjectNoByOption(current);
    if (!parentNo) break;
    current = getSubjectOptionByCode(parentNo);
    guard += 1;
  }

  return names.join('-');
}

async function loadSubjectOptions(force = false) {
  if (subjectLoading.value) return;
  if (subjectLoaded.value && !force) return;

  subjectLoading.value = true;
  try {
    const res = await getSubjectList({
      pageNo: 1,
      page: 0,
      subject_state: 1,
    } as any);
    const list = Array.isArray(res?.list)
      ? (res.list as BilSubjectApi.Subject[])
      : [];

    const month = formatDate(form.date).slice(0, 7);
    const subjectBalanceMap = new Map<string, number>();
    if (month) {
      try {
        const balanceRows = await fetchSubjectBalanceRows({ month });
        for (const row of balanceRows || []) {
          if (!row?.subjectCode || row.isTotal) continue;
          setBalanceMapValue(
            subjectBalanceMap,
            row.subjectCode,
            getSubjectOpeningRawBalance(row),
          );
        }
      } catch (error) {
        console.error('load subject balance failed', error);
      }
    }

    const mapped = list
      .map((s) => {
        const no = String((s as any)?.subject_number ?? '').trim();
        const name = getSubjectDisplayName(s);
        const label = [no, name].filter(Boolean).join(' ').trim();
        return {
          label: label || no,
          value: no,
          raw: {
            ...s,
            currentBalance:
              subjectBalanceMap.get(no) ??
              subjectBalanceMap.get(normalizeSubjectBalanceKey(no)) ??
              normalizeSubjectCurrentBalance(s),
          },
        };
      })
      .filter((x) => Boolean(x.value));

    subjectOptions.value = mapped;
    rememberSubjectOptions(mapped);
    subjectLoaded.value = true;
  } catch (error) {
    console.error('loadSubjectOptions failed', error);
    subjectOptions.value = [];
  } finally {
    subjectLoading.value = false;
  }
}

async function subjectRemoteMethod(reason?: string) {
  if (reason === 'reload') {
    await loadSubjectOptions(true);
  }
}

const form = reactive<VoucherFormData>({
  mode: 'create',
  voucherWord: '记',
  voucherNo: 1,
  date: Date.now(),
  attachmentsCount: 0,
  note: undefined,
  maker: getCurrentUserName() || '会计002',
  makerId: getCurrentUserId() || '',
  entries: Array.from({ length: 4 }, () => newEntry()),
});

watch(
  attachmentUrls,
  (val) => {
    form.attachmentsCount = Array.isArray(val) ? val.filter(Boolean).length : 0;
  },
  { immediate: true, deep: true },
);

watch(
  () => form.entries.map((entry) => String(entry.subject ?? '').trim()).join('|'),
  () => {
    for (const entry of form.entries) {
      syncRowAuxiliaries(entry);
    }
  },
);

watch(
  () => [form.date, form.voucherWord, form.mode] as const,
  async ([, , mode], [, , oldMode]) => {
    if (mode !== 'create') return;
    if (!modalOpen.value) return;
    if (initializing.value || paging.value || saving.value) return;
    if (oldMode === 'edit' || oldMode === 'detail') return;
    await syncVoucherNoByMonth({ silent: true });
  },
);

watch(
  () =>
    [
      form.date,
      form.voucherWord,
      form.voucherNo,
      form.mode,
      editId.value,
    ] as const,
  async () => {
    if (!modalOpen.value) return;
    if (initializing.value || paging.value || saving.value) return;
    await refreshNavigator();
    if (form.mode !== 'create') {
      await refreshSubjectBalancesForCurrentVoucher();
    }
  },
);

const canPagePrev = computed(() => !saving.value && !paging.value);

const canPageNext = computed(() => !saving.value && !paging.value);

async function refreshNavigator(options?: { force?: boolean }) {
  const voucherDateRange = [...getMonthIsoRange(form.date)] as [string, string];
  const cacheKey = getVoucherNavigatorCacheKey(voucherDateRange);
  try {
    let cache = !options?.force && voucherNavigatorCache.value?.key === cacheKey
      ? voucherNavigatorCache.value
      : null;

    if (!cache) {
      const res = await getVoucherPage({
        pageNo: 1,
        page: 0,
        voucherDateRange,
      } as any);
      const mains = sortVoucherMains(Array.isArray(res?.list) ? res.list : []);
      const voucherIds = mains.map(getVoucherMainId).filter(Boolean);
      const mainMap = mains.reduce((map, item) => {
        const id = getVoucherMainId(item);
        if (id) map[id] = item;
        return map;
      }, {} as Record<string, any>);
      cache = {
        key: cacheKey,
        mains,
        voucherIds,
        mainMap,
        auxiliaryMap: {},
        detailMap: {},
      };
      voucherNavigatorCache.value = cache;
    }

    const mains = cache.mains;
    const voucherIds = cache.voucherIds;

    let currentIndex = -1;
    if (editId.value) {
      currentIndex = voucherIds.findIndex(
        (id) => id === String(editId.value || '').trim(),
      );
    }

    const currentCode = buildVoucherCode(form.voucherWord, form.voucherNo);
    let insertionIndex = mains.findIndex((item) => {
      const code = pickNonEmptyText(
        item?.voucher_code,
        item?.ReportID,
        item?.business_code,
      );
      return compareVoucherCode(code, currentCode) >= 0;
    });
    if (insertionIndex < 0) insertionIndex = voucherIds.length;
    if (currentIndex >= 0) insertionIndex = currentIndex;

    navigatorState.value = {
      voucherIds,
      currentIndex,
      insertionIndex,
      voucherDateRange,
    };
  } catch (error) {
    console.error('refresh voucher navigator failed', error);
    navigatorState.value = {
      voucherIds: [],
      currentIndex: -1,
      insertionIndex: 0,
      voucherDateRange,
    };
  }
}
function openAttachmentDrawer() {
  attachmentDrawerVisible.value = true;
}

function handleAttachmentUploadSuccess(payload: any) {
  const nextCount = Array.isArray(attachmentUrls.value)
    ? attachmentUrls.value.filter(Boolean).length
    : 0;
  form.attachmentsCount = nextCount;
  ElMessage.success(`附件上传成功：${payload?.fileName || '未命名文件'}`);
}

function handleDebitChange(row: VoucherEntry, val?: number) {
  if (val !== undefined && val > 0) row.credit = undefined;
}

function handleCreditChange(row: VoucherEntry, val?: number) {
  if (val !== undefined && val > 0) row.debit = undefined;
}

function handleSubjectSelect(row: VoucherEntry, option: SubjectOption) {
  rememberSubjectOptions([option]);
  const selectedCode = String(option?.value ?? '').trim();
  if (selectedCode) row.subject = selectedCode;
  syncRowAuxiliaries(row);
}

function handleAuxiliaryChange(row: VoucherEntry, auxiliaries: VoucherAuxiliaryValue[]) {
  const target = form.entries.find((item) => item.rowid === row.rowid) || row;
  target.auxiliaries = (auxiliaries || [])
    .map((item) => ({
      dimCode: normalizeAuxiliaryCode(item.dimCode),
      label: normalizeAuxiliaryLabel(item.label, item.dimCode),
      required: Boolean((item as any).required),
      value: String(item.value ?? '').trim(),
      valueName: String(item.valueName ?? '').trim(),
    }))
    .filter((item) => item.dimCode);
}

const totals = computed(() => {
  const debit = sumByMoney(form.entries, (r) => r.debit).toNumber();
  const credit = sumByMoney(form.entries, (r) => r.credit).toNumber();
  return {
    debit,
    credit,
    balanced: subMoney(debit, credit).abs().lessThan(0.0001),
  };
});

const voucherCodeText = computed(() =>
  buildVoucherCode(form.voucherWord, form.voucherNo),
);
const modalTitle = computed(() => {
  if (form.mode === 'detail') return '查看凭证';
  if (form.mode === 'edit') return '修改凭证';
  return '新增凭证';
});

watch(
  modalTitle,
  (title) => {
    tabs.setTabTitle(title);
  },
  { immediate: true },
);

async function handleDateChange(value: Date | number | string) {
  if (form.mode !== 'create') return;
  if (!modalOpen.value) return;
  if (paging.value || saving.value) return;
  setStoredVoucherDate(value);
  await loadSubjectOptions(true);
}

function addRow() {
  form.entries.push(newEntry());
}

function insertAfterRow(row: VoucherEntry) {
  const idx = form.entries.findIndex((x) => x.rowid === row.rowid);
  const nextIdx = idx === -1 ? form.entries.length : idx + 1;
  form.entries.splice(nextIdx, 0, newEntry());
}

function removeRow(row: VoucherEntry) {
  if (form.mode === 'detail') return;
  if (form.entries.length <= 1) {
    clearRow(form.entries[0]!);
    return;
  }
  if (row.detailId) deletedDetailIds.value.push(String(row.detailId));
  const idx = form.entries.findIndex((x) => x.rowid === row.rowid);
  if (idx !== -1) form.entries.splice(idx, 1);
  if (form.entries.length === 0) form.entries.push(newEntry());
}

function clearRow(row: VoucherEntry) {
  if (form.mode === 'detail') return;
  row.summary = '';
  row.subject = '';
  row.debit = undefined;
  row.credit = undefined;
  row.debitUpper = '';
  row.creditUpper = '';
  row.auxiliaries = [];
}

function isEffectiveEntry(e: VoucherEntry) {
  const subject = String(e.subject ?? '').trim();
  const debit = toNumber(e.debit, 0);
  const credit = toNumber(e.credit, 0);
  return (
    Boolean(subject) || Math.abs(debit) > 0.0001 || Math.abs(credit) > 0.0001
  );
}

async function resetForNextCreate() {
  returnToCreateAfterPaging.value = false;
  form.mode = 'create';
  editId.value = undefined;
  reverseSourceId.value = null;
  reverseCreatedId.value = null;
  deletedDetailIds.value = [];
  form.attachmentsCount = 0;
  form.note = undefined;
  createDateClosedTip.value = '';
  form.entries = Array.from({ length: 4 }, () => newEntry());
  attachmentUrls.value = [];
  attachmentDrawerVisible.value = false;
  navigatorState.value = null;
  clearVoucherNavigatorCache();
  syncMakerFromCurrentUser();
  form.date = await resolveCreateDefaultDate();
  await syncVoucherNoByMonth({ silent: true });
  await refreshSubjectBalancesForCurrentVoucher();
  await refreshNavigator();
}

async function handleSave(closeAfter: boolean, afterSuccess?: VoucherSaveSuccessHandler) {
  if (form.mode === 'detail') return;
  if (!totals.value.balanced) {
    ElMessage.error('借贷不平衡，无法保存');
    return;
  }

  const effectiveEntries = form.entries.filter(isEffectiveEntry);
  if (effectiveEntries.length === 0) {
    ElMessage.error('请至少填写一条分录');
    return;
  }

  const invalidIdx = form.entries.findIndex((e) => {
    if (!isEffectiveEntry(e)) return false;
    return !String(e.summary ?? '').trim();
  });
  if (invalidIdx !== -1) {
    ElMessage.error(`第${invalidIdx + 1}行已填写科目/金额，摘要不能为空`);
    return;
  }

  // 保存前强制刷新科目配置，确保“科目设置”里刚设置的辅助核算必填项立即参与校验。
  // 否则凭证页如果复用了旧的科目缓存，auxiliary_required 仍可能为空，导致必填校验不触发。
  await loadSubjectOptions(true);

  for (const entry of form.entries) {
    if (isEffectiveEntry(entry)) syncRowAuxiliaries(entry);
  }

  const missingAuxiliary = validateRequiredAuxiliaries(form.entries);
  if (missingAuxiliary) {
    ElMessage.error(
      `第${missingAuxiliary.index + 1}行辅助核算【${missingAuxiliary.label}】为必填`,
    );
    return;
  }

  saving.value = true;
  try {
    if (form.mode === 'create') {
      const resolvedDate = await resolveVoucherDateNotClosed(form.date);
      if (resolvedDate.shifted) {
        form.date = resolvedDate.date.getTime();
        ElMessage.warning({
          message: `当前月份已结账，凭证日期已调整为 ${formatDate(form.date)}`,
          duration: 2200,
          showClose: false,
        });
      }
    }
    await assertPeriodNotClosedByDate({
      date: form.date,
      actionText: form.mode === 'create' ? '新增凭证' : '修改凭证',
    });
    syncMakerFromCurrentUser();
    if (form.mode === 'create') {
      await ensureUniqueVoucherNoForCreate();
    }

    const toDetailPayload = (e: VoucherEntry, sortNo: number) => {
      const subjectCode = String(e.subject ?? '').trim();
      const subjectOption = getSubjectOptionByCode(subjectCode);
      const parsed = parseSubjectDisplay(subjectOption?.label);
      const accountNamePath =
        buildSubjectNamePathByCode(subjectCode) ||
        getSubjectDisplayName(subjectOption?.raw) ||
        parsed.name ||
        '';

      return {
        abstract_content: String(e.summary ?? '').trim(),
        account_code: subjectCode,
        account_name: accountNamePath,
        debit_amount: e.debit ?? 0,
        credit_amount: e.credit ?? 0,
        sort_no: sortNo,
        auxiliaries: normalizeVoucherAuxiliariesForSave({
          ...e,
          auxiliaries: Array.isArray(e.auxiliaries) ? e.auxiliaries : [],
        } as VoucherEntry),
      };
    };

    const effectiveEntryPayloads = form.entries
      .filter(isEffectiveEntry)
      .map((e, index) => {
        const payload = toDetailPayload(e, index + 1) as any;
        if (!e.detailId) payload.rowid = genId();
        return { entry: e, payload };
      });

    const detailsAdded = effectiveEntryPayloads
      .filter(({ entry }) => !entry.detailId)
      .map(({ payload }) => payload);
    const detailsChanged = effectiveEntryPayloads
      .filter(({ entry }) => Boolean(entry.detailId))
      .map(({ entry, payload }) => ({
        ...payload,
        rowid: String(entry.detailId),
      }));
    const clearedDetailIds = form.entries
      .filter((e) => Boolean(e.detailId) && !isEffectiveEntry(e))
      .map((e) => String(e.detailId));
    const detailsDeleted = [
      ...new Set(deletedDetailIds.value.concat(clearedDetailIds)),
    ]
      .filter(Boolean)
      .map((id) => ({ rowid: id }));

    const operatorName = String(form.maker ?? '').trim();
    const operatorId = String(form.makerId ?? '').trim();
    const voucherNote = String(form.note ?? '').trim();
    const voucherCode = buildVoucherCode(form.voucherWord, form.voucherNo);
    const voucherDate = toMysqlDateTime(form.date);
    const buildVoucherSyncRows = () =>
      effectiveEntryPayloads.map(({ entry, payload }) => ({
        ...payload,
        voucher_detail_id: String(entry.detailId || (payload as any).rowid || ''),
      }));

    const syncVoucherAuxAndDimension = async (voucherId: string) => {
      const normalizedVoucherId = String(voucherId || '').trim();
      if (!normalizedVoucherId) return;
      const syncRows = buildVoucherSyncRows();
      await saveVoucherDetailAuxiliaries({
        voucherId: normalizedVoucherId,
        rows: syncRows as any,
      });
      await generateDimensionByVoucherSave({
        voucherId: normalizedVoucherId,
        voucherCode,
        voucherDate,
        description: '凭证保存反向同步维度',
        operator: operatorId || operatorName,
        details: syncRows as any,
      });
    };

    const sourceBizTypeText = String(sourceBizType.value || '').trim();
    const mainDataBase = {
      voucher_code: voucherCode,
      voucher_date: voucherDate,
      description: voucherNote,
      note: voucherNote,
      business_name: sourceBizTypeText || undefined,
      voucher_type: sourceBizTypeText || undefined,
      is_posted: 0,
      debit_amount: totals.value.debit,
      credit_amount: totals.value.credit,
      operator: operatorName,
      createuser: operatorId || undefined,
      updateuser: operatorId || undefined,
    };

    let savedVoucherMainId = String(editId.value || '');

    if (form.mode === 'create') {
      if (reverseSourceId.value && reverseCreatedId.value) {
        await updateVoucherMain({
          rowid: reverseSourceId.value,
          is_reversed: 1,
          updateuser: operatorId || undefined,
        } as any);
      } else {
        const created = await createVoucher(
          { ...(mainDataBase as any), is_reversed: 0 },
          detailsAdded.concat(detailsChanged as any),
        );
        const createdVoucherId = String((created as any)?.rowid ?? '');
        savedVoucherMainId = createdVoucherId;
        await syncVoucherAuxAndDimension(createdVoucherId);
        if (reverseSourceId.value) {
          reverseCreatedId.value = String((created as any)?.rowid ?? '');
          await updateVoucherMain({
            rowid: reverseSourceId.value,
            is_reversed: 1,
            updateuser: operatorId || undefined,
          } as any);
        }
      }
    } else if (editId.value) {
      await updateVoucherMain({
        ...(mainDataBase as any),
        rowid: editId.value,
      });
      await saveVoucherDetails({
        added: detailsAdded,
        changed: detailsChanged as any,
        deleted: detailsDeleted as any,
        voucherId: editId.value,
      });
      savedVoucherMainId = String(editId.value || '');
      await syncVoucherAuxAndDimension(editId.value);
      deletedDetailIds.value = [];
    }

    if (form.mode === 'create') {
      applyCreatedVoucherToSubjectBalances(
        effectiveEntryPayloads.map(({ entry }) => entry),
      );
    }

    ElMessage.success('保存成功');
    emit('success', { ...form, attachmentUrls: [...attachmentUrls.value] });

    if (afterSuccess && savedVoucherMainId) {
      const handled = await afterSuccess({
        closeAfter,
        voucherCode,
        voucherMainId: savedVoucherMainId,
      });
      if (handled) return;
    }

    clearVoucherNavigatorCache();
    await refreshNavigator({ force: true });

    if (form.mode === 'create') {
      setStoredVoucherDate(form.date);
    }

    if (closeAfter) {
      closePage();
      return;
    }

    await resetForNextCreate();
  } catch (error: any) {
    if (reverseSourceId.value && reverseCreatedId.value) {
      ElMessage.error(
        error?.message ||
          '红冲凭证已生成，但更新原凭证红冲状态失败，可再次点击保存重试',
      );
    } else {
      ElMessage.error(error?.message || '保存失败');
    }
  } finally {
    saving.value = false;
  }
}


async function handleAssetVoucherSaved(context: JournalVoucherSaveContext, voucherMainId: string, voucherCode: string) {
  if (context.source === 'asset-depreciation') {
    const rows = await fetchAssetDepreciationList();
    const targetIds = new Set(context.rowIds);
    await Promise.all(
      rows
        .filter((row) => targetIds.has(String(row.id || row.rowid || '').trim()))
        .map((row) =>
          saveAssetDepreciation({
            ...row,
            depreciation_status: 1,
            voucher_date: formatDate(form.date),
            voucher_generated: 1,
            voucher_no: voucherCode,
          }),
        ),
    );
  } else if (context.source === 'asset-change') {
    const rows = await fetchAssetChangeList();
    const targetIds = new Set(context.rowIds);
    await Promise.all(
      rows
        .filter((row) => targetIds.has(String(row.id || row.rowid || '').trim()))
        .map((row) =>
          updateAssetChangeVoucher(row, {
            voucherDate: formatDate(form.date),
            voucherGenerated: 1,
            voucherNo: voucherCode,
          }),
        ),
    );
  }
  const returnPath =
    getSafeReturnPath() ||
    context.returnPath ||
    (context.source === 'asset-depreciation'
      ? '/finance/assets/manage?tab=depreciationVoucher'
      : '/finance/assets/manage?tab=changeVoucher');
  if (returnPath.includes('?')) {
    router.push(returnPath.includes('moduleScope=') ? returnPath : returnPath + '&moduleScope=finance');
  } else {
    router.push({ path: returnPath, query: { moduleScope: 'finance' } });
  }
}

function createJournalVoucherSaveHandler(): VoucherSaveSuccessHandler | undefined {
  const context = journalVoucherSaveContext.value;
  if (!context || context.rowIds.length === 0) return undefined;

  return async ({ voucherMainId, voucherCode }) => {
    if (context.source === 'asset-depreciation' || context.source === 'asset-change') {
      await handleAssetVoucherSaved(context, voucherMainId, voucherCode);
      journalVoucherSaveContext.value = null;
      return true;
    }

    const rows = context.rowIds.map((id) => ({ id }));
    if (context.source === 'cashday') {
      await linkCashdayVoucher({ rows: rows as any, voucherMainId, voucherCode });
    } else {
      await linkBankjournalVoucher({ rows: rows as any, voucherMainId, voucherCode });
    }

    journalVoucherSaveContext.value = null;
    const returnPath = getSafeReturnPath() || context.returnPath || (context.source === 'cashday' ? '/finance/funds/cashday' : '/finance/funds/bankjournal');
    router.push({ path: returnPath, query: { moduleScope: 'finance' } });
    return true;
  };
}

function handleSaveClick(closeAfter: boolean) {
  handleSave(closeAfter, createJournalVoucherSaveHandler());
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (
    !modalOpen.value ||
    saving.value ||
    paging.value ||
    (e as any).isComposing
  )
    return;
  const keyLower = e.key?.toLowerCase?.() ?? '';
  const ctrlOrMeta = e.ctrlKey || e.metaKey;

  if (keyLower === 'escape') {
    if (attachmentDrawerVisible.value) {
      attachmentDrawerVisible.value = false;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    closePage();
    return;
  }

  if (form.mode === 'detail') return;

  if (ctrlOrMeta && keyLower === 's' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    handleSaveClick(false);
    return;
  }

  if (ctrlOrMeta && keyLower === 's' && e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    handleSaveClick(true);
    return;
  }

  if (ctrlOrMeta && e.altKey && keyLower === 'n') {
    e.preventDefault();
    e.stopPropagation();
    addRow();
  }
}

function bindHotkeys() {
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', handleGlobalKeydown, true);
}

function unbindHotkeys() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('keydown', handleGlobalKeydown, true);
}

onBeforeUnmount(() => {
  unbindHotkeys();
});

async function ensureCreateDateNotClosed() {
  if (form.mode !== 'create') return false;
  try {
    const closedRow = await getClosedPeriodStatusByDate({ date: form.date });
    if (!closedRow) {
      createDateClosedTip.value = '';
      return false;
    }
    window.localStorage.removeItem(VOUCHER_LAST_DATE_STORAGE_KEY);
    createDateClosedTip.value = `期间 ${closedRow.period_code} 已关账，新增凭证日期已自动调整到可用期间`;
    form.date = await resolveCreateDefaultDate();
    ElMessage.warning({
      message: createDateClosedTip.value,
      duration: 2200,
      showClose: false,
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function handleNew(initialDate?: number) {
  if (form.mode === 'detail') return;
  returnToCreateAfterPaging.value = false;
  form.mode = 'create';
  editId.value = undefined;
  form.voucherWord = '记';
  form.voucherNo = 1;
  form.date = initialDate ?? (await resolveCreateDefaultDate());
  form.attachmentsCount = 0;
  form.note = undefined;
  sourceBizType.value = '';
  form.entries = Array.from({ length: 4 }, () => newEntry());
  attachmentUrls.value = [];
  attachmentDrawerVisible.value = false;
  deletedDetailIds.value = [];
  navigatorState.value = null;
  syncMakerFromCurrentUser();
  await syncVoucherNoByMonth({ silent: true });
  await refreshNavigator();
}

type ModalOpenData = {
  id?: string;
  initial?: Partial<Omit<VoucherFormData, 'mode'>> & {
    attachmentUrls?: string | string[];
  };
  pager?: any;
  reverseSourceId?: string;
  type?: Mode;
};

function applyInitial(initial: ModalOpenData['initial']) {
  if (!initial) return;
  if (initial.voucherWord !== undefined)
    form.voucherWord = String(initial.voucherWord);
  if (initial.voucherNo !== undefined)
    form.voucherNo = Math.max(1, Math.trunc(Number(initial.voucherNo) || 1));
  if (initial.date !== undefined) form.date = toTimestamp(initial.date);
  if (initial.attachmentsCount !== undefined)
    form.attachmentsCount = Math.max(
      0,
      Math.trunc(Number(initial.attachmentsCount) || 0),
    );
  if (initial.note !== undefined) form.note = initial.note as any;
  if (initial.maker !== undefined) form.maker = String(initial.maker);
  if ((initial as any).makerId !== undefined)
    form.makerId = String((initial as any).makerId ?? '');
  if ((initial as any).attachmentUrls !== undefined) {
    const rawAttachmentUrls = (initial as any).attachmentUrls;
    attachmentUrls.value = Array.isArray(rawAttachmentUrls)
      ? rawAttachmentUrls.filter(Boolean)
      : String(rawAttachmentUrls || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
  }
  if (Array.isArray((initial as any).entries)) {
    const list = (initial as any).entries as Array<any>;
    form.entries =
      list.length > 0
        ? list.map((e) => ({
            rowid: genId(),
            sortNo: Number.isFinite(Number(e?.sortNo))
              ? Number(e.sortNo)
              : undefined,
            summary: String(e?.summary ?? ''),
            subject: String(e?.subject ?? '').trim(),
            debit: e?.debit === undefined ? undefined : moneyNumber(e.debit),
            credit: e?.credit === undefined ? undefined : moneyNumber(e.credit),
            debitUpper: '',
            creditUpper: '',
            auxiliaries: Array.isArray(e?.auxiliaries)
              ? e.auxiliaries.map((aux: any) => ({
                  dimCode: normalizeAuxiliaryCode(aux?.dimCode ?? aux?.dim_code),
                  label: normalizeAuxiliaryLabel(
                    aux?.label,
                    normalizeAuxiliaryCode(aux?.dimCode ?? aux?.dim_code),
                  ),
                  value: aux?.value ?? aux?.value_code,
                  valueName: aux?.valueName ?? aux?.value_name,
                }))
              : [],
          }))
        : Array.from({ length: 4 }, () => newEntry());
  }
  ensureMinVoucherEntryRows();
  deletedDetailIds.value = [];
}

async function loadVoucherSafely(id: string) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) throw new Error('凭证 ID 为空');

  const cache = voucherNavigatorCache.value;
  const cachedMain = cache?.mainMap?.[normalizedId];
  const cachedDetails = cache?.detailMap?.[normalizedId];
  if (cachedMain && cachedDetails) {
    return {
      main: cachedMain,
      details: cachedDetails,
    };
  }

  if (cachedMain) {
    let details: any[] = [];
    try {
      details = await getVoucherDetails(normalizedId);
    } catch (error) {
      console.error('getVoucherDetails failed from navigator cache, render main with empty details', error);
      details = [];
    }
    if (voucherNavigatorCache.value?.key === cache?.key) {
      voucherNavigatorCache.value = {
        ...voucherNavigatorCache.value,
        detailMap: {
          ...voucherNavigatorCache.value.detailMap,
          [normalizedId]: Array.isArray(details) ? details : [],
        },
      };
    }
    return { main: cachedMain, details: Array.isArray(details) ? details : [] };
  }

  try {
    const voucher = await getVoucher(normalizedId);
    if (voucher?.main) {
      const details = Array.isArray(voucher.details) ? voucher.details : [];
      if (cache?.key && voucherNavigatorCache.value?.key === cache.key) {
        voucherNavigatorCache.value = {
          ...voucherNavigatorCache.value,
          mainMap: {
            ...voucherNavigatorCache.value.mainMap,
            [normalizedId]: voucher.main,
          },
          detailMap: {
            ...voucherNavigatorCache.value.detailMap,
            [normalizedId]: details,
          },
        };
      }
      return {
        main: voucher.main,
        details,
      };
    }
  } catch (error) {
    console.error('getVoucher failed, fallback to split loading', error);
  }

  const main = await getVoucherMain(normalizedId);
  if (!main) throw new Error('未找到凭证数据');

  let details: any[] = [];
  try {
    details = await getVoucherDetails(normalizedId);
  } catch (error) {
    console.error('getVoucherDetails failed, render main with empty details', error);
    details = [];
  }

  const normalizedDetails = Array.isArray(details) ? details : [];
  if (cache?.key && voucherNavigatorCache.value?.key === cache.key) {
    voucherNavigatorCache.value = {
      ...voucherNavigatorCache.value,
      mainMap: {
        ...voucherNavigatorCache.value.mainMap,
        [normalizedId]: main,
      },
      detailMap: {
        ...voucherNavigatorCache.value.detailMap,
        [normalizedId]: normalizedDetails,
      },
    };
  }

  return { main, details: normalizedDetails };
}
async function loadForEdit(id: string, options?: { mode?: Mode }) {
  deletedDetailIds.value = [];
  attachmentUrls.value = [];
  attachmentDrawerVisible.value = false;
  const voucher = await loadVoucherSafely(id);

  form.mode = options?.mode || form.mode;
  editId.value = String(id || '').trim();

  const main = voucher.main || ({} as any);
  sourceBizType.value = pickNonEmptyText(main.voucher_type, main.business_name, main.businessName);
  const code = pickNonEmptyText(
    main.voucher_code,
    main.ReportID,
    main.business_code,
  );
  const { word, no } = parseVoucherWordNo(code);
  form.voucherWord = word;
  form.voucherNo = no;
  form.date = toTimestamp(
    pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime),
  );
  form.attachmentsCount = 0;
  form.note = getVoucherNoteText(main);
  form.maker = String(
    pickNonEmptyText(
      main.operator,
      main.UserName,
      getCurrentUserName(),
      form.maker,
    ),
  );
  form.makerId = String(
    pickNonEmptyText(
      main.createuser,
      main.updateuser,
      getCurrentUserId(),
      form.makerId,
    ),
  );

  const normalizedId = String(id || '').trim();
  const navigatorCache = voucherNavigatorCache.value;
  const cachedAuxRows = normalizedId
    ? navigatorCache?.auxiliaryMap?.[normalizedId]
    : undefined;
  let detailAuxRows: any[] = Array.isArray(cachedAuxRows) ? cachedAuxRows : [];
  if (!cachedAuxRows) {
    try {
      detailAuxRows = await getVoucherDetailAuxiliaries(id);
      if (normalizedId && navigatorCache?.key && voucherNavigatorCache.value?.key === navigatorCache.key) {
        voucherNavigatorCache.value = {
          ...voucherNavigatorCache.value,
          auxiliaryMap: {
            ...voucherNavigatorCache.value.auxiliaryMap,
            [normalizedId]: Array.isArray(detailAuxRows) ? detailAuxRows : [],
          },
        };
      }
    } catch (error) {
      console.error('getVoucherDetailAuxiliaries failed, continue without auxiliaries', error);
      detailAuxRows = [];
    }
  }
  const detailAuxMap = new Map<string, VoucherAuxiliaryValue[]>();
  for (const aux of detailAuxRows || []) {
    const detailId = String((aux as any)?.voucher_detail_id ?? '').trim();
    if (!detailId) continue;
    const dimCode = normalizeAuxiliaryCode((aux as any)?.dim_code);
    const value = String((aux as any)?.value_code ?? '').trim();
    if (!dimCode || !value) continue;
    const list = detailAuxMap.get(detailId) || [];
    list.push({
      dimCode,
      label: getAuxiliaryLabel(dimCode),
      value,
      valueName: String((aux as any)?.value_name ?? '').trim(),
    });
    detailAuxMap.set(detailId, list);
  }

  const details = Array.isArray(voucher.details) ? voucher.details : [];
  const sortedDetails = [...details].sort((a: any, b: any) => {
    const rawSortA = Number(a?.sort_no);
    const rawSortB = Number(b?.sort_no);
    const hasSortA = Number.isFinite(rawSortA) && rawSortA > 0;
    const hasSortB = Number.isFinite(rawSortB) && rawSortB > 0;

    if (hasSortA && hasSortB && rawSortA !== rawSortB)
      return rawSortA - rawSortB;
    if (hasSortA !== hasSortB) return hasSortA ? -1 : 1;

    const timeA = new Date(a?.createtime ?? 0).getTime();
    const timeB = new Date(b?.createtime ?? 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return String(a?.rowid ?? '').localeCompare(String(b?.rowid ?? ''));
  });
  form.entries =
    sortedDetails.length > 0
      ? sortedDetails.map((d: any) => {
          const code2 = String(d?.account_code ?? '').trim();
          const name2 = getSubjectDisplayName(d);
          if (code2) {
            subjectOptionMap.value = {
              ...subjectOptionMap.value,
              [code2]: {
                label: [code2, name2].filter(Boolean).join(' ').trim() || code2,
                value: code2,
                raw: {
                  ...(d as any),
                  subject_number: code2,
                  subject_name: name2,
                } as any,
              },
            };
          }
          return {
            rowid: genId(),
            detailId: String(d?.rowid ?? ''),
            sortNo: Number.isFinite(Number(d?.sort_no))
              ? Number(d.sort_no)
              : undefined,
            summary: String(d?.abstract_content ?? ''),
            subject: code2,
            debit:
              d?.debit_amount === undefined
                ? undefined
                : moneyNumber(d.debit_amount),
            credit:
              d?.credit_amount === undefined
                ? undefined
                : moneyNumber(d.credit_amount),
            debitUpper: '',
            creditUpper: '',
            auxiliaries: detailAuxMap.get(String(d?.rowid ?? '').trim()) || [],
          } as VoucherEntry;
        })
      : Array.from({ length: 4 }, () => newEntry());
  ensureMinVoucherEntryRows();
  await refreshSubjectBalancesForCurrentVoucher();
}

async function preloadAdjacentVoucher(currentIndex: number) {
  const cache = voucherNavigatorCache.value;
  if (!cache) return;

  const adjacentIds = [currentIndex - 1, currentIndex + 1]
    .map((index) => String(cache.voucherIds[index] || '').trim())
    .filter(Boolean);

  for (const id of adjacentIds) {
    if (cache.detailMap[id]) continue;
    await loadVoucherSafely(id);
  }
}

async function switchVoucherByOffset(offset: -1 | 1) {
  if (saving.value || paging.value) return;

  paging.value = true;
  try {
    await refreshNavigator();
    const state = navigatorState.value;
    if (!state || state.voucherIds.length === 0) {
      if (form.mode === 'create') {
        await resetCreateStateForPagingFallback({ keepDate: true });
      }
      ElMessage.info('当前月份暂无可翻页凭证');
      return;
    }

    if (
      returnToCreateAfterPaging.value &&
      offset > 0 &&
      form.mode !== 'create'
    ) {
      await resetForNextCreate();
      return;
    }

    let targetIndex = -1;
    if (form.mode === 'create') {
      if (offset < 0) returnToCreateAfterPaging.value = true;
      targetIndex =
        offset < 0 ? state.insertionIndex - 1 : state.insertionIndex;
      if (targetIndex < 0 && offset > 0) targetIndex = 0;
      if (targetIndex >= state.voucherIds.length && offset < 0)
        targetIndex = state.voucherIds.length - 1;
    } else {
      returnToCreateAfterPaging.value = false;
      const currentIndex =
        state.currentIndex >= 0 ? state.currentIndex : state.insertionIndex;
      targetIndex = currentIndex + offset;
    }

    if (targetIndex < 0) {
      if (form.mode === 'create') {
        await resetCreateStateForPagingFallback({ keepDate: true });
      }
      ElMessage.info('已经是第一张凭证');
      return;
    }
    if (targetIndex >= state.voucherIds.length) {
      if (form.mode === 'create') {
        await resetCreateStateForPagingFallback({ keepDate: true });
      }
      ElMessage.info('已经是最后一张凭证');
      return;
    }

    const nextId = String(state.voucherIds[targetIndex] ?? '').trim();
    if (!nextId) {
      await resetCreateStateForPagingFallback({ keepDate: true });
      return;
    }

    try {
      const seq = voucherSwitchSeq.value + 1;
      voucherSwitchSeq.value = seq;
      const targetMode = form.mode === 'detail' ? 'detail' : 'edit';
      await loadForEdit(nextId, { mode: targetMode });
      if (seq !== voucherSwitchSeq.value) return;
      ensureMinVoucherEntryRows();
      await refreshNavigator();
      preloadAdjacentVoucher(targetIndex).catch((preloadError) => {
        console.error('preload adjacent voucher failed', preloadError);
      });
    } catch (error: any) {
      console.error('switch voucher failed', error);
      await resetCreateStateForPagingFallback({ keepDate: true });
      await refreshNavigator().catch((refreshError) => {
        console.error('refresh navigator after switch fallback failed', refreshError);
      });
      ElMessage.warning(error?.message || '目标凭证加载失败，已恢复新增凭证录入状态');
    }
  } finally {
    paging.value = false;
  }
}

function handlePrevVoucher() {
  switchVoucherByOffset(-1);
}

function handleNextVoucher() {
  switchVoucherByOffset(1);
}

function getEffectivePrintEntries() {
  return form.entries.filter(isEffectiveEntry);
}

function toVoucherPrintData(): VoucherPrintData {
  const lines = getEffectivePrintEntries().map((entry) => {
    const subjectCode = String(entry.subject ?? '').trim();
    const subjectOption = getSubjectOptionByCode(subjectCode);
    const parsed = parseSubjectDisplay(subjectOption?.label);
    const subjectName =
      buildSubjectNamePathByCode(subjectCode) ||
      getSubjectDisplayName(subjectOption?.raw) ||
      parsed.name ||
      '';
    const subjectText = [subjectCode, subjectName].filter(Boolean).join(' ');

    return {
      summary: String(entry.summary ?? '').trim(),
      subject: subjectText,
      debit: moneyNumber(entry.debit) || undefined,
      credit: moneyNumber(entry.credit) || undefined,
    };
  });

  return {
    id: String(editId.value ?? ''),
    company: String(accountSetStore.currentName || accountSetStore.displayName || '').trim(),
    date: formatDate(form.date),
    no: voucherCodeText.value,
    attachmentCount: Number(form.attachmentsCount ?? 0) || 0,
    maker: String(form.maker ?? '').trim(),
    lines,
  };
}

async function handlePrintCurrentVoucher() {
  const printEntries = getEffectivePrintEntries();
  if (printEntries.length === 0) {
    ElMessage.warning('请先填写凭证分录后再打印');
    return;
  }

  printLoading.value = true;
  try {
    const voucherRows = Math.max(4, Math.min(12, printEntries.length));
    const html = buildVoucherPrintHtml([toVoucherPrintData()], {
      voucherRows,
      verticalAlign: 'top',
    });
    const iframe = printFrameRef.value;
    if (!iframe) throw new Error('打印容器未准备好');

    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('无法获取打印文档');

    doc.open();
    doc.write(html);
    doc.close();

    await nextTick();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      printLoading.value = false;
    }, 120);
  } catch (error) {
    console.error(error);
    ElMessage.error('打印失败');
    printLoading.value = false;
  }
}

function getSafeReturnPath() {
  const raw = String(route.query.returnPath ?? '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '';
  return raw;
}

function isRouteRecycleMode() {
  return String(route.query.recycleMode ?? '').trim() === '1' || String(route.query.from ?? '').trim() === 'recycle';
}

function getRouteReturnQuery() {
  const keepKeys = [
    'accountSetId',
    'companyName',
    'endDate',
    'period',
    'moduleScope',
    'closeDate',
  ];
  const query: Record<string, any> = {};
  for (const key of keepKeys) {
    const value = route.query[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query[key] = value;
    }
  }
  query.moduleScope = query.moduleScope || 'finance';
  if (!query.period) {
    const month = getRouteReturnMonth();
    if (month) query.period = month;
  }
  if (!query.endDate && query.closeDate) query.endDate = query.closeDate;
  if (!query.endDate && query.period) {
    const [yearText, monthText] = String(query.period).split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (year && month) {
      const end = new Date(year, month, 0);
      query.endDate = `${year}-${String(month).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    }
  }
  return query;
}

function getRouteReturnMonth() {
  const raw = String(route.query.date ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const currentDate = formatDate(form.date);
  const currentMonth = currentDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(currentMonth) ? currentMonth : '';
}

function closePage() {
  const returnPath = getSafeReturnPath();
  const returnMonth = getRouteReturnMonth();
  const baseQuery = returnPath === '/finance/period/check'
    ? getRouteReturnQuery()
    : {
        moduleScope: 'finance',
        ...(returnMonth ? { date: returnMonth } : {}),
      };
  if (returnPath) {
    router.push({ path: returnPath, query: baseQuery });
    return;
  }
  router.push({
    name: isRouteRecycleMode() ? 'FinanceVoucherRecycle' : 'FinanceVoucher',
    query: baseQuery,
  });
}

function getRouteCreateDate() {
  const raw = String(route.query.date ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || !month || month < 1 || month > 12) return undefined;
  return new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
}

function getRouteMode(): Mode {
  const raw = String(route.query.type ?? '').trim();
  if (raw === 'detail' || raw === 'edit') return raw;
  return 'create';
}

function getRouteVoucherId() {
  return String(route.query.id ?? '').trim();
}

function getPeriodCloseSalesCostReturnQuery(draft: any) {
  const raw = draft?.returnQuery || {};
  const closeDate = String(raw.closeDate || raw.endDate || draft?.date || '').trim();
  const period = String(raw.period || closeDate.slice(0, 7) || route.query.date || '').trim();
  const companyName = String(raw.companyName || route.query.companyName || '').trim();
  const accountSetId = String(raw.accountSetId || route.query.accountSetId || '').trim();
  const moduleScope = String(raw.moduleScope || route.query.moduleScope || 'finance').trim();
  const endDate = String(raw.endDate || closeDate || '').trim();
  return {
    ...(accountSetId ? { accountSetId } : {}),
    ...(companyName ? { companyName } : {}),
    ...(endDate ? { endDate } : {}),
    ...(period ? { period } : {}),
    moduleScope,
  };
}

function consumePeriodCloseSalesCostVoucherDraft() {
  if (!['period-close', 'period-close-sales-cost'].includes(String(route.query.source ?? '').trim())) return false;
  if (typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem('finance_voucher_create_draft');
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw);
    if (!['period-close', 'period-close-sales-cost'].includes(String(draft?.source ?? '').trim())) return false;
    applyInitial({
      voucherWord: draft.voucherWord || '记',
      date: draft.date,
      attachmentsCount: draft.attachmentsCount || 0,
      note: draft.note || draft.bizLabel || '期末结转凭证',
      entries: Array.isArray(draft.entries) ? draft.entries : [],
    });
    sourceBizType.value = draft.sourceBizType || (draft.bizLabel ? `期末结转-${draft.bizLabel}` : '期末结转凭证');
    window.sessionStorage.removeItem('finance_voucher_create_draft');
    router.replace({
      path: route.path,
      query: {
        ...route.query,
        returnPath: String(draft.returnPath || '/finance/period/check'),
        ...getPeriodCloseSalesCostReturnQuery(draft),
      },
    });
    ElMessage.info({
      message: `已带入${draft.bizLabel || '期末结转'}凭证草稿，请确认后保存`,
      duration: 2200,
      showClose: false,
    });
    return true;
  } catch (error) {
    console.error(error);
    ElMessage.error('读取期末结转凭证草稿失败');
    return false;
  }
}

function normalizeDraftRowIds(value: any) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function consumeCashdayVoucherDraft() {
  if (String(route.query.source ?? '').trim() !== 'cashday') return false;
  if (typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem('finance_voucher_create_draft');
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw);
    if (draft?.source !== 'cashday') return false;
    applyInitial({
      voucherWord: draft.voucherWord || '记',
      date: draft.date,
      attachmentsCount: draft.attachmentsCount || 0,
      note: draft.note,
      entries: Array.isArray(draft.entries) ? draft.entries : [],
    });
    journalVoucherSaveContext.value = {
      accountId: String(draft.accountId || '').trim(),
      returnPath: getSafeReturnPath() || '/finance/funds/cashday',
      rowIds: normalizeDraftRowIds(draft.rowIds),
      source: 'cashday',
    };
    sourceBizType.value = '现金日记账';
    window.sessionStorage.removeItem('finance_voucher_create_draft');
    ElMessage.info({
      message: '已按现金日记账带入凭证分录，请确认摘要、会计科目和金额后保存',
      duration: 1800,
      showClose: false,
    });
    return true;
  } catch (error) {
    console.error(error);
    ElMessage.error('读取现金日记账凭证草稿失败');
    return false;
  }
}


function consumeReverseVoucherDraft() {
  if (String(route.query.source ?? '').trim() !== 'reverse') return false;
  if (typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem('finance_voucher_create_draft');
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw);
    if (draft?.source !== 'reverse') return false;
    applyInitial({
      voucherWord: draft.voucherWord || '记',
      voucherNo: draft.voucherNo,
      date: draft.date,
      attachmentsCount: draft.attachmentsCount || 0,
      note: draft.note,
      entries: Array.isArray(draft.entries) ? draft.entries : [],
    });
    reverseSourceId.value = String(
      draft.reverseSourceId || route.query.reverseSourceId || '',
    ).trim() || null;
    window.sessionStorage.removeItem('finance_voucher_create_draft');
    ElMessage.info({
      message: '已带入红冲凭证草稿，请确认后保存',
      duration: 1800,
      showClose: false,
    });
    return true;
  } catch (error) {
    console.error(error);
    ElMessage.error('读取红冲凭证草稿失败');
    return false;
  }
}


function consumeAssetVoucherDraft() {
  const source = String(route.query.source ?? '').trim();
  if (source !== 'asset-depreciation' && source !== 'asset-change') return false;
  if (typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem('finance_voucher_create_draft');
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw);
    if (draft?.source !== source) return false;
    applyInitial({
      voucherWord: draft.voucherWord || '记',
      date: draft.date,
      attachmentsCount: draft.attachmentsCount || 0,
      note: draft.note,
      entries: Array.isArray(draft.entries) ? draft.entries : [],
    });
    journalVoucherSaveContext.value = {
      returnPath:
        getSafeReturnPath() ||
        draft.returnPath ||
        (source === 'asset-depreciation'
          ? '/finance/assets/manage?tab=depreciationVoucher'
          : '/finance/assets/manage?tab=changeVoucher'),
      rowIds: normalizeDraftRowIds(draft.rowIds),
      source: source as JournalVoucherSource,
    };
    sourceBizType.value = source === 'asset-depreciation' ? '资产折旧/摊销' : '资产变更/处置';
    window.sessionStorage.removeItem('finance_voucher_create_draft');
    ElMessage.info({
      message: '已按资产业务带入凭证草稿，请确认摘要、会计科目和金额后保存',
      duration: 1800,
      showClose: false,
    });
    return true;
  } catch (error) {
    console.error(error);
    ElMessage.error('读取资产凭证草稿失败');
    return false;
  }
}

function consumeBankjournalVoucherDraft() {
  if (String(route.query.source ?? '').trim() !== 'bankjournal') return false;
  if (typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem('finance_voucher_create_draft');
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw);
    if (draft?.source !== 'bankjournal') return false;
    applyInitial({
      voucherWord: draft.voucherWord || '记',
      date: draft.date,
      attachmentsCount: draft.attachmentsCount || 0,
      note: draft.note,
      entries: Array.isArray(draft.entries) ? draft.entries : [],
    });
    journalVoucherSaveContext.value = {
      accountId: String(draft.accountId || '').trim(),
      returnPath: getSafeReturnPath() || '/finance/funds/bankjournal',
      rowIds: normalizeDraftRowIds(draft.rowIds),
      source: 'bankjournal',
    };
    sourceBizType.value = '银行日记账';
    window.sessionStorage.removeItem('finance_voucher_create_draft');
    ElMessage.info({
      message: '已按银行日记账带入凭证草稿，请确认后保存',
      duration: 1800,
      showClose: false,
    });
    return true;
  } catch (error) {
    console.error(error);
    ElMessage.error('读取银行日记账凭证草稿失败');
    return false;
  }
}

onMounted(async () => {
  modalOpen.value = true;
  initializing.value = true;
  bindHotkeys();

  try {
    const routeMode = getRouteMode();
    const routeId = getRouteVoucherId();
    if ((routeMode === 'detail' || routeMode === 'edit') && routeId) {
      await loadForEdit(routeId, { mode: routeMode });
      await refreshNavigator();
      await loadSubjectOptions(true);
      await refreshSubjectBalancesForCurrentVoucher();
      await loadAuxiliaryValueOptions();
      for (const entry of form.entries) syncRowAuxiliaries(entry);
      return;
    }

    const routeDate = getRouteCreateDate();
    await handleNew(routeDate);
    const appliedPeriodCloseSalesCostDraft = consumePeriodCloseSalesCostVoucherDraft();
    const appliedCashdayDraft = consumeCashdayVoucherDraft();
    const appliedBankjournalDraft = consumeBankjournalVoucherDraft();
    const appliedAssetDraft = consumeAssetVoucherDraft();
    const appliedReverseDraft = consumeReverseVoucherDraft();
    if (
      appliedPeriodCloseSalesCostDraft ||
      appliedCashdayDraft ||
      appliedBankjournalDraft ||
      appliedAssetDraft ||
      appliedReverseDraft
    ) {
      await syncVoucherNoByMonth({ silent: true });
      await refreshNavigator();
    }
    const dateAdjusted = await ensureCreateDateNotClosed();
    if (dateAdjusted) {
      await syncVoucherNoByMonth({ silent: true });
      await refreshNavigator();
    }
    await loadSubjectOptions(true);
    await loadAuxiliaryValueOptions();
  } finally {
    initializing.value = false;
  }
});
</script>

<template>
  <Page auto-content-height class="h-full voucher-create-page">
    <div class="voucher-shell">
      <div class="voucher-toolbar">
        <div class="voucher-toolbar__actions">
          <ElButton
            text
            class="voucher-pager-action"
            @click="closePage"
          >
            <ArrowLeft class="voucher-pager-action__icon" />
            <span class="voucher-toolbar__hint">返回</span>
          </ElButton>
          <ElButton
            v-if="form.mode !== 'detail'"
            type="primary"
            :icon="Document"
            :disabled="paging"
            :loading="saving"
            @click="handleSaveClick(false)"
          >
            保存
          </ElButton>
          <ElButton
            v-if="form.mode !== 'detail'"
            plain
            :icon="FolderOpened"
            :disabled="paging"
            :loading="saving"
            @click="handleSaveClick(true)"
          >
            保存并关闭
          </ElButton>
          <ElButton
            plain
            :icon="Printer"
            :disabled="paging"
            :loading="printLoading"
            @click="handlePrintCurrentVoucher"
          >
            打印
          </ElButton>
        </div>

        <div class="voucher-toolbar__pager">
          <ElButton
            text
            class="voucher-pager-action"
            :disabled="!canPagePrev"
            :loading="paging"
            @click="handlePrevVoucher"
          >
            <span class="voucher-toolbar__hint">上一页</span>
            <ArrowLeft class="voucher-pager-action__icon" />
          </ElButton>
          <ElButton
            text
            class="voucher-pager-action"
            :disabled="!canPageNext"
            :loading="paging"
            @click="handleNextVoucher"
          >
            <ArrowRight class="voucher-pager-action__icon" />
            <span class="voucher-toolbar__hint">下一页</span>
          </ElButton>
        </div>
      </div>

      <div class="voucher-info-strip">
        <div class="voucher-grid-field voucher-grid-field--word">
          <span class="voucher-grid-field__label">凭证字</span>
          <ElSelect
            v-model="form.voucherWord"
            class="voucher-select"
            :disabled="form.mode === 'detail' || paging"
          >
            <ElOption label="记" value="记" />
            <ElOption label="收" value="收" />
            <ElOption label="付" value="付" />
            <ElOption label="转" value="转" />
          </ElSelect>
          <span class="voucher-grid-field__suffix">字</span>
        </div>

        <div class="voucher-grid-field voucher-grid-field--no">
          <span class="voucher-grid-field__label">凭证号</span>
          <ElInputNumber
            v-model="form.voucherNo"
            :min="1"
            :precision="0"
            class="voucher-no-input"
            :disabled="form.mode === 'detail' || paging"
          />
          <span class="voucher-grid-field__suffix">号</span>
        </div>

        <div class="voucher-grid-field voucher-grid-field--date">
          <span class="voucher-grid-field__label">日期</span>
          <ElDatePicker
            v-model="form.date"
            type="date"
            value-format="x"
            class="voucher-date-input"
            :disabled="form.mode === 'detail' || paging"
            @change="handleDateChange"
          />
        </div>

        <div class="voucher-grid-field voucher-grid-field--attach">
          <span class="voucher-grid-field__label">附单据</span>
          <ElInputNumber
            v-model="form.attachmentsCount"
            :min="0"
            :precision="0"
            class="voucher-attach-input"
            :disabled="paging"
          />
          <span class="voucher-grid-field__suffix">张</span>
        </div>

        <ElLink
          type="primary"
          :underline="false"
          class="voucher-top-link voucher-top-link--attach"
          @click="openAttachmentDrawer"
        >
          <span class="voucher-inline-link"
            ><FolderOpened class="h-4 w-4" />附件上传</span
          >
        </ElLink>
        <ElPopover
          placement="bottom-end"
          trigger="click"
          :width="320"
          popper-class="voucher-note-popover"
        >
          <template #reference>
            <ElLink
              type="primary"
              :underline="false"
              class="voucher-top-link voucher-top-link--note"
            >
              <span class="voucher-inline-link" :title="form.note || '备注'">
                <Document class="h-4 w-4" />
                {{ form.note ? '查看备注' : '备注' }}
              </span>
            </ElLink>
          </template>
          <div class="voucher-note-popover__body">
            <div class="voucher-note-popover__title">凭证备注</div>
            <ElInput
              v-model="form.note"
              type="textarea"
              :rows="5"
              resize="none"
              maxlength="500"
              show-word-limit
              :readonly="form.mode === 'detail'"
              :placeholder="form.mode === 'detail' ? '暂无备注' : '请输入备注'"
            />
          </div>
        </ElPopover>
      </div>

      <div v-if="createDateClosedTip" class="voucher-period-warning">
        {{ createDateClosedTip }}
      </div>

      <div class="voucher-table-wrap">
        <div class="voucher-entry-section min-w-0 flex-1">
          <VoucherEntryTable
            :entries="form.entries"
            :auxiliary-options-map="auxiliaryOptionsMap"
            :mode="form.mode"
            :subject-options="subjectOptions"
            :subject-current-balance-map="subjectCurrentBalanceMap"
            :subject-ledger-row-balance-map="subjectLedgerRowBalanceMap"
            :subject-loading="subjectLoading"
            :subject-remote-method="subjectRemoteMethod"
            :allow-non-leaf-subject="allowNonLeafSubjectInVoucher"
            table-height="100%"
            @append="addRow"
            @insert-after="insertAfterRow"
            @remove="removeRow"
            @clear="clearRow"
            @debit-change="handleDebitChange"
            @credit-change="handleCreditChange"
            @subject-select="handleSubjectSelect"
            @auxiliary-change="handleAuxiliaryChange"
          />
        </div>
      </div>

      <div class="voucher-footer voucher-footer--bottom">
        <div class="voucher-total-inline">
          <span class="voucher-total-inline__label">合计：</span>
          <span class="voucher-total-inline__value">{{
            moneyText(totals.debit)
          }}</span>
          <span class="voucher-total-inline__separator">/</span>
          <span class="voucher-total-inline__value">{{
            moneyText(totals.credit)
          }}</span>
        </div>
        <div class="voucher-footer-meta">{{ formatDate(form.date) }}</div>
      </div>

      <div class="voucher-summary-strip voucher-summary-strip--bottom">
        <div class="voucher-summary-side">
          <span>制单人：{{ form.maker }}</span>
          <span :class="totals.balanced ? 'is-balance' : 'is-unbalance'">
            {{ totals.balanced ? '借贷平衡' : '借贷不平衡' }}
          </span>
        </div>
      </div>

      <iframe ref="printFrameRef" class="print-frame"></iframe>

      <ElDrawer
        v-model="attachmentDrawerVisible"
        direction="ltr"
        size="420px"
        :with-header="true"
        :append-to-body="true"
        :destroy-on-close="false"
        title="凭证附件"
      >
        <div class="voucher-attachment-drawer">
          <div class="voucher-attachment-drawer__meta">
            已上传 {{ form.attachmentsCount }} 张
          </div>
          <FileUpload
            v-model="attachmentUrls"
            directory="voucher-attachment"
            :limit="20"
            :file-size="20"
            :file-type="[
              'pdf',
              'doc',
              'docx',
              'xls',
              'xlsx',
              'ppt',
              'pptx',
              'txt',
              'png',
              'jpg',
              'jpeg',
            ]"
            :disabled="paging"
            @success="handleAttachmentUploadSuccess"
          />
        </div>
      </ElDrawer>
    </div>
  </Page>
</template>

<style scoped>
/* 凭证新增页面：响应式宽度 */
:global(.voucher-modal) {
  width: min(1460px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 24px) !important;
}

:global(.voucher-modal .el-dialog__body) {
  overflow: hidden;
}

.voucher-create-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.voucher-shell {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: calc(100vh - 150px);
  max-height: calc(100vh - 150px);
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  color: #303133;
}

.voucher-toolbar {
  position: relative;
  z-index: 20;
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 0;
  background: var(--el-bg-color-page, #f5f7fa);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.voucher-toolbar__actions,
.voucher-toolbar__pager,
.voucher-summary-strip,
.voucher-summary-main,
.voucher-summary-side,
.voucher-inline-link,
.voucher-table-wrap,
.voucher-footer,
.voucher-total-inline {
  display: flex;
  align-items: center;
}

.voucher-toolbar__actions,
.voucher-toolbar__pager,
.voucher-summary-main,
.voucher-summary-side,
.voucher-total-inline {
  gap: 8px;
}

.voucher-toolbar :deep(.el-button) {
  height: 28px;
  padding: 0 10px;
  border-radius: 4px;
}

.voucher-toolbar__hint {
  font-size: 12px;
  color: #606266;
}

.voucher-pager-action {
  min-width: 66px;
  height: 28px !important;
  padding: 0 6px !important;
  cursor: pointer;
  border-radius: 0 !important;
}

.voucher-pager-action :deep(.el-button__content) {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.voucher-pager-action__icon {
  width: 14px;
  height: 14px;
}

.voucher-pager-action:hover:not(.is-disabled) {
  background: var(--el-fill-color-light);
}

.voucher-pager-action:hover:not(.is-disabled) .voucher-toolbar__hint,
.voucher-pager-action:hover:not(.is-disabled) .voucher-pager-action__icon {
  color: var(--el-color-primary);
}

.voucher-info-strip {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: 160px 176px 150px 138px 86px 64px;
  gap: 0;
  align-items: stretch;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: hidden;
  box-sizing: border-box;
  padding: 4px 8px;
  background: #fafafa;
  border-top: 1px solid #dcdfe6;
  border-bottom: 1px solid #dcdfe6;
}

.voucher-grid-field,
.voucher-top-link {
  min-width: 0;
  border-right: 1px solid #e4e7ed;
}

.voucher-grid-field {
  display: grid;
  align-items: center;
  min-height: 30px;
  padding: 0 6px;
  column-gap: 4px;
}

.voucher-grid-field--word {
  grid-template-columns: 44px 82px 12px;
  justify-content: start;
}

.voucher-grid-field--no {
  grid-template-columns: 46px 88px 12px;
  justify-content: start;
}

.voucher-grid-field--date {
  grid-template-columns: 32px 106px;
  justify-content: start;
  max-width: none;
  padding-right: 4px;
}

.voucher-grid-field--attach {
  grid-template-columns: 46px 66px 12px;
  justify-content: start;
  border-right: 1px solid #dcdfe6;
}

.voucher-grid-field__label,
.voucher-grid-field__suffix {
  font-size: 12px;
  color: #303133;
  white-space: nowrap;
}

.voucher-select,
.voucher-no-input,
.voucher-date-input,
.voucher-attach-input {
  width: 100%;
}

.voucher-date-input {
  width: 100% !important;
  max-width: 106px;
}

:deep(.voucher-date-input.el-date-editor.el-input),
:deep(.voucher-date-input .el-input__wrapper) {
  width: 100% !important;
  max-width: 106px !important;
}

:deep(.voucher-date-input .el-input__wrapper) {
  padding-right: 4px !important;
  padding-left: 4px !important;
}

:deep(.voucher-date-input .el-input__inner) {
  font-size: 12px;
}

.voucher-top-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 6px;
  font-size: 12px;
}

.voucher-top-link--note {
  border-right: 0;
}

.voucher-inline-link {
  gap: 3px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voucher-inline-link :deep(svg) {
  width: 13px;
  height: 13px;
}

.voucher-info-strip :deep(.el-select__wrapper),
.voucher-info-strip :deep(.el-input__wrapper) {
  min-height: 24px;
  padding-right: 4px;
  padding-left: 4px;
}

.voucher-info-strip :deep(.el-input-number__decrease),
.voucher-info-strip :deep(.el-input-number__increase) {
  width: 20px;
}

.voucher-info-strip :deep(.el-input__inner) {
  font-size: 12px;
}

.voucher-info-strip :deep(.el-input-number) {
  width: 100% !important;
}

.voucher-info-strip :deep(.el-input-number .el-input__wrapper) {
  padding-right: 20px !important;
  padding-left: 20px !important;
}


.voucher-grid-field--word .voucher-select {
  width: 82px !important;
}

.voucher-grid-field--no .voucher-no-input {
  width: 88px !important;
}

.voucher-attach-input {
  width: 66px !important;
}

.voucher-grid-field--attach :deep(.el-input-number) {
  width: 66px !important;
}

.voucher-grid-field--attach :deep(.el-input-number .el-input__wrapper) {
  padding-right: 20px !important;
  padding-left: 20px !important;
}

.voucher-grid-field--attach :deep(.el-input__inner) {
  text-align: center;
}

.voucher-note-popover__body {
  width: 100%;
}

.voucher-note-popover__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.voucher-summary-strip {
  gap: 12px;
  justify-content: flex-end;
  padding: 6px 12px;
  background: #fff;
  border-bottom: 1px solid #dcdfe6;
}

.voucher-summary-strip--bottom {
  flex: none;
  margin-top: 0;
  min-height: 34px;
  border-top: 1px solid #dcdfe6;
  border-bottom: 0;
}

.voucher-period-warning {
  padding: 8px 12px;
  margin-top: 10px;
  font-size: 13px;
  color: #b88230;
  background: #fdf6ec;
  border: 1px solid #f3d19e;
  border-radius: 4px;
}

.voucher-attachment-drawer {
  padding: 4px;
}

.voucher-attachment-drawer__meta {
  margin-bottom: 12px;
  font-size: 12px;
  color: #909399;
}

.voucher-summary-code {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.voucher-summary-date,
.voucher-footer-meta {
  font-size: 12px;
  color: #909399;
}

.voucher-table-wrap {
  flex: 1 1 auto;
  gap: 0;
  align-items: flex-start;
  min-height: 0;
  overflow: hidden;
  padding-top: 8px;
}

.voucher-footer--bottom {
  flex: none;
  padding: 6px 12px;
  margin-top: auto;
  background: #fff;
  border-top: 1px solid #dcdfe6;
}

.voucher-entry-section {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
}

:global(.voucher-create-page .voucher-entry-section .voucher-entry-table) {
  flex: 1 1 auto;
  min-height: 0;
}

.voucher-footer {
  justify-content: space-between;
  padding: 6px 0 0;
}

.voucher-total-inline {
  gap: 6px;
  font-size: 14px;
}

.voucher-total-inline__label {
  color: #606266;
}

.voucher-total-inline__value {
  font-weight: 600;
  color: #303133;
}

.voucher-total-inline__separator {
  color: #909399;
}

.is-balance,
.is-unbalance {
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  border-radius: 2px;
}

.is-balance {
  color: #67c23a;
  background: #f0f9eb;
  border: 1px solid #d9ecff;
}

.is-unbalance {
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fde2e2;
}

:deep(.voucher-modal .el-input__wrapper),
:deep(.voucher-modal .el-select__wrapper),
:deep(.voucher-modal .el-textarea__inner) {
  border-radius: 3px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.voucher-modal .el-input-number),
:deep(.voucher-modal .el-date-editor.el-input) {
  width: 100%;
}

:deep(.voucher-modal .el-input-number .el-input__wrapper),
:deep(.voucher-modal .el-date-editor .el-input__wrapper) {
  border-radius: 3px;
}

@media (max-width: 1100px) {
  .voucher-info-strip {
    grid-template-columns: minmax(142px, 1fr) minmax(152px, 1.08fr) minmax(136px, 0.95fr) minmax(122px, 0.88fr) minmax(74px, 0.55fr) minmax(54px, 0.42fr);
    width: 100%;
    max-width: 100%;
    padding: 3px 6px;
    overflow-x: hidden;
    overflow-y: hidden;
  }

  .voucher-grid-field {
    min-height: 32px;
    padding: 0 6px;
  }

  .voucher-grid-field__label,
  .voucher-grid-field__suffix,
  .voucher-top-link {
    font-size: 12px;
  }
}

@media (max-width: 900px) {
  .voucher-toolbar,
  .voucher-summary-strip,
  .voucher-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
@media (max-width: 1280px) {
  :global(.voucher-modal) {
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
  }

  .voucher-toolbar {
    flex-wrap: wrap;
  }

  .voucher-toolbar__actions,
  .voucher-toolbar__pager {
    flex-wrap: wrap;
  }

  .voucher-info-strip {
    grid-template-columns: minmax(152px, 1fr) minmax(168px, 1.08fr) minmax(144px, 0.95fr) minmax(132px, 0.88fr) minmax(82px, 0.55fr) minmax(62px, 0.42fr);
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .voucher-table-wrap {
    width: 100%;
    overflow: hidden;
  }

  .voucher-table-wrap > .min-w-0 {
    min-width: 0;
  }

  :global(.voucher-create-page .voucher-entry-table .el-table__header-wrapper),
  :global(.voucher-create-page .voucher-entry-table .el-table__body-wrapper) {
    overflow-x: hidden !important;
  }
}

@media (max-width: 768px) {
  :global(.voucher-modal) {
    width: calc(100vw - 8px) !important;
    max-width: calc(100vw - 8px) !important;
  }

  .voucher-toolbar__actions :deep(.el-button),
  .voucher-toolbar__pager :deep(.el-button) {
    min-width: 72px;
    padding: 0 6px;
  }

  .voucher-info-strip {
    grid-template-columns: minmax(126px, 1fr) minmax(134px, 1.08fr) minmax(126px, 0.95fr) minmax(116px, 0.88fr) minmax(58px, 0.55fr) minmax(46px, 0.42fr);
    width: 100%;
    max-width: 100%;
    padding: 3px 6px;
  }

  .voucher-grid-field {
    min-height: 30px;
    padding: 0 4px;
  }

  .voucher-grid-field--word,
  .voucher-grid-field--no,
  .voucher-grid-field--attach {
    grid-template-columns: auto 1fr auto;
    column-gap: 2px;
  }

  .voucher-grid-field--date {
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 2px;
  }

  .voucher-grid-field__label,
  .voucher-grid-field__suffix,
  .voucher-top-link {
    font-size: 11px;
  }

  .voucher-summary-strip,
  .voucher-footer {
    width: 100%;
  }

  .voucher-summary-side {
    flex-wrap: wrap;
  }
}

@media (max-height: 720px) {
  .voucher-shell {
    height: calc(100vh - 132px);
    max-height: calc(100vh - 132px);
  }

  .voucher-toolbar :deep(.el-button) {
    height: 26px;
    padding: 0 8px;
  }

  .voucher-grid-field,
  .voucher-top-link {
    min-height: 32px;
  }

  .voucher-table-wrap {
    min-height: 0;
    padding-top: 6px;
  }

  .voucher-footer {
    padding-top: 4px;
  }

  .voucher-summary-strip--bottom {
    min-height: 30px;
    margin-top: 4px;
    padding-top: 4px;
    padding-bottom: 4px;
  }
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

/* voucher-entry-table-responsive-note */

</style>
