<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getTrainingList } from '#/api/erp/human-resources/training';

import HrAnalyticsPanel from '../../../components/HrAnalyticsPanel.vue';
import HrDetailDrawer from '../../../components/HrDetailDrawer.vue';
import HrPageIntro from '../../../components/HrPageIntro.vue';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElInput,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrTrainingLearningPathRoadmapPage' });

const loading = ref(false);
const keyword = ref('');
const rows = ref<any[]>([]);
const detailVisible = ref(false);
const detailRow = ref<any>(null);

function text(v: unknown) {
  return String(v ?? '').trim();
}
function pickValue(row: any, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '-';
}

const filteredRows = computed(() => {
  const term = keyword.value.trim();
  if (!term) return rows.value;
  return rows.value.filter((row) => [
    pickValue(row, ['roadmapName', 'name', 'title']),
    pickValue(row, ['stageName', 'stepName', 'nodeName']),
    pickValue(row, ['status', 'state']),
  ].some((field) => text(field).includes(term)));
});
const groupedRows = computed(() => {
  const groups = new Map<string, any[]>();
  filteredRows.value.forEach((row) => {
    const key = text(pickValue(row, ['roadmapName', 'name', 'title'])) || '未命名路线图';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  });
  return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
});
const metrics = computed(() => [
  { label: '路线图记录', value: rows.value.length, tip: '路线节点总数' },
  { label: '路线图分组', value: groupedRows.value.length, tip: '不同路线图数量' },
  { label: '当前检索', value: filteredRows.value.length, tip: keyword.value || '全部路线' },
  { label: '启用状态', value: filteredRows.value.filter((row) => text(pickValue(row, ['status', 'state'])).includes('启')).length, tip: '按状态粗略统计' },
]);
const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '路线图', value: pickValue(row, ['roadmapName', 'name', 'title']) },
    { label: '阶段', value: pickValue(row, ['stageName', 'stepName', 'nodeName']) },
    { label: '状态', value: pickValue(row, ['status', 'state']) },
    { label: '说明', value: pickValue(row, ['remark', 'summary', 'description']) },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const res = await getTrainingList('Bil_HR_Training_Roadmap', { index: 1, page: 500, keyword: keyword.value });
    rows.value = res.list || [];
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
    <div class="hr-training-roadmap-page">
      <HrPageIntro
        title="学习地图"
        description="将路线图占位页替换为路径视图页面，按路线图分组展示阶段节点和说明。"
        :tags="['Sprint3', 'HR-TRAIN-06']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <ElCard shadow="never">
        <div class="toolbar">
          <ElInput v-model="keyword" clearable placeholder="路线图/阶段/状态" class="toolbar__input" @keyup.enter="loadData" />
          <ElTag type="info">路线图 {{ groupedRows.length }} 组</ElTag>
        </div>
        <div class="roadmap-groups" v-loading="loading">
          <ElCard v-for="group in groupedRows" :key="group.name" shadow="never" class="roadmap-card">
            <template #header>
              <div class="group-header">
                <span>{{ group.name }}</span>
                <ElTag>{{ group.items.length }} 节点</ElTag>
              </div>
            </template>
            <div class="timeline">
              <div v-for="item in group.items" :key="pickValue(item, ['rowid', 'code', 'nodeName'])" class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-content">
                  <div class="timeline-title">{{ pickValue(item, ['stageName', 'stepName', 'nodeName']) }}</div>
                  <div class="timeline-desc">{{ pickValue(item, ['remark', 'summary', 'description']) }}</div>
                  <div class="timeline-meta">
                    <ElTag size="small">{{ pickValue(item, ['status', 'state']) }}</ElTag>
                    <ElButton link type="primary" @click="openDetail(item)">详情</ElButton>
                  </div>
                </div>
              </div>
            </div>
          </ElCard>
        </div>
      </ElCard>
      <HrDetailDrawer v-model="detailVisible" title="路线图节点详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <ElDescriptions border :column="1">
            <ElDescriptionsItem label="节点说明">{{ pickValue(detailRow, ['content', 'description', 'remark']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始数据">{{ JSON.stringify(detailRow || {}, null, 2) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.hr-training-roadmap-page {
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
.roadmap-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.roadmap-card {
  min-height: 200px;
}
.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.timeline-item {
  display: flex;
  gap: 12px;
}
.timeline-node {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--el-color-primary);
  flex: none;
}
.timeline-content {
  min-width: 0;
}
.timeline-title {
  font-weight: 600;
}
.timeline-desc {
  margin-top: 6px;
  color: #909399;
  line-height: 1.6;
}
.timeline-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
@media (max-width: 1200px) {
  .roadmap-groups {
    grid-template-columns: 1fr;
  }
}
</style>
