<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getPurchaseInPage } from '#/api/erp/purchase/in';

import { createSaleReturnSelectDialogColumns } from '#/views/finance/bill/invoice/modules/dialogData';

import { ElButton, ElDialog } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  presetSelectedIds?: string[];
  supplierId?: number | string;
}>();

const emit = defineEmits<{
  confirm: [list: any[]];
  'update:modelValue': [v: boolean];
}>();

const open = ref(false);
watch(
  () => props.modelValue,
  (v) => (open.value = v),
  { immediate: true },
);
watch(open, (v) => emit('update:modelValue', v));

const selectedRow = ref<any>(null);
const title = computed(() => '选择采购入库单');

const accountList = ref<any[]>([]);
getAccountSimpleList().then((res) => {
  accountList.value = Array.isArray(res) ? res : [];
});

const customerList = ref<any[]>([]);
getCustomerSimpleList().then((res) => {
  customerList.value = Array.isArray(res) ? res : [];
});

function getAccountLabel(accountId: unknown) {
  const id =
    accountId === undefined || accountId === null ? '' : String(accountId);
  if (!id) return '-';
  return (
    accountList.value.find((item) => String(item.rowid) === id)?.name || ''
  );
}

function getCustomerLabel(customerId: unknown) {
  const id =
    customerId === undefined || customerId === null ? '' : String(customerId);
  if (!id) return '-';
  const item = customerList.value.find(
    (c) => String(c.rowid ?? c.id ?? '') === id,
  );
  return item?.customerName || item?.name || '';
}
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'no',
        label: '入库单号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入入库单号',
          allowClear: true,
        },
      },
      {
        fieldName: 'supplier_id',
        label: '供应商ID',
        component: 'Input',
        componentProps: {
          placeholder: '可选：输入供应商ID',
          allowClear: true,
        },
      },
    ],
  },
  gridOptions: {
    columns: createSaleReturnSelectDialogColumns({
      getAccountLabel,
      getCustomerLabel,
    }),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          return await getPurchaseInPage({
            pageNo: page.currentPage,
            page: page.page,
            supplier_id: props.supplierId,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    radioConfig: {
      trigger: 'row',
      highlight: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions,
  gridEvents: {
    radioChange: ({ row }: any) => {
      selectedRow.value = row;
    },
  },
});

watch(
  () => [open.value, props.supplierId],
  async ([isOpen]) => {
    if (isOpen) {
      selectedRow.value = null;
      await gridApi.query();

      const presetId = String(props.presetSelectedIds?.[0] ?? '');
      if (presetId) {
        setTimeout(() => {
          const tableData = (gridApi as any)?.grid?.getTableData?.()?.fullData;
          const row = (tableData || []).find(
            (item: any) => String(item.id ?? item.rowid ?? '') === presetId,
          );
          if (row) {
            (gridApi as any)?.grid?.setRadioRow?.(row);
            selectedRow.value = row;
          }
        }, 300);
      }
    }
  },
);

async function handleOk() {
  if (!selectedRow.value) {
    emit('confirm', []);
    open.value = false;
    return;
  }
  emit('confirm', [selectedRow.value]);
  open.value = false;
}
</script>

<template>
  <ElDialog v-model="open" :title="title" width="70%" :append-to-body="true">
    <Grid class="max-h-[600px]" table-title="采购入库单列表" />

    <template #footer>
      <ElButton @click="open = false">取消</ElButton>
      <ElButton type="primary" @click="handleOk">确定</ElButton>
    </template>
  </ElDialog>
</template>
