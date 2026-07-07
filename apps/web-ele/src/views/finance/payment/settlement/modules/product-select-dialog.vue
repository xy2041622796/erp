<script lang="ts" setup>
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';

import { ref } from 'vue';

import SaleOrderSelectDialog from '#/views/finance/payment/settlement/modules/sale-order-select-dialog.vue';

defineOptions({ name: 'SettlementProductSelectDialog' });

const props = withDefaults(
  defineProps<{
    cancelText?: string;
    confirmText?: string;
    title?: string;
    value?: string;
  }>(),
  {
    title: '选择采购订单',
    confirmText: '确定',
    cancelText: '取消',
    value: undefined,
  },
);

const emit = defineEmits<{
  cancel: [];
  closed: [];
  confirm: [value: ErpPurchaseOrderApi.PurchaseOrder];
  'update:value': [value: string | undefined];
}>();

const innerRef = ref<InstanceType<typeof SaleOrderSelectDialog>>();

async function open(supplierId?: string | number) {
  await innerRef.value?.open?.(supplierId);
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
