<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getInventoryCostExceptionPage } from '#/api/erp/inventory-accounting/balance-exception';

import { useGridColumns, useGridFormSchema } from './data';

defineOptions({ name: 'ErpInventoryCostBalanceException' });

const [Grid] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getInventoryCostExceptionPage({ pageNo: page.currentPage, page: page.pageSize || page.page || 10, ...formValues });
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
    <Grid table-title="结存成本异常查询" />
  </Page>
</template>
