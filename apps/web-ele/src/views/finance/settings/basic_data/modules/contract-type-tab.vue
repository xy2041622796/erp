<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteContractType,
  getContractTypePage,
} from '#/api/erp/finance/settings/basic_data/contract_type';

import DictDataForm from '#/views/finance/settings/basic_data/modules/dict-data-form.vue';

import { ElMessage } from 'element-plus';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: DictDataForm,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData({ biz: 'contractType', type: 'create' }).open();
}

function handleEdit(row: any) {
  formModalApi.setData({ biz: 'contractType', type: 'edit', row }).open();
}

async function handleDelete(row: any) {
  try {
    await deleteContractType(row.id);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        fieldName: 'keyword',
        label: '关键字',
        component: 'Input',
        componentProps: {
          placeholder: '编码/名称',
          allowClear: true,
        },
      },
    ],
  },
  gridOptions: {
    height: 600,
    keepSource: true,
    scrollY: { enabled: false },
    columns: [
      { title: '#', type: 'seq', width: 60, fixed: 'left' },
      { title: '合同类别', field: 'type', minWidth: 220 },
      { title: '值', field: 'val', minWidth: 160 },
      { title: '备注', field: 'description', minWidth: 260 },
      {
        title: '操作',
        field: 'actions',
        width: 200,
        fixed: 'right',
        slots: { default: 'actions' },
      },
    ] as VxeTableGridOptions['columns'],
    pagerConfig: {
      enabled: true,
      page: 10,
      pageSizes: [10, 20, 50, 100],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          console.log('[合同类型] 查询参数:', { page, formValues });
          const result = await getContractTypePage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          console.log('[合同类型] 返回数据:', result);
          return result;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true, zoom: true },
  },
});
</script>

<template>
  <div>
    <FormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <div></div>
      <TableAction
        :actions="[
          {
            label: '新增合同类型',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: handleCreate,
          },
        ]"
      />
    </div>

    <Grid table-title="合同类型">
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '编辑',
              type: 'primary',
              icon: ACTION_ICON.EDIT,
              onClick: () => handleEdit(row),
            },
            {
              label: '删除',
              type: 'danger',
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: '确认删除？',
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </div>
</template>
