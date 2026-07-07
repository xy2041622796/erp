<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStaffById } from '#/api/common/staff-selector';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import {
  createData,
  deleteData,
  getDetail,
  listData,
  syncProgressToProject,
  updateData,
} from '#/api/erp/project/progress/report';
import { listData as listWbs } from '#/api/erp/project/progress/wbs';
import Form from '#/views/project/_shared/ProjectSubmoduleCrudForm.vue';
import { normalizeDateFields } from '#/views/project/_shared/crud';

import { progressReportConfig } from './data';

import {
  ElButton,
  ElCard,
  ElMessage,
  ElMessageBox,
  ElProgress,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

const activeTab = ref<'日报' | '周报'>('日报');
const dataTable = ref<any>(null);
const currentRows = ref<Record<string, any>[]>([]);
const projectNameMap = ref<Record<string, string>>({});
const userStore = useUserStore();

const normalizers = {
  async afterLoad(values: Record<string, any>) {
    const next = normalizeDateFields(values, ['report_date']);
    if (!next.reporter_name && next.reporter_id) {
      const staff = await getStaffById(String(next.reporter_id));
      if (staff?.UserName) {
        next.reporter_name = staff.UserName;
      }
    }
    return next;
  },
  async beforeSubmit(values: Record<string, any>) {
    const next = normalizeDateFields(values, ['report_date']);
    next.report_type = String(next.report_type || activeTab.value || '日报') === '周报' ? '周报' : '日报';
    if (next.reporter_id) {
      const staff = await getStaffById(String(next.reporter_id));
      if (staff?.UserName) {
        next.reporter_name = staff.UserName;
      }
    }
    next.report_code = String(next.report_code || '').trim() || buildReportCode(String(next.report_type || '日报') === '周报' ? '周报' : '日报');
    next.report_date = next.report_date || formatDateOnly();
    if (String(next.report_type || '') === '周报' && !String(next.week_text || '').trim()) {
      next.week_text = buildWeekText(String(next.report_date || formatDateOnly()));
    }
    return next;
  },
};

const stats = computed(() => ({
  currentCount: currentRows.value.length,
  submittedCount: currentRows.value.filter((item) => String(item?.status || '') === '已提交').length,
  draftCount: currentRows.value.filter((item) => String(item?.status || '') === '草稿').length,
}));

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

async function loadProjectNameMap() {
  const rows = await getProjectManageSimpleList();
  const map: Record<string, string> = {};
  for (const item of Array.isArray(rows) ? rows : []) {
    const rowid = String((item as any)?.rowid || '').trim();
    const projectId = String((item as any)?.project_id || '').trim();
    const code = String((item as any)?.project_code || '').trim();
    const name = String((item as any)?.project_name || code || rowid || projectId).trim();
    for (const key of [rowid, projectId, code].filter(Boolean)) {
      map[key] = name;
    }
  }
  projectNameMap.value = map;
}

function getProjectLabel(row: Record<string, any>) {
  const projectName = String(row?.project_name || '').trim();
  if (projectName) return projectName;
  const projectId = String(row?.project_id || '').trim();
  const projectCode = String(row?.project_code || '').trim();
  return String(projectNameMap.value[projectId] || projectNameMap.value[projectCode] || projectId || projectCode || '-').trim() || '-';
}

function getRowProgress(row: Record<string, any>) {
  return row?.progress_percent ?? row?.progress ?? row?.progress_rate ?? row?.completion_rate ?? row?.complete_rate ?? row?.percent ?? 0;
}

function normalizeProgress(value: unknown) {
  const raw = String(value ?? '').replace('%', '').trim();
  const num = Number(raw || 0);
  if (!Number.isFinite(num)) return 0;
  if (num > 0 && num <= 1) return Math.min(100, Math.max(0, Math.round(num * 100)));
  return Math.min(100, Math.max(0, Math.round(num)));
}

function getProgressStatus(value: unknown) {
  const progress = normalizeProgress(value);
  if (progress >= 100) return 'success';
  if (progress <= 0) return 'exception';
  return undefined;
}

function getCurrentUserInfo() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    reporterId: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    reporterName: String(info.nickname || raw.UserName || raw.userName || info.username || '').trim(),
  };
}

function formatDateOnly(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildReportCode(type: '日报' | '周报') {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${type === '周报' ? 'ZB' : 'RB'}-${yyyy}${mm}${dd}${hh}${mi}${ss}${rand}`;
}

function buildWeekText(dateText: string) {
  return dateText;
}

function checkAddPermission() {
  return !!dataTable.value?.allowAddData?.();
}

function checkEditPermission(row: Record<string, any>) {
  return !!dataTable.value?.allowEditRow?.(row?.[progressReportConfig.primaryKey]);
}

function checkDeletePermission(row: Record<string, any>) {
  return !!dataTable.value?.allowDeleteRow?.(row?.[progressReportConfig.primaryKey]);
}

function checkViewPermission(row: Record<string, any>) {
  const rowKey = row?.[progressReportConfig.primaryKey];
  if (!dataTable.value || !rowKey) return true;
  if (typeof dataTable.value.hasShowField === 'function') {
    try {
      return !!dataTable.value.hasShowField(rowKey);
    } catch (error) {
      console.error('[project-progress-report] checkViewPermission failed:', error);
      return true;
    }
  }
  return true;
}

function openForm(type: 'create' | 'edit' | 'detail', row?: Record<string, any>, reportType?: '日报' | '周报') {
  const currentType = reportType || activeTab.value;
  const currentUser = getCurrentUserInfo();
  const today = formatDateOnly();
  formModalApi
    .setData({
      type,
      title:
        type === 'create'
          ? currentType === '周报'
            ? '填报周报'
            : '填报日报'
          : type === 'edit'
            ? `编辑${progressReportConfig.title}`
            : `${progressReportConfig.title}详情`,
      primaryKey: progressReportConfig.primaryKey,
      schema: progressReportConfig.formSchema,
      defaultValues: {
        ...(progressReportConfig.defaultValues || {}),
        ...(type === 'create'
          ? {
              report_code: buildReportCode(currentType),
              report_type: currentType,
              reporter_id: currentUser.reporterId,
              reporter_name: currentUser.reporterName,
              report_date: today,
              week_text: currentType === '周报' ? buildWeekText(today) : '',
            }
          : {}),
      },
      values: row,
      apis: { getDetail, createData, updateData, deleteData },
      normalizers,
      staffPickerFields: progressReportConfig.staffPickerFields || [],
      customSelectFields: progressReportConfig.customSelectFields || [],
    })
    .open();
}

function handleCreateDaily() {
  if (!checkAddPermission()) {
    ElMessage.warning('暂无新增权限');
    return;
  }
  openForm('create', undefined, '日报');
}

function handleCreateWeekly() {
  if (!checkAddPermission()) {
    ElMessage.warning('暂无新增权限');
    return;
  }
  openForm('create', undefined, '周报');
}

function handleEdit(row: Record<string, any>) {
  if (!checkEditPermission(row)) {
    ElMessage.warning('暂无编辑权限');
    return;
  }
  openForm('edit', row);
}

function handleDetail(row: Record<string, any>) {
  if (!checkViewPermission(row)) {
    ElMessage.warning('暂无查看权限');
    return;
  }
  openForm('detail', row);
}

async function handleDelete(row: Record<string, any>) {
  const rowKey = String(row?.[progressReportConfig.primaryKey] ?? '').trim();
  if (!rowKey) return;
  if (!checkDeletePermission(row)) {
    ElMessage.warning('暂无删除权限');
    return;
  }
  await deleteData(rowKey);
  ElMessage.success('删除成功');
  gridApi.query();
}

async function handleSyncProgress(row: Record<string, any>) {
  await ElMessageBox.confirm('确认将当前报告进度同步到项目主表？', '同步项目进度', { type: 'warning' });
  const projectId = String(row?.project_id || '').trim();
  const wbsRes = await listWbs({ pageNo: 1, page: 1, project_id: projectId });
  if (getList(wbsRes).length || Number(wbsRes?.total || wbsRes?.data?.total || 0) > 0) {
    ElMessage.warning('已有 WBS 时以 WBS 汇总进度为准');
    return;
  }
  await syncProgressToProject(row);
  ElMessage.success('已同步项目进度');
  gridApi.query();
}

function handleTabChange(tab: '日报' | '周报') {
  activeTab.value = tab;
  gridApi.query();
}

const gridColumns = [
  { title: '#', type: 'seq', width: 60, fixed: 'left' },
  { title: '报告编号', field: 'report_code', minWidth: 140 },
  { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'projectCell' } },
  { title: '填报人', field: 'reporter_name', minWidth: 160, slots: { default: 'reporterCell' } },
  { title: '日期/周次', field: 'report_date', minWidth: 160, slots: { default: 'reportDateCell' } },
  { title: '完成工作', field: 'today_work', minWidth: 240, showOverflow: 'tooltip' },
  { title: '下一步计划', field: 'next_work', minWidth: 240, showOverflow: 'tooltip' },
  { title: '进度', field: 'progress_percent', minWidth: 180, align: 'center', slots: { default: 'progressCell' } },
  { title: '状态', field: 'status', minWidth: 100, align: 'center', slots: { default: 'statusCell' } },
  { title: '操作', field: 'actions', fixed: 'right', minWidth: 360, slots: { default: 'actions' } },
];

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: gridColumns,
    height: 520,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          const res = await listData({
            pageNo: page.currentPage,
            page: page.page,
            report_type: activeTab.value,
          });
          dataTable.value = res?.dataTable || null;
          currentRows.value = getList(res);
          return res;
        },
      },
    },
    rowConfig: {
      keyField: progressReportConfig.primaryKey,
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: false,
      zoom: true,
    },
  } as VxeTableGridOptions<any>,
});

onMounted(() => {
  loadProjectNameMap();
});
</script>

<template>
  <Page auto-content-height class="project-fixed-page">
    <FormModal @success="gridApi.query()" />

    <div class="project-report-stats mb-4">
      <ElCard shadow="never" class="project-stat-card">
        <div class="stat-label">当前列表</div>
        <div class="stat-value">{{ stats.currentCount }}</div>
      </ElCard>
      <ElCard shadow="never" class="project-stat-card">
        <div class="stat-label">已提交</div>
        <div class="stat-value">{{ stats.submittedCount }}</div>
      </ElCard>
      <ElCard shadow="never" class="project-stat-card">
        <div class="stat-label">草稿</div>
        <div class="stat-value text-success">{{ stats.draftCount }}</div>
      </ElCard>
    </div>

    <div class="project-grid-fill">
      <div class="report-tabs-wrap">
        <ElTabs :model-value="activeTab" @tab-change="(name) => handleTabChange(name as any)">
          <ElTabPane label="员工日报" name="日报" />
          <ElTabPane label="项目周报" name="周报" />
        </ElTabs>
      </div>
      <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '填报日报',
              type: activeTab === '日报' ? 'primary' : 'default',
              icon: ACTION_ICON.ADD,
              disabled: !checkAddPermission(),
              onClick: handleCreateDaily,
            },
            {
              label: '填报周报',
              type: activeTab === '周报' ? 'primary' : 'default',
              icon: ACTION_ICON.ADD,
              disabled: !checkAddPermission(),
              onClick: handleCreateWeekly,
            },
          ]"
        />
      </template>

      <template #projectCell="{ row }">
        <span>{{ getProjectLabel(row) }}</span>
      </template>

      <template #reporterCell="{ row }">
        <span>{{ row.reporter_name || row.reporter_id || '-' }}</span>
      </template>

      <template #reportDateCell="{ row }">
        <span>{{ activeTab === '周报' ? (row.week_text || '-') : (row.report_date || '-') }}</span>
      </template>

      <template #progressCell="{ row }">
        <ElProgress
          :percentage="normalizeProgress(getRowProgress(row))"
          :status="getProgressStatus(getRowProgress(row))"
          :stroke-width="10"
          text-inside
        />
      </template>

      <template #statusCell="{ row }">
        <ElTag :type="row.status === '已提交' ? 'success' : row.status === '已归档' ? 'info' : 'warning'">
          {{ row.status || '-' }}
        </ElTag>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            ...(activeTab === '周报'
              ? [
                  {
                    label: '同步项目进度',
                    type: 'success',
                    link: true,
                    onClick: () => handleSyncProgress(row),
                  },
                ]
              : []),
            {
              label: '详情',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              disabled: !checkViewPermission(row),
              onClick: () => handleDetail(row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              disabled: !checkEditPermission(row),
              onClick: () => handleEdit(row),
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              disabled: !checkDeletePermission(row),
              popConfirm: {
                title: `是否删除${row.report_code ?? ''}？`,
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid></div>
  </Page>
</template>

<style scoped>
.project-grid-fill {
  min-height: 520px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.report-tabs-wrap {
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.project-grid-fill :deep(.el-progress) {
  min-width: 150px;
}

.project-grid-fill :deep(.el-progress-bar__outer) {
  overflow: hidden;
}

.project-stat-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.project-report-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.report-tab-bar,
.report-tab-list {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.stat-value {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
}

.text-success {
  color: var(--el-color-success);
}

@media (max-width: 768px) {
  .project-report-stats {
    grid-template-columns: 1fr;
  }

}
</style>
