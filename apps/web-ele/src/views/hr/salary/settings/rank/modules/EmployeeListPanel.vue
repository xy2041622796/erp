<script lang="ts" setup>
import {
  ElButton,
  ElCard,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { getEmployeeBaseSalaryOverride } from '#/views/hr/salary/wages/monthly-settlement';


defineOptions({ name: 'EmployeeListPanel' });

const props = defineProps<{
  loading: boolean;
  employeeKeyword: string;
  employeeList: any[];
  selectedRank: any;
}>();

const emit = defineEmits<{
  'update:employeeKeyword': [value: string];
  query: [];
  create: [];
  edit: [row: any];
  remove: [row: any];
}>();

function getBaseSalaryDisplay(row: any) {
  const override = getEmployeeBaseSalaryOverride(String(row.employee_id || ''));
  if (override > 0) return override.toFixed(2);
  return '-';
}
</script>

<template>
  <el-card shadow="hover" class="panel-card full-height">
    <template #header>
      <div class="panel-header">
        <span>职级人员表</span>
        <div class="header-actions">
          <el-button type="primary" plain @click="emit('create')">新增人员</el-button>
        </div>
      </div>
    </template>

    <div class="toolbar toolbar-stack">
      <el-input
        :model-value="employeeKeyword"
        clearable
        placeholder="搜索员工ID/工号/姓名/部门"
        @update:model-value="emit('update:employeeKeyword', String($event || ''))"
        @keyup.enter="emit('query')"
      />
      <el-button @click="emit('query')">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="employeeList" border height="620">
      <el-table-column prop="employee_no" label="工号" min-width="90" />
      <el-table-column prop="employee_name" label="姓名" min-width="90" />
      <el-table-column prop="dept_name" label="部门" min-width="120" />
      <el-table-column label="个人基本工资" width="130" align="right">
        <template #default="{ row = {} } = {}"
        >{{ getBaseSalaryDisplay(row) }}</template>
      </el-table-column>
      <el-table-column label="当前" width="80">
        <template #default="{ row = {}} = {}">
          <el-tag :type="Number(row.is_current ?? 1) === 1 ? 'success' : 'info'">
            {{ Number(row.is_current ?? 1) === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="effective_date" label="生效日期" min-width="110" />
      <el-table-column prop="expire_date" label="失效日期" min-width="110" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row = {}} = {}">
          <el-button link type="primary" @click="emit('edit', row)">编辑</el-button>
          <el-button link type="danger" @click="emit('remove', row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<style scoped>
.panel-card {
  border-radius: 12px;
}
.full-height {
  min-height: 760px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-stack {
  align-items: center;
}
@media (max-width: 1200px) {
  .full-height {
    min-height: auto;
  }
}
</style>
