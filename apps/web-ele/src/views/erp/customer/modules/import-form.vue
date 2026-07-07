<script lang="ts" setup>
import { ref, watch } from 'vue';

import { downloadFileFromBlobPart } from '@vben/utils';


import {
  downloadCustomerImportTemplate,
  importCustomer,
} from '#/api/erp/customer';
import { $t } from '#/locales';

import { ElButton, ElMessage, ElUpload } from 'element-plus';

const TEMPLATE_FILE_NAME = '客户模板_整行边框规则.xlsx';

const props = defineProps<{
  initialFile?: File | null;
}>();

const emit = defineEmits(['success', 'close']);
const submitting = ref(false);
const selectedFile = ref<File | null>(null);

watch(
  () => props.initialFile,
  (file) => {
    selectedFile.value = file || null;
  },
  { immediate: true },
);

async function handleSubmit() {
  if (!selectedFile.value) {
    ElMessage.warning('请选择 Excel 文件');
    return;
  }

  submitting.value = true;
  try {
    await importCustomer({
      file: selectedFile.value,
      updateSupport: false,
    });
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    submitting.value = false;
  }
}

function handleChange(file: any) {
  if (file.raw) {
    selectedFile.value = file.raw;
  }
}

async function handleDownload() {
  try {
    const blob = await downloadCustomerImportTemplate();
    downloadFileFromBlobPart({
      fileName: TEMPLATE_FILE_NAME,
      source: blob,
    });
  } catch (error) {
    console.error('下载导入模板失败:', error);
    ElMessage.error('下载导入模板失败');
  }
}
</script>

<template>
  <div class="py-2">
    <div class="mx-4">
      <div class="mb-2 text-sm font-medium">客户数据</div>
      <ElUpload
        :limit="1"
        accept=".xls,.xlsx"
        :on-change="handleChange"
        :auto-upload="false"
      >
        <ElButton type="primary">选择 Excel 文件</ElButton>
      </ElUpload>
      <div v-if="selectedFile" class="mt-2 text-sm text-gray-500">
        已选择文件：{{ selectedFile.name }}
      </div>
      <div v-else class="mt-2 text-sm text-gray-500">
        仅支持上传 xls、xlsx 格式文件
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between px-4">
      <ElButton @click="handleDownload">下载导入模板</ElButton>
      <div class="flex gap-2">
        <ElButton @click="emit('close')">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">
          确认导入
        </ElButton>
      </div>
    </div>
  </div>
</template>
