<script lang="ts" setup>
import type { AssetCategory } from '#/api/erp/finance/assets/category';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';
import type { SubjectOption } from '#/views/finance/Voucher/modules/VoucherSubjectPicker.vue';

import { computed, reactive, ref, watch } from 'vue';

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

import { saveAssetCategory } from '#/api/erp/finance/assets/category';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import VoucherSubjectPicker from '#/views/finance/Voucher/modules/VoucherSubjectPicker.vue';

const props = defineProps<{
  data?: AssetCategory | null;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  success: [row: AssetCategory];
  'update:modelValue': [value: boolean];
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const editForm = reactive<AssetCategory>({
  id: '',
  category_code: '',
  category_name: '',
  depreciation_method: '平均年限法',
  asset_property: '固定资产',
  subject_code: '',
  subject_name: '',
  useful_life_months: 0,
  residual_rate: 0,
  remark: '',
  sort_no: 0,
  status: 1,
});

const dialogTitle = computed(() =>
  editForm.id ? '编辑资产类别' : '新增资产类别',
);

function resetForm() {
  Object.assign(editForm, {
    id: '',
    category_code: '',
    category_name: '',
    depreciation_method: '平均年限法',
    asset_property: '固定资产',
    subject_code: '',
    subject_name: '',
    useful_life_months: 0,
    residual_rate: 0,
    remark: '',
    sort_no: 0,
    status: 1,
    lingma_sys_key: '',
  });
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    resetForm();
    if (props.data) {
      Object.assign(editForm, props.data, {
        id: String(props.data.id || props.data.rowid || ''),
      });
    }
    subjectKeyword.value = String(editForm.subject_code || '').trim();
    loadSubjects();
  },
  { immediate: true },
);

const subjectLoading = ref(false);
const subjectKeyword = ref('');
const subjectOptions = ref<SubjectOption[]>([]);

function toSubjectOption(row: BilSubjectApi.Subject): SubjectOption {
  const code = String((row as any)?.subject_number || '').trim();
  const name = String((row as any)?.subject_name || '').trim();
  return {
    label: [code, name].filter(Boolean).join(' '),
    value: code,
    raw: row,
  };
}

async function loadSubjects() {
  subjectLoading.value = true;
  try {
    const res = await getSubjectList({
      pageNo: 1,
      page: 0,
      keyword: String(subjectKeyword.value || '').trim(),
      subject_state: 1,
      lingma_sys_is_delete: 0,
    } as any);
    subjectOptions.value = ((res?.list || []) as BilSubjectApi.Subject[])
      .map((item) => toSubjectOption(item))
      .filter((item) => item.value);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载会计科目失败');
    subjectOptions.value = [];
  } finally {
    subjectLoading.value = false;
  }
}

async function handleSubjectRemoteMethod() {
  await loadSubjects();
}

function handleSubjectInput(value: string) {
  subjectKeyword.value = String(value || '').trim();
  editForm.subject_code = subjectKeyword.value;
  if (!subjectKeyword.value) {
    editForm.subject_name = '';
  }
}

function handleSubjectSelect(option: SubjectOption) {
  editForm.subject_code = String(option?.value || '').trim();
  editForm.subject_name = String(
    (option?.raw as any)?.subject_name || '',
  ).trim();
}

async function onSave() {
  try {
    const saved = await saveAssetCategory({ ...editForm });
    ElMessage.success('保存成功');
    emit('success', saved.row);
    showDialog.value = false;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '保存失败');
  }
}
</script>

<template>
  <ElDialog
    v-model="showDialog"
    :title="dialogTitle"
    width="min(47.5rem, 92vw)"
    destroy-on-close
  >
    <ElForm label-width="110px">
      <div class="grid grid-cols-2 gap-x-4">
        <ElFormItem label="资产类别编码" required>
          <ElInput v-model="editForm.category_code" />
        </ElFormItem>
        <ElFormItem label="资产类别名称" required>
          <ElInput v-model="editForm.category_name" />
        </ElFormItem>
        <ElFormItem label="折旧方法">
          <ElInput v-model="editForm.depreciation_method" />
        </ElFormItem>
        <ElFormItem label="资产属性">
          <ElInput v-model="editForm.asset_property" />
        </ElFormItem>
        <ElFormItem label="资产科目">
          <VoucherSubjectPicker
            class="asset-subject-picker"
            :model-value="editForm.subject_code"
            :options="subjectOptions"
            :loading="subjectLoading"
            :remote-method="handleSubjectRemoteMethod"
            :popper-z-index="2600"
            :bordered="true"
            @update:model-value="handleSubjectInput"
            @select="handleSubjectSelect"
          />
        </ElFormItem>
        <ElFormItem label="资产科目名称">
          <ElInput :model-value="editForm.subject_name" readonly />
        </ElFormItem>
        <ElFormItem label="使用月份">
          <ElInputNumber
            v-model="(editForm as any).useful_life_months"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="预计净残值率">
          <ElInputNumber
            v-model="(editForm as any).residual_rate"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber
            v-model="(editForm as any).sort_no"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="启用状态">
          <ElSwitch
            v-model="(editForm as any).status"
            :active-value="1"
            :inactive-value="0"
          />
        </ElFormItem>
        <ElFormItem class="col-span-2" label="备注">
          <ElInput v-model="editForm.remark" type="textarea" :rows="3" />
        </ElFormItem>
      </div>
    </ElForm>
    <template #footer>
      <ElButton @click="showDialog = false">取消</ElButton>
      <ElButton type="primary" @click="onSave">保存</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.asset-subject-picker {
  width: 100%;
}
</style>
