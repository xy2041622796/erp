<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';
import type { ErpStockMoveApi } from '#/api/erp/stock/move';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter, generateUUID } from '@vben/utils';

import {
  ElButton,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getStockCount } from '#/api/erp/stock/stock';

import { useFormItemColumns } from '../data';

interface Props {
  items?: ErpStockMoveApi.StockMoveItem[];
  disabled?: boolean;
  fromWarehouseId?: string;
  toWarehouseId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
  fromWarehouseId: undefined,
  toWarehouseId: undefined,
});

const emit = defineEmits(['update:items']);

const tableData = ref<ErpStockMoveApi.StockMoveItem[]>([]);
const productOptions = ref<ErpProductApi.Product[]>([]);

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

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

const selectOptions = computed(() =>
  productOptions.value.map((p: any) => ({
    label: p.product_name || p.name,
    value: p.rowid || p.id,
  })),
);

const summaries = computed(() => {
  return {
    count: tableData.value.reduce((sum, item) => sum + toNumber(item.count), 0),
  };
});

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
    if (!items) {
      return;
    }

    items.forEach((item) => {
      ensureRowSeq(item as any);
      hydrateRow(item as any);
    });
    tableData.value = [...items];
    await nextTick();
    await gridApi.grid?.reloadData(tableData.value);
  },
  { immediate: true },
);

watch(
  () => props.fromWarehouseId,
  async () => {
    for (const row of tableData.value as any[]) {
      await refreshRowStock(row);
    }
    emitItems();
  },
);

function hydrateRow(row: any) {
  row.product_price = toNumber(row.product_price ?? row.productPrice);
  row.total_price = toNumber(row.total_price ?? row.totalPrice);
  row.product_unit_id = normalizeText(row.product_unit_id ?? row.productUnitId);
  row.product_unit_name = normalizeText(
    row.product_unit_name ?? row.productUnitName,
  );
}

function emitItems() {
  emit(
    'update:items',
    tableData.value.map((item: any) => ({
      ...item,
      total_price: toNumber(item.total_price),
      totalPrice: toNumber(item.total_price),
      product_unit_id: normalizeText(item.product_unit_id),
      productUnitId: normalizeText(item.product_unit_id),
      product_unit_name: normalizeText(item.product_unit_name),
      productUnitName: normalizeText(item.product_unit_name),
    })),
  );
}

function hasDuplicateProduct(productId: string, currentSeq: string) {
  return tableData.value.some(
    (item: any) =>
      String(item.product_id || item.productId || '') === String(productId) &&
      String(item.seq || '') !== String(currentSeq || ''),
  );
}

function handleAdd() {
  const newRow = ensureRowSeq({
    id: undefined,
    product_id: undefined,
    product_name: undefined,
    product_unit_id: undefined,
    product_unit_name: undefined,
    product_bar_code: undefined,
    product_price: undefined,
    stock_count: 0,
    count: 1,
    total_price: undefined,
    remark: undefined,
  });
  tableData.value.push(newRow as any);
  gridApi.grid?.reloadData(tableData.value);
  emitItems();
}

function handleDelete(row: ErpStockMoveApi.StockMoveItem) {
  ensureRowSeq(row as any);
  const index = tableData.value.findIndex(
    (item: any) => item.seq === (row as any).seq,
  );
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  gridApi.grid?.reloadData(tableData.value);
  emitItems();
}

async function refreshRowStock(row: any) {
  row.stock_count =
    row.product_id && props.fromWarehouseId
      ? (await getStockCount(
          String(row.product_id),
          String(props.fromWarehouseId),
        )) || 0
      : 0;
}

async function handleProductChange(productId: any, row: any) {
  if (!props.fromWarehouseId) {
    row.product_id = undefined;
    emitItems();
    throw new Error('请先选择调出仓库');
  }
  if (hasDuplicateProduct(String(productId || ''), String(row.seq || ''))) {
    row.product_id = undefined;
    emitItems();
    throw new Error('同一张调拨单中产品不能重复');
  }

  const product = productOptions.value.find(
    (p: any) => (p.rowid || p.id) === productId,
  ) as any;
  if (!product) {
    return;
  }
  ensureRowSeq(row);
  row.product_id = productId;
  row.product_bar_code = product.barcode || product.barCode;
  row.product_unit_name = normalizeText(
    product.unit || product.unit_name || product.unitName,
  );
  row.product_unit_id = row.product_unit_name;
  row.product_name = product.product_name || product.name;
  row.product_price = toNumber(product.purchase_price ?? product.purchasePrice);
  row.count = row.count || 1;
  row.total_price = toNumber(row.product_price) * toNumber(row.count);
  await refreshRowStock(row);
  handleRowChange(row);
}

function handleRowChange(row: any) {
  ensureRowSeq(row);
  row.total_price = toNumber(row.product_price) * toNumber(row.count);
  const index = tableData.value.findIndex((item: any) => item.seq === row.seq);
  if (index === -1) {
    tableData.value.push(row);
  } else {
    tableData.value[index] = row;
  }
  emitItems();
}

function handleUnitChange(row: any) {
  ensureRowSeq(row);
  row.product_unit_name = normalizeText(row.product_unit_name);
  row.product_unit_id = row.product_unit_name;
  handleRowChange(row);
}

function validate() {
  if (!props.fromWarehouseId) {
    throw new Error('请选择调出仓库');
  }
  if (!props.toWarehouseId) {
    throw new Error('请选择调入仓库');
  }
  if (String(props.fromWarehouseId) === String(props.toWarehouseId)) {
    throw new Error('调出仓库和调入仓库不能相同');
  }

  const productIdSet = new Set<string>();
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i] as any;
    const productId = String(item.product_id || item.productId || '');
    if (!productId) {
      throw new Error(`第 ${i + 1} 行：产品不能为空`);
    }
    if (productIdSet.has(productId)) {
      throw new Error(`第 ${i + 1} 行：产品重复，不允许重复添加`);
    }
    productIdSet.add(productId);
    if (!normalizeText(item.product_unit_id || item.productUnitId)) {
      throw new Error(`第 ${i + 1} 行：产品单位不能为空`);
    }
    if (!item.count || item.count <= 0) {
      throw new Error(`第 ${i + 1} 行：调拨数量不能为空`);
    }
  }
}

defineExpose({
  validate,
  getSummary: () => summaries.value,
});

onMounted(async () => {
  const products = await getProductSimpleList();
  productOptions.value = Array.isArray(products) ? products : [];
  if (tableData.value.length > 0) {
    tableData.value.forEach((item: any) => hydrateRow(item));
    emitItems();
  }
  if (tableData.value.length === 0) {
    handleAdd();
  }
});
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex w-full items-center justify-between">
      <span class="text-foreground font-medium">调拨产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAdd">
        添加调拨产品
      </ElButton>
    </div>
    <Grid class="w-full">
      <template #product_id_header>
        <span>
          <span class="mr-1" style="color: var(--el-color-danger)">*</span>
          产品名称
        </span>
      </template>
      <template #count_header>
        <span>
          <span class="mr-1" style="color: var(--el-color-danger)">*</span>
          数量
        </span>
      </template>
      <template #product_id="{ row }">
        <ElSelect
          v-model="row.product_id"
          :options="selectOptions"
          placeholder="请选择产品"
          filterable
          class="w-full"
          :disabled="disabled"
          @change="
            handleProductChange($event, row).catch((err) =>
              ElMessage.error(err?.message || '选择产品失败'),
            )
          "
        >
          <ElOption
            v-for="item in productOptions"
            :key="(item as any).rowid || (item as any).id"
            :label="(item as any).product_name || (item as any).name"
            :value="(item as any).rowid || (item as any).id"
          />
        </ElSelect>
      </template>
      <template #count="{ row }">
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
      </template>
      <template #product_unit_name="{ row }">
        <ElInput
          v-if="!disabled"
          v-model="row.product_unit_name"
          placeholder="请输入单位"
          class="w-full"
          @change="handleUnitChange(row)"
        />
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
              icon: 'lucide:trash-2',
              type: 'danger',
              link: true,
              disabled: !!disabled,
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
            </div>
          </div>
        </div>
      </template>
    </Grid>
  </div>
</template>
