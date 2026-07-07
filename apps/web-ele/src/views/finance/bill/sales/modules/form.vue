<script lang="ts" setup>
import type { BilInvoiceInfoApi } from '#/api/erp/finance/bill/sales';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { formatDateTime, generateUUID } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { getInvoiceApply } from '#/api/erp/finance/bill/invoice';
import {
  createInvoiceInfo,
  getInvoiceInfo,
  updateInvoiceInfo,
} from '#/api/erp/finance/bill/sales';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useFormSchema } from '#/views/finance/bill/sales/data';
import ItemForm from '#/views/finance/bill/sales/modules/item-form.vue';
import SellerCompanySelect from '#/views/finance/bill/sales/modules/seller-company-select.vue';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'detail' | 'edit'>('create');

const formData = ref<BilInvoiceInfoApi.InvoiceInfo>({
  rowid: undefined,
  lingma_sys_is_delete: 0,
  is_seller_invoice: 1,
  is_red_invoice: 0,
  is_electronic_invoice: 1,
  invoice_amount: 0,
  tax_amount: 0,
  total_amount: 0,
  details: [],
});

const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const sellerCompanyId = ref<string | undefined>();

const { hasFieldPermission } = useDataTablePermission();

const sellerCompanyDisabled = computed(() => {
  if (formType.value === 'detail') return true;
  const isPer = hasFieldPermission(formData.value);
  return isPer('fd:edit', 'seller_company_id', formType.value);
});

function handleUpdateSellerCompanyId(v: string | undefined) {
  sellerCompanyId.value = v;
  formApi.setFieldValue('seller_company_id', v);
}

function handleSelectSellerCompany(row: any) {
  if (!row) return;

  // 回填：seller_company_id + 发票抬头/税号/地址/电话/开户行/账号
  formApi.setFieldValue('seller_company_id', row.id);
  sellerCompanyId.value = row.id;
  if (row.company_name)
    formApi.setFieldValue('invoice_title', row.company_name);
  if (row.taxID) formApi.setFieldValue('tax_number', row.taxID);
  if (row.address) formApi.setFieldValue('address', row.address);
  if (row.phone) formApi.setFieldValue('contact_phone', row.phone);
  if (row.bank_name) formApi.setFieldValue('bank_name', row.bank_name);
  if (row.bank_account) formApi.setFieldValue('bank_account', row.bank_account);
}

const getTitle = computed(() => {
  if (formType.value === 'create') {
    return '新增销项发票';
  } else if (formType.value === 'edit') {
    return $t('ui.actionTitle.edit', ['开票信息']);
  }
  return '开票信息详情';
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
});

watch(
  [formType, formData],
  () => {
    formApi.updateSchema(useFormSchema(formType.value, formData.value));
  },
  { deep: true },
);

function handleUpdateDetails(items: any[]) {
  formData.value.details = items;
  formApi.setValues({ details: items });
}

function handleUpdateInvoiceAmount(v: number) {
  formApi.setValues({ invoice_amount: v });
}

function handleUpdateTaxAmount(v: number) {
  formApi.setValues({ tax_amount: v });
}

function handleUpdateTotalAmount(v: number) {
  formApi.setValues({ total_amount: v });
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const itemFormInstance = Array.isArray(itemFormRef.value)
      ? itemFormRef.value[0]
      : itemFormRef.value;

    try {
      itemFormInstance?.validate?.();
    } catch (error: any) {
      ElMessage.error(error?.message || '明细校验失败');
      return;
    }

    modalApi.lock();
    try {
      const data = (await formApi.getValues()) as BilInvoiceInfoApi.InvoiceInfo;

      // 规范化 issue_date（DatePicker valueFormat=x）
      if (data.issue_date) {
        const ts = Number(data.issue_date);
        const date = Number.isNaN(ts)
          ? new Date(data.issue_date as any)
          : new Date(ts);
        data.issue_date = formatDateTime(date);
      }

      // 确保明细 rowid 稳定，便于增删改对比
      if (Array.isArray(data.details)) {
        data.details = data.details.map((d: any) => ({
          ...d,
          rowid: d.rowid || generateUUID(),
        }));
      }

      if (formType.value === 'create') {
        await createInvoiceInfo(data);
      } else if (formType.value === 'edit') {
        await updateInvoiceInfo(data);
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
      sellerCompanyId.value = undefined;
      return;
    }

    const data = modalApi.getData<{
      defaultValues?: Partial<BilInvoiceInfoApi.InvoiceInfo>;
      id?: string;
      type: 'create' | 'detail' | 'edit';
    }>();
    formType.value = data.type;

    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value, formData.value));

    if (!data?.id) {
      // 新增默认一行明细

      const res = await getInvoiceApply(data?.defaultValues?.id || '');
      // console.log('res', res);
      // debugger;
      formData.value = {
        rowid: undefined,
        lingma_sys_is_delete: 0,
        is_seller_invoice: 1,
        is_red_invoice: 0,
        is_electronic_invoice: 1,
        invoice_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        // details: [
        //   { invoice_amount: 0, tax_rate: 0, tax_amount: 0, total_amount: 0 },
        // ],
        ...data.defaultValues,
        details: res?.details || [],
      };

      await formApi.setValues(formData.value as any, false);
      sellerCompanyId.value = (formData.value as any)?.seller_company_id;
      return;
    }

    modalApi.lock();
    try {
      const res = await getInvoiceInfo(data.id);
      formData.value = (res || {}) as any;
      if (!Array.isArray(formData.value.details)) formData.value.details = [];
      await formApi.setValues(formData.value as any, false);
      sellerCompanyId.value = (formData.value as any)?.seller_company_id;
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
      <template #seller_company_id>
        <SellerCompanySelect
          :disabled="sellerCompanyDisabled"
          :value="sellerCompanyId"
          @update:value="handleUpdateSellerCompanyId"
          @select="handleSelectSellerCompany"
        />
      </template>
      <template #details>
        <ItemForm
          ref="itemFormRef"
          :items="formData?.details ?? []"
          :disabled="formType === 'detail'"
          @update:items="handleUpdateDetails"
          @update:invoice_amount="handleUpdateInvoiceAmount"
          @update:tax_amount="handleUpdateTaxAmount"
          @update:total_amount="handleUpdateTotalAmount"
        />
      </template>
    </Form>
  </Modal>
</template>
