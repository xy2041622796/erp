<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { UploadFile, UploadRawFile } from 'element-plus';

import type { Mode } from '#/views/finance/reimbursement/mine/modules/data';

import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDate } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import {
  createExpenseRegist,
  getExpenseRegist,
  updateExpenseRegist,
} from '#/api/erp/finance/expense-regist';
import { useUpload } from '#/components/upload/use-upload';

import {
  attachmentConfig,
  invoiceConfig,
  useExpenseRegistFormSchema,
} from '#/views/finance/reimbursement/mine/modules/data';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElUpload,
} from 'element-plus';

type InvoiceInfo = {
  amount?: number;
  id: string;
  invoiceNo?: string;
};

type InvoiceDraft = {
  amount?: number;
  invoiceNo?: string;
};

const emit = defineEmits<{ (e: 'success'): void }>();

const userStore = useUserStore();
const { httpRequest: uploadFile } = useUpload('reimbursement');

const loading = ref(false);
const formType = ref<Mode>('create');
const rowId = ref<string | undefined>(undefined);
const fixedExpenseType = ref<string | undefined>(undefined);

const isDetail = computed(() => formType.value === 'detail');

const title = computed(() => {
  if (formType.value === 'detail') return '费用详情';
  if (formType.value === 'edit') return '编辑费用';
  return '新增费用';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-2',
  layout: 'vertical',
  schema: useExpenseRegistFormSchema(formType.value, fixedExpenseType.value),
  showDefaultActions: false,
});

watch(
  [formType, fixedExpenseType],
  () => {
    formApi.updateSchema(
      useExpenseRegistFormSchema(formType.value, fixedExpenseType.value),
    );
  },
  { deep: true },
);

const invoices = ref<InvoiceInfo[]>([]);
const attachmentFiles = ref<UploadFile[]>([]);

function genId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function tryParseMeta(remark?: string) {
  if (!remark) return null;
  const text = String(remark).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function initFromSharedData(data?: any) {
  formType.value = (data?.type ?? 'create') as Mode;
  rowId.value = data?.id;
  fixedExpenseType.value = data?.fixedExpenseType;

  formApi.setDisabled(formType.value === 'detail');

  if (formType.value === 'create') {
    invoices.value = [];
    attachmentFiles.value = [];
    await formApi.setValues(
      {
        expense_type: fixedExpenseType.value ?? undefined,
        registration_date: formatDate(Date.now(), 'YYYY-MM-DD') as string,
        reimburser_name: userStore.userInfo?.nickname ?? '',
        project_id: undefined,
        expense_depart: (userStore.userInfo as any)?.deptId ?? undefined,
        expense_amount: 0,
        tax_rate: 0,
        description: '',

        // 占位字段（用于 slot）
        invoices: '',
        attachments: '',
      },
      false,
    );
    return;
  }

  if (!rowId.value) return;
  loading.value = true;
  try {
    const detail: any = await getExpenseRegist(rowId.value);
    const meta = tryParseMeta(detail?.remark);
    const metaInvoices = Array.isArray(meta?.invoices) ? meta.invoices : [];
    const metaAttachments = Array.isArray(meta?.attachments)
      ? meta.attachments
      : [];

    invoices.value = metaInvoices;
    attachmentFiles.value = metaAttachments.map((x: any) => ({
      name: x?.name ?? '附件',
      url: x?.url,
    }));

    await formApi.setValues(
      {
        expense_type:
          fixedExpenseType.value ?? detail?.expense_type ?? undefined,
        registration_date:
          (formatDate(detail?.registration_date, 'YYYY-MM-DD') as string) ||
          (formatDate(Date.now(), 'YYYY-MM-DD') as string),
        reimburser_name:
          detail?.createuser ?? userStore.userInfo?.nickname ?? '',
        project_id: detail?.project_id ?? undefined,
        expense_depart: detail?.expense_depart ?? undefined,
        expense_amount: Number(detail?.expense_amount ?? 0),
        tax_rate: Number(detail?.tax_rate ?? 0),
        description: detail?.description ?? '',

        // 占位字段（用于 slot）
        invoices: '',
        attachments: '',
      },
      false,
    );
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      invoices.value = [];
      attachmentFiles.value = [];
      return;
    }
    const data = modalApi.getData<any>();
    await initFromSharedData(data);
    invoiceDialogOpen.value = false;
  },
});

const invoiceDialogOpen = ref(false);
const invoiceDraft = reactive<InvoiceDraft>({ invoiceNo: '', amount: 0 });

function openInvoiceDialog() {
  if (isDetail.value) return;
  if (invoices.value.length >= invoiceConfig.maxCount) {
    ElMessage.warning(`最多添加${invoiceConfig.maxCount}张发票信息`);
    return;
  }
  invoiceDraft.invoiceNo = '';
  invoiceDraft.amount = 0;
  invoiceDialogOpen.value = true;
}

function confirmAddInvoice() {
  if (isDetail.value) return;
  const invoiceNo = String(invoiceDraft.invoiceNo ?? '').trim();
  const amount = Number(invoiceDraft.amount ?? 0);
  if (!invoiceNo) {
    ElMessage.warning('请输入发票号');
    return;
  }
  if (!Number.isFinite(amount) || amount < 0) {
    ElMessage.warning('请输入正确的金额');
    return;
  }
  invoices.value.push({ id: genId(), invoiceNo, amount });
  invoiceDialogOpen.value = false;
}

function handleRemoveInvoice(id: string) {
  invoices.value = invoices.value.filter((x) => x.id !== id);
}

function cancelInvoiceDialog() {
  invoiceDialogOpen.value = false;
}

function beforeUpload(file: UploadRawFile) {
  const maxSize = attachmentConfig.maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    ElMessage.error(`单个附件最大 ${attachmentConfig.maxSizeMB}MB`);
    return false;
  }
  if (attachmentFiles.value.length >= attachmentConfig.maxCount) {
    ElMessage.error(`最多上传 ${attachmentConfig.maxCount} 个附件`);
    return false;
  }
  return true;
}

function onUploadChange(_file: UploadFile, fileList: UploadFile[]) {
  attachmentFiles.value = fileList.slice(0, attachmentConfig.maxCount);
}

async function ensureAttachmentUrls() {
  for (const file of attachmentFiles.value) {
    const existingUrl = (file as any).url;
    if (existingUrl) continue;
    const raw = (file as any).raw as File | undefined;
    if (!raw) continue;
    const res: any = await uploadFile(raw);
    const url = res?.data?.url || res?.url || res;
    (file as any).url = url;
  }
}

function toPayload(values: any) {
  // const attachments = attachmentFiles.value.map((f) => ({
  //   name: f.name,
  //   url: (f as any).url,
  // }));

  // const meta = {
  //   invoices: invoices.value,
  //   attachments,
  // };

  const dateOnly = String(values.registration_date ?? '').trim();
  const registrationDateValue = dateOnly
    ? `${dateOnly} 00:00:00`
    : (formatDate(Date.now(), 'YYYY-MM-DD') as string);

  const base: any = {
    rowid: rowId.value,
    registration_date: registrationDateValue,
    user_id: userStore.userInfo?.id,
    expense_depart: values.expense_depart,
    project_id: values.project_id,
    expense_amount: values.expense_amount,
    tax_rate: values.tax_rate,
    expense_type: fixedExpenseType.value ?? values.expense_type,
    remark: values.remark,
  };

  if (formType.value === 'create') {
    return {
      ...base,
      rowid: rowId.value ?? genId(),
      createuser: userStore.userInfo?.nickname ?? userStore.userInfo?.id,
      createtime: Date.now().toString(),
      flowstate: 0,
      lingma_sys_is_delete: 0,
    };
  }

  return base;
}

async function submit(closeAfter: boolean) {
  if (isDetail.value) return;

  const { valid } = await formApi.validate();
  if (!valid) return;

  loading.value = true;
  try {
    await ensureAttachmentUrls();
    const values = await formApi.getValues();
    const payload = toPayload(values);

    await (formType.value === 'edit'
      ? updateExpenseRegist(payload)
      : createExpenseRegist(payload));

    ElMessage.success('保存成功');
    emit('success');

    if (closeAfter) {
      modalApi.close();
    } else {
      formType.value = 'create';
      rowId.value = undefined;
      invoices.value = [];
      attachmentFiles.value = [];
      await formApi.setValues(
        {
          expense_type: fixedExpenseType.value ?? undefined,
          registration_date: formatDate(Date.now(), 'YYYY-MM-DD') as string,
          reimburser_name: userStore.userInfo?.nickname ?? '',
          project_id: undefined,
          expense_depart: (userStore.userInfo as any)?.deptId ?? undefined,
          expense_amount: 0,
          tax_rate: 0,
          description: '',
          invoices: '',
          attachments: '',
        },
        false,
      );
    }
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  modalApi.close();
}
</script>

<template>
  <Modal :title="title" :loading="loading" class="!w-[60vw]">
    <Form class="mx-3">
      <template #invoices>
        <div class="section">
          <div class="section-title">
            <el-button
              type="primary"
              link
              :disabled="isDetail"
              @click="openInvoiceDialog"
            >
              {{ invoiceConfig.addButtonText }}
            </el-button>
            <span class="section-hint">{{ invoiceConfig.hint }}</span>
          </div>

          <div v-if="invoices.length > 0" class="invoice-list">
            <div v-for="inv in invoices" :key="inv.id" class="invoice-row">
              <div class="invoice-main">
                发票号：{{ inv.invoiceNo }}，金额：{{
                  moneyText(inv.amount)
                }}
              </div>
              <el-button
                v-if="!isDetail"
                type="danger"
                link
                @click="handleRemoveInvoice(inv.id)"
              >
                {{ invoiceConfig.deleteButtonText }}
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <template #attachments>
        <div class="section">
          <div class="section-title">
            <el-button type="primary" link :disabled="isDetail">
              {{ attachmentConfig.addButtonText }}
            </el-button>
            <span class="section-hint">{{ attachmentConfig.hint }}</span>
          </div>

          <el-upload
            v-model:file-list="attachmentFiles"
            :http-request="uploadFile"
            :before-upload="beforeUpload"
            :on-change="onUploadChange"
            :limit="attachmentConfig.maxCount"
            multiple
            :disabled="isDetail"
          >
            <el-button :disabled="isDetail" type="primary">
              {{ attachmentConfig.selectFileButtonText }}
            </el-button>
          </el-upload>
        </div>
      </template>
    </Form>

    <el-dialog
      v-model="invoiceDialogOpen"
      :title="invoiceConfig.dialogTitle"
      :width="invoiceConfig.dialogWidth"
      append-to-body
    >
      <el-form label-position="top">
        <el-form-item label="发票号" required>
          <el-input
            v-model="invoiceDraft.invoiceNo"
            :placeholder="invoiceConfig.invoiceNoPlaceholder"
          />
        </el-form-item>
        <el-form-item label="金额" required>
          <el-input-number
            v-model="invoiceDraft.amount"
            :min="0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cancelInvoiceDialog">
          {{ invoiceConfig.cancelText }}
        </el-button>
        <el-button type="primary" @click="confirmAddInvoice">
          {{ invoiceConfig.confirmText }}
        </el-button>
      </template>
    </el-dialog>

    <template #footer>
      <div class="footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button v-if="!isDetail" type="primary" @click="submit(true)">
          保存
        </el-button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.section {
  margin-top: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-hint {
  color: #909399;
  font-size: 12px;
}

.invoice-list {
  margin-top: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.invoice-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-top: 1px solid var(--el-border-color);
}

.invoice-row:first-child {
  border-top: 0;
}

.invoice-main {
  color: var(--el-text-color-regular);
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
