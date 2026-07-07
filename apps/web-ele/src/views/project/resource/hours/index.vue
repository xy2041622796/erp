<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import { getStaffById } from '#/api/common/staff-selector';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/resource/hours';
import Form from '#/views/project/_shared/ProjectSubmoduleCrudForm.vue';
import {
  formatCurrentMonth,
  formatYmd,
  inferCreateDefaultValues,
  inferReadonlyFormSchema,
  normalizeDateFields,
} from '#/views/project/_shared/crud';

import { resourceHoursConfig } from './data';

import {
  ElCard,
  ElCol,
  ElOption,
  ElRow,
  ElSelect,
  ElTabPane,
  ElTabs,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['work_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['work_date']);
  },
};

const activeTab = ref<'daily' | 'weekly'>('daily');
const selectedProjectId = ref('');
const selectedMonth = ref('');
const dataTable = ref<any>(null);
const rawRows = ref<Record<string, any>[]>([]);
const weeklySourceRows = ref<Record<string, any>[]>([]);
const weeklyLoading = ref(false);
const projectOptions = ref<any[]>([]);
const projectNameMap = ref<Record<string, string>>({});
const staffNameMap = ref<Record<string, string>>({});

let dailyQuerySeq = 0;
let weeklyLoadSeq = 0;

const monthOptions = computed(() => {
  const current = new Date();
  const list: Array<{ label: string; value: string }> = [{ label: '全部月份', value: '' }];
  for (let i = -6; i <= 6; i++) {
    const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
    const value = formatCurrentMonth(date);
    list.push({ label: `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`, value });
  }
  return list;
});

function filterRowsByMonth(rows: Record<string, any>[] = []) {
  return rows.filter((row: Record<string, any>) => {
    if (!selectedMonth.value) return true;
    const workDate = String(row.work_date || '').trim();
    return workDate.startsWith(selectedMonth.value);
  });
}

function buildWeeklyRows(rows: Record<string, any>[] = []) {
  const map = new Map<string, Record<string, any>>();
  for (const row of filterRowsByMonth(rows)) {
    const date = new Date(String(row.work_date || '').trim());
    if (Number.isNaN(date.getTime())) continue;
    const day = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + 1);
    const weekKey = monday.toISOString().slice(0, 10);
    const aggregateKey = String(row.project_id || '').trim() + '__' + weekKey;
    const item = map.get(aggregateKey) || {
      id: 'week-' + aggregateKey,
      week_label: weekKey + ' 开始',
      project_id: row.project_id,
      project_name: row.project_name,
      hours: 0,
      people_count: 0,
      status: '汇总',
      _userSet: new Set<string>(),
    };
    item.hours = Number(item.hours || 0) + Number(row.hours || 0);
    const userId = String(row.user_rowid || '').trim();
    if (userId) item._userSet.add(userId);
    item.people_count = item._userSet.size;
    map.set(aggregateKey, item);
  }
  return [...map.values()].map(({ _userSet, ...item }) => ({
    ...item,
    hours: Number(item.hours || 0).toFixed(1),
  }));
}

const filteredDailyRows = computed(() => filterRowsByMonth(rawRows.value));
const weeklyRows = computed(() => buildWeeklyRows(weeklySourceRows.value));

const stats = computed(() => {
  const rows = filteredDailyRows.value;
  const totalHours = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const overtimeHours = rows
    .filter((row) => Number(row.hours || 0) > 8)
    .reduce((sum, row) => sum + (Number(row.hours || 0) - 8), 0);
  const users = new Set(rows.map((row) => String(row.user_rowid || '').trim()).filter(Boolean));
  const averageHours = users.size ? totalHours / users.size : 0;
  return {
    totalHours: totalHours.toFixed(1),
    overtimeHours: overtimeHours.toFixed(1),
    participants: users.size,
    averageHours: averageHours.toFixed(1),
  };
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

function getTotal(res: any, fallback: number) {
  return Number(res?.total ?? res?.data?.total ?? fallback) || fallback;
}

async function hydrateStaffNameMap(rows: Record<string, any>[] = []) {
  const ids = [...new Set(rows.map((row) => String(row.user_rowid || '').trim()).filter(Boolean))].filter(
    (id) => !staffNameMap.value[id],
  );
  for (const id of ids) {
    try {
      const staff = await getStaffById(id);
      const name = String(staff?.UserName || '').trim();
      if (name) {
        staffNameMap.value = {
          ...staffNameMap.value,
          [id]: name,
        };
      }
    } catch (error) {
      console.error('[project-resource-hours] hydrateStaffNameMap failed:', error);
    }
  }
}

async function loadProjectOptions() {
  const rows = await getProjectManageSimpleList();
  projectOptions.value = Array.isArray(rows) ? rows : [];
  const map: Record<string, string> = {};
  for (const item of projectOptions.value) {
    const id = String((item as any)?.rowid || '').trim();
    const name = String((item as any)?.project_name || '').trim();
    if (id && name) map[id] = name;
  }
  projectNameMap.value = map;
}

function buildListQuery(page?: { currentPage?: number; page?: number }) {
  const query: Record<string, any> = {
    pageNo: page?.currentPage || 1,
    page: page?.page || 20,
  };
  if (selectedProjectId.value) query.project_id = selectedProjectId.value;
  return query;
}

function buildWeeklyQuery(pageNo = 1, page = 500) {
  const query: Record<string, any> = {
    pageNo,
    page,
  };
  if (selectedProjectId.value) query.project_id = selectedProjectId.value;
  return query;
}

async function fetchWeeklySourceRows() {
  const page = 500;
  const firstRes = await listData(buildWeeklyQuery(1, page));
  const rows = [...getList(firstRes)];
  const total = getTotal(firstRes, rows.length);
  const pageCount = total > rows.length ? Math.ceil(total / page) : 1;

  for (let pageNo = 2; pageNo <= pageCount; pageNo++) {
    const res = await listData(buildWeeklyQuery(pageNo, page));
    rows.push(...getList(res));
  }

  return {
    res: firstRes,
    rows,
  };
}

async function loadWeeklySummary() {
  const currentSeq = ++weeklyLoadSeq;
  weeklyLoading.value = true;
  try {
    const { res, rows } = await fetchWeeklySourceRows();
    if (currentSeq !== weeklyLoadSeq || activeTab.value !== 'weekly') return;
    dataTable.value = res?.dataTable || dataTable.value;
    rawRows.value = rows;
    weeklySourceRows.value = rows;
    await hydrateStaffNameMap(rows);
  } finally {
    if (currentSeq === weeklyLoadSeq) weeklyLoading.value = false;
  }
}

function emptyResult() {
  return {
    list: [],
    total: 0,
  };
}

function reloadActiveGrid() {
  if (activeTab.value === 'daily') {
    dailyGridApi.reload();
    return;
  }
  loadWeeklySummary();
}

function getProjectLabel(row: Record<string, any>) {
  const id = String(row.project_id || '').trim();
  return String(row.project_name || projectNameMap.value[id] || id || '-').trim() || '-';
}

function getUserLabel(row: Record<string, any>) {
  const id = String(row.user_rowid || '').trim();
  return String(row.user_name || staffNameMap.value[id] || id || '-').trim() || '-';
}

function checkAddPermission() {
  return activeTab.value === 'daily' && !!dataTable.value?.allowAddData?.();
}

function checkEditPermission(row: Record<string, any>) {
  if (activeTab.value !== 'daily') return false;
  return !!dataTable.value?.allowEditRow?.(row?.[resourceHoursConfig.primaryKey]);
}

function checkDeletePermission(row: Record<string, any>) {
  if (activeTab.value !== 'daily') return false;
  return !!dataTable.value?.allowDeleteRow?.(row?.[resourceHoursConfig.primaryKey]);
}

function checkViewPermission(row: Record<string, any>) {
  if (activeTab.value !== 'daily') return false;
  const rowKey = row?.[resourceHoursConfig.primaryKey];
  if (!dataTable.value || !rowKey) return true;
  if (typeof dataTable.value.hasShowField === 'function') {
    try {
      return !!dataTable.value.hasShowField(rowKey);
    } catch (error) {
      console.error('[project-resource-hours] checkViewPermission failed:', error);
      return true;
    }
  }
  return true;
}

function openForm(type: 'create' | 'edit' | 'detail', row?: Record<string, any>) {
  const formSchema = inferReadonlyFormSchema(resourceHoursConfig.formSchema || []);
  const defaultValues =
    type === 'create'
      ? inferCreateDefaultValues(
          {
            ...(resourceHoursConfig.defaultValues || {}),
            ...(selectedProjectId.value ? { project_id: selectedProjectId.value } : {}),
          },
          formSchema,
        )
      : { ...(resourceHoursConfig.defaultValues || {}) };
  formModalApi
    .setData({
      type,
      title: type === 'create' ? '录入工时' : type === 'edit' ? '编辑工时' : '工时详情',
      primaryKey: resourceHoursConfig.primaryKey,
      schema: formSchema,
      defaultValues,
      values: row,
      apis,
      normalizers,
      staffPickerFields: resourceHoursConfig.staffPickerFields || [],
      customSelectFields: resourceHoursConfig.customSelectFields || [],
    })
    .open();
}

async function handleDelete(row: Record<string, any>) {
  const rowKey = String(row?.[resourceHoursConfig.primaryKey] ?? '').trim();
  if (!rowKey) return;
  if (!checkDeletePermission(row)) return;
  await deleteData(rowKey);
  dailyGridApi.reload();
}

const dailyColumns: VxeTableGridOptions['columns'] = [
  { title: '#', type: 'seq', width: 60, fixed: 'left' },
  { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'projectCell' } },
  { title: '人员', field: 'user_rowid', minWidth: 160, slots: { default: 'userCell' } },
  { title: '工作日期', field: 'work_date', minWidth: 120, slots: { default: 'dateCell' } },
  { title: '工时', field: 'hours', minWidth: 100, align: 'right', slots: { default: 'hoursCell' } },
  { title: '状态', field: 'status', minWidth: 100, align: 'center', slots: { default: 'statusCell' } },
  { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
];

const [DailyGrid, dailyGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: dailyColumns,
    height: 520,
    keepSource: false,
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: async ({ page }) => {
          const currentSeq = ++dailyQuerySeq;
          const res = await listData(buildListQuery(page));
          if (currentSeq !== dailyQuerySeq || activeTab.value !== 'daily') return emptyResult();
          dataTable.value = res?.dataTable || null;
          const sourceRows = getList(res);
          rawRows.value = sourceRows;
          await hydrateStaffNameMap(sourceRows);
          if (currentSeq !== dailyQuerySeq || activeTab.value !== 'daily') return emptyResult();
          const rows = filterRowsByMonth(sourceRows);
          return {
            ...res,
            list: rows,
            total: selectedMonth.value ? rows.length : getTotal(res, rows.length),
          };
        },
      },
    },
    rowConfig: {
      keyField: resourceHoursConfig.primaryKey,
      isHover: true,
    },
    pagerConfig: {
      enabled: true,
    },
    toolbarConfig: {
      refresh: true,
      search: false,
      zoom: true,
    },
  } as VxeTableGridOptions<any>,
});

watch(activeTab, () => {
  if (activeTab.value === 'daily') {
    dailyQuerySeq++;
    dailyGridApi.reload();
    return;
  }
  loadWeeklySummary();
});

watch([selectedProjectId, selectedMonth], () => {
  reloadActiveGrid();
});

onMounted(async () => {
  await loadProjectOptions();
  dailyGridApi.query();
});
</script>

<template>
  <Page auto-content-height class="project-fixed-page">
    <FormModal @success="reloadActiveGrid()" />

    <ElRow :gutter="16" class="mb-4">
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">本月总工时</div>
          <div class="stat-value">{{ stats.totalHours }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">加班工时</div>
          <div class="stat-value text-warning">{{ stats.overtimeHours }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">参与人数</div>
          <div class="stat-value text-success">{{ stats.participants }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">人均工时</div>
          <div class="stat-value">{{ stats.averageHours }}</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard shadow="never" class="content-card">
      <ElTabs v-model="activeTab">
        <ElTabPane label="每日明细" name="daily">
          <div class="project-grid-fill">
            <DailyGrid>
              <template #toolbar-actions>
                <div class="hours-toolbar-left-filters">
                  <ProjectPicker v-model="selectedProjectId" placeholder="全部项目" class="filter-project" />
                  <ElSelect v-model="selectedMonth" placeholder="全部月份" class="filter-month">
                    <ElOption v-for="item in monthOptions" :key="item.value || 'all'" :label="item.label" :value="item.value" />
                  </ElSelect>
                  <span class="filter-count">共 {{ filteredDailyRows.length }} 条记录</span>
                </div>
              </template>

              <template #toolbar-tools>
                <TableAction
                  :actions="[
                    {
                      label: '录入工时',
                      type: 'primary',
                      icon: ACTION_ICON.ADD,
                      disabled: !checkAddPermission(),
                      onClick: () => openForm('create'),
                    },
                  ]"
                />
              </template>

              <template #projectCell="{ row }">
                <span>{{ getProjectLabel(row) }}</span>
              </template>

              <template #userCell="{ row }">
                <span>{{ getUserLabel(row) }}</span>
              </template>

              <template #dateCell="{ row }">
                <span>{{ formatYmd(row.work_date) }}</span>
              </template>

              <template #hoursCell="{ row }">
                <span>{{ Number(row.hours || 0).toFixed(1) }}</span>
              </template>

              <template #statusCell="{ row }">
                <ElTag :type="row.status === '已确认' ? 'success' : row.status === '已退回' ? 'danger' : 'warning'">
                  {{ row.status || '-' }}
                </ElTag>
              </template>

              <template #actions="{ row }">
                <TableAction
                  :actions="[
                    {
                      label: '详情',
                      type: 'primary',
                      link: true,
                      icon: ACTION_ICON.VIEW,
                      disabled: !checkViewPermission(row),
                      onClick: () => openForm('detail', row),
                    },
                    {
                      label: '编辑',
                      type: 'primary',
                      link: true,
                      icon: ACTION_ICON.EDIT,
                      disabled: !checkEditPermission(row),
                      onClick: () => openForm('edit', row),
                    },
                    {
                      label: '删除',
                      type: 'danger',
                      link: true,
                      icon: ACTION_ICON.DELETE,
                      disabled: !checkDeletePermission(row),
                      popConfirm: {
                        title: '确认删除当前工时记录？',
                        confirm: () => handleDelete(row),
                      },
                    },
                  ]"
                />
              </template>
            </DailyGrid>
          </div>
        </ElTabPane>

        <ElTabPane label="每周统计" name="weekly">
          <div class="filter-bar">
            <ProjectPicker v-model="selectedProjectId" placeholder="全部项目" class="filter-project" />
            <ElSelect v-model="selectedMonth" placeholder="全部月份" class="filter-month">
              <ElOption v-for="item in monthOptions" :key="item.value || 'all'" :label="item.label" :value="item.value" />
            </ElSelect>
            <div class="filter-count">共 {{ weeklyRows.length }} 条记录</div>
          </div>

          <ElTable v-loading="weeklyLoading" :data="weeklyRows" height="520" border stripe>
            <ElTableColumn type="index" label="#" width="60" fixed="left" />
            <ElTableColumn label="项目" min-width="200">
              <template #default="{ row }">
                <span>{{ getProjectLabel(row) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="week_label" label="周次" min-width="160" />
            <ElTableColumn prop="people_count" label="参与人数" min-width="100" align="center" />
            <ElTableColumn label="总工时" min-width="100" align="right">
              <template #default="{ row }">
                <span>{{ Number(row.hours || 0).toFixed(1) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" min-width="100" align="center">
              <template #default="{ row }">
                <ElTag :type="row.status === '已确认' ? 'success' : row.status === '已退回' ? 'danger' : 'warning'">
                  {{ row.status || '-' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

  </Page>
</template>

<style scoped>
.project-grid-fill {
  min-height: 520px;
}

.content-card,
.project-stat-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
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

.text-warning {
  color: var(--el-color-warning);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.hours-toolbar-left-filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-project {
  width: 320px;
}

.filter-month {
  width: 180px;
}

.filter-count {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .filter-bar,
  .hours-toolbar-left-filters {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-project,
  .filter-month {
    width: 100%;
  }
}
</style>
