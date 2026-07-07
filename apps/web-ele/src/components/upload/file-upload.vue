<script lang="ts" setup>
// TODO @puhui999：这个看看怎么和对应的 antd 【代码风格】，保持一致一些；
import type {
  UploadFile,
  UploadInstance,
  UploadProps,
  UploadRawFile,
  UploadRequestOptions,
  UploadUserFile,
} from 'element-plus';

import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { isFunction, isString } from '@vben/utils';


import { useUpload } from './use-upload';

import {
  ElButton,
  ElImage,
  ElLink,
  ElMessage,
  ElUpload,
} from 'element-plus';

defineOptions({ name: 'FileUpload', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    // 自定义上传 (file: File) => Promise<any>
    api?: Function;
    autoUpload?: boolean;
    buttonText?: string;
    directory?: string;
    disabled?: boolean;
    drag?: boolean;
    fileSize?: number;
    fileType?: string[];
    isShowTip?: boolean;
    limit?: number;
    modelValue: string | string[];
    onUploadSuccess?: (payload: FileUploadSuccessPayload) => void;
    showFileList?: boolean;
  }>(),
  {
    fileType: () => ['doc', 'xls', 'ppt', 'txt', 'pdf'],
    fileSize: 5,
    limit: 5,
    autoUpload: true,
    buttonText: '上传模板',
    drag: false,
    isShowTip: true,
    disabled: false,
    directory: undefined,
    showFileList: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | string[]): void;
  (e: 'success', payload: FileUploadSuccessPayload): void;
}>();

export type FileUploadSuccessPayload = {
  file: UploadFile | UploadUserFile;
  fileName: string;
  filePath?: string;
  fileSize: number;
  fileType: string;
  rawFile?: File;
  response: any;
  url: string;
};

const uploadRef = ref<UploadInstance>();
const uploadList = ref<UploadUserFile[]>([]);
const fileList = ref<UploadUserFile[]>([]);
const uploadNumber = ref<number>(0);

const { uploadUrl, httpRequest }: any = useUpload(props.directory);

function normalizeUrl(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function buildUploadUserFile(urlLike: unknown): UploadUserFile | null {
  const url = normalizeUrl(urlLike);
  if (!url) return null;
  const lastSlash = url.lastIndexOf('/');
  return {
    name: lastSlash >= 0 ? url.slice(lastSlash + 1) : url,
    url,
  };
}

/** 判断是否为图片 */
const isImageFile = (file: UploadUserFile) => {
  if (file.raw && file.raw.type) {
    return file.raw.type.startsWith('image/');
  }
  const url = file.url || file.name || '';
  const extension = url.slice(url.lastIndexOf('.') + 1).toLowerCase();
  return ['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(
    extension,
  );
};

/** httpRequest 适配 ele */
const httpRequest0 = async (options: UploadRequestOptions) => {
  if (props.api && isFunction(props.api)) {
    return await props.api(options.file);
  }
  return await httpRequest(options.file);
};

const beforeUpload: UploadProps['beforeUpload'] = (file: UploadRawFile) => {
  if (fileList.value.length >= props.limit) {
    ElMessage.error(`上传文件数量不能超过${props.limit}个!`);
    return false;
  }
  let fileExtension = '';
  if (file.name.lastIndexOf('.') > -1) {
    fileExtension = file.name.slice(file.name.lastIndexOf('.') + 1);
  }
  const isImg = props.fileType.some((type: string) => {
    if (file.type.indexOf(type) > -1) return true;
    return !!(fileExtension && fileExtension.indexOf(type) > -1);
  });
  const isLimit = file.size < props.fileSize * 1024 * 1024;
  if (!isImg) {
    ElMessage.error(`文件格式不正确, 请上传${props.fileType.join('/')}格式!`);
    return false;
  }
  if (!isLimit) {
    ElMessage.error(`上传文件大小不能超过${props.fileSize}MB!`);
    return false;
  }
  ElMessage.success('正在上传文件，请稍候...');
  uploadNumber.value++;
  return true;
};

function buildSuccessPayload(
  res: any,
  file?: UploadFile | UploadUserFile,
): FileUploadSuccessPayload {
  const url = normalizeUrl(res?.data?.url || res?.url || res);
  const filePath = res?.filePath || res?.data?.filePath || '';
  const rawFile = (file as any)?.raw as File | undefined;
  return {
    response: res,
    url,
    filePath,
    file: (file || ({ name: url, url } as UploadUserFile)) as
      | UploadFile
      | UploadUserFile,
    rawFile,
    fileName: String(file?.name || rawFile?.name || url || ''),
    fileType: String(rawFile?.type || ''),
    fileSize: Number(rawFile?.size || 0),
  };
}

const handleFileSuccess: UploadProps['onSuccess'] = (
  res: any,
  file?: UploadFile,
): void => {
  ElMessage.success('上传成功');
  const url = normalizeUrl(res?.data?.url || res?.url || res);
  const index = fileList.value.findIndex((item: any) => item.response === res);
  if (index !== -1) {
    fileList.value.splice(index, 1);
  }
  if (url) {
    uploadList.value.push({ name: file?.name || url, url });
  }

  const payload = buildSuccessPayload(res, file);
  emit('success', payload);
  props.onUploadSuccess?.(payload);

  if (uploadList.value.length === uploadNumber.value) {
    fileList.value.push(...uploadList.value);
    uploadList.value = [];
    uploadNumber.value = 0;
    emitUpdateModelValue();
  }
};

const handleExceed: UploadProps['onExceed'] = (): void => {
  ElMessage.error(`上传文件数量不能超过${props.limit}个!`);
};

const excelUploadError: UploadProps['onError'] = (): void => {
  ElMessage.error('导入数据失败，请您重新上传！');
  uploadNumber.value = Math.max(0, uploadNumber.value - 1);
};

const handleRemove = (file: UploadFile) => {
  const index = fileList.value.map((f) => f.name).indexOf(file.name);
  if (index !== -1) {
    fileList.value.splice(index, 1);
    emitUpdateModelValue();
  }
};

const handlePreview: UploadProps['onPreview'] = (_) => { };

watch(
  () => props.modelValue,
  (val: string | string[]) => {
    if (!val || (Array.isArray(val) && val.length === 0)) {
      fileList.value = [];
      return;
    }

    fileList.value = [];
    if (isString(val)) {
      const nextFiles = val
        .split(',')
        .map((url) => buildUploadUserFile(url))
        .filter(Boolean) as UploadUserFile[];
      fileList.value.push(...nextFiles);
      return;
    }

    const nextFiles = (val as string[])
      .map((url) => buildUploadUserFile(url))
      .filter(Boolean) as UploadUserFile[];
    fileList.value.push(...nextFiles);
  },
  { immediate: true, deep: true },
);

const emitUpdateModelValue = () => {
  let result: string | string[] = fileList.value
    .map((file) => normalizeUrl(file.url))
    .filter(Boolean);
  if (props.limit === 1 || isString(props.modelValue)) {
    result = result.join(',');
  }
  emit('update:modelValue', result);
};
</script>
<template>
  <div v-if="!disabled" class="upload-file">
    <ElUpload ref="uploadRef" v-model:file-list="fileList" :action="uploadUrl" :auto-upload="autoUpload"
      :before-upload="beforeUpload" :disabled="disabled" :drag="drag" :http-request="httpRequest0" :limit="props.limit"
      :multiple="props.limit > 1" :on-error="excelUploadError" :on-exceed="handleExceed" :on-preview="handlePreview"
      :on-remove="handleRemove" :on-success="handleFileSuccess" :show-file-list="props.showFileList"
      class="upload-file-uploader" name="file">
      <ElButton type="primary">
        <IconifyIcon icon="ep:upload-filled" />
        {{ buttonText }}
      </ElButton>
      <template v-if="isShowTip" #tip>
        <div style="font-size: 8px">
          大小不超过 <b style="color: #f56c6c">{{ fileSize }}MB</b>
        </div>
        <div style="font-size: 8px">
          格式为 <b style="color: #f56c6c">{{ fileType.join('/') }}</b> 的文件
        </div>
      </template>
      <template v-if="props.showFileList" #file="row">
        <div class="flex items-center">
          <ElImage v-if="isImageFile(row.file)" :preview-src-list="[row?.file?.url]" :src="row.file.url" class="mr-2"
            fit="cover" preview-teleported style="width: 40px; height: 40px" />
          <span>{{ JSON.stringify(row.file.name) }}</span>
          <div class="ml-10px">
            <ElLink :href="row.file.url" :underline="false" download target="_blank" type="primary">
              下载
            </ElLink>
          </div>
          <div class="ml-10px">
            <ElButton link type="danger" @click="handleRemove(row.file)">
              删除
            </ElButton>
          </div>
        </div>
      </template>
    </ElUpload>
  </div>

  <div v-if="disabled && props.showFileList" class="upload-file">
    <div v-for="(file, index) in fileList" :key="index" class="file-list-item flex items-center">
      <span>{{ file.name }}</span>
      <div class="ml-10px">
        <ElLink :href="file.url" :underline="false" download target="_blank" type="primary">
          下载
        </ElLink>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.upload-file-uploader {
  margin-bottom: 5px;
}

:deep(.upload-file-list .el-upload-list__item) {
  position: relative;
  margin-bottom: 10px;
  line-height: 2;
  border: 1px solid #e4e7ed;
}

:deep(.el-upload-list__item-file-name) {
  max-width: 250px;
}

:deep(.upload-file-list .ele-upload-list__item-content) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: inherit;
}

:deep(.ele-upload-list__item-content-action .el-link) {
  margin-right: 10px;
}

.file-list-item {
  border: 1px dashed var(--el-border-color-darker);
  border-radius: 8px;
}
</style>
