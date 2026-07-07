<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpStockCheckApi } from '#/api/erp/stock/check';
import type { DataTable } from '#/api/qyapi';

import { computed, ref } from 'vue';

import { DocAlert, Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { saveDimensionResultByRulePayload } from '#/api/erp/finance/dimension/config';
import {
  confirmStockCheck,
  deleteStockCheck,
  exportStockCheck,
  getStockCheckPage,
  getStockCheck,
} from '#/api/erp/stock/check';
import { $t } from '#/locales';

import {
  getStockCheckStatusMeta,
  useGridColumns,
  useGridFormSchema,
} from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage, ElTag } from 'element-plus';

/** ERP 库存盘点单列表 */
defineOptions({ name: 'ErpStockCheck' });

const dataTable = ref<DataTable>();
const checkedRows = ref<ErpStockCheckApi.StockCheck[]>([]);
const deletableCheckedIds = computed(() =>
  checkedRows.value
    .filter((item) => Number(item.status) !== 20)
    .map((item) => item.id!)
    .filter(Boolean),
);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function getStatusLabel(status: unknown) {
  const meta = getStockCheckStatusMeta(status);
  return (
    meta?.label ??
    (status === undefined || status === null || status === ''
      ? '-'
      : String(status))
  );
}

function getStatusTagType(status: unknown) {
  return getStockCheckStatusMeta(status)?.tagType;
}

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportStockCheck(await gridApi.formApi.getValues());
  downloadFileFromBlobPart({ fileName: '库存盘点单.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpStockCheckApi.StockCheck) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  if (ids.length === 0) {
    ElMessage.warning('已确认盘点单不允许删除');
    return;
  }
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteStockCheck(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function generateStockCheckDimensionOnConfirm(row: ErpStockCheckApi.StockCheck) {
  const stockCheckRow = row.id || row.rowid ? await getStockCheck(String(row.id || row.rowid || '')) : row;
  await saveDimensionResultByRulePayload('STOCK_CHECK', stockCheckRow as any, null, {
    allowOverwrite: true,
    skipWhenNoRule: true,
  });
}

async function handleConfirm(row: ErpStockCheckApi.StockCheck) {
  const loadingInstance = ElLoading.service({
    text: `确定确认该盘点单吗？`,
  });
  try {
    await confirmStockCheck(String(row.id || row.rowid || ''));
    await generateStockCheckDimensionOnConfirm(row);
    ElMessage.success('确认成功');
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

function handleRowCheckboxChange({
  records,
}: {
  records: ErpStockCheckApi.StockCheck[];
}) {
  checkedRows.value = records;
}

function handleDetail(row: ErpStockCheckApi.StockCheck) {
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
          const res = await getStockCheckPage({
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
  } as VxeTableGridOptions<ErpStockCheckApi.StockCheck>,
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
    <Grid table-title="库存盘点单列表">
      <template #status="{ row }">
        <ElTag
          v-if="getStockCheckStatusMeta(row.status)"
          :type="getStatusTagType(row.status) as any"
        >
          {{ getStatusLabel(row.status) }}
        </ElTag>
        <span v-else>{{ getStatusLabel(row.status) }}</span>
      </template>
      <template #warehouse_name="{ row }">
        {{ row.warehouse_name || row.warehouse_id || '-' }}
      </template>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '库存盘点单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的库存盘点单', placement: 'top' },
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出库存盘点数据为Excel文件', placement: 'top' },
              onClick: handleExport,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的库存盘点单', placement: 'top' },
              disabled: isEmpty(deletableCheckedIds),
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: `是否删除所选中未确认数据？`,
                confirm: handleDelete.bind(null, deletableCheckedIds),
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
              disabled: !(Number(row.status) !== 20),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              tooltip: { content: '确认', placement: 'top' },
              disabled: !(Number(row.status) === 10),
              popConfirm: {
                title: `确认${row.no}吗？`,
                confirm: handleConfirm.bind(null, row),
              },
            },
            {
              label: '',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              tooltip: { content: $t('common.delete'), placement: 'top' },
              disabled: !(Number(row.status) !== 20),
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
