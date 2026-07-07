<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProjectApi } from '#/api/erp/contract/project';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { deleteProject, exportProject, getProjectPage } from '#/api/erp/contract/project';

import { useProjectGridColumns, useProjectGridFormSchema } from './data';
import Form from './modules/form.vue';

import {
  ElButton,
  ElCheckbox,
  ElEmpty,
  ElMessage,
  ElOption,
  ElSelect,
  ElTabPane,
  ElTabs,
} from 'element-plus';

const activeTab = ref<'list' | 'stats'>('list');
const PROJECT_EXPORT_ENCODING_ID = 'E25498CF3B80E2C2A199B26E6E8517DF';
const showExpired = ref(true);
const statusFilter = ref<number | ''>('');
const customerNameMap = ref<Record<string, string>>({});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

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

function getCustomerDisplayName(row: ErpProjectApi.Project) {
  const rawId = String((row as any)?.customer_id ?? '').trim();
  const rawName = String((row as any)?.customer_name ?? '').trim();
  if (rawName) return rawName;
  if (rawId && customerNameMap.value[rawId]) return customerNameMap.value[rawId];
  return rawId || '-';
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpProjectApi.Project) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: ErpProjectApi.Project) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleDelete(row: ErpProjectApi.Project) {
  if (!row.rowid) return;
  await deleteProject(String(row.rowid));
  ElMessage.success('删除成功');
  gridApi.query();
}

function handleImport() {
  ElMessage.info('导入功能开发中');
}

async function handleExport() {
  const data = await exportProject(
    {
      showExpired: showExpired.value,
      project_status: statusFilter.value === '' ? undefined : statusFilter.value,
      ...(await gridApi.formApi.getValues()),
    },
    PROJECT_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '项目信息.xls', source: data });
}

function handleMerge() {
  ElMessage.info('项目合并功能开发中');
}

function handleCreateGroup() {
  ElMessage.info('新增项目组功能开发中');
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useProjectGridFormSchema(),
  },
  gridOptions: {
    columns: useProjectGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getProjectPage({
            pageNo: page.currentPage,
            page: page.page,
            showExpired: showExpired.value,
            project_status: statusFilter.value === '' ? undefined : statusFilter.value,
            ...formValues,
          });
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: false,
      search: false,
    },
  } as VxeTableGridOptions<ErpProjectApi.Project>,
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

function mapStatus(value: any) {
  const n = Number(value);
  if (n === 0) return '未开始';
  if (n === 1) return '进行中';
  if (n === 2) return '已完成';
  if (n === 3) return '已暂停';
  return value ?? '-';
}

onMounted(() => {
  loadCustomerNameMap();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="gridApi.query()" />

    <div class="mb-4 flex items-center justify-between">
      <ElTabs v-model:model-value="activeTab" class="w-full">
        <ElTabPane label="项目列表" name="list" />
        <ElTabPane label="项目统计" name="stats" />
      </ElTabs>

      <div class="ml-4 flex shrink-0 items-center gap-2">
        <ElButton @click="handleCreateGroup">新增项目组</ElButton>
        <ElButton @click="handleMerge">项目合并</ElButton>
        <ElButton @click="handleImport">导入</ElButton>
        <ElButton @click="handleExport">导出</ElButton>
        <ElButton type="primary" @click="handleCreate">新增项目</ElButton>
      </div>
    </div>

    <template v-if="activeTab === 'list'">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ElSelect v-model="statusFilter" class="!w-[140px]" placeholder="全部" clearable>
            <ElOption label="未开始" :value="0" />
            <ElOption label="进行中" :value="1" />
            <ElOption label="已完成" :value="2" />
            <ElOption label="已暂停" :value="3" />
          </ElSelect>
          <ElButton @click="gridApi.query()">筛选</ElButton>
        </div>
        <div class="flex items-center gap-2">
          <ElCheckbox v-model="showExpired" @change="gridApi.query()">
            显示已过期
          </ElCheckbox>
        </div>
      </div>

      <div class="mb-4">
        <component :is="(gridApi as any).searchForm"></component>
      </div>

      <Grid>
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

        <template #cell_project_amount="{ row }">
          {{ formatMoney((row as any).project_amount) }}
        </template>

        <template #cell_project_status="{ row }">
          {{ mapStatus((row as any).project_status) }}
        </template>

        <template #actions="{ row }">
          <TableAction
            :actions="[
              {
                label: '详情',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.VIEW,
                onClick: () => handleDetail(row),
              },
              {
                label: '编辑',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.EDIT,
                onClick: () => handleEdit(row),
              },
              {
                label: '删除',
                type: 'danger',
                link: true,
                icon: ACTION_ICON.DELETE,
                popConfirm: {
                  title: `是否删除${(row as any).project_name ?? ''}？`,
                  confirm: () => handleDelete(row),
                },
              },
            ]"
          />
        </template>
      </Grid>
    </template>

    <template v-else>
      <div class="flex h-[60vh] items-center justify-center">
        <ElEmpty description="暂无数据" />
      </div>
    </template>
  </Page>
</template>
