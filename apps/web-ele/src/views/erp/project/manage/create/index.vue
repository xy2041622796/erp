<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProjectManageCreateApi } from '#/api/erp/project/manage/create';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { deleteProjectManageCreate, getProjectManageCreatePage } from '#/api/erp/project/manage/create';

import {
  mapStatusLabel,
  useProjectManageCreateGridColumns,
  useProjectManageCreateGridFormSchema,
} from './data';
import Form from './modules/form.vue';

import { ElButton, ElMessage } from 'element-plus';

const dataTable = ref<any>(null);
const customerNameMap = ref<Record<string, string>>({});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function checkAddPermission() {
  return !!dataTable.value?.allowAddData?.();
}

function checkEditPermission(row: ErpProjectManageCreateApi.Project) {
  return !!dataTable.value?.allowEditRow?.(row.rowid);
}

function checkDeletePermission(row: ErpProjectManageCreateApi.Project) {
  return !!dataTable.value?.allowDeleteRow?.(row.rowid);
}

function checkViewPermission(row: ErpProjectManageCreateApi.Project) {
  if (!dataTable.value || !row?.rowid) {
    return true;
  }
  if (typeof dataTable.value.hasShowField === 'function') {
    try {
      return !!dataTable.value.hasShowField(row.rowid);
    } catch (error) {
      console.error('[project-manage-create] checkViewPermission failed:', error);
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

function getCustomerDisplayName(row: ErpProjectManageCreateApi.Project) {
  const rawId = String((row as any)?.customer_id ?? '').trim();
  if (rawId && customerNameMap.value[rawId]) return customerNameMap.value[rawId];
  return rawId || '-';
}

function handleCreate() {
  if (!checkAddPermission()) {
    ElMessage.warning('暂无新增权限');
    return;
  }
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpProjectManageCreateApi.Project) {
  if (!checkEditPermission(row)) {
    ElMessage.warning('暂无编辑权限');
    return;
  }
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: ErpProjectManageCreateApi.Project) {
  if (!checkViewPermission(row)) {
    ElMessage.warning('暂无查看权限');
    return;
  }
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleDelete(row: ErpProjectManageCreateApi.Project) {
  if (!row.rowid) return;
  if (!checkDeletePermission(row)) {
    ElMessage.warning('暂无删除权限');
    return;
  }
  await deleteProjectManageCreate(String(row.rowid));
  ElMessage.success('删除成功');
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useProjectManageCreateGridFormSchema(),
  },
  gridOptions: {
    columns: useProjectManageCreateGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getProjectManageCreatePage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          dataTable.value = res?.dataTable || null;
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
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<ErpProjectManageCreateApi.Project>,
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

onMounted(() => {
  loadCustomerNameMap();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="gridApi.query()" />

    <div class="mb-4">
      <div class="text-lg font-semibold">项目建档</div>
      <div class="text-sm text-gray-500">
        一期仅包含项目主档列表、筛选、新增、编辑、详情、附件与权限控制。
      </div>
    </div>

    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
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

      <template #project_name="{ row }">
        <ElButton type="primary" link class="h-auto p-0" @click="handleDetail(row)">
          {{ (row as any).project_name || '-' }}
        </ElButton>
      </template>


      <template #cell_project_status="{ row }">
        {{ mapStatusLabel((row as any).project_status) }}
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
    </Grid>
  </Page>
</template>
