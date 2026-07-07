<script lang="ts" setup>
import type { ErpSaleReturnApi } from '#/api/erp/sale/return';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter } from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getStockCount, getWarehouseStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';

import ItemDetailModal from '../../../shared/components/ItemDetailModal.vue';
import { useFormItemColumns } from '../data';

import {
  ElButton,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
} from 'element-plus';

interface Props {
  items?: ErpSaleReturnApi.SaleReturnItem[];
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
  'update:total-price',
  'update:total-product-price',
  'update:total-tax-price',
  'update:total-count',
]);

const tableData = ref<ErpSaleReturnApi.SaleReturnItem[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const itemDetailModal = ref();

function handleView(row: any) {
  itemDetailModal.value?.open(row, '查看销售退货明细', '退货数量');
}

async function loadRowStockSummary(row: ErpSaleReturnApi.SaleReturnItem) {
  const targetRow = row as any;
  if (!row.product_id) {
    targetRow.current_stock_count = 0;
    targetRow.total_stock_count = 0;
    row.stock_count = 0;
    return;
  }
  const [currentStockCount, totalStockCount] = await Promise.all([
    row.warehouse_id
      ? getWarehouseStockCount({ product_id: row.product_id, warehouse_id: row.warehouse_id })
      : Promise.resolve(0),
    getStockCount(String(row.product_id)),
  ]);
  targetRow.current_stock_count = Number(currentStockCount || 0);
  targetRow.total_stock_count = Number(totalStockCount || 0);
  row.stock_count = targetRow.current_stock_count;
}

function isSourceRow(row: any) {
  return Boolean(props.sourceOrderId || row?.order_item_id);
}

function createEmptyRow(): ErpSaleReturnApi.SaleReturnItem {
  return {
    id: undefined,
    warehouse_id: '',
    product_id: '',
    product_unit_id: '',
    product_unit_name: '',
    product_bar_code: '',
    product_name: '',
    count: 0,
    stock_count: 0,
    remark: '',
    total_count: undefined,
    out_count: undefined,
    return_count: undefined,
    ...( { seq: `${Date.now()}_${Math.random()}` } as any),
  };
}

async function handleAddRow() {
  const row = createEmptyRow();
  tableData.value.push(row);
  emit('update:items', [...tableData.value]);
  await nextTick();
  await gridApi.grid.reloadData(tableData.value);
}

async function handleProductChange(row: any) {
  const product = productOptions.value.find((item) => String(item.rowid) === String(row.product_id));
  row.product_name = product?.product_name || '';
  row.product_bar_code = product?.barcode || '';
  row.product_unit_name = product?.unit || '';
  row.product_unit_id = product?.unit_id || row.product_unit_id || '';
  await loadRowStockSummary(row);
  handleRowChange(row);
}

async function handleWarehouseChange(row: any) {
  await loadRowStockSummary(row);
  handleRowChange(row);
}

const summaries = computed(() => ({
  count: tableData.value.reduce((sum, item) => sum + Number(item.count || 0), 0),
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
    emit('update:discount-price', 0);
    emit('update:other-price', 0);
    emit('update:total-price', 0);
    emit('update:total-product-price', 0);
    emit('update:total-tax-price', 0);
    emit('update:total-count', summaries.value.count);
  },
  { deep: true },
);

function handleDelete(row: ErpSaleReturnApi.SaleReturnItem) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) tableData.value.splice(index, 1);
  emit('update:items', [...tableData.value]);
}

function handleRowChange(row: any) {
  const index = tableData.value.indexOf(row);
  if (index === -1) tableData.value.push(row);
  else tableData.value[index] = row;
  emit('update:items', [...tableData.value]);
}

function initRow(row: ErpSaleReturnApi.SaleReturnItem) {
  void loadRowStockSummary(row);
  if (!(row as any).seq) (row as any).seq = `${Date.now()}_${Math.random()}`;
  if (!row.product_name && row.product_id) {
    const product = productOptions.value.find((item) => String(item.rowid) === String(row.product_id));
    if (product) row.product_name = product.product_name;
  }
  if (row.product_id && productOptions.value.length > 0) {
    const product = productOptions.value.find((item) => String(item.rowid) === String(row.product_id));
    if (product) {
      if (!row.product_bar_code) row.product_bar_code = product.barcode;
      if (!row.product_unit_name) row.product_unit_name = product.unit;
      if (!(row as any).product_unit_id && product.unit_id) (row as any).product_unit_id = product.unit_id;
    }
  }
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (item) {
      if (!item.warehouse_id) throw new Error(`第 ${i + 1} 行：仓库不能为空`);
      if (!item.product_id) throw new Error(`第 ${i + 1} 行：产品不能为空`);
      if (!item.count || item.count <= 0) throw new Error(`第 ${i + 1} 行：产品数量不能为空`);
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
      <span class="font-medium text-foreground">退货产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAddRow">
        添加产品
      </ElButton>
    </div>
    <Grid class="w-full">
    <template #warehouse_id_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        仓库名称
      </span>
    </template>
    <template #count_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        数量
      </span>
    </template>
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
          v-for="warehouse in warehouseOptions"
          :key="warehouse.rowid"
          :label="warehouse.name"
          :value="warehouse.rowid"
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
        <ElOption v-for="item in productOptions" :key="item.rowid" :label="item.product_name" :value="item.rowid" />
      </ElSelect>
    </template>
    <template #count="{ row }">
      <StockCountPopover
        :current-stock="(row as any).current_stock_count"
        :total-stock="(row as any).total_stock_count"
      >
        <ElInputNumber v-if="!disabled" v-model="row.count" :min="0" :precision="2" controls-position="right" class="!w-full" @change="handleRowChange(row)" />
        <span v-else>{{ erpCountInputFormatter(row.count) || '-' }}</span>
      </StockCountPopover>
    </template>
    <template #remark="{ row }">
      <ElInput v-if="!disabled" v-model="row.remark" class="w-full" @change="handleRowChange(row)" />
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
            icon: 'lucide:trash-2',
            type: 'danger',
            link: true,
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
      <div class="mt-2 rounded border border-border bg-muted p-2">
        <div class="flex justify-between text-sm text-muted-foreground">
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
