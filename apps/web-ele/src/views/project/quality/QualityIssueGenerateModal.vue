<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { reactive, watch } from 'vue';


import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { ISSUE_PRIORITY_OPTIONS, ISSUE_STATUS_OPTIONS, ISSUE_TYPE_OPTIONS } from '#/views/project/issue/data';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  row?: Record<string, any> | null;
  sourceLabel: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [payload: Record<string, any>];
}>();

const form = reactive({
  title: '',
  description: '',
  reporter_id: '',
  assignee_id: '',
  type: 'improvement',
  priority: 'high',
  status: 'open',
});

function close() {
  emit('update:modelValue', false);
}

function normalizePickedStaff(value?: Staff | Staff[]) {
  return Array.isArray(value) ? value[0] : value;
}

function handleReporterPicked(value?: Staff | Staff[]) {
  const staff = normalizePickedStaff(value);
  form.reporter_id = staff?.ROWID || '';
}

function handleAssigneePicked(value?: Staff | Staff[]) {
  const staff = normalizePickedStaff(value);
  form.assignee_id = staff?.ROWID || '';
}

function buildDefaults(row?: Record<string, any> | null) {
  const sourceLabel = props.sourceLabel || '质量';
  const checkCode = String(row?.check_code || row?.id || '').trim();
  const summary = String(row?.issue_summary || row?.result_summary || row?.description || '质量异常').trim();
  const title = ('[' + sourceLabel + '] ' + (checkCode ? checkCode + ' - ' : '') + summary).slice(0, 180);
  const description = [
    '来源：' + sourceLabel,
    checkCode ? '检查编号：' + checkCode : '',
    row?.status ? '状态：' + row.status : '',
    row?.issue_summary ? '问题摘要：' + row.issue_summary : '',
    row?.result_summary ? '结果摘要：' + row.result_summary : '',
    row?.rectify_requirement ? '整改要求：' + row.rectify_requirement : '',
    row?.acceptance_opinion ? '验收意见：' + row.acceptance_opinion : '',
    row?.description ? '说明：' + row.description : '',
  ].filter(Boolean).join('\\n');
  form.title = title;
  form.description = description;
  form.reporter_id = '';
  form.assignee_id = '';
  form.type = 'improvement';
  form.priority = 'high';
  form.status = 'open';
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) buildDefaults(props.row);
  },
);

function submit() {
  if (!String(form.reporter_id || '').trim()) {
    ElMessage.warning('请选择提出人');
    return;
  }
  emit('submit', { ...form });
}
</script>

<template>
  <ElDialog :model-value="modelValue" title="生成项目问题" width="680px" @close="close">
    <ElForm label-width="100px">
      <ElFormItem label="标题" required>
        <ElInput v-model="form.title" />
      </ElFormItem>
      <ElFormItem label="提出人" required>
        <StaffPicker v-model="form.reporter_id" placeholder="请选择提出人" @update:data="handleReporterPicked" />
      </ElFormItem>
      <ElFormItem label="处理人">
        <StaffPicker v-model="form.assignee_id" placeholder="可选：请选择处理人" @update:data="handleAssigneePicked" />
      </ElFormItem>
      <ElFormItem label="类型" required>
        <ElSelect v-model="form.type" class="!w-full">
          <ElOption v-for="item in ISSUE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="优先级" required>
        <ElSelect v-model="form.priority" class="!w-full">
          <ElOption v-for="item in ISSUE_PRIORITY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态" required>
        <ElSelect v-model="form.status" class="!w-full">
          <ElOption v-for="item in ISSUE_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="描述">
        <ElInput v-model="form.description" type="textarea" :rows="7" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton type="primary" @click="submit">确认生成</ElButton>
    </template>
  </ElDialog>
</template>
