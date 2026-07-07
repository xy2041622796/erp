<script lang="ts" setup>
import type { ErpAccountApi } from '#/api/erp/finance/account';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  createAccount,
  getAccount,
  updateAccount,
} from '#/api/erp/finance/account';
import { $t } from '#/locales';

import { useFormSchema } from '#/views/finance/account/data';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);
const formData = ref<ErpAccountApi.Account>();
const getTitle = computed(() => {
  return formData.value?.rowid
    ? $t('ui.actionTitle.edit', ['结算账户'])
    : $t('ui.actionTitle.create', ['结算账户']);
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 100,
  },
  wrapperClass: 'grid-cols-2',
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const data = (await formApi.getValues()) as ErpAccountApi.Account;
      await (formData.value?.rowid ? updateAccount(data) : createAccount(data));
      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      await formApi.resetForm();
      return;
    }

    await formApi.resetForm();
    const data = modalApi.getData<ErpAccountApi.Account>();
    if (!data || !data.rowid) {
      return;
    }

    modalApi.lock();
    try {
      const res = (await getAccount(data.rowid as any)) as ErpAccountApi.Account;
      formData.value = res;
      await formApi.setValues(formData.value);
    } finally {
      modalApi.unlock();
    }
  },
});

defineExpose({
  modalApi,
});
</script>

<template>
  <Modal :title="getTitle" class="w-1/2">
    <Form class="mx-4" />
  </Modal>
</template>
