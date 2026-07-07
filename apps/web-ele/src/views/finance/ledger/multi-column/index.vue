<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { addMoney, moneyNumber, moneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useHorizontalWheelScroll } from '#/hooks/use-horizontal-wheel-scroll';
import { useAccountSetStore } from '#/store/account-set';

import {
  fetchMultiColumnSubjects,
  fetchMultiColumnVoucherEntries,
  getMultiColumnChildren,
  type MultiColumnSubject,
  type MultiColumnVoucherEntry,
} from '#/api/erp/finance/ledger/multi-column';

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

defineOptions({ name: 'FinanceMultiColumnLedger' });

type RowType = 'detail' | 'periodTotal' | 'yearTotal' | 'endingBalance';

type LedgerRow = {
  rowId: string;
  rowType: RowType;
  voucherId?: string;
  date: string;
  voucherNo: string;
  summary: string;
  debit: number;
  credit: number;
  direction: string;
  balance: number;
  columnAmounts: Record<string, number>;
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

function getMonthEndDate(month: string) {
  const [y, m] = String(month || '').split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function monthOf(date: string) {
  return String(date || '').slice(0, 7);
}

function toMoney(value: any) {
  const n = moneyNumber(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) return '0.0';
  return moneyText(n);
}

function toDisplayMoney(value: any) {
  return toMoney(value);
}

function csvEscape(value: any) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const router = useRouter();
const accountSetStore = useAccountSetStore();
const loading = ref(false);
const subjectLoading = ref(false);
const printLoading = ref(false);
const printFrameRef = ref<HTMLIFrameElement>();
const tableWheelRef = ref<HTMLDivElement>();
useHorizontalWheelScroll(tableWheelRef);
const subjects = ref<MultiColumnSubject[]>([]);
const entries = ref<MultiColumnVoucherEntry[]>([]);
const subjectKeyword = ref('');
const selectedSubjectCode = ref('5602');
const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizeOptions = [20, 50, 100, 200];
const accountSetName = computed(() =>
  String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim(),
);

const normalizedPeriodRange = computed<[string, string]>(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return [getCurrentMonth(), getCurrentMonth()];
  if (!start) return [end, end] as [string, string];
  if (!end) return [start, start] as [string, string];
  return start <= end ? [start, end] : [end, start];
});

const periodText = computed(() => {
  const [start, end] = normalizedPeriodRange.value;
  if (start === end) return start;
  return `${start}—${end}`;
});


const subjectOptions = computed(() => {
  const keyword = subjectKeyword.value.trim();
  const list = keyword
    ? subjects.value.filter((item) =>
        [item.subject_number, item.subject_name].some((value) =>
          String(value || '').includes(keyword),
        ),
      )
    : subjects.value;

  return list.slice(0, 200).map((item) => ({
    label: `${item.subject_number || ''} ${item.subject_name || ''}`.trim(),
    value: String(item.subject_number || '').trim(),
  }));
});

const selectedSubject = computed(() =>
  subjects.value.find(
    (item) => String(item.subject_number || '').trim() === selectedSubjectCode.value,
  ),
);

const dynamicSubjects = computed(() => {
  const children = getMultiColumnChildren({
    subjects: subjects.value,
    subjectCode: selectedSubjectCode.value,
    mode: 'children',
  });

  if (children.length > 0) return children;
  return selectedSubject.value ? [selectedSubject.value] : [];
});

function getSubjectOptionLabel(subject?: MultiColumnSubject) {
  if (!subject) return '';
  return `${subject.subject_number || ''} ${subject.subject_name || ''}`.trim();
}

const selectedSubjectLabel = computed(() => {
  const subject = selectedSubject.value;
  if (!subject) return selectedSubjectCode.value;
  return getSubjectOptionLabel(subject);
});

const isDebitDirection = computed(() => {
  const direction = Number(selectedSubject.value?.balance_direction ?? 1);
  return direction !== 2;
});

const tableRows = computed<LedgerRow[]>(() => buildRows(entries.value));
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return tableRows.value.slice(start, start + pageSize.value);
});

const totalDebit = computed(() => moneyNumber(sumByMoney(entries.value, (row) => row.debit)));
const totalCredit = computed(() => moneyNumber(sumByMoney(entries.value, (row) => row.credit)));

function matchColumnSubject(entry: MultiColumnVoucherEntry) {
  const code = String(entry.subjectCode || '').trim();
  return dynamicSubjects.value.find((subject) => {
    const subjectCode = String(subject.subject_number || '').trim();
    return subjectCode && code.startsWith(subjectCode);
  });
}

function createZeroAmounts() {
  return dynamicSubjects.value.reduce<Record<string, number>>((map, subject) => {
    const code = String(subject.subject_number || '').trim();
    if (code) map[code] = 0;
    return map;
  }, {});
}

function addColumnAmounts(
  target: Record<string, number>,
  source: Record<string, number>,
) {
  Object.keys(source).forEach((key) => {
    target[key] = moneyNumber(addMoney([target[key], source[key]]));
  });
}

function buildDetailRow(entry: MultiColumnVoucherEntry, balance: number): LedgerRow {
  const columnAmounts = createZeroAmounts();
  const subject = matchColumnSubject(entry);
  const subjectCode = String(subject?.subject_number || '').trim();
  const amount = isDebitDirection.value
    ? moneyNumber(subMoney(entry.debit, entry.credit))
    : moneyNumber(subMoney(entry.credit, entry.debit));

  if (subjectCode) columnAmounts[subjectCode] = amount;

  return {
    rowId: entry.rowId,
    rowType: 'detail',
    voucherId: entry.voucherId,
    date: entry.date,
    voucherNo: entry.voucherNo,
    summary: entry.summary,
    debit: Number(entry.debit || 0),
    credit: Number(entry.credit || 0),
    direction: Math.abs(balance) < 0.005 ? '平' : isDebitDirection.value ? '借' : '贷',
    balance,
    columnAmounts,
  };
}

const autoQueryReady = ref(false);
let autoQueryTimer: ReturnType<typeof window.setTimeout> | undefined;

function buildSummaryRow(params: {
  rowId: string;
  rowType: Exclude<RowType, 'detail'>;
  date: string;
  summary: string;
  debit: number;
  credit: number;
  balance: number;
  columnAmounts: Record<string, number>;
}): LedgerRow {
  return {
    rowId: params.rowId,
    rowType: params.rowType,
    date: params.date,
    voucherNo: '',
    summary: params.summary,
    debit: params.debit,
    credit: params.credit,
    direction: Math.abs(params.balance) < 0.005 ? '平' : isDebitDirection.value ? '借' : '贷',
    balance: params.balance,
    columnAmounts: { ...params.columnAmounts },
  };
}

function buildRows(source: MultiColumnVoucherEntry[]) {
  const result: LedgerRow[] = [];
  const monthGroups = new Map<string, MultiColumnVoucherEntry[]>();

  source.forEach((entry) => {
    const month = monthOf(entry.date);
    if (!month) return;
    const group = monthGroups.get(month) || [];
    group.push(entry);
    monthGroups.set(month, group);
  });

  let runningBalance = 0;
  let yearDebit = 0;
  let yearCredit = 0;
  const yearColumns = createZeroAmounts();

  [...monthGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, group]) => {
      let monthDebit = 0;
      let monthCredit = 0;
      const monthColumns = createZeroAmounts();

      group.forEach((entry) => {
        monthDebit = moneyNumber(addMoney([monthDebit, entry.debit]));
        monthCredit = moneyNumber(addMoney([monthCredit, entry.credit]));
        runningBalance = isDebitDirection.value
          ? moneyNumber(addMoney([runningBalance, subMoney(entry.debit, entry.credit, 'round', 6)]))
          : moneyNumber(addMoney([runningBalance, subMoney(entry.credit, entry.debit, 'round', 6)]));

        const detailRow = buildDetailRow(entry, runningBalance);
        addColumnAmounts(monthColumns, detailRow.columnAmounts);
        addColumnAmounts(yearColumns, detailRow.columnAmounts);
        result.push(detailRow);
      });

      yearDebit = moneyNumber(addMoney([yearDebit, monthDebit]));
      yearCredit = moneyNumber(addMoney([yearCredit, monthCredit]));

      const date = getMonthEndDate(month);
      result.push(
        buildSummaryRow({
          rowId: `${month}-period-total`,
          rowType: 'periodTotal',
          date,
          summary: '本期合计',
          debit: monthDebit,
          credit: monthCredit,
          balance: runningBalance,
          columnAmounts: monthColumns,
        }),
      );
      result.push(
        buildSummaryRow({
          rowId: `${month}-year-total`,
          rowType: 'yearTotal',
          date,
          summary: '本年累计',
          debit: yearDebit,
          credit: yearCredit,
          balance: runningBalance,
          columnAmounts: yearColumns,
        }),
      );
      result.push(
        buildSummaryRow({
          rowId: `${month}-ending-balance`,
          rowType: 'endingBalance',
          date,
          summary: '期末余额',
          debit: 0,
          credit: 0,
          balance: runningBalance,
          columnAmounts: createZeroAmounts(),
        }),
      );
    });

  return result;
}

async function handleQuery() {
  await loadData();
}

function scheduleAutoQuery() {
  if (!autoQueryReady.value) return;
  if (autoQueryTimer) window.clearTimeout(autoQueryTimer);
  autoQueryTimer = window.setTimeout(() => {
    handleQuery();
  }, 120);
}

function resetQuery() {
  periodRange.value = [getCurrentMonth(), getCurrentMonth()];
  selectedSubjectCode.value = '5602';
  currentPage.value = 1;
}


function handlePageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

function rowClassName({ row }: { row: LedgerRow }) {
  if (row.rowType === 'detail') return '';
  return `ledger-${row.rowType}`;
}

function openVoucher(row: LedgerRow) {
  if (!row.voucherId) return;
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

async function loadSubjects() {
  subjectLoading.value = true;
  try {
    subjects.value = await fetchMultiColumnSubjects();
    if (!subjects.value.some((item) => item.subject_number === selectedSubjectCode.value)) {
      selectedSubjectCode.value = String(subjects.value[0]?.subject_number || '');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('加载会计科目失败');
  } finally {
    subjectLoading.value = false;
  }
}

async function loadData() {
  const [startMonth, endMonth] = normalizedPeriodRange.value;
  const start = monthStartISO(startMonth);
  const end = monthEndISO(endMonth);
  const subjectCode = String(selectedSubjectCode.value || '').trim();

  if (!start || !end) {
    ElMessage.warning('请选择有效会计期间');
    return;
  }
  if (!subjectCode) {
    ElMessage.warning('请选择会计科目');
    return;
  }

  loading.value = true;
  try {
    entries.value = await fetchMultiColumnVoucherEntries({
      startISO: start,
      endISO: end,
      subjectCode,
    });
    currentPage.value = 1;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载多栏账失败');
  } finally {
    loading.value = false;
  }
}

function exportCsv() {
  if (tableRows.value.length === 0) {
    ElMessage.warning('当前没有可导出的多栏账数据');
    return;
  }

  const dynamicHeaders = dynamicSubjects.value.map((subject) =>
    `${subject.subject_number || ''} ${subject.subject_name || ''}`.trim(),
  );
  const header = ['日期', '凭证字号', '摘要', '借方', '贷方', '方向', ...dynamicHeaders];
  const body = tableRows.value.map((row) => [
    row.date,
    row.voucherNo,
    row.summary,
    String(row.debit || 0),
    String(row.credit || 0),
    row.direction,
    ...dynamicSubjects.value.map((subject) => {
      const code = String(subject.subject_number || '').trim();
      const value = row.columnAmounts[code] || 0;
      return String(value || 0);
    }),
  ]);

  const csv = '\ufeff' + [header, ...body].map((line) => line.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `多栏账_${selectedSubjectLabel.value}_${periodText.value}_${accountSetName.value}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildPrintHtml() {
  const dynamicHeaders = dynamicSubjects.value
    .map((subject) => `<th>${subject.subject_name || subject.subject_number || ''}</th>`)
    .join('');
  const tableBody = tableRows.value
    .map((row) => {
      const dynamicCells = dynamicSubjects.value
        .map((subject) => {
          const code = String(subject.subject_number || '').trim();
          return `<td class="money">${toMoney(row.columnAmounts[code])}</td>`;
        })
        .join('');
      return `<tr class="${row.rowType === 'detail' ? '' : 'summary'}">
        <td>${row.date}</td>
        <td>${row.voucherNo}</td>
        <td>${row.summary}</td>
        <td class="money">${toMoney(row.debit)}</td>
        <td class="money">${toMoney(row.credit)}</td>
        <td>${row.direction}</td>
        ${dynamicCells}
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>多栏账</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial, "Microsoft YaHei", sans-serif; color: #111; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 8px; }
  .meta { display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { border:1px solid #333; padding:6px; }
  th { background:#f5f5f5; }
  .money { text-align:right; font-variant-numeric: tabular-nums; }
  .summary { font-weight:600; background:#f8f8f8; }
</style>
</head>
<body>
  <h1>${selectedSubjectLabel.value} 多栏账</h1>
  <div class="meta"><span>编制单位：${accountSetName.value}</span><span>期间：${periodText.value}</span><span>打印时间：${new Date().toLocaleString()}</span></div>
  <table>
    <thead><tr><th>日期</th><th>凭证字号</th><th>摘要</th><th>借方</th><th>贷方</th><th>方向</th>${dynamicHeaders}</tr></thead>
    <tbody>${tableBody}</tbody>
  </table>
</body>
</html>`;
}

async function printCurrent() {
  if (tableRows.value.length === 0) {
    ElMessage.warning('当前没有可打印的多栏账数据');
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
watch([selectedSubjectCode, periodRange], () => {
  currentPage.value = 1;
  scheduleAutoQuery();
}, { deep: true });

watch(tableRows, () => {
  const maxPage = Math.max(1, Math.ceil(tableRows.value.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

onMounted(async () => {
  await loadSubjects();
  await loadData();
  autoQueryReady.value = true;
});
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="multi-column-ledger-page flex h-full min-h-0 flex-col">
      <div class="table-card min-h-0 flex-1 rounded-md border border-border bg-card shadow-sm">
        <div class="top-bar">
          <div class="top-left-actions">
            <div class="toolbar-filter toolbar-filter--period">
              <span class="toolbar-filter__label">查询期间</span>
              <ElDatePicker
                v-model="periodRange"
                type="monthrange"
                range-separator="至"
                start-placeholder="开始月份"
                end-placeholder="结束月份"
                value-format="YYYY-MM"
                class="period-picker"
                @change="handleQuery"
              />
            </div>
            <ElSelect
              v-model="selectedSubjectCode"
              :loading="subjectLoading"
              filterable
              remote
              reserve-keyword
              :remote-method="(value: string) => (subjectKeyword = value)"
              placeholder="请选择科目"
              class="subject-select"
              @change="handleQuery"
            >
              <ElOption
                v-for="item in subjectOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElButton type="primary" :loading="loading" @click="handleQuery">查询</ElButton>
            <ElButton @click="resetQuery">重置</ElButton>
          </div>

          <div class="toolbar-actions">
            <ElButton :loading="printLoading" @click="printCurrent">打印</ElButton>
            <ElButton @click="exportCsv">导出</ElButton>
            <ElButton :loading="loading" @click="handleQuery">刷新</ElButton>
          </div>
        </div>

        <div ref="tableWheelRef" class="ledger-table-wrap">
          <ElTable
            v-loading="loading"
            :data="pagedRows"
            :row-class-name="rowClassName"
            border
            height="100%"
            row-key="rowId"
            class="ledger-table w-full"
          >
          <ElTableColumn prop="date" label="日期" width="110" fixed />
          <ElTableColumn label="凭证字号" width="120" fixed>
            <template #default="scope">
              <ElLink
                v-if="scope.row.voucherId"
                type="primary"
                :underline="false"
                @click="openVoucher(scope.row)"
              >
                {{ scope.row.voucherNo || '—' }}
              </ElLink>
              <span v-else>{{ scope.row.voucherNo }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="summary" label="摘要" min-width="280" show-overflow-tooltip />
          <ElTableColumn label="借方" width="150" align="right">
            <template #default="scope">{{ toMoney(scope.row.debit) }}</template>
          </ElTableColumn>
          <ElTableColumn label="贷方" width="150" align="right">
            <template #default="scope">{{ toMoney(scope.row.credit) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="direction" label="方向" width="80" align="center" />
          <ElTableColumn :label="isDebitDirection ? '借方' : '贷方'" align="center">
            <ElTableColumn
              v-for="subject in dynamicSubjects"
              :key="String(subject.subject_number)"
              :label="String(subject.subject_name || subject.subject_number || '')"
              min-width="140"
              align="right"
            >
              <template #default="scope">
                {{ toMoney(scope.row.columnAmounts[String(subject.subject_number || '')]) }}
              </template>
            </ElTableColumn>
          </ElTableColumn>
          </ElTable>
        </div>

        <div class="pagination-row">
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="pageSizeOptions"
            :total="tableRows.length"
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
.multi-column-ledger-page {
  min-width: 0;
}

.table-card {
  position: relative;
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 2px;
}

.top-bar {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-page);
}

.top-left-actions {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toolbar-actions :deep(.el-button) {
  height: 28px;
  min-width: 86px;
  padding: 0 18px;
  border-radius: 2px;
  background: var(--el-bg-color);
}

.toolbar-filter {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.toolbar-filter__label {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.period-picker {
  width: 260px;
  flex: 0 0 auto;
}
.subject-select {
  width: 260px;
  flex: 0 0 auto;
}

.ledger-table-wrap {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.ledger-table-wrap :deep(.el-scrollbar__wrap),
.ledger-table-wrap :deep(.el-table__body-wrapper) {
  overscroll-behavior: contain;
}

.ledger-table {
  height: 100%;
}

.ledger-table :deep(.el-table__header th.el-table__cell) {
  background: var(--el-color-primary-light-9);
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.ledger-table :deep(.el-table__body-wrapper) {
  background: var(--el-bg-color);
}

.ledger-table :deep(.ledger-periodTotal),
.ledger-table :deep(.ledger-yearTotal),
.ledger-table :deep(.ledger-endingBalance) {
  background: var(--el-color-primary-light-9);
  font-weight: 600;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  height: 42px;
  padding: 6px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.table-card :deep(.el-table__cell) {
  padding: 7px 0;
}

.table-card :deep(.el-input__wrapper),
.table-card :deep(.el-select__wrapper) {
  min-height: 30px;
  border-radius: 2px;
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
