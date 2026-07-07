<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import ExcelJS from 'exceljs';

import { Page } from '@vben/common-ui';

import { useHorizontalWheelScroll } from '#/hooks/use-horizontal-wheel-scroll';
import { useAccountSetStore } from '#/store/account-set';
import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';
import {
  getVoucherDetailsByIds,
  getVoucherPage,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceReportsBreakdown' });

type ExpenseRow = {
  rowId: string;
  voucherId: string;
  date: string;
  period: string;
  voucherNo: string;
  summary: string;
  subjectCode: string;
  subjectName: string;
  accountType: string;
  amount: number;
  maker: string;
  reviewer: string;
  source: string;
};

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function monthStartIso(month: string) {
  const [y, m] = String(month || '').split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m - 1, 1, 0, 0, 0).toISOString();
}

function monthEndIso(month: string) {
  const [y, m] = String(month || '').split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m, 0, 23, 59, 59).toISOString();
}

function formatDate(value: any) {
  if (!value) return '';
  const text = String(value ?? '').trim();
  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matched) return matched[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPeriodFromDate(value: any) {
  return formatDate(value).slice(0, 7);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const text = String(item ?? '').trim();
    if (text) return text;
  }
  return '';
}

function toMoney(value: any) {
  const n = moneyNumber(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) return '';
  return moneyText(n);
}

const EXPENSE_SUBJECT_PREFIXES = ['5601', '5602', '5603', '6601', '6602', '6603'];

function getExpenseType(code: string) {
  if (code.startsWith('5601') || code.startsWith('6601')) return '销售费用';
  if (code.startsWith('5602') || code.startsWith('6602')) return '管理费用';
  if (code.startsWith('5603') || code.startsWith('6603')) return '财务费用';
  return '';
}

function isExpenseSubject(code: string) {
  return EXPENSE_SUBJECT_PREFIXES.some((prefix) => code.startsWith(prefix));
}

function isProfitLossCarryForwardText(...values: any[]) {
  const text = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('结转损益') ||
    text.includes('期间结转') ||
    text.includes('结转利润') ||
    text.includes('period-close') ||
    text.includes('period-profit') ||
    text.includes('period-reverse')
  );
}

function isProfitLossCarryForwardVoucher(main: any) {
  const businessCode = String(main?.business_code || '').trim();
  return (
    businessCode.startsWith('PERIOD-CLOSE-') ||
    businessCode.startsWith('PERIOD-PROFIT-') ||
    businessCode.startsWith('PERIOD-REVERSE-') ||
    isProfitLossCarryForwardText(main?.business_name, main?.voucher_type, main?.description)
  );
}

function getExpenseOccurrenceAmount(detail: any) {
  const debit = moneyNumber(detail?.debit_amount ?? 0);
  const credit = moneyNumber(detail?.credit_amount ?? 0);
  return moneyNumber(debit - credit);
}

function isActiveVoucherDetail(detail: any) {
  return (
    Number(detail?.lingma_sys_is_delete ?? 0) !== 1 &&
    Number(detail?.voucher_recycle_state ?? 0) !== 1
  );
}

const accountSetStore = useAccountSetStore();
const loading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const rows = ref<ExpenseRow[]>([]);
const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const expenseType = ref('all');
const showAllLevels = ref(true);
const printFrameRef = ref<HTMLIFrameElement>();
const tableWheelRef = ref<HTMLDivElement>();

useHorizontalWheelScroll(tableWheelRef);

const normalizedPeriodRange = computed<[string, string]>(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return [getCurrentMonth(), getCurrentMonth()];
  if (!start) return [end, end] as [string, string];
  if (!end) return [start, start] as [string, string];
  return start <= end ? [start, end] : [end, start];
});

const periodText = computed(() => {
  const [start, end] = normalizedPeriodRange.value;
  return start === end ? start : `${start} 至 ${end}`;
});
const visibleRows = computed(() => {
  const type = expenseType.value;
  return rows.value.filter((row) => {
    if (type !== 'all' && row.accountType !== type) return false;
    return true;
  });
});

const totalAmount = computed(() => moneyNumber(sumByMoney(visibleRows.value, (row) => row.amount)));

function resetFilters() {
  periodRange.value = [getCurrentMonth(), getCurrentMonth()];
  expenseType.value = 'all';
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

function safeFileNamePart(value: string, fallback = '费用明细表') {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').slice(0, 80) || fallback;
}

function formatMonthText(month: string) {
  const [year, monthNo] = String(month || '').split('-');
  if (!year || !monthNo) return '';
  return `${year}年${Number(monthNo)}月`;
}

function formatSamplePeriodText() {
  const [start, end] = normalizedPeriodRange.value;
  if (start && end && start !== end) return `${formatMonthText(start)}至${formatMonthText(end)}`;
  return formatMonthText(start || end || '');
}

function formatExportDateText() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function monthSequence(startMonth: string, endMonth: string) {
  const [startYear, startNo] = String(startMonth || '').split('-').map(Number);
  const [endYear, endNo] = String(endMonth || '').split('-').map(Number);
  if (!startYear || !startNo || !endYear || !endNo) return [];

  const months: string[] = [];
  const cursor = new Date(startYear, startNo - 1, 1);
  const end = new Date(endYear, endNo - 1, 1);
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function addAmount(bucket: Record<string, number>, month: string, amount: number) {
  bucket[month] = moneyNumber((bucket[month] || 0) + amount);
}

function formatExportSubjectName(code: string, subjectName: string, parentName: string) {
  const name = String(subjectName || '').trim();
  if (!code || code.length <= 4) return parentName || name;
  if (!parentName || !name) return name || parentName;
  if (name.startsWith(parentName) || name.includes(`${parentName}-`)) return name;
  return `${parentName}-${name}`;
}

type ExpenseExportRow = {
  code: string;
  isParent: boolean;
  monthAmounts: Record<string, number>;
  name: string;
  rowId: string;
};

function buildExportRows(months: string[]) {
  const parentMap = new Map<string, ExpenseExportRow>();
  const childMap = new Map<string, ExpenseExportRow>();

  visibleRows.value.forEach((row) => {
    const code = String(row.subjectCode || '').trim();
    if (!code) return;
    const month = String(row.period || row.date.slice(0, 7));
    if (!months.includes(month)) return;
    const parentCode = code.slice(0, 4);
    const parentName = getExpenseType(parentCode);
    const amount = moneyNumber(row.amount);

    if (!parentMap.has(parentCode)) {
      parentMap.set(parentCode, {
        code: parentCode,
        isParent: true,
        monthAmounts: {},
        name: parentName,
        rowId: `parent-${parentCode}`,
      });
    }
    addAmount(parentMap.get(parentCode)!.monthAmounts, month, amount);

    if (code !== parentCode) {
      if (!childMap.has(code)) {
        childMap.set(code, {
          code,
          isParent: false,
          monthAmounts: {},
          name: formatExportSubjectName(code, row.subjectName, parentName),
          rowId: `child-${code}`,
        });
      }
      addAmount(childMap.get(code)!.monthAmounts, month, amount);
    }
  });

  return [...parentMap.values()]
    .sort((a, b) => a.code.localeCompare(b.code, 'zh-Hans-CN'))
    .flatMap((parent) => {
      const children = [...childMap.values()]
        .filter((child) => child.code.startsWith(parent.code))
        .sort((a, b) => a.code.localeCompare(b.code, 'zh-Hans-CN'));
      return [parent, ...children];
    });
}

function rowTotal(row: ExpenseExportRow, months: string[]) {
  return moneyNumber(sumByMoney(months, (month) => row.monthAmounts[month] || 0));
}

function monthTotal(month: string) {
  return moneyNumber(sumByMoney(visibleRows.value, (row) => {
    const rowMonth = String(row.period || row.date.slice(0, 7));
    return rowMonth === month ? row.amount : 0;
  }));
}

const reportMonths = computed(() => {
  const [start, end] = normalizedPeriodRange.value;
  return monthSequence(start, end);
});

const expenseReportRows = computed(() => {
  const reportRows = buildExportRows(reportMonths.value);
  return showAllLevels.value ? reportRows : reportRows.filter((row) => row.isParent);
});

function getSubjectIndentStyle(row: ExpenseExportRow) {
  return {
    paddingLeft: row.isParent ? '0' : '28px',
  };
}

function reportSummaryMethod({ columns }: { columns: any[] }) {
  return columns.map((column, index) => {
    if (index === 0) return '';
    if (index === 1) return '总计';
    const prop = String(column.property || '');
    if (prop.startsWith('month:')) return toMoney(monthTotal(prop.slice(6))) || '';
    if (prop === 'total') return toMoney(totalAmount.value) || '0.00';
    return '';
  });
}

async function getVoucherMainsByMonths(months: string[]) {
  const mainMap = new Map<string, ErpVoucherApi.VoucherMain>();

  for (const month of months) {
    const start = monthStartIso(month);
    const end = monthEndIso(month);
    if (!start || !end) continue;

    const res = await getVoucherPage({
      pageNo: 1,
      page: 0,
      recycleState: 0,
      voucherDateRange: [start, end],
    });

    ((res?.list || []) as ErpVoucherApi.VoucherMain[]).forEach((main: any) => {
      const voucherId = String(main?.rowid ?? main?.row_id ?? '').trim();
      if (!voucherId || mainMap.has(voucherId)) return;
      mainMap.set(voucherId, main);
    });
  }

  return [...mainMap.values()];
}

async function loadData() {
  const [startMonth, endMonth] = normalizedPeriodRange.value;
  const months = monthSequence(startMonth, endMonth);
  if (months.length === 0) {
    ElMessage.warning('请选择有效会计期间');
    return;
  }

  loading.value = true;
  try {
    const mains = (await getVoucherMainsByMonths(months)).filter(
      (item: any) => (
        Number(item?.lingma_sys_is_delete ?? 0) !== 1 &&
        Number(item?.voucher_recycle_state ?? 0) !== 1
      ),
    );
    const voucherIds = mains
      .map((main: any) => String(main.rowid ?? main.row_id ?? '').trim())
      .filter(Boolean);
    const details = await getVoucherDetailsByIds(voucherIds);
    const detailMap = new Map<string, ErpVoucherApi.VoucherDetail[]>();
    details.forEach((detail: any) => {
      const voucherId = pickNonEmptyText(detail?.voucher_id, detail?.voucherId);
      if (!voucherId) return;
      const group = detailMap.get(voucherId) ?? [];
      group.push(detail);
      detailMap.set(voucherId, group);
    });

    const nextRows: ExpenseRow[] = [];
    mains.forEach((main: any) => {
      const voucherId = String(main.rowid ?? main.row_id ?? '');
      const isCarryForwardMain = isProfitLossCarryForwardVoucher(main);
      const voucherNo = pickNonEmptyText(main.voucher_code, main.ReportID, main.business_code);
      const date = formatDate(pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime));
      const maker = pickNonEmptyText(main.operator, main.createuser, main.updateuser);
      const reviewer = pickNonEmptyText(main.reviewer);
      const source = pickNonEmptyText(main.business_name, main.voucher_type, main.business_code);

      (detailMap.get(voucherId) || []).forEach((detail: any, detailIndex) => {
        if (!isActiveVoucherDetail(detail)) return;
        const subjectCode = String(detail.account_code ?? '').trim();
        const subjectName = String(detail.account_name ?? '').trim();
        if (!isExpenseSubject(subjectCode)) return;
        const amount = getExpenseOccurrenceAmount(detail);
        if (Math.abs(amount) < 0.005) return;
        const isCarryForwardDetail = isProfitLossCarryForwardText(detail.abstract_content, detail.description);
        if (isCarryForwardMain || isCarryForwardDetail) return;
        nextRows.push({
          rowId: String(detail.rowid ?? detail.row_id ?? `${voucherId}-${detailIndex}`),
          voucherId,
          date,
          period: formatPeriodFromDate(main.voucher_date || date),
          voucherNo,
          summary: pickNonEmptyText(detail.abstract_content, detail.description, main.description),
          subjectCode,
          subjectName,
          accountType: getExpenseType(subjectCode),
          amount,
          maker,
          reviewer,
          source,
        });
      });
    });

    rows.value = nextRows.sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(a.voucherNo || '').localeCompare(String(b.voucherNo || ''), 'zh-Hans-CN');
    });
  } catch (error) {
    console.error(error);
    ElMessage.error('费用明细表加载失败');
  } finally {
    loading.value = false;
  }
}

async function exportCurrent() {
  if (visibleRows.value.length === 0) {
    ElMessage.warning('当前没有可导出的费用明细数据');
    return;
  }

  exportLoading.value = true;
  try {
    const [startMonth, endMonth] = normalizedPeriodRange.value;
    const months = monthSequence(startMonth, endMonth);
    const exportRows = expenseReportRows.value;
    const companyName = getAccountSetNameForFile();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lingma ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('费用明细表');
    sheet.columns = [
      { width: 19.52 },
      { width: 23.43 },
      ...months.map(() => ({ width: 13.67 })),
      { width: 13.67 },
    ];

    const columnCount = 2 + months.length + 1;
    const lastColumnLetter = sheet.getColumn(columnCount).letter;
    const titleRow = sheet.addRow(['费用明细表']);
    titleRow.height = 50;

    const metaRow = sheet.addRow([]);
    metaRow.height = 15;
    metaRow.getCell(1).value = `编制单位：  ${companyName}`;
    if (columnCount >= 7) {
      metaRow.getCell(4).value = formatSamplePeriodText();
      metaRow.getCell(6).value = '单位：元';
    } else {
      metaRow.getCell(3).value = formatSamplePeriodText();
      metaRow.getCell(columnCount).value = '单位：元';
    }

    sheet.addRow(['编码', '名称', ...months.map(formatMonthText), '合计']);

    exportRows.forEach((row) => {
      sheet.addRow([
        row.isParent ? row.code : `  ${row.code}`,
        row.isParent ? row.name : `  ${row.name}`,
        ...months.map((month) => moneyNumber(row.monthAmounts[month] || 0)),
        rowTotal(row, months),
      ]);
    });

    sheet.addRow([
      '',
      '总计',
      ...months.map((month) => monthTotal(month)),
      moneyNumber(totalAmount.value),
    ]);
    sheet.addRow(['']);

    sheet.mergeCells(`A1:${lastColumnLetter}1`);
    if (columnCount >= 7) {
      sheet.mergeCells('A2:C2');
      sheet.mergeCells('D2:E2');
      sheet.mergeCells(`F2:${lastColumnLetter}2`);
    } else {
      sheet.mergeCells('A2:B2');
      if (columnCount > 4) sheet.mergeCells(2, 3, 2, columnCount - 1);
    }
    sheet.mergeCells(`A${sheet.rowCount}:${lastColumnLetter}${sheet.rowCount}`);

    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.font = { name: '宋体', size: 10 };
        cell.alignment = {
          horizontal: cell.col >= 3 && rowNumber >= 4 ? 'right' : rowNumber <= 3 ? 'center' : 'left',
          vertical: 'middle',
        };
        if (rowNumber >= 4 && cell.col >= 3) cell.numFmt = '#,##0.00;-#,##0.00;';
      });
    });

    sheet.getRow(1).font = { bold: true, name: '宋体', size: 22 };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(3).font = { bold: true, name: '宋体', size: 10 };
    sheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(sheet.rowCount - 1).font = { bold: true, name: '宋体', size: 10 };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filePeriod = safeFileNamePart(formatSamplePeriodText(), '期间');
    const accountSet = safeFileNamePart(companyName, '当前账套');
    a.href = url;
    a.download = `费用明细表_${filePeriod}_${accountSet}_${formatExportDateText()}.xlsx`;
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

function buildPrintHtml() {
  const monthHeaders = reportMonths.value.map((month) => `<th>${formatMonthText(month)}</th>`).join('');
  const tableRows = expenseReportRows.value
    .map(
      (row) => `<tr><td>${row.isParent ? row.code : `&nbsp;&nbsp;${row.code}`}</td><td>${row.isParent ? row.name : `&nbsp;&nbsp;${row.name}`}</td>${reportMonths.value.map((month) => `<td class="money">${toMoney(row.monthAmounts[month])}</td>`).join('')}<td class="money">${toMoney(rowTotal(row, reportMonths.value))}</td></tr>`,
    )
    .join('');
  const totalCells = reportMonths.value.map((month) => `<th class="money">${toMoney(monthTotal(month))}</th>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8" /><title>费用明细表</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#111;}h1{text-align:center;font-size:20px;margin:0 0 8px}.meta{display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #dcdfe6;padding:6px}th{background:#f5f7fa}.money{text-align:right;font-variant-numeric:tabular-nums}</style></head><body><h1>费用明细表</h1><div class="meta"><span>期间：${periodText.value}</span><span>打印时间：${new Date().toLocaleString()}</span></div><table><thead><tr><th>科目编码</th><th>科目名称</th>${monthHeaders}<th>合计</th></tr></thead><tbody>${tableRows}</tbody><tfoot><tr><th></th><th>总计</th>${totalCells}<th class="money">${toMoney(totalAmount.value) || '0.00'}</th></tr></tfoot></table></body></html>`;
}

async function printCurrent() {
  if (visibleRows.value.length === 0) {
    ElMessage.warning('当前没有可打印的费用明细数据');
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
  printLoading.value = true;
  doc.open();
  doc.write(buildPrintHtml());
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

onMounted(() => loadData());
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="breakdown-page flex h-full min-h-0 flex-col">
      <div class="breakdown-card min-h-0 flex-1 rounded-md border border-border bg-card shadow-sm">
        <div class="breakdown-toolbar">
          <div class="full-filter-grid">
            <div class="filter-item">
              <span class="filter-label">会计期间</span>
              <ElDatePicker
                v-model="periodRange"
                type="monthrange"
                range-separator="至"
                start-placeholder="开始月份"
                end-placeholder="结束月份"
                value-format="YYYY-MM"
                class="period-picker"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">费用类型</span>
              <ElSelect v-model="expenseType" class="type-select">
                <ElOption label="全部" value="all" />
                <ElOption label="销售费用" value="销售费用" />
                <ElOption label="管理费用" value="管理费用" />
                <ElOption label="财务费用" value="财务费用" />
              </ElSelect>
            </div>
            <div class="filter-actions">
              <div class="filter-actions__right">
                <ElButton @click="resetFilters">重置</ElButton>
                <ElButton type="primary" :loading="loading" @click="loadData">查询</ElButton>
                <ElCheckbox v-model="showAllLevels">展开所有级次</ElCheckbox>
                <ElButton :loading="printLoading" @click="printCurrent">打印</ElButton>
                <ElButton type="primary" :loading="exportLoading" @click="exportCurrent">导出</ElButton>
              </div>
            </div>
          </div>
        </div>


        <div ref="tableWheelRef" class="breakdown-table-wrap">
          <ElTable
            v-loading="loading"
            :data="expenseReportRows"
            border
            height="100%"
            row-key="rowId"
            show-summary
            :summary-method="reportSummaryMethod"
            class="breakdown-table w-full"
          >
            <ElTableColumn prop="code" label="科目编码" width="180" fixed>
              <template #default="scope">
                <span class="subject-code" :style="getSubjectIndentStyle(scope.row)">
                  {{ scope.row.code }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="科目名称" min-width="240" fixed show-overflow-tooltip>
              <template #default="scope">
                <span class="subject-name" :style="getSubjectIndentStyle(scope.row)">
                  {{ scope.row.name }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn
              v-for="month in reportMonths"
              :key="month"
              :prop="`month:${month}`"
              :label="formatMonthText(month)"
              min-width="160"
              align="right"
            >
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(scope.row.monthAmounts[month]) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="total" label="合计" min-width="160" align="right" fixed="right">
              <template #default="scope">
                <span class="tabular-nums">{{ toMoney(rowTotal(scope.row, reportMonths)) }}</span>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>
    </div>
    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.breakdown-page {
  min-width: 0;
}

.breakdown-card {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.breakdown-toolbar {
  flex: 0 0 auto;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.filter-actions :deep(.el-button) {
  flex: 0 0 auto;
  min-width: 68px;
  white-space: nowrap;
}

.full-filter-grid {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.filter-item {
  display: flex;
  min-width: 0;
  align-items: center;
  flex: 0 1 360px;
  gap: 6px;
}

.filter-item + .filter-item {
  flex-basis: 260px;
}

.filter-label {
  width: 58px;
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 24px;
  text-align: right;
}

.period-picker,
.type-select {
  width: 100%;
  min-width: 0;
}

.filter-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  justify-content: flex-end;
  margin-left: auto;
  gap: 12px;
}

.filter-actions__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}


.breakdown-table-wrap {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.breakdown-table {
  height: 100%;
}

.breakdown-table :deep(.el-table__header th.el-table__cell) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.breakdown-table-wrap :deep(.el-scrollbar__wrap),
.breakdown-table-wrap :deep(.el-table__body-wrapper) {
  overscroll-behavior: contain;
}

.breakdown-card :deep(.el-table__cell) {
  padding: 7px 0;
}

.subject-code,
.subject-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.breakdown-card :deep(.el-input__wrapper),
.breakdown-card :deep(.el-select__wrapper) {
  min-height: 30px;
}

.breakdown-card :deep(.el-button) {
  height: 30px;
  padding: 0 14px;
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

@media (max-width: 960px) {
  .full-filter-grid {
    flex-wrap: wrap;
  }

  .filter-item {
    flex: 1 1 260px;
  }
}

@media (max-width: 640px) {
  .full-filter-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .filter-item,
  .filter-actions,
  .filter-actions__right {
    align-items: stretch;
  }

  .filter-actions {
    margin-left: 0;
    flex-direction: column;
  }

  .filter-actions__right {
    width: 100%;
    justify-content: flex-end;
  }

  .filter-label {
    width: 54px;
  }
}

@media print {
  .breakdown-toolbar {
    display: none !important;
  }
}
</style>
