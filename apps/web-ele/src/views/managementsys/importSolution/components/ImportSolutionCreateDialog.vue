<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
} from 'element-plus';


const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    loading?: boolean;
  }>(),
  {
    loading: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', value: string): void;
}>();

const form = reactive({
  solutionName: '',
});

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      form.solutionName = '';
    }
  },
);

function handleSubmit() {
  emit('submit', form.solutionName.trim());
}
</script>

<template>
  <ElDialog
    v-model="visible"
    title="新增导入方案"
    width="520px"
    destroy-on-close
  >
    <ElForm label-width="88px">
      <ElFormItem label="方案名称">
        <ElInput
          v-model="form.solutionName"
          placeholder="请输入方案名称"
          maxlength="100"
          clearable
          @keyup.enter="handleSubmit"
        />
      </ElFormItem>
      <div class="create-tip">
        新增时会一次性创建：1 个根配置「新建项」+ 1 个子配置「新建子级」+ 根/子各 1 条默认空 field，便于后续继续补完整导入设计。
      </div>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="loading" @click="handleSubmit">
        确认
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.create-tip {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.7;
}
</style>
