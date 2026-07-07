<script lang="ts" setup>
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  generateUUID,
} from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getPurchaseOrderProductsByIds,
  getPurchaseOrderProductSimpleList,
} from '#/api/erp/purchase/order';
import { getStockCount, getWarehouseStockCount } from '#/api/erp/stock/stock';
import { getProduct } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';
import ItemDetailModal from '../../../shared/components/ItemDetailModal.vue';

import { useFormItemColumns } from '../data';

import { ElButton, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';

interface Props {
  items?: ErpPurchaseOrderApi.PurchaseOrderItem[];
  disabled?: boolean;
  discountPercent?: number;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
  discountPercent: 0,
});

const emit = defineEmits([
  'update:items',
  'update:discount-price',
  'update:total-price',
  'update:product-name',
  'update:count',
  'update:total_product_price',
]);

const tableData = ref<ErpPurchaseOrderApi.PurchaseOrderItem[]>([]);
const productOptions = ref<ErpPurchaseOrderApi.PurchaseOrderProductOption[]>([]);
const warehouseOptions = ref<any[]>([]);
const productDetailCache = new Map<string, any>();

const warehouseNameMap = computed(() => {
  const map = new Map<string, string>();
  for (const w of warehouseOptions.value || []) {
    const id = (w as any)?.rowid;
    if (id) map.set(String(id), String((w as any)?.name ?? ''));
  }
  return map;
});

function ensureRowSeq(row: any) {
  if (!row) return row;
  if (!row.seq) {
    row.seq = row.id || row.rowid || generateUUID();
  }
  return row;
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function roundAmount(value: number, precision = 6) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(precision));
}

function getProductOptionId(product: any) {
  return String(product?.rowid ?? product?.row_id ?? product?.ROWID ?? product?.id ?? '').trim();
}

function getProductOptionName(product: any) {
  return String(product?.product_name ?? product?.name ?? product?.ProductName ?? '').trim();
}

function isSameText(a: unknown, b: unknown) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function shouldOverwriteProductName(row: any, productName: string) {
  const currentName = String(row?.product_name ?? '').trim();
  const productId = String(row?.product_id ?? '').trim();
  return !!productName && (!currentName || currentName === productId);
}

function findProductOption(productId: unknown) {
  const id = String(productId || '').trim();
  if (!id) return null;
  return (productOptions.value as any[]).find((product) => getProductOptionId(product) === id) || null;
}

function mergeProductOptions(products: any[]) {
  const map = new Map<string, any>();
  for (const product of productOptions.value as any[]) {
    const id = getProductOptionId(product);
    if (id) map.set(id, product);
  }
  for (const product of products || []) {
    const id = getProductOptionId(product);
    if (id) map.set(id, product);
  }
  productOptions.value = [...map.values()];
}

async function loadProductDetailByRowid(productId: string) {
  const id = String(productId || '').trim();
  if (!id) return null;
  if (productDetailCache.has(id)) return productDetailCache.get(id);
  try {
    const product = await getProduct(id);
    const normalizedProduct = product
      ? {
          ...product,
          rowid: product.rowid ?? id,
          id: (product as any).id ?? product.rowid ?? id,
          product_name:
            product.product_name ??
            (product as any).name ??
            (product as any).ProductName,
        }
      : null;
    productDetailCache.set(id, normalizedProduct);
    return normalizedProduct;
  } catch (error) {
    console.error('查询采购订单产品名称失败:', error);
    productDetailCache.set(id, null);
    return null;
  }
}

async function ensureProductsForRows(rows: any[]) {
  const missingProductIds = Array.from(
    new Set(
      (rows || [])
        .map((row) => String(row?.product_id || '').trim())
        .filter((id) => id && !findProductOption(id)),
    ),
  );
  if (missingProductIds.length === 0) return;

  const products = await getPurchaseOrderProductsByIds(missingProductIds);
  mergeProductOptions(products as any[]);

  const stillMissingProductIds = missingProductIds.filter((id) => !findProductOption(id));
  if (stillMissingProductIds.length === 0) return;

  const detailProducts = await Promise.all(
    stillMissingProductIds.map((id) => loadProductDetailByRowid(id)),
  );
  mergeProductOptions(detailProducts.filter(Boolean) as any[]);
}

async function refreshRowsDisplayInfo(rows = tableData.value as any[]) {
  await ensureProductsForRows(rows);
  await Promise.all((rows || []).map((row) => fillProductDisplayInfo(row)));
  await nextTick();
  await gridApi.grid?.reloadData(tableData.value);
}

function recalcRowAmounts(row: any) {
  const count = toNumber(row?.count);
  const taxPercent = toNumber(row?.tax_percent);
  const taxIncludedPrice = toNumber(row?.tax_included_price);
  const rate = taxPercent / 100;

  if (!(count > 0) || !(taxIncludedPrice > 0)) {
    row.product_price = 0;
    row.total_product_price = 0;
    row.tax_price = 0;
    row.total_price = 0;
    return;
  }

  const totalPrice = roundAmount(taxIncludedPrice * count);
  const totalProductPrice = roundAmount(rate >= 0 ? totalPrice / (1 + rate) : totalPrice);
  const taxPrice = roundAmount(totalPrice - totalProductPrice);
  const productPrice = roundAmount(totalProductPrice / count);

  row.product_price = productPrice;
  row.total_product_price = totalProductPrice;
  row.tax_price = taxPrice;
  row.total_price = totalPrice;
}

function hydrateRowAmounts(row: any) {
  const count = toNumber(row?.count);
  const taxPercent = toNumber(row?.tax_percent);
  const totalPrice = toNumber(row?.total_price);
  const taxPrice = toNumber(row?.tax_price);
  const totalProductPrice =
    totalPrice > 0 ? roundAmount(totalPrice - taxPrice) : toNumber(row?.total_product_price);
  const productPrice =
    count > 0 && totalProductPrice > 0
      ? roundAmount(totalProductPrice / count)
      : toNumber(row?.product_price);
  const taxIncludedPrice =
    count > 0 && totalPrice > 0
      ? roundAmount(totalPrice / count)
      : roundAmount(productPrice * (1 + taxPercent / 100));

  row.product_price = productPrice;
  row.total_product_price = totalProductPrice;
  row.tax_price = totalPrice > 0 ? taxPrice : roundAmount(totalProductPrice * (taxPercent / 100));
  row.total_price = totalPrice > 0 ? totalPrice : roundAmount(totalProductPrice + row.tax_price);
  row.tax_included_price = taxIncludedPrice > 0 ? taxIncludedPrice : undefined;
}

function getDefaultWarehouseName(row: any) {
  const productId = row?.product_id ? String(row.product_id) : '';
  if (!productId) return '-';
  const product = findProductOption(productId) as any;
  const defaultWarehouseId =
    product?.default_warehouse_id ?? product?.defaultWarehouseId;
  if (!defaultWarehouseId) return '-';
  return warehouseNameMap.value.get(String(defaultWarehouseId)) || '-';
}

const itemDetailModal = ref();

function handleView(row: any) {
  itemDetailModal.value?.open(row, '查看采购订单明细', '商品数量');
}

async function loadRowStockSummary(row: any) {
  if (!row?.product_id) {
    row.current_stock_count = 0;
    row.total_stock_count = 0;
    row.stock_count = 0;
    return;
  }
  const [currentStockCount, totalStockCount] = await Promise.all([
    row?.warehouse_id
      ? getWarehouseStockCount({
          product_id: row.product_id,
          warehouse_id: row.warehouse_id,
        })
      : Promise.resolve(0),
    getStockCount(String(row.product_id)),
  ]);
  row.current_stock_count = Number(currentStockCount || 0);
  row.total_stock_count = Number(totalStockCount || 0);
  row.stock_count = row.current_stock_count;
}

const summaries = computed(() => ({
  count: tableData.value.reduce((sum, item) => sum + (item.count || 0), 0),
  totalProductPrice: tableData.value.reduce(
    (sum, item) => sum + (item.total_product_price || 0),
    0,
  ),
  taxPrice: tableData.value.reduce(
    (sum, item) => sum + (item.tax_price || 0),
    0,
  ),
  totalPrice: tableData.value.reduce(
    (sum, item) => sum + (item.total_price || 0),
    0,
  ),
}));

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFormItemColumns(),
    data: tableData.value,
    minHeight: 250,
    autoResize: true,
    border: true,
    rowConfig: {
      keyField: 'seq',
      isHover: true,
    },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: false },
  },
});

watch(
  () => props.items,
  async (items) => {
    if (!items) return;
    items.forEach((item) => {
      ensureRowSeq(item);
      hydrateRowAmounts(item as any);
    });
    tableData.value = [...items];
    await refreshRowsDisplayInfo(tableData.value as any[]);
  },
  { immediate: true },
);

watch(
  () => [tableData.value, props.discountPercent],
  () => {
    if (!tableData.value || tableData.value.length === 0) return;
    const totalPrice = tableData.value.reduce(
      (prev, curr) => prev + (curr.total_price || 0),
      0,
    );
    const discountPrice = roundAmount(totalPrice * (toNumber(props.discountPercent) / 100));
    const finalTotalPrice = totalPrice - discountPrice;
    const totalCount = tableData.value.reduce(
      (sum, item) => sum + (item.count || 0),
      0,
    );
    const totalProductPrice = tableData.value.reduce(
      (sum, item) => sum + (item.total_product_price || 0),
      0,
    );
    emit('update:discount-price', discountPrice);
    emit('update:total-price', finalTotalPrice);
    emit('update:count', totalCount);
    emit('update:total_product_price', totalProductPrice);
  },
  { deep: true },
);

function handleAdd() {
  const newRow = ensureRowSeq({
    id: undefined,
    product_id: undefined,
    product_unit_name: undefined,
    product_bar_code: undefined,
    product_price: undefined,
    tax_included_price: undefined,
    stock_count: undefined,
    warehouse_id: undefined,
    count: 1,
    total_product_price: undefined,
    tax_percent: 0,
    tax_price: undefined,
    total_price: undefined,
    remark: undefined,
    current_stock_count: 0,
    total_stock_count: 0,
  });
  tableData.value.push(newRow as any);
  emit('update:items', [...tableData.value]);
}

function handleDelete(row: ErpPurchaseOrderApi.PurchaseOrderItem) {
  ensureRowSeq(row);
  const index = tableData.value.findIndex((item: any) => item?.seq === (row as any)?.seq);
  if (index !== -1) tableData.value.splice(index, 1);
  emit('update:items', [...tableData.value]);
}

async function handleProductChange(productId: any, row: any) {
  const product = findProductOption(productId);
  if (!product) return;
  ensureRowSeq(row);
  row.product_id = productId;
  row.product_unit_id = product.unit;
  if (!row.product_unit_id) {
    const detail = await loadProductDetailByRowid(productId);
    if (detail) {
      row.product_unit_id = detail.unit || '';
      product.unit = detail.unit;
    }
  }
  row.product_bar_code = product.barcode;
  row.product_unit_name = product.unit;
  row.product_name = getProductOptionName(product);
  if (!row.warehouse_id) {
    row.warehouse_id = (product as any).default_warehouse_id || (product as any).defaultWarehouseId;
  }
  row.count = row.count || 1;
  row.tax_percent = Number.parseFloat(
    String(product.purchase_tax || row.tax_percent || 0).replace('%', ''),
  ) || 0;
  row.tax_included_price = toNumber((product as any).purchase_price) || row.tax_included_price;
  recalcRowAmounts(row);
  await loadRowStockSummary(row);
  handleRowChange(row, getProductOptionName(product));
}

async function handleWarehouseChange(row: any) {
  await loadRowStockSummary(row);
  handleRowChange(row);
}

function handleRowChange(row: any, productName?: string) {
  ensureRowSeq(row);
  recalcRowAmounts(row);
  const index = tableData.value.findIndex((item: any) => item.seq === row.seq);
  if (index === -1) tableData.value.push(row);
  else tableData.value[index] = row;
  emit('update:items', [...tableData.value]);
  emit('update:product-name', productName);
  emit('update:count', summaries.value.count);
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item: any = tableData.value[i];
    if (item) {
      if (!item.product_id) throw new Error(`第 ${i + 1} 行：产品不能为空`);
      if (!item.warehouse_id) throw new Error(`第 ${i + 1} 行：分配仓库不能为空`);
      if (!item.count || item.count <= 0)
        throw new Error(`第 ${i + 1} 行：产品数量不能为空`);
      if (!item.tax_included_price || item.tax_included_price <= 0)
        throw new Error(`第 ${i + 1} 行：采购单价不能为空`);
    }
  }
}

defineExpose({ validate });

async function fillProductDisplayInfo(row: any) {
  if (!row.product_id || productOptions.value.length === 0) return;
  const product = findProductOption(row.product_id);
  if (!product) return;
  if (!row.product_unit_id) row.product_unit_id = product.unit;
  if (!row.product_unit_name) row.product_unit_name = product.unit;
  if (!row.product_bar_code) row.product_bar_code = product.barcode;
  const productName = getProductOptionName(product);
  if (shouldOverwriteProductName(row, productName)) row.product_name = productName;
  if (!row.warehouse_id) {
    row.warehouse_id = product.default_warehouse_id || product.defaultWarehouseId;
  }
  if (!row.tax_included_price && product.purchase_price) {
    row.tax_included_price = toNumber(product.purchase_price);
    recalcRowAmounts(row);
  }
  await loadRowStockSummary(row);
}

function getProductDisplayName(row: any) {
  const productId = String(row?.product_id || '').trim();
  if (!productId) return '-';
  const optionName = getProductOptionName(findProductOption(productId));
  const rowName = String(row?.product_name || '').trim();
  if (rowName && !isSameText(rowName, productId)) return rowName;
  return optionName || '-';
}

onMounted(async () => {
  const [products, warehouses] = await Promise.all([
    getPurchaseOrderProductSimpleList(),
    getWarehouseSimpleList(),
  ]);
  productOptions.value = Array.isArray(products) ? (products as any) : [];
  warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];
  if (tableData.value.length === 0) {
    handleAdd();
    return;
  }
  await refreshRowsDisplayInfo(tableData.value as any[]);
});
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex w-full items-center justify-between">
      <span class="font-medium text-foreground">产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAdd">添加产品</ElButton>
    </div>
    <Grid class="w-full">
    <template #default_warehouse="{ row }">
      <span>{{ getDefaultWarehouseName(row) }}</span>
    </template>
    <template #warehouse_id="{ row }">
      <ElSelect
        v-if="!disabled"
        v-model="row.warehouse_id"
        placeholder="请选择已分配仓库"
        filterable
        class="w-full"
        @change="handleWarehouseChange(row)"
      >
        <ElOption
          v-for="item in warehouseOptions"
          :key="item.rowid"
          :label="item.name"
          :value="item.rowid"
        />
      </ElSelect>
      <span v-else class="block whitespace-normal break-all leading-5">
        {{
          warehouseOptions.find((item) => String(item.rowid) === String(row.warehouse_id))?.name ||
          row.warehouse_name ||
          '-'
        }}
      </span>
    </template>
    <template #product_id="{ row }">
      <ElSelect
        v-if="!disabled"
        v-model="row.product_id"
        placeholder="请选择产品"
        filterable
        class="w-full"
        @change="handleProductChange($event, row)"
      >
        <ElOption
          v-for="item in productOptions"
          :key="getProductOptionId(item)"
          :label="getProductOptionName(item)"
          :value="getProductOptionId(item)"
        />
      </ElSelect>
      <span v-else class="block whitespace-normal break-all leading-5">
        {{ getProductDisplayName(row) }}
      </span>
    </template>
    <template #count="{ row }">
      <StockCountPopover
        :current-stock="(row as any).current_stock_count"
        :total-stock="(row as any).total_stock_count"
      >
        <ElInputNumber
          v-if="!disabled"
          v-model="row.count"
          :min="0"
          :precision="3"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ erpCountInputFormatter(row.count) || '-' }}</span>
      </StockCountPopover>
    </template>
    <template #product_price="{ row }">
      <ElInputNumber
        v-if="!disabled"
        v-model="(row as any).tax_included_price"
        :min="0"
        :precision="2"
        controls-position="right"
        class="!w-full"
        @change="handleRowChange(row)"
      />
      <span v-else>{{ erpPriceInputFormatter((row as any).tax_included_price) || '-' }}</span>
    </template>
    <template #remark="{ row }">
      <ElInput v-if="!disabled" v-model="row.remark" class="w-full" />
      <span v-else>{{ row.remark || '-' }}</span>
    </template>
    <template #tax_percent="{ row }">
      <ElInputNumber
        v-if="!disabled"
        v-model="row.tax_percent"
        :min="0"
        :max="100"
        :precision="2"
        controls-position="right"
        class="!w-full"
        @change="handleRowChange(row)"
      />
      <span v-else>{{ row.tax_percent || '-' }}</span>
    </template>
    <template #actions="{ row }">
      <TableAction
        :actions="[
          {
            label: '',
            type: 'primary',
            link: true,
            icon: 'lucide:eye',
            onClick: handleView.bind(null, row),
          },
          {
            label: '',
            type: 'danger',
            link: true,
            disabled: !(!disabled),
            icon: 'lucide:trash-2',
            popConfirm: {
              title: '确认删除该产品吗？',
              confirm: handleDelete.bind(null, row),
            },
          },
        ]"
      />
    </template>
    <template #bottom>
      <div class="mt-2 rounded border border-border bg-muted p-2">
        <div class="flex justify-between text-sm text-muted-foreground">
          <span class="font-medium text-foreground">合计：</span>
          <div class="flex space-x-4">
            <span>数量：{{ erpCountInputFormatter(summaries.count) }}</span>
            <span>未税金额：{{ erpPriceInputFormatter(summaries.totalProductPrice) }}</span>
            <span>税额：{{ erpPriceInputFormatter(summaries.taxPrice) }}</span>
            <span>含税合计：{{ erpPriceInputFormatter(summaries.totalPrice) }}</span>
          </div>
        </div>
      </div>
    </template>
    </Grid>
  </div>
  <ItemDetailModal ref="itemDetailModal" />
</template>
