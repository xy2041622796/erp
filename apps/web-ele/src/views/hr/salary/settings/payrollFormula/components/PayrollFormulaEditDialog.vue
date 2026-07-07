<script lang="ts" setup>

import type { FormInstance, FormRules } from 'element-plus';

import { computed, ref } from 'vue';

import type { EditFormState, FormulaPreset, FormulaPresetOption, OptionItem, RoundModeOption } from '../types';

import {
  ElAlert,
  ElButton,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRow,
  ElSelect,
  ElSwitch,
} from 'element-plus';

const props = defineProps<{
  visible: boolean;
  title: string;
  canSubmit: boolean;
  editForm: EditFormState;
  rules: FormRules;
  targetItemOptions: OptionItem[];
  availableSourceFieldOptions: OptionItem[];
  formulaPresetOptions: FormulaPresetOption[];
  roundModeOptions: RoundModeOption[];
  selectedFormulaPreset: FormulaPreset;
  selectedSourceFields: string[];
  selectedSourceFieldLimit: number;
  showAdvanced: boolean;
  currentPresetTip: string;
  selectedTargetLabel: string;
  selectedSourceFieldLabels: string[];
  generatedFormulaExpr: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:selectedFormulaPreset': [value: FormulaPreset];
  'update:selectedSourceFields': [value: string[]];
  'update:showAdvanced': [value: boolean];
  presetChange: [];
  submit: [];
}>();

const innerFormRef = ref<FormInstance>();
const dialogVisible = computed({ get: () => props.visible, set: (value: boolean) => emit('update:visible', value) });

const formulaOrderHint = computed(() => {
  const labels = props.selectedSourceFieldLabels || [];
  const first = labels[0] || '第 1 个字段';
  const second = labels[1] || '第 2 个字段';

  switch (props.selectedFormulaPreset) {
    case 'DIRECT':
      return `取值规则：直接取 ${first} 的值`;
    case 'ADD':
      return labels.length ? `计算顺序：${labels.join(' + ')}` : '计算顺序：按所选字段顺序依次相加';
    case 'SUBTRACT':
      return `计算顺序：${first} - ${second}`;
    case 'MULTIPLY':
      return labels.length ? `计算顺序：${labels.join(' × ')}` : '计算顺序：按所选字段顺序依次相乘';
    case 'DIVIDE':
      return `计算顺序：${first} ÷ ${second}`;
    default:
      return '';
  }
});

function validate() { return innerFormRef.value?.validate(); }
function clearValidate() { return innerFormRef.value?.clearValidate(); }
defineExpose({ formRef: innerFormRef, validate, clearValidate });
</script>

<template>
  <el-dialog v-model="dialogVisible" :title="title" width="760px" destroy-on-close>
    <el-form ref="innerFormRef" :model="editForm" :rules="rules" label-width="100px">
      <div class="simple-tip">按“结果项目 → 公式类型 → 参与字段”设置即可，其他项可选填。</div>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="结果项目" prop="target_item_code">
            <el-select v-model="editForm.target_item_code" filterable style="width: 100%" placeholder="先选择最终要计算出的工资项目">
              <el-option v-for="item in targetItemOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="公式名称">
            <el-input v-model="editForm.formula_name" placeholder="可不填，系统会自动生成" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="公式类型">
            <div class="preset-grid">
              <div v-for="item in formulaPresetOptions" :key="item.value" :class="['preset-card', { active: selectedFormulaPreset === item.value }]" @click="emit('update:selectedFormulaPreset', item.value); emit('presetChange')">
                <div class="preset-title">{{ item.label }}</div>
                <div class="preset-desc">{{ item.tip }}</div>
              </div>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="参与字段">
            <el-select :model-value="selectedSourceFields" multiple :multiple-limit="selectedSourceFieldLimit" collapse-tags collapse-tags-tooltip filterable style="width: 100%" placeholder="选择参与计算的工资项目字段，顺序会影响减法、乘法、除法结果" @update:model-value="(val:any)=>emit('update:selectedSourceFields', val)">
              <el-option v-for="item in availableSourceFieldOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <div class="field-order-tip">{{ formulaOrderHint }}</div>
          </el-form-item>
        </el-col>
        <el-col :span="24"><el-alert :title="currentPresetTip" type="info" :closable="false" show-icon /></el-col>
        <el-col :span="24">
          <div class="preview-box">
            <div class="preview-line"><span>结果项目：</span>{{ selectedTargetLabel || '未选择' }}</div>
            <div class="preview-line"><span>参与字段：</span>{{ selectedSourceFieldLabels.join('，') || '未选择' }}</div>
            <div class="preview-line"><span>计算顺序：</span>{{ formulaOrderHint || '未生成' }}</div>
            <div class="preview-line"><span>生成表达式：</span>{{ generatedFormulaExpr || '未生成' }}</div>
          </div>
        </el-col>
        <el-col :span="24"><el-button link type="primary" @click="emit('update:showAdvanced', !showAdvanced)">{{ showAdvanced ? '收起高级设置' : '展开高级设置' }}</el-button></el-col>
        <template v-if="showAdvanced">
          <el-col :span="8"><el-form-item label="执行顺序"><el-input-number v-model="editForm.calc_order" :precision="0" :step="1" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="舍入方式"><el-select v-model="editForm.round_mode" style="width: 100%"><el-option v-for="item in roundModeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="启用状态"><el-switch v-model="editForm.is_enabled" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="说明"><el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入说明" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注" /></el-form-item></el-col>
        </template>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="emit('submit')">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.simple-tip,.preset-desc,.preview-line,.field-order-tip{color:var(--el-text-color-secondary);line-height:1.6}
.preset-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%}
.preset-card{border:1px solid var(--el-border-color);border-radius:10px;padding:12px;cursor:pointer;transition:all .2s ease}
.preset-card.active{border-color:var(--el-color-primary);background:var(--el-color-primary-light-9)}
.preset-title{font-size:14px;font-weight:600;margin-bottom:4px}
.preview-box{border:1px solid var(--el-border-color-lighter);border-radius:10px;padding:12px;background:var(--el-fill-color-blank)}
.preview-line span{color:var(--el-text-color-primary);font-weight:600;margin-right:6px}
.field-order-tip{margin-top:6px;font-size:12px}
</style>
