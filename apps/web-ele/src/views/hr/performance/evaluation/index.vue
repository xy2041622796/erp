<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getPerformanceList } from '#/api/erp/human-resources/performance';

import HrAnalyticsPanel from '../../components/HrAnalyticsPanel.vue';
import HrDetailDrawer from '../../components/HrDetailDrawer.vue';
import HrPageIntro from '../../components/HrPageIntro.vue';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrPerformanceEvaluationPage' });

const loading = ref(false);
const keyword = ref('');
const activeTab = ref('review');
const detailVisible = ref(false);
const detailRow = ref<any>(null);

const reviewRows = ref<any[]>([]);
const resultRows = ref<any[]>([]);
const interviewRows = ref<any[]>([]);

function pickValue(row: any, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '-';
}

const currentRows = computed(() => {
  const rows = activeTab.value === 'review' ? reviewRows.value : activeTab.value === 'result' ? resultRows.value : interviewRows.value;
  const term = keyword.value.trim();
  if (!term) return rows;
  return rows.filter((row) => [
    pickValue(row, ['employeeName', 'employee_name', 'name']),
    pickValue(row, ['planName', 'templateName', 'indicatorName']),
    pickValue(row, ['status', 'state']),
  ].some((field) => String(field).includes(term)));
});
const metrics = computed(() => [
  { label: '评价审核', value: reviewRows.value.length, tip: '考核评价记录' },
  { label: '评价结果', value: resultRows.value.length, tip: '考核结果记录' },
  { label: '绩效面谈', value: interviewRows.value.length, tip: '面谈记录' },
  { label: '当前页签', value: currentRows.value.length, tip: activeTab.value === 'review' ? '评价审核' : activeTab.value === 'result' ? '评价结果' : '绩效面谈' },
]);
const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '员工/对象', value: pickValue(row, ['employeeName', 'employee_name', 'name']) },
    { label: '计划/模板', value: pickValue(row, ['planName', 'templateName', 'indicatorName']) },
    { label: '状态', value: pickValue(row, ['status', 'state']) },
    { label: '结论', value: pickValue(row, ['summary', 'remark', 'result']) },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const [reviewRes, resultRes, interviewRes] = await Promise.all([
      getPerformanceList('Bil_HR_Performance_Evaluation_Review', { index: 1, page: 500, keyword: keyword.value }),
      getPerformanceList('Bil_HR_Performance_Evaluation_Result', { index: 1, page: 500, keyword: keyword.value }),
      getPerformanceList('Bil_HR_Performance_Evaluation_Interview', { index: 1, page: 500, keyword: keyword.value }),
    ]);
    reviewRows.value = reviewRes.list || [];
    resultRows.value = resultRes.list || [];
    interviewRows.value = interviewRes.list || [];
  } finally {
    loading.value = false;
  }
}

function openDetail(row: any) {
  detailRow.value = row;
  detailVisible.value = true;
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-evaluation-page">
      <HrPageIntro
        title="绩效评价"
        description="以三个绩效页签承接 siweiOA 迁移数据，统一查看评价审核、结果和绩效面谈。"
        :tags="['Sprint2', 'HR-PERF-01']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <ElCard shadow="never">
        <div class="toolbar">
          <ElInput v-model="keyword" clearable placeholder="员工/计划/模板/状态" class="toolbar__input" @keyup.enter="loadData" />
          <ElTag type="info">当前页签：{{ activeTab === 'review' ? '评价审核' : activeTab === 'result' ? '评价结果' : '绩效面谈' }}</ElTag>
        </div>
        <ElTabs v-model="activeTab">
          <ElTabPane label="评价审核" name="review" />
          <ElTabPane label="评价结果" name="result" />
          <ElTabPane label="绩效面谈" name="interview" />
        </ElTabs>
        <ElTable v-loading="loading" border :data="currentRows" size="small">
          <ElTableColumn label="员工/对象" min-width="140">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['employeeName', 'employee_name', 'name']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="计划/模板" min-width="180">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['planName', 'templateName', 'indicatorName']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="120">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['status', 'state']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="240">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['summary', 'remark', 'content']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="120" fixed="right">
            <template #default="{ row = {}} = {}">
              <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
      <HrDetailDrawer v-model="detailVisible" title="绩效评价详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <ElDescriptions border :column="1">
            <ElDescriptionsItem label="内容">{{ pickValue(detailRow, ['content', 'description', 'remark']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始数据">{{ JSON.stringify(detailRow || {}, null, 2) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-evaluation-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar__input {
  width: 320px;
}
</style>
