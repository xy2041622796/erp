<script lang="ts" setup>
import type { ErpExpenseSettlementApi } from '#/api/erp/finance/payment/settlement';

import { computed, nextTick, ref, watch } from 'vue';

import { addMoney, moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';

import { generateUUID } from '@vben/utils';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useFormItemColumns } from '#/views/finance/payment/settlement/data';

interface Props {
  items?: ErpExpenseSettlementApi.ExpenseSettlementItem[];
  disabled?: boolean;
  locked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
  locked: true,
});

const emit = defineEmits<{
  (e: 'update:items', v: ErpExpenseSettlementApi.ExpenseSettlementItem[]): void;
  (e: 'update:summary', v: { amount: number; taxAmount: number; total: number }): void;
  (e: 'update:product-names', v: string): void;
}>();

const tableData = ref<ErpExpenseSettlementApi.ExpenseSettlementItem[]>([]);
const syncingFromProps = ref(false);

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatAmount(v: any) {
  return moneyText(v);
}

function formatCount(v: any) {
  return toNumber(v, 0).toFixed(3);
}

function isBlankRow(row: any) {
  return (
    !String(row?.product_id ?? '').trim() &&
    !String(row?.product_name ?? '').trim() &&
    Number(row?.amount ?? 0) === 0 &&
    !String(row?.remark ?? '').trim()
  );
}

function getEffectiveItems() {
  return tableData.value.filter((row: any) => !isBlankRow(row));
}

const summaries = computed(() => {
  const effectiveItems = getEffectiveItems();
  const amount = moneyNumber(sumByMoney(effectiveItems, (r: any) => r.amount));
  const taxAmount = moneyNumber(sumByMoney(effectiveItems, (r: any) => r.total_tax_price));
  const total = moneyNumber(
    sumByMoney(effectiveItems, (r: any) =>
      r.total_price ?? addMoney([r.amount, r.total_tax_price]),
    ),
  );
  return { amount, taxAmount, total };
});

const productNames = computed(() => {
  const names = getEffectiveItems().map((r: any) => String(r.product_name ?? '').trim()).filter(Boolean);
  return names.join('、');
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFormItemColumns(),
    data: tableData.value,
    minHeight: 250,
    autoResize: true,
    border: true,
    rowConfig: { keyField: 'rowid', isHover: true },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: false },
  },
});

watch(
  () => props.items,
  async (items) => {
    syncingFromProps.value = true;
    try {
      tableData.value = [...(items ?? [])].map((r: any) => ({
        ...r,
        rowid: r.rowid ? String(r.rowid) : generateUUID(),
      }));
      await nextTick();
      await gridApi.grid?.reloadData(tableData.value);
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
    emit('update:items', [...getEffectiveItems()]);
    emit('update:summary', { ...summaries.value });
    emit('update:product-names', productNames.value);
  },
  { deep: true },
);

function validate() {
  const rows = getEffectiveItems();
  for (let i = 0; i < rows.length; i++) {
    const r: any = rows[i];
    if (!String(r.product_name ?? '').trim()) {
      throw new Error(`第 ${i + 1} 行：产品名称不能为空`);
    }
  }
}

defineExpose({ validate, getEffectiveItems });
</script>

<template>
  <Grid class="w-full">
    <template #product_name="{ row }"><span>{{ row.product_name ?? '-' }}</span></template>
    <template #specification="{ row }"><span>{{ row.specification ?? '-' }}</span></template>
    <template #unit="{ row }"><span>{{ row.unit ?? '-' }}</span></template>
    <template #num="{ row }"><span>{{ formatCount(row.num) }}</span></template>
    <template #unit_price="{ row }"><span>{{ formatAmount(row.unit_price) }}</span></template>
    <template #amount="{ row }"><span>{{ formatAmount(row.amount) }}</span></template>
    <template #total_tax_price="{ row }"><span>{{ formatAmount(row.total_tax_price) }}</span></template>
    <template #total_price="{ row }"><span>{{ formatAmount(row.total_price) }}</span></template>
    <template #source_no="{ row }"><span>{{ (row as any).source_no ?? '-' }}</span></template>
    <template #bottom>
      <div class="mt-2 rounded border border-border bg-muted p-2">
        <div class="flex justify-between text-sm text-muted-foreground">
          <span class="font-medium text-foreground">合计：</span>
          <div class="flex space-x-4">
            <span>金额小计：{{ moneyText(summaries.amount) }}</span>
            <span>税额：{{ moneyText(summaries.taxAmount) }}</span>
            <span>金额合计：{{ moneyText(summaries.total) }}</span>
          </div>
        </div>
      </div>
    </template>
  </Grid>
</template>
