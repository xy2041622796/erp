<script lang="ts" setup>
import type { ErpSaleReturnInApi } from '#/api/erp/stock/sale-return-in';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { erpCountInputFormatter } from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';

import { useFormItemColumns } from '../data';

import { ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';

const props = withDefaults(
  defineProps<{
    items?: ErpSaleReturnInApi.SaleReturnInItem[];
    disabled?: boolean;
    warehouseId?: string | number;
    warehouseName?: string;
    disableDelete?: boolean;
  }>(),
  {
    items: () => [],
    disabled: false,
    warehouseId: undefined,
    warehouseName: undefined,
    disableDelete: false,
  },
);

const emit = defineEmits(['update:items', 'update:total-count']);
const tableData = ref<ErpSaleReturnInApi.SaleReturnInItem[]>([]);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);

function applyWarehouse(row: any) {
  const wid = props.warehouseId ? String(props.warehouseId) : '';
  if (!wid) return;
  row.warehouse_id = wid;
  const warehouse = warehouseOptions.value.find(
    (item) => String(item.rowid) === wid,
  );
  row.warehouse_name = props.warehouseName || warehouse?.name || row.warehouse_name;
}

async function loadRowStock(row: any) {
  if (!row.product_id) {
    row.stock_count = 0;
    row.current_stock_count = 0;
    row.total_stock_count = 0;
    return;
  }
  const current = row.warehouse_id
    ? await getStockCount(String(row.product_id), String(row.warehouse_id))
    : 0;
  const total = await getStockCount(String(row.product_id));
  row.stock_count = Number(current || 0);
  row.current_stock_count = Number(current || 0);
  row.total_stock_count = Number(total || 0);
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
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: false },
  },
});

watch(
  () => props.items,
  async (items) => {
    const list = Array.isArray(items) ? items : [];
    list.forEach((item) => initRow(item as any));
    tableData.value = [...list];
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
    await gridApi.grid.reloadColumn(
      useFormItemColumns(tableData.value, props.disabled) || [],
    );
  },
  { immediate: true },
);

watch(
  () => props.warehouseId,
  async () => {
    tableData.value.forEach((item) => initRow(item as any));
    emit('update:items', [...tableData.value]);
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
  },
  { immediate: true },
);

watch(
  () => tableData.value,
  () => {
    emit(
      'update:total-count',
      tableData.value.reduce((prev, curr) => prev + Number(curr.count || 0), 0),
    );
  },
  { deep: true },
);

function initRow(row: any) {
  applyWarehouse(row);
  void loadRowStock(row);
  if (!row.product_name && row.product_id) {
    const product = productOptions.value.find(
      (item) => String(item.rowid) === String(row.product_id),
    );
    if (product) {
      row.product_name = product.product_name;
      row.product_bar_code = row.product_bar_code || product.barcode;
      row.product_unit_name = row.product_unit_name || product.unit;
    }
  }
}

function handleDelete(row: any) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) tableData.value.splice(index, 1);
  emit('update:items', [...tableData.value]);
}

function handleRowChange() {
  emit('update:items', [...tableData.value]);
}

function validate() {
  if (!tableData.value.length) throw new Error('请先选择来源销售退货单并导入明细');
  for (let i = 0; i < tableData.value.length; i++) {
    const item: any = tableData.value[i];
    if (!item.warehouse_id) throw new Error(`第 ${i + 1} 行：仓库不能为空`);
    if (!(Number(item.count || 0) > 0)) {
      throw new Error(`第 ${i + 1} 行：本次入库数量必须大于 0`);
    }
  }
}

defineExpose({ validate });

onMounted(async () => {
  productOptions.value = await getProductSimpleList();
  warehouseOptions.value = await getWarehouseSimpleList();
  if (tableData.value.length > 0) {
    tableData.value.forEach((item) => initRow(item as any));
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
  }
});
</script>

<template>
  <Grid class="w-full">
    <template #warehouse_id="{ row }">
      <ElSelect v-model="row.warehouse_id" disabled class="w-full">
        <ElOption
          v-for="item in warehouseOptions"
          :key="item.rowid"
          :label="item.name"
          :value="item.rowid"
        />
      </ElSelect>
    </template>
    <template #product_id="{ row }">
      <ElSelect v-model="row.product_id" disabled class="w-full">
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
          @change="handleRowChange"
        />
        <span v-else>{{ erpCountInputFormatter(row.count) || '-' }}</span>
      </StockCountPopover>
    </template>
    <template #remark="{ row }">
      <ElInput v-if="!disabled" v-model="row.remark" class="w-full" @change="handleRowChange" />
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
              title: '确认删除该产品吗？',
              confirm: handleDelete.bind(null, row),
            },
            disabled: props.disableDelete,
          },
        ]"
      />
    </template>
    <template #bottom>
      <div class="mt-2 w-full rounded border border-border bg-muted p-2">
        <div class="text-sm">
          <span class="font-medium">合计：</span>
          <span>数量：{{ erpCountInputFormatter(summaries.count) }}</span>
        </div>
      </div>
    </template>
  </Grid>
</template>
