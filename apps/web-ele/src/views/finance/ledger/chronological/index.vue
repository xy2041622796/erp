<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import ExcelJS from 'exceljs';

import { moneyNumber, moneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useAccountSetStore } from '#/store/account-set';

import {
  getVoucherDetails,
  getVoucherPage,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElLink,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceChronologicalLedger' });

type JournalRow = {
  rowId: string;
  voucherId: string;
  date: string;
  voucherNo: string;
  summary: string;
  subjectCode: string;
  subjectName: string;
  subject: string;
  debit: number;
  credit: number;
  maker: string;
  reviewer: string;
  source: string;
};

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function monthStartISO(month: string) {
  const [y, m] = String(month || '').split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m - 1, 1, 0, 0, 0, 0).toISOString();
}

function monthEndISO(month: string) {
  const [y, m] = String(month || '').split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m, 0, 23, 59, 59, 999).toISOString();
}

function formatDate(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toMoney(value: any) {
  const n = moneyNumber(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return moneyText(n);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const text = String(item ?? '').trim();
    if (text) return text;
  }
  return '';
}

function parseVoucherWordNo(code: string): { word: string; no: number } {
  const s = String(code ?? '').trim();
  const m = s.match(/^(.+?)(\d+)$/);
  if (!m) return { word: s || '记', no: Number.MAX_SAFE_INTEGER };
  const word = String(m[1] ?? '').trim() || '记';
  const no = Number(m[2]);
  return {
    word,
    no: Number.isFinite(no) ? Math.trunc(no) : Number.MAX_SAFE_INTEGER,
  };
}

function compareVoucherNo(a: string, b: string) {
  const pa = parseVoucherWordNo(a);
  const pb = parseVoucherWordNo(b);
  const word = pa.word.localeCompare(pb.word, 'zh-Hans-CN');
  if (word !== 0) return word;
  if (pa.no !== pb.no) return pa.no - pb.no;
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN');
}

const router = useRouter();
const accountSetStore = useAccountSetStore();
const loading = ref(false);
const printLoading = ref(false);
const exportLoading = ref(false);
const rows = ref<JournalRow[]>([]);
const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const postStatus = ref<'all' | 'posted' | 'unposted'>('all');
const printFrameRef = ref<HTMLIFrameElement>();
const currentPage = ref(1);
const pageSize = ref(50);
const pageSizeOptions = [20, 50, 100, 200];

const normalizedPeriodRange = computed<[string, string]>(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return [getCurrentMonth(), getCurrentMonth()];
  if (!start) return [end, end] as [string, string];
  if (!end) return [start, start] as [string, string];
  return start <= end ? [start, end] : [end, start];
});

const displayPeriodText = computed(() => {
  const [start, end] = normalizedPeriodRange.value;
  if (start === end) return start;
  return `${start} 至 ${end}`;
});

const filteredRows = computed(() => {
  return rows.value;
});

const totalDebit = computed(() => moneyNumber(sumByMoney(filteredRows.value, (row) => row.debit)));
const totalCredit = computed(() => moneyNumber(sumByMoney(filteredRows.value, (row) => row.credit)));
const balanceDiff = computed(() => moneyNumber(subMoney(totalDebit.value, totalCredit.value)));
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

function resetPage() {
  currentPage.value = 1;
}

function handlePageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

watch([postStatus, periodRange], resetPage, { deep: true });
watch(filteredRows, () => {
  const maxPage = Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

async function loadData() {
  const [startMonth, endMonth] = normalizedPeriodRange.value;
  const start = monthStartISO(startMonth);
  const end = monthEndISO(endMonth);
  if (!start || !end) {
    ElMessage.warning('请选择有效会计期间');
    return;
  }

  loading.value = true;
  try {
    const res = await getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [start, end],
    });

    let mains = ((res?.list || []) as ErpVoucherApi.VoucherMain[]).filter(
      (item: any) => Number(item?.lingma_sys_is_delete ?? 0) !== 1,
    );

    if (postStatus.value === 'posted') {
      mains = mains.filter((item: any) => Number(item?.is_posted ?? 0) === 1);
    } else if (postStatus.value === 'unposted') {
      mains = mains.filter((item: any) => Number(item?.is_posted ?? 0) !== 1);
    }

    const detailGroups = await Promise.all(
      mains.map((main) => getVoucherDetails(String((main as any).rowid ?? (main as any).row_id ?? ''))),
    );

    const nextRows: JournalRow[] = [];
    mains.forEach((main: any, mainIndex) => {
      const voucherId = String(main.rowid ?? main.row_id ?? '');
      const voucherNo = pickNonEmptyText(
        main.voucher_code,
        main.ReportID,
        main.business_code,
      );
      const date = formatDate(
        pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime),
      );
      const maker = pickNonEmptyText(main.operator, main.createuser, main.updateuser);
      const reviewer = pickNonEmptyText(main.reviewer);
      const source = pickNonEmptyText(main.business_name, main.voucher_type, main.business_code);

      (detailGroups[mainIndex] || []).forEach((detail: any, detailIndex) => {
        const subjectCode = String(detail.account_code ?? '').trim();
        const subjectName = String(detail.account_name ?? '').trim();
        nextRows.push({
          rowId: String(detail.rowid ?? detail.row_id ?? `${voucherId}-${detailIndex}`),
          voucherId,
          date,
          voucherNo,
          summary: pickNonEmptyText(detail.abstract_content, detail.description, main.description),
          subjectCode,
          subjectName,
          subject: [subjectCode, subjectName].filter(Boolean).join(' '),
          debit: Number(detail.debit_amount ?? 0) || 0,
          credit: Number(detail.credit_amount ?? 0) || 0,
          maker,
          reviewer,
          source,
        });
      });
    });

    currentPage.value = 1;
    rows.value = nextRows.sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCompare !== 0) return dateCompare;
      const voucherCompare = compareVoucherNo(a.voucherNo, b.voucherNo);
      if (voucherCompare !== 0) return voucherCompare;
      return String(a.rowId || '').localeCompare(String(b.rowId || ''));
    });
  } catch (error) {
    console.error(error);
    ElMessage.error('加载序时账失败');
  } finally {
    loading.value = false;
  }
}

function openVoucher(row: JournalRow) {
  if (!row.voucherId) {
    ElMessage.warning('当前分录没有凭证ID');
    return;
  }
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      id: row.voucherId,
      type: 'detail',
      date: row.date.slice(0, 7),
      moduleScope: 'finance',
    },
  });
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

function safeFileNamePart(value: string, fallback = '序时账') {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').slice(0, 40) || fallback;
}

function formatSamplePeriodText() {
  const [start, end] = normalizedPeriodRange.value;
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
  if (filteredRows.value.length === 0) {
    ElMessage.warning('当前没有可导出的序时账数据');
    return;
  }

  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lingma ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('序时账');
    sheet.columns = [
      { width: 14 },
      { width: 16 },
      { width: 30 },
      { width: 18 },
      { width: 24 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 20 },
    ];

    sheet.addRow(['序时账']);
    sheet.addRow(['编制单位：  ' + getAccountSetNameForFile(), '', '', '', formatSamplePeriodText(), '', '', '', '单位：元', '']);
    sheet.addRow(['日期', '凭证字号', '摘要', '科目编码', '科目名称', '借方金额', '贷方金额', '制单人', '审核人', '来源']);

    sheet.mergeCells('A1:J1');
    sheet.mergeCells('A2:D2');
    sheet.mergeCells('E2:H2');
    sheet.mergeCells('I2:J2');

    filteredRows.value.forEach((row) => {
      sheet.addRow([
        row.date,
        row.voucherNo,
        row.summary,
        row.subjectCode,
        row.subjectName,
        moneyValue(row.debit),
        moneyValue(row.credit),
        row.maker,
        row.reviewer,
        row.source,
      ]);
    });

    sheet.addRow(['合计', '', '', '', '', moneyValue(totalDebit.value), moneyValue(totalCredit.value), '', '', '']);
    const totalRowNo = sheet.rowCount;
    sheet.mergeCells(totalRowNo, 1, totalRowNo, 5);

    sheet.getRow(1).height = 28;
    sheet.getRow(1).font = { bold: false, size: 16, name: 'Arial' };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).font = { name: 'Arial' };
    sheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(3).font = { bold: true, name: 'Arial' };
    sheet.getRow(totalRowNo).font = { bold: true, name: 'Arial' };

    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = rowNumber <= 3
          ? { horizontal: 'center', vertical: 'middle', wrapText: true }
          : { horizontal: cell.col >= 6 && cell.col <= 7 ? 'right' : 'left', vertical: 'middle', wrapText: true };
        if (rowNumber > 3 && cell.col >= 6 && cell.col <= 7) cell.numFmt = '#,##0.00;-#,##0.00;';
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const [start, end] = normalizedPeriodRange.value;
    const period = safeFileNamePart((start || '') + '-' + (end || start || ''), '期间');
    const accountSet = safeFileNamePart(getAccountSetNameForFile(), '当前账套');
    a.href = url;
    a.download = '序时账_' + period + '_' + accountSet + '.xlsx';
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
  const tableRows = filteredRows.value
    .map(
      (row) => `
        <tr>
          <td>${row.date}</td>
          <td>${row.voucherNo}</td>
          <td>${row.summary}</td>
          <td>${row.subject}</td>
          <td class="money">${toMoney(row.debit)}</td>
          <td class="money">${toMoney(row.credit)}</td>
          <td>${row.maker}</td>
          <td>${row.reviewer}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>序时账</title>
<style>
  body { font-family: Arial, "Microsoft YaHei", sans-serif; color: #111; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 8px; }
  .meta { display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { border:1px solid #333; padding:6px; }
  th { background:#f5f5f5; }
  .money { text-align:right; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <h1>序时账</h1>
  <div class="meta"><span>期间：${displayPeriodText.value}</span><span>打印时间：${new Date().toLocaleString()}</span></div>
  <table>
    <thead><tr><th>日期</th><th>凭证字号</th><th>摘要</th><th>科目</th><th>借方金额</th><th>贷方金额</th><th>制单人</th><th>审核人</th></tr></thead>
    <tbody>${tableRows}</tbody>
    <tfoot><tr><th colspan="4">合计</th><th class="money">${toMoney(totalDebit.value)}</th><th class="money">${toMoney(totalCredit.value)}</th><th colspan="2"></th></tr></tfoot>
  </table>
</body>
</html>`;
}

async function printCurrent() {
  if (filteredRows.value.length === 0) {
    ElMessage.warning('当前没有可打印的序时账数据');
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

onMounted(loadData);
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="chronological-ledger-page flex h-full min-h-0 flex-col">
      <div class="table-card min-h-0 flex-1 rounded-md border border-border bg-card shadow-sm">
        <div class="table-card__toolbar">
          <div class="query-card__filters">
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
              <span class="filter-label">记账状态</span>
              <ElSelect v-model="postStatus" class="status-select">
                <ElOption label="全部" value="all" />
                <ElOption label="已记账" value="posted" />
                <ElOption label="未记账" value="unposted" />
              </ElSelect>
            </div>
          </div>
          <div class="query-card__actions">
            <ElButton type="primary" :loading="loading" @click="loadData">查询</ElButton>
            <ElButton :loading="printLoading" @click="printCurrent">打印</ElButton>
            <ElButton type="primary" :loading="exportLoading" @click="exportCurrent">导出</ElButton>
          </div>
        </div>


        <ElTable
          v-loading="loading"
          :data="pagedRows"
          border
          height="100%"
          row-key="rowId"
          class="w-full"
        >
          <ElTableColumn prop="date" label="日期" width="110" fixed />
          <ElTableColumn label="凭证字号" width="120">
            <template #default="scope">
              <ElLink type="primary" :underline="false" @click="openVoucher(scope.row)">
                {{ scope.row.voucherNo || '—' }}
              </ElLink>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
          <ElTableColumn prop="subjectCode" label="科目编码" width="120" show-overflow-tooltip />
          <ElTableColumn prop="subjectName" label="科目名称" min-width="180" show-overflow-tooltip />
          <ElTableColumn label="借方金额" width="140" align="right">
            <template #default="scope">{{ toMoney(scope.row.debit) }}</template>
          </ElTableColumn>
          <ElTableColumn label="贷方金额" width="140" align="right">
            <template #default="scope">{{ toMoney(scope.row.credit) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="maker" label="制单人" width="120" show-overflow-tooltip />
          <ElTableColumn prop="reviewer" label="审核人" width="120" show-overflow-tooltip />
          <ElTableColumn prop="source" label="来源" min-width="160" show-overflow-tooltip />
        </ElTable>

        <div class="pagination-row">
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="pageSizeOptions"
            :total="filteredRows.length"
            background
            layout="total, sizes, prev, pager, next, jumper"
            small
            @size-change="handlePageSizeChange"
          />
        </div>
      </div>
    </div>

    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.chronological-ledger-page {
  min-width: 0;
}

.table-card {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.table-card__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-wrap: wrap;
}

.query-card__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.query-card__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.filter-label {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 24px;
}

.period-picker {
  width: 250px;
}

.status-select {
  width: 112px;
}


.table-card :deep(.el-table) {
  flex: 1;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  padding: 6px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.table-card :deep(.el-table__cell) {
  padding: 7px 0;
}

.table-card :deep(.el-input__wrapper),
.table-card :deep(.el-select__wrapper) {
  min-height: 30px;
}

.table-card :deep(.el-button) {
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
</style>
