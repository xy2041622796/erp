<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';
import type { ErpSaleReturnApi } from '#/api/erp/sale/return';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { downloadFileFromBlobPart, formatDateTime } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import {
  createCustomerAttachment,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { createSaleReturn, getSaleReturn, updateSaleReturn } from '#/api/erp/sale/return';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import FileUpload from '#/components/upload/file-upload.vue';
import { CustomerPicker } from '#/components/customer-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import SaleReturnInForm from '#/views/erp/stock/sale-return-in/modules/form.vue';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import { useFormSchema } from '../data';
import ItemForm from './item-form.vue';
import SaleOrderSelect from './sale-order-select.vue';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = '销售退货';
const emit = defineEmits(['success']);
const formData = ref<any>({
  id: undefined,
  no: undefined,
  account_id: undefined,
  return_time: undefined,
  remark: undefined,
  discount_percent: 0,
  customer_id: undefined,
  sale_user_id: undefined,
  discount_price: 0,
  total_price: 0,
  other_price: 0,
  warehouse_id: undefined,
  order_id: undefined,
  order_no: undefined,
  items: [],
});
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const { hasFieldPermission } = useDataTablePermission();
const isPer = hasFieldPermission(formData.value);
const customerId = ref<string | undefined>();
const saleUserId = ref<string | undefined>();
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const warehouseOptions = ref<any[]>([]);
const warehouseDialogVisible = ref(false);
const selectedGroupWarehouseId = ref('');
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');
const getCurrentTimestamp = () => formatDateTime(new Date()).slice(0, 10);

const [SaleReturnInModal, saleReturnInModalApi] = useVbenModal({ connectedComponent: SaleReturnInForm, destroyOnClose: true });

function getCurrentDocId() {
  return (formData.value?.id as any) || undefined;
}
async function loadAttachments(docId?: string | number) {
  if (!docId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE);
  } catch (error) {
    console.error('加载销售退货附件失败:', error);
    attachments.value = [];
  }
}
function formatAttachmentSize(size?: number) {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function toAttachmentItem(payload: FileUploadSuccessPayload): CrmCustomerApi.Attachment {
  const fileName = payload?.fileName || '';
  return {
    file_name: fileName,
    file_path: payload?.filePath || '',
    file_size: payload?.fileSize || 0,
    file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '',
    owner_type: ATTACH_OWNER_TYPE,
  };
}
async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) {
  const docId = getCurrentDocId();
  const item = toAttachmentItem(payload);
  if (!docId) {
    draftAttachments.value.push(item);
    attachments.value.push(item);
    uploadKey.value++;
    return;
  }
  await createCustomerAttachment(docId, {
    fileName: item.file_name,
    file_path: item.file_path,
    fileSize: item.file_size,
    fileType: item.file_type,
    owner_type: ATTACH_OWNER_TYPE,
    pid: docId,
  });
  await loadAttachments(docId);
  uploadKey.value++;
}
async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) {
  if (!row.file_name || !row.file_path) {
    ElMessage.warning('附件信息不完整，无法下载');
    return;
  }
  try {
    const blob = await downloadCustomerAttachment(row.file_name, row.file_path);
    downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
  } catch (error) {
    console.error('下载销售退货附件失败:', error);
    ElMessage.error('下载附件失败');
  }
}
async function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) {
  const docId = getCurrentDocId();
  if (docId && row.id) {
    await deleteCustomerAttachment(row.id as any);
    ElMessage.success('删除附件成功');
    await loadAttachments(docId);
    return;
  }
  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter(
    (it) =>
      !(
        it.file_name === row.file_name &&
        it.file_path === row.file_path &&
        it.file_size === row.file_size
      ),
  );
  ElMessage.success('删除附件成功');
}
function normalizeCustomerId(v?: string) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}
async function handleCustomerIdChange(v?: any) {
  customerId.value = v;
  await formApi.setValues({ customer_id: normalizeCustomerId(v) as any }, false);
}
async function handleSaleUserIdChange(v?: any) {
  saleUserId.value = v;
  await formApi.setValues({ sale_user_id: v }, false);
}
async function clearSourceOrderBinding() {
  if ((formData.value?.items || []).length > 0) {
    try {
      await ElMessageBox.confirm('清空来源单会同时清空当前已导入的来源明细，是否继续？', '提示', { type: 'warning' });
    } catch {
      return;
    }
  }
  formData.value.order_id = undefined;
  formData.value.order_no = undefined;
  formData.value.warehouse_id = undefined;
  formData.value.items = [];
  formApi.setValues({ order_id: undefined, order_no: undefined, warehouse_id: undefined, items: [], total_count: 0, total_product_price: 0, total_tax_price: 0, total_price: 0 }, false);
}
const getTitle = computed(() =>
  formType.value === 'create'
    ? $t('ui.actionTitle.create', ['销售退货'])
    : formType.value === 'edit'
      ? $t('ui.actionTitle.edit', ['销售退货'])
      : '销售退货详情',
);
const groupOptions = computed(() => {
  const items = Array.isArray(formData.value?.items) ? formData.value?.items : [];
  const map = new Map<string, { warehouseId: string; warehouseName?: string; count: number }>();
  for (const item of items) {
    const warehouseId = String((item as any)?.warehouse_id || '');
    if (!warehouseId) continue;
    const warehouseName = warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name || (item as any)?.warehouse_name || warehouseId;
    const current = map.get(warehouseId);
    map.set(warehouseId, { warehouseId, warehouseName, count: (current?.count || 0) + 1 });
  }
  return [...map.values()];
});
const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema(formType.value, formData.value),
  showDefaultActions: false,
  handleValuesChange: (values, changedFields) => {
    if (formData.value) {
      if (changedFields.includes('other_price')) formData.value.other_price = values.other_price;
      if (changedFields.includes('discount_percent'))
        formData.value.discount_percent = values.discount_percent;
    }
  },
});
watch(
  [formType, formData],
  () => {
    formApi.updateSchema(useFormSchema(formType.value, formData.value));
  },
  { deep: true },
);
function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}
function handleUpdateItems(items: ErpSaleReturnApi.SaleReturnItem[]) {
  formData.value.items = items;
  formApi.setValues({ items });
}
function handleUpdateOtherPrice(otherPrice: number) {
  formApi.setValues({ other_price: otherPrice });
}
function handleUpdateDiscountPrice(discountPrice: number) {
  formApi.setValues({ discount_price: discountPrice });
}
function handleUpdateTotalPrice(totalPrice: number) {
  formData.value.total_price = totalPrice;
  formApi.setValues({ total_price: totalPrice });
}
function handleUpdateTotalCount(totalCount: number) {
  formApi.setValues({ total_count: totalCount });
}
function handleUpdateTotalProductPrice(totalProductPrice: number) {
  formApi.setValues({ total_product_price: totalProductPrice });
}
function handleUpdateTotalTaxPrice(totalTaxPrice: number) {
  formApi.setValues({ total_tax_price: totalTaxPrice });
}
const toPercentNumber = (v: null | number | string | undefined) => {
  if (v === null) return null;
  const n = Number.parseFloat(String(v).trim().replace('%', ''));
  return Number.isFinite(n) ? n : null;
};
async function handlePrefillFromSaleOrder(sourceOrder: ErpSaleOrderApi.SaleOrder) {
  const o = sourceOrder as any;
  const accountList = await getAccountSimpleList();
  const defaultAccount = accountList.find((item: any) => item.default_status || item.defaultStatus);
  const mappedItems = (Array.isArray(o.items) ? o.items : []).map((item: any) => {
    const count = Number(item.count || 0);
    const returnCount = Number(item.return_count || item.returnCount || 0);
    const remainCount = Math.max(count - returnCount, 0);
    return {
      ...item,
      id: undefined,
      total_count: count,
      count: remainCount,
      out_count: item.out_count ?? item.outCount ?? 0,
      return_count: returnCount,
      order_item_id: item.id ?? item.rowid,
      warehouse_id: item.warehouse_id,
      product_id: item.product_id ?? item.productId,
      product_bar_code: item.product_bar_code ?? item.productBarCode,
      product_unit_name: item.product_unit_name ?? item.productUnitName,
      product_unit_id: item.product_unit_id ?? item.productUnitId,
      product_price: item.product_price ?? item.productPrice,
      total_product_price: item.total_product_price ?? item.totalProductPrice,
      tax_percent: toPercentNumber(item.tax_percent ?? item.taxPercent),
      tax_price: item.tax_price ?? item.taxPrice,
      total_price: item.total_price ?? item.totalPrice,
      stock_count: item.stock_count ?? item.stockCount,
    };
  });
  formData.value = {
    ...formData.value,
    order_id: o.id,
    order_no: o.no,
    customer_id: o.customer_id,
    account_id: o.account_id ?? defaultAccount?.id ?? defaultAccount?.rowid,
    sale_user_id: o.sale_user_id,
    remark: formData.value.remark || o.remark,
    return_time: formData.value?.return_time || getCurrentTimestamp(),
    total_count: mappedItems.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0),
    total_product_price: mappedItems.reduce((sum: number, item: any) => sum + Number(item.total_product_price || 0), 0),
    total_tax_price: mappedItems.reduce((sum: number, item: any) => sum + Number(item.tax_price || 0), 0),
    total_price: mappedItems.reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0),
    items: mappedItems,
  };
  attachments.value = [];
  draftAttachments.value = [];
  uploadKey.value++;
  await formApi.setValues(formData.value, false);
  customerId.value = formData.value.customer_id ? String(formData.value.customer_id) : undefined;
  saleUserId.value = formData.value.sale_user_id ? String(formData.value.sale_user_id) : undefined;
}
async function persistDraftAttachments(docId: string | number) {
  if (!draftAttachments.value.length) return;
  await Promise.all(
    draftAttachments.value.map((it) =>
      createCustomerAttachment(docId, {
        fileName: it.file_name,
        file_path: it.file_path,
        fileSize: it.file_size,
        fileType: it.file_type,
        owner_type: ATTACH_OWNER_TYPE,
        pid: docId,
      }),
    ),
  );
  draftAttachments.value = [];
  await loadAttachments(docId);
}

function getOverLimitRows() {
  const items = Array.isArray(formData.value?.items) ? formData.value.items : [];
  return items.filter((item: any) => {
    if (!item?.order_item_id) return false;
    const totalCount = Number(item?.total_count || 0);
    const returnedCount = Number(item?.return_count || item?.returnCount || 0);
    const remainCount = Math.max(totalCount - returnedCount, 0);
    return Number(item?.count || 0) > remainCount;
  });
}

async function notifyOverLimitIfNeeded() {
  const rows = getOverLimitRows();
  if (rows.length === 0) return;
  await ElMessageBox.alert(
    `当前有 ${rows.length} 行退货数量超过来源单剩余可退数量。系统允许保存，但该单据必须走审批确认。`,
    '超量退货提醒',
    { type: 'warning' },
  );
}

async function handleGenerateReturnInDocument() {
  const sourceReturn = formData.value || ((await getSaleReturn(modalApi.getData<{ id?: string; type: string }>()?.id || '')) as any);
  if (!sourceReturn?.id) {
    ElMessage.warning('未获取到销售退货数据');
    return;
  }
  if (warehouseOptions.value.length === 0) {
    warehouseOptions.value = await getWarehouseSimpleList();
  }
  const groupedWarehouseIds = [...new Set((sourceReturn.items || []).map((item: any) => String(item?.warehouse_id || '')).filter(Boolean))];
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('当前退货单明细还未分配仓库，无法生成销售退货入库单');
    return;
  }
  if (groupedWarehouseIds.length === 1) {
    selectedGroupWarehouseId.value = groupedWarehouseIds[0];
    await openSaleReturnInCreateWithSelectedWarehouse(sourceReturn);
    return;
  }
  selectedGroupWarehouseId.value = groupedWarehouseIds[0];
  warehouseDialogVisible.value = true;
}
async function openSaleReturnInCreateWithSelectedWarehouse(source?: any) {
  const sourceReturn = source || formData.value;
  if (!sourceReturn?.id || !selectedGroupWarehouseId.value) {
    ElMessage.warning('请先选择仓库');
    return;
  }
  const warehouseId = selectedGroupWarehouseId.value;
  const items = (sourceReturn.items || [])
    .filter((item: any) => String(item?.warehouse_id || '') === warehouseId)
    .map((item: any) => ({
      ...item,
      source_count: Number(item?.count || 0),
      count: Math.max(Number(item?.count || 0) - Number(item?.in_count || 0), 0),
      return_item_id: item.id || item.rowid,
      id: undefined,
    }))
    .filter((item: any) => Number(item.count || 0) > 0);
  if (items.length === 0) {
    ElMessage.warning('该仓库下没有可执行的剩余入库明细');
    return;
  }
  const warehouseName = warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name || (items[0] as any)?.warehouse_name || warehouseId;
  warehouseDialogVisible.value = false;
  saleReturnInModalApi
    .setData({
      type: 'create',
      preloadReturn: {
        returnDoc: sourceReturn,
        warehouseId,
        warehouseName,
        items,
      },
    })
    .open();
}

async function handlePrint() {
  if (!formData.value?.id) return;
  const status = Number(formData.value.status);
  if (status === 30) {
    ElMessage.warning('审核不通过的单据不能打印');
    return;
  }
  if (productList.value.length === 0) productList.value = await getProductSimpleList();
  if (warehouseOptions.value.length === 0) warehouseOptions.value = await getWarehouseSimpleList();
  if (categoryList.value.length === 0) categoryList.value = await getProductCategorySimpleList() as any;
  const accountList = await getAccountSimpleList();
  const account = accountList.find((item: any) => String(item.rowid) === String(formData.value?.account_id));
  const account_name = account?.name || formData.value?.account_name || '';
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'sale-return',
    data: { ...formData.value, account_name },
    companyName,
    previewOnly: status === 10,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseOptions.value,
  });
  if (status === 10) {
    printPreviewHtml.value = html;
    printPreviewVisible.value = true;
    ElMessage.warning('待审批单据仅支持预览，审核通过后才能正式打印');
    return;
  }
  await writePrintHtmlAndPrint(html);
}

async function handleSave() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const itemFormInstance = Array.isArray(itemFormRef.value)
    ? itemFormRef.value[0]
    : itemFormRef.value;
  try {
    itemFormInstance.validate();
  } catch (error: any) {
    ElMessage.error(error.message || '子表单验证失败');
    return;
  }
  await notifyOverLimitIfNeeded();
  modalApi.lock();
  const data = (await formApi.getValues()) as ErpSaleReturnApi.SaleReturn;
  data.remark = formData.value?.remark;
  if (data.return_time) {
    const ts = Number(data.return_time);
    const date = Number.isNaN(ts) ? new Date(data.return_time) : new Date(ts);
    data.return_time = formatDateTime(date);
  }
  if (!data.order_no) {
    data.order_id = undefined as any;
    data.order_no = '' as any;
  }
  try {
    const res: any = await (formType.value === 'create' ? createSaleReturn(data) : updateSaleReturn(data));
    const docId = (formType.value === 'create' ? res?.id : getCurrentDocId()) as any;
    if (docId) {
      formData.value = { ...(formData.value || {}), id: docId } as any;
      await persistDraftAttachments(docId);
    }
    await modalApi.close();
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    modalApi.unlock();
  }
}
const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleSave();
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = {} as ErpSaleReturnApi.SaleReturn;
      customerId.value = undefined;
      saleUserId.value = undefined;
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      selectedGroupWarehouseId.value = '';
      warehouseDialogVisible.value = false;
      return;
    }
    warehouseOptions.value = await getWarehouseSimpleList();
    const data = modalApi.getData<{ id?: string; type: string; sourceOrder?: ErpSaleOrderApi.SaleOrder }>();
    formType.value = data.type;
    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value, formData.value));
    if (data?.type === 'create' && data?.sourceOrder) {
      formData.value = { ...formData.value, return_time: getCurrentTimestamp() as any };
      const accountList = await getAccountSimpleList();
      const defaultAccount = accountList.find((item: any) => item.default_status || item.defaultStatus);
      if (defaultAccount && !(data.sourceOrder as any).account_id)
        await formApi.setValues({ account_id: defaultAccount.id ?? defaultAccount.rowid });
      await handlePrefillFromSaleOrder(data.sourceOrder);
      return;
    }
    if (!data || !data.id) {
      await formApi.setValues({ no: undefined, return_time: getCurrentTimestamp() } as any);
      const accountList = await getAccountSimpleList();
      const defaultAccount = accountList.find((item: any) => item.default_status || item.defaultStatus);
      if (defaultAccount)
        await formApi.setValues({ account_id: defaultAccount.id ?? defaultAccount.rowid });
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getSaleReturn(data.id);
      await formApi.setValues(formData.value, false);
      customerId.value = formData.value?.customer_id ? String(formData.value.customer_id) : undefined;
      saleUserId.value = formData.value?.sale_user_id ? String(formData.value.sale_user_id) : undefined;
      await loadAttachments(data.id);
      draftAttachments.value = [];
      uploadKey.value++;
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[70%]" content-class="pt-0" :footer="formType === 'detail'" :show-confirm-button="false" :show-cancel-button="false" :close-on-click-modal="false">
    <SaleReturnInModal @success="emit('success')" />
    <div
      v-if="formType !== 'detail'"
      class="lead-form-actions"
    >
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSave">确认</ElButton>
    </div>
    <Form class="mx-3">
      <template #customer_id>
        <CustomerPicker :model-value="customerId" placeholder="请选择客户" :disabled="formType === 'detail' || isPer('fd:edit', 'customer_id', formType)" @update:model-value="handleCustomerIdChange" />
      </template>
      <template #sale_user_id>
        <StaffPicker :model-value="saleUserId" placeholder="请选择销售人员" :disabled="formType === 'detail' || isPer('fd:edit', 'sale_user_id', formType)" @update:model-value="handleSaleUserIdChange" />
      </template>
      <template #warehouse_id>
        <ElSelect :model-value="formData?.warehouse_id" disabled placeholder="有来源单时由明细仓库自动带出；无源时在明细行里手工维护" filterable class="w-full">
          <ElOption v-for="item in warehouseOptions" :key="item.rowid" :label="item.name" :value="item.rowid" />
        </ElSelect>
      </template>
      <template #items>
        <ItemForm ref="itemFormRef" :items="formData?.items ?? []" :disabled="formType === 'detail'" :discount-percent="formData?.discount_percent ?? 0" :other-price="formData?.other_price ?? 0" :source-order-id="formData?.order_id" @update:items="handleUpdateItems" @update:discount-price="handleUpdateDiscountPrice" @update:other-price="handleUpdateOtherPrice" @update:total-price="handleUpdateTotalPrice" @update:total-count="handleUpdateTotalCount" @update:total-product-price="handleUpdateTotalProductPrice" @update:total-tax-price="handleUpdateTotalTaxPrice" />
      </template>
      <template #order_no>
        <div class="flex gap-2">
          <div class="flex-1">
            <SaleOrderSelect :order-no="formData?.order_no" :disabled="formType === 'detail' || isPer('fd:edit', 'order_no', formType)" @update:order="handlePrefillFromSaleOrder" />
          </div>
          <ElButton v-if="formType !== 'detail'" @click="clearSourceOrderBinding">清空来源</ElButton>
        </div>
      </template>
    </Form>
    <div class="mx-3 mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="m-0">附件</h4>
        <FileUpload v-if="formType !== 'detail'" :key="uploadKey" :model-value="[]" :api="uploadCustomerAttachment" :limit="1" :file-size="10" :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']" :is-show-tip="false" :show-file-list="false" button-text="上传" @success="handleAttachmentUploadSuccess" />
      </div>
      <div v-if="formType !== 'detail'" class="mb-2 text-xs text-[#999]">此处附件最大不能超过 10MB</div>
      <ElTable v-if="attachments.length > 0" :data="attachments" :style="{ width: '100%' }" size="small"><ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip /><ElTableColumn label="文件大小" min-width="120"><template #default="{ row }">{{ formatAttachmentSize(row.file_size) }}</template></ElTableColumn><ElTableColumn prop="file_type" label="文件类型" min-width="100" /><ElTableColumn label="操作" width="140" fixed="right"><template #default="{ row, $index }"><ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink><ElLink class="ml-2" type="danger" :disabled="formType === 'detail'" @click="handleDeleteAttachment(row, $index)">删除</ElLink></template></ElTableColumn></ElTable><div v-else class="py-8 text-center text-[#999]">暂无附件</div>
    </div>

    <div class="mx-3 mt-4">
      <div class="mb-1 text-sm font-medium">备注</div>
      <ElInput
        :model-value="formData?.remark"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        placeholder="请输入备注"
        :disabled="formType === 'detail'"
        @update:model-value="handleRemarkChange"
      />
    </div>

    <template v-if="formType === 'detail'" #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <ElButton type="primary" @click="handlePrint">{{ Number(formData?.status) === 10 ? '打印预览' : '打印' }}</ElButton>
          <ElButton type="primary" @click="handleGenerateReturnInDocument">生成退货入库单</ElButton>
        </div>
        <div class="flex items-center gap-2">
          <ElButton @click="modalApi.close()">取消</ElButton>
        </div>
      </div>
    </template>
  </Modal>

  <ElDialog v-model="warehouseDialogVisible" title="请选择本次执行仓库" width="520px" :close-on-click-modal="false">
    <div class="mb-3 text-sm text-[#666]">当前退货单中的产品分布在多个仓库，请选择本次要执行的仓库，系统将只导入该仓库下的产品。</div>
    <ElRadioGroup v-model="selectedGroupWarehouseId" class="flex w-full flex-col gap-3">
      <ElRadio v-for="item in groupOptions" :key="item.warehouseId" :label="item.warehouseId">{{ item.warehouseName }}（{{ item.count }} 行）</ElRadio>
    </ElRadioGroup>
    <template #footer>
      <ElButton @click="warehouseDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="openSaleReturnInCreateWithSelectedWarehouse()">确认生成该仓库退货入库单</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    v-model="printPreviewVisible"
    title="打印预览"
    width="980px"
    :close-on-click-modal="false"
  >
    <div class="mb-2 text-sm text-[#666]">待审批单据仅支持预览，审核通过后才能正式打印。</div>
    <iframe class="h-[520px] w-full border" :srcdoc="printPreviewHtml"></iframe>
    <template #footer>
      <ElButton type="primary" @click="printPreviewVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.lead-form-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 0;
  background: #fff;
}
</style>
