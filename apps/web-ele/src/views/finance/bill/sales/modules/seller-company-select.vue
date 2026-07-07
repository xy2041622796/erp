<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilSalesCompanyApi } from '#/api/erp/finance/bill/Information';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSalesCompanyPage } from '#/api/erp/finance/bill/Information';

import { ElButton, ElDialog, ElInput, ElMessage } from 'element-plus';

defineOptions({ name: 'SellerCompanySelect' });

withDefaults(
  defineProps<{
    disabled?: boolean;
    value?: string;
  }>(),
  {
    disabled: false,
    value: undefined,
  },
);

const emit = defineEmits<{
  select: [row: BilSalesCompanyApi.SalesCompany];
  'update:value': [value: string | undefined];
}>();

const open = ref(false);
const selectedRow = ref<BilSalesCompanyApi.SalesCompany>();

/** 表格配置 */
const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'company_name',
        label: '公司名称',
        component: 'Input',
        componentProps: {
          placeholder: '请输入公司名称',
          allowClear: true,
        },
      },
      {
        fieldName: 'taxID',
        label: '税号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入税号',
          allowClear: true,
        },
      },
      {
        fieldName: 'phone',
        label: '电话',
        component: 'Input',
        componentProps: {
          placeholder: '请输入电话',
          allowClear: true,
        },
      },
      {
        fieldName: 'keyword',
        label: '关键字',
        component: 'Input',
        componentProps: {
          placeholder: '公司/税号/开户行/账号/电话/地址',
          allowClear: true,
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      {
        type: 'radio',
        width: 50,
        fixed: 'left',
      },
      { field: 'company_name', title: '公司名称', minWidth: 160 },
      { field: 'taxID', title: '税号', minWidth: 160 },
      { field: 'phone', title: '电话', width: 140 },
      { field: 'bank_name', title: '开户行', minWidth: 140 },
      { field: 'bank_account', title: '银行账号', minWidth: 160 },
      { field: 'address', title: '地址', minWidth: 180, showOverflow: true },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getSalesCompanyPage({
            pageNo: page.currentPage,
            page: page.page,
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
  } as VxeTableGridOptions<BilSalesCompanyApi.SalesCompany>,
  gridEvents: {
    radioChange: ({ row }: { row: BilSalesCompanyApi.SalesCompany }) => {
      selectedRow.value = row;
    },
  },
});

function handleOpen() {
  if (open.value) return;
  selectedRow.value = undefined;
  open.value = true;
}

function handleClear() {
  emit('update:value', undefined);
}

function handleOk() {
  if (!selectedRow.value?.id) {
    ElMessage.warning('请选择一个销方公司');
    return;
  }

  emit('update:value', selectedRow.value.id);
  emit('select', selectedRow.value);
  open.value = false;
}
</script>

<template>
  <div>
    <ElInput
      readonly
      :model-value="value"
      :disabled="disabled"
      placeholder="请选择销方公司"
      @click="() => !disabled && handleOpen()"
    >
      <template #append>
        <div class="flex items-center gap-2">
          <IconifyIcon
            class="h-full w-6"
            icon="ant-design:setting-outlined"
            :style="{ cursor: disabled ? 'not-allowed' : 'pointer' }"
            @click="() => !disabled && handleOpen()"
          />
          <IconifyIcon
            class="h-full w-6"
            icon="ant-design:close-circle-outlined"
            :style="{ cursor: disabled ? 'not-allowed' : 'pointer' }"
            @click="() => !disabled && handleClear()"
          />
        </div>
      </template>
    </ElInput>

    <ElDialog
      v-model="open"
      title="选择销方公司"
      width="60%"
      :append-to-body="true"
      @close="open = false"
    >
      <Grid class="max-h-[600px]" table-title="销方公司" />

      <template #footer>
        <ElButton @click="open = false">取消</ElButton>
        <ElButton type="primary" @click="handleOk">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
