<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilInvoiceInfoApi } from '#/api/erp/finance/bill/income';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/crm/customer';
import {
  deleteInvoiceInfo,
  getInvoiceInfoPage,
} from '#/api/erp/finance/bill/income';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useGridColumns, useGridFormSchema } from '#/views/finance/bill/income/data';
import Form from '#/views/finance/bill/income/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTooltip,
} from 'element-plus';

defineOptions({ name: 'FinanceInvoiceInfo' });

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
    await deleteInvoiceInfo(row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? '删除失败');
  } finally {
    loading.close();
  }
}

const customerOptions = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await getCustomerSimpleList();
    customerOptions.value = res.map((item) => ({
      id: item.ROWID,
      name: item.CustomerName,
    }));
  } catch (error) {
    console.error('获取客户列表失败', error);
  }
});

const { dataTable, hasPermission } = useDataTablePermission();

const activeTab = ref('all');

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
          const res = await getInvoiceInfoPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
            is_seller_invoice: 0,
            tab: activeTab.value,
          });
          dataTable.value = res.dataTable;
          return res;
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
  } as VxeTableGridOptions<BilInvoiceInfoApi.InvoiceInfo>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <ElTabs v-model="activeTab" class="mb-2" @tab-change="handleRefresh">
      <ElTabPane label="全部" name="all" />
      <ElTabPane name="pending_approval">
        <template #label>
          <span class="flex items-center gap-1">
            待审批
            <ElTooltip content="待审批说明" placement="top">
              <IconifyIcon icon="ep:info-filled" />
            </ElTooltip>
          </span>
        </template>
      </ElTabPane>
      <ElTabPane name="pending_certification">
        <template #label>
          <span class="flex items-center gap-1">
            待认证
            <ElTooltip content="待认证说明" placement="top">
              <IconifyIcon icon="ep:info-filled" />
            </ElTooltip>
          </span>
        </template>
      </ElTabPane>
      <ElTabPane label="已收票" name="received" />
    </ElTabs>

    <Grid table-title="开票信息列表">
      <template #invoice_number="{ row }">
        <div class="flex flex-col">
          <div class="flex items-center gap-1">
            <span class="cursor-pointer text-primary">{{
              row.invoice_number
            }}</span>
            <ElTag v-if="row.invoice_type" size="small" effect="plain">
              {{ row.invoice_type }}
            </ElTag>
          </div>
          <span class="text-xs text-gray-500">{{ row.seller_company_id }}</span>
        </div>
      </template>

      <template #customer_id="{ row }">
        {{
          customerOptions.find((item) => item.id === row.customer_id)?.name ||
          row.customer_id
        }}
      </template>

      <template #invoice_info="{ row }">
        <div class="flex flex-col text-right">
          <span>{{ moneyText(row.invoice_amount || 0) }}</span>
          <span class="text-xs text-gray-400">{{
            moneyText(row.tax_amount || 0)
          }}</span>
        </div>
      </template>

      <template #flowstate="{ row }">
        <span class="text-success" v-if="row.flowstate === 2">完成</span>
        <span class="text-warning" v-else-if="row.flowstate === 1">审批中</span>
        <span class="text-gray-400" v-else>草稿</span>
      </template>

      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增开票信息',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              ifShow: hasPermission('data:add'),
              onClick: handleCreate,
            },
          ]"
        />
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '详情',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              ifShow: hasPermission('row:view', row.rowid),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('row:edit', row.rowid),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: hasPermission('row:delete', row.rowid),
              popConfirm: {
                title: '确认删除？',
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
