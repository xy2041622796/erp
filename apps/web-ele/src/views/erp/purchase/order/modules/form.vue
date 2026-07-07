<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDateTime, downloadFileFromBlobPart } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import { CustomerPicker } from '#/components/customer-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import {
  createCustomerAttachment,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  getSupplierSimpleList,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import {
  createPurchaseOrder,
  getPurchaseOrder,
  updatePurchaseOrder,
} from '#/api/erp/purchase/order';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';
import FileUpload from '#/components/upload/file-upload.vue';
import { $t } from '#/locales';
import {
  assertPurchaseInCanGenerate,
  createPurchaseIn,
  getPurchaseInGenerateStatus,
} from '#/api/erp/purchase/in';
import { getSimpleUserList } from '#/api/system/user';
import PurchaseInForm from '#/views/erp/purchase/in/modules/form.vue';
import SaleOrderForm from '#/views/erp/sale/order/modules/form.vue';
import PurchaseReturnForm from '#/views/erp/purchase/return/modules/form.vue';

import { useFormSchema } from '../data';
import PurchaseOrderItemForm from './item-form.vue';

import {
  ElButton,
  ElDialog,
  ElCheckbox,
  ElCheckboxGroup,
  ElInput,
  ElLink,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = '采购订单';
const emit = defineEmits(['success']);
const formData = ref<ErpPurchaseOrderApi.PurchaseOrder>();
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof PurchaseOrderItemForm>>();
const saving = ref(false);
const supplierId = ref<string | undefined>();
const purchaseUserId = ref<string | undefined>();
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const warehouseOptions = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const warehouseDialogVisible = ref(false);
const selectedGroupWarehouseIds = ref<string[]>([]);
const warehouseGenerateStatusMap = ref<Record<string, any>>({});
const batchGenerating = ref(false);
const batchGenerateResultVisible = ref(false);
const batchGenerateResults = ref<any[]>([]);
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

const getTitle = computed(() => {
  if (formType.value === 'create')
    return $t('ui.actionTitle.create', ['采购订单']);
  if (formType.value === 'edit') return $t('ui.actionTitle.edit', ['采购订单']);
  return '采购订单详情';
});

const groupOptions = computed(() => {
  const items = Array.isArray(formData.value?.items)
    ? formData.value?.items
    : [];
  const map = new Map<
    string,
    { warehouseId: string; warehouseName?: string; count: number; status?: any }
  >();
  for (const item of items) {
    const warehouseId = String((item as any)?.warehouse_id || '');
    if (!warehouseId) continue;
    const warehouseName =
      warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)
        ?.name ||
      (item as any)?.warehouse_name ||
      warehouseId;
    const current = map.get(warehouseId);
    map.set(warehouseId, {
      warehouseId,
      warehouseName,
      count: (current?.count || 0) + 1,
    });
  }
  return [...map.values()].map((item) => ({
    ...item,
    status: warehouseGenerateStatusMap.value[item.warehouseId],
  }));
});

function getGenerateStatusText(status?: any) {
  if (!status) return '状态加载中';
  if (status.canGenerate) return `可生成，剩余 ${status.remainingCount ?? 0}`;
  return status.reason || '不可生成';
}

async function refreshWarehouseGenerateStatus(
  sourceOrder: ErpPurchaseOrderApi.PurchaseOrder,
) {
  const ids = [
    ...new Set(
      (sourceOrder.items || [])
        .map((item: any) => String(item?.warehouse_id || ''))
        .filter(Boolean),
    ),
  ];
  const entries = await Promise.all(
    ids.map(async (warehouseId) => [
      warehouseId,
      await getPurchaseInGenerateStatus(sourceOrder.id, warehouseId),
    ]),
  );
  warehouseGenerateStatusMap.value = Object.fromEntries(entries);
}

const [PurchaseReturnModal, purchaseReturnModalApi] = useVbenModal({
  connectedComponent: PurchaseReturnForm,
  destroyOnClose: true,
});
const [SaleOrderModal, saleOrderModalApi] = useVbenModal({
  connectedComponent: SaleOrderForm,
  destroyOnClose: true,
});
const [PurchaseInModal, purchaseInModalApi] = useVbenModal({
  connectedComponent: PurchaseInForm,
  destroyOnClose: true,
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema(formType.value),
  showDefaultActions: false,
  handleValuesChange: (values, changedFields) => {
    if (formData.value && changedFields.includes('discount_percent')) {
      formData.value.discount_percent = values.discount_percent;
    }
  },
});

async function handleSupplierIdChange(v?: string) {
  supplierId.value = v;
  await formApi.setValues({ supplier_id: v }, false);
}

async function handlePurchaseUserIdChange(v?: string) {
  purchaseUserId.value = v;
  await formApi.setValues({ purchase_user_id: v }, false);
}

function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}

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
    console.error('加载采购订单附件失败:', error);
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

function toAttachmentItem(
  payload: FileUploadSuccessPayload,
): CrmCustomerApi.Attachment {
  const fileName = payload?.fileName || '';
  return {
    file_name: fileName,
    file_path: payload?.filePath || '',
    file_size: payload?.fileSize || 0,
    file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '',
    owner_type: ATTACH_OWNER_TYPE,
  };
}

async function handleAttachmentUploadSuccess(
  payload: FileUploadSuccessPayload,
) {
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
    console.error('下载采购订单附件失败:', error);
    ElMessage.error('下载附件失败');
  }
}

async function handleDeleteAttachment(
  row: CrmCustomerApi.Attachment,
  index: number,
) {
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

function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function handlePrefillFromSaleOrder(
  sourceOrder: ErpSaleOrderApi.SaleOrder,
) {
  const o = sourceOrder as any;
  const accountList = await getAccountSimpleList();
  const defaultAccount = accountList.find(
    (item: any) => item.default_status || item.defaultStatus,
  );
  const defaultPurchaseUserId = getCurrentLoginStaffId();

  const mappedItems = (Array.isArray(o.items) ? o.items : [])
    .filter((item: any) => toNumber(item?.count) > 0)
    .map((item: any) => {
      const count = toNumber(item?.count);
      const productPrice = toNumber(item?.product_price ?? item?.productPrice);
      const totalProductPrice =
        toNumber(item?.total_product_price ?? item?.totalProductPrice) ||
        productPrice * count;
      const taxPercent = toNumber(item?.tax_percent ?? item?.taxPercent);
      const taxPrice =
        toNumber(item?.tax_price ?? item?.taxPrice) ||
        totalProductPrice * (taxPercent / 100);
      const totalPrice =
        toNumber(item?.total_price ?? item?.totalPrice) ||
        totalProductPrice + taxPrice;
      return {
        ...item,
        id: undefined,
        rowid: undefined,
        product_id: item?.product_id ?? item?.productId,
        product_unit_id: item?.product_unit_id ?? item?.productUnitId,
        product_price: productPrice,
        count,
        total_product_price: totalProductPrice,
        tax_percent: taxPercent,
        tax_price: taxPrice,
        total_price: totalPrice,
        remark: item?.remark,
      } as any;
    });

  formData.value = {
    ...(formData.value || {}),
    no: undefined,
    supplier_id: o.customer_id ?? o.customerId,
    purchase_user_id:
      (formData.value as any)?.purchase_user_id || defaultPurchaseUserId,
    account_id:
      o.account_id ??
      o.accountId ??
      defaultAccount?.rowid ??
      defaultAccount?.id,
    order_time: formData.value?.order_time || getCurrentDate(),
    remark: o.remark,
    discount_percent: toNumber(o.discount_percent ?? o.discountPercent),
    discount_price: toNumber(o.discount_price ?? o.discountPrice),
    deposit_price: toNumber(o.deposit_price ?? o.depositPrice),
    total_count: mappedItems.reduce(
      (sum: number, item: any) => sum + Number(item.count || 0),
      0,
    ),
    total_product_price: mappedItems.reduce(
      (sum: number, item: any) => sum + Number(item.total_product_price || 0),
      0,
    ),
    total_tax_price: mappedItems.reduce(
      (sum: number, item: any) => sum + Number(item.tax_price || 0),
      0,
    ),
    total_price: mappedItems.reduce(
      (sum: number, item: any) => sum + Number(item.total_price || 0),
      0,
    ),
    items: mappedItems as any,
  } as any;

  supplierId.value = formData.value?.supplier_id
    ? String(formData.value.supplier_id)
    : undefined;
  purchaseUserId.value = (formData.value as any)?.purchase_user_id
    ? String((formData.value as any).purchase_user_id)
    : undefined;
  attachments.value = [];
  draftAttachments.value = [];
  uploadKey.value++;
  await formApi.setValues(formData.value as any, false);
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

async function handleConfirm() {
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

  saving.value = true;
  modalApi.lock();
  const data = (await formApi.getValues()) as ErpPurchaseOrderApi.PurchaseOrder;
  data.remark = formData.value?.remark;
  data.items =
    formType.value === 'create'
      ? formData.value?.items?.map((item) => ({ ...item, id: undefined }))
      : formData.value?.items?.map((item) => ({
          ...item,
          seq: undefined,
          product_bar_code: undefined,
          product_unit_name: undefined,
          product_name: undefined,
          stockCount: undefined,
          stock_count: undefined,
        }));

  if (data.order_time) {
    data.order_time = normalizeDateOnly(data.order_time) as any;
  }

  try {
    const res: any = await (formType.value === 'create'
      ? createPurchaseOrder(data)
      : updatePurchaseOrder(data));
    const docId = (
      formType.value === 'create' ? res?.id : getCurrentDocId()
    ) as any;
    if (docId) {
      formData.value = { ...(formData.value || {}), id: docId } as any;
      await persistDraftAttachments(docId);
    }
    await modalApi.close();
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    modalApi.unlock();
    saving.value = false;
  }
}

async function handlePrint() {
  const sourceOrder =
    formData.value ||
    ((await getPurchaseOrder(
      modalApi.getData<{ id?: string; type: string }>()?.id || '',
    )) as ErpPurchaseOrderApi.PurchaseOrder);
  if (!sourceOrder?.id) {
    ElMessage.warning('未获取到采购订单数据');
    return;
  }
  if (productList.value.length === 0)
    productList.value = await getProductSimpleList();
  if (warehouseOptions.value.length === 0)
    warehouseOptions.value = await getWarehouseSimpleList();
  if (categoryList.value.length === 0)
    categoryList.value = await getProductCategorySimpleList();
  const [suppliers, users] = await Promise.all([
    getSupplierSimpleList(),
    getSimpleUserList(),
  ]);
  const supplier = suppliers.find(
    (item: any) => String(item?.rowid) === String(sourceOrder.supplier_id),
  );
  const printData = {
    ...sourceOrder,
    _supplier_name: supplier?.name || sourceOrder.supplier_id,
    contactName:
      supplier?.contact_name ||
      supplier?.contactName ||
      (sourceOrder as any).contactName,
    contactPhone:
      supplier?.contact_phone ||
      supplier?.contactPhone ||
      supplier?.telephone ||
      supplier?.mobile ||
      (sourceOrder as any).contactPhone,
    address: supplier?.address || (sourceOrder as any).address,
    _purchase_user_name:
      users.find(
        (item: any) =>
          String(item?.ROWID) === String(sourceOrder.purchase_user_id),
      )?.UserName || sourceOrder.purchase_user_id,
  };
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'purchase-order',
    data: printData,
    companyName,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseOptions.value,
  });
  await writePrintHtmlAndPrint(html);
}

async function handleGenerateInDocument() {
  const sourceOrder =
    formData.value ||
    ((await getPurchaseOrder(
      modalApi.getData<{ id?: string; type: string }>()?.id || '',
    )) as ErpPurchaseOrderApi.PurchaseOrder);
  if (!sourceOrder?.id) {
    ElMessage.warning('未获取到采购订单数据');
    return;
  }
  if (warehouseOptions.value.length === 0) {
    warehouseOptions.value = await getWarehouseSimpleList();
  }
  const groupedWarehouseIds = [
    ...new Set(
      (sourceOrder.items || [])
        .map((item: any) => String(item?.warehouse_id || ''))
        .filter(Boolean),
    ),
  ];
  if (groupedWarehouseIds.length === 0) {
    ElMessage.warning('当前订单明细还未分配仓库，无法导入采购入库单');
    return;
  }
  await refreshWarehouseGenerateStatus(sourceOrder);
  selectedGroupWarehouseIds.value = groupedWarehouseIds.filter(
    (id) => warehouseGenerateStatusMap.value[id]?.canGenerate,
  );
  if (selectedGroupWarehouseIds.value.length === 0) {
    ElMessage.warning('当前订单没有可生成采购入库单的仓库');
  }
  warehouseDialogVisible.value = true;
}

function getWarehouseItems(
  sourceOrder: ErpPurchaseOrderApi.PurchaseOrder,
  warehouseId: string,
) {
  return (sourceOrder.items || [])
    .filter((item: any) => String(item?.warehouse_id || '') === warehouseId)
    .map((item: any) => {
      const totalCount = toNumber(item.count);
      const inCount = toNumber(item.inCount ?? item.in_count);
      const remainCount = Math.max(totalCount - inCount, 0);
      return {
        ...item,
        total_count: totalCount,
        count: remainCount > 0 ? remainCount : totalCount,
        order_item_id: item.id,
        id: undefined,
        warehouse_id: warehouseId,
        warehouse_name:
          warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)
            ?.name ||
          item?.warehouse_name ||
          warehouseId,
      };
    })
    .filter((item: any) => toNumber(item.count) > 0);
}

async function handleBatchGeneratePurchaseIn() {
  const sourceOrder = formData.value;
  if (!sourceOrder?.id) {
    ElMessage.warning('未获取到采购订单数据');
    return;
  }
  if (selectedGroupWarehouseIds.value.length === 0) {
    ElMessage.warning('请至少选择一个可生成仓库');
    return;
  }
  batchGenerating.value = true;
  batchGenerateResults.value = [];
  try {
    const results: any[] = [];
    for (const warehouseId of selectedGroupWarehouseIds.value) {
      const warehouseName =
        warehouseOptions.value.find((w) => String(w.rowid) === warehouseId)
          ?.name || warehouseId;
      try {
        await assertPurchaseInCanGenerate(sourceOrder.id, warehouseId);
        const items = getWarehouseItems(sourceOrder, warehouseId);
        if (items.length === 0) throw new Error('该仓库没有可生成的产品明细');
        const res: any = await createPurchaseIn({
          order_id: sourceOrder.id,
          order_no: sourceOrder.no,
          supplier_id: sourceOrder.supplier_id,
          warehouse_id: warehouseId,
          warehouse_name: warehouseName,
          warehouse_inbound: warehouseName,
          in_time: formatDateTime(new Date()),
          remark: sourceOrder.remark,
          total_count: items.reduce(
            (sum: number, item: any) => sum + toNumber(item.count),
            0,
          ),
          status: 10,
          items,
        } as any);
        results.push({
          warehouseId,
          warehouseName,
          success: true,
          no: res?.no,
          id: res?.id,
        });
      } catch (error: any) {
        results.push({
          warehouseId,
          warehouseName,
          success: false,
          message: error?.message || '生成失败',
        });
      }
    }
    batchGenerateResults.value = results;
    warehouseDialogVisible.value = false;
    batchGenerateResultVisible.value = true;
    await refreshWarehouseGenerateStatus(sourceOrder);
    emit('success');
  } finally {
    batchGenerating.value = false;
  }
}

async function handleGeneratePurchaseReturn() {
  const sourceOrder =
    formData.value ||
    ((await getPurchaseOrder(
      modalApi.getData<{ id?: string; type: string }>()?.id || '',
    )) as ErpPurchaseOrderApi.PurchaseOrder);
  if (!sourceOrder?.id) {
    ElMessage.warning('未获取到采购订单数据');
    return;
  }
  purchaseReturnModalApi.setData({ type: 'create', sourceOrder }).open();
}

async function handleGenerateSaleOrder() {
  const sourceOrder =
    formData.value ||
    ((await getPurchaseOrder(
      modalApi.getData<{ id?: string; type: string }>()?.id || '',
    )) as ErpPurchaseOrderApi.PurchaseOrder);
  if (!sourceOrder?.id) {
    ElMessage.warning('未获取到采购订单数据');
    return;
  }
  saleOrderModalApi.setData({ type: 'create', sourceOrder }).open();
}

function handleUpdateItems(items: ErpPurchaseOrderApi.PurchaseOrderItem[]) {
  formData.value =
    formData.value ||
    (modalApi.getData<ErpPurchaseOrderApi.PurchaseOrder>() as ErpPurchaseOrderApi.PurchaseOrder);
  formData.value.items = items;
  formApi.setValues({ items });
}
function handleUpdateDiscountPrice(discountPrice: number) {
  formApi.setValues({ discount_price: discountPrice });
}
function handleUpdateTotalPrice(totalPrice: number) {
  formApi.setValues({ total_price: totalPrice });
}
function handleUpdateProductName(productName: number) {
  formApi.setValues({ product_name: productName });
}
function handleUpdateProductCount(count: number) {
  formApi.setValues({ total_count: count });
}
function handleUpdatetotalProductPrice(totalProductPrice: number) {
  formApi.setValues({ total_product_price: totalProductPrice });
}

async function handleFooterConfirm() {
  if (formType.value === 'detail') {
    await modalApi.close();
    return;
  }
  await handleConfirm();
}
async function handleFooterCancel() {
  await modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleFooterConfirm();
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      supplierId.value = undefined;
      purchaseUserId.value = undefined;
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      selectedGroupWarehouseIds.value = [];
      warehouseGenerateStatusMap.value = {};
      warehouseDialogVisible.value = false;
      batchGenerating.value = false;
      batchGenerateResultVisible.value = false;
      batchGenerateResults.value = [];
      return;
    }
    const data = modalApi.getData<{
      id?: string;
      type: string;
      sourceOrder?: ErpSaleOrderApi.SaleOrder;
    }>();
    formType.value = data.type;
    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));

    if (data?.type === 'create' && data?.sourceOrder) {
      await handlePrefillFromSaleOrder(data.sourceOrder);
      return;
    }

    if (!data || !data.id) {
      const defaultOrderTime = getCurrentDate();
      const defaultPurchaseUserId = getCurrentLoginStaffId();
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      formData.value = {
        ...(formData.value || {}),
        no: undefined,
        order_time: defaultOrderTime,
        purchase_user_id: defaultPurchaseUserId,
      } as any;
      supplierId.value = undefined;
      purchaseUserId.value = defaultPurchaseUserId;
      const accountList = await getAccountSimpleList();
      const defaultAccount = accountList.find((item) => item.default_status);
      if (defaultAccount) {
        await formApi.setValues(
          {
            account_id: defaultAccount.id,
            order_time: defaultOrderTime,
            purchase_user_id: defaultPurchaseUserId,
          } as any,
          false,
        );
      } else {
        await formApi.setValues(
          {
            order_time: defaultOrderTime,
            purchase_user_id: defaultPurchaseUserId,
          } as any,
          false,
        );
      }
      return;
    }

    modalApi.lock();
    try {
      formData.value = await getPurchaseOrder(data.id);
      if (formData.value) {
        formData.value.order_time = normalizeDateOnly(
          (formData.value as any).order_time,
        ) as any;
      }
      supplierId.value = formData.value?.supplier_id
        ? String(formData.value.supplier_id)
        : undefined;
      purchaseUserId.value = (formData.value as any)?.purchase_user_id
        ? String((formData.value as any).purchase_user_id)
        : undefined;
      await formApi.setValues(formData.value!);
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
  <Modal
    :title="getTitle"
    class="w-[70%]"
    content-class="pt-0"
    :footer="formType === 'detail'"
    :show-confirm-button="false"
    :show-cancel-button="false"
    :close-on-click-modal="false"
  >
    <PurchaseReturnModal @success="emit('success')" />
    <SaleOrderModal @success="emit('success')" />
    <PurchaseInModal @success="emit('success')" />
    <div v-if="formType !== 'detail'" class="lead-form-actions">
      <ElButton @click="handleFooterCancel">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="handleFooterConfirm"
        >保存</ElButton
      >
    </div>
    <Form class="mx-3">
      <template #supplier_id>
        <CustomerPicker
          company-type="supplier"
          :model-value="supplierId"
          placeholder="请选择供应商"
          :disabled="formType === 'detail'"
          @update:model-value="handleSupplierIdChange"
        />
      </template>
      <template #purchase_user_id>
        <StaffPicker
          :model-value="purchaseUserId"
          placeholder="请选择采购人员"
          :disabled="formType === 'detail'"
          @update:model-value="handlePurchaseUserIdChange"
        />
      </template>
      <template #items>
        <PurchaseOrderItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="formType === 'detail'"
          :discount-percent="formData?.discount_percent ?? 0"
          @update:items="handleUpdateItems"
          @update:discount-price="handleUpdateDiscountPrice"
          @update:total-price="handleUpdateTotalPrice"
          @update:product-name="handleUpdateProductName"
          @update:count="handleUpdateProductCount"
          @update:total_product_price="handleUpdatetotalProductPrice"
        />
      </template>
    </Form>

    <div class="mx-3 mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="m-0">附件</h4>
        <FileUpload
          v-if="formType !== 'detail'"
          :key="uploadKey"
          :model-value="[]"
          :api="uploadCustomerAttachment"
          :limit="1"
          :file-size="10"
          :file-type="[
            'doc',
            'docx',
            'xls',
            'xlsx',
            'ppt',
            'pptx',
            'pdf',
            'txt',
            'png',
            'jpg',
            'jpeg',
            'gif',
            'bmp',
            'zip',
            'rar',
            '7z',
          ]"
          :is-show-tip="false"
          :show-file-list="false"
          button-text="上传"
          @success="handleAttachmentUploadSuccess"
        />
      </div>
      <ElTable
        empty-text="暂无附件"
        :data="attachments"
        style="width: 100%"
        size="small"
      >
        <ElTableColumn
          prop="file_name"
          label="文件名"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn label="文件大小" min-width="120">
          <template #default="{ row }">{{
            formatAttachmentSize(row.file_size)
          }}</template>
        </ElTableColumn>
        <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row, $index }">
            <ElLink type="primary" @click="handleDownloadAttachment(row)"
              >下载</ElLink
            >
            <ElLink
              class="ml-2"
              type="danger"
              :disabled="formType === 'detail'"
              @click="handleDeleteAttachment(row, $index)"
              >删除</ElLink
            >
          </template>
        </ElTableColumn>
      </ElTable>
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
      <div class="flex w-full items-center justify-between">
        <div class="flex items-center gap-2">
          <template v-if="formType === 'detail'">
            <ElButton type="primary" @click="handlePrint">打印</ElButton
            ><ElButton type="primary" @click="handleGenerateInDocument"
              >生成入库单</ElButton
            >
            <ElButton type="primary" @click="handleGeneratePurchaseReturn"
              >生成采购退货单</ElButton
            >
            <ElButton type="primary" @click="handleGenerateSaleOrder"
              >生成销售订单</ElButton
            >
          </template>
        </div>
        <div class="flex items-center gap-2">
          <ElButton @click="handleFooterCancel">取消</ElButton>
          <ElButton type="primary" @click="handleFooterConfirm">确认</ElButton>
        </div>
      </div>
    </template>
  </Modal>

  <ElDialog
    v-model="warehouseDialogVisible"
    title="请选择本次执行仓库"
    width="520px"
    :close-on-click-modal="false"
  >
    <div class="mb-3 text-sm text-[#666]">
      当前源单中的产品分布在多个仓库，可勾选多个可生成仓库，系统将按仓库分别生成采购入库单。
    </div>
    <ElCheckboxGroup
      v-model="selectedGroupWarehouseIds"
      class="flex w-full flex-col gap-3"
    >
      <ElCheckbox
        v-for="item in groupOptions"
        :key="item.warehouseId"
        :label="item.warehouseId"
        :disabled="item.status && !item.status.canGenerate"
        class="!mr-0 flex w-full items-start"
      >
        <span class="whitespace-normal break-all leading-5">
          {{ item.warehouseName }}（{{ item.count }} 行）
          <span
            class="ml-2 text-xs"
            :class="
              item.status?.canGenerate ? 'text-green-600' : 'text-red-500'
            "
          >
            {{ getGenerateStatusText(item.status) }}
          </span>
        </span>
      </ElCheckbox>
    </ElCheckboxGroup>
    <div class="mt-4 text-xs text-[#999]">
      已选择
      {{ selectedGroupWarehouseIds.length }}
      个仓库，确认后将为每个仓库生成一张待审批采购入库单。
    </div>
    <template #footer>
      <ElButton @click="warehouseDialogVisible = false">取消</ElButton>
      <ElButton
        type="primary"
        :loading="batchGenerating"
        :disabled="selectedGroupWarehouseIds.length === 0"
        @click="handleBatchGeneratePurchaseIn"
        >生成所选仓库入库单</ElButton
      >
    </template>
  </ElDialog>

  <ElDialog
    v-model="batchGenerateResultVisible"
    title="采购入库单生成结果"
    width="720px"
    :close-on-click-modal="false"
  >
    <ElTable :data="batchGenerateResults" style="width: 100%" size="small">
      <ElTableColumn
        prop="warehouseName"
        label="仓库"
        min-width="180"
        show-overflow-tooltip
      />
      <ElTableColumn label="结果" width="100">
        <template #default="{ row }">
          <span :class="row.success ? 'text-green-600' : 'text-red-500'">
            {{ row.success ? '成功' : '失败' }}
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn
        prop="no"
        label="入库单号"
        min-width="180"
        show-overflow-tooltip
      />
      <ElTableColumn
        prop="message"
        label="说明"
        min-width="220"
        show-overflow-tooltip
      />
    </ElTable>
    <template #footer>
      <ElButton type="primary" @click="batchGenerateResultVisible = false"
        >关闭</ElButton
      >
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
