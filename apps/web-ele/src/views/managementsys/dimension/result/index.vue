<script lang="ts" setup>
import type { UploadFile } from 'element-plus';
import type { ErpDimensionApi } from '#/api/erp/finance/dimension';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import {
  ensureVoucherForDimensionSet,
  ensureVoucherForDimensionSets,
  exportDimensionResult,
  getDimensionDetails,
  importDimensionResult,
} from '#/api/erp/finance/dimension';
import {
  getDimCategoryLabel,
  getDimCodeLabel,
  getDirectionLabel,
  getDimensionResultDashboard,
  type DimensionResultAnalysisItem,
  type DimensionResultDashboard,
  type DimensionResultLedgerRow,
  type DimensionResultQuery,
} from '#/api/erp/finance/dimension/config';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from 'element-plus';

defineOptions({ name: 'FinanceDimensionResultLedger' });

const router = useRouter();
const tableRef = ref<InstanceType<typeof ElTable> | null>(null);
const loading = ref(false);
const generatingRowId = ref('');
const batchGenerating = ref(false);
const detailVisible = ref(false);
const importDialogVisible = ref(false);
const importSubmitting = ref(false);
const importFile = ref<File | null>(null);
const currentRow = ref<DimensionResultLedgerRow | null>(null);
const expandedRowKeys = ref<string[]>([]);
const selectedRows = ref<DimensionResultLedgerRow[]>([]);
const detailRowsMap = ref<Record<string, ErpDimensionApi.DimensionDetail[]>>({});
const detailLoadingMap = ref<Record<string, boolean>>({});
const dashboard = ref<DimensionResultDashboard>({
  records: [],
  event_stats: [],
  biz_category_stats: [],
  analysis_dimension_stats: [],
});
const pagination = reactive({
  pageNo: 1,
  page: 10,
  pageSizes: [10, 20, 50, 100],
});

const queryForm = reactive<DimensionResultQuery>({
  keyword: '',
  event_code: '',
  biz_category: '',
  dim_category: '',
  dim_code: '',
  value_keyword: '',
  voucher_required: 'ALL',
  voucher_status: 'ALL',
});

const eventOptions = computed(() => {
  const values = Array.from(new Set(dashboard.value.records.map((item) => item.event_code).filter(Boolean)));
  return values.map((value) => ({ label: value, value }));
});

const bizCategoryOptions = computed(() => {
  const values = Array.from(new Set(dashboard.value.records.map((item) => item.biz_category).filter(Boolean)));
  return values.map((value) => ({ label: value, value }));
});

const totalRecords = computed(() => dashboard.value.records.length);

const pagedRecords = computed(() => {
  const start = (pagination.pageNo - 1) * pagination.page;
  const end = start + pagination.page;
  return dashboard.value.records.slice(start, end);
});


const selectedRowIds = computed(() => selectedRows.value.map((item) => String(item.rowid || '').trim()).filter(Boolean));

const batchActionText = computed(() => {
  const count = selectedRowIds.value.length;
  return count > 1 ? '合并生成凭证（已选 ' + count + ' 条）' : '合并生成凭证';
});

const currentDetailRows = computed(() => {
  const setId = String(currentRow.value?.rowid || '').trim();
  if (!setId) return [] as ErpDimensionApi.DimensionDetail[];
  return detailRowsMap.value[setId] || currentRow.value?.details || [];
});

function getAmountText(value?: number | null) {
  if (value == null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(2);
}

function formatDateTime(value?: string | number | Date | null) {
  if (value == null || value === '') return '-';
  const date = value instanceof Date ? value : new Date(String(value).replace(/-/g, '/'));
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getExpandedDetailRows(row: DimensionResultLedgerRow) {
  const setId = String(row?.rowid || '').trim();
  if (!setId) return [] as ErpDimensionApi.DimensionDetail[];
  return detailRowsMap.value[setId] || [];
}

async function loadRowDetails(setId: string, force = false) {
  const normalizedSetId = String(setId || '').trim();
  if (!normalizedSetId) return [] as ErpDimensionApi.DimensionDetail[];
  if (!force && detailRowsMap.value[normalizedSetId]) {
    return detailRowsMap.value[normalizedSetId];
  }
  detailLoadingMap.value = {
    ...detailLoadingMap.value,
    [normalizedSetId]: true,
  };
  try {
    const rows = await getDimensionDetails(normalizedSetId);
    detailRowsMap.value = {
      ...detailRowsMap.value,
      [normalizedSetId]: Array.isArray(rows) ? rows : [],
    };
    return detailRowsMap.value[normalizedSetId] || [];
  } finally {
    detailLoadingMap.value = {
      ...detailLoadingMap.value,
      [normalizedSetId]: false,
    };
  }
}

function resetQuery() {
  queryForm.keyword = '';
  queryForm.event_code = '';
  queryForm.biz_category = '';
  queryForm.dim_category = '';
  queryForm.dim_code = '';
  queryForm.value_keyword = '';
  queryForm.voucher_required = 'ALL';
  queryForm.voucher_status = 'ALL';
  pagination.pageNo = 1;
  void loadData();
}

async function syncCurrentPageSelection() {
  await nextTick();
  const table = tableRef.value as any;
  if (!table) return;
  table.clearSelection?.();
  const selectedIdSet = new Set(selectedRowIds.value);
  for (const row of pagedRecords.value) {
    const rowId = String(row.rowid || '').trim();
    if (rowId && selectedIdSet.has(rowId)) {
      table.toggleRowSelection?.(row, true);
    }
  }
}

async function loadData() {
  loading.value = true;
  try {
    dashboard.value = await getDimensionResultDashboard({ ...queryForm });
    detailRowsMap.value = {};
    detailLoadingMap.value = {};
    expandedRowKeys.value = [];
    selectedRows.value = [];
    pagination.pageNo = 1;
    if (currentRow.value?.rowid) {
      currentRow.value = dashboard.value.records.find((item) => item.rowid === currentRow.value?.rowid) || null;
    }
    if (!currentRow.value) {
      currentRow.value = dashboard.value.records[0] || null;
    }
  } finally {
    loading.value = false;
    await syncCurrentPageSelection();
  }
}

async function openDetail(row: DimensionResultLedgerRow) {
  currentRow.value = row;
  await loadRowDetails(String(row.rowid || ''));
  detailVisible.value = true;
}

function handleRowClick(row: DimensionResultLedgerRow) {
  currentRow.value = row;
}

async function handleExpandChange(row: DimensionResultLedgerRow, expandedRows: DimensionResultLedgerRow[]) {
  expandedRowKeys.value = expandedRows.map((item) => String(item.rowid || '')).filter(Boolean);
  if (expandedRowKeys.value.includes(String(row.rowid || ''))) {
    await loadRowDetails(String(row.rowid || ''));
  }
}

function getVoucherStatusType(row: DimensionResultLedgerRow) {
  return String(row.voucher_no || '').trim() ? 'success' : 'info';
}

function getVoucherStatusText(row: DimensionResultLedgerRow) {
  return String(row.voucher_no || '').trim() ? '已生成' : '未生成';
}

function getAnalysisTableData(items: DimensionResultAnalysisItem[]) {
  return items || [];
}

function isVoucherRequiredRow(row?: DimensionResultLedgerRow | null) {
  return Number(row?.is_voucher_required) === 1;
}

function isVoucherGeneratedRow(row?: DimensionResultLedgerRow | null) {
  return Boolean(String(row?.voucher_no || '').trim());
}

function isBatchSelectable(row: DimensionResultLedgerRow) {
  return isVoucherRequiredRow(row) && !isVoucherGeneratedRow(row);
}

function showVoucherGenerateSuccess(result: any, defaultMessage: string) {
  const sourcePeriod = String(result?.source_voucher_period || '').trim();
  const resolvedPeriod = String(result?.resolved_voucher_period || '').trim();
  if (result?.voucher_date_shifted && sourcePeriod && resolvedPeriod && sourcePeriod !== resolvedPeriod) {
    ElMessage.warning(`${defaultMessage}，原业务月份 ${sourcePeriod} 已结转并关账，凭证已顺延生成到 ${resolvedPeriod}。`);
    return;
  }
  ElMessage.success(defaultMessage);
}

function handleSelectionChange(rows: DimensionResultLedgerRow[]) {
  const currentPageIdSet = new Set(pagedRecords.value.map((item) => String(item.rowid || '').trim()).filter(Boolean));
  const keepRows = selectedRows.value.filter((item) => !currentPageIdSet.has(String(item.rowid || '').trim()));
  const currentSelectedRows = (rows || []).filter((item) => isBatchSelectable(item));
  selectedRows.value = [...keepRows, ...currentSelectedRows];
}

async function handlePageChange(pageNo: number) {
  pagination.pageNo = pageNo;
  await syncCurrentPageSelection();
}

async function handlePageSizeChange(page: number) {
  pagination.page = page;
  pagination.pageNo = 1;
  await syncCurrentPageSelection();
}

async function handleGenerateVoucher(row?: DimensionResultLedgerRow | null) {
  const targetRow = row || currentRow.value;
  const setId = String(targetRow?.rowid || '').trim();
  if (!setId) {
    ElMessage.warning('未找到维度主表，无法生成凭证');
    return;
  }
  if (!isVoucherRequiredRow(targetRow)) {
    ElMessage.warning('当前业务维度未标记为需凭证，不能生成凭证');
    return;
  }
  generatingRowId.value = setId;
  try {
    const result = await ensureVoucherForDimensionSet(setId);
    showVoucherGenerateSuccess(result, '生成凭证成功');
    await loadData();
    await loadRowDetails(setId, true);
    if (detailVisible.value && currentRow.value?.rowid === setId) {
      currentRow.value = dashboard.value.records.find((item) => item.rowid === setId) || null;
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '生成凭证失败');
  } finally {
    generatingRowId.value = '';
  }
}

async function handleBatchGenerateVoucher() {
  const rows = selectedRows.value.filter((item) => isBatchSelectable(item));
  if (rows.length < 2) {
    ElMessage.warning('请至少选择 2 条未生成凭证且需凭证的业务维度');
    return;
  }
  batchGenerating.value = true;
  try {
    const result = await ensureVoucherForDimensionSets(rows.map((item) => String(item.rowid || '').trim()));
    showVoucherGenerateSuccess(result, '已按所选业务维度合并生成 1 张凭证');
    selectedRows.value = [];
    await loadData();
    await Promise.all(rows.map((item) => loadRowDetails(String(item.rowid || ''), true)));
    if (detailVisible.value && currentRow.value?.rowid) {
      currentRow.value = dashboard.value.records.find((item) => item.rowid === currentRow.value?.rowid) || null;
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '合并生成凭证失败');
  } finally {
    batchGenerating.value = false;
  }
}

function handleImportClick() {
  importFile.value = null;
  importDialogVisible.value = true;
}

function handleImportFileChange(file: UploadFile) {
  importFile.value = (file.raw as File) || null;
}

function handleImportDialogClose() {
  importDialogVisible.value = false;
  importFile.value = null;
}

async function handleImportSubmit() {
  if (!importFile.value) {
    ElMessage.warning('请先选择 Excel 文件');
    return;
  }
  importSubmitting.value = true;
  try {
    await importDimensionResult(importFile.value);
    ElMessage.success('导入成功');
    handleImportDialogClose();
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败');
  } finally {
    importSubmitting.value = false;
  }
}

async function handleExport() {
  try {
    const data = await exportDimensionResult({ ...queryForm });
    downloadFileFromBlobPart({ fileName: '业务维度台账.xls', source: data });
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error(error?.message || '导出失败');
  }
}

function goToRuleCenter() {
  router.push('/erp/finance/dimension/rule');
}

function goToBizCategoryManage() {
  router.push('/erp/finance/dimension/biz-category');
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="dimension-result-page">
      <ElCard shadow="never">
        <template #header>
          <div class="dimension-result-page__title-wrap">
            <div>
              <div class="dimension-result-page__title">业务维度台账</div>
              <div class="dimension-result-page__sub-title">当前页支持主表展开查看子表维度明细；勾选多条未生成凭证的数据后，可直接合并生成 1 张凭证。</div>
            </div>
            <div class="dimension-result-page__header-actions">
              <ElButton @click="handleImportClick">导入</ElButton>
              <ElButton @click="handleExport">导出</ElButton>
              <ElButton type="primary" :disabled="selectedRowIds.length < 2" :loading="batchGenerating" @click="handleBatchGenerateVoucher">
                {{ batchActionText }}
              </ElButton>
              <ElButton @click="goToRuleCenter">进入规则中心</ElButton>
              <ElButton @click="goToBizCategoryManage">业务分类管理</ElButton>
            </div>
          </div>
        </template>

        <ElForm inline class="dimension-result-page__query-form">
          <ElFormItem label="综合搜索">
            <ElInput v-model="queryForm.keyword" placeholder="单号 / 事件 / 业务分类 / 凭证号 / 维度值" clearable class="dimension-result-page__input-lg" />
          </ElFormItem>
          <ElFormItem label="事件编码">
            <ElSelect v-model="queryForm.event_code" clearable class="dimension-result-page__input-sm">
              <ElOption v-for="item in eventOptions" :key="item.value" :label="item.label" :value="item.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="业务分类">
            <ElSelect v-model="queryForm.biz_category" clearable class="dimension-result-page__input-sm">
              <ElOption v-for="item in bizCategoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="维度分类">
            <ElSelect v-model="queryForm.dim_category" clearable class="dimension-result-page__input-sm">
              <ElOption label="财务维度" value="FINANCIAL" />
              <ElOption label="业务维度" value="BIZ" />
              <ElOption label="分析维度" value="ANALYSIS" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="维度编码">
            <ElInput v-model="queryForm.dim_code" placeholder="如 ORDER_NO / CHANNEL" clearable class="dimension-result-page__input-sm" />
          </ElFormItem>
          <ElFormItem label="维度值">
            <ElInput v-model="queryForm.value_keyword" placeholder="搜索子表 value_code" clearable class="dimension-result-page__input-sm" />
          </ElFormItem>
          <ElFormItem label="需凭证">
            <ElSelect v-model="queryForm.voucher_required" class="dimension-result-page__input-xs">
              <ElOption label="全部" value="ALL" />
              <ElOption label="是" value="1" />
              <ElOption label="否" value="0" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="凭证状态">
            <ElSelect v-model="queryForm.voucher_status" class="dimension-result-page__input-xs">
              <ElOption label="全部" value="ALL" />
              <ElOption label="已生成" value="BOUND" />
              <ElOption label="未生成" value="UNBOUND" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" :loading="loading" @click="loadData">查询</ElButton>
            <ElButton @click="resetQuery">重置</ElButton>
          </ElFormItem>
        </ElForm>

        <div class="dimension-result-page__selection-tip">
          当前支持直接在台账页勾选多条“需凭证且未生成”的业务维度，并合并生成 1 张凭证。已选 {{ selectedRowIds.length }} 条。
        </div>

        <ElTable
          ref="tableRef"
          v-loading="loading"
          :data="pagedRecords"
          border
          height="520"
          row-key="rowid"
          highlight-current-row
          :expand-row-keys="expandedRowKeys"
          @row-click="handleRowClick"
          @expand-change="handleExpandChange"
          @selection-change="handleSelectionChange"
        >
          <ElTableColumn type="selection" width="48" :selectable="isBatchSelectable" reserve-selection />
          <ElTableColumn type="expand" width="56">
            <template #default="{ row }">
              <div class="dimension-result-page__expand-wrap">
                <div v-if="detailLoadingMap[String(row.rowid || '')]" class="dimension-result-page__expand-status">
                  子表加载中...
                </div>
                <ElEmpty v-else-if="!getExpandedDetailRows(row).length" description="暂无子表明细" :image-size="72" />
                <ElTable v-else :data="getExpandedDetailRows(row)" border size="small" max-height="300">
                  <ElTableColumn label="维度分类" min-width="110">
                    <template #default="{ row: child }">{{ getDimCategoryLabel(child.dim_category) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="维度编码" min-width="120">
                    <template #default="{ row: child }">{{ getDimCodeLabel(child.dim_code) }}</template>
                  </ElTableColumn>
                  <ElTableColumn prop="value_code" label="维度值" min-width="180" show-overflow-tooltip />
                  <ElTableColumn label="金额" min-width="110">
                    <template #default="{ row: child }">{{ getAmountText(child.amount) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="方向" min-width="100">
                    <template #default="{ row: child }">{{ getDirectionLabel(child.direction) }}</template>
                  </ElTableColumn>
                  <ElTableColumn prop="currency" label="币种" min-width="100" />
                  <ElTableColumn prop="period" label="期间" min-width="120" />
                  <ElTableColumn prop="description" label="说明" min-width="180" show-overflow-tooltip />
                </ElTable>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="业务日期" min-width="180">
            <template #default="{ row }">{{ formatDateTime(row.biz_date) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="event_code" label="事件编码" min-width="170" />
          <ElTableColumn prop="biz_category" label="业务分类" min-width="120" />
          <ElTableColumn prop="ref_id" label="业务单号" min-width="180" />
          <ElTableColumn label="需凭证" width="100">
            <template #default="{ row }">
              <ElTag :type="Number(row.is_voucher_required) === 1 ? 'warning' : 'info'">
                {{ Number(row.is_voucher_required) === 1 ? '是' : '否' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="凭证状态" width="100">
            <template #default="{ row }">
              <ElTag :type="getVoucherStatusType(row)">
                {{ getVoucherStatusText(row) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="voucher_no" label="凭证号" min-width="140" />
          <ElTableColumn prop="analysis_summary" label="分析维度摘要" min-width="260" show-overflow-tooltip />
          <ElTableColumn label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <ElButton type="primary" link @click.stop="openDetail(row)">查看详情</ElButton>
              <ElButton v-if="Number(row.is_voucher_required) === 1 && !String(row.voucher_no || '').trim()" type="primary" link :loading="generatingRowId === row.rowid" @click.stop="handleGenerateVoucher(row)">
                单条生成凭证
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>

        <div class="dimension-result-page__pagination-wrap">
          <ElPagination
            :current-page="pagination.pageNo"
            :page-size="pagination.page"
            :page-sizes="pagination.pageSizes"
            :total="totalRecords"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </ElCard>
    </div>

    <ElDialog v-model="detailVisible" title="维度台账详情" width="1180px" append-to-body>
      <template v-if="currentRow">
        <div class="dimension-result-page__detail-head-actions">
          <ElButton @click="handleImportClick">导入</ElButton>
          <ElButton @click="handleExport">导出</ElButton>
          <ElButton @click="goToRuleCenter">进入规则中心</ElButton>
          <ElButton @click="goToBizCategoryManage">业务分类管理</ElButton>
          <ElButton v-if="Number(currentRow.is_voucher_required) === 1 && !String(currentRow.voucher_no || '').trim()" type="primary" :loading="generatingRowId === currentRow.rowid" @click="handleGenerateVoucher(currentRow)">
            单条生成凭证
          </ElButton>
        </div>

        <ElDescriptions :column="3" border>
          <ElDescriptionsItem label="业务日期">{{ formatDateTime(currentRow.biz_date) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="事件编码">{{ currentRow.event_code }}</ElDescriptionsItem>
          <ElDescriptionsItem label="业务分类">{{ currentRow.biz_category }}</ElDescriptionsItem>
          <ElDescriptionsItem label="业务单号">{{ currentRow.ref_id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="凭证号">{{ currentRow.voucher_no || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="需凭证">{{ Number(currentRow.is_voucher_required) === 1 ? '是' : '否' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="描述" :span="3">{{ currentRow.description || '-' }}</ElDescriptionsItem>
        </ElDescriptions>

        <div class="dimension-result-page__detail-table-wrap">
          <ElTable :data="currentDetailRows" border size="small" max-height="420">
            <ElTableColumn label="维度分类" min-width="110">
              <template #default="{ row }">{{ getDimCategoryLabel(row.dim_category) }}</template>
            </ElTableColumn>
            <ElTableColumn label="维度编码" min-width="120">
              <template #default="{ row }">{{ getDimCodeLabel(row.dim_code) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="value_code" label="维度值" min-width="180" show-overflow-tooltip />
            <ElTableColumn label="金额" min-width="110">
              <template #default="{ row }">{{ getAmountText(row.amount) }}</template>
            </ElTableColumn>
            <ElTableColumn label="方向" min-width="100">
              <template #default="{ row }">{{ getDirectionLabel(row.direction) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="currency" label="币种" min-width="100" />
            <ElTableColumn prop="period" label="期间" min-width="120" />
            <ElTableColumn prop="description" label="说明" min-width="180" show-overflow-tooltip />
          </ElTable>
        </div>
      </template>
      <ElEmpty v-else description="暂无台账明细" />
      <template #footer>
        <div class="dimension-result-page__dialog-footer">
          <ElButton @click="detailVisible = false">关闭</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="importDialogVisible" title="导入业务维度台账" width="520px" append-to-body>
      <div class="dimension-result-page__import-wrap">
        <ElUpload
          :limit="1"
          accept=".xls,.xlsx"
          :auto-upload="false"
          :show-file-list="true"
          :on-change="handleImportFileChange"
        >
          <ElButton type="primary">选择 Excel 文件</ElButton>
        </ElUpload>
        <div class="dimension-result-page__import-tip">导入/导出使用统一配置 ID：7245EE90F2839A8241580051B2C47A71</div>
      </div>
      <template #footer>
        <div class="dimension-result-page__dialog-footer">
          <ElButton @click="handleImportDialogClose">取消</ElButton>
          <ElButton type="primary" :loading="importSubmitting" @click="handleImportSubmit">确认导入</ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.dimension-result-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}


.dimension-result-page__title-wrap {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.dimension-result-page__title {
  font-size: 16px;
  font-weight: 600;
}

.dimension-result-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.dimension-result-page__header-actions,
.dimension-result-page__detail-head-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dimension-result-page__query-form {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.dimension-result-page__selection-tip {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 4px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  font-size: 13px;
}

.dimension-result-page__input-lg {
  width: 320px;
}

.dimension-result-page__input-sm {
  width: 180px;
}

.dimension-result-page__input-xs {
  width: 140px;
}

.dimension-result-page__expand-wrap {
  padding: 8px 16px;
  background: var(--el-fill-color-lighter);
}

.dimension-result-page__expand-status {
  padding: 16px 0;
  color: var(--el-text-color-secondary);
}

.dimension-result-page__pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.dimension-result-page__detail-table-wrap {
  margin-top: 12px;
}

.dimension-result-page__import-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dimension-result-page__import-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.dimension-result-page__dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
