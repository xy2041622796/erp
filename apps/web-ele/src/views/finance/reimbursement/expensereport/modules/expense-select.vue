<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, nextTick, ref, watch } from 'vue';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getExpenseRegistPage } from '#/api/erp/finance/expense-regist';

import { useExpenseSelectColumns, useExpenseSelectFormSchema } from '#/views/finance/reimbursement/expensereport/data';

import { ElButton, ElDialog, ElMessage } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm', rows: any[]): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

function close() {
  dialogVisible.value = false;
}

const checkedRows = ref<any[]>([]);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useExpenseSelectFormSchema(),
  },
  gridOptions: {
    columns: useExpenseSelectColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          return await getExpenseRegistPage({
            pageNo: page.currentPage,
            page: page.page,
            tab: 'pending',
            ...formValues,
          });
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions,
  gridEvents: {
    checkboxAll: ({ records }: any) => (checkedRows.value = records ?? []),
    checkboxChange: ({ records }: any) => (checkedRows.value = records ?? []),
  },
});

async function refreshGrid() {
  // dialog 打开时，Grid 组件可能还未 mount，直接 query 会触发 commitProxy 不存在
  await nextTick();
  await nextTick();
  const commitProxy = (gridApi as any)?.grid?.commitProxy;
  if (typeof commitProxy !== 'function') return;
  await (gridApi as any)?.query?.();
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      checkedRows.value = [];
      return;
    }
    checkedRows.value = [];
  },
);

function getSelectedRows(): any[] {
  return (
    (gridApi as any)?.grid?.getCheckboxRecords?.() ??
    (gridApi as any)?.getCheckboxRecords?.() ??
    checkedRows.value ??
    []
  );
}

function handleOk() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    ElMessage.warning('请选择费用');
    return;
  }
  emit('confirm', rows);
  close();
}
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    title="选择费用"
    width="70%"
    :append-to-body="true"
    @close="close"
    @opened="refreshGrid"
  >
    <Grid class="max-h-[600px]" table-title="费用列表" />

    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton type="primary" @click="handleOk">确认</ElButton>
    </template>
  </ElDialog>
</template>
