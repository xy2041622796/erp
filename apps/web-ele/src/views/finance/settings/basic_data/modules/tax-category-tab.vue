<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteTaxCategory,
  getTaxCategoryPage,
  updateTaxCategory,
} from '#/api/erp/finance/settings/basic_data/tax_category';

import TaxCategoryForm from '#/views/finance/settings/basic_data/modules/tax-category-form.vue';

import { ElInputNumber, ElMessage, ElSwitch } from 'element-plus';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: TaxCategoryForm,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: any) {
  formModalApi.setData({ type: 'edit', row }).open();
}

async function handleDelete(row: any) {
  try {
    await deleteTaxCategory(row.id);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

async function handleToggle(row: any, value: any) {
  try {
    await updateTaxCategory({
      id: row.id,
      name: row.name,
      rate: row.rate,
      description: row.description,
      enabled: value,
    });
    ElMessage.success('已更新');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '更新失败');
    handleRefresh();
  }
}

async function handleRateChange(row: any, value: any) {
  const rate =
    value === null || value === undefined ? undefined : Number(value);
  try {
    await updateTaxCategory({
      id: row.id,
      name: row.name,
      rate,
      description: row.description,
      enabled: row.enabled,
    });
    ElMessage.success('已更新');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '更新失败');
    handleRefresh();
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
          placeholder: '名称/税率',
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
      { title: '名称', field: 'name', minWidth: 240 },
      {
        title: '税率/费率',
        field: 'rate',
        minWidth: 220,
        slots: { default: 'rate' },
      },
      { title: '说明', field: 'description', minWidth: 320 },
      {
        title: '启用',
        field: 'enabled',
        width: 120,
        slots: { default: 'enabled' },
      },
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
          return getTaxCategoryPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
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
            label: '新增',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: handleCreate,
          },
        ]"
      />
    </div>

    <Grid table-title="税费类别">
      <template #rate="{ row }">
        <div class="flex items-center gap-2">
          <ElInputNumber
            :model-value="row.rate"
            :min="0"
            :max="100"
            controls-position="right"
            class="!w-[120px]"
            @change="(v: any) => handleRateChange(row, v)"
          />
          <span>%</span>
        </div>
      </template>

      <template #enabled="{ row }">
        <ElSwitch
          :model-value="row.enabled"
          :active-value="1"
          :inactive-value="0"
          @change="(v: any) => handleToggle(row, v)"
        />
      </template>

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
