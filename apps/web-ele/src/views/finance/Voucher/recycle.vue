<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';

import { ArrowLeft, Delete, Download, MoreFilled, Operation, Plus, Printer, Search, Sort, Upload } from '@element-plus/icons-vue';

import {
  createVoucher,
  deleteVoucher,
  getVoucher,
  getVoucherDetails,
  getVoucherPage,
  permanentlyDeleteVoucher,
  restoreVoucher,
  updateVoucherMain,
} from '#/api/erp/finance/voucher';
import type { ErpVoucherApi } from '#/api/erp/finance/voucher';
import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';
import { getAccountCurrentAccount } from '#/api/erp/finance/settings/accountset';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { getStoredAccountSetName } from '#/utils/accountSet';
import {
  buildVoucherPrintHtml,
  type VoucherPrintData,
} from '#/views/finance/print-templates/voucher';

import VoucherForm from '#/views/finance/Voucher/modules/form.vue';

import {
  ElButton,
  ElCheckbox,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElPopover,
  ElSelect,
} from 'element-plus';

defineOptions({ name: 'FinanceVoucherRecycle' });

type VoucherLine = {
  summary: string;
  subject: string;
  debit?: number;
  credit?: number;
};

type Voucher = {
  id: string;
  date: string;
  no: string;
  attachmentCount: number;
  isReversed: boolean;
  director?: string;
  bookkeeper?: string;
  reviewer?: string;
  cashier?: string;
  maker?: string;
  source?: string;
  lines: VoucherLine[];
};

type VoucherFormInitial = {
  voucherWord: string;
  voucherNo: number;
  date: number;
  attachmentsCount: number;
  note?: string;
  maker?: string;
  entries: Array<{
    summary?: string;
    subject?: string;
    debit?: number;
    credit?: number;
  }>;
};

const route = useRoute();
const router = useRouter();

const monthValue = ref(
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
);
const filterOpen = ref(false);
const filterVoucherWord = ref('全部');
const filterMaker = ref('全部');
const filterAssist1 = ref('全部');
const filterAssist2 = ref('全部');
const filterQty = ref('全部');
const filterForeign = ref('全部');
const filterSummary = ref('');
const filterRemark = ref('');
const filterSubject = ref('');

const showQtyUnitPrice = ref(false);
const showOriginalCurrency = ref(false);

const loading = ref(false);
const hasQueried = ref(false);
const vouchers = ref<Voucher[]>([]);
const total = ref(0);
const pageNo = ref(1);
const page = ref(20);
const selectedIds = ref<string[]>([]);
const recycleMode = ref(true);
const currentAccountSetCompany = ref('');

const pagedVouchers = computed(() => {
  const start = (pageNo.value - 1) * page.value;
  return vouchers.value.slice(start, start + page.value);
});

const isVoucherEmpty = computed(
  () => !loading.value && pagedVouchers.value.length === 0,
);
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth);
const isNarrowFilter = computed(() => viewportWidth.value < 768);
const filterPopoverWidth = computed(() => Math.max(320, Math.min(isNarrowFilter.value ? viewportWidth.value - 24 : 560, 560)));
function handleWindowResize() {
  if (typeof window !== 'undefined') viewportWidth.value = window.innerWidth;
}

function logVoucherAction(action: string, payload?: Record<string, any>) {
  console.log('[凭证回收站]', action, {
    pageNo: pageNo.value,
    pageSize: page.value,
    total: total.value,
    selectedCount: selectedIds.value.length,
    ...(payload || {}),
  });
}

const printLoading = ref(false);
const printFrameRef = ref<HTMLIFrameElement>();

const isAllSelected = computed(() => {
  const currentPageIds = pagedVouchers.value.map((v) => v.id);
  return (
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.value.includes(id))
  );
});

const isIndeterminate = computed(() => {
  const currentPageIds = pagedVouchers.value.map((v) => v.id);
  const selectedCount = currentPageIds.filter((id) =>
    selectedIds.value.includes(id),
  ).length;
  return selectedCount > 0 && selectedCount < currentPageIds.length;
});

function toMoney(v: any) {
  const n = moneyNumber(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return moneyText(n);
}

function formatDate(d: Date | string | undefined | null): string {
  if (!d) return '';
  const s = typeof d === 'string' ? d : (d as Date).toISOString();
  return s.slice(0, 10);
}

function toRmbUpper(amount: any): string {
  const n = moneyNumber(amount);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '零元整';

  const cnNum = [
    '零',
    '壹',
    '贰',
    '叁',
    '肆',
    '伍',
    '陆',
    '柒',
    '捌',
    '玖',
  ] as const;
  const cnUnit = ['', '拾', '佰', '仟'] as const;
  const cnGroup = ['', '万', '亿', '兆'] as const;

  const negative = n < 0;
  const cents = Math.round(Math.abs(n) * 100);
  const yuan = Math.floor(cents / 100);
  const jiao = Math.floor((cents % 100) / 10);
  const fen = cents % 10;

  const fourToCn = (num: number) => {
    let out = '';
    let zero = false;
    for (let i = 0; i < 4; i++) {
      const divisor = 10 ** (3 - i);
      const digit = Math.floor(num / divisor) % 10;
      if (digit === 0) {
        zero = out.length > 0;
        continue;
      }
      if (zero) out += cnNum[0];
      zero = false;
      out += cnNum[digit]! + cnUnit[3 - i]!;
    }
    return out;
  };

  const intToCn = (num: number) => {
    if (num === 0) return cnNum[0];

    const groups: number[] = [];
    let x = num;
    while (x > 0) {
      groups.push(x % 10000);
      x = Math.floor(x / 10000);
    }

    let out = '';
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      const g = groups[gi] ?? 0;
      const part = fourToCn(g);
      if (!part) {
        if (out && gi > 0 && groups.slice(0, gi).some((v) => v && v > 0)) {
          if (!out.endsWith(cnNum[0])) out += cnNum[0];
        }
        continue;
      }

      if (out && g < 1000 && !out.endsWith(cnNum[0])) out += cnNum[0];
      out += part + (cnGroup[gi] ?? '');
    }

    return out;
  };

  let out = `${intToCn(yuan)}元`;
  if (jiao === 0 && fen === 0) {
    out += '整';
  } else {
    if (jiao > 0) out += `${cnNum[jiao]}角`;
    if (jiao === 0 && fen > 0) out += cnNum[0];
    if (fen > 0) out += `${cnNum[fen]}分`;
  }

  return negative ? `负${out}` : out;
}

function voucherTotals(v: Voucher) {
  const debit = moneyNumber(sumByMoney(v.lines, (r) => r.debit));
  const credit = moneyNumber(sumByMoney(v.lines, (r) => r.credit));
  return { debit, credit };
}

function voucherTotalUpper(v: Voucher) {
  const { debit, credit } = voucherTotals(v);
  const base = debit || credit;
  return base ? toRmbUpper(base) : '';
}


function openFilter() {
  logVoucherAction('打开查询条件');
}

function closeFilter() {
  filterOpen.value = false;
  logVoucherAction('关闭查询条件');
}

function resetFilter() {
  logVoucherAction('重置查询条件');
  filterVoucherWord.value = '全部';
  filterMaker.value = '全部';
  filterAssist1.value = '全部';
  filterAssist2.value = '全部';
  filterQty.value = '全部';
  filterForeign.value = '全部';
  filterSummary.value = '';
  filterRemark.value = '';
  filterSubject.value = '';
}

function applyFilter() {
  logVoucherAction('应用查询条件', { filterVoucherWord: filterVoucherWord.value, filterMaker: filterMaker.value, filterSummary: filterSummary.value, filterSubject: filterSubject.value });
  pageNo.value = 1;
  closeFilter();
  loadData();
}

function toggleAll(checked: boolean) {
  const currentPageIds = pagedVouchers.value.map((v) => v.id);
  if (checked) {
    selectedIds.value = Array.from(
      new Set([...selectedIds.value, ...currentPageIds]),
    );
  } else {
    selectedIds.value = selectedIds.value.filter(
      (id) => !currentPageIds.includes(id),
    );
  }
}

function isChecked(id: string) {
  return selectedIds.value.includes(id);
}

function toggleChecked(id: string, checked: boolean) {
  selectedIds.value = checked
    ? Array.from(new Set([...selectedIds.value, id]))
    : selectedIds.value.filter((x) => x !== id);
}

function handleCurrentChange(page: number) {
  logVoucherAction('切换分页页码', { targetPage: page });
  pageNo.value = page;
  selectedIds.value = [];
}

function handleSizeChange(size: number) {
  logVoucherAction('切换每页条数', { targetSize: size });
  page.value = size;
  pageNo.value = 1;
  selectedIds.value = [];
}

function pickNonEmptyText(...candidates: any[]) {
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

function normalizeSubjectNo(value: any) {
  return String(value ?? '').trim();
}

function buildSubjectDisplayMap(subjects: any[]) {
  const byNo = new Map<string, any>();
  for (const item of subjects || []) {
    const no = normalizeSubjectNo(item?.subject_number);
    if (!no || byNo.has(no)) continue;
    byNo.set(no, item);
  }

  const cache = new Map<string, string>();
  const buildDisplay = (subjectNo: string) => {
    const normalizedNo = normalizeSubjectNo(subjectNo);
    if (!normalizedNo) return '';
    if (cache.has(normalizedNo)) return cache.get(normalizedNo) || '';

    const current = byNo.get(normalizedNo);
    if (!current) {
      cache.set(normalizedNo, normalizedNo);
      return normalizedNo;
    }

    const selfName = String(current?.subject_name ?? '').trim();
    const parentNo = normalizeSubjectNo(current?.parent_subject_number);
    const names: string[] = [];
    if (selfName) names.unshift(selfName);

    let cursorNo = parentNo;
    let guard = 0;
    while (cursorNo && guard < 20) {
      const parent = byNo.get(cursorNo);
      if (!parent) break;
      const parentName = String(parent?.subject_name ?? '').trim();
      if (parentName) names.unshift(parentName);
      cursorNo = normalizeSubjectNo(parent?.parent_subject_number);
      guard += 1;
    }

    const display =
      [normalizedNo, names.join('-')].filter(Boolean).join(' ').trim() ||
      normalizedNo;
    cache.set(normalizedNo, display);
    return display;
  };

  return { byNo, buildDisplay };
}

function buildVoucherLineSubject(
  detail: any,
  buildSubjectDisplay: (subjectNo: string) => string,
) {
  const code = normalizeSubjectNo(detail?.account_code);
  const fallbackName = String(detail?.account_name ?? '').trim();
  const display = buildSubjectDisplay(code);
  if (display && display !== code) return display;
  return (
    [code, fallbackName].filter(Boolean).join(' ').trim() ||
    fallbackName ||
    code
  );
}

function parseVoucherWordNo(code: string): { word: string; no: number } {
  const s = String(code ?? '').trim();
  const m = s.match(/^(.+?)(\d+)$/);
  if (!m) return { word: s || '记', no: Number.MAX_SAFE_INTEGER };
  const word = String(m[1] ?? '').trim() || '记';
  const no = Number(m[2]);
  return {
    word,
    no:
      Number.isFinite(no) && no >= 0 ? Math.trunc(no) : Number.MAX_SAFE_INTEGER,
  };
}

function getVoucherWordRank(word: string) {
  const normalized = String(word || '').trim();
  if (normalized === '记') return 0;
  return 1;
}

function sortVouchers(list: Voucher[]) {
  return [...list].sort((a, b) => {
    const aParsed = parseVoucherWordNo(a.no);
    const bParsed = parseVoucherWordNo(b.no);
    const wordRankDiff =
      getVoucherWordRank(aParsed.word) - getVoucherWordRank(bParsed.word);
    if (wordRankDiff !== 0) return wordRankDiff;

    const wordDiff = aParsed.word.localeCompare(bParsed.word, 'zh-Hans-CN');
    if (wordDiff !== 0) return wordDiff;

    const noDiff = aParsed.no - bParsed.no;
    if (noDiff !== 0) return noDiff;

    return String(a.date || '').localeCompare(String(b.date || ''));
  });
}

function toTimestamp(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = new Date(v as any).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function formatYYYYMM(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

function getCreateVoucherTimestampByMonth(monthText: string) {
  const [yearText, monthNoText] = String(monthText || '').split('-');
  const year = Number(yearText);
  const monthNo = Number(monthNoText);
  if (!year || !monthNo || monthNo < 1 || monthNo > 12) {
    return Date.now();
  }
  return new Date(year, monthNo - 1, 1, 0, 0, 0, 0).getTime();
}

function getReturnVoucherQuery() {
  const query: Record<string, any> = { moduleScope: 'finance' };
  const date = pickNonEmptyText(route.query.date, route.query.month, route.query.period);
  if (date) query.date = date;
  return query;
}

async function loadCurrentAccountSetCompany() {
  currentAccountSetCompany.value = String(
    getStoredAccountSetName() ?? '',
  ).trim();

  try {
    const res = await getAccountCurrentAccount({ pageNo: 1, page: 1 });
    const account = (res?.list ?? [])[0] as any;
    const company = pickNonEmptyText(
      account?.account_name,
      account?.description,
    );
    if (company) {
      currentAccountSetCompany.value = company;
    }
  } catch (error) {
    console.error(error);
  }
}

async function openDetail(v: Voucher) {
  logVoucherAction('跳转查看凭证页面', { id: v.id, no: v.no, date: v.date });
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      id: v.id,
      type: 'detail',
      date: v.date?.slice(0, 7) || monthValue.value,
      moduleScope: 'finance',
      recycleMode: '1',
      from: 'recycle',
    },
  });
}

async function openEdit(v: Voucher) {
  logVoucherAction('跳转修改凭证页面', { id: v.id, no: v.no, date: v.date });
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      id: v.id,
      type: 'edit',
      date: v.date?.slice(0, 7) || monthValue.value,
      moduleScope: 'finance',
    },
  });
}

async function openCopy(v: Voucher) {
  logVoucherAction('复制凭证', { id: v.id, no: v.no, date: v.date });
  const voucher = await getVoucher(v.id);
  if (!voucher) {
    ElMessage.error('未找到凭证数据');
    return;
  }

  const code = pickNonEmptyText(
    voucher.main?.voucher_code,
    voucher.main?.ReportID,
    voucher.main?.business_code,
  );
  const { word, no } = parseVoucherWordNo(code);
  const initial: VoucherFormInitial = {
    voucherWord: word,
    voucherNo: no,
    date: toTimestamp(
      pickNonEmptyText(
        voucher.main?.voucher_date,
        voucher.main?.createtime,
        voucher.main?.updatetime,
      ),
    ),
    attachmentsCount: 0,
    entries: (voucher.details || []).map((d) => {
      const code2 = String((d as any)?.account_code ?? '').trim();
      const name2 = String((d as any)?.account_name ?? '').trim();
      const subject = [code2, name2].filter(Boolean).join(' ').trim() || name2;
      return {
        summary: String((d as any)?.abstract_content ?? ''),
        subject,
        debit: moneyNumber((d as any)?.debit_amount),
        credit: moneyNumber((d as any)?.credit_amount),
      };
    }),
  };

  formModalApi.setData({ type: 'create', initial }).open();
}

async function openInsertAfter(v: Voucher) {
  logVoucherAction('插入凭证', { id: v.id, no: v.no, date: v.date });
  const { word, no } = parseVoucherWordNo(v.no);
  const initial: VoucherFormInitial = {
    voucherWord: word,
    voucherNo: Math.max(1, no + 1),
    date: toTimestamp(v.date),
    attachmentsCount: 0,
    entries: [
      { summary: '', subject: '', debit: undefined, credit: undefined },
    ],
  };
  formModalApi.setData({ type: 'create', initial }).open();
}

async function openReverse(v: Voucher) {
  logVoucherAction('红冲凭证', { id: v.id, no: v.no, date: v.date });
  const voucher = await getVoucher(v.id);
  if (!voucher) {
    ElMessage.error('未找到凭证数据');
    return;
  }

  const code = pickNonEmptyText(
    voucher.main?.voucher_code,
    voucher.main?.ReportID,
    voucher.main?.business_code,
  );
  const { word, no } = parseVoucherWordNo(code);
  const baseTs = toTimestamp(
    pickNonEmptyText(
      voucher.main?.voucher_date,
      voucher.main?.createtime,
      voucher.main?.updatetime,
    ),
  );
  const prefix = `冲销${formatYYYYMM(baseTs)}${word}-${no}`;
  const initial: VoucherFormInitial = {
    voucherWord: word,
    voucherNo: no,
    date: baseTs,
    attachmentsCount: 0,
    entries: (voucher.details || []).map((d) => {
      const code2 = String((d as any)?.account_code ?? '').trim();
      const name2 = String((d as any)?.account_name ?? '').trim();
      const subject = [code2, name2].filter(Boolean).join(' ').trim() || name2;
      const debit = moneyNumber((d as any)?.debit_amount);
      const credit = moneyNumber((d as any)?.credit_amount);
      const oldSummary = String((d as any)?.abstract_content ?? '').trim();
      const summary = oldSummary ? `${prefix}_${oldSummary}` : prefix;
      return {
        summary,
        subject,
        debit: credit,
        credit: debit,
      };
    }),
  };

  ElMessage.warning({
    message: '已生成红冲草稿，请确认后保存',
    duration: 1800,
    showClose: false,
  });
  formModalApi
    .setData({ type: 'create', initial, reverseSourceId: v.id })
    .open();
}

async function handleDelete(v: Voucher) {
  logVoucherAction('删除凭证', { id: v.id, no: v.no, date: v.date });
  try {
    const voucher = await getVoucher(v.id);
    if (!voucher?.main) {
      ElMessage.error('未找到凭证数据');
      return;
    }

    await assertPeriodNotClosedByDate({
      date:
        voucher.main.voucher_date ||
        voucher.main.createtime ||
        voucher.main.updatetime ||
        v.date,
      actionText: '删除凭证到回收站，请先反结账',
    });
  } catch (error: any) {
    ElMessage.error(
      error?.message || '当前期间已结账，不能删除凭证到回收站，请先反结账',
    );
    return;
  }

  try {
    await ElMessageBox.confirm(`确定将凭证“${v.no || '—'}”移入回收站吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '移入回收站',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  try {
    await deleteVoucher([v.id]);
    ElMessage.success('已移入回收站');
    loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

async function handleRestore(v: Voucher) {
  logVoucherAction('还原回收站凭证', { id: v.id, no: v.no, date: v.date });
  try {
    await ElMessageBox.confirm(
      '确定还原凭证“' + (v.no || '—') + '”吗？',
      '还原确认',
      {
        type: 'warning',
        confirmButtonText: '还原',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }

  try {
    await restoreVoucher([v.id]);
    ElMessage.success('已还原');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '还原失败');
  }
}

async function handlePermanentDelete(v: Voucher) {
  logVoucherAction('彻底删除凭证', { id: v.id, no: v.no, date: v.date });
  try {
    await ElMessageBox.confirm(
      '彻底删除后不可从回收站还原，确定彻底删除凭证“' +
        (v.no || '—') +
        '”吗？',
      '彻底删除确认',
      {
        type: 'error',
        confirmButtonText: '彻底删除',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }

  try {
    await permanentlyDeleteVoucher([v.id]);
    ElMessage.success('已彻底删除');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '彻底删除失败');
  }
}

function toggleRecycleMode() {
  recycleMode.value = !recycleMode.value;
  pageNo.value = 1;
  selectedIds.value = [];
  logVoucherAction(recycleMode.value ? '进入回收站' : '退出回收站');
  loadData();
}
async function saveAsTemplate(v: Voucher) {
  logVoucherAction('存为模板', { id: v.id, no: v.no, date: v.date });
  const voucher = await getVoucher(v.id);
  if (!voucher) {
    ElMessage.error('未找到凭证数据');
    return;
  }
  const payload = {
    savedAt: Date.now(),
    main: voucher.main,
    details: voucher.details,
  };
  localStorage.setItem('finance_voucher_template', JSON.stringify(payload));
  ElMessage.success('已存为模板');
}

function cloneVoucher(v: Voucher): Voucher {
  return {
    ...v,
    lines: v.lines.map((line) => ({ ...line })),
  };
}

function toVoucherPrintData(v: Voucher): VoucherPrintData {
  return {
    id: v.id,
    date: v.date,
    no: v.no,
    attachmentCount: v.attachmentCount,
    company: currentAccountSetCompany.value,
    director: v.director,
    bookkeeper: v.bookkeeper,
    reviewer: v.reviewer,
    cashier: v.cashier,
    maker: v.maker,
    lines: v.lines.map((line) => ({ ...line })),
  };
}

function printVoucher(v: Voucher) {
  logVoucherAction('打印单张凭证', { id: v.id, no: v.no, date: v.date });
  printByList([v]);
}

function printSelectedVouchers() {
  logVoucherAction('打印选中凭证');
  const selected = vouchers.value.filter((item) =>
    selectedIds.value.includes(item.id),
  );
  printByList(selected);
}

function printCurrentPageVouchers() {
  logVoucherAction('打印当前页凭证', { count: pagedVouchers.value.length });
  printByList(pagedVouchers.value);
}

function csvEscape(value: any) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function exportVoucherCsv(scope: 'selected' | 'current' | 'all') {
  logVoucherAction('导出凭证', { scope });
  const source =
    scope === 'selected'
      ? vouchers.value.filter((item) => selectedIds.value.includes(item.id))
      : scope === 'current'
        ? pagedVouchers.value
        : vouchers.value;

  if (!source.length) {
    ElMessage.warning('暂无可导出的凭证');
    return;
  }

  const rows = [['日期', '凭证字号', '摘要', '科目', '借方金额', '贷方金额']];
  for (const voucher of source) {
    for (const line of voucher.lines) {
      rows.push([
        voucher.date,
        voucher.no,
        line.summary,
        line.subject,
        line.debit ? String(line.debit) : '',
        line.credit ? String(line.credit) : '',
      ]);
    }
  }

  const csv =
    '\ufeff' + rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '回收站凭证.csv';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importVoucherCsv(file: File) {
  logVoucherAction('导入凭证文件', { fileName: file.name, fileSize: file.size });
  const text = await file.text();
  const lines = text
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length <= 1) {
    ElMessage.warning('导入文件为空');
    return;
  }

  const groups = new Map<string, Array<Record<string, string>>>();
  const headers = parseCsvLine(lines[0] || '').map((x) => x.trim());
  const idx = (name: string) => headers.indexOf(name);
  const dateIdx = idx('日期');
  const noIdx = idx('凭证字号');
  const summaryIdx = idx('摘要');
  const subjectIdx = idx('科目');
  const debitIdx = idx('借方金额');
  const creditIdx = idx('贷方金额');
  if (
    [dateIdx, noIdx, summaryIdx, subjectIdx, debitIdx, creditIdx].some(
      (x) => x < 0,
    )
  ) {
    ElMessage.error('导入模板表头不正确，请使用导出的 CSV 模板');
    return;
  }

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const date = String(cols[dateIdx] ?? '').trim();
    const no = String(cols[noIdx] ?? '').trim();
    if (!date || !no) continue;
    const key = `${date}__${no}`;
    const list = groups.get(key) ?? [];
    list.push({
      date,
      no,
      summary: String(cols[summaryIdx] ?? '').trim(),
      subject:
        String(cols[subjectIdx] ?? '')
          .trim()
          .split(/\s+/)[0] || '',
      debit: String(cols[debitIdx] ?? '')
        .replace(/,/g, '')
        .trim(),
      credit: String(cols[creditIdx] ?? '')
        .replace(/,/g, '')
        .trim(),
    });
    groups.set(key, list);
  }

  if (!groups.size) {
    ElMessage.warning('未识别到可导入的凭证');
    return;
  }

  loading.value = true;
  try {
    for (const rows of groups.values()) {
      const first = rows[0]!;
      const debitAmount = moneyNumber(sumByMoney(rows, (row) => row.debit));
      const creditAmount = moneyNumber(sumByMoney(rows, (row) => row.credit));
      await createVoucher(
        {
          voucher_code: first.no,
          voucher_date: first.date,
          is_posted: 0,
          is_reversed: 0,
          debit_amount: debitAmount,
          credit_amount: creditAmount,
        },
        rows.map((row, index) => ({
          abstract_content: row.summary,
          account_code: row.subject,
          account_name: row.subject,
          debit_amount: moneyNumber(row.debit),
          credit_amount: moneyNumber(row.credit),
          sort_no: index + 1,
        })),
      );
    }
    ElMessage.success(`导入成功：${groups.size} 张凭证`);
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败');
  } finally {
    loading.value = false;
  }
}

function handleImportVoucher() {
  logVoucherAction('打开导入凭证文件选择');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) importVoucherCsv(file);
  };
  input.click();
}

function getVoucherArrangeSortKey(v: Voucher) {
  const parsed = parseVoucherWordNo(v.no);
  return {
    word: parsed.word || '记',
    wordRank: getVoucherWordRank(parsed.word),
    no: parsed.no,
    date: String(v.date || ''),
    id: String(v.id || ''),
  };
}

function sortVouchersForArrange(list: Voucher[]) {
  return [...list].sort((a, b) => {
    const ak = getVoucherArrangeSortKey(a);
    const bk = getVoucherArrangeSortKey(b);
    const dateDiff = ak.date.localeCompare(bk.date);
    if (dateDiff !== 0) return dateDiff;

    const wordRankDiff = ak.wordRank - bk.wordRank;
    if (wordRankDiff !== 0) return wordRankDiff;

    const wordDiff = ak.word.localeCompare(bk.word, 'zh-Hans-CN');
    if (wordDiff !== 0) return wordDiff;

    const noDiff = ak.no - bk.no;
    if (noDiff !== 0) return noDiff;

    return ak.id.localeCompare(bk.id);
  });
}

async function handleArrangeVoucher() {
  logVoucherAction('整理凭证');
  const source = sortVouchersForArrange(vouchers.value).filter((item) => item.id);
  if (!source.length) {
    ElMessage.warning('当前查询范围暂无可整理的凭证');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '将按日期和凭证字重新整理当前查询范围内的 ' +
        source.length +
        ' 张凭证编号，整理后编号将从 1 连续排列。确定继续吗？',
      '整理凭证确认',
      {
        type: 'warning',
        confirmButtonText: '开始整理',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }

  loading.value = true;
  try {
    const counters = new Map<string, number>();
    const changes: Array<{ id: string; oldCode: string; newCode: string; date: string }> = [];

    for (const voucher of source) {
      const parsed = parseVoucherWordNo(voucher.no);
      const word = parsed.word || '记';
      const nextNo = (counters.get(word) || 0) + 1;
      counters.set(word, nextNo);
      const newCode = `${word}${nextNo}`;
      if (newCode !== voucher.no) {
        changes.push({
          id: voucher.id,
          oldCode: voucher.no,
          newCode,
          date: voucher.date,
        });
      }
    }

    if (!changes.length) {
      ElMessage.success('当前凭证编号已连续，无需整理');
      return;
    }

    const checkedMonths = new Set<string>();
    for (const item of changes) {
      const month = String(item.date || '').slice(0, 7);
      if (month && !checkedMonths.has(month)) {
        checkedMonths.add(month);
        await assertPeriodNotClosedByDate({
          date: item.date,
          actionText: '整理凭证，请先反结账',
        });
      }
    }

    for (const item of changes) {
      await updateVoucherMain({
        rowid: item.id,
        voucher_code: item.newCode,
      });
    }

    ElMessage.success(`整理完成：更新 ${changes.length} 张凭证编号`);
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '整理凭证失败');
  } finally {
    loading.value = false;
  }
}
async function printByList(list: Voucher[]) {
  if (!list.length) {
    ElMessage.warning('暂无可打印的凭证');
    return;
  }

  printLoading.value = true;
  try {
    const html = buildVoucherPrintHtml(
      list.map((item) => toVoucherPrintData(cloneVoucher(item))),
    );
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

async function loadData() {
  logVoucherAction('查询凭证开始');
  hasQueried.value = true;
  loading.value = true;
  selectedIds.value = [];
  try {
      const res = await getVoucherPage({
      pageNo: 1,
      page: 0,
      recycleState: recycleMode.value ? 1 : 0,
    });

    const mains = (res.list ?? []) as ErpVoucherApi.VoucherMain[];
    const [allDetails, subjectRes] = await Promise.all([
      Promise.all(
        mains.map((main) => getVoucherDetails(String(main.rowid ?? ''))),
      ),
      getAllSubjectList({
        subject_state: 1,
        lingma_sys_is_delete: 0,
        pageNo: 1,
        page: 0,
      }),
    ]);
    const { buildDisplay: buildSubjectDisplay } = buildSubjectDisplayMap(
      subjectRes?.list || [],
    );

    const list = mains.map((main, i) => ({
      id: String(main.rowid ?? ''),
      date: formatDate(
        pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime),
      ),
      no: pickNonEmptyText(
        main.voucher_code,
        main.ReportID,
        main.business_code,
      ),
      attachmentCount: 0,
      isReversed: Number((main as any)?.is_reversed ?? 0) === 1,
      director: '',
      bookkeeper: '',
      reviewer: pickNonEmptyText((main as any)?.reviewer),
      cashier: pickNonEmptyText((main as any)?.cashier),
      maker: pickNonEmptyText(
        (main as any)?.operator,
        main.createuser,
        main.updateuser,
      ),
      source: pickNonEmptyText(
        (main as any)?.business_name,
        (main as any)?.businessName,
        (main as any)?.voucher_type,
        (main as any)?.voucherType,
      ),
      lines: (allDetails[i] ?? []).map((d) => ({
        summary: String(d.abstract_content ?? ''),
        subject: buildVoucherLineSubject(d, buildSubjectDisplay),
        debit: moneyNumber(d.debit_amount),
        credit: moneyNumber(d.credit_amount),
      })),
    }));

    vouchers.value = sortVouchers(list);
    total.value = vouchers.value.length;
    logVoucherAction('查询凭证完成', { loaded: vouchers.value.length });

    const maxPage = Math.max(1, Math.ceil(vouchers.value.length / page.value));
    if (pageNo.value > maxPage) {
      pageNo.value = maxPage;
    }
  } catch (e) {
    logVoucherAction('查询凭证失败', { error: e });
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  recycleMode.value = true;
  handleWindowResize();
  if (typeof window !== 'undefined') window.addEventListener('resize', handleWindowResize);
  await Promise.all([loadCurrentAccountSetCompany(), loadData()]);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', handleWindowResize);
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: VoucherForm,
  destroyOnClose: true,
});

function openCreate() {
  logVoucherAction('回收站返回凭证列表');
  router.push({ name: 'FinanceVoucher', query: getReturnVoucherQuery() });
}

function handleSaved() {
  logVoucherAction('凭证保存成功，刷新列表');
  loadData();
}
</script>

<template>
  <Page auto-content-height class="h-full">
    <FormModal @success="handleSaved" />

    <div class="flex h-full flex-col">

      <div
        v-loading="loading"
        element-loading-text="凭证加载中..."
        class="voucher-list-card border-border bg-card mt-3 flex min-h-0 flex-1 flex-col rounded-md border p-3 shadow-sm"
      >
        <div class="voucher-recycle-toolbar">
          <div class="voucher-recycle-toolbar__actions">
            <ElPopover
              v-model:visible="filterOpen"
              trigger="click"
              placement="bottom-end"
              :width="filterPopoverWidth"
              :show-arrow="false"
              :hide-after="0"
              @show="openFilter"
            >
              <template #reference>
                <ElButton class="voucher-recycle-action" size="default" type="primary" plain :loading="loading">
                  <ElIcon class="voucher-toolbar-button__icon"><Search /></ElIcon>
                  <span>查询</span>
                </ElButton>
              </template>

              <div class="voucher-filter-panel border-border bg-card rounded-md border p-4">
                <div class="voucher-filter-grid grid items-center gap-x-3 gap-y-3" :class="isNarrowFilter ? 'grid-cols-1' : 'grid-cols-[72px_minmax(0,1fr)]'">
                  <div v-if="!isNarrowFilter" class="text-muted-foreground">凭证字：</div>
                  <ElSelect v-if="!isNarrowFilter" v-model="filterVoucherWord" class="w-full">
                    <ElOption label="全部" value="全部" />
                  </ElSelect>

                  <div v-if="!isNarrowFilter" class="text-muted-foreground">制单人：</div>
                  <ElSelect v-if="!isNarrowFilter" v-model="filterMaker" class="w-full">
                    <ElOption label="全部" value="全部" />
                  </ElSelect>

                  <div class="text-muted-foreground">摘要：</div>
                  <ElInput v-model="filterSummary" clearable placeholder="按摘要关键字查询" />

                  <div class="text-muted-foreground">科目：</div>
                  <ElInput v-model="filterSubject" clearable placeholder="按科目编码/名称查询" />
                </div>

                <div class="mt-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <ElButton type="primary" @click="applyFilter">确定</ElButton>
                    <ElButton @click="closeFilter">取消</ElButton>
                    <ElButton @click="resetFilter">重置</ElButton>
                  </div>
                  <ElLink type="primary" :underline="false">恢复默认排序</ElLink>
                </div>
              </div>
            </ElPopover>

            <ElButton class="voucher-recycle-action" size="default" type="primary" @click="router.push({ name: 'FinanceVoucher', query: getReturnVoucherQuery() })">
              <ElIcon class="voucher-toolbar-button__icon"><ArrowLeft /></ElIcon>
              <span>返回凭证</span>
            </ElButton>
          </div>
        </div>
        <div class="voucher-table-scroll min-h-0 flex-1 overflow-auto">
          <table
            class="border-border w-full min-w-[980px] border-collapse border text-sm"
          >
            <colgroup>
              <col style="width: 40px" />
              <col style="width: 220px" />
              <col style="width: 22%" />
              <col style="width: 130px" />
              <col style="width: 130px" />
            </colgroup>
            <thead>
              <tr class="bg-background">
                <th
                  class="border-border border px-2 py-2 text-center font-normal"
                >
                  <ElCheckbox
                    :model-value="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @update:model-value="(val: any) => toggleAll(Boolean(val))"
                  />
                </th>
                <th
                  class="border-border text-muted-foreground border px-2 py-2 text-left font-normal"
                >
                  摘要
                </th>
                <th
                  class="border-border text-muted-foreground border px-2 py-2 text-left font-normal"
                >
                  科目
                </th>
                <th
                  class="border-border text-muted-foreground border px-2 py-2 text-right font-normal"
                >
                  借方金额
                </th>
                <th
                  class="border-border text-muted-foreground border px-2 py-2 text-right font-normal"
                >
                  贷方金额
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(v, vIdx) in pagedVouchers" :key="v.id">
                <tr
                  class="group cursor-pointer transition-[filter] hover:brightness-95"
                  style="background-color: #d9e9fb"
                  @click="openDetail(v)"
                >
                  <td class="border-border border px-2 py-2 text-center">
                    <ElCheckbox
                      :model-value="isChecked(v.id)"
                      @click.stop
                      @update:model-value="
                        (val: any) => toggleChecked(v.id, Boolean(val))
                      "
                    />
                  </td>
                  <td class="border-border border px-2 py-2" colspan="4">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <span class="font-medium"
                          >日期：{{ v.date || '—' }}</span
                        >
                        <span class="font-medium"
                          >凭证字号：{{ v.no || '—' }}</span
                        >
                        <span class="text-primary"
                          >附件：{{ v.attachmentCount }}</span
                        >
                        <span
                          v-if="v.source"
                          class="voucher-source-tag"
                          :title="v.source"
                        >
                          {{ v.source }}
                        </span>
                      </div>

                      <div class="flex items-center gap-1">
                        <span
                          v-if="v.isReversed"
                          class="mr-1 inline-block rounded border px-2 py-0.5 text-xs"
                          style="
                            transform: rotate(-20deg);
                            transform-origin: left center;
                            color: hsl(var(--destructive));
                            background-color: hsl(var(--destructive) / 0.12);
                            border-color: hsl(var(--destructive) / 0.35);
                          "
                        >
                          已红冲
                        </span>

                        <div
                          class="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                        >
                          <template v-if="!recycleMode">
                          <ElButton
                            text
                            type="primary"
                            @click.stop="openDetail(v)"
                            >查看</ElButton
                          >
                          <ElButton
                            text
                            type="primary"
                            @click.stop="openEdit(v)"
                            >修改</ElButton
                          >
                          <ElButton
                            text
                            type="primary"
                            @click.stop="openCopy(v)"
                            >复制</ElButton
                          >
                          <ElButton
                            text
                            type="danger"
                            @click.stop="handleDelete(v)"
                            >删除</ElButton
                          >
                          <ElButton
                            text
                            type="primary"
                            @click.stop="openInsertAfter(v)"
                            >插入</ElButton
                          >
                          <ElButton
                            text
                            type="primary"
                            @click.stop="openReverse(v)"
                            >红冲</ElButton
                          >
                          <ElButton
                            text
                            type="primary"
                            @click.stop="saveAsTemplate(v)"
                            >存为模板</ElButton
                          >
                          <ElButton
                            text
                            type="primary"
                            :loading="printLoading"
                            @click.stop="printVoucher(v)"
                            >打印</ElButton
                          >
                          </template>
                          <template v-else>
                            <ElButton text type="primary" @click.stop="openDetail(v)">查看</ElButton>
                            <ElButton text type="success" @click.stop="handleRestore(v)">还原</ElButton>
                            <ElButton text type="danger" @click.stop="handlePermanentDelete(v)">彻底删除</ElButton>
                          </template>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                <tr
                  v-for="(l, idx) in v.lines"
                  :key="idx"
                  class="hover:bg-muted cursor-pointer transition-colors"
                  @click="openDetail(v)"
                >
                  <td class="border-border border px-2 py-2"></td>
                  <td class="border-border border px-2 py-2">
                    {{ l.summary }}
                  </td>
                  <td class="border-border border px-2 py-2">
                    {{ l.subject }}
                  </td>
                  <td class="border-border border px-2 py-2 text-right">
                    {{ toMoney(l.debit) }}
                  </td>
                  <td class="border-border border px-2 py-2 text-right">
                    {{ toMoney(l.credit) }}
                  </td>
                </tr>

                <tr
                  class="bg-muted cursor-pointer hover:brightness-95"
                  @click="openDetail(v)"
                >
                  <td class="border-border border px-2 py-2"></td>
                  <td class="border-border border px-2 py-2 font-medium">
                    合计
                  </td>
                  <td
                    class="border-border text-muted-foreground border px-2 py-2"
                  >
                    {{ voucherTotalUpper(v) }}
                  </td>
                  <td
                    class="border-border border px-2 py-2 text-right font-medium"
                  >
                    {{ toMoney(voucherTotals(v).debit) }}
                  </td>
                  <td
                    class="border-border border px-2 py-2 text-right font-medium"
                  >
                    {{ toMoney(voucherTotals(v).credit) }}
                  </td>
                </tr>

                <tr v-if="vIdx !== pagedVouchers.length - 1">
                  <td colspan="5" class="h-4 bg-transparent"></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div
          class="voucher-pagination border-border mt-3 flex items-center justify-between gap-3 border-t pt-3"
        >
          <div class="voucher-pagination__left">
            <div class="text-muted-foreground text-xs">
              {{ recycleMode ? '回收站' : '凭证列表' }}：当前页显示 {{ pagedVouchers.length }} 条，共 {{ total }} 条记录
            </div>
          </div>
          <ElPagination
            :current-page="pageNo"
            :page-size="page"
            :page-sizes="[10, 20, 30, 50, 100]"
            :total="total"
            background
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="handleCurrentChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </div>

    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.voucher-recycle-query-action {
  width: 176px;
  min-width: 120px;
}


.voucher-recycle-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  width: 100%;
  min-width: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  padding: 4px 0 10px;
  margin-bottom: 10px;
}


.voucher-recycle-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.voucher-recycle-action {
  min-width: 96px;
  height: 32px;
  border-radius: 6px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .voucher-recycle-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 8px;
  }

  .voucher-recycle-toolbar__actions {
    width: 100%;
  }

  .voucher-recycle-action {
    flex: 1 1 0;
    min-width: 0;
  }
}

.voucher-toolbar-row {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.voucher-list-left-actions {
  width: 100%;
  min-width: 0;
  flex-wrap: nowrap;
}

.voucher-list-left-actions > :deep(.el-dropdown) {
  flex: 1 1 0;
  min-width: 0;
}

.voucher-list-left-actions > :deep(.el-button) {
  flex: 1 1 0;
  min-width: 0;
}

.voucher-list-left-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.voucher-toolbar-button {
  width: 100%;
  min-width: 0;
  height: 32px;
  justify-content: center;
  overflow: hidden;
  padding: 0 10px !important;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.voucher-toolbar-button__icon {
  flex: 0 0 auto;
  margin-right: 4px;
  font-size: 14px;
}

.voucher-toolbar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voucher-toolbar-label--compact {
  display: none;
}

.voucher-toolbar-caret {
  flex: 0 0 auto;
  margin-left: 4px;
  font-size: 12px;
  line-height: 1;
}

@media (max-width: 1200px) {
  .voucher-list-left-actions {
    gap: 6px;
  }

  .voucher-toolbar-button {
    height: 30px;
    padding: 0 6px !important;
    font-size: 12px;
  }

  .voucher-toolbar-button__icon {
    margin-right: 2px;
    font-size: 12px;
  }

  .voucher-toolbar-label--full {
    display: none;
  }

  .voucher-toolbar-label--compact {
    display: inline;
  }

  .voucher-toolbar-caret {
    margin-left: 2px;
    font-size: 10px;
  }
}

@media (max-width: 768px) {
  .voucher-list-left-actions {
    gap: 4px;
  }

  .voucher-toolbar-button {
    height: 28px;
    padding: 0 4px !important;
    font-size: 12px;
    letter-spacing: -0.5px;
  }

  .voucher-toolbar-button__icon {
    margin-right: 2px;
    font-size: 12px;
  }

  .voucher-toolbar-label--more,
  .voucher-toolbar-caret {
    display: none;
  }
}

@media (max-width: 480px) {
  .voucher-list-left-actions {
    gap: 3px;
  }

  .voucher-toolbar-button {
    height: 26px;
    padding: 0 2px !important;
    font-size: 11px;
  }

  .voucher-toolbar-button__icon {
    margin-right: 1px;
    font-size: 11px;
  }

  .voucher-toolbar-label {
    transform: scale(0.92);
    transform-origin: center;
  }

  .voucher-toolbar-label--more,
  .voucher-toolbar-caret {
    display: none;
  }
}

.voucher-list-card {
  overflow: hidden;
}

.voucher-table-scroll {
  overflow: auto;
}

.voucher-pagination {
  flex-shrink: 0;
}

.voucher-pagination__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.voucher-source-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
}

.group:hover .voucher-source-tag {
  opacity: 0.72;
}

.voucher-date-display {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border-radius: 6px;
  background: hsl(var(--primary));
  padding: 0 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}


.voucher-filter-panel {
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  overflow: hidden;
}

.voucher-filter-grid {
  width: 100%;
  min-width: 0;
}

.voucher-filter-grid > * {
  min-width: 0;
}

.voucher-filter-date-row {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.voucher-filter-date-row :deep(.el-select) {
  flex: 0 0 112px;
  width: 112px !important;
  min-width: 0 !important;
}

.voucher-filter-date-picker {
  flex: 1 1 0;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

.voucher-filter-panel :deep(.el-input),
.voucher-filter-panel :deep(.el-select),
.voucher-filter-panel :deep(.el-input__wrapper),
.voucher-filter-panel :deep(.el-select__wrapper),
.voucher-filter-panel :deep(.el-date-editor) {
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box;
}

.voucher-filter-date-row--narrow {
  align-items: stretch !important;
  flex-direction: column;
}

.voucher-filter-date-row--narrow :deep(.el-date-editor) {
  width: 100% !important;
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
</style>
