<script setup lang="ts">
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed, reactive, watch } from 'vue';


import { updateBusinessStatus } from '#/api/erp/client/business';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

const props = defineProps<{
  businessData?: CrmCustomerBusinessApi.Business | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save-success'): void;
}>();

const formData = reactive({
  businessStatus: undefined as number | undefined,
  lostReason: '',
});

const targetStatusOptions = [
  { label: '赢单', value: 1 },
  { label: '输单', value: 2 },
  { label: '关闭', value: 3 },
];

const isReadonly = computed(() => Number(props.businessData?.businessStatus || 0) !== 0);

function resetForm() {
  formData.businessStatus = undefined;
  formData.lostReason = '';
}

async function handleSave() {
  const id = String(props.businessData?.rowid || props.businessData?.id || '').trim();
  if (!id) {
    ElMessage.warning('缺少商机编号');
    return;
  }
  if (isReadonly.value) {
    ElMessage.warning('结果态商机不可再次变更状态');
    return;
  }
  if (!formData.businessStatus) {
    ElMessage.warning('请选择变更后的状态');
    return;
  }
  if (Number(formData.businessStatus) === 2 && !formData.lostReason.trim()) {
    ElMessage.warning('输单时必须填写输单原因');
    return;
  }
  await updateBusinessStatus({
    id,
    businessStatus: Number(formData.businessStatus),
    lostReason: formData.lostReason.trim(),
  });
  ElMessage.success('变更商机状态成功');
  emit('save-success');
}

watch(
  () => props.businessData,
  () => {
    resetForm();
  },
  { immediate: true },
);
</script>

<template>
  <div class="px-4 py-2">
    <ElForm :model="formData" label-width="110px">
      <ElFormItem label="当前状态">
        <ElInput :model-value="props.businessData?.businessStatus === 0 ? '跟进中' : '结果态'" disabled />
      </ElFormItem>
      <ElFormItem label="变更为" required>
        <ElSelect v-model="formData.businessStatus" class="w-full" :disabled="isReadonly">
          <ElOption v-for="item in targetStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem v-if="Number(formData.businessStatus || 0) === 2" label="输单原因" required>
        <ElInput v-model="formData.lostReason" type="textarea" :rows="3" placeholder="请输入输单原因" />
      </ElFormItem>
    </ElForm>

    <div style="text-align: right">
      <ElButton @click="emit('close')">取消</ElButton>
      <ElButton type="primary" :disabled="isReadonly" @click="handleSave">确定</ElButton>
    </div>
  </div>
</template>
