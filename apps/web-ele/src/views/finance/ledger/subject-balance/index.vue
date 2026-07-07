<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import ExcelJS from 'exceljs';

import { Page } from '@vben/common-ui';

import { useAccountSetStore } from '#/store/account-set';


import {
  fetchSubjectBalanceRows,
  type SubjectBalanceRow,
} from '#/api/erp/finance/ledger/subject-balance';

import { buildSubjectBalancePrintHtml } from '#/views/finance/print-templates/subject-balance';
import { monthLabel, toMoney } from '#/views/finance/ledger/subject-balance/data';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceSubjectBalance' });

const accountSetStore = useAccountSetStore();

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function getIndentStyle(row: SubjectBalanceRow) {
  const level = Math.max(Number(row?.level || 1), 1);
  return {
    paddingLeft: `${(level - 1) * 20}px`,
  };
}

function getRowClassName({ row }: { row: SubjectBalanceRow }) {
  if (row.isTotal) return 'subject-balance-row-total';
  if (!row.isLeaf) return 'subject-balance-row-parent';
  return '';
}

const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const keyword = ref('');
const loading = ref(false);
const printLoading = ref(false);
const exportLoading = ref(false);
const expandAllLevels = ref(false);
const rawTableData = ref<SubjectBalanceRow[]>([]);
const printFrameRef = ref<HTMLIFrameElement>();

const companyName = computed(() => String(accountSetStore.currentName || accountSetStore.displayName || '').trim());
const periodText = computed(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return '';
  if (start && end && start !== end) return `${monthLabel(start)} 至 ${monthLabel(end)}`;
  return monthLabel(start || end || '');
});
const keywordText = computed(() => String(keyword.value || '').trim());
const tableData = computed(() => {
  const rows = rawTableData.value || [];
  if (expandAllLevels.value) return rows;
  return rows.filter((item) => item.isTotal || Math.max(Number(item.level || 1), 1) <= 1);
});

const summaryText = computed(() => {
  const count = tableData.value.filter((item) => !item.isTotal).length;
  return `显示 ${count} 条科目记录`;
});

async function load() {
  loading.value = true;
  try {
    rawTableData.value = await fetchSubjectBalanceRows({
      periodStart: periodRange.value?.[0] || '',
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || '',
      keyword: keywordText.value || undefined,
    });
  } catch (error) {
    console.error(error);
    ElMessage.error('加载科目余额表失败');
  } finally {
    loading.value = false;
  }
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

function safeFileNamePart(value: string, fallback = '科目余额表') {
  return String(value || '').replace(/[\/:*?"<>|]/g, '').replace(/s+/g, '').slice(0, 40) || fallback;
}

function formatSamplePeriodText() {
  const [start, end] = periodRange.value || [];
  const format = (month: string) => {
    const [y, m] = String(month || '').split('-');
    if (!y || !m) return '';
    return y + '年' + Number(m) + '月';
  };
  if (start && end && start !== end) return format(start) + '至' + format(end);
  return format(start || end || '');
}

function moneyValue(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

async function exportCurrent() {
  if (tableData.value.length === 0) {
    ElMessage.warning('当前没有可导出的科目余额表数据');
    return;
  }

  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lingma ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('科目余额表');
    sheet.columns = [
      { width: 18 },
      { width: 22 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
    ];

    sheet.addRow(['科目余额表']);
    sheet.addRow(['编制单位：  ' + getAccountSetNameForFile(), '', '', '', formatSamplePeriodText(), '', '', '', '单位：元', '']);
    sheet.addRow(['科目编码', '科目名称', '期初余额', '', '本期发生额', '', '本年累计发生额', '', '期末余额', '']);
    sheet.addRow(['科目编码', '科目名称', '借方', '贷方', '借方', '贷方', '借方', '贷方', '借方', '贷方']);

    sheet.mergeCells('A1:J1');
    sheet.mergeCells('A2:D2');
    sheet.mergeCells('E2:H2');
    sheet.mergeCells('I2:J2');
    sheet.mergeCells('A3:A4');
    sheet.mergeCells('B3:B4');
    sheet.mergeCells('C3:D3');
    sheet.mergeCells('E3:F3');
    sheet.mergeCells('G3:H3');
    sheet.mergeCells('I3:J3');

    tableData.value.forEach((row) => {
      const prefix = row.isTotal ? '' : '  '.repeat(Math.max(Number(row.level || 1) - 1, 0));
      sheet.addRow([
        row.isTotal ? '' : prefix + row.subjectCode,
        row.isTotal ? '合  计' : prefix + row.subjectName,
        moneyValue(row.openingDebit),
        moneyValue(row.openingCredit),
        moneyValue(row.currentDebit),
        moneyValue(row.currentCredit),
        moneyValue(row.yearDebit),
        moneyValue(row.yearCredit),
        moneyValue(row.endingDebit),
        moneyValue(row.endingCredit),
      ]);
    });

    sheet.getRow(1).height = 28;
    sheet.getRow(1).font = { bold: false, size: 16, name: 'Arial' };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    [2, 3, 4].forEach((rowNo) => {
      const row = sheet.getRow(rowNo);
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.font = { bold: rowNo >= 3, name: 'Arial' };
    });

    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = rowNumber <= 4
          ? { horizontal: 'center', vertical: 'middle', wrapText: true }
          : { horizontal: cell.col >= 3 ? 'right' : 'left', vertical: 'middle' };
        if (rowNumber > 4 && cell.col >= 3) cell.numFmt = '#,##0.00;-#,##0.00;';
      });
      if (rowNumber > 4 && row.getCell(2).value === '合  计') {
        row.font = { bold: true, name: 'Arial' };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const [start, end] = periodRange.value || [];
    const period = safeFileNamePart((start || '') + '-' + (end || start || ''), '期间');
    const accountSet = safeFileNamePart(getAccountSetNameForFile(), '当前账套');
    a.href = url;
    a.download = '科目余额表_' + period + '_' + accountSet + '.xlsx';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

async function printCurrent() {
  if (tableData.value.length === 0) {
    ElMessage.warning('当前没有可打印的科目余额表数据');
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

  const html = buildSubjectBalancePrintHtml({
    title: '科目余额表',
    companyName: companyName.value,
    periodText: periodText.value,
    unitText: '元',
    rows: tableData.value.map((item) => ({
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      openingDebit: item.openingDebit,
      openingCredit: item.openingCredit,
      currentDebit: item.currentDebit,
      currentCredit: item.currentCredit,
      endingDebit: item.endingDebit,
      endingCredit: item.endingCredit,
      level: item.level,
      isLeaf: item.isLeaf,
      isTotal: item.isTotal,
    })),
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

onMounted(load);
watch(periodRange, load);
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col gap-3">
      <div class="subject-balance-panel min-h-0 flex-1 rounded-md border border-border bg-card shadow-sm">
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
            <div class="filter-item filter-item--search">
              <span class="filter-label">科目搜索</span>
              <ElInput
                v-model="keyword"
                class="search-box__input"
                clearable
                placeholder="搜索科目编码/名称"
                @keyup.enter="load"
              />
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElCheckbox v-model="expandAllLevels">展开所有级次</ElCheckbox>
            <ElButton type="primary" @click="load">查询</ElButton>
            <ElButton :loading="printLoading" @click="printCurrent">打印</ElButton>
            <ElButton type="primary" :loading="exportLoading" @click="exportCurrent">导出</ElButton>
          </div>
        </div>

        <ElTable
          :data="tableData"
          :row-class-name="getRowClassName"
          border
          stripe
          v-loading="loading"
          height="100%"
          class="w-full"
        >
          <ElTableColumn prop="subjectCode" label="科目编码" width="110" fixed="left" />
          <ElTableColumn prop="subjectName" label="科目名称" min-width="220" fixed="left">
            <template #default="scope">
              <div class="subject-name-cell" :style="getIndentStyle(scope.row)">
                <span :class="{ 'font-semibold': !scope.row.isLeaf || scope.row.isTotal }">
                  {{ scope.row.subjectName }}
                </span>
              </div>
            </template>
          </ElTableColumn>

          <ElTableColumn label="期初余额" align="center">
            <ElTableColumn prop="openingDebit" label="借方" width="120" align="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.openingDebit) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="openingCredit" label="贷方" width="120" align="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.openingCredit) }}</span>
              </template>
            </ElTableColumn>
          </ElTableColumn>

          <ElTableColumn label="本期发生额" align="center">
            <ElTableColumn prop="currentDebit" label="借方" width="120" align="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.currentDebit) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="currentCredit" label="贷方" width="120" align="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.currentCredit) }}</span>
              </template>
            </ElTableColumn>
          </ElTableColumn>

          <ElTableColumn label="期末余额" align="center">
            <ElTableColumn prop="endingDebit" label="借方" width="120" align="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.endingDebit) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="endingCredit" label="贷方" width="120" align="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.endingCredit) }}</span>
              </template>
            </ElTableColumn>
          </ElTableColumn>
        </ElTable>
      </div>

      <div class="text-xs text-muted-foreground">{{ summaryText }}</div>
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

.subject-name-cell {
  display: flex;
  align-items: center;
  min-height: 20px;
}

.subject-balance-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

:deep(.subject-balance-row-parent) {
  --el-table-tr-bg-color: var(--el-color-primary-light-9);
}

:deep(.subject-balance-row-total) {
  --el-table-tr-bg-color: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
</style>
