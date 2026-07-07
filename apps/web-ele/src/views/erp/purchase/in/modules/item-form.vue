<script lang="ts" setup>
import type { ErpPurchaseInApi } from '#/api/erp/purchase/in';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter } from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getPurchaseInWarehouseStockCount,
  PURCHASE_IN_FORM_KEY,
} from '#/api/erp/purchase/in';
import { getProduct, getProductSimpleList } from '#/api/erp/product/product';
import { getStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';
import ItemDetailModal from '../../../shared/components/ItemDetailModal.vue';

import { useFormItemColumns } from '../data';

import { ElButton, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';

interface Props {
  items?: ErpPurchaseInApi.PurchaseInItem[];
  disabled?: boolean;
  warehouseId?: string | number;
  warehouseName?: string;
  amountVisible?: boolean;
  amountEditable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
  warehouseId: undefined,
  warehouseName: undefined,
  amountVisible: false,
  amountEditable: false,
});

const emit = defineEmits([
  'update:items',
  'update:discount-price',
  'update:other-price',
  'update:total-price',
  'update:total-product-price',
  'update:total-tax-price',
  'update:total-count',
]);

const tableData = ref<ErpPurchaseInApi.PurchaseInItem[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const itemDetailModal = ref();
const productDetailCache = new Map<string, any>();

const unitOptions = computed(() => {
  const units = new Set<string>();
  for (const product of productOptions.value) {
    const unit = String(product?.unit || '').trim();
    if (unit) units.add(unit);
  }
  return [...units];
});

function getProductOptionId(product: any) {
  return String(product?.rowid ?? product?.row_id ?? product?.ROWID ?? product?.id ?? '').trim();
}

function getProductOptionName(product: any) {
  return String(product?.product_name ?? product?.name ?? product?.ProductName ?? '').trim();
}

function isSameText(a: unknown, b: unknown) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function findProductOption(productId: unknown) {
  const id = String(productId || '').trim();
  if (!id) return null;
  return productOptions.value.find((product) => getProductOptionId(product) === id) || null;
}

function mergeProductOptions(products: any[]) {
  const map = new Map<string, any>();
  for (const product of productOptions.value || []) {
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
    productDetailCache.set(id, product || null);
    return product || null;
  } catch (error) {
    console.error('查询采购入库产品名称失败:', error);
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
  const detailProducts = await Promise.all(
    missingProductIds.map((id) => loadProductDetailByRowid(id)),
  );
  mergeProductOptions(detailProducts.filter(Boolean) as any[]);
}

function shouldOverwriteProductName(row: any, productName: string) {
  const currentName = String(row?.product_name ?? '').trim();
  const productId = String(row?.product_id ?? '').trim();
  return !!productName && (!currentName || currentName === productId);
}

function getProductDisplayName(row: any) {
  const productId = String(row?.product_id || '').trim();
  if (!productId) return '-';
  const rowName = String(row?.product_name || '').trim();
  if (rowName && !isSameText(rowName, productId)) return rowName;
  return getProductOptionName(findProductOption(productId)) || '-';
}

function handleView(row: any) {
  itemDetailModal.value?.open(row, '查看采购入库明细', '入库数量');
}

function isManualRow(row: ErpPurchaseInApi.PurchaseInItem) {
  return !row.order_item_id;
}

function applyWarehouse(row: ErpPurchaseInApi.PurchaseInItem) {
  const inboundWarehouseId = props.warehouseId ? String(props.warehouseId) : '';
  if (!inboundWarehouseId) {
    return;
  }
  row.warehouse_id = inboundWarehouseId;
  const warehouse = warehouseOptions.value.find(
    (item) => String(item.rowid) === inboundWarehouseId,
  );
  row.warehouse_name = props.warehouseName || warehouse?.name || row.warehouse_name;
}

async function loadRowStockSummary(row: ErpPurchaseInApi.PurchaseInItem) {
  const targetRow = row as any;
  if (!row.product_id) {
    targetRow.current_stock_count = 0;
    targetRow.total_stock_count = 0;
    row.stock_count = 0;
    return;
  }
  const [currentStockCount, totalStockCount] = await Promise.all([
    row.warehouse_id
      ? getPurchaseInWarehouseStockCount({
          product_id: row.product_id,
          warehouse_id: row.warehouse_id,
        })
      : Promise.resolve(0),
    getStockCount(String(row.product_id), undefined, PURCHASE_IN_FORM_KEY),
  ]);
  targetRow.current_stock_count = Number(currentStockCount || 0);
  targetRow.total_stock_count = Number(totalStockCount || 0);
  row.stock_count = targetRow.current_stock_count;
}

const summaries = computed(() => ({
  count: tableData.value.reduce((sum, item) => sum + Number(item.count || 0), 0),
}));

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFormItemColumns(tableData.value, props.disabled, props.amountVisible),
    data: tableData.value,
    minHeight: 250,
    autoResize: true,
    border: true,
    rowConfig: {
      isHover: true,
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      enabled: false,
    },
  },
});

watch(
  () => props.items,
  async (items) => {
    if (!items) {
      return;
    }
    tableData.value = [...items];
    await ensureProductsForRows(tableData.value as any[]);
    await Promise.all(tableData.value.map((item) => initRow(item)));
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
    const columns = useFormItemColumns(tableData.value, props.disabled, props.amountVisible);
    await gridApi.grid.reloadColumn(columns || []);
  },
  {
    immediate: true,
  },
);

async function reloadAmountColumns() {
  await nextTick();
  const columns = useFormItemColumns(tableData.value, props.disabled, props.amountVisible);
  await gridApi.grid.reloadColumn(columns || []);
}

watch(
  () => [props.amountVisible, props.disabled],
  reloadAmountColumns,
);

watch(
  () => props.warehouseId,
  async () => {
    if (!tableData.value.length) {
      return;
    }
    tableData.value.forEach((item) => void initRow(item));
    emit('update:items', [...tableData.value]);
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
  },
  { immediate: true },
);

watch(
  () => tableData.value,
  () => {
    const totalCount = tableData.value.reduce(
      (prev, curr) => prev + Number(curr.count || 0),
      0,
    );
    emit('update:discount-price', 0);
    emit('update:other-price', 0);
    emit('update:total-price', 0);
    emit('update:total-product-price', 0);
    emit('update:total-tax-price', 0);
    emit('update:total-count', totalCount);
  },
  { deep: true },
);

function handleDelete(row: ErpPurchaseInApi.PurchaseInItem) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  emit('update:items', [...tableData.value]);
}

async function fillProductFields(row: any) {
  const product = findProductOption(row.product_id);
  if (!product) return;
  const productName = getProductOptionName(product);
  if (shouldOverwriteProductName(row, productName)) row.product_name = productName;
  row.product_bar_code = row.product_bar_code || product.barcode;
  row.product_unit_id = row.product_unit_id || product.unit;
  row.product_unit_name = row.product_unit_name || product.unit;
  if (!row.product_unit_id || !row.product_unit_name) {
    const detail = await loadProductDetailByRowid(row.product_id);
    if (detail) {
      row.product_unit_id = row.product_unit_id || detail.unit || detail.unit_name || '';
      row.product_unit_name = row.product_unit_name || detail.unit || detail.unit_name || '';
      product.unit = detail.unit || detail.unit_name || product.unit;
    }
  }
  row.category_id = row.category_id || product.product_type || product.category_id;
  row.category_name = row.category_name || product.product_type || product.category_id;
}

async function handleProductChange(row: ErpPurchaseInApi.PurchaseInItem) {
  await fillProductFields(row as any);
  await loadRowStockSummary(row);
  handleRowChange(row);
}

function recalcAmount(row: any) {
  const count = Number(row.count || 0);
  const productPrice = Number(row.product_price || 0);
  const taxPercent = Number(row.tax_percent || 0);
  const totalProductPrice = count * productPrice;
  const taxPrice = totalProductPrice * (taxPercent / 100);
  row.total_product_price = Number(totalProductPrice.toFixed(2));
  row.tax_price = Number(taxPrice.toFixed(2));
  row.total_price = Number((totalProductPrice + taxPrice).toFixed(2));
}

function handleAmountChange(row: any) {
  recalcAmount(row);
  handleRowChange(row);
}

function handleAddProduct() {
  const row: ErpPurchaseInApi.PurchaseInItem = {
    id: undefined,
    warehouse_id: props.warehouseId ? String(props.warehouseId) : undefined,
    warehouse_name: props.warehouseName,
    count: 1,
  };
  void initRow(row);
  tableData.value.push(row);
  emit('update:items', [...tableData.value]);
  void nextTick(async () => {
    await gridApi.grid.reloadData(tableData.value);
  });
}

function handleRowChange(row: any) {
  void initRow(row);
  if (props.amountEditable) recalcAmount(row);
  emit('update:items', [...tableData.value]);
}

async function initRow(row: ErpPurchaseInApi.PurchaseInItem) {
  applyWarehouse(row);
  void loadRowStockSummary(row);

  const warehouse = warehouseOptions.value.find(
    (item) => String(item.rowid) === String(row.warehouse_id || ''),
  );
  if (warehouse) {
    row.warehouse_name = warehouse.name;
  }

  if (!row.product_name && row.product_id) {
    await fillProductFields(row as any);
  }
}

function validate() {
  if (!tableData.value.length) {
    throw new Error('请至少添加一条入库产品明细');
  }
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (!item) {
      continue;
    }
    if (!item.warehouse_id) {
      throw new Error(`第 ${i + 1} 行：仓库不能为空`);
    }
    if (!item.product_id) {
      throw new Error(`第 ${i + 1} 行：产品不能为空`);
    }
    if (item.product_price === undefined || item.product_price === null || item.product_price === '') {
      throw new Error(`第 ${i + 1} 行：产品金额不能为空`);
    }
    const count = Number(item.count || 0);
    if (!item.count || count <= 0) {
      throw new Error(`第 ${i + 1} 行：本次入库数量必须大于 0`);
    }
    if (!item.product_unit_name) {
      throw new Error(`第 ${i + 1} 行：单位不能为空`);
    }
    if (item.order_item_id) {
      const totalCount = Number(item.total_count || 0);
      const inCount = Number(item.in_count || 0);
      const remainCount = Math.max(totalCount - inCount, 0);
      if (totalCount > 0 && count > remainCount) {
        throw new Error(`第 ${i + 1} 行：本次入库数量不能大于剩余可入库数量 ${remainCount}`);
      }
    }
  }
}

defineExpose({ validate });

onMounted(async () => {
  const [products, warehouses] = await Promise.all([
    getProductSimpleList(),
    getWarehouseSimpleList(),
  ]);
  productOptions.value = Array.isArray(products) ? products : [];
  warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];

  if (tableData.value.length > 0) {
    await ensureProductsForRows(tableData.value as any[]);
    await Promise.all(tableData.value.map((item) => initRow(item)));
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
  }
});
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex w-full items-center justify-between">
      <span class="font-medium text-foreground">产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAddProduct">新增产品</ElButton>
    </div>
    <Grid class="w-full">
    <template #warehouse_id="{ row }">
      <ElSelect
        v-model="row.warehouse_id"
        disabled
        placeholder="请选择仓库"
        filterable
        class="w-full"
      >
        <ElOption
          v-for="item in warehouseOptions"
          :key="item.rowid"
          :label="item.name"
          :value="item.rowid"
        />
      </ElSelect>
    </template>
    <template #product_id="{ row }">
      <ElSelect
        v-if="!disabled && isManualRow(row)"
        v-model="row.product_id"
        placeholder="请选择产品"
        filterable
        class="w-full"
        @change="handleProductChange(row)"
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
    <template #product_price="{ row }">
      <ElInputNumber
        v-if="!disabled && amountEditable"
        v-model="row.product_price"
        :min="0"
        :precision="2"
        controls-position="right"
        class="!w-full"
        @change="handleAmountChange(row)"
      />
      <span v-else>{{ row.product_price ?? '-' }}</span>
    </template>
    <template #tax_percent="{ row }">
      <ElInputNumber
        v-if="!disabled && amountEditable"
        v-model="row.tax_percent"
        :min="0"
        :max="100"
        :precision="2"
        controls-position="right"
        class="!w-full"
        @change="handleAmountChange(row)"
      />
      <span v-else>{{ row.tax_percent ?? '-' }}</span>
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
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ erpCountInputFormatter(row.count) || '-' }}</span>
      </StockCountPopover>
    </template>
    <template #product_unit_name="{ row }">
      <ElSelect
        v-if="!disabled"
        v-model="row.product_unit_name"
        placeholder="请选择单位"
        filterable
        allow-create
        clearable
        class="w-full"
      >
        <ElOption
          v-for="unit in unitOptions"
          :key="unit"
          :label="unit"
          :value="unit"
        />
      </ElSelect>
      <span v-else>{{ row.product_unit_name || '-' }}</span>
    </template>
    <template #remark="{ row }">
      <ElInput v-if="!disabled" v-model="row.remark" class="w-full" />
      <span v-else>{{ row.remark || '-' }}</span>
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
            icon: 'lucide:trash-2',
            disabled: !(!disabled),
            popConfirm: {
              title: '确认删除该产品吗？',
              confirm: handleDelete.bind(null, row),
            },
          },
        ]"
      />
    </template>

    <template #bottom>
      <div class="mt-2 w-full rounded border border-border bg-muted p-2">
        <div class="justify-between text-sm text-muted-foreground">
          <span class="font-medium text-foreground">合计：</span>
          <div class="flex space-x-4">
            <span>数量：{{ erpCountInputFormatter(summaries.count) }}</span>
          </div>
        </div>
      </div>
    </template>
    </Grid>
  </div>
  <ItemDetailModal ref="itemDetailModal" />
</template>
