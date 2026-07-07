<script lang="ts" setup>
import type { PeriodCheckItem, PeriodCheckResult } from '#/api/erp/finance/period-check';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElIcon,
  ElMessage,
  ElSelect,
  ElOption,
  ElTag,
} from 'element-plus';
import {
  ArrowRight,
  Calendar,
  Check,
  CircleCheck,
  Close,
  Document,
  Money,
  OfficeBuilding,
  Setting,
  Timer,
  Warning,
} from '@element-plus/icons-vue';

import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';

import {
  createPeriodCheckVoucher,
  getPeriodCheckPreview,
} from '#/api/erp/finance/period-check';

defineOptions({ name: 'ErpPeriodClose' });

const router = useRouter();

const form = reactive({
  companyName: '中信科技开发有限公司',
  closeDate: '2026-05-31',
  period: '2026-05',
});

const loading = ref(false);
const voucherCreatingKey = ref('');
const preview = ref<PeriodCheckResult | null>(null);

const checkItems = computed<PeriodCheckItem[]>(() => preview.value?.items || []);
const totalAmount = computed(() => Number(preview.value?.totalAmount || 0));
const readyCount = computed(() => Number(preview.value?.readyCount || 0));
const passedCount = computed(() => checkItems.value.length - readyCount.value);
const pendingCount = computed(() => readyCount.value);
const failedCount = computed(() => 0);

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

async function loadPreview() {
  if (!validateCloseDate()) return;
  loading.value = true;
  try {
    form.period = periodFromDate(form.closeDate);
    preview.value = await getPeriodCheckPreview({
      companyName: form.companyName,
      period: form.period,
      voucherDate: form.closeDate,
    });
  } catch (error: any) {
    ElMessage.error(error?.message || '加载期末检查失败');
  } finally {
    loading.value = false;
  }
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
        returnPath: '/erp/settings/period-close',
        returnQuery: {
          closeDate: form.closeDate,
          companyName: form.companyName,
          period: form.period,
        },
        entries: [
          { sortNo: 1, summary, subject: '5401', debit: amount },
          { sortNo: 2, summary, subject: '1405', credit: amount },
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
      returnPath: '/erp/settings/period-close',
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
async function handleGoCarry() {
  if (!validateCloseDate()) return;
  try {
    await assertCurrentPeriodOpen('结转到该月');
  } catch (error: any) {
    ElMessage.error(error?.message || `当前期间 ${form.period} 已关账，不能结转到该月`);
    return;
  }
  router.push({
    path: '/erp/settings/period-close/carry',
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
    <div v-loading="loading" class="period-check-page">
      <div class="page-head">
        <div>
          <div class="breadcrumb">财务管理 / 期末处理</div>
          <h1>期末检查</h1>
          <p>检查本期各项结转条件是否满足，确认数据准确后再进行结转损益与结账。</p>
        </div>
        <ElForm inline :model="form" class="filter-form">
          <ElFormItem label="公司">
            <ElSelect v-model="form.companyName" style="width: 190px">
              <ElOption label="中信科技开发有限公司" value="中信科技开发有限公司" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="期间">
            <ElDatePicker
              v-model="form.period"
              type="month"
              value-format="YYYY-MM"
              style="width: 150px"
              @change="() => { form.closeDate = `${form.period}-31`; loadPreview(); }"
            />
          </ElFormItem>
          <ElFormItem label="结账日">
            <ElDatePicker
              v-model="form.closeDate"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 160px"
              @change="loadPreview"
            />
          </ElFormItem>
          <ElButton :icon="Setting" plain>结转设置模板</ElButton>
        </ElForm>
      </div>

      <div class="summary-grid">
        <section class="summary-card blue">
          <div class="summary-icon"><ElIcon><Document /></ElIcon></div>
          <div>
            <div class="summary-label">待处理项目</div>
            <div class="summary-value">{{ pendingCount }} <span>个</span></div>
            <div class="summary-foot">{{ pendingCount ? '存在待处理项目' : '全部项目已检查完成' }}</div>
          </div>
        </section>
        <section class="summary-card green">
          <div class="summary-icon"><ElIcon><Check /></ElIcon></div>
          <div>
            <div class="summary-label">已通过项目</div>
            <div class="summary-value">{{ passedCount }} <span>个</span></div>
            <div class="summary-foot">检查通过，可继续下一步</div>
          </div>
        </section>
        <section class="summary-card money">
          <div class="summary-icon"><ElIcon><Money /></ElIcon></div>
          <div>
            <div class="summary-label">本期合计金额</div>
            <div class="summary-value">{{ totalAmount.toFixed(2) }}</div>
            <div class="summary-foot">金额单位：人民币</div>
          </div>
        </section>
        <section class="summary-card purple">
          <div class="summary-icon"><ElIcon><Timer /></ElIcon></div>
          <div>
            <div class="summary-label">检查截止时间</div>
            <div class="summary-value date">{{ form.closeDate }} 23:59</div>
            <div class="summary-foot">距截止还剩 28 天</div>
          </div>
        </section>
      </div>

      <section class="check-panel">
        <div class="panel-head">
          <h2>检查项目明细</h2>
          <div class="legend">
            <span class="ok"><ElIcon><CircleCheck /></ElIcon> 已通过 {{ passedCount }}</span>
            <span class="wait"><ElIcon><Warning /></ElIcon> 待处理 {{ pendingCount }}</span>
            <span class="fail"><ElIcon><Close /></ElIcon> 未通过 {{ failedCount }}</span>
          </div>
        </div>

        <div class="check-grid">
          <article v-for="item in checkItems" :key="item.key" class="check-card">
            <div class="card-head">
              <h3>{{ item.label }}</h3>
              <ElTag :type="Number(item.amount || 0) > 0 ? 'warning' : 'success'" effect="plain">
                {{ Number(item.amount || 0) > 0 ? '待处理' : '已通过' }}
              </ElTag>
            </div>
            <div class="card-amount">{{ Number(item.amount || 0).toFixed(2) }}</div>
            <p>{{ item.description }}</p>
            <ElButton
              class="card-btn"
              plain
              type="primary"
              :loading="voucherCreatingKey === item.key"
              @click="handleCreateVoucher(item)"
            >
              {{ item.key === 'sales-cost' ? '新增凭证' : '生成凭证' }}
            </ElButton>
          </article>
        </div>

        <div class="warm-tip">
          <ElIcon><Warning /></ElIcon>
          <span>请逐项检查以上项目，确认所有项目状态均为“已通过”后，再进行下一步的结转损益操作。如发现异常，请先处理相关业务或设置，再重新检查。</span>
        </div>

        <div class="page-actions">
          <ElButton type="primary" size="large" @click="handleGoCarry">
            下一步：结转损益
            <ElIcon class="btn-icon"><ArrowRight /></ElIcon>
          </ElButton>
        </div>
      </section>
    </div>
  </Page>
</template>

<style scoped>
.period-check-page {
  min-height: 100%;
  padding: 22px 26px;
  background: #f7faff;
  color: #172033;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.breadcrumb {
  margin-bottom: 10px;
  color: #7b8496;
  font-size: 14px;
}

.page-head h1 {
  margin: 0;
  color: #101828;
  font-size: 30px;
  font-weight: 700;
}

.page-head p {
  margin: 8px 0 0;
  color: #667085;
}

.filter-form {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-form :deep(.el-form-item) {
  margin: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 122px;
  padding: 20px 22px;
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 5%);
}

.summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  font-size: 26px;
}

.summary-card.blue .summary-icon { background: #eef5ff; color: #1677ff; }
.summary-card.green .summary-icon { background: #eaf8ef; color: #16a05d; }
.summary-card.money .summary-icon { background: #edf5ff; color: #1668dc; }
.summary-card.purple .summary-icon { background: #f4efff; color: #6544d8; }

.summary-label {
  color: #344054;
  font-weight: 600;
}

.summary-value {
  margin-top: 8px;
  color: #1677ff;
  font-size: 28px;
  font-weight: 700;
}

.summary-card.green .summary-value,
.summary-card.money .summary-value {
  color: #149654;
}

.summary-card.purple .summary-value {
  color: #5b42c8;
}

.summary-value span {
  margin-left: 4px;
  color: #344054;
  font-size: 16px;
}

.summary-value.date {
  font-size: 22px;
}

.summary-foot {
  margin-top: 8px;
  color: #667085;
  font-size: 13px;
}

.check-panel {
  padding: 16px;
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 5%);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-head h2 {
  position: relative;
  margin: 0;
  padding-left: 12px;
  color: #101828;
  font-size: 18px;
}

.panel-head h2::before {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 3px;
  border-radius: 3px;
  background: #1677ff;
  content: '';
}

.legend {
  display: flex;
  align-items: center;
  gap: 26px;
  color: #667085;
  font-size: 13px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend .ok { color: #15995a; }
.legend .wait { color: #d98200; }
.legend .fail { color: #e5484d; }

.check-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.check-card {
  min-height: 138px;
  padding: 14px;
  border: 1px solid #e6ecf5;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 5px 16px rgb(15 23 42 / 4%);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-head h3 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
}

.card-amount {
  margin-top: 20px;
  color: #079455;
  font-size: 23px;
  font-weight: 700;
}

.check-card p {
  height: 34px;
  overflow: hidden;
  margin: 8px 0 10px;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}

.card-btn {
  float: right;
  min-width: 78px;
}

.warm-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  padding: 14px 16px;
  border: 1px solid #cfe1ff;
  border-radius: 6px;
  background: #f2f7ff;
  color: #344054;
  font-size: 13px;
}

.warm-tip .el-icon {
  color: #1677ff;
  font-size: 22px;
}

.page-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.btn-icon {
  margin-left: 8px;
}

@media (max-width: 1400px) {
  .check-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .page-head { flex-direction: column; }
  .check-grid,
  .summary-grid { grid-template-columns: 1fr; }
}
</style>
