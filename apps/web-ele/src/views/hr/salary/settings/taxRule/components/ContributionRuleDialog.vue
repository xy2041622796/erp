<script lang="ts" setup>

import type { ContributionDialogForm } from '../types';

import {
  ElButton,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRow,
  ElSelect,
} from 'element-plus';

defineProps<{
  visible: boolean;
  title: string;
  form: ContributionDialogForm;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  save: [];
}>();
</script>

<template>
  <el-dialog :model-value="visible" :title="title" width="760px" destroy-on-close @update:model-value="(value) => emit('update:visible', value)">
    <el-form label-width="110px" class="edit-form">
      <el-form-item label="规则类别">
        <el-select v-model="form.ruleType" style="width: 100%">
          <el-option label="社保/医保/养老等" value="social" />
          <el-option label="公积金" value="fund" />
        </el-select>
      </el-form-item>
      <el-form-item label="规则编码"><el-input v-model="form.code" placeholder="请输入规则编码" /></el-form-item>
      <el-form-item label="规则标题"><el-input v-model="form.title" placeholder="请输入规则标题" /></el-form-item>
      <el-form-item label="规则说明"><el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入规则说明" /></el-form-item>
      <el-form-item label="基数来源编码">
        <el-input v-model="form.baseItemCodesText" placeholder="多个编码请用英文逗号分隔，例如 basic_salary, should_pay_total" />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="8"><el-form-item label="个人比例"><el-input-number v-model="form.personalRate" :controls="false" :step="0.01" :min="0" :max="1" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="公司比例"><el-input-number v-model="form.companyRate" :controls="false" :step="0.01" :min="0" :max="1" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="取整方式"><el-select v-model="form.roundMode" style="width: 100%"><el-option label="四舍五入" value="ROUND" /><el-option label="向下取整" value="FLOOR" /><el-option label="向上取整" value="CEIL" /></el-select></el-form-item></el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12"><el-form-item label="最小基数"><el-input-number v-model="form.minBase" :controls="false" :min="0" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="最大基数"><el-input v-model="form.maxBaseText" placeholder="留空表示不限制" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="emit('save')">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.edit-form { margin-bottom: 12px; }
</style>
