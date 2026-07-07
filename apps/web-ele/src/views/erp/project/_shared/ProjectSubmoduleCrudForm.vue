<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import { ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'edit' | 'detail'>('create');
const currentTitle = ref('');
const currentPrimaryKey = ref('id');
const currentDefaultValues = ref<Record<string, any>>({});
const currentApis = ref<any>(null);
const currentNormalizers = ref<any>(null);
const currentStaffPickerFields = ref<any[]>([]);
const formData = ref<Record<string, any>>();
const pickerModelMap = ref<Record<string, string | string[] | undefined>>({});

const getTitle = computed(() => currentTitle.value || '编辑');

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  wrapperClass: 'grid grid-cols-2 gap-x-6',
  layout: 'vertical',
  schema: [],
  showDefaultActions: false,
});

function syncPickerModels(values?: Record<string, any>) {
  const next: Record<string, any> = {};
  for (const item of currentStaffPickerFields.value || []) {
    next[item.fieldName] = values?.[item.fieldName];
  }
  pickerModelMap.value = next;
}

async function handleStaffPickerChange(fieldName: string, value?: string | string[]) {
  pickerModelMap.value = {
    ...pickerModelMap.value,
    [fieldName]: value,
  };
  await formApi.setValues({ [fieldName]: value }, false);
}

async function handleStaffPickerData(field: any, value?: Staff | Staff[]) {
  if (!field?.relatedFields) return;
  const row = Array.isArray(value) ? value[0] : value;
  const patch: Record<string, any> = {};
  if (row) {
    for (const [source, target] of Object.entries(field.relatedFields)) {
      patch[String(target)] = (row as any)?.[source];
    }
  } else {
    for (const target of Object.values(field.relatedFields)) {
      patch[target as string] = undefined;
    }
  }
  await formApi.setValues(patch, false);
}

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
      let values = (await formApi.getValues()) as Record<string, any>;
      if (typeof currentNormalizers.value?.beforeSubmit === 'function') {
        values = await currentNormalizers.value.beforeSubmit(values, formType.value);
      }
      const pk = currentPrimaryKey.value;
      const rowId = values?.[pk];
      if (formType.value === 'edit' && rowId) {
        await currentApis.value?.updateData?.(values);
      } else {
        await currentApis.value?.createData?.(values);
      }
      await modalApi.close();
      emit('success');
      ElMessage.success('操作成功');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formType.value = 'create';
      currentTitle.value = '';
      currentPrimaryKey.value = 'id';
      currentDefaultValues.value = {};
      currentApis.value = null;
      currentNormalizers.value = null;
      currentStaffPickerFields.value = [];
      formData.value = undefined;
      pickerModelMap.value = {};
      await formApi.resetForm();
      formApi.setDisabled(false);
      return;
    }

    const data = modalApi.getData<any>() ?? {};
    formType.value = data.type ?? 'create';
    currentTitle.value = data.title ?? '';
    currentPrimaryKey.value = data.primaryKey ?? 'id';
    currentDefaultValues.value = data.defaultValues ?? {};
    currentApis.value = data.apis ?? null;
    currentNormalizers.value = data.normalizers ?? null;
    currentStaffPickerFields.value = data.staffPickerFields ?? [];
    formApi.setState({ schema: data.schema ?? [] });
    formApi.setDisabled(formType.value === 'detail');

    modalApi.lock();
    try {
      let values = {
        ...(currentDefaultValues.value || {}),
        ...(data.values || {}),
      } as Record<string, any>;
      const pk = currentPrimaryKey.value;
      const rowId = values?.[pk] ?? data?.[pk] ?? data?.rowid ?? data?.id;
      if ((formType.value === 'edit' || formType.value === 'detail') && rowId) {
        values = (await currentApis.value?.getDetail?.(String(rowId))) || values;
      }
      if (typeof currentNormalizers.value?.afterLoad === 'function') {
        values = await currentNormalizers.value.afterLoad(values, formType.value);
      }
      formData.value = values;
      syncPickerModels(values);
      await formApi.setValues(values);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="!w-[75vw]">
    <Form class="px-4 pb-2">
      <template
        v-for="field in currentStaffPickerFields"
        :key="field.fieldName"
        #[field.fieldName]
      >
        <StaffPicker
          :model-value="pickerModelMap[field.fieldName]"
          :multiple="field.multiple"
          :disabled="formType === 'detail'"
          :placeholder="field.placeholder"
          @update:model-value="(value) => handleStaffPickerChange(field.fieldName, value as any)"
          @update:data="(value) => handleStaffPickerData(field, value as any)"
        />
      </template>
    </Form>
  </Modal>
</template>
