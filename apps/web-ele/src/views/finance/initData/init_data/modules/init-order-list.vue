<script lang="ts" setup>
import SettlementOrderList from '#/views/erp/shared/components/SettlementOrderList.vue';

type BizType = 'income' | 'expense' | 'other_income' | 'other_expense';

function toMode(biz: BizType) {
  return ['income', 'other_income'].includes(String(biz)) ? 'income' : 'expense';
}

defineOptions({ name: 'InitBusinessOrderList' });

const props = withDefaults(
  defineProps<{
    biz: BizType;
    customerId?: string;
    items?: any[];
    disabled?: boolean;
  }>(),
  {
    customerId: undefined,
    items: () => [],
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:items', v: any[]): void;
}>();

function handleItemsChange(items: any[]) {
  emit('update:items', items);
}
</script>

<template>
  <SettlementOrderList
    :mode="toMode(biz)"
    :party-id="customerId"
    :items="items"
    :disabled="disabled"
    @update:items="handleItemsChange"
  />
</template>
