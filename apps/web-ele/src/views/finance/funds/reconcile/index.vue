<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';


import {
  fetchFundsReconcile,
  type ReconcileGroup,
  type ReconcileLine,
  type ReconcileResult,
} from '#/api/erp/finance/funds/reconcile';

import { fetchFundsAccountList, type FundsAccount, type FundsAccountKind } from '#/api/erp/finance/funds/settings';
import { buildReconcilePrintHtml } from '#/views/finance/print-templates/reconcile';

import {
  ElButton,
  ElDatePicker,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

defineOptions({ name: 'FinanceFundsReconcile' });

const loading = ref(false);
const printLoading = ref(false);
const printFrameRef = ref<HTMLIFrameElement>();

const query = reactive({
  month: '',
  fundsKind: '全部' as FundsAccountKind | '全部',
  fundsAccountRowid: '',
});

const fundsAccounts = ref<FundsAccount[]>([]);
const result = ref<ReconcileResult | null>(null);

// 分组展开状态
const expanded = ref<Record<string, boolean>>({});

function groupKey(g: ReconcileGroup) {
  return String(g.subjectCode || g.projectName || '');
}

function ensureExpanded() {
  const next: Record<string, boolean> = { ...expanded.value };
  for (const g of result.value?.groups || []) {
    const k = groupKey(g);
    if (k && next[k] === undefined) next[k] = true;
  }
  expanded.value = next;
}

function toggleGroup(g: ReconcileGroup) {
  const k = groupKey(g);
  if (!k) return;
  expanded.value[k] = !expanded.value[k];
}

function isExpanded(g: ReconcileGroup) {
  const k = groupKey(g);
  return k ? expanded.value[k] !== false : true;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function initMonth() {
  const now = new Date();
  query.month = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}


function fmtMoney(v: any) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '0.00';
  if (Object.is(n, -0) || n === 0) return '0.00';
  const text = n.toFixed(2);
  return text === '-0.00' ? '0.00' : text;
}

const groups = computed<ReconcileGroup[]>(() => result.value?.groups || []);

const visibleGroups = computed<ReconcileGroup[]>(() => groups.value);

const accountOptions = computed(() => {
  const kind = query.fundsKind;
  const list = (fundsAccounts.value || []).filter((a: any) => {
    if (kind === '全部') return true;
    return String(a.account_kind || '').trim() === kind;
  });
  return list;
});

const printTitle = computed(() => '核对总账打印模板');

const printPeriod = computed(() => (query.month ? query.month + ' 月' : '全部期间'));

const printAccountLabel = computed(() => accountLabel.value || '所有');

const displayTotals = computed(() => {
  const total = {
    subject: { opening: 0, debit: 0, credit: 0, ending: 0 },
    funds: { opening: 0, debit: 0, credit: 0, ending: 0 },
    diff: { opening: 0, debit: 0, credit: 0, ending: 0 },
  };
  const list = groups.value;

  for (const g of list) {
    const subject = pickLine(g, 'subject')?.amount;
    const funds = pickLine(g, 'funds')?.amount;
    const diff = pickLine(g, 'diff')?.amount;
    for (const key of ['opening', 'debit', 'credit', 'ending'] as const) {
      total.subject[key] += Number(subject?.[key] || 0);
      total.funds[key] += Number(funds?.[key] || 0);
      total.diff[key] += Number(diff?.[key] || 0);
    }
  }

  return total;
});

const accountLabel = computed(() => {
  if (!query.fundsAccountRowid) return '所有';
  const hit = (fundsAccounts.value || []).find(
    (a: any) => String(a.rowid || a.id || '').trim() === String(query.fundsAccountRowid).trim(),
  ) as any;
  return hit?.account_name || '所有';
});

async function loadAccounts() {
  const kinds: FundsAccountKind[] =
    query.fundsKind === '全部' ? (['现金', '银行存款', '其他货币资金'] as any) : ([query.fundsKind] as any);
  const res = await Promise.all(kinds.map((k) => fetchFundsAccountList({ kind: k, enableStatus: '' as any })));
  fundsAccounts.value = ([] as FundsAccount[]).concat(...res);
}

async function reload() {
  if (!query.month) return;
  loading.value = true;
  try {
    await loadAccounts();

    if (query.fundsAccountRowid) {
      const exists = accountOptions.value.some(
        (a: any) => String(a.rowid || a.id || '') === query.fundsAccountRowid,
      );
      if (!exists) query.fundsAccountRowid = '';
    }

    result.value = await fetchFundsReconcile({
      month: query.month,
      fundsKind: query.fundsKind,
      fundsAccountRowid: query.fundsAccountRowid || undefined,
      showZero: false,
    });

    ensureExpanded();
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '加载对账数据失败');
  } finally {
    loading.value = false;
  }
}

function pickLine(g: ReconcileGroup, type: ReconcileLine['type']) {
  return (g.lines || []).find((x) => x.type === type) as ReconcileLine | undefined;
}

function fundsName(g: ReconcileGroup) {
  const line = pickLine(g, 'funds') as any;
  const accounts = (line?.meta?.accounts || []) as any[];
  if (accounts.length === 1) return String(accounts[0]?.name || '');
  if (accounts.length > 1) return `资金账户（${accounts.length}）`;
  return '';
}

function fundsCurrency(g: ReconcileGroup) {
  return g.currency || '人民币';
}

function onPrint() {
  if (!result.value) {
    ElMessage.warning('当前没有可打印的数据');
    return;
  }
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }
  const html = buildReconcilePrintHtml({
    title: '核对总账',
    accountName: printAccountLabel.value,
    period: printPeriod.value,
    printedAt: new Date().toLocaleString('zh-CN'),
    totals: displayTotals.value,
    groups: visibleGroups.value.map((g: any) => ({
      projectName: g.projectName,
      subjectCode: g.subjectCode,
      currency: g.currency,
      balanced: g.balanced,
      lines: [
        { type: 'subject', name: g.projectName, currency: g.currency, amount: (g.lines || []).find((x: any) => x.type === 'subject')?.amount },
        { type: 'funds', name: fundsName(g), currency: g.currency, amount: (g.lines || []).find((x: any) => x.type === 'funds')?.amount },
        { type: 'diff', name: '', currency: g.currency, amount: (g.lines || []).find((x: any) => x.type === 'diff')?.amount },
      ],
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

function onExportJson() {
  try {
    const data = result.value
      ? { ...result.value, groups: visibleGroups.value, totals: displayTotals.value }
      : { month: query.month, groups: [], totals: null };
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funds-reconcile-${query.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    ElMessage.error('导出失败');
  }
}

watch(
  () => query.fundsKind,
  () => {
    query.fundsAccountRowid = '';
  },
);

onMounted(async () => {
  initMonth();
  await reload();
});
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="reconcile-page flex h-full flex-col gap-3">
      <div class="print-header">
        <div class="print-title">{{ printTitle }}</div>
        <div class="print-meta">
          <span>期间：{{ printPeriod }}</span>
          <span>账户：{{ printAccountLabel }}</span>
          <span>打印时间：{{ new Date().toLocaleString('zh-CN') }}</span>
        </div>
      </div>
      <div class="reconcile-print-wrap min-h-0 flex-1 rounded-md border bg-white">
        <div class="screen-toolbar">
          <div class="table-toolbar__filters">
          <div class="filter-item">
            <span class="filter-label">查询月份</span>
            <ElDatePicker
              v-model="query.month"
              type="month"
              value-format="YYYY-MM"
              class="toolbar-date"
            />
          </div>

          <div class="filter-item">
            <span class="filter-label">资金类型</span>
            <ElSelect v-model="query.fundsKind" class="toolbar-kind">
              <ElOption label="全部" value="全部" />
              <ElOption label="现金" value="现金" />
              <ElOption label="银行存款" value="银行存款" />
              <ElOption label="其他货币资金" value="其他货币资金" />
            </ElSelect>
          </div>

          <div class="filter-item">
            <span class="filter-label">资金账户</span>
            <ElSelect
              v-model="query.fundsAccountRowid"
              filterable
              clearable
              class="toolbar-account"
              placeholder="所有"
            >
              <ElOption
                v-for="a in accountOptions"
                :key="String((a as any).rowid || (a as any).id)"
                :label="`${(a as any).account_name || ''}${(a as any).account_code ? '（' + (a as any).account_code + '）' : ''}`"
                :value="String((a as any).rowid || (a as any).id)"
              />
            </ElSelect>
          </div>
        </div>

          <div class="table-toolbar__actions">
          <ElButton type="primary" :loading="loading" @click="reload">查询</ElButton>
          <ElButton :loading="printLoading" @click="onPrint">打印</ElButton>
          <ElButton type="primary" @click="onExportJson">导出</ElButton>
        </div>
        </div>

        <div class="reconcile-table-scroll">
          <table class="reconcile-table">
          <thead>
            <tr>
              <th class="col-item">项目</th>
              <th class="col-name">名称</th>
              <th class="col-currency">币别</th>
              <th class="col-num">期初余额</th>
              <th class="col-num">借方(收入)</th>
              <th class="col-num">贷方(支出)</th>
              <th class="col-num">余额</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="result" class="sum-title">
              <td colspan="7">合计 <span class="sum-month">月分：{{ result.month }}</span></td>
            </tr>
            <template v-if="result">
              <tr class="sum-row">
                <td>会计科目</td>
                <td></td>
                <td></td>
                <td class="num">{{ fmtMoney(displayTotals.subject.opening) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.subject.debit) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.subject.credit) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.subject.ending) }}</td>
              </tr>
              <tr class="sum-row">
                <td>资金账户</td>
                <td></td>
                <td></td>
                <td class="num">{{ fmtMoney(displayTotals.funds.opening) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.funds.debit) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.funds.credit) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.funds.ending) }}</td>
              </tr>
              <tr class="sum-row diff-row">
                <td>差异</td>
                <td></td>
                <td></td>
                <td class="num">{{ fmtMoney(displayTotals.diff.opening) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.diff.debit) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.diff.credit) }}</td>
                <td class="num">{{ fmtMoney(displayTotals.diff.ending) }}</td>
              </tr>
            </template>

            <tr v-if="visibleGroups.length === 0" class="empty-row">
              <td colspan="7">暂无数据</td>
            </tr>

            <template v-for="g in visibleGroups" :key="groupKey(g)">
              <tr class="group-header" @click="toggleGroup(g)">
                <td colspan="7">
                  <div class="group-header-inner" :class="!g.balanced ? 'unbalanced' : ''">
                    <div class="group-left">
                      <span class="arrow">{{ isExpanded(g) ? '▼' : '▶' }}</span>
                      <span class="group-title">{{ g.projectName }}</span>
                      <span v-if="g.subjectCode" class="group-code">({{ g.subjectCode }})</span>
                    </div>
                    <div class="group-right">币别：{{ g.currency || '人民币' }}</div>
                    <div v-if="!g.balanced" class="stamp">不平</div>
                  </div>
                </td>
              </tr>

              <tr v-show="isExpanded(g)">
                <td>会计科目</td>
                <td>{{ g.projectName }}</td>
                <td>{{ fundsCurrency(g) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'subject')?.amount.opening) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'subject')?.amount.debit) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'subject')?.amount.credit) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'subject')?.amount.ending) }}</td>
              </tr>

              <tr v-show="isExpanded(g)">
                <td>资金账户</td>
                <td>{{ fundsName(g) }}</td>
                <td>{{ fundsCurrency(g) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'funds')?.amount.opening) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'funds')?.amount.debit) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'funds')?.amount.credit) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'funds')?.amount.ending) }}</td>
              </tr>

              <tr v-show="isExpanded(g)" class="diff-row">
                <td>差异</td>
                <td></td>
                <td></td>
                <td class="num">{{ fmtMoney(pickLine(g, 'diff')?.amount.opening) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'diff')?.amount.debit) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'diff')?.amount.credit) }}</td>
                <td class="num">{{ fmtMoney(pickLine(g, 'diff')?.amount.ending) }}</td>
              </tr>
            </template>
          </tbody>
          </table>
        </div>
      </div>
    </div>
      <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.reconcile-print-wrap {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.screen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  flex-wrap: nowrap;
  overflow-x: auto;
}

.table-toolbar__filters {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.filter-item {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.filter-item :deep(.el-input),
.filter-item :deep(.el-select),
.filter-item :deep(.el-date-editor) {
  flex: 1;
  min-width: 0;
}


.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}


.toolbar-date {
  width: 150px;
}

.toolbar-kind {
  width: 160px;
}

.toolbar-account {
  width: 260px;
}


.table-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.reconcile-table-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.reconcile-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
  table-layout: fixed;
}

.reconcile-table th,
.reconcile-table td {
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  font-size: 13px;
}

.reconcile-table thead th {
  background: hsl(var(--primary) / 0.08);
  font-weight: 700;
  text-align: left;
}

.col-item {
  width: 170px;
}

.col-name {
  width: 190px;
}

.col-currency {
  width: 120px;
}

.col-num {
  width: 160px;
  text-align: right;
}

.num {
  text-align: right;
}

.sum-title td {
  background: #fafafa;
  font-weight: 700;
}

.sum-month {
  float: right;
  font-weight: 400;
  color: #6b7280;
}

.sum-row td {
  background: #fff;
}

.group-header td {
  background: #fff;
  cursor: pointer;
}

.group-header-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}

.group-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow {
  display: inline-block;
  width: 18px;
  color: #374151;
}

.group-title {
  font-weight: 700;
}

.group-code {
  color: #6b7280;
  font-size: 12px;
}

.group-right {
  color: #6b7280;
  font-size: 12px;
}

/* 差异行：蓝色数字 */
.diff-row td.num {
  color: hsl(var(--primary));
}

/* 不平：更显眼的红色章 */
.stamp {
  position: absolute;
  left: 52%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-10deg);
  color: var(--el-color-danger);
  border: 3px solid var(--el-color-danger);
  padding: 6px 18px;
  font-size: 22px;
  font-weight: 900;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
  pointer-events: none;
}

.group-header-inner.unbalanced {
  background: linear-gradient(90deg, var(--el-color-danger-light-9), transparent);
}

.empty-row td {
  text-align: center;
  color: #6b7280;
  padding: 24px;
}

.print-header {
  display: none;
  text-align: center;
}

.print-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.5;
}

.print-meta {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #4b5563;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  .reconcile-page {
    display: block !important;
    background: #fff;
    color: #000;
  }

  .print-header {
    display: block;
    margin-bottom: 10px;
  }

  .screen-toolbar {
    display: none !important;
  }

  .reconcile-print-wrap {
    display: block !important;
    overflow: visible !important;
    min-height: auto !important;
    flex: none !important;
    border: 1px solid #d1d5db;
    border-radius: 0;
  }

  .reconcile-table-scroll {
    overflow: visible !important;
  }

  .reconcile-table th,
  .reconcile-table td {
    border-color: #d1d5db;
    padding: 6px 8px;
    font-size: 12px;
    color: #000;
    background: #fff !important;
  }

  .reconcile-table thead th,
  .sum-title td {
    background: #f5f5f5 !important;
  }

  .stamp {
    background: rgba(255, 255, 255, 0.35);
  }
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
