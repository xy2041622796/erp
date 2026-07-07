<script lang="ts" setup>
import SettlementOrderList from '../../shared/components/SettlementOrderList.vue';

defineOptions({ name: 'SettlementOrderList' });

type Mode = 'income' | 'expense';

type SettlementOrderItem = {
  rowid?: string;
  product_id?: string;
  product_name?: string;
  amount?: number;
  total_tax_price?: number;
  remark?: string;
};

const props = withDefaults(
  defineProps<{
    mode: Mode;
    items?: SettlementOrderItem[];
    partyId?: string | number;
    getPartyId?: () => string | number | Promise<string | number>;
    disabled?: boolean;
  }>(),
  {
    items: () => [],
    partyId: undefined,
    getPartyId: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:items', v: SettlementOrderItem[]): void;
  (e: 'update:summary', v: { amount: number; taxAmount: number; total: number }): void;
  (e: 'update:product-names', v: string): void;
}>();
</script>

<template>
  <SettlementOrderList
    :mode="props.mode"
    :items="props.items"
    :party-id="props.partyId"
    :get-party-id="props.getPartyId"
    :disabled="props.disabled"
    @update:items="emit('update:items', $event)"
    @update:summary="emit('update:summary', $event)"
    @update:product-names="emit('update:product-names', $event)"
  />
</template>
