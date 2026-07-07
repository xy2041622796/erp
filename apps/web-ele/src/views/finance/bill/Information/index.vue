<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilSalesCompanyApi } from '#/api/erp/finance/bill/Information';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSalesCompany,
  getSalesCompanyPage,
} from '#/api/erp/finance/bill/Information';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useGridColumns, useGridFormSchema } from '#/views/finance/bill/Information/data';
import Form from '#/views/finance/bill/Information/modules/form.vue';

import { ElLoading, ElMessage } from 'element-plus';

defineOptions({ name: 'FinanceSalesCompany' });

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const { dataTable, hasPermission } = useDataTablePermission();

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: BilSalesCompanyApi.SalesCompany) {
  formModalApi
    .setData({ type: 'edit', id: row.id, lingma_sys_ent: row.lingma_sys_ent })
    .open();
}

function handleDetail(row: BilSalesCompanyApi.SalesCompany) {
  formModalApi
    .setData({ type: 'detail', id: row.id, lingma_sys_ent: row.lingma_sys_ent })
    .open();
}

async function handleDeleteRow(row: BilSalesCompanyApi.SalesCompany) {
  const loading = ElLoading.service({ text: '删除中...' });
  try {
    await deleteSalesCompany(row.id!, row.lingma_sys_ent);
    ElMessage.success('删除成功');
    handleRefresh();
  } finally {
    loading.close();
  }
}

// async function handleSync() {
//   ElMessage.info('同步功能暂未接入');
// }

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
        query: async ({ page }, formValues) => {
          const res = await getSalesCompanyPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          dataTable.value = res.dataTable;
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<BilSalesCompanyApi.SalesCompany>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <Grid table-title="销方公司">
      <template #toolbar-tools>
        <div class="flex gap-2">
          <TableAction
            :actions="[
              // {
              //   label: '同步销方公司',
              //   icon: ACTION_ICON.REFRESH,
              //   onClick: handleSync,
              // },
              {
                label: '新增销方公司',
                type: 'primary',
                icon: ACTION_ICON.ADD,
                ifShow: hasPermission('data:add'),
                onClick: handleCreate,
              },
            ]"
          />
        </div>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '详情',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              ifShow: hasPermission('row:view', row.id),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('row:edit', row.id),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: hasPermission('row:delete', row.id),
              popConfirm: {
                title: '确认删除？',
                confirm: handleDeleteRow.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
