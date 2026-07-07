<script setup lang="ts">

import { ref, watch } from 'vue';

import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import {
  getEmployeeBaseSalaryOverride,
  setEmployeeBaseSalaryOverride,
} from '#/views/hr/salary/wages/monthly-settlement';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSwitch,
} from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  editing: boolean;
  selectedRank: any;
  form: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
  (e: 'staff-change', value: any): void;
}>();

function getStoredBaseSalary() {
  return getEmployeeBaseSalaryOverride(String(props.form.employee_id || ''));
}

const baseSalaryOverride = ref(0);

watch(
  () => props.form.employee_id,
  () => {
    baseSalaryOverride.value = getStoredBaseSalary();
  },
  { immediate: true },
);

function handleSubmit() {
  const employeeId = String(props.form.employee_id || '').trim();
  if (employeeId) {
    setEmployeeBaseSalaryOverride(employeeId, Number(baseSalaryOverride.value || 0));
  }
  emit('submit');
}
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="props.editing ? '编辑职级人员' : '新增职级人员'"
    width="620px"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <el-form label-width="110px">
      <el-form-item label="所属职级">
        <el-input :model-value="props.selectedRank ? `${props.selectedRank.rank_code} / ${props.selectedRank.rank_name}` : ''" disabled />
      </el-form-item>
      <el-form-item label="选择人员">
        <StaffPicker
          :model-value="props.form.employee_id || undefined"
          placeholder="请选择人员"
          @change="(value) => emit('staff-change', value)"
          @update:model-value="(value) => (props.form.employee_id = String(value || ''))"
        />
      </el-form-item>
      <el-form-item label="员工工号">
        <el-input v-model="props.form.employee_no" disabled />
      </el-form-item>
      <el-form-item label="员工姓名">
        <el-input v-model="props.form.employee_name" disabled />
      </el-form-item>
      <el-form-item label="部门名称">
        <el-input v-model="props.form.dept_name" disabled />
      </el-form-item>
      <el-form-item label="是否当前">
        <el-switch v-model="props.form.is_current" />
      </el-form-item>
      <el-form-item label="生效日期">
        <el-date-picker v-model="props.form.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="失效日期">
        <el-date-picker v-model="props.form.expire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="props.form.remark" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="个人基本工资">
        <el-input-number v-model="baseSalaryOverride" :min="0" :precision="2" placeholder="留空则使用职级默认值" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
