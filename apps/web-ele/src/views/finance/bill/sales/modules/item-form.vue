<script lang="ts" setup>
import type { BilInvoiceDetailApi } from '#/api/erp/finance/bill/sales/details';
import type { ErpProductApi } from '#/api/erp/product/product';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { addMoney, moneyNumber, sumByMoney } from '#/utils/finance/decimal-money';

import { erpPriceInputFormatter } from '@vben/utils';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/crm/product';

import { useDetailColumns } from '#/views/finance/bill/sales/data';

import { ElButton, ElInputNumber, ElSelect } from 'element-plus';

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

function validate() {
  // for (let i = 0; i < tableData.value.length; i++) {
  //   const item = tableData.value[i];
  //   if (!item) continue;
  //   if (!item.invoice_content) {
  //     throw new Error(`第 ${i + 1} 行：开票内容不能为空`);
  //   }
  //   const amount = Number(item.invoice_amount ?? 0);
  //   if (!Number.isFinite(amount) || amount <= 0) {
  //     throw new Error(`第 ${i + 1} 行：开票金额必须大于 0`);
  //   }
  //   const taxRate = Number(item.tax_rate ?? 0);
  //   if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
  //     throw new Error(`第 ${i + 1} 行：税率必须在 0-100 之间`);
  //   }
  // }
}

defineExpose({ validate });

const productOptions = ref<ErpProductApi.Product[]>([]);

onMounted(async () => {
  const list = await getProductSimpleList();
  productOptions.value = (Array.isArray(list) ? list : []) as any;
});
</script>

<template>
  <div class="w-full">
    <div v-if="!disabled" class="mb-2 flex justify-end">
      <ElButton type="primary" @click="handleAdd">新增明细行</ElButton>
    </div>

    <Grid class="w-full">
      <template #invoice_content="{ row }">
        <ElSelect
          v-if="!readonly"
          v-model="row.product_id"
          :options="productOptions"
          :props="{ label: 'product_name', value: 'rowid' }"
          filterable
          class="w-full"
          disabled
          placeholder="请选择商品"
        />
        <span v-else>
          {{
            productOptions.find(
              (p: any) => String(p.rowid) === String(row.product_id),
            )?.product_name ||
            row.product_id ||
            '-'
          }}
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
