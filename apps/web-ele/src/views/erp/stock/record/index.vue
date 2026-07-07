<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpStockRecordApi } from '#/api/erp/stock/record';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ElLink, ElMessage } from 'element-plus';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getPurchaseInPage } from '#/api/erp/purchase/in';
import { getPurchaseReturnPage } from '#/api/erp/purchase/return';
import { getSaleOutPage } from '#/api/erp/sale/out';
import { getSaleReturnPage } from '#/api/erp/sale/return';
import { getStockCheck, getStockCheckPage } from '#/api/erp/stock/check';
import { getStockInPage } from '#/api/erp/stock/in';
import { getStockOutPage } from '#/api/erp/stock/out';
import { getPurchaseReturnOutPage } from '#/api/erp/stock/purchase-return-out';
import { exportStockRecord, getStockRecordPage } from '#/api/erp/stock/record';
import { getSaleReturnInPage } from '#/api/erp/stock/sale-return-in';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
// import { useDataTablePermission } from '#/views/erp/common/useDataTablePermission';

import WarehouseForm from '../../basic_data/basic-archives/warehouse/modules/form.vue';
import ProductForm from '../../product/product/modules/form.vue';
import PurchaseInForm from '../../purchase/in/modules/form.vue';
import PurchaseReturnForm from '../../purchase/return/modules/form.vue';
import SaleOutForm from '../../sale/out/modules/form.vue';
import SaleReturnForm from '../../sale/return/modules/form.vue';
import StockCheckForm from '../check/modules/form.vue';
import StockInForm from '../in/modules/form.vue';
import StockOutForm from '../out/modules/form.vue';
import PurchaseReturnOutForm from '../purchase-return-out/modules/form.vue';
import SaleReturnInForm from '../sale-return-in/modules/form.vue';
import { useGridColumns, useGridFormSchema } from './data';

/** 产品库存明细管理 */
defineOptions({ name: 'ErpStockRecord' });
// const { hasPermission } = useDataTablePermission(STOCK_RECORD_TABLE);
const router = useRouter();
const dataTable = ref();
const productList = ref<any[]>([]);
const productCategoryList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const userList = ref<any[]>([]);
const STOCK_RECORD_EXPORT_ENCODING_ID = '1CC84C57E357AD85F299EF19B38B2073';

const [ProductFormModal, productFormModalApi] = useVbenModal({
  connectedComponent: ProductForm,
  destroyOnClose: true,
});
const [WarehouseFormModal, warehouseFormModalApi] = useVbenModal({
  connectedComponent: WarehouseForm,
  destroyOnClose: true,
});
const [PurchaseInFormModal, purchaseInFormModalApi] = useVbenModal({
  connectedComponent: PurchaseInForm,
  destroyOnClose: true,
});
const [PurchaseReturnFormModal, purchaseReturnFormModalApi] = useVbenModal({
  connectedComponent: PurchaseReturnForm,
  destroyOnClose: true,
});
const [SaleOutFormModal, saleOutFormModalApi] = useVbenModal({
  connectedComponent: SaleOutForm,
  destroyOnClose: true,
});
const [SaleReturnFormModal, saleReturnFormModalApi] = useVbenModal({
  connectedComponent: SaleReturnForm,
  destroyOnClose: true,
});
const [StockInFormModal, stockInFormModalApi] = useVbenModal({
  connectedComponent: StockInForm,
  destroyOnClose: true,
});
const [StockOutFormModal, stockOutFormModalApi] = useVbenModal({
  connectedComponent: StockOutForm,
  destroyOnClose: true,
});
const [SaleReturnInFormModal, saleReturnInFormModalApi] = useVbenModal({
  connectedComponent: SaleReturnInForm,
  destroyOnClose: true,
});
const [PurchaseReturnOutFormModal, purchaseReturnOutFormModalApi] =
  useVbenModal({
    connectedComponent: PurchaseReturnOutForm,
    destroyOnClose: true,
  });
const [StockCheckFormModal, stockCheckFormModalApi] = useVbenModal({
  connectedComponent: StockCheckForm,
  destroyOnClose: true,
});

function flattenTree(list: any[]): any[] {
  const result: any[] = [];
  for (const item of Array.isArray(list) ? list : []) {
    result.push(item);
    if (Array.isArray(item?.children) && item.children.length > 0) {
      result.push(...flattenTree(item.children));
    }
  }
  return result;
}

function getProduct(row: ErpStockRecordApi.StockRecord) {
  const key = String(row?.product_id ?? '').trim();
  if (!key) return null;
  return productList.value.find(
    (p) =>
      String(p.rowid ?? '') === key ||
      String(p.id ?? '') === key ||
      String(p.product_code ?? p.code ?? '') === key,
  );
}

function getProductName(row: ErpStockRecordApi.StockRecord) {
  const directName = String(
    (row as any)?.product_name ||
      (row as any)?.productName ||
      (row as any)?.name ||
      '',
  ).trim();
  if (directName) return directName;

  const product = getProduct(row);
  const matchedName = String(
    product?.product_name || product?.name || product?.productName || '',
  ).trim();
  if (matchedName) return matchedName;

  const description = String(row?.description || '');
  const openingEntryName = getOpeningEntryProductName(description);
  if (openingEntryName) return openingEntryName;

  return '未匹配产品名称';
}

function getOpeningEntryProductName(description: string) {
  for (const prefix of ['库存期初审批:', '库存期初审批：']) {
    const start = description.indexOf(prefix);
    if (start !== -1) return description.slice(start + prefix.length).trim();
  }
  return '';
}

function getProductCategoryName(row: ErpStockRecordApi.StockRecord) {
  const directName = String(
    (row as any)?.categoryName ||
      (row as any)?.category_name ||
      (row as any)?.product_category_name ||
      '',
  ).trim();
  if (directName) return directName;

  const product = getProduct(row);
  const productCategoryName = String(
    product?.categoryName ||
      product?.category_name ||
      product?.product_category_name ||
      '',
  ).trim();
  if (productCategoryName) return productCategoryName;

  const categoryId = String(
    product?.category_id ||
      product?.product_category_id ||
      product?.product_type ||
      (row as any)?.category_id ||
      '',
  ).trim();
  if (!categoryId) return '-';

  const category = productCategoryList.value.find(
    (item) =>
      String(item?.id ?? '') === categoryId ||
      String(item?.rowid ?? '') === categoryId ||
      String(item?.code ?? '') === categoryId ||
      String(item?.name ?? '') === categoryId,
  );
  const categoryName = String(
    category?.name || category?.category_name || '',
  ).trim();
  return categoryName || categoryId;
}

function getProductUnitName(row: ErpStockRecordApi.StockRecord) {
  const directName = String(
    (row as any)?.unitName ||
      (row as any)?.unit_name ||
      (row as any)?.product_unit_name ||
      '',
  ).trim();
  if (directName) return directName;

  const product = getProduct(row);
  const unitName = String(
    product?.unitName ||
      product?.unit_name ||
      product?.product_unit_name ||
      product?.unit ||
      '',
  ).trim();
  return unitName || '-';
}

function getUserKeys(user: any) {
  return [user?.ID, user?.id, user?.ROWID, user?.rowid, user?.LoginName]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

function getUserDisplayName(user: any) {
  return String(
    user?.UserName ||
      user?.username ||
      user?.nickname ||
      user?.NickName ||
      user?.realName ||
      user?.LoginName ||
      '',
  ).trim();
}

function getOperatorName(row: ErpStockRecordApi.StockRecord) {
  const directName = String(
    (row as any)?.creator_name ||
      (row as any)?.creatorName ||
      (row as any)?.operator_name ||
      (row as any)?.operatorName ||
      '',
  ).trim();
  if (directName) return directName;

  const operatorId = String(row?.creator || row?.createuser || '').trim();
  if (!operatorId) return '-';

  const user = userList.value.find((item) =>
    getUserKeys(item).includes(operatorId),
  );
  const displayName = getUserDisplayName(user);
  return displayName || '-';
}

function getWarehouseOptionValue(item: any) {
  return String(item?.id || item?.rowid || '');
}

async function ensureWarehouseList() {
  if (warehouseList.value.length > 0) return;
  const warehouses = await getWarehouseSimpleList();
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
}

function getWarehouseName(row: ErpStockRecordApi.StockRecord) {
  const directName = String(
    (row as any)?.warehouse_name ||
      (row as any)?.warehouseName ||
      (row as any)?.name ||
      '',
  ).trim();
  if (directName) return directName;

  const key = String(row?.warehouse_id ?? '');
  if (!key) return '-';
  const hit = warehouseList.value.find(
    (w) =>
      String(w.id ?? '') === key ||
      String(w.rowid ?? '') === key ||
      getWarehouseOptionValue(w) === key,
  );
  const matchedName = String(
    hit?.name || hit?.warehouseName || hit?.warehouse_name || '',
  ).trim();
  if (matchedName) return matchedName;

  return '未匹配仓库名称';
}

function getWarehouse(row: ErpStockRecordApi.StockRecord) {
  const key = String(row?.warehouse_id ?? '').trim();
  if (!key) return null;
  return warehouseList.value.find(
    (w) =>
      String(w.id ?? '') === key ||
      String(w.rowid ?? '') === key ||
      getWarehouseOptionValue(w) === key,
  );
}

function openProductDetail(row: ErpStockRecordApi.StockRecord) {
  const product = getProduct(row);
  const rowid = product?.rowid || product?.id;
  if (!rowid) {
    ElMessage.warning('未匹配到产品详情');
    return;
  }
  productFormModalApi.setData({ rowid }).open();
}

function openWarehouseDetail(row: ErpStockRecordApi.StockRecord) {
  const warehouse = getWarehouse(row);
  if (!warehouse) {
    ElMessage.warning('未匹配到仓库详情');
    return;
  }
  warehouseFormModalApi.setData(warehouse).open();
}

async function findDocByNo(
  queryFn: (params: any) => Promise<any>,
  bizNo: string,
) {
  const res = await queryFn({ no: bizNo, size: 1, index: 1 });
  const list = Array.isArray(res?.list) ? res.list : [];
  return (
    list.find((item: any) => String(item?.no || '').trim() === bizNo) ||
    list[0] ||
    null
  );
}

async function findStockCheckDoc(
  row: ErpStockRecordApi.StockRecord,
  bizNo: string,
) {
  const res = await getStockCheckPage({ no: bizNo, page: 1, pageNo: 1 });
  const list = Array.isArray(res?.list) ? res.list : [];
  const byNo =
    list.find((item: any) => String(item?.no || '').trim() === bizNo) ||
    list[0] ||
    null;
  if (byNo) return byNo;

  return await getStockCheck(row?.biz_id || bizNo).catch(() => null);
}

function openOpeningStockPage(row: ErpStockRecordApi.StockRecord) {
  router.push({
    path: '/erp/basic_data/opening_entry/product_stock',
    query: {
      product_id: String(row?.product_id || ''),
      warehouse_id: String(row?.warehouse_id || ''),
      biz_no: String(row?.biz_no || ''),
    },
  });
}

async function openBizNoDetail(row: ErpStockRecordApi.StockRecord) {
  const bizNo = String(row?.biz_no || '').trim();
  const upperBizNo = bizNo.toUpperCase();
  if (!bizNo) return;

  if (upperBizNo.startsWith('OPEN-STOCK')) {
    openOpeningStockPage(row);
    return;
  }

  let doc: any = null;
  try {
    if ([3, 4].includes(Number(row?.biz_type))) {
      doc = await findStockCheckDoc(row, bizNo);
      const id = doc?.id || doc?.rowid;
      if (id) stockCheckFormModalApi.setData({ type: 'detail', id }).open();
    } else if (upperBizNo.startsWith('CGRK-')) {
      doc = await findDocByNo(getPurchaseInPage, bizNo);
      if (doc?.id)
        purchaseInFormModalApi.setData({ type: 'detail', id: doc.id }).open();
    } else if (upperBizNo.startsWith('CGTH-')) {
      doc = await findDocByNo(getPurchaseReturnPage, bizNo);
      if (doc?.id)
        purchaseReturnFormModalApi
          .setData({ type: 'detail', id: doc.id })
          .open();
    } else if (upperBizNo.startsWith('CK-')) {
      doc = await findDocByNo(getSaleOutPage, bizNo);
      if (doc?.id)
        saleOutFormModalApi.setData({ type: 'detail', id: doc.id }).open();
    } else if (upperBizNo.startsWith('TH-')) {
      doc = await findDocByNo(getSaleReturnPage, bizNo);
      if (doc?.id)
        saleReturnFormModalApi.setData({ type: 'detail', id: doc.id }).open();
    } else if (upperBizNo.startsWith('STH-')) {
      doc = await findDocByNo(getSaleReturnInPage, bizNo);
      if (doc?.id)
        saleReturnInFormModalApi.setData({ type: 'detail', id: doc.id }).open();
    } else if (upperBizNo.startsWith('CTH-')) {
      doc = await findDocByNo(getPurchaseReturnOutPage, bizNo);
      if (doc?.id)
        purchaseReturnOutFormModalApi
          .setData({ type: 'detail', id: doc.id })
          .open();
    } else if (upperBizNo.startsWith('RK-')) {
      doc = await findDocByNo(getStockInPage, bizNo);
      const id = doc?.id || doc?.rowid;
      if (id)
        stockInFormModalApi.setData({ type: 'detail', rowid: id, id }).open();
    } else if (upperBizNo.startsWith('QTCK-')) {
      doc = await findDocByNo(getStockOutPage, bizNo);
      const id = doc?.id || doc?.rowid;
      if (id)
        stockOutFormModalApi.setData({ type: 'detail', rowid: id, id }).open();
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '打开单据详情失败');
    return;
  }

  if (!doc) {
    ElMessage.warning('未匹配到对应出入库单详情');
  }
}

/** 导出库存明细 */
async function handleExport() {
  const data = await exportStockRecord(
    await gridApi.formApi.getValues(),
    STOCK_RECORD_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '产品库存明细.xls', source: data });
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
          await ensureWarehouseList();
          const res = await getStockRecordPage({
            index: page.currentPage || 1,
            size: page.pageSize || 20,
            ...formValues,
          });
          dataTable.value = res.dataTable;
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
  } as VxeTableGridOptions<ErpStockRecordApi.StockRecord>,
});

onMounted(async () => {
  const [products, categories, warehouses, users] = await Promise.all([
    getProductSimpleList(),
    getProductCategorySimpleList(),
    getWarehouseSimpleList(),
    getSimpleUserList(),
  ]);
  productList.value = Array.isArray(products) ? products : [];
  productCategoryList.value = flattenTree(
    Array.isArray(categories) ? categories : [],
  );
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
  userList.value = Array.isArray(users) ? users : [];

  // Grid 首次查询可能早于 onMounted 的基础资料加载，仓库名称加载完成后刷新一次，
  // 避免单元格先渲染成“未匹配仓库名称”。
  await gridApi.query();
});
</script>

<template>
  <Page auto-content-height>
    <ProductFormModal />
    <WarehouseFormModal />
    <PurchaseInFormModal />
    <PurchaseReturnFormModal />
    <SaleOutFormModal />
    <SaleReturnFormModal />
    <StockInFormModal />
    <StockOutFormModal />
    <SaleReturnInFormModal />
    <PurchaseReturnOutFormModal />
    <StockCheckFormModal />

    <Grid table-title="产品库存明细列表">
      <template #product_id="{ row }">
        <ElLink
          type="primary"
          :underline="false"
          @click="openProductDetail(row)"
        >
          {{ getProductName(row) }}
        </ElLink>
      </template>

      <template #product_category_name="{ row }">
        {{ getProductCategoryName(row) }}
      </template>

      <template #product_unit_name="{ row }">
        {{ getProductUnitName(row) }}
      </template>

      <template #warehouse_id="{ row }">
        <ElLink
          type="primary"
          :underline="false"
          @click="openWarehouseDetail(row)"
        >
          {{ getWarehouseName(row) }}
        </ElLink>
      </template>

      <template #biz_no="{ row }">
        <ElLink type="primary" :underline="false" @click="openBizNoDetail(row)">
          {{ row.biz_no || '-' }}
        </ElLink>
      </template>

      <template #operator_name="{ row }">
        {{ getOperatorName(row) }}
      </template>

      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: {
                content: '导出库存记录数据为Excel文件',
                placement: 'top',
              },
              disabled: !dataTable?.hasData(),
              onClick: handleExport,
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
