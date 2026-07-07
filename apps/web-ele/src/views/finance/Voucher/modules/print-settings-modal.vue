<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTabPane,
  ElTabs,
} from 'element-plus';


type PrintScope = 'all' | 'selected';
type VoucherVerticalAlign = 'center' | 'top';
type PrintOrientation = 'portrait' | 'landscape';
type PaperSize = 'A4';
type PrintFontFamily = 'SimSun' | 'Microsoft YaHei' | 'KaiTi';

interface PrintSettings {
  printScope: PrintScope;
  paperSize: PaperSize;
  verticalAlign: VoucherVerticalAlign;
  voucherRows: number;
  fontFamily: PrintFontFamily;
  fontSize: number;
  orientation: PrintOrientation;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
}

const STORAGE_KEY = 'lmbill.finance.print-settings';
const DEFAULT_SETTINGS: PrintSettings = {
  printScope: 'all',
  paperSize: 'A4',
  verticalAlign: 'center',
  voucherRows: 5,
  fontFamily: 'SimSun',
  fontSize: 10,
  orientation: 'portrait',
  marginLeft: 25,
  marginRight: 10,
  marginTop: 14,
  marginBottom: 15,
};

const emit = defineEmits<{
  success: [];
}>();

const activeTab = ref('basic');
const formData = reactive<PrintSettings>({
  ...DEFAULT_SETTINGS,
});

const paperSizeOptions = [{ label: 'A4两版（推荐）', value: 'A4' }];
const voucherRowsOptions = [3, 4, 5, 6, 7, 8];
const fontFamilyOptions = [
  { label: '宋体', value: 'SimSun' },
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: '楷体', value: 'KaiTi' },
];
const fontSizeOptions = [9, 10, 11, 12, 14];

const previewText = computed(() => {
  const scopeText = formData.printScope === 'all' ? '打印全部凭证' : '打印选中凭证';
  const alignText = formData.verticalAlign === 'center' ? '居中' : '靠上';
  const orientationText = formData.orientation === 'portrait' ? '纵向' : '横向';
  const fontLabel = fontFamilyOptions.find((item) => item.value === formData.fontFamily)?.label || '宋体';
  return `${scopeText}；${formData.paperSize}；${alignText}；${formData.voucherRows} 行；${fontLabel} ${formData.fontSize} 号；${orientationText}。`;
});

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(num)));
}

function normalizeSettings(value?: Partial<PrintSettings> | null): PrintSettings {
  const printScope = value?.printScope === 'selected' ? 'selected' : 'all';
  const verticalAlign = value?.verticalAlign === 'top' ? 'top' : 'center';
  const orientation = value?.orientation === 'landscape' ? 'landscape' : 'portrait';
  const fontFamily = fontFamilyOptions.some((item) => item.value === value?.fontFamily)
    ? (value?.fontFamily as PrintFontFamily)
    : DEFAULT_SETTINGS.fontFamily;

  return {
    printScope,
    paperSize: 'A4',
    verticalAlign,
    voucherRows: clampNumber(value?.voucherRows, 3, 8, DEFAULT_SETTINGS.voucherRows),
    fontFamily,
    fontSize: clampNumber(value?.fontSize, 9, 14, DEFAULT_SETTINGS.fontSize),
    orientation,
    marginLeft: clampNumber(value?.marginLeft, 0, 50, DEFAULT_SETTINGS.marginLeft),
    marginRight: clampNumber(value?.marginRight, 0, 50, DEFAULT_SETTINGS.marginRight),
    marginTop: clampNumber(value?.marginTop, 0, 50, DEFAULT_SETTINGS.marginTop),
    marginBottom: clampNumber(value?.marginBottom, 0, 50, DEFAULT_SETTINGS.marginBottom),
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    Object.assign(formData, normalizeSettings(parsed));
  } catch (error) {
    console.error('load print settings failed', error);
    Object.assign(formData, DEFAULT_SETTINGS);
  }
}

const [Modal, modalApi] = useVbenModal({
  title: '凭证打印',
  draggable: true,
  showConfirmButton: false,
  showCancelButton: false,
  async onOpenChange(isOpen: boolean) {
    if (isOpen) {
      activeTab.value = 'basic';
      loadSettings();
    }
  },
});

function saveSettings() {
  try {
    const payload = normalizeSettings(formData);
    Object.assign(formData, payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    ElMessage.success('打印设置已保存');
    emit('success');
    modalApi.close();
  } catch (error) {
    console.error('save print settings failed', error);
    ElMessage.error('保存失败，请稍后重试');
  }
}

function resetSettings() {
  Object.assign(formData, DEFAULT_SETTINGS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  ElMessage.success('已恢复默认设置');
  emit('success');
}
</script>

<template>
  <Modal class="print-settings-modal">
    <div class="space-y-4 p-1">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基础设置" name="basic">
          <el-form label-width="115px" class="pt-2">
            <el-form-item label="打印选项：">
              <el-radio-group v-model="formData.printScope">
                <el-radio value="all">打印全部凭证</el-radio>
                <el-radio value="selected">打印选中凭证</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="选择打印纸张：">
              <el-select v-model="formData.paperSize" class="w-[220px]">
                <el-option
                  v-for="item in paperSizeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="版面位置：">
              <el-radio-group v-model="formData.verticalAlign">
                <el-radio value="center">居中</el-radio>
                <el-radio value="top">靠上</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="打印版凭证行：">
              <div class="flex items-center gap-2">
                <el-select v-model="formData.voucherRows" class="w-[100px]">
                  <el-option v-for="item in voucherRowsOptions" :key="item" :label="String(item)" :value="item" />
                </el-select>
                <span>行</span>
              </div>
            </el-form-item>

            <el-form-item label="打印字体：">
              <el-select v-model="formData.fontFamily" class="w-[100px]">
                <el-option
                  v-for="item in fontFamilyOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="打印字体大小：">
              <el-select v-model="formData.fontSize" class="w-[100px]">
                <el-option v-for="item in fontSizeOptions" :key="item" :label="String(item)" :value="item" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="更多设置" name="more">
          <el-form label-width="115px" class="pt-2">
            <el-form-item label="打印方向：">
              <el-radio-group v-model="formData.orientation">
                <el-radio value="portrait">纵向</el-radio>
                <el-radio value="landscape">横向</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="页面边距：">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span>左</span>
                  <el-input-number v-model="formData.marginLeft" :min="0" :max="50" :step="1" controls-position="right" />
                  <span>毫米</span>
                  <span class="ml-4">右</span>
                  <el-input-number v-model="formData.marginRight" :min="0" :max="50" :step="1" controls-position="right" />
                  <span>毫米</span>
                </div>
                <div class="flex items-center gap-3">
                  <span>上</span>
                  <el-input-number v-model="formData.marginTop" :min="0" :max="50" :step="1" controls-position="right" />
                  <span>毫米</span>
                  <span class="ml-4">下</span>
                  <el-input-number v-model="formData.marginBottom" :min="0" :max="50" :step="1" controls-position="right" />
                  <span>毫米</span>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="rounded bg-[var(--el-fill-color-light)] p-3 text-sm text-[var(--el-text-color-regular)]">
        {{ previewText }}
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <el-button @click="resetSettings">恢复默认</el-button>
        <el-button @click="modalApi.close()">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.print-settings-modal :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
</style>
