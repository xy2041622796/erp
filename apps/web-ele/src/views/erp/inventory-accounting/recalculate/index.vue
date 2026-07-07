<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { getProductSimpleList } from '#/api/erp/product/product';
import { recalculateInventoryCost, type InventoryCostRecalculateResult } from '#/api/erp/inventory-accounting/recalculate';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import { ElAlert, ElButton, ElCard, ElDatePicker, ElForm, ElFormItem, ElMessage, ElOption, ElSelect, ElSwitch, ElTag } from 'element-plus';

defineOptions({ name: 'ErpInventoryCostRecalculate' });

const loading = ref(false);
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const result = ref<InventoryCostRecalculateResult>();
const form = reactive({
  period: '',
  product_id: '',
  warehouse_id: '',
  allow_overwrite: false,
});

function getProductValue(item: any) {
  return String(item?.rowid || item?.id || '');
}

function getWarehouseValue(item: any) {
  return String(item?.rowid || item?.id || '');
}

async function handleRecalculate() {
  if (!form.period) {
    ElMessage.warning('请选择重算期间');
    return;
  }
  loading.value = true;
  try {
    result.value = await recalculateInventoryCost(form);
    ElMessage.success(result.value.message);
  } catch (error: any) {
    ElMessage.error(error?.message || '重算成本失败');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const [products, warehouses] = await Promise.all([
    getProductSimpleList().catch(() => []),
    getWarehouseSimpleList().catch(() => []),
  ]);
  productOptions.value = Array.isArray(products) ? products : [];
  warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <ElAlert
        class="mb-4"
        title="重算成本按月末一次加权平均口径执行；已结账期间应先反结账后再重算。当前页面先完成前端执行入口，真实落库需接入 erp_inventory_cost_calc。"
        type="warning"
        show-icon
        :closable="false"
      />
      <ElCard shadow="never">
        <ElForm :model="form" label-width="120px" class="max-w-3xl">
          <ElFormItem label="重算期间" required>
            <ElDatePicker v-model="form.period" type="month" value-format="YYYY-MM" format="YYYY-MM" placeholder="请选择期间" class="!w-full" />
          </ElFormItem>
          <ElFormItem label="商品范围">
            <ElSelect v-model="form.product_id" clearable filterable placeholder="全部商品" class="!w-full">
              <ElOption v-for="item in productOptions" :key="getProductValue(item)" :label="item.product_name || item.name || getProductValue(item)" :value="getProductValue(item)" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="仓库范围">
            <ElSelect v-model="form.warehouse_id" clearable filterable placeholder="全部仓库" class="!w-full">
              <ElOption v-for="item in warehouseOptions" :key="getWarehouseValue(item)" :label="item.name || item.warehouse_name || getWarehouseValue(item)" :value="getWarehouseValue(item)" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="覆盖已有结果">
            <ElSwitch v-model="form.allow_overwrite" active-text="允许覆盖未结账期间" inactive-text="不覆盖" />
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" :loading="loading" @click="handleRecalculate">执行重算</ElButton>
          </ElFormItem>
        </ElForm>
      </ElCard>

      <ElCard v-if="result" class="mt-4" shadow="never">
        <template #header>重算结果</template>
        <div class="grid grid-cols-4 gap-4 text-sm">
          <div>期间：{{ result.period }}</div>
          <div>结果行数：{{ result.totalRows }}</div>
          <div>异常行数：<ElTag :type="result.exceptionRows > 0 ? 'danger' : 'success'">{{ result.exceptionRows }}</ElTag></div>
          <div>执行时间：{{ result.executedAt }}</div>
        </div>
        <div class="mt-3 text-gray-600">{{ result.message }}</div>
      </ElCard>
    </div>
  </Page>
</template>
