<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, ref, watch } from 'vue';


import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { distributePoolCustomers, getPoolOwnerDefaultByIds } from '#/api/erp/customer/pool';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
} from 'element-plus';

const props = defineProps<{
  ids: Array<number | string>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const loading = ref(false);
const ownerForm = ref({
  ownerUserId: '',
  ownerUserName: '',
  departId: '',
  departName: '',
});

const selectedCount = computed(() => (props.ids || []).length);

async function resetForm() {
  ownerForm.value = {
    ownerUserId: '',
    ownerUserName: '',
    departId: '',
    departName: '',
  };
  if (!selectedCount.value) return;
  try {
    const defaultOwner = await getPoolOwnerDefaultByIds(props.ids);
    ownerForm.value = {
      ownerUserId: String(defaultOwner.ownerUserId || '').trim(),
      ownerUserName: String(defaultOwner.ownerUserName || '').trim(),
      departId: String(defaultOwner.departId || '').trim(),
      departName: String(defaultOwner.departName || '').trim(),
    };
  } catch (error) {
    console.error('加载分配默认负责人失败:', error);
  }
}

function handleOwnerStaffModelValueChange(value?: string | number | null) {
  const userId = String(value || '').trim();
  if (!userId) {
    ownerForm.value = {
      ownerUserId: '',
      ownerUserName: '',
      departId: '',
      departName: '',
    };
    return;
  }
  ownerForm.value.ownerUserId = userId;
}

function handleOwnerStaffDataChange(value?: Staff | Staff[]) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) {
    ownerForm.value = {
      ownerUserId: '',
      ownerUserName: '',
      departId: '',
      departName: '',
    };
    return;
  }
  ownerForm.value = {
    ownerUserId: String(row.ROWID || '').trim(),
    ownerUserName: String(row.UserName || '').trim(),
    departId: String(row.DepID || row.DepartmentId || '').trim(),
    departName: String(row.DepName || row.DepartmentName || '').trim(),
  };
}

async function handleSubmit() {
  if (selectedCount.value === 0) {
    ElMessage.warning('请选择需要分配的资源');
    return;
  }
  if (!ownerForm.value.ownerUserId || !ownerForm.value.ownerUserName) {
    ElMessage.warning('请选择负责人');
    return;
  }
  loading.value = true;
  try {
    await distributePoolCustomers(props.ids, ownerForm.value);
    ElMessage.success('分配成功，已移出公海');
    emit('success');
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.ids,
  () => {
    resetForm();
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="px-4 py-2">
    <ElForm label-width="100px">
      <ElFormItem label="资源数量">
        <ElInput :model-value="String(selectedCount)" disabled />
      </ElFormItem>
      <ElFormItem label="负责人" required>
        <StaffPicker
          :model-value="ownerForm.ownerUserId"
          placeholder="请选择负责人"
          @update:model-value="handleOwnerStaffModelValueChange"
          @update:data="handleOwnerStaffDataChange"
        />
      </ElFormItem>
      <ElFormItem label="所属部门">
        <ElInput :model-value="ownerForm.departName" disabled />
      </ElFormItem>
    </ElForm>

    <div style="text-align: right">
      <ElButton @click="emit('close')">取消</ElButton>
      <ElButton type="primary" :loading="loading" @click="handleSubmit">
        确定分配并移出公海
      </ElButton>
    </div>
  </div>
</template>
