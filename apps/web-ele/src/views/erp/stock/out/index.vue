<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpStockOutApi } from '#/api/erp/stock/out';

import { ref } from 'vue';

import { useAccess } from '@vben/access';
import { DocAlert, Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { saveDimensionResultByRulePayload } from '#/api/erp/finance/dimension/config';
import {
  deleteStockOut,
  exportStockOut,
  getStockOutPage,
  updateStockOutStatus,
  getStockOut,
} from '#/api/erp/stock/out';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage } from 'element-plus';

/** ERP 其它出库单列表 */
defineOptions({ name: 'ErpStockOut' });

const { hasAccessByCodes } = useAccess();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 导出表格 */
async function handleExport() {
  const data = await exportStockOut(await gridApi.formApi.getValues());
  downloadFileFromBlobPart({ fileName: '其它出库单.xls', source: data });
}

/** 新增其它出库单 */
function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

/** 编辑其它出库单 */
function handleEdit(row: ErpStockOutApi.StockOut) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

/** 删除其它出库单 */
async function handleDelete(ids: number[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteStockOut(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function generateStockOutDimensionOnApprove(row: ErpStockOutApi.StockOut) {
  const stockOutRow = row.id ? await getStockOut(row.id) : row;
  await saveDimensionResultByRulePayload('STOCK_OUT', stockOutRow as any, null, {
    allowOverwrite: true,
    skipWhenNoRule: true,
  });
}

/** 审批/反审批操作 */
async function handleUpdateStatus(
  row: ErpStockOutApi.StockOut,
  status: number,
) {
  const loadingInstance = ElLoading.service({
    text: `确定${status === 20 ? '审批' : '反审批'}该出库单吗？`,
  });
  try {
    await updateStockOutStatus(row.id!, status);
    if (status === 20) {
      await generateStockOutDimensionOnApprove(row);
    }
    ElMessage.success(`${status === 20 ? '审批成功' : '反审批成功'}`);
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

const checkedIds = ref<number[]>([]);
function handleRowCheckboxChange({
  records,
}: {
  records: ErpStockOutApi.StockOut[];
}) {
  checkedIds.value = records.map((item) => item.id!);
}

/** 查看详情 */
function handleDetail(row: ErpStockOutApi.StockOut) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
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
          return await getStockOutPage({
            index: page.currentPage,
            size: page.page,
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
  } as VxeTableGridOptions<ErpStockOutApi.StockOut>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <template #doc>
      <DocAlert
        title="【库存】其它入库、其它出库"
        url="https://doc.iocoder.cn/erp/stock-in-out/"
      />
    </template>

    <FormModal @success="handleRefresh" />
    <Grid table-title="其它出库单列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '其它出库单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的其它出库单', placement: 'top' },
              disabled: !hasAccessByCodes(['erp:stock-out:create']),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出其它出库数据为Excel文件', placement: 'top' },
              disabled: !hasAccessByCodes(['erp:stock-out:export']),
              onClick: handleExport,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的其它出库单', placement: 'top' },
              disabled: isEmpty(checkedIds) || !hasAccessByCodes(['erp:stock-out:delete']),
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: `是否删除所选中数据？`,
                confirm: handleDelete.bind(null, checkedIds),
              },
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              tooltip: { content: $t('common.detail'), placement: 'top' },
              disabled: !hasAccessByCodes(['erp:stock-out:query']),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              tooltip: { content: $t('common.edit'), placement: 'top' },
              disabled: !(row.status !== 20) || !hasAccessByCodes(['erp:stock-out:update']),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              tooltip: { content: row.status === 10 ? '审批' : '反审批', placement: 'top' },
              disabled: !hasAccessByCodes(['erp:stock-out:update-status']),
              popConfirm: {
                title: `确认${row.status === 10 ? '审批' : '反审批'}${row.no}吗？`,
                confirm: handleUpdateStatus.bind(
                  null,
                  row,
                  row.status === 10 ? 20 : 10,
                ),
              },
            },
            {
              label: '',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              tooltip: { content: $t('common.delete'), placement: 'top' },
              disabled: !hasAccessByCodes(['erp:stock-out:delete']),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.no]),
                confirm: handleDelete.bind(null, [row.id!]),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
:deep(.table-actions .iconify) {
  width: 1.25em;
  height: 1.25em;
}
</style>
