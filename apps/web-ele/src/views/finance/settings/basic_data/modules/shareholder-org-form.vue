<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  createShareholderOrg,
  updateShareholderOrg,
} from '#/api/erp/finance/settings/basic_data/shareholder_org';

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
  if (formType.value === 'create') return '新增股东/机构';
  if (formType.value === 'edit') return '编辑股东/机构';
  return '股东/机构详情';
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
      fieldName: 'type',
      label: '类型',
      component: 'Select',
      componentProps: {
        disabled: readonly.value,
        options: [
          { label: '机构', value: '机构' },
          { label: '股东', value: '股东' },
        ],
      },
      rules: 'required',
    },
    {
      fieldName: 'description',
      label: '备注',
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
        type: values.type,
        description: values.description,
        enabled: values.enabled,
      };
      await (formType.value === 'create'
        ? createShareholderOrg(dto)
        : updateShareholderOrg(dto));

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
      type: row?.type ?? '机构',
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
