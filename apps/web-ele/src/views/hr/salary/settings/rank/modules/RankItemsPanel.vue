<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElInput,
  ElInputNumber,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';


const props = defineProps<{
  itemKeyword: string;
  itemLoading: boolean;
  itemMetaLoading: boolean;
  itemSaving: boolean;
  schemeBindingLoading: boolean;
  schemeSolutionLoading: boolean;
  importTemplateLoading: boolean;
  exportTemplateLoading: boolean;
  selectedRankDynamicStartCol: string;
  items: any[];
}>();

const emit = defineEmits<{
  (e: 'update:itemKeyword', value: string): void;
  (e: 'bind-scheme'): void;
  (e: 'preview-scheme'): void;
  (e: 'download-import'): void;
  (e: 'download-export'): void;
  (e: 'save-items'): void;
  (e: 'selected-change', row: any, checked: boolean | string | number): void;
}>();
</script>

<template>
  <el-card shadow="hover" class="panel-card full-height">
    <template #header>
      <div class="panel-header">
        <span>职级工资项</span>
        <div class="header-actions">
          <el-button :loading="props.schemeBindingLoading" @click="emit('bind-scheme')">
            绑定导入导出方案
          </el-button>
          <el-button :loading="props.schemeSolutionLoading" @click="emit('preview-scheme')">
            生成导入导出方案
          </el-button>
          <el-button :loading="props.importTemplateLoading" @click="emit('download-import')">
            下载当前职级导入模板
          </el-button>
          <el-button :loading="props.exportTemplateLoading" @click="emit('download-export')">
            下载当前职级导出模板
          </el-button>
          <el-button type="primary" :loading="props.itemSaving" @click="emit('save-items')">
            保存职级工资项
          </el-button>
        </div>
      </div>
    </template>

    <div class="toolbar toolbar-stack toolbar-summary">
      <el-input
        :model-value="props.itemKeyword"
        clearable
        placeholder="搜索工资项编码/名称/分类/方向"
        @update:model-value="(value) => emit('update:itemKeyword', String(value || ''))"
      />
      <el-tag type="info">
        模板列与方案列已统一使用同一套表头定义：固定列为 工资月份 / 职级编码 / 职级名称 / 员工工号 / 员工姓名 / 部门名称，动态工资项列从 {{ props.selectedRankDynamicStartCol }} 开始；方案预览仍按真实树形结构生成，根表为 Bas_Salary_Rank，子表为 Bas_Salary_Rank_Item，动态键字段固定为工资项编码 item_code，动态值字段固定为默认金额 default_amount，dictJson 统一使用 { key, value, column } 结构。
      </el-tag>
    </div>

    <el-table v-loading="props.itemLoading || props.itemMetaLoading || props.itemSaving" :data="props.items" border height="620">
      <el-table-column label="已选" width="70" fixed="left">
        <template #default="{ row = {}} = {}">
          <el-checkbox :model-value="row.selected" @change="(checked) => emit('selected-change', row, checked)" />
        </template>
      </el-table-column>
      <el-table-column prop="item_name" label="工资项" min-width="150" />
      <el-table-column prop="item_code" label="编码" min-width="120" />
      <el-table-column prop="item_category" label="分类" min-width="90" />
      <el-table-column prop="item_direction" label="方向" min-width="80" />
      <el-table-column label="必选" width="80">
        <template #default="{ row = {}} = {}">
          <el-switch v-model="row.is_required" :disabled="!row.selected" />
        </template>
      </el-table-column>
      <el-table-column label="默认" width="80">
        <template #default="{ row = {}} = {}">
          <el-switch v-model="row.is_default_selected" :disabled="!row.selected" />
        </template>
      </el-table-column>
      <el-table-column label="默认金额" min-width="120">
        <template #default="{ row = {}} = {}">
          <el-input-number v-model="row.default_amount" :precision="2" :min="0" :disabled="!row.selected" style="width: 100%" />
        </template>
      </el-table-column>
      <el-table-column label="排序" width="90">
        <template #default="{ row = {}} = {}">
          <el-input-number v-model="row.sort_no" :min="0" :disabled="!row.selected" style="width: 100%" />
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="160">
        <template #default="{ row = {}} = {}">
          <el-input v-model="row.remark" :disabled="!row.selected" />
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
.toolbar-summary {
  flex-wrap: wrap;
}
@media (max-width: 1200px) {
  .full-height {
    min-height: auto;
  }
}
</style>
