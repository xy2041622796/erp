<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  createTaxCategory,
  updateTaxCategory,
} from '#/api/erp/finance/settings/basic_data/tax_category';

import { ElMessage } from 'element-plus';

type FormType = 'create' | 'detail' | 'edit';

type ModalData = {
  row?: any;
  type: FormType;
};

const emit = defineEmits(['success']);

const formType = ref<FormType>('create');
const readonly = computed(() => formType.value === 'detail');

const modalTitle = computed(() => {
  if (formType.value === 'create') return '新增税费类别';
  if (formType.value === 'edit') return '编辑税费类别';
  return '税费类别详情';
});

const buildSchema = () => {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'name',
      label: '名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入名称',
        allowClear: true,
        disabled: readonly.value,
      },
      rules: 'required',
    },
    {
      fieldName: 'rate',
      label: '税率/费率(%)',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 100,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
      rules: 'required',
    },
    {
      fieldName: 'description',
      label: '说明',
      component: 'InputTextArea',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        disabled: readonly.value,
        rows: 3,
      },
    },
    {
      fieldName: 'enabled',
      label: '启用',
      component: 'Switch',
      componentProps: {
        disabled: readonly.value,
        activeValue: 1,
        inactiveValue: 0,
      },
    },
  ];
};

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-1',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

watch(formType, () => {
  formApi.updateSchema(buildSchema());
});

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
      const values = await formApi.getValues();
      const dto = {
        id: values.id,
        name: values.name,
        rate: Number(values.rate ?? 0),
        description: values.description,
        enabled: values.enabled,
      };
      await (formType.value === 'create'
        ? createTaxCategory(dto)
        : updateTaxCategory(dto));

      ElMessage.success('保存成功');
      emit('success');
      await modalApi.close();
    } catch (error: any) {
      ElMessage.error(error?.message || '保存失败');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) return;

    const data = modalApi.getData<ModalData>();
    formType.value = data?.type ?? 'create';

    const row = data?.row;
    const initial = {
      id: row?.id ?? '',
      name: row?.name ?? '',
      rate: row?.rate ?? 0,
      description: row?.description ?? '',
      enabled: row?.enabled ?? 1,
    };

    await formApi.setValues(initial as any, false);
  },
});
</script>

<template>
  <Modal
    :title="modalTitle"
    confirm-text="保存"
    cancel-text="取消"
    :show-confirm-button="formType !== 'detail'"
    class="w-[720px]"
  >
    <Form class="mx-4" />
  </Modal>
</template>
