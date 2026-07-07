<script lang="ts" setup>
import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';
import type { PeriodCheckItem, PeriodCheckResult } from '#/api/erp/finance/period-check';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { DataAnalysis } from '@element-plus/icons-vue';

import {
  createPeriodCheckVoucher,
  getPeriodCheckPreview,
} from '#/api/erp/finance/period-check';

import {
  createPeriodCloseVoucherByPreview,
  getPeriodClosePreview,
  getPeriodReversePreview,
  reversePeriodClose,
  type PeriodClosePreviewResult,
  type PeriodReversePreviewResult,
} from '#/api/erp/finance/period';
import {
  getPeriodStatusList,
  savePeriodStatus,
  type PeriodStatusRecord,
} from '#/api/erp/finance/period-status';
import {
  getAccountCurrentAccount,
  type BilAccountSetApi,
} from '#/api/erp/finance/settings/accountset';
import { getStoredAccountSetId } from '#/utils/accountSet';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElEmpty,
  ElIcon,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElStep,
  ElSteps,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinancePeriodClose' });

type ViewTab = 'close' | 'reverse';

interface PeriodCardRecord extends PeriodStatusRecord {
  statusText: string;
  statusClass: 'closed' | 'ready-close' | 'unprocessed';
  canClose: boolean;
  canReverse: boolean;
}

interface AccountSetLite {
  rowid: string;
  accountSetId: string;
  accountName: string;
  startDate: string;
}

const router = useRouter();

const activeTab = ref<ViewTab>('close');
const loading = ref(false);
const batchSubmitting = ref(false);
const checkDialogVisible = ref(false);
const checkLoading = ref(false);
const closeSubmitting = ref(false);
const reverseSubmitting = ref(false);
const currentPeriodRow = ref<PeriodCardRecord | null>(null);
const closePreview = ref<null | PeriodClosePreviewResult>(null);
const reversePreview = ref<null | PeriodReversePreviewResult>(null);
const periodCheckPreview = ref<null | PeriodCheckResult>(null);
const periodVoucherCreatingKey = ref('');
const templateDialogVisible = ref(false);
const templateText = ref('');
const finishVoucherId = ref('');

const filters = reactive({
  accountSetId: '',
  companyName: '',
  yearsText: '',
});

function parseYears() {
  const values = String(filters.yearsText || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  return [...new Set(values)];
}

function toDateInput(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function formatPeriodCode(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthDisplay(month: number) {
  return String(Number(month || 0)).padStart(2, '0');
}

function getMonthEndDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getNextPeriod(year: number, month: number) {
  if (month >= 12) {
    return { fiscal_year: year + 1, period_month: 1, period_code: formatPeriodCode(year + 1, 1) };
  }
  return { fiscal_year: year, period_month: month + 1, period_code: formatPeriodCode(year, month + 1) };
}

function getPeriodSortValue(year: number, month: number) {
  return year * 100 + month;
}

function getCurrentPeriod() {
  const now = new Date();
  return {
    fiscal_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
  };
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatMoney(value: unknown) {
  return moneyText(value as any);
}

function toArrayRows<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.list)) return value.list as T[];
  if (Array.isArray(value?.rows)) return value.rows as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.data?.list)) return value.data.list as T[];
  if (Array.isArray(value?.data?.rows)) return value.data.rows as T[];
  if (Array.isArray(value?.data?.items)) return value.data.items as T[];
  return [];
}

function buildClosePreviewTagText() {
  const incomeCount = closePreview.value?.incomeLines?.length ?? 0;
  const expenseCount = closePreview.value?.expenseLines?.length ?? 0;
  if (incomeCount === 0 && expenseCount === 0) {
    return closePreview.value?.yearEndTransferRequired
      ? '本期无损益数据，年终仍需结转本年利润'
      : '本期无损益数据，可直接结账';
  }
  return `收入 ${incomeCount} 条 / 费用 ${expenseCount} 条`;
}

const periodCheckItems = computed<PeriodCheckItem[]>(() => periodCheckPreview.value?.items || []);

const periodCheckReadyCount = computed(() =>
  periodCheckItems.value.filter((item) => Number(item.amount || 0) > 0).length,
);

const periodCheckTotalAmount = computed(() =>
  moneyNumber(sumByMoney(periodCheckItems.value, (item) => item.amount)),
);

const closeAuditRows = computed(() => {
  const incomeRows = (closePreview.value?.incomeLines || []).map((item) => ({
    category: '收入',
    accountCode: item.accountCode,
    accountName: item.accountName,
    amount: Number(item.amount || 0),
    entryDirection: Number(item.amount || 0) >= 0 ? '借记损益科目，贷记本年利润' : '贷记损益科目，借记本年利润',
  }));
  const expenseRows = (closePreview.value?.expenseLines || []).map((item) => ({
    category: '费用',
    accountCode: item.accountCode,
    accountName: item.accountName,
    amount: Number(item.amount || 0),
    entryDirection: Number(item.amount || 0) >= 0 ? '贷记损益科目，借记本年利润' : '借记损益科目，贷记本年利润',
  }));
  return [...incomeRows, ...expenseRows];
});

const closeAuditSummary = computed(() => {
  const totalIncome = Number(closePreview.value?.totalIncome || 0);
  const totalExpense = Number(closePreview.value?.totalExpense || 0);
  const profitAmount = Number(closePreview.value?.profitAmount || 0);
  return {
    totalIncome,
    totalExpense,
    profitAmount,
    formulaText: formatMoney(totalIncome) + ' - ' + formatMoney(totalExpense) + ' = ' + formatMoney(profitAmount),
  };
});
function handleOpenPeriodSource(item: PeriodCheckItem) {
  const sourceUrl = String(item.sourceUrl || '').trim();
  if (sourceUrl) {
    router.push(sourceUrl);
    return;
  }
  if (Number(item.amount || 0) > 0) {
    ElMessage.info(item.description || item.source || '当前项目有金额，但暂未配置来源页面');
    return;
  }
  ElMessage.info(`${item.label} 当前金额为 0，暂无可跳转来源`);
}

function handleOpenPeriodTemplateDialog() {
  templateText.value = JSON.stringify(
    periodCheckItems.value.map((item) => ({
      key: item.key,
      label: item.label,
      debit: item.voucherTemplate.debit,
      credit: item.voucherTemplate.credit,
      debitSubjectCode: item.voucherTemplate.debitSubjectCode,
      creditSubjectCode: item.voucherTemplate.creditSubjectCode,
      amount: Number(item.amount || 0),
      source: item.source,
      description: item.description,
    })),
    null,
    2,
  );
  templateDialogVisible.value = true;
}

async function handleCreatePeriodCheckVoucher(item: PeriodCheckItem) {
  if (!currentPeriodRow.value) return;
  if (!(Number(item.amount || 0) > 0)) {
    ElMessage.warning(`${item.label} 金额为 0，无需生成凭证`);
    return;
  }
  periodVoucherCreatingKey.value = item.key;
  try {
    const res: any = await createPeriodCheckVoucher({
      key: item.key,
      period: currentPeriodRow.value.period_code,
      voucherDate: currentPeriodRow.value.end_date,
      accountSetId: currentPeriodRow.value.account_set_id,
      companyName: currentPeriodRow.value.company_name,
      amount: item.amount,
    });
    ElMessage.success(`已生成凭证${res?.voucher_code ? `：${res.voucher_code}` : ''}`);
    periodCheckPreview.value = await getPeriodCheckPreview({
      period: currentPeriodRow.value.period_code,
      voucherDate: currentPeriodRow.value.end_date,
      accountSetId: currentPeriodRow.value.account_set_id,
      companyName: currentPeriodRow.value.company_name,
    });
  } catch (error: any) {
    ElMessage.error(error?.message || '生成期末检查凭证失败');
  } finally {
    periodVoucherCreatingKey.value = '';
  }
}

function buildExistingVoucherText() {
  const text = String(closePreview.value?.existingVoucher?.voucher_code || '').trim();
  if (text) return text;
  const incomeCount = closePreview.value?.incomeLines?.length ?? 0;
  const expenseCount = closePreview.value?.expenseLines?.length ?? 0;
  if (incomeCount === 0 && expenseCount === 0) {
    return '本期无损益数据，执行时不会生成结转损益凭证';
  }
  return '无，执行时自动生成结转损益凭证';
}

function buildExistingVoucherReuseTagType() {
  if (!closePreview.value?.existingVoucher) return 'info';
  return closePreview.value?.existingVoucherReusable ? 'success' : 'danger';
}

function buildExistingVoucherReuseText() {
  return String(closePreview.value?.existingVoucherReuseMessage || '');
}

function buildYearEndExistingVoucherText() {
  const text = String(closePreview.value?.yearEndExistingVoucher?.voucher_code || '').trim();
  if (text) return text;
  if (!closePreview.value?.yearEndTransferRequired) return '当前期间无需生成结转利润凭证';
  return '无，执行时自动生成结转利润凭证';
}

function buildYearEndExistingVoucherTagType() {
  if (!closePreview.value?.yearEndExistingVoucher) return 'info';
  return closePreview.value?.yearEndExistingVoucherReusable ? 'success' : 'danger';
}

function buildYearEndExistingVoucherReuseText() {
  return String(closePreview.value?.yearEndExistingVoucherReuseMessage || '');
}

function buildCarryForwardVoucherText() {
  const text = String(reversePreview.value?.originalVoucher?.voucherCode || '').trim();
  return text || '未找到，反结账时仅恢复期间状态';
}

function buildReverseStatusTagText() {
  return String(reversePreview.value?.currentStatusText || '未获取').trim() || '未获取';
}

function buildReverseResultTagText() {
  if (!reversePreview.value) return '校验中';
  return reversePreview.value.canReverse ? '允许反结账' : '禁止反结账';
}

function buildOriginalVoucherText() {
  const text = String(reversePreview.value?.originalVoucher?.voucherCode || '').trim();
  return text || '未找到';
}

function isSyntheticRow(row: PeriodCardRecord) {
  return String(row.remark || '').includes('自动生成');
}

function normalizeRecord(record: PeriodStatusRecord): PeriodCardRecord {
  const carryForward = Number(record.carry_forward_status || 0);
  const close = Number(record.close_status || 0);

  let statusText = '未结账';
  let statusClass: PeriodCardRecord['statusClass'] = 'unprocessed';

  if (carryForward === 1 && close === 0) {
    statusText = '已结转损益，未结账';
    statusClass = 'ready-close';
  } else if (close === 1) {
    statusText = '已结账';
    statusClass = 'closed';
  }

  return {
    ...record,
    fiscal_year: Number(record?.fiscal_year || 0),
    period_month: Number(record?.period_month || 0),
    carry_forward_status: carryForward,
    close_status: close,
    period_code:
      record?.period_code ||
      formatPeriodCode(Number(record?.fiscal_year || 0), Number(record?.period_month || 0)),
    start_date:
      toDateInput(record?.start_date) ||
      `${Number(record?.fiscal_year || 0)}-${String(Number(record?.period_month || 0)).padStart(2, '0')}-01`,
    end_date:
      toDateInput(record?.end_date) ||
      `${Number(record?.fiscal_year || 0)}-${String(Number(record?.period_month || 0)).padStart(2, '0')}-${String(getMonthEndDay(Number(record?.fiscal_year || 0), Number(record?.period_month || 0))).padStart(2, '0')}`,
    statusText,
    statusClass,
    canClose: close === 0,
    canReverse: close === 1,
  };
}

function buildGeneratedPeriodRow(
  accountSet: AccountSetLite,
  fiscalYear: number,
  periodMonth: number,
  remark: string,
): PeriodCardRecord {
  const periodCode = formatPeriodCode(fiscalYear, periodMonth);
  return normalizeRecord({
    rowid: `${String(accountSet.rowid || '').trim()}-${periodCode}`,
    account_set_id: String(accountSet.accountSetId || accountSet.rowid || '').trim(),
    company_name: String(accountSet.accountName || '').trim(),
    fiscal_year: fiscalYear,
    period_month: periodMonth,
    period_code: periodCode,
    carry_forward_status: 0,
    close_status: 0,
    remark,
    start_date: `${fiscalYear}-${String(periodMonth).padStart(2, '0')}-01`,
    end_date: `${fiscalYear}-${String(periodMonth).padStart(2, '0')}-${String(getMonthEndDay(fiscalYear, periodMonth)).padStart(2, '0')}`,
  } as PeriodStatusRecord);
}

function buildNextPeriodRow(baseRow: PeriodCardRecord, accountSet?: AccountSetLite): PeriodCardRecord {
  const next = getNextPeriod(Number(baseRow.fiscal_year || 0), Number(baseRow.period_month || 0));
  return buildGeneratedPeriodRow(
    {
      rowid: String(baseRow.account_set_id || accountSet?.rowid || '').trim(),
      accountSetId: String(baseRow.account_set_id || accountSet?.accountSetId || '').trim(),
      accountName: String(baseRow.company_name || accountSet?.accountName || '').trim(),
      startDate: String(accountSet?.startDate || ''),
    },
    next.fiscal_year,
    next.period_month,
    `根据 ${baseRow.period_code} 已结转自动显示下一期间`,
  );
}

function getDisplayEndPeriod(
  accountSetId: string,
  latestClosedMap: Map<string, PeriodCardRecord>,
) {
  const current = getCurrentPeriod();
  let endYear = current.fiscal_year;
  let endMonth = current.period_month;
  const latestClosedRow = latestClosedMap.get(accountSetId);
  if (latestClosedRow) {
    const nextPeriod = getNextPeriod(latestClosedRow.fiscal_year, latestClosedRow.period_month);
    const nextSort = getPeriodSortValue(nextPeriod.fiscal_year, nextPeriod.period_month);
    const currentSort = getPeriodSortValue(current.fiscal_year, current.period_month);
    if (nextSort > currentSort) {
      endYear = nextPeriod.fiscal_year;
      endMonth = nextPeriod.period_month;
    }
  }
  return { endYear, endMonth };
}

function buildContinuousPeriodRows(
  accountSet: AccountSetLite,
  latestClosedMap: Map<string, PeriodCardRecord>,
) {
  const startDateText = toDateInput(accountSet.startDate);
  if (!startDateText) return [] as PeriodCardRecord[];

  const [startYearText, startMonthText] = startDateText.split('-');
  const startYear = Number(startYearText);
  const startMonth = Number(startMonthText);
  if (!startYear || !startMonth) return [] as PeriodCardRecord[];

  const { endYear, endMonth } = getDisplayEndPeriod(
    String(accountSet.accountSetId || accountSet.rowid || '').trim(),
    latestClosedMap,
  );
  const startSort = getPeriodSortValue(startYear, startMonth);
  const endSort = getPeriodSortValue(endYear, endMonth);
  if (startSort > endSort) return [] as PeriodCardRecord[];

  const result: PeriodCardRecord[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === endYear ? endMonth : 12;
    for (let month = monthStart; month <= monthEnd; month += 1) {
      result.push(
        buildGeneratedPeriodRow(
          accountSet,
          year,
          month,
          `根据账套启用日期 ${startDateText} 自动生成连续期间`,
        ),
      );
    }
  }
  return result;
}

function isSameAccountSet(accountSet: AccountSetLite, accountSetId: string) {
  const target = String(accountSetId || '').trim();
  if (!target) return true;
  return String(accountSet.rowid || '').trim() === target || String(accountSet.accountSetId || '').trim() === target;
}

function getRecordAccountSetId(record: PeriodStatusRecord) {
  return String(record.account_set_id || '').trim();
}

function mergePeriodRecords(
  accountSets: AccountSetLite[],
  statusRows: PeriodStatusRecord[],
): PeriodCardRecord[] {
  const accountSetMap = new Map<string, AccountSetLite>();
  for (const item of accountSets) {
    const rowid = String(item.rowid || '').trim();
    const accountSetId = String(item.accountSetId || '').trim();
    if (rowid) accountSetMap.set(rowid, item);
    if (accountSetId) accountSetMap.set(accountSetId, item);
  }

  const normalizedRows = statusRows
    .map((item) => {
      const normalized = normalizeRecord(item);
      const accountSet = accountSetMap.get(getRecordAccountSetId(normalized));
      if (!String(normalized.company_name || '').trim() && accountSet?.accountName) {
        normalized.company_name = accountSet.accountName;
      }
      return normalized;
    })
    .filter((item) => String(item.account_set_id || '').trim());

  const mergedMap = new Map<string, PeriodCardRecord>();
  for (const item of normalizedRows) {
    mergedMap.set(`${item.account_set_id}_${item.period_code}`, item);
  }

  const latestClosedMap = new Map<string, PeriodCardRecord>();
  for (const item of normalizedRows) {
    if (Number(item.close_status || 0) !== 1) continue;
    const accountSetId = String(item.account_set_id || '').trim();
    const current = latestClosedMap.get(accountSetId);
    if (!current || getPeriodSortValue(item.fiscal_year, item.period_month) > getPeriodSortValue(current.fiscal_year, current.period_month)) {
      latestClosedMap.set(accountSetId, item);
    }
  }

  for (const accountSet of accountSets) {
    const generatedRows = buildContinuousPeriodRows(accountSet, latestClosedMap);
    for (const row of generatedRows) {
      const key = `${row.account_set_id}_${row.period_code}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, row);
      }
    }
  }

  return [...mergedMap.values()].sort((a, b) => {
    const accountCompare = String(a.account_set_id || '').localeCompare(String(b.account_set_id || ''));
    if (accountCompare !== 0) return accountCompare;
    if (Number(a.fiscal_year || 0) !== Number(b.fiscal_year || 0)) {
      return Number(b.fiscal_year || 0) - Number(a.fiscal_year || 0);
    }
    return Number(b.period_month || 0) - Number(a.period_month || 0);
  });
}

const records = ref<PeriodCardRecord[]>([]);

const groupedYears = computed(() => {
  const map = new Map<number, PeriodCardRecord[]>();
  for (const item of records.value) {
    const list = map.get(item.fiscal_year) || [];
    list.push(item);
    map.set(item.fiscal_year, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({
      year,
      items: [...list].sort((a, b) => b.period_month - a.period_month),
    }));
});

const visibleYears = computed(() => {
  if (activeTab.value === 'close') return groupedYears.value;
  return groupedYears.value
    .map((yearGroup) => ({
      ...yearGroup,
      items: yearGroup.items.filter((item) => item.canReverse),
    }))
    .filter((yearGroup) => yearGroup.items.length > 0);
});

const legendItems = computed(() => {
  return [
    { label: '未结账', className: 'unprocessed' },
    { label: '已结转损益，未结账', className: 'ready-close' },
    { label: '已结账', className: 'closed' },
  ];
});

const batchButtonText = computed(() =>
  activeTab.value === 'close' ? '批量结账' : '批量反结账',
);

const currentStep = computed(() => {
  if (activeTab.value === 'reverse') return reversePreview.value?.canReverse ? 2 : 1;
  if (!closePreview.value) return 1;
  if (finishVoucherId.value) {
    return closePreview.value.yearEndTransferRequired ? 4 : 3;
  }
  if (closePreview.value.yearEndTransferRequired) {
    if (closePreview.value.yearEndExistingVoucher) return 3;
    if (closePreview.value.existingVoucher) return 2;
    return 1;
  }
  return closePreview.value.existingVoucher ? 2 : 1;
});

async function loadData() {
  loading.value = true;
  try {
    const years = parseYears();
    const [statusList, accountSetPage] = await Promise.all([
      getPeriodStatusList({
        accountSetId: filters.accountSetId || undefined,
        companyName: filters.companyName || undefined,
        years,
      }),
      getAccountCurrentAccount({
        pageNo: 1,
        page: 0,
      }),
    ]);

    const currentAccountSetId = String(filters.accountSetId || getStoredAccountSetId() || '').trim();
    const accountSets = (accountSetPage?.list || [])
      .map((item: BilAccountSetApi.AccountSet) => ({
        rowid: String(item.rowid || '').trim(),
        accountSetId: String(item.account_set_id || item.rowid || '').trim(),
        accountName: String(item.account_name || '').trim(),
        startDate: toDateInput(item.start_date || item.init_date),
      }))
      .filter((item: AccountSetLite) => item.rowid || item.accountSetId)
      .filter((item: AccountSetLite) => isSameAccountSet(item, currentAccountSetId))
      .filter((item: AccountSetLite) =>
        filters.companyName ? item.accountName.includes(String(filters.companyName).trim()) : true,
      );

    let mergedRows = mergePeriodRecords(accountSets, toArrayRows<PeriodStatusRecord>(statusList));
    if (years.length > 0) {
      mergedRows = mergedRows.filter((item) => years.includes(Number(item.fiscal_year || 0)));
    }
    records.value = mergedRows;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载期间状态失败');
  } finally {
    loading.value = false;
  }
}

async function handleCardClick(item: PeriodCardRecord) {
  if (activeTab.value === 'close') {
    router.push({
      name: 'FinancePeriodCloseCheck',
      query: {
        accountSetId: item.account_set_id,
        companyName: item.company_name,
        endDate: item.end_date,
        period: item.period_code,
      },
    });
    return;
  }

  currentPeriodRow.value = item;
  closePreview.value = null;
  reversePreview.value = null;
  periodCheckPreview.value = null;
  finishVoucherId.value = '';
  checkDialogVisible.value = true;
  checkLoading.value = true;

  try {
    if (activeTab.value === 'reverse') {
      reversePreview.value = await getPeriodReversePreview({
        period: item.period_code,
        accountSetId: item.account_set_id,
        companyName: item.company_name,
      });
      return;
    }

    const [periodClose, periodCheck] = await Promise.all([
      getPeriodClosePreview({
        period: item.period_code,
        accountSetId: item.account_set_id,
        companyName: item.company_name,
      }),
      getPeriodCheckPreview({
        period: item.period_code,
        voucherDate: item.end_date,
        accountSetId: item.account_set_id,
        companyName: item.company_name,
      }),
    ]);
    closePreview.value = periodClose;
    periodCheckPreview.value = periodCheck;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || (activeTab.value === 'reverse' ? '加载反结账预览失败' : '加载结账预览失败'));
    checkDialogVisible.value = false;
  } finally {
    checkLoading.value = false;
  }
}

async function handleExecuteClose() {
  if (!currentPeriodRow.value || !closePreview.value) return;

  closeSubmitting.value = true;
  try {
    const closeResult = await createPeriodCloseVoucherByPreview(closePreview.value, {
      period: currentPeriodRow.value.period_code,
      accountSetId: currentPeriodRow.value.account_set_id,
      companyName: currentPeriodRow.value.company_name,
    });
    const carryForwardVoucherId = String(closeResult?.carryForwardVoucherId || closeResult?.voucherId || '');
    const carryForwardVoucherCode = String(closeResult?.carryForwardVoucherCode || closeResult?.voucherCode || '');
    const yearEndVoucherId = String(closeResult?.yearEndVoucherId || '');
    const yearEndVoucherCode = String(closeResult?.yearEndVoucherCode || '');
    const voucherId = String(yearEndVoucherId || carryForwardVoucherId || closeResult?.voucherId || '');
    const voucherCode = String(yearEndVoucherCode || carryForwardVoucherCode || closeResult?.voucherCode || '');

    const nowText = formatDateTime(new Date());

    await savePeriodStatus({
      rowid: isSyntheticRow(currentPeriodRow.value) ? undefined : currentPeriodRow.value.rowid,
      account_set_id: String(currentPeriodRow.value.account_set_id || ''),
      company_name: currentPeriodRow.value.company_name || '',
      fiscal_year: Number(currentPeriodRow.value.fiscal_year || 0),
      period_month: Number(currentPeriodRow.value.period_month || 0),
      period_code: currentPeriodRow.value.period_code,
      carry_forward_status: 1,
      close_status: 1,
      carry_forward_voucher_id: carryForwardVoucherId,
      carry_forward_voucher_code: carryForwardVoucherCode,
      carry_forward_at: nowText,
      carry_forward_by: '当前用户',
      close_voucher_id: yearEndVoucherId || carryForwardVoucherId,
      close_at: nowText,
      close_by: '当前用户',
      remark:
        voucherId
          ? closePreview.value.yearEndTransferRequired
            ? `期间 ${currentPeriodRow.value.period_code} 已完成结转损益，并将 3103 本年利润结转到 3104006 未分配利润后结账`
            : `期间 ${currentPeriodRow.value.period_code} 已完成结转损益并结账`
          : `期间 ${currentPeriodRow.value.period_code} 本期无损益数据，已直接完成结账`,
      start_date: currentPeriodRow.value.start_date,
      end_date: currentPeriodRow.value.end_date,
    });

    finishVoucherId.value = voucherId;
    const updatedRow = normalizeRecord({
      ...currentPeriodRow.value,
      carry_forward_status: 1,
      close_status: 1,
      carry_forward_voucher_id: carryForwardVoucherId,
      carry_forward_voucher_code: carryForwardVoucherCode,
      carry_forward_at: nowText,
      carry_forward_by: '当前用户',
      close_voucher_id: yearEndVoucherId || carryForwardVoucherId,
      close_at: nowText,
      close_by: '当前用户',
      remark:
        voucherId
          ? closePreview.value.yearEndTransferRequired
            ? `期间 ${currentPeriodRow.value.period_code} 已完成结转损益，并将 3103 本年利润结转到 3104006 未分配利润后结账`
            : `期间 ${currentPeriodRow.value.period_code} 已完成结转损益并结账`
          : `期间 ${currentPeriodRow.value.period_code} 本期无损益数据，已直接完成结账`,
    } as PeriodStatusRecord);
    const nextRow = buildNextPeriodRow(updatedRow);
    currentPeriodRow.value = updatedRow;
    records.value = records.value
      .filter(
        (item) =>
          !(item.account_set_id === updatedRow.account_set_id && item.period_code === nextRow.period_code),
      )
      .map((item) =>
        item.account_set_id === updatedRow.account_set_id && item.period_code === updatedRow.period_code
          ? updatedRow
          : item,
      );
    records.value = [...records.value, nextRow].sort((a, b) => {
      const accountCompare = String(a.account_set_id || '').localeCompare(String(b.account_set_id || ''));
      if (accountCompare !== 0) return accountCompare;
      if (Number(a.fiscal_year || 0) !== Number(b.fiscal_year || 0)) {
        return Number(b.fiscal_year || 0) - Number(a.fiscal_year || 0);
      }
      return Number(b.period_month || 0) - Number(a.period_month || 0);
    });
    closePreview.value = {
      ...closePreview.value,
      existingVoucher: carryForwardVoucherId
        ? {
            rowid: carryForwardVoucherId,
            voucher_code: carryForwardVoucherCode,
            business_code: `PERIOD-CLOSE-${updatedRow.period_code}`,
            business_name: '结转损益',
            voucher_date: closePreview.value.voucherDate,
          }
        : closePreview.value.existingVoucher,
      yearEndExistingVoucher: yearEndVoucherId
        ? {
            rowid: yearEndVoucherId,
            voucher_code: yearEndVoucherCode,
            business_code: `PERIOD-PROFIT-${updatedRow.period_code}`,
            business_name: '结转利润',
            voucher_date: closePreview.value.voucherDate,
          }
        : closePreview.value.yearEndExistingVoucher,
    };

    ElMessage.success(
      voucherId
        ? closePreview.value.yearEndTransferRequired
          ? `期间 ${currentPeriodRow.value.period_code} 已完成结转损益、3103→3104006 年终结转并结账`
          : `期间 ${currentPeriodRow.value.period_code} 已完成结转损益并结账`
        : `期间 ${currentPeriodRow.value.period_code} 本期无损益数据，已直接结账`,
    );
    checkDialogVisible.value = false;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '执行期间结转失败');
  } finally {
    closeSubmitting.value = false;
  }
}

async function handleExecuteReverse() {
  if (!currentPeriodRow.value || !reversePreview.value) return;
  if (!reversePreview.value.canReverse) {
    ElMessage.warning(reversePreview.value.canReverseReason || '当前期间不允许反结账');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定反结账 ${currentPeriodRow.value.period_code} 吗？系统会恢复期间状态为“已结转损益，未结账”；若存在旧结转损益凭证则继续保留，不会自动删除或冲红。`,
      '反结账确认',
      { type: 'warning', confirmButtonText: '确认反结账', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }

  reverseSubmitting.value = true;
  try {
    await reversePeriodClose({
      period: currentPeriodRow.value.period_code,
      accountSetId: currentPeriodRow.value.account_set_id,
      companyName: currentPeriodRow.value.company_name,
    });
    ElMessage.success(`期间 ${currentPeriodRow.value.period_code} 已反结账`);
    checkDialogVisible.value = false;
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '执行反结账失败');
  } finally {
    reverseSubmitting.value = false;
  }
}

async function handleBatchAction() {
  batchSubmitting.value = true;
  try {
    if (activeTab.value === 'close') {
      const matched = records.value.filter((item) => Number(item.close_status || 0) === 0);
      if (matched.length === 0) {
        ElMessage.warning('没有可批量结账的期间');
        return;
      }
      ElMessage.success(`批量结账入口已预留，当前命中 ${matched.length} 个期间。`);
      return;
    }

    const matched = records.value.filter((item) => item.canReverse);
    if (matched.length === 0) {
      ElMessage.warning('没有可批量反结账的期间');
      return;
    }
    const sorted = [...matched].sort((a, b) => {
      if (Number(a.fiscal_year || 0) !== Number(b.fiscal_year || 0)) {
        return Number(b.fiscal_year || 0) - Number(a.fiscal_year || 0);
      }
      return Number(b.period_month || 0) - Number(a.period_month || 0);
    });

    let successCount = 0;
    for (const item of sorted) {
      try {
        await reversePeriodClose({
          period: item.period_code,
          accountSetId: item.account_set_id,
          companyName: item.company_name,
        });
        successCount += 1;
      } catch (error: any) {
        ElMessage.warning(error?.message || `期间 ${item.period_code} 反结账失败，批量处理已停止`);
        break;
      }
    }
    await loadData();
    ElMessage.success(`批量反结账完成，已处理 ${successCount} 个期间。`);
  } finally {
    batchSubmitting.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height class="period-page-shell">
    <div class="period-page">
      <div class="top-tabs">
        <div class="top-tab" :class="{ active: activeTab === 'close' }" @click="activeTab = 'close'">
          期末处理
        </div>
        <div class="top-tab" :class="{ active: activeTab === 'reverse' }" @click="activeTab = 'reverse'">
          反结账
        </div>
      </div>

      <div class="legend-card">
        <div class="legend-title">状态图例</div>
        <div class="legend-list">
          <div v-for="item in legendItems" :key="item.label" class="legend-item">
            <span class="legend-dot" :class="item.className"></span>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>

      <div v-loading="loading" class="years-wrap">
        <template v-if="visibleYears.length > 0">
          <div v-for="yearGroup in visibleYears" :key="yearGroup.year" class="year-card">
            <div class="year-header">
              <div class="year-title">{{ yearGroup.year }}</div>
              <div class="year-watermark">{{ yearGroup.year }}</div>
            </div>
            <div class="month-grid">
              <div
                v-for="item in yearGroup.items"
                :key="item.rowid || `${item.account_set_id}-${item.period_code}`"
                class="month-card"
                :class="item.statusClass"
                @click="handleCardClick(item)"
              >
                <div class="month-card-bg"></div>
                <div class="month-card-icon" aria-hidden="true">
                  <span v-if="item.statusClass === 'closed'" class="lock-shape"></span>
                  <span v-else class="wallet-shape"></span>
                </div>
                <div class="month-main">
                  <span class="month-num">{{ formatMonthDisplay(item.period_month) }}</span>
                  <span class="month-unit">月</span>
                </div>
                <div class="month-status">{{ item.statusText }}</div>
              </div>
            </div>
          </div>
        </template>

        <el-empty v-else description="未查询到期间数据，且没有可从账套启用时间推导出的连续期间" />
      </div>

      <el-dialog
        v-model="checkDialogVisible"
        class="period-close-dialog"
        :title="activeTab === 'close' ? '期间结账处理' : '期间反结账处理'"
        width="min(1180px, 96vw)"
        destroy-on-close
      >
        <div v-loading="checkLoading" class="close-process-wrap">
          <template v-if="activeTab === 'close' && currentPeriodRow && closePreview">

            <div class="period-check-frame">
              <div class="period-check-header">
                <div class="period-check-title-wrap">
                  <span class="period-check-title">第 1 步：期末检查</span>
                  <span class="period-check-warning">*请检查是否有需要生成凭证，如无需处理，点击下一步即可！</span>
                </div>
                <el-button @click="handleOpenPeriodTemplateDialog">自定义结转模板</el-button>
              </div>

              <div class="period-card-grid">
                <div v-for="item in periodCheckItems" :key="item.key" class="period-check-card">
                  <div class="period-card-head">
                    <el-icon class="period-card-icon"><DataAnalysis /></el-icon>
                    <span class="period-card-title">{{ item.label }}</span>
                  </div>
                  <div class="period-card-body">
                    <button
                      class="period-amount-button"
                      type="button"
                      :title="item.description"
                      @click.stop="handleOpenPeriodSource(item)"
                    >
                      {{ moneyText(item.amount) }}
                    </button>
                    <el-button
                      class="period-voucher-btn"
                      type="success"
                      size="small"
                      :loading="periodVoucherCreatingKey === item.key"
                      @click.stop="handleCreatePeriodCheckVoucher(item)"
                    >
                      生成凭证
                    </el-button>
                  </div>
                </div>
              </div>

              <div class="period-check-summary">
                当前期间 {{ currentPeriodRow.period_code }}，检测到 {{ periodCheckReadyCount }} 个有金额项目，合计 {{ formatMoney(periodCheckTotalAmount) }}。
              </div>
            </div>

            <el-steps :active="currentStep" finish-status="success" align-center>
              <el-step title="结转前检查" description="核对本月损益结转金额" />
              <el-step title="结转损益" description="生成/复用结转损益凭证" />
              <el-step
                v-if="closePreview.yearEndTransferRequired"
                title="结转利润"
                description="生成/复用结转利润凭证"
              />
              <el-step title="完成结账" description="回写期间状态为已结账" />
            </el-steps>

            <el-descriptions class="process-desc" :column="2" border>
              <el-descriptions-item label="公司">{{ currentPeriodRow.company_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="期间">{{ currentPeriodRow.period_code }}</el-descriptions-item>
              <el-descriptions-item label="结转损益预览">
                <el-tag type="info">{{ buildClosePreviewTagText() }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="结转损益凭证">
                <el-tag :type="closePreview.existingVoucher ? buildExistingVoucherReuseTagType() : 'success'">{{ buildExistingVoucherText() }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="closePreview.yearEndTransferRequired" label="结转利润凭证">
                <el-tag :type="closePreview.yearEndExistingVoucher ? buildYearEndExistingVoucherTagType() : 'success'">{{ buildYearEndExistingVoucherText() }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>

            <div class="panel-card">
              <div class="panel-title">第一步：结转损益</div>
              <div class="panel-hint">
                该步骤会读取当前月份已录入的凭证，汇总本期损益类科目后结转到本年利润，并额外兜底纳入所得税费用。若原结转损益凭证与当前损益数据一致，则直接复用；若已不一致，需先删除旧结转损益凭证，再重新结账。
              </div>
              <div class="check-tag-row">
                <el-tag type="info">{{ buildClosePreviewTagText() }}</el-tag>
                <el-tag>{{ `利润 ${formatMoney(closePreview.profitAmount)}` }}</el-tag>
                <el-tag v-if="closePreview.incomeTaxExpenseSubject" type="warning">
                  {{ `含所得税科目 ${closePreview.incomeTaxExpenseSubject.code}` }}
                </el-tag>
                <el-tag :type="closePreview.existingVoucher ? buildExistingVoucherReuseTagType() : 'success'">{{ buildExistingVoucherText() }}</el-tag>
                <el-tag v-if="closePreview.existingVoucher" :type="buildExistingVoucherReuseTagType()">{{ buildExistingVoucherReuseText() }}</el-tag>
              </div>
              <div class="close-preview-grid">
                <div class="close-preview-box">
                  <div class="preview-label">本期收入合计</div>
                  <div class="preview-value">{{ formatMoney(closePreview.totalIncome) }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">本期费用合计</div>
                  <div class="preview-value">{{ formatMoney(closePreview.totalExpense) }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">本期利润</div>
                  <div class="preview-value">{{ formatMoney(closePreview.profitAmount) }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">前端核算公式</div>
                  <div class="preview-value small">{{ closeAuditSummary.formulaText }}</div>
                </div>
              </div>
              <div class="audit-table-wrap">
                <div class="audit-title">前端核算明细</div>
                <el-table :data="closeAuditRows" border size="small" max-height="260">
                  <el-table-column prop="category" label="类别" width="80" />
                  <el-table-column prop="accountCode" label="科目编码" width="120" />
                  <el-table-column prop="accountName" label="科目名称" min-width="160" />
                  <el-table-column label="结转金额" width="130" align="right">
                    <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
                  </el-table-column>
                  <el-table-column prop="entryDirection" label="生成分录方向" min-width="220" />
                </el-table>
              </div>
            </div>

            <div v-if="closePreview.yearEndTransferRequired" class="panel-card">
              <div class="panel-title">第二步：结转利润</div>
              <div class="panel-hint">
                12 月完成结转损益后，系统会继续根据本年利润余额，单独生成一张“结转利润”凭证，将 3103 本年利润转入 3104006 未分配利润。若原结转利润凭证与当前金额一致，则直接复用。
              </div>
              <div class="check-tag-row">
                <el-tag type="success">{{ `结转利润 ${formatMoney(closePreview.yearEndTransferAmount)}` }}</el-tag>
                <el-tag>{{ `本年利润余额 ${formatMoney(closePreview.yearEndCurrentYearProfitBalance)}` }}</el-tag>
                <el-tag :type="closePreview.yearEndExistingVoucher ? buildYearEndExistingVoucherTagType() : 'success'">{{ buildYearEndExistingVoucherText() }}</el-tag>
                <el-tag v-if="closePreview.yearEndExistingVoucher" :type="buildYearEndExistingVoucherTagType()">{{ buildYearEndExistingVoucherReuseText() }}</el-tag>
              </div>
              <div class="close-preview-grid">
                <div class="close-preview-box">
                  <div class="preview-label">年终本年利润余额</div>
                  <div class="preview-value">{{ formatMoney(closePreview.yearEndCurrentYearProfitBalance) }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">转入未分配利润</div>
                  <div class="preview-value">{{ formatMoney(closePreview.yearEndTransferAmount) }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">结转利润凭证</div>
                  <div class="preview-value small">{{ buildYearEndExistingVoucherText() }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">分录方向</div>
                  <div class="preview-value small">3103 本年利润 → 3104006 未分配利润</div>
                </div>
              </div>
            </div>
          </template>

          <template v-if="activeTab === 'reverse' && currentPeriodRow && reversePreview">
            <el-steps :active="currentStep" finish-status="success" align-center>
              <el-step title="反结账校验" description="检查当前期间是否允许反结账" />
              <el-step title="保留结转损益凭证" description="确认原结转损益凭证保留不动" />
              <el-step title="完成反结账" description="恢复为已结转损益，未结账" />
            </el-steps>

            <el-descriptions class="process-desc" :column="2" border>
              <el-descriptions-item label="账套">{{ currentPeriodRow.account_set_id || '-' }}</el-descriptions-item>
              <el-descriptions-item label="公司">{{ currentPeriodRow.company_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="期间">{{ currentPeriodRow.period_code }}</el-descriptions-item>
              <el-descriptions-item label="期间范围">{{ reversePreview.startDate }} ~ {{ reversePreview.endDate }}</el-descriptions-item>
              <el-descriptions-item label="当前状态">
                <el-tag :type="reversePreview.canReverse ? 'success' : 'warning'">{{ buildReverseStatusTagText() }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="校验结果">
                <el-tag :type="reversePreview.canReverse ? 'success' : 'danger'">
                  {{ buildReverseResultTagText() }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>

            <div class="panel-card">
              <div class="panel-title">第一步：反结账校验</div>
              <div class="panel-hint">{{ reversePreview.canReverseReason || '未返回校验说明' }}</div>
              <div v-if="reversePreview.blockedByPeriods.length > 0" class="warning-list">
                后续已结账期间：{{ reversePreview.blockedByPeriods.join('、') }}
              </div>
            </div>

            <div class="panel-card">
              <div class="panel-title">第二步：结转损益凭证处理说明</div>
              <div class="panel-hint">
                反结账不会自动删除或冲红原结转损益凭证。若未修改损益类凭证，可直接重新结账；若已修改损益类凭证，应先删除旧结转损益凭证，再重新生成，不做冲红。若原结转损益凭证已经不存在，也允许只恢复期间状态，便于继续调整普通凭证。
              </div>
              <div class="check-tag-row">
                <el-tag type="info">{{ buildOriginalVoucherText() }}</el-tag>
                <el-tag>{{ `原结转分录 ${reversePreview.reverseLineCount ?? 0} 条` }}</el-tag>
                <el-tag type="success">反结账不自动冲红</el-tag>
              </div>
              <div class="close-preview-grid">
                <div class="close-preview-box">
                  <div class="preview-label">原结转损益凭证</div>
                  <div class="preview-value small">{{ buildCarryForwardVoucherText() }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">原凭证日期</div>
                  <div class="preview-value small">{{ reversePreview.originalVoucher?.voucherDate || '-' }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">原结转分录数</div>
                  <div class="preview-value">{{ reversePreview.reverseLineCount ?? 0 }}</div>
                </div>
                <div class="close-preview-box">
                  <div class="preview-label">反结账后状态</div>
                  <div class="preview-value small">已结转损益，未结账</div>
                </div>
              </div>
            </div>
          </template>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="checkDialogVisible = false">关闭</el-button>
            <el-button
              v-if="activeTab === 'close'"
              type="primary"
              :loading="closeSubmitting"
              :disabled="!!((closePreview?.existingVoucher && !closePreview?.existingVoucherReusable) || (closePreview?.yearEndExistingVoucher && !closePreview?.yearEndExistingVoucherReusable))"
              @click="handleExecuteClose"
            >
              {{ closePreview?.yearEndTransferRequired ? '执行结转损益、年终结转并结账' : '执行结转损益并结账' }}
            </el-button>
            <el-button
              v-else
              type="danger"
              :loading="reverseSubmitting"
              @click="handleExecuteReverse"
            >
              执行反结账
            </el-button>
          </div>
        </template>
      </el-dialog>

      <el-dialog v-model="templateDialogVisible" title="自定义结转模板" width="780px">
        <div class="template-tip">
          当前展示本期间固定期末检查卡片对应的凭证模板；卡片名称固定展示，没有数据时金额为 0，有数据时展示对应未结转金额和来源说明。
        </div>
        <el-input v-model="templateText" type="textarea" :rows="18" />
        <template #footer>
          <el-button type="primary" @click="templateDialogVisible = false">关闭</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
:deep(.period-page-shell),
:deep(.period-page-shell .vben-page),
:deep(.period-page-shell .vben-page-content),
:deep(.period-page-shell .page-content) {
  padding-top: 0 !important;
}

.period-page {
  --period-primary: #0f6bff;
  --period-primary-dark: #0957d8;
  --period-primary-soft: #eaf3ff;
  --period-cyan: #45b8ff;
  --period-text: #13233f;
  --period-sub: #66758f;
  --period-border: #dbe8ff;
  --period-border-strong: #9dc5ff;
  --period-shadow: 0 12px 34px rgb(22 82 160 / 8%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 2px 12px;
}

.top-tabs {
  display: flex;
  gap: 0;
  width: fit-content;
  overflow: hidden;
  border: 1px solid #dce7f7;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 3px 10px rgb(15 107 255 / 6%);
}

.top-tab {
  min-width: 112px;
  padding: 10px 22px;
  border-right: 1px solid #e7eef9;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  color: #27364f;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  transition: all 0.18s ease;
}

.top-tab:last-child { border-right: 0; }
.top-tab:hover { color: var(--period-primary); background: #f3f8ff; }
.top-tab.active {
  color: #fff;
  border-color: var(--period-primary);
  background: linear-gradient(180deg, #1677ff 0%, #075fe8 100%);
  box-shadow: 0 8px 18px rgb(15 107 255 / 20%);
}

.toolbar-card,
.legend-card,
.year-card,
.panel-card {
  background: #fff;
  border: 1px solid #e2ebf8;
  border-radius: 10px;
  box-shadow: 0 6px 22px rgb(28 68 130 / 4%);
}

.toolbar-card { display: flex; justify-content: space-between; gap: 16px; padding: 16px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--period-text); }
.page-desc { margin-top: 8px; line-height: 22px; color: var(--period-sub); }
.toolbar-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.toolbar-actions { display: flex; gap: 12px; }

.legend-card {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 18px;
  border-color: var(--period-border);
  background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
}
.legend-title,
.panel-title {
  flex: 0 0 auto;
  margin-right: 28px;
  color: var(--period-text);
  font-weight: 700;
}
.panel-hint { margin-top: 6px; color: var(--period-sub); line-height: 20px; }
.legend-list { display: flex; flex-wrap: wrap; gap: 28px; }
.legend-item { display: flex; align-items: center; gap: 8px; color: #34445f; font-size: 13px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.legend-dot.unprocessed { background: var(--period-primary); box-shadow: 0 0 0 3px rgb(15 107 255 / 10%); }
.legend-dot.ready-close { background: var(--period-cyan); box-shadow: 0 0 0 3px rgb(69 184 255 / 10%); }
.legend-dot.closed { background: #98a4b5; box-shadow: 0 0 0 3px rgb(152 164 181 / 12%); }

.years-wrap { display: flex; flex-direction: column; gap: 8px; min-height: 260px; }
.year-card {
  position: relative;
  overflow: hidden;
  padding: 16px 20px 20px;
  border-color: var(--period-border);
  background: linear-gradient(180deg, #fff 0%, #fcfdff 100%);
}
.year-header {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 38px;
  margin-bottom: 10px;
}
.year-title {
  position: relative;
  z-index: 1;
  color: var(--period-primary);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 2px;
}
.year-title::after {
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 24px;
  height: 2px;
  border-radius: 99px;
  background: var(--period-primary);
  content: '';
}
.year-watermark {
  position: absolute;
  right: 18px;
  top: 0;
  color: #d8e7fb;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 4px;
  user-select: none;
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 16px 22px;
}
.month-card {
  position: relative;
  min-height: 108px;
  overflow: hidden;
  padding: 16px 18px 14px;
  border: 1px solid #dfe6f2;
  border-radius: 8px;
  background: linear-gradient(145deg, #fff 0%, #f8fbff 100%);
  color: var(--period-text);
  cursor: pointer;
  box-shadow: 0 8px 20px rgb(39 73 125 / 5%);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.month-card:hover {
  transform: translateY(-2px);
  border-color: var(--period-primary);
  box-shadow: 0 14px 30px rgb(15 107 255 / 12%);
}
.month-card-bg {
  position: absolute;
  right: -34px;
  bottom: -58px;
  width: 128px;
  height: 128px;
  border-radius: 999px 0 0 0;
  background: radial-gradient(circle at 34% 34%, rgb(15 107 255 / 10%), rgb(15 107 255 / 3%) 62%, transparent 63%);
  pointer-events: none;
}
.month-card-icon {
  position: absolute;
  right: 16px;
  top: 17px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}
.wallet-shape,
.lock-shape {
  position: relative;
  display: block;
  width: 15px;
  height: 12px;
  border-radius: 3px;
  background: linear-gradient(180deg, #2b8cff 0%, #0b67f5 100%);
  box-shadow: 0 4px 8px rgb(15 107 255 / 20%);
}
.wallet-shape::before {
  position: absolute;
  top: -3px;
  left: 2px;
  width: 11px;
  height: 5px;
  border-radius: 3px 3px 1px 1px;
  background: #72b4ff;
  content: '';
}
.wallet-shape::after {
  position: absolute;
  right: 2px;
  top: 5px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff;
  content: '';
}
.lock-shape {
  width: 13px;
  height: 10px;
  border-radius: 2px;
  background: linear-gradient(180deg, #8b96a8 0%, #6f7b8e 100%);
  box-shadow: none;
}
.lock-shape::before {
  position: absolute;
  left: 3px;
  top: -7px;
  width: 7px;
  height: 8px;
  border: 2px solid #7c8798;
  border-bottom: 0;
  border-radius: 7px 7px 0 0;
  box-sizing: border-box;
  content: '';
}
.month-main { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 6px; }
.month-num { color: var(--period-primary); font-size: 32px; line-height: 1; font-weight: 800; letter-spacing: 1px; }
.month-unit { color: #1d57a8; font-size: 13px; font-weight: 700; }
.month-status { position: relative; z-index: 1; margin-top: 11px; color: var(--period-primary); font-size: 13px; line-height: 18px; font-weight: 700; }
.month-meta { position: relative; z-index: 1; margin-top: 8px; color: #263b5f; font-size: 12px; line-height: 17px; opacity: 0.9; word-break: break-all; }
.month-card.unprocessed {
  border-color: #7fb0ff;
  background: linear-gradient(145deg, #dceaff 0%, #cfe2ff 100%);
  box-shadow: 0 10px 24px rgb(15 107 255 / 10%);
}
.month-card.unprocessed .month-num,
.month-card.unprocessed .month-unit,
.month-card.unprocessed .month-status {
  color: #0a56d8;
}
.month-card.unprocessed .month-meta {
  color: #27456f;
  opacity: 0.95;
}
.month-card.unprocessed .month-card-bg {
  background: radial-gradient(circle at 34% 34%, rgb(15 107 255 / 18%), rgb(15 107 255 / 7%) 62%, transparent 63%);
}
.month-card.ready-close {
  border-color: var(--period-border-strong);
  background: linear-gradient(145deg, #f3f8ff 0%, #eaf4ff 100%);
}
.month-card.ready-close .month-card-bg { background: radial-gradient(circle at 34% 34%, rgb(69 184 255 / 12%), rgb(69 184 255 / 4%) 62%, transparent 63%); }
.month-card.closed {
  border-color: #e2e6ee;
  background: linear-gradient(145deg, #fff 0%, #f7f8fa 100%);
}
.month-card.closed .month-num,
.month-card.closed .month-unit,
.month-card.closed .month-status { color: #465266; }
.month-card.closed .month-meta { color: #40516a; opacity: 0.82; }
.month-card.closed .month-card-bg { background: radial-gradient(circle at 34% 34%, rgb(100 116 139 / 9%), rgb(100 116 139 / 3%) 62%, transparent 63%); }

.close-process-wrap { display: flex; flex-direction: column; gap: 16px; min-height: 240px; }
.process-desc { margin-top: 16px; }
.panel-card { padding: 14px 16px; }
.check-tag-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.close-preview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.close-preview-box { padding: 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #ebeef5; }
.preview-label { color: #606266; margin-bottom: 8px; }
.preview-value { font-size: 24px; font-weight: 700; color: #303133; }
.preview-value.small { font-size: 15px; line-height: 22px; }
.warning-list { margin-top: 10px; color: #e6a23c; line-height: 22px; }
.audit-table-wrap { margin-top: 14px; }
.audit-title { margin-bottom: 8px; font-weight: 600; color: #303133; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }

.period-check-frame {
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto 16px;
  padding: 18px 28px 34px;
  overflow: hidden;
  border: 1px solid #ff1f1f;
  background: #fff;
}
.period-check-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 18px; }
.period-check-title-wrap { display: flex; align-items: flex-start; gap: 20px; min-width: 0; }
.period-check-title { flex: 0 0 auto; max-width: 180px; color: #111827; font-size: 26px; font-weight: 600; line-height: 1.18; }
.period-check-warning { max-width: 420px; padding-top: 10px; color: #ff5a1f; font-size: 14px; line-height: 1.35; }
.period-card-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.period-check-card { min-width: 0; height: 140px; overflow: hidden; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; }
.period-card-head { display: grid; grid-template-columns: 26px minmax(0, 1fr); align-items: center; height: 42px; padding: 0 16px; column-gap: 16px; background: linear-gradient(#fbfbfb, #f5f5f5); }
.period-card-icon { color: #2fb344; font-size: 22px; }
.period-card-title { min-width: 0; color: #111827; font-size: 16px; font-weight: 600; line-height: 1.15; text-align: center; word-break: break-word; }
.period-card-body { position: relative; height: 98px; padding: 20px 16px; }
.period-amount-button { border: 0; border-bottom: 1px solid #14aa36; background: transparent; color: #14aa36; cursor: pointer; font-size: 24px; line-height: 28px; }
.period-voucher-btn { position: absolute; right: 16px; bottom: 18px; border-radius: 0; }
.period-check-summary { display: flex; justify-content: center; margin-top: 34px; color: #606266; font-size: 13px; }
.template-tip { margin-bottom: 12px; color: #6b7280; font-size: 14px; }
:deep(.period-close-dialog .el-dialog__body) { max-height: calc(96vh - 126px); overflow: auto; }

@media (max-width: 1280px) {
  .month-grid { grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); gap: 14px; }
}
@media (max-width: 980px) {
  .legend-card { align-items: flex-start; flex-direction: column; gap: 10px; }
  .legend-title { margin-right: 0; }
  .period-check-frame { padding: 16px; }
  .period-check-header { grid-template-columns: 1fr; }
  .period-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .top-tab { min-width: 96px; padding: 10px 16px; }
  .year-card { padding: 14px; }
  .month-grid { grid-template-columns: 1fr; }
  .period-check-title-wrap { flex-direction: column; gap: 8px; }
  .period-check-warning { padding-top: 0; }
  .period-card-grid { grid-template-columns: 1fr; }
}
</style>
