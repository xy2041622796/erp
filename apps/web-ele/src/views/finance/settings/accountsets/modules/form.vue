<script lang="ts" setup>
import type { BilAccountSetApi } from '#/api/erp/finance/settings/accountset';

import { ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { generateUUID } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { getEnabledCurrencyOptions } from '#/api/erp/finance/settings/currency';
import {
  createAccountSet,
  getAccountSet,
  updateAccountSet,
} from '#/api/erp/finance/settings/accountset';

import { useFormSchema } from '#/views/finance/settings/accountsets/data';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'detail' | 'edit'>('create');
const defaultFormData = (): Partial<BilAccountSetApi.AccountSet> => ({
  lingma_sys_is_delete: 0,
  tax_type: 'small',
  vat_rate: '0',
  account_version: 1,
  recording_currency: 'CNY',
});

const formData = ref<Partial<BilAccountSetApi.AccountSet>>(defaultFormData());
const currencyOptions = ref<Array<{ label: string; value: string }>>([
  { label: '人民币(CNY)', value: 'CNY' },
]);

async function loadCurrencyOptions() {
  try {
    const options = await getEnabledCurrencyOptions();
    currencyOptions.value = Array.isArray(options) && options.length > 0
      ? options.map((item) => ({
          label: String(item.label || item.value || 'CNY'),
          value: String(item.value || item.code || 'CNY'),
        }))
      : [{ label: '人民币(CNY)', value: 'CNY' }];
  } catch {
    currencyOptions.value = [{ label: '人民币(CNY)', value: 'CNY' }];
  }
}

const buildSchema = () => useFormSchema(formType.value, formData.value, currencyOptions.value);

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid grid-cols-1 gap-x-4 md:grid-cols-2',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

watch([formType, formData], () => {
  formApi.updateSchema(buildSchema());
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      const payload: any = { ...values };
      // 格式化日期字段
      if (payload.start_date && typeof payload.start_date === 'string') {
        // 将 YYYY-MM 格式转换为 YYYY-MM-01
        payload.start_date = `${payload.start_date}-01`;
      }
      // init_date 保持原格式 YYYY-MM-DD
      if (formType.value === 'create') {
        const rowid = payload.rowid || generateUUID();
        payload.rowid = rowid;
        payload.account_set_id = payload.account_set_id || rowid;
        await createAccountSet(payload as any);
      } else if (formType.value === 'edit') {
        await updateAccountSet(payload as any);
      }
      ElMessage.success('保存成功');
      emit('success', { ...formData.value, ...payload });
      await modalApi.close();
    } catch (error: any) {
      ElMessage.error(error?.message || '保存失败');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formType.value = 'create';
      formData.value = defaultFormData();
      return;
    }

    const data = modalApi.getData<{
      id?: string;
      type: 'create' | 'detail' | 'edit';
    }>();

    formType.value = data?.type ?? 'create';
    await loadCurrencyOptions();
    formApi.updateSchema(buildSchema());

    if (!data?.id) {
      formData.value = defaultFormData();
      await formApi.setValues(formData.value as any, false);
      return;
    }

    modalApi.lock();
    try {
      const res = await getAccountSet(data.id as string);
      formData.value = { ...defaultFormData(), ...(res || {}) };
      formApi.updateSchema(buildSchema());
      await formApi.setValues(formData.value as any, false);
    } catch (error: any) {
      ElMessage.error(error?.message || '加载失败');
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="
      formType === 'create'
        ? '新增账套'
        : formType === 'edit'
          ? '编辑账套'
          : '账套详情'
    "
    :show-confirm-button="formType !== 'detail'"
  >
    <Form class="mx-4 accountset-form-two-cols" />
  </Modal>
</template>

<style scoped>
:deep(.accountset-form-main-business) {
  grid-column: 1 / -1;
}
</style>
