<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';

import { ElButton, ElDialog, ElMessage } from 'element-plus';

const props = defineProps<{
  contractId?: string;
  customerId?: number | string;
  modelValue: boolean;
  presetSelectedIds?: string[];
}>();

const emit = defineEmits<{
  confirm: [settlements: any[]];
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
const title = computed(() =>
  props.contractId ? '选择结算单（按合同）' : '选择结算单',
);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'settlement_no',
        label: '结算单号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入结算单号',
          allowClear: true,
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { type: 'checkbox', width: 50 },
      { type: 'seq', width: 60, title: '#' },
      { field: 'settlement_no', title: '结算单号', minWidth: 160 },
      { field: 'settlement_date', title: '日期', minWidth: 120 },
      { field: 'contract_id', title: '合同ID', minWidth: 160 },
      { field: 'project_id', title: '项目', minWidth: 120 },
      { field: 'receive_amount', title: '应收', minWidth: 100 },
      { field: 'ticket_amount', title: '已开票', minWidth: 100 },
      { field: 'receive_balance', title: '可申请', minWidth: 100 },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          if (!props.customerId) {
            return { list: [], total: 0 };
          }
          return await getIncomeSettlementPage({
            pageNo: page.currentPage,
            page: page.page,
            customer_id: props.customerId,
            contract_id: props.contractId,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    checkboxConfig: {
      trigger: 'row',
      highlight: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions,
  gridEvents: {
    checkboxAll: ({ records }: any) => {
      selectedRows.value = records;
    },
    checkboxChange: ({ records }: any) => {
      selectedRows.value = records;
    },
  },
});

watch(
  () => [open.value, props.customerId, props.contractId],
  async ([isOpen]) => {
    if (isOpen) {
      selectedRows.value = [];
      await gridApi.query();
    }
  },
);

async function handleOk() {
  if (!props.customerId) {
    ElMessage.warning('请先选择客户');
    return;
  }
  emit('confirm', selectedRows.value || []);
  open.value = false;
}
</script>

<template>
  <ElDialog v-model="open" :title="title" width="70%" :append-to-body="true">
    <Grid class="max-h-[600px]" table-title="结算单列表" />

    <template #footer>
      <ElButton @click="open = false">取消</ElButton>
      <ElButton type="primary" @click="handleOk">确定</ElButton>
    </template>
  </ElDialog>
</template>
