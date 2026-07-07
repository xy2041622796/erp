<script lang="ts" setup>
import type { OptionItem, QueryFormState } from '#/views/finance/cashier/settings/payrollFormula/types';

import {
  ElButton,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from 'element-plus';

defineProps<{
  queryForm: QueryFormState;
  targetItemOptions: OptionItem[];
}>();

const emit = defineEmits<{
  search: [];
  reset: [];
}>();
</script>

<template>
  <el-card shadow="never" class="query-card">
    <el-form inline>
      <el-form-item label="关键字">
        <el-input v-model="queryForm.keyword" placeholder="公式名称 / 结果项目 / 公式表达式" clearable @keyup.enter="emit('search')" />
      </el-form-item>
      <el-form-item label="结果项目">
        <el-select v-model="queryForm.target_item_code" placeholder="全部" clearable filterable style="width: 220px">
          <el-option v-for="item in targetItemOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.is_enabled" placeholder="全部" clearable style="width: 140px">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="emit('search')">查询</el-button>
        <el-button @click="emit('reset')">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<style scoped>
.query-card { border-radius: 10px; }
</style>
