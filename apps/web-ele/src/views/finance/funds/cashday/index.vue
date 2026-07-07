<script lang="ts" setup>
import { computed, h, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import ExcelJS from 'exceljs';

import { addMoney, moneyNumber, moneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';

import { Page, useVbenModal } from '@vben/common-ui';
import { getClosedPeriodStatusByDate } from '#/api/erp/finance/period-status';
import { useAccountSetStore } from '#/store/account-set';


import {
  deleteCashdayRow,
  deleteCashdayRows,
  fetchCashAccounts,
  fetchCashdayList,
  fetchCounterparties,
  fetchIoTypes,
  linkCashdayVoucher,
  unlinkCashdayVoucher,
  saveCashdayRow,
  saveCashdayRows,
  type CashAccount,
  type CashdayItem,
  type Counterparty,
  type IoType,
} from '#/api/erp/finance/funds/cashday';

import {
  createVoucher,
  getNextVoucherCodeByDate,
  getVoucherDetails,
  getVoucherMain,
  getVoucherPage,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';
import { buildCashdayPrintHtml } from '#/views/finance/print-templates/cashday';
import { buildFundsEvidencePrintHtml } from '#/views/finance/print-templates/evidence';
import { getFinanceAuxiliaryValueOptions, type FinanceAuxValueOption } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import { saveFundsAccount } from '#/api/erp/finance/funds/settings';
import InexpCateForm from '#/views/finance/funds/inexpcate/modules/form.vue';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElInputNumber,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceFundsCashday' });
const router = useRouter();
const accountSetStore = useAccountSetStore();

const [InexpCateFormModal, inexpCateFormModalApi] = useVbenModal({
  connectedComponent: InexpCateForm,
  destroyOnClose: true,
});

type DataRow = {
  __type: 'data';
  __tmpKey?: string;
  /** 手动插入行的前端插入排序值：用于保存回填后仍保持在插入位置，不被日记账编号重新归位 */
  __manualInsertSort?: number;
  /** 插入位置前一行锚点，落库到 description */
  insertPrevKey?: string;
  /** 插入位置后一行锚点，落库到 description */
  insertNextKey?: string;
} & CashdayItem;

type UiRow =
  | {
    __type: 'init' | 'sum';
    date: string;
    summary: string;
    ioType?: string;
    ioTypeName?: string;
    counterparty?: string;
    counterpartyName?: string;
    income: number;
    expense: number;
    balance: number;
    sortOrder?: number;
    voucherNo?: string;
    journalNo?: string;
    projectId?: string;
    projectName?: string;
    deptId?: string;
    deptName?: string;
    settlementMethod?: string;
    billNo?: string;
    remark?: string;
    transactionNo?: string;
  }
  | DataRow;

type VoucherMainLite = {
  rowid?: string;
  voucher_date?: string | Date;
  voucher_code?: string;
  description?: string;
  operator?: string;
  reviewer?: string;
  debit_amount?: number;
  credit_amount?: number;
};

type VoucherRowType = 'main' | 'detail';

type VoucherRow = {
  rowType?: VoucherRowType;
  parentId?: string;
  detailId?: string;
  id: string;
  date: string;
  voucherNo: string;
  summary: string;
  debitTotal: number;
  creditTotal: number;
  maker: string;
  reviewer: string;
  details?: any[];
  loadingDetails?: boolean;
};

const loading = ref(false);
const printLoading = ref(false);
const evidencePrintLoading = ref(false);
const genVoucherLoading = ref(false);
const initBalanceSaving = ref(false);
const journalCarryForwarded = ref(false);
const journalCarryForwardReason = ref('');
const printFrameRef = ref<HTMLIFrameElement>();
const importFileRef = ref<HTMLInputElement>();
const addAccountDialogVisible = ref(false);
const addAccountSaving = ref(false);
const addAccountForm = reactive({
  account_name: '',
  bank_name: '',
  bank_account_no: '',
  initial_amount: 0,
  remark: '',
});

const query = reactive({
  accountId: '' as string,
  dateRange: [] as string[],
  showAll: false,
});

const accounts = ref<CashAccount[]>([]);
const ioTypes = ref<IoType[]>([]);
const counterparties = ref<Counterparty[]>([]);
const projectOptions = ref<FinanceAuxValueOption[]>([]);
const deptOptions = ref<FinanceAuxValueOption[]>([]);

const SUBJECT_SEGMENT_RULE = [4, 3, 2, 2] as const;

function getAccountSubjectCode(account: any) {
  return String(account?.subjectCode || account?.subject_code || account?.code || '').trim();
}

function getSubjectLevelByCode(code: string) {
  const length = String(code || '').trim().length;
  let total = 0;
  for (let index = 0; index < SUBJECT_SEGMENT_RULE.length; index += 1) {
    total += SUBJECT_SEGMENT_RULE[index]!;
    if (length === total) return index + 1;
  }
  return 1;
}

function getAccountOptionIndent(account: any) {
  const level = getSubjectLevelByCode(getAccountSubjectCode(account));
  return Math.max(0, level - 1) * 16;
}

function getAccountRootName(account: any) {
  const kind = String(account?.accountKind || account?.account_kind || '').trim();
  if (kind) return kind;
  const subjectName = String(account?.subjectName || account?.subject_name || '').trim();
  const code = getAccountSubjectCode(account);
  if (code.startsWith('1001')) return subjectName || '库存现金';
  return subjectName || '';
}

function getAccountOptionName(account: any) {
  return String(account?.name || account?.account_name || '').trim();
}

function getAccountOptionLabel(account: any) {
  return getAccountOptionName(account) || getAccountRootName(account);
}

function compareAccountOption(a: any, b: any) {
  const ac = getAccountSubjectCode(a);
  const bc = getAccountSubjectCode(b);
  if (ac || bc) {
    const result = ac.localeCompare(bc, 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
    if (result !== 0) return result;
  }
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
}


const accountOptions = computed<CashAccount[]>(() => {
  return [...(accounts.value || [])].sort(compareAccountOption);
});

function isAccountParentOption(account: any) {
  const code = getAccountSubjectCode(account);
  if (!code) return false;
  return accountOptions.value.some((item: any) => {
    const itemCode = getAccountSubjectCode(item);
    return itemCode.length > code.length && itemCode.startsWith(code);
  });
}

const selectionSelectable = (row: UiRow) => row.__type === 'data';
const todoFeatureTip = '该功能待后端接口支持，暂不可用';

const currentAccountSetId = computed(() => String(accountSetStore.currentId || '').trim());
const currentAccountSetName = computed(() => String(accountSetStore.currentName || accountSetStore.displayName || '').trim());

const accountDisplayName = computed(() => {
  const account = (accounts.value || []).find(
    (item: any) => String(item?.id || item?.rowid || '') === String(query.accountId || ''),
  ) as any;
  if (!account) return '未选择现金账户';
  return getAccountOptionLabel(account) || '未选择现金账户';
});

async function reloadAccountsAndJournal() {
  await reload();
}

function selectAllAccounts() {
  query.accountId = '';
  rows.value = [];
  openingBalance.value = 0;
  openingBalanceReadonly.value = false;
  selected.value = [];
  exitEdit();
}

function resetAddAccountForm() {
  addAccountForm.account_name = '';
  addAccountForm.bank_name = '';
  addAccountForm.bank_account_no = '';
  addAccountForm.initial_amount = 0;
  addAccountForm.remark = '';
}

function onAddAccount() {
  resetAddAccountForm();
  addAccountDialogVisible.value = true;
}

async function saveAddAccount() {

  if (!String(addAccountForm.account_name || '').trim()) {
    ElMessage.warning('请填写账户名称');
    return;
  }
  addAccountSaving.value = true;
  try {
    const initialAmount = moneyNumber(addAccountForm.initial_amount || 0);
    const saved = await saveFundsAccount({
      account_kind: '现金',
      account_name: String(addAccountForm.account_name || '').trim(),
      bank_name: '',
      bank_account_no: '',
      currency_code: 'CNY',
      currency_name: '人民币',
      enable_status: 1,
      union_bind_status: 0,
      pre_open_flag: 0,
      initial_amount: initialAmount,
      account_balance: initialAmount,
      remark: String(addAccountForm.remark || '').trim(),
    } as any);
    ElMessage.success('新增账户成功');
    addAccountDialogVisible.value = false;
    accounts.value = await fetchCashAccounts({ showDisabled: showDisabledAccounts.value });
    const newId = String((saved as any)?.id || '').trim();
    if (newId) query.accountId = newId;
    await reload();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '新增账户失败');
  } finally {
    addAccountSaving.value = false;
  }
}

const printPeriod = computed(() => {
  const start = query.dateRange?.[0] || '';
  const end = query.dateRange?.[1] || '';
  return start && end ? start + ' 至 ' + end : start || end || '全部期间';
});

const openingBalance = ref(0);
const openingBalanceReadonly = ref(false);
const rows = ref<DataRow[]>([]);
const selected = ref<DataRow[]>([]);
const showDisabledAccounts = ref(false);
const linkedVoucherMonthMap = ref<Record<string, string>>({});

const initRow = computed<UiRow>(() => ({
  __type: 'init',
  date: '',
  summary: openingBalanceReadonly.value ? '期初余额' : '初始化余额',
  income: 0,
  expense: 0,
  balance: Number(openingBalance.value || 0),
}));

const sumRow = computed<UiRow>(() => {
  const inc = moneyNumber(sumByMoney(rows.value, (r) => r.income));
  const exp = moneyNumber(sumByMoney(rows.value, (r) => r.expense));
  return {
    __type: 'sum',
    date: '',
    summary: '合计',
    income: inc,
    expense: exp,
    balance: moneyNumber(subMoney(addMoney([openingBalance.value, inc], 'round', 6), exp)),
  };
});

const journalPageNo = ref(1);
const journalPageSize = ref(20);

const journalDisplayTotal = computed(() => rows.value.length + 1);

const journalMaxPage = computed(() => {
  const total = journalDisplayTotal.value;
  const pageSize = Math.max(1, Number(journalPageSize.value || 20));
  return Math.max(1, Math.ceil(total / pageSize));
});

const isJournalFirstPage = computed(() => journalPageNo.value <= 1);
const isJournalLastPage = computed(() => journalPageNo.value >= journalMaxPage.value);

const pagedDataRows = computed<DataRow[]>(() => {
  const pageSize = Math.max(1, Number(journalPageSize.value || 20));
  const maxPage = journalMaxPage.value;
  if (journalPageNo.value > maxPage) journalPageNo.value = maxPage;
  if (journalPageNo.value < 1) journalPageNo.value = 1;

  // 期初余额只占第一页的一个展示行；第一页数据满后，剩余日记账数据自动进入第二页及后续页。
  if (isJournalFirstPage.value) {
    return rows.value.slice(0, Math.max(0, pageSize - 1));
  }

  const start = Math.max(0, pageSize - 1 + (journalPageNo.value - 2) * pageSize);
  return rows.value.slice(start, start + pageSize);
});

const tableRows = computed<UiRow[]>(() => {
  const list: UiRow[] = isJournalFirstPage.value ? [initRow.value, ...pagedDataRows.value] : [...pagedDataRows.value];
  if (isJournalLastPage.value) list.push(sumRow.value);
  return list;
});

function onJournalPageChange(pageNo: number) {
  journalPageNo.value = pageNo;
}

function onJournalPageSizeChange(pageSize: number) {
  journalPageSize.value = pageSize;
  journalPageNo.value = 1;
}

const editingRowKey = ref('');
function ensureTmpKey(r: any) {
  if (!r.__tmpKey) r.__tmpKey = 'tmp_' + Math.random().toString(36).slice(2);
  return String(r.__tmpKey);
}
function rowKey(r: any) {
  return String(r?.id || r?.__tmpKey || '');
}
function tableRowKey(r: any) {
  if (r?.__type === 'data') return rowKey(r) || ensureTmpKey(r);
  return String(r?.__type || 'summary');
}
function isEditing(r: UiRow) {
  return (r as any).__type === 'data' && rowKey(r) && editingRowKey.value === rowKey(r);
}
function enterEdit(r: UiRow) {
  if ((r as any).__type !== 'data') return;
  const k = rowKey(r) || ensureTmpKey(r);
  editingRowKey.value = String(k);
}
function exitEdit() {
  editingRowKey.value = '';
}

function getJournalPageNoByDataRow(row: DataRow) {
  const index = rows.value.indexOf(row);
  if (index < 0) return journalPageNo.value;
  const pageSize = Math.max(1, Number(journalPageSize.value || 20));
  // 第 1 页第 1 行为期初/初始化行，因此明细行的展示序号需要后移一位。
  return Math.max(1, Math.ceil((index + 2) / pageSize));
}

function moveJournalPageToDataRow(row: DataRow) {
  journalPageNo.value = Math.min(journalMaxPage.value, getJournalPageNoByDataRow(row));
}

async function focusEditingRowFirstEditor() {
  await nextTick();
  window.setTimeout(() => {
    const rowEl = document.querySelector('tr.row-editing') as HTMLElement | null;
    const editor = rowEl?.querySelector('input, textarea, .el-select__wrapper') as HTMLElement | null;
    if (!editor) return;
    editor.focus();
    const input = editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement
      ? editor
      : editor.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    input?.select?.();
  }, 0);
}

async function enterEditAndFocus(r: UiRow) {
  if ((r as any).__type === 'data') moveJournalPageToDataRow(r as DataRow);
  enterEdit(r);
  await focusEditingRowFirstEditor();
}
function onRowClick(row: UiRow, _column: any, event: MouseEvent) {
  const el = event?.target instanceof HTMLElement ? event.target : null;
  if (el && el.closest('button, a, .el-checkbox, .el-input, .el-select, .el-date-editor, .el-input-number')) return;
  enterEdit(row);
}

function getInexpCateCreateCategoryType(row?: any) {
  const income = moneyNumber(row?.income || 0);
  const expense = moneyNumber(row?.expense || 0);
  if (income > 0 && expense <= 0) return 1;
  if (expense > 0 && income <= 0) return 2;
  return 1;
}

async function reloadIoTypesAfterCreate() {
  ioTypes.value = await fetchIoTypes();
}

function closeOpenIoTypeSelect() {
  const active = document.activeElement as HTMLElement | null;
  active?.blur?.();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
}

function openInexpCateCreate(row?: any) {
  closeOpenIoTypeSelect();
  window.setTimeout(() => {
    inexpCateFormModalApi
      .setData({
        type: 'create',
        category_type: getInexpCateCreateCategoryType(row),
      })
      .open();
  }, 0);
}

function getIoTypeCategoryType(item: any) {
  const type = Number(item?.categoryType || item?.category_type || 0);
  if (type === 1 || type === 2) return type;
  const name = String(item?.name || '').trim();
  if (name.includes('收入') || name.includes('收款') || name.startsWith('收')) return 1;
  if (name.includes('支出') || name.includes('付款') || name.startsWith('支')) return 2;
  return 0;
}

function getIoTypeDirectionPrefix(item: any) {
  const type = getIoTypeCategoryType(item);
  if (type === 1) return '收';
  if (type === 2) return '支';
  return '';
}

function getIoTypeDisplayName(item: any) {
  const name = String(item?.name || '').trim();
  const prefix = getIoTypeDirectionPrefix(item);
  if (!prefix) return name;
  if (name.startsWith(prefix + '-') || name.startsWith(prefix + '－')) return name;
  return prefix + '-' + name;
}

function getRowIoTypeDirection(row: DataRow) {
  if (moneyNumber(row?.income || 0) > 0 && moneyNumber(row?.expense || 0) <= 0) return 1;
  if (moneyNumber(row?.expense || 0) > 0 && moneyNumber(row?.income || 0) <= 0) return 2;
  const selected = ioTypes.value.find((item) => String(item.id) === String(row?.ioType || ''));
  return getIoTypeCategoryType(selected);
}

function getRowIoTypeOptions(row: DataRow) {
  const direction = getRowIoTypeDirection(row);
  const list = direction === 1 || direction === 2
    ? ioTypes.value.filter((item) => getIoTypeCategoryType(item) === direction)
    : ioTypes.value;
  const selectedId = String(row?.ioType || '').trim();
  const selected = selectedId ? ioTypes.value.find((item) => String(item.id) === selectedId) : null;
  return selected && !list.some((item) => String(item.id) === selectedId) ? [selected, ...list] : list;
}

function getRowIoTypeCategoryType(r: DataRow) {
  const selectedIoType = ioTypes.value.find((item) => String(item.id) === String(r.ioType || ''));
  return getIoTypeCategoryType(selectedIoType);
}

function getRowIoTypeDisplayName(r: any) {
  const selectedIoType = ioTypes.value.find((item) => String(item.id) === String(r?.ioType || ''));
  if (selectedIoType) return getIoTypeDisplayName(selectedIoType);
  const name = String(r?.ioTypeName || '').trim();
  if (!name) return '';
  const income = moneyNumber(r?.income || 0);
  const expense = moneyNumber(r?.expense || 0);
  const prefix = income > 0 && expense <= 0 ? '收' : expense > 0 && income <= 0 ? '支' : '';
  if (!prefix || name.startsWith(prefix + '-') || name.startsWith(prefix + '－')) return name;
  return prefix + '-' + name;
}

function validateIoTypeAmountDirection(r: DataRow) {
  const categoryType = getRowIoTypeCategoryType(r);
  const hasDebitIncome = moneyNumber(r.income || 0) > 0;
  const hasCreditExpense = moneyNumber(r.expense || 0) > 0;
  if (hasDebitIncome && categoryType === 2) return '填写借方收入金额时，收支类别必须选择“收”类';
  if (hasCreditExpense && categoryType === 1) return '填写贷方支出金额时，收支类别必须选择“支”类';
  return '';
}

function isBlankDraftRow(r: DataRow) {
  return !String(r.id || '').trim()
    && !String(r.summary || '').trim()
    && !String(r.ioType || '').trim()
    && !String(r.counterparty || '').trim()
    && moneyNumber(r.income || 0) === 0
    && moneyNumber(r.expense || 0) === 0;
}

function getRowRequiredMissingFields(r: DataRow) {
  const missing: string[] = [];
  if (!String(r.date || '').trim()) missing.push('日期');
  if (!String(r.summary || '').trim()) missing.push('摘要');
  if (!String(r.ioType || '').trim()) missing.push('收支类别');
  if (moneyNumber(r.income || 0) === 0 && moneyNumber(r.expense || 0) === 0) missing.push('收入或支出金额');
  const directionError = validateIoTypeAmountDirection(r);
  if (directionError) missing.push(directionError);
  return missing;
}

function isRowRequiredFilled(r: DataRow) {
  return getRowRequiredMissingFields(r).length === 0;
}

function isRowTouched(r: DataRow) {
  return Boolean(
    String(r.id || '').trim()
    || String(r.summary || '').trim()
    || String(r.ioType || '').trim()
    || String(r.counterparty || '').trim()
    || moneyNumber(r.income || 0) !== 0
    || moneyNumber(r.expense || 0) !== 0,
  );
}

async function resolveJournalClosedReason(dateValue: unknown) {
  const date = String(dateValue || '').trim();
  if (!date) return '';
  try {
    const row = await getClosedPeriodStatusByDate({ date: date.slice(0, 10) });
    return row ? `期间 ${row.period_code} 已结账，不能新增、修改或删除${cfg.label}明细` : '';
  } catch {
    return '';
  }
}

async function refreshJournalCarryForwardStatus() {
  const reason = await resolveJournalClosedReason(getDefaultRowDate());
  journalCarryForwarded.value = !!reason;
  journalCarryForwardReason.value = reason;
}

async function markRowsCarryForwardStatus(list: DataRow[]) {
  return await Promise.all(
    (list || []).map(async (item) => {
      const reason = await resolveJournalClosedReason((item as any).date);
      return {
        ...item,
        __carryForwarded: !!reason,
        __closedReason: reason,
      } as DataRow;
    }),
  );
}

function isDeleteDisabled(row: any) {
  return !!row?.__carryForwarded;
}

function getDeleteDisabledReason(row: any) {
  return String(row?.__closedReason || '');
}

function getRowAnchorKey(row: any) {
  return String(row?.id || row?.journalNo || row?.journal_no || '').trim();
}

function applyInsertAnchors(newRow: DataRow, insertIndex: number) {
  const prev = rows.value[insertIndex - 1];
  const next = rows.value[insertIndex];
  newRow.insertPrevKey = getRowAnchorKey(prev);
  newRow.insertNextKey = getRowAnchorKey(next);
}

function isManualInsertedRow(row: DataRow) {
  return Boolean(
    Number((row as any).__manualInsertSort || 0) > 0
    || (row as any).insertSortPinned,
  );
}

function syncInsertAnchorsBeforeSave(row: DataRow) {
  const shouldPinInsertSort = isManualInsertedRow(row);
  const index = rows.value.indexOf(row);
  if (index < 0) return;

  let prevKey = '';
  for (let i = index - 1; i >= 0; i--) {
    const key = getRowAnchorKey(rows.value[i]);
    if (key) {
      prevKey = key;
      break;
    }
  }

  let nextKey = '';
  for (let i = index + 1; i < rows.value.length; i++) {
    const key = getRowAnchorKey(rows.value[i]);
    if (key) {
      nextKey = key;
      break;
    }
  }

  row.insertPrevKey = prevKey;
  row.insertNextKey = nextKey;
  if (shouldPinInsertSort) (row as any).insertSortPinned = true;
}

function resolveInsertedSortOrder(index: number, position: 'above' | 'below') {
  const insertIndex = position === 'above' ? index : index + 1;
  const prev = rows.value[insertIndex - 1];
  const next = rows.value[insertIndex];
  const prevOrder = Number(prev?.sortOrder || 0);
  const nextOrder = Number(next?.sortOrder || 0);
  if (prevOrder > 0 && nextOrder > 0) return (prevOrder + nextOrder) / 2;
  if (prevOrder > 0) return prevOrder + 1000;
  if (nextOrder > 0) return nextOrder / 2;
  return (insertIndex + 1) * 1000;
}

function getJournalSortDate(row: DataRow) {
  return String(row.date || '').slice(0, 10) || '9999-12-31';
}

function getJournalSortNo(row: DataRow) {
  const journalNo = String(row.journalNo || (row as any).journal_no || '').trim();
  const matched = journalNo.match(/(\d+)$/);
  if (matched) return Number(matched[1]);
  const sortOrder = Number(row.sortOrder || 0);
  return Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : Number.MAX_SAFE_INTEGER;
}

function getManualInsertSort(row: DataRow) {
  const manualValue = Number((row as any).__manualInsertSort || 0);
  if (Number.isFinite(manualValue) && manualValue > 0) return manualValue;
  if ((row as any).insertSortPinned) {
    const persistedValue = Number(row.sortOrder || 0);
    return Number.isFinite(persistedValue) && persistedValue > 0 ? persistedValue : 0;
  }
  return 0;
}

function getInsertAwareSortOrder(row: DataRow) {
  const manualSort = getManualInsertSort(row);
  if (manualSort > 0) return manualSort;
  const sortOrder = Number(row.sortOrder || 0);
  return Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : Number.MAX_SAFE_INTEGER;
}

function compareJournalRows(a: DataRow, b: DataRow) {
  const dateDiff = getJournalSortDate(a).localeCompare(getJournalSortDate(b));
  if (dateDiff !== 0) return dateDiff;
  const noDiff = getJournalSortNo(a) - getJournalSortNo(b);
  if (noDiff !== 0) return noDiff;
  return String(a.id || a.__tmpKey || '').localeCompare(String(b.id || b.__tmpKey || ''), 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
}

function findRowIndexByAnchorKey(list: DataRow[], key: string) {
  const anchorKey = String(key || '').trim();
  if (!anchorKey) return -1;
  return list.findIndex((item) => getRowAnchorKey(item) === anchorKey);
}

function getAnchorGroupKey(row: DataRow) {
  return String((row as any).insertPrevKey || '').trim() + '->' + String((row as any).insertNextKey || '').trim();
}

function applyPrevNextInsertSortOrders(normalRows: DataRow[], manualRows: DataRow[]) {
  const ordered = [...normalRows];
  const groups = new Map<string, DataRow[]>();
  for (const item of manualRows) {
    const key = getAnchorGroupKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.sort((a, b) => {
      const sortDiff = getInsertAwareSortOrder(a) - getInsertAwareSortOrder(b);
      if (sortDiff !== 0) return sortDiff;
      return compareJournalRows(a, b);
    });

    const first = group[0];
    const prevKey = String((first as any)?.insertPrevKey || '').trim();
    const nextKey = String((first as any)?.insertNextKey || '').trim();
    const prevIndex = findRowIndexByAnchorKey(ordered, prevKey);
    const nextIndex = findRowIndexByAnchorKey(ordered, nextKey);
    const prevOrder = prevIndex >= 0 ? Number(ordered[prevIndex]?.sortOrder || 0) : 0;
    const nextOrder = nextIndex >= 0 ? Number(ordered[nextIndex]?.sortOrder || 0) : 0;

    if (prevOrder > 0 && nextOrder > 0 && prevOrder < nextOrder) {
      const step = (nextOrder - prevOrder) / (group.length + 1);
      group.forEach((item, index) => {
        item.sortOrder = prevOrder + step * (index + 1);
      });
    } else if (prevOrder > 0) {
      group.forEach((item, index) => {
        item.sortOrder = prevOrder + (index + 1) * 0.001;
      });
    } else if (nextOrder > 0) {
      group.forEach((item, index) => {
        item.sortOrder = Math.max(0.001, nextOrder - (group.length - index) * 0.001);
      });
    } else {
      group.forEach((item, index) => {
        item.sortOrder = Number(item.sortOrder || 0) > 0 ? Number(item.sortOrder) : (normalRows.length + index + 1) * 1000;
      });
    }

    ordered.push(...group);
    ordered.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }
}

function normalizeRowSortOrders() {
  const normalRows = [...rows.value]
    .filter((item) => !isManualInsertedRow(item))
    .sort(compareJournalRows);

  normalRows.forEach((item, index) => {
    item.sortOrder = (index + 1) * 1000;
  });

  const manualRows = [...rows.value].filter((item) => isManualInsertedRow(item));
  applyPrevNextInsertSortOrders(normalRows, manualRows);

  rows.value = [...normalRows, ...manualRows].sort((a, b) => {
    const sortDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (sortDiff !== 0) return sortDiff;
    return compareJournalRows(a, b);
  });
}

function buildBlankRow(): DataRow {
  return {
    __type: 'data',
    __tmpKey: 'tmp_' + Math.random().toString(36).slice(2),
    id: '',
    date: getDefaultRowDate(),
    summary: '',
    ioType: '',
    ioTypeName: '',
    counterparty: '',
    counterpartyName: '',
    income: 0,
    expense: 0,
    balance: 0,
    voucherNo: '',
    voucherMainId: '',
    linkStatus: 0,
    journalNo: '',
    sortOrder: 0,
    accountRowid: String(query.accountId || ''),
  };
}

function ensureBlankRowAfter(r: DataRow) {
  const index = rows.value.indexOf(r);
  if (index < 0) return null;
  const next = rows.value[index + 1];
  if (next && isBlankDraftRow(next)) return next;
  const newRow = buildBlankRow();
  newRow.sortOrder = resolveInsertedSortOrder(index, 'below');
  newRow.__manualInsertSort = newRow.sortOrder;
  applyInsertAnchors(newRow, index + 1);
  rows.value.splice(index + 1, 0, newRow);
  recalcBalance();
  return newRow;
}

function ensureDefaultCandidateRow() {
  if (!String(query.accountId || '').trim()) return null;
  const existedBlank = rows.value.find((item) => isBlankDraftRow(item));
  if (existedBlank) return existedBlank;
  const newRow = buildBlankRow();
  newRow.sortOrder = rows.value.length > 0 ? Number(rows.value[rows.value.length - 1]?.sortOrder || rows.value.length * 1000) + 1000 : 1000;
  rows.value.push(newRow);
  recalcBalance();
  return newRow;
}

async function onEditorBlur(e: FocusEvent, row?: DataRow) {
  const rt = (e?.relatedTarget instanceof HTMLElement ? e.relatedTarget : null) as HTMLElement | null;
  if (rt && rt.closest('tr.row-editing')) return;
  setTimeout(async () => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (active && active.closest('tr.row-editing')) return;
    if (!row) {
      exitEdit();
      return;
    }
    if (isBlankDraftRow(row)) {
      exitEdit();
      return;
    }
    const missing = getRowRequiredMissingFields(row);
    if (missing.length > 0) {
      if (isRowTouched(row)) {
        ElMessage.warning('请填写必填项：' + missing.join('、'));
        await enterEditAndFocus(row);
        return;
      }
      exitEdit();
      return;
    }
    const wasNewRow = !String(row.id || '').trim();
    await saveRow(row, { silent: false, reloadAfterSave: false });
    if (!String(row.id || '').trim()) return;
    if (wasNewRow) {
      const nextRow = ensureBlankRowAfter(row);
      if (nextRow) {
        await enterEditAndFocus(nextRow);
        return;
      }
    }
    exitEdit();
  }, 0);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getMonthLastDate(year: number, month: number) {
  const last = new Date(year, month, 0);
  return `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
}

function getTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function getDefaultRowDate() {
  const today = getTodayISO();
  const start = query.dateRange?.[0] || '';
  const end = query.dateRange?.[1] || '';
  if ((!start || today >= start) && (!end || today <= end)) return today;
  return end || start || today;
}

function fmtMoney(v: any) {
  return moneyText(v);
}

function rowClassName({ row }: { row: UiRow }) {
  let cls = '';
  if (row.__type === 'init') cls = 'row-init';
  else if (row.__type === 'sum') cls = 'row-sum';
  if (isEditing(row)) cls = (cls ? cls + ' ' : '') + 'row-editing';
  return cls;
}

function onSelectionChange(val: UiRow[]) {
  selected.value = val.filter((x) => x.__type === 'data') as DataRow[];
}

function onMoneyChange(r: DataRow, field: 'income' | 'expense') {
  if (field === 'income' && Number(r.income || 0) !== 0) r.expense = 0;
  if (field === 'expense' && Number(r.expense || 0) !== 0) r.income = 0;
  normalizeRowSortOrders();
  recalcBalance();
}


function getAuxOptionName(options: FinanceAuxValueOption[], value: unknown) {
  const key = String(value || '').trim();
  if (!key) return '';
  const matched = options.find((item) => String(item.value) === key || String(item.raw?.row_id || item.raw?.rowid || item.raw?.id || '') === key);
  return String(matched?.raw?.value_name || matched?.label || '').replace(/^\S+\s+/, '').trim() || String(matched?.label || '').trim() || key;
}

function onProjectChange(row: DataRow) {
  const value = String((row as any).projectId || '').trim();
  (row as any).projectName = getAuxOptionName(projectOptions.value, value);
}

function onDeptChange(row: DataRow) {
  const value = String((row as any).deptId || '').trim();
  (row as any).deptName = getAuxOptionName(deptOptions.value, value);
}

async function loadProjectDeptOptions() {
  const auxOptions = await getFinanceAuxiliaryValueOptions({ dimCodes: ['PROJECT', 'DEPT'] });
  projectOptions.value = auxOptions.PROJECT || [];
  deptOptions.value = auxOptions.DEPT || [];
}

function onCounterpartyChange(r: DataRow) {
  const selectedCounterparty = counterparties.value.find(
    (item) => String(item.id) === String(r.counterparty || ''),
  );
  r.counterpartyName = selectedCounterparty?.name || '';
}
function normalizeIoTypeMatchText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。；;、/|\\]+/g, ',')
    .trim();
}

function splitIoTypeMatchKeywords(value: unknown) {
  return normalizeIoTypeMatchText(value)
    .split(/[,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getIoTypeMatchKeywords(item: IoType) {
  return [
    ...splitIoTypeMatchKeywords((item as any).matchKeywords),
    ...splitIoTypeMatchKeywords((item as any).description),
  ];
}

function getIoTypeMatchDirectionScore(item: IoType, row?: DataRow) {
  if (!row) return 0;
  const categoryType = Number((item as any)?.categoryType || 0);
  const income = Number(row.income || 0) || 0;
  const expense = Number(row.expense || 0) || 0;
  if (categoryType === 1 && income > 0 && expense === 0) return 10000;
  if (categoryType === 2 && expense > 0 && income === 0) return 10000;
  if (categoryType === 1 && expense > 0 && income === 0) return -10000;
  if (categoryType === 2 && income > 0 && expense === 0) return -10000;
  return 0;
}

function findMatchedIoTypeBySummary(summary: unknown, row?: DataRow) {
  const text = normalizeIoTypeMatchText(summary);
  if (!text) return null;

  let matched: IoType | null = null;
  let matchedScore = -Infinity;
  for (const item of ioTypes.value) {
    const keywords = getIoTypeMatchKeywords(item);
    for (const keyword of keywords) {
      if (!keyword || !text.includes(keyword)) continue;
      const score = keyword.length * 100 + getIoTypeMatchDirectionScore(item, row) - Number((item as any).sortOrder || 0) / 100000;
      if (score > matchedScore) {
        matched = item;
        matchedScore = score;
      }
    }
  }
  return matched;
}

function applyIoTypeFromSummary(r: DataRow, options: { overwrite?: boolean; reorder?: boolean } = {}) {
  if (!options.overwrite && String(r.ioType || '').trim()) return false;
  const matched = findMatchedIoTypeBySummary(r.summary, r);
  if (!matched) return false;
  r.ioType = String(matched.id);
  onIoTypeChange(r, { reorder: options.reorder ?? false });
  return true;
}


function onSummaryInput(r: DataRow) {
  applyIoTypeFromSummary(r);
}

function onIoTypeChange(r: DataRow, options: { reorder?: boolean } = {}) {
  const selectedIoType = ioTypes.value.find((item) => String(item.id) === String(r.ioType || ''));
  r.ioTypeName = selectedIoType?.name || '';

  const categoryType = Number((selectedIoType as any)?.categoryType || 0);
  if (categoryType === 1 && Number(r.income || 0) === 0 && Number(r.expense || 0) !== 0) {
    r.income = Number(r.expense || 0);
    r.expense = 0;
  }
  if (categoryType === 2 && Number(r.expense || 0) === 0 && Number(r.income || 0) !== 0) {
    r.expense = Number(r.income || 0);
    r.income = 0;
  }
  if (options.reorder !== false) normalizeRowSortOrders();
  recalcBalance();
}

function recalcBalance() {
  let bal = moneyNumber(openingBalance.value);
  rows.value.forEach((r) => {
    bal = moneyNumber(subMoney(addMoney([bal, r.income], 'round', 6), r.expense));
    r.balance = bal;
  });
}

async function saveOpeningBalance() {
  const accountId = String(query.accountId || '').trim();
  if (!accountId) {
    ElMessage.warning('请先选择现金账户');
    return;
  }

  const account = (accounts.value || []).find(
    (item: any) => String(item?.id || item?.rowid || '') === accountId,
  ) as any;
  if (!account) {
    ElMessage.warning('未找到当前现金账户');
    return;
  }

  initBalanceSaving.value = true;
  try {
    const initialAmount = moneyNumber(openingBalance.value);
    await saveFundsAccount({
      ...account,
      id: accountId,
      rowid: accountId,
      account_code: String(account.account_code || account.code || '').trim(),
      account_name: String(account.account_name || account.name || '').trim(),
      account_kind: '现金',
      initial_amount: initialAmount,
      account_balance: initialAmount,
    } as any);
    openingBalance.value = initialAmount;
    const idx = accounts.value.findIndex((item: any) => String(item?.id || item?.rowid || '') === accountId);
    if (idx >= 0) {
      accounts.value[idx] = { ...(accounts.value[idx] as any), initialAmount, initial_amount: initialAmount } as any;
    }
    recalcBalance();
    ElMessage.success('初始化余额已保存');
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '初始化余额保存失败');
  } finally {
    initBalanceSaving.value = false;
  }
}

function insertRowNear(row: DataRow, position: 'above' | 'below') {
  if (journalCarryForwarded.value) {
    ElMessage.warning(journalCarryForwardReason.value || '当前期间已结账，不能新增日记账明细');
    return;
  }
  if (!String(query.accountId || '').trim()) {
    ElMessage.warning('请先选择现金账户');
    return;
  }
  const index = rows.value.indexOf(row);
  if (index < 0) return;
  const newRow = buildBlankRow();
  newRow.date = String(row.date || '').slice(0, 10) || getDefaultRowDate();
  const insertIndex = position === 'above' ? index : index + 1;
  newRow.sortOrder = resolveInsertedSortOrder(index, position);
  newRow.__manualInsertSort = newRow.sortOrder;
  applyInsertAnchors(newRow, insertIndex);
  rows.value.splice(insertIndex, 0, newRow);
  recalcBalance();
  enterEditAndFocus(newRow);
}

function addRow() {
  if (journalCarryForwarded.value) {
    ElMessage.warning(journalCarryForwardReason.value || '当前期间已结账，不能新增日记账明细');
    return;
  }
  if (!String(query.accountId || '').trim()) {
    ElMessage.warning('请先选择现金账户');
    return;
  }

  const existedBlank = rows.value.find((item) => isBlankDraftRow(item));
  const newRow = existedBlank || buildBlankRow();
  if (!existedBlank) {
    newRow.sortOrder = rows.value.length > 0 ? (Number(rows.value[0]?.sortOrder || 1000) / 2) : 1000;
    rows.value.unshift(newRow);
  }
  recalcBalance();
  enterEditAndFocus(newRow);
}

async function reload() {
  await refreshJournalCarryForwardStatus();
  if (!query.accountId) return;
  loading.value = true;
  try {
    accounts.value = await fetchCashAccounts({ showDisabled: showDisabledAccounts.value });
    const res = await fetchCashdayList({
      accountId: query.accountId,
      start: query.dateRange?.[0] || '',
      end: query.dateRange?.[1] || '',
      showAll: query.showAll,
    });

    openingBalance.value = Number(res.openingBalance || 0);
    openingBalanceReadonly.value = Boolean((res as any).hasPriorJournalRows);
    rows.value = await markRowsCarryForwardStatus((res.items || []).map((x) => ({ __type: 'data', ...x })) as DataRow[]);
    normalizeRowSortOrders();
    await loadLinkedVoucherMonths(rows.value);
    journalPageNo.value = 1;
    recalcBalance();
    const candidateRow = ensureDefaultCandidateRow();
    if (candidateRow) await enterEditAndFocus(candidateRow);
    else exitEdit();
  } catch (e) {
    console.error(e);
    ElMessage.error('加载现金日记账失败');
  } finally {
    loading.value = false;
  }
}

async function saveRow(r: DataRow, options: { silent?: boolean; reloadAfterSave?: boolean } = {}) {
  applyIoTypeFromSummary(r);
  const closedReason = await resolveJournalClosedReason(r.date);
  if (closedReason) {
    if (!options.silent) ElMessage.warning(closedReason);
    return;
  }
  if (!isRowRequiredFilled(r)) {
    if (!options.silent) ElMessage.warning('请填写日期、摘要、收支类别以及收入或支出金额');
    return;
  }
  const accountRowid = String(query.accountId || r.accountRowid || r.capital_account_rowid || '').trim();
  if (!accountRowid) {
    if (!options.silent) ElMessage.warning('请先选择现金账户');
    return;
  }

  normalizeRowSortOrders();
  recalcBalance();

  try {
    syncInsertAnchorsBeforeSave(r);
    const isNewRow = !String(r.id || '').trim();
    const saved = await saveCashdayRow({
      accountRowid,
      forceAdd: isNewRow,
      row: {
        ...r,
        id: isNewRow ? '' : r.id,
        journalNo: isNewRow ? '' : r.journalNo,
        lingma_sys_key: isNewRow ? undefined : r.lingma_sys_key,
        accountRowid,
        capital_account_rowid: accountRowid,
        date: String(r.date || '').slice(0, 10),
        income: Number(r.income || 0) || 0,
        expense: Number(r.expense || 0) || 0,
        balance: Number(r.balance || 0) || 0,
      },
    });
    if (saved) {
      Object.assign(r, {
        ...saved,
        __type: 'data',
        __tmpKey: r.__tmpKey,
        __manualInsertSort: r.__manualInsertSort,
        insertPrevKey: r.insertPrevKey,
        insertNextKey: r.insertNextKey,
        id: saved.id || r.id,
        journalNo: saved.journalNo || r.journalNo,
      });
    }
    normalizeRowSortOrders();
    recalcBalance();
    if (!options.silent) ElMessage.success('保存成功');
    if (options.reloadAfterSave !== false) {
      exitEdit();
      await reload();
    }
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '保存失败');
  }
}

async function delRow(r: DataRow) {
  try {
    const closedReason = await resolveJournalClosedReason(r.date);
    if (closedReason) {
      ElMessage.warning(closedReason);
      return;
    }
    if (!String(r.id || '').trim()) {
      rows.value = rows.value.filter((x) => x !== r);
      if (isEditing(r as any)) exitEdit();
      recalcBalance();
      return;
    }

    await ElMessageBox.confirm(
      '确认删除该现金日记账记录吗？删除后列表中将不再显示。',
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );

    await deleteCashdayRow(r);
    ElMessage.success('删除成功');
    if (isEditing(r as any)) exitEdit();
    await reload();
  } catch (e: any) {
    if (e === 'cancel' || e?.action === 'cancel' || e?.action === 'close') return;
    console.error(e);
    ElMessage.error(e?.message || '删除失败');
  }
}

function getLinkedVoucherMainId(row: any) {
  return String(row?.voucherMainId || row?.voucher_main_id || row?.voucherId || '').trim();
}

function getLinkedVoucherNo(row: any) {
  return String(row?.voucherNo || row?.voucher_no || row?.voucher_code || '').trim();
}

function getVoucherMainIdFromRow(row: any) {
  return String(row?.rowid || row?.row_id || row?.id || '').trim();
}

function getVoucherCodeFromRow(row: any) {
  return String(row?.voucher_code || row?.ReportID || row?.business_code || '').trim();
}

async function resolveLinkedVoucherMainId(row: any) {
  const existedId = getLinkedVoucherMainId(row);
  if (existedId) return existedId;

  const voucherNo = getLinkedVoucherNo(row);
  if (!voucherNo) return '';

  const dateMonth = String(row?.date || '').slice(0, 7);
  const queryParams: any = { pageNo: 1, page: 0, voucherCodeExact: voucherNo };
  if (dateMonth) {
    const { start, end } = monthRangeISO(dateMonth);
    queryParams.voucherDateRange = [start, end];
  }

  const page = await getVoucherPage(queryParams);
  let list = (page?.list || []) as any[];
  if (list.length === 0 && dateMonth) {
    const fallbackPage = await getVoucherPage({ pageNo: 1, page: 0, voucherCodeExact: voucherNo } as any);
    list = (fallbackPage?.list || []) as any[];
  }
  const matched = list.find((item) => getVoucherCodeFromRow(item) === voucherNo) || list[0];
  return matched ? getVoucherMainIdFromRow(matched) : '';
}


function formatVoucherMonthText(value: any) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear() + '-' + (date.getMonth() + 1);
  const text = String(value || '').slice(0, 7);
  const [year, month] = text.split('-');
  const monthNumber = Number(month || 0);
  return year && monthNumber ? year + '-' + monthNumber : '';
}

async function loadLinkedVoucherMonths(targetRows: DataRow[]) {
  const ids = [...new Set((targetRows || []).map((row) => getLinkedVoucherMainId(row)).filter(Boolean))];
  if (ids.length === 0) {
    linkedVoucherMonthMap.value = {};
    return;
  }
  const entries = await Promise.all(ids.map(async (id) => {
    try {
      const main = await getVoucherMain(id);
      return [id, formatVoucherMonthText((main as any)?.voucher_date || (main as any)?.createtime || (main as any)?.updatetime)] as const;
    } catch (error) {
      console.error('load linked voucher month failed', error);
      return [id, ''] as const;
    }
  }));
  linkedVoucherMonthMap.value = Object.fromEntries(entries.filter(([, month]) => month));
}

function formatLinkedVoucherNo(row: UiRow) {
  const voucherNo = String((row as any)?.voucherNo || (row as any)?.voucher_no || '').trim();
  if (!voucherNo) return '';
  const voucherMainId = getLinkedVoucherMainId(row as any);
  const voucherMonth = voucherMainId ? linkedVoucherMonthMap.value[voucherMainId] : '';
  if (voucherMonth) return voucherMonth + ' ' + voucherNo;
  return voucherNo;
}

async function openVoucher(r: UiRow) {
  const voucherNo = getLinkedVoucherNo(r as any);
  if (!voucherNo) return;
  try {
    const voucherMainId = await resolveLinkedVoucherMainId(r as any);
    if (!voucherMainId) {
      ElMessage.warning('未找到关联凭证：' + voucherNo);
      return;
    }
    const dateText = String((r as any).date || '').slice(0, 7);
    router.push({
      name: 'FinanceVoucherCreate',
      query: {
        id: voucherMainId,
        type: 'detail',
        date: dateText || undefined,
        moduleScope: 'finance',
        source: 'cashday',
        returnPath: '/finance/funds/cashday',
      },
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '打开凭证失败');
  }
}

async function onPrintList() {
  if (rows.value.length === 0) {
    ElMessage.warning('当前没有可打印的数据');
    return;
  }
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }
  const incomeTotal = moneyNumber(sumByMoney(rows.value, (r) => r.income));
  const expenseTotal = moneyNumber(sumByMoney(rows.value, (r) => r.expense));
  const html = buildCashdayPrintHtml({
    title: '现金日记账',
    companyName: getCurrentAccountSetName(),
    accountName: accountDisplayName.value,
    period: printPeriod.value,
    printedAt: new Date().toLocaleString('zh-CN'),
    openingBalance: moneyNumber(openingBalance.value),
    showAll: Boolean(query.showAll),
    rows: rows.value.map((r: any) => ({
      date: r.date, currencyName: r.currencyName, currency: r.currency,
      summary: r.summary, ioTypeName: r.ioTypeName, counterpartyName: r.counterpartyName,
      projectName: r.projectName, deptName: r.deptName, settlementMethod: r.settlementMethod,
      billNo: r.billNo, remark: r.remark, transactionNo: r.transactionNo,
      income: r.income, expense: r.expense, balance: r.balance, voucherNo: r.voucherNo, journalNo: r.journalNo,
    })),
    incomeTotal, expenseTotal,
    endingBalance: moneyNumber(subMoney(addMoney([openingBalance.value, incomeTotal], 'round', 6), expenseTotal)),
  });
  printLoading.value = true;
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      printLoading.value = false;
    }
  }, 120);
}

function printEvidenceRows(targetRows: DataRow[]) {
  const printableRows = (targetRows || []).filter((row) => {
    const income = moneyNumber(row.income || 0);
    const expense = moneyNumber(row.expense || 0);
    return income > 0 || expense > 0;
  });
  if (printableRows.length === 0) {
    ElMessage.warning('所选行没有收入或支出金额，不能打印凭据');
    return;
  }
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }
  evidencePrintLoading.value = true;
  doc.open();
  doc.write(buildFundsEvidencePrintHtml({
    title: '现金凭据',
    accountLabel: '账户',
    accountName: accountDisplayName.value,
    rows: printableRows,
  }));
  doc.close();
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      evidencePrintLoading.value = false;
    }
  }, 120);
}

function onPrintRowEvidence(row: DataRow) {
  if (!row || row.__type !== 'data') return;
  printEvidenceRows([row]);
}

function onPrintSelectedEvidence() {
  const rowsToPrint = getSelectedDataRows('打印凭据');
  if (rowsToPrint.length === 0) return;
  printEvidenceRows(rowsToPrint);
}

function onPrintCommand(command: string | number | object) {
  const action = String(command || 'list');
  if (action === 'list') return onPrintList();
  if (action === 'evidence') return onPrintSelectedEvidence();
}


function getSelectedDataRows(actionText = '操作') {
  const rows = selected.value.filter((item) => item.__type === 'data') as DataRow[];
  if (rows.length === 0) {
    ElMessage.warning('请先勾选要' + actionText + '的日记账行');
    return [] as DataRow[];
  }
  return rows;
}

function findTextOption<T extends { id?: string; name?: string }>(list: T[], value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  return (list || []).find((item: any) => String(item.id || '').trim() === text || String(item.name || '').trim() === text) || null;
}

function findAuxTextOption(list: FinanceAuxValueOption[], value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  return (list || []).find((item: any) => {
    const raw = item.raw || {};
    return String(item.value || '').trim() === text
      || String(item.label || '').trim() === text
      || String(raw.row_id || raw.rowid || raw.id || '').trim() === text
      || String(raw.value_code || '').trim() === text
      || String(raw.value_name || '').trim() === text;
  }) || null;
}

async function promptBatchText(title: string, message: string, defaultValue = '') {
  const result: any = await ElMessageBox.prompt(message, title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: defaultValue,
  });
  return String(result?.value ?? '').trim();
}

type BatchSelectOption = {
  label: string;
  value: string;
};

async function promptBatchSelect(
  title: string,
  options: BatchSelectOption[],
  config: { clearable?: boolean; placeholder?: string; defaultValue?: string } = {},
) {
  if (options.length === 0 && !config.clearable) {
    ElMessage.warning('暂无可选择数据');
    return '';
  }
  const selectedValue = ref(String(config.defaultValue || ''));
  await ElMessageBox({
    title,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    showCancelButton: true,
    message: () => h(
      ElSelect,
      {
        modelValue: selectedValue.value,
        'onUpdate:modelValue': (value: string) => { selectedValue.value = String(value || ''); },
        filterable: true,
        clearable: config.clearable ?? false,
        placeholder: config.placeholder || '请选择',
        style: 'width: 100%',
      },
      () => options.map((option) => h(ElOption, {
        key: option.value,
        label: option.label,
        value: option.value,
      })),
    ),
  });
  return String(selectedValue.value || '').trim();
}

function buildIoTypeBatchSelectOptions(): BatchSelectOption[] {
  return ioTypes.value.map((item) => ({
    label: getIoTypeDisplayName(item),
    value: String(item.id || ''),
  })).filter((item) => item.value);
}

function buildCounterpartyBatchSelectOptions(): BatchSelectOption[] {
  return counterparties.value.map((item) => ({
    label: String(item.name || ''),
    value: String(item.id || ''),
  })).filter((item) => item.value && item.label);
}

function getAuxBatchOptionValue(option: any) {
  return String(option?.value || option?.raw?.row_id || option?.raw?.rowid || option?.raw?.id || '').trim();
}

function buildAuxBatchSelectOptions(options: FinanceAuxValueOption[]): BatchSelectOption[] {
  return (options || []).map((item: any) => ({
    label: String(item.label || item.raw?.value_name || item.raw?.name || '').trim(),
    value: getAuxBatchOptionValue(item),
  })).filter((item) => item.value && item.label);
}

async function saveBatchRows(rowsToSave: DataRow[], successText: string) {
  normalizeRowSortOrders();
  recalcBalance();
  const savedRows = rowsToSave.filter((row) => String(row.id || '').trim());
  if (savedRows.length !== rowsToSave.length) {
    ElMessage.warning('存在未保存的日记账行，请先保存后再批量修改');
    return;
  }
  await saveCashdayRows(savedRows);
  exitEdit();
  await reload();
  ElMessage.success(successText + '，已处理 ' + savedRows.length + ' 条');
}

async function batchDeleteRows() {
  const rowsToDelete = getSelectedDataRows('删除');
  if (rowsToDelete.length === 0) return;
  await ElMessageBox.confirm('确认批量删除所选 ' + rowsToDelete.length + ' 条现金日记账明细吗？删除后列表中将不再显示。', '批量删除', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
  });
  await deleteCashdayRows(rowsToDelete);
  selected.value = [];
  exitEdit();
  await reload();
  ElMessage.success('批量删除成功，已处理 ' + rowsToDelete.length + ' 条');
}

async function batchUpdateSummary() {
  const rowsToUpdate = getSelectedDataRows('修改摘要');
  if (rowsToUpdate.length === 0) return;
  const value = await promptBatchText('批量修改摘要', '请输入新的摘要');
  rowsToUpdate.forEach((row) => {
    row.summary = value;
    applyIoTypeFromSummary(row, { overwrite: true });
  });
  await saveBatchRows(rowsToUpdate, '批量修改摘要成功');
}

async function batchClearVoucherLink() {
  const rowsToUpdate = getSelectedDataRows('删除关联凭证');
  if (rowsToUpdate.length === 0) return;
  const linkedRows = rowsToUpdate.filter((row: any) => String(row.voucherMainId || '').trim() || String(row.voucherNo || '').trim());
  if (linkedRows.length === 0) {
    ElMessage.warning('所选行没有已关联凭证');
    return;
  }
  await ElMessageBox.confirm('将删除所选 ' + linkedRows.length + ' 条日记账的关联凭证信息，不删除原凭证，是否继续？', '删除关联凭证', {
    type: 'warning',
    confirmButtonText: '删除关联',
    cancelButtonText: '取消',
  });
  linkedRows.forEach((row) => {
    row.voucherMainId = '';
    row.voucherNo = '';
    row.linkStatus = 0;
  });
  await saveBatchRows(linkedRows, '删除关联凭证成功');
}

async function batchAssignIoType() {
  const rowsToUpdate = getSelectedDataRows('指定收支类别');
  if (rowsToUpdate.length === 0) return;
  const value = await promptBatchSelect('指定收支类别', buildIoTypeBatchSelectOptions(), {
    placeholder: '请选择收支类别',
  });
  const option = ioTypes.value.find((item) => String(item.id) === String(value));
  if (!option) {
    ElMessage.warning('请选择收支类别');
    return;
  }
  rowsToUpdate.forEach((row) => {
    row.ioType = String((option as any).id || '');
    row.ioTypeName = String((option as any).name || '');
    onIoTypeChange(row);
  });
  await saveBatchRows(rowsToUpdate, '指定收支类别成功');
}

async function batchAssignCounterparty() {
  const rowsToUpdate = getSelectedDataRows('指定往来单位');
  if (rowsToUpdate.length === 0) return;
  const value = await promptBatchSelect('指定往来单位', buildCounterpartyBatchSelectOptions(), {
    clearable: true,
    placeholder: '请选择往来单位；留空可清空',
  });
  const option = value ? counterparties.value.find((item) => String(item.id) === String(value)) : null;
  rowsToUpdate.forEach((row) => {
    row.counterparty = option ? String((option as any).id || '') : '';
    row.counterpartyName = option ? String((option as any).name || '') : '';
  });
  await saveBatchRows(rowsToUpdate, '指定往来单位成功');
}

async function batchAssignProject() {
  const rowsToUpdate = getSelectedDataRows('指定项目');
  if (rowsToUpdate.length === 0) return;
  const value = await promptBatchSelect('指定项目', buildAuxBatchSelectOptions(projectOptions.value), {
    clearable: true,
    placeholder: '请选择项目；留空可清空',
  });
  const option = value ? projectOptions.value.find((item: any) => getAuxBatchOptionValue(item) === String(value)) : null;
  rowsToUpdate.forEach((row: any) => {
    row.projectId = option ? getAuxBatchOptionValue(option) : '';
    row.projectName = option ? getAuxOptionName(projectOptions.value, row.projectId) : '';
  });
  await saveBatchRows(rowsToUpdate, '指定项目成功');
}

async function batchAssignDept() {
  const rowsToUpdate = getSelectedDataRows('指定部门');
  if (rowsToUpdate.length === 0) return;
  const value = await promptBatchSelect('指定部门', buildAuxBatchSelectOptions(deptOptions.value), {
    clearable: true,
    placeholder: '请选择部门；留空可清空',
  });
  const option = value ? deptOptions.value.find((item: any) => getAuxBatchOptionValue(item) === String(value)) : null;
  rowsToUpdate.forEach((row: any) => {
    row.deptId = option ? getAuxBatchOptionValue(option) : '';
    row.deptName = option ? getAuxOptionName(deptOptions.value, row.deptId) : '';
  });
  await saveBatchRows(rowsToUpdate, '指定部门成功');
}

function batchDownloadAttachments() {
  const rowsToDownload = getSelectedDataRows('下载附件');
  if (rowsToDownload.length === 0) return;
  const withAttachment = rowsToDownload.filter((row: any) => row.attachment || row.attachments || row.fileList || row.file_url || row.fileUrl);
  if (withAttachment.length === 0) {
    ElMessage.warning('所选日记账行暂无可下载附件');
    return;
  }
  ElMessage.warning('附件下载字段暂未接入统一文件服务，请在明细附件入口下载');
}

async function onBatchCommand(command: string) {
  try {
    if (command === 'delete') return await batchDeleteRows();
    if (command === 'summary') return await batchUpdateSummary();
    if (command === 'unlink') return await batchClearVoucherLink();
    if (command === 'ioType') return await batchAssignIoType();
    if (command === 'counterparty') return await batchAssignCounterparty();
    if (command === 'project') return await batchAssignProject();
    if (command === 'dept') return await batchAssignDept();
    if (command === 'downloadAttachment') return batchDownloadAttachments();
  } catch (error: any) {
    if (error === 'cancel' || error?.action === 'cancel' || error?.action === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '批量操作失败');
  }
}

const linkDialogVisible = ref(false);
const voucherMonth = ref('');
const voucherLoading = ref(false);
const voucherPageNo = ref(1);
const voucherPageSize = ref(20);
const voucherTotal = ref(0);
const voucherRows = ref<VoucherRow[]>([]);

function toISODate2(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return (d as Date).toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
}

function monthRangeISO(ym: string) {
  const [y, m] = ym.split('-').map((x) => Number(x));
  const first = new Date(y!, (m || 1) - 1, 1);
  const last = new Date(y!, (m || 1), 0);
  const start = `${first.getFullYear()}-${pad2(first.getMonth() + 1)}-01`;
  const end = `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
  return { start, end };
}


function getVoucherMainIdFromMain(row: any) {
  return String(row?.rowid || row?.row_id || row?.id || '').trim();
}

function getVoucherCodeFromMain(row: any) {
  return String(row?.voucher_code || row?.ReportID || row?.business_code || '').trim();
}

function uniqueVoucherMains(list: any[]) {
  const map = new Map<string, any>();
  for (const item of list || []) {
    const id = getVoucherMainIdFromMain(item);
    const code = getVoucherCodeFromMain(item);
    const date = toISODate2(item?.voucher_date || item?.createtime || item?.updatetime);
    const key = id || [code, date].filter(Boolean).join('@');
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

function summarizeVoucherDetails(details: any[]) {
  const items = (details || [])
    .map((item: any) => String(item?.abstract_content || item?.description || '').trim())
    .filter(Boolean);
  return Array.from(new Set(items)).join('；');
}

function buildVoucherRowFromMain(m: any, details: any[] = []): VoucherRow {
  const id = getVoucherMainIdFromMain(m);
  const detailSummary = summarizeVoucherDetails(details);
  const debitTotal = details.length > 0
    ? moneyNumber(sumByMoney(details, (item: any) => item.debit_amount))
    : moneyNumber(m?.debit_amount || 0);
  const creditTotal = details.length > 0
    ? moneyNumber(sumByMoney(details, (item: any) => item.credit_amount))
    : moneyNumber(m?.credit_amount || 0);
  return {
    id,
    date: toISODate2(m?.voucher_date || m?.createtime || m?.updatetime),
    voucherNo: getVoucherCodeFromMain(m),
    summary: detailSummary || String(m?.description || m?.business_name || '').trim(),
    debitTotal,
    creditTotal,
    maker: String(m?.operator || ''),
    reviewer: String(m?.reviewer || ''),
    details,
    loadingDetails: false,
  };
}

async function loadVoucherPage() {
  if (!voucherMonth.value) return;
  voucherLoading.value = true;
  try {
    const { start, end } = monthRangeISO(voucherMonth.value);
    const page = await getVoucherPage({
      pageNo: voucherPageNo.value,
      page: voucherPageSize.value,
      voucherDateRange: [start, end],
    } as any);

    const mains = uniqueVoucherMains((page.list || []) as VoucherMainLite[]);
    const flatRows: VoucherRow[] = [];
    for (const m of mains) {
      const id = getVoucherMainIdFromMain(m as any);
      let details: any[] = [];
      if (id) {
        try {
          details = await getVoucherDetails(id);
        } catch (error) {
          console.error('加载凭证明细失败：', error);
          details = [];
        }
      }
      const mainRow = buildVoucherRowFromMain(m as any, details);
      mainRow.rowType = 'main';
      flatRows.push(mainRow);
      details.forEach((detail: any, index: number) => {
        flatRows.push({
          rowType: 'detail',
          parentId: mainRow.id,
          detailId: String(detail?.rowid || detail?.row_id || index),
          id: mainRow.id,
          date: '',
          voucherNo: '',
          summary: String(detail?.abstract_content || detail?.description || '').trim(),
          debitTotal: moneyNumber(detail?.debit_amount || 0),
          creditTotal: moneyNumber(detail?.credit_amount || 0),
          maker: '',
          reviewer: '',
          details: [],
          loadingDetails: false,
          accountCode: String(detail?.account_code || '').trim(),
          accountName: String(detail?.account_name || '').trim(),
        } as VoucherRow & { accountCode?: string; accountName?: string });
      });
    }

    voucherRows.value = flatRows;
    voucherTotal.value = mains.length;
  } catch (e) {
    console.error(e);
    ElMessage.error('加载凭证列表失败');
  } finally {
    voucherLoading.value = false;
  }
}

async function ensureVoucherDetails(v: VoucherRow) {
  if (!v.id || v.rowType === 'detail') return;
  if (Array.isArray(v.details) && v.details.length > 0) return;
  v.loadingDetails = true;
  try {
    const details = await getVoucherDetails(v.id);
    v.details = details;
    const summary = summarizeVoucherDetails(details);
    if (summary) v.summary = summary;
    v.debitTotal = moneyNumber(sumByMoney(details, (item: any) => item.debit_amount));
    v.creditTotal = moneyNumber(sumByMoney(details, (item: any) => item.credit_amount));
  } catch (e) {
    console.error(e);
    v.details = [];
    ElMessage.error('加载凭证明细失败');
  } finally {
    v.loadingDetails = false;
  }
}

function voucherLinkRowClass({ row }: { row: VoucherRow }) {
  return row.rowType === 'detail' ? 'voucher-link-detail-row' : 'voucher-link-main-row';
}

function openLinkDialog() {
  if (selected.value.length === 0) {
    ElMessage.warning('请先勾选要关联的日记账行');
    return;
  }

  const notSaved = selected.value.filter((r) => !String(r.id || '').trim());
  if (notSaved.length > 0) {
    ElMessage.warning('存在未保存的日记账行，请先保存后再关联凭证');
    return;
  }

  const start = query.dateRange?.[0];
  if (start && start.length >= 7) voucherMonth.value = start.slice(0, 7);
  else {
    const now = new Date();
    voucherMonth.value = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  }

  voucherPageNo.value = 1;
  linkDialogVisible.value = true;
  loadVoucherPage();
}

async function linkVoucherToSelected(v: VoucherRow) {
  if (selected.value.length === 0) {
    ElMessage.warning('请先勾选要关联的日记账行');
    return;
  }

  const notSaved = selected.value.filter((r) => !String(r.id || '').trim());
  if (notSaved.length > 0) {
    ElMessage.warning('存在未保存的日记账行，请先保存后再关联凭证');
    return;
  }

  try {
    await linkCashdayVoucher({
      rows: selected.value,
      voucherMainId: v.id,
      voucherCode: v.voucherNo,
    });

    ElMessage.success('关联成功');
    linkDialogVisible.value = false;
    await reload();
  } catch (e) {
    console.error(e);
    ElMessage.error('关联失败');
  }
}

function onVoucherPageChange(pageNo: number) {
  voucherPageNo.value = pageNo;
  loadVoucherPage();
}

function onVoucherSizeChange(size: number) {
  voucherPageSize.value = size;
  voucherPageNo.value = 1;
  loadVoucherPage();
}

function onLinkVoucher() {
  openLinkDialog();
}

function onVoucherLinkCommand(command: string | number | object) {
  const action = String(command || 'link');
  if (action === 'link') return onLinkVoucher();
  if (action === 'unlink') return onUnlinkVoucher();
}


function getCurrentCashSubject() {
  const account = (accounts.value || []).find(
    (item: any) => String(item?.id || item?.rowid || '') === String(query.accountId || ''),
  ) as any;
  return {
    code: String(account?.subjectCode || account?.subject_code || '1001').trim() || '1001',
    name: String(account?.subjectName || account?.subject_name || '库存现金').trim() || '库存现金',
  };
}

function getIoTypeSubject(r: DataRow) {
  const selectedIoType = ioTypes.value.find((item) => String(item.id) === String(r.ioType || ''));
  const code = String((selectedIoType as any)?.subjectCode || '').trim();
  const name = String((selectedIoType as any)?.subjectName || '').trim();
  if (code && name) return { code, name };
  const income = moneyNumber(r.income || 0);
  return income > 0
    ? { code: '5001', name: '主营业务收入' }
    : { code: '5602', name: '管理费用' };
}

function buildVoucherDetailsByCashRow(r: DataRow): ErpVoucherApi.VoucherDetail[] {
  const income = moneyNumber(r.income || 0);
  const expense = moneyNumber(r.expense || 0);
  const amount = income > 0 ? income : expense;
  const cashSubject = getCurrentCashSubject();
  const oppositeSubject = getIoTypeSubject(r);
  const summary = String(r.summary || (income > 0 ? '现金收入' : '现金支出')).trim();
  if (income > 0) {
    return [
      { account_code: cashSubject.code, account_name: cashSubject.name, abstract_content: summary, debit_amount: amount, credit_amount: 0, sort_no: 1 },
      { account_code: oppositeSubject.code, account_name: oppositeSubject.name, abstract_content: summary, debit_amount: 0, credit_amount: amount, sort_no: 2 },
    ];
  }
  return [
    { account_code: oppositeSubject.code, account_name: oppositeSubject.name, abstract_content: summary, debit_amount: amount, credit_amount: 0, sort_no: 1 },
    { account_code: cashSubject.code, account_name: cashSubject.name, abstract_content: summary, debit_amount: 0, credit_amount: amount, sort_no: 2 },
  ];
}

async function generateVoucherForRows(targets: DataRow[], options: { relink?: boolean } = {}) {
  const savedTargets = targets.filter((r) => String(r.id || '').trim());
  if (savedTargets.length !== targets.length) {
    ElMessage.warning('存在未保存的日记账行，请先保存后再生成凭证');
    return;
  }
  const todoTargets = options.relink
    ? savedTargets
    : savedTargets.filter((r) => !String(r.voucherMainId || '').trim() && !String(r.voucherNo || '').trim());
  if (todoTargets.length === 0) {
    ElMessage.warning(options.relink ? '没有可重新生成凭证的日记账行' : '没有可生成凭证的日记账行');
    return;
  }
  const invalid = todoTargets.find((r) => moneyNumber(r.income || 0) <= 0 && moneyNumber(r.expense || 0) <= 0);
  if (invalid) {
    ElMessage.warning('存在收入和支出都为 0 的日记账行，不能生成凭证');
    return;
  }

  await ElMessageBox.confirm(
    options.relink
      ? '将为 ' + todoTargets.length + ' 条现金日记账重新生成凭证，并覆盖当前关联关系；原凭证不会自动删除，是否继续？'
      : '将为 ' + todoTargets.length + ' 条现金日记账生成凭证，是否继续？',
    '生成凭证',
    { type: 'warning', confirmButtonText: '生成', cancelButtonText: '取消' },
  );

  genVoucherLoading.value = true;
  try {
    let success = 0;
    for (const r of todoTargets) {
      const income = moneyNumber(r.income || 0);
      const expense = moneyNumber(r.expense || 0);
      const amount = income > 0 ? income : expense;
      const voucherDate = String(r.date || getDefaultRowDate()).slice(0, 10);
      const voucherCode = await getNextVoucherCodeByDate(voucherDate, '记');
      const summary = String(r.summary || (income > 0 ? '现金收入' : '现金支出')).trim();
      const created = await createVoucher(
        {
          business_code: String(r.journalNo || r.id || ''),
          business_name: '现金日记账',
          credit_amount: amount,
          debit_amount: amount,
          description: summary,
          is_posted: 0,
          voucher_code: voucherCode,
          voucher_date: voucherDate,
          voucher_type: '现金日记账',
        },
        buildVoucherDetailsByCashRow(r),
      );
      const voucherMainId = String((created as any)?.rowid || (created as any)?.row_id || '');
      await linkCashdayVoucher({ rows: [r], voucherMainId, voucherCode });
      success += 1;
    }
    ElMessage.success(`生成凭证完成：${success} 条`);
    await reload();
  } catch (e: any) {
    if (e === 'cancel' || e?.action === 'cancel' || e?.action === 'close') return;
    console.error(e);
    ElMessage.error(e?.message || '生成凭证失败');
  } finally {
    genVoucherLoading.value = false;
  }
}


function normalizeExcelCellText(value: any) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray((value as any).richText)) {
      return (value as any).richText.map((item: any) => item?.text || '').join('').trim();
    }
    if ((value as any).text) return String((value as any).text || '').trim();
    if ((value as any).result !== undefined) return normalizeExcelCellText((value as any).result);
  }
  return String(value).trim();
}

function normalizeExcelDate(value: any) {
  if (!value) return '';
  if (value instanceof Date) {
    return value.getFullYear() + '-' + pad2(value.getMonth() + 1) + '-' + pad2(value.getDate());
  }
  const text = normalizeExcelCellText(value).replace(/\//g, '-');
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return text.slice(0, 10);
  return String(m[1]) + '-' + pad2(Number(m[2])) + '-' + pad2(Number(m[3]));
}

function normalizeExcelMoney(value: any) {
  const text = normalizeExcelCellText(value).replace(/,/g, '');
  const n = Number(text || 0);
  return Number.isFinite(n) ? n : 0;
}

function getCurrentAccountId() {
  return String(query.accountId || '').trim();
}

function getCurrentAccountSetId() {
  return String(currentAccountSetId.value || '').trim();
}

function getCurrentAccountSetName() {
  return String(currentAccountSetName.value || '').trim() || '当前账套';
}

function getCurrentCashAccount() {
  const accountId = getCurrentAccountId();
  return (accounts.value || []).find(
    (item: any) => String(item?.id || item?.rowid || '') === accountId,
  ) as any;
}

function getCurrentCashAccountName() {
  const account = getCurrentCashAccount();
  return getAccountOptionLabel(account) || accountDisplayName.value || '当前现金账户';
}

function buildJournalExportRows(targetRows: DataRow[]) {
  return targetRows.map((r) => ({
    单据编号: String(r.journalNo || ''),
    日期: String(r.date || '').slice(0, 10),
    币别: String((r as any).currencyName || (r as any).currency || '人民币'),
    摘要: String(r.summary || ''),
    收支类别: getRowIoTypeDisplayName(r as any) || String(r.ioType || ''),
    往来单位: String(r.counterpartyName || ''),
    项目: String((r as any).projectName || ''),
    部门: String((r as any).deptName || ''),
    收入借方: moneyNumber(r.income || 0),
    支出贷方: moneyNumber(r.expense || 0),
    余额: moneyNumber(r.balance || 0),
    关联凭证: String(r.voucherNo || ''),
    结算方式: String((r as any).settlementMethod || ''),
    票据号: String((r as any).billNo || ''),
    备注: String((r as any).remark || ''),
    交易流水号: String((r as any).transactionNo || ''),
  }));
}

function safeSheetName(name: string) {
  return String(name || '日记账').replace(/[\\/*?:[\]]/g, '').slice(0, 31) || '日记账';
}

async function downloadWorkbook(fileName: string, rowsToExport: DataRow[], templateOnly = false) {
  const accountSetId = getCurrentAccountSetId();
  const accountId = getCurrentAccountId();
  if (!accountSetId) {
    ElMessage.warning('请先选择账套');
    return;
  }
  if (!accountId) {
    ElMessage.warning('请先选择现金账户');
    return;
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lingma ERP';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(safeSheetName('现金日记账'));
  sheet.columns = [
    { header: '单据编号', key: '单据编号', width: 22 },
    { header: '日期', key: '日期', width: 14 },
    { header: '币别', key: '币别', width: 10 },
    { header: '摘要', key: '摘要', width: 28 },
    { header: '收支类别', key: '收支类别', width: 12 },
    { header: '往来单位', key: '往来单位', width: 24 },
    { header: '项目', key: '项目', width: 16 },
    { header: '部门', key: '部门', width: 16 },
    { header: '收入借方', key: '收入借方', width: 14 },
    { header: '支出贷方', key: '支出贷方', width: 14 },
    { header: '余额', key: '余额', width: 14 },
    { header: '关联凭证', key: '关联凭证', width: 18 },
    { header: '结算方式', key: '结算方式', width: 14 },
    { header: '票据号', key: '票据号', width: 16 },
    { header: '备注', key: '备注', width: 20 },
    { header: '交易流水号', key: '交易流水号', width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const dataRows = templateOnly
    ? [{ 单据编号: '', 日期: getDefaultRowDate(), 币别: '人民币', 摘要: '示例：现金收支摘要', 收支类别: '收入', 往来单位: '', 项目: '', 部门: '', 收入借方: 0, 支出贷方: 0, 余额: '', 关联凭证: '', 结算方式: '', 票据号: '', 备注: '', 交易流水号: '' }]
    : buildJournalExportRows(rowsToExport);
  dataRows.forEach((item) => sheet.addRow(item));
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });
  ['I', 'J', 'K'].forEach((col) => {
    sheet.getColumn(col).numFmt = '#,##0.00';
  });
  const note = workbook.addWorksheet('导入说明');
  note.addRow(['字段', '说明']);
  note.addRow(['当前账套', getCurrentAccountSetName()]);
  note.addRow(['当前现金账户', getCurrentCashAccountName()]);
  note.addRow(['日期', '必填，格式 YYYY-MM-DD']);
  note.addRow(['摘要', '必填']);
  note.addRow(['收支类别', '可填：收入 / 支出 / in / out']);
  note.addRow(['往来单位', '可为空；填写后会按名称匹配当前系统往来单位']);
  note.addRow(['收入借方、支出贷方', '二选一填写；两者都有值时按金额较大的一方判断方向']);
  note.addRow(['余额、关联凭证、日记账序号', '导入时不需要填写，系统会重新计算余额并生成日记账序号']);
  note.columns = [{ width: 18 }, { width: 70 }];
  const meta = workbook.addWorksheet('系统信息');
  meta.state = 'veryHidden';
  meta.addRows([
    ['字段', '值'],
    ['account_set_id', accountSetId],
    ['account_set_name', getCurrentAccountSetName()],
    ['cash_account_id', accountId],
    ['cash_account_name', getCurrentCashAccountName()],
    ['period', printPeriod.value],
  ]);
  meta.columns = [{ width: 20 }, { width: 48 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportCurrentRows() {
  if (rows.value.length === 0) {
    ElMessage.warning('当前没有可导出的数据');
    return;
  }
  const suffix = printPeriod.value.replace(/\s+/g, '');
  await downloadWorkbook('现金日记账-' + suffix + '.xlsx', rows.value);
}

async function exportAllRows() {
  const accountId = getCurrentAccountId();
  if (!accountId) {
    ElMessage.warning('请先选择现金账户');
    return;
  }
  loading.value = true;
  try {
    const res = await fetchCashdayList({
      accountId,
      start: '',
      end: '',
      showAll: false,
    });
    const allRows = (res.items || []).map((x) => ({ __type: 'data', ...x })) as DataRow[];
    if (allRows.length === 0) {
      ElMessage.warning('没有可导出的全部数据');
      return;
    }
    await downloadWorkbook('现金日记账-全部.xlsx', allRows);
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '导出失败');
  } finally {
    loading.value = false;
  }
}

function resolveIoTypeByText(text: string, income: number, expense: number) {
  const normalized = String(text || '').trim();
  if (normalized === '收入' || normalized.toLowerCase() === 'in') return 'in';
  if (normalized === '支出' || normalized.toLowerCase() === 'out') return 'out';
  if (income > 0 && expense <= 0) return 'in';
  if (expense > 0 && income <= 0) return 'out';
  return income >= expense ? 'in' : 'out';
}

function getWorkbookMetaValue(workbook: ExcelJS.Workbook, key: string) {
  const meta = workbook.getWorksheet('系统信息');
  if (!meta) return '';
  let value = '';
  meta.eachRow((row) => {
    if (normalizeExcelCellText(row.getCell(1).value) === key) {
      value = normalizeExcelCellText(row.getCell(2).value);
    }
  });
  return value;
}

function resolveCounterpartyByName(name: string) {
  const normalized = String(name || '').trim();
  if (!normalized) return { id: '', name: '' };
  const found = counterparties.value.find((item) => String(item.name || '').trim() === normalized);
  return { id: found?.id || '', name: found?.name || normalized };
}

async function importWorkbookFile(file: File) {
  const accountId = getCurrentAccountId();
  const accountSetId = getCurrentAccountSetId();
  if (!accountSetId) {
    ElMessage.warning('请先选择账套');
    return;
  }
  if (!accountId) {
    ElMessage.warning('请先选择现金账户');
    return;
  }
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const fileAccountSetId = getWorkbookMetaValue(workbook, 'account_set_id');
  if (fileAccountSetId && fileAccountSetId !== accountSetId) {
    throw new Error('导入文件所属账套与当前账套不一致，请切换到账套“' + getWorkbookMetaValue(workbook, 'account_set_name') + '”后再导入');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('未读取到工作表');
  const importedRows: DataRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const date = normalizeExcelDate(row.getCell(1).value);
    const summary = normalizeExcelCellText(row.getCell(2).value);
    const ioTypeText = normalizeExcelCellText(row.getCell(3).value);
    const counterpartyNameText = normalizeExcelCellText(row.getCell(4).value);
    let income = normalizeExcelMoney(row.getCell(5).value);
    let expense = normalizeExcelMoney(row.getCell(6).value);
    if (!date && !summary && income === 0 && expense === 0) return;
    if (!date) throw new Error('第 ' + rowNumber + ' 行日期不能为空');
    if (!summary) throw new Error('第 ' + rowNumber + ' 行摘要不能为空');
    if (income > 0 && expense > 0) {
      if (income >= expense) expense = 0;
      else income = 0;
    }
    const ioType = resolveIoTypeByText(ioTypeText, income, expense);
    if (ioType === 'in') expense = 0;
    if (ioType === 'out') income = 0;
    const cp = resolveCounterpartyByName(counterpartyNameText);
    const importedRow = {
      __type: 'data',
      __tmpKey: 'import_' + rowNumber + '_' + Math.random().toString(36).slice(2),
      id: '',
      date,
      summary,
      ioType,
      ioTypeName: ioType === 'in' ? '收入' : '支出',
      counterparty: cp.id,
      counterpartyName: cp.name,
      income,
      expense,
      balance: 0,
      voucherNo: '',
      voucherMainId: '',
      linkStatus: 0,
      journalNo: '',
    } as DataRow;
    if (!ioTypeText) applyIoTypeFromSummary(importedRow, { overwrite: true });
    importedRows.push(importedRow);
  });
  if (importedRows.length === 0) {
    ElMessage.warning('导入文件没有可导入的数据');
    return;
  }
  await ElMessageBox.confirm(
    '将导入 ' + importedRows.length + ' 条现金日记账记录到账套“' + getCurrentAccountSetName() + '”的现金账户“' + getCurrentCashAccountName() + '”，是否继续？',
    '导入确认',
    { type: 'warning', confirmButtonText: '导入', cancelButtonText: '取消' },
  );
  loading.value = true;
  try {
    const merged = [...rows.value, ...importedRows].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    let bal = moneyNumber(openingBalance.value);
    for (const item of merged) {
      bal = moneyNumber(subMoney(addMoney([bal, item.income], 'round', 6), item.expense));
      item.balance = bal;
      if (!String(item.id || '').trim() && importedRows.includes(item)) {
        await saveCashdayRow({
          accountRowid: accountId,
          row: {
            ...item,
            date: String(item.date || '').slice(0, 10),
            income: Number(item.income || 0) || 0,
            expense: Number(item.expense || 0) || 0,
            balance: Number(item.balance || 0) || 0,
          },
        } as any);
      }
    }
    ElMessage.success('导入成功：' + importedRows.length + ' 条');
    await reload();
  } finally {
    loading.value = false;
  }
}

function openImportFilePicker() {
  if (!getCurrentAccountId()) {
    ElMessage.warning('请先选择现金账户');
    return;
  }
  importFileRef.value?.click();
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    await importWorkbookFile(file);
  } catch (e: any) {
    if (e === 'cancel' || e?.action === 'cancel' || e?.action === 'close') return;
    console.error(e);
    ElMessage.error(e?.message || '导入失败');
  }
}

async function downloadImportTemplate() {
  await downloadWorkbook('现金日记账-导入模板.xlsx', [], true);
}
function onImportCommand(cmd: string | number | object) {
  const command = String(cmd || 'import');
  if (command === 'tpl') {
    downloadImportTemplate();
    return;
  }
  openImportFilePicker();
}

function onExportCommand(cmd: string | number | object) {
  const command = String(cmd || 'export');
  if (command === 'exportAll') {
    exportAllRows();
    return;
  }
  exportCurrentRows();
}

function getCashdayLinkedVoucherMainId(row: DataRow) {
  return String((row as any)?.voucherMainId || (row as any)?.voucher_main_id || (row as any)?.voucherId || '').trim();
}

function getCashdayLinkedVoucherNo(row: DataRow) {
  return String((row as any)?.voucherNo || (row as any)?.voucher_no || '').trim();
}

function buildCashdayVoucherDraftEntries(targets: DataRow[]) {
  return targets.flatMap((row) => {
    return buildVoucherDetailsByCashRow(row).map((detail) => ({
      summary: String((detail as any).abstract_content || row.summary || '').trim(),
      subject: String((detail as any).account_code || '').trim(),
      debit: Number((detail as any).debit_amount || 0) > 0 ? moneyNumber((detail as any).debit_amount || 0) : undefined,
      credit: Number((detail as any).credit_amount || 0) > 0 ? moneyNumber((detail as any).credit_amount || 0) : undefined,
    }));
  });
}

function openFinanceVoucherCreateFromCashday(targets: DataRow[], relink: boolean) {
  const firstRow = targets[0];
  const voucherDate = String((firstRow as any)?.date || getDefaultRowDate()).slice(0, 10);
  const ids = targets.map((row) => String(row.id || '').trim()).filter(Boolean);
  const draft = {
    source: 'cashday',
    accountId: String(query.accountId || ''),
    rowIds: ids,
    relink,
    voucherWord: '记',
    date: new Date(voucherDate + ' 00:00:00').getTime(),
    attachmentsCount: 0,
    note: targets.length === 1 ? String((firstRow as any)?.summary || '') : '现金日记账生成凭证：' + targets.length + ' 条',
    entries: buildCashdayVoucherDraftEntries(targets),
  };

  try {
    window.sessionStorage.setItem('finance_voucher_create_draft', JSON.stringify(draft));
  } catch (error) {
    console.error(error);
    ElMessage.error('凭证草稿缓存失败');
    return;
  }

  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      date: voucherDate.slice(0, 7),
      moduleScope: 'finance',
      source: 'cashday',
      returnPath: '/finance/funds/cashday',
      accountId: String(query.accountId || ''),
      ids: ids.join(','),
      relink: relink ? '1' : '0',
    },
  });
}

function onGenVoucherCommand(cmd: string | number | object) {
  const command = String(cmd || 'genSelected');
  const targets = command === 'genAll' || command === 'genAllRelink' ? rows.value : selected.value;
  if (targets.length === 0) {
    ElMessage.warning(command === 'genAll' || command === 'genAllRelink' ? '当前没有可生成凭证的数据' : '请先勾选要生成凭证的日记账行');
    return;
  }
  const notSaved = targets.filter((r) => !String(r.id || '').trim());
  if (notSaved.length > 0) {
    ElMessage.warning('存在未保存的日记账行，请先保存后再生成凭证');
    return;
  }

  const relink = command === 'genSelectedRelink' || command === 'genAllRelink';
  const linkedRows = targets.filter((row) => getCashdayLinkedVoucherMainId(row) || getCashdayLinkedVoucherNo(row));
  if (!relink && linkedRows.length > 0) {
    const firstLinked = linkedRows[0]!;
    const voucherMainId = getCashdayLinkedVoucherMainId(firstLinked);
    if (voucherMainId) {
      const dateText = String((firstLinked as any)?.date || '').slice(0, 7);
      router.push({
        name: 'FinanceVoucherCreate',
        query: {
          id: voucherMainId,
          type: 'edit',
          date: dateText || undefined,
          moduleScope: 'finance',
          source: 'cashday',
          returnPath: '/finance/funds/cashday',
        },
      });
      return;
    }
    ElMessage.warning('所选日记账已关联凭证，但缺少凭证 ID，无法打开凭证详情');
    return;
  }

  const todoTargets = relink
    ? targets
    : targets.filter((row) => !getCashdayLinkedVoucherMainId(row) && !getCashdayLinkedVoucherNo(row));
  if (todoTargets.length === 0) {
    ElMessage.warning(relink ? '没有可重新生成凭证的日记账行' : '没有可生成凭证的日记账行');
    return;
  }
  const invalid = todoTargets.find((r) => moneyNumber(r.income || 0) <= 0 && moneyNumber(r.expense || 0) <= 0);
  if (invalid) {
    ElMessage.warning('存在收入和支出都为 0 的日记账行，不能生成凭证');
    return;
  }

  openFinanceVoucherCreateFromCashday(todoTargets, relink);
}

async function onUnlinkVoucher() {
  if (selected.value.length === 0) {
    ElMessage.warning('请先勾选要取消关联的日记账行');
    return;
  }
  const linkedRows = selected.value.filter((r) => String(r.voucherMainId || '').trim() || String(r.voucherNo || '').trim());
  if (linkedRows.length === 0) {
    ElMessage.warning('所选行没有已关联凭证');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '将取消 ' + linkedRows.length + ' 条日记账的凭证关联，不删除原凭证，是否继续？',
      '取消关联凭证',
      { type: 'warning', confirmButtonText: '取消关联', cancelButtonText: '关闭' },
    );
    await unlinkCashdayVoucher(linkedRows);
    ElMessage.success('已取消关联');
    await reload();
  } catch (e: any) {
    if (e === 'cancel' || e?.action === 'cancel' || e?.action === 'close') return;
    console.error(e);
    ElMessage.error(e?.message || '取消关联失败');
  }
}

onMounted(async () => {
  try {
    accounts.value = await fetchCashAccounts({ showDisabled: showDisabledAccounts.value });
    ioTypes.value = await fetchIoTypes();
    counterparties.value = await fetchCounterparties();
    await loadProjectDeptOptions();
  } catch (e) {
    console.error(e);
  }

  if (!query.accountId && accounts.value.length > 0) {
    query.accountId = String((accounts.value[0] as any)?.rowid || (accounts.value[0] as any)?.id || '');
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  query.dateRange = [`${y}-${pad2(m)}-01`, getMonthLastDate(y, m)];

  await reload();
});
</script>

<template>
  <Page auto-content-height class="h-full">
    <InexpCateFormModal @success="reloadIoTypesAfterCreate" />
    <div class="journal-page flex h-full flex-col gap-3">
      <div class="print-header">
        <div class="print-title">现金日记账</div>
        <div class="print-meta">
          <span>账户：{{ accountDisplayName }}</span>
          <span>期间：{{ printPeriod }}</span>
          <span>打印时间：{{ new Date().toLocaleString('zh-CN') }}</span>
        </div>
      </div>
      <div class="screen-toolbar journal-toolbar">
        <div class="journal-toolbar__filters">
          <div class="journal-filter-item journal-filter-item--account">
            <span class="journal-filter-label">现金账户</span>
            <ElSelect v-model="query.accountId" filterable class="journal-account"
              popper-class="journal-account-select-popper" placeholder="选择现金账户" @change="reload">
              <ElOption v-for="a in accountOptions" :key="String(a.id)" :label="getAccountOptionLabel(a)"
                :value="String(a.id)" :disabled="isAccountParentOption(a)">
                <div class="account-option-tree" :style="{ paddingLeft: getAccountOptionIndent(a) + 'px' }">
                  <span class="account-option-tree__name">{{ getAccountOptionLabel(a) }}</span>
                </div>
              </ElOption>
              <template #footer>
                <div class="journal-account-select-footer" @mousedown.prevent>
                  <div class="journal-account-select-footer__row">
                    <button type="button" class="journal-account-select-footer__plain"
                      @click="selectAllAccounts">全部账户</button>
                    <label class="journal-account-select-footer__switch">
                      <ElSwitch v-model="showDisabledAccounts" @change="reloadAccountsAndJournal" />
                      <span>显示禁用账户</span>
                    </label>
                  </div>
                  <button type="button" class="journal-account-select-footer__add" @click="onAddAccount">⊕新增账户</button>
                </div>
              </template>
            </ElSelect>
          </div>

          <div class="journal-filter-item journal-filter-item--date">
            <span class="journal-filter-label">日期范围</span>
            <ElDatePicker v-model="query.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至"
              start-placeholder="开始日期" end-placeholder="结束日期" class="journal-date-range" @change="reload" />
          </div>
        </div>

        <div class="journal-toolbar__actions">
          <ElCheckbox v-model="query.showAll" class="journal-show-all-checkbox" @change="reload">显示全部</ElCheckbox>

          <ElDropdown @command="onPrintCommand">
            <ElButton :loading="printLoading || evidencePrintLoading">打印 <span class="ml-1">▼</span></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="list">打印列表</ElDropdownItem>
                <ElDropdownItem command="evidence">打印凭据</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <ElDropdown @command="onImportCommand">
            <ElButton>导入 <span class="ml-1">▼</span></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="import">导入数据</ElDropdownItem>
                <ElDropdownItem command="tpl">下载模板</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <ElDropdown @command="onExportCommand">
            <ElButton>导出 <span class="ml-1">▼</span></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="export">导出当前</ElDropdownItem>
                <ElDropdownItem command="exportAll">导出全部</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <ElDropdown @command="onBatchCommand">
            <ElButton>批量操作 <span class="ml-1">▼</span></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="delete">批量删除</ElDropdownItem>
                <ElDropdownItem command="summary">批量修改摘要</ElDropdownItem>
                <ElDropdownItem command="ioType">指定收支类别</ElDropdownItem>
                <ElDropdownItem command="counterparty">指定往来单位</ElDropdownItem>
                <ElDropdownItem command="project">指定项目</ElDropdownItem>
                <ElDropdownItem command="dept">指定部门</ElDropdownItem>
                <ElDropdownItem command="downloadAttachment">下载附件</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          <ElDropdown @command="onVoucherLinkCommand">
            <ElButton>凭证关联 <span class="ml-1">▼</span></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="link">关联凭证</ElDropdownItem>
                <ElDropdownItem command="unlink">取消关联</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <ElDropdown @command="onGenVoucherCommand">
            <ElButton type="primary" :loading="genVoucherLoading">生成凭证 <span class="ml-1">▼</span></ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="genSelected">生成所选未关联</ElDropdownItem>
                <ElDropdownItem command="genAll">生成全部未关联</ElDropdownItem>
                <ElDropdownItem command="genSelectedRelink">重新生成所选并覆盖关联</ElDropdownItem>
                <ElDropdownItem command="genAllRelink">重新生成全部并覆盖关联</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </div>
      <div class="journal-print-wrap min-h-0 flex-1">
        <ElTable v-loading="loading" :data="tableRows" border height="100%" :row-key="tableRowKey"
          :row-class-name="rowClassName" @row-click="onRowClick" @selection-change="onSelectionChange">
          <ElTableColumn type="selection" width="46" :selectable="selectionSelectable" />

          <ElTableColumn prop="date" label="日期" width="150">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ row.date }}</span>
              <template v-else>
                <ElDatePicker v-if="isEditing(row)" v-model="(row as any).date" type="date" value-format="YYYY-MM-DD"
                  class="journal-row-date-picker" style="width: 100%"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)" @change="recalcBalance" />
                <span v-else>{{ String((row as any).date || '').slice(0, 10) }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="summary" label="摘要" min-width="160">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ row.summary }}</span>
              <template v-else>
                <ElInput v-if="isEditing(row)" v-model="(row as any).summary" @input="() => onSummaryInput(row as any)"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)" />
                <span v-else>{{ (row as any).summary }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="ioType" width="170">
            <template #header>
              <span class="required-column">收支类别</span>
            </template>
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ getRowIoTypeDisplayName(row as any) }}</span>
              <template v-else>
                <ElSelect v-if="isEditing(row)" v-model="(row as any).ioType" filterable clearable class="w-[160px]"
                  @change="() => onIoTypeChange(row as any, { reorder: false })"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)">
                  <template #footer>
                    <button class="io-type-add-footer" type="button" @mousedown.prevent.stop
                      @click.stop="openInexpCateCreate(row as any)">
                      +点击添加
                    </button>
                  </template>
                  <ElOption v-for="t in getRowIoTypeOptions(row as any)" :key="String(t.id)"
                    :label="getIoTypeDisplayName(t)" :value="String(t.id)">
                    <span>{{ getIoTypeDisplayName(t) }}</span>
                    <span v-if="t.subjectCode" class="io-type-subject">{{ t.subjectCode }} {{ t.subjectName }}</span>
                  </ElOption>
                </ElSelect>
                <span v-else>{{ getRowIoTypeDisplayName(row as any) }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="counterparty" label="往来单位" min-width="150">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ (row as any).counterpartyName || '' }}</span>
              <template v-else>
                <ElSelect v-if="isEditing(row)" v-model="(row as any).counterparty" filterable clearable
                  class="w-[140px]" @change="() => onCounterpartyChange(row as any)"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)">
                  <ElOption v-for="c in counterparties" :key="String(c.id)" :label="c.name" :value="String(c.id)" />
                </ElSelect>
                <span v-else>{{ (row as any).counterpartyName || '' }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="query.showAll" prop="projectName" label="项目" min-width="150">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ (row as any).projectName || '' }}</span>
              <template v-else>
                <ElSelect v-if="isEditing(row)" v-model="(row as any).projectId" filterable clearable class="w-[145px]"
                  placeholder="选择项目" @change="() => onProjectChange(row as any)"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)">
                  <ElOption v-for="p in projectOptions" :key="String(p.value)" :label="p.label"
                    :value="String(p.value)" />
                </ElSelect>
                <span v-else>{{ (row as any).projectName || '' }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="query.showAll" prop="deptName" label="部门" min-width="150">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ (row as any).deptName || '' }}</span>
              <template v-else>
                <ElSelect v-if="isEditing(row)" v-model="(row as any).deptId" filterable clearable class="w-[145px]"
                  placeholder="选择部门" @change="() => onDeptChange(row as any)"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)">
                  <ElOption v-for="d in deptOptions" :key="String(d.value)" :label="d.label" :value="String(d.value)" />
                </ElSelect>
                <span v-else>{{ (row as any).deptName || '' }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="income" label="收入（借方）" width="165" align="right">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ fmtMoney((row as any).income) }}</span>
              <template v-else>
                <ElInputNumber v-if="isEditing(row)" v-model="(row as any).income" :controls="false"
                  class="journal-money-input" @change="() => onMoneyChange(row as any, 'income')"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)" />
                <span v-else>{{ fmtMoney((row as any).income) }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="expense" label="支出（贷方）" width="165" align="right">
            <template #default="{ row }">
              <span v-if="row.__type !== 'data'">{{ fmtMoney((row as any).expense) }}</span>
              <template v-else>
                <ElInputNumber v-if="isEditing(row)" v-model="(row as any).expense" :controls="false"
                  class="journal-money-input" @change="() => onMoneyChange(row as any, 'expense')"
                  @blur="(e) => onEditorBlur(e as FocusEvent, row as any)" />
                <span v-else>{{ fmtMoney((row as any).expense) }}</span>
              </template>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="balance" label="余额" width="140" align="right">
            <template #default="{ row }">
              <ElInputNumber v-if="row.__type === 'init'" v-model="openingBalance" :controls="false"
                :disabled="initBalanceSaving || openingBalanceReadonly" class="init-balance-input"
                @change="() => { if (!openingBalanceReadonly) { recalcBalance(); saveOpeningBalance(); } }"
                @keyup.enter="saveOpeningBalance" />
              <span v-else>{{ fmtMoney((row as any).balance) }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="voucherNo" label="关联凭证" width="160">
            <template #default="{ row }">
              <ElLink v-if="(row as any).voucherNo" type="primary" @click="openVoucher(row as any)">
                {{ formatLinkedVoucherNo(row as any) }}
              </ElLink>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="query.showAll" prop="settlementMethod" label="结算方式" width="110">
            <template #default="{ row }">
              <span>{{ row.__type === 'data' ? ((row as any).settlementMethod || '') : '' }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="query.showAll" prop="billNo" label="票据号" width="130">
            <template #default="{ row }">
              <span>{{ row.__type === 'data' ? ((row as any).billNo || '') : '' }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="query.showAll" prop="remark" label="备注" min-width="130">
            <template #default="{ row }">
              <span>{{ row.__type === 'data' ? ((row as any).remark || '') : '' }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn v-if="query.showAll" prop="transactionNo" label="交易流水号" width="170">
            <template #default="{ row }">
              <span>{{ row.__type === 'data' ? ((row as any).transactionNo || '') : '' }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="journalNo" label="单据编号" width="190" />

          <ElTableColumn label="操作" width="138" fixed="right">
            <template #default="{ row }">
              <template v-if="row.__type === 'data'">
                <ElButton v-if="!isDeleteDisabled(row)" link type="primary" @click="insertRowNear(row as any, 'below')">
                  插入</ElButton>
                <ElButton link type="primary" @click.stop="onPrintRowEvidence(row as any)">凭据</ElButton>
                <ElButton link type="danger" :disabled="isDeleteDisabled(row)" :title="getDeleteDisabledReason(row)"
                  @click="delRow(row as any)">删除</ElButton>
              </template>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
      <div class="journal-pagination flex justify-end">
        <ElPagination background layout="total, sizes, prev, pager, next" :total="journalDisplayTotal"
          :page-size="journalPageSize" :current-page="journalPageNo" :page-sizes="[20, 50, 100, 200]"
          @size-change="onJournalPageSizeChange" @current-change="onJournalPageChange" />
      </div>



      <ElDialog v-model="linkDialogVisible" title="关联凭证" width="min(61.25rem, 94vw)">
        <div class="flex items-center gap-3">
          <ElDatePicker v-model="voucherMonth" type="month" value-format="YYYY-MM" class="w-[140px]"
            @change="() => { voucherPageNo = 1; loadVoucherPage(); }" />
          <div class="text-xs text-muted-foreground">
            已选日记账行：{{ selected.length }} 条（点击凭证“关联”即可绑定到所选行）
          </div>
        </div>

        <div class="mt-3">
          <ElTable v-loading="voucherLoading" :data="voucherRows" border
            :row-key="(row: any) => row.rowType === 'detail' ? row.parentId + '-detail-' + row.detailId : row.id + '-main'"
            :row-class-name="voucherLinkRowClass">
            <ElTableColumn prop="date" label="凭证日期" width="120">
              <template #default="{ row }">
                <span v-if="(row as any).rowType === 'main'">{{ (row as any).date }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="voucherNo" label="凭证字号" width="140">
              <template #default="{ row }">
                <span v-if="(row as any).rowType === 'main'">{{ (row as any).voucherNo }}</span>
                <span v-else class="voucher-detail-indent">明细</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="summary" label="摘要" min-width="220">
              <template #default="{ row }">
                <span>{{ (row as any).summary }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="科目" min-width="200">
              <template #default="{ row }">
                <span v-if="(row as any).rowType === 'detail'" class="voucher-detail-subject">
                  {{ String((row as any).accountCode || '') }} {{ String((row as any).accountName || '') }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="debitTotal" label="借方金额" width="120" align="right">
              <template #default="{ row }">{{ fmtMoney((row as any).debitTotal) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="creditTotal" label="贷方金额" width="120" align="right">
              <template #default="{ row }">{{ fmtMoney((row as any).creditTotal) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="maker" label="制单人" width="120">
              <template #default="{ row }">
                <span v-if="(row as any).rowType === 'main'">{{ (row as any).maker }}</span>
              </template>
            </ElTableColumn>

            <ElTableColumn label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <ElButton v-if="(row as any).rowType === 'main'" link type="primary"
                  @click="linkVoucherToSelected(row)">关联</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>

          <div class="mt-3 flex items-center justify-between">
            <div class="text-xs text-muted-foreground">
              单据关联凭证后，后续可按业务将单据附件自动添加到凭证附件中（业务逻辑待后端支持）。
            </div>
            <ElPagination background layout="total, sizes, prev, pager, next" :total="voucherTotal"
              :page-size="voucherPageSize" :current-page="voucherPageNo" @current-change="onVoucherPageChange"
              @size-change="onVoucherSizeChange" />
          </div>
        </div>

        <template #footer>
          <ElButton @click="linkDialogVisible = false">取消</ElButton>
        </template>
      </ElDialog>
    </div>

    <ElDialog v-model="addAccountDialogVisible" title="新增现金账户" width="min(420px, 92vw)" destroy-on-close
      class="add-account-dialog">
      <div class="add-account-form">

        <div class="add-account-form__item">
          <span class="add-account-form__label add-account-form__label--required">账户名称</span>
          <ElInput v-model="addAccountForm.account_name" placeholder="请输入账户名称" />
        </div>

        <div class="add-account-form__item">
          <span class="add-account-form__label">期初余额</span>
          <ElInputNumber v-model="addAccountForm.initial_amount" :controls="false" class="add-account-form__number" />
        </div>
        <div class="add-account-form__item">
          <span class="add-account-form__label">备注</span>
          <ElInput v-model="addAccountForm.remark" type="textarea" :rows="2" placeholder="可选" />
        </div>
      </div>
      <template #footer>
        <ElButton @click="addAccountDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="addAccountSaving" @click="saveAddAccount">保存</ElButton>
      </template>
    </ElDialog>
    <input ref="importFileRef" class="import-file-input" type="file" accept=".xlsx,.xls" @change="onImportFileChange" />
    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.journal-page {
  gap: 0 !important;
}

.journal-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 10px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  box-shadow: none;
}

.journal-toolbar__filters {
  display: grid;
  min-width: 0;
  grid-template-columns: 175px 380px;
  align-items: center;
  gap: 8px;
}

.journal-filter-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.journal-filter-item--date {
  grid-template-columns: auto 135px;
  max-width: 220px;
}

.journal-filter-item--date .journal-date-range {
  width: 300px;
}

.journal-filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.journal-account,
.journal-date-range {
  width: 100%;
}

:deep(.journal-account .el-select__wrapper),
:deep(.journal-date-range.el-date-editor) {
  min-height: 34px;
  border-radius: 8px;
}

:deep(.journal-account .el-select__selected-item) {
  font-weight: 500;
}

.journal-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  row-gap: 6px;
}

.journal-show-all {
  margin-right: 4px;
  white-space: nowrap;
}


/* 紧凑化：工具栏和表头间距 */
:deep(.journal-toolbar .el-button) {
  min-height: 32px;
  padding: 0 12px;
}

:deep(.journal-toolbar .el-checkbox) {
  height: 32px;
  margin-right: 2px;
}

:deep(.journal-toolbar .el-input__wrapper),
:deep(.journal-toolbar .el-select__wrapper),
:deep(.journal-toolbar .el-date-editor) {
  min-height: 32px;
}

:deep(.journal-print-wrap .el-table__header th) {
  height: 36px;
  padding: 4px 0;
  background: var(--el-fill-color-light);
}

:deep(.journal-print-wrap .el-table__header th .cell) {
  padding: 0 10px;
  line-height: 20px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.journal-print-wrap .el-table__body td) {
  padding: 3px 0;
}

:deep(.journal-print-wrap .el-table__body td .cell) {
  padding: 0 10px;
  line-height: 22px;
}

:deep(.journal-print-wrap .el-input-number .el-input__wrapper),
:deep(.journal-print-wrap .el-input .el-input__wrapper),
:deep(.journal-print-wrap .el-select .el-select__wrapper),
:deep(.journal-print-wrap .el-date-editor) {
  min-height: 30px;
}

@media (max-width: 900px) {
  .journal-toolbar__filters {
    grid-template-columns: 1fr;
  }
}

/* 小屏适配：避免工具栏按钮和表头被挤压 */
@media (max-width: 1280px) {
  .journal-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .journal-toolbar__filters {
    grid-template-columns: 165px 360px;
    gap: 6px 8px;
  }

  .journal-toolbar__actions {
    justify-content: flex-start;
    gap: 6px;
  }

  :deep(.journal-toolbar .el-button) {
    padding: 0 10px;
  }
}

@media (max-width: 1024px) {
  .journal-toolbar {
    padding: 6px 8px;
  }

  .journal-toolbar__filters {
    grid-template-columns: 158px 340px;
  }

  .journal-filter-label {
    font-size: 12px;
  }

  .journal-toolbar__actions {
    width: 100%;
  }

  :deep(.journal-toolbar .el-button) {
    min-height: 30px;
    padding: 0 8px;
    font-size: 12px;
  }

  :deep(.journal-toolbar .el-checkbox__label) {
    font-size: 12px;
  }

  :deep(.journal-print-wrap .el-table__header th .cell),
  :deep(.journal-print-wrap .el-table__body td .cell) {
    padding: 0 7px;
  }
}

@media (max-width: 768px) {
  .journal-toolbar__filters {
    grid-template-columns: 1fr;
  }

  .journal-filter-item {
    grid-template-columns: 58px minmax(0, 1fr);
  }

  .journal-toolbar__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  :deep(.journal-toolbar .el-button),
  :deep(.journal-toolbar .el-dropdown),
  :deep(.journal-toolbar .el-dropdown .el-button) {
    width: 100%;
  }

  .journal-show-all {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    margin-right: 0;
  }

  :deep(.journal-print-wrap .el-table__header th) {
    height: 32px;
  }

  :deep(.journal-print-wrap .el-table__header th .cell) {
    padding: 0 5px;
    font-size: 12px;
    line-height: 18px;
  }

  :deep(.journal-print-wrap .el-table__body td .cell) {
    padding: 0 5px;
    line-height: 20px;
    font-size: 12px;
  }
}





/* 账户下拉层级展示 */
.account-option-tree {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0;
}

.account-option-tree__code {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.account-option-tree__root,
.account-option-tree__separator {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
}

.account-option-tree__separator {
  padding: 0 2px;
}

.io-type-subject {
  float: right;
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.account-option-tree__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作列紧凑化 */
:deep(.journal-print-wrap .el-table__body td:last-child .cell) {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  white-space: nowrap;
}

:deep(.journal-print-wrap .el-table__body td:last-child .el-button) {
  margin-left: 0;
  padding: 0 2px;
  font-size: 12px;
}

:deep(.journal-print-wrap .el-table__header th:last-child .cell) {
  padding: 0 6px;
}

/* 账户下拉紧凑化：现金账户/银行账户选择框单独缩窄 */
.journal-filter-item--account {
  grid-template-columns: auto 290px;
  max-width: 205px;
}

.journal-filter-item--account .journal-account {
  width: 140px;
}

:deep(.journal-filter-item--account .el-select__wrapper) {
  min-height: 30px;
  padding-left: 10px;
  padding-right: 8px;
}

:deep(.journal-filter-item--account .el-select__selected-item) {
  font-size: 13px;
}

@media (max-width: 1024px) {
  .journal-filter-item--account {
    grid-template-columns: auto 135px;
    max-width: 195px;
  }

  .journal-filter-item--account .journal-account {
    width: 125px;
  }

  .journal-filter-item--date {
    grid-template-columns: auto 205px;
    max-width: 360px;
  }

  .journal-filter-item--date .journal-date-range {
    width: 290px;
  }
}

@media (max-width: 768px) {
  .journal-filter-item--account {
    grid-template-columns: 58px minmax(0, 1fr);
    max-width: 100%;
    overflow: visible;
  }

  .journal-filter-item--account .journal-account {
    width: 140px;
  }

  .journal-filter-item--date {
    grid-template-columns: 58px 280px;
    max-width: 258px;
  }

  .journal-filter-item--date .journal-date-range {
    width: 300px;
  }

  :deep(.journal-filter-item--account .el-select__wrapper) {
    min-height: 28px;
  }
}

/* 小屏完整展示：允许表头和内容换行，不做省略 */
:deep(.journal-print-wrap .el-table .cell) {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
}

:deep(.journal-print-wrap .el-table__header th),
:deep(.journal-print-wrap .el-table__body td) {
  height: auto;
}

:deep(.journal-print-wrap .el-table__header th .cell) {
  min-height: 20px;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: break-word;
}

:deep(.journal-print-wrap .el-table__body td .cell) {
  min-height: 22px;
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (max-width: 1024px) {
  .journal-print-wrap {
    overflow: auto;
  }

  :deep(.journal-print-wrap .el-table) {
    min-width: 1180px;
  }

  :deep(.journal-print-wrap .el-table__header th .cell) {
    min-height: 18px;
  }

  :deep(.journal-print-wrap .el-table__body td .cell) {
    min-height: 20px;
  }
}

@media (max-width: 768px) {
  :deep(.journal-print-wrap .el-table) {
    min-width: 1080px;
  }

  .journal-toolbar__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 日期范围控件需要容纳完整 YYYY-MM-DD 至 YYYY-MM-DD，避免文字重叠 */
.journal-filter-item--date {
  grid-template-columns: auto 300px;
  max-width: 370px;
}

.journal-filter-item--date .journal-date-range {
  width: 300px;
}

@media (max-width: 1024px) {
  .journal-filter-item--date {
    grid-template-columns: auto 290px;
    max-width: 360px;
  }

  .journal-filter-item--date .journal-date-range {
    width: 290px;
  }
}

@media (max-width: 768px) {
  .journal-filter-item--date {
    grid-template-columns: 58px minmax(260px, 1fr);
    max-width: 100%;
  }

  .journal-filter-item--date .journal-date-range {
    width: min(300px, 100%);
  }
}

/* 筛选项防重叠：账户下拉不得覆盖右侧“日期范围”标签 */
.journal-toolbar__filters {
  grid-template-columns: 175px 380px;
}

.journal-filter-item--account {
  grid-template-columns: auto 112px;
  max-width: 175px;
  overflow: hidden;
}

.journal-filter-item--account .journal-account {
  width: 112px;
}

.journal-filter-item--date {
  position: relative;
  z-index: 1;
}

@media (max-width: 1024px) {
  .journal-toolbar__filters {
    grid-template-columns: 165px 360px;
  }

  .journal-filter-item--account {
    grid-template-columns: auto 106px;
    max-width: 165px;
  }

  .journal-filter-item--account .journal-account {
    width: 106px;
  }
}

@media (max-width: 768px) {
  .journal-toolbar__filters {
    grid-template-columns: 1fr;
  }

  .journal-filter-item--account {
    grid-template-columns: 58px minmax(0, 1fr);
    max-width: 100%;
    overflow: visible;
  }

  .journal-filter-item--account .journal-account {
    width: min(180px, 100%);
  }
}

/* 小屏/窄容器工具栏完整展示：筛选区与按钮区分行，按钮文字不截断 */
.journal-toolbar {
  grid-template-columns: 1fr;
  align-items: stretch;
  overflow-x: auto;
}

.journal-toolbar__filters {
  width: max-content;
  max-width: 100%;
}

.journal-toolbar__actions {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  overflow: visible;
}

:deep(.journal-toolbar__actions .el-button),
:deep(.journal-toolbar__actions .el-dropdown),
:deep(.journal-toolbar__actions .el-dropdown .el-button) {
  width: auto;
  min-width: max-content;
  flex: 0 0 auto;
  white-space: nowrap;
}

.journal-show-all {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .journal-toolbar__filters {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .journal-filter-item--account,
  .journal-filter-item--date {
    max-width: 100%;
  }

  .journal-filter-item--date .journal-date-range {
    width: min(300px, 100%);
  }
}

@media (max-width: 768px) {
  .journal-toolbar__actions {
    display: flex;
    flex-wrap: wrap;
  }

  :deep(.journal-toolbar__actions .el-button),
  :deep(.journal-toolbar__actions .el-dropdown),
  :deep(.journal-toolbar__actions .el-dropdown .el-button) {
    width: auto;
    min-width: max-content;
  }
}

/* 工具栏优先单行展示：宽度足够时筛选区和按钮区同一行，放不下时再换行 */
.journal-toolbar {
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  overflow-x: visible;
}

.journal-toolbar__filters {
  width: max-content;
  max-width: 100%;
}

.journal-toolbar__actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  overflow: visible;
}

:deep(.journal-toolbar__actions .el-button),
:deep(.journal-toolbar__actions .el-dropdown),
:deep(.journal-toolbar__actions .el-dropdown .el-button) {
  width: auto;
  min-width: max-content;
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .journal-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
    overflow-x: auto;
  }

  .journal-toolbar__filters {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .journal-toolbar__actions {
    display: flex;
    flex-wrap: wrap;
  }
}

/* 工具栏单行安全间距：防止日期范围控件遮住“新增一行”等按钮左侧文字 */
.journal-toolbar {
  column-gap: 18px;
}

.journal-toolbar__filters {
  flex: 0 0 auto;
  padding-right: 4px;
}

.journal-toolbar__actions {
  position: relative;
  z-index: 2;
  padding-left: 2px;
}

.journal-filter-item--date {
  z-index: 0;
}

@media (max-width: 1280px) {
  .journal-toolbar {
    column-gap: 0;
    row-gap: 8px;
  }

  .journal-toolbar__actions {
    padding-left: 0;
  }
}

/* 工具栏换行规则：一行放不下时改为两列按钮区，按钮文字不拆行 */
.journal-toolbar__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
}

:deep(.journal-toolbar__actions .el-button),
:deep(.journal-toolbar__actions .el-dropdown),
:deep(.journal-toolbar__actions .el-dropdown .el-button),
.journal-show-all {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 1440px) {
  .journal-toolbar__actions {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    grid-auto-flow: row;
    align-items: center;
    justify-content: start;
    column-gap: 8px;
    row-gap: 6px;
  }

  :deep(.journal-toolbar__actions .el-button),
  :deep(.journal-toolbar__actions .el-dropdown),
  :deep(.journal-toolbar__actions .el-dropdown .el-button) {
    width: auto;
    min-width: max-content;
    white-space: nowrap;
  }

  .journal-show-all {
    width: max-content;
    min-width: max-content;
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .journal-toolbar__actions {
    grid-template-columns: repeat(2, max-content);
    overflow-x: auto;
  }
}

/* 工具栏横向流式布局：不做右侧竖向两列；放不下时整组横向换行 */
.journal-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  overflow-x: visible;
}

.journal-toolbar__filters {
  flex: 0 0 auto;
  width: auto;
  max-width: 100%;
}

.journal-toolbar__actions {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  overflow: visible;
}

:deep(.journal-toolbar__actions .el-button),
:deep(.journal-toolbar__actions .el-dropdown),
:deep(.journal-toolbar__actions .el-dropdown .el-button),
.journal-show-all {
  width: auto;
  min-width: max-content;
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 1280px) {

  .journal-toolbar__filters,
  .journal-toolbar__actions {
    flex: 0 0 100%;
  }

  .journal-toolbar {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .journal-toolbar__actions {
    display: flex;
    flex-wrap: wrap;
  }
}

/* 工具栏最终规则：宽度够时必须同一行，不再按 1280px 强制拆成两行 */
.journal-toolbar {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 8px 12px !important;
  overflow-x: auto;
}

.journal-toolbar__filters {
  flex: 0 0 auto !important;
  width: auto !important;
  max-width: none !important;
}

.journal-toolbar__actions {
  display: flex !important;
  flex: 1 1 auto !important;
  width: auto !important;
  min-width: max-content !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  overflow: visible !important;
}

:deep(.journal-toolbar__actions .el-button),
:deep(.journal-toolbar__actions .el-dropdown),
:deep(.journal-toolbar__actions .el-dropdown .el-button),
.journal-show-all {
  width: auto !important;
  min-width: max-content !important;
  flex: 0 0 auto !important;
  white-space: nowrap !important;
}

@media (max-width: 768px) {
  .journal-toolbar {
    flex-wrap: nowrap !important;
    overflow-x: auto;
  }

  .journal-toolbar__filters,
  .journal-toolbar__actions {
    flex: 0 0 auto !important;
    width: auto !important;
  }
}

/* 工具栏最终自然换行规则：宽度够必须同一行，真正放不下才自然变两行，不按固定断点拆行 */
.journal-toolbar {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 8px 12px !important;
  overflow-x: visible !important;
}

.journal-toolbar__filters {
  flex: 0 0 auto !important;
  width: max-content !important;
  max-width: 100% !important;
}

.journal-toolbar__actions {
  display: flex !important;
  flex: 0 0 auto !important;
  width: max-content !important;
  max-width: 100% !important;
  min-width: max-content !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}

:deep(.journal-toolbar__actions .el-button),
:deep(.journal-toolbar__actions .el-dropdown),
:deep(.journal-toolbar__actions .el-dropdown .el-button),
.journal-show-all {
  width: auto !important;
  min-width: max-content !important;
  flex: 0 0 auto !important;
  white-space: nowrap !important;
}

@media (max-width: 1280px) {
  .journal-toolbar {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
  }

  .journal-toolbar__filters,
  .journal-toolbar__actions {
    flex-basis: auto !important;
    width: max-content !important;
  }
}

@media (max-width: 768px) {
  .journal-toolbar {
    display: flex !important;
    flex-wrap: wrap !important;
  }

  .journal-toolbar__filters,
  .journal-toolbar__actions {
    flex: 0 0 auto !important;
    width: max-content !important;
    max-width: 100% !important;
  }
}

.print-header {
  display: none;
  text-align: center;
}

.print-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.5;
}

.print-meta {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #4b5563;
}

.required-column::before {
  content: '*';
  margin-right: 2px;
  color: var(--el-color-danger);
}

.journal-print-wrap {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 0 0 10px 10px;
}

.init-balance-input {
  width: 96px;
  max-width: 100%;
}

:deep(.init-balance-input .el-input__wrapper) {
  box-sizing: border-box;
  width: 100%;
  padding-left: 6px;
  padding-right: 6px;
}

:deep(.init-balance-input .el-input__inner) {
  text-align: right;
}

:deep(.row-init td) {
  font-weight: 600;
}

:deep(.row-sum td) {
  font-weight: 600;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  .journal-page {
    display: block !important;
    background: #fff;
    color: #000;
  }

  .print-header {
    display: block;
    margin-bottom: 10px;
  }

  .screen-toolbar,
  .screen-footer,
  .el-dialog__wrapper,
  .el-overlay,
  .el-pagination,
  :deep(.el-table__fixed),
  :deep(.el-table__fixed-right),
  :deep(.el-table-column--selection),
  :deep(.el-table .cell .el-button),
  :deep(.el-table .cell .el-link),
  :deep(.el-table th.is-hidden),
  :deep(.el-table td.is-hidden),
  :deep(.el-table__header-wrapper colgroup col:first-child),
  :deep(.el-table__body-wrapper colgroup col:first-child),
  :deep(.el-table__header-wrapper th:first-child),
  :deep(.el-table__body-wrapper td:first-child),
  :deep(.el-table__header-wrapper th:last-child),
  :deep(.el-table__body-wrapper td:last-child) {
    display: none !important;
  }

  .journal-print-wrap {
    overflow: visible !important;
    min-height: auto !important;
    flex: none !important;
    border: 1px solid #d1d5db;
    border-radius: 0 !important;
  }

  :deep(.el-table) {
    width: 100% !important;
    font-size: 12px;
  }

  :deep(.el-table__inner-wrapper)::before,
  :deep(.el-table::before) {
    display: none !important;
  }

  :deep(.el-table th),
  :deep(.el-table td) {
    border-color: #d1d5db !important;
    padding: 6px 8px !important;
    color: #000 !important;
    background: #fff !important;
  }

  :deep(.el-table .cell) {
    white-space: normal;
    word-break: break-word;
    line-height: 1.45;
  }

  :deep(.row-init td),
  :deep(.row-sum td) {
    background: #f5f5f5 !important;
    font-weight: 700 !important;
  }
}

.import-file-input {
  display: none;
}

.print-frame {
  position: fixed;
  right: 100%;
  bottom: 100%;
  width: 0;
  height: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

:deep(.voucher-link-row-class .cell) {
  line-height: 22px;
}

:deep(.voucher-link-detail-row) {
  background: var(--el-fill-color-lighter);
}

.voucher-detail-indent {
  padding-left: 14px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.voucher-detail-subject {
  color: var(--el-text-color-regular);
}

:global(.journal-account-select-popper) {
  width: 250px !important;
  min-width: 250px !important;
  max-width: 250px !important;
}

:global(.journal-account-select-popper .el-select-dropdown) {
  width: 250px !important;
  min-width: 250px !important;
  max-width: 250px !important;
}

:global(.journal-account-select-popper .el-select-dropdown__wrap),
:global(.journal-account-select-popper .el-select-dropdown__list),
:global(.journal-account-select-popper .el-select-dropdown__item) {
  width: 250px !important;
  max-width: 250px !important;
  box-sizing: border-box;
}

:global(.journal-account-select-popper .el-select-dropdown__item) {
  padding: 0 8px;
}

:global(.journal-account-select-popper .account-option-tree) {
  display: flex;
  align-items: center;
  min-height: 32px;
  color: var(--el-color-primary);
  font-size: 14px;
  white-space: nowrap;
}

:global(.journal-account-select-popper .el-select-dropdown__item.is-disabled .account-option-tree) {
  color: var(--el-color-primary);
  opacity: 0.72;
  cursor: not-allowed;
}

:global(.journal-account-select-popper .account-option-tree__name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.journal-account-select-popper .el-select-dropdown__footer),
:global(.journal-account-select-popper .journal-account-select-footer) {
  width: 250px !important;
  max-width: 250px !important;
  box-sizing: border-box;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

:global(.journal-account-select-popper .journal-account-select-footer__row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 0 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
  font-size: 14px;
  gap: 8px;
}

:global(.journal-account-select-popper .journal-account-select-footer__plain),
:global(.journal-account-select-popper .journal-account-select-footer__add) {
  border: 0;
  background: transparent;
  color: var(--el-text-color-primary);
  cursor: pointer;
}

:global(.journal-account-select-popper .journal-account-select-footer__plain) {
  flex: 0 0 auto;
}

:global(.journal-account-select-popper .journal-account-select-footer__switch) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  cursor: pointer;
  white-space: nowrap;
}

:global(.journal-account-select-popper .journal-account-select-footer__add) {
  display: block;
  width: 100%;
  min-height: 32px;
  text-align: center;
}



.journal-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.journal-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
  min-width: 0;
}

.journal-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  margin-left: 48px;
  white-space: nowrap;
}

.journal-show-all-checkbox {
  margin-left: 18px;
  margin-right: 4px;
  flex: 0 0 auto;
}

.io-type-add-footer {
  width: 100%;
  padding: 6px 0 2px;
  color: var(--el-color-primary);
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.io-type-add-footer:hover {
  color: var(--el-color-primary-light-3);
}


/* 现金日记账筛选宽度微调：现金账户加宽，日期范围略缩窄 */
.journal-toolbar__filters {
  grid-template-columns: 270px 304px;
}

.journal-filter-item--account {
  grid-template-columns: auto 208px;
  max-width: 280px;
  overflow: visible;
}

.journal-filter-item--account .journal-account {
  width: 208px;
}

.journal-filter-item--date {
  grid-template-columns: auto 220px;
  max-width: 292px;
}

.journal-filter-item--date .journal-date-range {
  width: 220px;
}

@media (max-width: 1024px) {
  .journal-toolbar__filters {
    grid-template-columns: 260px 292px;
  }

  .journal-filter-item--account {
    grid-template-columns: auto 198px;
    max-width: 260px;
  }

  .journal-filter-item--account .journal-account {
    width: 198px;
  }

  .journal-filter-item--date {
    grid-template-columns: auto 210px;
    max-width: 280px;
  }

  .journal-filter-item--date .journal-date-range {
    width: 210px;
  }
}

@media (max-width: 768px) {
  .journal-toolbar__filters {
    grid-template-columns: 1fr;
  }

  .journal-filter-item--account,
  .journal-filter-item--date {
    grid-template-columns: 58px minmax(0, 1fr);
    max-width: 100%;
  }

  .journal-filter-item--account .journal-account,
  .journal-filter-item--date .journal-date-range {
    width: min(260px, 100%);
  }
}


/* 日期范围强制收窄：覆盖 Element Plus daterange 默认宽度/最小宽度 */
.journal-filter-item--date {
  grid-template-columns: auto 220px;
  max-width: 292px;
}

.journal-filter-item--date .journal-date-range,
:deep(.journal-filter-item--date .journal-date-range.el-date-editor) {
  width: 220px !important;
  min-width: 220px !important;
  max-width: 220px !important;
}

@media (max-width: 1024px) {
  .journal-filter-item--date {
    grid-template-columns: auto 210px;
    max-width: 280px;
  }

  .journal-filter-item--date .journal-date-range,
  :deep(.journal-filter-item--date .journal-date-range.el-date-editor) {
    width: 210px !important;
    min-width: 210px !important;
    max-width: 210px !important;
  }
}
</style>
