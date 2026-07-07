<script lang="ts" setup>
import type { ErpProductUnitApi } from '#/api/erp/product/unit';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createProductUnit,
  getProductUnit,
  updateProductUnit,
} from '#/api/erp/product/unit';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

import { ElButton, ElMessage } from 'element-plus';

const emit = defineEmits(['success']);
const formData = ref<ErpProductUnitApi.ProductUnit>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['产品单位'])
    : $t('ui.actionTitle.create', ['产品单位']);
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 80,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  modalApi.lock();
  // 提交表单
  const data = (await formApi.getValues()) as ErpProductUnitApi.ProductUnit;
  try {
    await (formData.value?.id
      ? updateProductUnit(data)
      : createProductUnit(data));
    // 关闭并提示
    await modalApi.close();
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    modalApi.unlock();
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleSubmit();
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }
    // 加载数据
    const data = modalApi.getData<ErpProductUnitApi.ProductUnit>();
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getProductUnit(data.id);
      // 设置到 values
      await formApi.setValues(formData.value);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-1/2"
    content-class="pt-0"
    :footer="false"
    :show-confirm-button="false"
    :show-cancel-button="false"
  >
    <div class="modal-top-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确认</ElButton>
    </div>
    <Form class="mx-4" />
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
