<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpStockApi } from '#/api/erp/stock/stock';

import { ref } from 'vue';

import { DocAlert, Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { exportStock, getStockPage } from '#/api/erp/stock/stock';
import { $t } from '#/locales';
// import { useDataTablePermission } from '#/views/erp/useDataTablePermission';

import { useGridColumns, useGridFormSchema } from './data';

/** 产品库存管理 */
defineOptions({ name: 'ErpStock' });
// const { hasPermission } = useDataTablePermission(STOCK_TABLE);
const dataTable = ref();
const STOCK_EXPORT_ENCODING_ID = 'DDDAFFC90F8C401CAC6B99E4F4417FBA';

/** 导出库存 */
async function handleExport() {
  const data = await exportStock(
    await gridApi.formApi.getValues(),
    STOCK_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '产品库存.xls', source: data });
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
          const res = await getStockPage({
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
  } as VxeTableGridOptions<ErpStockApi.Stock>,
});
</script>

<template>
  <Page auto-content-height>
    <template #doc>
      <DocAlert
        title="【库存】产品库存、库存明细"
        url="https://doc.iocoder.cn/erp/stock/"
      />
    </template>

    <Grid table-title="产品库存列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出产品库存数据为Excel文件', placement: 'top' },
              // disabled: !dataTable?.hasData(),
              onClick: handleExport,
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
