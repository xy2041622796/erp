<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';
import { erpNumberFormatter } from '@vben/utils';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getInventoryCostCalculatePage } from '#/api/erp/inventory-accounting/calculate-table';

import { useGridColumns, useGridFormSchema } from './data';

defineOptions({ name: 'ErpInventoryCostCalculateTable' });

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function footerMethod({ columns, data }: { columns: any[]; data: any[] }) {
  const sumFields = new Set(['opening_count', 'opening_amount', 'in_count', 'in_amount', 'out_count', 'out_amount', 'ending_count', 'ending_amount']);
  return [columns.map((column, index) => {
    if (index === 0) return '合计';
    if (!sumFields.has(column.field)) return '';
    const value = data.reduce((sum, row) => sum + toNumber(row[column.field]), 0);
    return erpNumberFormatter(value, column.field?.includes('count') ? 3 : 2);
  })];
}

const [Grid] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    showFooter: true,
    footerMethod,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getInventoryCostCalculatePage({ pageNo: page.currentPage, page: page.pageSize || page.page || 10, ...formValues });
          return { items: res.list || [], total: res.total || 0 };
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true, custom: true },
  } as VxeTableGridOptions,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="成本计算表" />
  </Page>
</template>
