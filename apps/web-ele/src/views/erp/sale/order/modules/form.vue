<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { useUserStore } from '@vben/stores';
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
import { createSaleOrder, getSaleOrder, updateSaleOrder } from '#/api/erp/sale/order';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';
import FileUpload from '#/components/upload/file-upload.vue';
import PurchaseOrderForm from '#/views/erp/purchase/order/modules/form.vue';
import SaleOutForm from '#/views/erp/sale/out/modules/form.vue';
import SaleReturnForm from '#/views/erp/sale/return/modules/form.vue';
import { CustomerPicker } from '#/components/customer-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useFormSchema } from '../data';
import ItemForm from './item-form.vue';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElLink,
  ElMessage,
  ElRadio,
  ElRadioGroup,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = '销售订单';
const emit = defineEmits(['success']);
const formData = ref<ErpSaleOrderApi.SaleOrder>();
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const { hasFieldPermission } = useDataTablePermission();
function isPer(perm: 'fd:edit' | 'fd:show', field: string, type?: string) {
  if (type === 'create') return false;
  if (!formData.value) return false;
  return Boolean(hasFieldPermission(formData.value, perm, field));
}
const customerId = ref<string | undefined>();
const saleUserId = ref<string | undefined>();
const saving = ref(false);
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const warehouseOptions = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const warehouseDialogVisible = ref(false);
const selectedGroupWarehouseId = ref('');
const userStore = useUserStore();

const getCurrentDate = () => new Date().toLocaleDateString('sv-SE');

function normalizeDateOnly(value: any) {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    if (/^\d+$/.test(trimmed)) {
      return new Date(Number(trimmed)).toLocaleDateString('sv-SE');
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('sv-SE');
}

function getCurrentLoginStaffId() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  const candidate =
    raw.ROWID ||
    raw.rowid ||
    raw.UserID ||
    raw.userId ||
    raw.ID ||
    info.ROWID ||
    info.rowid ||
    info.userId ||
    info.id ||
    '';
  const text = String(candidate || '').trim();
  return text || undefined;
}

function getCurrentDocId() { return (formData.value?.id as any) || undefined; }
async function loadAttachments(docId?: string | number) { if (!docId) { attachments.value = []; return; } try { attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE); } catch (error) { console.error('加载销售订单附件失败:', error); attachments.value = []; } }
function formatAttachmentSize(size?: number) { if (!size || size <= 0) return '-'; if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`; return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`; }
function toAttachmentItem(payload: FileUploadSuccessPayload): CrmCustomerApi.Attachment { const fileName = payload?.fileName || ''; return { file_name: fileName, file_path: payload?.filePath || '', file_size: payload?.fileSize || 0, file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '', owner_type: ATTACH_OWNER_TYPE }; }
async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) { const docId = getCurrentDocId(); const item = toAttachmentItem(payload); if (!docId) { draftAttachments.value.push(item); attachments.value.push(item); uploadKey.value++; return; } await createCustomerAttachment(docId, { fileName: item.file_name, file_path: item.file_path, fileSize: item.file_size, fileType: item.file_type, owner_type: ATTACH_OWNER_TYPE, pid: docId }); await loadAttachments(docId); uploadKey.value++; }
async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) { if (!row.file_name || !row.file_path) { ElMessage.warning('附件信息不完整，无法下载'); return; } try { const blob = await downloadCustomerAttachment(row.file_name, row.file_path); downloadFileFromBlobPart({ fileName: row.file_name, source: blob }); } catch (error) { console.error('下载销售订单附件失败:', error); ElMessage.error('下载附件失败'); } }
async function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) { const docId = getCurrentDocId(); if (docId && row.id) { await deleteCustomerAttachment(row.id as any); ElMessage.success('删除附件成功'); await loadAttachments(docId); return; } attachments.value.splice(index, 1); draftAttachments.value = draftAttachments.value.filter((it) => !(it.file_name === row.file_name && it.file_path === row.file_path && it.file_size === row.file_size)); ElMessage.success('删除附件成功'); }

function normalizeCustomerId(v?: string) { if (!v) return undefined; const n = Number(v); return Number.isFinite(n) ? n : v; }
async function handleCustomerIdChange(v?: string) { customerId.value = v; await formApi.setValues({ customer_id: normalizeCustomerId(v) as any }, false); }
async function handleSaleUserIdChange(v?: string) { saleUserId.value = v; await formApi.setValues({ sale_user_id: v }, false); }
function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}

const getTitle = computed(() => formType.value === 'create' ? $t('ui.actionTitle.create', ['销售订单']) : formType.value === 'edit' ? $t('ui.actionTitle.edit', ['销售订单']) : '销售订单详情');
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

const [SaleReturnModal, saleReturnModalApi] = useVbenModal({ connectedComponent: SaleReturnForm, destroyOnClose: true });
const [PurchaseOrderModal, purchaseOrderModalApi] = useVbenModal({ connectedComponent: PurchaseOrderForm, destroyOnClose: true });
const [SaleOutModal, saleOutModalApi] = useVbenModal({ connectedComponent: SaleOutForm, destroyOnClose: true });
const [Form, formApi] = useVbenForm({ commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 }, wrapperClass: 'grid-cols-3', layout: 'vertical', schema: useFormSchema(formType.value, formData.value), showDefaultActions: false, handleValuesChange: (values, changedFields) => { if (formData.value && changedFields.includes('discount_percent')) formData.value.discount_percent = values.discount_percent; } });

function handleUpdateItems(items: ErpSaleOrderApi.SaleOrderItem[]) { formData.value = formData.value || (modalApi.getData<ErpSaleOrderApi.SaleOrder>() as ErpSaleOrderApi.SaleOrder); formData.value.items = items; formApi.setValues({ items }); }
function handleUpdateDiscountPrice(discountPrice: number) { formApi.setValues({ discount_price: discountPrice }); }
function handleUpdateTotalPrice(totalPrice: number) { if (formData.value) formData.value.total_price = totalPrice; formApi.setValues({ total_price: totalPrice }); }
function handleUpdateTotalCount(totalCount: any) { formData.value = formData.value || (modalApi.getData<ErpSaleOrderApi.SaleOrder>() as ErpSaleOrderApi.SaleOrder) || ({} as ErpSaleOrderApi.SaleOrder); formData.value.total_count = totalCount.count || 0; formData.value.total_product_price = totalCount.totalProductPrice || 0; formData.value.total_tax_price = totalCount.taxPrice || 0; formData.value.total_price = totalCount.totalPrice || 0; formApi.setValues({ total_count: totalCount.count || 0, total_product_price: totalCount.totalProductPrice || 0, total_tax_price: totalCount.taxPrice || 0, total_price: totalCount.totalPrice || 0 }); }
function toNumber(v: unknown) { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; }
async function handlePrefillFromPurchaseOrder(sourceOrder: ErpPurchaseOrderApi.PurchaseOrder) {
  const o = sourceOrder as any; const accountList = await getAccountSimpleList(); const defaultAccount = accountList.find((item: any) => item.default_status || item.defaultStatus);
  const mappedItems = (Array.isArray(o.items) ? o.items : []).filter((item: any) => toNumber(item?.count) > 0).map((item: any) => { const count = toNumber(item?.count); const productPrice = toNumber(item?.product_price ?? item?.productPrice); const totalProductPrice = toNumber(item?.total_product_price ?? item?.totalProductPrice) || productPrice * count; const taxPercent = toNumber(item?.tax_percent ?? item?.taxPercent); const taxPrice = toNumber(item?.tax_price ?? item?.taxPrice) || totalProductPrice * (taxPercent / 100); const totalPrice = toNumber(item?.total_price ?? item?.totalPrice) || totalProductPrice + taxPrice; return { ...item, id: undefined, rowid: undefined, order_id: undefined, product_id: item?.product_id ?? item?.productId, product_unit_id: item?.product_unit_id ?? item?.productUnitId, product_price: productPrice, count, total_product_price: totalProductPrice, tax_percent: taxPercent, tax_price: taxPrice, total_price: totalPrice, remark: item?.remark, out_count: 0, return_count: 0 } as any; });
  const defaultSaleUserId = getCurrentLoginStaffId();
  formData.value = { ...(formData.value || {}), no: undefined, status: 10, customer_id: o.supplier_id ?? o.supplierId, account_id: o.account_id ?? o.accountId ?? defaultAccount?.rowid ?? defaultAccount?.id, order_time: formData.value?.order_time || getCurrentDate(), remark: o.remark, sale_user_id: formData.value?.sale_user_id || defaultSaleUserId, discount_percent: toNumber(o.discount_percent ?? o.discountPercent), discount_price: toNumber(o.discount_price ?? o.discountPrice), deposit_price: toNumber(o.deposit_price ?? o.depositPrice), total_count: mappedItems.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0), total_product_price: mappedItems.reduce((sum: number, item: any) => sum + Number(item.total_product_price || 0), 0), total_tax_price: mappedItems.reduce((sum: number, item: any) => sum + Number(item.tax_price || 0), 0), total_price: mappedItems.reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0), items: mappedItems as any } as any;
  attachments.value = []; draftAttachments.value = []; uploadKey.value++; await formApi.setValues(formData.value as any, false); customerId.value = formData.value?.customer_id ? String(formData.value.customer_id) : undefined; saleUserId.value = formData.value?.sale_user_id ? String(formData.value.sale_user_id) : undefined;
}
async function persistDraftAttachments(docId: string | number) { if (!draftAttachments.value.length) return; await Promise.all(draftAttachments.value.map((it) => createCustomerAttachment(docId, { fileName: it.file_name, file_path: it.file_path, fileSize: it.file_size, fileType: it.file_type, owner_type: ATTACH_OWNER_TYPE, pid: docId }))); draftAttachments.value = []; await loadAttachments(docId); }
async function handleGenerateOutDocument() {
  const sourceOrder = formData.value || ((await getSaleOrder(modalApi.getData<{ id?: string; type: string }>()?.id || '')) as ErpSaleOrderApi.SaleOrder);
  if (!sourceOrder?.id) { ElMessage.warning('未获取到销售订单数据'); return; }
  if (warehouseOptions.value.length === 0) warehouseOptions.value = await getWarehouseSimpleList();
  const groupedWarehouseIds = [...new Set((sourceOrder.items || []).map((item: any) => String(item?.warehouse_id || '')).filter(Boolean))];
  if (groupedWarehouseIds.length === 0) { ElMessage.warning('当前订单明细还未分配仓库，无法导入销售出库单'); return; }
  if (groupedWarehouseIds.length === 1) { selectedGroupWarehouseId.value = groupedWarehouseIds[0]; await openSaleOutCreateWithSelectedWarehouse(sourceOrder); return; }
  selectedGroupWarehouseId.value = groupedWarehouseIds[0]; warehouseDialogVisible.value = true;
}
async function openSaleOutCreateWithSelectedWarehouse(source?: ErpSaleOrderApi.SaleOrder) {
  const sourceOrder = source || formData.value;
  if (!sourceOrder?.id || !selectedGroupWarehouseId.value) { ElMessage.warning('请先选择仓库'); return; }
  const warehouseId = selectedGroupWarehouseId.value;
  const items = (sourceOrder.items || []).filter((item: any) => String(item?.warehouse_id || '') === warehouseId);
  const warehouseName = warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)?.name || (items[0] as any)?.warehouse_name || warehouseId;
  warehouseDialogVisible.value = false;
  saleOutModalApi.setData({ type: 'create', preloadOrder: { order: sourceOrder, warehouseId, warehouseName, items } }).open();
}
async function handlePrint() {
  const sourceOrder = formData.value || ((await getSaleOrder(modalApi.getData<{ id?: string; type: string }>()?.id || '')) as ErpSaleOrderApi.SaleOrder);
  if (!sourceOrder?.id) {
    ElMessage.warning('未获取到销售订单数据');
    return;
  }
  if (productList.value.length === 0) productList.value = await getProductSimpleList();
  if (warehouseOptions.value.length === 0) warehouseOptions.value = await getWarehouseSimpleList();
  if (categoryList.value.length === 0) categoryList.value = await getProductCategorySimpleList() as any;
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'sale-order',
    data: sourceOrder,
    companyName,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseOptions.value,
  });
  await writePrintHtmlAndPrint(html);
}
async function handleGenerateSaleReturn() { const sourceOrder = formData.value || ((await getSaleOrder(modalApi.getData<{ id?: string; type: string }>()?.id || '')) as ErpSaleOrderApi.SaleOrder); if (!sourceOrder?.id) { ElMessage.warning('未获取到销售订单数据'); return; } saleReturnModalApi.setData({ type: 'create', sourceOrder }).open(); }
async function handleGeneratePurchaseOrder() { const sourceOrder = formData.value || ((await getSaleOrder(modalApi.getData<{ id?: string; type: string }>()?.id || '')) as ErpSaleOrderApi.SaleOrder); if (!sourceOrder?.id) { ElMessage.warning('未获取到销售订单详情'); return; } purchaseOrderModalApi.setData({ type: 'create', sourceOrder }).open(); }
async function handleFooterConfirm() {
  if (formType.value === 'detail') { await modalApi.close(); return; }
  const { valid } = await formApi.validate(); if (!valid) return;
  const itemFormInstance = Array.isArray(itemFormRef.value) ? itemFormRef.value[0] : itemFormRef.value;
  try { itemFormInstance.validate(); } catch (error: any) { ElMessage.error(error.message || '子表单验证失败'); return; }
  saving.value = true; modalApi.lock(); const rawValues = (await formApi.getValues()) as any; const data: any = { ...(formData.value || {}), ...rawValues };
  if (Array.isArray(data.items)) data.items = data.items.map((item: any) => ({ ...item, order_id: undefined }));
  if (data.order_time) { data.order_time = normalizeDateOnly(data.order_time) as any; }
  try { const res: any = await (formType.value === 'create' ? createSaleOrder(data) : updateSaleOrder(data)); const docId = (formType.value === 'create' ? res?.id : getCurrentDocId()) as any; if (docId) { formData.value = { ...(formData.value || {}), id: docId } as any; await persistDraftAttachments(docId); } await modalApi.close(); emit('success'); ElMessage.success($t('ui.actionMessage.operationSuccess')); } finally { modalApi.unlock(); saving.value = false; }
}
async function handleFooterCancel() { await modalApi.close(); }

const [Modal, modalApi] = useVbenModal({
  async onConfirm() { await handleFooterConfirm(); },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) { formData.value = undefined; customerId.value = undefined; saleUserId.value = undefined; attachments.value = []; draftAttachments.value = []; uploadKey.value++; selectedGroupWarehouseId.value = ''; warehouseDialogVisible.value = false; return; }
    const data = modalApi.getData<{ id?: string; type: string; sourceOrder?: ErpPurchaseOrderApi.PurchaseOrder }>();
    formType.value = data.type; formApi.setDisabled(formType.value === 'detail'); formApi.updateSchema(useFormSchema(formType.value, formData.value));
    if (data?.type === 'create' && data?.sourceOrder) { await handlePrefillFromPurchaseOrder(data.sourceOrder); return; }
    if (!data || !data.id) { const defaultOrderTime = getCurrentDate(); const defaultSaleUserId = getCurrentLoginStaffId(); attachments.value = []; draftAttachments.value = []; uploadKey.value++; formData.value = { ...(formData.value || {}), no: undefined, order_time: defaultOrderTime, sale_user_id: defaultSaleUserId } as any; formApi.updateSchema(useFormSchema(formType.value, formData.value)); customerId.value = undefined; saleUserId.value = defaultSaleUserId; await formApi.setValues({ discount_percent: 0, no: undefined, order_time: defaultOrderTime, sale_user_id: defaultSaleUserId } as any, false); const accountList = await getAccountSimpleList(); const defaultAccount = accountList.find((item: any) => item.default_status); if (defaultAccount) await formApi.setValues({ account_id: defaultAccount.rowid, order_time: defaultOrderTime, sale_user_id: defaultSaleUserId } as any, false); return; }
    modalApi.lock(); try { formData.value = await getSaleOrder(data?.id); if (formData.value) { formData.value.order_time = normalizeDateOnly((formData.value as any).order_time) as any; formApi.updateSchema(useFormSchema(formType.value, formData.value)); await formApi.setValues(formData.value); customerId.value = (formData.value as any)?.customer_id ? String((formData.value as any).customer_id) : undefined; saleUserId.value = (formData.value as any)?.sale_user_id ? String((formData.value as any).sale_user_id) : undefined; await loadAttachments(data.id); draftAttachments.value = []; uploadKey.value++; } } finally { modalApi.unlock(); }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[70%]" content-class="pt-0" :footer="formType === 'detail'" :show-confirm-button="false" :show-cancel-button="false" :close-on-click-modal="false">
    <SaleReturnModal @success="emit('success')" />
    <PurchaseOrderModal @success="emit('success')" />
    <SaleOutModal @success="emit('success')" />
    <div
      v-if="formType !== 'detail'"
      class="lead-form-actions"
    >
      <ElButton @click="handleFooterCancel">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="handleFooterConfirm">确认</ElButton>
    </div>
    <Form class="mx-3">
      <template #customer_id><CustomerPicker :model-value="customerId" placeholder="请选择客户" :disabled="formType === 'detail' || isPer('fd:edit', 'customer_id', formType)" @update:model-value="handleCustomerIdChange" /></template>
      <template #sale_user_id><StaffPicker :model-value="saleUserId" placeholder="请选择销售人员" :disabled="formType === 'detail' || isPer('fd:edit', 'sale_user_id', formType)" @update:model-value="handleSaleUserIdChange" /></template>
      <template #items><ItemForm ref="itemFormRef" :items="formData?.items ?? []" :disabled="formType === 'detail'" :discount-percent="formData?.discount_percent ?? 0" @update:items="handleUpdateItems" @update:discount-price="handleUpdateDiscountPrice" @update:total-price="handleUpdateTotalPrice" @update:total-count="handleUpdateTotalCount" /></template>
    </Form>
    <div class="mx-3 mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="m-0">附件</h4>
        <FileUpload v-if="formType !== 'detail'" :key="uploadKey" :model-value="[]" :api="uploadCustomerAttachment" :limit="1" :file-size="10" :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']" :is-show-tip="false" :show-file-list="false" button-text="上传" @success="handleAttachmentUploadSuccess" />
      </div>
      <ElTable empty-text="暂无附件" :data="attachments" style="width: 100%" size="small"><ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip /><ElTableColumn label="文件大小" min-width="120"><template #default="{ row }">{{ formatAttachmentSize(row.file_size) }}</template></ElTableColumn><ElTableColumn prop="file_type" label="文件类型" min-width="100" /><ElTableColumn label="操作" width="140" fixed="right"><template #default="{ row, $index }"><ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink><ElLink class="ml-2" type="danger" :disabled="formType === 'detail'" @click="handleDeleteAttachment(row, $index)">删除</ElLink></template></ElTableColumn></ElTable>
    </div>
    <div class="mx-3 mt-4">
      <div class="mb-1 text-sm font-medium">备注</div>
      <ElInput
        :model-value="formData?.remark"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        placeholder="请输入备注"
        :disabled="formType === 'detail' || isPer('fd:edit', 'remark', formType)"
        @update:model-value="handleRemarkChange"
      />
    </div>

    <template v-if="formType === 'detail'" #footer><div class="flex w-full items-center justify-between"><div class="flex items-center gap-2"><template v-if="formType === 'detail'"><ElButton type="primary" @click="handlePrint">打印</ElButton><ElButton type="primary" @click="handleGenerateOutDocument">生成出库单</ElButton><ElButton type="primary" @click="handleGenerateSaleReturn">生成销售退货单</ElButton><ElButton type="primary" @click="handleGeneratePurchaseOrder">生成采购订单</ElButton></template></div><div class="flex items-center gap-2"><ElButton @click="handleFooterCancel">取消</ElButton><ElButton type="primary" :loading="saving" @click="handleFooterConfirm">确认</ElButton></div></div></template>
  </Modal>

  <ElDialog v-model="warehouseDialogVisible" title="请选择本次执行仓库" width="520px" :close-on-click-modal="false">
    <div class="mb-3 text-sm text-[#666]">当前源单中的产品分布在多个仓库，请选择本次要执行的仓库，系统将只导入该仓库下的产品。</div>
    <ElRadioGroup v-model="selectedGroupWarehouseId" class="flex w-full flex-col gap-3">
      <ElRadio
        v-for="item in groupOptions"
        :key="item.warehouseId"
        :label="item.warehouseId"
        class="!mr-0 flex w-full items-start"
      >
        <span class="whitespace-normal break-all leading-5">
          {{ item.warehouseName }}（{{ item.count }} 行）
        </span>
      </ElRadio>
    </ElRadioGroup>
    <template #footer>
      <ElButton @click="warehouseDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="openSaleOutCreateWithSelectedWarehouse()">确认导入该仓库产品</ElButton>
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
