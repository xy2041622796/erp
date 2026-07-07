<script lang="ts" setup>
import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';
import { computed, nextTick, ref, watch } from 'vue';

import { erpPriceInputFormatter, generateUUID } from '@vben/utils';


import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';

import { ElButton, ElInput, ElInputNumber } from 'element-plus';

interface DetailRow {
  rowid: string;
  name?: string;
  specification?: string;
  amount?: number;
  remark?: string;
}

interface Props {
  items?: DetailRow[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:items', v: DetailRow[]): void;
}>();

const tableData = ref<DetailRow[]>([]);
const syncingFromProps = ref(false);

function normalizeRow(r: any): DetailRow {
  return {
    rowid: String(r?.rowid || '') || generateUUID(),
    name: r?.name ?? r?.detail_name ?? r?.product_name ?? '',
    specification: r?.specification ?? '',
    amount: Number(r?.amount ?? 0) || 0,
    remark: r?.remark ?? r?.description ?? '',
  };
}

const totalAmount = computed(() =>
  moneyNumber(sumByMoney(tableData.value, (r) => r.amount)),
);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: [
      { type: 'seq', title: '序号', width: 60, fixed: 'left' },
      {
        field: 'name',
        title: '明细名称',
        minWidth: 220,
        slots: { default: 'name' },
      },
      {
        field: 'specification',
        title: '规格/说明',
        minWidth: 180,
        slots: { default: 'specification' },
      },
      {
        field: 'amount',
        title: '金额',
        minWidth: 140,
        slots: { default: 'amount' },
      },
      {
        field: 'remark',
        title: '备注',
        minWidth: 200,
        slots: { default: 'remark' },
      },
      {
        field: 'actions',
        title: '操作',
        width: 90,
        fixed: 'right',
        slots: { default: 'actions' },
      },
    ],
    data: tableData.value,
    minHeight: 260,
    autoResize: true,
    border: true,
    rowConfig: { keyField: 'rowid', isHover: true },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: true },
  },
});

async function reload() {
  await nextTick();
  await gridApi.grid?.reloadData(tableData.value);
}

function handleAdd() {
  if (props.disabled) return;
  tableData.value.push({
    rowid: generateUUID(),
    name: '',
    specification: '',
    amount: 0,
    remark: '',
  });
  reload();
}

function handleDelete(row: DetailRow) {
  if (props.disabled) return;
  const idx = tableData.value.findIndex(
    (r) => String(r.rowid) === String(row.rowid),
  );
  if (idx !== -1) tableData.value.splice(idx, 1);
  reload();
}

watch(
  () => props.items,
  async (items) => {
    syncingFromProps.value = true;
    try {
      tableData.value = (items ?? []).map(normalizeRow);
      await reload();
    } finally {
      syncingFromProps.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => tableData.value,
  () => {
    if (syncingFromProps.value) return;
    emit(
      'update:items',
      tableData.value.map((r) => ({ ...r })),
    );
  },
  { deep: true },
);
</script>

<template>
  <Grid class="w-full">
    <template v-if="!disabled" #toolbar-tools>
      <div class="flex items-center justify-end gap-2">
        <ElButton type="primary" @click="handleAdd">新增明细</ElButton>
        <div class="text-sm text-gray-500">
          合计：{{ moneyText(totalAmount) }}
        </div>
      </div>
    </template>

    <template #name="{ row }">
      <ElInput v-model="row.name" :disabled="disabled" placeholder="请输入" />
    </template>

    <template #specification="{ row }">
      <ElInput
        v-model="row.specification"
        :disabled="disabled"
        placeholder="可选"
      />
    </template>

    <template #amount="{ row }">
      <ElInputNumber
        v-model="row.amount"
        :disabled="disabled"
        :precision="2"
        :formatter="erpPriceInputFormatter"
        controls-position="right"
        class="!w-full"
      />
    </template>

    <template #remark="{ row }">
      <ElInput v-model="row.remark" :disabled="disabled" placeholder="可选" />
    </template>

    <template #actions="{ row }">
      <TableAction
        :actions="[
          {
            label: '删除',
            type: 'danger',
            onClick: () => handleDelete(row),
          },
        ]"
      />
    </template>
  </Grid>
</template>
