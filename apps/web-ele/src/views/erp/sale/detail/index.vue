<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleDetailApi } from '#/api/erp/sale/detail';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getSaleDetailPage } from '#/api/erp/sale/detail';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';

import { useGridColumns, useGridFormSchema } from './data';

defineOptions({ name: 'ErpSaleDetail' });

const customerList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const userList = ref<any[]>([]);
const productList = ref<any[]>([]);

function handleRefresh() {
  gridApi.query();
}

function getBizTypeTagType(bizType: string) {
  return bizType === 'sale_return' ? 'warning' : 'success';
}

function getDirectionTagType(direction: string) {
  return direction === 'out' ? 'danger' : 'success';
}

function getProductDisplayName(row: ErpSaleDetailApi.SaleDetailRow) {
  const product = productList.value.find(
    (item) =>
      String(item.rowid ?? item.id ?? '') === String(row.product_id ?? '') ||
      String(item.product_code ?? '') === String(row.product_id ?? ''),
  );
  return row.product_name || product?.product_name || product?.name || row.product_id || '-';
}

onMounted(async () => {
  const [customers, warehouses, users, products] = await Promise.all([
    getCustomerSimpleList(),
    getWarehouseSimpleList(),
    getSimpleUserList(),
    getProductSimpleList(),
  ]);
  customerList.value = Array.isArray(customers) ? customers : [];
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
  userList.value = Array.isArray(users) ? users : [];
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
          return await getSaleDetailPage({
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
  } as VxeTableGridOptions<ErpSaleDetailApi.SaleDetailRow>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="销售出入库明细列表">
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

      <template #customer_id="{ row }">
        {{
          customerList.find(
            (item) =>
              String(item.id ?? item.rowid ?? '') ===
              String(row.customer_id ?? ''),
          )?.name || row.customer_id
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

      <template #sale_user_id="{ row }">
        {{
          userList.find(
            (item) =>
              String(item.ROWID ?? item.rowid ?? item.id ?? '') ===
              String(row.sale_user_id ?? ''),
          )?.UserName || row.sale_user_id
        }}
      </template>

      <template #product_name="{ row }">
        {{ getProductDisplayName(row) }}
      </template>
    </Grid>
  </Page>
</template>
