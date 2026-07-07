<script setup lang="ts">
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElTag,
  ElText,
} from 'element-plus';


defineOptions({ name: 'TemplateBindingDialog' });

defineProps<{
  modelValue: boolean;
  loading: boolean;
  saving: boolean;
  mode: 'create' | 'edit';
  form: {
    solutionName: string;
    templatePath: string;
  };
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="导入导出模板绑定"
    width="680px"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <div v-loading="loading">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="mode === 'create' ? '当前方案不存在，保存时会先自动新增方案，再绑定模板。' : '当前方案已存在，保存时会直接更新模板绑定。'"
      />
      <el-form label-width="110px" style="margin-top: 16px">
        <el-form-item label="处理方式">
          <el-tag :type="mode === 'create' ? 'warning' : 'success'">
            {{ mode === 'create' ? '新增后绑定' : '直接编辑' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="方案名称">
          <el-input v-model="form.solutionName" disabled />
        </el-form-item>
        <el-form-item label="模板路径">
          <el-input v-model="form.templatePath" placeholder="请输入模板路径，例如 /templates/erp/rank.xlsx" clearable />
        </el-form-item>
        <el-form-item label="说明">
          <el-text type="info">模板绑定保存到该职级导入导出方案根节点的 templatePath 字段。</el-text>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="emit('submit')">保存模板绑定</el-button>
    </template>
  </el-dialog>
</template>
