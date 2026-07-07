<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import ExcelJS from 'exceljs';

import { Page } from '@vben/common-ui';

import { useAccountSetStore } from '#/store/account-set';


import {
  fetchGeneralLedgerRows,
  type GeneralLedgerRow,
} from '#/api/erp/finance/ledger/general';

import { GENERAL_LEDGER_COLUMNS, monthLabel, toMoney } from '#/views/finance/ledger/general/data';
import { buildGeneralLedgerPrintHtml } from '#/views/finance/print-templates/general-ledger';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElPopover,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceGeneralLedger' });

const accountSetStore = useAccountSetStore();

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const keyword = ref('');
const filterPopoverVisible = ref(false);

const loading = ref(false);
const printLoading = ref(false);
const onlyShowTopLevel = ref(false);
const tableData = ref<GeneralLedgerRow[]>([]);
const printFrameRef = ref<HTMLIFrameElement>();
const exportLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const expandAllLevels = ref(true);
const tableRef = ref<any>();

const periodText = computed(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return '';
  if (start && end && start !== end) return `${monthLabel(start)} 至 ${monthLabel(end)}`;
  return monthLabel(start || end || '');
});
const subjectKeywordText = computed(() => String(keyword.value || '').trim());

async function applyFilters() {
  currentPage.value = 1;
  filterPopoverVisible.value = false;
  await load();
}

function resetFilters() {
  keyword.value = '';
  onlyShowTopLevel.value = false;
  currentPage.value = 1;
}

function isTopLevelSubject(row: GeneralLedgerRow) {
  return String(row?.subjectCode || '').trim().length <= 4;
}

const displayTableData = computed(() => {
  if (!onlyShowTopLevel.value) return tableData.value;
  return tableData.value.filter(isTopLevelSubject);
});

const pagedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return displayTableData.value.slice(start, start + pageSize.value);
});

function walkRows(
  rows: GeneralLedgerRow[],
  callback: (row: GeneralLedgerRow) => void,
) {
  rows.forEach((row) => {
    callback(row);
    if (Array.isArray(row.children) && row.children.length > 0) {
      walkRows(row.children, callback);
    }
  });
}

async function syncTreeExpansion() {
  await nextTick();
  const table = tableRef.value;
  if (!table) return;
  walkRows(pagedTableData.value, (row) => {
    if (Array.isArray(row.children) && row.children.length > 0) {
      table.toggleRowExpansion(row, expandAllLevels.value);
    }
  });
}

function onPageChange(page: number) {
  currentPage.value = page;
}

function onPageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

function isAmountSummaryRow(row: GeneralLedgerRow) {
  return ['本期合计', '本年累计'].includes(String(row?.period || ''));
}

function isSubjectGroupRow(row: GeneralLedgerRow) {
  return String(row?.summary || '') === '__subject-merged__';
}

function shouldHideExpandedAmountCell(row: GeneralLedgerRow, key: string) {
  if (isAmountSummaryRow(row)) return false;
  return ['debit', 'credit', 'directionText', 'balanceAbs'].includes(key);
}

function getMergedLedgerRowText(row: GeneralLedgerRow) {
  const code = String(row?.subjectCode || '').trim();
  const name = String(row?.subjectName || '').trim();
  const period = String(row?.period || '').trim();
  return [code, name, period].filter(Boolean).join(' ');
}


function tableSpanMethod({ row, columnIndex }: { row: GeneralLedgerRow; columnIndex: number }) {
  if (!isSubjectGroupRow(row)) return { rowspan: 1, colspan: 1 };
  if (columnIndex === 0) return { rowspan: 1, colspan: GENERAL_LEDGER_COLUMNS.length };
  return { rowspan: 0, colspan: 0 };
}

function tableRowClassName({ row }: { row: GeneralLedgerRow }) {
  return isSubjectGroupRow(row) ? 'general-ledger-subject-group-row' : '';
}

async function load() {
  loading.value = true;
  try {
    currentPage.value = 1;
    tableData.value = await fetchGeneralLedgerRows({
      periodStart: periodRange.value?.[0] || '',
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || '',
      keyword: subjectKeywordText.value || undefined,
    });
  } catch (e) {
    console.error(e);
    ElMessage.error('加载总账失败');
  } finally {
    loading.value = false;
  }
}

async function printCurrent() {
  if (tableData.value.length === 0) {
    ElMessage.warning('当前没有可打印的总账数据');
    return;
  }

  await nextTick();
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }

  const html = buildGeneralLedgerPrintHtml({
    title: '总账',
    monthLabel: periodText.value,
    keyword: subjectKeywordText.value,
    rows: displayTableData.value as any,
  });

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

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

function safeFileNamePart(value: string, fallback = '总账') {
  return String(value || '')
    .replace(/[\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 40) || fallback;
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

function normalizeExcelMoney(value: any) {
  const text = normalizeExcelCellText(value).replace(/,/g, '');
  const n = Number(text || 0);
  return Number.isFinite(n) ? n : 0;
}

function flattenGeneralLedgerRows(rows: GeneralLedgerRow[]) {
  const out: GeneralLedgerRow[] = [];
  rows.forEach((row) => {
    out.push(row);
    if (Array.isArray(row.children)) out.push(...row.children);
  });
  return out;
}

function buildExportMatrix(rows: GeneralLedgerRow[]) {
  const matrix: any[][] = [];
  matrix.push(['总账']);
  matrix.push(['账套', getAccountSetNameForFile(), '期间', periodText.value]);
  matrix.push(['科目编码', '科目名称', '日期', '期间', '借方金额', '贷方金额', '方向', '余额']);
  flattenGeneralLedgerRows(rows).forEach((row) => {
    matrix.push([
      row.subjectCode,
      row.subjectName,
      row.dateLabel || '',
      row.period,
      Number(row.debit || 0),
      Number(row.credit || 0),
      row.directionText,
      Number(row.balanceAbs || 0),
    ]);
  });
  return matrix;
}

async function downloadGeneralLedgerWorkbook(fileName: string, rows: GeneralLedgerRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lingma ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('总账');
  buildExportMatrix(rows).forEach((row) => sheet.addRow(row));
  sheet.mergeCells(1, 1, 1, 8);
  sheet.getRow(1).height = 28;
  sheet.getCell(1, 1).font = { bold: true, size: 16 };
  sheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).font = { bold: true };
  sheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 3 }];
  sheet.columns = [{ width: 14 }, { width: 22 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 14 }];
  ['E', 'F', 'H'].forEach((col) => { sheet.getColumn(col).numFmt = '#,##0.00'; });
  sheet.eachRow((row) => row.eachCell((cell) => {
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  }));

  const note = workbook.addWorksheet('导入说明');
  note.addRow(['说明', '内容']);
  note.addRow(['账套范围', '导出数据来自当前选中账套；导入时会生成凭证到当前选中账套。请先切换到目标账套再导入。']);
  note.addRow(['导入规则', '只导入期间标记为“本期合计”或“本期合计”的行，自动跳过期初余额、本年累计和科目汇总根行。']);
  note.addRow(['平衡校验', '导入前会校验借贷合计相等；不平衡时不会写入任何凭证。']);
  note.addRow(['文件格式', '建议使用本页面导出的 xlsx；旧版 .xls 请先另存为 .xlsx。']);
  note.columns = [{ width: 18 }, { width: 100 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportCurrent() {
  if (displayTableData.value.length === 0) {
    ElMessage.warning('当前没有可导出的总账数据');
    return;
  }
  exportLoading.value = true;
  try {
    const period = safeFileNamePart((periodRange.value?.[0] || '') + '-' + (periodRange.value?.[1] || ''), '期间');
    const accountSet = safeFileNamePart(getAccountSetNameForFile(), '当前账套');
    await downloadGeneralLedgerWorkbook('总账_' + period + '_' + accountSet + '.xlsx', displayTableData.value);
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

onMounted(load);
watch(periodRange, load);
watch(displayTableData, () => {
  const maxPage = Math.max(1, Math.ceil(displayTableData.value.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});
watch([expandAllLevels, pagedTableData], syncTreeExpansion, { flush: 'post' });
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col">
      <div class="general-ledger-panel min-h-0 flex-1 rounded-md border border-border bg-card shadow-sm">
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item">
              <span class="filter-label">查询期间</span>
              <ElDatePicker
                v-model="periodRange"
                type="monthrange"
                range-separator="至"
                start-placeholder="开始月份"
                end-placeholder="结束月份"
                value-format="YYYY-MM"
                class="period-range-picker"
              />
            </div>
            <ElPopover
              v-model:visible="filterPopoverVisible"
              trigger="click"
              placement="bottom-start"
              :width="360"
              :show-arrow="true"
            >
              <template #reference>
                <ElButton>筛选条件</ElButton>
              </template>

              <div class="general-ledger-filter-popover">
                <div class="filter-popover-row">
                  <span class="filter-popover-label">科目搜索</span>
                  <ElInput
                    v-model="keyword"
                    clearable
                    placeholder="搜索科目编码/名称"
                    @keyup.enter="applyFilters"
                  />
                </div>
                <div class="filter-popover-row filter-popover-row--checkbox">
                  <ElCheckbox v-model="onlyShowTopLevel">只展示顶级</ElCheckbox>
                </div>
                <div class="filter-popover-actions">
                  <ElButton type="primary" @click="applyFilters">确定</ElButton>
                  <ElButton @click="filterPopoverVisible = false">取消</ElButton>
                  <ElButton @click="resetFilters">重置</ElButton>
                </div>
              </div>
            </ElPopover>
          </div>
          <div class="table-toolbar__actions">
            <ElCheckbox v-model="expandAllLevels">展开所有级次</ElCheckbox>
            <ElButton type="primary" @click="load">查询</ElButton>
            <ElButton :loading="printLoading" @click="printCurrent">打印</ElButton>
            <ElButton type="primary" :loading="exportLoading" @click="exportCurrent">导出</ElButton>
          </div>
        </div>

        <div class="general-ledger-table-wrap">
        <ElTable
          ref="tableRef"
          :data="pagedTableData"
          border
          :fit="true"
          row-key="rowId"
          :tree-props="{ children: 'children' }"
          v-loading="loading"
          :span-method="tableSpanMethod"
          :row-class-name="tableRowClassName"
          class="general-ledger-table w-full"
          height="100%"
        >
          <ElTableColumn
            v-for="c in GENERAL_LEDGER_COLUMNS"
            :key="c.key"
            :prop="c.key"
            :label="c.title"
            :width="c.width"
            :min-width="c.minWidth"
            :show-overflow-tooltip="false"
            :align="c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left'"
          >
            <template #default="scope">
              <template v-if="isSubjectGroupRow(scope.row) && c.key === 'subjectCode'">
                <span class="general-ledger-merged-row-text">{{ getMergedLedgerRowText(scope.row) }}</span>
              </template>
              <template v-else-if="isSubjectGroupRow(scope.row)">
                <span></span>
              </template>
              <template v-else-if="shouldHideExpandedAmountCell(scope.row, c.key)">
                <span></span>
              </template>
              <template v-else-if="c.key === 'debit' || c.key === 'credit' || c.key === 'balanceAbs'">
                <span class="tabular-nums">{{ toMoney(scope.row[c.key]) }}</span>
              </template>
              <template v-else>
                <span>{{ scope.row[c.key] }}</span>
              </template>
            </template>
          </ElTableColumn>
        </ElTable>
        </div>

        <div class="general-ledger-pagination">
          <ElPagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="displayTableData.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @current-change="onPageChange"
            @size-change="onPageSizeChange"
          />
        </div>
      </div>
    </div>

    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
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

.general-ledger-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.general-ledger-table-wrap {
  min-height: 0;
  flex: 1;
}

.general-ledger-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  flex-wrap: wrap;
}

.table-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}


.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.period-range-picker {
  width: 260px;
}


.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.general-ledger-filter-popover {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-popover-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.filter-popover-row--checkbox {
  display: flex;
  padding-left: 82px;
}

.filter-popover-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: right;
}

.filter-popover-actions {
  display: flex;
  gap: 8px;
  padding-left: 82px;
}

:deep(.general-ledger-summary-column .cell) {
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.general-ledger-summary-cell {
  display: inline-block;
  width: 100%;
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.general-ledger-merged-row-text {
  display: inline-block;
  width: 100%;
  font-weight: 600;
  white-space: normal;
  word-break: break-word;
  overflow: visible;
  text-overflow: clip;
}

:deep(.el-table__body .cell) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

/* 总账原生树图标布局 */
:deep(.general-ledger-table .general-ledger-subject-group-row td:first-child .cell) {
  display: flex;
  align-items: center;
  min-height: 38px;
  line-height: 20px;
}

:deep(.general-ledger-table .general-ledger-subject-group-row .el-table__indent),
:deep(.general-ledger-table .general-ledger-subject-group-row .el-table__placeholder) {
  flex: 0 0 18px;
  width: 18px;
}

:deep(.general-ledger-table .general-ledger-subject-group-row .el-table__expand-icon) {
  position: relative;
  top: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 20px;
  margin-right: 6px;
  vertical-align: middle;
}

:deep(.general-ledger-table .general-ledger-subject-group-row .el-table__expand-icon .el-icon) {
  font-size: 13px;
  line-height: 1;
  color: var(--el-text-color-secondary);
}

:deep(.general-ledger-table .general-ledger-subject-group-row .general-ledger-merged-row-text) {
  flex: 1 1 auto;
  min-width: 0;
  line-height: 20px;
}

</style>
