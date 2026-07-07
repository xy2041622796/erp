<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  buildDeptTree,
  getOrganDeptList,
  getOrganJobList,
  getOrganStaffList,
  type OrganDept,
  type OrganJob,
  type OrganUser,
} from '#/api/erp/human-resources/organ';

import HrAnalyticsPanel from '../../components/HrAnalyticsPanel.vue';
import HrListDetailPage from '../../components/HrListDetailPage.vue';
import HrPageIntro from '../../components/HrPageIntro.vue';
import OrganizationChartCanvas from '../../components/OrganizationChartCanvas.vue';
import OrganizationTreePanel from '../../components/OrganizationTreePanel.vue';

import { ElCard, ElTable, ElTableColumn, ElTag } from 'element-plus';

defineOptions({ name: 'HrOrganChartPage' });

const loading = ref(false);
const deptTree = ref<OrganDept[]>([]);
const jobs = ref<OrganJob[]>([]);
const users = ref<OrganUser[]>([]);
const selectedDeptId = ref('');

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function flatten(list: OrganDept[]): OrganDept[] {
  return list.flatMap((item) => [item, ...flatten(item.children || [])]);
}

const flatDepts = computed(() => flatten(deptTree.value));
const selectedDept = computed(() => flatDepts.value.find((item) => normalizeText(item.DepID) === normalizeText(selectedDeptId.value)) || null);

function countChildren(depId: string) {
  return flatDepts.value.filter((item) => normalizeText(item.Prowid) === depId).length;
}

function countJobs(depId: string) {
  return jobs.value.filter((item) => [item.Depid, item.DepID].map(normalizeText).includes(depId)).length;
}

function countUsers(depId: string) {
  return users.value.filter((item: any) => [item.DepID, item.Depid].map(normalizeText).includes(depId)).length;
}

function buildChartNodes(list: OrganDept[]): any[] {
  return list.map((item) => {
    const depId = normalizeText(item.DepID);
    return {
      id: depId,
      title: item.DepName,
      subtitle: item.DepLevelCode ? `层级编码：${item.DepLevelCode}` : depId,
      metrics: [
        { label: '下级组织', value: countChildren(depId) },
        { label: '岗位', value: countJobs(depId) },
        { label: '人员', value: countUsers(depId) },
      ],
      children: buildChartNodes(item.children || []),
    };
  });
}

const chartNodes = computed(() => buildChartNodes(deptTree.value));
const currentJobs = computed(() => {
  const depId = normalizeText(selectedDeptId.value);
  return jobs.value.filter((item) => [item.Depid, item.DepID].map(normalizeText).includes(depId)).slice(0, 8);
});
const currentUsers = computed(() => {
  const depId = normalizeText(selectedDeptId.value);
  return users.value.filter((item: any) => [item.DepID, item.Depid].map(normalizeText).includes(depId)).slice(0, 8);
});
const metrics = computed(() => [
  { label: '组织数', value: flatDepts.value.length, tip: '组织图节点总数' },
  { label: '岗位数', value: jobs.value.length, tip: '来自岗位主数据' },
  { label: '人员数', value: users.value.length, tip: '来自组织人员主数据' },
  { label: '当前节点岗位', value: currentJobs.value.length, tip: selectedDept.value?.DepName || '未选组织' },
]);

function onSelectDept(node: OrganDept | { id?: string }) {
  selectedDeptId.value = normalizeText((node as any).DepID || (node as any).id);
}

async function loadData() {
  loading.value = true;
  try {
    const [deptList, jobRes, userRes] = await Promise.all([
      getOrganDeptList(),
      getOrganJobList({ index: 1, page: 500 }),
      getOrganStaffList(''),
    ]);
    deptTree.value = buildDeptTree(deptList || []);
    jobs.value = jobRes.list || [];
    users.value = userRes.list || [];
    if (!selectedDeptId.value) selectedDeptId.value = normalizeText(flatten(deptTree.value)[0]?.DepID);
  } catch (error: any) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-organ-chart-page">
      <HrPageIntro
        title="组织图"
        description="以 ERP 原生组织树和岗位/人员主数据绘制组织图，用于替换原先的通用迁移表占位页。"
        :tags="['Sprint1', 'HR-BASE-02', 'HR-ORG-01']"
      />
      <HrAnalyticsPanel :metrics="metrics" />
      <HrListDetailPage aside-width="300px">
        <template #aside>
          <OrganizationTreePanel
            title="组织树导航"
            :nodes="deptTree"
            :active-id="selectedDeptId"
            count-text="可点击定位组织图节点"
            @select="onSelectDept"
            @reload="loadData"
          />
        </template>
        <div class="main-column">
          <ElCard shadow="never" header="组织图画布">
            <OrganizationChartCanvas :nodes="chartNodes" :active-id="selectedDeptId" @select="onSelectDept" />
          </ElCard>
          <div class="main-grid">
            <ElCard shadow="never">
              <template #header>
                <div class="section-header">
                  <span>当前组织岗位</span>
                  <ElTag>{{ selectedDept?.DepName || '未选组织' }}</ElTag>
                </div>
              </template>
              <ElTable border :data="currentJobs" size="small" v-loading="loading">
                <ElTableColumn prop="JobCode" label="岗位编码" width="140" />
                <ElTableColumn prop="JobName" label="岗位名称" min-width="160" />
                <ElTableColumn prop="JobType" label="岗位类别" width="120" />
              </ElTable>
            </ElCard>
            <ElCard shadow="never">
              <template #header>
                <div class="section-header">
                  <span>当前组织人员</span>
                  <ElTag type="success">{{ currentUsers.length }} 人</ElTag>
                </div>
              </template>
              <ElTable border :data="currentUsers" size="small" v-loading="loading">
                <ElTableColumn prop="UserName" label="姓名" min-width="120" />
                <ElTableColumn prop="LoginName" label="登录名" min-width="140" />
                <ElTableColumn prop="JobName" label="岗位" min-width="140" />
              </ElTable>
            </ElCard>
          </div>
        </div>
      </HrListDetailPage>
    </div>
  </Page>
</template>

<style scoped>
.hr-organ-chart-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.main-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.main-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
