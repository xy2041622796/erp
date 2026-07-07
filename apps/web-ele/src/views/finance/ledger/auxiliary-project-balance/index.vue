<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import ExcelJS from 'exceljs';

import { Page } from '@vben/common-ui';

import {
  fetchAuxiliaryProjectBalanceRows,
  type AuxiliaryBalanceRow,
} from '#/api/erp/finance/reports/auxiliary-project-ledger';
import {
  monthLabel,
  toMoney,
} from '#/views/finance/ledger/subject-balance/data';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceAuxiliaryProjectBalance' });

const router = useRouter();

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

const dimOptions = [
  { label: '客户', value: 'CUSTOMER' },
  { label: '供应商', value: 'SUPPLIER' },
  { label: '项目', value: 'PROJECT' },
  { label: '部门', value: 'DEPT' },
  { label: '员工', value: 'EMPLOYEE' },
  { label: '合同', value: 'CONTRACT' },
];

const periodRange = ref<[string, string]>([
  getCurrentMonth(),
  getCurrentMonth(),
]);
const dimCode = ref('PROJECT');
const keyword = ref('');
const activeAuxiliaryCode = ref('');
const loading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const tableData = ref<AuxiliaryBalanceRow[]>([]);
const printFrameRef = ref<HTMLIFrameElement>();

const periodText = computed(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return '';
  if (start && end && start !== end)
    return `${monthLabel(start)} 至 ${monthLabel(end)}`;
  return monthLabel(start || end || '');
});

const auxiliaryDimensionLabel = computed(() => {
  const matched = dimOptions.find((item) => item.value === dimCode.value);
  return matched?.label || '核算项目';
});
const auxiliaryCodeColumnLabel = computed(
  () => auxiliaryDimensionLabel.value + '编码',
);
const auxiliaryNameColumnLabel = computed(
  () => auxiliaryDimensionLabel.value + '名称',
);

const auxiliaryItems = computed(() => {
  const map = new Map<string, AuxiliaryBalanceRow>();
  tableData.value.forEach((row) => {
    if (row.isTotal) return;
    const code = String(row.auxiliaryCode || '').trim();
    if (!code || map.has(code)) return;
    map.set(code, row);
  });
  return [...map.values()].sort((a, b) =>
    String(a.auxiliaryCode || '').localeCompare(
      String(b.auxiliaryCode || ''),
      'zh-Hans-CN',
    ),
  );
});

const displayRows = computed(() => {
  const code = String(activeAuxiliaryCode.value || '').trim();
  if (!code) return tableData.value;
  const rows = tableData.value.filter(
    (row) => !row.isTotal && String(row.auxiliaryCode || '') === code,
  );
  const total = rows.reduce(
    (acc, row) => {
      acc.openingDebit += Number(row.openingDebit || 0);
      acc.openingCredit += Number(row.openingCredit || 0);
      acc.currentDebit += Number(row.currentDebit || 0);
      acc.currentCredit += Number(row.currentCredit || 0);
      acc.endingDebit += Number(row.endingDebit || 0);
      acc.endingCredit += Number(row.endingCredit || 0);
      acc.debit = acc.currentDebit;
      acc.credit = acc.currentCredit;
      acc.balance = acc.endingDebit - acc.endingCredit;
      return acc;
    },
    {
      rowId: 'selected-total',
      dimCode: dimCode.value,
      dimName: '合计',
      auxiliaryCode: '',
      auxiliaryName: '合计',
      voucherId: '',
      voucherNo: '',
      departmentCode: '',
      departmentName: '',
      projectCode: '',
      projectName: '合计',
      subjectCode: '',
      subjectName: '',
      openingDebit: 0,
      openingCredit: 0,
      currentDebit: 0,
      currentCredit: 0,
      endingDebit: 0,
      endingCredit: 0,
      debit: 0,
      credit: 0,
      balance: 0,
      isTotal: true,
    } as AuxiliaryBalanceRow,
  );
  return rows.length > 0 ? [...rows, total] : rows;
});

const selectedAuxiliaryTitle = computed(() => {
  const code = String(activeAuxiliaryCode.value || '').trim();
  if (!code) return '全部项目';
  const item = auxiliaryItems.value.find(
    (row) => String(row.auxiliaryCode || '') === code,
  );
  return (
    [item?.auxiliaryCode, item?.auxiliaryName].filter(Boolean).join(' ') || code
  );
});

const summaryText = computed(() => {
  const count = displayRows.value.filter((item) => !item.isTotal).length;
  return `${periodText.value} · ${selectedAuxiliaryTitle.value} · 显示 ${count} 条核算项目余额`;
});

function rowClassName({ row }: { row: AuxiliaryBalanceRow }) {
  return row.isTotal ? 'auxiliary-balance-row-total' : '';
}

async function load() {
  loading.value = true;
  try {
    tableData.value = await fetchAuxiliaryProjectBalanceRows({
      periodStart: periodRange.value?.[0] || '',
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || '',
      dimCode: dimCode.value || undefined,
      keyword: keyword.value || undefined,
    });
    if (
      activeAuxiliaryCode.value &&
      !auxiliaryItems.value.some(
        (item) =>
          String(item.auxiliaryCode || '') === activeAuxiliaryCode.value,
      )
    ) {
      activeAuxiliaryCode.value = '';
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('加载核算项目余额表失败');
  } finally {
    loading.value = false;
  }
}

function pickAuxiliary(code: string) {
  activeAuxiliaryCode.value = code;
}

function openDetail(row: AuxiliaryBalanceRow) {
  if (row.isTotal) return;
  router.push({
    path: '/finance/ledger/auxiliary-project-detail',
    query: {
      periodStart: periodRange.value?.[0] || '',
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || '',
      dimCode: dimCode.value || row.dimCode,
      valueCode: row.auxiliaryCode,
      departmentCode: row.departmentCode,
      projectCode: row.projectCode,
      subjectCode: row.subjectCode,
    },
  });
}

function moneyValue(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function printCurrent() {
  if (displayRows.value.length === 0) {
    ElMessage.warning('当前没有可打印的核算项目余额数据');
    return;
  }
  await nextTick();
  const frame = printFrameRef.value;
  const win = frame?.contentWindow;
  const doc = frame?.contentDocument || win?.document;
  if (!win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }
  const bodyRows = displayRows.value
    .map(
      (row) => `
        <tr class="${row.isTotal ? 'total' : ''}">
          <td>${escapeHtml(row.auxiliaryCode)}</td>
          <td>${escapeHtml(row.auxiliaryName)}</td>
          <td class="money">${escapeHtml(toMoney(row.openingDebit))}</td>
          <td class="money">${escapeHtml(toMoney(row.openingCredit))}</td>
          <td class="money">${escapeHtml(toMoney(row.currentDebit))}</td>
          <td class="money">${escapeHtml(toMoney(row.currentCredit))}</td>
          <td class="money">${escapeHtml(toMoney(row.endingDebit))}</td>
          <td class="money">${escapeHtml(toMoney(row.endingCredit))}</td>
        </tr>`,
    )
    .join('');
  const html = `<!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8">
        <title>核算项目余额表</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { margin: 0; color: #111; font: 12px Arial, "Microsoft YaHei", sans-serif; }
          h1 { margin: 0 0 6px; text-align: center; font-size: 20px; font-weight: 500; }
          .period { margin-bottom: 10px; text-align: center; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { height: 28px; padding: 3px 6px; border: 1px solid #777; }
          th { text-align: center; background: #f1f7f2; }
          td.money { text-align: right; font-variant-numeric: tabular-nums; }
          tr.total td { font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>核算项目余额表</h1>
        <div class="period">${escapeHtml(periodText.value)}</div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">${escapeHtml(auxiliaryCodeColumnLabel.value)}</th>
              <th rowspan="2">${escapeHtml(auxiliaryNameColumnLabel.value)}</th>
              <th colspan="2">期初余额</th>
              <th colspan="2">本期发生额</th>
              <th colspan="2">期末余额</th>
            </tr>
            <tr>
              <th>借方</th><th>贷方</th>
              <th>借方</th><th>贷方</th>
              <th>借方</th><th>贷方</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>`;
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

async function exportCurrent() {
  if (displayRows.value.length === 0) {
    ElMessage.warning('当前没有可导出的核算项目余额数据');
    return;
  }
  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('核算项目余额表');
    sheet.columns = [
      { width: 18 },
      { width: 28 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
    ];
    sheet.addRow([
      auxiliaryCodeColumnLabel.value,
      auxiliaryNameColumnLabel.value,
      '期初余额',
      '',
      '本期发生额',
      '',
      '期末余额',
      '',
    ]);
    sheet.addRow(['', '', '借方', '贷方', '借方', '贷方', '借方', '贷方']);
    sheet.mergeCells('A1:A2');
    sheet.mergeCells('B1:B2');
    sheet.mergeCells('C1:D1');
    sheet.mergeCells('E1:F1');
    sheet.mergeCells('G1:H1');
    displayRows.value.forEach((row) => {
      sheet.addRow([
        row.auxiliaryCode,
        row.auxiliaryName,
        moneyValue(row.openingDebit),
        moneyValue(row.openingCredit),
        moneyValue(row.currentDebit),
        moneyValue(row.currentCredit),
        moneyValue(row.endingDebit),
        moneyValue(row.endingCredit),
      ]);
    });
    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          right: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
        };
        const columnNumber = Number(cell.col);
        cell.alignment = {
          horizontal:
            rowNumber <= 2 ? 'center' : columnNumber >= 3 ? 'right' : 'left',
          vertical: 'middle',
        };
        if (rowNumber > 2 && columnNumber >= 3)
          cell.numFmt = '#,##0.00;-#,##0.00;';
      });
      if (rowNumber <= 2) row.font = { bold: true };
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `核算项目余额表_${periodRange.value.join('-')}.xlsx`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

onMounted(load);
watch([periodRange, dimCode], async () => {
  activeAuxiliaryCode.value = '';
  await load();
});
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col gap-3">
      <div
        class="auxiliary-report-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
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
            <div class="filter-item">
              <span class="filter-label">核算维度</span>
              <ElSelect v-model="dimCode" class="dimension-select" filterable>
                <ElOption
                  v-for="item in dimOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </div>
            <div class="filter-item filter-item--search">
              <span class="filter-label">搜索</span>
              <ElInput
                v-model="keyword"
                class="search-box__input"
                clearable
                :placeholder="auxiliaryDimensionLabel + '/科目编码/名称'"
                @keyup.enter="load"
              />
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="load">查询</ElButton>
            <ElButton :loading="printLoading" @click="printCurrent"
              >打印</ElButton
            >
            <ElButton
              type="primary"
              :loading="exportLoading"
              @click="exportCurrent"
              >导出</ElButton
            >
          </div>
        </div>

        <div class="auxiliary-balance-layout">
          <div class="auxiliary-project-panel">
            <div class="auxiliary-project-panel__header">
              <span @click="pickAuxiliary('')" class="auxiliary-project-all"
                >全部核算项目</span
              >
              <span>{{ auxiliaryItems.length }} 个</span>
            </div>
            <div class="auxiliary-project-panel__body">
              <div
                v-for="item in auxiliaryItems"
                :key="String(item.auxiliaryCode)"
                class="auxiliary-project-row"
                :class="{
                  'auxiliary-project-row--active':
                    activeAuxiliaryCode === item.auxiliaryCode,
                }"
                :title="
                  [item.auxiliaryCode, item.auxiliaryName]
                    .filter(Boolean)
                    .join(' ')
                "
                @click="pickAuxiliary(String(item.auxiliaryCode || ''))"
              >
                <span class="auxiliary-project-code">{{
                  item.auxiliaryCode
                }}</span>
                <span class="auxiliary-project-name">{{
                  item.auxiliaryName
                }}</span>
              </div>
              <div
                v-if="!loading && auxiliaryItems.length === 0"
                class="auxiliary-project-empty"
              >
                当前维度下没有核算项目
              </div>
            </div>
          </div>

          <ElTable
            :data="displayRows"
            :row-class-name="rowClassName"
            border
            stripe
            v-loading="loading"
            height="100%"
            class="w-full"
            @row-dblclick="openDetail"
          >
            <ElTableColumn
              prop="auxiliaryCode"
              :label="auxiliaryCodeColumnLabel"
              width="130"
              fixed="left"
            />
            <ElTableColumn
              prop="auxiliaryName"
              :label="auxiliaryNameColumnLabel"
              min-width="180"
              fixed="left"
            />
            <ElTableColumn label="期初余额" align="center">
              <ElTableColumn
                prop="openingDebit"
                label="借方"
                width="140"
                align="right"
              >
                <template #default="scope">{{
                  toMoney(scope.row.openingDebit)
                }}</template>
              </ElTableColumn>
              <ElTableColumn
                prop="openingCredit"
                label="贷方"
                width="140"
                align="right"
              >
                <template #default="scope">{{
                  toMoney(scope.row.openingCredit)
                }}</template>
              </ElTableColumn>
            </ElTableColumn>
            <ElTableColumn label="本期发生额" align="center">
              <ElTableColumn
                prop="currentDebit"
                label="借方"
                width="140"
                align="right"
              >
                <template #default="scope">{{
                  toMoney(scope.row.currentDebit)
                }}</template>
              </ElTableColumn>
              <ElTableColumn
                prop="currentCredit"
                label="贷方"
                width="140"
                align="right"
              >
                <template #default="scope">{{
                  toMoney(scope.row.currentCredit)
                }}</template>
              </ElTableColumn>
            </ElTableColumn>
            <ElTableColumn label="期末余额" align="center">
              <ElTableColumn
                prop="endingDebit"
                label="借方"
                width="140"
                align="right"
              >
                <template #default="scope">{{
                  toMoney(scope.row.endingDebit)
                }}</template>
              </ElTableColumn>
              <ElTableColumn
                prop="endingCredit"
                label="贷方"
                width="140"
                align="right"
              >
                <template #default="scope">{{
                  toMoney(scope.row.endingCredit)
                }}</template>
              </ElTableColumn>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>

      <div class="text-muted-foreground text-xs">
        {{ summaryText }}；双击明细行可进入核算项目明细帐。
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

.auxiliary-report-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.auxiliary-balance-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.auxiliary-project-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.auxiliary-project-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  font-weight: 600;
}

.auxiliary-project-all {
  cursor: pointer;
}

.auxiliary-project-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 0;
}

.auxiliary-project-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  font-size: 13px;
  cursor: pointer;
}

.auxiliary-project-row:hover,
.auxiliary-project-row--active {
  background: var(--el-fill-color-light);
}

.auxiliary-project-code {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.auxiliary-project-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auxiliary-project-empty {
  padding: 24px 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
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

.filter-item--search {
  flex: 0 0 auto;
}

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.period-range-picker {
  width: 260px;
}

.dimension-select {
  width: 160px;
}

.search-box__input {
  width: 220px;
  flex: 0 0 auto;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

:deep(.auxiliary-balance-row-total) {
  --el-table-tr-bg-color: var(--el-fill-color-light);
  color: var(--el-color-primary);
  font-weight: 600;
}

@media (max-width: 900px) {
  .auxiliary-balance-layout {
    grid-template-columns: 1fr;
  }

  .auxiliary-project-panel {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}
</style>
