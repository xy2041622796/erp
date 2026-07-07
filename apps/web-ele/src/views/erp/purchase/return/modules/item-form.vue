<script lang="ts" setup>
import type { ErpPurchaseReturnApi } from '#/api/erp/purchase/return';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter } from '@vben/utils';

import {
  ElButton,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
} from 'element-plus';

import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/crm/product';
import { getStockCount, getWarehouseStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';

import { useFormItemColumns } from '../data';

interface Props {
  items?: ErpPurchaseReturnApi.PurchaseReturnItem[];
  disabled?: boolean;
  discountPercent?: number;
  otherPrice?: number;
  sourceOrderId?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
  discountPercent: 0,
  otherPrice: 0,
  sourceOrderId: undefined,
});

const emit = defineEmits([
  'update:items',
  'update:discount-price',
  'update:other-price',
  'update:count',
  'update:total-product-price',
  'update:total-tax-price',
  'update:total-price',
]);

const tableData = ref<ErpPurchaseReturnApi.PurchaseReturnItem[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);

async function loadRowStockSummary(
  row: ErpPurchaseReturnApi.PurchaseReturnItem,
) {
  const targetRow = row as any;
  if (!row.product_id) {
    targetRow.current_stock_count = 0;
    targetRow.total_stock_count = 0;
    row.stock_count = 0;
    return;
  }
  const [currentStockCount, totalStockCount] = await Promise.all([
    row.warehouse_id
      ? getWarehouseStockCount({
          product_id: row.product_id,
          warehouse_id: row.warehouse_id,
        })
      : Promise.resolve(0),
    getStockCount(String(row.product_id)),
  ]);
  targetRow.current_stock_count = Number(currentStockCount || 0);
  targetRow.total_stock_count = Number(totalStockCount || 0);
  row.stock_count = targetRow.current_stock_count;
}

function isSourceRow(row: any) {
  return Boolean(row?.order_item_id);
}

function createEmptyRow(): ErpPurchaseReturnApi.PurchaseReturnItem {
  return {
    id: undefined,
    warehouse_id: '',
    product_id: '',
    product_unit_id: '',
    product_unit_name: '',
    product_bar_code: '',
    product_name: '',
    product_price: 0,
    tax_percent: 0,
    tax_price: 0,
    total_product_price: 0,
    total_price: 0,
    count: 0,
    stock_count: 0,
    remark: '',
    ...({ seq: `${Date.now()}_${Math.random()}` } as any),
  };
}

async function handleAddRow() {
  const row = createEmptyRow();
  row.count = 1;
  tableData.value.push(row);
  emit('update:items', [...tableData.value]);
  emitSummaryValues();
  await nextTick();
  await gridApi.grid.reloadData(tableData.value);
}

async function handleProductChange(row: any) {
  const product = productOptions.value.find(
    (item) => String(item.rowid) === String(row.product_id),
  );
  row.product_name = product?.product_name || '';
  row.product_bar_code = product?.barcode || '';
  row.product_unit_name = product?.unit || '';
  row.product_unit_id = product?.unit_id || row.product_unit_id || '';
  row.product_price = Number(
    product?.purchase_price || product?.purchasePrice || row.product_price || 0,
  );
  row.tax_percent =
    Number.parseFloat(
      String(product?.purchase_tax || row.tax_percent || 0).replace('%', ''),
    ) || 0;
  await loadRowStockSummary(row);
  handleRowChange(row);
}

async function handleWarehouseChange(row: any) {
  await loadRowStockSummary(row);
  handleRowChange(row);
}

const summaries = computed(() => ({
  count: tableData.value.reduce(
    (sum, item) => sum + Number(item.count || 0),
    0,
  ),
  totalProductPrice: tableData.value.reduce(
    (sum, item) => sum + Number(item.total_product_price || 0),
    0,
  ),
  taxPrice: tableData.value.reduce(
    (sum, item) => sum + Number(item.tax_price || 0),
    0,
  ),
  totalPrice: tableData.value.reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0,
  ),
}));

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFormItemColumns(tableData.value, props.disabled),
    data: tableData.value,
    minHeight: 250,
    autoResize: true,
    border: true,
    rowConfig: { keyField: 'seq', isHover: true },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: false },
  },
});

watch(
  () => props.items,
  async (items) => {
    if (!items) return;
    items.forEach((item: any) => initRow(item));
    tableData.value = [...items];
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
    const columns = useFormItemColumns(tableData.value, props.disabled);
    await gridApi.grid.reloadColumn(columns || []);
  },
  { immediate: true },
);

watch(
  () => tableData.value,
  () => {
    emitSummaryValues();
  },
  { deep: true },
);

function handleDelete(row: ErpPurchaseReturnApi.PurchaseReturnItem) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) tableData.value.splice(index, 1);
  emit('update:items', [...tableData.value]);
  emitSummaryValues();
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

function emitSummaryValues() {
  emit('update:discount-price', 0);
  emit('update:other-price', 0);
  emit('update:count', summaries.value.count);
  emit(
    'update:total-product-price',
    Number(summaries.value.totalProductPrice.toFixed(2)),
  );
  emit('update:total-tax-price', Number(summaries.value.taxPrice.toFixed(2)));
  emit('update:total-price', Number(summaries.value.totalPrice.toFixed(2)));
}

function handleRowChange(row: any) {
  recalcAmount(row);
  const index = tableData.value.indexOf(row);
  if (index === -1) tableData.value.push(row);
  else tableData.value[index] = row;
  emit('update:items', [...tableData.value]);
  emitSummaryValues();
}

function initRow(row: ErpPurchaseReturnApi.PurchaseReturnItem) {
  void loadRowStockSummary(row);
  if (!(row as any).seq) (row as any).seq = `${Date.now()}_${Math.random()}`;

  if (!row.product_name && row.product_id) {
    const product = productOptions.value.find(
      (item) => String(item.rowid) === String(row.product_id),
    );
    if (product) row.product_name = product.product_name;
  }

  if (row.product_id && productOptions.value.length > 0) {
    const product = productOptions.value.find(
      (item) => String(item.rowid) === String(row.product_id),
    );
    if (product) {
      if (!row.product_bar_code) row.product_bar_code = product.barcode;
      if (!row.product_unit_name) row.product_unit_name = product.unit;
      if (!(row as any).product_unit_id && product.unit_id)
        (row as any).product_unit_id = product.unit_id;
    }
  }
  recalcAmount(row);
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (item) {
      if (!item.warehouse_id) throw new Error(`第 ${i + 1} 行：仓库不能为空`);
      if (!item.product_id) throw new Error(`第 ${i + 1} 行：产品不能为空`);
      if (!item.count || item.count <= 0)
        throw new Error(`第 ${i + 1} 行：产品数量不能为空`);
    }
  }
}

defineExpose({ validate });

onMounted(async () => {
  productOptions.value = await getProductSimpleList();
  warehouseOptions.value = await getWarehouseSimpleList();
  if (tableData.value.length > 0) {
    tableData.value.forEach((item) => initRow(item));
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
  }
});
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex w-full items-center justify-between">
      <span class="text-foreground font-medium">退货产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAddRow">
        添加产品
      </ElButton>
    </div>
    <Grid class="w-full">
      <template #warehouse_id="{ row }">
        <ElSelect
          v-model="row.warehouse_id"
          :disabled="disabled || isSourceRow(row)"
          :placeholder="isSourceRow(row) ? '自动继承来源仓库' : '请选择仓库'"
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
      </template>
      <template #product_id="{ row }">
        <ElSelect
          v-model="row.product_id"
          :disabled="disabled || isSourceRow(row)"
          placeholder="请选择产品"
          filterable
          class="w-full"
          @change="handleProductChange(row)"
        >
          <ElOption
            v-for="item in productOptions"
            :key="item.rowid"
            :label="item.product_name"
            :value="item.rowid"
          />
        </ElSelect>
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
      <template #product_price="{ row }">
        <ElInputNumber
          v-if="!disabled"
          v-model="row.product_price"
          :min="0"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.product_price ?? '-' }}</span>
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
        <span v-else>{{ row.tax_percent ?? '-' }}</span>
      </template>
      <template #remark="{ row }">
        <ElInput
          v-if="!disabled"
          v-model="row.remark"
          class="w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.remark || '-' }}</span>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '',
              icon: 'lucide:trash-2',
              type: 'danger',
              link: true,
              popConfirm: {
                title: '确认删除该产品吗？',
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>

      <template #bottom>
        <div class="border-border bg-muted mt-2 rounded border p-2">
          <div class="text-muted-foreground flex justify-between text-sm">
            <span class="text-foreground font-medium">合计：</span>
            <div class="flex space-x-4">
              <span>数量：{{ erpCountInputFormatter(summaries.count) }}</span>
              <span>金额：{{ summaries.totalPrice.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </template>
    </Grid>
  </div>
</template>
