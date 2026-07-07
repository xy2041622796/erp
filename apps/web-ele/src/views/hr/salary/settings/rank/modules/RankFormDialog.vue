<script setup lang="ts">
import {
  ElButton,
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
  form: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="props.editing ? '编辑职级' : '新增职级'"
    width="560px"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <el-form label-width="100px">
      <el-form-item label="职级编码">
        <el-input v-model="props.form.rank_code" />
      </el-form-item>
      <el-form-item label="职级名称">
        <el-input v-model="props.form.rank_name" />
      </el-form-item>
      <el-form-item label="职级层级">
        <el-input-number v-model="props.form.rank_level" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="职级类型">
        <el-input v-model="props.form.rank_type" />
      </el-form-item>
      <el-form-item label="是否启用">
        <el-switch v-model="props.form.is_enabled" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="props.form.remark" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="emit('submit')">保存</el-button>
    </template>
  </el-dialog>
</template>
