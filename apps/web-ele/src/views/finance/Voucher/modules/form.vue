<script lang="ts" setup>
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { addMoney, moneyNumber, moneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';
import { useUserStore } from '@vben/stores';
import { formatDate } from '@vben/utils';

import {
  ArrowLeft,
  ArrowRight,
  Document,
  FolderOpened,
  MoreFilled,
  Plus,
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
import { getSubjectOpeningList } from '#/api/erp/finance/settings/initial';
import { subjectYearBeginningToDebitPositiveRaw } from '#/utils/finance/subject-opening';
import {
  fetchAssetChangeList,
  updateAssetChangeVoucher,
} from '#/api/erp/finance/assets/check-ledger';
import {
  assertPeriodNotClosedByDate,
  getClosedPeriodStatusByDate,
  getPeriodStatusList,
} from '#/api/erp/finance/period-status';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import {
  createVoucher,
  getVoucher,
  getVoucherDetails,
  getVoucherDetailsByIds,
  getVoucherMain,
  getVoucherPage,
  saveVoucherDetails,
  updateVoucherMain,
} from '#/api/erp/finance/voucher';
import { FileUpload } from '#/components/upload';
import VoucherEntryTable from '#/views/finance/Voucher/modules/VoucherEntryTable.vue';

defineOptions({ name: 'VoucherFormModal' });
const emit = defineEmits<{ (e: 'success', v: any): void }>();

type Mode = 'create' | 'detail' | 'edit';

type VoucherEntry = {
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

type AssetChangeVoucherSaveContext = {
  rowIds: string[];
  source: 'asset-change';
};

const VOUCHER_LAST_DATE_STORAGE_KEY = 'finance_voucher_last_date';

const userStore = useUserStore();

function genId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toNumber(v: any, fallback = 0) {
  const n = moneyNumber(v);
  return Number.isFinite(n) ? n : fallback;
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
    const n = moneyNumber(item);
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

function normalizeVoucherSubjectKeyForLedger(code: any) {
  return String(code ?? '').trim().replace(/[\s._-]+/g, '');
}

function setVoucherSubjectBalanceMapValue(map: Record<string, number>, code: any, value: number) {
  const rawKey = String(code ?? '').trim();
  const normalizedKey = normalizeVoucherSubjectKeyForLedger(code);
  if (rawKey) map[rawKey] = value;
  if (normalizedKey) map[normalizedKey] = value;
}

function getVoucherSubjectDirectionByCode(code: string) {
  const opt = getSubjectOptionByCode(code);
  return Number((opt?.raw as any)?.balance_direction ?? 1) === 2 ? '贷' : '借';
}

function getVoucherLedgerRangeIso() {
  const d = new Date(form.date);
  const start = new Date(d.getFullYear(), 0, 1, 0, 0, 0).toISOString();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const periodStart = String(d.getFullYear()) + '-01';
  const periodEnd = String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return { endISO: end, periodEnd, periodStart, startISO: start };
}

function getVoucherOpeningBalanceFromLedgerRows(
  balanceRows: Awaited<ReturnType<typeof fetchSubjectBalanceRows>>,
  subjectCode: string,
) {
  const key = normalizeVoucherSubjectKeyForLedger(subjectCode);
  const row = (balanceRows || []).find(
    (item) => normalizeVoucherSubjectKeyForLedger(item?.subjectCode) === key,
  );
  if (!row) return 0;
  const direction = getVoucherSubjectDirectionByCode(subjectCode);
  const openingDebit = moneyNumber(row.openingDebit);
  const openingCredit = moneyNumber(row.openingCredit);
  return direction === '贷'
    ? moneyNumber(subMoney(openingCredit, openingDebit))
    : moneyNumber(subMoney(openingDebit, openingCredit));
}

function applyVoucherLedgerEntryToRunning(
  running: number,
  entry: { credit?: number; debit?: number },
  subjectCode: string,
) {
  const direction = getVoucherSubjectDirectionByCode(subjectCode);
  const debit = moneyNumber(entry.debit);
  const credit = moneyNumber(entry.credit);
  return direction === '贷'
    ? moneyNumber(addMoney([running, subMoney(credit, debit)]))
    : moneyNumber(addMoney([running, subMoney(debit, credit)]));
}

async function buildVoucherBalanceFromLedgerFlow(subjectCodes: string[]) {
  const uniqueCodes = Array.from(new Set((subjectCodes || []).map((x) => String(x ?? '').trim()).filter(Boolean)));
  const subjectBalanceMap: Record<string, number> = {};
  const rowBalanceMap: Record<string, number> = {};
  if (uniqueCodes.length === 0) return { rowBalanceMap, subjectBalanceMap };

  const { endISO, periodEnd, periodStart, startISO } = getVoucherLedgerRangeIso();
  const currentVoucherId = String(editId.value || '').trim();
  const currentVoucherCode = buildVoucherCode(form.voucherWord, form.voucherNo);
  const balanceRows = await fetchSubjectBalanceRows({ periodStart, periodEnd });

  for (const subjectCode of uniqueCodes) {
    let running = getVoucherOpeningBalanceFromLedgerRows(balanceRows, subjectCode);
    let ledgerEntries = await fetchLedgerEntries({
      subjectNumber: subjectCode,
      startISO,
      endISO,
      includeChildren: false,
    });
    if ((ledgerEntries || []).length === 0) {
      ledgerEntries = await fetchLedgerEntries({
        subjectNumber: normalizeVoucherSubjectKeyForLedger(subjectCode),
        startISO,
        endISO,
        includeChildren: false,
      });
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
        compareVoucherCode(entry.voucherNo, currentVoucherCode) === 0;
      if (isCurrentVoucher && beforeCurrentVoucherBalance === undefined) {
        beforeCurrentVoucherBalance = running;
      }

      running = applyVoucherLedgerEntryToRunning(running, entry, subjectCode);

      if (isCurrentVoucher) {
        const detailId = String((entry as any).detailId || '').trim();
        if (detailId) rowBalanceMap[detailId] = running;
      }

      if (!isCurrentVoucher && compareVoucherCode(entry.voucherNo, currentVoucherCode) > 0) break;
    }

    setVoucherSubjectBalanceMapValue(subjectBalanceMap, subjectCode, beforeCurrentVoucherBalance ?? running);
  }

  return { rowBalanceMap, subjectBalanceMap };
}

async function refreshVoucherEntryLedgerBalances() {
  const subjectCodes = getCurrentEntrySubjectCodes();
  if (subjectCodes.length === 0) {
    subjectCurrentBalanceMap.value = {};
    subjectLedgerRowBalanceMap.value = {};
    return;
  }
  await loadSubjectOptions();
  const balance = await buildVoucherBalanceFromLedgerFlow(subjectCodes);
  subjectCurrentBalanceMap.value = balance.subjectBalanceMap;
  subjectLedgerRowBalanceMap.value = balance.rowBalanceMap;
}

function getRawVoucherCode(raw: any) {
  return pickNonEmptyText(raw?.voucher_code, raw?.ReportID, raw?.business_code);
}

function buildVoucherCode(word: string, no: number) {
  const w = String(word ?? '').trim();
  const n = Number(no);
  return `${w}${Number.isFinite(n) ? Math.trunc(n) : ''}`;
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
  assetChangeVoucherSaveContext.value = null;
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
const editId = ref<string | undefined>(undefined);
const deletedDetailIds = ref<string[]>([]);
const reverseSourceId = ref<null | string>(null);
const reverseCreatedId = ref<null | string>(null);
const modalOpen = ref(false);
const initializing = ref(false);
const attachmentDrawerVisible = ref(false);
const attachmentUrls = ref<string[]>([]);
const paging = ref(false);
const navigatorState = ref<NavigatorState | null>(null);
const createDateClosedTip = ref('');
const voucherSwitchSeq = ref(0);
const assetChangeVoucherSaveContext = ref<AssetChangeVoucherSaveContext | null>(null);

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
const sourceBizType = ref('');
const allowNonLeafSubjectInVoucher = computed(() => {
  const text = String(sourceBizType.value || '').trim();
  return text.includes('现金日记账') || text.includes('银行日记账');
});

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
    deltaBySubject.set(subject, moneyNumber(addMoney([deltaBySubject.get(subject), delta])));
  }
  for (const [subject, delta] of deltaBySubject) {
    patchSubjectCurrentBalance(subject, delta);
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
    let subjectBalanceMap = new Map<string, number>();
    if (month) {
      try {
        subjectBalanceMap = await buildSubjectRunningBalanceBaseMap(month, list);
      } catch (error) {
        console.error('load subject running balance failed', error);
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
              subjectBalanceMap.get(no) ?? normalizeSubjectCurrentBalance(s),
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

function getCurrentVoucherBalanceBaseIndex() {
  const state = navigatorState.value;
  if (!state) return 0;
  if (form.mode === 'create') return Math.max(0, state.insertionIndex);
  if (state.currentIndex >= 0) return Math.max(0, state.currentIndex);
  return Math.max(0, state.insertionIndex);
}

function getCurrentEntrySubjectCodes() {
  return Array.from(
    new Set(
      (form.entries || [])
        .map((entry) => String(entry.subject ?? '').trim())
        .filter(Boolean),
    ),
  );
}

function addDeltaToSubjectMap(map: Map<string, number>, code: string, debit: any, credit: any) {
  const subjectCode = String(code ?? '').trim();
  if (!subjectCode) return;
  const delta = moneyNumber(subMoney(debit, credit));
  if (Math.abs(delta) < 0.0001) return;
  map.set(subjectCode, moneyNumber(addMoney([map.get(subjectCode) || 0, delta])));
}

function isProfitLossSubjectRaw(raw: any) {
  const typeText = String(raw?.subject_type ?? raw?.subjectType ?? '').trim();
  if (typeText === '5' || typeText.includes('损益')) return true;

  const code = String(raw?.subject_number ?? raw?.subject_code ?? raw?.account_code ?? '').trim();
  // 兼容账套未返回 subject_type 的情况：常见会计科目中 6 开头为损益类，5 开头为成本类。
  return /^6/.test(code);
}

function buildProfitLossSubjectSet(subjects: any[]) {
  const set = new Set<string>();
  for (const subject of subjects || []) {
    const code = String((subject as any)?.subject_number ?? (subject as any)?.subject_code ?? '').trim();
    if (code && isProfitLossSubjectRaw(subject)) set.add(code);
  }
  return set;
}

async function buildSubjectRunningBalanceBaseMap(month: string, subjects: BilSubjectApi.Subject[] = []) {
  const baseMap = new Map<string, number>();
  if (!month) return baseMap;

  const profitLossSubjects = buildProfitLossSubjectSet(subjects);
  const isProfitLossSubject = (code: string) => profitLossSubjects.has(String(code ?? '').trim());

  const targetSubjects = getCurrentEntrySubjectCodes();
  const targetSubjectSet = new Set(targetSubjects);

  // 详情/编辑页只计算当前凭证已经用到的科目，避免查询整张滚动余额视图。
  // 普通科目基准 = 期初 + 本月前凭证 + 本月小于当前凭证号的凭证；
  // 损益类科目每月结转后归零，基准从本月月初 0 开始，只叠加本月小于当前凭证号的凭证。
  // VoucherEntryTable 再实时叠加当前表单分录，最终就是 <= 当前凭证号。
  if (form.mode !== 'create' && editId.value) {
    if (targetSubjects.length === 0) return baseMap;

    const openingRows = await getSubjectOpeningList({
      pageNo: 1,
      page: 0,
      lingma_sys_is_delete: 0,
    } as any);
    for (const opening of (openingRows?.list || []) as any[]) {
      const code = String(opening?.subject_code || opening?.subject_number || '').trim();
      if (!targetSubjectSet.has(code)) continue;
      if (isProfitLossSubject(code)) {
        baseMap.set(code, 0);
        continue;
      }
      const direction = String(opening?.balance_direction ?? '').trim();
      baseMap.set(
        code,
        moneyNumber(
          subjectYearBeginningToDebitPositiveRaw(opening, direction),
        ),
      );
    }

    for (const code of targetSubjects) {
      if (isProfitLossSubject(code) && !baseMap.has(code)) baseMap.set(code, 0);
    }

    const date = new Date(form.date);
    const yearStart = new Date(date.getFullYear(), 0, 1, 0, 0, 0).toISOString();
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0).getTime();
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const currentVoucherId = String(editId.value || '').trim();
    const currentCode = buildVoucherCode(form.voucherWord, form.voucherNo);

    const voucherPage = await getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [yearStart, monthEnd],
    } as any);
    const beforeMonthVoucherIds = new Set<string>();
    const targetVoucherIds = sortVoucherMains(Array.isArray(voucherPage?.list) ? voucherPage.list : [])
      .filter((item) => {
        const id = String(item?.rowid || item?.row_id || '').trim();
        if (!id || id === currentVoucherId) return false;
        const time = new Date(pickNonEmptyText(item?.voucher_date, item?.createtime, item?.updatetime)).getTime();
        if (!Number.isFinite(time)) return false;
        if (time < monthStart) {
          beforeMonthVoucherIds.add(id);
          return true;
        }
        return compareVoucherCode(getRawVoucherCode(item), currentCode) < 0;
      })
      .map((item) => String(item?.rowid || item?.row_id || '').trim())
      .filter(Boolean);

    if (targetVoucherIds.length > 0) {
      const details = await getVoucherDetailsByIds(targetVoucherIds);
      for (const detail of details || []) {
        const code = String((detail as any)?.account_code ?? '').trim();
        if (!targetSubjectSet.has(code)) continue;
        const voucherId = String((detail as any)?.voucher_id ?? '').trim();
        if (isProfitLossSubject(code) && beforeMonthVoucherIds.has(voucherId)) continue;
        addDeltaToSubjectMap(baseMap, code, (detail as any)?.debit_amount, (detail as any)?.credit_amount);
      }
    }

    return baseMap;
  }

  const balanceRows = await fetchSubjectBalanceRows({ month });
  for (const row of balanceRows || []) {
    if (!row?.subjectCode || row.isTotal) continue;
    const code = String(row.subjectCode).trim();
    baseMap.set(
      code,
      isProfitLossSubject(code)
        ? moneyNumber(subMoney(row.currentDebit, row.currentCredit))
        : getSubjectEndingRawBalance(row),
    );
  }

  return baseMap;
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
  },
);

const canPagePrev = computed(() => !saving.value && !paging.value);

const canPageNext = computed(() => !saving.value && !paging.value);

async function refreshNavigator() {
  const voucherDateRange = [...getMonthIsoRange(form.date)] as [string, string];
  try {
    const res = await getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange,
    } as any);
    const mains = sortVoucherMains(Array.isArray(res?.list) ? res.list : []);
    const voucherIds = mains
      .map((item) => String(item?.rowid ?? '').trim())
      .filter(Boolean);

    let currentIndex = -1;
    if (editId.value) {
      currentIndex = voucherIds.findIndex(
        (id) => id === String(editId.value || '').trim(),
      );
    }

    const currentCode = buildVoucherCode(form.voucherWord, form.voucherNo);
    let insertionIndex = mains.findIndex((item) =>
      compareVoucherCode(getRawVoucherCode(item), currentCode) >= 0,
    );
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

function handleSubjectSelect(_row: VoucherEntry, option: SubjectOption) {
  rememberSubjectOptions([option]);
  refreshVoucherEntryLedgerBalances().catch((error) => {
    console.error('refresh voucher ledger balances after subject select failed', error);
  });
}

const totals = computed(() => {
  const debit = moneyNumber(sumByMoney(form.entries, (r) => r.debit));
  const credit = moneyNumber(sumByMoney(form.entries, (r) => r.credit));
  return {
    debit,
    credit,
    balanced: Math.abs(moneyNumber(subMoney(debit, credit))) < 0.0001,
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

async function handleDateChange(value: Date | number | string) {
  if (form.mode !== 'create') return;
  if (!modalOpen.value) return;
  if (initializing.value || paging.value || saving.value) return;
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
  sourceBizType.value = '';
  createDateClosedTip.value = '';
  form.entries = Array.from({ length: 4 }, () => newEntry());
  attachmentUrls.value = [];
  attachmentDrawerVisible.value = false;
  navigatorState.value = null;
  syncMakerFromCurrentUser();
  form.date = await resolveCreateDefaultDate();
  await syncVoucherNoByMonth({ silent: true });
  await refreshNavigator();
}

async function syncAssetChangeVoucherAfterSave(voucherCode: string) {
  const context = assetChangeVoucherSaveContext.value;
  if (!context || context.source !== 'asset-change' || context.rowIds.length === 0) {
    return false;
  }
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
  assetChangeVoucherSaveContext.value = null;
  return true;
}

async function handleSave(closeAfter: boolean) {
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

  saving.value = true;
  try {
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
        debit_amount: moneyNumber(e.debit),
        credit_amount: moneyNumber(e.credit),
        sort_no: sortNo,
      };
    };

    const effectiveEntryPayloads = form.entries
      .filter(isEffectiveEntry)
      .map((e, index) => ({
        entry: e,
        payload: toDetailPayload(e, index + 1),
      }));

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
    const voucherCode = buildVoucherCode(form.voucherWord, form.voucherNo);
    const voucherDate = toMysqlDateTime(form.date);
    const mainDataBase = {
      voucher_code: voucherCode,
      voucher_date: voucherDate,
      description: String(form.note ?? '').trim(),
      note: String(form.note ?? '').trim(),
      business_name: String(sourceBizType.value || '').trim() || undefined,
      voucher_type: String(sourceBizType.value || '').trim() || undefined,
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
        savedVoucherMainId = String((created as any)?.rowid || (created as any)?.row_id || '');
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
      deletedDetailIds.value = [];
    }

    if (form.mode === 'create') {
      applyCreatedVoucherToSubjectBalances(
        effectiveEntryPayloads.map(({ entry }) => entry),
      );
    }

    const handledAssetChange = await syncAssetChangeVoucherAfterSave(voucherCode);
    ElMessage.success('保存成功');
    emit('success', { ...form, attachmentUrls: [...attachmentUrls.value], voucherMainId: savedVoucherMainId, voucherCode });
    if (handledAssetChange) {
      modalApi.close();
      return;
    }
    await refreshNavigator();

    if (form.mode === 'create') {
      setStoredVoucherDate(form.date);
    }

    if (closeAfter) {
      modalApi.close();
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
    modalApi.close();
    return;
  }

  if (form.mode === 'detail') return;

  if (ctrlOrMeta && keyLower === 's' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    handleSave(false);
    return;
  }

  if (ctrlOrMeta && keyLower === 's' && e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    handleSave(true);
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
  if (form.mode !== 'create') return;
  try {
    const closedRow = await getClosedPeriodStatusByDate({ date: form.date });
    if (!closedRow) {
      createDateClosedTip.value = '';
      return;
    }
    window.localStorage.removeItem(VOUCHER_LAST_DATE_STORAGE_KEY);
    createDateClosedTip.value = `期间 ${closedRow.period_code} 已关账，新增凭证日期已自动调整到可用期间`;
    form.date = await resolveCreateDefaultDate();
    ElMessage.warning({
      message: createDateClosedTip.value,
      duration: 2200,
      showClose: false,
    });
  } catch (error) {
    console.error(error);
  }
}

async function handleNew() {
  if (form.mode === 'detail') return;
  returnToCreateAfterPaging.value = false;
  form.mode = 'create';
  editId.value = undefined;
  form.voucherWord = '记';
  form.voucherNo = 1;
  form.date = await resolveCreateDefaultDate();
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
  sourceBizType.value = pickNonEmptyText(
    (initial as any).voucher_type,
    (initial as any).voucherType,
    (initial as any).business_name,
    (initial as any).businessName,
    sourceBizType.value,
  );
  if ((initial as any).source === 'asset-change') {
    const rowIds = Array.isArray((initial as any).rowIds)
      ? (initial as any).rowIds
      : String((initial as any).rowIds || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
    assetChangeVoucherSaveContext.value = { rowIds, source: 'asset-change' };
  }
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
          }))
        : Array.from({ length: 4 }, () => newEntry());
  }
  deletedDetailIds.value = [];
}

async function loadVoucherSafely(id: string) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) throw new Error('凭证 ID 为空');

  try {
    const voucher = await getVoucher(normalizedId);
    if (voucher?.main) {
      return {
        main: voucher.main,
        details: Array.isArray(voucher.details) ? voucher.details : [],
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

  return { main, details: Array.isArray(details) ? details : [] };
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
          } as VoucherEntry;
        })
      : Array.from({ length: 4 }, () => newEntry());
  ensureMinVoucherEntryRows();
  await refreshVoucherEntryLedgerBalances();
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
      await loadForEdit(nextId, { mode: 'edit' });
      if (seq !== voucherSwitchSeq.value) return;
      ensureMinVoucherEntryRows();
      await refreshNavigator();
      await loadSubjectOptions(true);
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

const [Modal, modalApi] = useVbenModal({
  zIndex: 2000,
  closeOnClickModal: false,
  closeOnPressEscape: false,
  async onOpenChange(isOpen) {
    modalOpen.value = isOpen;
    if (isOpen) bindHotkeys();
    else unbindHotkeys();
    if (!isOpen) {
      initializing.value = false;
      return;
    }

    initializing.value = true;
    try {
      const data = modalApi.getData<ModalOpenData>();
      form.mode = (data?.type ?? 'create') as Mode;
      editId.value = data?.id;
      reverseSourceId.value = data?.reverseSourceId
        ? String(data.reverseSourceId)
        : null;
      reverseCreatedId.value = null;

      if (form.mode === 'create') {
        await handleNew();
        applyInitial(data?.initial);
        await ensureCreateDateNotClosed();
        await syncVoucherNoByMonth({ silent: true });
        await refreshNavigator();
      } else if (editId.value) {
        await loadForEdit(editId.value, { mode: form.mode });
        await refreshNavigator();
      } else {
        navigatorState.value = null;
      }

      await loadSubjectOptions(true);
    } finally {
      initializing.value = false;
    }
  },
});
</script>

<template>
  <Modal
    :title="modalTitle"
    class="voucher-modal"
    :show-confirm-button="false"
    :show-cancel-button="false"
  >
    <div class="voucher-shell">
      <div class="voucher-toolbar">
        <div class="voucher-toolbar__actions">
          <ElButton
            type="primary"
            :icon="Document"
            :disabled="form.mode === 'detail' || paging"
            :loading="saving"
            @click="handleSave(false)"
          >
            保存
          </ElButton>
          <ElButton
            plain
            :icon="FolderOpened"
            :disabled="form.mode === 'detail' || paging"
            :loading="saving"
            @click="handleSave(true)"
          >
            保存并关闭
          </ElButton>
          <ElButton plain :icon="Printer" :disabled="paging">打印</ElButton>
          <ElButton plain :icon="MoreFilled" :disabled="paging">更多</ElButton>
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

      <div class="voucher-summary-strip">
        <div class="voucher-summary-main">
          <span class="voucher-summary-code">{{ voucherCodeText }}</span>
          <span class="voucher-summary-date">{{ formatDate(form.date) }}</span>
        </div>
        <div class="voucher-summary-side">
          <span>制单人：{{ form.maker }}</span>
          <span :class="totals.balanced ? 'is-balance' : 'is-unbalance'">
            {{ totals.balanced ? '借贷平衡' : '借贷不平衡' }}
          </span>
        </div>
      </div>

      <div class="voucher-table-wrap">
        <div class="voucher-side-action">
          <ElButton
            circle
            type="primary"
            :icon="Plus"
            :disabled="form.mode === 'detail' || paging"
            @click="addRow"
          />
        </div>

        <div class="min-w-0 flex-1">
          <VoucherEntryTable
            :entries="form.entries"
            :mode="form.mode"
            :subject-options="subjectOptions"
            :subject-current-balance-map="subjectCurrentBalanceMap"
            :subject-ledger-row-balance-map="subjectLedgerRowBalanceMap"
            :subject-loading="subjectLoading"
            :subject-remote-method="subjectRemoteMethod"
            :allow-non-leaf-subject="allowNonLeafSubjectInVoucher"
            @append="addRow"
            @insert-after="insertAfterRow"
            @remove="removeRow"
            @clear="clearRow"
            @debit-change="handleDebitChange"
            @credit-change="handleCreditChange"
            @subject-select="handleSubjectSelect"
          />

          <div class="voucher-footer">
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
        </div>
      </div>

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
  </Modal>
</template>

<style scoped>
/* 凭证新增/编辑弹窗：响应式宽度 */
:global(.voucher-modal) {
  width: min(1460px, calc(100vw - 8px)) !important;
  max-width: calc(100vw - 8px) !important;
  max-height: calc(100vh - 8px) !important;
  margin: 4px auto !important;
}

:global(.voucher-modal .el-dialog__body) {
  max-height: calc(100vh - 72px) !important;
  padding: 10px 12px 12px !important;
  overflow: auto !important;
}

.voucher-shell {
  min-width: 0;
  padding: 0;
  color: #303133;
}

.voucher-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 10px;
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
  height: 32px;
  padding: 0 14px;
  border-radius: 4px;
}

.voucher-toolbar__hint {
  font-size: 13px;
  color: #606266;
}

.voucher-pager-action {
  min-width: 96px;
  height: 48px !important;
  padding: 0 14px !important;
  cursor: pointer;
  border-radius: 0 !important;
}

.voucher-pager-action :deep(.el-button__content) {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.voucher-pager-action__icon {
  width: 16px;
  height: 16px;
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
  grid-template-columns: 160px 180px minmax(210px, 1fr) 168px 86px 76px;
  gap: 0;
  align-items: stretch;
  padding: 0;
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
  min-height: 38px;
  padding: 0 8px;
}

.voucher-grid-field--word {
  grid-template-columns: 48px 1fr 20px;
}

.voucher-grid-field--no {
  grid-template-columns: 48px 1fr 20px;
}

.voucher-grid-field--date {
  grid-template-columns: 36px 1fr;
}

.voucher-grid-field--attach {
  grid-template-columns: 48px 1fr 20px;
  border-right: 1px solid #dcdfe6;
}

.voucher-grid-field__label,
.voucher-grid-field__suffix {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
}

.voucher-select,
.voucher-no-input,
.voucher-date-input,
.voucher-attach-input {
  width: 100%;
}

.voucher-top-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  font-size: 13px;
}

.voucher-top-link--note {
  border-right: 0;
}

.voucher-inline-link {
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  justify-content: space-between;
  padding: 8px 10px;
  background: #fff;
  border-bottom: 1px solid #dcdfe6;
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
  gap: 0;
  align-items: flex-start;
  padding-top: 8px;
}

.voucher-side-action {
  padding-top: 10px;
  padding-right: 0;
  margin-right: 0;
}

.voucher-side-action :deep(.el-button) {
  width: 34px;
  height: 34px;
}

.voucher-footer {
  justify-content: space-between;
  padding: 8px 0 0;
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
    grid-template-columns: 160px 180px minmax(210px, 1fr) 168px 86px 76px;
    overflow-x: auto;
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
    overflow-x: auto;
  }

  .voucher-table-wrap {
    width: 100%;
    overflow-x: visible;
  }

  .voucher-table-wrap > .min-w-0 {
    min-width: 0;
  }
}

@media (max-width: 768px) {
  :global(.voucher-modal) {
    width: calc(100vw - 8px) !important;
    max-width: calc(100vw - 8px) !important;
  }

  .voucher-toolbar__actions :deep(.el-button),
  .voucher-toolbar__pager :deep(.el-button) {
    min-width: 96px;
  }

  .voucher-summary-strip,
  .voucher-footer {
    width: 100%;
  }

  .voucher-summary-side {
    flex-wrap: wrap;
  }
}

/* 凭证弹窗：任意屏幕完整展示优先 */
@media (max-width: 1180px) {
  :global(.voucher-modal .el-dialog__header) {
    padding: 8px 12px 4px !important;
  }

  .voucher-toolbar {
    gap: 8px;
    padding-bottom: 6px;
  }

  .voucher-toolbar :deep(.el-button) {
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
  }

  .voucher-pager-action {
    min-width: 74px;
    height: 32px !important;
    padding: 0 8px !important;
  }

  .voucher-info-strip {
    grid-template-columns: 128px 152px minmax(176px, 1fr) 138px 72px 64px;
    width: 100%;
    overflow: visible;
  }

  .voucher-grid-field {
    min-height: 34px;
    padding: 0 6px;
  }

  .voucher-grid-field--word,
  .voucher-grid-field--no {
    grid-template-columns: 42px 1fr 16px;
  }

  .voucher-grid-field--date {
    grid-template-columns: 32px 1fr;
  }

  .voucher-grid-field--attach {
    grid-template-columns: 42px 1fr 16px;
  }

  .voucher-grid-field__label,
  .voucher-grid-field__suffix,
  .voucher-top-link {
    font-size: 12px;
  }

  .voucher-summary-strip {
    padding: 6px 8px;
  }

  .voucher-side-action {
    display: none;
  }
}

@media (max-width: 980px) {
  .voucher-toolbar__hint,
  .voucher-top-link--note,
  .voucher-top-link--attach .voucher-inline-link svg,
  .voucher-top-link--note .voucher-inline-link svg {
    display: none;
  }

  .voucher-info-strip {
    grid-template-columns: 104px 128px minmax(150px, 1fr) 116px 44px 0;
  }

  .voucher-top-link--note {
    border-right: 0;
  }

  .voucher-toolbar,
  .voucher-summary-strip,
  .voucher-footer {
    flex-direction: row;
    align-items: center;
  }

  .voucher-summary-side {
    gap: 6px;
  }
}

@media (max-width: 760px) {
  :global(.voucher-modal .el-dialog__body) {
    padding: 6px !important;
  }

  .voucher-toolbar {
    align-items: flex-start;
  }

  .voucher-toolbar__actions :deep(.el-button),
  .voucher-toolbar__pager :deep(.el-button) {
    min-width: auto;
  }

  .voucher-info-strip {
    grid-template-columns: 92px 108px minmax(128px, 1fr) 96px 38px 0;
  }

  .voucher-grid-field__suffix,
  .voucher-summary-date,
  .voucher-footer-meta {
    display: none;
  }

  .voucher-grid-field--word,
  .voucher-grid-field--no,
  .voucher-grid-field--attach {
    grid-template-columns: 34px 1fr;
  }

  .voucher-total-inline {
    font-size: 12px;
  }
}


/* voucher-entry-table-responsive-note */

</style>
