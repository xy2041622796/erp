<script lang="ts" setup>
import type { AssetCategory } from '#/api/erp/finance/assets/category';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

import { computed, reactive, ref, watch } from 'vue';

import { divMoney, moneyNumber, mulMoney, subMoney } from '#/utils/finance/decimal-money';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElTooltip,
} from 'element-plus';

import { getFinanceAuxiliaryValueOptions, type FinanceAuxValueOption } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import { fetchAssetCategorySimpleList } from '#/api/erp/finance/assets/category';
import { buildNextAssetCode, saveAsset } from '#/api/erp/finance/assets/manage';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import {
  getLocalDate,
  getLocalMonth,
  recordAssetSaveChange,
  resolveAccountSetActivationMonth,
} from '#/views/finance/assets/utils';

const props = defineProps<{
  data?: AssetRecord | null;
  modelValue: boolean;
  initializationLocked?: boolean;
  readonly?: boolean;
  source?: 'initialization' | 'list';
}>();

const emit = defineEmits<{
  success: [data: AssetRecord];
  'update:modelValue': [value: boolean];
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const categoryOptions = ref<AssetCategory[]>([]);
const subjectOptions = ref<BilSubjectApi.Subject[]>([]);
const supplierOptions = ref<FinanceAuxValueOption[]>([]);
const departmentOptions = ref<FinanceAuxValueOption[]>([]);

const editForm = reactive<AssetRecord>({
  accumulated_depreciation: 0,
  accumulated_depreciation_subject_code: '',
  accumulated_depreciation_subject_id: '',
  accumulated_depreciation_subject_name: '',
  acquisition_method: '购入',
  asset_account_code: '',
  asset_account_id: '',
  asset_account_name: '',
  asset_amortization_type: 'fixed',
  asset_category_code: '',
  asset_category_id: '',
  asset_category_name: '',
  asset_code: '',
  asset_name: '',
  asset_property: '',
  asset_specification: '',
  asset_status: 1,
  begin_date: '',
  brand: '',
  current_depreciation: 0,
  current_period_depreciate: 1,
  current_year_depreciation: 0,
  depreciation_expense_type: '',
  depreciation_fee_subject_code: '',
  depreciation_fee_subject_id: '',
  depreciation_fee_subject_name: '',
  depreciation_method: '平均年限法',
  depreciation_month: 0,
  disposal_subject_code: '',
  disposal_subject_id: '',
  disposal_subject_name: '',
  entry_period: '',
  id: '',
  model: '',
  month_depreciation: 0,
  net_asset_value: 0,
  opening_accumulated_depreciation: 0,
  opening_depreciated_months: 0,
  previous_year_depreciation: 0,
  purchase_date: '',
  purchase_price: 0,
  remark: '',
  residual_rate: 0,
  residual_value: 0,
  separate_depreciation: 0,
  storage_location: '',
  supplier_id: '',
  supplier_name: '',
  using_department: '',
  using_person: '',
  using_project: '',
});

const dialogTitle = computed(() =>
  props.readonly ? '查看资产' : editForm.id ? '编辑资产' : '新增资产',
);
const formDisabled = computed(() => !!props.readonly);
const inputDateText = computed(() => getLocalDate());
const separateDepreciationDisabled = computed(() => !canSeparateDepreciation());

function getCurrentMonth() {
  return getLocalMonth();
}

function getToday() {
  return getLocalDate();
}

function toAmount(value: unknown) {
  return moneyNumber(value as any);
}

function roundMoney(value: number) {
  return moneyNumber(value);
}

function getResidualRateValue() {
  const rawRate = toAmount(editForm.residual_rate);
  return rawRate > 1 ? rawRate / 100 : rawRate;
}

function resetForm() {
  Object.assign(editForm, {
    accumulated_depreciation: 0,
    accumulated_depreciation_subject_code: '',
    accumulated_depreciation_subject_id: '',
    accumulated_depreciation_subject_name: '',
    acquisition_method: '购入',
    asset_account_code: '',
    asset_account_id: '',
    asset_account_name: '',
    asset_amortization_type: 'fixed',
    asset_category_code: '',
    asset_category_id: '',
    asset_category_name: '',
    asset_code: '',
    asset_name: '',
    asset_property: '',
    asset_specification: '',
    asset_status: 1,
    begin_date: '',
    brand: '',
    current_depreciation: 0,
    current_period_depreciate: 1,
    current_year_depreciation: 0,
    depreciation_expense_type: '',
    depreciation_fee_subject_code: '',
    depreciation_fee_subject_id: '',
    depreciation_fee_subject_name: '',
    depreciation_method: '平均年限法',
    depreciation_month: 0,
    disposal_subject_code: '',
    disposal_subject_id: '',
    disposal_subject_name: '',
    entry_period: getCurrentMonth(),
    id: '',
    lingma_sys_key: '',
    model: '',
    month_depreciation: 0,
    net_asset_value: 0,
    opening_accumulated_depreciation: 0,
    opening_depreciated_months: 0,
    previous_year_depreciation: 0,
    purchase_date: '',
    purchase_price: 0,
    remark: '',
    residual_rate: 0,
    residual_value: 0,
    rowid: '',
    separate_depreciation: 0,
    storage_location: '',
    supplier_id: '',
    supplier_name: '',
    using_department: '',
    using_person: '',
    using_project: '',
  });
}

async function loadCategoryOptions() {
  categoryOptions.value = await fetchAssetCategorySimpleList();
}

async function loadSubjectOptions() {
  const res = await getSubjectList({
    lingma_sys_is_delete: 0,
    subject_state: 1,
  });
  subjectOptions.value = ((res?.list || []) as BilSubjectApi.Subject[]).filter(
    (item) => Number(item.is_leaf_subject ?? 1) === 1,
  );
}

async function loadSupplierOptions() {
  const options = await getFinanceAuxiliaryValueOptions({ dimCodes: ['SUPPLIER'] });
  supplierOptions.value = options.SUPPLIER || [];
}

async function loadDepartmentOptions() {
  const options = await getFinanceAuxiliaryValueOptions({ dimCodes: ['DEPT'] });
  departmentOptions.value = options.DEPT || [];
}

async function loadNextAssetCode() {
  try {
    editForm.asset_code = await buildNextAssetCode();
  } catch (error) {
    console.error(error);
    editForm.asset_code = '';
  }
}

function getCategoryDisplay(item: AssetCategory) {
  return [item.category_code, item.category_name].filter(Boolean).join(' ');
}

function inferAmortizationType(...values: unknown[]) {
  const text = values.map((value) => String(value ?? '')).join(' ');
  if (
    text.includes('长期待摊') ||
    text.includes('待摊费用') ||
    text.includes('租入') ||
    text.includes('装修') ||
    text.includes('改良') ||
    text.includes('大修理')
  ) {
    return 'deferred';
  }
  if (text.includes('无形')) return 'intangible';
  return 'fixed';
}

function shouldCurrentPeriodDepreciate() {
  return ['intangible', 'deferred'].includes(
    String(editForm.asset_amortization_type || ''),
  );
}

function syncCurrentPeriodDepreciateByAssetType() {
  editForm.current_period_depreciate = shouldCurrentPeriodDepreciate() ? 1 : 0;
}

function onCategoryChange(id: string) {
  const item = categoryOptions.value.find(
    (x) => String(x.id || x.rowid || '') === String(id || ''),
  );
  editForm.asset_category_id = String(item?.id || item?.rowid || '') || '';
  editForm.asset_category_code = String(item?.category_code || '');
  editForm.asset_category_name = String(item?.category_name || '');
  editForm.asset_property = String(item?.asset_property || '');
  editForm.asset_amortization_type = inferAmortizationType(
    item?.asset_property,
    item?.category_name,
    item?.category_code,
  );
  editForm.depreciation_method = '平均年限法';
  editForm.depreciation_month = Number(item?.useful_life_months || 0);
  editForm.residual_rate = Number(item?.residual_rate || 0);
  editForm.asset_account_code = String(item?.subject_code || '');
  editForm.asset_account_name = String(item?.subject_name || '');
  const subject = subjectOptions.value.find(
    (x) => String(x.subject_number || '') === String(item?.subject_code || ''),
  );
  editForm.asset_account_id = String(subject?.rowid || '');
  applyAssetAccountByCategory();
  applyDepreciationSubjectsByCategory();
  syncCurrentPeriodDepreciateByAssetType();
  syncOpeningDepreciatedMonthsByBeginDate();
}

function getSubjectDisplay(subject?: BilSubjectApi.Subject) {
  if (!subject) return '';
  return `${subject.subject_number || ''} ${subject.subject_name || ''}`.trim();
}

function setSubject(
  field:
    | 'accumulated_depreciation_subject'
    | 'asset_account'
    | 'depreciation_fee_subject'
    | 'disposal_subject',
  subjectNumber: string,
) {
  const subject = subjectOptions.value.find(
    (item) => String(item.subject_number || '') === String(subjectNumber || ''),
  );
  (editForm as any)[field + '_id'] = String(subject?.rowid || '');
  (editForm as any)[field + '_code'] = String(subject?.subject_number || '');
  (editForm as any)[field + '_name'] = String(subject?.subject_name || '');
}

function setSubjectByCode(
  field:
    | 'accumulated_depreciation_subject'
    | 'asset_account'
    | 'depreciation_fee_subject'
    | 'disposal_subject',
  subjectCode: string,
) {
  const code = String(subjectCode || '').trim();
  if (!code) return;
  const subject = subjectOptions.value.find(
    (item) => String(item.subject_number || '') === code,
  );
  if (!subject) return;
  setSubject(field, code);
}

function findSubjectByKeywords(keywords: string[]) {
  return subjectOptions.value.find((item) => {
    const text = [item.subject_number, item.subject_name].filter(Boolean).join(' ');
    return keywords.some((keyword) => text.includes(keyword));
  });
}

function setSubjectByKeywords(
  field:
    | 'accumulated_depreciation_subject'
    | 'depreciation_fee_subject'
    | 'disposal_subject',
  keywords: string[],
) {
  const subject = findSubjectByKeywords(keywords);
  if (subject?.subject_number) {
    setSubject(field, String(subject.subject_number));
  }
}

function getDefaultAssetAccountSubject() {
  const categoryText = [
    editForm.asset_category_code,
    editForm.asset_category_name,
    editForm.asset_property,
  ]
    .filter(Boolean)
    .join(' ');
  const type = editForm.asset_amortization_type;
  if (type === 'intangible' || categoryText.includes('无形')) {
    return findSubjectByKeywords(['1701', '无形资产']);
  }
  if (type === 'deferred' || categoryText.includes('长期待摊')) {
    return findSubjectByKeywords(['1801', '长期待摊费用', '待摊费用']);
  }
  return findSubjectByKeywords(['1601', '固定资产']);
}

function applyAssetAccountByCategory() {
  const categorySubjectCode = String(editForm.asset_account_code || '').trim();
  if (categorySubjectCode) {
    setSubjectByCode('asset_account', categorySubjectCode);
    if (editForm.asset_account_code) return;
  }

  const subject = getDefaultAssetAccountSubject();
  if (subject?.subject_number) {
    setSubject('asset_account', String(subject.subject_number));
  }
}

function applyDepreciationSubjectsByCategory() {
  const categoryText = [
    editForm.asset_category_code,
    editForm.asset_category_name,
    editForm.asset_property,
  ]
    .filter(Boolean)
    .join(' ');
  const type = editForm.asset_amortization_type;

  if (type === 'intangible' || categoryText.includes('无形')) {
    setSubjectByCode('accumulated_depreciation_subject', '1702');
    if (!editForm.accumulated_depreciation_subject_code) {
      setSubjectByKeywords('accumulated_depreciation_subject', ['累计摊销']);
    }
    setSubjectByKeywords('depreciation_fee_subject', ['摊销费', '无形资产摊销', '管理费用']);
    setSubjectByKeywords('disposal_subject', ['营业外支出', '资产处置损益']);
    return;
  }

  if (type === 'deferred' || categoryText.includes('长期待摊')) {
    setSubjectByKeywords('accumulated_depreciation_subject', [
      '长期待摊费用',
      '待摊费用',
    ]);
    setSubjectByKeywords('depreciation_fee_subject', ['摊销费', '长期待摊', '管理费用']);
    setSubjectByKeywords('disposal_subject', ['营业外支出', '资产处置损益']);
    return;
  }

  setSubjectByCode('accumulated_depreciation_subject', '1602');
  if (!editForm.accumulated_depreciation_subject_code) {
    setSubjectByKeywords('accumulated_depreciation_subject', ['累计折旧']);
  }
  setSubjectByCode('disposal_subject', '1606');
  if (!editForm.disposal_subject_code) {
    setSubjectByKeywords('disposal_subject', ['固定资产清理']);
  }
  setSubjectByKeywords('depreciation_fee_subject', ['折旧费', '管理费用']);
}

function getMonthIndex(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function syncOpeningDepreciatedMonthsByBeginDate() {
  const beginMonthIndex = getMonthIndex(editForm.begin_date || '');
  const entryMonthIndex = getMonthIndex(editForm.entry_period || getCurrentMonth());
  if (beginMonthIndex === null || entryMonthIndex === null) return;

  const baseMonths = Math.max(0, entryMonthIndex - beginMonthIndex);
  const shouldIncludeCurrentPeriod = Number(editForm.current_period_depreciate || 0) === 1;
  const months = baseMonths + (shouldIncludeCurrentPeriod ? 1 : 0);
  const totalMonths = toAmount(editForm.depreciation_month);
  editForm.opening_depreciated_months =
    totalMonths > 0 ? Math.min(months, totalMonths) : months;
}

function getSupplierKey(item: FinanceAuxValueOption) {
  return String(item?.raw?.row_id || item?.raw?.rowid || item?.value || '').trim();
}

function getSupplierName(item: FinanceAuxValueOption) {
  return String(item?.raw?.supplier_name || item?.raw?.value_name || item?.label || '').trim();
}

function onSupplierChange(value: string) {
  const supplier = supplierOptions.value.find(
    (item) => getSupplierKey(item) === String(value || '').trim(),
  );
  editForm.supplier_id = supplier ? getSupplierKey(supplier) : '';
  editForm.supplier_name = supplier ? getSupplierName(supplier) : '';
}

function getDepartmentKey(item: FinanceAuxValueOption) {
  return String(item?.raw?.row_id || item?.raw?.rowid || item?.value || '').trim();
}

function getDepartmentName(item: FinanceAuxValueOption) {
  return String(item?.raw?.department_name || item?.raw?.value_name || item?.label || '').trim();
}

function canSeparateDepreciation() {
  const departmentText = String(editForm.using_department || '').trim();
  if (!departmentText) return false;
  if (departmentText.includes('多部门')) return true;

  const departments = departmentText
    .split(/[,，、;；/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return departments.length > 1;
}

function normalizeSeparateDepreciation() {
  if (separateDepreciationDisabled.value) {
    editForm.separate_depreciation = 0;
  }
}

function updateComputedAmounts() {
  const originalValue = toAmount(editForm.purchase_price);
  const residualValue = roundMoney(mulMoney(originalValue, getResidualRateValue(), 'round', 6) as any);
  const accumulated = toAmount(editForm.accumulated_depreciation);
  const months = toAmount(editForm.depreciation_month);
  const depreciatedMonths = toAmount(editForm.opening_depreciated_months);

  editForm.residual_value = residualValue;
  editForm.remaining_months = Math.max(0, months - depreciatedMonths);
  editForm.net_asset_value = roundMoney(subMoney(originalValue, accumulated) as any);
  editForm.previous_year_depreciation = accumulated;

  const remainingMonths = toAmount(editForm.remaining_months);
  const remainingDepreciableAmount = subMoney(
    editForm.net_asset_value,
    residualValue,
    'round',
    6,
  );
  editForm.month_depreciation =
    remainingMonths > 0
      ? roundMoney(divMoney(remainingDepreciableAmount, remainingMonths) as any)
      : 0;
}


watch(
  () => [
    editForm.accumulated_depreciation,
    editForm.depreciation_month,
    editForm.opening_depreciated_months,
    editForm.current_period_depreciate,
    editForm.purchase_price,
    editForm.residual_rate,
  ],
  updateComputedAmounts,
);

watch(
  () => [
    editForm.begin_date,
    editForm.entry_period,
    editForm.depreciation_month,
    editForm.current_period_depreciate,
  ],
  () => {
    syncOpeningDepreciatedMonthsByBeginDate();
    updateComputedAmounts();
  },
);

watch(
  () => editForm.using_department,
  () => {
    normalizeSeparateDepreciation();
  },
);

watch(
  () => editForm.asset_amortization_type,
  () => {
    applyDepreciationSubjectsByCategory();
    syncCurrentPeriodDepreciateByAssetType();
  },
);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    await Promise.all([
      loadCategoryOptions(),
      loadSubjectOptions(),
      loadSupplierOptions(),
      loadDepartmentOptions(),
    ]);
    resetForm();
    if (props.data) {
      const editingId = String(props.data.id || props.data.rowid || '');
      Object.assign(editForm, props.data, {
        entry_period: props.data.entry_period || getCurrentMonth(),
        id: editingId,
      });
      if (!editingId) {
        await loadNextAssetCode();
        applyAssetAccountByCategory();
        applyDepreciationSubjectsByCategory();
        syncCurrentPeriodDepreciateByAssetType();
        syncOpeningDepreciatedMonthsByBeginDate();
      }
    } else {
      await loadNextAssetCode();
      syncCurrentPeriodDepreciateByAssetType();
    }
    updateComputedAmounts();
  },
  { immediate: true },
);

function getAssetSaveMonth() {
  const value = editForm.begin_date || editForm.purchase_date || editForm.entry_period;
  return String(value || '').slice(0, 7);
}

async function validateSaveScope() {
  const source = props.source || 'list';
  const assetMonth = getAssetSaveMonth();
  const activationMonth = await resolveAccountSetActivationMonth();
  if (!assetMonth || !activationMonth) return true;

  if (source === 'list' && assetMonth < activationMonth) {
    ElMessage.warning('启用期间以前的期初资产请在“资产初始化”中维护');
    return false;
  }
  if (source === 'initialization' && props.initializationLocked && !editForm.id) {
    ElMessage.warning('资产初始化已平衡锁定，不能再新增期初资产');
    return false;
  }
  if (source === 'initialization' && assetMonth >= activationMonth) {
    ElMessage.warning('启用期间及之后的新增资产请在“资产列表”中新增');
    return false;
  }
  return true;
}

function validateForm() {
  const requiredPairs: Array<[keyof AssetRecord, string]> = [
    ['accumulated_depreciation', '请填写累计折旧'],
    ['accumulated_depreciation_subject_code', '请选择累计折旧科目'],
    ['asset_account_code', '请选择资产科目'],
    ['asset_amortization_type', '请选择摊销类型'],
    ['asset_category_id', '请选择资产类别'],
    ['asset_code', '请填写资产编号'],
    ['asset_name', '请填写资产名称'],
    ['begin_date', '请选择开始使用日期'],
    ['current_period_depreciate', '请选择录入当期是否折旧'],
    ['depreciation_fee_subject_code', '请选择折旧费用科目'],
    ['depreciation_method', '请选择折旧方法'],
    ['depreciation_month', '请填写预计使用月份'],
    ['disposal_subject_code', '请选择资产处置科目'],
    ['opening_depreciated_months', '请填写已折旧月份'],
    ['purchase_price', '请填写资产原值'],
    ['residual_rate', '请填写残值率'],
    ['using_department', '请填写使用部门'],
  ];

  for (const [key, message] of requiredPairs) {
    const value = editForm[key];
    if (value === undefined || value === null || value === '') {
      ElMessage.warning(message);
      return false;
    }
  }

  if (Number(editForm.separate_depreciation || 0) === 1 && separateDepreciationDisabled.value) {
    ElMessage.warning('只有选择多部门时才可以进行费用分摊');
    editForm.separate_depreciation = 0;
    return false;
  }

  return true;
}

async function onSave() {
  if (!validateForm()) return;
  if (!(await validateSaveScope())) return;

  try {
    updateComputedAmounts();
    const savedData = { ...editForm };
    const res = await saveAsset(savedData);
    const emittedData = {
      ...savedData,
      asset_code: res.asset_code || savedData.asset_code,
      id: savedData.id || res.id,
    };
    await recordAssetSaveChange(props.data, emittedData);
    ElMessage.success('保存成功');
    emit('success', emittedData);
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
    class="asset-form-dialog"
    :title="dialogTitle"
    width="min(76rem, 98vw)"
    destroy-on-close
  >
    <ElForm
      class="asset-form"
      label-position="left"
      label-width="152px"
      :disabled="formDisabled"
    >
      <div class="form-date">录入日期：{{ inputDateText }}</div>

      <section class="form-section">
        <h3>基本信息</h3>
        <div class="form-grid">
          <ElFormItem label="资产类别" required>
            <ElSelect
              v-model="editForm.asset_category_id"
              class="w-full"
              filterable
              placeholder="请选择"
              @change="onCategoryChange"
            >
              <ElOption
                v-for="item in categoryOptions"
                :key="String(item.id || item.rowid || '')"
                :label="getCategoryDisplay(item)"
                :value="String(item.id || item.rowid || '')"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="资产编号" required>
            <ElInput v-model="editForm.asset_code" />
          </ElFormItem>
          <ElFormItem label="资产名称" required>
            <ElInput v-model="editForm.asset_name" />
          </ElFormItem>
          <ElFormItem label="规格型号">
            <ElInput v-model="editForm.model" />
          </ElFormItem>
          <ElFormItem label="录入期间">
            <ElDatePicker
              v-model="(editForm as any).entry_period"
              type="month"
              value-format="YYYY-MM"
              class="w-full"
              disabled
            />
          </ElFormItem>
          <ElFormItem label="开始使用日期" required>
            <ElDatePicker
              v-model="(editForm as any).begin_date"
              type="date"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="使用部门" required>
            <ElSelect
              v-model="editForm.using_department"
              class="w-full"
              filterable
              placeholder="请选择"
            >
              <ElOption
                v-for="item in departmentOptions"
                :key="getDepartmentKey(item)"
                :label="getDepartmentName(item)"
                :value="getDepartmentName(item)"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="增加方式">
            <ElSelect v-model="editForm.acquisition_method" class="w-full">
              <ElOption label="购入" value="购入" />
              <ElOption label="自建" value="自建" />
              <ElOption label="接受投资" value="接受投资" />
              <ElOption label="融资租入" value="融资租入" />
              <ElOption label="盘盈" value="盘盈" />
              <ElOption label="其他" value="其他" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="供应商">
            <ElSelect
              v-model="editForm.supplier_name"
              class="w-full"
              filterable
              placeholder="请选择"
              @change="onSupplierChange"
            >
              <ElOption
                v-for="item in supplierOptions"
                :key="getSupplierKey(item)"
                :label="getSupplierName(item)"
                :value="getSupplierKey(item)"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="使用人">
            <ElInput v-model="editForm.using_person" />
          </ElFormItem>
          <ElFormItem label="存放位置">
            <ElInput v-model="editForm.storage_location" />
          </ElFormItem>
        </div>
      </section>

      <section class="form-section">
        <h3>折旧/摊销方式</h3>
        <div class="form-grid">
          <ElFormItem label="摊销类型" required>
            <ElSelect
              v-model="editForm.asset_amortization_type"
              class="w-full"
              placeholder="请选择"
            >
              <ElOption label="固定资产摊销" value="fixed" />
              <ElOption label="无形资产摊销" value="intangible" />
              <ElOption label="长期待摊费用" value="deferred" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="折旧方法" required>
            <ElSelect v-model="editForm.depreciation_method" class="w-full">
              <ElOption label="平均年限法" value="平均年限法" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="录入当期是否折旧" required>
            <ElSelect
              v-model="editForm.current_period_depreciate"
              class="w-full"
              placeholder="请选择"
            >
              <ElOption :value="1" label="是" />
              <ElOption :value="0" label="否" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="资产科目" required>
            <ElSelect
              v-model="editForm.asset_account_code"
              class="w-full"
              filterable
              placeholder="请选择"
              @change="setSubject('asset_account', String($event))"
            >
              <ElOption
                v-for="item in subjectOptions"
                :key="String(item.subject_number || '')"
                :label="getSubjectDisplay(item)"
                :value="String(item.subject_number || '')"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="累计折旧科目" required>
            <ElSelect
              v-model="editForm.accumulated_depreciation_subject_code"
              class="w-full"
              filterable
              placeholder="请选择"
              @change="
                setSubject('accumulated_depreciation_subject', String($event))
              "
            >
              <ElOption
                v-for="item in subjectOptions"
                :key="String(item.subject_number || '')"
                :label="getSubjectDisplay(item)"
                :value="String(item.subject_number || '')"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="资产处置科目" required>
            <ElSelect
              v-model="editForm.disposal_subject_code"
              class="w-full"
              filterable
              placeholder="请选择"
              @change="setSubject('disposal_subject', String($event))"
            >
              <ElOption
                v-for="item in subjectOptions"
                :key="String(item.subject_number || '')"
                :label="getSubjectDisplay(item)"
                :value="String(item.subject_number || '')"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="折旧费用科目" required>
            <ElSelect
              v-model="editForm.depreciation_fee_subject_code"
              class="w-full"
              filterable
              placeholder="请选择"
              @change="setSubject('depreciation_fee_subject', String($event))"
            >
              <ElOption
                v-for="item in subjectOptions"
                :key="String(item.subject_number || '')"
                :label="getSubjectDisplay(item)"
                :value="String(item.subject_number || '')"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="分摊">
            <ElTooltip
              content="多部门才可以进行费用分摊"
              placement="top"
              :disabled="!separateDepreciationDisabled"
            >
              <span class="separate-depreciation-wrapper">
                <ElCheckbox
                  v-model="editForm.separate_depreciation"
                  :disabled="separateDepreciationDisabled"
                  :false-value="0"
                  :true-value="1"
                />
              </span>
            </ElTooltip>
          </ElFormItem>
        </div>
      </section>

      <section class="form-section">
        <h3>资产数据</h3>
        <div class="form-grid">
          <ElFormItem label="资产原值" required>
            <ElInputNumber
              v-model="(editForm as any).purchase_price"
              :controls="false"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="残值率" required>
            <ElInputNumber
              v-model="(editForm as any).residual_rate"
              :controls="false"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="预计残值">
            <ElInputNumber
              v-model="(editForm as any).residual_value"
              :controls="false"
              class="w-full"
              disabled
            />
          </ElFormItem>
          <ElFormItem label="预计使用月份" required>
            <ElInputNumber
              v-model="(editForm as any).depreciation_month"
              :controls="false"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="已折旧月份" required>
            <ElInputNumber
              v-model="(editForm as any).opening_depreciated_months"
              :controls="false"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="剩余使用月份">
            <ElInputNumber
              v-model="(editForm as any).remaining_months"
              :controls="false"
              class="w-full"
              disabled
            />
          </ElFormItem>
          <ElFormItem label="累计折旧" required>
            <ElInputNumber
              v-model="(editForm as any).accumulated_depreciation"
              :controls="false"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="本年累计折旧">
            <ElInputNumber
              v-model="(editForm as any).current_year_depreciation"
              :controls="false"
              class="w-full"
            />
          </ElFormItem>
          <ElFormItem label="以前年度累计折旧">
            <ElInputNumber
              v-model="(editForm as any).previous_year_depreciation"
              :controls="false"
              class="w-full"
              disabled
            />
          </ElFormItem>
          <ElFormItem label="月摊销额" required>
            <ElInputNumber
              v-model="(editForm as any).month_depreciation"
              :controls="false"
              class="w-full"
              disabled
            />
          </ElFormItem>
          <ElFormItem label="净值">
            <ElInputNumber
              v-model="(editForm as any).net_asset_value"
              :controls="false"
              class="w-full"
              disabled
            />
          </ElFormItem>
          <ElFormItem label="备注">
            <ElInput v-model="editForm.remark" />
          </ElFormItem>
        </div>
      </section>
    </ElForm>

    <template #footer>
      <ElButton v-if="!formDisabled" type="primary" @click="onSave">保存</ElButton>
      <ElButton @click="showDialog = false">{{ formDisabled ? '关闭' : '取消' }}</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.asset-form-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  text-align: center;
}

.asset-form {
  position: relative;
}

.form-date {
  position: absolute;
  top: 4px;
  right: 0;
  color: var(--el-text-color-secondary);
}

.form-section {
  padding: 18px 0 14px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.form-section:first-of-type {
  padding-top: 8px;
}

.form-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 24px;
}

.form-grid :deep(.el-form-item) {
  margin-bottom: 0;
}

.form-grid :deep(.el-form-item__label) {
  align-items: center;
  height: 32px;
  line-height: 32px;
  white-space: nowrap;
}

.form-grid :deep(.el-input-number .el-input__inner) {
  text-align: left;
}

.separate-depreciation-wrapper {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
}

.separate-depreciation-wrapper :deep(.el-checkbox.is-disabled) {
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-date {
    position: static;
    margin-bottom: 10px;
    text-align: right;
  }
}
</style>
