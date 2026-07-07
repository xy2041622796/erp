<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProjectManageApi } from '#/api/erp/project/manage';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { deleteProjectManage, getProjectManagePage } from '#/api/erp/project/manage';

import {
  mapPriorityLabel,
  mapStatusLabel,
  useProjectManageGridColumns,
  useProjectManageGridFormSchema,
} from './data';
import Form from './modules/form.vue';

import {
  ElButton,
  ElCard,
  ElCol,
  ElMessage,
  ElRow,
  ElTag,
} from 'element-plus';

const router = useRouter();
const dataTable = ref<any>(null);
const customerNameMap = ref<Record<string, string>>({});
const currentRows = ref<ErpProjectManageApi.Project[]>([]);

const stats = computed(() => ({
  total: currentRows.value.length,
  inProgress: currentRows.value.filter((row: any) => Number(row?.project_status) === 1).length,
  paused: currentRows.value.filter((row: any) => Number(row?.project_status) === 3).length,
  completed: currentRows.value.filter((row: any) => Number(row?.project_status) === 2).length,
}));

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function checkAddPermission() {
  return !!dataTable.value?.allowAddData?.();
}

function checkEditPermission(row: ErpProjectManageApi.Project) {
  return !!dataTable.value?.allowEditRow?.(row.rowid);
}

function checkDeletePermission(row: ErpProjectManageApi.Project) {
  return !!dataTable.value?.allowDeleteRow?.(row.rowid);
}

function checkViewPermission(row: ErpProjectManageApi.Project) {
  if (!dataTable.value || !row?.rowid) {
    return true;
  }
  if (typeof dataTable.value.hasShowField === 'function') {
    try {
      return !!dataTable.value.hasShowField(row.rowid);
    } catch (error) {
      console.error('[project-manage] checkViewPermission failed:', error);
      return true;
    }
  }
  return true;
}

async function loadCustomerNameMap() {
  try {
    const rows = await getCustomerSimpleList();
    const map: Record<string, string> = {};
    for (const item of rows || []) {
      const id = String((item as any)?.id ?? '').trim();
      const name = String((item as any)?.name ?? (item as any)?.customerName ?? '').trim();
      if (id && name) {
        map[id] = name;
      }
    }
    customerNameMap.value = map;
  } catch (error) {
    console.error('加载项目客户名称映射失败:', error);
    customerNameMap.value = {};
  }
}

function getCustomerDisplayName(row: ErpProjectManageApi.Project) {
  const rawId = String((row as any)?.customer_id ?? '').trim();
  if (rawId && customerNameMap.value[rawId]) return customerNameMap.value[rawId];
  return rawId || '-';
}

function handleExport() {
  ElMessage.info('导出功能待接入');
}

function handleCreate() {
  if (!checkAddPermission()) {
    ElMessage.warning('暂无新增权限');
    return;
  }
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpProjectManageApi.Project) {
  if (!checkEditPermission(row)) {
    ElMessage.warning('暂无编辑权限');
    return;
  }
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: ErpProjectManageApi.Project) {
  if (!checkViewPermission(row)) {
    ElMessage.warning('暂无查看权限');
    return;
  }
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

function handleWorkbench(row: ErpProjectManageApi.Project) {
  const projectId = String(row?.rowid ?? '').trim();
  if (!projectId) return;
  router.push({ path: '/project/workbench', query: { project_id: projectId } });
}

async function handleDelete(row: ErpProjectManageApi.Project) {
  if (!row.rowid) return;
  if (!checkDeletePermission(row)) {
    ElMessage.warning('暂无删除权限');
    return;
  }
  await deleteProjectManage(String(row.rowid));
  ElMessage.success('删除成功');
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useProjectManageGridFormSchema(),
  },
  gridOptions: {
    columns: useProjectManageGridColumns(),
    height: 520,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getProjectManagePage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          dataTable.value = res?.dataTable || null;
          currentRows.value = Array.isArray(res?.list) ? res.list : [];
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: false,
      zoom: true,
    },
  } as VxeTableGridOptions<ErpProjectManageApi.Project>,
});

function formatYmd(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  const str = String(value);
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes('-')) return str;
  const ts = Number(value);
  const date = Number.isNaN(ts) ? new Date(value) : new Date(ts);
  if (Number.isNaN(date.getTime())) return String(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoney(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function formatProgress(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${Math.min(100, Math.max(0, Math.round(n)))}%` : '0%';
}

function getPriorityTagType(value: unknown) {
  const str = String(value ?? '').trim();
  if (str === 'urgent') return 'danger';
  if (str === 'high') return 'warning';
  if (str === 'low') return 'info';
  return 'success';
}

onMounted(() => {
  loadCustomerNameMap();
});
</script>

<template>
  <Page auto-content-height class="project-fixed-page">
    <FormModal @success="gridApi.query()" />

    <ElRow :gutter="16" class="mb-4">
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">全部项目</div>
          <div class="stat-value">{{ stats.total }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">进行中</div>
          <div class="stat-value text-success">{{ stats.inProgress }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">暂停/整改</div>
          <div class="stat-value text-warning">{{ stats.paused }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">已完成</div>
          <div class="stat-value">{{ stats.completed }}</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard shadow="never" class="mb-4 project-page-card">
      <component :is="(gridApi as any).searchForm"></component>
    </ElCard>

    <div class="project-grid-fill"><Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '导出',
              onClick: handleExport,
            },
            {
              label: '新增项目',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !checkAddPermission(),
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #name_code="{ row }">
        <div class="flex flex-col">
          <ElButton type="primary" link class="h-auto p-0" @click="handleDetail(row)">
            {{ (row as any).project_name || '-' }}
          </ElButton>
          <span class="text-xs text-gray-500">{{ (row as any).project_code || '-' }}</span>
        </div>
      </template>

      <template #customer_name="{ row }">
        <span>{{ getCustomerDisplayName(row) }}</span>
      </template>

      <template #manager_dept="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ (row as any).project_Manager || '-' }}</span>
          <span class="text-xs text-gray-500">{{ (row as any).project_depart || '-' }}</span>
        </div>
      </template>

      <template #period="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ formatYmd((row as any).project_start_date) }}</span>
          <span class="text-xs text-gray-500">至 {{ formatYmd((row as any).project_end_date) }}</span>
        </div>
      </template>

      <template #cell_progress="{ row }">
        {{ formatProgress((row as any).progress) }}
      </template>

      <template #cell_priority="{ row }">
        <ElTag :type="getPriorityTagType((row as any).priority)" size="small">
          {{ mapPriorityLabel((row as any).priority) }}
        </ElTag>
      </template>

      <template #cell_location="{ row }">
        {{ (row as any).location || '-' }}
      </template>

      <template #cell_project_amount="{ row }">
        {{ formatMoney((row as any).project_amount) }}
      </template>

      <template #cell_project_status="{ row }">
        {{ mapStatusLabel((row as any).project_status) }}
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '工作台',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              onClick: () => handleWorkbench(row),
            },
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
                title: `是否删除${(row as any).project_name ?? ''}？`,
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
}

.project-page-card,
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
</style>
