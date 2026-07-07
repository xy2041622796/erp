<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSaleOrder, getSaleOrderPage } from '#/api/erp/sale/order';
import { formatDateOnly } from '#/utils/date';

import { ElButton, ElDialog, ElInput } from 'element-plus';

const props = defineProps({
  orderNo: { type: String, default: () => undefined },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  'update:order': [order: ErpSaleOrderApi.SaleOrder];
}>();

const sourceDoc = ref<ErpSaleOrderApi.SaleOrder>();
const dialogVisible = ref(false);
const customerList = ref<any[]>([]);

onMounted(async () => {
  const customers = await getCustomerSimpleList();
  customerList.value = Array.isArray(customers) ? customers : [];
});

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { type: 'radio', width: 50, fixed: 'left' },
      { field: 'no', title: '销售订单号', width: 180, fixed: 'left' },
      {
        field: 'customer_id',
        title: '客户',
        minWidth: 140,
        slots: { default: 'customer_id' },
      },
      {
        field: 'sale_user_id',
        title: '销售人员',
        minWidth: 140,
      },
      { field: 'order_time', title: '下单时间', width: 160, slots: { default: 'order_time' } },
      { field: 'total_count', title: '数量', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'out_count', title: '已出库', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'return_count', title: '已退货', minWidth: 120, formatter: 'formatAmount3' },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getSaleOrderPage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    radioConfig: { trigger: 'row', highlight: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpSaleOrderApi.SaleOrder>,
  gridEvents: {
    radioChange: ({ row }: { row: ErpSaleOrderApi.SaleOrder }) => {
      sourceDoc.value = row;
    },
  },
});

async function handleOk() {
  if (!sourceDoc.value?.id) return;
  const res = await getSaleOrder(sourceDoc.value.id);
  emit('update:order', res);
  dialogVisible.value = false;
}
</script>

<template>
  <div>
    <ElInput
      readonly
      :model-value="orderNo"
      :disabled="disabled"
      placeholder="请选择来源销售订单"
      @click="() => !disabled && (dialogVisible = true)"
    >
      <template #append>
        <div>
          <IconifyIcon
            class="h-full w-6 cursor-pointer"
            icon="ant-design:setting-outlined"
            :style="{ cursor: disabled ? 'not-allowed' : 'pointer' }"
            @click="() => !disabled && (dialogVisible = true)"
          />
        </div>
      </template>
    </ElInput>
    <ElDialog
      v-model="dialogVisible"
      title="选择来源销售订单"
      width="60%"
      :close-on-click-modal="false"
      :append-to-body="true"
    >
      <Grid class="max-h-[420px]" table-title="销售订单列表">
        <template #customer_id="{ row }">
          {{ customerList.find((c) => c.id === row.customer_id)?.name || row.customer_id }}
        </template>
        <template #order_time="{ row }">
          {{ formatDateOnly(row.order_time) || '-' }}
        </template>
      </Grid>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleOk">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
