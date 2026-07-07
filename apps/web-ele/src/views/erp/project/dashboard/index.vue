<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger';

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

import { ElButton, ElCard, ElSkeleton, ElTag } from 'element-plus';

const router = useRouter();
const loading = ref(false);
const stats = ref({
  projectTotal: 0,
  wbsTotal: 0,
  reportTotal: 0,
  openIssueTotal: 0,
  highOpenIssueTotal: 0,
  overdueIssueTotal: 0,
  progressVarianceTotal: 0,
  qualityAbnormalTotal: 0,
  unfinishedDeliverableTotal: 0,
  overBudgetTotal: 0,
  hoursTotal: 0,
});

const quickEntries = [
  { title: '项目工作台', path: '/erp/project/workbench', tag: '闭环' },
  { title: '项目建档', path: '/erp/project/manage', tag: '主档' },
  { title: '项目成员', path: '/erp/project/manage/member', tag: '成员' },
  { title: 'WBS分解', path: '/erp/project/progress/wbs', tag: '进度' },
  { title: '进度对比', path: '/erp/project/progress/compare', tag: '预警' },
  { title: '问题跟踪', path: '/erp/project/issue', tag: '问题' },
  { title: '质量检查', path: '/erp/project/quality/process', tag: '质量' },
  { title: '成本视图', path: '/erp/project/cost/view', tag: '成本' },
];

const statCards = computed<Array<{ label: string; value: number; path: string; type: TagType }>>(() => [
  { label: '项目总数', value: stats.value.projectTotal, path: '/erp/project/manage', type: 'primary' },
  { label: 'WBS任务', value: stats.value.wbsTotal, path: '/erp/project/progress/wbs', type: 'success' },
  { label: '进度报告', value: stats.value.reportTotal, path: '/erp/project/progress/report', type: 'info' },
  { label: '进度偏差数', value: stats.value.progressVarianceTotal, path: '/erp/project/progress/compare', type: 'warning' },
  { label: '未关闭问题', value: stats.value.openIssueTotal, path: '/erp/project/issue', type: 'warning' },
  { label: '高优先级未关闭', value: stats.value.highOpenIssueTotal, path: '/erp/project/issue', type: 'danger' },
  { label: '逾期未解决', value: stats.value.overdueIssueTotal, path: '/erp/project/issue', type: 'danger' },
  { label: '质量异常', value: stats.value.qualityAbnormalTotal, path: '/erp/project/quality/process', type: 'danger' },
  { label: '成果未完成', value: stats.value.unfinishedDeliverableTotal, path: '/erp/project/deliverable', type: 'warning' },
  { label: '成本超预算', value: stats.value.overBudgetTotal, path: '/erp/project/cost/view', type: 'danger' },
  { label: '工时记录', value: stats.value.hoursTotal, path: '/erp/project/resource/hours', type: 'info' },
]);

function getTotal(res: any) {
  return Number(res?.total ?? res?.data?.total ?? 0) || 0;
}

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

function isClosedStatus(status: any) {
  return ['closed', 'resolved', 'done', 'completed', '已关闭', '已解决', '完成'].includes(String(status || '').toLowerCase());
}

function isAbnormalStatus(status: any) {
  return ['failed', 'fail', 'abnormal', 'rectify', '不合格', '需整改', '异常', '未通过'].includes(String(status || '').toLowerCase());
}

function isFinishedStatus(status: any) {
  return ['accepted', 'archived', 'completed', 'done', '已验收', '已归档', '已完成'].includes(String(status || '').toLowerCase());
}

function go(path: string) {
  router.push(path);
}

async function loadStats() {
  loading.value = true;
  try {
    const [
      projectRes,
      wbsRes,
      reportRes,
      compareRes,
      issueRes,
      qualityProcessRes,
      qualityFinalRes,
      hoursRes,
      deliverableRes,
      costRes,
    ] = await Promise.all([
      getProjectManagePage({ pageNo: 1, page: 1 }),
      listWbs({ pageNo: 1, page: 1 }),
      listReport({ pageNo: 1, page: 1 }),
      listCompare({ pageNo: 1, page: 0 }),
      listIssue({ pageNo: 1, page: 0 }),
      listQualityProcess({ pageNo: 1, page: 0 }),
      listQualityFinal({ pageNo: 1, page: 0 }),
      listHours({ pageNo: 1, page: 1 }),
      listDeliverable({ pageNo: 1, page: 0 }),
      listCostView({ pageNo: 1, page: 0 }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const issues = getList(issueRes);
    const openIssues = issues.filter((item: any) => !isClosedStatus(item?.status));
    const qualityRows = [...getList(qualityProcessRes), ...getList(qualityFinalRes)];

    stats.value = {
      projectTotal: getTotal(projectRes),
      wbsTotal: getTotal(wbsRes),
      reportTotal: getTotal(reportRes),
      progressVarianceTotal: getList(compareRes).filter((item: any) => Number(item?.variance_progress || 0) < 0).length,
      openIssueTotal: openIssues.length,
      highOpenIssueTotal: openIssues.filter((item: any) => ['high', 'critical', '高', '紧急'].includes(String(item?.priority || '').toLowerCase())).length,
      overdueIssueTotal: openIssues.filter((item: any) => item?.due_date && String(item.due_date).slice(0, 10) < today).length,
      qualityAbnormalTotal: qualityRows.filter((item: any) => isAbnormalStatus(item?.status) || isAbnormalStatus(item?.result_summary)).length,
      unfinishedDeliverableTotal: getList(deliverableRes).filter((item: any) => !isFinishedStatus(item?.status)).length,
      overBudgetTotal: getList(costRes).filter((item: any) => Number(item?.used_amount || 0) > Number(item?.budget_amount || 0)).length,
      hoursTotal: getTotal(hoursRes),
    };
  } catch (error) {
    console.error('[project-dashboard] load stats failed:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadStats();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mb-5 rounded-xl bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-xl font-semibold">项目驾驶舱</div>
          <div class="mt-2 text-sm text-gray-500">
            汇总项目闭环指标：进度偏差、未关闭问题、质量异常、成果未完成与成本超预算。
          </div>
        </div>
        <ElButton :loading="loading" @click="loadStats">刷新</ElButton>
      </div>
    </div>

    <ElSkeleton :loading="loading" animated>
      <template #default>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ElCard v-for="item in statCards" :key="item.label" shadow="hover" class="cursor-pointer rounded-xl" @click="go(item.path)">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-gray-500">{{ item.label }}</div>
                <div class="mt-2 text-3xl font-semibold">{{ item.value }}</div>
              </div>
              <ElTag :type="item.type">查看</ElTag>
            </div>
          </ElCard>
        </div>
      </template>
    </ElSkeleton>

    <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <ElCard shadow="never" class="rounded-xl xl:col-span-2">
        <template #header><div class="font-semibold">常用入口</div></template>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div v-for="entry in quickEntries" :key="entry.path" class="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
            <div class="flex items-center gap-2">
              <ElTag size="small" type="info">{{ entry.tag }}</ElTag>
              <span class="text-sm font-medium">{{ entry.title }}</span>
            </div>
            <ElButton type="primary" link @click="go(entry.path)">进入</ElButton>
          </div>
        </div>
      </ElCard>

      <ElCard shadow="never" class="rounded-xl">
        <template #header><div class="font-semibold">闭环口径</div></template>
        <div class="space-y-3 text-sm leading-6 text-gray-500">
          <div>1. WBS 保存后回写 Bil_Project_Info.progress / project_status。</div>
          <div>2. 工时按 8 小时/工日汇总到 project_cost_workday。</div>
          <div>3. 风险类指标聚合展示，不强行新增数据库字段。</div>
        </div>
      </ElCard>
    </div>
  </Page>
</template>
