<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import ExcelJS from 'exceljs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useAccountSetStore } from '#/store/account-set';

import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';


import {
  fetchSubjectSummaryRows,
  type SubjectSummaryResult,
  type SubjectSummaryRow,
} from '#/api/erp/finance/ledger/subject-sum';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElInput,
  ElLink,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceSubjectSummary' });

const router = useRouter();
const accountSetStore = useAccountSetStore();

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}


function toMoney(value: unknown) {
  const amount = moneyNumber(value as any);
  if (amount === 0) return '';
  return moneyText(amount);
}

function getIndentStyle(row: SubjectSummaryRow) {
  const level = Number(row.level ?? 0) || 0;
  return {
    paddingLeft: `${level * 14}px`,
  };
}

function getDisplayName(row: SubjectSummaryRow) {
  return row.displaySubjectName || row.subjectName || '';
}

const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const keyword = ref('');
const loading = ref(false);
const exportLoading = ref(false);
const voucherCount = ref(0);
const attachmentCount = ref(0);
const rawTableData = ref<SubjectSummaryRow[]>([]);
const expandAllLevels = ref(false);

const keywordText = computed(() => String(keyword.value || '').trim());
const tableData = computed(() => {
  const sourceRows = rawTableData.value || [];
  const baseRows = sourceRows.filter((item) => {
    if (item.isCategoryTotal || item.isGrandTotal) return false;
    if (expandAllLevels.value) return true;
    return Math.max(Number(item.level || 0), 0) <= 0;
  });

  const codeSet = new Set(baseRows.map((item) => String(item.subjectCode || '').trim()).filter(Boolean));
  const totalSourceRows = baseRows.filter((item) => {
    const parentCode = String(item.parentSubjectCode || '').trim();
    return !parentCode || !codeSet.has(parentCode);
  });

  const totalDebit = moneyNumber(sumByMoney(totalSourceRows, (item) => item.currentDebit));
  const totalCredit = moneyNumber(sumByMoney(totalSourceRows, (item) => item.currentCredit));

  return [
    ...baseRows,
    {
      rowId: 'page-grand-total',
      subjectType: '',
      subjectTypeLabel: '',
      subjectCode: '',
      subjectName: '合计',
      displaySubjectName: '合计',
      currentDebit: totalDebit,
      currentCredit: totalCredit,
      parentSubjectCode: '',
      level: 0,
      isGrandTotal: true,
    } as SubjectSummaryRow,
  ];
});

async function load() {
  loading.value = true;
  try {
    const result = (await fetchSubjectSummaryRows({
      periodStart: periodRange.value?.[0] || '',
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || '',
      keyword: keywordText.value || undefined,
    })) as SubjectSummaryResult;
    rawTableData.value = result.rows || [];
    voucherCount.value = Number(result.voucherCount || 0);
    attachmentCount.value = Number(result.attachmentCount || 0);
  } catch (error) {
    console.error(error);
    ElMessage.error('加载科目汇总表失败');
  } finally {
    loading.value = false;
  }
}

function handleQuery() {
  load();
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

function safeFileNamePart(value: string, fallback = '科目汇总表') {
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

function moneyValue(value: unknown) {
  const amount = moneyNumber(value as any);
  return Number.isFinite(amount) ? amount : 0;
}

async function exportCurrent() {
  if (tableData.value.length === 0) {
    ElMessage.warning('当前没有可导出的科目汇总表数据');
    return;
  }

  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lingma ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('科目汇总表');
    sheet.columns = [
      { width: 18 },
      { width: 34 },
      { width: 16 },
      { width: 16 },
    ];

    sheet.addRow(['科目汇总表']);
    sheet.addRow([
      '编制单位：  ' + getAccountSetNameForFile(),
      formatSamplePeriodText(),
      '凭证数：' + voucherCount.value + '张 附件数：' + attachmentCount.value + '张',
      '',
    ]);
    sheet.addRow(['科目编码', '科目名称', '金额合计', '']);
    sheet.addRow(['科目编码', '科目名称', '借方', '贷方']);

    sheet.mergeCells('A1:D1');
    sheet.mergeCells('A3:A4');
    sheet.mergeCells('B3:B4');
    sheet.mergeCells('C3:D3');

    tableData.value.forEach((row) => {
      const prefix = row.isGrandTotal ? '' : '  '.repeat(Math.max(Number(row.level || 0), 0));
      sheet.addRow([
        row.isGrandTotal ? '' : prefix + row.subjectCode,
        row.isGrandTotal ? '合  计' : prefix + getDisplayName(row),
        moneyValue(row.currentDebit),
        moneyValue(row.currentCredit),
      ]);
    });

    sheet.getRow(1).height = 28;
    sheet.getRow(1).font = { bold: false, size: 16, name: 'Arial' };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).font = { name: 'Arial' };

    [3, 4].forEach((rowNo) => {
      const row = sheet.getRow(rowNo);
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.font = { bold: true, name: 'Arial' };
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
    a.download = '科目汇总表_' + period + '_' + accountSet + '.xlsx';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}


function openDetailLedger(row: SubjectSummaryRow) {
  if (row.isGrandTotal) return;
  if (!row.subjectCode) return;

  router.push({
    path: '/finance/ledger/detail',
    query: {
      periodStart: periodRange.value?.[0] || getCurrentMonth(),
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || getCurrentMonth(),
      month: periodRange.value?.[0] || getCurrentMonth(),
      subjectCode: row.subjectCode,
      subjectName: row.subjectName || row.displaySubjectName || '',
    },
  });
}

onMounted(load);
watch(periodRange, load);
</script>

<template>
  <Page auto-content-height class="h-full subject-sum-page">
    <div class="flex h-full flex-col gap-3">
      <div class="subject-sum-table-wrap rounded-md border border-border bg-card shadow-sm">
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
                class="subject-search-input"
                clearable
                placeholder="搜索科目编码/名称"
                @keyup.enter="handleQuery"
              />
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElCheckbox v-model="expandAllLevels">展开所有级次</ElCheckbox>
            <ElButton type="primary" @click="handleQuery">查询</ElButton>
            <ElButton type="primary" :loading="exportLoading" @click="exportCurrent">导出</ElButton>
          </div>
        </div>

        <ElTable
          :data="tableData"
          border
          v-loading="loading"
          height="100%"
          class="subject-sum-table"
          header-row-class-name="subject-sum-header-row"
          cell-class-name="subject-sum-cell"
        >
          <ElTableColumn prop="subjectCode" label="科目编码" min-width="180" align="left" />
          <ElTableColumn prop="displaySubjectName" label="科目名称" min-width="260" align="left">
            <template #default="scope">
              <div
                class="subject-name-cell"
                :class="{ 'subject-total-cell': scope.row.isGrandTotal }"
                :style="scope.row.isGrandTotal ? undefined : getIndentStyle(scope.row)"
              >
                <span v-if="scope.row.isGrandTotal">{{ getDisplayName(scope.row) }}</span>
                <ElLink v-else type="primary" :underline="false" @click="openDetailLedger(scope.row)">
                  {{ getDisplayName(scope.row) }}
                </ElLink>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="金额合计" align="center">
            <ElTableColumn prop="currentDebit" label="借方" min-width="180" align="right">
              <template #default="scope">
                <span class="tabular-nums" :class="{ 'subject-total-cell': scope.row.isGrandTotal }">
                  {{ toMoney(scope.row.currentDebit) }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="currentCredit" label="贷方" min-width="180" align="right">
              <template #default="scope">
                <span class="tabular-nums" :class="{ 'subject-total-cell': scope.row.isGrandTotal }">
                  {{ toMoney(scope.row.currentCredit) }}
                </span>
              </template>
            </ElTableColumn>
          </ElTableColumn>
        </ElTable>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.subject-sum-page {
  background: hsl(var(--background));
}


.subject-sum-table-wrap {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: hsl(var(--background));
}

.subject-name-cell {
  display: flex;
  align-items: center;
  min-height: 20px;
  box-sizing: border-box;
}

.subject-total-cell {
  font-weight: 700;
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

.subject-search-input {
  width: 220px;
  flex: 0 0 auto;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

:deep(.subject-sum-table) {
  --el-table-border-color: hsl(var(--border));
  --el-table-header-bg-color: hsl(var(--muted));
  --el-table-row-hover-bg-color: hsl(var(--accent));
  --el-table-bg-color: hsl(var(--card));
  --el-table-tr-bg-color: hsl(var(--card));
  --el-fill-color-light: hsl(var(--muted));
  font-size: 14px;
  color: hsl(var(--foreground));
}

:deep(.subject-sum-table th.el-table__cell) {
  background: hsl(var(--muted)) !important;
  color: hsl(var(--foreground));
  font-weight: 600;
}

:deep(.subject-sum-table tr) {
  background: hsl(var(--card));
}

:deep(.subject-sum-table .el-table__cell) {
  padding: 10px 8px;
  background: transparent;
}

:deep(.subject-sum-table .cell) {
  white-space: nowrap;
}

:deep(.subject-sum-table .el-link) {
  color: hsl(var(--primary));
  font-weight: 400;
}

:deep(.subject-sum-table .el-link:hover) {
  color: hsl(var(--primary));
  opacity: 0.88;
}

:deep(.subject-sum-table .is-right .cell) {
  font-variant-numeric: tabular-nums;
}
</style>
