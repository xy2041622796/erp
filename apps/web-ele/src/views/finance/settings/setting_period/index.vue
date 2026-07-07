<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


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
  initMissingPeriods,
  savePeriodStatus,
  type PeriodStatusRecord,
} from '#/api/erp/finance/period-status';
import {
  getAccountCurrentAccount,
  type BilAccountSetApi,
} from '#/api/erp/finance/settings/accountset';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceSettingPeriod' });

type ActionTab = 'close' | 'reverse';

interface AccountSetLite {
  rowid: string;
  accountName: string;
  startDate: string;
}

interface PeriodRow extends PeriodStatusRecord {
  statusText: string;
  statusTagType: 'danger' | 'info' | 'success';
  canClose: boolean;
  canReverse: boolean;
}

const loading = ref(false);
const initSubmitting = ref(false);
const repairSubmitting = ref(false);
const batchSubmitting = ref(false);
const checkLoading = ref(false);
const closeSubmitting = ref(false);
const reverseSubmitting = ref(false);
const checkDialogVisible = ref(false);
const actionTab = ref<ActionTab>('close');
const currentRow = ref<null | PeriodRow>(null);
const closePreview = ref<null | PeriodClosePreviewResult>(null);
const reversePreview = ref<null | PeriodReversePreviewResult>(null);

const filters = reactive({
  accountSetId: '',
  companyName: '',
  yearsText: '',
});

const rows = ref<PeriodRow[]>([]);
const accountSets = ref<AccountSetLite[]>([]);

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
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function formatPeriodCode(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthEndDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatMoney(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function normalizeRecord(record: PeriodStatusRecord): PeriodRow {
  const carryForward = Number(record.carry_forward_status || 0);
  const close = Number(record.close_status || 0);

  let statusText = '未结转、未结账';
  let statusTagType: PeriodRow['statusTagType'] = 'danger';

  if (carryForward === 1 && close === 0) {
    statusText = '已结转、未结账';
    statusTagType = 'info';
  } else if (carryForward === 1 && close === 1) {
    statusText = '已结转、已结账';
    statusTagType = 'success';
  }

  return {
    ...record,
    id: String(record.id || record.rowid || ''),
    rowid: String(record.id || record.rowid || ''),
    fiscal_year: Number(record.fiscal_year || 0),
    period_month: Number(record.period_month || 0),
    carry_forward_status: carryForward,
    close_status: close,
    start_date:
      toDateInput(record.start_date) ||
      `${Number(record.fiscal_year || 0)}-${String(Number(record.period_month || 0)).padStart(2, '0')}-01`,
    end_date:
      toDateInput(record.end_date) ||
      `${Number(record.fiscal_year || 0)}-${String(Number(record.period_month || 0)).padStart(2, '0')}-${String(getMonthEndDay(Number(record.fiscal_year || 0), Number(record.period_month || 0))).padStart(2, '0')}`,
    period_code:
      record.period_code || formatPeriodCode(Number(record.fiscal_year || 0), Number(record.period_month || 0)),
    statusText,
    statusTagType,
    canClose: close === 0,
    canReverse: carryForward === 1 && close === 1,
  };
}

function buildPeriodRange(accountSet: AccountSetLite) {
  const startDateText = toDateInput(accountSet.startDate);
  if (!startDateText) return [] as PeriodRow[];
  const [startYearText, startMonthText] = startDateText.split('-');
  const startYear = Number(startYearText);
  const startMonth = Number(startMonthText);
  if (!startYear || !startMonth) return [] as PeriodRow[];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const result: PeriodRow[] = [];

  for (let year = startYear; year <= currentYear; year += 1) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === currentYear ? currentMonth : 12;
    for (let month = monthStart; month <= monthEnd; month += 1) {
      result.push(
        normalizeRecord({
          id: `${accountSet.rowid}-${formatPeriodCode(year, month)}`,
          rowid: `${accountSet.rowid}-${formatPeriodCode(year, month)}`,
          account_set_id: accountSet.rowid,
          company_name: accountSet.accountName,
          fiscal_year: year,
          period_month: month,
          period_code: formatPeriodCode(year, month),
          carry_forward_status: 0,
          close_status: 0,
          remark: `根据账套启用日期 ${startDateText} 自动生成`,
          start_date: `${year}-${String(month).padStart(2, '0')}-01`,
          end_date: `${year}-${String(month).padStart(2, '0')}-${String(getMonthEndDay(year, month)).padStart(2, '0')}`,
        } as PeriodStatusRecord),
      );
    }
  }
  return result;
}

function mergeRows(accountSetList: AccountSetLite[], statusRows: PeriodStatusRecord[]) {
  const statusMap = new Map<string, PeriodRow>();
  for (const item of statusRows) {
    const normalized = normalizeRecord(item);
    const accountSetId = String(normalized.account_set_id || '').trim();
    const periodCode = String(normalized.period_code || '').trim();
    if (!accountSetId || !periodCode) continue;
    statusMap.set(`${accountSetId}_${periodCode}`, normalized);
  }

  const merged: PeriodRow[] = [];
  for (const accountSet of accountSetList) {
    const generatedRows = buildPeriodRange(accountSet);
    for (const row of generatedRows) {
      const key = `${accountSet.rowid}_${row.period_code}`;
      merged.push(statusMap.get(key) || row);
    }
  }

  for (const item of statusMap.values()) {
    const exists = merged.some(
      (row) => row.account_set_id === item.account_set_id && row.period_code === item.period_code,
    );
    if (!exists) merged.push(item);
  }

  return merged.sort((a, b) => {
    const accountCompare = String(a.account_set_id || '').localeCompare(String(b.account_set_id || ''));
    if (accountCompare !== 0) return accountCompare;
    if (Number(a.fiscal_year || 0) !== Number(b.fiscal_year || 0)) {
      return Number(b.fiscal_year || 0) - Number(a.fiscal_year || 0);
    }
    return Number(b.period_month || 0) - Number(a.period_month || 0);
  });
}

const tableData = computed(() => rows.value);
const batchButtonText = computed(() => (actionTab.value === 'close' ? '批量结账' : '批量反结账'));
const yearsSummary = computed(() => {
  const years = [...new Set(rows.value.map((item) => Number(item.fiscal_year || 0)).filter(Boolean))];
  return years.sort((a, b) => b - a).join('、') || '-';
});
const statusSummary = computed(() => {
  return {
    total: rows.value.length,
    closed: rows.value.filter((item) => Number(item.close_status || 0) === 1).length,
    pending: rows.value.filter((item) => Number(item.close_status || 0) === 0).length,
    needRangeRepair: rows.value.filter((item) => !item.start_date || !item.end_date).length,
  };
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
      getAccountCurrentAccount({ pageNo: 1, page: 0 }),
    ]);

    const currentAccountSets = (accountSetPage?.list || [])
      .map((item: BilAccountSetApi.AccountSet) => ({
        rowid: String(item.rowid || '').trim(),
        accountName: String(item.account_name || '').trim(),
        startDate: toDateInput(item.start_date || item.init_date),
      }))
      .filter((item: AccountSetLite) => item.rowid && item.startDate)
      .filter((item: AccountSetLite) => (filters.accountSetId ? item.rowid === filters.accountSetId : true))
      .filter((item: AccountSetLite) =>
        filters.companyName ? item.accountName.includes(String(filters.companyName).trim()) : true,
      );

    accountSets.value = currentAccountSets;
    let merged = mergeRows(currentAccountSets, statusList);
    if (years.length > 0) {
      merged = merged.filter((item) => years.includes(Number(item.fiscal_year || 0)));
    }
    rows.value = merged;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载期间设置失败');
  } finally {
    loading.value = false;
  }
}

async function handleInitMissingPeriods() {
  const targets = accountSets.value;
  if (targets.length === 0) {
    ElMessage.warning('没有可初始化的账套，请先维护账套启用日期');
    return;
  }

  initSubmitting.value = true;
  try {
    let createdCount = 0;
    let updatedCount = 0;
    for (const accountSet of targets) {
      const result = await initMissingPeriods({
        accountSetId: accountSet.rowid,
        companyName: accountSet.accountName,
        startDate: accountSet.startDate,
        overwriteRange: false,
        remarkPrefix: '期间设置页初始化',
      });
      createdCount += Number(result.createdCount || 0);
      updatedCount += Number(result.updatedCount || 0);
    }

    ElMessage.success(`期间初始化完成，新增 ${createdCount} 条，更新 ${updatedCount} 条。`);
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '初始化缺失期间失败');
  } finally {
    initSubmitting.value = false;
  }
}

async function handleRepairRanges() {
  const targets = accountSets.value;
  if (targets.length === 0) {
    ElMessage.warning('没有可修复的账套，请先维护账套启用日期');
    return;
  }
  repairSubmitting.value = true;
  try {
    let updatedCount = 0;
    for (const accountSet of targets) {
      const result = await initMissingPeriods({
        accountSetId: accountSet.rowid,
        companyName: accountSet.accountName,
        startDate: accountSet.startDate,
        overwriteRange: true,
        remarkPrefix: '期间范围修复',
      });
      updatedCount += Number(result.updatedCount || 0);
    }
    ElMessage.success(updatedCount > 0 ? `已修复 ${updatedCount} 条期间范围` : '没有需要修复的期间范围');
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '修复期间范围失败');
  } finally {
    repairSubmitting.value = false;
  }
}

async function handleOpenDialog(row: PeriodRow, tab: ActionTab) {
  currentRow.value = row;
  actionTab.value = tab;
  closePreview.value = null;
  reversePreview.value = null;
  checkDialogVisible.value = true;
  checkLoading.value = true;

  try {
    if (tab === 'reverse') {
      reversePreview.value = await getPeriodReversePreview({
        period: row.period_code,
        accountSetId: row.account_set_id,
        companyName: row.company_name,
      });
    } else {
      closePreview.value = await getPeriodClosePreview({
        period: row.period_code,
        accountSetId: row.account_set_id,
        companyName: row.company_name,
      });
    }
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载期间预览失败');
    checkDialogVisible.value = false;
  } finally {
    checkLoading.value = false;
  }
}

function isSyntheticRow(row: PeriodRow) {
  return !row.id || String(row.remark || '').includes('自动生成');
}

async function handleExecuteClose() {
  if (!currentRow.value || !closePreview.value) return;

  closeSubmitting.value = true;
  try {
    const closeResult = await createPeriodCloseVoucherByPreview(closePreview.value, {
      period: currentRow.value.period_code,
      accountSetId: currentRow.value.account_set_id,
      companyName: currentRow.value.company_name,
    });
    const voucherId = String(closeResult?.voucherId || '');
    const voucherCode = String(closeResult?.voucherCode || '');
    const nowText = formatDateTime(new Date());

    await savePeriodStatus({
      id: isSyntheticRow(currentRow.value) ? undefined : currentRow.value.id,
      rowid: isSyntheticRow(currentRow.value) ? undefined : currentRow.value.rowid,
      account_set_id: String(currentRow.value.account_set_id || ''),
      company_name: currentRow.value.company_name || '',
      fiscal_year: Number(currentRow.value.fiscal_year || 0),
      period_month: Number(currentRow.value.period_month || 0),
      period_code: currentRow.value.period_code,
      carry_forward_status: 1,
      close_status: 1,
      carry_forward_voucher_id: voucherId,
      carry_forward_voucher_code: voucherCode,
      carry_forward_at: nowText,
      carry_forward_by: '当前用户',
      close_voucher_id: voucherId,
      close_at: nowText,
      close_by: '当前用户',
      remark: `期间 ${currentRow.value.period_code} 已完成结账，最后一步为期间结转`,
      start_date: currentRow.value.start_date,
      end_date: currentRow.value.end_date,
      last_reverse_at: currentRow.value.last_reverse_at,
      last_reverse_by: currentRow.value.last_reverse_by,
    });

    ElMessage.success(`期间 ${currentRow.value.period_code} 已完成期间结转并结账`);
    checkDialogVisible.value = false;
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '执行期间结账失败');
  } finally {
    closeSubmitting.value = false;
  }
}

async function handleExecuteReverse() {
  if (!currentRow.value || !reversePreview.value) return;
  if (!reversePreview.value.canReverse) {
    ElMessage.warning(reversePreview.value.canReverseReason || '当前期间不允许反结账');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定反结账 ${currentRow.value.period_code} 吗？系统会生成冲销凭证，并把该期间恢复为未结转、未结账。`,
      '反结账确认',
      {
        type: 'warning',
        confirmButtonText: '确认反结账',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }

  reverseSubmitting.value = true;
  try {
    await reversePeriodClose({
      period: currentRow.value.period_code,
      accountSetId: currentRow.value.account_set_id,
      companyName: currentRow.value.company_name,
    });
    const nowText = formatDateTime(new Date());
    await savePeriodStatus({
      id: isSyntheticRow(currentRow.value) ? undefined : currentRow.value.id,
      rowid: isSyntheticRow(currentRow.value) ? undefined : currentRow.value.rowid,
      account_set_id: String(currentRow.value.account_set_id || ''),
      company_name: currentRow.value.company_name || '',
      fiscal_year: Number(currentRow.value.fiscal_year || 0),
      period_month: Number(currentRow.value.period_month || 0),
      period_code: currentRow.value.period_code,
      carry_forward_status: 0,
      close_status: 0,
      carry_forward_voucher_id: '',
      carry_forward_voucher_code: '',
      carry_forward_at: '',
      carry_forward_by: '',
      close_voucher_id: '',
      close_at: '',
      close_by: '',
      remark: `期间 ${currentRow.value.period_code} 已反结账`,
      start_date: currentRow.value.start_date,
      end_date: currentRow.value.end_date,
      last_reverse_at: nowText,
      last_reverse_by: '当前用户',
    });
    ElMessage.success(`期间 ${currentRow.value.period_code} 已反结账`);
    checkDialogVisible.value = false;
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '执行反结账失败');
  } finally {
    reverseSubmitting.value = false;
  }
}

async function handleRepairSingleRow(row: PeriodRow) {
  try {
    await savePeriodStatus({
      id: row.id,
      rowid: row.rowid,
      account_set_id: String(row.account_set_id || ''),
      company_name: row.company_name || '',
      fiscal_year: Number(row.fiscal_year || 0),
      period_month: Number(row.period_month || 0),
      period_code: row.period_code,
      carry_forward_status: Number(row.carry_forward_status || 0),
      close_status: Number(row.close_status || 0),
      carry_forward_voucher_id: row.carry_forward_voucher_id,
      carry_forward_voucher_code: row.carry_forward_voucher_code,
      carry_forward_at: row.carry_forward_at,
      carry_forward_by: row.carry_forward_by,
      close_voucher_id: row.close_voucher_id,
      close_at: row.close_at,
      close_by: row.close_by,
      last_reverse_at: row.last_reverse_at,
      last_reverse_by: row.last_reverse_by,
      remark: row.remark || `期间 ${row.period_code} 已执行单行修复`,
      start_date: row.start_date,
      end_date: row.end_date,
      description: row.description,
    });
    ElMessage.success(`期间 ${row.period_code} 已修复`);
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '单行修复失败');
  }
}

async function handleBatchAction() {
  batchSubmitting.value = true;
  try {
    if (actionTab.value === 'close') {
      const matched = rows.value.filter((item) => Number(item.close_status || 0) === 0);
      if (matched.length === 0) {
        ElMessage.warning('没有可批量结账的期间');
        return;
      }
      ElMessage.success(`已预留批量结账入口，当前命中 ${matched.length} 个期间。`);
      return;
    }

    const matched = rows.value.filter((item) => item.canReverse);
    if (matched.length === 0) {
      ElMessage.warning('没有可批量反结账的期间');
      return;
    }

    let successCount = 0;
    const sorted = [...matched].sort((a, b) => {
      if (Number(a.fiscal_year || 0) !== Number(b.fiscal_year || 0)) {
        return Number(b.fiscal_year || 0) - Number(a.fiscal_year || 0);
      }
      return Number(b.period_month || 0) - Number(a.period_month || 0);
    });

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
  <Page auto-content-height>
    <div class="setting-period-page">
      <div class="hero-card">
        <div>
          <div class="page-title">期间设置</div>
          <div class="page-desc">
            该页面面向财务设置场景，集中维护期间主数据、补齐缺失期间、修复期间范围，并复用现有结账与反结账能力。
          </div>
        </div>
        <div class="hero-tags">
          <el-tag>账套数 {{ accountSets.length }}</el-tag>
          <el-tag type="success">年度 {{ yearsSummary }}</el-tag>
          <el-tag type="info">期间 {{ statusSummary.total }}</el-tag>
          <el-tag type="warning">待结账 {{ statusSummary.pending }}</el-tag>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-item">
          <div class="summary-label">已结账期间</div>
          <div class="summary-value">{{ statusSummary.closed }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">未结账期间</div>
          <div class="summary-value">{{ statusSummary.pending }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">待修复范围</div>
          <div class="summary-value">{{ statusSummary.needRangeRepair }}</div>
        </div>
      </div>

      <div class="toolbar-card">
        <el-form inline>
          <el-form-item label="账套ID">
            <el-input v-model="filters.accountSetId" clearable placeholder="可选" style="width: 12rem" />
          </el-form-item>
          <el-form-item label="公司名称">
            <el-input v-model="filters.companyName" clearable placeholder="可选" style="width: 12rem" />
          </el-form-item>
          <el-form-item label="年度">
            <el-input v-model="filters.yearsText" clearable placeholder="如 2026,2025" style="width: 12rem" />
          </el-form-item>
        </el-form>
        <div class="toolbar-actions">
          <el-radio-group v-model="actionTab">
            <el-radio-button label="close">结账视图</el-radio-button>
            <el-radio-button label="reverse">反结账视图</el-radio-button>
          </el-radio-group>
          <el-button :loading="loading" @click="loadData">刷新</el-button>
          <el-button type="primary" :loading="initSubmitting" @click="handleInitMissingPeriods">
            初始化缺失期间
          </el-button>
          <el-button type="warning" :loading="repairSubmitting" @click="handleRepairRanges">
            修复期间范围
          </el-button>
          <el-button :loading="batchSubmitting" @click="handleBatchAction">
            {{ batchButtonText }}
          </el-button>
        </div>
      </div>

      <div class="table-card" v-loading="loading">
        <el-table :data="tableData" stripe>
          <el-table-column prop="company_name" label="公司" min-width="180" show-overflow-tooltip />
          <el-table-column prop="account_set_id" label="账套ID" min-width="180" show-overflow-tooltip />
          <el-table-column prop="period_code" label="期间" width="110" />
          <el-table-column label="期间范围" min-width="220">
            <template #default="{ row }">
              {{ row.start_date || '-' }} ~ {{ row.end_date || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="160">
            <template #default="{ row }">
              <el-tag :type="row.statusTagType">{{ row.statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="carry_forward_voucher_code" label="结转凭证号" width="130" />
          <el-table-column prop="close_at" label="结账时间" min-width="170" show-overflow-tooltip />
          <el-table-column prop="last_reverse_at" label="最后反结账" min-width="170" show-overflow-tooltip />
          <el-table-column prop="remark" label="备注" min-width="240" show-overflow-tooltip />
          <el-table-column label="操作" width="320" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" @click="handleOpenDialog(row, 'close')">结账预览</el-button>
                <el-button link type="warning" @click="handleOpenDialog(row, 'reverse')">反结账预览</el-button>
                <el-button link @click="handleRepairSingleRow(row)">单行修复</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog
        v-model="checkDialogVisible"
        :title="actionTab === 'close' ? '期间结账处理' : '期间反结账处理'"
        width="min(56rem, 92vw)"
        destroy-on-close
      >
        <div v-loading="checkLoading" class="dialog-body">
          <template v-if="actionTab === 'close' && currentRow && closePreview">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="公司">{{ currentRow.company_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="账套">{{ currentRow.account_set_id || '-' }}</el-descriptions-item>
              <el-descriptions-item label="期间">{{ currentRow.period_code }}</el-descriptions-item>
              <el-descriptions-item label="期间范围">
                {{ closePreview.startDate }} ~ {{ closePreview.endDate }}
              </el-descriptions-item>
              <el-descriptions-item label="收入合计">{{ formatMoney(closePreview.totalIncome) }}</el-descriptions-item>
              <el-descriptions-item label="费用合计">{{ formatMoney(closePreview.totalExpense) }}</el-descriptions-item>
              <el-descriptions-item label="本期利润">{{ formatMoney(closePreview.profitAmount) }}</el-descriptions-item>
              <el-descriptions-item label="已有结转凭证">
                {{ closePreview.existingVoucher?.voucher_code || '无，执行时自动生成' }}
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <template v-if="actionTab === 'reverse' && currentRow && reversePreview">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="公司">{{ currentRow.company_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="账套">{{ currentRow.account_set_id || '-' }}</el-descriptions-item>
              <el-descriptions-item label="期间">{{ currentRow.period_code }}</el-descriptions-item>
              <el-descriptions-item label="期间范围">
                {{ reversePreview.startDate }} ~ {{ reversePreview.endDate }}
              </el-descriptions-item>
              <el-descriptions-item label="当前状态">{{ reversePreview.currentStatusText }}</el-descriptions-item>
              <el-descriptions-item label="校验结果">
                {{ reversePreview.canReverse ? '允许反结账' : '禁止反结账' }}
              </el-descriptions-item>
              <el-descriptions-item label="原结转凭证">
                {{ reversePreview.originalVoucher?.voucherCode || '未找到' }}
              </el-descriptions-item>
              <el-descriptions-item label="已有冲销凭证">
                {{ reversePreview.reverseVoucher?.voucher_code || '无' }}
              </el-descriptions-item>
            </el-descriptions>
            <div class="dialog-tip">{{ reversePreview.canReverseReason }}</div>
          </template>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="checkDialogVisible = false">关闭</el-button>
            <el-button
              v-if="actionTab === 'close'"
              type="primary"
              :loading="closeSubmitting"
              @click="handleExecuteClose"
            >
              执行期间结转并结账
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
    </div>
  </Page>
</template>

<style scoped>
.setting-period-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-card,
.summary-card,
.toolbar-card,
.table-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.page-desc {
  margin-top: 8px;
  color: #606266;
  line-height: 22px;
}

.hero-tags {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px 16px;
}

.summary-item {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #ebeef5;
}

.summary-label {
  color: #606266;
}

.summary-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.toolbar-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.table-card {
  padding: 14px;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dialog-body {
  min-height: 160px;
}

.dialog-tip {
  margin-top: 12px;
  color: #606266;
  line-height: 22px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
