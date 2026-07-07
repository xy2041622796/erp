<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
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
const currentProjectId = ref('');
const currentProject = ref<Record<string, any> | null>(null);
const projectHealth = ref<Record<string, any> | null>(null);
const rows = ref<Record<string, any[]>>({});
const rowTotals = ref<Record<string, number>>({});

const businessActions = [
  { title: '成员变更', path: '/erp/project/manage/member', tag: '成员' },
  { title: '新增 WBS', path: '/erp/project/progress/wbs', tag: '进度' },
  { title: '新增进度报告', path: '/erp/project/progress/report', tag: '报告' },
  { title: '质量异常生成问题', path: '/erp/project/quality/process', tag: '质量' },
  { title: '检查项目完成条件', path: '/erp/project/deliverable', tag: '成果' },
];

const modules: ModuleEntry[] = [
  { key: 'member', title: '成员数', tableName: 'project_members', path: '/erp/project/manage/member', tag: '成员', loader: listMember },
  { key: 'wbs', title: 'WBS数', tableName: 'project_progress', path: '/erp/project/progress/wbs', tag: '进度', loader: listWbs },
  { key: 'report', title: '进度报告数', tableName: 'project_progress_report', path: '/erp/project/progress/report', tag: '进度', loader: listReport },
  { key: 'compare', title: '进度偏差数', tableName: 'project_progress_compare', path: '/erp/project/progress/compare', tag: '预警', loader: listCompare, needDetail: true },
  { key: 'issue', title: '未关闭问题数', tableName: 'project_issues', path: '/erp/project/issue', tag: '问题', loader: listIssue, needDetail: true },
  { key: 'qualityProcess', title: '质量异常数', tableName: 'project_quality_process', path: '/erp/project/quality/process', tag: '质量', loader: listQualityProcess, needDetail: true },
  { key: 'qualityFinal', title: '最终质量异常', tableName: 'project_quality_final', path: '/erp/project/quality/final', tag: '质量', loader: listQualityFinal, needDetail: true },
  { key: 'hours', title: '工时合计', tableName: 'project_resource_hours', path: '/erp/project/resource/hours', tag: '资源', loader: listHours, needDetail: true },
  { key: 'equipment', title: '设备数', tableName: 'project_resource_equipment', path: '/erp/project/resource/equipment', tag: '资源', loader: listEquipment },
  { key: 'deliverable', title: '成果完成率', tableName: 'project_deliverables', path: '/erp/project/deliverable', tag: '成果', loader: listDeliverable, needDetail: true },
  { key: 'workday', title: '工日合计', tableName: 'project_cost_workday', path: '/erp/project/cost/workday', tag: '成本', loader: listCostWorkday, needDetail: true },
  { key: 'budget', title: '成本使用率', tableName: 'project_budgets', path: '/erp/project/cost/view', tag: '成本', loader: listCostView, needDetail: true },
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
  return {
    member: rowTotals.value.member || 0,
    wbs: rowTotals.value.wbs || 0,
    report: rowTotals.value.report || 0,
    compare: (rows.value.compare || []).filter((item) => Number(item?.variance_progress || 0) < 0).length,
    issue: openIssues.length,
    highIssue: openIssues.filter((item) => isHigh(item?.priority)).length,
    qualityProcess: (rows.value.qualityProcess || []).filter((item) => isAbnormal(item?.status) || isAbnormal(item?.result_detail) || isAbnormal(item?.issue_summary)).length,
    qualityFinal: (rows.value.qualityFinal || []).filter((item) => isAbnormal(item?.status) || isAbnormal(item?.result_summary)).length,
    hours,
    equipment: rowTotals.value.equipment || 0,
    deliverable: deliverables.length ? `${Math.round((doneDeliverables / deliverables.length) * 100)}%` : '0%',
    workday,
    budget: budgetAmount > 0 ? `${Math.round((usedAmount / budgetAmount) * 100)}%` : '0%',
  } as Record<string, any>;
});

function healthTagType(level?: string) {
  if (level === 'red') return 'danger';
  if (level === 'yellow') return 'warning';
  return 'success';
}

function healthText(level?: string) {
  if (level === 'red') return '红色';
  if (level === 'yellow') return '黄色';
  return '绿色';
}

function cardValue(key: string) {
  if (key === 'issue') return `${metricCards.value.issue} / 高 ${metricCards.value.highIssue}`;
  return metricCards.value[key] ?? 0;
}

async function loadProjects() {
  projects.value = await getProjectManageSimpleList();
  const queryProjectId = Array.isArray(route.query.project_id) ? route.query.project_id[0] : route.query.project_id;
  currentProjectId.value = String(queryProjectId || projects.value[0]?.rowid || '');
}

async function loadWorkbench(projectId: string) {
  if (!projectId) { currentProject.value = null; projectHealth.value = null; rows.value = {}; rowTotals.value = {}; return; }
  loading.value = true;
  try {
    const [project, health, ...stats] = await Promise.all([getProjectManage(projectId), getProjectHealth(projectId), ...modules.map((item) => item.loader({ pageNo: 1, page: item.needDetail ? 0 : 1, project_id: projectId }))]);
    currentProject.value = project;
    projectHealth.value = health;
    const nextRows: Record<string, any[]> = {};
    const nextTotals: Record<string, number> = {};
    modules.forEach((item, index) => {
      nextRows[item.key] = getList(stats[index]);
      nextTotals[item.key] = getTotal(stats[index]);
    });
    rows.value = nextRows;
    rowTotals.value = nextTotals;
  } catch (error) {
    console.error('[project-workbench] load failed:', error);
    currentProject.value = null;
    projectHealth.value = null;
    rows.value = {};
    rowTotals.value = {};
  } finally { loading.value = false; }
}

function goPath(path: string) { if (currentProjectId.value) router.push({ path, query: { project_id: currentProjectId.value } }); }
function goModule(item: ModuleEntry) { goPath(item.path); }
function syncRoute(projectId: string) { if (projectId && route.query.project_id !== projectId) router.replace({ path: route.path, query: { ...route.query, project_id: projectId } }); }
watch(currentProjectId, (projectId) => { syncRoute(projectId); loadWorkbench(projectId); });
onMounted(() => { loadProjects(); });
</script>

<template>
  <Page auto-content-height>
    <div class="mb-5 rounded-xl bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="text-xl font-semibold">项目详情工作台</div>
          <div class="mt-2 text-sm text-gray-500">围绕单个 Bil_Project_Info.rowid 聚合项目上下文和业务闭环指标。</div>
        </div>
        <div class="flex items-center gap-2">
          <ElSelect v-model="currentProjectId" filterable clearable class="!w-[320px]" placeholder="请选择项目">
            <ElOption v-for="item in projects" :key="item.rowid" :label="item.project_name || item.project_code || item.rowid" :value="item.rowid" />
          </ElSelect>
          <ElButton :loading="loading" @click="loadWorkbench(currentProjectId)">刷新</ElButton>
        </div>
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
              <div class="rounded-lg border border-gray-100 p-3">
                <div class="text-xs text-gray-500">进度最小偏差</div>
                <div class="mt-2 text-xl font-semibold">{{ projectHealth?.metrics?.minVarianceProgress ?? 0 }}%</div>
              </div>
              <div class="rounded-lg border border-gray-100 p-3">
                <div class="text-xs text-gray-500">成本使用率</div>
                <div class="mt-2 text-xl font-semibold">{{ projectHealth?.metrics?.costUsageRate ?? 0 }}%</div>
              </div>
              <div class="rounded-lg border border-gray-100 p-3">
                <div class="text-xs text-gray-500">成果完成率</div>
                <div class="mt-2 text-xl font-semibold">{{ projectHealth?.metrics?.deliverableDoneRate ?? 0 }}%</div>
              </div>
            </div>
            <div v-if="projectHealth?.reasons?.length" class="mt-3 text-sm text-gray-500">
              <div v-for="reason in projectHealth.reasons" :key="reason">{{ reason }}</div>
            </div>
            <div v-else class="mt-3 text-sm text-gray-500">未触发红黄健康度规则。</div>
          </ElCard>

          <ElCard shadow="never" class="mb-5 rounded-xl">
            <template #header><div class="font-semibold">业务动作入口</div></template>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div v-for="action in businessActions" :key="action.title" class="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div class="flex items-center gap-2">
                  <ElTag size="small" type="info">{{ action.tag }}</ElTag>
                  <span class="text-sm font-medium">{{ action.title }}</span>
                </div>
                <ElButton type="primary" link @click="goPath(action.path)">进入</ElButton>
              </div>
            </div>
          </ElCard>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ElCard v-for="item in modules" :key="item.key" shadow="hover" class="rounded-xl">
              <div class="flex min-h-[118px] flex-col justify-between gap-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-sm text-gray-500">{{ item.tableName }}</div>
                    <div class="mt-2 text-lg font-semibold">{{ item.title }}</div>
                  </div>
                  <ElTag size="small" type="info">{{ item.tag }}</ElTag>
                </div>
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <div class="text-3xl font-semibold">{{ cardValue(item.key) }}</div>
                    <div class="text-xs text-gray-500">当前项目聚合指标</div>
                  </div>
                  <ElButton type="primary" link @click="goModule(item)">进入</ElButton>
                </div>
              </div>
            </ElCard>
          </div>
        </template>
      </template>
    </ElSkeleton>
  </Page>
</template>
