<script lang="ts" setup>
import type { BilAccountSetApi } from '#/api/erp/finance/settings/accountset';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  createAccountSet,
  getAccountSet,
  updateAccountSet,
} from '#/api/erp/finance/settings/accountset';

import { useFormSchema } from '#/views/finance/settings/accountset/data';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);
const formType = ref<'create' | 'detail' | 'edit'>('create');
const formData = ref<Partial<BilAccountSetApi.AccountSet>>({});

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-1',
  layout: 'vertical',
  schema: useFormSchema(formType.value, formData.value),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      if (formType.value === 'create') {
        await createAccountSet(values as any);
      } else if (formType.value === 'edit') {
        await updateAccountSet(values as any);
      }
      await modalApi.close();
      emit('success');
      ElMessage.success('保存成功');
    } catch (error: any) {
      ElMessage.error(error?.message || '保存失败');
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
    if (!data?.id) {
      await formApi.setValues({ lingma_sys_is_delete: 0 } as any, false);
      return;
    }
    modalApi.lock();
    try {
      const res = await getAccountSet(data.id as string);
      formData.value = res || {};
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
    <Form class="mx-4" />
  </Modal>
</template>
