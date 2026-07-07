<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, formatDateTime } from '@vben/utils';

import {
  createCustomerAttachment,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  getReturnCheckById,
  getReturnCheckByBiz,
  RETURN_CHECK_BIZ_TYPE,
  RETURN_CHECK_STATUS,
  saveReturnCheck,
} from '#/api/erp/stock/return-check';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import FileUpload from '#/components/upload/file-upload.vue';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElLink,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const emit = defineEmits(['success']);

const formData = ref<any>({
  check_time: getDefaultCheckTime(),
  checker_id: '',
  checker_name: '',
  remark: '',
  items: [],
});
const bizContext = ref<'purchase-return' | 'sale-return'>('sale-return');
const bizId = ref('');
const bizNo = ref('');
const sourceReturnId = ref('');
const sourceReturnNo = ref('');
const sourceWarehouseId = ref('');
const warehouseOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const uploadKey = ref(0);
const checkId = ref<string | undefined>();
const readOnly = ref(false);
const formKey = ref('');
const sourceRoundNo = ref(1);
const isLatest = ref(1);
const processStatusLabel = ref('');
const viewSeed = ref(0);

const contextLabel = computed(() =>
  bizContext.value === 'sale-return' ? '销售退货检测' : '采购退货检测',
);
const ownerType = computed(() =>
  bizContext.value === 'sale-return' ? '销售退货检测' : '采购退货检测',
);
const disposeOptions = computed(() =>
  bizContext.value === 'sale-return'
    ? [
        { label: '拒收', value: 20 },
        { label: '报废', value: 30 },
        { label: '不合格品仓', value: 40 },
      ]
    : [
        { label: '退供应商', value: 20 },
        { label: '报废', value: 30 },
        { label: '不合格品仓', value: 40 },
      ],
);

function safeString(value: any) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function getDefaultCheckTime() {
  return new Date().toLocaleDateString('sv-SE');
}

function toPickerTime(value?: string) {
  if (!value) return getDefaultCheckTime();
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const num = Number(text);
  if (!Number.isNaN(num)) return new Date(num).toLocaleDateString('sv-SE');
  const date = new Date(text.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? getDefaultCheckTime()
    : date.toLocaleDateString('sv-SE');
}

function getProductMeta(productId?: string) {
  return productOptions.value.find(
    (item) => safeString(item.rowid) === safeString(productId),
  );
}

function fillProductMeta(row: any) {
  const product = getProductMeta(row?.product_id);
  if (!product) return row;
  if (!row.product_name) row.product_name = product.product_name || '';
  if (!row.product_bar_code) row.product_bar_code = product.barcode || '';
  if (!row.product_unit_name) row.product_unit_name = product.unit || '';
  if (!row.product_unit_id) row.product_unit_id = product.unit_id || '';
  return row;
}

function formatAttachmentSize(size?: number) {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function calcCheckResult(
  sourceCount: number,
  qualifiedCount: number,
  unqualifiedCount: number,
) {
  if (qualifiedCount <= 0 && unqualifiedCount <= 0) return 10;
  if (qualifiedCount >= sourceCount && unqualifiedCount <= 0) return 20;
  if (unqualifiedCount >= sourceCount && qualifiedCount <= 0) return 30;
  return 40;
}

function normalizeRow(row: any, index: number) {
  const sourceCount = Number(row?.source_count ?? row?.count ?? 0);
  const qualifiedCount = Number(row?.qualified_count ?? 0);
  const unqualifiedCount = Number(row?.unqualified_count ?? 0);
  const normalized = {
    id: row?.id,
    rowid: row?.rowid,
    biz_item_id: row?.biz_item_id || row?.id,
    return_item_id: row?.return_item_id || row?.biz_item_id || row?.id,
    product_id: row?.product_id,
    product_name: row?.product_name,
    product_bar_code: row?.product_bar_code,
    product_unit_id: row?.product_unit_id,
    product_unit_name: row?.product_unit_name,
    warehouse_id: safeString(row?.warehouse_id || sourceWarehouseId.value),
    source_count: sourceCount,
    qualified_count: qualifiedCount,
    unqualified_count: unqualifiedCount,
    check_result:
      row?.check_result ||
      calcCheckResult(sourceCount, qualifiedCount, unqualifiedCount),
    unqualified_reason: row?.unqualified_reason || '',
    dispose_type: row?.dispose_type,
    good_warehouse_id: safeString(
      row?.good_warehouse_id || row?.target_warehouse_id || '',
    ),
    bad_warehouse_id: safeString(
      row?.bad_warehouse_id || row?.target_warehouse_id || '',
    ),
    need_process_count: Number(row?.need_process_count || 0),
    processed_count: Number(row?.processed_count || 0),
    process_status: Number(row?.process_status || 10),
    remark: row?.remark || '',
    sort_no: row?.sort_no ?? index + 1,
  };
  return fillProductMeta(normalized);
}

function syncRow(row: any) {
  const sourceCount = Number(row.source_count || 0);
  let qualifiedCount = Math.max(Number(row.qualified_count || 0), 0);
  let unqualifiedCount = Math.max(Number(row.unqualified_count || 0), 0);
  if (qualifiedCount + unqualifiedCount > sourceCount) {
    unqualifiedCount = Math.max(sourceCount - qualifiedCount, 0);
  }
  row.qualified_count = qualifiedCount;
  row.unqualified_count = unqualifiedCount;
  row.check_result = calcCheckResult(
    sourceCount,
    qualifiedCount,
    unqualifiedCount,
  );
  row.good_warehouse_id = safeString(row.good_warehouse_id);
  row.bad_warehouse_id = safeString(row.bad_warehouse_id);
  if (unqualifiedCount <= 0) {
    row.unqualified_reason = '';
    row.dispose_type = undefined;
    row.bad_warehouse_id = '';
  }
  if (qualifiedCount <= 0) row.good_warehouse_id = '';
  fillProductMeta(row);
}

function handleQualifiedChange(row: any, value?: number) {
  const sourceCount = Number(row.source_count || 0);
  const qualifiedCount = Math.max(Number(value || 0), 0);
  row.qualified_count = qualifiedCount;
  row.unqualified_count = Math.max(sourceCount - qualifiedCount, 0);
  syncRow(row);
}

function handleUnqualifiedChange(row: any, value?: number) {
  const sourceCount = Number(row.source_count || 0);
  const unqualifiedCount = Math.max(Number(value || 0), 0);
  row.unqualified_count = Math.min(unqualifiedCount, sourceCount);
  row.qualified_count = Math.max(sourceCount - row.unqualified_count, 0);
  syncRow(row);
}

async function loadAttachments(id?: string) {
  if (!id) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(id, ownerType.value);
  } catch {
    attachments.value = [];
  }
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
    owner_type: ownerType.value,
  };
}

async function handleAttachmentUploadSuccess(
  payload: FileUploadSuccessPayload,
) {
  const item = toAttachmentItem(payload);
  if (!checkId.value) {
    draftAttachments.value.push(item);
    attachments.value.push(item);
    uploadKey.value++;
    return;
  }
  await createCustomerAttachment(checkId.value, {
    fileName: item.file_name,
    file_path: item.file_path,
    fileSize: item.file_size,
    fileType: item.file_type,
    owner_type: ownerType.value,
    pid: checkId.value,
  });
  await loadAttachments(checkId.value);
  uploadKey.value++;
}

async function persistDraftAttachments() {
  if (!checkId.value || draftAttachments.value.length === 0) return;
  await Promise.all(
    draftAttachments.value.map((it) =>
      createCustomerAttachment(checkId.value!, {
        fileName: it.file_name,
        file_path: it.file_path,
        fileSize: it.file_size,
        fileType: it.file_type,
        owner_type: ownerType.value,
        pid: checkId.value,
      }),
    ),
  );
  draftAttachments.value = [];
  await loadAttachments(checkId.value);
}

async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) {
  const blob = await downloadCustomerAttachment(row.file_name!, row.file_path!);
  downloadFileFromBlobPart({ fileName: row.file_name!, source: blob });
}

async function handleDeleteAttachment(
  row: CrmCustomerApi.Attachment,
  index: number,
) {
  if (checkId.value && row.id) {
    await deleteCustomerAttachment(row.id as any);
    await loadAttachments(checkId.value);
    return;
  }
  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter(
    (it) => !(it.file_name === row.file_name && it.file_path === row.file_path),
  );
}

function validateRows() {
  const rows = Array.isArray(formData.value.items) ? formData.value.items : [];
  if (!formData.value.checker_id) throw new Error('请选择检测人');
  rows.forEach((row: any, index: number) => {
    const sourceCount = Number(row.source_count || 0);
    const qualified = Number(row.qualified_count || 0);
    const unqualified = Number(row.unqualified_count || 0);
    if (qualified + unqualified > sourceCount)
      throw new Error(`第 ${index + 1} 行：检测数量不能大于送检数量`);
    if (qualified > 0 && !safeString(row.good_warehouse_id))
      throw new Error(`第 ${index + 1} 行：有合格数量时必须填写合格处理仓库`);
    if (unqualified > 0) {
      if (!row.unqualified_reason)
        throw new Error(`第 ${index + 1} 行：请输入不合格原因`);
      if (!row.dispose_type)
        throw new Error(`第 ${index + 1} 行：请选择处理方式`);
      if (
        [20, 40].includes(Number(row.dispose_type)) &&
        !safeString(row.bad_warehouse_id)
      )
        throw new Error(
          `第 ${index + 1} 行：当前处理方式下必须填写不合格处理仓库`,
        );
    }
  });
}

async function handleSave() {
  try {
    validateRows();
  } catch (error: any) {
    ElMessage.error(error.message || '检测数据校验失败');
    return;
  }
  modalApi.lock();
  try {
    const totalCount = formData.value.items.reduce(
      (sum: number, item: any) => sum + Number(item.source_count || 0),
      0,
    );
    const qualifiedCount = formData.value.items.reduce(
      (sum: number, item: any) => sum + Number(item.qualified_count || 0),
      0,
    );
    const unqualifiedCount = formData.value.items.reduce(
      (sum: number, item: any) => sum + Number(item.unqualified_count || 0),
      0,
    );
    const payload = {
      id: checkId.value,
      biz_type:
        bizContext.value === 'sale-return'
          ? RETURN_CHECK_BIZ_TYPE.SALE_RETURN
          : RETURN_CHECK_BIZ_TYPE.PURCHASE_RETURN,
      biz_id: bizId.value,
      biz_no: bizNo.value,
      source_return_id: sourceReturnId.value,
      source_return_no: sourceReturnNo.value,
      warehouse_id: sourceWarehouseId.value,
      check_time: formData.value.check_time,
      checker_id: formData.value.checker_id,
      checker_name:
        userOptions.value.find(
          (item) => String(item.ROWID) === String(formData.value.checker_id),
        )?.UserName || '',
      remark: formData.value.remark,
      total_count: totalCount,
      qualified_count: qualifiedCount,
      unqualified_count: unqualifiedCount,
      source_round_no: sourceRoundNo.value,
      is_latest: isLatest.value,
      items: formData.value.items.map((item: any) => ({
        ...item,
        warehouse_id: safeString(item.warehouse_id),
        good_warehouse_id: safeString(item.good_warehouse_id),
        bad_warehouse_id: safeString(item.bad_warehouse_id),
      })),
    };
    const res = await saveReturnCheck(formKey.value, payload as any);
    checkId.value = String(res?.id || checkId.value || '');
    await persistDraftAttachments();
    ElMessage.success(
      res?.check_status === RETURN_CHECK_STATUS.DONE
        ? '检测完成'
        : res?.check_status === RETURN_CHECK_STATUS.PARTIAL
          ? '检测已保存，状态为部分检测'
          : '检测已保存',
    );
    await modalApi.close();
    emit('success');
  } finally {
    modalApi.unlock();
  }
}

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      viewSeed.value += 1;
      formData.value = {
        check_time: getDefaultCheckTime(),
        checker_id: '',
        checker_name: '',
        remark: '',
        items: [],
      };
      bizId.value = '';
      bizNo.value = '';
      sourceReturnId.value = '';
      sourceReturnNo.value = '';
      sourceWarehouseId.value = '';
      attachments.value = [];
      draftAttachments.value = [];
      uploadKey.value++;
      checkId.value = undefined;
      readOnly.value = false;
      formKey.value = '';
      sourceRoundNo.value = 1;
      isLatest.value = 1;
      return;
    }
    warehouseOptions.value = (await getWarehouseSimpleList()).map(
      (item: any) => ({ ...item, rowid: safeString(item.rowid) }),
    );
    userOptions.value = await getSimpleUserList();
    productOptions.value = await getProductSimpleList();
    const data = modalApi.getData<any>();
    bizContext.value = data?.context || 'sale-return';
    formKey.value = data?.formKey || '';
    bizId.value = safeString(data?.bizId);
    bizNo.value = safeString(data?.bizNo);
    sourceReturnId.value = safeString(data?.sourceReturnId || bizId.value);
    sourceReturnNo.value = safeString(data?.sourceReturnNo || bizNo.value);
    sourceWarehouseId.value = safeString(data?.warehouseId);
    readOnly.value = Boolean(data?.readOnly);

    let existing = null;
    if (data?.checkId)
      existing = await getReturnCheckById(
        formKey.value,
        safeString(data.checkId),
      );
    else {
      const bizType =
        bizContext.value === 'sale-return'
          ? RETURN_CHECK_BIZ_TYPE.SALE_RETURN
          : RETURN_CHECK_BIZ_TYPE.PURCHASE_RETURN;
      existing =
        formKey.value && bizId.value
          ? await getReturnCheckByBiz(formKey.value, bizType, bizId.value)
          : null;
    }

    if (existing?.id) {
      checkId.value = safeString(existing.id);
      sourceRoundNo.value = Number(existing.source_round_no || 1);
      isLatest.value = Number(existing.is_latest || 1);
      processStatusLabel.value = safeString(existing.process_status_label);
      formData.value = {
        check_time: toPickerTime(existing.check_time),
        checker_id: existing.checker_id,
        checker_name: existing.checker_name,
        remark: existing.remark || '',
        items: (existing.items || []).map((item: any, index: number) =>
          normalizeRow(item, index),
        ),
      };
      viewSeed.value += 1;
      await loadAttachments(checkId.value);
      return;
    }

    processStatusLabel.value = '';
    formData.value = {
      check_time: getDefaultCheckTime(),
      checker_id: '',
      checker_name: '',
      remark: '',
      items: (Array.isArray(data?.items) ? data.items : []).map(
        (item: any, index: number) => normalizeRow(item, index),
      ),
    };
    viewSeed.value += 1;
  },
});
</script>

<template>
  <Modal
    :title="contextLabel"
    class="w-[92%]"
    content-class="pt-0"
    :show-confirm-button="false"
    :show-cancel-button="false"
    :close-on-click-modal="false"
  >
    <div class="modal-top-actions">
      <ElButton @click="modalApi.close()">关闭</ElButton>
      <ElButton v-if="!readOnly" type="primary" @click="handleSave"
        >保存检测</ElButton
      >
    </div>
    <div class="px-3">
      <div
        v-if="processStatusLabel"
        class="border-border bg-muted mb-4 rounded border p-3 text-sm"
      >
        <div>
          <span class="text-muted-foreground">处理状态：</span
          ><span>{{ processStatusLabel || '-' }}</span>
        </div>
      </div>
      <div class="mb-4 grid grid-cols-3 gap-4">
        <div>
          <div class="mb-1 text-sm font-medium">检测时间</div>
          <ElDatePicker
            v-model="formData.check_time"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            class="w-full"
            :disabled="readOnly"
          />
        </div>
        <div>
          <div class="mb-1 text-sm font-medium">检测人</div>
          <ElSelect
            v-model="formData.checker_id"
            filterable
            class="w-full"
            :disabled="readOnly"
            placeholder="请选择检测人"
          >
            <ElOption
              v-for="item in userOptions"
              :key="item.ROWID"
              :label="item.UserName"
              :value="item.ROWID"
            />
          </ElSelect>
        </div>
        <div>
          <div class="mb-1 text-sm font-medium">备注</div>
          <ElInput
            v-model="formData.remark"
            :disabled="readOnly"
            placeholder="请输入备注"
          />
        </div>
      </div>

      <ElTable
        :key="`table-${viewSeed}`"
        :data="formData.items"
        border
        size="small"
      >
        <ElTableColumn prop="product_name" label="产品" min-width="180" />
        <ElTableColumn prop="product_bar_code" label="条码" min-width="120" />
        <ElTableColumn prop="product_unit_name" label="单位" min-width="80" />
        <ElTableColumn prop="source_count" label="送检数量" min-width="110" />
        <ElTableColumn label="合格数量" min-width="120"
          ><template #default="{ row }"
            ><ElInputNumber
              :model-value="row.qualified_count"
              :min="0"
              :max="row.source_count"
              controls-position="right"
              class="!w-full"
              :disabled="readOnly"
              @change="
                handleQualifiedChange(row, $event as number)
              " /></template
        ></ElTableColumn>
        <ElTableColumn label="合格处理仓库" min-width="180"
          ><template #default="{ row }"
            ><ElSelect
              :key="`good-${viewSeed}-${row.id || row.rowid || row.sort_no}`"
              v-model="row.good_warehouse_id"
              class="w-full"
              filterable
              :disabled="readOnly || Number(row.qualified_count || 0) <= 0"
              placeholder="请选择合格处理仓库"
              ><ElOption
                v-for="item in warehouseOptions"
                :key="item.rowid"
                :label="item.name"
                :value="item.rowid" /></ElSelect></template
        ></ElTableColumn>
        <ElTableColumn label="不合格数量" min-width="120"
          ><template #default="{ row }"
            ><ElInputNumber
              :model-value="row.unqualified_count"
              :min="0"
              :max="row.source_count"
              controls-position="right"
              class="!w-full"
              :disabled="readOnly"
              @change="
                handleUnqualifiedChange(row, $event as number)
              " /></template
        ></ElTableColumn>
        <ElTableColumn label="不合格原因" min-width="160"
          ><template #default="{ row }"
            ><ElInput
              v-model="row.unqualified_reason"
              :disabled="readOnly || Number(row.unqualified_count || 0) <= 0"
              placeholder="请输入不合格原因" /></template
        ></ElTableColumn>
        <ElTableColumn label="处理方式" min-width="140"
          ><template #default="{ row }"
            ><ElSelect
              v-model="row.dispose_type"
              class="w-full"
              :disabled="readOnly || Number(row.unqualified_count || 0) <= 0"
              placeholder="请选择处理方式"
              ><ElOption
                v-for="item in disposeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value" /></ElSelect></template
        ></ElTableColumn>
        <ElTableColumn label="不合格处理仓库" min-width="180"
          ><template #default="{ row }"
            ><ElSelect
              :key="`bad-${viewSeed}-${row.id || row.rowid || row.sort_no}`"
              v-model="row.bad_warehouse_id"
              class="w-full"
              filterable
              :disabled="
                readOnly ||
                Number(row.unqualified_count || 0) <= 0 ||
                ![20, 40].includes(Number(row.dispose_type || 0))
              "
              placeholder="请选择不合格处理仓库"
              ><ElOption
                v-for="item in warehouseOptions"
                :key="item.rowid"
                :label="item.name"
                :value="item.rowid" /></ElSelect></template
        ></ElTableColumn>
        <ElTableColumn label="检测结果" min-width="120"
          ><template #default="{ row }"
            ><span>{{
              row.check_result === 20
                ? '全部合格'
                : row.check_result === 30
                  ? '全部不合格'
                  : row.check_result === 40
                    ? '部分合格'
                    : '待检测'
            }}</span></template
          ></ElTableColumn
        >
        <ElTableColumn
          prop="need_process_count"
          label="待处理数量"
          min-width="120"
        />
        <ElTableColumn
          prop="processed_count"
          label="已处理数量"
          min-width="120"
        />
        <ElTableColumn label="处理状态" min-width="120"
          ><template #default="{ row }"
            ><span>{{
              Number(row.process_status) === 30
                ? '已完成'
                : Number(row.process_status) === 20
                  ? '部分处理'
                  : '未处理'
            }}</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="备注" min-width="160"
          ><template #default="{ row }"
            ><ElInput
              v-model="row.remark"
              :disabled="readOnly"
              placeholder="请输入备注" /></template
        ></ElTableColumn>
      </ElTable>

      <div class="mt-6">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="m-0">检测附件</h4>
          <FileUpload
            v-if="!readOnly"
            :key="uploadKey"
            :model-value="[]"
            :api="uploadCustomerAttachment"
            :limit="10"
            :file-size="20"
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
        <div v-if="!readOnly" class="mb-2 text-xs text-[#999]">
          检测附件单个最大 20MB
        </div>
        <ElTable
          v-if="attachments.length > 0"
          :data="attachments"
          size="small"
          style="width: 100%"
        >
          <ElTableColumn
            prop="file_name"
            label="文件名"
            min-width="220"
            show-overflow-tooltip
          />
          <ElTableColumn label="文件大小" min-width="120"
            ><template #default="{ row }">{{
              formatAttachmentSize(row.file_size)
            }}</template></ElTableColumn
          >
          <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
          <ElTableColumn label="操作" width="140" fixed="right"
            ><template #default="{ row, $index }"
              ><ElLink type="primary" @click="handleDownloadAttachment(row)"
                >下载</ElLink
              ><ElLink
                class="ml-2"
                type="danger"
                :disabled="readOnly"
                @click="handleDeleteAttachment(row, $index)"
                >删除</ElLink
              ></template
            ></ElTableColumn
          >
        </ElTable>
        <div v-else class="py-6 text-center text-[#999]">暂无附件</div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.modal-top-actions {
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
