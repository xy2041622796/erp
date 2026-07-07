<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  generateUUID,
} from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getStockCount, getWarehouseStockCount } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import StockCountPopover from '#/views/erp/shared/components/StockCountPopover.vue';

import ItemDetailModal from '../../../shared/components/ItemDetailModal.vue';
import { useFormItemColumns } from '../data';

import { ElButton, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';

interface Props {
  items?: ErpSaleOrderApi.SaleOrderItem[];
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
  'update:total-count',
]);

const tableData = ref<ErpSaleOrderApi.SaleOrderItem[]>([]);
const productOptions = ref<ErpProductApi.Product[]>([]);
const warehouseOptions = ref<any[]>([]);

const itemDetailModal = ref();

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

function handleView(row: any) {
  itemDetailModal.value?.open(row, '查看销售订单明细', '商品数量');
}

const selectOptions = computed(() =>
  productOptions.value.map((p) => ({ label: p.product_name, value: p.rowid })),
);

const warehouseNameMap = computed(() => {
  const map = new Map<string, string>();
  for (const w of warehouseOptions.value || []) {
    const id = (w as any)?.rowid;
    if (id) {
      map.set(String(id), String((w as any)?.name ?? ''));
    }
  }
  return map;
});

const productDefaultWarehouseIdMap = computed(() => {
  const map = new Map<string, string>();
  for (const p of productOptions.value || []) {
    const id = (p as any)?.rowid;
    if (!id) continue;
    const defaultWarehouseId =
      (p as any)?.default_warehouse_id ?? (p as any)?.defaultWarehouseId;
    map.set(String(id), defaultWarehouseId ? String(defaultWarehouseId) : '');
  }
  return map;
});

function getDefaultWarehouseName(row: any) {
  const productId = row?.product_id ? String(row.product_id) : '';
  if (!productId) return '-';
  const defaultWarehouseId = productDefaultWarehouseIdMap.value.get(productId);
  if (!defaultWarehouseId) return '-';
  return warehouseNameMap.value.get(defaultWarehouseId) || '-';
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

const summaries = computed(() => {
  return {
    count: tableData.value.reduce((sum, item) => sum + (item.count || 0), 0),
    totalProductPrice: tableData.value.reduce(
      (sum, item: any) => sum + (item.total_product_price || 0),
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
      ensureRowSeq(item);
      hydrateRowAmounts(item as any);
    });
    tableData.value = [...items];
    await nextTick();

    await gridApi.grid?.reloadData(tableData.value);

    await initAllRowsProductInfoOnce();
  },
  {
    immediate: true,
  },
);

watch(
  () => [summaries.value],
  () => {
    emit('update:total-count', summaries.value);
  },
  {
    deep: true,
  },
);

watch(
  () => [tableData.value, props.discountPercent],
  () => {
    if (!tableData.value || tableData.value.length === 0) {
      return;
    }
    const totalPrice = tableData.value.reduce(
      (prev, curr) => prev + (curr.total_price || 0),
      0,
    );
    const discountPrice = roundAmount(totalPrice * (toNumber(props.discountPercent) / 100));
    const finalTotalPrice = totalPrice - discountPrice;
    emit('update:discount-price', discountPrice);
    emit('update:total-price', finalTotalPrice);
  },
  { deep: true },
);

function handleAdd() {
  const newRow = ensureRowSeq({
    rowid: undefined,
    product_id: undefined,
    product_unit_name: undefined,
    product_bar_code: undefined,
    product_price: undefined,
    tax_included_price: undefined,
    stock_count: undefined,
    count: 1,
    out_count: 0,
    return_count: 0,
    warehouse_id: undefined,
    total_product_price: undefined,
    tax_percent: 0,
    tax_price: undefined,
    total_price: undefined,
    remark: undefined,
    current_stock_count: 0,
    total_stock_count: 0,
  });
  tableData.value.push(newRow);
  gridApi.grid?.reloadData(tableData.value);
  emit('update:items', [...tableData.value]);
}

function handleDelete(row: ErpSaleOrderApi.SaleOrderItem) {
  ensureRowSeq(row);
  const index = tableData.value.findIndex((item) => item.seq === row.seq);
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  gridApi.grid?.reloadData(tableData.value);
  emit('update:items', [...tableData.value]);
}

const toPercentNumber = (v: null | number | string | undefined) => {
  if (v === null) return null;
  const n = Number.parseFloat(String(v).trim().replace('%', ''));
  return Number.isFinite(n) ? n : null;
};

type HandleProductChangeOptions = {
  emit?: boolean;
  init?: boolean;
};

const isInitProductInfo = ref(false);
const lastInitProductIdByRow = new WeakMap<object, any>();

async function initRowProductInfoOnce(row: any) {
  const pdId = row?.product_id;
  if (!pdId) return;
  if (productOptions.value.length === 0) return;

  const lastPdId = lastInitProductIdByRow.get(row);
  if (lastPdId === pdId) return;

  await handleProductChange(pdId, row, { emit: false, init: true });
}

async function initAllRowsProductInfoOnce() {
  if (isInitProductInfo.value) return;
  if (tableData.value.length === 0) return;
  if (productOptions.value.length === 0) return;

  isInitProductInfo.value = true;
  try {
    for (const row of tableData.value) {
      await initRowProductInfoOnce(row);
    }
  } finally {
    isInitProductInfo.value = false;
  }
}

async function handleProductChange(
  pdId: any,
  row: any,
  options: HandleProductChangeOptions = {},
) {
  const shouldEmit = options.emit !== false;

  const product = productOptions.value.find((p) => p.rowid === pdId);

  if (!product) {
    return;
  }

  ensureRowSeq(row);

  if (row && typeof row === 'object') {
    lastInitProductIdByRow.set(row, pdId);
  }

  row.product_id = pdId;
  row.product_unit_id = undefined;
  if (!row.warehouse_id) {
    row.warehouse_id = (product as any).default_warehouse_id || (product as any).defaultWarehouseId;
  }
  row.product_bar_code = row.product_bar_code || product.barcode;
  row.product_unit_name = row.product_unit_name || product.unit;
  row.product_name = row.product_name || product.product_name;

  if (options.init) {
    if (row.tax_percent === undefined || row.tax_percent === null || row.tax_percent === '') {
      row.tax_percent = toPercentNumber(product.retail_tax) || 0;
    }
    hydrateRowAmounts(row);
    if (!row.tax_included_price && product.retail_price) {
      row.tax_included_price = toNumber(product.retail_price);
      recalcRowAmounts(row);
    }
  } else {
    row.tax_percent = toPercentNumber(product.retail_tax) || 0;
    row.tax_included_price = toNumber(product.retail_price) || row.tax_included_price;
    row.count = row.count || 1;
    recalcRowAmounts(row);
  }

  await loadRowStockSummary(row);

  if (shouldEmit) {
    handleRowChange(row);
  }
}

async function handleWarehouseChange(row: any) {
  await loadRowStockSummary(row);
  handleRowChange(row);
}

function handleRowChange(row: any) {
  ensureRowSeq(row);
  recalcRowAmounts(row);

  const index = tableData.value.findIndex((item) => item.seq === row.seq);
  if (index === -1) {
    tableData.value.push(row);
  } else {
    tableData.value[index] = row;
  }
  emit('update:items', [...tableData.value]);
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i] as any;
    if (item) {
      if (!item.product_id) {
        throw new Error(`第 ${i + 1} 行：产品不能为空`);
      }
      if (!item.warehouse_id) {
        throw new Error(`第 ${i + 1} 行：分配仓库不能为空`);
      }
      if (!item.count || item.count <= 0) {
        throw new Error(`第 ${i + 1} 行：产品数量不能为空`);
      }
      if (!item.tax_included_price || item.tax_included_price <= 0) {
        throw new Error(`第 ${i + 1} 行：销售单价不能为空`);
      }
    }
  }
}

defineExpose({
  validate,
});

onMounted(async () => {
  const [products, warehouses] = await Promise.all([
    getProductSimpleList(),
    getWarehouseSimpleList(),
  ]);
  productOptions.value = Array.isArray(products) ? products : [];
  warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];

  await initAllRowsProductInfoOnce();

  if (tableData.value.length === 0) {
    handleAdd();
  }
});
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex w-full items-center justify-between">
      <span class="font-medium text-foreground">产品清单</span>
      <ElButton v-if="!disabled" type="primary" @click="handleAdd">添加产品</ElButton>
    </div>
    <Grid class="w-full">
    <template #product_id_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        产品名称
      </span>
    </template>
    <template #warehouse_id_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        已分配仓库
      </span>
    </template>
    <template #count_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        数量
      </span>
    </template>
    <template #product_price_header>
      <span>
        <span class="mr-1" style="color: var(--el-color-danger)">*</span>
        销售单价（含税）
      </span>
    </template>
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
        v-model="row.product_id"
        :options="selectOptions"
        placeholder="请选择产品"
        filterable
        class="w-full"
        @change="handleProductChange($event, row)"
      >
        <el-option
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
            <span>
              未税金额：{{ erpPriceInputFormatter(summaries.totalProductPrice) }}
            </span>
            <span>税额：{{ erpPriceInputFormatter(summaries.taxPrice) }}</span>
            <span>
              含税合计：{{ erpPriceInputFormatter(summaries.totalPrice) }}
            </span>
          </div>
        </div>
      </div>
    </template>
    </Grid>
  </div>
  <ItemDetailModal ref="itemDetailModal" />
</template>
