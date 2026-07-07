<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProductCategoryApi } from '#/api/erp/product/category';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ElLoading, ElMessage } from 'element-plus';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteProductCategory,
  exportProductCategory,
  getProductCategoryList,
} from '#/api/erp/product/category';
import { $t } from '#/locales';

import { useGridColumns, useQueryFormSchema } from './data';
import Form from './modules/form.vue';

const [FormModal, formModalApi] = useVbenModal({
  class: 'w-1/2',
  closeOnClickModal: false,
  connectedComponent: Form,
  contentClass: 'pt-0',
  destroyOnClose: true,
  footer: false,
  showCancelButton: false,
  showConfirmButton: false,
});

const isExpanded = ref(true);

function normalizeParentId(value: any) {
  const parentId = String(value ?? '').trim();
  return parentId && parentId !== '0' ? parentId : '000000';
}

function cloneFlatRows(rows: any[]) {
  const result: ErpProductCategoryApi.ProductCategory[] = [];
  const walk = (items: any[]) => {
    for (const item of items || []) {
      const { children, ...row } = item || {};
      result.push({
        ...row,
        parent_id: normalizeParentId(row.parent_id ?? row.parentId),
        parentId: normalizeParentId(row.parent_id ?? row.parentId),
      });
      if (Array.isArray(children) && children.length > 0) {
        walk(children);
      }
    }
  };
  walk(rows);
  return result;
}

function normalizeSavedItem(item: any) {
  if (!item) {
    return null;
  }
  const parentId = normalizeParentId(item.parent_id ?? item.parentId);
  return {
    ...item,
    parent_id: parentId,
    parentId,
    status:
      item.status === undefined || item.status === null || item.status === ''
        ? 0
        : Number(item.status),
    sort:
      item.sort === undefined || item.sort === null || item.sort === ''
        ? 0
        : Number(item.sort),
  } as ErpProductCategoryApi.ProductCategory;
}

function matchesCurrentQuery(
  row: ErpProductCategoryApi.ProductCategory,
  formValues: Record<string, any>,
) {
  const name = String(formValues?.name ?? '').trim();
  if (name && !String(row.name ?? '').includes(name)) {
    return false;
  }

  if (
    formValues?.status !== undefined &&
    formValues?.status !== null &&
    formValues?.status !== '' &&
    Number(row.status) !== Number(formValues.status)
  ) {
    return false;
  }

  return true;
}

function handleExpand() {
  isExpanded.value = !isExpanded.value;
  gridApi.grid.setAllTreeExpand(isExpanded.value);
}

async function handleRefresh() {
  await gridApi.query();
}

async function handleSuccess(
  savedItem?: ErpProductCategoryApi.ProductCategory,
) {
  const nextItem = normalizeSavedItem(savedItem);
  if (!nextItem?.id) {
    await handleRefresh();
    return;
  }

  const formValues = await gridApi.formApi.getValues();
  const shouldShow = matchesCurrentQuery(nextItem, formValues);
  const fullData = cloneFlatRows(gridApi.grid.getTableData().fullData);
  const index = fullData.findIndex((item: any) => item.id === nextItem.id);

  if (index !== -1) {
    if (shouldShow) {
      fullData[index] = {
        ...fullData[index],
        ...nextItem,
        children: undefined,
      };
    } else {
      fullData.splice(index, 1);
    }
  } else if (shouldShow) {
    fullData.push({ ...nextItem, children: undefined });
  }

  await gridApi.grid.loadData(fullData);
  gridApi.grid.setAllTreeExpand(isExpanded.value);
}

async function handleExport() {
  const data = await exportProductCategory(await gridApi.formApi.getValues());
  downloadFileFromBlobPart({ fileName: '产品分类.xls', source: data });
}

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleAppend(row: ErpProductCategoryApi.ProductCategory) {
  formModalApi.setData({ parent_id: row.id }).open();
}

function handleEdit(row: ErpProductCategoryApi.ProductCategory) {
  formModalApi.setData(row).open();
}

async function handleDelete(row: ErpProductCategoryApi.ProductCategory) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.name]),
  });
  try {
    if (row.id) {
      const list = await getProductCategoryList();
      const hasChildren = list.some(
        (item: any) =>
          normalizeParentId(item.parent_id ?? item.parentId) === String(row.id),
      );
      if (hasChildren) {
        ElMessage.warning('存在下级分类，请先删除或迁移下级分类');
        return;
      }

      await deleteProductCategory(row.id);
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
      const fullData = cloneFlatRows(gridApi.grid.getTableData().fullData);
      const idx = fullData.findIndex((item: any) => item.id === row.id);
      if (idx !== -1) fullData.splice(idx, 1);
      await gridApi.grid.loadData(fullData);
      gridApi.grid.setAllTreeExpand(isExpanded.value);
    }
  } finally {
    loadingInstance.close();
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useQueryFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async (_, formValues) => {
          const res = await getProductCategoryList(formValues);
          return res || [];
        },
      },
    },
    keepSource: true,
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
    treeConfig: {
      parentField: 'parent_id',
      rowField: 'id',
      transform: true,
      expandAll: true,
      reserve: true,
    },
  } as VxeTableGridOptions<ErpProductCategoryApi.ProductCategory>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleSuccess" />
    <Grid table-title="产品分类列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '产品分类',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的产品分类', placement: 'top' },
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: {
                content: '导出产品分类数据为Excel文件',
                placement: 'top',
              },
              onClick: handleExport,
            },
            {
              label: isExpanded ? '收缩' : '展开',
              type: 'primary',
              tooltip: {
                content: isExpanded ? '收缩分类树' : '展开分类树',
                placement: 'top',
              },
              onClick: handleExpand,
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '新增下级',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.ADD,
              onClick: handleAppend.bind(null, row),
            },
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              disabled: row.children && row.children.length > 0,
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.name]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
