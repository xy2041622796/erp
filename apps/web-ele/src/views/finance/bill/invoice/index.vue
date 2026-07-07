<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilInvoiceApplyApi } from '#/api/erp/finance/bill/invoice';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import {
  deleteInvoiceApply,
  getInvoiceApplyPage,
  updateInvoiceApplyBase,
} from '#/api/erp/finance/bill/invoice';

import {
  INVOICE_APPLY_TAB_STATUS,
  useGridColumns,
  useGridFormSchema,
} from '#/views/finance/bill/invoice/data';
import Form from '#/views/finance/bill/invoice/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceInvoiceApply' });

const activeTab = ref<'all' | 'done' | 'todoApprove' | 'todoInvoice'>('all');
const tabStatus = computed(() => INVOICE_APPLY_TAB_STATUS[activeTab.value]);

const customerOptions = ref<any[]>([]);
getCustomerSimpleList().then((res) => {
  customerOptions.value = Array.isArray(res) ? res : [];
});

function getCustomerName(id: any) {
  return customerOptions.value.find((c) => c.id === id)?.name || '';
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: any) {
  formModalApi.setData({ type: 'edit', id: row.rowid }).open();
}

function handleDetail(row: any) {
  formModalApi.setData({ type: 'detail', id: row.rowid }).open();
}

async function handleDelete(row: any) {
  const loading = ElLoading.service({ text: '删除中...' });
  try {
    await deleteInvoiceApply(row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? '删除失败');
  } finally {
    loading.close();
  }
}

async function handleUpdateStatus(row: any, status: number) {
  const actionName = status === 20 ? '审批' : '反审批';
  const loading = ElLoading.service({ text: `${actionName}中...` });
  try {
    await updateInvoiceApplyBase({ rowid: row.rowid, status });
    ElMessage.success(`${actionName}成功`);
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? `${actionName}失败`);
  } finally {
    loading.close();
  }
}

function handleTabChange() {
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          return await getInvoiceApplyPage({
            pageNo: page.currentPage,
            page: page.page,
            status: tabStatus.value,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
      custom: true,
    },
  } as VxeTableGridOptions<BilInvoiceApplyApi.InvoiceApply>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审批" name="todoApprove" />
        <el-tab-pane label="待开票" name="todoInvoice" />
        <el-tab-pane label="已开票" name="done" />
      </el-tabs>

      <TableAction
        :actions="[
          {
            label: '新增开票申请',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: handleCreate,
          },
        ]"
      />
    </div>

    <Grid table-title="开票申请列表">
      <template #apply_date_no="{ row }">
        <div>
          <div>{{ row.apply_date || '--' }}</div>
          <div class="text-primary">{{ row.invoice_apply_no || '--' }}</div>
        </div>
      </template>

      <template #applicant_department="{ row }">
        <div>
          <div>{{ row.applicant || '--' }}</div>
          <div>{{ row.apply_department || '--' }}</div>
        </div>
      </template>

      <template #customer_title="{ row }">
        <div>
          <div class="text-primary">{{ getCustomerName(row.customer_id) }}</div>
          <div>{{ row.invoice_title || '--' }}</div>
        </div>
      </template>

      <template #amount_tax="{ row }">
        <div>
          <div>{{ row.total_amount ?? 0 }}</div>
          <div>{{ row.tax_rate ?? '--' }}</div>
        </div>
      </template>

      <template #status="{ row }">
        <ElTag
          :type="
            row.status === 10
              ? 'warning'
              : row.status === 20
                ? 'info'
                : row.status === 30
                  ? 'success'
                  : undefined
          "
        >
          {{
            row.status === 10
              ? '待审批'
              : row.status === 20
                ? '待开票'
                : row.status === 30
                  ? '已开票'
                  : (row.status ?? '--')
          }}
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
              onClick: () => handleDetail(row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: row.status === 10 || row.status === 20,
              onClick: () => handleEdit(row),
            },
            {
              label: row.status === 10 ? '审批' : '反审批',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              ifShow: row.status === 10 || row.status === 20,
              popConfirm: {
                title: `确认${row.status === 10 ? '审批' : '反审批'}？`,
                confirm: () =>
                  handleUpdateStatus(row, row.status === 10 ? 20 : 10),
              },
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: row.status === 10,
              popConfirm: {
                title: '确认删除？',
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
