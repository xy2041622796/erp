<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { ErpPurchaseInApi } from '#/api/erp/purchase/in';
import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { downloadFileFromBlobPart, formatDateTime } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import {
  createCustomerAttachment,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  getSupplierSimpleList,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  createPurchaseIn,
  getPurchaseIn,
  updatePurchaseIn,
} from '#/api/erp/purchase/in';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';
import { getPurchaseInItemPermissionTemplate } from '#/api/erp/purchase/in/inItems';
import FileUpload from '#/components/upload/file-upload.vue';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useFormSchema } from '../data';
import ItemForm from './item-form.vue';
import PurchaseOrderSelect from './purchase-order-select.vue';

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

const ATTACH_OWNER_TYPE = '采购入库';
const emit = defineEmits(['success', 'approve']);
const formData = ref<
  ErpPurchaseInApi.PurchaseIn & {
    order?: ErpPurchaseOrderApi.PurchaseOrder;
    order_id?: number | string;
    order_no?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    total_count?: number;
  }
>({
  id: undefined,
  no: undefined,
  order_id: undefined,
  order_no: undefined,
  in_time: undefined,
  remark: undefined,
  supplier_id: undefined,
  warehouse_id: undefined,
  warehouse_name: undefined,
  total_count: 0,
  items: [],
});
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const warehouseOptions = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const supplierOptions = ref<any[]>([]);
const canApprove = ref(false);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');
const { hasFieldPermission } = useDataTablePermission();
const permissionRow = ref<any>();
const itemPermissionRow = ref<any>();

function hasPermissionPayload(data: any) {
  return Boolean(
    data && ('lingma_sys_params' in data || 'lingma_sys_key' in data),
  );
}

function getPermissionTarget() {
  return hasPermissionPayload(formData.value)
    ? formData.value
    : permissionRow.value;
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
const amountEditable = computed(
  () => amountVisible.value && !isItemFieldDisabled('product_price'),
);

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

function getCurrentDocId() {
  return (formData.value?.id as any) || undefined;
}

function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}

function getDefaultCreateInTime() {
  return formatDateTime(new Date());
}

function hasImportedItems() {
  return (
    Array.isArray(formData.value?.items) && formData.value.items.length > 0
  );
}

async function loadAttachments(docId?: string | number) {
  if (!docId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE);
  } catch (error) {
    console.error('加载采购入库附件失败:', error);
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
  if (!row.file_name || !row.file_path) return;
  try {
    const blob = await downloadCustomerAttachment(row.file_name, row.file_path);
    downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
  } catch (error) {
    console.error('下载采购入库附件失败:', error);
  }
}

async function handleDeleteAttachment(
  row: CrmCustomerApi.Attachment,
  index: number,
) {
  const docId = getCurrentDocId();
  if (docId && row.id) {
    await deleteCustomerAttachment(row.id as any);
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
}

const getTitle = computed(() => {
  if (formType.value === 'create')
    return $t('ui.actionTitle.create', ['采购入库']);
  if (formType.value === 'edit') return $t('ui.actionTitle.edit', ['采购入库']);
  return '采购入库详情';
});

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

function handleUpdateItems(items: ErpPurchaseInApi.PurchaseInItem[]) {
  formData.value.items = items;
  formApi.setValues({
    items,
    total_count: items.reduce((sum, item) => sum + Number(item.count || 0), 0),
  });
}

function handleUpdateTotalCount(totalCount: number) {
  formApi.setValues({ total_count: totalCount });
}

async function handleWarehouseChange(value?: string) {
  const warehouse = warehouseOptions.value.find(
    (item) => String(item.rowid) === String(value || ''),
  );
  formData.value = {
    ...formData.value,
    warehouse_id: value,
    warehouse_name: warehouse?.name,
  };
  await formApi.setValues(
    {
      warehouse_id: value,
    },
    false,
  );
}

async function handleUpdateOrder(payload: {
  order: ErpPurchaseOrderApi.PurchaseOrder;
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
    supplier_id: o.supplierId || o.supplier_id,
    warehouse_id: payload.warehouseId,
    warehouse_name: payload.warehouseName,
    remark: formData.value.remark || o.remark,
    in_time: formData.value.in_time || getDefaultCreateInTime(),
  };

  const importedItems = (payload.items || []).map((item: any) => {
    const totalCount = Number(item.count || 0);
    const inCount = Number(item.inCount ?? item.in_count ?? 0);
    const remainCount = Math.max(totalCount - inCount, 0);
    return {
      ...item,
      total_count: totalCount,
      count: remainCount > 0 ? remainCount : totalCount,
      order_item_id: item.id,
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
      supplier_id: formData.value.supplier_id,
      warehouse_id: formData.value.warehouse_id,
      in_time: formData.value.in_time,
      remark: formData.value.remark,
      items: importedItems,
      total_count: importedItems.reduce(
        (sum: number, item: any) => sum + Number(item.count || 0),
        0,
      ),
    },
    false,
  );
}

function validateWarehouseConsistency(data: ErpPurchaseInApi.PurchaseIn) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    ElMessage.error('请至少添加一条入库产品明细');
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
  if (productList.value.length === 0)
    productList.value = await getProductSimpleList();
  if (warehouseOptions.value.length === 0)
    warehouseOptions.value = await getWarehouseSimpleList();
  if (categoryList.value.length === 0)
    categoryList.value = await getProductCategorySimpleList() as any;
  if (supplierOptions.value.length === 0)
    supplierOptions.value = await getSupplierSimpleList();
  const enrichedData = {
    ...formData.value,
    _supplier_name: (supplierOptions.value.find((item: any) => String(item.rowid) === String(formData.value?.supplier_id || ''))?.name) || '',
  };
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'purchase-in',
    data: enrichedData,
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
  const row = { ...(formData.value as any) } as ErpPurchaseInApi.PurchaseIn;
  const status = Number(row.status) === 20 ? 10 : 20;
  await modalApi.close();
  emit('approve', row, status);
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
    ElMessage.error(error.message || '产品明细校验失败');
    return;
  }

  const data = (await formApi.getValues()) as ErpPurchaseInApi.PurchaseIn;
  data.remark = formData.value?.remark;
  if (!amountVisible.value && Array.isArray(data.items)) {
    data.items = stripAmountFieldsFromItems(data.items) as any;
  }

  if (!validateWarehouseConsistency(data)) {
    return;
  }

  if (data.in_time) {
    const ts = Number(data.in_time);
    const date = Number.isNaN(ts) ? new Date(data.in_time) : new Date(ts);
    data.in_time = formatDateTime(date);
  }
  const warehouse = warehouseOptions.value.find(
    (item) => String(item.rowid) === String(data.warehouse_id || ''),
  );
  data.warehouse_name = warehouse?.name || formData.value.warehouse_name;

  modalApi.lock();
  try {
    const res: any =
      formType.value === 'create'
        ? await createPurchaseIn(data)
        : await updatePurchaseIn(data);
    const docId = (
      formType.value === 'create' ? res?.id : getCurrentDocId()
    ) as any;
    if (docId) {
      formData.value = { ...(formData.value || {}), id: docId } as any;
      await persistDraftAttachments(docId);
    }
    ElMessage.success(
      formType.value === 'create' ? '新增采购入库成功' : '修改采购入库成功',
    );
    await modalApi.close();
    emit('success');
  } catch (error: any) {
    console.error('保存采购入库失败:', error);
    ElMessage.error(error?.message || '保存失败，请稍后重试');
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
      formData.value = {} as ErpPurchaseInApi.PurchaseIn;
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      canApprove.value = false;
      permissionRow.value = undefined;
      itemPermissionRow.value = undefined;
      return;
    }
    warehouseOptions.value = await getWarehouseSimpleList();
    if (supplierOptions.value.length === 0)
      supplierOptions.value = await getSupplierSimpleList();
    const data = modalApi.getData<{
      id?: string;
      type: string;
      canApprove?: boolean;
      permissionRow?: any;
      preloadOrder?: {
        order: ErpPurchaseOrderApi.PurchaseOrder;
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
      const defaultInTime = getDefaultCreateInTime();
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      formData.value = {
        id: undefined,
        no: undefined,
        order_id: undefined,
        order_no: undefined,
        in_time: defaultInTime,
        remark: undefined,
        supplier_id: undefined,
        warehouse_id: undefined,
        warehouse_name: undefined,
        total_count: 0,
        items: [],
      } as any;
      itemPermissionRow.value =
        await getPurchaseInItemPermissionTemplate().catch(() => null);
      await formApi.setValues(
        {
          no: undefined,
          in_time: defaultInTime,
          items: [],
          total_count: 0,
        } as any,
        false,
      );
      if (data.preloadOrder) {
        await handleUpdateOrder(data.preloadOrder);
      }
      return;
    }
    if (!data || !data.id) {
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      await formApi.setValues({ no: undefined } as any);
      return;
    }
    modalApi.lock();
    try {
      const res = await getPurchaseIn(data.id);
      formData.value = res;
      permissionRow.value = formData.value;
      itemPermissionRow.value = Array.isArray((formData.value as any)?.items)
        ? (formData.value as any).items[0] || null
        : null;
      if (!itemPermissionRow.value) {
        itemPermissionRow.value =
          await getPurchaseInItemPermissionTemplate().catch(() => null);
      }
      const warehouse = warehouseOptions.value.find(
        (item) =>
          String(item.rowid) === String(formData.value?.warehouse_id || ''),
      );
      formData.value.warehouse_name =
        warehouse?.name || formData.value.warehouse_name;
      await formApi.setValues(formData.value, false);
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
    <div
      v-if="formType !== 'detail'"
      class="lead-form-actions"
    >
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSave">
        保存
      </ElButton>
    </div>
    <Form class="mx-3">
      <template #warehouse_id>
        <ElSelect
          :model-value="formData?.warehouse_id"
          placeholder="请选择执行仓库"
          :disabled="formType === 'detail' || isFieldDisabled('warehouse_id')"
          filterable
          clearable
          class="w-full"
          @update:model-value="handleWarehouseChange"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.rowid"
            :label="item.name"
            :value="item.rowid"
          />
        </ElSelect>
      </template>
      <template #items>
        <ItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="formType === 'detail'"
          :amount-visible="amountVisible"
          :amount-editable="amountEditable"
          :warehouse-id="formData?.warehouse_id"
          :warehouse-name="formData?.warehouse_name"
          @update:items="handleUpdateItems"
          @update:total-count="handleUpdateTotalCount"
        />
      </template>
      <template #order_no>
        <PurchaseOrderSelect
          :order-no="formData?.order_no"
          :disabled="formType === 'detail'"
          @update:order="handleUpdateOrder"
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
        :style="{ width: '100%' }"
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
        :disabled="formType === 'detail' || isFieldDisabled('remark')"
        @update:model-value="handleRemarkChange"
      />
    </div>

    <template v-if="formType === 'detail'" #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <ElButton
            v-if="formType === 'detail'"
            type="primary"
            @click="handlePrint"
            >{{
              Number(formData?.status) === 10 ? '打印预览' : '打印'
            }}</ElButton
          >
        </div>
        <div class="flex items-center gap-2">
          <ElButton @click="modalApi.close()">取消</ElButton>
          <ElButton
            v-if="canApprove"
            type="primary"
            @click="handleApprove"
          >
            {{ approveButtonLabel }}
          </ElButton>
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
    <div class="mb-2 text-sm text-[#666]">
      待审批单据仅支持预览，审核通过后才能正式打印。
    </div>
    <iframe class="h-[520px] w-full border" :srcdoc="printPreviewHtml"></iframe>
    <template #footer>
      <ElButton type="primary" @click="printPreviewVisible = false"
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
