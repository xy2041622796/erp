<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenModal, Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

import Form from './ProjectSubmoduleCrudForm.vue';

import { ElButton, ElMessage } from 'element-plus';

const props = defineProps<{
  config: any;
  apis: any;
  normalizers?: any;
}>();

const route = useRoute();
const dataTable = ref<any>(null);
const projectNameMap = ref<Record<string, string>>({});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function getRouteContextValues() {
  const projectId = Array.isArray(route.query.project_id)
    ? route.query.project_id[0]
    : route.query.project_id;
  const trimmedProjectId = String(projectId ?? '').trim();
  return trimmedProjectId ? { project_id: trimmedProjectId } : {};
}

function mergeRouteContext(formValues?: Record<string, any>) {
  const contextValues = getRouteContextValues();
  const next = { ...(formValues || {}) };
  for (const [key, value] of Object.entries(contextValues)) {
    if (next[key] === undefined || next[key] === null || next[key] === '') {
      next[key] = value;
    }
  }
  return next;
}

async function loadProjectNameMap() {
  try {
    const rows = await getProjectManageSimpleList();
    const map: Record<string, string> = {};
    for (const item of rows || []) {
      const id = String((item as any)?.rowid ?? '').trim();
      const name = String((item as any)?.project_name ?? '').trim();
      if (id && name) {
        map[id] = name;
      }
    }
    projectNameMap.value = map;
  } catch (error) {
    console.error('[project-submodule] loadProjectNameMap failed:', error);
    projectNameMap.value = {};
  }
}

function getProjectDisplayName(row: Record<string, any>) {
  const projectId = String(row?.project_id ?? '').trim();
  return String(row?.project_name ?? projectNameMap.value[projectId] ?? projectId ?? '').trim() || '-';
}

function getEmployeeDisplayName(row: Record<string, any>) {
  return String(row?.employee_name ?? row?.user_name ?? row?.member_to_name ?? row?.employee_id ?? '').trim() || '-';
}

function getUserDisplayName(row: Record<string, any>) {
  return String(row?.user_name ?? row?.reporter_name ?? row?.owner_user_name ?? row?.checker_name ?? row?.user_rowid ?? '').trim() || '-';
}

function getReporterDisplayName(row: Record<string, any>) {
  return String(row?.reporter_name ?? row?.user_name ?? row?.reporter_id ?? '').trim() || '-';
}

function getCheckerDisplayName(row: Record<string, any>) {
  return String(row?.checker_name ?? row?.checker_id ?? '').trim() || '-';
}

function getProgressDisplayName(row: Record<string, any>) {
  return String(row?.progress_name ?? row?.task_name ?? row?.progress_id ?? '').trim() || '-';
}

function getSecondaryText(primary: unknown, secondary: unknown) {
  const first = String(primary ?? '').trim();
  const second = String(secondary ?? '').trim();
  return second && second !== first ? second : '';
}

function checkAddPermission() {
  return !!dataTable.value?.allowAddData?.();
}

function checkEditPermission(row: Record<string, any>) {
  return !!dataTable.value?.allowEditRow?.(row?.[props.config.primaryKey]);
}

function checkDeletePermission(row: Record<string, any>) {
  return !!dataTable.value?.allowDeleteRow?.(row?.[props.config.primaryKey]);
}

function checkViewPermission(row: Record<string, any>) {
  const rowKey = row?.[props.config.primaryKey];
  if (!dataTable.value || !rowKey) return true;
  if (typeof dataTable.value.hasShowField === 'function') {
    try {
      return !!dataTable.value.hasShowField(rowKey);
    } catch (error) {
      console.error('[project-submodule] checkViewPermission failed:', error);
      return true;
    }
  }
  return true;
}

function openForm(type: 'create' | 'edit' | 'detail', row?: Record<string, any>) {
  formModalApi
    .setData({
      type,
      title:
        type === 'create'
          ? `新增${props.config.title}`
          : type === 'edit'
            ? `编辑${props.config.title}`
            : `${props.config.title}详情`,
      primaryKey: props.config.primaryKey,
      schema: props.config.formSchema,
      defaultValues: {
        ...(props.config.defaultValues || {}),
        ...(type === 'create' ? getRouteContextValues() : {}),
      },
      values: row,
      apis: props.apis,
      normalizers: props.normalizers,
      staffPickerFields: props.config.staffPickerFields || [],
    })
    .open();
}

async function handleDelete(row: Record<string, any>) {
  const rowKey = String(row?.[props.config.primaryKey] ?? '').trim();
  if (!rowKey) return;
  if (!checkDeletePermission(row)) {
    ElMessage.warning('暂无删除权限');
    return;
  }
  await props.apis.deleteData(rowKey);
  ElMessage.success('删除成功');
  gridApi.query();
}

onMounted(() => {
  loadProjectNameMap();
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: props.config.searchSchema,
  },
  gridOptions: {
    columns: props.config.columns,
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: { page: any }, formValues: Record<string, any>) => {
          const queryValues = mergeRouteContext(formValues);
          const res = await props.apis.listData({
            pageNo: page.currentPage,
            page: page.page,
            ...queryValues,
          });
          dataTable.value = res?.dataTable || null;
          return res;
        },
      },
    },
    rowConfig: {
      keyField: props.config.primaryKey,
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
    },
  } as any,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="gridApi.query()" />

    <div class="mb-4">
      <div class="text-lg font-semibold">{{ config.title }}</div>
      <div class="text-sm text-gray-500">{{ config.description }}</div>
    </div>

    <Grid>
      <template #toolbar-tools>
        <slot name="toolbar-actions" :refresh="() => gridApi.query()" />
        <TableAction
          :actions="[
            {
              label: '新增',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !checkAddPermission(),
              onClick: () => openForm('create'),
            },
          ]"
        />
      </template>

      <template #cell_project="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ getProjectDisplayName(row) }}</span>
          <span v-if="getSecondaryText(getProjectDisplayName(row), row.project_id)" class="text-xs text-gray-500">{{ getSecondaryText(getProjectDisplayName(row), row.project_id) }}</span>
        </div>
      </template>

      <template #cell_employee="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ getEmployeeDisplayName(row) }}</span>
          <span v-if="getSecondaryText(getEmployeeDisplayName(row), row.employee_id)" class="text-xs text-gray-500">{{ getSecondaryText(getEmployeeDisplayName(row), row.employee_id) }}</span>
        </div>
      </template>

      <template #cell_user="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ getUserDisplayName(row) }}</span>
          <span v-if="getSecondaryText(getUserDisplayName(row), row.user_rowid)" class="text-xs text-gray-500">{{ getSecondaryText(getUserDisplayName(row), row.user_rowid) }}</span>
        </div>
      </template>

      <template #cell_reporter="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ getReporterDisplayName(row) }}</span>
          <span v-if="getSecondaryText(getReporterDisplayName(row), row.reporter_id)" class="text-xs text-gray-500">{{ getSecondaryText(getReporterDisplayName(row), row.reporter_id) }}</span>
        </div>
      </template>

      <template #cell_checker="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ getCheckerDisplayName(row) }}</span>
          <span v-if="getSecondaryText(getCheckerDisplayName(row), row.checker_id)" class="text-xs text-gray-500">{{ getSecondaryText(getCheckerDisplayName(row), row.checker_id) }}</span>
        </div>
      </template>

      <template #cell_progress="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ getProgressDisplayName(row) }}</span>
          <span v-if="getSecondaryText(getProgressDisplayName(row), row.progress_id)" class="text-xs text-gray-500">{{ getSecondaryText(getProgressDisplayName(row), row.progress_id) }}</span>
        </div>
      </template>

      <template #actions="{ row }">
        <slot name="row-actions" :row="row" :refresh="() => gridApi.query()" />
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
                title: '确认删除当前记录？',
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
