<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import { ElButton, ElMessage, ElOption, ElSelect } from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'edit' | 'detail'>('create');
const currentTitle = ref('');
const currentPrimaryKey = ref('id');
const currentDefaultValues = ref<Record<string, any>>({});
const currentApis = ref<any>(null);
const currentNormalizers = ref<any>(null);
const currentStaffPickerFields = ref<any[]>([]);
const currentCustomSelectFields = ref<any[]>([]);
const formData = ref<Record<string, any>>();
const pickerModelMap = ref<Record<string, string | string[] | undefined>>({});
const customSelectModelMap = ref<Record<string, any>>({});
const customSelectOptionsMap = ref<Record<string, any[]>>({});
const customSelectLoadingMap = ref<Record<string, boolean>>({});
const projectPickerModel = ref('');

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

function syncCustomSelectModels(values?: Record<string, any>) {
  const next: Record<string, any> = {};
  for (const item of currentCustomSelectFields.value || []) {
    next[item.fieldName] = values?.[item.fieldName];
  }
  customSelectModelMap.value = next;
  projectPickerModel.value = String(values?.project_id || '').trim();
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

async function loadCustomSelectOptions(field: any) {
  if (!field?.fieldName || typeof field.loader !== 'function') return;
  const fieldName = String(field.fieldName);
  customSelectLoadingMap.value = {
    ...customSelectLoadingMap.value,
    [fieldName]: true,
  };
  try {
    const values = (await formApi.getValues()) as Record<string, any>;
    const projectField = String(field.projectField || 'project_id');
    const projectId = String(values?.[projectField] || '').trim();
    const options = await field.loader(projectId, values);
    customSelectOptionsMap.value = {
      ...customSelectOptionsMap.value,
      [fieldName]: Array.isArray(options) ? options : [],
    };
  } finally {
    customSelectLoadingMap.value = {
      ...customSelectLoadingMap.value,
      [field.fieldName]: false,
    };
  }
}

async function handleCustomSelectVisibleChange(field: any, visible: boolean) {
  if (!visible) return;
  await loadCustomSelectOptions(field);
}

async function handleCustomSelectChange(field: any, value: any) {
  const fieldName = String(field?.fieldName || '');
  customSelectModelMap.value = {
    ...customSelectModelMap.value,
    [fieldName]: value,
  };
  const patch: Record<string, any> = { [fieldName]: value };
  const option = (customSelectOptionsMap.value[fieldName] || []).find(
    (item) => getCustomSelectOptionValue(field, item) === value,
  );
  for (const [source, target] of Object.entries(field?.relatedFields || {})) {
    patch[String(target)] = option?.[String(source)];
  }
  await formApi.setValues(patch, false);
}

async function handleProjectPickerChange(value: string) {
  projectPickerModel.value = String(value || '').trim();
  await formApi.setValues({ project_id: projectPickerModel.value }, false);
  for (const field of currentCustomSelectFields.value || []) {
    customSelectModelMap.value = { ...customSelectModelMap.value, [field.fieldName]: undefined };
    await formApi.setValues({ [field.fieldName]: undefined }, false);
    await loadCustomSelectOptions(field);
  }
}

function getCustomSelectOptionLabel(field: any, option: Record<string, any>) {
  const labelField = String(field?.labelField || 'label');
  return String(option?.[labelField] ?? '');
}

function getCustomSelectOptionValue(field: any, option: Record<string, any>) {
  const valueField = String(field?.valueField || 'value');
  return option?.[valueField];
}

async function handleSubmit() {
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
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleSubmit();
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
      currentCustomSelectFields.value = [];
      formData.value = undefined;
      pickerModelMap.value = {};
      customSelectModelMap.value = {};
      customSelectOptionsMap.value = {};
      customSelectLoadingMap.value = {};
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
    currentCustomSelectFields.value = data.customSelectFields ?? [];
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
      syncCustomSelectModels(values);
      await formApi.setValues(values);
      for (const field of currentCustomSelectFields.value || []) {
        await loadCustomSelectOptions(field);
      }
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="!w-[75vw] project-submodule-modal" :footer="false">
    <Form class="px-4 pb-2">
      <template #project_id>
        <ProjectPicker
          v-model="projectPickerModel"
          :disabled="formType === 'detail'"
          placeholder="请选择项目"
          @change="handleProjectPickerChange"
        />
      </template>

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

      <template
        v-for="field in currentCustomSelectFields"
        :key="field.fieldName"
        #[field.fieldName]
      >
        <ElSelect
          :model-value="customSelectModelMap[field.fieldName]"
          :disabled="formType === 'detail'"
          :loading="!!customSelectLoadingMap[field.fieldName]"
          :placeholder="field.placeholder || '请选择'"
          class="!w-full"
          clearable
          filterable
          @visible-change="(visible) => handleCustomSelectVisibleChange(field, visible)"
          @update:model-value="(value) => handleCustomSelectChange(field, value)"
        >
          <ElOption
            v-for="option in customSelectOptionsMap[field.fieldName] || []"
            :key="String(getCustomSelectOptionValue(field, option))"
            :label="getCustomSelectOptionLabel(field, option)"
            :value="getCustomSelectOptionValue(field, option)"
          />
          <template #empty>
            <span>{{ field.emptyText || '暂无数据' }}</span>
          </template>
        </ElSelect>
      </template>
    </Form>
    <div class="px-4 pb-4 flex items-center justify-end gap-3">
      <ElButton v-if="formType === 'detail'" @click="modalApi.close()">关闭</ElButton>
      <template v-else>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
        <ElButton @click="modalApi.close()">取消</ElButton>
      </template>
    </div>
  </Modal>
</template>

<style scoped>
.project-submodule-modal :deep(.vben-modal-title),
.project-submodule-modal :deep(.ant-modal-title),
.project-submodule-modal :deep(.el-dialog__title),
.project-submodule-modal :deep(.el-form-item__label) {
  text-align: left;
}
</style>
