<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { formatDate, isEmpty } from '@vben/utils';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';
import { getSimpleUserList } from '#/api/system/user';

import { useSettlementSelectColumns, useSettlementSelectFormSchema } from '#/views/finance/revenue/submit/data';

import { ElButton, ElDialog, ElMessage, ElTag } from 'element-plus';

type Mode = 'create' | 'edit' | 'detail';

const props = withDefaults(
  defineProps<{ modelValue: boolean; disabled?: boolean; mode?: Mode }>(),
  { disabled: false, mode: 'create' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm', v: any[]): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const userOptions = ref<any[]>([]);
(async () => {
  userOptions.value = await getSimpleUserList();
})();

const checkedRows = ref<any[]>([]);
function handleCheckboxChange({ records }: { records: any[] }) {
  checkedRows.value = records;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useSettlementSelectFormSchema(),
  },
  gridOptions: {
    columns: useSettlementSelectColumns(),
    height: 520,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getIncomeSettlementPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
            settlement_type: 0,
            status: [20, 25],
          });
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions,
  gridEvents: {
    checkboxAll: handleCheckboxChange,
    checkboxChange: handleCheckboxChange,
  },
});

function getUserName(id: any) {
  return userOptions.value.find((u) => u.ROWID === id)?.UserName || '';
}

function handleCancel() {
  visible.value = false;
}

function handleConfirm() {
  if (isEmpty(checkedRows.value)) {
    ElMessage.warning('请先勾选单据');
    return;
  }
  emit('confirm', checkedRows.value);
  visible.value = false;
}

watch(
  () => visible.value,
  (open) => {
    if (!open) return;
    checkedRows.value = [];
    gridApi.query();
  },
);
</script>

<template>
  <ElDialog
    v-model="visible"
    title="选择单据"
    width="90vw"
    :append-to-body="true"
    :z-index="3000"
  >
    <Grid>
      <template #date_no="{ row }">
        <div>
          <div>{{ formatDate(row.settlement_date) || '--' }}</div>
          <div class="text-primary">{{ row.settlement_no || '--' }}</div>
        </div>
      </template>

      <template #bill_type="{ row }">
        <ElTag :type="row.settlement_type === 2 ? 'warning' : 'success'">
          {{ row.settlement_type === 2 ? '其他收入' : '收入结算' }}
        </ElTag>
      </template>

      <template #sales_dept="{ row }">
        <div>
          <div>{{ getUserName(row.salesman_id) }}</div>
          <div>{{ row.depart_id || '--' }}</div>
        </div>
      </template>
    </Grid>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确认</el-button>
      </div>
    </template>
  </ElDialog>
</template>
