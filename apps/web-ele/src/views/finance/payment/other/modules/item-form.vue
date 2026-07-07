<script lang="ts" setup>
import type { ErpPaymentDetailApi } from '#/api/erp/finance/payment/other/paymentDetails';

import { computed, nextTick, ref, watch } from 'vue';

import { addMoney, divMoney, moneyNumber, moneyText, mulMoney, sumByMoney } from '#/utils/finance/decimal-money';

import { erpPriceInputFormatter } from '@vben/utils';


import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useFormItemColumns } from '#/views/finance/payment/other/data';

import { ElButton, ElInput, ElInputNumber, ElSwitch } from 'element-plus';

interface Props {
  items?: ErpPaymentDetailApi.PaymentDetail[];
  disabled?: boolean;
  taxIncluded?: number;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
  taxIncluded: 1,
});

const emit = defineEmits([
  'update:items',
  'update:summary',
  'update:tax-included',
  'update:expense-category-names',
]);

const tableData = ref<ErpPaymentDetailApi.PaymentDetail[]>([]);

const summaries = computed(() => {
  const amount = moneyNumber(sumByMoney(tableData.value, (item) => item.business_doc_amount));
  const taxAmount = moneyNumber(
    sumByMoney(tableData.value, (item) =>
      divMoney(mulMoney(item.business_doc_amount, item.tax_rate, 'round', 6), 100),
    ),
  );
  const total = moneyNumber(addMoney([amount, taxAmount]));

  return { amount, taxAmount, total };
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFormItemColumns(),
    data: tableData.value,
    minHeight: 240,
    autoResize: true,
    border: true,
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: false },
  },
});

const syncingFromProps = ref(false);

function emitAll() {
  emit('update:items', [...tableData.value]);
  emit('update:summary', { ...summaries.value });
  emit(
    'update:expense-category-names',
    tableData.value
      .map((i) => i.payment_type)
      .filter(Boolean)
      .join(','),
  );
}

watch(
  () => props.items,
  async (items) => {
    syncingFromProps.value = true;
    try {
      tableData.value = Array.isArray(items) ? [...items] : [];
      await nextTick();
      await gridApi.grid.reloadData(tableData.value);
    } finally {
      syncingFromProps.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => tableData.value,
  () => {
    if (syncingFromProps.value) return;
    emitAll();
  },
  { deep: true },
);

function handleAdd() {
  tableData.value.push({
    payment_type: undefined,
    tax_rate: 0,
    business_doc_amount: 0,
    description: undefined,
  });
  emitAll();
}

function handleDelete(rowIndex: number) {
  tableData.value.splice(rowIndex, 1);
  emitAll();
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (!item) continue;
    if (!item.payment_type) {
      throw new Error(`第 ${i + 1} 行：支出类别不能为空`);
    }
    const amt = Number(item.business_doc_amount || 0);
    if (amt <= 0) {
      throw new Error(`第 ${i + 1} 行：金额必须大于 0`);
    }
  }
}

defineExpose({ validate, summaries });
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex items-center justify-between">
      <div class="text-sm text-gray-500">
        金额小计：{{ moneyText(summaries.amount) }}；税额：{{ moneyText(summaries.taxAmount) }}；合计：{{ moneyText(summaries.total) }}
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">含税</span>
          <ElSwitch
            :model-value="taxIncluded"
            :active-value="1"
            :inactive-value="0"
            :disabled="disabled"
            @update:model-value="(v) => emit('update:tax-included', v)"
          />
        </div>

        <el-button type="primary" plain :disabled="disabled" @click="handleAdd">添加</el-button>
      </div>
    </div>

    <Grid class="w-full">
      <template #payment_type="{ row }">
        <ElInput v-model="row.payment_type" placeholder="请选择/输入" :disabled="disabled" />
      </template>

      <template #tax_rate="{ row }">
        <ElInputNumber
          v-model="row.tax_rate"
          :min="0"
          :max="100"
          :precision="2"
          controls-position="right"
          class="!w-full"
          :disabled="disabled"
        />
      </template>

      <template #business_doc_amount="{ row }">
        <ElInputNumber
          v-model="row.business_doc_amount"
          :min="0"
          :precision="2"
          :formatter="erpPriceInputFormatter"
          controls-position="right"
          class="!w-full"
          :disabled="disabled"
        />
      </template>

      <template #description="{ row }">
        <ElInput v-model="row.description" placeholder="请输入备注" :disabled="disabled" />
      </template>

      <template #actions="{ rowIndex }">
        <el-button type="danger" link :disabled="disabled" @click="handleDelete(rowIndex)">
          删除
        </el-button>
      </template>
    </Grid>
  </div>
</template>
