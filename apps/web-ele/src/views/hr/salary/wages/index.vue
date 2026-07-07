<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ParseWagesImportBySchemeIdResult } from './helpers';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createSalarySlip,
  deleteSalarySlip,
  getSalarySlipItemPage,
  getSalarySlipPage,
} from '#/api/erp/finance/cashier/wages';
import FileUpload, {
  type FileUploadSuccessPayload,
} from '#/components/upload/file-upload.vue';

import {
  downloadWagesTemplateBySchemeId,
  exportWagesBySchemeId,
  parseWagesImportFileBySchemeId,
  WAGES_OVERALL_SCHEME_ID,
} from './helpers';
import { buildMonthlySalarySettlementPayload } from './monthly-settlement';
import Create from './modules/create.vue';
import LinkageCheck from './modules/linkage-check.vue';
import View from './modules/view.vue';

import { ElButton, ElDatePicker, ElMessage, ElMessageBox } from 'element-plus';

defineOptions({ name: 'FinanceCashierWages' });

type TabKey = 'wage' | 'detail';

type ImportSummary = {
  attachmentName: string;
  deductTotal: number;
  dept: string;
  month: string;
  payMonth: string;
  realPayTotal: number;
  rowCount: number;
  savedSlipNo?: string;
  schemeName: string;
  sheetName: string;
  shouldPayTotal: number;
  taxTotal: number;
};

const router = useRouter();
const activeTab = ref<TabKey>('wage');
const month = ref<string>('');
const wagePager = ref({ pageNo: 1, page: 20 });
const detailPager = ref({ pageNo: 1, page: 20 });
const createRef = ref<any>(null);
const viewRef = ref<any>(null);
const linkageCheckOpen = ref(false);
const importFileValue = ref<string>('');
const importLoading = ref(false);
const templateLoading = ref(false);
const exportLoading = ref(false);
const settleLoading = ref(false);
const lastImportSummary = ref<ImportSummary | null>(null);

const totals = ref({
  shouldPayTotal: 0,
  actualPayTotal: 0,
  paidTotal: 0,
  writeoffTotal: 0,
  balanceTotal: 0,
  taxTotal: 0,
});

function go(path: string) {
  router.push(path);
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const monthText = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${monthText}`;
}

function calcWageTotals(list: any[]) {
  totals.value = {
    shouldPayTotal: list.reduce((sum, item) => sum + Number(item.total_should_pay || 0), 0),
    actualPayTotal: list.reduce((sum, item) => sum + Number(item.total_actual_pay || 0), 0),
    paidTotal: list.reduce((sum, item) => sum + Number(item.paid_salary || 0), 0),
    writeoffTotal: list.reduce((sum, item) => sum + Number(item.write_off_amount || 0), 0),
    balanceTotal: list.reduce((sum, item) => sum + Number(item.remaining_should_pay || 0), 0),
    taxTotal: list.reduce((sum, item) => sum + Number(item.total_tax || 0), 0),
  };
}

function resetTotals() {
  totals.value = {
    shouldPayTotal: 0,
    actualPayTotal: 0,
    paidTotal: 0,
    writeoffTotal: 0,
    balanceTotal: 0,
    taxTotal: 0,
  };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeMoney(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function isBaseImportSolutionId(value: unknown) {
  return /^[A-F0-9]{32}$/i.test(normalizeText(value));
}

function isCancelAction(error: unknown) {
  const action = normalizeText(error);
  return action === 'cancel' || action === 'close';
}

function buildImportSummary(result: ParseWagesImportBySchemeIdResult): ImportSummary {
  const rows = Array.isArray(result.payload?.rows) ? result.payload.rows : [];
  return {
    attachmentName: normalizeText(result.payload?.attachmentName),
    deductTotal: normalizeMoney(rows.reduce((sum, row) => sum + Number(row.deductTotal || 0), 0)),
    dept: normalizeText(result.payload?.dept),
    month: normalizeText(result.payload?.month),
    payMonth: normalizeText(result.payload?.payMonth),
    realPayTotal: normalizeMoney(rows.reduce((sum, row) => sum + Number(row.realPay || 0), 0)),
    rowCount: Number(result.rowCount || rows.length || 0),
    schemeName: normalizeText(result.schemeName),
    sheetName: normalizeText(result.sheetName),
    shouldPayTotal: normalizeMoney(rows.reduce((sum, row) => sum + Number(row.shouldPay || 0), 0)),
    taxTotal: normalizeMoney(rows.reduce((sum, row) => sum + Number(row.tax || 0), 0)),
  };
}

async function refreshAfterSave() {
  await wageGridApi.query();
  if (activeTab.value === 'detail') {
    await detailGridApi.query();
  }
}

async function fakeImportUploadApi(file: File) {
  return {
    data: {
      url: file.name,
    },
    url: file.name,
  };
}

function getSolutionIdFromRow(row: Record<string, any>) {
  const candidateValues = [
    row?.import_solution_id,
    row?.export_solution_id,
    row?.solution_id,
    row?.scheme_id,
  ];
  const matched = candidateValues.find((item) => isBaseImportSolutionId(item));
  return normalizeText(matched);
}

function handleFilter() {
  if (activeTab.value === 'detail') {
    detailPager.value.pageNo = 1;
    detailGridApi.query();
  } else {
    wagePager.value.pageNo = 1;
    wageGridApi.query();
  }
}

function handleCreate() {
  createRef.value?.openModal({ month: month.value || getCurrentMonth(), payMonth: getCurrentMonth() });
}

function handleView(row: any) {
  viewRef.value?.openModal(row);
}

async function handleCreateSuccess(payload?: any) {
  if (!payload) return;
  await createSalarySlip(payload);
  ElMessage.success('工资表保存成功');
  if (activeTab.value === 'detail') {
    await detailGridApi.query();
  } else {
    await wageGridApi.query();
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除工资表“${row.slip_no || row.salary_month}”吗？`, '删除确认', {
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteSalarySlip(String(row.rowid || ''));
  ElMessage.success('删除成功');
  await wageGridApi.query();
  if (activeTab.value === 'detail') {
    await detailGridApi.query();
  }
}

async function handleSettleCurrentMonth() {
  const targetMonth = month.value || getCurrentMonth();
  settleLoading.value = true;
  try {
    const currentMonthSlips = await getSalarySlipPage({ pageNo: 1, page: 9999, month: targetMonth });
    if ((currentMonthSlips.list || []).length) {
      await ElMessageBox.confirm(
        `${targetMonth} 已存在 ${(currentMonthSlips.list || []).length} 张工资表，继续将再生成一张新的月度汇总工资表，是否继续？`,
        '重复生成提醒',
        { type: 'warning', confirmButtonText: '继续生成', cancelButtonText: '取消' },
      );
    }

    const payload = await buildMonthlySalarySettlementPayload(targetMonth);
    const saveResult = await createSalarySlip(payload);
    lastImportSummary.value = {
      attachmentName: '-',
      deductTotal: normalizeMoney(payload.rows.reduce((sum, row: any) => sum + Number(row.deductTotal || 0), 0)),
      dept: normalizeText(payload.dept),
      month: normalizeText(payload.month),
      payMonth: normalizeText(payload.payMonth),
      realPayTotal: normalizeMoney(payload.rows.reduce((sum, row: any) => sum + Number(row.realPay || 0), 0)),
      rowCount: Number(payload.rows.length || 0),
      savedSlipNo: normalizeText(saveResult?.slip_no),
      schemeName: '系统月度汇总计算',
      sheetName: '自动结算',
      shouldPayTotal: normalizeMoney(payload.rows.reduce((sum, row: any) => sum + Number(row.shouldPay || 0), 0)),
      taxTotal: normalizeMoney(payload.rows.reduce((sum, row: any) => sum + Number(row.tax || 0), 0)),
    };
    ElMessage.success(`已完成 ${targetMonth} 工资汇总计算：${saveResult?.slip_no || '工资表已生成'}`);
    await refreshAfterSave();
  } catch (error: any) {
    if (!isCancelAction(error)) {
      ElMessage.error(error?.message || '汇总计算当月工资失败');
    }
  } finally {
    settleLoading.value = false;
  }
}

async function handleImportUploadSuccess(payload: FileUploadSuccessPayload) {
  const rawFile = payload.rawFile;
  if (!rawFile) {
    ElMessage.error('未获取到导入文件，请重新选择');
    importFileValue.value = '';
    return;
  }

  importLoading.value = true;
  try {
    const result = await parseWagesImportFileBySchemeId(WAGES_OVERALL_SCHEME_ID, rawFile);
    const summary = buildImportSummary(result);

    console.group('工资表导入解析结果');
    console.log('解析结果 result:', result);
    console.log('解析结果 payload:', result.payload);
    console.log('解析结果 rows:', result.payload.rows);
    console.table(result.payload.rows || []);
    console.groupEnd();

    (window as any).__WAGES_IMPORT_PARSED_RESULT__ = result;
    lastImportSummary.value = summary;

    await ElMessageBox.confirm(
      [
        `导入方案：${summary.schemeName || '-'} / ${summary.sheetName || '-'}`,
        `工资月份：${summary.month || '-'}，发放月份：${summary.payMonth || '-'}`,
        `部门：${summary.dept || '-'}，解析行数：${summary.rowCount}`,
        `应发合计：${summary.shouldPayTotal.toFixed(2)}，扣减合计：${summary.deductTotal.toFixed(2)}`,
        `个税合计：${summary.taxTotal.toFixed(2)}，实发合计：${summary.realPayTotal.toFixed(2)}`,
        '确认将解析结果直接保存为工资表吗？',
      ].join('\n'),
      '导入确认',
      {
        type: 'warning',
        confirmButtonText: '确认保存',
        cancelButtonText: '仅解析，不保存',
      },
    );

    const saveResult = await createSalarySlip(result.payload);
    lastImportSummary.value = {
      ...summary,
      savedSlipNo: normalizeText(saveResult?.slip_no),
    };
    ElMessage.success(`导入并保存成功：${saveResult?.slip_no || '工资表已生成'}`);
    await refreshAfterSave();
  } catch (error: any) {
    if (isCancelAction(error)) {
      ElMessage.info('已取消保存，本次解析结果已保留在页面和控制台中');
    } else {
      ElMessage.error(error?.message || '导入解析失败');
    }
  } finally {
    importLoading.value = false;
    importFileValue.value = '';
  }
}

async function handleDownloadTemplate() {
  templateLoading.value = true;
  try {
    const result = await downloadWagesTemplateBySchemeId(WAGES_OVERALL_SCHEME_ID);
    ElMessage.success(`模板下载成功：${result.fileName}`);
  } catch (error: any) {
    ElMessage.error(error?.message || '模板下载失败');
  } finally {
    templateLoading.value = false;
  }
}
async function handleExport() {
  exportLoading.value = true;
  try {
    const result = await exportWagesBySchemeId(WAGES_OVERALL_SCHEME_ID);
    ElMessage.success(`导出成功：${result.fileName}，共 ${result.rowCount} 行`);
  } catch (error: any) {
    ElMessage.error(error?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

const tableTitle = computed(() => (activeTab.value === 'detail' ? '工资表明细' : '工资表'));

function statusText(status: any) {
  return Number(status) === 1 ? '草稿' : '已保存';
}

const [WageGrid, wageGridApi] = useVbenVxeGrid({
  gridOptions: {
    height: 'auto',
    columns: [
      { field: 'slip_no', title: '工资表编号', minWidth: 160 },
      { field: 'salary_month', title: '工资月份', width: 110 },
      { field: 'pay_month', title: '发放月份', width: 110 },
      { field: 'depart_name', title: '部门', minWidth: 140 },
      { field: 'project_name', title: '项目', minWidth: 140 },
      { field: 'employee_count', title: '人数', width: 90, align: 'right' },
      { field: 'total_should_pay', title: '应发工资合计', width: 140, align: 'right' },
      { field: 'total_actual_pay', title: '实发工资', width: 120, align: 'right' },
      { field: 'paid_salary', title: '已发工资', width: 120, align: 'right' },
      { field: 'write_off_amount', title: '核销金额', width: 120, align: 'right' },
      { field: 'remaining_should_pay', title: '应发余额', width: 120, align: 'right' },
      { field: 'total_tax', title: '工资税费合计', width: 140, align: 'right' },
      { field: 'status', title: '状态', width: 100, slots: { default: 'status' } },
      { title: '操作', width: 160, fixed: 'right', slots: { default: 'actions' } },
    ],
    rowConfig: { isHover: true },
    toolbarConfig: { refresh: true, zoom: true },
    pagerConfig: {
      enabled: true,
      page: wagePager.value.page,
      currentPage: wagePager.value.pageNo,
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
      pageSizes: [10, 20, 50, 100],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any) => {
          wagePager.value.pageNo = page?.currentPage ?? 1;
          wagePager.value.page = page?.page ?? 20;
          const res = await getSalarySlipPage({
            pageNo: wagePager.value.pageNo,
            page: wagePager.value.page,
            month: month.value,
          });
          calcWageTotals(res.list || []);
          return {
            list: res.list || [],
            total: Number(res.total || 0),
          };
        },
      },
    },
  } as VxeTableGridOptions,
});

const [DetailGrid, detailGridApi] = useVbenVxeGrid({
  gridOptions: {
    height: 'auto',
    columns: [
      { field: 'employee_name', title: '员工姓名', minWidth: 120 },
      { field: 'detail_depart_name', title: '明细部门', minWidth: 140 },
      { field: 'item_code', title: '工资项编码', minWidth: 140 },
      { field: 'item_name', title: '工资项名称', minWidth: 140 },
      { field: 'item_direction', title: '方向', width: 90 },
      { field: 'item_category', title: '分类', width: 100 },
      { field: 'item_value', title: '工资项金额', width: 120, align: 'right' },
      { field: 'should_pay', title: '应发合计', width: 120, align: 'right' },
      { field: 'deduct_total', title: '扣减合计', width: 120, align: 'right' },
      { field: 'tax_value', title: '个税', width: 100, align: 'right' },
      { field: 'real_pay', title: '实发工资', width: 120, align: 'right' },
      { field: 'company_social', title: '公司社保', width: 120, align: 'right' },
      { field: 'company_fund', title: '公司公积金', width: 130, align: 'right' },
      { field: 'line_no', title: '行号', width: 80, align: 'right' },
    ],
    rowConfig: { isHover: true },
    toolbarConfig: { refresh: true, zoom: true },
    pagerConfig: {
      enabled: true,
      page: detailPager.value.page,
      currentPage: detailPager.value.pageNo,
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
      pageSizes: [10, 20, 50, 100],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any) => {
          detailPager.value.pageNo = page?.currentPage ?? 1;
          detailPager.value.page = page?.page ?? 20;

          let slipIds: string[] | undefined;
          if (month.value) {
            const slipRes = await getSalarySlipPage({ pageNo: 1, page: 9999, month: month.value });
            slipIds = (slipRes.list || []).map((item: any) => String(item.rowid || '')).filter(Boolean);
            if (!slipIds.length) {
              return { list: [], total: 0 };
            }
          }

          const res = await getSalarySlipItemPage({
            pageNo: detailPager.value.pageNo,
            page: detailPager.value.page,
            slipIds,
          });
          resetTotals();
          return {
            list: res.list || [],
            total: Number(res.total || 0),
          };
        },
      },
    },
  } as VxeTableGridOptions,
});

function handleTabChange(tab: TabKey) {
  activeTab.value = tab;
}

watch(activeTab, (tab) => {
  if (tab === 'detail') {
    detailGridApi.query();
  } else {
    wageGridApi.query();
  }
});

onMounted(() => {
  wageGridApi.query();
});
</script>

<template>
  <Page auto-content-height>
    <Create ref="createRef" @success="handleCreateSuccess" />
    <View ref="viewRef" />
    <LinkageCheck v-model="linkageCheckOpen" @settle="(m) => { month = m; handleSettleCurrentMonth(); }" />

    <div class="page-head">
      <div class="tabs">
        <div class="tab" :class="{ active: activeTab === 'wage' }" @click="handleTabChange('wage')">工资表</div>
        <div class="tab" :class="{ active: activeTab === 'detail' }" @click="handleTabChange('detail')">明细</div>
      </div>

      <div class="filters">
        <el-date-picker v-model="month" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 140px"
          @change="handleFilter" />
        <el-button type="default" @click="handleFilter">筛选</el-button>
      </div>

      <div class="actions">
        <el-button @click="go('/erp/finance/cashier/settings/attendance-settlement-rule')">月度结算规则</el-button>
        <el-button @click="linkageCheckOpen = true">结算前检查</el-button>
        <el-button type="warning" :loading="settleLoading" @click="handleSettleCurrentMonth">汇总计算当月工资</el-button>
        <FileUpload v-model="importFileValue" button-text="上传工资" :api="fakeImportUploadApi" :auto-upload="true" :disabled="importLoading"
          :file-size="20" :file-type="['xls', 'xlsx']" :is-show-tip="false" :limit="1" :show-file-list="false"
          @success="handleImportUploadSuccess" />
        <el-button :loading="templateLoading" @click="handleDownloadTemplate">下载标准模板</el-button>
        <el-button :loading="exportLoading" @click="handleExport">导出工资表</el-button>
        <el-button type="primary" @click="handleCreate">新建工资表</el-button>
      </div>
    </div>

    <div v-if="lastImportSummary" class="import-summary-card">
      <div class="import-summary-card__title">最近一次生成结果</div>
      <div class="import-summary-card__content">
        <div>文件：{{ lastImportSummary.attachmentName || '-' }}</div>
        <div>方案：{{ lastImportSummary.schemeName || '-' }}</div>
        <div>工作表：{{ lastImportSummary.sheetName || '-' }}</div>
        <div>工资月份：{{ lastImportSummary.month || '-' }}</div>
        <div>发放月份：{{ lastImportSummary.payMonth || '-' }}</div>
        <div>部门：{{ lastImportSummary.dept || '-' }}</div>
        <div>解析行数：{{ lastImportSummary.rowCount }}</div>
        <div>应发合计：{{ lastImportSummary.shouldPayTotal.toFixed(2) }}</div>
        <div>扣减合计：{{ lastImportSummary.deductTotal.toFixed(2) }}</div>
        <div>个税合计：{{ lastImportSummary.taxTotal.toFixed(2) }}</div>
        <div>实发合计：{{ lastImportSummary.realPayTotal.toFixed(2) }}</div>
        <div>生成工资表：{{ lastImportSummary.savedSlipNo || '未保存' }}</div>
      </div>
    </div>

    <WageGrid v-if="activeTab === 'wage'" :table-title="tableTitle">
      <template #status="{ row }">
        <span class="status">{{ statusText(row.status) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="action-links">
          <el-button link type="primary" @click="handleView(row)">查看</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </div>
      </template>
    </WageGrid>

    <DetailGrid v-else :table-title="tableTitle" />

    <div v-if="activeTab === 'wage'" class="summary">
      <div>应发工资合计：{{ totals.shouldPayTotal.toFixed(2) }}</div>
      <div>实发工资合计：{{ totals.actualPayTotal.toFixed(2) }}</div>
      <div>已发工资合计：{{ totals.paidTotal.toFixed(2) }}</div>
      <div>核销金额合计：{{ totals.writeoffTotal.toFixed(2) }}</div>
      <div>应发余额合计：{{ totals.balanceTotal.toFixed(2) }}</div>
      <div>工资税费合计：{{ totals.taxTotal.toFixed(2) }}</div>
    </div>
  </Page>
</template>

<style scoped>
.page-head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.tabs {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tab {
  position: relative;
  padding: 6px 2px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.75;
}

.tab.active {
  opacity: 1;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 2px;
  background: var(--el-color-primary);
}

.filters {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.action-links {
  display: flex;
  gap: 8px;
  align-items: center;
}

.import-summary-card {
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  padding: 12px 14px;
}

.import-summary-card__title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.import-summary-card__content {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 16px;
  font-size: 12px;
  opacity: 0.9;
}

.summary {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 18px;
  padding: 10px 0 0;
  font-size: 12px;
  opacity: 0.8;
}

.status {
  opacity: 0.85;
}

.actions :deep(.upload-file) {
  display: inline-flex;
}

.actions :deep(.upload-file-uploader) {
  margin-bottom: 0;
}
</style>
