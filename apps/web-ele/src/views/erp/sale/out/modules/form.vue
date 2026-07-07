<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';
import type { ErpSaleOutApi } from '#/api/erp/sale/out';
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
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { createSaleOut, getSaleOut, updateSaleOut } from '#/api/erp/sale/out';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';
import { getSaleOutItemPermissionTemplate } from '#/api/erp/sale/out/outItems';
import FileUpload from '#/components/upload/file-upload.vue';
import { CustomerPicker } from '#/components/customer-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

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
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = '销售出库';
const emit = defineEmits(['success', 'approve']);

const formData = ref<
  ErpSaleOutApi.SaleOut & {
    account_id?: string;
    customer_id?: number;
    discount_percent?: number;
    order?: ErpSaleOrderApi.SaleOrder;
    order_id?: string;
    order_no?: string;
    sale_user_id?: string;
    warehouse_id?: string;
    warehouse_name?: string;
  }
>({
  id: undefined,
  no: undefined,
  order_id: undefined,
  order_no: undefined,
  account_id: undefined,
  out_time: undefined,
  remark: undefined,
  customer_id: undefined,
  sale_user_id: undefined,
  warehouse_id: undefined,
  warehouse_name: undefined,
  items: [],
});

const formType = ref('');
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const { hasFieldPermission } = useDataTablePermission();
const permissionRow = ref<any>();
const itemPermissionRow = ref<any>();

function hasPermissionPayload(data: any) {
  return Boolean(data && ('lingma_sys_params' in data || 'lingma_sys_key' in data));
}

function getPermissionTarget() {
  return hasPermissionPayload(formData.value) ? formData.value : permissionRow.value;
}

function isFieldDisabled(field: string) {
  const target = getPermissionTarget();
  if (!hasPermissionPayload(target)) return false;
  return Boolean(hasFieldPermission(target, 'fd:edit', field));
}

function isFieldVisible(field: string) {
  const target = getPermissionTarget();
  if (!hasPermissionPayload(target)) return true;
  return Boolean(hasFieldPermission(target, 'fd:show', field));
}

function isItemFieldDisabled(field: string) {
  if (!hasPermissionPayload(itemPermissionRow.value)) return true;
  return Boolean(hasFieldPermission(itemPermissionRow.value, 'fd:edit', field));
}

function isItemFieldVisible(field: string) {
  if (!hasPermissionPayload(itemPermissionRow.value)) return false;
  return Boolean(hasFieldPermission(itemPermissionRow.value, 'fd:show', field));
}

const amountVisible = computed(() => isItemFieldVisible('product_price'));
const amountEditable = computed(() => amountVisible.value && !isItemFieldDisabled('product_price'));

function stripAmountFieldsFromItems(items: any[] = []) {
  return items.map((item) => {
    const {
      product_price,
      total_product_price,
      tax_percent,
      tax_price,
      total_price,
      ...rest
    } = item || {};
    return rest;
  });
}
const customerId = ref<string | undefined>();
const saleUserId = ref<string | undefined>();
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const warehouseOptions = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const canApprove = ref(false);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');

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

function getCurrentDocId() {
  return (formData.value?.id as any) || undefined;
}

function hasImportedItems() {
  return Array.isArray(formData.value?.items) && formData.value.items.length > 0;
}

async function loadAttachments(docId?: string | number) {
  if (!docId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE);
  } catch (error) {
    console.error('加载销售出库附件失败:', error);
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
    console.error('下载销售出库附件失败:', error);
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
    (it) => !(it.file_name === row.file_name && it.file_path === row.file_path && it.file_size === row.file_size),
  );
  ElMessage.success('删除附件成功');
}

function normalizeCustomerId(v?: string) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : (v as any);
}

async function handleCustomerIdChange(v?: any) {
  customerId.value = v;
  await formApi.setValues({ customer_id: normalizeCustomerId(v) as any }, false);
}

async function handleSaleUserIdChange(v?: any) {
  saleUserId.value = v;
  await formApi.setValues({ sale_user_id: v }, false);
}

function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}

const getTitle = computed(() =>
  formType.value === 'create'
    ? $t('ui.actionTitle.create', ['销售出库'])
    : formType.value === 'edit'
      ? $t('ui.actionTitle.edit', ['销售出库'])
      : '销售出库详情',
);

const approveButtonLabel = computed(() =>
  Number(formData.value?.status) === 20 ? '反审批' : '审批',
);

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema(formType.value, formData.value),
  showDefaultActions: false,
});

function handleUpdateItems(items: ErpSaleOutApi.SaleOutItem[]) {
  formData.value.items = items;
  formApi.setValues({ items, total_count: items.reduce((sum, item) => sum + Number(item.count || 0), 0) });
}
function handleUpdateTotalCount(totalCount: number) {
  formApi.setValues({ total_count: totalCount });
}

async function handleWarehouseChange(value?: string) {
  const warehouse = warehouseOptions.value.find((item) => String(item.rowid) === String(value || ''));
  formData.value = {
    ...formData.value,
    warehouse_id: value,
    warehouse_name: warehouse?.name,
  };
  await formApi.setValues({ warehouse_id: value }, false);
}

async function handleUpdateOrder(payload: {
  order: ErpSaleOrderApi.SaleOrder;
  warehouseId: string;
  warehouseName?: string;
  items: any[];
}) {
  const shouldConfirm = hasImportedItems();
  if (shouldConfirm) {
    try {
      await ElMessageBox.confirm(
        '重新选择源单/仓库会清空当前已导入的产品明细，是否继续？',
        '提示',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );
    } catch {
      return;
    }
  }

  const o = payload.order as any;
  formData.value = {
    ...formData.value,
    order_id: o.id,
    order_no: o.no,
    customer_id: o.customerId || o.customer_id,
    account_id: o.accountId || o.account_id,
    sale_user_id: o.saleUserId || o.sale_user_id,
    warehouse_id: payload.warehouseId,
    warehouse_name: payload.warehouseName,
    remark: formData.value.remark || o.remark,
    out_time: formData.value.out_time || getCurrentDate(),
  };
  const importedItems = (payload.items || []).map((item: any) => {
    const totalCount = Number(item.count || 0);
    const outCount = Number(item.outCount || item.out_count || 0);
    const remainCount = Math.max(totalCount - outCount, 0);
    return {
      ...item,
      total_count: totalCount,
      count: remainCount > 0 ? remainCount : totalCount,
      order_item_id: item.rowid || item.id,
      id: undefined,
      warehouse_id: payload.warehouseId,
      warehouse_name: payload.warehouseName,
    };
  });
  formData.value.items = importedItems;
  attachments.value = [];
  draftAttachments.value = [];
  uploadKey.value++;
  formApi.setValues(
    {
      order_id: formData.value.order_id,
      order_no: formData.value.order_no,
      customer_id: formData.value.customer_id,
      account_id: formData.value.account_id,
      sale_user_id: formData.value.sale_user_id,
      warehouse_id: formData.value.warehouse_id,
      remark: formData.value.remark,
      items: importedItems,
      total_count: importedItems.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0),
    },
    false,
  );
  customerId.value = formData.value.customer_id ? String(formData.value.customer_id) : undefined;
  saleUserId.value = formData.value.sale_user_id ? String(formData.value.sale_user_id) : undefined;
}

watch([formType, formData], () => {
  formApi.updateSchema(useFormSchema(formType.value, formData.value));
}, { deep: true });

function validateWarehouseConsistency(data: ErpSaleOutApi.SaleOut) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    ElMessage.error('请至少添加一条出库产品明细');
    return false;
  }
  const headerWarehouseId = String(data.warehouse_id || '');
  if (!headerWarehouseId) {
    ElMessage.error('请选择执行仓库');
    return false;
  }
  const invalidItem = items.find(
    (item: any) => String(item?.warehouse_id || '') !== headerWarehouseId,
  );
  if (invalidItem) {
    ElMessage.error('明细中存在与执行仓库不一致的产品，请重新选择源单导入');
    return false;
  }
  return true;
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
    type: 'sale-out',
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

async function handleApprove() {
  if (!formData.value?.id) return;
  const row = { ...(formData.value as any) } as ErpSaleOutApi.SaleOut;
  const status = Number(row.status) === 20 ? 10 : 20;
  await modalApi.close();
  emit('approve', row, status);
}

async function handleSave() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const itemFormInstance = Array.isArray(itemFormRef.value) ? itemFormRef.value[0] : itemFormRef.value;
  try {
    itemFormInstance.validate();
  } catch (error: any) {
    ElMessage.error(error.message || '子表单验证失败');
    return;
  }
  modalApi.lock();
  const data = (await formApi.getValues()) as ErpSaleOutApi.SaleOut;
  data.remark = formData.value?.remark;
  if (!amountVisible.value && Array.isArray(data.items)) {
    data.items = stripAmountFieldsFromItems(data.items) as any;
  }
  try {
    if (!validateWarehouseConsistency(data)) {
      return;
    }
    if (data.out_time) {
      data.out_time = normalizeDateOnly(data.out_time) as any;
    }
    const warehouse = warehouseOptions.value.find((item) => String(item.rowid) === String(data.warehouse_id || ''));
    data.warehouse_name = warehouse?.name || formData.value.warehouse_name;
    const res: any = formType.value === 'create' ? await createSaleOut(data) : await updateSaleOut(data);
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
  async onConfirm() { await handleSave(); },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = {} as ErpSaleOutApi.SaleOut;
      customerId.value = undefined;
      saleUserId.value = undefined;
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      canApprove.value = false;
      permissionRow.value = undefined;
      itemPermissionRow.value = undefined;
      return;
    }
    warehouseOptions.value = await getWarehouseSimpleList();
    const data = modalApi.getData<{
      id?: string;
      type: string;
      canApprove?: boolean;
      permissionRow?: any;
      preloadOrder?: {
        order: ErpSaleOrderApi.SaleOrder;
        warehouseId: string;
        warehouseName?: string;
        items: any[];
      };
    }>();
    formType.value = data.type;
    permissionRow.value = data.permissionRow;
    itemPermissionRow.value = undefined;
    canApprove.value = Boolean(data.canApprove);
    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value, formData.value));
    if (data?.type === 'create') {
      const accountList = await getAccountSimpleList();
      const defaultAccount = accountList.find((item) => item.default_status);
      formData.value = {
        id: undefined,
        no: undefined,
        order_id: undefined,
        order_no: undefined,
        account_id: defaultAccount?.rowid,
        out_time: getCurrentDate(),
        remark: undefined,
        customer_id: undefined,
        sale_user_id: undefined,
        warehouse_id: undefined,
        warehouse_name: undefined,
        items: [],
      } as any;
      customerId.value = undefined;
      saleUserId.value = undefined;
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      itemPermissionRow.value = await getSaleOutItemPermissionTemplate().catch(() => null);
      await formApi.setValues({ no: undefined, account_id: defaultAccount?.rowid, out_time: formData.value.out_time, items: [], total_count: 0 } as any, false);
      if (data.preloadOrder) {
        await handleUpdateOrder(data.preloadOrder);
      }
      return;
    }
    if (!data || !data.id) {
      await formApi.setValues({ no: undefined } as any);
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getSaleOut(data.id);
      permissionRow.value = formData.value;
      itemPermissionRow.value = Array.isArray((formData.value as any)?.items)
        ? ((formData.value as any).items[0] || null)
        : null;
      if (!itemPermissionRow.value) {
        itemPermissionRow.value = await getSaleOutItemPermissionTemplate().catch(() => null);
      }
      if (formData.value) {
        formData.value.out_time = normalizeDateOnly((formData.value as any).out_time) as any;
      }
      const warehouse = warehouseOptions.value.find((item) => String(item.rowid) === String(formData.value?.warehouse_id || ''));
      formData.value.warehouse_name = warehouse?.name || formData.value.warehouse_name;
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
    <div
      v-if="formType !== 'detail'"
      class="lead-form-actions"
    >
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSave">确认</ElButton>
    </div>
    <Form class="mx-3">
      <template #customer_id>
        <CustomerPicker :model-value="customerId" placeholder="请选择客户" :disabled="formType === 'detail' || isFieldDisabled('customer_id')" @update:model-value="handleCustomerIdChange" />
      </template>
      <template #sale_user_id>
        <StaffPicker :model-value="saleUserId" placeholder="请选择销售人员" :disabled="formType === 'detail' || isFieldDisabled('sale_user_id')" @update:model-value="handleSaleUserIdChange" />
      </template>
      <template #warehouse_id>
        <ElSelect :model-value="formData?.warehouse_id" placeholder="请选择执行仓库" :disabled="formType === 'detail' || isFieldDisabled('warehouse_id')" filterable clearable class="w-full" @update:model-value="handleWarehouseChange">
          <ElOption v-for="item in warehouseOptions" :key="item.rowid" :label="item.name" :value="item.rowid" />
        </ElSelect>
      </template>
      <template #items>
        <ItemForm ref="itemFormRef" :items="formData?.items ?? []" :disabled="formType === 'detail'" :amount-visible="amountVisible" :amount-editable="amountEditable" :warehouse-id="formData?.warehouse_id" :warehouse-name="formData?.warehouse_name" @update:items="handleUpdateItems" @update:total-count="handleUpdateTotalCount" />
      </template>
      <template #order_no>
        <SaleOrderSelect :order-no="formData?.order_no" :disabled="formType === 'detail'" @update:order="handleUpdateOrder" />
      </template>
    </Form>
    <div class="mx-3 mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="m-0">附件</h4>
        <FileUpload v-if="formType !== 'detail'" :key="uploadKey" :model-value="[]" :api="uploadCustomerAttachment" :limit="1" :file-size="10" :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']" :is-show-tip="false" :show-file-list="false" button-text="上传" @success="handleAttachmentUploadSuccess" />
      </div>
      <ElTable empty-text="暂无附件" :data="attachments" :style="{ width: '100%' }" size="small">
        <ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
        <ElTableColumn label="文件大小" min-width="120"><template #default="{ row }">{{ formatAttachmentSize(row.file_size) }}</template></ElTableColumn>
        <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row, $index }">
            <ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink>
            <ElLink class="ml-2" type="danger" :disabled="formType === 'detail'" @click="handleDeleteAttachment(row, $index)">删除</ElLink>
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
        :disabled="formType === 'detail' || isFieldDisabled('remark')"
        @update:model-value="handleRemarkChange"
      />
    </div>

    <template v-if="formType === 'detail'" #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <ElButton v-if="formType === 'detail'" type="primary" @click="handlePrint">{{ Number(formData?.status) === 10 ? '打印预览' : '打印' }}</ElButton>
        </div>
        <div class="flex items-center gap-2">
          <ElButton @click="modalApi.close()">取消</ElButton>
        <ElButton v-if="formType === 'detail' && canApprove" type="primary" @click="handleApprove">{{ approveButtonLabel }}</ElButton>
        </div>
      </div>
    </template>
  </Modal>

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
