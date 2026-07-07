<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProject } from '#/api/erp/contract/project';
import { getSupplierSimpleList } from '#/api/erp/customer';
import {
  deleteOpeningPrepayCollect,
  getOpeningPrepayCollectPage,
} from '#/api/erp/finance/settings/init_data/opening_prepay_collect';
import { getSimpleDeptList } from '#/api/system/dept';
import { getSimpleUserList } from '#/api/system/user';
import { formatDateOnly } from '#/utils/date';

import InitAdvanceForm from './init-advance-form.vue';

import { ElMessage, ElTag } from 'element-plus';

defineOptions({ name: 'InitPrePaymentTab' });

const supplierOptions = ref<any[]>([]);
const supplierNameCache = new Map<string, string>();
const projectNameCache = new Map<string, string>();
const userNameCache = new Map<string, string>();
const deptNameCache = new Map<string, string>();

let supplierLoading: Promise<void> | null = null;
let userLoading: Promise<void> | null = null;
let deptLoading: Promise<void> | null = null;

function toKey(v: any) {
  const s = String(v ?? '').trim();
  return s || '';
}

async function ensureSupplierLoaded() {
  if (supplierOptions.value.length > 0) return;
  if (!supplierLoading) {
    supplierLoading = (async () => {
      supplierOptions.value = await getSupplierSimpleList();
    })().finally(() => {
      supplierLoading = null;
    });
  }
  await supplierLoading;
}

async function ensureUserLoaded() {
  if (userNameCache.size > 0) return;
  if (!userLoading) {
    userLoading = (async () => {
      const users = await getSimpleUserList();
      (users || []).forEach((u: any) => {
        const id = toKey(u?.ROWID ?? u?.id);
        const name = String(u?.UserName ?? u?.nickname ?? u?.name ?? id);
        if (id) userNameCache.set(id, name);
      });
    })().finally(() => {
      userLoading = null;
    });
  }
  await userLoading;
}

async function ensureDeptLoaded() {
  if (deptNameCache.size > 0) return;
  if (!deptLoading) {
    deptLoading = (async () => {
      const depts = await getSimpleDeptList();
      (depts || []).forEach((d: any) => {
        const id = toKey(d?.id);
        const name = String(d?.name ?? id);
        if (id) deptNameCache.set(id, name);
      });
    })().finally(() => {
      deptLoading = null;
    });
  }
  await deptLoading;
}

function getSupplierName(id: any) {
  const key = toKey(id);
  if (!key) return '';
  const cached = supplierNameCache.get(key);
  if (cached && cached !== key) return cached;
  if (supplierOptions.value.length === 0) return key;
  const hit = supplierOptions.value.find((c: any) => String(c?.rowid ?? c?.id ?? '') === key);
  const name = String(hit?.name ?? hit?.customerName ?? hit?.customer_name ?? key);
  supplierNameCache.set(key, name);
  return name;
}

function getUserName(id: any) {
  const key = toKey(id);
  return userNameCache.get(key) || key;
}

function getDeptName(id: any) {
  const key = toKey(id);
  return deptNameCache.get(key) || key;
}

async function getProjectName(id: any) {
  const key = toKey(id);
  if (!key) return '';
  const cached = projectNameCache.get(key);
  if (cached) return cached;
  try {
    const detail: any = await getProject(key);
    const name = String(detail?.project_name ?? detail?.project_code ?? key);
    projectNameCache.set(key, name);
    return name;
  } catch {
    projectNameCache.set(key, key);
    return key;
  }
}

async function fillNames(rows: any[]) {
  await Promise.all([ensureSupplierLoaded(), ensureUserLoaded(), ensureDeptLoaded()]);
  await Promise.all(
    (rows || []).map(async (r: any) => {
      if (r?.supplier_id && !r.supplier_name) r.supplier_name = getSupplierName(r.supplier_id);
      if (r?.project_id && !r.project_name) r.project_name = await getProjectName(r.project_id);
      if (r?.salesman_id && !r.salesman_name) r.salesman_name = getUserName(r.salesman_id);
      if (r?.dept_id && !r.dept_name) r.dept_name = getDeptName(r.dept_id);
    }),
  );
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: InitAdvanceForm,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData({ kind: 'pre_payment', type: 'create' }).open();
}

function handleDetail(row: any) {
  formModalApi.setData({ kind: 'pre_payment', type: 'detail', row }).open();
}

function handleEdit(row: any) {
  formModalApi.setData({ kind: 'pre_payment', type: 'edit', row }).open();
}

async function handleDelete(row: any) {
  try {
    await deleteOpeningPrepayCollect(row.id ?? row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'keyword',
        label: '关键字',
        component: 'Input',
        componentProps: { placeholder: '编号/备注', allowClear: true },
      },
      {
        fieldName: 'billDateRange',
        label: '日期',
        component: 'RangePicker',
        componentProps: { clearable: true },
      },
    ],
  },
  gridOptions: {
    height: 750,
    keepSource: true,
    scrollY: { enabled: false },
    columns: [
      { title: '#', type: 'seq', width: 60, fixed: 'left' },
      { title: '日期/编号', field: 'opening_date', minWidth: 180, slots: { default: 'date_no' } },
      { title: '合同', field: 'contract_no', minWidth: 200 },
      { title: '供应商/项目', field: 'supplier_id', minWidth: 220, slots: { default: 'supplier_project' } },
      { title: '业务员/部门', field: 'salesman_id', minWidth: 180, slots: { default: 'sales_dept' } },
      { title: '预付金额', field: 'prepay_collect_amount', minWidth: 120 },
      { title: '期初预付余额', field: 'opening_balance', minWidth: 140 },
      { title: '实际顶付余额', field: 'actual_balance', minWidth: 140 },
      { title: '备注', field: 'remark', minWidth: 220 },
      { title: '状态', field: 'status', minWidth: 100, slots: { default: 'status' } },
      { title: '操作', field: 'actions', width: 220, fixed: 'right', slots: { default: 'actions' } },
    ] as VxeTableGridOptions['columns'],
    pagerConfig: {
      enabled: true,
      page: 10,
      pageSizes: [10, 20, 50, 100],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const result = await getOpeningPrepayCollectPage({
            pageNo: page.currentPage,
            page: page.page,
            business_type: 'pre_payment',
            keyword: formValues?.keyword,
          });
          await fillNames(result.list);
          return { list: result.list, total: result.total };
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true, zoom: true },
  },
});
</script>

<template>
  <div class="flex h-full flex-col">
    <FormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <div></div>
      <TableAction
        :actions="[
          {
            label: '新增',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: handleCreate,
          },
        ]"
      />
    </div>

    <div class="min-h-0 flex-1">
      <Grid table-title="期初预付款">
        <template #date_no="{ row }">
          <div class="text-center">
            <div class="w-full">{{ formatDateOnly(row.opening_date) || '--' }}</div>
            <div class="text-center text-primary">{{ row.opening_no || '--' }}</div>
          </div>
        </template>

        <template #supplier_project="{ row }">
          <div class="flex flex-col">
            <div>{{ row.supplier_name || row.supplier_id || '--' }}</div>
            <div class="text-xs text-gray-400">{{ row.project_name || row.project_id || '' }}</div>
          </div>
        </template>

        <template #sales_dept="{ row }">
          <div class="flex flex-col">
            <div>{{ row.salesman_name || row.salesman_id || '--' }}</div>
            <div class="text-xs text-gray-400">{{ row.dept_name || row.dept_id || '' }}</div>
          </div>
        </template>

        <template #status="{ row }">
          <ElTag v-if="row.status" type="info" effect="plain">{{ row.status }}</ElTag>
          <ElTag v-else-if="row.flowstate === 2" type="success" effect="plain">完成</ElTag>
          <ElTag v-else-if="row.flowstate === 1" type="warning" effect="plain">审批中</ElTag>
          <ElTag v-else type="info" effect="plain">草稿</ElTag>
        </template>

        <template #actions="{ row }">
          <TableAction
            :actions="[
              {
                label: '详情',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.VIEW,
                onClick: handleDetail.bind(null, row),
              },
              {
                label: '编辑',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.EDIT,
                onClick: handleEdit.bind(null, row),
              },
              {
                label: '删除',
                type: 'danger',
                link: true,
                icon: ACTION_ICON.DELETE,
                popConfirm: {
                  title: '确认删除？',
                  confirm: handleDelete.bind(null, row),
                },
              },
            ]"
          />
        </template>
      </Grid>
    </div>
  </div>
</template>
