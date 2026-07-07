<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';

import { computed, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, formatDateTime, isEmpty } from '@vben/utils';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  assertPurchaseInCanGenerate,
  getPurchaseInOrder,
  getPurchaseInOrderPage,
} from '#/api/erp/purchase/in';
import {
  deletePurchaseOrder,
  exportPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrderPage,
} from '#/api/erp/purchase/order';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import PurchaseInForm from '../in/modules/form.vue';
import { useDataTablePermission } from '../../shared/useDataTablePermission';
import {
  getPurchaseOrderStatusMeta,
  useGridColumns,
  useGridFormSchema,
} from './data';
import Form from './modules/form.vue';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElLoading,
  ElMessage,
  ElPagination,
  ElRadio,
  ElRadioGroup,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

/** ERP 采购订单列表 */
defineOptions({ name: 'ErpPurchaseOrder' });

const PURCHASE_ORDER_EXPORT_ENCODING_ID = 'AFA1E217AE8C31B4CAD53C69C54B9F55';

const { dataTable, hasPermission } = useDataTablePermission();

const supplierOptions = ref<any[]>([]);
const supplierNameMap = computed(() => {
  const map = new Map<string, string>();
  for (const item of supplierOptions.value) {
    const key = item.rowid ?? item.id;
    const name = item.name ?? item.customer_name ?? item.customerName;
    if (key != null && name) map.set(String(key), name);
  }
  return map;
});
const userOptions = ref<any[]>([]);
const accountList = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);

function getDisplayDateTime(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  return formatDateTime(value as any) || String(value);
}

function getStatusLabel(status: unknown) {
  const meta = getPurchaseOrderStatusMeta(status);
  return (
    meta?.label ??
    (status === undefined || status === null || status === ''
      ? '-'
      : String(status))
  );
}

function getStatusTagType(status: unknown) {
  return getPurchaseOrderStatusMeta(status)?.tagType;
}

onMounted(async () => {
  const [suppliers, users, accounts, warehouses, products, categories] =
    await Promise.all([
      getSupplierSimpleList(),
      getSimpleUserList(),
      getAccountSimpleList(),
      getWarehouseSimpleList(),
      getProductSimpleList(),
      getProductCategorySimpleList(),
    ]);
  supplierOptions.value = suppliers;
  userOptions.value = users;
  accountList.value = accounts;
  warehouseOptions.value = warehouses;
  productList.value = Array.isArray(products) ? products : [];
  categoryList.value = Array.isArray(categories) ? categories : [];
  handleRefresh();
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [PurchaseInModal, purchaseInModalApi] = useVbenModal({
  connectedComponent: PurchaseInForm,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportPurchaseOrder(
    await gridApi.formApi.getValues(),
    PURCHASE_ORDER_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '采购订单.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpPurchaseOrderApi.PurchaseOrder) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deletePurchaseOrder(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({
  records,
}: {
  records: ErpPurchaseOrderApi.PurchaseOrder[];
}) {
  checkedIds.value = records.map((item) => item.id!);
}

function handleDetail(row: ErpPurchaseOrderApi.PurchaseOrder) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
}

function enrichPurchaseOrderPrintData(data: any) {
  const supplier = supplierOptions.value.find(
    (item) => item.rowid === data?.supplier_id,
  );
  return {
    ...data,
    _supplier_name: supplier?.name || data?.supplier_id,
    contactName:
      supplier?.contact_name || supplier?.contactName || data?.contactName,
    contactPhone:
      supplier?.contact_phone ||
      supplier?.contactPhone ||
      supplier?.telephone ||
      supplier?.mobile ||
      data?.contactPhone,
    address: supplier?.address || data?.address,
    _purchase_user_name:
      userOptions.value.find((item) => item.ROWID === data?.purchase_user_id)
        ?.UserName || data?.purchase_user_id,
  };
}

async function handlePrintOne(row: ErpPurchaseOrderApi.PurchaseOrder) {
  if (!row?.id) return;
  const detail = await getPurchaseOrder(String(row.id));
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'purchase-order',
    data: enrichPurchaseOrderPrintData(detail),
    companyName,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseOptions.value,
  });
  await writePrintHtmlAndPrint(html);
}

async function handlePrintSelected() {
  if (checkedIds.value.length === 0) {
    ElMessage.warning('请先选择要打印的单据');
    return;
  }
  for (const id of checkedIds.value) {
    await handlePrintOne({ id } as any);
  }
}

function getOrderItemTotalCount(item: any) {
  return Number(item?.count || item?.total_count || 0);
}

function getOrderItemDoneCount(item: any) {
  return Number(item?.in_count || item?.inCount || 0);
}

function getOrderRemainCount(items: any[] = []) {
  return items.reduce((sum, item) => {
    const remain = Math.max(
      getOrderItemTotalCount(item) - getOrderItemDoneCount(item),
      0,
    );
    return sum + remain;
  }, 0);
}

function isOrderFullyInByRow(row: any) {
  const status = Number(row?.status || 0);
  const totalCount = Number(row?.total_count || row?.count || 0);
  const inCount = Number(row?.in_count || row?.inCount || 0);
  if (status === 20) return true;
  if (totalCount > 0 && inCount >= totalCount) return true;
  return false;
}

function getWarehouseRemainItems(items: any[] = [], warehouseId?: string) {
  return items.filter((item: any) => {
    if (warehouseId && String(item?.warehouse_id || '') !== String(warehouseId))
      return false;
    return (
      Math.max(getOrderItemTotalCount(item) - getOrderItemDoneCount(item), 0) >
      0
    );
  });
}

const generateDialogVisible = ref(false);
const warehouseDialogVisible = ref(false);
const orderLoading = ref(false);
const orderList = ref<any[]>([]);
const orderTotal = ref(0);
const orderPageNo = ref(1);
const orderPageSize = ref(10);
const orderQueryNo = ref('');
const selectedOrder = ref<any>(null);
const fullOrder = ref<any>(null);
const selectedGroupWarehouseId = ref('');

const groupOptions = computed(() => {
  const items = Array.isArray(fullOrder.value?.items)
    ? fullOrder.value.items
    : [];
  const map = new Map<
    string,
    {
      warehouseId: string;
      warehouseName?: string;
      count: number;
      remainCount: number;
    }
  >();
  for (const item of items) {
    const warehouseId = String(item?.warehouse_id || '');
    if (!warehouseId) continue;
    const remainCount = Math.max(
      getOrderItemTotalCount(item) - getOrderItemDoneCount(item),
      0,
    );
    if (remainCount <= 0) continue;
    const warehouseName =
      warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)
        ?.name ||
      item?.warehouse_name ||
      warehouseId;
    const current = map.get(warehouseId);
    map.set(warehouseId, {
      warehouseId,
      warehouseName,
      count: (current?.count || 0) + 1,
      remainCount: (current?.remainCount || 0) + remainCount,
    });
  }
  return [...map.values()];
});

async function loadPurchaseOrders() {
  orderLoading.value = true;
  try {
    const res: any = await getPurchaseInOrderPage({
      index: orderPageNo.value,
      size: orderPageSize.value,
      no: orderQueryNo.value,
      inEnable: true,
    });
    const rows = Array.isArray(res?.list) ? res.list : [];
    const availableRows = rows.filter(
      (item: any) => !isOrderFullyInByRow(item),
    );
    orderList.value = availableRows;
    orderTotal.value = Number(res?.total || availableRows.length);
  } finally {
    orderLoading.value = false;
  }
}

function openGenerateDialog() {
  generateDialogVisible.value = true;
  warehouseDialogVisible.value = false;
  selectedOrder.value = null;
  fullOrder.value = null;
  selectedGroupWarehouseId.value = '';
  orderPageNo.value = 1;
  loadPurchaseOrders();
}

async function handleSelectOrder(row: any) {
  selectedOrder.value = row;
}

async function handleNextGenerate() {
  if (!selectedOrder.value) {
    ElMessage.warning('请先选择采购订单');
    return;
  }
  if (isOrderFullyInByRow(selectedOrder.value)) {
    ElMessage.warning('该采购订单已完全入库，不能继续生成采购入库单');
    return;
  }
  const detail = await getPurchaseInOrder(
    String(selectedOrder.value.rowid || selectedOrder.value.id),
  );
  const items = Array.isArray(detail?.items) ? detail.items : [];
  if (getOrderRemainCount(items) <= 0) {
    ElMessage.warning('该采购订单已完全入库，不能继续生成采购入库单');
    return;
  }
  const groupedWarehouseIds = [
    ...new Set(
      items
        .map((item: any) => String(item?.warehouse_id || ''))
        .filter(Boolean),
    ),
  ].filter(
    (warehouseId) => getWarehouseRemainItems(items, warehouseId).length > 0,
  );
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('该源单明细还未分配仓库或已全部入库，无法生成采购入库单');
    return;
  }
  fullOrder.value = detail;
  if (groupedWarehouseIds.length === 1) {
    selectedGroupWarehouseId.value = groupedWarehouseIds[0];
    await openPurchaseInCreateWithSelectedWarehouse();
    return;
  }
  selectedGroupWarehouseId.value = groupedWarehouseIds[0];
  warehouseDialogVisible.value = true;
}

async function openPurchaseInCreateWithSelectedWarehouse() {
  if (!fullOrder.value || !selectedGroupWarehouseId.value) {
    ElMessage.warning('请先选择仓库');
    return;
  }
  const warehouseId = selectedGroupWarehouseId.value;
  const items = getWarehouseRemainItems(
    fullOrder.value?.items || [],
    warehouseId,
  );
  if (items.length === 0) {
    ElMessage.warning('该仓库下的产品已全部入库，不能继续生成采购入库单');
    return;
  }
  try {
    await assertPurchaseInCanGenerate(
      fullOrder.value.id || fullOrder.value.rowid,
      warehouseId,
    );
  } catch (error: any) {
    ElMessage.warning(error?.message || '该采购订单当前仓库不可生成采购入库单');
    handleRefresh();
    await loadPurchaseOrders();
    return;
  }
  const warehouseName =
    warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name ||
    items[0]?.warehouse_name ||
    warehouseId;
  warehouseDialogVisible.value = false;
  generateDialogVisible.value = false;
  purchaseInModalApi
    .setData({
      type: 'create',
      preloadOrder: {
        order: fullOrder.value,
        warehouseId,
        warehouseName,
        items,
      },
    })
    .open();
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
          const res = await getPurchaseOrderPage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          });
          dataTable.value = res.dataTable;
          const list = res.list;
          if (list && list.length > 0) {
            const map = supplierNameMap.value;
            for (const row of list) {
              if (row.supplier_id != null) {
                row._supplier_name =
                  map.get(String(row.supplier_id)) || '';
              }
            }
          }
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<ErpPurchaseOrderApi.PurchaseOrder>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <PurchaseInModal @success="handleRefresh" />
    <Grid table-title="采购订单列表">
      <template #status="{ row }">
        <ElTag
          v-if="getPurchaseOrderStatusMeta(row.status)"
          :type="getStatusTagType(row.status) as any"
        >
          {{ getStatusLabel(row.status) }}
        </ElTag>
        <span v-else>{{ getStatusLabel(row.status) }}</span>
      </template>

      <template #supplier_id="{ row }">
        {{ row._supplier_name || '-' }}
      </template>
      <template #account_id="{ row }">
        {{
          accountList.find((item) => item.rowid === row.account_id)?.name ||
          row.account_id
        }}
      </template>
      <template #creator_name="{ row }">
        {{
          row.creator_name ||
          userOptions.find((item) => item.ROWID === row.createuser)?.UserName ||
          row.createuser ||
          '-'
        }}
      </template>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '采购订单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的采购订单', placement: 'top' },
              disabled: !hasPermission('data:add'),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出采购订单数据为Excel文件', placement: 'top' },
              disabled: !hasPermission('data:add'),
              onClick: handleExport,
            },
            {
              label: '入库单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '选择源单和仓库后打开采购入库新增页', placement: 'top' },
              disabled: !hasPermission('data:add'),
              onClick: openGenerateDialog,
            },
            {
              label: '打印选中',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '打印已选中的采购订单', placement: 'top' },
              disabled: isEmpty(checkedIds) || !hasPermission('data:add'),

              onClick: handlePrintSelected,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的采购订单', placement: 'top' },
              disabled: isEmpty(checkedIds) || !hasPermission('data:allDelete'),
              icon: ACTION_ICON.DELETE,

              popConfirm: {
                title: `是否删除所选中数据？`,
                confirm: handleDelete.bind(null, checkedIds),
              },
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              tooltip: { content: $t('common.detail'), placement: 'top' },
              disabled: !hasPermission('row:view', row.rowid),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              tooltip: { content: $t('common.edit'), placement: 'top' },
              disabled: !(
                Number(row.status) === 10 && hasPermission('row:edit', row.id)
              ),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              tooltip: { content: $t('common.delete'), placement: 'top' },
              disabled: !hasPermission('row:delete', row.id),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.no]),
                confirm: handleDelete.bind(null, [row.id!]),
              },
            },
          ]"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="generateDialogVisible"
      title="选择来源采购订单"
      width="960px"
      :close-on-click-modal="false"
    >
      <div class="mb-3 flex gap-2">
        <ElInput
          v-model="orderQueryNo"
          placeholder="请输入采购订单号"
          clearable
        />
        <ElButton
          type="primary"
          @click="
            () => {
              orderPageNo = 1;
              loadPurchaseOrders();
            }
          "
        >
          查询
        </ElButton>
      </div>
      <ElTable
        v-loading="orderLoading"
        :data="orderList"
        border
        height="420"
        highlight-current-row
        @current-change="handleSelectOrder"
      >
        <ElTableColumn width="55">
          <template #default="scope">
            <ElRadio :model-value="selectedOrder?.id" :label="scope.row.id"
              >&nbsp;</ElRadio
            >
          </template>
        </ElTableColumn>
        <ElTableColumn prop="no" label="订单号" min-width="160" />
        <ElTableColumn prop="supplier_id" label="供应商" min-width="160">
          <template #default="scope">
            {{
              supplierOptions.find(
                (item) => item.rowid === scope.row.supplier_id,
              )?.name || scope.row.supplier_id
            }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="order_time" label="下单时间" min-width="180">
          <template #default="scope">
            {{ getDisplayDateTime(scope.row.order_time) }}
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-4 flex items-center justify-between">
        <ElPagination
          v-model:current-page="orderPageNo"
          v-model:page-size="orderPageSize"
          :total="orderTotal"
          layout="total, prev, pager, next"
          @current-change="loadPurchaseOrders"
        />
        <div class="flex gap-2">
          <ElButton @click="generateDialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleNextGenerate">下一步</ElButton>
        </div>
      </div>
    </ElDialog>

    <ElDialog
      v-model="warehouseDialogVisible"
      title="请选择本次执行仓库"
      width="520px"
      :close-on-click-modal="false"
    >
      <div class="mb-3 text-sm text-[#666]">
        当前订单中的产品分布在多个仓库，请选择本次要入库的仓库
      </div>
      <ElRadioGroup
        v-model="selectedGroupWarehouseId"
        class="flex w-full flex-col gap-3"
      >
        <ElRadio
          v-for="item in groupOptions"
          :key="item.warehouseId"
          :label="item.warehouseId"
          class="!mr-0 flex w-full items-start"
        >
          <span class="whitespace-normal break-all leading-5">
            {{ item.warehouseName }}（{{ item.count }} 行，剩余
            {{ item.remainCount }}）
          </span>
        </ElRadio>
      </ElRadioGroup>
      <template #footer>
        <ElButton @click="warehouseDialogVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          @click="openPurchaseInCreateWithSelectedWarehouse"
          >确认导入该仓库产品</ElButton
        >
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
:deep(.table-actions .iconify) {
  width: 1.25em;
  height: 1.25em;
}
</style>
