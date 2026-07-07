<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
} from 'element-plus';


const props = defineProps<{
  initialName?: string;
  mode: 'add' | 'edit';
  parentName?: string;
}>();

const emit = defineEmits<{
  close: [];
  submit: [name: string];
}>();

const name = ref('');

const title = computed(() => (props.mode === 'add' ? '新增分类' : '编辑分类'));

watch(
  () => props.initialName,
  (value) => {
    name.value = String(value || '').trim();
  },
  { immediate: true },
);

function handleSubmit() {
  const value = name.value.trim();
  if (!value) {
    ElMessage.warning('请输入分类名称');
    return;
  }
  emit('submit', value);
}
</script>

<template>
  <div>
    <div class="mb-4 text-base font-medium">{{ title }}</div>
    <ElForm label-width="88px">
      <ElFormItem v-if="mode === 'add'" label="父级分类">
        <ElInput :model-value="parentName || '-'" disabled />
      </ElFormItem>
      <ElFormItem label="分类名称" required>
        <ElInput v-model="name" maxlength="80" placeholder="请输入分类名称" show-word-limit />
      </ElFormItem>
    </ElForm>
    <div class="flex justify-end gap-2">
      <ElButton @click="emit('close')">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">保存</ElButton>
    </div>
  </div>
</template>
