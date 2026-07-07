<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';

import { computed, ref } from 'vue';


import { and, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'SettlementSaleOrderSelectDialog' });

withDefaults(
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

const visible = ref(false);

const query = ref({
  no: '',
  order_time: undefined as undefined | [string, string],
});

const loading = ref(false);
const list = ref<ErpPurchaseOrderApi.PurchaseOrder[]>([]);
const page = ref({
  current: 1,
  page: 10,
  total: 0,
});

const selectedRow = ref<ErpPurchaseOrderApi.PurchaseOrder>();
const selectedRowId = computed(() => selectedRow.value?.id || (selectedRow.value as any)?.rowid);

const PURCHASE_ORDER_MODEL_ID = '9C137C5AC260381DF57C6D1B40C8ABF5';
const PURCHASE_ORDER_TABLE = 'erp_purchase_order';
const PURCHASE_ORDER_DB = 'LMBill';
const PURCHASE_ORDER_PK = 'id';

async function queryPurchaseOrderPage(params: {
  pageNo: number;
  page: number;
  no?: string;
  order_time?: [string, string];
  supplierId?: string | number;
}) {
  const table = new DataTable(
    PURCHASE_ORDER_MODEL_ID,
    PURCHASE_ORDER_TABLE,
    PURCHASE_ORDER_DB,
    PURCHASE_ORDER_PK,
  );

  const filters: any[] = [];

  if (params.supplierId) {
    filters.push(cond('supplier_id', 'equal', params.supplierId));
  }

  if (params.no) {
    filters.push(cond('no', 'contains', params.no));
  }

  if (params.order_time && Array.isArray(params.order_time) && params.order_time.length === 2) {
    filters.push(cond('order_time', 'greaterthanorequal', params.order_time[0]));
    filters.push(cond('order_time', 'lessthanorequal', params.order_time[1]));
  }

  if (filters.length > 0) {
    table.Filter = and(...filters);
  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);
  return { list: items, total } as { list: ErpPurchaseOrderApi.PurchaseOrder[]; total: number };
}

async function loadData(pageNo = 1, page = page.value.page) {
  loading.value = true;
  try {
    const res = await queryPurchaseOrderPage({
      pageNo,
      page,
      ...query.value,
      supplierId: supplierIdRef.value,
    });
    list.value = (res.list ?? []) as ErpPurchaseOrderApi.PurchaseOrder[];
    page.value.current = pageNo;
    page.value.page = page;
    page.value.total = Number((res as any).total ?? 0);
  } finally {
    loading.value = false;
  }
}

function resetState() {
  query.value = { no: '', order_time: undefined };
  list.value = [];
  page.value = { current: 1, page: 10, total: 0 };
  selectedRow.value = undefined;
  visible.value = false;
}

const supplierIdRef = ref<string | number | undefined>();

async function open(supplierId?: string | number) {
  supplierIdRef.value = supplierId;
  visible.value = true;
  await loadData(1, page.value.page);
}

function close() {
  visible.value = false;
}

function handleCancel() {
  emit('cancel');
  visible.value = false;
}

function handleClosed() {
  resetState();
  emit('closed');
}

function handleConfirm() {
  const id = (selectedRow.value as any)?.id || (selectedRow.value as any)?.rowid;
  if (!id) {
    ElMessage.warning('请选择一个采购订单');
    return;
  }
  emit('update:value', String(id));
  emit('confirm', selectedRow.value!);
  visible.value = false;
}

async function handleSearch() {
  await loadData(1, page.value.page);
}

async function handlePageChange(currentPage: number) {
  await loadData(currentPage, page.value.page);
}

async function handlePageSizeChange(page: number) {
  await loadData(1, page);
}

function handleRowClick(row: ErpPurchaseOrderApi.PurchaseOrder) {
  selectedRow.value = row;
}

function handleRowDblclick(row: ErpPurchaseOrderApi.PurchaseOrder) {
  selectedRow.value = row;
  handleConfirm();
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="title"
    width="60%"
    align-center
    :append-to-body="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <div class="px-6">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="query.no"
          placeholder="采购订单号"
          clearable
          class="!w-60"
          @keyup.enter="handleSearch"
        />
        <ElDatePicker
          v-model="query.order_time"
          type="daterange"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-72"
          @change="handleSearch"
        />
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        border
        max-height="420"
        style="width: 100%"
        highlight-current-row
        :row-key="(row) => (row as any).id || (row as any).rowid"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblclick"
      >
        <ElTableColumn type="index" label="序号" width="80" align="center" />
        <ElTableColumn prop="no" label="订单号" min-width="200" />
        <ElTableColumn prop="order_time" label="下单时间" width="160" />
        <ElTableColumn prop="total_count" label="数量" width="100" align="right" />
        <ElTableColumn prop="total_product_price" label="未税金额" width="130" align="right">
          <template #default="{ row }">{{ moneyText((row as any).total_product_price) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="total_tax_price" label="税额" width="120" align="right">
          <template #default="{ row }">{{ moneyText((row as any).total_tax_price) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="total_price" label="含税合计" width="130" align="right">
          <template #default="{ row }">{{ moneyText((row as any).total_price) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="deposit_price" label="定金" width="110" align="right">
          <template #default="{ row }">{{ moneyText((row as any).deposit_price) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="remark" label="备注" min-width="160" />
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="page.current"
          v-model:page-size="page.page"
          :total="page.total"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <ElButton @click="handleCancel">{{ cancelText }}</ElButton>
        <ElButton type="primary" :disabled="!selectedRowId" @click="handleConfirm">
          {{ confirmText }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>
