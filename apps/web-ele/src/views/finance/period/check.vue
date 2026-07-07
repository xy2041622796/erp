<script lang="ts" setup>
import type { PeriodCheckItem, PeriodCheckResult } from '#/api/erp/finance/period-check';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';
import { ArrowLeft, Calendar, DataAnalysis, Document, Right } from '@element-plus/icons-vue';
import {
  ElButton,
  ElIcon,
  ElInput,
  ElMessage,
  ElDialog,
} from 'element-plus';

import { getPeriodCheckPreview } from '#/api/erp/finance/period-check';
import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';

defineOptions({ name: 'FinancePeriodCloseCheck' });

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const voucherCreatingKey = ref('');
const templateDialogVisible = ref(false);
const templateText = ref('');
const preview = ref<PeriodCheckResult | null>(null);

const form = reactive({
  accountSetId: String(route.query.accountSetId || ''),
  companyName: String(route.query.companyName || ''),
  endDate: String(route.query.endDate || ''),
  period: String(route.query.period || ''),
});

const periodCheckItems = computed<PeriodCheckItem[]>(() => preview.value?.items || []);
const periodCheckReadyCount = computed(() =>
  periodCheckItems.value.filter((item) => moneyNumber(item.amount) > 0).length,
);
const periodCheckTotalAmount = computed(() =>
  moneyNumber(sumByMoney(periodCheckItems.value, (item) => item.amount)),
);

function formatMoney(value: unknown) {
  return moneyText(value as any);
}

function getVoucherCreateDate() {
  return form.endDate || resolvePeriodEndDate(form.period);
}

async function assertCurrentPeriodOpen(actionText = '结转到该月') {
  await assertPeriodNotClosedByDate({
    accountSetId: form.accountSetId,
    date: getVoucherCreateDate(),
    actionText,
  });
}

function resolvePeriodEndDate(period: string) {
  const [yearText, monthText] = String(period || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) return '';
  const end = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

function handleBack() {
  router.push({ path: '/finance/period' });
}

function handleNextStep() {
  if (!form.period) {
    ElMessage.warning('缺少期间参数');
    return;
  }
  router.push({
    name: 'FinancePeriodProfitLossCarry',
    query: {
      accountSetId: form.accountSetId,
      companyName: form.companyName,
      endDate: form.endDate || resolvePeriodEndDate(form.period),
      period: form.period,
    },
  });
}

function handleOpenPeriodSource(item: PeriodCheckItem) {
  const sourceUrl = String(item.sourceUrl || '').trim();
  if (sourceUrl) {
    router.push(sourceUrl);
    return;
  }
  if (moneyNumber(item.amount) > 0) {
    ElMessage.info(item.description || item.source || '当前项目有金额，但暂未配置来源页面');
    return;
  }
  ElMessage.info(`${item.label} 当前金额为 0，暂无可跳转来源`);
}

function handleOpenPeriodTemplateDialog() {
  templateText.value = JSON.stringify(
    periodCheckItems.value.map((item) => ({
      key: item.key,
      label: item.label,
      debit: item.voucherTemplate.debit,
      credit: item.voucherTemplate.credit,
      debitSubjectCode: item.voucherTemplate.debitSubjectCode,
      creditSubjectCode: item.voucherTemplate.creditSubjectCode,
      amount: moneyNumber(item.amount),
      source: item.source,
      description: item.description,
    })),
    null,
    2,
  );
  templateDialogVisible.value = true;
}

async function loadPreview() {
  if (!form.period) {
    ElMessage.warning('缺少期间参数');
    return;
  }
  loading.value = true;
  try {
    const voucherDate = form.endDate || resolvePeriodEndDate(form.period);
    preview.value = await getPeriodCheckPreview({
      period: form.period,
      voucherDate,
      accountSetId: form.accountSetId,
      companyName: form.companyName,
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载期末检查失败');
  } finally {
    loading.value = false;
  }
}

function openPeriodCheckVoucherCreate(item: PeriodCheckItem) {
  const amount = moneyNumber(item.amount);
  const debitSubjectCode = item.voucherTemplate?.debitSubjectCode || '';
  const creditSubjectCode = item.voucherTemplate?.creditSubjectCode || '';
  const summary = `${form.period} ${item.label}`;
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      'finance_voucher_create_draft',
      JSON.stringify({
        source: 'period-close',
        bizKey: item.key,
        bizLabel: item.label,
        sourceBizType: `期末结转-${item.label}`,
        voucherWord: '记',
        date: getVoucherCreateDate(),
        note: summary,
        returnPath: '/finance/period/check',
        returnQuery: {
          accountSetId: form.accountSetId,
          companyName: form.companyName,
          endDate: form.endDate || resolvePeriodEndDate(form.period),
          period: form.period,
          moduleScope: 'finance',
        },
        entries: [
          { sortNo: 1, summary, subject: debitSubjectCode, debit: amount },
          { sortNo: 2, summary, subject: creditSubjectCode, credit: amount },
        ],
      }),
    );
  }
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      accountSetId: form.accountSetId,
      closeDate: getVoucherCreateDate(),
      companyName: form.companyName,
      date: form.period,
      endDate: form.endDate || resolvePeriodEndDate(form.period),
      moduleScope: 'finance',
      period: form.period,
      returnPath: '/finance/period/check',
      source: 'period-close',
      voucherDate: getVoucherCreateDate(),
    },
  });
}

async function handleCreatePeriodCheckVoucher(item: PeriodCheckItem) {
  if (voucherCreatingKey.value) return;
  voucherCreatingKey.value = item.key;
  try {
    await assertCurrentPeriodOpen('结转到该月');
    openPeriodCheckVoucherCreate(item);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '打开新增凭证失败');
  } finally {
    voucherCreatingKey.value = '';
  }
}
onMounted(loadPreview);
</script>

<template>
  <Page auto-content-height class="h-full period-check-page">
    <div class="period-check-shell">
      <div class="period-check-toolbar">
        <div class="period-check-toolbar__actions">
          <ElButton text class="period-check-action" @click="handleBack">
            <ArrowLeft class="period-check-action__icon" />
            <span>返回</span>
          </ElButton>
          <ElButton plain :icon="Document" @click="handleOpenPeriodTemplateDialog">
            自定义结转模板
          </ElButton>
        </div>
        <div class="period-check-toolbar__pager">
          <ElButton type="primary" :icon="Right" @click="handleNextStep">
            下一步
          </ElButton>
        </div>
      </div>

      <div v-loading="loading" class="period-check-frame">
        <div class="period-check-header">
          <div class="period-check-title-wrap">
            <div class="period-check-hero-icon">
              <ElIcon><Document /></ElIcon>
            </div>
            <div class="period-check-title-main">
              <div class="period-check-title-row">
                <span class="period-check-title">第 1 步：期末检查</span>
                <span class="period-check-warning">*请检查是否有需要生成凭证，如无需处理，点击下一步即可！</span>
              </div>
            </div>
          </div>
          <div class="period-check-period">
            <ElIcon><Calendar /></ElIcon>
            <span>当前期间：{{ form.period || '-' }}</span>
          </div>
        </div>

        <div class="period-card-grid">
          <div v-for="item in periodCheckItems" :key="item.key" class="period-check-card">
            <div class="period-card-head">
              <ElIcon class="period-card-icon"><DataAnalysis /></ElIcon>
              <span class="period-card-title">{{ item.label }}</span>
            </div>
            <div class="period-card-body">
              <button
                class="period-amount-button"
                type="button"
                :title="item.description"
                @click.stop="handleOpenPeriodSource(item)"
              >
                {{ moneyText(item.amount) }}
              </button>
              <ElButton
                class="period-voucher-btn"
                type="primary"
                plain
                size="small"
                :loading="voucherCreatingKey === item.key"
                @click.stop="handleCreatePeriodCheckVoucher(item)"
              >
                生成凭证
              </ElButton>
            </div>
          </div>
        </div>

        <div class="period-check-summary">
          当前期间 {{ form.period || '-' }}，检测到 {{ periodCheckReadyCount }} 个有金额项目，合计 {{ formatMoney(periodCheckTotalAmount) }}。
        </div>
      </div>

      <ElDialog v-model="templateDialogVisible" title="自定义结转模板" width="780px">
        <div class="template-tip">
          当前展示本期间固定期末检查卡片对应的凭证模板；卡片名称固定展示，没有数据时金额为 0，有数据时展示对应未结转金额和来源说明。
        </div>
        <ElInput v-model="templateText" type="textarea" :rows="18" />
        <template #footer>
          <ElButton type="primary" @click="templateDialogVisible = false">关闭</ElButton>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.period-check-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  --period-primary: var(--el-color-primary);
  --period-primary-dark: var(--el-color-primary-dark-2);
  --period-primary-light: var(--el-color-primary-light-9);
  --period-border: var(--el-color-primary-light-7);
  --period-border-strong: var(--el-color-primary-light-5);
  --period-text: var(--el-text-color-primary);
  --period-sub: var(--el-text-color-secondary);
}

.period-check-shell {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: calc(100vh - 150px);
  max-height: calc(100vh - 150px);
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  color: var(--period-text);
  background: #fff;
}

.period-check-toolbar {
  position: relative;
  z-index: 20;
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 3px 12px rgb(31 45 61 / 5%);
}

.period-check-toolbar__actions,
.period-check-toolbar__pager,
.period-check-action {
  display: flex;
  align-items: center;
}

.period-check-toolbar__actions,
.period-check-toolbar__pager {
  gap: 10px;
}

.period-check-toolbar :deep(.el-button) {
  height: 34px;
  padding: 0 18px;
  border-radius: 5px;
  font-weight: 600;
}

.period-check-toolbar__pager :deep(.el-button--primary) {
  min-width: 112px;
  border-color: var(--period-primary);
  background: linear-gradient(180deg, var(--period-primary) 0%, var(--period-primary-dark) 100%);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--period-primary) 18%, transparent);
}

.period-check-action {
  min-width: 64px;
  height: 34px !important;
  padding: 0 8px !important;
  color: var(--el-text-color-regular) !important;
}

.period-check-action:hover {
  color: var(--period-primary) !important;
  background: var(--period-primary-light) !important;
}

.period-check-action__icon {
  width: 15px;
  height: 15px;
  margin-right: 4px;
}

.period-check-frame {
  position: relative;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0 28px 28px;
  overflow: auto;
  border: 0;
  background: #fff;
}

.period-check-header {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 24px;
  min-height: 106px;
  margin: 0 -28px 22px;
  padding: 28px 36px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background:
    radial-gradient(circle at 91% 50%, color-mix(in srgb, var(--period-primary) 8%, transparent) 0, color-mix(in srgb, var(--period-primary) 3%, transparent) 18%, transparent 32%),
    linear-gradient(180deg, #ffffff 0%, var(--el-bg-color-page) 100%);
  overflow: hidden;
}

.period-check-header::after {
  position: absolute;
  right: 72px;
  bottom: -20px;
  width: 230px;
  height: 88px;
  border-radius: 22px;
  background:
    linear-gradient(115deg, transparent 0 58%, color-mix(in srgb, var(--period-primary) 8%, transparent) 58% 63%, transparent 63%),
    linear-gradient(160deg, color-mix(in srgb, var(--period-primary) 8%, transparent), color-mix(in srgb, var(--period-primary) 2%, transparent));
  content: '';
  pointer-events: none;
  transform: skewX(-12deg);
}

.period-check-title-wrap {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 22px;
  min-width: 0;
}

.period-check-hero-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 74px;
  border-radius: 8px;
  color: #fff;
  font-size: 40px;
  background: linear-gradient(180deg, var(--el-color-primary-light-3) 0%, var(--period-primary-dark) 100%);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--period-primary) 18%, transparent);
}

.period-check-title-main {
  min-width: 0;
}

.period-check-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 18px;
}

.period-check-title {
  flex: 0 0 auto;
  max-width: none;
  color: var(--period-text);
  font-size: 32px;
  font-weight: 800;
  line-height: 1.18;
  white-space: nowrap;
  letter-spacing: 1px;
}

.period-check-warning {
  max-width: 560px;
  color: #ff5a1f;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
}

.period-check-warning::before {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  margin-right: 6px;
  border-radius: 50%;
  color: #fff;
  background: #ff6a2a;
  content: '!';
  font-size: 12px;
  font-weight: 700;
}

.period-check-period {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  color: var(--el-text-color-regular);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.period-check-period .el-icon {
  color: var(--period-primary);
}

.period-card-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 24px;
}

.period-check-card {
  position: relative;
  min-width: 0;
  height: 138px;
  overflow: hidden;
  border: 1px solid var(--period-border);
  border-radius: 6px;
  background: linear-gradient(180deg, #fff 0%, #fcfdff 100%);
  box-shadow: 0 8px 20px rgb(31 45 61 / 5%);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.period-check-card:hover {
  transform: translateY(-2px);
  border-color: var(--period-border-strong);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--period-primary) 10%, transparent);
}

.period-card-head {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 14px;
  align-items: center;
  height: 54px;
  padding: 0 16px;
  column-gap: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, #ffffff 0%, var(--el-fill-color-extra-light) 100%);
}

.period-card-head::after {
  color: var(--el-text-color-regular);
  content: '›';
  font-size: 22px;
  line-height: 1;
}

.period-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--period-primary);
  background: var(--el-color-primary-light-9);
  font-size: 18px;
}

.period-card-title {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  text-align: left;
  word-break: break-word;
}

.period-card-body {
  position: relative;
  height: 84px;
  padding: 16px 16px 14px;
}

.period-card-body::before {
  position: absolute;
  right: 16px;
  left: 16px;
  top: 48px;
  border-top: 1px dashed var(--period-border);
  content: '';
}

.period-amount-button {
  position: relative;
  z-index: 1;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--period-primary-dark);
  cursor: pointer;
  font-size: 25px;
  font-weight: 500;
  line-height: 28px;
}

.period-amount-button:hover {
  color: var(--period-primary-dark);
}

.period-voucher-btn {
  position: absolute;
  right: 16px;
  bottom: 13px;
  z-index: 1;
  min-width: 88px;
  height: 28px;
  border-color: var(--el-color-primary-light-5);
  border-radius: 4px;
  color: var(--period-primary);
  background: #fff;
  font-weight: 600;
}

.period-voucher-btn:hover {
  color: #fff;
  background: var(--period-primary);
  border-color: var(--period-primary);
}

.period-check-summary {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  margin: 22px -18px 0;
  padding: 11px 20px;
  border: 1px solid var(--period-border);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  background: rgb(255 255 255 / 94%);
  font-size: 14px;
  backdrop-filter: blur(8px);
}

.period-check-summary::before {
  margin-right: 8px;
  color: var(--period-primary);
  content: 'ⓘ';
}

.template-tip {
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

@media (max-width: 1180px) {
  .period-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .period-check-frame {
    padding: 0 16px 20px;
  }

  .period-check-header {
    grid-template-columns: 1fr;
    margin-right: -16px;
    margin-left: -16px;
    padding: 20px 20px 18px;
  }

  .period-check-title-wrap {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .period-check-title {
    font-size: 26px;
  }

  .period-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
