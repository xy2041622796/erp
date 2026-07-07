<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { computed, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { assertSaleOutCanGenerate, getSaleOutOrderPage } from '#/api/erp/sale/out';
import {
  deleteSaleOrder,
  exportSaleOrder,
  getSaleOrder,
  getSaleOrderPage,
} from '#/api/erp/sale/order';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import { formatDateOnly } from '#/utils/date';
import SaleOutForm from '../out/modules/form.vue';
import { useDataTablePermission } from '../../shared/useDataTablePermission';
import {
  getSaleOrderStatusMeta,
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

/** ERP 销售订单列表 */
defineOptions({ name: 'ErpSaleOrder' });

const SALE_ORDER_EXPORT_ENCODING_ID = 'BFE01A4B55000E0DA91DFF33C2B4FF6E';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [SaleOutModal, saleOutModalApi] = useVbenModal({
  connectedComponent: SaleOutForm,
  destroyOnClose: true,
});
const { dataTable, hasPermission } = useDataTablePermission();

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportSaleOrder(
    await gridApi.formApi.getValues(),
    SALE_ORDER_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '销售订单.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpSaleOrderApi.SaleOrder) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteSaleOrder(ids);
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
  records: ErpSaleOrderApi.SaleOrder[];
}) {
  checkedIds.value = records.map((item) => item.id!);
}

const accountList = ref<any[]>([]);
const userList = ref<any[]>([]);
const customerList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);

onMounted(async () => {
  const [accounts, users, customers, warehouses, products, categories] = await Promise.all([
    getAccountSimpleList(),
    getSimpleUserList(),
    getCustomerSimpleList(),
    getWarehouseSimpleList(),
    getProductSimpleList(),
    getProductCategorySimpleList(),
  ]);
  accountList.value = accounts;
  userList.value = users;
  customerList.value = Array.isArray(customers) ? customers : [];
  warehouseList.value = Array.isArray(warehouses) ? warehouses : [];
  productList.value = Array.isArray(products) ? products : [];
  categoryList.value = Array.isArray(categories) ? categories : [];
});

function getCustomerName(id: any) {
  return customerList.value.find((c) => c.id === id)?.name || id;
}

function getStatusLabel(status: unknown) {
  const meta = getSaleOrderStatusMeta(status);
  return (
    meta?.label ??
    (status === undefined || status === null || status === ''
      ? '-'
      : String(status))
  );
}

function getStatusTagType(status: unknown) {
  return getSaleOrderStatusMeta(status)?.tagType;
}

function handleDetail(row: ErpSaleOrderApi.SaleOrder) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
}

function enrichSaleOrderPrintData(data: any) {
  const customer = customerList.value.find((c) => c.id === data?.customer_id);
  return {
    ...data,
    _customer_name: getCustomerName(data?.customer_id),
    contact_name: customer?.contactName || customer?.contact_name,
    contact_phone: customer?.contactPhone || customer?.contact_phone || customer?.telephone || customer?.mobile,
    address: customer?.address,
    _sale_user_name:
      userList.value.find((item) => item.ROWID === data?.sale_user_id)?.UserName ||
      data?.sale_user_id,
  };
}

async function handlePrintOne(row: ErpSaleOrderApi.SaleOrder) {
  if (!row?.id) return;
  const detail = await getSaleOrder(String(row.id));
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'sale-order',
    data: enrichSaleOrderPrintData(detail),
    companyName,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseList.value,
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
  return Number(item?.out_count || item?.outCount || 0);
}

function getOrderRemainCount(items: any[] = []) {
  return items.reduce((sum, item) => {
    const remain = Math.max(getOrderItemTotalCount(item) - getOrderItemDoneCount(item), 0);
    return sum + remain;
  }, 0);
}

function isOrderFullyOutByRow(row: any) {
  const status = Number(row?.status || 0);
  const totalCount = Number(row?.total_count || row?.count || 0);
  const outCount = Number(row?.out_count || row?.outCount || 0);
  if (status === 20) return true;
  if (totalCount > 0 && outCount >= totalCount) return true;
  return false;
}

function getWarehouseRemainItems(items: any[] = [], warehouseId?: string) {
  return items.filter((item: any) => {
    if (warehouseId && String(item?.warehouse_id || '') !== String(warehouseId)) return false;
    return Math.max(getOrderItemTotalCount(item) - getOrderItemDoneCount(item), 0) > 0;
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
  const items = Array.isArray(fullOrder.value?.items) ? fullOrder.value.items : [];
  const map = new Map<string, { warehouseId: string; warehouseName?: string; count: number; remainCount: number }>();
  for (const item of items) {
    const warehouseId = String(item?.warehouse_id || '');
    if (!warehouseId) continue;
    const remainCount = Math.max(getOrderItemTotalCount(item) - getOrderItemDoneCount(item), 0);
    if (remainCount <= 0) continue;
    const warehouseName =
      warehouseList.value.find((w) => String(w.rowid) === warehouseId)?.name ||
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

async function loadSaleOrders() {
  orderLoading.value = true;
  try {
    const res: any = await getSaleOutOrderPage({
      index: orderPageNo.value,
      size: orderPageSize.value,
      no: orderQueryNo.value,
      outEnable: true,
    });
    const rows = Array.isArray(res?.list) ? res.list : [];
    const availableRows = rows.filter((item: any) => !isOrderFullyOutByRow(item));
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
  loadSaleOrders();
}

function handleSelectOrder(row: any) {
  selectedOrder.value = row;
}

async function handleNextGenerate() {
  if (!selectedOrder.value) {
    ElMessage.warning('请先选择销售订单');
    return;
  }
  if (isOrderFullyOutByRow(selectedOrder.value)) {
    ElMessage.warning('该销售订单已完全出库，不能继续生成销售出库单');
    return;
  }
  const detail = await getSaleOrder(String(selectedOrder.value.rowid || selectedOrder.value.id));
  const items = Array.isArray(detail?.items) ? detail.items : [];
  if (getOrderRemainCount(items) <= 0) {
    ElMessage.warning('该销售订单已完全出库，不能继续生成销售出库单');
    return;
  }
  const groupedWarehouseIds = [
    ...new Set(
      items
        .map((item: any) => String(item?.warehouse_id || ''))
        .filter(Boolean),
    ),
  ].filter((warehouseId) => getWarehouseRemainItems(items, warehouseId).length > 0);
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('该源单明细还未分配仓库或已全部出库，无法生成销售出库单');
    return;
  }
  fullOrder.value = detail;
  if (groupedWarehouseIds.length === 1) {
    selectedGroupWarehouseId.value = groupedWarehouseIds[0];
    await openSaleOutCreateWithSelectedWarehouse();
    return;
  }
  selectedGroupWarehouseId.value = groupedWarehouseIds[0];
  warehouseDialogVisible.value = true;
}

async function openSaleOutCreateWithSelectedWarehouse() {
  if (!fullOrder.value || !selectedGroupWarehouseId.value) {
    ElMessage.warning('请先选择仓库');
    return;
  }
  const warehouseId = selectedGroupWarehouseId.value;
  const items = getWarehouseRemainItems(fullOrder.value?.items || [], warehouseId);
  if (items.length === 0) {
    ElMessage.warning('该仓库下的产品已全部出库，不能继续生成销售出库单');
    return;
  }
  try {
    await assertSaleOutCanGenerate(fullOrder.value.id, warehouseId);
  } catch (error: any) {
    ElMessage.warning(error?.message || '该销售订单当前仓库不可生成销售出库单');
    handleRefresh();
    await loadSaleOrders();
    return;
  }
  const warehouseName =
    warehouseList.value.find((w) => String(w.rowid) === warehouseId)?.name ||
    items[0]?.warehouse_name ||
    warehouseId;
  warehouseDialogVisible.value = false;
  generateDialogVisible.value = false;
  saleOutModalApi
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

const schema = useGridFormSchema();
const columns = useGridColumns();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema },
  gridOptions: {
    columns,
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getSaleOrderPage({
            index: page.currentPage,
            size: page.page,
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
  } as VxeTableGridOptions<ErpSaleOrderApi.SaleOrder>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <SaleOutModal @success="handleRefresh" />
    <Grid table-title="销售订单列表">
      <template #status="{ row }">
        <ElTag
          v-if="getSaleOrderStatusMeta(row.status)"
          :type="getStatusTagType(row.status) as any"
        >
          {{ getStatusLabel(row.status) }}
        </ElTag>
        <span v-else>{{ getStatusLabel(row.status) }}</span>
      </template>

      <template #customer_id="{ row }">
        {{ getCustomerName(row.customer_id) }}
      </template>
      <template #account_id="{ row }">
        {{
          accountList.find((item) => item.rowid === row.account_id)?.name ||
          row.account_id
        }}
      </template>
      <template #sale_user_id="{ row }">
        {{
          userList.find((item) => item.ROWID === row.sale_user_id)?.UserName ||
          row.sale_user_id
        }}
      </template>

      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '销售订单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的销售订单', placement: 'top' },
              disabled: !(hasPermission('data:add')),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出销售订单数据为Excel文件', placement: 'top' },
              disabled: !(hasPermission('data:add')),
              onClick: handleExport,
            },
            {
              label: '出库单',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '选择源单和仓库后打开销售出库新增页', placement: 'top' },
              disabled: !(hasPermission('data:add')),
              onClick: openGenerateDialog,
            },
            {
              label: '打印选中',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '打印已选中的销售订单', placement: 'top' },
              disabled: (isEmpty(checkedIds)) || !(hasPermission('data:add')),

              onClick: handlePrintSelected,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的销售订单', placement: 'top' },
              disabled: (isEmpty(checkedIds)) || !(hasPermission('data:allDelete')),
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
              disabled: !(hasPermission('row:view', row.id)),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              tooltip: { content: $t('common.edit'), placement: 'top' },
              disabled: !(Number(row.status) === 10 && hasPermission('row:edit', row.id)),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              tooltip: { content: $t('common.delete'), placement: 'top' },
              disabled: !(hasPermission('row:delete', row.id)),
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
      title="选择来源销售订单"
      width="960px"
      :close-on-click-modal="false"
    >
      <div class="mb-3 flex gap-2">
        <ElInput v-model="orderQueryNo" placeholder="请输入销售订单号" clearable />
        <ElButton
          type="primary"
          @click="
            () => {
              orderPageNo = 1;
              loadSaleOrders();
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
            <ElRadio :model-value="selectedOrder?.id" :label="scope.row.id">&nbsp;</ElRadio>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="no" label="订单号" min-width="160" />
        <ElTableColumn prop="customer_id" label="客户" min-width="160">
          <template #default="scope">
            {{ getCustomerName(scope.row.customer_id) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="order_time" label="下单时间" min-width="180">
          <template #default="scope">
            {{ formatDateOnly(scope.row.order_time) || '-' }}
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-4 flex items-center justify-between">
        <ElPagination
          v-model:current-page="orderPageNo"
          v-model:page-size="orderPageSize"
          :total="orderTotal"
          layout="total, prev, pager, next"
          @current-change="loadSaleOrders"
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
        当前订单中的产品分布在多个仓库，请选择本次要出库的仓库
      </div>
      <ElRadioGroup v-model="selectedGroupWarehouseId" class="flex w-full flex-col gap-3">
        <ElRadio
          v-for="item in groupOptions"
          :key="item.warehouseId"
          :label="item.warehouseId"
          class="!mr-0 flex w-full items-start"
        >
          <span class="whitespace-normal break-all leading-5">
            {{ item.warehouseName }}（{{ item.count }} 行，剩余 {{ item.remainCount }}）
          </span>
        </ElRadio>
      </ElRadioGroup>
      <template #footer>
        <ElButton @click="warehouseDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="openSaleOutCreateWithSelectedWarehouse">
          确认导入该仓库产品
        </ElButton>
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
