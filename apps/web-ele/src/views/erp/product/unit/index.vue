<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProductUnitApi } from '#/api/erp/product/unit';

import { DocAlert, Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteProductUnit,
  getProductUnitPage,
} from '#/api/erp/product/unit';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage } from 'element-plus';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 创建产品单位 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑产品单位 */
function handleEdit(row: ErpProductUnitApi.ProductUnit) {
  formModalApi.setData(row).open();
}

/** 删除产品单位 */
async function handleDelete(row: ErpProductUnitApi.ProductUnit) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.name]),
  });
  try {
    if (row.id !== undefined && row.id !== null) {
      await deleteProductUnit(row.id);
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
      handleRefresh();
    }
  } finally {
    loadingInstance.close();
  }
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
        query: async ({ page }, formValues) => {
          return await getProductUnitPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
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
  } as VxeTableGridOptions<ErpProductUnitApi.ProductUnit>,
});
</script>

<template>
  <Page auto-content-height>
    <template #doc>
      <DocAlert
        title="【产品】产品信息、分类、单位"
        url="https://doc.iocoder.cn/erp/product/"
      />
    </template>
    <FormModal @success="handleRefresh" />
    <Grid table-title="产品单位列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '产品单位',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的产品单位', placement: 'top' },
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
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
