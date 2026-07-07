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

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrOrganOrgChartPage' });

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
const selectedChildren = computed(() => flatDepts.value.filter((item) => normalizeText(item.Prowid) === normalizeText(selectedDeptId.value)));
const selectedJobs = computed(() => jobs.value.filter((item) => [item.Depid, item.DepID].map(normalizeText).includes(normalizeText(selectedDeptId.value))));
const selectedUsers = computed(() => users.value.filter((item: any) => [item.DepID, item.Depid].map(normalizeText).includes(normalizeText(selectedDeptId.value))));

function buildChartNodes(list: OrganDept[]): any[] {
  return list.map((item) => {
    const depId = normalizeText(item.DepID);
    return {
      id: depId,
      title: item.DepName,
      subtitle: item.DepLevelCode ? `层级 ${item.DepLevelCode}` : depId,
      metrics: [
        { label: '下级组织', value: flatDepts.value.filter((node) => normalizeText(node.Prowid) === depId).length },
        { label: '岗位', value: jobs.value.filter((job) => [job.Depid, job.DepID].map(normalizeText).includes(depId)).length },
        { label: '人员', value: users.value.filter((user: any) => [user.DepID, user.Depid].map(normalizeText).includes(depId)).length },
      ],
      children: buildChartNodes(item.children || []),
    };
  });
}

const chartNodes = computed(() => buildChartNodes(deptTree.value));
const metrics = computed(() => [
  { label: '组织节点', value: flatDepts.value.length, tip: '架构图节点总数' },
  { label: '当前节点子组织', value: selectedChildren.value.length, tip: selectedDept.value?.DepName || '未选节点' },
  { label: '当前节点岗位', value: selectedJobs.value.length, tip: '组织岗位挂载数' },
  { label: '当前节点人员', value: selectedUsers.value.length, tip: '组织用户归属数' },
]);

function onSelectNode(node: OrganDept | { id?: string }) {
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
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-organ-org-chart-page">
      <HrPageIntro
        title="组织架构图"
        description="以层级化组织架构图代替迁移占位表格，支持按组织查看上下级结构、岗位和人员规模。"
        :tags="['Sprint1', 'HR-BASE-02', 'HR-ORG-03']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新架构图</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <HrListDetailPage aside-width="300px">
        <template #aside>
          <OrganizationTreePanel
            title="组织目录"
            :nodes="deptTree"
            :active-id="selectedDeptId"
            count-text="点击节点定位架构图"
            @select="onSelectNode"
            @reload="loadData"
          />
        </template>
        <div class="main-column">
          <ElCard shadow="never" header="组织架构图画布">
            <OrganizationChartCanvas :nodes="chartNodes" :active-id="selectedDeptId" @select="onSelectNode" />
          </ElCard>
          <ElCard shadow="never">
            <template #header>
              <div class="section-header">
                <span>当前节点信息</span>
                <ElTag type="info">{{ selectedDept?.DepName || '未选节点' }}</ElTag>
              </div>
            </template>
            <ElDescriptions border :column="2">
              <ElDescriptionsItem label="组织名称">{{ selectedDept?.DepName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="组织ID">{{ selectedDept?.DepID || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="上级组织">{{ selectedDept?.Prowid || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="层级编码">{{ selectedDept?.DepLevelCode || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="子组织数量">{{ selectedChildren.length }}</ElDescriptionsItem>
              <ElDescriptionsItem label="岗位数量">{{ selectedJobs.length }}</ElDescriptionsItem>
              <ElDescriptionsItem label="人员数量">{{ selectedUsers.length }}</ElDescriptionsItem>
              <ElDescriptionsItem label="是否停用">{{ selectedDept?.IsCancel || 0 }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>
        </div>
      </HrListDetailPage>
    </div>
  </Page>
</template>

<style scoped>
.hr-organ-org-chart-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.main-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
</style>
