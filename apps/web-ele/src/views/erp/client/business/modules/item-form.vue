<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed, onMounted, ref, watch } from 'vue';


import { getProductSimpleList } from '#/api/erp/product/product';

import {
  ElButton,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

interface Props {
  items?: CrmCustomerBusinessApi.BusinessProductItem[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:items', items: CrmCustomerBusinessApi.BusinessProductItem[]): void;
  (e: 'update:total-product-price', value: number): void;
}>();

const tableData = ref<CrmCustomerBusinessApi.BusinessProductItem[]>([]);
const productOptions = ref<ErpProductApi.Product[]>([]);

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function roundAmount(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(precision));
}

function ensureRowId(item: CrmCustomerBusinessApi.BusinessProductItem) {
  if (!item.rowid) {
    item.rowid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return item;
}

const summaries = computed(() => ({
  totalProductPrice: roundAmount(
    tableData.value.reduce((sum, item) => sum + toNumber(item.totalPrice), 0),
  ),
}));

function emitItems() {
  const cloned = tableData.value.map((item, index) => ({
    ...item,
    sortNo: index + 1,
  }));
  emit('update:items', cloned);
  emit('update:total-product-price', summaries.value.totalProductPrice);
}

function recalcRow(row: CrmCustomerBusinessApi.BusinessProductItem) {
  const salePrice = roundAmount(toNumber(row.salePrice));
  const productCount = Number(toNumber(row.productCount).toFixed(6));
  row.salePrice = salePrice;
  row.productCount = productCount;
  row.totalPrice = roundAmount(salePrice * productCount);
}

function handleAdd() {
  tableData.value.push(
    ensureRowId({
      productCount: 1,
      productPrice: 0,
      salePrice: 0,
      totalPrice: 0,
    }),
  );
  emitItems();
}

function handleDelete(index: number) {
  tableData.value.splice(index, 1);
  emitItems();
}

function handleProductChange(productId: string, row: CrmCustomerBusinessApi.BusinessProductItem) {
  const product = productOptions.value.find(
    (item) => String(item.rowid || '') === String(productId || ''),
  );
  row.productId = productId;
  if (!product) {
    emitItems();
    return;
  }
  row.productCode = product.product_code;
  row.productName = product.product_name;
  row.productBarCode = product.barcode;
  row.productUnitName = product.unit;
  row.productPrice = roundAmount(toNumber(product.purchase_price));
  row.salePrice = roundAmount(toNumber(product.retail_price));
  row.productCount = toNumber(row.productCount) > 0 ? row.productCount : 1;
  recalcRow(row);
  emitItems();
}

function handleRowChange(row: CrmCustomerBusinessApi.BusinessProductItem) {
  recalcRow(row);
  emitItems();
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const row = tableData.value[i];
    if (!String(row.productId || '').trim()) {
      throw new Error(`第 ${i + 1} 行：请选择产品`);
    }
    if (toNumber(row.productCount) <= 0) {
      throw new Error(`第 ${i + 1} 行：数量必须大于 0`);
    }
    if (toNumber(row.salePrice) < 0) {
      throw new Error(`第 ${i + 1} 行：售价不能小于 0`);
    }
  }
}

defineExpose({ validate });

watch(
  () => props.items,
  (items) => {
    tableData.value = (items || []).map((item) => {
      const row = ensureRowId({ ...item });
      recalcRow(row);
      return row;
    });
    emit('update:total-product-price', summaries.value.totalProductPrice);
  },
  { immediate: true, deep: true },
);

onMounted(async () => {
  const products = await getProductSimpleList();
  productOptions.value = Array.isArray(products) ? products : [];
});
</script>

<template>
  <div>
    <ElTable :data="tableData" border style="width: 100%">
      <ElTableColumn type="index" label="序号" width="70" />
      <ElTableColumn label="产品名称" min-width="180">
        <template #default="{ row }">
          <ElSelect
            v-if="!disabled"
            v-model="row.productId"
            filterable
            clearable
            class="w-full"
            placeholder="请选择产品"
            @change="handleProductChange($event, row)"
          >
            <ElOption
              v-for="item in productOptions"
              :key="String(item.rowid || '')"
              :label="String(item.product_name || '')"
              :value="String(item.rowid || '')"
            />
          </ElSelect>
          <span v-else>{{ row.productName || '-' }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="productBarCode" label="条码" min-width="140" />
      <ElTableColumn prop="productUnitName" label="单位" min-width="100" />
      <ElTableColumn label="价格（元）" min-width="130">
        <template #default="{ row }">
          <ElInputNumber
            v-if="!disabled"
            v-model="row.productPrice"
            :min="0"
            :precision="2"
            controls-position="right"
            class="!w-full"
          />
          <span v-else>{{ row.productPrice || 0 }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="售价（元）" min-width="130">
        <template #default="{ row }">
          <ElInputNumber
            v-if="!disabled"
            v-model="row.salePrice"
            :min="0"
            :precision="2"
            controls-position="right"
            class="!w-full"
            @change="handleRowChange(row)"
          />
          <span v-else>{{ row.salePrice || 0 }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="数量" min-width="120">
        <template #default="{ row }">
          <ElInputNumber
            v-if="!disabled"
            v-model="row.productCount"
            :min="0"
            :precision="6"
            controls-position="right"
            class="!w-full"
            @change="handleRowChange(row)"
          />
          <span v-else>{{ row.productCount || 0 }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="totalPrice" label="合计" min-width="130" />
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ $index }">
          <ElButton type="danger" link :disabled="disabled" @click="handleDelete($index)">
            删除
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <div v-if="!disabled" class="mt-4 text-center">
      <ElButton @click="handleAdd">添加产品</ElButton>
    </div>
  </div>
</template>
