<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseSummaryApi } from '#/api/erp/purchase/summary';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { erpNumberFormatter } from '@vben/utils';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getPurchaseSummaryPage } from '#/api/erp/purchase/summary';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';

import { useGridColumns, useGridFormSchema } from './data';

defineOptions({ name: 'ErpPurchaseSummary' });

const supplierList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const userList = ref<any[]>([]);
const productList = ref<any[]>([]);
const productCategoryList = ref<any[]>([]);
const summaryRow = ref<ErpPurchaseSummaryApi.PurchaseSummaryRow>();

function handleRefresh() {
  gridApi.query();
}



function normalizeQueryFormValues(formValues: any) {
  const restFormValues = { ...(formValues || {}) };
  delete restFormValues.summary_subject;
  return {
    ...restFormValues,
  };
}

function normalizeId(value: any) {
  return String(value ?? '').trim();
}

function pickText(item: any, fields: string[]) {
  for (const field of fields) {
    const value = item?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return '';
}

function flattenTree(list: any[]): any[] {
  const result: any[] = [];
  const visit = (items: any[]) => {
    for (const item of items || []) {
      result.push(item);
      if (Array.isArray(item.children)) visit(item.children);
    }
  };
  visit(list);
  return result;
}

function getProductById(productId?: string) {
  const id = normalizeId(productId);
  return productList.value.find((item) => {
    const keys = [item.rowid, item.id, item.product_id, item.product_code, item.code, item.bar_code, item.product_bar_code];
    return keys.some((key) => normalizeId(key) === id);
  });
}

function getSupplierById(supplierId?: string | number) {
  const id = normalizeId(supplierId);
  return supplierList.value.find((item) => {
    const keys = [item.rowid, item.id, item.ROWID, item.supplier_id, item.supplier_code, item.code];
    return keys.some((key) => normalizeId(key) === id);
  });
}

function getUserById(userId?: string) {
  const id = normalizeId(userId);
  return userList.value.find((item) => {
    const keys = [item.ROWID, item.rowid, item.id, item.UserID, item.user_id, item.account, item.UserAccount];
    return keys.some((key) => normalizeId(key) === id);
  });
}

function getProductCategoryById(categoryId?: string) {
  const id = normalizeId(categoryId);
  return productCategoryList.value.find((item) => {
    const keys = [item.id, item.rowid, item.ROWID, item.category_id, item.code];
    return keys.some((key) => normalizeId(key) === id);
  });
}

function getSupplierDisplayName(row: ErpPurchaseSummaryApi.PurchaseSummaryRow) {
  const supplier = getSupplierById(row.supplier_id);
  return pickText(supplier, ['name', 'supplier_name', 'Name', 'label']) || row.supplier_name || '';
}

function getBuyerDisplayName(row: ErpPurchaseSummaryApi.PurchaseSummaryRow) {
  const user = getUserById(row.buyer_id);
  return pickText(user, ['UserName', 'userName', 'name', 'RealName', 'real_name', 'NickName', 'label']) || row.buyer_name || '';
}


function getProductDisplayName(row: ErpPurchaseSummaryApi.PurchaseSummaryRow) {
  if (row.row_type !== 'data') return row.product_name || '总计';
  const product = getProductById(row.product_id);
  return row.product_name || pickText(product, ['product_name', 'name', 'Name', 'label']) || '-';
}

function getProductCode(row: ErpPurchaseSummaryApi.PurchaseSummaryRow) {
  const product = getProductById(row.product_id);
  return row.product_code || pickText(product, ['product_code', 'code', 'product_no', 'no', 'bar_code', 'product_bar_code']) || '';
}

function getProductCategoryName(row: ErpPurchaseSummaryApi.PurchaseSummaryRow) {
  const product = getProductById(row.product_id);
  const categoryId = row.product_category_name || product?.category_id || product?.product_category_id || product?.product_type;
  const category = getProductCategoryById(categoryId);
  return pickText(category, ['name', 'category_name', 'label']) || pickText(product, ['category_name', 'product_category_name', 'product_type_name', 'type_name', 'categoryLabel', 'category_label']) || '';
}


function getRowClassName({ row }: { row: ErpPurchaseSummaryApi.PurchaseSummaryRow }) {
  return row.row_type !== 'data' ? 'purchase-summary-subtotal-row' : '';
}

function footerMethod({ columns }: { columns: any[] }) {
  const summary = summaryRow.value;
  if (!summary) return [];
  return [
    columns.map((column) => {
      const field = column.field;
      if (field === 'product_name') return '总计';
      if (["in_count","return_count","net_count"].includes(field)) return erpNumberFormatter((summary as any)[field], 3);
      if (["in_amount","return_amount","net_amount"].includes(field)) return erpNumberFormatter((summary as any)[field], 2);
      return '';
    }),
  ];
}

onMounted(async () => {
  const [suppliers, warehouses, users, products, categories] = await Promise.all([
    getSupplierSimpleList(),
    getWarehouseSimpleList(),
    getSimpleUserList(),
    getProductSimpleList(),
    getProductCategorySimpleList(),
  ]);
  supplierList.value = Array.isArray(suppliers) ? suppliers : [];
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
  userList.value = Array.isArray(users) ? users : [];
  productList.value = Array.isArray(products) ? products : [];
  productCategoryList.value = Array.isArray(categories) ? flattenTree(categories) : [];
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    showFooter: true,
    footerMethod,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getPurchaseSummaryPage({
            index: page.currentPage,
            size: page.page,
            ...normalizeQueryFormValues(formValues),
          });
          summaryRow.value = (res as any).summary;
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    rowClassName: getRowClassName,
    toolbarConfig: {
      refresh: true,
      search: true,
      custom: true,
    },
  } as VxeTableGridOptions<ErpPurchaseSummaryApi.PurchaseSummaryRow>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="采购汇总">
      <template #toolbar-tools>
        <ElButton type="primary" @click="handleRefresh">刷新</ElButton>
      </template>

      <template #supplier_id="{ row }">
        <span v-if="row.row_type !== 'data'"> </span>
        <span v-else>{{ getSupplierDisplayName(row) }}</span>
      </template>

      <template #buyer_id="{ row }">
        <span v-if="row.row_type !== 'data'"> </span>
        <span v-else>{{ getBuyerDisplayName(row) }}</span>
      </template>

      <template #warehouse_id="{ row }">
        <span v-if="row.row_type !== 'data'"> </span>
        <span v-else>
          {{ warehouseList.find((item) => String(item.rowid ?? item.id ?? '') === String(row.warehouse_id ?? ''))?.name || row.warehouse_name || row.warehouse_id }}
        </span>
      </template>

      <template #product_name="{ row }">
        <strong v-if="row.row_type !== 'data'">{{ getProductDisplayName(row) }}</strong>
        <span v-else>{{ getProductDisplayName(row) }}</span>
      </template>

      <template #product_code="{ row }">{{ row.row_type !== 'data' ? '' : getProductCode(row) }}</template>
      <template #product_category_name="{ row }">{{ row.row_type !== 'data' ? '' : getProductCategoryName(row) }}</template>
    </Grid>
  </Page>
</template>

<style scoped>
:deep(.purchase-summary-subtotal-row) {
  font-weight: 600;
  background-color: var(--el-fill-color-lighter);
}

:deep(.vxe-footer--row) {
  font-weight: 600;
  background-color: var(--el-fill-color-light);
}
</style>
