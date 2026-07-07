<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger';
type PageLoader = (params: Record<string, any>) => Promise<any>;

import { getProjectManagePage } from '#/api/erp/project/manage';
import { listData as listCostView } from '#/api/erp/project/cost/view';
import { listData as listDeliverable } from '#/api/erp/project/deliverable';
import { listData as listIssue } from '#/api/erp/project/issue';
import { listData as listQualityFinal } from '#/api/erp/project/quality/final';
import { listData as listQualityProcess } from '#/api/erp/project/quality/process';
import { listData as listCompare } from '#/api/erp/project/progress/compare';
import { listData as listReport } from '#/api/erp/project/progress/report';
import { listData as listWbs } from '#/api/erp/project/progress/wbs';
import { listData as listHours } from '#/api/erp/project/resource/hours';

import {
  ElButton,
  ElCard,
  ElCol,
  ElEmpty,
  ElProgress,
  ElRow,
  ElSkeleton,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const router = useRouter();
const loading = ref(false);
const asOf = ref(new Date());
const projects = ref<any[]>([]);
const issues = ref<any[]>([]);
const hours = ref<any[]>([]);
const deliverables = ref<any[]>([]);
const budgets = ref<any[]>([]);
const qualityRows = ref<any[]>([]);
const compareRows = ref<any[]>([]);
const wbsTotal = ref(0);
const reportTotal = ref(0);
const hoursTotal = ref(0);

const quickEntries = [
  {
    title: '项目建档',
    desc: '维护项目主档、基础信息与立项资料',
    path: '/project/manage',
    tag: '主档',
  },
  {
    title: '项目工作台',
    desc: '进入项目闭环工作台，查看项目整体情况',
    path: '/project/workbench',
    tag: '闭环',
  },
  {
    title: '成员管理',
    desc: '维护当前成员、人工成本单价与成员变更记录',
    path: '/project/manage/member',
    tag: '成员',
  },
  {
    title: 'WBS分解',
    desc: '维护项目任务分解、计划工期与负责人',
    path: '/project/progress/wbs',
    tag: '进度',
  },
  {
    title: '进度对比',
    desc: '查看计划与实际偏差，识别项目预警',
    path: '/project/progress/compare',
    tag: '预警',
  },
  {
    title: '问题跟踪',
    desc: '处理项目问题、优先级与闭环状态',
    path: '/project/issue',
    tag: '问题',
  },
  {
    title: '质量检查',
    desc: '跟踪过程质量、终检结果与异常整改',
    path: '/project/quality/process',
    tag: '质量',
  },
  {
    title: '成本视图',
    desc: '查看预算、成本使用与超预算情况',
    path: '/project/cost/view',
    tag: '成本',
  },
];

const projectMap = computed(() => {
  const map = new Map<string, any>();
  for (const project of projects.value) {
    const id = String(project?.rowid ?? project?.id ?? '').trim();
    if (id) map.set(id, project);
  }
  return map;
});
const openIssues = computed(() => issues.value.filter((item) => !isClosedStatus(item?.status)));
const dueWarningRows = computed(() => {
  const today = startOfDay(new Date());
  return projects.value.filter((project) => !isProjectCompleted(project) && project?.project_end_date).map((project) => {
    const endDate = startOfDay(new Date(project.project_end_date));
    const diffDays = diffDateDays(today, endDate);
    return { id: String(project?.rowid ?? ''), projectCode: project?.project_code || '-', projectName: project?.project_name || '-', endDate: formatDate(project?.project_end_date), diffDays, label: diffDays < 0 ? `超期 ${Math.abs(diffDays)} 天` : `${diffDays} 天后到期`, progress: clampProgress(project?.progress), type: diffDays < 0 ? 'danger' : 'warning' };
  }).filter((item) => item.diffDays <= 30).sort((a, b) => a.diffDays - b.diffDays).slice(0, 5);
});
const recentIssues = computed(() => issues.value.slice().sort((a, b) => getRowTime(b) - getRowTime(a)).slice(0, 5).map((issue) => {
  const project = projectMap.value.get(String(issue?.project_id ?? '').trim());
  return { id: issue?.id || issue?.issue_code || issue?.title, title: issue?.title || '-', projectName: project?.project_name || issue?.project_id || '-', assigneeName: issue?.assignee_id || '-', status: mapIssueStatus(issue?.status), statusType: getIssueStatusType(issue?.status), priority: mapPriority(issue?.priority), timeText: formatDate(issue?.createtime || issue?.created_at || issue?.updatetime || issue?.updated_at) };
}));
const progressRows = computed(() => projects.value.filter((project) => isProjectActive(project)).map((project) => {
  const projectId = String(project?.rowid ?? project?.id ?? '').trim();
  const endDateValue = project?.project_end_date;
  const endDate = endDateValue ? startOfDay(new Date(endDateValue)) : null;
  const overdue = !!endDate && diffDateDays(startOfDay(new Date()), endDate) < 0 && !isProjectCompleted(project);
  const progress = clampProgress(project?.progress);
  const openIssueCount = openIssues.value.filter((issue) => String(issue?.project_id ?? '').trim() === projectId).length;
  return { id: projectId, projectCode: project?.project_code || '-', projectName: project?.project_name || '-', managerName: project?.project_Manager || project?.project_manager_id || '-', progress, statusLabel: overdue ? '延期' : mapProjectStatus(project?.project_status), statusType: overdue ? 'danger' : getProjectStatusType(project?.project_status), endDate: formatDate(endDateValue), issueCount: openIssueCount };
}).sort((a, b) => String(a.projectCode).localeCompare(String(b.projectCode))).slice(0, 10));
const monthAcceptance = computed(() => {
  const month = currentMonthText();
  const monthRows = deliverables.value.filter((item) => String(item?.submit_date || '').slice(0, 7) === month);
  const accepted = monthRows.filter((item) => String(item?.status || '') === '已验收').length;
  return { accepted, total: monthRows.length, rate: monthRows.length ? Math.round((accepted / monthRows.length) * 100) : 0 };
});
const topStats = computed(() => ({ active: projects.value.filter((project) => isProjectActive(project)).length, newThisMonth: projects.value.filter((project) => isSameMonth(project?.createtime || project?.created_at)).length, dueCount: dueWarningRows.value.length, overdueCount: dueWarningRows.value.filter((item) => item.diffDays < 0).length, openIssueCount: openIssues.value.length, pendingIssueCount: openIssues.value.filter((item) => String(item?.status || '').toLowerCase() === 'open').length, accepted: monthAcceptance.value.accepted, acceptRate: monthAcceptance.value.rate }));
const bottomStats = computed(() => {
  const month = currentMonthText();
  const monthHours = hours.value.filter((item) => String(item?.work_date || '').slice(0, 7) === month);
  const people = new Set(monthHours.map((item) => String(item?.user_rowid || item?.user_name || '').trim()).filter(Boolean)).size;
  const totalHours = monthHours.reduce((sum, item) => sum + Number(item?.hours || 0), 0);
  const deliverableCount = deliverables.value.length;
  const costUsed = budgets.value.reduce((sum, item) => sum + Number(item?.used_amount || 0), 0);
  return { people, totalHours, deliverableCount, costUsed };
});
const closureCards = computed<Array<{ label: string; value: number; path: string; type: TagType }>>(() => [
  { label: '项目总数', value: projects.value.length, path: '/project/manage', type: 'primary' },
  { label: 'WBS任务', value: wbsTotal.value, path: '/project/progress/wbs', type: 'success' },
  { label: '进度报告', value: reportTotal.value, path: '/project/progress/report', type: 'info' },
  { label: '进度偏差数', value: compareRows.value.filter((item) => Number(item?.variance_progress || 0) < 0).length, path: '/project/progress/compare', type: 'warning' },
  { label: '未关闭问题', value: openIssues.value.length, path: '/project/issue', type: 'warning' },
  { label: '质量异常', value: qualityRows.value.filter((item) => isQualityAbnormal(item)).length, path: '/project/quality/process', type: 'danger' },
  { label: '成果未完成', value: deliverables.value.filter((item) => !isFinishedStatus(item?.status)).length, path: '/project/deliverable', type: 'warning' },
  { label: '成本超预算', value: budgets.value.filter((item) => Number(item?.used_amount || 0) > Number(item?.budget_amount || 0)).length, path: '/project/cost/view', type: 'danger' },
]);
const asOfText = computed(() => {
  const date = asOf.value; const yyyy = date.getFullYear(); const mm = String(date.getMonth() + 1).padStart(2, '0'); const dd = String(date.getDate()).padStart(2, '0'); const hh = String(date.getHours()).padStart(2, '0'); const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
});
function getTotal(res: any) { return Number(res?.total ?? res?.data?.total ?? 0) || 0; }
function getList(res: any) { return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : []; }
async function fetchAllByPages(loader: PageLoader, params: Record<string, any> = {}, page = 200, maxRows = 5000) {
  const rows: any[] = []; const firstRes = await loader({ ...params, pageNo: 1, page }); rows.push(...getList(firstRes));
  const total = getTotal(firstRes); const totalPages = Math.ceil(total / page);
  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) { if (rows.length >= maxRows) break; const res = await loader({ ...params, pageNo, page }); rows.push(...getList(res)); }
  return rows.slice(0, maxRows);
}
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function diffDateDays(from: Date, to: Date) { const ms = 24 * 60 * 60 * 1000; return Math.floor((to.getTime() - from.getTime()) / ms); }
function currentMonthText() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function formatDate(value: any) { if (!value) return '-'; const str = String(value); if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10); const date = new Date(value); if (Number.isNaN(date.getTime())) return str.slice(0, 10) || '-'; const yyyy = date.getFullYear(); const mm = String(date.getMonth() + 1).padStart(2, '0'); const dd = String(date.getDate()).padStart(2, '0'); return `${yyyy}-${mm}-${dd}`; }
function isSameMonth(value: any) { if (!value) return false; return formatDate(value).slice(0, 7) === currentMonthText(); }
function getRowTime(row: any) { const value = row?.createtime || row?.created_at || row?.updatetime || row?.updated_at || row?.updateTime; const time = value ? new Date(value).getTime() : 0; return Number.isFinite(time) ? time : 0; }
function clampProgress(value: any) { const n = Number(value || 0); if (!Number.isFinite(n)) return 0; return Math.min(100, Math.max(0, Math.round(n))); }
function formatWan(value: any) { const n = Number(value || 0); if (!Number.isFinite(n)) return '0万'; const wan = n / 10_000; return `${wan >= 100 ? wan.toFixed(0) : wan.toFixed(1)}万`; }
function isClosedStatus(status: any) { return ['closed', 'resolved', 'done', 'completed', '已关闭', '已解决', '完成'].includes(String(status || '').toLowerCase()); }
function isAbnormalStatus(status: any) { return ['failed', 'fail', 'abnormal', 'rectify', '不合格', '需整改', '异常', '未通过'].includes(String(status || '').toLowerCase()); }
function isQualityAbnormal(item: any) { return isAbnormalStatus(item?.status) || isAbnormalStatus(item?.issue_summary) || isAbnormalStatus(item?.result_summary) || isAbnormalStatus(item?.rectify_requirement) || isAbnormalStatus(item?.acceptance_opinion) || isAbnormalStatus(item?.description); }
function isFinishedStatus(status: any) { return ['accepted', 'archived', 'completed', 'done', '已验收', '已归档', '已完成'].includes(String(status || '').toLowerCase()); }
function isProjectCompleted(project: any) { return Number(project?.project_status) === 2 || String(project?.project_status || '').toLowerCase() === 'completed'; }
function isProjectActive(project: any) { if (!project) return false; if (isProjectCompleted(project)) return false; const status = Number(project?.project_status); if ([0, 1, 3].includes(status)) return true; const text = String(project?.project_status || '').toLowerCase(); return ['planning', 'in_progress', 'paused'].includes(text); }
function mapProjectStatus(status: any) { const n = Number(status); if (n === 0) return '未开始'; if (n === 1) return '进行中'; if (n === 2) return '已完成'; if (n === 3) return '已暂停'; const text = String(status || ''); if (text === 'planning') return '未开始'; if (text === 'in_progress') return '进行中'; if (text === 'completed') return '已完成'; if (text === 'paused') return '已暂停'; return text || '-'; }
function getProjectStatusType(status: any): TagType { const n = Number(status); if (n === 1) return 'success'; if (n === 2) return 'info'; if (n === 3) return 'warning'; return 'primary'; }
function mapIssueStatus(status: any) { const text = String(status || 'open').toLowerCase(); if (text === 'open') return '待处理'; if (text === 'in_progress') return '处理中'; if (text === 'resolved') return '已解决'; if (text === 'closed') return '已关闭'; return String(status || '-'); }
function getIssueStatusType(status: any): TagType { const text = String(status || '').toLowerCase(); if (text === 'open') return 'danger'; if (text === 'in_progress') return 'primary'; if (text === 'resolved' || text === 'closed') return 'success'; return 'info'; }
function mapPriority(priority: any) { const text = String(priority || '').toLowerCase(); if (text === 'critical') return '紧急'; if (text === 'high') return '高'; if (text === 'low') return '低'; if (text === 'normal') return '普通'; return String(priority || '-'); }
function go(path: string) { router.push(path); }
async function loadDashboard() {
  loading.value = true;
  try {
    const [projectRows, issueRows, hourRows, deliverableRows, budgetRows, compareDataRows, qualityProcessRows, qualityFinalRows, wbsRes, reportRes, hoursRes] = await Promise.all([
      fetchAllByPages(getProjectManagePage), fetchAllByPages(listIssue), fetchAllByPages(listHours), fetchAllByPages(listDeliverable), fetchAllByPages(listCostView), fetchAllByPages(listCompare), fetchAllByPages(listQualityProcess), fetchAllByPages(listQualityFinal), listWbs({ pageNo: 1, page: 1 }), listReport({ pageNo: 1, page: 1 }), listHours({ pageNo: 1, page: 1 }),
    ]);
    projects.value = projectRows; issues.value = issueRows; hours.value = hourRows; deliverables.value = deliverableRows; budgets.value = budgetRows; compareRows.value = compareDataRows; qualityRows.value = [...qualityProcessRows, ...qualityFinalRows]; wbsTotal.value = getTotal(wbsRes); reportTotal.value = getTotal(reportRes); hoursTotal.value = getTotal(hoursRes); asOf.value = new Date();
  } catch (error) {
    console.error('[project-dashboard] load dashboard failed:', error);
    projects.value = []; issues.value = []; hours.value = []; deliverables.value = []; budgets.value = []; compareRows.value = []; qualityRows.value = []; wbsTotal.value = 0; reportTotal.value = 0; hoursTotal.value = 0;
  } finally { loading.value = false; }
}
onMounted(() => { loadDashboard(); });
</script>

<template>
  <Page auto-content-height>
    <div class="project-dashboard-page">
      <div class="dashboard-actions-row">
        <ElSpace>
          <span class="as-of-text">数据更新时间：{{ asOfText }}</span>
          <ElButton :loading="loading" @click="loadDashboard">刷新</ElButton>
        </ElSpace>
      </div>

      <ElSkeleton :loading="loading" animated>
        <template #default>
          <ElRow :gutter="12" class="dashboard-row">
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="metric-card metric-blue">
                <div class="metric-label">在建项目</div>
                <div class="metric-value">{{ topStats.active }}</div>
                <div class="metric-desc">本月新增 {{ topStats.newThisMonth }} 个</div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="metric-card metric-orange">
                <div class="metric-label">到期预警</div>
                <div class="metric-value">{{ topStats.dueCount }}</div>
                <div class="metric-desc">{{ topStats.overdueCount }} 个已超期</div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="metric-card metric-red">
                <div class="metric-label">未闭环问题</div>
                <div class="metric-value">{{ topStats.openIssueCount }}</div>
                <div class="metric-desc">待处理 {{ topStats.pendingIssueCount }} 个</div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="metric-card metric-green">
                <div class="metric-label">本月验收</div>
                <div class="metric-value">{{ topStats.accepted }}</div>
                <div class="metric-desc">完成率 {{ topStats.acceptRate }}%</div>
              </ElCard>
            </ElCol>
          </ElRow>

          <ElRow :gutter="12" class="dashboard-row">
            <ElCol :xs="24" :lg="16">
              <ElCard shadow="never" class="dashboard-card table-card">
                <template #header>
                  <div class="card-header-line"><span>在建项目进度</span>
                    <!--  <ElButton type="primary" link @click="go('/project/manage')">查看全部</ElButton> -->
                  </div>
                </template>
                <ElTable :data="progressRows" height="320" border stripe>
                  <ElTableColumn prop="projectCode" label="项目编号" min-width="130" />
                  <ElTableColumn prop="projectName" label="项目名称" min-width="220" show-overflow-tooltip />
                  <ElTableColumn prop="managerName" label="项目经理" min-width="120" show-overflow-tooltip />
                  <ElTableColumn prop="progress" label="进度" min-width="180"><template #default="{ row }">
                      <div class="progress-cell">
                        <ElProgress :percentage="row.progress" :stroke-width="8" />
                      </div>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn prop="statusLabel" label="状态" min-width="110" align="center"><template
                      #default="{ row }">
                      <ElTag :type="row.statusType">{{ row.statusLabel }}</ElTag>
                    </template></ElTableColumn>
                  <ElTableColumn prop="endDate" label="截止日期" min-width="120" />
                  <ElTableColumn prop="issueCount" label="问题数" min-width="90" align="right"><template
                      #default="{ row }"><span :class="row.issueCount > 0 ? 'danger-text' : ''">{{ row.issueCount
                      }}</span></template>
                  </ElTableColumn>
                  <template #empty>
                    <ElEmpty description="暂无在建项目" />
                  </template>
                </ElTable>
              </ElCard>
            </ElCol>

            <ElCol :xs="24" :lg="8">
              <ElCard shadow="never" class="dashboard-card side-card compact-side-card">
                <template #header>
                  <div class="card-header-line"><span>到期预警</span>
                    <ElTag type="warning" size="small">30天内</ElTag>
                  </div>
                </template>
                <div v-if="dueWarningRows.length === 0" class="empty-side">
                  <ElEmpty description="暂无到期预警" />
                </div>
                <div v-else class="side-list">
                  <div v-for="item in dueWarningRows" :key="item.id" class="side-item">
                    <div class="side-item-top">
                      <div class="side-title">{{ item.projectName }}</div>
                      <ElTag :type="item.type" size="small">{{ item.label }}</ElTag>
                    </div>
                    <div class="side-meta">截止：{{ item.endDate }} ｜ {{ item.projectCode }}</div>
                    <ElProgress :percentage="item.progress" :stroke-width="8" />
                  </div>
                </div>
              </ElCard>

              <ElCard shadow="never" class="dashboard-card side-card compact-side-card mt-3">
                <template #header>
                  <div class="card-header-line">
                    <span>近期问题</span><!-- <ElButton type="primary" link @click="go('/project/issue')">查看全部</ElButton> -->
                  </div>
                </template>
                <div v-if="recentIssues.length === 0" class="empty-side">
                  <ElEmpty description="暂无问题" />
                </div>
                <div v-else class="side-list">
                  <div v-for="item in recentIssues" :key="item.id" class="issue-item">
                    <div>
                      <div class="side-title">{{ item.title }}</div>
                      <div class="side-meta">{{ item.projectName }}</div>
                      <div class="side-meta">处理人：{{ item.assigneeName }} ｜ 优先级：{{ item.priority }}</div>
                    </div>
                    <div class="issue-status">
                      <ElTag :type="item.statusType" size="small">{{ item.status }}</ElTag><span class="side-meta">{{
                        item.timeText
                      }}</span>
                    </div>
                  </div>
                </div>
              </ElCard>
            </ElCol>
          </ElRow>

          <ElRow :gutter="12" class="dashboard-row compact-stat-row">
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="bottom-card mini-bottom-card">
                <div class="bottom-label">投入人员</div>
                <div class="bottom-value">{{ bottomStats.people }}人</div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="bottom-card mini-bottom-card">
                <div class="bottom-label">本月工时</div>
                <div class="bottom-value">{{ Math.round(bottomStats.totalHours).toLocaleString() }}h</div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="bottom-card mini-bottom-card">
                <div class="bottom-label">成果文件</div>
                <div class="bottom-value">{{ bottomStats.deliverableCount }}份</div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :sm="12" :lg="6">
              <ElCard shadow="never" class="bottom-card mini-bottom-card">
                <div class="bottom-label">项目成本</div>
                <div class="bottom-value">¥{{ formatWan(bottomStats.costUsed) }}</div>
              </ElCard>
            </ElCol>
          </ElRow>

          <ElRow :gutter="12" class="dashboard-row bottom-dashboard-row">
            <ElCol :xs="24" :lg="16">
              <ElCard shadow="never" class="dashboard-card">
                <template #header>
                  <div class="card-header-line">
                    <span>常用入口</span>
                    <span class="header-desc">按项目业务链路快速进入对应模块</span>
                  </div>
                </template>
                <div class="entry-grid compact-entry-grid dashboard-entry-grid">
                  <div
                    v-for="entry in quickEntries"
                    :key="entry.path"
                    class="entry-card"
                    @click="go(entry.path)"
                  >
                    <div class="entry-card-top">
                      <ElTag size="small" type="info">{{ entry.tag }}</ElTag>
                      <span class="entry-card-action">进入</span>
                    </div>
                    <div class="entry-card-title">{{ entry.title }}</div>
                    <div class="entry-card-desc">{{ entry.desc }}</div>
                  </div>
                </div>
              </ElCard>
            </ElCol>
            <ElCol :xs="24" :lg="8">
              <ElCard shadow="never" class="dashboard-card closure-card">
                <template #header>
                  <div class="card-header-line">
                    <span>闭环指标</span>
                    <span class="header-desc">关键指标快速查看</span>
                  </div>
                </template>
                <div class="closure-grid compact-closure-grid dashboard-closure-grid">
                  <div
                    v-for="item in closureCards"
                    :key="item.label"
                    class="closure-item"
                    @click="go(item.path)"
                  >
                    <div class="closure-item-label">{{ item.label }}</div>
                    <ElTag :type="item.type">{{ item.value }}</ElTag>
                  </div>
                </div>
              </ElCard>
            </ElCol>
          </ElRow>
        </template>
      </ElSkeleton>
    </div>
  </Page>
</template>

<style scoped>
.project-dashboard-page {
  padding: 10px;
}

.dashboard-actions-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.dashboard-row {
  margin-bottom: 12px;
}

.bottom-dashboard-row {
  margin-bottom: 0;
}

.dashboard-card,
.metric-card,
.bottom-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
}

.dashboard-card :deep(.el-card__header) {
  padding: 10px 14px;
}

.dashboard-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.card-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 24px;
  font-weight: 600;
}

.header-desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}

.as-of-text {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.metric-card :deep(.el-card__body) {
  min-height: 86px;
  padding: 13px 15px;
}

.metric-label {
  font-size: 13px;
  opacity: 0.92;
}

.metric-value {
  margin-top: 7px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.metric-desc {
  margin-top: 7px;
  font-size: 12px;
  opacity: 0.9;
}

.metric-blue,
.metric-orange,
.metric-red,
.metric-green {
  color: #fff;
}

.metric-blue {
  background: linear-gradient(135deg, #2563eb, #60a5fa);
}

.metric-orange {
  background: linear-gradient(135deg, #f97316, #fbbf24);
}

.metric-red {
  background: linear-gradient(135deg, #ef4444, #fb7185);
}

.metric-green {
  background: linear-gradient(135deg, #059669, #34d399);
}

.table-card :deep(.el-card__body),
.compact-table-card :deep(.el-card__body) {
  padding: 0;
}

.compact-table-card :deep(.el-table) {
  font-size: 12px;
}

.compact-table-card :deep(.el-table .cell) {
  line-height: 20px;
}

.progress-cell {
  min-width: 130px;
}

.danger-text {
  color: var(--el-color-danger);
  font-weight: 600;
}

.compact-side-card :deep(.el-card__body) {
  min-height: 0;
  max-height: 182px;
  overflow: auto;
  padding: 10px 12px;
}

.side-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side-item,
.issue-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  padding: 8px 10px;
}

.side-item-top,
.issue-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.side-title {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.side-meta {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.issue-status {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.empty-side {
  padding: 0;
}

.empty-side :deep(.el-empty) {
  padding: 8px 0;
}

.mini-bottom-card :deep(.el-card__body) {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
}

.bottom-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.bottom-value {
  margin-top: 0;
  color: var(--el-text-color-primary);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.entry-grid {
  display: grid;
  gap: 10px;
}

.compact-entry-grid,
.dashboard-entry-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.entry-card {
  display: flex;
  min-height: 92px;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  padding: 11px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.entry-card:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
  transform: translateY(-1px);
}

.entry-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.entry-card-title {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}

.entry-card-desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.entry-card-action {
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 500;
}

.closure-grid {
  display: grid;
  gap: 8px;
}

.compact-closure-grid,
.dashboard-closure-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.closure-item {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.closure-item:hover {
  background: var(--el-fill-color-light);
}

.closure-item-label {
  line-height: 1.35;
}

@media (max-width: 1400px) {
  .compact-entry-grid,
  .dashboard-entry-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .compact-entry-grid,
  .dashboard-entry-grid,
  .compact-closure-grid,
  .dashboard-closure-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .compact-side-card :deep(.el-card__body) {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .card-header-line,
  .issue-item {
    align-items: stretch;
    flex-direction: column;
  }

  .compact-entry-grid,
  .dashboard-entry-grid,
  .compact-closure-grid,
  .dashboard-closure-grid {
    grid-template-columns: 1fr;
  }

  .issue-status {
    align-items: flex-start;
  }

  .dashboard-actions-row {
    justify-content: stretch;
  }

  .mini-bottom-card :deep(.el-card__body) {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
