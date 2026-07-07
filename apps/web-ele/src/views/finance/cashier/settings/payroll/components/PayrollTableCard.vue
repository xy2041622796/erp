<script lang="ts" setup>
import {
  ElButton,
  ElCard,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';


const props = defineProps<{
  loading: boolean;
  list: any[];
  total: number;
  pageNo: number;
  page: number;
  commonItemInitLoading: boolean;
  categoryOptions: Array<{ label: string; value: string }>;
  directionOptions: Array<{ label: string; value: string }>;
  inputModeOptions: Array<{ label: string; value: string }>;
  dataTypeOptions: Array<{ label: string; value: string }>;
  unitOptions: Array<{ label: string; value: string }>;
  displayOptions: Array<{ label: string; value: string }>;
  visibleScopeOptions: Array<{ label: string; value: string }>;
  editableScopeOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  openCommonItems: [];
  create: [];
  edit: [row: any];
  delete: [row: any];
  sizeChange: [size: number];
  currentChange: [page: number];
}>();

function getRowIndex(index: number) {
  return (props.pageNo - 1) * props.page + index + 1;
}

function findOptionLabel(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((item) => item.value === value)?.label || value || '-';
}

function boolText(value: any) {
  return Number(value) === 1 ? { text: '是', color: 'success' } : { text: '否', color: 'info' };
}

function enabledText(value: any) {
  return Number(value) === 1 ? '启用' : '停用';
}

function categoryText(value: string) {
  return findOptionLabel(props.categoryOptions, value);
}

function directionText(value: string) {
  return findOptionLabel(props.directionOptions, value);
}

function inputModeText(value: string) {
  return findOptionLabel(props.inputModeOptions, value);
}

function dataTypeText(value: string) {
  return findOptionLabel(props.dataTypeOptions, value);
}

function unitText(value: string) {
  return findOptionLabel(props.unitOptions, value);
}

function salarySlipDisplayText(value: string) {
  return findOptionLabel(props.displayOptions, value);
}

function visibleScopeText(value: string) {
  return findOptionLabel(props.visibleScopeOptions, value);
}

function editableScopeText(value: string) {
  return findOptionLabel(props.editableScopeOptions, value);
}
</script>

<template>
  <el-card shadow="never" class="table-card">
    <template #header>
      <div class="card-header">
        <div>
          <div class="card-title">工资项目元数据</div>
          <div class="card-desc">按新模型维护工资项分类、来源、显示规则、输入约束和规则绑定</div>
        </div>
        <div class="header-actions">
          <el-button :loading="commonItemInitLoading" @click="emit('openCommonItems')">常用工资项目</el-button>
          <el-button type="primary" @click="emit('create')">新增工资项目</el-button>
        </div>
      </div>
    </template>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column label="#" width="60">
        <template #default="{ $index }">
          {{ getRowIndex($index) }}
        </template>
      </el-table-column>
      <el-table-column prop="item_code" label="项目编码" min-width="150" show-overflow-tooltip />
      <el-table-column prop="item_name" label="项目名称" min-width="140" show-overflow-tooltip />
      <el-table-column label="显示名称" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.display_name || '-' }}</template>
      </el-table-column>
      <el-table-column label="分类" min-width="120">
        <template #default="{ row }">{{ categoryText(row.item_category) }}</template>
      </el-table-column>
      <el-table-column label="方向" min-width="100">
        <template #default="{ row }">{{ directionText(row.item_direction) }}</template>
      </el-table-column>
      <el-table-column label="录入模式" min-width="110">
        <template #default="{ row }">{{ inputModeText(row.input_mode) }}</template>
      </el-table-column>
      <el-table-column label="数据类型" min-width="100">
        <template #default="{ row }">{{ dataTypeText(row.data_type) }}</template>
      </el-table-column>
      <el-table-column label="单位" min-width="90">
        <template #default="{ row }">{{ unitText(row.unit) }}</template>
      </el-table-column>
      <el-table-column prop="default_value" label="默认值" min-width="100" />
      <el-table-column label="显示分组" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.display_group || '-' }}</template>
      </el-table-column>
      <el-table-column label="工资条显示" min-width="130">
        <template #default="{ row }">{{ salarySlipDisplayText(row.salary_slip_display) }}</template>
      </el-table-column>
      <el-table-column label="可见范围" min-width="110">
        <template #default="{ row }">{{ visibleScopeText(row.visible_scope) }}</template>
      </el-table-column>
      <el-table-column label="可编辑范围" min-width="120">
        <template #default="{ row }">{{ editableScopeText(row.editable_scope) }}</template>
      </el-table-column>
      <el-table-column label="启用状态" width="90">
        <template #default="{ row }">
          <el-tag :type="Number(row.is_enabled) === 1 ? 'success' : 'info'" effect="light">
            {{ enabledText(row.is_enabled) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="特性" min-width="220">
        <template #default="{ row }">
          <div class="tag-wrap">
            <el-tag size="small" effect="light" :type="boolText(row.is_tax_item).color">计税{{
              boolText(row.is_tax_item).text }}</el-tag>
            <el-tag size="small" effect="light" :type="boolText(row.is_formula_item).color">公式{{
              boolText(row.is_formula_item).text }}</el-tag>
            <el-tag size="small" effect="light" :type="boolText(row.is_bonus_item).color">奖金{{
              boolText(row.is_bonus_item).text }}</el-tag>
            <el-tag size="small" effect="light" :type="boolText(row.is_custom_item).color">自定义{{
              boolText(row.is_custom_item).text }}</el-tag>
            <el-tag size="small" effect="light" :type="boolText(row.required_flag).color">必填{{
              boolText(row.required_flag).text }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="sort_no" label="排序" width="80" />
      <el-table-column prop="version_no" label="版本" width="80" />
      <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" fixed="right" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="emit('edit', row)">编辑</el-button>
          <el-button link type="danger" @click="emit('delete', row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager-wrap">
      <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :current-page="pageNo"
        :page-size="page" :page-sizes="[10, 20, 50, 100]" @size-change="(size) => emit('sizeChange', size)"
        @current-change="(page) => emit('currentChange', page)" />
    </div>
  </el-card>
</template>

<style scoped>
.table-card {
  border-radius: 10px;
}

.card-header,
.header-actions {
  align-items: center;
  display: flex;
  gap: 12px;
}

.card-header {
  justify-content: space-between;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.card-desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  overflow-x: auto;
}
</style>
