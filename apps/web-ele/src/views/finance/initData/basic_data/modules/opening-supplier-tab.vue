<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { getSupplierSimpleList } from '#/api/erp/customer';
import { moneyNumber, subMoney } from '#/utils/finance/decimal-money';

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

defineOptions({ name: 'FinanceBasicDataOpeningSupplierTab' });

type SupplierOpeningRow = {
  id: string;
  supplier_id?: string;
  opening_date?: string;
  opening_payable?: number;
  opening_paid?: number;
  opening_balance?: number;
  remark?: string;
};

const STORAGE_KEY = 'erp-basic-data-supplier-opening-draft';
const loading = ref(false);
const supplierOptions = ref<any[]>([]);
const rows = ref<SupplierOpeningRow[]>([]);

function createRow(): SupplierOpeningRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    opening_date: new Date().toISOString().slice(0, 10),
    opening_payable: 0,
    opening_paid: 0,
    opening_balance: 0,
    remark: '',
  };
}

function recalcRow(row: SupplierOpeningRow) {
  row.opening_balance = moneyNumber(
    subMoney(row.opening_payable, row.opening_paid),
  );
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
  ElMessage.success('供应商期初草稿已保存到浏览器本地');
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
    rows.value =
      Array.isArray(parsed) && parsed.length > 0 ? parsed : [createRow()];
    rows.value.forEach(recalcRow);
  } catch {
    rows.value = [createRow()];
  }
}

onMounted(async () => {
  loadDraft();
  loading.value = true;
  try {
    supplierOptions.value = await getSupplierSimpleList();
  } catch (error: any) {
    ElMessage.error(error?.message || '加载供应商列表失败');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="opening-tab-page">
    <ElAlert
      title="当前已接入基础数据目录和供应商主数据联动，正式审核入账仍需后端期初表承接。"
      type="warning"
      :closable="false"
    >
      <template #default>
        <div class="text-sm leading-6">
          本页先用于整理供应商期初录入结构：供应商、期初日期、应付、已付、余额。后续接入后端时，建议按“草稿
          / 审核”两阶段生效。
        </div>
      </template>
    </ElAlert>

    <div class="toolbar">
      <div class="text-sm text-gray-500">
        入口：基础数据 / 期初录入 / 供应商期初录入
      </div>
      <div class="toolbar__actions">
        <ElTag type="info">草稿本地保存</ElTag>
        <ElButton @click="addRow">新增一行</ElButton>
        <ElButton type="primary" @click="saveDraft">保存草稿</ElButton>
      </div>
    </div>

    <ElEmpty v-if="rows.length === 0" description="暂无供应商期初草稿" />

    <ElTable v-else v-loading="loading" :data="rows" border>
      <ElTableColumn label="供应商" min-width="220">
        <template #default="{ row }">
          <ElSelect
            v-model="row.supplier_id"
            filterable
            clearable
            placeholder="请选择供应商"
            class="w-full"
          >
            <ElOption
              v-for="item in supplierOptions"
              :key="String(item.rowid || item.id)"
              :label="
                item.customer_name ||
                item.customerName ||
                item.name ||
                '未命名供应商'
              "
              :value="String(item.rowid || item.id)"
            />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn label="期初日期" min-width="160">
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
      <ElTableColumn label="期初应付" min-width="140">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.opening_payable"
            :precision="2"
            :controls="false"
            class="w-full"
            @change="recalcRow(row)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="期初已付" min-width="140">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.opening_paid"
            :precision="2"
            :controls="false"
            class="w-full"
            @change="recalcRow(row)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="期初余额" min-width="140">
        <template #default="{ row }">
          <ElInputNumber
            v-model="row.opening_balance"
            :precision="2"
            :controls="false"
            disabled
            class="w-full"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="备注" min-width="220">
        <template #default="{ row }">
          <ElInput v-model="row.remark" placeholder="备注" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <ElButton type="danger" link @click="removeRow(row.id)"
            >删除</ElButton
          >
        </template>
      </ElTableColumn>
    </ElTable>
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
</style>
