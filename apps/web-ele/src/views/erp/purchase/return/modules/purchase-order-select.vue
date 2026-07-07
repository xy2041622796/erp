<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';

import { onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getPurchaseOrder, getPurchaseOrderPage } from '#/api/erp/purchase/order';

import { ElButton, ElDialog, ElInput } from 'element-plus';

const props = defineProps({
  orderNo: { type: String, default: () => undefined },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  'update:order': [order: ErpPurchaseOrderApi.PurchaseOrder];
}>();

const sourceDoc = ref<ErpPurchaseOrderApi.PurchaseOrder>();
const open = ref(false);
const supplierOptions = ref<any[]>([]);

onMounted(async () => {
  const suppliers = await getSupplierSimpleList();
  supplierOptions.value = Array.isArray(suppliers) ? suppliers : [];
});

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { type: 'radio', width: 50, fixed: 'left' },
      { field: 'no', title: '采购订单号', width: 180, fixed: 'left' },
      {
        field: 'supplier_id',
        title: '供应商',
        minWidth: 140,
        slots: { default: 'supplier_id' },
      },
      { field: 'order_time', title: '订单时间', width: 160, formatter: 'formatDate' },
      { field: 'total_count', title: '数量', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'in_count', title: '已入库', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'return_count', title: '已退货', minWidth: 120, formatter: 'formatAmount3' },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getPurchaseOrderPage({ index: page.currentPage, size: page.page, ...formValues }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    radioConfig: { trigger: 'row', highlight: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpPurchaseOrderApi.PurchaseOrder>,
  gridEvents: {
    radioChange: ({ row }: { row: ErpPurchaseOrderApi.PurchaseOrder }) => {
      sourceDoc.value = row;
    },
  },
});

async function handleOk() {
  if (!sourceDoc.value?.id) return;
  const res = await getPurchaseOrder(String(sourceDoc.value.id));
  emit('update:order', res);
  open.value = false;
}
</script>

<template>
  <div>
    <ElInput
      readonly
      :model-value="orderNo"
      :disabled="disabled"
      placeholder="请选择来源采购订单"
      @click="() => !disabled && (open = true)"
    >
      <template #append>
        <div>
          <IconifyIcon
            class="h-full w-6 cursor-pointer"
            icon="ant-design:setting-outlined"
            :style="{ cursor: disabled ? 'not-allowed' : 'pointer' }"
            @click="() => !disabled && (open = true)"
          />
        </div>
      </template>
    </ElInput>
    <ElDialog
      v-model="open"
      title="选择来源采购订单"
      width="60%"
      :close-on-click-modal="false"
      :append-to-body="true"
    >
      <Grid class="max-h-[420px]" table-title="采购订单列表">
        <template #supplier_id="{ row }">
          {{ supplierOptions.find((item) => item.rowid === row.supplier_id)?.name || row.supplier_id }}
        </template>
      </Grid>
      <template #footer>
        <ElButton @click="open = false">取消</ElButton>
        <ElButton type="primary" @click="handleOk">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
