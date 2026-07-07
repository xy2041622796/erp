<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { nextTick, ref, watch } from 'vue';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getContractPageByCustomer } from '#/api/erp/contract/contract';

import { ElButton, ElDialog, ElMessage } from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
  modelValue: boolean;
  selectedContractIds?: string[];
  /** 单选模式：使用 radio */
  single?: boolean;
}>();

const emit = defineEmits<{
  confirm: [contracts: any[]];
  'update:modelValue': [v: boolean];
}>();

const open = ref(false);
watch(
  () => props.modelValue,
  (v) => (open.value = v),
  { immediate: true },
);
watch(open, (v) => emit('update:modelValue', v));

const selectedRows = ref<any[]>([]);
const selectedRow = ref<any>(null);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'no',
        label: '合同编号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入合同编号',
          allowClear: true,
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      props.single
        ? { type: 'radio', width: 50 }
        : { type: 'checkbox', width: 50 },
      { type: 'seq', width: 60, title: '#' },
      {
        field: 'contract_no',
        title: '合同编号',
        minWidth: 160,
      },
      {
        field: 'contract_name',
        title: '合同名称',
        minWidth: 160,
        formatter: ({ row }: any) => row.contract_name || row.name || '--',
      },
      {
        field: 'project_name',
        title: '项目',
        minWidth: 160,
        formatter: ({ row }: any) =>
          row.project_name || row.businessName || '--',
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          if (!props.customerId) {
            return { list: [], total: 0 };
          }
          return await getContractPageByCustomer({
            pageNo: page.currentPage,
            page: page.page,
            customerId: props.customerId,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    checkboxConfig: props.single
      ? undefined
      : {
          trigger: 'row',
          highlight: true,
        },
    radioConfig: props.single
      ? {
          trigger: 'row',
          highlight: true,
        }
      : undefined,
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions,
  gridEvents: {
    checkboxAll: ({ records }: any) => {
      if (props.single) return;
      selectedRows.value = records;
    },
    checkboxChange: ({ records }: any) => {
      if (props.single) return;
      selectedRows.value = records;
    },
    radioChange: ({ row }: any) => {
      if (!props.single) return;
      selectedRow.value = row;
    },
  },
});

watch(
  () => [open.value, props.customerId],
  async ([isOpen]) => {
    if (isOpen) {
      selectedRows.value = [];
      selectedRow.value = null;

      // 等待 Grid mount，避免 commitProxy 不可用
      await nextTick();
      await nextTick();
      await gridApi.query();

      // 单选回显：取 selectedContractIds 第一个
      if (props.single) {
        const presetId = String(props.selectedContractIds?.[0] ?? '');
        if (presetId) {
          setTimeout(() => {
            const tableData = (gridApi as any)?.grid?.getTableData?.()
              ?.fullData;
            const row = (tableData || []).find(
              (item: any) => String(item.rowid ?? item.id ?? '') === presetId,
            );
            if (row) {
              (gridApi as any)?.grid?.setRadioRow?.(row);
              selectedRow.value = row;
            }
          }, 300);
        }
      }
    }
  },
);

async function handleOk() {
  if (!props.customerId) {
    ElMessage.warning('请先选择客户');
    return;
  }

  if (props.single) {
    emit('confirm', selectedRow.value ? [selectedRow.value] : []);
  } else {
    const rows = selectedRows.value || [];
    emit('confirm', rows);
  }
  open.value = false;
}
</script>

<template>
  <ElDialog
    v-model="open"
    title="选择关联合同"
    width="60%"
    :append-to-body="true"
  >
    <Grid class="max-h-[600px]" table-title="合同列表" />

    <template #footer>
      <ElButton @click="open = false">取消</ElButton>
      <ElButton type="primary" @click="handleOk">确定</ElButton>
    </template>
  </ElDialog>
</template>
