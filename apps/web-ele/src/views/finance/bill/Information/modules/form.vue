<script lang="ts" setup>
import type { BilSalesCompanyApi } from '#/api/erp/finance/bill/Information';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';


import { useVbenForm } from '#/adapter/form';
import {
  createSalesCompany,
  getSalesCompany,
  updateSalesCompany,
} from '#/api/erp/finance/bill/Information';

import { useFormSchema } from '#/views/finance/bill/Information/data';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'detail' | 'edit'>('create');
const formData = ref<BilSalesCompanyApi.SalesCompany>();

const getTitle = computed(() => {
  if (formType.value === 'create') return '新增销方公司';
  if (formType.value === 'edit') return '编辑销方公司';
  return '销方公司详情';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-1',
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

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    try {
      const data =
        (await formApi.getValues()) as BilSalesCompanyApi.SalesCompany;
      if (formType.value === 'create') {
        await createSalesCompany(data);
      } else if (formType.value === 'edit') {
        await updateSalesCompany(data);
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
      formData.value = undefined;
      return;
    }

    const data = modalApi.getData<{
      id?: string;
      lingma_sys_ent?: string;
      type: any;
    }>();
    formType.value = data.type;

    formApi.setDisabled(formType.value === 'detail');

    if (!data?.id) {
      // 新增默认值
      await formApi.setValues(
        {
          lingma_sys_is_delete: 0,
        },
        false,
      );
      return;
    }

    modalApi.lock();
    try {
      const res = await getSalesCompany(data.id, data.lingma_sys_ent);
      formData.value = (res || {}) as any;
      await formApi.setValues(formData.value as any, false);
    } catch (error: any) {
      ElMessage.error(error?.message ?? '加载失败');
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    class="w-1/2"
    :title="getTitle"
    :show-confirm-button="formType !== 'detail'"
  >
    <Form class="mx-4" />
  </Modal>
</template>
