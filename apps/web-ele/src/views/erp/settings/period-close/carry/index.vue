<script lang="ts" setup>
import type { PeriodCheckItem, PeriodCheckResult } from '#/api/erp/finance/period-check';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ElButton, ElIcon, ElMessage } from 'element-plus';
import { Calendar, Document, InfoFilled } from '@element-plus/icons-vue';

import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';

import {
  createPeriodCheckVoucher,
  getPeriodCheckPreview,
} from '#/api/erp/finance/period-check';

defineOptions({ name: 'ErpPeriodCloseCarry' });

const route = useRoute();
const router = useRouter();

const form = reactive({
  companyName: String(route.query.companyName || '中信科技开发有限公司'),
  closeDate: String(route.query.closeDate || '2026-05-31'),
  period: String(route.query.period || '2026-05'),
});

const loading = ref(false);
const voucherCreatingKey = ref('');
const preview = ref<PeriodCheckResult | null>(null);

const carryItems = computed<PeriodCheckItem[]>(() => preview.value?.items || []);
const totalAmount = computed(() => Number(preview.value?.totalAmount || 0));
const valuableCount = computed(
  () => carryItems.value.filter((item) => Number(item.amount || 0) > 0).length,
);

function normalizeDate(value: unknown) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function periodFromDate(value: string) {
  return String(value || '').slice(0, 7);
}

function validateCloseDate() {
  const closeDate = normalizeDate(form.closeDate);
  if (!closeDate) {
    ElMessage.warning('请选择结账日期');
    return false;
  }
  return true;
}

async function loadPreview() {
  if (!validateCloseDate()) return;
  loading.value = true;
  try {
    form.period = periodFromDate(form.closeDate || `${form.period}-01`);
    preview.value = await getPeriodCheckPreview({
      companyName: form.companyName,
      period: form.period,
      voucherDate: form.closeDate,
    });
  } catch (error: any) {
    ElMessage.error(error?.message || '加载结转数据失败');
  } finally {
    loading.value = false;
  }
}

function getVoucherCreateDate() {
  const closeDate = normalizeDate(form.closeDate);
  return closeDate || `${form.period}-01`;
}

async function assertCurrentPeriodOpen(actionText = '结转到该月') {
  await assertPeriodNotClosedByDate({
    date: getVoucherCreateDate(),
    actionText,
  });
}

function openSalesCostVoucher(item: PeriodCheckItem) {
  const amount = Number(item.amount || 0);
  const summary = `${form.period} 结转销售成本`;
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      'finance_voucher_create_draft',
      JSON.stringify({
        source: 'period-close-sales-cost',
        voucherWord: '记',
        date: getVoucherCreateDate(),
        note: summary,
        returnPath: '/erp/settings/period-close/carry',
        returnQuery: {
          closeDate: form.closeDate,
          companyName: form.companyName,
          period: form.period,
        },
        entries: [
          {
            sortNo: 1,
            summary,
            subject: '5401',
            debit: amount,
          },
          {
            sortNo: 2,
            summary,
            subject: '1405',
            credit: amount,
          },
        ],
      }),
    );
  }
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      closeDate: form.closeDate,
      companyName: form.companyName,
      date: form.period,
      moduleScope: 'finance',
      period: form.period,
      returnPath: '/erp/settings/period-close/carry',
      source: 'period-close-sales-cost',
      voucherDate: getVoucherCreateDate(),
    },
  });
}

async function handleCreateVoucher(item: PeriodCheckItem) {
  if (voucherCreatingKey.value) return;
  voucherCreatingKey.value = item.key;
  try {
    await assertCurrentPeriodOpen('结转到该月');
    if (item.key === 'sales-cost') {
      openSalesCostVoucher(item);
      return;
    }
    const res: any = await createPeriodCheckVoucher({
      amount: item.amount,
      companyName: form.companyName,
      key: item.key,
      period: form.period,
      voucherDate: form.closeDate,
    });
    ElMessage.success(`已生成凭证${res?.voucher_code ? `：${res.voucher_code}` : ''}`);
    await loadPreview();
  } catch (error: any) {
    ElMessage.error(error?.message || '生成凭证失败');
  } finally {
    voucherCreatingKey.value = '';
  }
}
function handleBackCheck() {
  router.push({
    path: '/erp/settings/period-close',
    query: {
      closeDate: form.closeDate,
      companyName: form.companyName,
      period: form.period,
    },
  });
}

onMounted(loadPreview);
</script>

<template>
  <Page auto-content-height>
    <div v-loading="loading" class="carry-check-page">
      <header class="check-header">
        <div class="header-left">
          <div class="header-icon"><ElIcon><Document /></ElIcon></div>
          <div class="title-line">
            <h1>第 2 步：结转损益</h1>
            <span class="warn-dot">!</span>
            <span class="warn-text">请检查是否有需要生成凭证，如无需处理，点击下一步即可！</span>
          </div>
        </div>
        <div class="period-text">
          <ElIcon><Calendar /></ElIcon>
          <span>当前期间：</span>
          <strong>{{ form.period }}</strong>
        </div>
      </header>

      <main class="card-area">
        <article v-for="item in carryItems" :key="item.key" class="carry-card">
          <div class="card-title-row">
            <div class="title-main">
              <span class="small-icon"><ElIcon><Document /></ElIcon></span>
              <strong>{{ item.label }}</strong>
            </div>
            <span class="arrow">›</span>
          </div>
          <div class="amount-row">
            <span>{{ Number(item.amount || 0).toFixed(2) }}</span>
            <ElButton
              class="create-btn"
              size="small"
              plain
              type="primary"
              :loading="voucherCreatingKey === item.key"
              @click="handleCreateVoucher(item)"
            >
              {{ item.key === 'sales-cost' ? '新增凭证' : '生成凭证' }}
            </ElButton>
          </div>
        </article>
      </main>

      <footer class="bottom-tip">
        <ElIcon><InfoFilled /></ElIcon>
        <span>当前期间 {{ form.period }}，检测到 {{ valuableCount }} 个有金额项目，合计 {{ totalAmount.toFixed(2) }}。</span>
        <ElButton class="back-btn" link type="primary" @click="handleBackCheck">返回上一步</ElButton>
      </footer>
    </div>
  </Page>
</template>

<style scoped>
.carry-check-page {
  min-height: 100%;
  padding: 0 32px 16px;
  background: #fff;
  color: #1f2937;
}

.check-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 124px;
  margin: 0 -32px 22px;
  padding: 0 56px;
  overflow: hidden;
  background: linear-gradient(90deg, #f8fbff 0%, #edf5ff 100%);
}

.check-header::after {
  position: absolute;
  top: -46px;
  right: 56px;
  width: 240px;
  height: 180px;
  transform: skewX(-16deg);
  border-radius: 18px;
  background: rgb(22 119 255 / 7%);
  content: '';
}

.header-left {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 22px;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 74px;
  border-radius: 8px;
  background: #1976d2;
  color: #fff;
  font-size: 36px;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-line h1 {
  margin: 0;
  color: #1f2937;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 1px;
}

.warn-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff7043;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.warn-text {
  color: #ff5722;
  font-size: 13px;
}

.period-text {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #222;
  font-size: 14px;
}

.period-text .el-icon {
  color: #1677ff;
}

.card-area {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 24px;
}

.carry-card {
  height: 136px;
  overflow: hidden;
  border: 1px solid #bfd8fb;
  border-radius: 4px;
  background: #fff;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid #edf1f7;
}

.title-main {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  color: #111827;
  font-size: 15px;
}

.small-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #eef6ff;
  color: #1677ff;
  font-size: 16px;
}

.arrow {
  color: #111827;
  font-size: 20px;
  line-height: 1;
}

.amount-row {
  position: relative;
  height: 84px;
  padding: 18px 16px 0;
}

.amount-row::after {
  position: absolute;
  right: 16px;
  bottom: 32px;
  left: 16px;
  border-bottom: 1px dashed #bed6ff;
  content: '';
}

.amount-row span {
  color: #005fd8;
  font-size: 25px;
  font-weight: 700;
}

.create-btn {
  position: absolute;
  right: 16px;
  bottom: 12px;
  min-width: 88px;
  height: 28px;
  border-color: #9fc4f9;
  color: #005fd8;
  font-weight: 600;
}

.bottom-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  margin-top: 22px;
  border: 1px solid #bfd8fb;
  border-radius: 4px;
  color: #8b95a5;
  font-size: 13px;
}

.bottom-tip .el-icon {
  color: #409eff;
}

.back-btn {
  margin-left: 8px;
}

@media (max-width: 1280px) {
  .card-area { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .title-line { flex-wrap: wrap; }
}

@media (max-width: 900px) {
  .check-header { align-items: flex-start; flex-direction: column; padding: 24px 32px; }
  .card-area { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .card-area { grid-template-columns: 1fr; }
}
</style>
