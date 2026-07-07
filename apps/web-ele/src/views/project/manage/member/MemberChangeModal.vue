<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, reactive, ref, watch } from 'vue';


import { applyMemberChange, listData } from '#/api/erp/project/manage/member';
import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
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
  cost_rate_hour: undefined as number | undefined,
  cost_rate_day: undefined as number | undefined,
  work_hours: 0,
});

const projects = ref<Record<string, any>[]>([]);
const loadingProjects = ref(false);
const loadingMembers = ref(false);
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

function getTotal(res: any) {
  return Number(res?.total ?? res?.data?.total ?? getList(res).length ?? 0) || 0;
}

function memberLabel(row: Record<string, any>) {
  return [row?.employee_name, row?.user_name, row?.employee_id, row?.role].filter(Boolean).join(' / ');
}

function close() {
  emit('update:modelValue', false);
}

function resetMemberFields() {
  form.member_from = '';
  form.member_to = '';
  form.member_to_name = '';
  form.role_from = '';
}

async function fetchProjectMembersByPages(projectId: string, page = 200, maxRows = 1000) {
  const rows: Record<string, any>[] = [];
  const firstRes = await listData({ pageNo: 1, page, project_id: projectId });
  rows.push(...getList(firstRes));

  const total = getTotal(firstRes);
  const totalPages = Math.ceil(total / page);
  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    if (rows.length >= maxRows) {
      console.warn(`[project-member-change] member query reached maxRows ${maxRows}, remaining rows were skipped.`);
      break;
    }
    const res = await listData({ pageNo, page, project_id: projectId });
    rows.push(...getList(res));
  }

  if (rows.length > maxRows) {
    console.warn(`[project-member-change] member query truncated rows from ${rows.length} to ${maxRows}.`);
  }
  return rows.slice(0, maxRows);
}

async function loadCurrentMembers(projectId: string) {
  const normalizedProjectId = String(projectId || '').trim();
  if (!normalizedProjectId) {
    currentMembers.value = [];
    return;
  }
  loadingMembers.value = true;
  try {
    const rows = await fetchProjectMembersByPages(normalizedProjectId);
    currentMembers.value = rows.filter((item: any) => !item?.leave_date);
  } finally {
    loadingMembers.value = false;
  }
}

function resetForm() {
  form.project_id = props.projectId || '';
  form.change_type = 'join';
  resetMemberFields();
  form.role_to = 'member';
  form.change_date = new Date().toISOString().slice(0, 10);
  form.summary = '';
  form.note = '';
  form.cost_rate_hour = undefined;
  form.cost_rate_day = undefined;
  form.work_hours = 0;
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
  () => form.project_id,
  async (projectId, oldProjectId) => {
    if (!props.modelValue || projectId === oldProjectId) return;
    resetMemberFields();
    await loadCurrentMembers(projectId);
  },
);

watch(
  () => form.change_type,
  () => {
    resetMemberFields();
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
    ElMessage.warning('请选择项目');
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
  if (form.change_type === 'join') {
    const hour = Number(form.cost_rate_hour || 0);
    const day = Number(form.cost_rate_day || 0);
    if (hour > 0 && day > 0) {
      ElMessage.warning('小时成本和日成本只能填写一个');
      return;
    }
    if (hour <= 0 && day <= 0) {
      ElMessage.warning('加入成员时请填写小时成本或日成本');
      return;
    }
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
    cost_rate_hour: form.change_type === 'join' ? form.cost_rate_hour : undefined,
    cost_rate_day: form.change_type === 'join' ? form.cost_rate_day : undefined,
    work_hours: form.change_type === 'join' ? form.work_hours : undefined,
  });
  ElMessage.success('成员变更已生效');
  emit('success');
  close();
}
</script>

<template>
  <ElDialog :model-value="modelValue" title="成员变更" width="680px" @close="close">
    <ElForm label-width="110px">
      <ElFormItem label="项目" required>
          <ProjectPicker v-model="form.project_id" class="!w-full" placeholder="请选择项目" />
      </ElFormItem>
      <ElFormItem label="变更类型" required>
        <ElSelect v-model="form.change_type" class="!w-full">
          <ElOption v-for="item in changeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem v-if="shouldPickLeavingMember" label="退出成员" required>
        <ElSelect v-model="form.member_to" :loading="loadingMembers" filterable class="!w-full" placeholder="请选择当前项目成员" @change="handleLeaveMemberChange">
          <ElOption v-for="item in currentMembers" :key="item.id || item.employee_id" :label="memberLabel(item)" :value="item.employee_id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem v-else label="变更后成员" required>
        <StaffPicker v-model="form.member_to" placeholder="请选择员工" @update:data="handleMemberToPicked" />
      </ElFormItem>
      <ElFormItem v-if="form.change_type === 'manager_change'" label="原负责人">
        <ElSelect v-model="form.member_from" :loading="loadingMembers" filterable clearable class="!w-full" placeholder="可选：请选择原负责人">
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
      <ElFormItem v-if="form.change_type === 'join'" label="计划投入工时">
        <ElInputNumber v-model="form.work_hours" :min="0" :precision="1" class="!w-full" />
      </ElFormItem>
      <ElFormItem v-if="form.change_type === 'join'" label="小时成本">
        <ElInputNumber v-model="form.cost_rate_hour" :min="0" :precision="2" class="!w-full" placeholder="小时成本和日成本二选一" />
      </ElFormItem>
      <ElFormItem v-if="form.change_type === 'join'" label="日成本">
        <ElInputNumber v-model="form.cost_rate_day" :min="0" :precision="2" class="!w-full" placeholder="小时成本和日成本二选一" />
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
