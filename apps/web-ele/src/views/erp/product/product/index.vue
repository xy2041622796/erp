<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProductApi } from '#/api/erp/product/product';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ElLoading, ElMessage } from 'element-plus';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteProduct,
  exportProduct,
  getProductPage,
} from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'BilProductInfo' });

const PRODUCT_EXPORT_ENCODING_ID = 'BD8FFCF9EB6AFDA7B75107B343B97314';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const currentDataTable = ref<any>(null);
const warehouseList = ref<any[]>([]);

function getWarehouseName(row: ErpProductApi.Product) {
  const key = String(row?.default_warehouse_id ?? '');
  if (!key) return '-';

  const hit = warehouseList.value.find((item) =>
    [item?.rowid, item?.id, item?.warehouse_id, item?.row_id, item?.ROWID]
      .map((value) => String(value ?? '').trim())
      .includes(key),
  );
  return hit?.name || hit?.warehouse_name || '-';
}

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 导出表格 */
async function handleExport() {
  const data = await exportProduct(
    await gridApi.formApi.getValues(),
    PRODUCT_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '产品信息.xls', source: data });
}

/** 创建 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑 */
function handleEdit(row: ErpProductApi.Product) {
  formModalApi.setData({ rowid: row.rowid }).open();
}

/** 删除 */
async function handleDelete(row: ErpProductApi.Product) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.product_name || '产品']),
  });
  try {
    await deleteProduct(row.rowid as string);
    ElMessage.success(
      $t('ui.actionMessage.deleteSuccess', [row.product_name || '产品']),
    );
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getProductPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          currentDataTable.value = res.dataTable; // 你项目里如果有 dataTable 权限控制就保留
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<ErpProductApi.Product>,
});

onMounted(async () => {
  const list = await getWarehouseSimpleList({ includeDisabled: true });
  warehouseList.value = Array.isArray(list) ? list : [];
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <Grid table-title="产品列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '产品',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的产品', placement: 'top' },
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出产品数据为Excel文件', placement: 'top' },
              onClick: handleExport,
            },
          ]"
        />
      </template>

      <!-- 图片列 slot -->
      <template #image="{ row }">
        <div style="display: flex; gap: 8px; align-items: center">
          <img
            v-if="row.product_image"
            :src="row.product_image"
            alt=""
            style="
              width: 36px;
              height: 36px;
              object-fit: cover;
              border-radius: 4px;
            "
          />
          <div
            v-else
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              color: #999;
              background: #f2f3f5;
              border-radius: 4px;
            "
          >
            —
          </div>
        </div>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
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
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [
                  row.product_name || '产品',
                ]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>

      <template #default_warehouse_id="{ row }">
        {{ getWarehouseName(row) }}
      </template>
    </Grid>
  </Page>
</template>
