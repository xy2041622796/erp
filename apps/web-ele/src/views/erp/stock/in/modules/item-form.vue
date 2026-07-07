<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';
import type { ErpStockInApi } from '#/api/erp/stock/in';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  erpPriceMultiply,
} from '@vben/utils';

import {
  ElButton,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
} from 'element-plus';

import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import { useFormItemColumns } from '../data';

interface Props {
  items?: ErpStockInApi.StockInItem[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
});

const emit = defineEmits(['update:items']);

const tableData = ref<ErpStockInApi.StockInItem[]>([]); // 表格数据
const productOptions = ref<ErpProductApi.Product[]>([]); // 产品下拉选项
const warehouseOptions = ref<any[]>([]); // 仓库下拉选项

const unitOptions = computed(() => {
  const units = new Set<string>();
  for (const product of productOptions.value) {
    const unit = String((product as any)?.unit || '').trim();
    if (unit) units.add(unit);
  }
  return [...units];
});

/** 获取表格合计数据 */
const summaries = computed(() => {
  return {
    count: tableData.value.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0,
    ),
    totalPrice: tableData.value.reduce(
      (sum, item) => sum + Number(item.total_price || item.totalPrice || 0),
      0,
    ),
  };
});

/** 表格配置 */
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

/** 监听外部传入的列数据 */
watch(
  () => props.items,
  async (items) => {
    if (!items) {
      return;
    }
    items.forEach((item) => initRow(item));
    tableData.value = [...items];
    await nextTick(); // 特殊：保证 gridApi 已经初始化
    await gridApi.grid.reloadData(tableData.value);
  },
  {
    immediate: true,
  },
);

/** 处理新增 */
function handleAdd() {
  const newRow = {
    id: undefined,
    warehouse_id: undefined,
    product_id: undefined,
    product_unit_name: undefined,
    product_bar_code: undefined,
    product_price: undefined,
    stock_count: undefined,
    count: 1,
    total_price: undefined,
    remark: undefined,
  };
  tableData.value.push(newRow);
  // 通知父组件更新
  emit('update:items', [...tableData.value]);
}

/** 处理删除 */
function handleDelete(row: ErpStockInApi.StockInItem) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  // 通知父组件更新
  emit('update:items', [...tableData.value]);
}

/** 处理仓库变更 */
async function handleWarehouseChange(warehouseId: any, row: any) {
  const warehouse = warehouseOptions.value.find(
    (w) => String(w.rowid ?? w.id) === String(warehouseId),
  );
  if (!warehouse) {
    return;
  }
  row.warehouse_id = warehouseId;
  row.warehouse_name = warehouse.name;

  // 如果已选择产品，重新获取库存
  if (row.product_id) {
    row.stock_count = (await getStockCount(row.product_id, warehouseId)) || 0;
  }

  handleRowChange(row);
}

/** 处理产品变更 */
async function handleProductChange(productId: any, row: any) {
  const product = productOptions.value.find(
    (p) => String(p.rowid ?? p.id) === String(productId),
  );
  if (!product) {
    return;
  }
  row.product_id = productId;
  row.product_unit_id = product.unitId ?? product.unit;
  row.product_bar_code = product.barCode ?? product.barcode;
  row.product_unit_name = product.unitName ?? product.unit;
  row.product_name = product.name ?? product.product_name;
  row.stock_count = row.warehouse_id
    ? (await getStockCount(productId, row.warehouse_id)) || 0
    : (await getStockCount(productId)) || 0;
  row.product_price = product.purchasePrice ?? product.purchase_price ?? 0;
  row.count = row.count || 1;
  handleRowChange(row);
}

/** 处理行数据变更 */
function handleRowChange(row: any) {
  initRow(row);
  const index = tableData.value.indexOf(row);
  if (index === -1) {
    tableData.value.push(row);
  } else {
    tableData.value[index] = row;
  }
  emit('update:items', [...tableData.value]);
}

function handleUnitChange(unit: string, row: any) {
  row.product_unit_id = unit;
  row.product_unit_name = unit;
  handleRowChange(row);
}

/** 初始化行数据 */
function initRow(row: ErpStockInApi.StockInItem) {
  row.warehouse_id = row.warehouse_id ?? row.warehouseId;
  row.product_id = row.product_id ?? row.productId;
  row.product_name = row.product_name ?? row.productName;
  row.product_unit_id = row.product_unit_id ?? row.productUnitId;
  row.product_unit_name = row.product_unit_name ?? row.productUnitName;
  row.product_bar_code = row.product_bar_code ?? row.productBarCode;
  row.product_price = row.product_price ?? row.productPrice;
  row.stock_count = row.stock_count ?? row.stockCount;

  if (row.product_price !== undefined && row.count) {
    row.total_price = erpPriceMultiply(row.product_price, row.count) ?? 0;
  }
}

/** 表单校验 */
function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (item) {
      if (!item.warehouse_id) {
        throw new Error(`第 ${i + 1} 行：仓库不能为空`);
      }
      if (!item.product_id) {
        throw new Error(`第 ${i + 1} 行：产品不能为空`);
      }
      if (!item.product_unit_name) {
        throw new Error(`第 ${i + 1} 行：单位不能为空`);
      }
      if (!item.count || item.count <= 0) {
        throw new Error(`第 ${i + 1} 行：产品数量不能为空`);
      }
      if (!item.product_price || item.product_price <= 0) {
        throw new Error(`第 ${i + 1} 行：产品单价不能为空`);
      }
    }
  }
}

defineExpose({
  validate,
});

/** 初始化 */
onMounted(async () => {
  productOptions.value = await getProductSimpleList();
  warehouseOptions.value = await getWarehouseSimpleList();
  // 目的：新增时，默认添加一行
  if (tableData.value.length === 0) {
    handleAdd();
  }
});
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex w-full items-center justify-between">
      <span class="text-foreground font-medium">入库产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAdd">
        添加入库产品
      </ElButton>
    </div>
    <Grid class="w-full">
      <template #warehouse_id="{ row }">
        <ElSelect
          v-model="row.warehouse_id"
          class="w-full"
          placeholder="请选择仓库"
          filterable
          :disabled="disabled"
          @change="handleWarehouseChange($event, row)"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.rowid ?? item.id"
            :label="item.name"
            :value="item.rowid ?? item.id"
          />
        </ElSelect>
      </template>
      <template #product_id="{ row }">
        <ElSelect
          v-model="row.product_id"
          class="w-full"
          placeholder="请选择产品"
          filterable
          :disabled="disabled"
          @change="handleProductChange($event, row)"
        >
          <ElOption
            v-for="item in productOptions"
            :key="item.rowid ?? item.id"
            :label="item.name ?? item.product_name"
            :value="item.rowid ?? item.id"
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
      <template #product_bar_code="{ row }">
        <ElInput
          v-if="!disabled"
          v-model="row.product_bar_code"
          class="w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.product_bar_code || '-' }}</span>
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
          @change="handleUnitChange($event, row)"
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
        <span v-else>{{
          erpPriceInputFormatter(row.product_price) || '-'
        }}</span>
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
              <span>
                金额：{{ erpPriceInputFormatter(summaries.totalPrice) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </Grid>
  </div>
</template>
