<script lang="ts" setup>
import { moneyNumber, moneyText, mulMoney, sumByMoney } from '#/utils/finance/decimal-money';
import { computed, onMounted, ref } from 'vue';


import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElEmpty,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceBasicDataOpeningProductStockTab' });

type ProductOpeningRow = {
  id: string;
  opening_date?: string;
  warehouse_id?: string;
  product_id?: string;
  unit_name?: string;
  qty?: number;
  price?: number;
  amount?: number;
  remark?: string;
};

const STORAGE_KEY = 'erp-basic-data-product-opening-stock-draft';
const loading = ref(false);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const rows = ref<ProductOpeningRow[]>([]);

function createRow(): ProductOpeningRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    opening_date: new Date().toISOString().slice(0, 10),
    qty: 0,
    price: 0,
    amount: 0,
    remark: '',
  };
}

function recalcRow(row: ProductOpeningRow) {
  const qty = Number(row.qty || 0);
  const price = Number(row.price || 0);
  row.amount = moneyNumber(mulMoney(qty, price));
}

function handleProductChange(value: string, row: ProductOpeningRow) {
  const hit = productOptions.value.find((item) => String(item.rowid || item.id) === String(value));
  row.unit_name = hit?.unit || hit?.unit_name || '';
  if (Number(row.price || 0) <= 0) {
    row.price = Number(hit?.purchase_price || hit?.purchasePrice || 0);
  }
  recalcRow(row);
}

function addRow() {
  rows.value.push(createRow());
}

function removeRow(id: string) {
  rows.value = rows.value.filter((item) => item.id !== id);
}

function saveDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.value || []));
  ElMessage.success('商品期初库存草稿已保存到浏览器本地');
}

function loadDraft() {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    rows.value = [createRow()];
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    rows.value = Array.isArray(parsed) && parsed.length > 0 ? parsed : [createRow()];
    rows.value.forEach(recalcRow);
  } catch {
    rows.value = [createRow()];
  }
}

const totalQty = computed(() => moneyNumber(sumByMoney(rows.value, (item) => item.qty), 'round', 3));
const totalAmount = computed(() => moneyNumber(sumByMoney(rows.value, (item) => item.amount)));

onMounted(async () => {
  loadDraft();
  loading.value = true;
  try {
    const [products, warehouses] = await Promise.all([
      getProductSimpleList(),
      getWarehouseSimpleList(),
    ]);
    productOptions.value = Array.isArray(products) ? products : [];
    warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];
  } catch (error: any) {
    ElMessage.error(error?.message || '加载商品或仓库数据失败');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="opening-tab-page">
    <ElAlert
      title="商品期初库存入口已并入基础数据目录，正式生效仍建议走“草稿 / 审核 / 写库存结果 / 写库存流水”的链路。"
      type="success"
      :closable="false"
    >
      <template #default>
        <div class="text-sm leading-6">
          本页已接入商品与仓库基础数据联动。后续接入后端时，应在审核通过后统一写入
          erp_stock，并同步生成 erp_stock_record，避免直接手改库存结果表。
        </div>
      </template>
    </ElAlert>

    <div class="toolbar">
      <div class="text-sm text-gray-500">入口：基础数据 / 期初录入 / 商品期初库存录入</div>
      <div class="toolbar__actions">
        <ElTag type="info">草稿本地保存</ElTag>
        <ElButton @click="addRow">新增一行</ElButton>
        <ElButton type="primary" @click="saveDraft">保存草稿</ElButton>
      </div>
    </div>

    <ElEmpty v-if="rows.length === 0" description="暂无商品期初库存草稿" />

    <ElTable v-else v-loading="loading" :data="rows" border>
      <ElTableColumn label="期初日期" min-width="150">
        <template #default="{ row }">
          <ElDatePicker
            v-model="row.opening_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择日期"
            class="w-full"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="仓库" min-width="180">
        <template #default="{ row }">
          <ElSelect v-model="row.warehouse_id" filterable clearable placeholder="请选择仓库" class="w-full">
            <ElOption
              v-for="item in warehouseOptions"
              :key="String(item.rowid || item.id)"
              :label="item.name || item.warehouse_name || '未命名仓库'"
              :value="String(item.rowid || item.id)"
            />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn label="商品" min-width="220">
        <template #default="{ row }">
          <ElSelect
            v-model="row.product_id"
            filterable
            clearable
            placeholder="请选择商品"
            class="w-full"
            @change="handleProductChange($event, row)"
          >
            <ElOption
              v-for="item in productOptions"
              :key="String(item.rowid || item.id)"
              :label="item.product_name || item.name || '未命名商品'"
              :value="String(item.rowid || item.id)"
            />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="unit_name" label="单位" min-width="90" />
      <ElTableColumn label="数量" min-width="120">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.qty"
            :precision="3"
            :controls="false"
            class="w-full"
            @change="recalcRow(row)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="单价" min-width="120">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.price"
            :precision="2"
            :controls="false"
            class="w-full"
            @change="recalcRow(row)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="金额" min-width="120">
        <template #default="{ row }">
          <ElInputNumber v-model="row.amount" :precision="2" :controls="false" disabled class="w-full" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="备注" min-width="200">
        <template #default="{ row }">
          <ElInput v-model="row.remark" placeholder="备注" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <ElButton type="danger" link @click="removeRow(row.id)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <div class="summary-bar">
      <span>数量合计：{{ moneyNumber(totalQty, 'round', 3) }}</span>
      <span>金额合计：{{ moneyText(totalAmount) }}</span>
    </div>
  </div>
</template>

<style scoped>
.opening-tab-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-bar {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  padding: 12px 4px 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.68);
}
</style>
