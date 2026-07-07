<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpStockMoveApi } from '#/api/erp/stock/move';

import { onMounted, ref } from 'vue';

import { DocAlert, Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { saveDimensionResultByRulePayload } from '#/api/erp/finance/dimension/config';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  deleteStockMove,
  exportStockMove,
  getStockMovePage,
  updateStockMoveStatus,
  getStockMove,
} from '#/api/erp/stock/move';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElButton, ElDialog, ElLoading, ElMessage } from 'element-plus';

/** ERP 库存调拨单列表 */
defineOptions({ name: 'ErpStockMove' });

const currentTable = ref<any>();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportStockMove(await gridApi.formApi.getValues());
  downloadFileFromBlobPart({ fileName: '库存调拨单.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpStockMoveApi.StockMove) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteStockMove(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function generateStockMoveDimensionOnApprove(row: ErpStockMoveApi.StockMove) {
  const stockMoveRow = row.id ? await getStockMove(String(row.id)) : row;
  await saveDimensionResultByRulePayload('STOCK_MOVE', stockMoveRow as any, null, {
    allowOverwrite: true,
    skipWhenNoRule: true,
  });
}

async function handleUpdateStatus(
  row: ErpStockMoveApi.StockMove,
  status: number,
) {
  const loadingInstance = ElLoading.service({
    text: `确定${status === 20 ? '完成' : '撤销完成'}该调拨单吗？`,
  });
  try {
    await updateStockMoveStatus(row.id!, status);
    if (status === 20) {
      await generateStockMoveDimensionOnApprove(row);
    }
    ElMessage.success(`${status === 20 ? '完成成功' : '撤销完成成功'}`);
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({
  records,
}: {
  records: ErpStockMoveApi.StockMove[];
}) {
  checkedIds.value = records.map((item) => String(item.id || ''));
}

function handleDetail(row: ErpStockMoveApi.StockMove) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
}

const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');

onMounted(async () => {
  const [products, categories, warehouses] = await Promise.all([
    getProductSimpleList(),
    getProductCategorySimpleList(),
    getWarehouseSimpleList(),
  ]);
  productList.value = Array.isArray(products) ? products : [];
  categoryList.value = Array.isArray(categories) ? categories : [];
  warehouseList.value = warehouses;
});

function enrichStockMovePrintData(data: any) {
  return {
    ...data,
    _from_warehouse_name:
      warehouseList.value.find((item) => String(item.rowid) === String(data?.from_warehouse_id || ''))?.name ||
      data?.from_warehouse_name,
    _to_warehouse_name:
      warehouseList.value.find((item) => String(item.rowid) === String(data?.to_warehouse_id || ''))?.name ||
      data?.to_warehouse_name,
  };
}

async function handlePrintOne(row: ErpStockMoveApi.StockMove) {
  if (!row?.id) return;
  const detail = await getStockMove(String(row.id));
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'stock-move',
    data: enrichStockMovePrintData(detail),
    companyName,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseList.value,
  });
  await writePrintHtmlAndPrint(html);
}

async function handlePrintSelected() {
  if (checkedIds.value.length === 0) {
    ElMessage.warning('请先选择要打印的单据');
    return;
  }
  for (const id of checkedIds.value) {
    const row = gridApi.grid.getData().find((item: any) => String(item?.id || '') === String(id));
    if (row) await handlePrintOne(row as any);
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
          const res = await getStockMovePage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          });
          currentTable.value = res.dataTable;
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
  } as VxeTableGridOptions<ErpStockMoveApi.StockMove>,
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
        title="【库存】库存调拨、库存盘点"
        url="https://doc.iocoder.cn/erp/stock-move-check/"
      />
    </template>

    <FormModal @success="handleRefresh" />
    <Grid table-title="库存调拨单列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '库存调拨单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的库存调拨单', placement: 'top' },
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出库存调拨数据为Excel文件', placement: 'top' },
              onClick: handleExport,
            },
            {
              label: '打印选中',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '打印已选中的库存调拨单', placement: 'top' },
              disabled: isEmpty(checkedIds),
              onClick: handlePrintSelected,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的库存调拨单', placement: 'top' },
              disabled: isEmpty(checkedIds),
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
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              tooltip: { content: $t('common.edit'), placement: 'top' },
              disabled: !(row.status !== 20),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              tooltip: { content: row.status === 10 ? '完成' : '撤销完成', placement: 'top' },
              popConfirm: {
                title: `确认${row.status === 10 ? '完成' : '撤销完成'}${row.displayNo || row.no || ''}吗？`,
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
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.displayNo || row.no || '该记录']),
                confirm: handleDelete.bind(null, [String(row.id || '')]),
              },
            },
          ]"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="printPreviewVisible"
      title="打印预览"
      width="980px"
      :close-on-click-modal="false"
    >
      <div class="mb-2 text-sm text-[#666]">打印预览</div>
      <iframe class="h-[520px] w-full border" :srcdoc="printPreviewHtml"></iframe>
      <template #footer>
        <ElButton type="primary" @click="printPreviewVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
:deep(.table-actions .iconify) {
  width: 1.25em;
  height: 1.25em;
}
</style>
