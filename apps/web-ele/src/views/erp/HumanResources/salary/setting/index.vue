<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getSalaryExtensionList } from '#/api/erp/human-resources/salary';

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

defineOptions({ name: 'HrSalarySettingPage' });

const loading = ref(false);
const keyword = ref('');
const activeTab = ref('benchmark');
const detailVisible = ref(false);
const detailRow = ref<any>(null);

const tabDefs = {
  benchmark: { title: '薪资基准', table: 'Bil_HR_Salary_Setting_Benchmark' },
  dualSign: { title: '双签配置', table: 'Bil_HR_Salary_Setting_Dual_Sign' },
  range: { title: '薪资范围', table: 'Bil_HR_Salary_Setting_Range' },
} as const;

const benchmarkRows = ref<any[]>([]);
const dualSignRows = ref<any[]>([]);
const rangeRows = ref<any[]>([]);

function pickValue(row: any, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '-';
}

const currentTabTitle = computed(() => tabDefs[activeTab.value as keyof typeof tabDefs]?.title || '薪资设置');
const currentRows = computed(() => {
  const term = keyword.value.trim();
  const rows = activeTab.value === 'benchmark' ? benchmarkRows.value : activeTab.value === 'dualSign' ? dualSignRows.value : rangeRows.value;
  if (!term) return rows;
  return rows.filter((row) => [
    pickValue(row, ['name', 'title', 'description', 'remark']),
    pickValue(row, ['code', 'rowid']),
    pickValue(row, ['status', 'state']),
  ].some((field) => String(field).includes(term)));
});
const metrics = computed(() => [
  { label: '薪资基准', value: benchmarkRows.value.length, tip: '基准配置记录数' },
  { label: '双签配置', value: dualSignRows.value.length, tip: '双签记录数' },
  { label: '薪资范围', value: rangeRows.value.length, tip: '范围配置记录数' },
  { label: '当前页签记录', value: currentRows.value.length, tip: currentTabTitle.value },
]);
const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '名称', value: pickValue(row, ['name', 'title', 'description']) },
    { label: '编码', value: pickValue(row, ['code', 'rowid']) },
    { label: '状态', value: pickValue(row, ['status', 'state']) },
    { label: '备注', value: pickValue(row, ['remark', 'summary']) },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const [benchmarkRes, dualSignRes, rangeRes] = await Promise.all([
      getSalaryExtensionList(tabDefs.benchmark.table, { index: 1, page: 500, keyword: keyword.value }),
      getSalaryExtensionList(tabDefs.dualSign.table, { index: 1, page: 500, keyword: keyword.value }),
      getSalaryExtensionList(tabDefs.range.table, { index: 1, page: 500, keyword: keyword.value }),
    ]);
    benchmarkRows.value = benchmarkRes.list || [];
    dualSignRows.value = dualSignRes.list || [];
    rangeRows.value = rangeRes.list || [];
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
    <div class="hr-salary-setting-page">
      <HrPageIntro
        title="薪资设置"
        description="以三个配置页签替代原通用迁移页，集中查看薪资基准、双签配置和薪资范围。"
        :tags="['Sprint2', 'HR-SALARY-01']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <ElCard shadow="never">
        <div class="toolbar">
          <ElInput v-model="keyword" clearable placeholder="名称/编码/状态/备注" class="toolbar__input" @keyup.enter="loadData" />
          <ElTag type="info">当前页签：{{ currentTabTitle }}</ElTag>
        </div>
        <ElTabs v-model="activeTab">
          <ElTabPane label="薪资基准" name="benchmark" />
          <ElTabPane label="双签配置" name="dualSign" />
          <ElTabPane label="薪资范围" name="range" />
        </ElTabs>
        <ElTable v-loading="loading" border :data="currentRows" size="small">
          <ElTableColumn label="名称" min-width="180">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['name', 'title', 'description']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="编码" min-width="140">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['code', 'rowid']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="120">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['status', 'state']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="260">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['remark', 'summary', 'content']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="120" fixed="right">
            <template #default="{ row = {}} = {}">
              <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
      <HrDetailDrawer v-model="detailVisible" title="薪资设置详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <ElDescriptions border :column="1">
            <ElDescriptionsItem label="内容说明">{{ pickValue(detailRow, ['content', 'definition', 'description']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="扩展字段">{{ JSON.stringify(detailRow || {}, null, 2) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.hr-salary-setting-page {
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
