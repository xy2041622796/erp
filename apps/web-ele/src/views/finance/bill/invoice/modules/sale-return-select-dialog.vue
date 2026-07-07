<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, nextTick, ref, watch } from 'vue';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getSaleReturnPage } from '#/api/erp/sale/return';

import { createSaleReturnSelectDialogColumns } from '#/views/finance/bill/invoice/modules/dialogData';

import { ElButton, ElDialog, ElMessage } from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
  modelValue: boolean;
  presetSelectedIds?: string[];
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
const title = computed(() => '选择销售退货单');

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
        label: '退货单号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入退货单号',
          allowClear: true,
        },
      },
      {
        fieldName: 'order_no',
        label: '订单号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入销售订单号',
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
          return await getSaleReturnPage({
            pageNo: page.currentPage,
            page: page.page,
            customer_id: props.customerId,
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
  () => [open.value, props.customerId],
  async ([isOpen]) => {
    if (isOpen) {
      selectedRow.value = null;

      // 等待 Grid mount，避免 commitProxy 不可用
      await nextTick();
      await nextTick();
      await gridApi.query();

      // 回显已选：取 presetSelectedIds 的第一个
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
  const row =
    selectedRow.value ??
    ((gridApi as any)?.grid?.getRadioRecord?.() as any | undefined);
  if (!row) {
    ElMessage.warning('请选择一条数据');
    return;
  }
  emit('confirm', [row]);
  open.value = false;
}
</script>

<template>
  <ElDialog v-model="open" :title="title" width="70%" :append-to-body="true">
    <Grid class="max-h-[600px]" table-title="销售退货单列表" />

    <template #footer>
      <ElButton @click="open = false">取消</ElButton>
      <ElButton type="primary" @click="handleOk">确定</ElButton>
    </template>
  </ElDialog>
</template>
