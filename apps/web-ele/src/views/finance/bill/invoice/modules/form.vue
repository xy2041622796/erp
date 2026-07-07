<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { BilInvoiceApplyApi } from '#/api/erp/finance/bill/invoice';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { formatDateTime, generateUUID } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { getCustomerInvoices } from '#/api/erp/customer';
import {
  createInvoiceApply,
  getInvoiceApply,
  updateInvoiceApply,
} from '#/api/erp/finance/bill/invoice';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import { useFormSchema } from '#/views/finance/bill/invoice/data';
import DetailItems from '#/views/finance/bill/invoice/modules/detail-items.vue';
import SourceImport from '#/views/finance/bill/invoice/modules/source-import.vue';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'detail' | 'edit'>('create');

const formData = ref<BilInvoiceApplyApi.InvoiceApply>({
  rowid: undefined,
  lingma_sys_is_delete: 0,
  is_red_invoice: 0,
  total_amount: 0,
  balance: 0,
  status: 10,
  relates: [],
  details: [],
});

const customerId = computed(() => formData.value.customer_id);

const getTitle = computed(() => {
  if (formType.value === 'create') {
    return $t('ui.actionTitle.create', ['开票申请']);
  } else if (formType.value === 'edit') {
    return $t('ui.actionTitle.edit', ['开票申请']);
  }
  return '开票申请详情';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema(formType.value, formData.value),
  showDefaultActions: false,
  handleValuesChange: async (values, changedFields) => {
    if (!changedFields.includes('customer_id')) return;

    formData.value.customer_id = values.customer_id;

    // 清空关联来源与明细
    formData.value.relates = [] as any;
    formData.value.details = [] as any;
    // formApi.setFieldValue('relates', []);
    // formApi.setFieldValue('details', []);
    // formApi.setFieldValue('total_amount', 0);

    // 根据客户获取发票信息并自动带出（取第一条作为默认值）
    const customerId = values.customer_id;
    if (!customerId) {
      formApi.setValues(
        {
          invoice_title: '',
          tax_number: '',
          bank_name: '',
          bank_account: '',
          address: '',
          contact_phone: '',
        },
        false,
      );
      return;
    }

    const currentReqId = ++customerInvoiceReqId.value;
    try {
      const invoices = await getCustomerInvoices(customerId);
      if (currentReqId !== customerInvoiceReqId.value) return;

      const first = Array.isArray(invoices) ? invoices[0] : undefined;
      formApi.setValues(
        {
          invoice_title: first?.invoiceTitle || '',
          tax_number: first?.taxNumber || '',
          bank_name: first?.bankName || '',
          bank_account: first?.bankAccount || '',
          address: first?.address || '',
          contact_phone: first?.phone || '',
        },
        false,
      );
    } catch (error: any) {
      void error;
      if (currentReqId !== customerInvoiceReqId.value) return;
      ElMessage.warning('获取客户发票信息失败');
    }
  },
});

const customerInvoiceReqId = ref(0);

async function syncWholeFormValues(
  patch: Partial<BilInvoiceApplyApi.InvoiceApply>,
) {
  const current =
    (await formApi.getValues()) as unknown as BilInvoiceApplyApi.InvoiceApply;
  const next = {
    ...current,
    ...patch,
  } as BilInvoiceApplyApi.InvoiceApply;
  formData.value = next;
  await formApi.setValues(next as any, false);
}

async function handleUpdateDetails(items: any[]) {
  await formApi.setValues({ details: items });
}

function handleUpdateTotalAmount(total: number) {
  void syncWholeFormValues({ total_amount: total as any });
}

function handleImportDetails(rows: any) {
  void syncWholeFormValues(rows);
  // void syncWholeFormValues({ details: rows as any });
}

function handleUpdateContractId(contractId: string | undefined) {
  void syncWholeFormValues({ contract_id: contractId as any });
}

function handleSalespersonChange(staff?: Staff) {
  if (!staff) {
    formData.value.applicant = '' as any;
    void formApi.setValues({ applicant: undefined }, false);
    return;
  }
  // 存储显示名为申请人
  formData.value.applicant = (staff.UserName ?? staff.ROWID) as any;
  // 部门

  formData.value.apply_department = (staff?.DepName ?? staff.DepID) as any;
  void formApi.setValues(
    {
      applicant: formData.value.applicant,
      apply_department: formData.value.apply_department,
    },
    false,
  );
}

// 修改表单
function handelUpdateValue(value: any) {
  void syncWholeFormValues(value as any);
}
const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    try {
      const data =
        (await formApi.getValues()) as BilInvoiceApplyApi.InvoiceApply;

      // 规范化 apply_date（DatePicker valueFormat=x）
      if (data.apply_date) {
        const ts = Number(data.apply_date);
        const date = Number.isNaN(ts)
          ? new Date(data.apply_date as any)
          : new Date(ts);
        data.apply_date = formatDateTime(date);
      }

      if (formType.value === 'create') {
        data.rowid = data.rowid || generateUUID();
        await createInvoiceApply(data);
      } else if (formType.value === 'edit') {
        await updateInvoiceApply(data);
      }

      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },

  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = {} as any;
      return;
    }

    const data = modalApi.getData<{
      id?: string;
      type: 'create' | 'detail' | 'edit';
    }>();
    formType.value = data.type;

    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value, formData.value));

    if (!data?.id) {
      // 新增默认值
      formData.value = {
        rowid: undefined,
        is_red_invoice: 0,
        total_amount: 0,
        balance: 0,
        status: 10,
        relates: [],
        details: [],
      };
      await formApi.setValues(formData.value as any, false);
      return;
    }

    modalApi.lock();
    try {
      const res = await getInvoiceApply(data.id);
      formData.value = (res || {}) as any;
      if (!Array.isArray(formData.value.details)) formData.value.details = [];
      if (!Array.isArray(formData.value.relates)) formData.value.relates = [];
      await formApi.setValues(formData.value as any, false);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-3/4"
    :show-confirm-button="formType !== 'detail'"
  >
    <Form class="mx-3">
      <template #details>
        <DetailItems
          :key="formType"
          v-model="formData.details"
          :readonly="formType === 'detail'"
          @update:model-value="handleUpdateDetails"
          @update:total-amount="handleUpdateTotalAmount"
        />
      </template>

      <template #relates>
        <SourceImport
          :customer-id="customerId"
          :readonly="formType === 'detail'"
          @import-details="handleImportDetails"
          @update:contract-id="handleUpdateContractId"
          @update:value="handelUpdateValue"
        />
      </template>

      <template #applicant>
        <StaffPicker
          :model-value="formData.applicant"
          @update:model-value="(val) => (formData.applicant = val)"
          @update:data="handleSalespersonChange"
        />
      </template>
    </Form>
  </Modal>
</template>
