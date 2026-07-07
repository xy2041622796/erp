<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { getContract } from '#/api/erp/contract/contract';
import { getProject } from '#/api/erp/contract/project';
import { getCustomerSimpleList } from '#/api/erp/customer';
import {
  deleteOpeningIncomeExpenseSettle,
  getOpeningIncomeExpenseSettlePage,
} from '#/api/erp/finance/settings/init_data/opening_income_expense_settle';
import { formatDateOnly } from '#/utils/date';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';

import InitBusinessForm from './init-business-form.vue';

import { ElMessage } from 'element-plus';

const customerOptions = ref<any[]>([]);
const customerNameCache = new Map<string, string>();
const contractNameCache = new Map<string, string>();
const projectNameCache = new Map<string, string>();

let customerOptionsLoading: Promise<void> | null = null;

async function ensureCustomerOptionsLoaded() {
  if (customerOptions.value.length > 0) return;
  if (!customerOptionsLoading) {
    customerOptionsLoading = (async () => {
      customerOptions.value = await getCustomerSimpleList();
    })().finally(() => {
      customerOptionsLoading = null;
    });
  }
  await customerOptionsLoading;
}

function toKey(v: any) {
  const s = String(v ?? '').trim();
  return s || '';
}

function getCustomerName(id: any) {
  const key = toKey(id);
  if (!key) return '';
  const cached = customerNameCache.get(key);

  if (cached && cached !== key) return cached;
  if (customerOptions.value.length === 0) return key;

  const hit = customerOptions.value.find(
    (c) => String(c?.rowid ?? c?.id ?? '') === key,
  );
  const name = String(hit?.name ?? hit?.customerName ?? hit?.customer_name ?? key);
  customerNameCache.set(key, name);
  return name;
}

async function getContractName(id: any) {
  const key = toKey(id);
  if (!key) return '';
  const cached = contractNameCache.get(key);
  if (cached) return cached;
  try {
    const detail: any = await getContract(key);
    const name = String(detail?.contract_no ?? detail?.contract_name ?? key);
    contractNameCache.set(key, name);
    return name;
  } catch {
    contractNameCache.set(key, key);
    return key;
  }
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

async function fillNamesForCurrentPage(rows: any[]) {
  await ensureCustomerOptionsLoaded();
  await Promise.all(
    (rows || []).map(async (r) => {
      if (r?.customer_id && !r.customer_name)
        r.customer_name = getCustomerName(r.customer_id);
      if (r?.contract_id && !r.contract_name)
        r.contract_name = await getContractName(r.contract_id);
      if (r?.project_id && !r.project_name)
        r.project_name = await getProjectName(r.project_id);
    }),
  );
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: InitBusinessForm,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData({ biz: 'other_income', type: 'create' }).open();
}

function handleEdit(row: any) {
  formModalApi.setData({ biz: 'other_income', type: 'edit', row }).open();
}

async function handleDelete(row: any) {
  try {
    await deleteOpeningIncomeExpenseSettle(row.id ?? row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

function handleImport() {
  ElMessage.info('导入功能待实现');
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'keyword',
        label: '关键字',
        component: 'Input',
        componentProps: {
          placeholder: '编号/备注',
          allowClear: true,
        },
      },
      {
        fieldName: 'billDateRange',
        label: '日期',
        component: 'RangePicker',
        componentProps: {
          clearable: true,
        },
      },
    ],
  },
  gridOptions: {
    height: 750,
    keepSource: true,
    scrollY: { enabled: false },
    columns: [
      { title: '#', type: 'seq', width: 60, fixed: 'left' },
      {
        title: '日期/编号',
        field: 'opening_date',
        minWidth: 180,
        slots: { default: 'date_no' },
      },
      {
        title: '合同',
        field: 'contract_id',
        minWidth: 200,
        slots: { default: 'contract' },
      },
      {
        title: '客户/项目',
        field: 'customer_id',
        minWidth: 220,
        slots: { default: 'customer_project' },
      },
      { title: '部门', field: 'dept_id', minWidth: 160 },
      { title: '金额', field: 'amount', minWidth: 120 },
      {
        title: '期初已收款/应收余额',
        field: 'opening_received_paid_amount',
        minWidth: 160,
        slots: { default: 'receive' },
      },
      { title: '已开票', field: 'opening_invoiced_amount', minWidth: 120 },
      { title: '备注', field: 'remark', minWidth: 220 },
      {
        title: '操作',
        field: 'actions',
        width: 200,
        fixed: 'right',
        slots: { default: 'actions' },
      },
    ] as VxeTableGridOptions['columns'],
    pagerConfig: {
      enabled: true,
      page: 10,
      pageSizes: [10, 20, 50, 100],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const result = await getOpeningIncomeExpenseSettlePage({
            pageNo: page.currentPage,
            page: page.page,
            biz_type: 'QTSR',
            keyword: formValues?.keyword,
          });
          await fillNamesForCurrentPage(result.list);
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
            label: '导入',
            icon: ACTION_ICON.UPLOAD,
            onClick: handleImport,
          },
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
      <Grid table-title="期初其他收入">
        <template #date_no="{ row }">
          <div class="text-center">
            <div class="w-full">
              {{
                formatDateOnly(row.opening_date ?? row.init_date ?? row.bill_date) ||
                '--'
              }}
            </div>
            <div class="text-center text-primary">
              {{ row.opening_no ?? row.init_no ?? row.bill_no ?? '--' }}
            </div>
          </div>
        </template>

        <template #contract="{ row }">
          <div class="w-full">
            <div>{{ row.contract_name || row.contract_id || '--' }}</div>
          </div>
        </template>

        <template #customer_project="{ row }">
          <div class="w-full">
            <div>{{ row.customer_name || row.customer_id || '--' }}</div>
            <div class="text-xs text-gray-500">
              {{ row.project_name || row.project_id || '--' }}
            </div>
          </div>
        </template>

        <template #receive="{ row }">
          <div class="text-center">
            <div>
              {{
                row.opening_received_paid_amount ??
                row.received_amount ??
                row.paid_received_amount ??
                0
              }}
            </div>
            <div class="text-xs text-gray-500">
              {{
                row.opening_balance ??
                row.receivable_balance ??
                row.after_balance ??
                0
              }}
            </div>
          </div>
        </template>

        <template #actions="{ row }">
          <TableAction
            :actions="[
              {
                label: '编辑',
                type: 'primary',
                icon: ACTION_ICON.EDIT,
                onClick: () => handleEdit(row),
              },
              {
                label: '删除',
                type: 'danger',
                icon: ACTION_ICON.DELETE,
                popConfirm: {
                  title: '确认删除？',
                  confirm: () => handleDelete(row),
                },
              },
            ]"
          />
        </template>
      </Grid>
    </div>
  </div>
</template>
