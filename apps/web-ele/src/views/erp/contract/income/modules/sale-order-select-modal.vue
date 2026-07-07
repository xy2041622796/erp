<script lang="ts" setup>
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { and, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { formatDateOnly } from '#/utils/date';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'SaleOrderSelectModal' });

withDefaults(
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

const query = ref({
  no: '',
  order_time: undefined as [string, string] | undefined,
});

const loading = ref(false);
const list = ref<ErpSaleOrderApi.SaleOrder[]>([]);
const page = ref({
  current: 1,
  page: 10,
  total: 0,
});

const selectedRow = ref<ErpSaleOrderApi.SaleOrder>();
const selectedRowId = computed(
  () => selectedRow.value?.id || selectedRow.value?.rowid,
);

// 订单选择弹窗内聚查询：直接查询 erp_sale_order（避免在 sale/order 模块里改查询规则）
const SALE_ORDER_MODEL_ID = '58AE739462369587E5B51B79D4C57A05';
const SALE_ORDER_TABLE = 'erp_sale_order';
const SALE_ORDER_DB = 'LMBill';
const SALE_ORDER_PK = 'id';

async function querySaleOrderPage(params: {
  no?: string;
  order_time?: [string, string];
  pageNo: number;
  page: number;
}) {
  const saleOrderTable = new DataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );

  const filters: any[] = [];

  if (params.no) {
    filters.push(cond('no', 'contains', params.no));
  }

  if (
    params.order_time &&
    Array.isArray(params.order_time) &&
    params.order_time.length === 2
  ) {
    filters.push(
      cond('order_time', 'greaterthanorequal', params.order_time[0]),
    );
    filters.push(cond('order_time', 'lessthanorequal', params.order_time[1]));
  }

  if (filters.length > 0) {
    saleOrderTable.Filter = and(...filters);
  }

  const queryParam: any = {
    Table: [saleOrderTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(
    saleOrderTable.queryUrl,
    queryParam,
    {
      headers: saleOrderTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  saleOrderTable.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);
  return { list: items, total } as {
    list: ErpSaleOrderApi.SaleOrder[];
    total: number;
  };
}

async function loadData(pageNo = 1, page = page.value.page) {
  loading.value = true;
  try {
    const res = await querySaleOrderPage({
      pageNo,
      page,
      ...query.value,
    });
    list.value = (res.list ?? []) as ErpSaleOrderApi.SaleOrder[];
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
}

function handleCancel() {
  emit('cancel');
  modalApi.close();
}

function handleClosed() {
  resetState();
  emit('closed');
}

function handleConfirm() {
  const id = selectedRow.value?.id || selectedRow.value?.rowid;
  if (!id) {
    ElMessage.warning('请选择一个销售订单');
    return;
  }
  emit('update:value', String(id));
  emit('confirm', selectedRow.value!);
  modalApi.close();
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

function handleRowClick(row: ErpSaleOrderApi.SaleOrder) {
  selectedRow.value = row;
}

function handleRowDblclick(row: ErpSaleOrderApi.SaleOrder) {
  selectedRow.value = row;
  handleConfirm();
}

const [Modal, modalApi] = useVbenModal({
  onCancel: handleCancel,
  onClosed: handleClosed,
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetState();
      return;
    }

    modalApi.lock();
    try {
      await loadData(1, page.value.page);
    } finally {
      modalApi.unlock();
    }
  },
  destroyOnClose: true,
});

function open() {
  modalApi.open();
}

defineExpose({ open, modalApi });
</script>

<template>
  <Modal :title="title" class="w-3/5">
    <div class="px-6">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <ElInput
          v-model="query.no"
          placeholder="销售订单号"
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
        style="width: 100%"
        highlight-current-row
        :row-key="(row) => row.id || row.rowid"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblclick"
      >
        <ElTableColumn type="index" label="序号" width="80" align="center" />
        <ElTableColumn prop="no" label="订单号" min-width="200" />
        <ElTableColumn prop="order_time" label="下单时间" width="160">
          <template #default="{ row }">
            {{ formatDateOnly(row.order_time) || '-' }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="total_count"
          label="数量"
          width="100"
          align="right"
        />
        <ElTableColumn
          prop="total_product_price"
          label="未税金额"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            {{ Number(row.total_product_price || 0).toFixed(2) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="total_tax_price"
          label="税额"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            {{ Number(row.total_tax_price || 0).toFixed(2) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="total_price"
          label="含税合计"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            {{ Number(row.total_price || 0).toFixed(2) }}
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-3 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          已选：{{ selectedRowId || '未选择' }}
        </div>
        <ElPagination
          background
          layout="total, sizes, prev, pager, next"
          :total="page.total"
          :page-size="page.page"
          :current-page="page.current"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6">
        <ElButton @click.stop="handleCancel">{{ cancelText }}</ElButton>
        <ElButton type="primary" @click.stop="handleConfirm">
          {{ confirmText }}
        </ElButton>
      </div>
    </template>
  </Modal>
</template>
