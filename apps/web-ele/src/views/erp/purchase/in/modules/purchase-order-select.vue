<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import {
  assertPurchaseInCanGenerate,
  getPurchaseInGenerateStatus,
  getPurchaseInOrder,
  getPurchaseInOrderPage,
} from '#/api/erp/purchase/in';

import { useOrderGridColumns, useOrderGridFormSchema } from '../data';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
} from 'element-plus';

const props = defineProps<{
  orderNo?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:order': [payload: {
    order: ErpPurchaseOrderApi.PurchaseOrder;
    warehouseId: string;
    warehouseName?: string;
    items: any[];
  }];
}>();

const order = ref<ErpPurchaseOrderApi.PurchaseOrder>();
const open = ref(false);
const groupOpen = ref(false);
const supplierOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const fullOrder = ref<any>(null);
const selectedGroupWarehouseId = ref<any>('');
const warehouseGenerateStatusMap = ref<Record<string, any>>({});
const showCompleted = ref(false);

onMounted(async () => {
  const [suppliers, warehouses] = await Promise.all([
    getSupplierSimpleList(),
    getWarehouseSimpleList(),
  ]);
  supplierOptions.value = Array.isArray(suppliers) ? suppliers : [];
  warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];
});

const groupOptions = computed(() => {
  const items = Array.isArray(fullOrder.value?.items) ? fullOrder.value.items : [];
  const map = new Map<string, { warehouseId: string; warehouseName?: string; count: number; status?: any }>();
  for (const item of items) {
    const warehouseId = String(item?.warehouse_id || '');
    if (!warehouseId) continue;
    const warehouseName =
      warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name ||
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
      await getPurchaseInGenerateStatus(detail.id, warehouseId),
    ]),
  );
  warehouseGenerateStatusMap.value = Object.fromEntries(entries);
}


const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useOrderGridFormSchema() },
  gridOptions: {
    columns: [
      ...useOrderGridColumns(),
      { field: 'generate_status_text', title: '生成状态', minWidth: 120 },
      { field: 'remaining_count', title: '剩余数量', minWidth: 120, formatter: 'formatAmount3' },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getPurchaseInOrderPage({
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
  } as VxeTableGridOptions<ErpPurchaseOrderApi.PurchaseOrder>,
  gridEvents: {
    radioChange: ({ row }: { row: ErpPurchaseOrderApi.PurchaseOrder }) => {
      order.value = row;
    },
  },
});

function tryOpen() {
  open.value = true;
}

function handleShowCompletedChange() {
  order.value = undefined;
  gridApi.query();
}

async function emitSelectedGroup() {
  const warehouseId = selectedGroupWarehouseId.value;
  try {
    await assertPurchaseInCanGenerate(fullOrder.value?.id, warehouseId);
  } catch (error: any) {
    ElMessage.warning(error?.message || '该仓库不可生成采购入库单');
    if (fullOrder.value) await refreshWarehouseGenerateStatus(fullOrder.value);
    return;
  }
  const items = (fullOrder.value?.items || []).filter(
    (item: any) => String(item?.warehouse_id || '') === warehouseId,
  );
  const warehouseName =
    warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name ||
    items[0]?.warehouse_name ||
    warehouseId;
  emit('update:order', {
    order: fullOrder.value,
    warehouseId,
    warehouseName,
    items,
  });
  groupOpen.value = false;
  open.value = false;
}

async function handleOk() {
  if (!order.value) {
    ElMessage.warning('请选择一个采购订单');
    return;
  }
  if (Number((order.value as any).status) === 20) {
    ElMessage.warning('该采购订单已全部入库，不能导入生成采购入库单');
    return;
  }
  const detail = await getPurchaseInOrder((order.value as any).rowid || order.value.id!);
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const groupedWarehouseIds = [
    ...new Set(items.map((item: any) => String(item?.warehouse_id || '')).filter(Boolean)),
  ];
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('该源单明细还未分配仓库，无法生成采购入库单');
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
  groupOpen.value = true;
}
</script>

<template>
  <div>
    <ElInput
      readonly
      :model-value="props.orderNo"
      :disabled="props.disabled"
      placeholder="请选择来源采购订单"
      @click="() => !props.disabled && tryOpen()"
    >
      <template #append>
        <div>
          <IconifyIcon
            class="h-full w-6 cursor-pointer"
            icon="ant-design:setting-outlined"
            :style="{ cursor: props.disabled ? 'not-allowed' : 'pointer' }"
            @click="() => !props.disabled && tryOpen()"
          />
        </div>
      </template>
    </ElInput>
    <ElDialog
      v-model="open"
      title="选择来源采购订单"
      width="70%"
      :close-on-click-modal="false"
      :append-to-body="true"
    >
      <Grid class="max-h-[420px]" table-title="采购订单列表">
        <template #toolbar-tools>
          <div class="flex items-center gap-2 text-sm text-[var(--el-text-color-regular)]">
            <span>显示已完成订单</span>
            <ElSwitch
              v-model="showCompleted"
              @change="handleShowCompletedChange"
            />
          </div>
        </template>
        <template #supplier_id="{ row }">
          {{
            supplierOptions.find((item) => item.rowid === row.supplier_id)?.name ||
            row.supplier_id
          }}
        </template>
      </Grid>
      <template #footer>
        <ElButton @click="open = false">取消</ElButton>
        <ElButton type="primary" @click="handleOk">下一步</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="groupOpen"
      title="请选择本次执行仓库"
      width="520px"
      :close-on-click-modal="false"
      :append-to-body="true"
    >
      <div class="mb-3 text-sm text-[#666]">
        当前源单中的产品分布在多个仓库，请选择本次要执行的仓库，系统将只导入该仓库下的产品。
      </div>
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
        <ElButton @click="groupOpen = false">取消</ElButton>
        <ElButton type="primary" @click="emitSelectedGroup">确认导入该仓库产品</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
