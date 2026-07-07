<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import { computed, ref } from 'vue';

import {
  ElButton,
  ElCol,
  ElDatePicker,
  ElDialog,
  ElDivider,
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
  submitLoading: boolean;
  editForm: Record<string, any>;
  rules: FormRules;
  categoryOptions: Array<{ label: string; value: string }>;
  directionOptions: Array<{ label: string; value: string }>;
  inputModeOptions: Array<{ label: string; value: string }>;
  dataTypeOptions: Array<{ label: string; value: string }>;
  unitOptions: Array<{ label: string; value: string }>;
  defaultSourceOptions: Array<{ label: string; value: string }>;
  displayOptions: Array<{ label: string; value: string }>;
  permissionOptions: Array<{ label: string; value: string }>;
  visibleScopeOptions: Array<{ label: string; value: string }>;
  editableScopeOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  categoryChange: [];
  nameBlur: [];
  submit: [];
}>();

const innerFormRef = ref<FormInstance>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

function validate() {
  return innerFormRef.value?.validate();
}

function clearValidate() {
  return innerFormRef.value?.clearValidate();
}

defineExpose({
  formRef: innerFormRef,
  validate,
  clearValidate,
});
</script>

<template>
  <el-dialog v-model="dialogVisible" :title="title" width="1080px" destroy-on-close>
    <el-form ref="innerFormRef" :model="editForm" :rules="rules" label-width="110px">
      <el-divider content-position="left">基础信息</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="项目编码" prop="item_code">
            <el-input v-model="editForm.item_code" placeholder="请输入项目编码" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="项目名称" prop="item_name">
            <el-input v-model="editForm.item_name" placeholder="请输入项目名称" @blur="emit('nameBlur')" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="显示名称" prop="display_name">
            <el-input v-model="editForm.display_name" placeholder="工资条显示名称" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="项目分类" prop="item_category">
            <el-select v-model="editForm.item_category" style="width: 100%" @change="emit('categoryChange')">
              <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="项目子分类" prop="item_subcategory">
            <el-input v-model="editForm.item_subcategory" placeholder="如 固定工资 / 绩效奖金" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="显示分组" prop="display_group">
            <el-input v-model="editForm.display_group" placeholder="如 固定工资 / 税务项目" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="项目方向" prop="item_direction">
            <el-select v-model="editForm.item_direction" style="width: 100%">
              <el-option v-for="item in directionOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="录入模式" prop="input_mode">
            <el-select v-model="editForm.input_mode" style="width: 100%">
              <el-option v-for="item in inputModeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="默认值来源">
            <el-select v-model="editForm.default_source" style="width: 100%" disabled>
              <el-option v-for="item in defaultSourceOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">值与约束</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="默认值">
            <el-input-number v-model="editForm.default_value" :precision="2" :step="1" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="数据类型" prop="data_type">
            <el-select v-model="editForm.data_type" style="width: 100%">
              <el-option v-for="item in dataTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="单位" prop="unit">
            <el-select v-model="editForm.unit" style="width: 100%">
              <el-option v-for="item in unitOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="数值精度" prop="value_precision">
            <el-input-number v-model="editForm.value_precision" :precision="0" :step="1" :min="0" :max="6" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="校验规则" prop="validation_rule">
            <el-input v-model="editForm.validation_rule" placeholder="如 >=0 / 0-100" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="排序" prop="sort_no">
            <el-input-number v-model="editForm.sort_no" :precision="0" :step="1" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="4"><el-form-item label="计税项"><el-switch v-model="editForm.is_tax_item" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
        <el-col :span="4"><el-form-item label="公式项"><el-switch v-model="editForm.is_formula_item" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
        <el-col :span="4"><el-form-item label="奖金项"><el-switch v-model="editForm.is_bonus_item" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
        <el-col :span="4"><el-form-item label="自定义项"><el-switch v-model="editForm.is_custom_item" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
        <el-col :span="4"><el-form-item label="是否必填"><el-switch v-model="editForm.required_flag" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
        <el-col :span="4"><el-form-item label="允许负数"><el-switch v-model="editForm.negative_allowed" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
      </el-row>

      <el-divider content-position="left">展示与权限</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="工资条显示">
            <el-select v-model="editForm.salary_slip_display" style="width: 100%">
              <el-option v-for="item in displayOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="设置权限">
            <el-select v-model="editForm.setting_permission" style="width: 100%">
              <el-option v-for="item in permissionOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="可见范围">
            <el-select v-model="editForm.visible_scope" style="width: 100%">
              <el-option v-for="item in visibleScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="可编辑范围">
            <el-select v-model="editForm.editable_scope" style="width: 100%">
              <el-option v-for="item in editableScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="启用状态">
            <el-switch v-model="editForm.is_enabled" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="版本号" prop="version_no">
            <el-input-number v-model="editForm.version_no" :precision="0" :step="1" :min="1" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">来源与规则绑定</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="来源表" prop="source_table">
            <el-input v-model="editForm.source_table" placeholder="如 Bil_Attendance_Result" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="来源字段" prop="source_field">
            <el-input v-model="editForm.source_field" placeholder="如 overtime_hours" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="来源表达式" prop="source_expr">
            <el-input v-model="editForm.source_expr" placeholder="如 hours * hourly_rate" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="税规则编码" prop="tax_rule_code">
            <el-input v-model="editForm.tax_rule_code" placeholder="如 SALARY_TAX_DEFAULT" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="社保规则编码" prop="social_insurance_rule_code">
            <el-input v-model="editForm.social_insurance_rule_code" placeholder="如 SI_RULE_CN" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="公积金规则编码" prop="housing_fund_rule_code">
            <el-input v-model="editForm.housing_fund_rule_code" placeholder="如 HF_RULE_CN" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">生效期与备注</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="生效开始" prop="effective_start_date">
            <el-date-picker v-model="editForm.effective_start_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="请选择开始日期" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="生效结束" prop="effective_end_date">
            <el-date-picker v-model="editForm.effective_end_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="请选择结束日期" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="说明" prop="description">
            <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入说明" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="emit('submit')">保存</el-button>
    </template>
  </el-dialog>
</template>
