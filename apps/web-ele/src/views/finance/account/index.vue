<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpAccountApi } from '#/api/erp/finance/account';

import { Page, useVbenModal } from '@vben/common-ui';
import { CommonStatusEnum } from '@vben/constants';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteAccount,
  exportAccount,
  getAccountPage,
} from '#/api/erp/finance/account';
import { $t } from '#/locales';

import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';
import { useGridColumns, useGridFormSchema } from '#/views/finance/account/data';
import AccountForm from '#/views/finance/account/modules/form.vue';

import { ElLoading, ElMessage, ElTag } from 'element-plus';

/** 结算账户管理 */
defineOptions({ name: 'ErpFinanceAccount' });

const { dataTable, hasPermission } = useDataTablePermission();

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: ErpAccountApi.Account) {
  formModalApi.setData(row).open();
}

async function handleDelete(row: ErpAccountApi.Account) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.name]),
  });
  try {
    await deleteAccount(row.rowid as any);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleExport() {
  const data = await exportAccount(await gridApi.formApi.getValues());
  downloadFileFromBlobPart({ fileName: '结算账户.xls', source: data });
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: AccountForm,
  destroyOnClose: true,
});

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
          const res = await getAccountPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          } as any);
          dataTable.value = res.dataTable;
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
    },
  } as VxeTableGridOptions<ErpAccountApi.Account>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="结算账户列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['结算账户']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              ifShow: hasPermission('data:add'),
              onClick: handleCreate,
            },
            {
              label: $t('ui.actionTitle.export'),
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              ifShow: hasPermission('data:add'),
              onClick: handleExport,
            },
          ]"
        />
      </template>

      <template #status="{ row }">
        <ElTag v-if="row.status === CommonStatusEnum.ENABLE" type="success">
          开启
        </ElTag>
        <ElTag v-else type="danger">关闭</ElTag>
      </template>

      <template #defaultStatus="{ row }">
        <ElTag v-if="row.default_status" type="warning">默认</ElTag>
        <ElTag v-else type="info">否</ElTag>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('row:edit', row.rowid),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: hasPermission('row:delete', row.rowid),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.name]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
