<script lang="ts" setup>
import type { BilInvoiceDetailApi } from '#/api/erp/finance/bill/invoice/details';

import { computed, ref, watch } from 'vue';

import { addMoney, divMoney, moneyNumber, mulMoney, subMoney } from '#/utils/finance/decimal-money';


import { getContractOrderList } from '#/api/erp/contract/income';
import { getSaleOut } from '#/api/erp/sale/out';
import { getSaleReturn } from '#/api/erp/sale/return';

import ContractSelectDialog from '#/views/finance/bill/invoice/modules/contract-select-dialog.vue';
import SaleOutSelectDialog from '#/views/finance/bill/invoice/modules/sale-out-select-dialog.vue';
import SaleReturnSelectDialog from '#/views/finance/bill/invoice/modules/sale-return-select-dialog.vue';

import { ElButton, ElMessage, ElRadioButton, ElRadioGroup } from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'importDetails', rows: BilInvoiceDetailApi.InvoiceDetail[]): void;
  (e: 'update:contractId', v: string | undefined): void;
  (e: 'update:value', v: any): void;
}>();

const mode = ref<'contract' | 'saleOut' | 'saleReturn'>('saleReturn');

const openContractDialog = ref(false);
const openSaleOutDialog = ref(false);
const openSaleReturnDialog = ref(false);

const selectedContract = ref<any>(null);
const selectedSaleOut = ref<any>(null);
const selectedSaleReturn = ref<any>(null);

const sourceLabel = computed(() => {
  if (mode.value === 'contract') {
    const no =
      selectedContract.value?.contract_no || selectedContract.value?.contractNo;
    return no || selectedContract.value?.rowid || '-';
  }

  if (mode.value === 'saleOut') {
    const no = selectedSaleOut.value?.no;
    return no || selectedSaleOut.value?.id || '-';
  }

  const no = selectedSaleReturn.value?.no;
  return no || selectedSaleReturn.value?.id || '-';
});

watch(
  () => props.customerId,
  () => {
    selectedContract.value = null;
    selectedSaleOut.value = null;
    selectedSaleReturn.value = null;
    emit('update:contractId', undefined);
  },
);

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapToInvoiceDetail(it: any): BilInvoiceDetailApi.InvoiceDetail {
  // 合计价格
  const totalPrice = moneyNumber(mulMoney(it.product_price, it.count));
  const invoiceAmount = toNumber(
    it.invoice_amount ?? it.amount ?? totalPrice ?? it.total_price ?? 0,
    0,
  );

  // 含税价格
  const taxAmount = toNumber(
    it.tax_amount ?? it.tax_price ?? it.total_tax_price ?? 0,
    0,
  );

  let taxRate = 0;
  if (it.tax_rate !== undefined && it.tax_rate !== null && it.tax_rate !== '') {
    taxRate = toNumber(it.tax_rate, 0);
  } else if (invoiceAmount > 0) {
    taxRate = moneyNumber(mulMoney(divMoney(taxAmount, invoiceAmount, 'round', 6), 100));
  }

  // 商品总数
  let productNum = toNumber(it.product_num ?? it.count ?? it.num ?? 1, 1);

  const productInvoice = it.invoice_qty ?? 0;

  if (!props.readonly) {
    productNum = moneyNumber(subMoney(productNum, productInvoice), 'round', 3);
  }
  return {
    rowid: undefined,
    product_id: it.product_id ?? it.productId,
    product_num: productNum,
    invoice_content: it.invoice_content ?? it.product_name ?? it.productName,
    invoice_amount: invoiceAmount,
    price: toNumber(it.product_price ?? it.price ?? 0, 0), // 单价（不含税）
    tax_rate: moneyNumber(taxRate),
    tax_amount: moneyNumber(taxAmount),
    total_amount: moneyNumber(addMoney([invoiceAmount, taxAmount])),
  } as BilInvoiceDetailApi.InvoiceDetail;
}

async function handleImport() {
  if (props.readonly) return;

  if (mode.value === 'contract') {
    const cid = String(selectedContract.value?.rowid ?? '').trim();
    if (!cid) {
      ElMessage.warning('请先选择合同');
      return;
    }

    const rows = await getContractOrderList(cid);
    const details = (rows ?? []).map((r: any) => {
      const invoiceAmount = toNumber(r.amount ?? r.total_product_price ?? 0, 0);
      const taxRate = toNumber(r.tax_rate ?? 0, 0);
      const taxAmount = divMoney(mulMoney(invoiceAmount, taxRate, 'round', 6), 100);
      return {
        rowid: undefined,
        product_id: r.product_id,
        product_num: toNumber(r.num ?? r.count ?? 1, 1),
        invoice_content: r.product_name,
        invoice_amount: invoiceAmount,
        tax_rate: taxRate,

        tax_amount: moneyNumber(taxAmount),
        total_amount: moneyNumber(addMoney([invoiceAmount, taxAmount])),
      } as BilInvoiceDetailApi.InvoiceDetail;
    });

    emit('importDetails', details);
    ElMessage.success('已从合同导入明细');
    return;
  }

  if (mode.value === 'saleOut') {
    const outId = String(selectedSaleOut.value?.id ?? '').trim();
    if (!outId) {
      ElMessage.warning('请先选择出库单');
      return;
    }

    const detail: any = await getSaleOut(outId);
    const items = Array.isArray(detail?.items) ? detail.items : [];
    emit(
      'importDetails',
      items.map((it: any) => mapToInvoiceDetail(it)),
    );
    ElMessage.success('已从出库单导入明细');
    return;
  }

  const rid = String(selectedSaleReturn.value?.id ?? '').trim();
  if (!rid) {
    ElMessage.warning('请先选择退货单');
    return;
  }

  const detail: any = await getSaleReturn(rid);
  const items = Array.isArray(detail?.items) ? detail.items : [];
  emit(
    'importDetails',
    items.map((it: any) => mapToInvoiceDetail(it)),
  );
  ElMessage.success('已从退货单导入明细');
}

function handleContractConfirm(list: any[]) {
  const first = Array.isArray(list) ? list[0] : null;
  selectedContract.value = first || null;
  const cid = String(first?.rowid ?? '').trim();
  emit('update:contractId', cid || undefined);
}

async function handleSaleReturnConfirm(list: any[]) {
  const first = Array.isArray(list) ? list[0] : null;
  selectedSaleReturn.value = first || null;

  if (!first) {
    emit('update:value', undefined);
    return;
  }

  const itemId = first?.id;

  const detail = await getSaleReturn(itemId);
  // 映射主表字段
  detail.is_red_invoice = 1;
  detail.total_amount = detail.total_price;
  detail.remark = `关联退货单：${detail.order_no || detail.no || ''} ${detail.remark || ''}`;

  const items = Array.isArray(detail?.items) ? detail.items : [];
  // 映射明细
  detail.details = items
    .map((it: any) => mapToInvoiceDetail(it))
    .filter((it: any) => it.product_num > 0);

  // 获取明细，给到0的details下1来使用
  // list.map((it: any) => );
  if (mode.value !== 'saleReturn') return;

  emit('update:value', detail);

  ElMessage.success('已从退货单导入明细');
}

async function handleSaleOutConfirm(list: any[]) {
  const first = Array.isArray(list) ? list[0] : null;
  selectedSaleOut.value = first || null;

  if (!first) {
    emit('update:value', undefined);
    return;
  }

  const itemId = first?.id;

  const detail = await getSaleOut(itemId);
  // 映射主表字段
  detail.is_red_invoice = 0;
  detail.total_amount = detail.total_price;
  detail.remark = `关联出库单：${detail.order_no || detail.no || ''} ${detail.remark || ''}`;

  const items = Array.isArray(detail?.items) ? detail.items : [];
  // 映射明细
  detail.details = items
    .map((it: any) => mapToInvoiceDetail(it))
    .filter((it: any) => it.product_num > 0);

  // 获取明细，给到0的details下1来使用
  // list.map((it: any) => );
  if (mode.value !== 'saleOut') return;

  emit('update:value', detail);

  ElMessage.success('已从出库单导入明细');

  // 出库单目前没有主表字段承载（后端字段待定），这里不回填
}
</script>

<template>
  <div class="w-full">
    <div class="mb-2 flex items-center justify-between">
      <ElRadioGroup v-model="mode" :disabled="readonly">
        <ElRadioButton label="contract">合同</ElRadioButton>
        <ElRadioButton label="saleOut">出库单</ElRadioButton>
        <ElRadioButton label="saleReturn">退货单</ElRadioButton>
      </ElRadioGroup>

      <div class="flex items-center gap-2">
        <ElButton
          v-if="mode === 'contract'"
          :disabled="readonly"
          @click="openContractDialog = true"
        >
          选择合同
        </ElButton>
        <ElButton
          v-else-if="mode === 'saleOut'"
          :disabled="readonly"
          @click="openSaleOutDialog = true"
        >
          选择出库单
        </ElButton>

        <ElButton
          v-else
          :disabled="readonly"
          @click="openSaleReturnDialog = true"
        >
          选择退货单
        </ElButton>

        <ElButton type="primary" :disabled="readonly" @click="handleImport">
          导入明细
        </ElButton>
      </div>
    </div>

    <div class="text-sm text-muted-foreground">
      当前选择：<span class="text-foreground">{{ sourceLabel }}</span>
    </div>

    <ContractSelectDialog
      v-model="openContractDialog"
      :customer-id="customerId"
      :single="true"
      @confirm="handleContractConfirm"
    />

    <SaleReturnSelectDialog
      v-model="openSaleReturnDialog"
      :customer-id="customerId"
      :preset-selected-ids="
        selectedSaleReturn?.id ? [String(selectedSaleReturn.id)] : []
      "
      @confirm="handleSaleReturnConfirm"
    />

    <SaleOutSelectDialog
      v-model="openSaleOutDialog"
      :customer-id="customerId"
      :preset-selected-ids="
        selectedSaleOut?.id ? [String(selectedSaleOut.id)] : []
      "
      @confirm="handleSaleOutConfirm"
    />
  </div>
</template>
