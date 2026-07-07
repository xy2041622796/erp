<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { DocAlert, Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductStockSummaryPage } from '#/api/erp/stock/product-summary';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema, type ProductStockSummaryRow } from './data';

import { ElMessage } from 'element-plus';

defineOptions({ name: 'ErpStockProductSummary' });

const currentDataTable = ref<any>(null);

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function calcFooterData({ columns, data }: { columns: any[]; data: ProductStockSummaryRow[] }) {
  const sumFields = new Set([
    'in_count',
    'in_amount',
    'out_count',
    'out_amount',
    'net_change_count',
    'ending_count',
    'ending_amount',
  ]);

  return [
    columns.map((column: any, columnIndex: number) => {
      if (columnIndex === 0) return '合计';
      if (!sumFields.has(column.field)) return '';
      return data.reduce((sum, row) => sum + toNumber((row as any)[column.field]), 0).toFixed(2);
    }),
  ];
}

async function querySummary(formValues: any, pageNo = 1, pageSize = 10) {
  const res = await getProductStockSummaryPage({
    ...formValues,
    size: pageSize,
    index: pageNo,
  });
  const items = (Array.isArray(res.list) ? res.list : []) as ProductStockSummaryRow[];
  currentDataTable.value = res.dataTable;

  return {
    items,
    rows: items,
    list: items,
    total: res.total || items.length,
  };
}

async function handleExport() {
  const values = await gridApi.formApi.getValues();
  const res = await getProductStockSummaryPage({
    ...values,
    size: 0,
    index: 1,
  });
  const rows = (Array.isArray(res.list) ? res.list : []) as ProductStockSummaryRow[];
  const header = [
    '商品编码',
    '商品名称',
    '商品分类',
    '规格型号',
    '单位',
    '仓库',
    '本期入库数量',
    '本期入库金额',
    '本期出库数量',
    '本期出库金额',
    '净变化数量',
    '期末数量',
    '期末金额',
    '首笔发生时间',
    '末笔发生时间',
  ];
  const body = rows.map((row) => [
    row.product_code,
    row.product_name,
    row.product_category_name,
    row.model,
    row.unit_name,
    row.warehouse_name,
    row.in_count,
    row.in_amount,
    row.out_count,
    row.out_amount,
    row.net_change_count,
    row.ending_count,
    row.ending_amount,
    row.first_biz_time,
    row.last_biz_time,
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');

  downloadFileFromBlobPart({
    fileName: '商品收发汇总.csv',
    source: new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
  });
}

function handleOpenDetail(row: ProductStockSummaryRow) {
  ElMessage.info(`后续可跳转商品收发明细：${row.product_name || row.product_code || row.product_id}`);
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    showFooter: true,
    footerMethod: calcFooterData,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const pageSize = page.pageSize || page.page || 10;
          return await querySummary(formValues, page.currentPage, pageSize);
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
  } as VxeTableGridOptions<ProductStockSummaryRow>,
});
</script>

<template>
  <Page auto-content-height>
    <template #doc>
      <DocAlert
        title="商品收发汇总直接查询视图 v_erp_product_stock_receive_issue_summary_all"
        url="https://www.ningmengyun.com/"
      />
    </template>

    <Grid table-title="商品收发汇总">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出产品汇总数据为Excel文件', placement: 'top' },
              disabled: !currentDataTable,
              onClick: handleExport,
            },
          ]"
        />
      </template>

      <template #product_name="{ row }">
        <a class="text-primary cursor-pointer" @click="handleOpenDetail(row)">
          {{ row.product_name || '-' }}
        </a>
      </template>
    </Grid>
  </Page>
</template>
