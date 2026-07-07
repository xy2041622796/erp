<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import {
  getPurchaseReturnOutSource,
  getPurchaseReturnOutSourcePage,
} from '#/api/erp/stock/purchase-return-out';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElRadio,
  ElRadioGroup,
} from 'element-plus';

const props = defineProps<{ returnNo?: string; disabled?: boolean }>();
const emit = defineEmits<{
  'update:return': [
    payload: {
      returnDoc: any;
      warehouseId: string;
      warehouseName?: string;
      items: any[];
    },
  ];
}>();

const returnDoc = ref<any>();
const open = ref(false);
const groupOpen = ref(false);
const supplierOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const fullReturn = ref<any>(null);
const selectedGroupWarehouseId = ref('');

onMounted(async () => {
  supplierOptions.value = await getSupplierSimpleList();
  warehouseOptions.value = await getWarehouseSimpleList();
});

const groupOptions = computed(() => {
  const items = Array.isArray(fullReturn.value?.items)
    ? fullReturn.value.items
    : [];
  const map = new Map<
    string,
    { warehouseId: string; warehouseName?: string; count: number }
  >();
  for (const item of items) {
    const wid = String(item?.warehouse_id || '');
    if (!wid) continue;
    const remain = Number(item?.count || 0) - Number(item?.out_count || 0);
    if (!(remain > 0)) continue;
    const name =
      warehouseOptions.value.find((w) => String(w.rowid) === wid)?.name ||
      item?.warehouse_name ||
      wid;
    const current = map.get(wid);
    map.set(wid, {
      warehouseId: wid,
      warehouseName: name,
      count: (current?.count || 0) + 1,
    });
  }
  return [...map.values()];
});

const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'no',
        label: '退货单号',
        component: 'Input',
        componentProps: { allowClear: true },
      },
      {
        fieldName: 'supplier_id',
        label: '供应商',
        component: 'ApiSelect',
        componentProps: {
          allowClear: true,
          showSearch: true,
          api: getSupplierSimpleList,
          labelField: 'name',
          valueField: 'rowid',
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { type: 'radio', width: 50, fixed: 'left' },
      { field: 'no', title: '退货单号', width: 180, fixed: 'left' },
      {
        field: 'supplier_id',
        title: '供应商',
        minWidth: 120,
        slots: { default: 'supplier_id' },
      },
      {
        field: 'return_time',
        title: '退货时间',
        width: 160,
        formatter: 'formatDate',
      },
      {
        field: 'total_count',
        title: '退货数量',
        minWidth: 100,
        formatter: 'formatAmount3',
      },
      {
        field: 'out_count',
        title: '累计出库',
        minWidth: 100,
        formatter: 'formatAmount3',
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getPurchaseReturnOutSourcePage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    radioConfig: { trigger: 'row', highlight: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<any>,
  gridEvents: {
    radioChange: ({ row }: { row: any }) => {
      returnDoc.value = row;
    },
  },
});

function tryOpen() {
  open.value = true;
}

function emitSelectedGroup() {
  const warehouseId = selectedGroupWarehouseId.value;
  const items = (fullReturn.value?.items || [])
    .filter((item: any) => String(item?.warehouse_id || '') === warehouseId)
    .map((item: any) => ({
      ...item,
      source_count: Number(item?.count || 0),
      count: Math.max(
        Number(item?.count || 0) - Number(item?.out_count || 0),
        0,
      ),
      return_item_id: item.id || item.rowid,
      id: undefined,
    }))
    .filter((item: any) => Number(item.count || 0) > 0);
  const warehouseName =
    warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name ||
    items[0]?.warehouse_name ||
    warehouseId;
  emit('update:return', {
    returnDoc: fullReturn.value,
    warehouseId,
    warehouseName,
    items,
  });
  groupOpen.value = false;
  open.value = false;
}

async function handleOk() {
  if (!returnDoc.value) {
    ElMessage.warning('请选择一张采购退货单');
    return;
  }
  const detail = await getPurchaseReturnOutSource(
    String(returnDoc.value.id || returnDoc.value.rowid || ''),
  );
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const groupedWarehouseIds = [
    ...new Set(
      items
        .map((item: any) => String(item?.warehouse_id || ''))
        .filter(Boolean)
        .filter((wid: string) =>
          items.some(
            (item: any) =>
              String(item?.warehouse_id || '') === wid &&
              Number(item?.count || 0) - Number(item?.out_count || 0) > 0,
          ),
        ),
    ),
  ];
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('该采购退货单没有可执行的剩余出库明细');
    return;
  }
  fullReturn.value = detail;
  if (groupedWarehouseIds.length === 1) {
    selectedGroupWarehouseId.value = groupedWarehouseIds[0];
    emitSelectedGroup();
    return;
  }
  selectedGroupWarehouseId.value = groupedWarehouseIds[0];
  groupOpen.value = true;
}
</script>

<template>
  <div>
    <ElInput
      readonly
      :model-value="props.returnNo"
      :disabled="props.disabled"
      placeholder="请选择来源采购退货单"
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
      title="选择来源采购退货单"
      width="70%"
      :close-on-click-modal="false"
      :append-to-body="true"
    >
      <div class="dialog-top-actions">
        <ElButton @click="open = false">取消</ElButton>
        <ElButton type="primary" @click="handleOk">下一步</ElButton>
      </div>
      <Grid class="max-h-[600px]" table-title="采购退货单列表">
        <template #supplier_id="{ row }">
          {{
            supplierOptions.find(
              (item) => String(item.rowid) === String(row.supplier_id || ''),
            )?.name || row.supplier_id
          }}
        </template>
      </Grid>
    </ElDialog>

    <ElDialog
      v-model="groupOpen"
      title="请选择本次执行仓库"
      width="520px"
      :close-on-click-modal="false"
      :append-to-body="true"
    >
      <div class="dialog-top-actions">
        <ElButton @click="groupOpen = false">取消</ElButton>
        <ElButton type="primary" @click="emitSelectedGroup"
          >确认导入该仓库产品</ElButton
        >
      </div>
      <div class="mb-3 text-sm text-[#666]">
        当前来源退货单中的产品分布在多个仓库，请选择本次要执行出库的仓库，系统将只导入该仓库下的产品。
      </div>
      <ElRadioGroup
        v-model="selectedGroupWarehouseId"
        class="flex w-full flex-col gap-3"
      >
        <ElRadio
          v-for="item in groupOptions"
          :key="item.warehouseId"
          :label="item.warehouseId"
        >
          {{ item.warehouseName }}（{{ item.count }} 行）
        </ElRadio>
      </ElRadioGroup>
    </ElDialog>
  </div>
</template>

<style scoped>
.dialog-top-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 0;
  background: #fff;
}
</style>
