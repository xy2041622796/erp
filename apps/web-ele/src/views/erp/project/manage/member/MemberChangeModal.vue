<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, reactive, ref, watch } from 'vue';


import { applyMemberChange, listData } from '#/api/erp/project/manage/member';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import {
  ElButton,
  ElDatePicker,
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
  projectId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const form = reactive({
  project_id: '',
  change_type: 'join',
  member_from: '',
  member_to: '',
  member_to_name: '',
  role_from: '',
  role_to: 'member',
  change_date: '',
  summary: '',
  note: '',
});

const currentMembers = ref<Record<string, any>[]>([]);

const changeTypeOptions = [
  { label: '成员加入', value: 'join' },
  { label: '成员退出', value: 'leave' },
  { label: '角色调整', value: 'role_change' },
  { label: '负责人变更', value: 'manager_change' },
];

const roleOptions = [
  { label: '负责人', value: 'manager' },
  { label: '组长', value: 'leader' },
  { label: '成员', value: 'member' },
];

const shouldPickStaff = computed(() => ['join', 'role_change', 'manager_change'].includes(form.change_type));
const shouldPickLeavingMember = computed(() => form.change_type === 'leave');

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

function memberLabel(row: Record<string, any>) {
  return [row?.employee_name, row?.user_name, row?.employee_id, row?.role].filter(Boolean).join(' / ');
}

function close() {
  emit('update:modelValue', false);
}

async function loadCurrentMembers(projectId: string) {
  if (!projectId) {
    currentMembers.value = [];
    return;
  }
  const res = await listData({ pageNo: 1, page: 0, project_id: projectId });
  currentMembers.value = getList(res).filter((item: any) => !item?.leave_date);
}

function resetForm() {
  form.project_id = props.projectId || '';
  form.change_type = 'join';
  form.member_from = '';
  form.member_to = '';
  form.member_to_name = '';
  form.role_from = '';
  form.role_to = 'member';
  form.change_date = new Date().toISOString().slice(0, 10);
  form.summary = '';
  form.note = '';
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      resetForm();
      await loadCurrentMembers(form.project_id);
    }
  },
);

watch(
  () => form.change_type,
  () => {
    form.member_from = '';
    form.member_to = '';
    form.member_to_name = '';
    form.role_from = '';
    form.role_to = form.change_type === 'manager_change' ? 'manager' : 'member';
  },
);

function normalizePickedStaff(value?: Staff | Staff[]) {
  return Array.isArray(value) ? value[0] : value;
}

function handleMemberToPicked(value?: Staff | Staff[]) {
  const staff = normalizePickedStaff(value);
  form.member_to = staff?.ROWID || '';
  form.member_to_name = staff?.UserName || '';
}

function handleLeaveMemberChange(employeeId?: string) {
  const row = currentMembers.value.find((item) => String(item?.employee_id || '') === String(employeeId || ''));
  form.member_to = String(employeeId || '');
  form.member_to_name = String(row?.employee_name || row?.user_name || '');
  form.role_from = String(row?.role || '');
}

async function submit() {
  const projectId = String(form.project_id || '').trim();
  if (!projectId) {
    ElMessage.warning('缺少项目ID');
    return;
  }
  if (!form.change_type) {
    ElMessage.warning('请选择变更类型');
    return;
  }
  if (shouldPickStaff.value && !String(form.member_to || '').trim()) {
    ElMessage.warning('请选择变更后成员');
    return;
  }
  if (shouldPickLeavingMember.value && !String(form.member_to || '').trim()) {
    ElMessage.warning('请选择退出成员');
    return;
  }

  await applyMemberChange({
    project_id: projectId,
    change_type: form.change_type,
    member_from: form.member_from,
    member_to: form.member_to,
    member_to_name: form.member_to_name,
    role_from: form.role_from,
    role_to: form.role_to,
    change_date: form.change_date,
    summary: form.summary,
    note: form.note,
  });
  ElMessage.success('成员变更已生效');
  emit('success');
  close();
}
</script>

<template>
  <ElDialog :model-value="modelValue" title="成员变更" width="680px" @close="close">
    <ElForm label-width="110px">
      <ElFormItem label="项目ID" required>
        <ElInput v-model="form.project_id" readonly placeholder="Bil_Project_Info.rowid" />
      </ElFormItem>
      <ElFormItem label="变更类型" required>
        <ElSelect v-model="form.change_type" class="!w-full">
          <ElOption v-for="item in changeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem v-if="shouldPickLeavingMember" label="退出成员" required>
        <ElSelect v-model="form.member_to" filterable class="!w-full" placeholder="请选择当前项目成员" @change="handleLeaveMemberChange">
          <ElOption v-for="item in currentMembers" :key="item.id || item.employee_id" :label="memberLabel(item)" :value="item.employee_id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem v-else label="变更后成员" required>
        <StaffPicker v-model="form.member_to" placeholder="请选择员工" @update:data="handleMemberToPicked" />
      </ElFormItem>
      <ElFormItem v-if="form.change_type === 'manager_change'" label="原负责人">
        <ElSelect v-model="form.member_from" filterable clearable class="!w-full" placeholder="可选：请选择原负责人">
          <ElOption v-for="item in currentMembers" :key="item.id || item.employee_id" :label="memberLabel(item)" :value="item.employee_id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="原角色">
        <ElSelect v-model="form.role_from" clearable class="!w-full">
          <ElOption v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="新角色">
        <ElSelect v-model="form.role_to" class="!w-full">
          <ElOption v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="变更日期">
        <ElDatePicker v-model="form.change_date" type="date" value-format="YYYY-MM-DD" class="!w-full" />
      </ElFormItem>
      <ElFormItem label="摘要">
        <ElInput v-model="form.summary" />
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput v-model="form.note" type="textarea" :rows="3" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton type="primary" @click="submit">提交变更</ElButton>
    </template>
  </ElDialog>
</template>
