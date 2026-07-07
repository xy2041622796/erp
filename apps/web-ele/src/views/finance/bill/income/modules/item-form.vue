<script lang="ts" setup>
import type { BilInvoiceDetailApi } from '#/api/erp/finance/invoice/details';

import { computed, nextTick, ref, watch } from 'vue';

import { addMoney, moneyNumber, sumByMoney } from '#/utils/finance/decimal-money';

import { erpPriceInputFormatter } from '@vben/utils';


import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useDetailColumns } from '#/views/finance/bill/income/data';

import { ElButton, ElInput, ElInputNumber } from 'element-plus';

interface Props {
  items?: BilInvoiceDetailApi.InvoiceDetail[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
});

const emit = defineEmits([
  'update:items',
  'update:invoice_amount',
  'update:tax_amount',
  'update:total_amount',
]);

const tableData = ref<BilInvoiceDetailApi.InvoiceDetail[]>([]);

const summaries = computed(() => {
  const invoiceAmount = moneyNumber(sumByMoney(tableData.value, (item) => item.invoice_amount));
  const taxAmount = moneyNumber(sumByMoney(tableData.value, (item) => item.tax_amount));
  const totalAmount = moneyNumber(sumByMoney(tableData.value, (item) => item.total_amount));
  return {
    invoiceAmount,
    taxAmount,
    totalAmount,
  };
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useDetailColumns(props.disabled),
    data: tableData.value,
    minHeight: 220,
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

watch(
  () => props.items,
  async (items) => {
    if (!items) return;
    tableData.value = [...items];
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
    await gridApi.grid.reloadColumn(useDetailColumns(props.disabled) || []);
  },
  { immediate: true },
);

watch(
  () => summaries.value,
  (v) => {
    emit('update:invoice_amount', v.invoiceAmount);
    emit('update:tax_amount', v.taxAmount);
    emit('update:total_amount', v.totalAmount);
  },
  { immediate: true, deep: true },
);

function handleAdd() {
  const newRow: BilInvoiceDetailApi.InvoiceDetail = {
    rowid: undefined,
    invoice_content: undefined,
    tax_rate: 0,
    invoice_amount: 0,
    tax_amount: 0,
    total_amount: 0,
  };
  tableData.value.push(newRow);
  emit('update:items', [...tableData.value]);
}

function handleDelete(row: BilInvoiceDetailApi.InvoiceDetail) {
  const index = tableData.value.indexOf(row);
  if (index !== -1) tableData.value.splice(index, 1);
  emit('update:items', [...tableData.value]);
}

function handleRowChange(row: BilInvoiceDetailApi.InvoiceDetail) {
  const invoiceAmount = moneyNumber(row.invoice_amount);
  const taxAmount = moneyNumber(row.tax_amount);
  row.total_amount = moneyNumber(addMoney([invoiceAmount, taxAmount]));

  const index = tableData.value.indexOf(row);
  if (index === -1) tableData.value.push(row);
  else tableData.value[index] = row;

  emit('update:items', [...tableData.value]);
}

function handleRowChangeProductNumber(row: BilInvoiceDetailApi.InvoiceDetail) {
  const productNum = Number(row.product_num ?? 0);
  row.product_num = productNum;

  const index = tableData.value.indexOf(row);
  if (index === -1) tableData.value.push(row);
  else tableData.value[index] = row;

  emit('update:items', [...tableData.value]);
}

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (!item) continue;
    if (!item.invoice_content) {
      throw new Error(`第 ${i + 1} 行：开票内容不能为空`);
    }
    const amount = Number(item.invoice_amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`第 ${i + 1} 行：开票金额必须大于 0`);
    }
    const taxRate = Number(item.tax_rate ?? 0);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new Error(`第 ${i + 1} 行：税率必须在 0-100 之间`);
    }

    const productNum = Number(item.product_num ?? 0);
    if (!Number.isFinite(productNum) || productNum < 0) {
      throw new Error(`第 ${i + 1} 行：产品数量必须大于等于 0`);
    }
  }
}

defineExpose({ validate });
</script>

<template>
  <div class="w-full">
    <div v-if="!disabled" class="mb-2 flex justify-end">
      <ElButton type="primary" @click="handleAdd">新增明细行</ElButton>
    </div>

    <Grid class="w-full">
      <template #invoice_content="{ row }">
        <ElInput
          v-if="!disabled"
          v-model="row.invoice_content"
          placeholder="请输入开票内容"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.invoice_content || '-' }}</span>
      </template>

      <template #product_num="{ row }">
        <ElInputNumber
          v-if="!disabled"
          v-model="row.product_num"
          :min="0"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChangeProductNumber(row)"
        />
        <span v-else>
          {{ erpPriceInputFormatter(row.product_num) || '-' }}
        </span>
      </template>

      <template #invoice_amount="{ row }">
        <ElInputNumber
          v-if="!disabled"
          v-model="row.invoice_amount"
          :min="0"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>
          {{ erpPriceInputFormatter(row.invoice_amount) || '-' }}
        </span>
      </template>

      <template #tax_rate="{ row }">
        <ElInputNumber
          v-if="!disabled"
          v-model="row.tax_rate"
          :min="0"
          :max="100"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.tax_rate ?? '-' }}</span>
      </template>

      <template #tax_amount="{ row }">
        <ElInputNumber
          v-if="!disabled"
          v-model="row.tax_amount"
          :min="0"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ erpPriceInputFormatter(row.tax_amount) || '-' }}</span>
      </template>

      <template #actions="{ row }">
        <ElButton type="danger" link @click="handleDelete(row)">删除</ElButton>
      </template>

      <template #bottom>
        <div class="mt-2 rounded border border-border bg-muted p-2">
          <div class="flex justify-between text-sm text-muted-foreground">
            <span class="font-medium text-foreground">合计：</span>
            <div class="flex space-x-4">
              <span>
                开票金额：{{ erpPriceInputFormatter(summaries.invoiceAmount) }}
              </span>
              <span>
                税额：{{ erpPriceInputFormatter(summaries.taxAmount) }}
              </span>
              <span>
                价税合计：{{ erpPriceInputFormatter(summaries.totalAmount) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </Grid>
  </div>
</template>
