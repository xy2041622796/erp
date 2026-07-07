<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';
import type { ErpStockCheckApi } from '#/api/erp/stock/check';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter, generateUUID } from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getStockPage } from '#/api/erp/stock/stock';

import { useFormItemColumns } from '../data';

import { ElInput, ElInputNumber } from 'element-plus';

interface Props {
  items?: ErpStockCheckApi.StockCheckItem[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
});

const emit = defineEmits(['update:items']);

const tableData = ref<ErpStockCheckApi.StockCheckItem[]>([]);
const productOptions = ref<ErpProductApi.Product[]>([]);
const dirtySinceGenerate = ref(false);

const productMap = computed(() => {
  const map = new Map<string, any>();
  for (const item of productOptions.value || []) {
    const key = String((item as any)?.rowid || '').trim();
    if (!key) continue;
    map.set(key, item);
  }
  return map;
});

const summaries = computed(() => {
  return {
    stockCount: tableData.value.reduce(
      (sum, item) => sum + (Number(item.stock_count || 0) || 0),
      0,
    ),
    actualCount: tableData.value.reduce(
      (sum, item) => sum + (Number(item.actual_count || 0) || 0),
      0,
    ),
    diffCount: tableData.value.reduce(
      (sum, item) => sum + (Number(item.count || 0) || 0),
      0,
    ),
  };
});

function ensureRowSeq(row: any) {
  if (!row) return row;
  if (!row.seq) {
    row.seq = row.id || generateUUID();
  }
  return row;
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function recalcRow(row: any) {
  const stockCount = toNumber(row.stock_count);
  if (
    row.actual_count === undefined ||
    row.actual_count === null ||
    row.actual_count === ''
  ) {
    row.count = 0;
    row.total_price = 0;
    return;
  }
  const actualCount = toNumber(row.actual_count);
  row.count = Number((actualCount - stockCount).toFixed(6));
  row.total_price = 0;
}

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFormItemColumns(props.disabled),
    data: tableData.value,
    minHeight: 250,
    autoResize: true,
    border: true,
    rowConfig: {
      keyField: 'seq',
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
    if (!items) return;
    tableData.value = items.map((item) => {
      const row = ensureRowSeq({ ...item });
      recalcRow(row);
      return row;
    });
    await nextTick();
    await gridApi.grid?.reloadData(tableData.value);
  },
  {
    immediate: true,
  },
);

function emitItems() {
  emit(
    'update:items',
    tableData.value.map((item) => ({ ...item })),
  );
}

async function generateByWarehouse(warehouseId: string) {
  const res: any = await getStockPage({
    size: 0,
    index: 1,
    warehouse_id: warehouseId,
  });
  const stocks = Array.isArray(res?.list) ? res.list : [];
  tableData.value = stocks
    .filter((item: any) => toNumber(item?.count) > 0)
    .map((item: any) => {
      const product =
        productMap.value.get(String(item?.product_id || '').trim()) || {};
      return ensureRowSeq({
        id: undefined,
        check_id: undefined,
        warehouse_id: warehouseId,
        warehouse_name: item?.warehouse_name,
        product_id: item?.product_id,
        product_name: item?.product_name || product?.product_name,
        product_unit_id: item?.unit_id || product?.unit_id || product?.unit,
        product_unit_name: item?.unit_name || product?.unit,
        product_bar_code: product?.barcode,
        stock_count: toNumber(item?.count),
        actual_count: undefined,
        count: 0,
        product_price: toNumber(product?.purchase_price),
        total_price: 0,
        remark: undefined,
      });
    });
  dirtySinceGenerate.value = false;
  await nextTick();
  await gridApi.grid?.reloadData(tableData.value);
  emitItems();
  return tableData.value.map((item) => ({ ...item }));
}

function fillActualCountWithStock() {
  tableData.value = tableData.value.map((item) => {
    const row = { ...item, actual_count: toNumber(item.stock_count) };
    recalcRow(row);
    return row;
  });
  dirtySinceGenerate.value = true;
  gridApi.grid?.reloadData(tableData.value);
  emitItems();
  return tableData.value.map((item) => ({ ...item }));
}

function handleDelete(row: ErpStockCheckApi.StockCheckItem) {
  const index = tableData.value.findIndex(
    (item: any) => item.seq === (row as any).seq,
  );
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  dirtySinceGenerate.value = true;
  emitItems();
}

function handleActualCountChange(actualCount: any, row: any) {
  row.actual_count = actualCount;
  recalcRow(row);
  dirtySinceGenerate.value = true;
  emitItems();
}

function handleRemarkChange() {
  dirtySinceGenerate.value = true;
  emitItems();
}

function hasDirtyChanges() {
  return dirtySinceGenerate.value;
}

function validate() {
  if (tableData.value.length === 0) {
    throw new Error('请先生成盘点项');
  }
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i] as any;
    if (!item.product_id) {
      throw new Error(`第 ${i + 1} 行：产品不能为空`);
    }
    if (
      item.actual_count === undefined ||
      item.actual_count === null ||
      item.actual_count === ''
    ) {
      throw new Error(`第 ${i + 1} 行：实际库存不能为空`);
    }
    if (Number(item.actual_count) < 0) {
      throw new Error(`第 ${i + 1} 行：实际库存不能小于 0`);
    }
  }
}

defineExpose({
  validate,
  generateByWarehouse,
  fillActualCountWithStock,
  hasDirtyChanges,
});

onMounted(async () => {
  productOptions.value = await getProductSimpleList();
});
</script>

<template>
  <Grid class="w-full">
    <template #actual_count="{ row }">
      <ElInputNumber
        v-if="!disabled"
        v-model="row.actual_count"
        :min="0"
        :precision="3"
        controls-position="right"
        class="!w-full"
        @change="handleActualCountChange($event, row)"
      />
      <span v-else>{{ erpCountInputFormatter(row.actual_count) || '-' }}</span>
    </template>
    <template #remark="{ row }">
      <ElInput
        v-if="!disabled"
        v-model="row.remark"
        class="w-full"
        @input="handleRemarkChange"
      />
      <span v-else>{{ row.remark || '-' }}</span>
    </template>
    <template #actions="{ row }">
      <TableAction
        :actions="[
          {
            label: '删除',
            type: 'danger',
            link: true,
            popConfirm: {
              title: '确认删除该盘点项吗？',
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
            <span
              >账面库存：{{
                erpCountInputFormatter(summaries.stockCount)
              }}</span
            >
            <span
              >实际库存：{{
                erpCountInputFormatter(summaries.actualCount)
              }}</span
            >
            <span
              >盈亏数量：{{ erpCountInputFormatter(summaries.diffCount) }}</span
            >
          </div>
        </div>
      </div>
    </template>
  </Grid>
</template>
