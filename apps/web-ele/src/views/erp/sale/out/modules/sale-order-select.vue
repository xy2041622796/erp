<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSaleOrder } from '#/api/erp/sale/order';
import {
  assertSaleOutCanGenerate,
  getSaleOutGenerateStatus,
  getSaleOutOrderPage,
} from '#/api/erp/sale/out';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';

import { getSaleOrderStatusMeta, useGridFormSchema } from '../../order/data';
import SaleOrderDetail from '../../order/modules/detail.vue';
import { formatDateOnly } from '#/utils/date';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  orderNo?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:order': [payload: {
    order: ErpSaleOrderApi.SaleOrder;
    warehouseId: string;
    warehouseName?: string;
    items: any[];
  }];
}>();

const order = ref<ErpSaleOrderApi.SaleOrder>();
const dialogVisible = ref(false);
const groupDialogVisible = ref(false);
const selectedGroupWarehouseId = ref('');
const fullOrder = ref<any>(null);
const userList = ref<any[]>([]);
const customerList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const warehouseGenerateStatusMap = ref<Record<string, any>>({});
const showCompleted = ref(false);

const [DetailModal, detailModalApi] = useVbenModal({
  connectedComponent: SaleOrderDetail,
});

const groupOptions = computed(() => {
  const items = Array.isArray(fullOrder.value?.items) ? fullOrder.value.items : [];
  const map = new Map<string, { warehouseId: string; warehouseName?: string; count: number; status?: any }>();
  for (const item of items) {
    const warehouseId = String(item?.warehouse_id || '');
    if (!warehouseId) continue;
    const warehouseName =
      warehouseList.value.find((w) => String(w.rowid) === warehouseId)?.name ||
      item?.warehouse_name ||
      warehouseId;
    const current = map.get(warehouseId);
    map.set(warehouseId, {
      warehouseId,
      warehouseName,
      count: (current?.count || 0) + 1,
    });
  }
  return [...map.values()].map((item) => ({
    ...item,
    status: warehouseGenerateStatusMap.value[item.warehouseId],
  }));
});

function getGenerateStatusText(status?: any) {
  if (!status) return '状态加载中';
  if (status.canGenerate) return `可生成，剩余 ${status.remainingCount ?? 0}`;
  return status.reason || '不可生成';
}

async function refreshWarehouseGenerateStatus(detail: any) {
  const ids = [
    ...new Set((detail?.items || []).map((item: any) => String(item?.warehouse_id || '')).filter(Boolean)),
  ];
  const entries = await Promise.all(
    ids.map(async (warehouseId) => [
      warehouseId,
      await getSaleOutGenerateStatus(detail.id, warehouseId),
    ]),
  );
  warehouseGenerateStatusMap.value = Object.fromEntries(entries);
}


onMounted(async () => {
  const [users, customers, warehouses] = await Promise.all([
    getSimpleUserList(),
    getCustomerSimpleList(),
    getWarehouseSimpleList(),
  ]);
  userList.value = users;
  customerList.value = Array.isArray(customers) ? customers : [];
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: [
      { type: 'radio', width: 50, fixed: 'left' },
      { field: 'no', title: '订单号', width: 180, fixed: 'left' },
      { field: 'status', title: '出库状态', minWidth: 120, slots: { default: 'status' } },
      { field: 'customer_id', title: '客户', minWidth: 140, slots: { default: 'customer_id' } },
      { field: 'sale_user_id', title: '销售人员', minWidth: 120, slots: { default: 'sale_user_id' } },
      { field: 'order_time', title: '下单时间', width: 160, slots: { default: 'order_time' } },
      { field: 'total_count', title: '计划数量', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'out_count', title: '历史累计出库', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'return_count', title: '历史累计退货', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'generate_status_text', title: '生成状态', minWidth: 120 },
      { field: 'remaining_count', title: '剩余数量', minWidth: 120, formatter: 'formatAmount3' },
      { field: 'action', title: '操作', slots: { default: 'action' }, fixed: 'right', width: 80 },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getSaleOutOrderPage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
            showCompleted: showCompleted.value,
          }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    radioConfig: { trigger: 'row', highlight: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpSaleOrderApi.SaleOrder>,
  gridEvents: {
    radioChange: ({ row }: { row: ErpSaleOrderApi.SaleOrder }) => {
      order.value = row;
    },
  },
});

function handleView(row: ErpSaleOrderApi.SaleOrder) {
  detailModalApi.setData({ id: row.id }).open();
}

function tryOpen() {
  dialogVisible.value = true;
}

function handleShowCompletedChange() {
  order.value = undefined;
  gridApi.query();
}

async function emitSelectedGroup() {
  const warehouseId = selectedGroupWarehouseId.value;
  try {
    await assertSaleOutCanGenerate(fullOrder.value?.id, warehouseId);
  } catch (error: any) {
    ElMessage.warning(error?.message || '该仓库不可生成销售出库单');
    if (fullOrder.value) await refreshWarehouseGenerateStatus(fullOrder.value);
    return;
  }
  const items = (fullOrder.value?.items || []).filter(
    (item: any) => String(item?.warehouse_id || '') === warehouseId,
  );
  const warehouseName =
    warehouseList.value.find((w) => String(w.rowid) === warehouseId)?.name ||
    items[0]?.warehouse_name ||
    warehouseId;
  emit('update:order', {
    order: fullOrder.value,
    warehouseId,
    warehouseName,
    items,
  });
  groupDialogVisible.value = false;
  dialogVisible.value = false;
}

async function handleOk() {
  if (!order.value) {
    ElMessage.warning('请选择一个销售订单');
    return;
  }
  if (Number((order.value as any).status) === 20) {
    ElMessage.warning('该销售订单已全部出库，不能导入生成销售出库单');
    return;
  }
  const detail = await getSaleOrder((order.value as any).rowid || order.value.id!);
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const groupedWarehouseIds = [...new Set(items.map((item: any) => String(item?.warehouse_id || '')).filter(Boolean))];
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('该源单明细还未分配仓库，无法生成销售出库单');
    return;
  }
  fullOrder.value = detail;
  await refreshWarehouseGenerateStatus(detail);
  if (groupedWarehouseIds.length === 1) {
    selectedGroupWarehouseId.value = groupedWarehouseIds[0];
    await emitSelectedGroup();
    return;
  }
  selectedGroupWarehouseId.value = groupedWarehouseIds.find((id) => warehouseGenerateStatusMap.value[id]?.canGenerate) || groupedWarehouseIds[0];
  groupDialogVisible.value = true;
}
</script>

<template>
  <div>
    <ElInput readonly :model-value="props.orderNo" :disabled="props.disabled" placeholder="请选择来源销售订单" @click="() => !props.disabled && tryOpen()">
      <template #append>
        <div>
          <IconifyIcon class="h-full w-6 cursor-pointer" icon="ant-design:setting-outlined" :style="{ cursor: props.disabled ? 'not-allowed' : 'pointer' }" @click="() => !props.disabled && tryOpen()" />
        </div>
      </template>
    </ElInput>
    <ElDialog v-model="dialogVisible" title="选择来源销售订单" width="70%" :close-on-click-modal="false" :append-to-body="true">
      <Grid class="max-h-[420px]" table-title="销售订单列表">
        <template #toolbar-tools>
          <div class="flex items-center gap-2 text-sm text-[var(--el-text-color-regular)]">
            <span>显示已完成订单</span>
            <ElSwitch
              v-model="showCompleted"
              @change="handleShowCompletedChange"
            />
          </div>
        </template>
        <template #status="{ row }">
          <ElTag v-if="getSaleOrderStatusMeta(row.status)" :type="getSaleOrderStatusMeta(row.status)?.tagType">
            {{ getSaleOrderStatusMeta(row.status)?.label }}
          </ElTag>
          <span v-else>{{ row.status }}</span>
        </template>
        <template #customer_id="{ row }">
          {{ customerList.find((c) => c.id === row.customer_id)?.name || row.customer_id }}
        </template>
        <template #sale_user_id="{ row }">
          {{ userList.find((item) => item.ROWID === row.sale_user_id)?.UserName || row.sale_user_id }}
        </template>
        <template #order_time="{ row }">
          {{ formatDateOnly(row.order_time) || '-' }}
        </template>
        <template #action="{ row }">
          <TableAction :actions="[{ label: '详情', onClick: () => handleView(row) }]" />
        </template>
      </Grid>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleOk">下一步</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="groupDialogVisible" title="请选择本次执行仓库" width="520px" :close-on-click-modal="false" :append-to-body="true">
      <div class="mb-3 text-sm text-[#666]">当前源单中的产品分布在多个仓库，请选择本次要执行的仓库，系统将只导入该仓库下的产品。</div>
      <ElRadioGroup v-model="selectedGroupWarehouseId" class="flex w-full flex-col gap-3">
        <ElRadio
          v-for="item in groupOptions"
          :key="item.warehouseId"
          :label="item.warehouseId"
          :disabled="item.status && !item.status.canGenerate"
        >
          {{ item.warehouseName }}（{{ item.count }} 行）
          <span class="ml-2 text-xs" :class="item.status?.canGenerate ? 'text-green-600' : 'text-red-500'">
            {{ getGenerateStatusText(item.status) }}
          </span>
        </ElRadio>
      </ElRadioGroup>
      <template #footer>
        <ElButton @click="groupDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="emitSelectedGroup">确认导入该仓库产品</ElButton>
      </template>
    </ElDialog>
    <DetailModal />
  </div>
</template>
