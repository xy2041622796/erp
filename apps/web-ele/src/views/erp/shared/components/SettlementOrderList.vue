<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { computed, nextTick, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { formatDate, generateUUID } from '@vben/utils';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPurchaseOrder } from '#/api/erp/purchase/order';
import { getSaleOrder } from '#/api/erp/sale/order';

import PurchaseOrderForm from '#/views/erp/purchase/order/modules/form.vue';
import SaleOrderForm from '#/views/erp/sale/order/modules/form.vue';

import ExpenseOrderSelectDialog from '#/views/finance/payment/settlement/modules/sale-order-select-dialog.vue';
import IncomeOrderSelectDialog from '#/views/finance/revenue/settlement/modules/sale-order-select-dialog.vue';

import { ElButton, ElInput, ElMessage } from 'element-plus';

type Mode = 'income' | 'expense';

type SettlementOrderItem = {
  rowid?: string;
  product_id?: string; // order_id
  product_name?: string; // order_no
  amount?: number; // settle_amount / amount total
  total_tax_price?: number; // settle_tax_amount
  remark?: string;
};

type OrderHeader = {
  order_time?: any;
  total_count?: any;
  file_url?: any;
};

defineOptions({ name: 'SettlementOrderList' });

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

const syncingFromProps = ref(false);
const tableData = ref<SettlementOrderItem[]>([]);

const headerCache = reactive(new Map<string, OrderHeader>());
const headerLoading = new Map<string, Promise<void>>();

function toKey(v: any) {
  const s = String(v ?? '').trim();
  return s || '';
}

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function setHeader(orderId: string, header: OrderHeader) {
  const key = toKey(orderId);
  if (!key) return;
  headerCache.set(key, { ...(headerCache.get(key) || {}), ...header });
}

async function fetchHeader(orderId: string) {
  const key = toKey(orderId);
  if (!key) return;
  if (headerCache.has(key)) return;
  if (headerLoading.has(key)) return headerLoading.get(key);

  const task = (async () => {
    try {
      if (props.mode === 'income') {
        const detail: any = await getSaleOrder(key);
        setHeader(key, {
          order_time: detail?.order_time,
          total_count: detail?.total_count,
          file_url: detail?.file_url,
        });
      } else {
        const detail: any = await getPurchaseOrder(key);
        setHeader(key, {
          order_time: detail?.order_time,
          total_count: detail?.total_count,
          file_url: detail?.file_url,
        });
      }
    } catch {
      // ignore
    }
  })().finally(() => {
    headerLoading.delete(key);
  });

  headerLoading.set(key, task);
  return task;
}

async function ensureHeadersLoaded(items: SettlementOrderItem[]) {
  const ids = Array.from(
    new Set((items || []).map((r) => toKey((r as any)?.product_id)).filter(Boolean)),
  );
  await Promise.all(ids.map((id) => fetchHeader(id)));
}

const summaries = computed(() => {
  const amount = tableData.value.reduce((sum, r: any) => sum + Number(r.amount ?? 0), 0);
  const taxAmount = tableData.value.reduce(
    (sum, r: any) => sum + Number(r.total_tax_price ?? 0),
    0,
  );
  const total = amount + taxAmount;
  return { amount, taxAmount, total };
});

const productNames = computed(() => {
  const names = tableData.value
    .map((r: any) => String(r.product_name ?? '').trim())
    .filter(Boolean);
  return names.join('、');
});

async function applyRows(rows: SettlementOrderItem[]) {
  tableData.value = [...rows].map((r: any) => ({
    ...r,
    rowid: r.rowid ? String(r.rowid) : generateUUID(),
  }));
  await nextTick();
  await gridApi.grid?.reloadData(tableData.value);
  await ensureHeadersLoaded(tableData.value);
}

watch(
  () => props.items,
  async (items) => {
    syncingFromProps.value = true;
    try {
      await applyRows([...(items ?? [])]);
    } finally {
      syncingFromProps.value = false;
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => tableData.value,
  () => {
    if (syncingFromProps.value) return;
    emit('update:items', [...tableData.value]);
    emit('update:summary', { ...summaries.value });
    emit('update:product-names', productNames.value);
  },
  { deep: true },
);

const columns = computed<VxeTableGridOptions['columns']>(() => {
  return [
    { type: 'seq', title: '序号', minWidth: 60, fixed: 'left' },
    { field: 'order_time', title: '下单时间', minWidth: 140, slots: { default: 'order_time' } },
    { field: 'total_count', title: '总数量', minWidth: 100, slots: { default: 'total_count' } },
    { field: 'amount', title: '金额合计', minWidth: 120, slots: { default: 'amount' } },
    { field: 'file_url', title: '附件', minWidth: 160, slots: { default: 'file_url' } },
    { field: 'remark', title: '备注', minWidth: 180, slots: { default: 'remark' } },
    { field: 'actions', title: '操作', width: 140, fixed: 'right', slots: { default: 'actions' } },
  ];
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: columns.value,
    data: tableData.value,
    minHeight: 250,
    autoResize: true,
    border: true,
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: true },
  },
});

watch(
  () => columns.value,
  async () => {
    await nextTick();
    await gridApi.grid?.reloadData(tableData.value);
  },
);

const incomeDialogRef = ref<InstanceType<typeof IncomeOrderSelectDialog>>();
const expenseDialogRef = ref<InstanceType<typeof ExpenseOrderSelectDialog>>();

async function openSelectDialog() {
  if (props.disabled) return;

  const pid =
    props.partyId ??
    (props.getPartyId ? await Promise.resolve(props.getPartyId()) : undefined);
  const partyId = toKey(pid);

  if (props.mode === 'income') {
    if (!partyId) {
      ElMessage.warning('请先选择客户');
      return;
    }
    incomeDialogRef.value?.open?.(partyId as any);
  } else {
    if (!partyId) {
      ElMessage.warning('请先选择供应商');
      return;
    }
    expenseDialogRef.value?.open?.(partyId as any);
  }
}

function upsertRow(next: SettlementOrderItem) {
  const oid = toKey((next as any).product_id);
  if (!oid) return;

  const existingIdx = tableData.value.findIndex((r: any) => toKey(r.product_id) === oid);
  if (existingIdx >= 0) {
    tableData.value.splice(existingIdx, 1, { ...tableData.value[existingIdx], ...next });
  } else {
    tableData.value.push(next);
  }
  gridApi.grid?.reloadData(tableData.value);
}

function handleIncomeConfirm(order: ErpSaleOrderApi.SaleOrder) {
  if (props.disabled) return;
  const orderId = toKey((order as any)?.id ?? (order as any)?.rowid);
  const orderNo = String((order as any)?.no ?? '').trim() || orderId;

  setHeader(orderId, {
    order_time: (order as any)?.order_time,
    total_count: (order as any)?.total_count,
    file_url: (order as any)?.file_url,
  });

  upsertRow({
    rowid: generateUUID(),
    product_id: orderId,
    product_name: orderNo,
    amount: toNumber((order as any)?.total_product_price ?? 0, 0),
    total_tax_price: toNumber((order as any)?.total_tax_price ?? 0, 0),
    remark: (order as any)?.remark,
  });
}

function handleExpenseConfirm(order: ErpPurchaseOrderApi.PurchaseOrder) {
  if (props.disabled) return;
  const orderId = toKey((order as any)?.id ?? (order as any)?.rowid);
  const orderNo = String((order as any)?.no ?? '').trim() || orderId;

  setHeader(orderId, {
    order_time: (order as any)?.order_time,
    total_count: (order as any)?.total_count,
    file_url: (order as any)?.file_url,
  });

  upsertRow({
    rowid: generateUUID(),
    product_id: orderId,
    product_name: orderNo,
    amount: toNumber((order as any)?.total_product_price ?? 0, 0),
    total_tax_price: toNumber((order as any)?.total_tax_price ?? 0, 0),
    remark: (order as any)?.remark,
  });
}

async function handleDelete(row: any) {
  const rid = toKey(row?.rowid);
  if (!rid) return;
  const next = tableData.value.filter((r: any) => toKey(r?.rowid) !== rid);
  await applyRows(next);
}

const [SaleFormModal, saleModalApi] = useVbenModal({
  connectedComponent: SaleOrderForm,
  destroyOnClose: true,
});
const [PurchaseFormModal, purchaseModalApi] = useVbenModal({
  connectedComponent: PurchaseOrderForm,
  destroyOnClose: true,
});

function handleView(row: any) {
  const id = toKey(row?.product_id);
  if (!id) return;
  if (props.mode === 'income') {
    saleModalApi.setData({ type: 'detail', id }).open();
  } else {
    purchaseModalApi.setData({ type: 'detail', id }).open();
  }
}
</script>

<template>
  <SaleFormModal />
  <PurchaseFormModal />

  <Grid class="w-full">
    <template v-if="!disabled" #toolbar-tools>
      <div class="flex items-center justify-end gap-2">
        <ElButton type="primary" @click="openSelectDialog">添加订单</ElButton>
      </div>
    </template>

    <template #order_time="{ row }">
      <span>
        {{ formatDate(headerCache.get(String(row.product_id ?? '').trim())?.order_time) || '-' }}
      </span>
    </template>

    <template #total_count="{ row }">
      <span>
        {{
          headerCache.get(String(row.product_id ?? '').trim())?.total_count ??
          '-'
        }}
      </span>
    </template>

    <template #amount="{ row }">
      <span>{{ (Number(row.amount ?? 0) + Number(row.total_tax_price ?? 0)).toFixed(2) }}</span>
    </template>

    <template #file_url="{ row }">
      <span>
        {{ headerCache.get(String(row.product_id ?? '').trim())?.file_url ?? '-' }}
      </span>
    </template>

    <template #remark="{ row }">
      <ElInput v-if="!disabled" v-model="row.remark" class="w-full" />
      <span v-else>
        {{
          row.remark ||
          (row as any).description ||
          (row as any).init_remark ||
          '-'
        }}
      </span>
    </template>

    <template #actions="{ row }">
      <TableAction
        :actions="[
          {
            label: '查看',
            type: 'primary',
            link: true,
            icon: ACTION_ICON.VIEW,
            onClick: handleView.bind(null, row),
          },
          {
            label: '删除',
            type: 'danger',
            link: true,
            icon: ACTION_ICON.DELETE,
            popConfirm: {
              title: '确认删除该行吗？',
              confirm: handleDelete.bind(null, row),
            },
          },
        ]"
      />
    </template>
  </Grid>

  <IncomeOrderSelectDialog ref="incomeDialogRef" @confirm="handleIncomeConfirm" />
  <ExpenseOrderSelectDialog ref="expenseDialogRef" @confirm="handleExpenseConfirm" />
</template>
