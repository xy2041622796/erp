<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseDetailApi } from '#/api/erp/purchase/detail';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getPurchaseDetailPage } from '#/api/erp/purchase/detail';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import { useGridColumns, useGridFormSchema } from './data';

defineOptions({ name: 'ErpPurchaseDetail' });

const supplierList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const productList = ref<any[]>([]);

function handleRefresh() {
  gridApi.query();
}

function getBizTypeTagType(bizType: string) {
  return bizType === 'purchase_return' ? 'warning' : 'success';
}

function getDirectionTagType(direction: string) {
  return direction === 'out' ? 'danger' : 'success';
}

function getProductDisplayName(row: ErpPurchaseDetailApi.PurchaseDetailRow) {
  const productId = String(row.product_id ?? '').trim();
  const rowName = String(row.product_name ?? '').trim();
  const product = productList.value.find(
    (item) =>
      String(item.rowid ?? item.row_id ?? item.id ?? '') === productId ||
      String(item.product_code ?? '') === productId,
  );
  const optionName = String(product?.product_name ?? product?.name ?? '').trim();
  if (rowName && rowName !== productId) return rowName;
  return optionName || productId || '-';
}

onMounted(async () => {
  const [suppliers, warehouses, products] = await Promise.all([
    getSupplierSimpleList(),
    getWarehouseSimpleList(),
    getProductSimpleList(),
  ]);
  supplierList.value = Array.isArray(suppliers) ? suppliers : [];
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
  productList.value = Array.isArray(products) ? products : [];
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
          return await getPurchaseDetailPage({
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
      custom: true,
    },
  } as VxeTableGridOptions<ErpPurchaseDetailApi.PurchaseDetailRow>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="采购出入库明细">
      <template #toolbar-tools>
        <ElButton type="primary" @click="handleRefresh">刷新</ElButton>
      </template>

      <template #stock_direction_name="{ row }">
        <ElTag :type="getDirectionTagType(row.stock_direction)" effect="plain">
          {{ row.stock_direction_name }}
        </ElTag>
      </template>

      <template #biz_type_name="{ row }">
        <ElTag :type="getBizTypeTagType(row.biz_type)" effect="plain">
          {{ row.biz_type_name }}
        </ElTag>
      </template>

      <template #supplier_id="{ row }">
        {{
          supplierList.find(
            (item) =>
              String(item.rowid ?? item.id ?? '') ===
              String(row.supplier_id ?? ''),
          )?.name || row.supplier_id
        }}
      </template>

      <template #warehouse_id="{ row }">
        {{
          warehouseList.find(
            (item) =>
              String(item.rowid ?? item.id ?? '') ===
              String(row.warehouse_id ?? ''),
          )?.name || row.warehouse_name || row.warehouse_id
        }}
      </template>

      <template #product_name="{ row }">
        {{ getProductDisplayName(row) }}
      </template>
    </Grid>
  </Page>
</template>
