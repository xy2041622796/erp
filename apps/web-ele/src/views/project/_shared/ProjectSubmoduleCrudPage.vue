<script lang="ts" setup>
import { computed, onMounted, ref, useSlots } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenModal, Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStaffById } from '#/api/common/staff-selector';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';

import Form from './ProjectSubmoduleCrudForm.vue';
import { inferCreateDefaultValues, inferReadonlyFormSchema } from './crud';

import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';

import { ElMessage } from 'element-plus';

const props = defineProps<{
  config: any;
  apis: any;
  normalizers?: any;
  projectOnlyFilter?: boolean;
  hideSearch?: boolean;
  hideHeader?: boolean;
  hideProjectSelector?: boolean;
  wideProjectSelector?: boolean;
  externalProjectId?: string;
  externalQuery?: Record<string, any>;
  gridHeight?: number | string;
  tableMinHeight?: number | string;
  addButtonLabel?: string;
  addButtonHandler?: () => Promise<void> | void;
  hideDefaultRowActions?: boolean;
}>();

const slots = useSlots();
const route = useRoute();
const dataTable = ref<any>(null);
const projectOptions = ref<any[]>([]);
const selectedProjectId = ref('');
const projectNameMap = ref<Record<string, string>>({});
const customerNameMap = ref<Record<string, string>>({});
const staffNameMap = ref<Record<string, string>>({});

const controlledProjectId = computed(() => String(props.externalProjectId ?? '').trim());
const hideProjectSelectorResolved = computed(() => !!props.hideProjectSelector || !!controlledProjectId.value);
const resolvedGridHeight = computed(() => props.gridHeight ?? 520);
const resolvedTableMinHeight = computed(() => props.tableMinHeight ?? resolvedGridHeight.value);
const tableCardStyle = computed(() => ({
  minHeight:
    resolvedTableMinHeight.value === undefined || resolvedTableMinHeight.value === null
      ? undefined
      : typeof resolvedTableMinHeight.value === 'number'
        ? `${resolvedTableMinHeight.value}px`
        : String(resolvedTableMinHeight.value),
}));
const forwardedGridSlotNames = computed(() =>
  Object.keys(slots).filter((name) => !['default', 'toolbar-actions', 'row-actions'].includes(name)),
);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function getRouteProjectId() {
  const projectId = Array.isArray(route.query.project_id)
    ? route.query.project_id[0]
    : route.query.project_id;
  return String(projectId ?? '').trim();
}

function getEffectiveProjectId(formValues?: Record<string, any>) {
  if (controlledProjectId.value) return controlledProjectId.value;
  if (props.projectOnlyFilter) return String(selectedProjectId.value || getRouteProjectId()).trim();
  return String(formValues?.project_id ?? getRouteProjectId()).trim();
}

function getRouteContextValues(formValues?: Record<string, any>) {
  const trimmedProjectId = getEffectiveProjectId(formValues);
  return trimmedProjectId ? { project_id: trimmedProjectId } : {};
}

function mergeRouteContext(formValues?: Record<string, any>) {
  const contextValues = getRouteContextValues(formValues);
  const next = { ...(formValues || {}) };
  for (const [key, value] of Object.entries(contextValues)) {
    if (next[key] === undefined || next[key] === null || next[key] === '') {
      next[key] = value;
    }
  }
  return next;
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

async function loadProjectOptions() {
  const list = await getProjectManageSimpleList();
  const rows = Array.isArray(list) ? list : [];
  projectOptions.value = rows;
  const map: Record<string, string> = {};
  for (const item of rows) {
    const id = String((item as any)?.rowid || '').trim();
    const name = String((item as any)?.project_name || '').trim();
    if (id && name) map[id] = name;
  }
  projectNameMap.value = map;

  if (!props.projectOnlyFilter) return;
  const routeProjectId = getRouteProjectId();
  selectedProjectId.value = controlledProjectId.value || routeProjectId || selectedProjectId.value;
  if (getEffectiveProjectId()) {
    gridApi.query();
  }
}

async function loadCustomerNameMap() {
  try {
    const rows = await getCustomerSimpleList();
    const map: Record<string, string> = {};
    for (const item of rows || []) {
      const id = String((item as any)?.id || '').trim();
      const name = String((item as any)?.name || (item as any)?.customerName || '').trim();
      if (id && name) map[id] = name;
    }
    customerNameMap.value = map;
  } catch (error) {
    console.error('[project-submodule] loadCustomerNameMap failed:', error);
    customerNameMap.value = {};
  }
}

async function hydrateStaffNameMap(rows: Record<string, any>[] = []) {
  const idFields = ['reporter_id', 'assignee_id', 'checker_id', 'user_rowid', 'employee_id', 'project_manager_id'];
  const ids = new Set<string>();
  for (const row of rows || []) {
    for (const field of idFields) {
      const id = String((row as any)?.[field] || '').trim();
      if (id && !staffNameMap.value[id]) ids.add(id);
    }
  }
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
      console.error('[project-submodule] hydrateStaffNameMap failed:', error);
    }
  }
}

function handleProjectChange() {
  gridApi.query();
}

function getProjectOptionLabel(project: Record<string, any>) {
  const code = String(project?.project_code || '').trim();
  const name = String(project?.project_name || '').trim();
  if (code && name) return `${code} - ${name}`;
  return name || code || String(project?.rowid || '').trim();
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

function getDisplayNameByField(row: Record<string, any>, field: string) {
  const id = String(row?.[field] || '').trim();
  if (!id) return '-';
  if (field === 'project_id') return String(row?.project_name || projectNameMap.value[id] || id).trim() || '-';
  if (field === 'customer_id') return String(row?.customer_name || customerNameMap.value[id] || id).trim() || '-';
  const companionMap: Record<string, string[]> = {
    reporter_id: ['reporter_name', 'user_name'],
    assignee_id: ['assignee_name', 'user_name'],
    checker_id: ['checker_name', 'user_name'],
    user_rowid: ['user_name', 'reporter_name'],
    employee_id: ['employee_name', 'user_name'],
    project_manager_id: ['project_Manager'],
  };
  for (const key of companionMap[field] || []) {
    const text = String(row?.[key] || '').trim();
    if (text) return text;
  }
  return String(staffNameMap.value[id] || id).trim() || '-';
}

const resolvedColumns = computed(() =>
  (props.config.columns || []).map((column: any) => {
    const field = String(column?.field || '').trim();
    if (!field || field === 'actions') return column;
    const shouldMap = field === 'user_rowid' || field.endsWith('_id');
    if (!shouldMap || column?.slots?.default) return column;
    const title = typeof column?.title === 'string' ? column.title.replace(/ID$/i, '').trim() : column?.title;
    return {
      ...column,
      title,
      slots: {
        ...(column?.slots || {}),
        default: 'cell_generic_id_display',
      },
    };
  }),
);

function openForm(type: 'create' | 'edit' | 'detail', row?: Record<string, any>) {
  const routeContextValues = getRouteContextValues();
  const formSchema = inferReadonlyFormSchema(props.config.formSchema || []);
  const defaultValues =
    type === 'create'
      ? inferCreateDefaultValues(
          {
            ...(props.config.defaultValues || {}),
            ...routeContextValues,
          },
          formSchema,
        )
      : { ...(props.config.defaultValues || {}) };
  formModalApi
    .setData({
      type,
      title: type === 'create' ? `新增${props.config.title}` : type === 'edit' ? `编辑${props.config.title}` : `${props.config.title}详情`,
      primaryKey: props.config.primaryKey,
      schema: formSchema,
      defaultValues,
      values: row,
      apis: props.apis,
      normalizers: props.normalizers,
      staffPickerFields: props.config.staffPickerFields || [],
      customSelectFields: props.config.customSelectFields || [],
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

const [Grid, gridApi] = useVbenVxeGrid({
  ...(props.projectOnlyFilter
    ? {}
    : {
        formOptions: {
          schema: props.config.searchSchema || [],
        },
      }),
  gridOptions: {
    columns: resolvedColumns.value,
    height: resolvedGridHeight.value,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: { page: any }, formValues: Record<string, any>) => {
          const effectiveProjectId = getEffectiveProjectId(formValues);
          if (props.projectOnlyFilter && !effectiveProjectId) return { list: [], total: 0 };
          const queryValues = mergeRouteContext(props.projectOnlyFilter ? { project_id: effectiveProjectId } : formValues);
          const res = await props.apis.listData({
            pageNo: page.currentPage,
            page: page.page,
            ...(props.externalQuery || {}),
            ...queryValues,
          });
          dataTable.value = res?.dataTable || null;
          const rows = Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
          await hydrateStaffNameMap(rows);
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
      search: false,
      zoom: true,
    },
    ...(props.config.treeConfig ? { treeConfig: props.config.treeConfig } : {}),
  } as any,
});

onMounted(() => {
  loadProjectOptions();
  loadCustomerNameMap();
});
</script>

<template>
  <Page auto-content-height class="project-fixed-page">
    <FormModal @success="gridApi.query()" />


    <div class="project-submodule-card project-submodule-table-card project-grid-fill-card" :style="tableCardStyle">
      <div v-if="!projectOnlyFilter && !hideSearch" class="project-table-filter">
        <component :is="(gridApi as any).searchForm"></component>
      </div>

      <Grid>
        <template #toolbar-actions>
          <div v-if="projectOnlyFilter && !hideProjectSelectorResolved" class="project-only-filter project-toolbar-filter">
            <span class="project-only-label">项目</span>
            <ProjectPicker
              v-model="selectedProjectId"
              :class="['project-only-select', { 'project-only-select-wide': props.wideProjectSelector }]"
              placeholder="请选择项目"
              @change="handleProjectChange"
            />
          </div>
          <slot name="toolbar-actions" :refresh="() => gridApi.query()" />
        </template>

        <template #toolbar-tools>
          <TableAction
            :actions="[
              {
                label: props.addButtonLabel || '新增',
                type: 'primary',
                icon: ACTION_ICON.ADD,
                disabled: !checkAddPermission(),
                onClick: () => (props.addButtonHandler ? props.addButtonHandler() : openForm('create')),
              },
            ]"
          />
        </template>
        <template #cell_generic_id_display="{ row, column }">
          <span>{{ getDisplayNameByField(row, String(column?.field || '')) }}</span>
        </template>
        <template v-for="slotName in forwardedGridSlotNames" :key="slotName" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template #actions="{ row }">
          <slot name="row-actions" :row="row" :refresh="() => gridApi.query()" />
          <TableAction
            v-if="!props.hideDefaultRowActions"
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
    </div>
  </Page>
</template>

<style scoped>
.project-submodule-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.project-grid-fill-card {
  min-height: 0;
}

.project-table-filter {
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.project-table-filter :deep(.vben-form),
.project-table-filter :deep(form) {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 12px;
  overflow-x: auto;
}

.project-table-filter :deep(.vben-form-item),
.project-table-filter :deep(.el-form-item) {
  flex: 0 0 auto;
  margin-bottom: 0;
}

.project-only-filter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-toolbar-filter {
  margin-left: 0;
  margin-right: 8px;
}

.project-only-label {
  flex-shrink: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 500;
}

.project-only-select {
  width: 360px;
  max-width: 100%;
}

.project-only-select-wide {
  width: 720px;
}

@media (max-width: 768px) {
  .project-only-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .project-only-select {
    width: 100%;
  }
}
</style>
