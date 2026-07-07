<script lang="ts" setup>
import type { PeriodCloseLine, PeriodClosePreviewResult } from '#/api/erp/finance/period';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElIcon,
  ElMessage,
  ElStep,
  ElSteps,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import { ArrowLeft, Check, Finished, Refresh } from '@element-plus/icons-vue';

import {
  createPeriodCloseVoucherByPreview,
  getPeriodClosePreview,
} from '#/api/erp/finance/period';
import { savePeriodStatus } from '#/api/erp/finance/period-status';

defineOptions({ name: 'FinancePeriodProfitLossCarry' });

const route = useRoute();
const router = useRouter();

const form = reactive({
  accountSetId: String(route.query.accountSetId || ''),
  companyName: String(route.query.companyName || ''),
  endDate: String(route.query.endDate || ''),
  period: String(route.query.period || ''),
});

const loading = ref(false);
const submitting = ref(false);
const preview = ref<PeriodClosePreviewResult | null>(null);
const createdVoucherText = ref('');

const currentStep = computed(() => {
  if (createdVoucherText.value) return preview.value?.yearEndTransferRequired ? 4 : 3;
  if (preview.value?.yearEndTransferRequired) return preview.value?.existingVoucher ? 2 : 1;
  return preview.value?.existingVoucher ? 2 : 1;
});

const auditRows = computed(() => {
  const rows: Array<{
    accountCode: string;
    accountName: string;
    category: string;
    creditAmount: number;
    debitAmount: number;
  }> = [];
  let currentYearProfitDebit = 0;
  let currentYearProfitCredit = 0;

  const appendRows = (items: PeriodCloseLine[] = [], category: '收入' | '费用') => {
    for (const item of items) {
      const sourceAmount = Number(Number(item.amount || 0).toFixed(2));
      if (Math.abs(sourceAmount) <= 0.004) continue;

      let debitAmount = 0;
      let creditAmount = 0;
      if (category === '收入') {
        debitAmount = sourceAmount;
        currentYearProfitCredit += debitAmount;
      } else {
        creditAmount = sourceAmount;
        currentYearProfitDebit += creditAmount;
      }

      rows.push({
        category,
        accountCode: item.accountCode,
        accountName: item.accountName,
        debitAmount,
        creditAmount,
      });
    }
  };

  appendRows(preview.value?.incomeLines, '收入');
  appendRows(preview.value?.expenseLines, '费用');

  const profitDebit = Number(currentYearProfitDebit.toFixed(2));
  const profitCredit = Number(currentYearProfitCredit.toFixed(2));
  const profitNet = Number((profitDebit - profitCredit).toFixed(2));
  if (Math.abs(profitNet) > 0.004 && preview.value?.currentYearProfitSubject) {
    rows.unshift({
      category: '本年利润',
      accountCode: preview.value.currentYearProfitSubject.code,
      accountName: preview.value.currentYearProfitSubject.name,
      debitAmount: profitNet < 0 ? Math.abs(profitNet) : 0,
      creditAmount: profitNet > 0 ? profitNet : 0,
    });
  }

  return rows;
});

function formatMoney(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function resolvePeriodEndDate(period: string) {
  const [yearText, monthText] = String(period || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) return '';
  const end = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

function getPeriodParts(period: string) {
  const [yearText, monthText] = String(period || '').split('-');
  return {
    fiscalYear: Number(yearText || 0),
    periodMonth: Number(monthText || 0),
  };
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function backToPeriodList(extraQuery: Record<string, string> = {}) {
  router.replace({
    path: '/finance/period',
    query: extraQuery,
  });
}

function backToCheck() {
  router.replace({
    name: 'FinancePeriodCloseCheck',
    query: {
      accountSetId: form.accountSetId,
      companyName: form.companyName,
      endDate: form.endDate || resolvePeriodEndDate(form.period),
      period: form.period,
    },
  });
}

function buildExistingVoucherText() {
  const text = String(preview.value?.existingVoucher?.voucher_code || '').trim();
  if (text) return text;
  const incomeCount = preview.value?.incomeLines?.length ?? 0;
  const expenseCount = preview.value?.expenseLines?.length ?? 0;
  if (incomeCount === 0 && expenseCount === 0) return '本期无损益数据，执行时不会生成结转损益凭证';
  return '无，执行时自动生成结转损益凭证';
}

function buildYearEndExistingVoucherText() {
  const text = String(preview.value?.yearEndExistingVoucher?.voucher_code || '').trim();
  if (text) return text;
  if (!preview.value?.yearEndTransferRequired) return '当前期间无需生成结转利润凭证';
  return '无，执行时自动生成结转利润凭证';
}

async function loadPreview() {
  if (!form.period) {
    ElMessage.warning('缺少期间参数');
    return;
  }
  loading.value = true;
  try {
    preview.value = await getPeriodClosePreview({
      accountSetId: form.accountSetId,
      companyName: form.companyName,
      period: form.period,
      voucherDate: form.endDate || resolvePeriodEndDate(form.period),
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载结转损益预览失败');
  } finally {
    loading.value = false;
  }
}

async function handleGenerateAndClose() {
  if (!preview.value) return;
  if (preview.value.existingVoucher && !preview.value.existingVoucherReusable) {
    ElMessage.error(preview.value.existingVoucherReuseMessage || '检测到结转损益凭证已变化，请先删除原结转损益凭证');
    return;
  }
  if (preview.value.yearEndExistingVoucher && !preview.value.yearEndExistingVoucherReusable) {
    ElMessage.error(preview.value.yearEndExistingVoucherReuseMessage || '检测到结转利润凭证已变化，请先删除原结转利润凭证');
    return;
  }

  submitting.value = true;
  try {
    const closeResult = await createPeriodCloseVoucherByPreview(preview.value, {
      accountSetId: form.accountSetId,
      companyName: form.companyName,
      period: form.period,
      voucherDate: form.endDate || resolvePeriodEndDate(form.period),
    });

    const nowText = formatDateTime(new Date());
    const { fiscalYear, periodMonth } = getPeriodParts(form.period);
    const carryForwardVoucherId = String(closeResult?.carryForwardVoucherId || closeResult?.voucherId || '');
    const carryForwardVoucherCode = String(closeResult?.carryForwardVoucherCode || closeResult?.voucherCode || '');
    const yearEndVoucherId = String(closeResult?.yearEndVoucherId || '');
    const yearEndVoucherCode = String(closeResult?.yearEndVoucherCode || '');
    const voucherText = [carryForwardVoucherCode, yearEndVoucherCode].filter(Boolean).join('、');

    await savePeriodStatus({
      account_set_id: form.accountSetId,
      company_name: form.companyName,
      fiscal_year: fiscalYear,
      period_month: periodMonth,
      period_code: form.period,
      carry_forward_status: 1,
      close_status: 1,
      carry_forward_voucher_id: carryForwardVoucherId,
      carry_forward_voucher_code: carryForwardVoucherCode,
      carry_forward_at: nowText,
      carry_forward_by: '当前用户',
      close_voucher_id: yearEndVoucherId || carryForwardVoucherId,
      close_at: nowText,
      close_by: '当前用户',
      remark: voucherText
        ? preview.value.yearEndTransferRequired
          ? `期间 ${form.period} 已完成结转损益、年终结转并结账`
          : `期间 ${form.period} 已完成结转损益并结账`
        : `期间 ${form.period} 本期无损益数据，已直接完成结账`,
      start_date: preview.value.startDate,
      end_date: preview.value.endDate,
    });

    createdVoucherText.value = voucherText;
    ElMessage.success(voucherText ? `结转完成：${voucherText}` : '本期无损益数据，已直接完成结账');
    backToPeriodList({ periodClosed: '1', period: form.period });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '执行结转损益失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(loadPreview);
</script>

<template>
  <Page auto-content-height>
    <div v-loading="loading" class="profit-loss-carry-page">
      <div class="page-head">
        <ElButton text @click="backToCheck">
          <ElIcon><ArrowLeft /></ElIcon>
          返回期末检查
        </ElButton>
        <div class="title-block">
          <h1>结转损益</h1>
          <p>生成结转凭证，完成后返回期间列表。</p>
        </div>
        <ElButton :icon="Refresh" :loading="loading" plain @click="loadPreview">刷新</ElButton>
      </div>

      <section class="steps-card">
        <ElSteps :active="currentStep" finish-status="success" align-center>
          <ElStep title="检查" />
          <ElStep title="结转损益" />
          <ElStep v-if="preview?.yearEndTransferRequired" title="结转利润" />
          <ElStep title="结账" />
        </ElSteps>
      </section>
      <div class="summary-grid">
        <section class="summary-card">
          <div class="summary-label">本期收入合计</div>
          <div class="summary-value">{{ formatMoney(preview?.totalIncome) }}</div>
        </section>
        <section class="summary-card">
          <div class="summary-label">本期费用合计</div>
          <div class="summary-value">{{ formatMoney(preview?.totalExpense) }}</div>
        </section>
        <section class="summary-card">
          <div class="summary-label">本期利润</div>
          <div class="summary-value">{{ formatMoney(preview?.profitAmount) }}</div>
        </section>
        <section class="summary-card">
          <div class="summary-label">结转利润</div>
          <div class="summary-value">{{ formatMoney(preview?.yearEndTransferAmount) }}</div>
        </section>
      </div>

      <section class="table-card">
        <div class="panel-title">
          <span>损益结转分录预览</span>
          <ElTag v-if="preview?.existingVoucher" :type="preview?.existingVoucherReusable ? 'success' : 'danger'">
            {{ buildExistingVoucherText() }}
          </ElTag>
        </div>
        <ElTable class="profit-loss-table" :data="auditRows" border height="100%">
          <ElTableColumn prop="category" label="类别" width="90" />
          <ElTableColumn prop="accountCode" label="科目编码" width="130" />
          <ElTableColumn prop="accountName" label="科目名称" min-width="180" />
          <ElTableColumn label="借方" width="150" align="right">
            <template #default="{ row }">{{ Math.abs(Number(row.debitAmount || 0)) > 0.004 ? formatMoney(row.debitAmount) : '' }}</template>
          </ElTableColumn>
          <ElTableColumn label="贷方" width="150" align="right">
            <template #default="{ row }">{{ Math.abs(Number(row.creditAmount || 0)) > 0.004 ? formatMoney(row.creditAmount) : '' }}</template>
          </ElTableColumn>
        </ElTable>
      </section>
      <div class="footer-actions">
        <ElButton size="large" @click="backToCheck">
          <ElIcon><ArrowLeft /></ElIcon>
          上一步：期末检查
        </ElButton>
        <ElButton size="large" type="primary" :icon="Finished" :loading="submitting" @click="handleGenerateAndClose">
          生成结转凭证并结账
        </ElButton>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.profit-loss-carry-page {
  --period-primary: var(--el-color-primary);
  --period-primary-dark: var(--el-color-primary-dark-2);
  --period-primary-light: var(--el-color-primary-light-9);
  --period-border: var(--el-color-primary-light-7);
  --period-border-strong: var(--el-color-primary-light-5);
  --period-text: var(--el-text-color-primary);
  --period-sub: var(--el-text-color-secondary);
  box-sizing: border-box;
  display: flex;
  height: calc(100vh - 104px);
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 0 20px 16px;
  color: var(--period-text);
  background:
    radial-gradient(circle at 88% 0, color-mix(in srgb, var(--period-primary) 7%, transparent) 0, color-mix(in srgb, var(--period-primary) 2%, transparent) 22%, transparent 36%),
    linear-gradient(180deg, var(--el-bg-color) 0%, var(--el-bg-color-page) 100%);
}

.page-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  margin: 0 -20px 0;
  padding: 0 28px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: linear-gradient(180deg, var(--el-bg-color) 0%, color-mix(in srgb, var(--period-primary) 3%, var(--el-bg-color)) 100%);
  box-shadow: 0 4px 14px rgb(31 45 61 / 4%);
}

.page-head :deep(.el-button.is-text) {
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.page-head :deep(.el-button.is-text:hover) {
  color: var(--period-primary);
  background: var(--period-primary-light);
}

.page-head :deep(.el-button.is-plain) {
  border-color: var(--period-border-strong);
  color: var(--period-primary);
  background: var(--el-bg-color);
  font-weight: 600;
}

.page-head :deep(.el-button.is-plain:hover) {
  border-color: var(--period-primary);
  color: #fff;
  background: var(--period-primary);
}

.title-block {
  min-width: 0;
  padding-left: 4px;
}

.title-block h1 {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin: 0;
  color: var(--period-text);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.title-block h1::before {
  width: 4px;
  height: 20px;
  margin-right: 10px;
  border-radius: 99px;
  background: var(--period-primary);
  content: '';
}

.title-block p {
  margin: 4px 0 0 14px;
  color: var(--period-sub);
  font-size: 13px;
  line-height: 1.35;
}

.steps-card,
.summary-card,
.table-card,
.footer-actions {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.steps-card {
  flex: 0 0 auto;
  margin: 0;
  padding: 14px 28px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--period-primary) 2%, var(--el-bg-color));
}

.steps-card :deep(.el-step__icon) {
  width: 24px;
  height: 24px;
  border-color: var(--period-border-strong);
  color: var(--period-primary);
  background: var(--el-bg-color);
  font-size: 12px;
}

.steps-card :deep(.el-step__head.is-process .el-step__icon),
.steps-card :deep(.el-step__head.is-success .el-step__icon) {
  border-color: var(--period-primary);
  color: #fff;
  background: var(--period-primary);
}

.steps-card :deep(.el-step__title) {
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 24px;
}

.steps-card :deep(.el-step__title.is-process),
.steps-card :deep(.el-step__title.is-success) {
  color: var(--period-primary);
  font-weight: 700;
}

.steps-card :deep(.el-step__head) {
  height: 24px;
}

.steps-card :deep(.el-step__line) {
  top: 11px;
  background-color: var(--period-border);
}

.steps-card :deep(.el-step__main) {
  margin-top: 0;
}

.steps-card :deep(.el-step__description) {
  display: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  flex: 0 0 auto;
  margin: 0 0 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.summary-card {
  position: relative;
  min-height: 74px;
  padding: 14px 20px 12px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.summary-card:last-child {
  border-right: 0;
}

.summary-card::before {
  position: absolute;
  left: 20px;
  top: 13px;
  width: 3px;
  height: 36px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--period-primary) 55%, transparent);
  content: '';
}

.summary-label {
  padding-left: 14px;
  color: var(--period-sub);
  font-size: 13px;
}

.summary-value {
  margin-top: 5px;
  padding-left: 14px;
  color: var(--period-primary);
  font-size: 24px;
  font-weight: 800;
}

.table-card {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px 6px 0 0;
  background: var(--el-bg-color);
}

.panel-title {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  margin: 0;
  padding: 0 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--period-text);
  font-size: 15px;
  font-weight: 800;
  background: linear-gradient(180deg, var(--el-bg-color) 0%, var(--el-fill-color-extra-light) 100%);
}

.panel-title span::before {
  display: inline-block;
  width: 4px;
  height: 16px;
  margin-right: 8px;
  border-radius: 99px;
  vertical-align: -2px;
  background: var(--period-primary);
  content: '';
}

.profit-loss-table {
  flex: 1 1 auto;
  min-height: 0;
}

.profit-loss-table :deep(.el-table__header-wrapper th) {
  color: var(--period-text);
  background: var(--el-fill-color-extra-light);
}

.profit-loss-table :deep(.el-table__cell) {
  padding: 6px 0;
}

.profit-loss-table :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: var(--period-primary-light);
}

.profit-loss-carry-page,
.table-card,
.profit-loss-table,
.profit-loss-table :deep(.el-scrollbar__wrap),
.profit-loss-table :deep(.el-table__body-wrapper),
.profit-loss-table :deep(.el-table__inner-wrapper) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.profit-loss-carry-page::-webkit-scrollbar,
.table-card::-webkit-scrollbar,
.profit-loss-table::-webkit-scrollbar,
.profit-loss-table :deep(.el-scrollbar__wrap::-webkit-scrollbar),
.profit-loss-table :deep(.el-table__body-wrapper::-webkit-scrollbar),
.profit-loss-table :deep(.el-table__inner-wrapper::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.profit-loss-table :deep(.el-scrollbar__bar) {
  display: none !important;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.footer-actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  margin: 0;
  padding: 10px 0 0;
}

.footer-actions :deep(.el-button) {
  border-radius: 5px;
  font-weight: 700;
}

.footer-actions :deep(.el-button--primary) {
  border-color: var(--period-primary);
  background: linear-gradient(180deg, var(--period-primary) 0%, var(--period-primary-dark) 100%);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--period-primary) 18%, transparent);
}

.footer-actions :deep(.el-button:not(.el-button--primary)) {
  border-color: var(--period-border-strong);
  color: var(--period-primary);
  background: var(--el-bg-color);
}

.footer-actions :deep(.el-button:not(.el-button--primary):hover) {
  border-color: var(--period-primary);
  color: var(--period-primary);
  background: var(--period-primary-light);
}

@media (max-width: 900px) {
  .page-head,
  .footer-actions {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .summary-grid,
  .year-end-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .summary-card:last-child {
    border-bottom: 0;
  }

  .panel-title {
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 14px;
  }
}
</style>
