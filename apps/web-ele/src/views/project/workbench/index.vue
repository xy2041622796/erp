<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import { getProjectHealth, getProjectManage, getProjectManageSimpleList } from '#/api/erp/project/manage';
import { listData as listCostView } from '#/api/erp/project/cost/view';
import { listData as listCostWorkday } from '#/api/erp/project/cost/workday';
import { listData as listDeliverable } from '#/api/erp/project/deliverable';
import { listData as listIssue } from '#/api/erp/project/issue';
import { listData as listMember } from '#/api/erp/project/manage/member';
import { listData as listQualityFinal } from '#/api/erp/project/quality/final';
import { listData as listQualityProcess } from '#/api/erp/project/quality/process';
import { listData as listCompare } from '#/api/erp/project/progress/compare';
import { listData as listReport } from '#/api/erp/project/progress/report';
import { listData as listWbs } from '#/api/erp/project/progress/wbs';
import { listData as listEquipment } from '#/api/erp/project/resource/equipment';
import { listData as listHours } from '#/api/erp/project/resource/hours';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElOption,
  ElProgress,
  ElSelect,
  ElSkeleton,
  ElTag,
} from 'element-plus';

interface ModuleEntry { key: string; title: string; tableName: string; path: string; tag: string; loader: (params?: Record<string, any>) => Promise<any>; needDetail?: boolean; }
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const projects = ref<any[]>([]);
let alive = true;
let workbenchLoadSeq = 0;
const DETAIL_PAGE_SIZE = 200;
const currentProjectId = ref('');
const currentProject = ref<Record<string, any> | null>(null);
const projectHealth = ref<Record<string, any> | null>(null);
const rows = ref<Record<string, any[]>>({});
const rowTotals = ref<Record<string, number>>({});
const businessActions = [
  { title: '成员变更', path: '/project/manage/member', tag: '成员' },
  { title: '新增 WBS', path: '/project/progress/wbs', tag: '进度' },
  { title: '新增进度报告', path: '/project/progress/report', tag: '报告' },
  { title: '质量异常生成问题', path: '/project/quality/process', tag: '质量' },
  { title: '检查项目完成条件', path: '/project/deliverable', tag: '成果' },
];
const modules: ModuleEntry[] = [
  { key: 'member', title: '成员数', tableName: 'project_members', path: '/project/manage/member', tag: '成员', loader: listMember },
  { key: 'wbs', title: 'WBS数', tableName: 'project_progress', path: '/project/progress/wbs', tag: '进度', loader: listWbs },
  { key: 'report', title: '进度报告数', tableName: 'project_progress_report', path: '/project/progress/report', tag: '进度', loader: listReport },
  { key: 'compare', title: '进度偏差数', tableName: 'project_progress_compare', path: '/project/progress/compare', tag: '预警', loader: listCompare, needDetail: true },
  { key: 'issue', title: '未关闭问题数', tableName: 'project_issues', path: '/project/issue', tag: '问题', loader: listIssue, needDetail: true },
  { key: 'qualityProcess', title: '质量异常数', tableName: 'project_quality_process', path: '/project/quality/process', tag: '质量', loader: listQualityProcess, needDetail: true },
  { key: 'qualityFinal', title: '最终质量异常', tableName: 'project_quality_final', path: '/project/quality/final', tag: '质量', loader: listQualityFinal, needDetail: true },
  { key: 'hours', title: '工时合计', tableName: 'project_resource_hours', path: '/project/resource/hours', tag: '资源', loader: listHours, needDetail: true },
  { key: 'equipment', title: '设备数', tableName: 'project_resource_equipment', path: '/project/resource/equipment', tag: '资源', loader: listEquipment },
  { key: 'deliverable', title: '成果完成率', tableName: 'project_deliverables', path: '/project/deliverable', tag: '成果', loader: listDeliverable, needDetail: true },
  { key: 'workday', title: '工日合计', tableName: 'project_cost_workday', path: '/project/cost/workday', tag: '成本', loader: listCostWorkday, needDetail: true },
  { key: 'budget', title: '成本使用率', tableName: 'project_budgets', path: '/project/cost/view', tag: '成本', loader: listCostView, needDetail: true },
];
const selectedProjectName = computed(() => projects.value.find((item) => item?.rowid === currentProjectId.value)?.project_name || currentProject.value?.project_name || '-');
function getList(res: any) { return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : []; }
function getTotal(res: any) { return Number(res?.total ?? res?.data?.total ?? getList(res).length ?? 0) || 0; }
function formatYmd(value: unknown) { if (!value) return '-'; const str = String(value); return str.includes('T') ? str.split('T')[0] : str.includes(' ') ? str.split(' ')[0] : str; }
function formatMoney(value: unknown) { const num = Number(value ?? 0); return Number.isFinite(num) ? num.toFixed(2) : '0.00'; }
function isClosed(status: any) { return ['closed', 'resolved', 'done', 'completed', '已关闭', '已解决', '完成'].includes(String(status || '').toLowerCase()); }
function isHigh(priority: any) { return ['high', 'critical', '高', '紧急'].includes(String(priority || '').toLowerCase()); }
function isAbnormal(value: any) { return ['failed', 'fail', 'abnormal', 'rectify', '不合格', '需整改', '异常', '未通过'].includes(String(value || '').toLowerCase()); }
function isDeliverableDone(status: any) { return ['accepted', 'archived', 'completed', 'done', '已验收', '已归档', '已完成'].includes(String(status || '').toLowerCase()); }
const metricCards = computed(() => {
  const issueRows = rows.value.issue || [];
  const openIssues = issueRows.filter((item) => !isClosed(item?.status));
  const deliverables = rows.value.deliverable || [];
  const doneDeliverables = deliverables.filter((item) => isDeliverableDone(item?.status)).length;
  const budgetRows = rows.value.budget || [];
  const budgetAmount = budgetRows.reduce((sum, item) => sum + Number(item?.budget_amount || 0), 0);
  const usedAmount = budgetRows.reduce((sum, item) => sum + Number(item?.used_amount || 0), 0);
  const hours = (rows.value.hours || []).reduce((sum, item) => sum + Number(item?.hours || 0), 0);
  const workday = (rows.value.workday || []).reduce((sum, item) => sum + Number(item?.workday || 0), 0);
  return { member: rowTotals.value.member || 0, wbs: rowTotals.value.wbs || 0, report: rowTotals.value.report || 0, compare: (rows.value.compare || []).filter((item) => Number(item?.variance_progress || 0) < 0).length, issue: openIssues.length, highIssue: openIssues.filter((item) => isHigh(item?.priority)).length, qualityProcess: (rows.value.qualityProcess || []).filter((item) => isAbnormal(item?.status) || isAbnormal(item?.result_detail) || isAbnormal(item?.issue_summary)).length, qualityFinal: (rows.value.qualityFinal || []).filter((item) => isAbnormal(item?.status) || isAbnormal(item?.result_summary)).length, hours, equipment: rowTotals.value.equipment || 0, deliverable: deliverables.length ? `${Math.round((doneDeliverables / deliverables.length) * 100)}%` : '0%', workday, budget: budgetAmount > 0 ? `${Math.round((usedAmount / budgetAmount) * 100)}%` : '0%' } as Record<string, any>;
});
function healthTagType(level?: string) { if (level === 'red') return 'danger'; if (level === 'yellow') return 'warning'; return 'success'; }
function healthText(level?: string) { if (level === 'red') return '红色'; if (level === 'yellow') return '黄色'; return '绿色'; }
function cardValue(key: string) { if (key === 'issue') return `${metricCards.value.issue} / 高 ${metricCards.value.highIssue}`; return metricCards.value[key] ?? 0; }
function getRouteProjectId() { const queryProjectId = Array.isArray(route.query.project_id) ? route.query.project_id[0] : route.query.project_id; return String(queryProjectId || '').trim(); }
function isLatestLoad(seq: number) { return alive && seq === workbenchLoadSeq; }
function settledValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string) { if (result.status === 'fulfilled') return result.value; console.error(`[project-workbench] load ${label} failed:`, result.reason); return fallback; }
async function loadProjects() {
  try {
    const rows = await getProjectManageSimpleList();
    if (!alive) return;
    projects.value = Array.isArray(rows) ? rows : [];
    const routeProjectId = getRouteProjectId();
    const firstProjectId = String(projects.value[0]?.rowid || '').trim();
    currentProjectId.value = routeProjectId || firstProjectId;
  } catch (error) {
    console.error('[project-workbench] load projects failed:', error);
    projects.value = [];
    currentProjectId.value = '';
  }
}
async function loadWorkbench(projectId: string) {
  const normalizedProjectId = String(projectId || '').trim();
  const seq = ++workbenchLoadSeq;
  if (!normalizedProjectId) {
    currentProject.value = null; projectHealth.value = null; rows.value = {}; rowTotals.value = {}; loading.value = false; return;
  }
  loading.value = true;
  try {
    const results = await Promise.allSettled([getProjectManage(normalizedProjectId), getProjectHealth(normalizedProjectId), ...modules.map((item) => item.loader({ pageNo: 1, page: item.needDetail ? DETAIL_PAGE_SIZE : 1, project_id: normalizedProjectId }))]);
    if (!isLatestLoad(seq)) return;
    currentProject.value = settledValue(results[0] as PromiseSettledResult<Record<string, any> | null>, null, 'project');
    projectHealth.value = settledValue(results[1] as PromiseSettledResult<Record<string, any> | null>, null, 'health');
    const nextRows: Record<string, any[]> = {};
    const nextTotals: Record<string, number> = {};
    modules.forEach((item, index) => {
      const result = results[index + 2] as PromiseSettledResult<any>;
      const stat = settledValue(result, { list: [], total: 0 }, item.key);
      nextRows[item.key] = getList(stat);
      nextTotals[item.key] = getTotal(stat);
    });
    rows.value = nextRows; rowTotals.value = nextTotals;
  } catch (error) {
    if (!isLatestLoad(seq)) return;
    console.error('[project-workbench] load failed:', error);
  } finally {
    if (isLatestLoad(seq)) loading.value = false;
  }
}
function goPath(path: string) { if (currentProjectId.value) router.push({ path, query: { project_id: currentProjectId.value } }); }
function goModule(item: ModuleEntry) { goPath(item.path); }
async function syncRoute(projectId: string) {
  const normalizedProjectId = String(projectId || '').trim();
  if (!normalizedProjectId || getRouteProjectId() === normalizedProjectId) return;
  try { await router.replace({ path: route.path, query: { ...route.query, project_id: normalizedProjectId } }); } catch (error) { console.warn('[project-workbench] sync route failed:', error); }
}
watch(currentProjectId, (projectId) => { syncRoute(projectId); loadWorkbench(projectId); });
watch(() => route.query.project_id, () => { const routeProjectId = getRouteProjectId(); if (routeProjectId && routeProjectId !== currentProjectId.value) currentProjectId.value = routeProjectId; });
onMounted(() => { loadProjects(); });
onBeforeUnmount(() => { alive = false; workbenchLoadSeq += 1; });
</script>

<template>
  <Page auto-content-height>
    <div class="mb-5 rounded-xl bg-white p-5 shadow-sm controls-block">
      <div class="flex items-center gap-2 justify-end flex-wrap">
        <ElSelect v-model="currentProjectId" filterable clearable class="!w-[320px]" placeholder="请选择项目">
          <ElOption v-for="item in projects" :key="item.rowid" :label="item.project_name || item.project_code || item.rowid" :value="item.rowid" />
        </ElSelect>
        <ElButton :loading="loading" @click="loadWorkbench(currentProjectId)">刷新</ElButton>
      </div>
    </div>

    <ElSkeleton :loading="loading" animated>
      <template #default>
        <ElEmpty v-if="!currentProjectId" description="请选择一个项目" />
        <template v-else>
          <ElCard shadow="never" class="mb-5 rounded-xl">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="font-semibold">{{ selectedProjectName }}</div>
                  <div class="mt-1 text-xs text-gray-500">项目ID：{{ currentProjectId }}</div>
                </div>
                <ElTag type="primary">Bil_Project_Info</ElTag>
              </div>
            </template>
            <ElDescriptions v-if="currentProject" :column="3" border>
              <ElDescriptionsItem label="项目编号">{{ currentProject.project_code || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="项目名称">{{ currentProject.project_name || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="项目状态">{{ currentProject.project_status ?? '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="项目进度"><ElProgress :percentage="Number(currentProject.progress || 0)" /></ElDescriptionsItem>
              <ElDescriptionsItem label="负责人">{{ currentProject.project_Manager || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="优先级">{{ currentProject.priority || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="开始日期">{{ formatYmd(currentProject.project_start_date) }}</ElDescriptionsItem>
              <ElDescriptionsItem label="计划结束">{{ formatYmd(currentProject.project_end_date) }}</ElDescriptionsItem>
              <ElDescriptionsItem label="实际结束">{{ formatYmd(currentProject.actual_end_date) }}</ElDescriptionsItem>
              <ElDescriptionsItem label="项目金额">{{ formatMoney(currentProject.project_amount) }}</ElDescriptionsItem>
            </ElDescriptions>
            <ElEmpty v-else description="未读取到项目基本信息" />
          </ElCard>

          <ElCard shadow="never" class="mb-5 rounded-xl">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div class="font-semibold">项目健康度</div>
                <ElTag :type="healthTagType(projectHealth?.level)">{{ healthText(projectHealth?.level) }}</ElTag>
              </div>
            </template>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div class="rounded-lg border border-gray-100 p-3"><div class="text-xs text-gray-500">进度最小偏差</div><div class="mt-2 text-xl font-semibold">{{ projectHealth?.metrics?.minVarianceProgress ?? 0 }}%</div></div>
              <div class="rounded-lg border border-gray-100 p-3"><div class="text-xs text-gray-500">成本使用率</div><div class="mt-2 text-xl font-semibold">{{ projectHealth?.metrics?.costUsageRate ?? 0 }}%</div></div>
              <div class="rounded-lg border border-gray-100 p-3"><div class="text-xs text-gray-500">成果完成率</div><div class="mt-2 text-xl font-semibold">{{ projectHealth?.metrics?.deliverableDoneRate ?? 0 }}%</div></div>
            </div>
            <div v-if="projectHealth?.reasons?.length" class="mt-3 text-sm text-gray-500"><div v-for="reason in projectHealth.reasons" :key="reason">{{ reason }}</div></div>
            <div v-else class="mt-3 text-sm text-gray-500">未触发红黄健康度规则。</div>
          </ElCard>

          <ElCard shadow="never" class="mb-5 rounded-xl">
            <template #header><div class="font-semibold">业务动作入口</div></template>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div v-for="action in businessActions" :key="action.title" class="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div class="flex items-center gap-2"><ElTag size="small" type="info">{{ action.tag }}</ElTag><span class="text-sm font-medium">{{ action.title }}</span></div>
                <ElButton type="primary" link @click="goPath(action.path)">进入</ElButton>
              </div>
            </div>
          </ElCard>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ElCard v-for="item in modules" :key="item.key" shadow="hover" class="rounded-xl">
              <div class="flex min-h-[118px] flex-col justify-between gap-4">
                <div class="flex items-start justify-between gap-3"><div><div class="text-sm text-gray-500">{{ item.tableName }}</div><div class="mt-2 text-lg font-semibold">{{ item.title }}</div></div><ElTag size="small" type="info">{{ item.tag }}</ElTag></div>
                <div class="flex items-end justify-between gap-3"><div><div class="text-3xl font-semibold">{{ cardValue(item.key) }}</div><div class="text-xs text-gray-500">当前项目聚合指标</div></div><ElButton type="primary" link @click="goModule(item)">进入</ElButton></div>
              </div>
            </ElCard>
          </div>
        </template>
      </template>
    </ElSkeleton>
  </Page>
</template>
