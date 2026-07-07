<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="min(40rem, 92vw)"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="类别编码" prop="code">
        <el-input v-model="form.code" placeholder="例如 AUX001" />
      </el-form-item>

      <el-form-item label="类别名称" prop="name">
        <el-input v-model="form.name" placeholder="例如 客户" />
      </el-form-item>

      <el-form-item label="助记码" prop="mnemonic_code">
        <el-input v-model="form.mnemonic_code" placeholder="例如 KH" />
      </el-form-item>

      <el-form-item label="启用状态" prop="enabled">
        <el-switch v-model="enabledBool" />
      </el-form-item>

      <el-form-item label="排序" prop="sort_no">
        <el-input-number v-model="form.sort_no" :min="0" :max="999999" style="width: 100%" />
      </el-form-item>

      <el-form-item label="备注" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';


import {
  createAuxiliaryCate,
  updateAuxiliaryCate,
  type BilAuxiliaryCateApi,
} from '#/api/erp/finance/settings/auxiliary';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSwitch,
} from 'element-plus';

type Mode = 'add' | 'edit';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    mode: Mode;
    row?: BilAuxiliaryCateApi.Category | null;
  }>(),
  {
    modelValue: false,
    mode: 'add',
    row: null,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'success'): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const dialogTitle = computed(() =>
  props.mode === 'edit' ? '编辑辅助核算类别' : '新增辅助核算类别',
);

const formRef = ref<any>();
const loading = ref(false);

const form = ref<BilAuxiliaryCateApi.Category>({
  id: undefined,
  code: '',
  name: '',
  mnemonic_code: '',
  // ✅ 适用范围暂不在 UI 中维护：保持默认 0（通用），兼容已有表结构
  apply_scope: 0,
  enabled: 1,
  sort_no: 0,
  description: '',
  lingma_sys_is_delete: 0,
});

watch(
  () => props.row,
  (row) => {
    if (props.mode === 'edit' && row) {
      form.value = {
        ...form.value,
        ...row,
        // 适用范围不展示：仍保留原值，避免误改
        apply_scope: Number((row as any)?.apply_scope ?? 0),
        enabled: Number((row as any)?.enabled ?? 1),
        sort_no: Number((row as any)?.sort_no ?? 0),
      };
    } else {
      form.value = {
        id: undefined,
        code: '',
        name: '',
        mnemonic_code: '',
        apply_scope: 0,
        enabled: 1,
        sort_no: 0,
        description: '',
        lingma_sys_is_delete: 0,
      };
    }
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      setTimeout(() => {
        formRef.value?.clearValidate?.();
      }, 0);
    }
  },
);

const enabledBool = computed({
  get: () => Number(form.value.enabled ?? 1) === 1,
  set: (v: boolean) => {
    form.value.enabled = v ? 1 : 0;
  },
});

const rules = {
  code: [{ required: true, message: '请输入类别编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入类别名称', trigger: 'blur' }],
} as any;

async function handleSubmit() {
  const refIns = formRef.value;
  if (!refIns) return;

  try {
    await refIns.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    if (props.mode === 'edit') {
      await updateAuxiliaryCate(form.value);
      ElMessage.success('保存成功');
    } else {
      await createAuxiliaryCate(form.value);
      ElMessage.success('新增成功');
    }
    visible.value = false;
    emit('success');
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    loading.value = false;
  }
}
</script>
