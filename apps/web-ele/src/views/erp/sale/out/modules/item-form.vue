<script lang="ts" setup>
import type { ErpSaleOutApi } from '#/api/erp/sale/out';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter } from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/crm/product';
import { getStockCount, getWarehouseStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';

import ItemDetailModal from '../../../shared/components/ItemDetailModal.vue';
import { useFormItemColumns } from '../data';

import { ElButton, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';

interface Props {
  items?: ErpSaleOutApi.SaleOutItem[];
  disabled?: boolean;
  warehouseId?: string;
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

const tableData = ref<ErpSaleOutApi.SaleOutItem[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const itemDetailModal = ref();

function isManualRow(row: ErpSaleOutApi.SaleOutItem) {
  return !row.order_item_id;
}

function handleView(row: any) {
  itemDetailModal.value?.open(row, '查看销售出库明细', '销售数量');
}

function applyWarehouse(row: ErpSaleOutApi.SaleOutItem) {
  const warehouseId = props.warehouseId ? String(props.warehouseId) : '';
  if (!warehouseId) return;
  row.warehouse_id = warehouseId;
  const warehouse = warehouseOptions.value.find(
    (item) => String(item.rowid) === warehouseId,
  );
  row.warehouse_name = props.warehouseName || warehouse?.name || row.warehouse_name;
}

async function loadRowStockSummary(row: ErpSaleOutApi.SaleOutItem) {
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
    items.forEach((item) => initRow(item));
    tableData.value = [...items];
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
    const columns = useFormItemColumns(tableData.value, props.disabled, props.amountVisible);
    await gridApi.grid.reloadColumn(columns || []);
  },
  { immediate: true },
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
    tableData.value.forEach((item) => initRow(item));
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

function handleDelete(row: ErpSaleOutApi.SaleOutItem) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  emit('update:items', [...tableData.value]);
}

async function handleWarehouseChange(row: ErpSaleOutApi.SaleOutItem) {
  await loadRowStockSummary(row);
  handleRowChange(row);
}

function fillProductFields(row: any) {
  const product = productOptions.value.find(
    (item) => String(item.rowid) === String(row.product_id || ''),
  );
  if (!product) return;
  row.product_name = product.product_name;
  row.product_bar_code = product.barcode;
  row.product_unit_name = product.unit;
  row.product_unit_id = row.product_unit_id || product.unit;
  row.category_id = row.category_id || product.product_type;
}

async function handleProductChange(row: ErpSaleOutApi.SaleOutItem) {
  fillProductFields(row as any);
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
  const row: ErpSaleOutApi.SaleOutItem = {
    id: undefined,
    warehouse_id: props.warehouseId,
    warehouse_name: props.warehouseName,
    count: 1,
  };
  initRow(row);
  tableData.value.push(row);
  emit('update:items', [...tableData.value]);
  void nextTick(async () => {
    await gridApi.grid.reloadData(tableData.value);
  });
}

function handleRowChange(row: any) {
  applyWarehouse(row);
  if (props.amountEditable) recalcAmount(row);
  if (row.product_id) fillProductFields(row);
  const index = tableData.value.indexOf(row);
  if (index === -1) {
    tableData.value.push(row);
  } else {
    tableData.value[index] = row;
  }
  emit('update:items', [...tableData.value]);
}

function initRow(row: ErpSaleOutApi.SaleOutItem) {
  applyWarehouse(row);
  void loadRowStockSummary(row);

  if (!row.product_name && row.product_id) {
    fillProductFields(row as any);
  }
}

function validate() {
  if (!tableData.value.length) {
    throw new Error('请至少添加一条出库产品明细');
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
    const count = Number(item.count || 0);
    if (!item.count || count <= 0) {
      throw new Error(`第 ${i + 1} 行：本次出库数量必须大于 0`);
    }
    if (item.order_item_id) {
      const totalCount = Number(item.total_count || 0);
      const outCount = Number(item.out_count || 0);
      const remainCount = Math.max(totalCount - outCount, 0);
      if (totalCount > 0 && count > remainCount) {
        throw new Error(`第 ${i + 1} 行：本次出库数量不能大于剩余可出库数量 ${remainCount}`);
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
    tableData.value.forEach((item) => initRow(item));
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
    <template #count_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        本次出库数量
      </span>
    </template>
    <template #warehouse_id="{ row }">
      <ElSelect
        v-model="row.warehouse_id"
        disabled
        placeholder="请选择仓库"
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
        :disabled="disabled || !isManualRow(row)"
        placeholder="请选择产品"
        filterable
        class="w-full"
        @change="handleProductChange(row)"
      >
        <ElOption
          v-for="item in productOptions"
          :key="item.id"
          :label="item.product_name"
          :value="item.rowid"
        />
      </ElSelect>
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
