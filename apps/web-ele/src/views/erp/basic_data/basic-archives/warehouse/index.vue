<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpWarehouseApi } from '#/api/erp/stock/warehouse';

import { confirm, Page, useVbenModal } from '@vben/common-ui';
import { DICT_TYPE } from '@vben/constants';
import { getDictLabel } from '@vben/hooks';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ElLoading, ElMessage } from 'element-plus';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteWarehouse,
  exportWarehouse,
  getWarehousePage,
  updateWarehouseDefaultStatus,
  updateWarehouseStatus,
} from '#/api/erp/stock/warehouse';
import { $t } from '#/locales';

import { useDataTablePermission } from '../../../shared/useDataTablePermission';
import { useGridColumns, useGridFormSchema } from './data';
import WarehouseForm from './modules/form.vue';

/** 仓库管理 */
defineOptions({ name: 'ErpWarehouse' });

const WAREHOUSE_EXPORT_ENCODING_ID = 'D27649D19FB279DB5A7B24429A0BF86D';

const { dataTable } = useDataTablePermission();

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 导出仓库 */
async function handleExport() {
  const data = await exportWarehouse(
    await gridApi.formApi.getValues(),
    WAREHOUSE_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '仓库.xls', source: data });
}

/** 创建仓库 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑仓库 */
function handleEdit(row: ErpWarehouseApi.Warehouse) {
  formModalApi.setData(row).open();
}

/** 删除仓库 */
async function handleDelete(row: ErpWarehouseApi.Warehouse) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.name]),
  });
  try {
    await deleteWarehouse(row.rowid!);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

/** 修改默认状态 */
function handleDefaultStatusChangeWrapper() {
  return async function handleDefaultStatusChange(
    newStatus: number,
    row: ErpWarehouseApi.Warehouse,
  ): Promise<boolean | undefined> {
    // 判断 row 是否有效，且 rowid 存在，避免渲染时误触发
    if (!row?.rowid) return false;
    return new Promise((resolve, reject) => {
      const text = newStatus ? '设置' : '取消';
      confirm({
        content: `确认要${text}"${row.name}"默认吗?`,
      })
        .then(async () => {
          await updateWarehouseDefaultStatus(row.rowid!, newStatus);
          ElMessage.success(`${text}默认成功`);
          handleRefresh();
          resolve(true);
        })
        .catch(() => {
          reject(new Error('取消操作'));
        });
    });
  };
}

/** 修改启用状态 */
async function handleStatusChange(
  newStatus: number,
  row: ErpWarehouseApi.Warehouse,
): Promise<boolean | undefined> {
  if (!row?.rowid) return false;
  return new Promise((resolve, reject) => {
    const statusLabel = getDictLabel(DICT_TYPE.COMMON_STATUS, newStatus);
    confirm({
      content: `确认将仓库"${row.name}"状态切换为【${statusLabel}】吗?`,
    })
      .then(async () => {
        await updateWarehouseStatus(row.rowid!, newStatus);
        ElMessage.success($t('ui.actionMessage.operationSuccess'));
        handleRefresh();
        resolve(true);
      })
      .catch(() => {
        reject(new Error('取消操作'));
      });
  });
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: WarehouseForm,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(
      handleStatusChange,
      handleDefaultStatusChangeWrapper(),
    ),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getWarehousePage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          });
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
  } as VxeTableGridOptions<ErpWarehouseApi.Warehouse>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="仓库列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '仓库',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的仓库', placement: 'top' },
              // disabled: !(hasPermission('data:add')),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出仓库数据为Excel文件', placement: 'top' },
              // disabled: !(hasPermission('data:add')),
              onClick: handleExport,
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
              // disabled: !(hasPermission('row:edit', row.rowid)),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              // disabled: !(hasPermission('row:delete', row.rowid)),
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
