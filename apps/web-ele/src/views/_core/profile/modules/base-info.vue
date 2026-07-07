<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { SystemUserProfileApi } from '#/api/system/user/profile';

import { computed, watch } from 'vue';

import { DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';
import { $t } from '@vben/locales';

import { useVbenForm, z } from '#/adapter/form';
import { updateUserProfile } from '#/api/system/user/profile';

import { ElMessage } from 'element-plus';

const props = defineProps<{
  profile?: SystemUserProfileApi.UserProfileRespVO;
}>();
const emit = defineEmits<{
  (e: 'success'): void;
}>();

const sexOptions = computed(() => getDictOptions(DICT_TYPE.SYSTEM_USER_SEX, 'number'));

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 92,
    componentProps: {
      class: 'profile-form-control',
    },
  },
  layout: 'horizontal',
  schema: [
    {
      label: '用户昵称',
      fieldName: 'nickname',
      component: 'Input',
      componentProps: {
        placeholder: '请输入用户昵称',
      },
      rules: 'required',
    },
    {
      label: '用户手机',
      fieldName: 'mobile',
      component: 'Input',
      componentProps: {
        placeholder: '请输入用户手机',
      },
      rules: z.string().optional(),
    },
    {
      label: '用户邮箱',
      fieldName: 'email',
      component: 'Input',
      componentProps: {
        placeholder: '请输入用户邮箱',
      },
      rules: z.union([z.literal(''), z.string().email('请输入正确的邮箱')]).optional(),
    },
    {
      label: '用户性别',
      fieldName: 'sex',
      component: 'Select',
      componentProps: {
        options: sexOptions.value,
        placeholder: '请选择性别',
        clearable: true,
      },
      rules: z.union([z.number(), z.string()]).optional(),
    },
  ],
  wrapperClass: 'grid-cols-1',
  resetButtonOptions: {
    show: false,
  },
  submitButtonOptions: {
    content: '更新信息',
    class: 'profile-submit-btn',
  },
  handleSubmit,
});

async function handleSubmit(values: Recordable<any>) {
  try {
    formApi.setLoading(true);
    await updateUserProfile(values as SystemUserProfileApi.UpdateProfileReqVO);
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } catch (error) {
    console.error(error);
  } finally {
    formApi.setLoading(false);
  }
}

watch(
  () => props.profile,
  (newProfile) => {
    if (newProfile) {
      formApi.setValues(newProfile);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="base-info-form">
    <Form />
  </div>
</template>

<style scoped>
.base-info-form {
  max-width: 760px;
  padding: 8px 0 2px;
}

:deep(.vben-form) {
  row-gap: 10px;
}

:deep(.ant-form-item) {
  margin-bottom: 22px;
}

:deep(.ant-form-item-label > label) {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.ant-input),
:deep(.ant-select-selector) {
  min-height: 42px !important;
  border-color: #d9e1ec !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

:deep(.ant-input:hover),
:deep(.ant-select-selector:hover) {
  border-color: #8bbcff !important;
}

:deep(.profile-submit-btn) {
  min-width: 132px;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(180deg, #2f80ff 0%, #1d5fe8 100%);
  box-shadow: 0 10px 24px rgb(29 95 232 / 22%);
}
</style>
