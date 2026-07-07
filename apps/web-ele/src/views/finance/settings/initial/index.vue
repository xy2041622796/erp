<script lang="ts" setup>
import type { FinanceAuxValueOption } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import type { SubjectOpeningAuxiliaryValue } from '#/api/erp/finance/settings/initial/auxiliary';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTooltip,
  ElUpload,
} from 'element-plus';

import { getFinanceAuxiliaryValueOptions } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import {
  createSubjectOpening,
  downloadSubjectOpeningImportTemplate,
  exportSubjectOpening,
  getSubjectOpeningExportFileName,
  getSubjectOpeningList,
  importSubjectOpening,
  updateSubjectOpening,
} from '#/api/erp/finance/settings/initial';
import {
  getSubjectOpeningAuxiliaryList,
  saveSubjectOpeningAuxiliaryList,
} from '#/api/erp/finance/settings/initial/auxiliary';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import { getStoredAccountSetId } from '#/utils/accountSet';
import {
  addMoney,
  moneyNumber,
  subMoney,
  sumByMoney,
  toDecimal,
} from '#/utils/finance/decimal-money';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  balanceDirectionLabel,
  calcYearBeginning,
  formatAmount,
  SUBJECT_TYPE_TABS,
} from './data';

defineOptions({ name: 'FinanceSubjectInitial' });

const activeTab = ref<number>(SUBJECT_TYPE_TABS[0]?.value ?? 1);
const loading = ref(false);
const importing = ref(false);
const exporting = ref(false);
const downloadingTemplate = ref(false);
const gridRows = ref<any[]>([]);
const balanceRows = ref<any[]>([]);
const keyword = ref('');
const tableHeight = computed(() => 'calc(100vh - 340px)');
const currentAccountSetId = computed(() =>
  String(getStoredAccountSetId() || '').trim(),
);

const { dataTable, hasPermission } = useDataTablePermission();

const dirtyMap = reactive<Record<string, any>>({});
const savingRowMap = reactive<Record<string, boolean>>({});
const auxiliaryDialogVisible = ref(false);
const auxiliaryLoading = ref(false);
const auxiliarySaving = ref(false);
const auxiliarySubject = ref<any>(null);
const auxiliaryDimensions = ref<string[]>([]);
const auxiliaryOptionsMap = ref<Record<string, FinanceAuxValueOption[]>>({});
const auxiliaryOpeningRows = ref<any[]>([]);

const AUXILIARY_CODE_MAP: Record<string, string> = {
  AUX001: 'CUSTOMER',
  AUX002: 'SUPPLIER',
  AUX003: 'STAFF',
  AUX004: 'DEPT',
  AUX005: 'PROJECT',
  CUSTOMER: 'CUSTOMER',
  DEPARTMENT: 'DEPT',
  DEPT: 'DEPT',
  EMPLOYEE: 'STAFF',
  PROJECT: 'PROJECT',
  STAFF: 'STAFF',
  SUPPLIER: 'SUPPLIER',
  供应商: 'SUPPLIER',
  员工: 'STAFF',
  客户: 'CUSTOMER',
  职员: 'STAFF',
  部门: 'DEPT',
  项目: 'PROJECT',
};

const AUXILIARY_LABEL_MAP: Record<string, string> = {
  CUSTOMER: '客户',
  DEPT: '部门',
  PROJECT: '项目',
  STAFF: '职员',
  SUPPLIER: '供应商',
};

function normalizeAuxiliaryCode(value: unknown) {
  const text = String(value ?? '').trim();
  return (
    AUXILIARY_CODE_MAP[text] || AUXILIARY_CODE_MAP[text.toUpperCase()] || ''
  );
}

function normalizeAuxiliaryCodes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeAuxiliaryCodes(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, any>).flatMap(
      ([key, enabled]) => (enabled ? normalizeAuxiliaryCodes(key) : []),
    );
  }

  const text = String(value ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (parsed !== text) return normalizeAuxiliaryCodes(parsed);
  } catch {
    // Legacy values are commonly comma-separated strings.
  }
  return text
    .split(/[,，;；|/\s]+/)
    .map((item) => normalizeAuxiliaryCode(item))
    .filter(Boolean);
}

function getSubjectAuxiliaryCodes(row: any) {
  return [
    ...new Set(
      [
        row?.auxiliary_accounting,
        row?.auxiliaryAccounting,
        row?.auxiliary_required,
        row?.auxiliaryRequired,
      ].flatMap((value) => normalizeAuxiliaryCodes(value)),
    ),
  ];
}

function hasSubjectAuxiliary(row: any) {
  return getSubjectAuxiliaryCodes(row).length > 0;
}

function auxiliaryDimensionLabel(code: string) {
  return AUXILIARY_LABEL_MAP[code] || code;
}

function parseAuxiliaryValues(raw: unknown) {
  if (Array.isArray(raw)) return raw as SubjectOpeningAuxiliaryValue[];
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function auxiliaryRowKey(values: Record<string, string>) {
  return auxiliaryDimensions.value
    .map(
      (dimCode) =>
        `${normalizeAuxiliaryCode(dimCode)}:${String(
          values[normalizeAuxiliaryCode(dimCode)] ?? values[dimCode] ?? '',
        ).trim()}`,
    )
    .join('|');
}

function readAuxiliaryRowValue(row: any, ...fields: string[]) {
  for (const field of fields) {
    const matchedKey = Object.keys(row || {}).find(
      (key) => key.toLowerCase() === field.toLowerCase(),
    );
    if (matchedKey) return row[matchedKey];
  }
  return undefined;
}

function auxiliaryRowTimestamp(row: any) {
  const raw = readAuxiliaryRowValue(
    row,
    'updatetime',
    'update_time',
    'createtime',
    'create_time',
  );
  const timestamp = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function createExpandedAuxiliaryRows(
  optionsMap: Record<string, FinanceAuxValueOption[]>,
  savedRows: any[],
) {
  const savedRowMap = new Map<string, any>();
  [...savedRows]
    .sort(
      (left, right) =>
        auxiliaryRowTimestamp(right) - auxiliaryRowTimestamp(left),
    )
    .forEach((row) => {
      const key = auxiliaryRowKey(row.values);
      if (!savedRowMap.has(key)) savedRowMap.set(key, row);
    });
  let combinations: Array<Record<string, string>> = [{}];

  for (const dimCode of auxiliaryDimensions.value) {
    const options = [
      ...new Map(
        (optionsMap[dimCode] || [])
          .filter((option) => String(option?.value || '').trim())
          .map((option) => [String(option.value).trim(), option]),
      ).values(),
    ];
    combinations = combinations.flatMap((values) =>
      options.map((option) => ({
        ...values,
        [dimCode]: option.value,
      })),
    );
  }

  const uniqueCombinations = [
    ...new Map(
      combinations.map((values) => [auxiliaryRowKey(values), values]),
    ).values(),
  ];
  const rows = uniqueCombinations.map((values) => {
    const key = auxiliaryRowKey(values);
    const saved = savedRowMap.get(key);
    savedRowMap.delete(key);
    return {
      values,
      beginning_balance: moneyNumber(saved?.beginning_balance),
      debit_balance_sum: moneyNumber(saved?.debit_balance_sum),
      cebit_balance_sum: moneyNumber(saved?.cebit_balance_sum),
    };
  });

  return [...rows, ...savedRowMap.values()];
}

async function openAuxiliaryOpening(row: any) {
  const dimensions = getSubjectAuxiliaryCodes(row);
  if (dimensions.length === 0) return;

  auxiliarySubject.value = row;
  auxiliaryDimensions.value = dimensions;
  auxiliaryDialogVisible.value = true;
  auxiliaryLoading.value = true;
  try {
    const [optionsMap, savedRows] = await Promise.all([
      getFinanceAuxiliaryValueOptions({ dimCodes: dimensions }),
      getSubjectOpeningAuxiliaryList({
        account_set_id: currentAccountSetId.value || undefined,
        subject_code: rowKey(row),
      }),
    ]);
    auxiliaryOptionsMap.value = optionsMap;
    const normalizedSavedRows = savedRows.map((item) => {
      const auxiliaryValues = readAuxiliaryRowValue(
        item,
        'auxiliary_values',
        'auxiliaryValues',
      );
      const values = Object.fromEntries(
        parseAuxiliaryValues(auxiliaryValues)
          .map((value: any) => [
            normalizeAuxiliaryCode(
              value?.dim_code ?? value?.dimCode ?? value?.DIM_CODE,
            ),
            String(
              value?.value_code ?? value?.valueCode ?? value?.VALUE_CODE ?? '',
            ).trim(),
          ])
          .filter(([dimCode, valueCode]) => dimCode && valueCode),
      );
      return {
        ...item,
        values,
        beginning_balance: moneyNumber(
          readAuxiliaryRowValue(item, 'beginning_balance', 'beginningBalance'),
        ),
        debit_balance_sum: moneyNumber(
          readAuxiliaryRowValue(item, 'debit_balance_sum', 'debitBalanceSum'),
        ),
        cebit_balance_sum: moneyNumber(
          readAuxiliaryRowValue(item, 'cebit_balance_sum', 'cebitBalanceSum'),
        ),
      };
    });
    auxiliaryOpeningRows.value = createExpandedAuxiliaryRows(
      optionsMap,
      normalizedSavedRows,
    );
  } catch (error: any) {
    auxiliaryDialogVisible.value = false;
    ElMessage.error(error?.message || '加载辅助核算期初失败');
  } finally {
    auxiliaryLoading.value = false;
  }
}

function buildAuxiliaryValues(row: any) {
  return auxiliaryDimensions.value.map((dimCode) => {
    const valueCode = String(row?.values?.[dimCode] || '').trim();
    const option = (auxiliaryOptionsMap.value[dimCode] || []).find(
      (item) => item.value === valueCode,
    );
    return {
      dim_code: dimCode,
      dim_name: auxiliaryDimensionLabel(dimCode),
      value_code: valueCode,
      value_name:
        String(option?.raw?.value_name || '').trim() ||
        String(option?.label || '').trim() ||
        valueCode,
    };
  });
}

function auxiliaryValueLabel(row: any, dimCode: string) {
  const valueCode = String(row?.values?.[dimCode] || '').trim();
  const option = (auxiliaryOptionsMap.value[dimCode] || []).find(
    (item) => item.value === valueCode,
  );
  return option?.label || valueCode || '-';
}

function auxiliaryYearBeginning(row: any) {
  return calcYearBeginning({
    ...row,
    balance_direction: auxiliarySubject.value?.balance_direction,
  });
}

function hasAuxiliaryOpeningAmount(row: any) {
  return [
    row?.beginning_balance,
    row?.debit_balance_sum,
    row?.cebit_balance_sum,
  ].some((value) => moneyNumber(value) !== 0);
}

async function saveAuxiliaryOpening() {
  const subject = auxiliarySubject.value;
  if (!subject || auxiliarySaving.value) return;

  auxiliarySaving.value = true;
  try {
    const detailRows = auxiliaryOpeningRows.value
      .filter((row) => hasAuxiliaryOpeningAmount(row))
      .map((row) => ({
        auxiliary_values: buildAuxiliaryValues(row),
        beginning_balance: moneyNumber(row?.beginning_balance),
        debit_balance_sum: moneyNumber(row?.debit_balance_sum),
        cebit_balance_sum: moneyNumber(row?.cebit_balance_sum),
      }));
    await saveSubjectOpeningAuxiliaryList({
      account_set_id: currentAccountSetId.value || undefined,
      subject_code: rowKey(subject),
      subject_name: subject?.subject_name,
      rows: detailRows,
    });

    subject.beginning_balance = moneyNumber(
      sumByMoney(detailRows, (row) => row.beginning_balance),
    );
    subject.debit_balance_sum = moneyNumber(
      sumByMoney(detailRows, (row) => row.debit_balance_sum),
    );
    subject.cebit_balance_sum = moneyNumber(
      sumByMoney(detailRows, (row) => row.cebit_balance_sum),
    );
    markDirty(subject);
    syncBalanceRow(subject);
    refreshCurrentDisplayAmounts();
    await handleRowBlur(subject, true);
    auxiliaryDialogVisible.value = false;
    ElMessage.success('辅助核算期初保存成功');
  } catch (error: any) {
    ElMessage.error(error?.message || '保存辅助核算期初失败');
  } finally {
    auxiliarySaving.value = false;
  }
}

function clearDirty() {
  Object.keys(dirtyMap).forEach((k) => delete dirtyMap[k]);
}

function rowKey(row: any) {
  return String(row?.subject_number || row?.subject_code || row?.rowid || '');
}

function buildRowPayload(row: any) {
  return {
    rowid: row?.opening_rowid,
    account_id: row?.account_id,
    account_set_id:
      row?.account_set_id ?? currentAccountSetId.value ?? undefined,
    balance_direction: row?.balance_direction,
    beginning_balance: moneyNumber(row?.beginning_balance),
    cebit_balance_sum: moneyNumber(row?.cebit_balance_sum),
    debit_balance_sum: moneyNumber(row?.debit_balance_sum),
    is_leaf_subject: row?.is_leaf_subject,
    subject_code: row?.subject_number || row?.subject_code,
    subject_name: row?.subject_name,
    subject_type: row?.subject_type,
  };
}

function markDirty(row: any) {
  const key = rowKey(row) || `${Math.random()}`;
  dirtyMap[key] = buildRowPayload(row);
}

function isLeafEditable(row: any) {
  if (Number(row?.is_leaf_subject) !== 1) return false;
  return hasPermission('row:edit', row?.rowid);
}

function buildTree(rows: any[]) {
  const nodeMap = new Map<string, any>();
  const roots: any[] = [];

  rows.forEach((item) => {
    const node = { ...item, children: [] as any[] };
    nodeMap.set(String(node.subject_number), node);
  });

  nodeMap.forEach((node) => {
    const parentNo = String(node.parent_subject_number || '').trim();
    if (!parentNo || parentNo === String(node.subject_number)) {
      roots.push(node);
      return;
    }
    const parent = nodeMap.get(parentNo);
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  return roots;
}

const AMOUNT_FIELDS = [
  'beginning_balance',
  'debit_balance_sum',
  'cebit_balance_sum',
];

function aggregateParentDisplayAmounts(rows: any[]) {
  const walk = (row: any): any => {
    const children = Array.isArray(row?.children) ? row.children : [];
    if (children.length === 0) {
      AMOUNT_FIELDS.forEach((field) => {
        row[`__display_${field}`] = safeNum(row?.[field]);
      });
      row.__display_year_beginning_balance = safeNum(calcYearBeginning(row));
      return row;
    }

    const childRows: any[] = children.map((child: any) => walk(child));
    AMOUNT_FIELDS.forEach((field) => {
      row[`__display_${field}`] = moneyNumber(
        sumByMoney(childRows, (child) => child?.[`__display_${field}`]),
      );
    });
    row.__display_year_beginning_balance = moneyNumber(
      sumByMoney(childRows, (child) => child?.__display_year_beginning_balance),
    );
    return row;
  };

  rows.forEach((row) => walk(row));
  return rows;
}

function displayAmount(row: any, field: string) {
  return safeNum(row?.[`__display_${field}`] ?? row?.[field]);
}

function displayYearBeginning(row: any) {
  return safeNum(
    row?.__display_year_beginning_balance ?? calcYearBeginning(row),
  );
}

function refreshCurrentDisplayAmounts() {
  aggregateParentDisplayAmounts(gridRows.value || []);
}

function syncBalanceRow(row: any) {
  const subjectCode = String(
    row?.subject_number || row?.subject_code || '',
  ).trim();
  if (!subjectCode) return;

  const list = balanceRows.value || [];
  const index = list.findIndex(
    (item) =>
      String(item?.subject_number || item?.subject_code || '').trim() ===
      subjectCode,
  );
  const nextRow = {
    ...(index === -1 ? {} : list[index]),
    ...row,
    subject_number: subjectCode,
    subject_code: subjectCode,
    beginning_balance: safeNum(row?.beginning_balance),
    debit_balance_sum: safeNum(row?.debit_balance_sum),
    cebit_balance_sum: safeNum(row?.cebit_balance_sum),
    is_leaf_subject: Number(row?.is_leaf_subject ?? 1),
  };

  if (index !== -1) {
    balanceRows.value = [
      ...list.slice(0, index),
      nextRow,
      ...list.slice(index + 1),
    ];
  } else if (Number(nextRow?.is_leaf_subject) === 1) {
    balanceRows.value = [...list, nextRow];
  }
}

function handleAmountUpdate(
  row: any,
  field: string,
  value: number | undefined,
) {
  if (!isLeafEditable(row)) return;
  row[field] = safeNum(value);
  markDirty(row);
  syncBalanceRow(row);
  refreshCurrentDisplayAmounts();
}

function inferParentSubjectNumber(subjectCode: string) {
  const code = String(subjectCode || '').trim();
  if (!code) return '';
  if (code.length > 7) return code.slice(0, -2);
  if (code.length > 4) return code.slice(0, 4);
  return '';
}

function mergeSubjectOpening(subjects: any[], openings: any[]) {
  const openingMap = new Map<string, any>();
  const subjectMap = new Map<string, any>();

  openings.forEach((item) => {
    const key = String(item?.subject_code || item?.subject_number || '').trim();
    if (key) openingMap.set(key, item);
  });

  subjects.forEach((item) => {
    const key = String(item?.subject_number || item?.subject_code || '').trim();
    if (key) subjectMap.set(key, item);
  });

  const merged = subjects.map((subject) => {
    const opening = openingMap.get(String(subject.subject_number).trim()) || {};
    return {
      ...subject,
      account_id: opening.account_id ?? subject.account_id,
      account_set_id:
        opening.account_set_id ??
        subject.account_set_id ??
        currentAccountSetId.value ??
        undefined,
      beginning_balance: moneyNumber(opening.beginning_balance),
      cebit_balance_sum: moneyNumber(opening.cebit_balance_sum),
      debit_balance_sum: moneyNumber(opening.debit_balance_sum),
      opening_rowid: opening.rowid,
      rowid: subject.rowid,
      subject_code: subject.subject_number,
    };
  });

  for (const opening of openings || []) {
    const subjectCode = String(
      opening?.subject_code || opening?.subject_number || '',
    ).trim();
    if (!subjectCode || subjectMap.has(subjectCode)) continue;

    merged.push({
      rowid: `opening-only:${subjectCode}`,
      opening_rowid: opening?.rowid,
      subject_number: subjectCode,
      subject_code: subjectCode,
      subject_name: opening?.subject_name || `未建科目(${subjectCode})`,
      subject_type: opening?.subject_type,
      balance_direction: opening?.balance_direction,
      is_leaf_subject: Number(opening?.is_leaf_subject ?? 1),
      parent_subject_number:
        String(opening?.parent_subject_number || '').trim() ||
        inferParentSubjectNumber(subjectCode),
      account_id: opening?.account_id,
      account_set_id:
        opening?.account_set_id ?? currentAccountSetId.value ?? undefined,
      beginning_balance: moneyNumber(opening?.beginning_balance),
      cebit_balance_sum: moneyNumber(opening?.cebit_balance_sum),
      debit_balance_sum: moneyNumber(opening?.debit_balance_sum),
      __openingOnly: true,
    });
  }

  return merged;
}

function mergeTrialOpeningRows(subjects: any[], openings: any[]) {
  const subjectMap = new Map<string, any>();
  subjects.forEach((item) => {
    const key = String(item?.subject_number || item?.subject_code || '').trim();
    if (key) subjectMap.set(key, item);
  });

  return (openings || []).map((opening) => {
    const subjectCode = String(
      opening?.subject_code || opening?.subject_number || '',
    ).trim();
    const subject = subjectMap.get(subjectCode) || {};
    return {
      ...subject,
      ...opening,
      subject_number: subjectCode || subject?.subject_number,
      subject_code: subjectCode || subject?.subject_code,
      subject_name: opening?.subject_name ?? subject?.subject_name,
      subject_type: opening?.subject_type ?? subject?.subject_type,
      balance_direction:
        opening?.balance_direction ?? subject?.balance_direction,
      is_leaf_subject: Number(
        opening?.is_leaf_subject ?? subject?.is_leaf_subject ?? 0,
      ),
      beginning_balance: moneyNumber(opening?.beginning_balance),
      debit_balance_sum: moneyNumber(opening?.debit_balance_sum),
      cebit_balance_sum: moneyNumber(opening?.cebit_balance_sum),
      opening_rowid: opening?.rowid,
    };
  });
}

async function loadList() {
  loading.value = true;
  try {
    const accountSetId = currentAccountSetId.value || undefined;
    const [subjectRes, openingRes] = await Promise.all([
      getSubjectList({
        pageNo: 1,
        page: 0,
        account_id: accountSetId,
        subject_type: String(activeTab.value),
        keyword: keyword.value?.trim() || undefined,
      }),
      getSubjectOpeningList({
        pageNo: 1,
        page: 0,
        account_set_id: accountSetId,
        subject_type: String(activeTab.value),
      }),
    ]);

    dataTable.value = subjectRes.dataTable;
    const subjects = Array.isArray(subjectRes.list) ? subjectRes.list : [];
    const openings = Array.isArray(openingRes.list) ? openingRes.list : [];
    const merged = mergeSubjectOpening(subjects, openings);
    gridRows.value = aggregateParentDisplayAmounts(buildTree(merged));
  } catch (error: any) {
    gridRows.value = [];
    ElMessage.error(error?.message || '加载科目期初失败');
  } finally {
    loading.value = false;
  }
}

function handleTabChange() {
  clearDirty();
  loadList();
}

function handleRefresh() {
  loadList();
}

async function handleSearch() {
  clearDirty();
  await loadList();
}

function isExcelFile(file: File) {
  return /\.(?:xls|xlsx)$/i.test(file?.name || '');
}

function currentExportParams() {
  return {
    account_set_id: currentAccountSetId.value || undefined,
  };
}

async function handleDownloadTemplate() {
  if (downloadingTemplate.value) return;
  downloadingTemplate.value = true;
  try {
    await downloadSubjectOpeningImportTemplate(currentExportParams());
    ElMessage.success('模板下载成功');
  } catch (error: any) {
    ElMessage.error(error?.message || '下载导入模板失败');
  } finally {
    downloadingTemplate.value = false;
  }
}

async function handleImportFile(file: File) {
  if (!file) {
    ElMessage.warning('请选择 Excel 文件');
    return false;
  }
  if (!isExcelFile(file)) {
    ElMessage.warning('仅支持上传 .xls / .xlsx 文件');
    return false;
  }
  if (importing.value) return false;
  importing.value = true;
  try {
    const result = await importSubjectOpening({
      file,
      account_set_id: currentAccountSetId.value || undefined,
    });
    ElMessage.success(
      `导入完成，新增${result?.addedCount || 0}条，更新${
        result?.changedCount || 0
      }条，跳过${result?.skippedCount || 0}条`,
    );
    clearDirty();
    await loadList();
    await loadBalanceRows();
  } catch (error: any) {
    ElMessage.error(
      error?.message || '导入失败，请检查模板、必填字段、重复科目和金额格式',
    );
  } finally {
    importing.value = false;
  }
  return false;
}

function handleUploadChange(file: any) {
  if (file?.raw) handleImportFile(file.raw);
}

async function handleExport() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const blob = await exportSubjectOpening(currentExportParams());
    downloadFileFromBlobPart({
      fileName: getSubjectOpeningExportFileName(),
      source: blob,
    });
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error(error?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

async function findExistingOpeningRow(subjectCode: string) {
  const accountSetId = currentAccountSetId.value || undefined;
  const res: any = await getSubjectOpeningList({
    pageNo: 1,
    page: 0,
    account_set_id: accountSetId,
    subject_type: String(activeTab.value),
    keyword: subjectCode,
  });
  const list = Array.isArray(res?.list) ? res.list : [];
  return (
    list.find(
      (item: any) => String(item?.subject_code || '') === String(subjectCode),
    ) || null
  );
}

async function handleRowBlur(row: any, silent = false) {
  if (!isLeafEditable(row)) return;

  const key = rowKey(row);
  if (!key || !dirtyMap[key] || savingRowMap[key]) return;

  savingRowMap[key] = true;
  try {
    const payload = buildRowPayload(row);
    const existingRow = await findExistingOpeningRow(
      String(payload.subject_code || ''),
    );

    if (existingRow?.rowid) {
      payload.rowid = existingRow.rowid;
      row.opening_rowid = existingRow.rowid;
      await updateSubjectOpening(payload as any);
    } else {
      const res: any = await createSubjectOpening(payload as any);
      const createdId =
        res?.rowid ||
        res?.data?.rowid ||
        res?.data?.Result?.rowid ||
        payload.rowid;
      if (createdId) {
        row.opening_rowid = createdId;
      }
    }

    delete dirtyMap[key];
    if (!silent) ElMessage.success('保存成功');
  } catch (error: any) {
    if (silent) throw error;
    ElMessage.error(error?.message || '保存失败');
  } finally {
    delete savingRowMap[key];
  }
}

const trialVisible = ref(false);
const trial = reactive({
  openingDebit: 0,
  openingCredit: 0,
  occurDebit: 0,
  occurCredit: 0,
  bsAsset: 0,
  bsLiabEquity: 0,
});

function safeNum(v: any) {
  return moneyNumber(v);
}

function sumField(rows: any[], field: string) {
  return moneyNumber(sumByMoney(rows, (r) => r?.[field]));
}

function sumYearBeginningByType(rows: any[], types: Array<number | string>) {
  let total = 0;
  for (const row of rows) {
    const t = String(row?.subject_type ?? row?.subjectType ?? '');
    if (types.map(String).includes(t)) {
      total = moneyNumber(addMoney([total, calcYearBeginning(row)]));
    }
  }
  return total;
}

function calcMax(a: number, b: number) {
  return Math.max(Math.abs(a), Math.abs(b), 1);
}

function pointerOffset(diff: number, a: number, b: number) {
  const max = calcMax(a, b);
  const ratio = Math.max(-1, Math.min(1, toDecimal(diff).div(max).toNumber()));
  return `${moneyNumber(toDecimal(ratio).mul(45))}%`;
}

function balanceText(diff: number) {
  return Math.abs(diff) < 0.01 ? '平衡' : '不平衡';
}

function moneyDiff(left: number, right: number) {
  return moneyNumber(subMoney(left, right));
}

const isTrialUnbalanced = computed(() => Math.abs(totals.value.diff) >= 0.01);

function diffDirectionText(diff: number) {
  if (Math.abs(diff) < 0.01) return '平衡';
  return diff > 0 ? '借方大于贷方' : '贷方大于借方';
}

const totals = computed(() => {
  let debit = 0;
  let credit = 0;
  for (const row of balanceRows.value || []) {
    const amt = calcYearBeginning(row);
    const dir = String(row?.balance_direction ?? '');
    if (dir === '2' || dir === '贷' || dir === 'credit') {
      credit = moneyNumber(addMoney([credit, amt]));
    } else {
      debit = moneyNumber(addMoney([debit, amt]));
    }
  }
  return {
    debit,
    credit,
    diff: moneyDiff(debit, credit),
  };
});

async function fetchBalanceRows() {
  const accountSetId = currentAccountSetId.value || undefined;
  const [subjectRes, openingRes] = await Promise.all([
    getSubjectList({
      pageNo: 1,
      page: 0,
      account_id: accountSetId,
    }),
    getSubjectOpeningList({
      pageNo: 1,
      page: 0,
      account_set_id: accountSetId,
      lingma_sys_is_delete: 0,
    }),
  ]);

  const subjects = Array.isArray(subjectRes?.list) ? subjectRes.list : [];
  const openings = Array.isArray(openingRes?.list) ? openingRes.list : [];
  const mergedRows = mergeTrialOpeningRows(subjects, openings);
  return mergedRows.filter((row) => Number(row?.is_leaf_subject) === 1);
}

async function loadBalanceRows() {
  balanceRows.value = await fetchBalanceRows();
}

async function handleTrialBalance() {
  try {
    if ((balanceRows.value || []).length === 0) {
      await loadBalanceRows();
    }
    const trialRows = balanceRows.value || [];

    trial.openingDebit = 0;
    trial.openingCredit = 0;
    for (const row of trialRows) {
      const amt = safeNum(calcYearBeginning(row));
      const dir = String(row?.balance_direction ?? '');
      if (dir === '2' || dir === '贷' || dir === 'credit')
        trial.openingCredit = moneyNumber(addMoney([trial.openingCredit, amt]));
      else
        trial.openingDebit = moneyNumber(addMoney([trial.openingDebit, amt]));
    }

    trial.occurDebit = sumField(trialRows, 'debit_balance_sum');
    trial.occurCredit = sumField(trialRows, 'cebit_balance_sum');
    trial.bsAsset = sumYearBeginningByType(trialRows, [1]);
    trial.bsLiabEquity = sumYearBeginningByType(trialRows, [2, 3]);

    trialVisible.value = true;

    const diff = moneyDiff(trial.openingDebit, trial.openingCredit);
    if (Math.abs(diff) < 0.01) ElMessage.success('试算平衡');
    else ElMessage.warning(`期初试算不平，差额=${diff.toFixed(2)}`);
  } catch (error: any) {
    ElMessage.error(error?.message || '试算失败');
  }
}

onMounted(() => {
  loadList();
  loadBalanceRows();
});
</script>

<template>
  <Page auto-content-height>
    <div class="subject-initial-page">
      <div class="subject-initial-toolbar">
        <div class="subject-initial-toolbar__left">
          <ElTabs v-model="activeTab" @tab-change="handleTabChange">
            <ElTabPane
              v-for="item in SUBJECT_TYPE_TABS"
              :key="item.value"
              :label="item.label"
              :name="item.value"
            />
          </ElTabs>
        </div>
        <div class="subject-initial-toolbar__right">
          <ElInput
            v-model="keyword"
            clearable
            placeholder="请输入科目编码/科目名称"
            class="subject-initial-search"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <ElButton @click="handleSearch">查询</ElButton>
          <ElButton
            :loading="downloadingTemplate"
            @click="handleDownloadTemplate"
          >
            下载模板
          </ElButton>
          <ElUpload
            accept=".xls,.xlsx"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleUploadChange"
          >
            <ElButton :loading="importing">导入</ElButton>
          </ElUpload>
          <ElButton :loading="exporting" @click="handleExport"> 导出 </ElButton>
          <ElButton @click="handleRefresh">刷新</ElButton>
          <ElButton type="primary" @click="handleTrialBalance">
            试算平衡
          </ElButton>
        </div>
      </div>

      <div class="subject-initial-card">
        <div class="subject-initial-card__title">科目设置</div>
        <ElTable
          v-loading="loading"
          :data="gridRows"
          :height="tableHeight"
          row-key="subject_number"
          border
          default-expand-all
          class="subject-initial-table"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        >
          <ElTableColumn
            prop="subject_number"
            label="科目编码"
            min-width="160"
          />
          <ElTableColumn label="科目名称" min-width="240">
            <template #default="{ row }">
              <div class="flex items-center gap-1">
                <span>{{ row.subject_name }}</span>
                <ElTooltip
                  v-if="
                    Number(row?.is_leaf_subject) === 1 &&
                    hasSubjectAuxiliary(row)
                  "
                  content="辅助核算期初"
                  placement="top"
                >
                  <ElButton
                    link
                    type="primary"
                    :disabled="!isLeafEditable(row)"
                    class="subject-auxiliary-add"
                    @click="openAuxiliaryOpening(row)"
                  >
                    +
                  </ElButton>
                </ElTooltip>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="方向" width="90" align="center">
            <template #default="{ row }">
              {{ balanceDirectionLabel(row.balance_direction) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="期初余额" min-width="160">
            <template #default="{ row }">
              <ElInputNumber
                :model-value="displayAmount(row, 'beginning_balance')"
                @update:model-value="
                  (value) => handleAmountUpdate(row, 'beginning_balance', value)
                "
                :disabled="!isLeafEditable(row) || hasSubjectAuxiliary(row)"
                :controls="false"
                :precision="2"
                class="w-full"
                @blur="handleRowBlur(row)"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="借方累计" min-width="160">
            <template #default="{ row }">
              <ElInputNumber
                :model-value="displayAmount(row, 'debit_balance_sum')"
                @update:model-value="
                  (value) => handleAmountUpdate(row, 'debit_balance_sum', value)
                "
                :disabled="!isLeafEditable(row) || hasSubjectAuxiliary(row)"
                :controls="false"
                :precision="2"
                class="w-full"
                @blur="handleRowBlur(row)"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="贷方累计" min-width="160">
            <template #default="{ row }">
              <ElInputNumber
                :model-value="displayAmount(row, 'cebit_balance_sum')"
                @update:model-value="
                  (value) => handleAmountUpdate(row, 'cebit_balance_sum', value)
                "
                :disabled="!isLeafEditable(row) || hasSubjectAuxiliary(row)"
                :controls="false"
                :precision="2"
                class="w-full"
                @blur="handleRowBlur(row)"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="年初余额" min-width="140" align="right">
            <template #default="{ row }">
              {{ formatAmount(displayYearBeginning(row)) }}
            </template>
          </ElTableColumn>
        </ElTable>

        <div v-if="isTrialUnbalanced" class="subject-initial-diff-row">
          <div class="subject-initial-diff-row__label">差异</div>
          <div class="subject-initial-diff-row__item">
            借方合计：{{ formatAmount(totals.debit) }}
          </div>
          <div class="subject-initial-diff-row__item">
            贷方合计：{{ formatAmount(totals.credit) }}
          </div>
          <div class="subject-initial-diff-row__amount">
            {{ formatAmount(totals.diff) }}
          </div>
          <div class="subject-initial-diff-row__tip">
            {{ diffDirectionText(totals.diff) }}，请补录或调整科目期初
          </div>
        </div>
      </div>

      <div
        class="mt-3 flex justify-end pr-2 text-sm"
        :class="isTrialUnbalanced ? 'text-red-600' : 'text-gray-600'"
      >
        借方合计：{{ formatAmount(totals.debit) }} | 贷方合计：{{
          formatAmount(totals.credit)
        }}
        | 差额：{{ formatAmount(totals.diff) }}
      </div>
    </div>

    <ElDialog
      v-model="auxiliaryDialogVisible"
      title="辅助核算"
      width="min(88rem, 96vw)"
      destroy-on-close
    >
      <div v-loading="auxiliaryLoading">
        <div class="mb-3 text-sm text-gray-500">
          {{ auxiliarySubject?.subject_number || '' }}
          {{ auxiliarySubject?.subject_name || '' }}
        </div>
        <ElTable
          :data="auxiliaryOpeningRows"
          border
          max-height="55vh"
          empty-text="暂无辅助核算项目"
        >
          <ElTableColumn
            v-for="dimCode in auxiliaryDimensions"
            :key="dimCode"
            :label="auxiliaryDimensionLabel(dimCode)"
            min-width="190"
          >
            <template #default="{ row }">
              {{ auxiliaryValueLabel(row, dimCode) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="期初余额" min-width="150">
            <template #default="{ row }">
              <ElInputNumber
                v-model="row.beginning_balance"
                :controls="false"
                :precision="2"
                class="w-full"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="借方累计" min-width="150">
            <template #default="{ row }">
              <ElInputNumber
                v-model="row.debit_balance_sum"
                :controls="false"
                :precision="2"
                class="w-full"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="贷方累计" min-width="150">
            <template #default="{ row }">
              <ElInputNumber
                v-model="row.cebit_balance_sum"
                :controls="false"
                :precision="2"
                class="w-full"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="年初余额" min-width="140" align="right">
            <template #default="{ row }">
              {{ formatAmount(auxiliaryYearBeginning(row)) }}
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
      <template #footer>
        <ElButton @click="auxiliaryDialogVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="auxiliarySaving"
          :disabled="auxiliaryLoading"
          @click="saveAuxiliaryOpening"
        >
          保存
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="trialVisible"
      title="期初试算结果"
      width="min(57.5rem, 92vw)"
    >
      <div class="trial-grid">
        <div class="trial-card">
          <div class="trial-card__title">
            <span>期初余额</span>
            <ElTag
              size="small"
              :type="
                balanceText(
                  moneyDiff(trial.openingDebit, trial.openingCredit),
                ) === '平衡'
                  ? 'success'
                  : 'danger'
              "
            >
              {{
                balanceText(moneyDiff(trial.openingDebit, trial.openingCredit))
              }}
            </ElTag>
          </div>
          <div class="trial-card__nums">
            <div class="num">
              <div class="badge">借</div>
              <div class="val">{{ formatAmount(trial.openingDebit) }}</div>
            </div>
            <div class="num">
              <div class="badge">贷</div>
              <div class="val">{{ formatAmount(trial.openingCredit) }}</div>
            </div>
          </div>
          <div class="meter">
            <div class="meter__track"></div>
            <div class="meter__center"></div>
            <div
              class="meter__pointer"
              :style="{
                left: `calc(50% + ${pointerOffset(moneyDiff(trial.openingDebit, trial.openingCredit), trial.openingDebit, trial.openingCredit)})`,
              }"
            ></div>
          </div>
          <div class="trial-card__foot">
            差额：{{
              formatAmount(moneyDiff(trial.openingDebit, trial.openingCredit))
            }}
          </div>
        </div>

        <div class="trial-card">
          <div class="trial-card__title">
            <span>累计发生</span>
            <ElTag
              size="small"
              :type="
                balanceText(moneyDiff(trial.occurDebit, trial.occurCredit)) ===
                '平衡'
                  ? 'success'
                  : 'warning'
              "
            >
              {{ balanceText(moneyDiff(trial.occurDebit, trial.occurCredit)) }}
            </ElTag>
          </div>
          <div class="trial-card__nums">
            <div class="num">
              <div class="badge">借</div>
              <div class="val">{{ formatAmount(trial.occurDebit) }}</div>
            </div>
            <div class="num">
              <div class="badge">贷</div>
              <div class="val">{{ formatAmount(trial.occurCredit) }}</div>
            </div>
          </div>
          <div class="meter">
            <div class="meter__track"></div>
            <div class="meter__center"></div>
            <div
              class="meter__pointer"
              :style="{
                left: `calc(50% + ${pointerOffset(moneyDiff(trial.occurDebit, trial.occurCredit), trial.occurDebit, trial.occurCredit)})`,
              }"
            ></div>
          </div>
          <div class="trial-card__foot">
            差额：{{
              formatAmount(moneyDiff(trial.occurDebit, trial.occurCredit))
            }}
          </div>
        </div>

        <div class="trial-card">
          <div class="trial-card__title">
            <span>
              资产负债表期初
              <ElTooltip
                content="资产=资产类期初合计；负债+权益=负债+权益类期初合计"
                placement="top"
              >
                <span class="help">?</span>
              </ElTooltip>
            </span>
            <ElTag
              size="small"
              :type="
                balanceText(moneyDiff(trial.bsAsset, trial.bsLiabEquity)) ===
                '平衡'
                  ? 'success'
                  : 'danger'
              "
            >
              {{ balanceText(moneyDiff(trial.bsAsset, trial.bsLiabEquity)) }}
            </ElTag>
          </div>
          <div class="trial-card__nums">
            <div class="num">
              <div class="badge">资产</div>
              <div class="val">{{ formatAmount(trial.bsAsset) }}</div>
            </div>
            <div class="num">
              <div class="badge">负债+权益</div>
              <div class="val">{{ formatAmount(trial.bsLiabEquity) }}</div>
            </div>
          </div>
          <div class="meter">
            <div class="meter__track"></div>
            <div class="meter__center"></div>
            <div
              class="meter__pointer"
              :style="{
                left: `calc(50% + ${pointerOffset(moneyDiff(trial.bsAsset, trial.bsLiabEquity), trial.bsAsset, trial.bsLiabEquity)})`,
              }"
            ></div>
          </div>
          <div class="trial-card__foot">
            差额：{{
              formatAmount(moneyDiff(trial.bsAsset, trial.bsLiabEquity))
            }}
          </div>
        </div>
      </div>
    </ElDialog>
  </Page>
</template>

<style scoped>
.subject-initial-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subject-initial-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.subject-initial-toolbar__left {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.subject-initial-toolbar__right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.subject-initial-search {
  width: 260px;
}

.subject-initial-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.subject-initial-card__title {
  padding: 14px 16px;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}

.subject-auxiliary-add {
  min-height: 20px;
  padding: 0 3px;
  font-size: 20px;
  line-height: 20px;
}

.subject-initial-table {
  width: 100%;
}

.subject-initial-diff-row {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr) minmax(180px, 1.2fr) minmax(180px, 1.2fr)
    minmax(140px, 1fr) minmax(220px, 1.4fr);
  gap: 0;
  align-items: center;
  min-height: 42px;
  color: #dc2626;
  background: #fff7f7;
  border-top: 1px solid #f3b8b8;
}

.subject-initial-diff-row > div {
  height: 100%;
  padding: 10px 12px;
  border-right: 1px solid var(--el-border-color-light);
}

.subject-initial-diff-row > div:last-child {
  border-right: 0;
}

.subject-initial-diff-row__label {
  font-weight: 700;
}

.subject-initial-diff-row__amount {
  font-weight: 700;
  text-align: right;
}

.subject-initial-diff-row__tip {
  color: #b91c1c;
}

@media (max-width: 980px) {
  .subject-initial-diff-row {
    grid-template-columns: 1fr;
  }

  .subject-initial-diff-row > div {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}

:deep(.subject-initial-table .el-input-number .el-input__wrapper) {
  box-shadow: none;
}

:deep(.subject-initial-table .el-input__inner) {
  text-align: right;
}

:deep(.subject-initial-table .el-table__cell) {
  vertical-align: middle;
}

:root {
  --corp-blue: #1677ff;
  --corp-blue-2: rgb(22 119 255 / 20%);
  --corp-blue-3: rgb(22 119 255 / 35%);
  --corp-blue-4: rgb(22 119 255 / 55%);
}

.trial-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 980px) {
  .trial-grid {
    grid-template-columns: 1fr;
  }

  .subject-initial-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .subject-initial-toolbar__right {
    justify-content: flex-end;
  }

  .subject-initial-search {
    width: 100%;
  }
}

.trial-card {
  padding: 12px 12px 10px;
  background: #fff;
  border: 1px solid rgb(0 0 0 / 6%);
  border-radius: 12px;
}

.trial-card__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 6px;
  font-size: 12px;
  color: var(--corp-blue);
  cursor: help;
  border: 1px solid var(--corp-blue-3);
  border-radius: 50%;
}

.trial-card__nums {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  margin-top: 14px;
}

.num {
  flex: 1;
  padding: 10px;
  background: rgb(0 0 0 / 3%);
  border-radius: 10px;
}

.num .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--corp-blue);
  background: var(--corp-blue-2);
  border: 1px solid rgb(22 119 255 / 18%);
  border-radius: 999px;
}

.num .val {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 700;
}

.meter {
  position: relative;
  height: 26px;
  margin-top: 14px;
}

.meter__track {
  position: absolute;
  top: 12px;
  right: 0;
  left: 0;
  height: 6px;
  background: linear-gradient(
    90deg,
    rgb(22 119 255 / 12%),
    rgb(22 119 255 / 22%),
    rgb(22 119 255 / 12%)
  );
  border-radius: 999px;
}

.meter__center {
  position: absolute;
  top: 6px;
  left: 50%;
  width: 2px;
  height: 16px;
  background: var(--corp-blue-4);
  border-radius: 2px;
  transform: translateX(-50%);
}

.meter__pointer {
  position: absolute;
  top: 4px;
  width: 18px;
  height: 18px;
  background: var(--corp-blue);
  border: 3px solid rgb(255 255 255 / 90%);
  border-radius: 50%;
  box-shadow: 0 6px 16px rgb(22 119 255 / 28%);
  transform: translateX(-50%);
}

.trial-card__foot {
  margin-top: 10px;
  font-size: 12px;
  color: rgb(0 0 0 / 60%);
}
</style>
