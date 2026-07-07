<script lang="ts" setup>
import { ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  createVoucherWord,
  getVoucherWord,
  updateVoucherWord,
} from '#/api/erp/finance/settings/voucher_word';

import { useFormSchema } from '#/views/finance/settings/voucher_word/data';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'detail' | 'edit'>('create');
const formData = ref<any>({});

const buildSchema = () => useFormSchema(formType.value, formData.value);

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-1',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

watch(
  [formType, formData],
  () => {
    formApi.updateSchema(buildSchema());
  },
  { deep: true },
);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (formType.value === 'detail') {
      await modalApi.close();
      return;
    }

    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    try {
      const values = (await formApi.getValues()) as any;

      // 兼容后端表字段：accountSetId（可选）
      // 若你们希望按账套隔离，可在打开弹窗时从 store 注入 accountSetId
      if (formType.value === 'create') {
        await createVoucherWord(values);
      } else if (formType.value === 'edit') {
        await updateVoucherWord(values);
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
      formData.value = {};
      return;
    }

    const data = modalApi.getData<{ id?: string; type: 'create' | 'detail' | 'edit'; accountSetId?: string }>();
    formType.value = data.type;

    if (!data?.id) {
      formData.value = { isDefault: false, ordIdx: 0, accountSetId: data?.accountSetId };
      await formApi.setValues(formData.value, false);
      return;
    }

    modalApi.lock();
    try {
      const res = await getVoucherWord(data.id);
      formData.value = { ...(res || {}), accountSetId: data?.accountSetId || (res as any)?.accountSetId };
      await formApi.setValues(formData.value, false);
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
        ? '新增凭证字'
        : formType === 'edit'
          ? '编辑凭证字'
          : '凭证字详情'
    "
    :show-confirm-button="formType !== 'detail'"
  >
    <Form class="mx-4" />
  </Modal>
</template>
