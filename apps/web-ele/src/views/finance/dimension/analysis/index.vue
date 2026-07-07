<script lang="ts" setup>
import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';


import {
  getDimensionResultDashboard,
  type DimensionResultDashboard,
  type DimensionResultLedgerRow,
  type DimensionResultQuery,
} from '#/api/erp/finance/dimension/config';

import {
  ElButton,
  ElCard,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElStatistic,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceDimensionAnalysisPage' });

const router = useRouter();
const loading = ref(false);
const dashboard = ref<DimensionResultDashboard>({
  records: [],
  event_stats: [],
  biz_category_stats: [],
  analysis_dimension_stats: [],
});

const eventChartRef = ref<EchartsUIType>();
const bizChartRef = ref<EchartsUIType>();
const analysisChartRef = ref<EchartsUIType>();
const voucherChartRef = ref<EchartsUIType>();

const { renderEcharts: renderEventChart } = useEcharts(eventChartRef);
const { renderEcharts: renderBizChart } = useEcharts(bizChartRef);
const { renderEcharts: renderAnalysisChart } = useEcharts(analysisChartRef);
const { renderEcharts: renderVoucherChart } = useEcharts(voucherChartRef);

const queryForm = reactive<DimensionResultQuery>({
  keyword: '',
  event_code: '',
  biz_category: '',
  dim_category: 'ANALYSIS',
  dim_code: '',
  value_keyword: '',
  voucher_required: 'ALL',
  voucher_status: 'ALL',
});

const overview = computed(() => {
  const records = dashboard.value.records || [];
  const detailAmount = moneyNumber(sumByMoney(records.flatMap((item) => item.details || []), (item) => item.amount));
  const analysisHitCount = records.reduce((sum, item) => sum + Number(item.analysis_dimension_count || 0), 0);
  const voucherBoundCount = records.filter((item) => String(item.voucher_no || '').trim()).length;
  return {
    recordCount: records.length,
    eventTypeCount: dashboard.value.event_stats.length,
    bizCategoryCount: dashboard.value.biz_category_stats.length,
    analysisHitCount,
    amountTotal: detailAmount,
    voucherBoundCount,
  };
});

const eventOptions = computed(() => {
  const values = Array.from(new Set(dashboard.value.records.map((item) => item.event_code).filter(Boolean)));
  return values.map((value) => ({ label: value, value }));
});

const bizCategoryOptions = computed(() => {
  const values = Array.from(new Set(dashboard.value.records.map((item) => item.biz_category).filter(Boolean)));
  return values.map((value) => ({ label: value, value }));
});

const topAnalysisStats = computed(() => (dashboard.value.analysis_dimension_stats || []).slice(0, 8));
const recentRecords = computed(() => (dashboard.value.records || []).slice(0, 8));

function getAmountText(value?: number | null) {
  if (value == null || value === undefined || Number.isNaN(Number(value))) return '-';
  return moneyText(value);
}

function getVoucherStatusType(row: DimensionResultLedgerRow) {
  return String(row.voucher_no || '').trim() ? 'success' : 'info';
}

function getVoucherStatusText(row: DimensionResultLedgerRow) {
  return String(row.voucher_no || '').trim() ? '已生成' : '未生成';
}

function renderCharts() {
  const eventStats = dashboard.value.event_stats || [];
  const bizStats = dashboard.value.biz_category_stats || [];
  const analysisStats = topAnalysisStats.value || [];
  const voucherBound = overview.value.voucherBoundCount;
  const voucherUnbound = Math.max(overview.value.recordCount - voucherBound, 0);

  renderEventChart({
    grid: { left: 48, right: 24, top: 24, bottom: 48 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: eventStats.map((item) => item.label),
      axisLabel: { interval: 0, rotate: 20 },
    },
    yAxis: { type: 'value', name: '次数' },
    series: [
      {
        type: 'bar',
        data: eventStats.map((item) => item.count),
        barMaxWidth: 44,
      },
    ],
  });

  renderBizChart({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        data: bizStats.map((item) => ({ name: item.label, value: item.count })),
        emphasis: { scale: true },
      },
    ],
  });

  renderAnalysisChart({
    grid: { left: 160, right: 24, top: 24, bottom: 24 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', name: '命中次数' },
    yAxis: {
      type: 'category',
      data: analysisStats.map((item) => item.label),
      axisLabel: { width: 140, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: analysisStats.map((item) => item.count),
        barMaxWidth: 26,
      },
    ],
  });

  renderVoucherChart({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: '65%',
        center: ['50%', '45%'],
        data: [
          { name: '已生成', value: voucherBound },
          { name: '未生成', value: voucherUnbound },
        ],
      },
    ],
  });
}

async function loadData() {
  loading.value = true;
  try {
    dashboard.value = await getDimensionResultDashboard({ ...queryForm });
    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  queryForm.keyword = '';
  queryForm.event_code = '';
  queryForm.biz_category = '';
  queryForm.dim_category = 'ANALYSIS';
  queryForm.dim_code = '';
  queryForm.value_keyword = '';
  queryForm.voucher_required = 'ALL';
  queryForm.voucher_status = 'ALL';
  void loadData();
}

function goToRuleCenter() {
  router.push('/erp/finance/dimension/rule');
}

function goToBizCategoryManage() {
  router.push('/erp/finance/dimension/biz-category');
}

function goToLedger() {
  router.push('/erp/finance/dimension/result');
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="dimension-analysis-page">
      <div class="dimension-analysis-page__overview">
        <ElCard shadow="never">
          <ElStatistic title="命中记录数" :value="overview.recordCount" />
        </ElCard>
        <ElCard shadow="never">
          <ElStatistic title="事件类型数" :value="overview.eventTypeCount" />
        </ElCard>
        <ElCard shadow="never">
          <ElStatistic title="业务分类数" :value="overview.bizCategoryCount" />
        </ElCard>
        <ElCard shadow="never">
          <ElStatistic title="分析维度命中数" :value="overview.analysisHitCount" />
        </ElCard>
        <ElCard shadow="never">
          <ElStatistic title="金额汇总" :value="overview.amountTotal" />
        </ElCard>
      </div>

      <ElCard shadow="never">
        <template #header>
          <div class="dimension-analysis-page__header">
            <div>
              <div class="dimension-analysis-page__title">分析维度看板</div>
              <div class="dimension-analysis-page__sub-title">当前页面使用图表看板展示分析结果，重点看事件、业务分类、分析维度排行与凭证覆盖情况。</div>
            </div>
            <div class="dimension-analysis-page__header-actions">
              <ElButton @click="goToLedger">返回业务维度台账</ElButton>
              <ElButton @click="goToRuleCenter">进入规则中心</ElButton>
              <ElButton @click="goToBizCategoryManage">业务分类管理</ElButton>
            </div>
          </div>
        </template>

        <ElForm inline class="dimension-analysis-page__query-form">
          <ElFormItem label="关键字">
            <ElInput v-model="queryForm.keyword" placeholder="业务单号 / 事件 / 业务分类 / 凭证号 / 维度值" clearable class="dimension-analysis-page__input-lg" />
          </ElFormItem>
          <ElFormItem label="事件编码">
            <ElSelect v-model="queryForm.event_code" clearable class="dimension-analysis-page__input-sm">
              <ElOption v-for="item in eventOptions" :key="item.value" :label="item.label" :value="item.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="业务分类">
            <ElSelect v-model="queryForm.biz_category" clearable class="dimension-analysis-page__input-sm">
              <ElOption v-for="item in bizCategoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="维度编码">
            <ElInput v-model="queryForm.dim_code" placeholder="如 ORDER_NO / CHANNEL" clearable class="dimension-analysis-page__input-sm" />
          </ElFormItem>
          <ElFormItem label="维度值">
            <ElInput v-model="queryForm.value_keyword" placeholder="搜索分析维度值" clearable class="dimension-analysis-page__input-sm" />
          </ElFormItem>
          <ElFormItem label="凭证状态">
            <ElSelect v-model="queryForm.voucher_status" class="dimension-analysis-page__input-xs">
              <ElOption label="全部" value="ALL" />
              <ElOption label="已生成" value="BOUND" />
              <ElOption label="未生成" value="UNBOUND" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" :loading="loading" @click="loadData">查询</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </ElFormItem>
        </ElForm>
      </ElCard>

      <div class="dimension-analysis-page__chart-grid dimension-analysis-page__chart-grid--two">
        <ElCard shadow="never">
          <template #header>
            <div class="dimension-analysis-page__card-title">事件分布</div>
          </template>
          <EchartsUI ref="eventChartRef" class="dimension-analysis-page__chart" />
        </ElCard>
        <ElCard shadow="never">
          <template #header>
            <div class="dimension-analysis-page__card-title">业务分类分布</div>
          </template>
          <EchartsUI ref="bizChartRef" class="dimension-analysis-page__chart" />
        </ElCard>
      </div>

      <div class="dimension-analysis-page__chart-grid dimension-analysis-page__chart-grid--two">
        <ElCard shadow="never">
          <template #header>
            <div class="dimension-analysis-page__card-title">分析维度 Top 8</div>
          </template>
          <EchartsUI ref="analysisChartRef" class="dimension-analysis-page__chart dimension-analysis-page__chart--tall" />
        </ElCard>
        <ElCard shadow="never">
          <template #header>
            <div class="dimension-analysis-page__card-title">凭证覆盖情况</div>
          </template>
          <EchartsUI ref="voucherChartRef" class="dimension-analysis-page__chart dimension-analysis-page__chart--tall" />
        </ElCard>
      </div>

      <ElCard shadow="never">
        <template #header>
          <div class="dimension-analysis-page__card-title">近期命中记录</div>
        </template>
        <div v-if="recentRecords.length" class="dimension-analysis-page__record-grid">
          <div v-for="item in recentRecords" :key="item.rowid" class="dimension-analysis-page__record-card">
            <div class="dimension-analysis-page__record-top">
              <div class="dimension-analysis-page__record-title">{{ item.ref_id || '-' }}</div>
              <ElTag :type="getVoucherStatusType(item)">{{ getVoucherStatusText(item) }}</ElTag>
            </div>
            <div class="dimension-analysis-page__record-meta">
              <span>{{ item.biz_date || '-' }}</span>
              <span>{{ item.event_code || '-' }}</span>
              <span>{{ item.biz_category || '-' }}</span>
            </div>
            <div class="dimension-analysis-page__record-summary">{{ item.analysis_summary || '暂无分析维度摘要' }}</div>
            <div class="dimension-analysis-page__record-footer">
              <span>分析维度数：{{ item.analysis_dimension_count || 0 }}</span>
              <span>凭证号：{{ item.voucher_no || '-' }}</span>
            </div>
          </div>
        </div>
        <ElEmpty v-else description="暂无分析记录" />
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.dimension-analysis-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dimension-analysis-page__overview {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.dimension-analysis-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.dimension-analysis-page__title {
  font-size: 16px;
  font-weight: 600;
}

.dimension-analysis-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.dimension-analysis-page__header-actions,
.dimension-analysis-page__query-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dimension-analysis-page__input-lg {
  width: 320px;
}

.dimension-analysis-page__input-sm {
  width: 180px;
}

.dimension-analysis-page__input-xs {
  width: 140px;
}

.dimension-analysis-page__chart-grid {
  display: grid;
  gap: 12px;
}

.dimension-analysis-page__chart-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dimension-analysis-page__card-title {
  font-size: 15px;
  font-weight: 600;
}

.dimension-analysis-page__chart {
  height: 320px;
}

.dimension-analysis-page__chart--tall {
  height: 380px;
}

.dimension-analysis-page__record-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.dimension-analysis-page__record-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--el-fill-color-blank);
}

.dimension-analysis-page__record-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dimension-analysis-page__record-title {
  font-size: 14px;
  font-weight: 600;
}

.dimension-analysis-page__record-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.dimension-analysis-page__record-summary {
  min-height: 44px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.5;
}

.dimension-analysis-page__record-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
