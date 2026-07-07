<script lang="ts" setup>
import type {
  DimensionPreviewResult,
  DimensionRuleBundle,
  DimensionRuleCondition,
  DimensionRuleConfig,
  DimensionRuleResult,
} from '#/api/erp/finance/dimension/config';
import type { DimensionDictItem } from '#/api/erp/finance/dimension/dict';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDivider,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  createDimensionRuleBundle,
  deleteDimensionRuleBundle,
  deleteDimensionRuleCondition,
  deleteDimensionRuleResult,
  getDimensionRuleBundle,
  getDimensionRuleConditions,
  getDimensionRuleList,
  getDimensionRuleResults,
  saveDimensionResultByRulePayload,
  saveDimensionRuleBundle,
  syncDimensionRuleTemplates,
} from '#/api/erp/finance/dimension/config';
import { getDimensionDictItemList } from '#/api/erp/finance/dimension/dict';
import { getEnabledCurrencyOptions } from '#/api/erp/finance/settings/currency';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import { BusinessObjectSelectorBlock } from '#/components/business-object-selector';
import VoucherSubjectPicker from '#/views/finance/Voucher/modules/VoucherSubjectPicker.vue';

defineOptions({ name: 'FinanceDimensionRuleConfig' });

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const triggering = ref(false);
const syncingTemplates = ref(false);
const keyword = ref('');
const selectedEvent = ref('ALL');
const selectedStatus = ref('ALL');
const editorVisible = ref(false);
const detailVisible = ref(false);
const triggerVisible = ref(false);
const fieldPickerVisible = ref(false);
const editorMode = ref<'create' | 'edit'>('edit');
const fieldPickerTarget = ref<any>(null);
const fieldPickerSelection = reactive<any>({
  appCode: '',
  appName: '',
  dbName: '',
  tableName: '',
  tableId: '',
  fieldName: '',
});
const triggerForm = reactive({ payloadText: '', allowOverwrite: true });
const triggerPreview = ref<DimensionPreviewResult | null>(null);
const tableData = ref<DimensionRuleConfig[]>([]);
const currentRow = ref<DimensionRuleConfig | null>(null);
const conditions = ref<DimensionRuleCondition[]>([]);
const results = ref<DimensionRuleResult[]>([]);
const subjectLoading = ref(false);
const subjectOptions = ref<
  Array<{ label: string; raw: BilSubjectApi.Subject; value: string }>
>([]);

type DictSelectOption = {
  label: string;
  parentCode?: string;
  raw: DimensionDictItem;
  value: string;
};

const dictLoading = ref(false);
const bizCategoryOptions = ref<DictSelectOption[]>([]);
const eventCodeOptions = ref<DictSelectOption[]>([]);
const resultCategoryOptions = ref<DictSelectOption[]>([]);
const operatorOptions = ref<DictSelectOption[]>([]);
const valueSourceOptions = ref<DictSelectOption[]>([]);
const valueTypeOptions = ref<DictSelectOption[]>([]);
const amountTypeOptions = ref<DictSelectOption[]>([]);
const optionalExprTypeOptions = ref<DictSelectOption[]>([]);
const dimCodeOptions = ref<DictSelectOption[]>([]);
const directionOptions = ref<DictSelectOption[]>([]);
const currencyOptions = ref<DictSelectOption[]>([]);

const editor = reactive<DimensionRuleBundle>({
  rule: {
    rowid: 'RULE_TEST_SALE_SHIPMENT',
    rule_code: 'DIM_RULE_SALE_SHIPMENT_TEST',
    rule_name: '销售出库审批测试规则',
    event_code: 'SALE_SHIPMENT',
    biz_category: 'SALE',
    account_set_id: 'AS1001',
    priority: 999,
    voucher_required: 1,
    auto_voucher_write: 1,
    status: 1,
    stop_after_match: 1,
    description: '',
  },
  conditions: [],
  results: [],
});

const eventOptions = computed(() => {
  if (eventCodeOptions.value.length > 0) return eventCodeOptions.value;
  const values = [
    ...new Set(tableData.value.map((item) => item.event_code).filter(Boolean)),
  ];
  return values.map((value) => ({
    label: value,
    value,
    parentCode: '',
    raw: {} as DimensionDictItem,
  }));
});

const editorTitle = computed(() =>
  editorMode.value === 'create' ? '新增规则' : '编辑规则',
);

function toDictOption(item: DimensionDictItem): DictSelectOption {
  return {
    label: item.item_name || item.item_code,
    value: item.item_value || item.item_code,
    parentCode: item.parent_code || '',
    raw: item,
  };
}

function createFallbackDictItem(
  dictTypeCode: string,
  itemCode: string,
  itemName: string,
  parentCode = '',
  sortNo = 1,
): DimensionDictItem {
  return {
    rowid: `FALLBACK_${dictTypeCode}_${itemCode}`,
    dict_type_code: dictTypeCode,
    item_code: itemCode,
    item_name: itemName,
    item_value: itemCode,
    parent_code: parentCode,
    sort_no: sortNo,
    status: 1,
    builtin_flag: 1,
  };
}

const fallbackDictItems: Record<string, DimensionDictItem[]> = {
  DIM_CATEGORY: [
    createFallbackDictItem('DIM_CATEGORY', 'FINANCIAL', '财务维度', '', 10),
    createFallbackDictItem('DIM_CATEGORY', 'BIZ', '业务维度', '', 20),
    createFallbackDictItem('DIM_CATEGORY', 'ANALYSIS', '分析维度', '', 30),
  ],
  DIM_OPERATOR: [
    createFallbackDictItem('DIM_OPERATOR', 'equal', '等于', '', 1),
    createFallbackDictItem('DIM_OPERATOR', 'contains', '包含', '', 3),
    createFallbackDictItem('DIM_OPERATOR', 'notnull', '不为空', '', 10),
  ],
  DIM_VALUE_SOURCE: [
    createFallbackDictItem('DIM_VALUE_SOURCE', 'CONST', '固定值', '', 1),
    createFallbackDictItem('DIM_VALUE_SOURCE', 'FIELD', '字段取值', '', 2),
  ],
  DIM_VALUE_TYPE: [
    createFallbackDictItem('DIM_VALUE_TYPE', 'CONST', '固定值', '', 1),
    createFallbackDictItem('DIM_VALUE_TYPE', 'FIELD', '字段取值', '', 2),
    createFallbackDictItem('DIM_VALUE_TYPE', 'DICT', '字典映射', '', 3),
    createFallbackDictItem('DIM_VALUE_TYPE', 'FUNC', '函数计算', '', 4),
  ],
  DIM_AMOUNT_TYPE: [
    createFallbackDictItem('DIM_AMOUNT_TYPE', 'NONE', '无金额', '', 1),
    createFallbackDictItem('DIM_AMOUNT_TYPE', 'CONST', '固定金额', '', 2),
    createFallbackDictItem('DIM_AMOUNT_TYPE', 'FIELD', '字段金额', '', 3),
    createFallbackDictItem('DIM_AMOUNT_TYPE', 'FUNC', '函数/公式', '', 4),
  ],
  DIM_EXPR_TYPE: [
    createFallbackDictItem('DIM_EXPR_TYPE', 'CONST', '固定值', '', 1),
    createFallbackDictItem('DIM_EXPR_TYPE', 'FIELD', '字段取值', '', 2),
    createFallbackDictItem('DIM_EXPR_TYPE', 'FUNC', '函数计算', '', 3),
  ],
  DIM_CODE: [
    createFallbackDictItem('DIM_CODE', 'SUBJECT', '会计科目', 'FINANCIAL', 1),
    createFallbackDictItem('DIM_CODE', 'AMOUNT', '金额', 'FINANCIAL', 2),
    createFallbackDictItem('DIM_CODE', 'CUSTOMER', '客户', 'BIZ', 101),
    createFallbackDictItem('DIM_CODE', 'DEPT', '部门', 'BIZ', 102),
    createFallbackDictItem('DIM_CODE', 'ORDER_NO', '订单号', 'ANALYSIS', 201),
  ],
};

function filterDictItems(items: DimensionDictItem[], dictTypeCode: string) {
  const matchedItems = items.filter(
    (item) =>
      item.dict_type_code === dictTypeCode && Number(item.status || 0) === 1,
  );
  const mergedItems = [
    ...(fallbackDictItems[dictTypeCode] || []),
    ...matchedItems,
  ];
  return [
    ...new Map(
      mergedItems.map((item) => [item.item_value || item.item_code, item]),
    ).values(),
  ]
    .sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0))
    .map(toDictOption);
}

async function loadDictOptions() {
  dictLoading.value = true;
  try {
    const items = await getDimensionDictItemList({ includeDisabled: false });
    bizCategoryOptions.value = filterDictItems(items, 'DIM_BIZ_CATEGORY');
    eventCodeOptions.value = filterDictItems(items, 'DIM_EVENT_CODE');
    resultCategoryOptions.value = filterDictItems(items, 'DIM_CATEGORY');
    operatorOptions.value = filterDictItems(items, 'DIM_OPERATOR');
    valueSourceOptions.value = filterDictItems(items, 'DIM_VALUE_SOURCE');
    valueTypeOptions.value = filterDictItems(items, 'DIM_VALUE_TYPE');
    amountTypeOptions.value = filterDictItems(items, 'DIM_AMOUNT_TYPE');
    optionalExprTypeOptions.value = filterDictItems(items, 'DIM_EXPR_TYPE');
    dimCodeOptions.value = filterDictItems(items, 'DIM_CODE');
    directionOptions.value = filterDictItems(items, 'DIM_DIRECTION');
    currencyOptions.value = (await getEnabledCurrencyOptions()).map((item) => ({
      label: item.label,
      value: item.value,
      parentCode: '',
      raw: {} as DimensionDictItem,
    }));
  } finally {
    dictLoading.value = false;
  }
}

function getDictLabel(options: DictSelectOption[], value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  const matched = options.find(
    (item) =>
      item.value === normalized ||
      item.raw.item_code === normalized ||
      item.label === normalized,
  );
  return matched?.label || normalized;
}

function normalizeBizCategoryCode(value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  const matched = bizCategoryOptions.value.find(
    (item) =>
      item.value === normalized ||
      item.raw.item_code === normalized ||
      item.label === normalized,
  );
  return matched?.value || normalized;
}

function getEventLabel(value?: string) {
  return getDictLabel(eventCodeOptions.value, value);
}

function getBizCategoryLabel(value?: string) {
  return getDictLabel(bizCategoryOptions.value, value);
}

function getDimCategoryLabel(value?: string) {
  return getDictLabel(resultCategoryOptions.value, value);
}

const filteredData = computed(() => {
  const text = keyword.value.trim();
  return tableData.value.filter((item) => {
    const matchesKeyword =
      !text ||
      [
        item.rule_code,
        item.rule_name,
        item.event_code,
        item.biz_category,
        item.account_set_id,
      ]
        .filter(Boolean)
        .some((value) => String(value).includes(text));
    const matchesEvent =
      selectedEvent.value === 'ALL' || item.event_code === selectedEvent.value;
    const matchesStatus =
      selectedStatus.value === 'ALL' ||
      String(item.status) === selectedStatus.value;
    return matchesKeyword && matchesEvent && matchesStatus;
  });
});

function assignEditor(bundle: DimensionRuleBundle) {
  editor.rule = {
    ...bundle.rule,
    biz_category: normalizeBizCategoryCode(bundle.rule.biz_category),
  };
  editor.conditions = (bundle.conditions || []).map((item, index) => ({
    ...item,
    sort_no: index + 1,
  }));
  editor.results = (bundle.results || []).map((item, index) => ({
    ...item,
    sort_no: index + 1,
  }));
}

async function loadRuleDetails(rule: DimensionRuleConfig | null) {
  currentRow.value = rule;
  if (!rule?.rowid) {
    conditions.value = [];
    results.value = [];
    return;
  }

  const [condRes, resultRes] = await Promise.all([
    getDimensionRuleConditions(rule.rowid),
    getDimensionRuleResults(rule.rowid),
  ]);

  conditions.value = condRes;
  results.value = resultRes;
}

async function loadData(targetRuleId?: string) {
  loading.value = true;
  try {
    tableData.value = await getDimensionRuleList();
    const target =
      tableData.value.find((item) => item.rowid === targetRuleId) ||
      tableData.value[0] ||
      null;
    await loadRuleDetails(target);
  } finally {
    loading.value = false;
  }
}

function handleRowClick(row: DimensionRuleConfig) {
  void loadRuleDetails(row);
}

async function handleSyncTemplates() {
  try {
    await ElMessageBox.confirm(
      '将从模板库同步生成通用维度规则、条件和输出维度，不写入账套字段。已有同模板规则会被覆盖更新，确定继续吗？',
      '同步模板确认',
      {
        type: 'warning',
        confirmButtonText: '确定同步',
        cancelButtonText: '取消',
      },
    );
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel')
      return;
    throw error;
  }
  syncingTemplates.value = true;
  try {
    const result = await syncDimensionRuleTemplates();
    ElMessage.success(`模板同步完成，共同步 ${result.synced} 个模板`);
    await loadData();
  } finally {
    syncingTemplates.value = false;
  }
}

async function openCreateEditor() {
  const bundle = await createDimensionRuleBundle();
  assignEditor(bundle);
  editorMode.value = 'create';
  editorVisible.value = true;
}

async function openEditor(row?: DimensionRuleConfig) {
  const target = row || currentRow.value;
  const targetRuleId = target?.rowid;
  if (!targetRuleId) {
    ElMessage.warning('请先选择需要编辑的规则');
    return;
  }
  currentRow.value = target;
  const bundle = await getDimensionRuleBundle(targetRuleId);
  if (!bundle) {
    ElMessage.warning('当前规则明细不存在或已被删除');
    return;
  }
  assignEditor(bundle);
  editorMode.value = 'edit';
  editorVisible.value = true;
}

async function openDetail(row?: DimensionRuleConfig) {
  const target = row || currentRow.value;
  if (!target?.rowid) {
    ElMessage.warning('请先选择需要查看的规则');
    return;
  }
  await loadRuleDetails(target);
  detailVisible.value = true;
}

function buildDefaultTriggerPayload(rule?: DimensionRuleConfig | null) {
  const eventCode = String(rule?.event_code || '').trim();
  const now = new Date().toISOString();
  const base: Record<string, any> = {
    id: '请替换为业务数据ID',
    rowid: '请替换为业务数据rowid',
    no: '请替换为业务单号',
    biz_category: rule?.biz_category || '',
  };
  if (eventCode.includes('SALE'))
    Object.assign(base, {
      customer_id: 'CUST_001',
      sale_user_id: 'USER_001',
      order_time: now,
      out_time: now,
      total_price: 1000,
      total_product_price: 900,
      total_tax_price: 100,
    });
  else if (eventCode.includes('PURCHASE'))
    Object.assign(base, {
      supplier_id: 'SUP_001',
      purchase_user_id: 'USER_001',
      order_time: now,
      in_time: now,
      total_price: 1000,
      total_product_price: 900,
      total_tax_price: 100,
    });
  else if (eventCode.includes('COLLECTION'))
    Object.assign(base, {
      customer_id: 'CUST_001',
      finance_user_id: 'USER_001',
      receipt_time: now,
      receipt_price: 1000,
      account_id: 'ACCOUNT_001',
    });
  else if (eventCode.includes('PAYMENT'))
    Object.assign(base, {
      supplier_id: 'SUP_001',
      finance_user_id: 'USER_001',
      payment_time: now,
      payment_price: 1000,
      account_id: 'ACCOUNT_001',
    });
  else Object.assign(base, { biz_date: now, amount: 1000, total_price: 1000 });
  return base;
}

function openTriggerDialog(row?: DimensionRuleConfig) {
  const target = row || currentRow.value;
  if (!target?.event_code) {
    ElMessage.warning('请先选择要触发的维度规则');
    return;
  }
  currentRow.value = target;
  triggerPreview.value = null;
  triggerForm.allowOverwrite = true;
  triggerForm.payloadText = JSON.stringify(
    buildDefaultTriggerPayload(target),
    null,
    2,
  );
  triggerVisible.value = true;
}

function parseTriggerPayload() {
  try {
    const payload = JSON.parse(triggerForm.payloadText || '{}');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new Error('业务数据必须是 JSON 对象');
    return payload;
  } catch (error: any) {
    ElMessage.error(error?.message || '业务数据 JSON 格式不正确');
    return null;
  }
}

async function handlePreviewTrigger() {
  const target = currentRow.value;
  const payload = parseTriggerPayload();
  if (!target?.event_code || !payload) return;
  triggering.value = true;
  try {
    const { previewRuleExecution } = await import(
      '#/api/erp/finance/dimension/config'
    );
    triggerPreview.value = await previewRuleExecution(
      target.event_code,
      payload,
    );
    if (triggerPreview.value?.matched)
      ElMessage.success(`命中规则：${triggerPreview.value.rule_name}`);
    else ElMessage.warning('当前业务数据未命中启用规则');
  } finally {
    triggering.value = false;
  }
}

async function handleGenerateDimensionByButton() {
  const target = currentRow.value;
  const payload = parseTriggerPayload();
  if (!target?.event_code || !payload) return;
  triggering.value = true;
  try {
    const result = await saveDimensionResultByRulePayload(
      target.event_code,
      payload,
      triggerPreview.value,
      { allowOverwrite: triggerForm.allowOverwrite },
    );
    ElMessage.success(
      result.duplicated ? '维度信息已覆盖生成' : '维度信息已生成',
    );
    triggerVisible.value = false;
  } finally {
    triggering.value = false;
  }
}

async function handleDeleteRule(row?: DimensionRuleConfig) {
  const target = row || currentRow.value;
  const targetRuleId = String(target?.rowid || '').trim();
  if (!targetRuleId) {
    ElMessage.warning('请先选择需要删除的规则');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除规则“${target?.rule_name || target?.rule_code || targetRuleId}”吗？删除后将同时清空命中条件和输出维度。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      },
    );
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel')
      return;
    throw error;
  }

  deleting.value = true;
  try {
    await deleteDimensionRuleBundle(targetRuleId);
    ElMessage.success('规则已删除');
    if (currentRow.value?.rowid === targetRuleId) {
      currentRow.value = null;
      conditions.value = [];
      results.value = [];
      detailVisible.value = false;
    }
    await loadData();
  } finally {
    deleting.value = false;
  }
}

function addCondition() {
  editor.conditions.push({
    rowid: '',
    rule_id: editor.rule.rowid,
    sort_no: editor.conditions.length + 1,
    field_code: 'customer_id',
    operator: 'notnull',
    value_source: 'CONST',
    compare_value: '',
    compare_field: '',
    description: '',
  });
}

async function removeCondition(index: number) {
  const target = editor.conditions[index];
  if (!target) return;

  try {
    await ElMessageBox.confirm('确定删除该命中条件吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    });
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel')
      return;
    throw error;
  }

  const conditionId = String(target.rowid || '').trim();
  if (conditionId) {
    saving.value = true;
    try {
      await deleteDimensionRuleCondition(conditionId);
    } finally {
      saving.value = false;
    }
  }

  editor.conditions.splice(index, 1);
  editor.conditions.forEach((item, idx) => {
    item.sort_no = idx + 1;
  });
  ElMessage.success('命中条件已删除');
}

function openConditionFieldPicker(row: any) {
  openFieldPicker({ row, key: 'field_code' });
}

function openConditionCompareFieldPicker(row: any) {
  openFieldPicker({ row, key: 'compare_field' });
}

function normalizeBoolFlag(value: any, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return (
    ['1', 'true', 'yes'].includes(String(value).trim().toLowerCase()) ||
    value === 1 ||
    value === true
  );
}

function isLeafSubject(subject?: BilSubjectApi.Subject) {
  return normalizeBoolFlag(subject?.is_leaf_subject, true);
}

function getSubjectName(subject?: BilSubjectApi.Subject) {
  return String(subject?.subject_name ?? '').trim();
}

function getSubjectLabel(subject?: BilSubjectApi.Subject) {
  const code = String(subject?.subject_number ?? '').trim();
  const name = getSubjectName(subject);
  return [code, name].filter(Boolean).join(' ').trim() || code;
}

function reloadSubjectOptions() {
  void loadSubjectOptions();
}

function resetFieldPickerSelection() {
  Object.assign(fieldPickerSelection, {
    appCode: '',
    appName: '',
    dbName: '',
    tableName: '',
    tableId: '',
    fieldName: '',
  });
}

function openFieldPicker(target: {
  key:
    | 'amount_expr'
    | 'compare_field'
    | 'currency_expr'
    | 'direction_expr'
    | 'field_code'
    | 'period_expr'
    | 'value_expr';
  row: any;
}) {
  fieldPickerTarget.value = target;
  resetFieldPickerSelection();
  fieldPickerVisible.value = true;
}

function handleRuleFieldAppSelect(app: any) {
  Object.assign(fieldPickerSelection, {
    appCode: String(app?.rowid || ''),
    appName: String(app?.AppName || app?.NameStr || app?.rowid || ''),
    dbName: '',
    tableName: '',
    tableId: '',
    fieldName: '',
  });
}

function handleRuleFieldObjectSelect(row: any) {
  const dbRow = row?.dbRow || {};
  Object.assign(fieldPickerSelection, {
    dbName: String(dbRow?.ValueName || dbRow?.Name || dbRow?.conName || ''),
    tableName: String(row?.tbldesc || row?.tblname || ''),
    tableId: String(row?.id || row?.rowid || row?.tblname || ''),
    fieldName: '',
  });
}

function handleRuleFieldSelect(row: any) {
  fieldPickerSelection.fieldName = String(row?.enname || row?.cnname || '');
}

function confirmRuleFieldPicker() {
  const target = fieldPickerTarget.value;
  if (!target?.row || !target?.key || !fieldPickerSelection.fieldName) {
    ElMessage.warning('请先选择字段');
    return;
  }
  target.row[target.key] =
    target.key === 'amount_expr' && isFormulaAmountType(target.row)
      ? appendFormulaField(
          target.row[target.key],
          fieldPickerSelection.fieldName,
        )
      : fieldPickerSelection.fieldName;
  fieldPickerVisible.value = false;
}

async function loadSubjectOptions() {
  subjectLoading.value = true;
  try {
    const res = await getSubjectList({
      pageNo: 1,
      page: 0,
      subject_state: 1,
      lingma_sys_is_delete: 0,
    } as any);
    const list = Array.isArray(res?.list)
      ? (res.list as BilSubjectApi.Subject[])
      : [];
    subjectOptions.value = list
      .filter((item) => isLeafSubject(item))
      .map((item) => ({
        label: getSubjectLabel(item),
        value: String(item.subject_number ?? '').trim(),
        raw: item,
      }))
      .filter((item) => Boolean(item.value));
  } finally {
    subjectLoading.value = false;
  }
}

function isFinancialSubjectResult(row: DimensionRuleResult) {
  return (
    String(row.dim_category || '') === 'FINANCIAL' &&
    String(row.dim_code || '') === 'SUBJECT'
  );
}

function getValueTypeDisplay(row: DimensionRuleResult) {
  if (
    isFinancialSubjectResult(row) &&
    String(row.value_type || '') === 'CONST'
  ) {
    return getSubjectOptionLabel(row.value_expr);
  }
  return row.value_expr || '-';
}

function getSubjectOptionLabel(code?: string) {
  const normalized = String(code ?? '').trim();
  return (
    subjectOptions.value.find((item) => item.value === normalized)?.label ||
    normalized ||
    '-'
  );
}

function addResult() {
  editor.results.push({
    rowid: '',
    rule_id: editor.rule.rowid,
    sort_no: editor.results.length + 1,
    dim_category: 'BIZ',
    dim_code: 'CUSTOMER',
    value_type: 'FIELD',
    value_expr: 'customer_id',
    amount_type: 'NONE',
    amount_expr: '',
    direction_type: 'CONST',
    direction_expr: 'DEBIT',
    currency_type: 'CONST',
    currency_expr: 'CNY',
    period_type: 'FUNC',
    period_expr: 'formatPeriod(out_time)',
    required_flag: 1,
    description: '',
  });
}

async function removeResult(index: number) {
  const target = editor.results[index];
  if (!target) return;

  try {
    await ElMessageBox.confirm('确定删除该输出维度吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    });
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel')
      return;
    throw error;
  }

  const resultId = String(target.rowid || '').trim();
  if (resultId) {
    saving.value = true;
    try {
      await deleteDimensionRuleResult(resultId);
    } finally {
      saving.value = false;
    }
  }

  editor.results.splice(index, 1);
  editor.results.forEach((item, idx) => {
    item.sort_no = idx + 1;
  });
  ElMessage.success('输出维度已删除');
}

function openResultValueFieldPicker(row: any) {
  openFieldPicker({ row, key: 'value_expr' });
}

function openResultAmountFieldPicker(row: any) {
  openFieldPicker({ row, key: 'amount_expr' });
}

function getAmountExprPlaceholder(row: DimensionRuleResult) {
  if (isFormulaAmountType(row)) {
    return '支持字段名或公式，如 A*B、a+b、a+b-c/2、(a+b)*0.13';
  }
  return '请输入固定金额';
}

function isFormulaAmountType(row: DimensionRuleResult) {
  return ['FIELD', 'FUNC'].includes(String(row.amount_type || ''));
}

function appendFormulaField(expression: any, fieldName: string) {
  const field = String(fieldName || '').trim();
  const expr = String(expression || '').trim();
  if (!expr) return field;
  if (/[-+*/(]$/.test(expr.replaceAll(/\s+/g, ''))) return `${expr} ${field}`;
  return `${expr} + ${field}`;
}

function validateArithmeticFormula(expression: any, label = '金额公式') {
  const expr = String(expression || '').trim();
  if (!expr) return `${label}不能为空`;
  if (/[^\w+\-*/().\s]/.test(expr))
    return `${label}包含非法字符，仅支持字段编码、数字、+、-、*、/ 和括号`;

  let index = 0;
  let balance = 0;
  let expectOperand = true;
  let lastToken = '';
  const tokens: string[] = [];

  while (index < expr.length) {
    const rest = expr.slice(index);
    const blank = rest.match(/^\s+/);
    if (blank) {
      index += blank[0].length;
      continue;
    }

    const identifier = rest.match(/^[A-Z_]\w*/i);
    if (identifier) {
      if (!expectOperand) return `${label}中字段或数字之间缺少运算符`;
      tokens.push(identifier[0]);
      index += identifier[0].length;
      expectOperand = false;
      lastToken = 'operand';
      continue;
    }

    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)/);
    if (number) {
      if (!expectOperand) return `${label}中字段或数字之间缺少运算符`;
      tokens.push(number[0]);
      index += number[0].length;
      expectOperand = false;
      lastToken = 'operand';
      continue;
    }

    const char = rest[0];
    if (char === '(') {
      if (!expectOperand) return `${label}中左括号前缺少运算符`;
      balance += 1;
      tokens.push(char);
      index += 1;
      expectOperand = true;
      lastToken = '(';
      continue;
    }

    if (char === ')') {
      if (expectOperand) return `${label}中右括号前缺少字段或数字`;
      balance -= 1;
      if (balance < 0) return `${label}括号不匹配`;
      tokens.push(char);
      index += 1;
      expectOperand = false;
      lastToken = ')';
      continue;
    }

    if ('+-*/'.includes(char)) {
      if (expectOperand) {
        if (
          (char === '+' || char === '-') &&
          (lastToken === '' || lastToken === '(' || lastToken === 'operator')
        ) {
          tokens.push(char);
          index += 1;
          lastToken = 'operator';
          continue;
        }
        return `${label}中运算符位置不正确`;
      }
      tokens.push(char);
      index += 1;
      expectOperand = true;
      lastToken = 'operator';
      continue;
    }

    return `${label}包含无法识别的字符：${char}`;
  }

  if (balance !== 0) return `${label}括号不匹配`;
  if (expectOperand) return `${label}不能以运算符结尾`;
  if (!tokens.some((token) => /^[A-Z_]\w*$/i.test(token)))
    return `${label}至少需要引用一个字段编码`;
  if (/\/\s*0+(?:\.0+)?\s*(?:[)+\-*/]|$)/.test(expr))
    return `${label}不能除以 0`;
  return '';
}

function validateResultExpressions() {
  for (let index = 0; index < editor.results.length; index += 1) {
    const item = editor.results[index];
    if (!isFormulaAmountType(item)) continue;
    const error = validateArithmeticFormula(
      item.amount_expr,
      `第 ${index + 1} 行金额公式`,
    );
    if (error) return error;
  }
  return '';
}

function getOperatorLabel(value?: string) {
  return getDictLabel(operatorOptions.value, value);
}

function getValueSourceLabel(value?: string) {
  return getDictLabel(valueSourceOptions.value, value);
}

function getValueTypeLabel(value?: string) {
  return getDictLabel(valueTypeOptions.value, value);
}

function getAmountTypeLabel(value?: string) {
  return getDictLabel(amountTypeOptions.value, value);
}

function getOptionalExprTypeLabel(value?: string) {
  return getDictLabel(optionalExprTypeOptions.value, value);
}

function getDimCodeLabelByPage(value?: string) {
  return getDictLabel(dimCodeOptions.value, value);
}

function getDirectionLabelByPage(value?: string) {
  return getDictLabel(directionOptions.value, value);
}

function getCurrencyLabelByPage(value?: string) {
  return getDictLabel(currencyOptions.value, value);
}

function getDimCodeOptions(dimCategory?: string) {
  const normalized = String(dimCategory || '').trim();
  return dimCodeOptions.value.filter(
    (item) => !normalized || item.parentCode === normalized,
  );
}

function handleDimCategoryChange(row: DimensionRuleResult) {
  const options = getDimCodeOptions(row.dim_category);
  if (!options.some((item) => item.value === row.dim_code)) {
    row.dim_code = options[0]?.value || '';
  }
  if (
    (String(row.dim_category || '') !== 'FINANCIAL' ||
      String(row.dim_code || '') !== 'SUBJECT') &&
    String(row.value_type || '') === 'CONST' &&
    !row.value_expr
  ) {
    row.value_expr = '';
  }
}

async function handleSaveEditor() {
  if (!editor.rule.rule_code || !editor.rule.rule_name) {
    ElMessage.warning('请先填写规则编码和规则名称');
    return;
  }
  if (editor.conditions.length === 0) {
    ElMessage.warning('至少保留 1 条命中条件');
    return;
  }
  if (editor.results.length === 0) {
    ElMessage.warning('至少保留 1 条输出维度');
    return;
  }
  const resultExpressionError = validateResultExpressions();
  if (resultExpressionError) {
    ElMessage.warning(resultExpressionError);
    return;
  }
  const invalidSubjectResult = editor.results.find((item) => {
    if (!isFinancialSubjectResult(item)) return false;
    if (String(item.value_type || '') !== 'CONST') return false;
    const subjectNo = String(item.value_expr || '').trim();
    return (
      !subjectNo ||
      !subjectOptions.value.some((option) => option.value === subjectNo)
    );
  });
  if (invalidSubjectResult) {
    ElMessage.warning('财务维度中的会计科目只能选择当前财务已存在的末级科目');
    return;
  }
  saving.value = true;
  try {
    const saved = await saveDimensionRuleBundle(
      {
        rule: { ...editor.rule },
        conditions: editor.conditions.map((item, index) => ({
          ...item,
          sort_no: index + 1,
        })),
        results: editor.results.map((item, index) => ({
          ...item,
          sort_no: index + 1,
        })),
      },
      { forceCreate: editorMode.value === 'create' },
    );
    ElMessage.success(
      editorMode.value === 'create' ? '规则已新增' : '规则已保存',
    );
    editorVisible.value = false;
    await loadData(saved?.rule?.rowid || editor.rule.rowid);
  } finally {
    saving.value = false;
  }
}

watch(filteredData, (value) => {
  if (value.length === 0) {
    currentRow.value = null;
    conditions.value = [];
    results.value = [];
    detailVisible.value = false;
    return;
  }
  if (
    !currentRow.value ||
    !value.some((item) => item.rowid === currentRow.value?.rowid)
  ) {
    void loadRuleDetails(value[0]);
  }
});

onMounted(() => {
  void (async () => {
    await loadDictOptions();
    await Promise.all([
      loadSubjectOptions(),
      loadData('RULE_TEST_SALE_SHIPMENT'),
    ]);
  })();
});
</script>

<template>
  <Page auto-content-height>
    <div class="rule-page">
      <ElCard shadow="never">
        <template #header>
          <div class="rule-page__title-wrap">
            <div>
              <div class="rule-page__title">维度规则中心</div>
              <div class="rule-page__sub-title">
                可维护销售出库、销售退货、收款确认等维度规则配置。
              </div>
            </div>
            <div class="rule-page__toolbar">
              <ElButton type="primary" @click="openCreateEditor">
                新增规则
              </ElButton>
              <ElButton
                type="warning"
                plain
                :loading="syncingTemplates"
                @click="handleSyncTemplates"
              >
                同步模板
              </ElButton>
              <ElButton
                type="success"
                plain
                :loading="triggering"
                @click="openTriggerDialog()"
              >
                手动生成维度
              </ElButton>
              <ElButton
                type="danger"
                plain
                :loading="deleting"
                @click="handleDeleteRule()"
              >
                删除当前规则
              </ElButton>
              <ElInput
                v-model="keyword"
                placeholder="搜索规则编码 / 名称 / 事件编码"
                clearable
                class="rule-page__search"
              />
              <ElSelect v-model="selectedEvent" class="rule-page__select">
                <ElOption label="全部事件" value="ALL" />
                <ElOption
                  v-for="item in eventOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
              <ElSelect v-model="selectedStatus" class="rule-page__select">
                <ElOption label="全部状态" value="ALL" />
                <ElOption label="启用" value="1" />
                <ElOption label="停用" value="0" />
              </ElSelect>
            </div>
          </div>
        </template>

        <ElTable
          v-loading="loading"
          :data="filteredData"
          border
          height="560"
          highlight-current-row
          row-key="rowid"
          @row-click="handleRowClick"
        >
          <ElTableColumn prop="rule_code" label="规则编码" min-width="220" />
          <ElTableColumn prop="rule_name" label="规则名称" min-width="180" />
          <ElTableColumn label="事件编码" min-width="190">
            <template #default="{ row }">
              {{ getEventLabel(row.event_code) }}（{{ row.event_code }}）
            </template>
          </ElTableColumn>
          <ElTableColumn label="业务分类" min-width="130">
            <template #default="{ row }">
              {{ getBizCategoryLabel(row.biz_category) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="priority" label="优先级" width="90" />
          <ElTableColumn label="需凭证" width="100">
            <template #default="{ row }">
              <ElTag
                :type="Number(row.voucher_required) === 1 ? 'success' : 'info'"
              >
                {{ Number(row.voucher_required) === 1 ? '是' : '否' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="100">
            <template #default="{ row }">
              <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <ElButton type="primary" link @click.stop="openDetail(row)">
                查看详情
              </ElButton>
              <ElButton
                type="success"
                link
                @click.stop="openTriggerDialog(row)"
              >
                生成维度
              </ElButton>
              <ElButton type="primary" link @click.stop="openEditor(row)">
                编辑
              </ElButton>
              <ElButton
                type="danger"
                link
                :loading="deleting && currentRow?.rowid === row.rowid"
                @click.stop="handleDeleteRule(row)"
              >
                删除
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>

    <ElDialog
      v-model="detailVisible"
      title="规则详情"
      width="1120px"
      append-to-body
    >
      <template v-if="currentRow">
        <div class="rule-page__detail-header">
          <div class="rule-page__legend">
            <span
              v-for="item in resultCategoryOptions"
              :key="item.value"
              class="rule-page__legend-item"
              >{{ item.label }}（{{ item.value }}）</span
            >
          </div>
        </div>

        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="规则编码">
            {{ currentRow.rule_code }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="规则名称">
            {{ currentRow.rule_name }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="事件编码">
            {{ getEventLabel(currentRow.event_code) }}（{{
              currentRow.event_code
            }}）
          </ElDescriptionsItem>
          <ElDescriptionsItem label="业务分类">
            {{ getBizCategoryLabel(currentRow.biz_category) }}（{{
              currentRow.biz_category
            }}）
          </ElDescriptionsItem>
          <ElDescriptionsItem label="账套">
            {{ currentRow.account_set_id }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="优先级">
            {{ currentRow.priority }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="自动写凭证">
            {{ Number(currentRow.auto_voucher_write) === 1 ? '是' : '否' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="描述" :span="2">
            {{ currentRow.description || '-' }}
          </ElDescriptionsItem>
        </ElDescriptions>

        <ElDivider content-position="left">命中条件</ElDivider>
        <ElTable :data="conditions" border size="small" max-height="220">
          <ElTableColumn prop="sort_no" label="#" width="60" />
          <ElTableColumn prop="field_code" label="字段" min-width="140" />
          <ElTableColumn label="运算符" min-width="110">
            <template #default="{ row }">
              {{ getOperatorLabel(row.operator) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="值来源" min-width="100">
            <template #default="{ row }">
              {{ getValueSourceLabel(row.value_source) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="compare_value" label="比较值" min-width="140" />
          <ElTableColumn
            prop="compare_field"
            label="比较字段"
            min-width="140"
          />
          <ElTableColumn prop="description" label="说明" min-width="140" />
        </ElTable>

        <ElDivider content-position="left">输出维度</ElDivider>
        <ElTable :data="results" border size="small" max-height="320">
          <ElTableColumn prop="sort_no" label="#" width="60" />
          <ElTableColumn label="维度分类" min-width="120">
            <template #default="{ row }">
              {{ getDimCategoryLabel(row.dim_category) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="维度编码" min-width="120">
            <template #default="{ row }">
              {{ getDimCodeLabelByPage(row.dim_code) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="取值方式" min-width="90">
            <template #default="{ row }">
              {{ getValueTypeLabel(row.value_type) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="取值表达式" min-width="180">
            <template #default="{ row }">
              {{ getValueTypeDisplay(row) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="金额方式" min-width="100">
            <template #default="{ row }">
              {{ getAmountTypeLabel(row.amount_type) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="amount_expr"
            label="金额表达式"
            min-width="140"
          />
          <ElTableColumn label="方向方式" min-width="100">
            <template #default="{ row }">
              {{ getOptionalExprTypeLabel(row.direction_type) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="方向表达式" min-width="120">
            <template #default="{ row }">
              {{ getDirectionLabelByPage(row.direction_expr) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="币种方式" min-width="100">
            <template #default="{ row }">
              {{ getOptionalExprTypeLabel(row.currency_type) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="币种表达式" min-width="120">
            <template #default="{ row }">
              {{ getCurrencyLabelByPage(row.currency_expr) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="期间方式" min-width="100">
            <template #default="{ row }">
              {{ getOptionalExprTypeLabel(row.period_type) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="period_expr"
            label="期间表达式"
            min-width="140"
          />
          <ElTableColumn label="必填" width="80">
            <template #default="{ row }">
              {{ Number(row.required_flag) === 1 ? '是' : '否' }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="description" label="说明" min-width="120" />
        </ElTable>
      </template>
      <ElEmpty v-else description="暂无规则" />
      <template #footer>
        <div class="rule-page__dialog-footer">
          <ElButton @click="detailVisible = false">关闭</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog
      v-model="triggerVisible"
      title="手动触发生成维度"
      width="980px"
      append-to-body
      :close-on-click-modal="false"
    >
      <template v-if="currentRow">
        <ElDescriptions :column="2" border class="rule-page__trigger-desc">
          <ElDescriptionsItem label="规则">
            {{ currentRow.rule_name }}（{{ currentRow.rule_code }}）
          </ElDescriptionsItem>
          <ElDescriptionsItem label="事件">
            {{ getEventLabel(currentRow.event_code) }}（{{
              currentRow.event_code
            }}）
          </ElDescriptionsItem>
          <ElDescriptionsItem label="业务分类">
            {{ getBizCategoryLabel(currentRow.biz_category) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="覆盖生成">
            <ElSwitch v-model="triggerForm.allowOverwrite" />
          </ElDescriptionsItem>
        </ElDescriptions>
        <ElForm label-width="110px" class="rule-page__trigger-form">
          <ElFormItem label="业务数据 JSON">
            <ElInput
              v-model="triggerForm.payloadText"
              type="textarea"
              :rows="16"
              placeholder="粘贴业务单据数据 JSON，必须包含 id 或 rowid；账套和租户由系统自动补充"
            />
          </ElFormItem>
        </ElForm>
        <ElDivider content-position="left">预览结果</ElDivider>
        <ElEmpty
          v-if="!triggerPreview"
          description="点击预览后显示规则输出维度"
        />
        <ElTable
          v-else
          :data="triggerPreview.details"
          border
          size="small"
          max-height="260"
        >
          <ElTableColumn prop="dim_category" label="分类" width="120" />
          <ElTableColumn prop="dim_code" label="维度编码" width="140" />
          <ElTableColumn prop="value_code" label="维度值" min-width="180" />
          <ElTableColumn prop="amount" label="金额" width="120" />
          <ElTableColumn prop="direction" label="方向" width="100" />
          <ElTableColumn prop="currency" label="币种" width="100" />
          <ElTableColumn prop="period" label="期间" width="120" />
          <ElTableColumn prop="description" label="说明" min-width="180" />
        </ElTable>
      </template>
      <template #footer>
        <div class="rule-page__dialog-footer">
          <ElButton @click="triggerVisible = false">取消</ElButton>
          <ElButton :loading="triggering" @click="handlePreviewTrigger">
            预览
          </ElButton>
          <ElButton
            type="primary"
            :loading="triggering"
            @click="handleGenerateDimensionByButton"
          >
            生成到维度信息表
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog
      v-model="editorVisible"
      :title="editorTitle"
      width="1100px"
      :close-on-click-modal="false"
    >
      <ElForm label-width="110px">
        <div class="rule-page__editor-grid">
          <ElFormItem label="规则编码">
            <ElInput v-model="editor.rule.rule_code" />
          </ElFormItem>
          <ElFormItem label="规则名称">
            <ElInput v-model="editor.rule.rule_name" />
          </ElFormItem>
          <ElFormItem label="事件编码">
            <ElSelect
              v-model="editor.rule.event_code"
              class="rule-page__full-input"
              filterable
              clearable
              :loading="dictLoading"
              placeholder="请选择事件编码"
            >
              <ElOption
                v-for="item in eventCodeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="业务分类">
            <ElSelect
              v-model="editor.rule.biz_category"
              class="rule-page__full-input"
              filterable
              clearable
              :loading="dictLoading"
              placeholder="请选择业务分类"
            >
              <ElOption
                v-for="item in bizCategoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="账套">
            <ElInput v-model="editor.rule.account_set_id" />
          </ElFormItem>
          <ElFormItem label="优先级">
            <ElInputNumber
              v-model="editor.rule.priority"
              :min="1"
              :step="1"
              class="rule-page__full-input"
            />
          </ElFormItem>
          <ElFormItem label="启用">
            <ElSwitch
              v-model="editor.rule.status"
              :active-value="1"
              :inactive-value="0"
            />
          </ElFormItem>
          <ElFormItem label="需凭证">
            <ElSwitch
              v-model="editor.rule.voucher_required"
              :active-value="1"
              :inactive-value="0"
            />
          </ElFormItem>
          <ElFormItem label="自动写凭证">
            <ElSwitch
              v-model="editor.rule.auto_voucher_write"
              :active-value="1"
              :inactive-value="0"
            />
          </ElFormItem>
          <ElFormItem label="命中后停止">
            <ElSwitch
              v-model="editor.rule.stop_after_match"
              :active-value="1"
              :inactive-value="0"
            />
          </ElFormItem>
          <ElFormItem label="描述" class="rule-page__editor-span-2">
            <ElInput
              v-model="editor.rule.description"
              type="textarea"
              :rows="2"
            />
          </ElFormItem>
        </div>
      </ElForm>

      <ElDivider content-position="left">命中条件</ElDivider>
      <div class="rule-page__editor-actions">
        <ElButton type="primary" plain @click="addCondition">新增条件</ElButton>
      </div>
      <ElTable :data="editor.conditions" border size="small" max-height="260">
        <ElTableColumn label="#" width="60">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </ElTableColumn>
        <ElTableColumn label="字段" min-width="220">
          <template #default="{ row }">
            <div class="rule-page__expr-action">
              <ElInput
                v-model="row.field_code"
                placeholder="可手动输入或点右侧选择"
                clearable
              />
              <ElButton
                type="primary"
                plain
                @click="openConditionFieldPicker(row)"
              >
                选择
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="运算符" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.operator" :loading="dictLoading">
              <ElOption
                v-for="item in operatorOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="值来源" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.value_source" :loading="dictLoading">
              <ElOption
                v-for="item in valueSourceOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="比较值" min-width="160">
          <template #default="{ row }">
            <ElInput
              v-model="row.compare_value"
              :disabled="row.value_source === 'FIELD'"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="比较字段" min-width="220">
          <template #default="{ row }">
            <div class="rule-page__expr-action">
              <ElInput
                v-model="row.compare_field"
                :disabled="row.value_source !== 'FIELD'"
                placeholder="可手动输入或点右侧选择"
                clearable
              />
              <ElButton
                type="primary"
                plain
                :disabled="row.value_source !== 'FIELD'"
                @click="openConditionCompareFieldPicker(row)"
              >
                选择
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="说明" width="160" fixed="right">
          <template #default="{ row }">
            <ElInput v-model="row.description" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ $index }">
            <ElButton type="danger" link @click="removeCondition($index)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <ElDivider content-position="left">输出维度</ElDivider>
      <div class="rule-page__editor-actions">
        <ElButton type="primary" plain @click="addResult">新增输出</ElButton>
      </div>
      <ElTable :data="editor.results" border size="small" max-height="320">
        <ElTableColumn label="#" width="60">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </ElTableColumn>
        <ElTableColumn label="维度分类" min-width="150" fixed="left">
          <template #default="{ row }">
            <ElSelect
              v-model="row.dim_category"
              class="rule-page__full-input"
              filterable
              :loading="dictLoading"
              placeholder="请选择维度分类"
              @change="handleDimCategoryChange(row)"
            >
              <ElOption
                v-for="item in resultCategoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="维度编码" min-width="160" fixed="left">
          <template #default="{ row }">
            <ElSelect
              v-model="row.dim_code"
              class="rule-page__full-input"
              :loading="dictLoading"
            >
              <ElOption
                v-for="item in getDimCodeOptions(row.dim_category)"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="取值方式" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.value_type" :loading="dictLoading">
              <ElOption
                v-for="item in valueTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="取值表达式" min-width="180">
          <template #default="{ row }">
            <VoucherSubjectPicker
              v-if="isFinancialSubjectResult(row) && row.value_type === 'CONST'"
              v-model="row.value_expr"
              :options="subjectOptions"
              :loading="subjectLoading"
              :remote-method="reloadSubjectOptions"
              :popper-z-index="2700"
            />
            <div
              v-else-if="row.value_type === 'FIELD'"
              class="rule-page__expr-action"
            >
              <ElInput
                v-model="row.value_expr"
                placeholder="可手动输入或点右侧选择"
                clearable
              />
              <ElButton
                type="primary"
                plain
                @click="openResultValueFieldPicker(row)"
              >
                选择
              </ElButton>
            </div>
            <ElInput v-else v-model="row.value_expr" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="金额方式" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.amount_type" :loading="dictLoading">
              <ElOption
                v-for="item in amountTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="金额表达式" min-width="220">
          <template #default="{ row }">
            <div v-if="isFormulaAmountType(row)" class="rule-page__expr-action">
              <ElInput
                v-model="row.amount_expr"
                :placeholder="getAmountExprPlaceholder(row)"
                clearable
              />
              <ElButton
                type="primary"
                plain
                @click="openResultAmountFieldPicker(row)"
              >
                选择
              </ElButton>
            </div>
            <ElInput
              v-else
              v-model="row.amount_expr"
              :disabled="row.amount_type === 'NONE'"
              :placeholder="getAmountExprPlaceholder(row)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="方向方式" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.direction_type" :loading="dictLoading">
              <ElOption
                v-for="item in optionalExprTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="方向表达式" min-width="220">
          <template #default="{ row }">
            <div
              v-if="row.direction_type === 'FIELD'"
              class="rule-page__expr-action"
            >
              <ElInput
                v-model="row.direction_expr"
                placeholder="可手动输入或点右侧选择"
                clearable
              />
              <ElButton
                type="primary"
                plain
                @click="openFieldPicker({ row, key: 'direction_expr' })"
              >
                选择
              </ElButton>
            </div>
            <ElSelect
              v-else-if="row.direction_type === 'CONST'"
              v-model="row.direction_expr"
              filterable
              clearable
            >
              <ElOption
                v-for="item in directionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElInput v-else v-model="row.direction_expr" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="币种方式" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.currency_type" :loading="dictLoading">
              <ElOption
                v-for="item in optionalExprTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="币种表达式" min-width="220">
          <template #default="{ row }">
            <div
              v-if="row.currency_type === 'FIELD'"
              class="rule-page__expr-action"
            >
              <ElInput
                v-model="row.currency_expr"
                placeholder="可手动输入或点右侧选择"
                clearable
              />
              <ElButton
                type="primary"
                plain
                @click="openFieldPicker({ row, key: 'currency_expr' })"
              >
                选择
              </ElButton>
            </div>
            <ElSelect
              v-else-if="row.currency_type === 'CONST'"
              v-model="row.currency_expr"
              filterable
              clearable
            >
              <ElOption
                v-for="item in currencyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <ElInput v-else v-model="row.currency_expr" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="期间方式" min-width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.period_type" :loading="dictLoading">
              <ElOption
                v-for="item in optionalExprTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="期间表达式" min-width="220">
          <template #default="{ row }">
            <div
              v-if="row.period_type === 'FIELD'"
              class="rule-page__expr-action"
            >
              <ElInput
                v-model="row.period_expr"
                placeholder="可手动输入或点右侧选择"
                clearable
              />
              <ElButton
                type="primary"
                plain
                @click="openFieldPicker({ row, key: 'period_expr' })"
              >
                选择
              </ElButton>
            </div>
            <ElInput v-else v-model="row.period_expr" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="必填" width="90">
          <template #default="{ row }">
            <ElSwitch
              v-model="row.required_flag"
              :active-value="1"
              :inactive-value="0"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="说明" width="160" fixed="right">
          <template #default="{ row }">
            <ElInput v-model="row.description" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ $index }">
            <ElButton type="danger" link @click="removeResult($index)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <ElDialog
        v-model="fieldPickerVisible"
        title="选择业务字段"
        width="860px"
        append-to-body
      >
        <BusinessObjectSelectorBlock
          title="业务字段选择"
          :app-name="fieldPickerSelection.appName"
          :app-code="fieldPickerSelection.appCode"
          :db-name="fieldPickerSelection.dbName"
          :table-name="fieldPickerSelection.tableName"
          :table-id="fieldPickerSelection.tableId"
          :field-name="fieldPickerSelection.fieldName"
          @select-app="handleRuleFieldAppSelect"
          @select-object="handleRuleFieldObjectSelect"
          @select-field="handleRuleFieldSelect"
        />
        <template #footer>
          <div class="rule-page__dialog-footer">
            <ElButton @click="fieldPickerVisible = false">取消</ElButton>
            <ElButton type="primary" @click="confirmRuleFieldPicker">
              确定
            </ElButton>
          </div>
        </template>
      </ElDialog>

      <template #footer>
        <div class="rule-page__dialog-footer">
          <ElButton @click="editorVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSaveEditor">
            {{ editorMode === 'create' ? '保存并新增' : '保存修改' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.rule-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-page__title-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.rule-page__title {
  font-size: 16px;
  font-weight: 600;
}

.rule-page__sub-title {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.rule-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.rule-page__search {
  width: 320px;
}

.rule-page__select {
  width: 160px;
}

.rule-page__detail-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.rule-page__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rule-page__legend-item {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.rule-page__editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.rule-page__editor-span-2 {
  grid-column: span 2;
}

.rule-page__full-input {
  width: 100%;
}

.rule-page__editor-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.rule-page__dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.rule-page__expr-action {
  display: flex;
  gap: 8px;
}

.rule-page__expr-action :deep(.el-input) {
  flex: 1;
}

.rule-page__trigger-desc {
  margin-bottom: 12px;
}

.rule-page__trigger-form {
  margin-top: 12px;
}
</style>
