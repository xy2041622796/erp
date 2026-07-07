<script lang="ts" setup>
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { ref } from 'vue';

import SaleOrderSelectDialog from '#/views/finance/revenue/settlement/modules/sale-order-select-dialog.vue';

// 兼容保留：历史文件名为 product-select-dialog，但实际已切换为“销售订单选择”。
defineOptions({ name: 'SettlementProductSelectDialog' });

const props = withDefaults(
  defineProps<{
    cancelText?: string;
    confirmText?: string;
    title?: string;
    value?: string;
  }>(),
  {
    title: '选择销售订单',
    confirmText: '确定',
    cancelText: '取消',
    value: undefined,
  },
);

const emit = defineEmits<{
  cancel: [];
  closed: [];
  confirm: [value: ErpSaleOrderApi.SaleOrder];
  'update:value': [value: string | undefined];
}>();

const innerRef = ref<InstanceType<typeof SaleOrderSelectDialog>>();

async function open(customerId?: string | number) {
  await innerRef.value?.open?.(customerId);
}

function close() {
  innerRef.value?.close?.();
}

defineExpose({ open, close });
</script>

<template>
  <SaleOrderSelectDialog
    ref="innerRef"
    v-bind="props"
    @cancel="() => emit('cancel')"
    @closed="() => emit('closed')"
    @confirm="(row) => emit('confirm', row)"
    @update:value="(v) => emit('update:value', v)"
  />
</template>
