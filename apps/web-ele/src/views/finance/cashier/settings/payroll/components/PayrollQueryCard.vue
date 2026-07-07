<script lang="ts" setup>
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
  queryForm: Record<string, any>;
  categoryOptions: Array<{ label: string; value: string }>;
  directionOptions: Array<{ label: string; value: string }>;
  inputModeOptions: Array<{ label: string; value: string }>;
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
        <el-input v-model="queryForm.keyword" placeholder="项目编码 / 名称 / 显示名称" clearable @keyup.enter="emit('search')" />
      </el-form-item>
      <el-form-item label="项目分类">
        <el-select v-model="queryForm.item_category" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="项目方向">
        <el-select v-model="queryForm.item_direction" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="item in directionOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="录入模式">
        <el-select v-model="queryForm.input_mode" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="item in inputModeOptions" :key="item.value" :label="item.label" :value="item.value" />
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
.query-card {
  border-radius: 10px;
}
</style>
