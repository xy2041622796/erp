<script lang="tsx" setup>
import type { PropType } from 'vue';

import type { SubjectOption } from '#/views/finance/Voucher/modules/VoucherSubjectPicker.vue';

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Delete, Plus } from '@element-plus/icons-vue';
import {
  ElButton,
  ElIcon,
  ElInput,
  ElOption,
  ElPopover,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import MoneyGridInput from '#/components/money-grid-input/MoneyGridInput.vue';
import { addMoney, moneyNumber, moneyText, subMoney, toDecimal } from '#/utils/finance/decimal-money';
import VoucherSubjectPicker from '#/views/finance/Voucher/modules/VoucherSubjectPicker.vue';

defineOptions({ name: 'VoucherEntryTable' });

const props = defineProps({
  entries: { type: Array as PropType<VoucherEntry[]>, required: true },
  mode: { type: String as PropType<Mode>, required: true },
  subjectOptions: { type: Array as PropType<SubjectOption[]>, required: true },
  subjectCurrentBalanceMap: {
    type: Object as PropType<Record<string, number>>,
    default: () => ({}),
  },
  subjectLedgerRowBalanceMap: {
    type: Object as PropType<Record<string, number>>,
    default: () => ({}),
  },
  subjectLoading: { type: Boolean, required: true },
  auxiliaryOptionsMap: {
    type: Object as PropType<Record<string, Array<{ label: string; value: string }>>>,
    default: () => ({}),
  },
  subjectRemoteMethod: {
    type: Function as PropType<(reason?: string) => Promise<void> | void>,
    required: true,
  },
  tableHeight: {
    type: [Number, String] as PropType<number | string>,
    default: undefined,
  },
  allowNonLeafSubject: { type: Boolean, default: false },
});
const emit = defineEmits<{
  append: [];
  clear: [row: VoucherEntry];
  'credit-change': [row: VoucherEntry, value: number | undefined];
  'debit-change': [row: VoucherEntry, value: number | undefined];
  'insert-after': [row: VoucherEntry];
  remove: [row: VoucherEntry];
  'subject-select': [row: VoucherEntry, option: SubjectOption];
  'auxiliary-change': [row: VoucherEntry, auxiliaries: NonNullable<VoucherEntry['auxiliaries']>];
}>();
type Mode = 'create' | 'detail' | 'edit';
type ColumnKey = 'credit' | 'debit' | 'subject' | 'summary';
type NavigateDir = 'down' | 'left' | 'right' | 'up';
type BalanceDirection = '' | 'credit' | 'debit';

type BalanceMeta = {
  amountText: string;
  directionText: string;
  isNegative: boolean;
  signedText: string;
  toneClass: string;
};

export type VoucherEntry = {
  auxiliaries?: Array<{
    dimCode: string;
    label: string;
    required?: boolean;
    value?: string;
    valueName?: string;
  }>;
  credit?: number;
  creditUpper?: string;
  debit?: number;
  debitUpper?: string;
  detailId?: string;
  rowid: string;
  subject?: string;
  summary?: string;
};

const columns: ColumnKey[] = ['summary', 'subject', 'debit', 'credit'];
const amountHeaderPositions = [
  '亿',
  '千',
  '百',
  '十',
  '万',
  '千',
  '百',
  '十',
  '元',
  '角',
  '分',
] as const;
const subjectOptionCache = ref<Record<string, SubjectOption>>({});
const amountEditedRowIds = ref<Record<string, boolean>>({});
const activeAuxiliaryPopoverRowId = ref('');
const pendingAuxiliaryRowId = ref('');
const auxiliarySummaryTextMap = ref<Record<string, string>>({});
const viewportWidth = ref(
  typeof window === 'undefined' ? 1440 : window.innerWidth,
);

function updateViewportWidth() {
  if (typeof window === 'undefined') return;
  viewportWidth.value = window.innerWidth;
}

onMounted(() => {
  updateViewportWidth();
  window.addEventListener('resize', updateViewportWidth, { passive: true });
  document.addEventListener('mousedown', handleDocumentMouseDown, true);
  document.addEventListener('keydown', handleDocumentKeydown, true);
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('resize', updateViewportWidth);
  document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  document.removeEventListener('keydown', handleDocumentKeydown, true);
});

const auxiliaryPopoverWidth = computed(() => {
  const width = viewportWidth.value;
  if (width <= 768) return 280;
  if (width <= 980) return 320;
  if (width <= 1180) return 360;
  return 420;
});

const tableCols = computed(() => {
  const width = viewportWidth.value;
  if (width <= 768) {
    return {
      action: 38,
      amount: 108,
      fixedIndex: false as const,
      index: 30,
      subject: 128,
      summary: 72,
    };
  }
  if (width <= 980) {
    return {
      action: 42,
      amount: 120,
      fixedIndex: false as const,
      index: 34,
      subject: 145,
      summary: 86,
    };
  }
  if (width <= 1280) {
    return {
      action: 48,
      amount: 150,
      fixedIndex: false as const,
      index: 40,
      subject: 184,
      summary: 112,
    };
  }
  return {
    action: 58,
    amount: 190,
    fixedIndex: 'left' as const,
    index: 48,
    subject: 240,
    summary: 140,
  };
});

const subjectOptionMap = computed(() => {
  const map = new Map<string, SubjectOption>();
  for (const opt of props.subjectOptions ?? []) {
    const key = String(opt?.value ?? '').trim();
    if (key) map.set(key, opt);
  }
  for (const opt of Object.values(subjectOptionCache.value)) {
    const key = String(opt?.value ?? '').trim();
    if (key && !map.has(key)) map.set(key, opt);
  }
  return map;
});

function rememberSubjectOption(opt?: null | SubjectOption) {
  const key = String(opt?.value ?? '').trim();
  if (!key || !opt) return;
  subjectOptionCache.value = {
    ...subjectOptionCache.value,
    [key]: opt,
  };
}

watch(
  () => props.subjectOptions,
  () => {
    // 科目列表可能很大，不复制到响应式缓存；选中过的科目由 handleSubjectSelect 精准缓存。
  },
  { immediate: true },
);

watch(
  () => (props.entries || []).map((row) => row.rowid).join('|'),
  () => {
    const validRowIds = new Set((props.entries || []).map((row) => row.rowid));
    const next: Record<string, boolean> = {};
    for (const rowid of Object.keys(amountEditedRowIds.value)) {
      if (validRowIds.has(rowid)) next[rowid] = true;
    }
    amountEditedRowIds.value = next;
  },
);

watch(
  () =>
    (props.entries || [])
      .map((row) => `${row.rowid}:${Array.isArray(row.auxiliaries) ? row.auxiliaries.length : 0}`)
      .join('|'),
  async () => {
    const rowid = pendingAuxiliaryRowId.value;
    if (!rowid) return;
    await nextTick();
    const row = (props.entries || []).find((item) => item.rowid === rowid);
    pendingAuxiliaryRowId.value = '';
    if (row) openAuxiliaryPopoverIfNeeded(row);
  },
);

function getSubjectOption(subject?: string) {
  const key = String(subject ?? '').trim();
  if (!key) return undefined;
  return subjectOptionMap.value.get(key);
}

const subjectOptionByNumber = computed(() => {
  const map = new Map<string, SubjectOption>();
  for (const opt of subjectOptionMap.value.values()) {
    const no = getSubjectNo(opt);
    if (no && !map.has(no)) map.set(no, opt);
  }
  return map;
});

function getSubjectNo(opt?: SubjectOption) {
  return String(opt?.raw?.subject_number ?? opt?.value ?? '').trim();
}

function normalizeSubjectBalanceKey(code: any) {
  return String(code ?? '').trim().replace(/[\s._-]+/g, '');
}

function getParentSubjectNo(opt?: SubjectOption) {
  return String(opt?.raw?.parent_subject_number ?? '').trim();
}

function getSubjectName(opt?: SubjectOption) {
  const raw = opt?.raw ?? {};
  const name = String(
    raw?.subject_name ??
      raw?.subjectName ??
      raw?.account_name ??
      raw?.accountName ??
      raw?.name ??
      raw?.description ??
      '',
  ).trim();
  if (name) return name;

  const label = String(opt?.label ?? '').trim();
  const code = getSubjectNo(opt);
  if (!label) return '';
  if (code && label.startsWith(code)) return label.slice(code.length).trim();
  return label;
}

function buildSubjectNamePath(opt?: SubjectOption) {
  const names: string[] = [];
  let current = opt;
  let guard = 0;

  while (current && guard < 20) {
    const name = getSubjectName(current);
    if (name) names.unshift(name);
    const parentNo = getParentSubjectNo(current);
    if (!parentNo) break;
    current = subjectOptionByNumber.value.get(parentNo);
    guard += 1;
  }

  return names;
}

function buildSubjectDisplayLabel(subject?: string) {
  const key = String(subject ?? '').trim();
  if (!key) return '';
  const opt = getSubjectOption(key);
  const code = getSubjectNo(opt) || key;
  const pathText = buildSubjectNamePath(opt).join('-');
  if (code && pathText) return code + ' ' + pathText;
  return String(opt?.label ?? code).trim();
}

function getOptBalance(opt?: SubjectOption): number | string | undefined {
  const raw = opt?.raw ?? {};
  // 凭证分录里的“余额”表示所选科目的当前余额，不表示本行已录入的发生额。
  // 优先使用 form.vue 从科目余额表封装进来的 currentBalance / endingBalance，
  // 最后才兼容旧字段，避免误把其它 balance 字段当成当前科目余额。
  return (
    raw?.currentBalance ??
    raw?.current_balance ??
    raw?.endingBalance ??
    raw?.ending_balance ??
    raw?.subject_balance ??
    raw?.yue ??
    raw?.remain ??
    raw?.available ??
    raw?.left ??
    raw?.balance
  );
}

function getOptBalanceDirection(opt?: SubjectOption): BalanceDirection {
  const raw = opt?.raw ?? {};
  const value = String(
    raw?.balance_direction ??
      raw?.balanceDirection ??
      raw?.direction ??
      raw?.dc ??
      '',
  )
    .trim()
    .toLowerCase();

  if (!value) return '';
  if (
    ['debit', 'dr', '借方'].includes(value) ||
    value === '1' ||
    value.includes('借')
  )
    return 'debit';
  if (
    ['cr', 'credit', '贷方'].includes(value) ||
    value === '2' ||
    value.includes('贷')
  )
    return 'credit';
  return '';
}

function toFiniteNumber(v: any) {
  const n = toDecimal(v);
  return n.isFinite() ? n.toNumber() : 0;
}

function directionLabel(direction: BalanceDirection) {
  if (direction === 'debit') return '借';
  if (direction === 'credit') return '贷';
  return '';
}

function directionToneClass(direction: BalanceDirection) {
  return direction === 'credit' ? 'is-credit' : 'is-debit';
}

function getEntrySignedDelta(entry: VoucherEntry) {
  return moneyNumber(subMoney(entry.debit, entry.credit, 'round', 6));
}

function calculateLedgerAlignedVoucherBalance(data: {
  baseBalance: number;
  entries: VoucherEntry[];
  row: VoucherEntry;
  subject: string;
}) {
  const subject = String(data.subject ?? '').trim();
  let running = moneyNumber(data.baseBalance);
  if (!subject) return running;

  for (const entry of data.entries ?? []) {
    if (normalizeSubjectBalanceKey(entry.subject) === normalizeSubjectBalanceKey(subject)) {
      running = moneyNumber(addMoney([running, getEntrySignedDelta(entry)]));
    }
    if (entry.rowid === data.row.rowid) break;
  }

  return running;
}

function getDirectLedgerRowBalance(row: VoucherEntry) {
  const detailKey = String(row.detailId ?? '').trim();
  const rowKey = String(row.rowid ?? '').trim();
  const value =
    (detailKey ? props.subjectLedgerRowBalanceMap?.[detailKey] : undefined) ??
    (rowKey ? props.subjectLedgerRowBalanceMap?.[rowKey] : undefined);
  return value === undefined ? undefined : toFiniteNumber(value);
}

function getSubjectBaseBalance(subject: string, opt?: SubjectOption) {
  const key = String(subject ?? '').trim();
  const normalizedKey = normalizeSubjectBalanceKey(subject);
  const mapValue =
    props.subjectCurrentBalanceMap?.[key] ??
    props.subjectCurrentBalanceMap?.[normalizedKey];
  if (mapValue !== undefined) return toFiniteNumber(mapValue);
  return opt ? toFiniteNumber(getOptBalance(opt)) : 0;
}

function getRowBalanceMeta(row: VoucherEntry): BalanceMeta | null {
  if (!row.subject) return null;
  const opt = getSubjectOption(row.subject);

  const directLedgerBalance = getDirectLedgerRowBalance(row);
  const baseBalance = getSubjectBaseBalance(row.subject, opt);
  // 已保存凭证优先直接使用明细账流水中当前分录发生后的余额；
  // 未保存或明细账未返回当前分录时，再用明细账给出的当前凭证前余额 + 表单当前行滚动。
  const currentBalance = directLedgerBalance ?? calculateLedgerAlignedVoucherBalance({
    baseBalance,
    entries: props.entries ?? [],
    row,
    subject: row.subject,
  });
  // 科目下方的“余额”只展示余额金额，和借/贷方向无关。
  // 不再按正负号或科目方向推导“借/贷”，也不再取绝对值；负数按余额本身显示负号。
  const balanceText = moneyText(toDecimal(currentBalance));
  const isNegativeBalance = currentBalance < 0;

  return {
    amountText: balanceText,
    directionText: '',
    isNegative: isNegativeBalance,
    signedText: balanceText,
    toneClass: isNegativeBalance ? 'is-negative' : 'is-debit',
  };
}

const rowBalanceMetaMap = computed(() => {
  const map = new Map<string, BalanceMeta>();
  for (const row of props.entries ?? []) {
    const meta = getRowBalanceMeta(row);
    if (meta) map.set(row.rowid, meta);
  }
  return map;
});

function getCachedRowBalanceMeta(row: VoucherEntry): BalanceMeta | null {
  return rowBalanceMetaMap.value.get(row.rowid) ?? null;
}

function getDisplayAuxiliaryLabel(aux: { dimCode: string; label?: string }) {
  const raw = String(aux?.label ?? '').trim();
  const code = String(aux?.dimCode ?? '').trim();
  if (!raw || /^AUX\d+$/i.test(raw) || raw === code) {
    const map: Record<string, string> = {
      CUSTOMER: '客户',
      SUPPLIER: '供应商',
      STAFF: '职员',
      EMPLOYEE: '职员',
      DEPT: '部门',
      PROJECT: '项目',
      PRODUCT: '存货',
      CASHFLOW: '现金流',
    };
    return map[code.toUpperCase()] || code;
  }
  return raw;
}

function getAuxiliaryDisplayText(row: VoucherEntry) {
  const list = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
  if (list.length === 0) return '';
  const parts = list.map((aux) => {
    const options = props.auxiliaryOptionsMap?.[aux.dimCode] || [];
    const selected = options.find((opt) => String(opt.value) === String(aux.value));
    const valueText = selected?.label || aux.value || '未选择';
    return `${getDisplayAuxiliaryLabel(aux)}:${valueText}`;
  });
  return parts.join(' / ');
}

function getAuxiliaryTriggerText(row: VoucherEntry) {
  const list = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
  const selectedCount = list.filter((aux) => String(aux.value ?? '').trim()).length;
  if (selectedCount > 0) return `辅助核算(${selectedCount})`;
  return '辅助核算';
}

function getAuxiliaryValueLabel(dimCode: string, value?: string) {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return '';
  const options = props.auxiliaryOptionsMap?.[dimCode] || [];
  return String(
    options.find((opt) => String(opt.value) === normalizedValue)?.label ||
      normalizedValue,
  ).trim();
}

function buildAuxiliarySummaryText(row: VoucherEntry) {
  const list = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
  return list
    .map((aux) => {
      const valueText = getAuxiliaryValueLabel(aux.dimCode, aux.value);
      if (!valueText) return '';
      const label = getDisplayAuxiliaryLabel(aux);
      return [label, valueText].filter(Boolean).join(':');
    })
    .filter(Boolean)
    .join(' / ');
}

function stripPreviousAuxiliarySummary(row: VoucherEntry) {
  const previous = String(auxiliarySummaryTextMap.value[row.rowid] || '').trim();
  const current = String(row.summary || '').trim();
  if (!previous || !current) return current;
  if (current === previous) return '';
  const suffix = ` | ${previous}`;
  if (current.endsWith(suffix)) return current.slice(0, -suffix.length).trim();
  return current;
}

function syncAuxiliarySummaryToRow(row: VoucherEntry) {
  const baseSummary = stripPreviousAuxiliarySummary(row);
  const auxiliarySummary = buildAuxiliarySummaryText(row);
  auxiliarySummaryTextMap.value = {
    ...auxiliarySummaryTextMap.value,
    [row.rowid]: auxiliarySummary,
  };
  row.summary = [baseSummary, auxiliarySummary].filter(Boolean).join(' | ');
}

function hasAuxiliary(row: VoucherEntry) {
  return Array.isArray(row.auxiliaries) && row.auxiliaries.length > 0;
}

function openAuxiliaryPopoverIfNeeded(row: VoucherEntry) {
  if (props.mode === 'detail') return;
  if (!hasAuxiliary(row)) return;
  activeAuxiliaryPopoverRowId.value = row.rowid;
}

function hasUnselectedRequiredAuxiliary(row: VoucherEntry) {
  const list = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
  return list.some((aux: any) => Boolean(aux.required) && !String(aux.value ?? '').trim());
}

function closeAuxiliaryPopover(row?: VoucherEntry) {
  if (row && hasUnselectedRequiredAuxiliary(row)) return;
  if (!row || activeAuxiliaryPopoverRowId.value === row.rowid) {
    activeAuxiliaryPopoverRowId.value = '';
  }
}

function handleDocumentMouseDown(event: MouseEvent) {
  if (!activeAuxiliaryPopoverRowId.value) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;

  // 点在辅助核算弹窗或其内部 ElSelect 下拉中，不关闭；点到其它凭证格子/按钮时再关闭，不阻止原点击继续执行。
  if (
    target.closest('.voucher-auxiliary-popover') ||
    target.closest('.voucher-auxiliary-select-popper') ||
    target.closest('.el-select-dropdown') ||
    target.closest('.el-select__popper')
  )
    return;
  activeAuxiliaryPopoverRowId.value = '';
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (!activeAuxiliaryPopoverRowId.value) return;
  if (event.key === 'Escape') activeAuxiliaryPopoverRowId.value = '';
}

async function handleAuxiliaryValueChange(row: VoucherEntry) {
  await nextTick();
  const list = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
  const nextAuxiliaries = list.map((item: any) => ({
    dimCode: String(item.dimCode || '').trim(),
    label: String(item.label || '').trim(),
    required: Boolean(item.required),
    value: item.value === undefined || item.value === null ? '' : String(item.value),
    valueName: getAuxiliaryValueLabel(item.dimCode, item.value) || item.valueName,
  }));
  row.auxiliaries = nextAuxiliaries;
  emit('auxiliary-change', row, nextAuxiliaries);
  syncAuxiliarySummaryToRow(row);

  const requiredSelected = nextAuxiliaries.every((item: any) => !item.required || String(item.value || '').trim());
  if (!requiredSelected) return;

  // 选中辅助核算后先保持弹层可见，让用户能确认选中值；
  // 待焦点真正切到下一个录入格后，再关闭弹层，避免选择后立即隐藏导致继续录入时状态抖动。
  await nextTick();
  navigateFrom(row, 'subject', 'right');
  await nextTick();
  closeAuxiliaryPopover(row);
}

const cellRefs = new Map<string, any>();
function cellKey(rowid: string, col: ColumnKey) {
  return `${rowid}-${col}`;
}
function setCellRef(rowid: string, col: ColumnKey) {
  return (el: any) => {
    const k = cellKey(rowid, col);
    if (el) cellRefs.set(k, el);
    else cellRefs.delete(k);
  };
}

function focusInstance(inst: any) {
  if (!inst) return;
  if (typeof inst.focus === 'function') {
    inst.focus();
    if (typeof inst.select === 'function') inst.select();
    return;
  }
  const el = inst?.$el as HTMLElement | undefined;
  const input = el?.querySelector?.('input') as HTMLInputElement | null;
  input?.focus?.();
  input?.select?.();
}

function focusCell(rowid: string, col: ColumnKey) {
  nextTick(() => {
    const inst = cellRefs.get(cellKey(rowid, col));
    focusInstance(inst);
  });
}

function closeSubjectDropdown(inst: any) {
  if (!inst) return;
  if (
    typeof inst.isExpanded === 'function' &&
    inst.isExpanded() &&
    typeof inst.toggleMenu === 'function'
  ) {
    inst.toggleMenu(false);
  }
}

function handleSubjectFocus(row: VoucherEntry) {
  if (props.mode === 'detail') return;
  nextTick(() => {
    const inst = cellRefs.get(cellKey(row.rowid, 'subject'));
    if (
      inst &&
      typeof inst.toggleMenu === 'function' &&
      typeof inst.isExpanded === 'function' &&
      !inst.isExpanded()
    ) {
      inst.toggleMenu(true);
    }
  });
}

function handleSubjectBlur(row: VoucherEntry) {
  nextTick(() => {
    const inst = cellRefs.get(cellKey(row.rowid, 'subject'));
    closeSubjectDropdown(inst);
  });
}

function handleSubjectSelect(row: VoucherEntry, opt: SubjectOption) {
  rememberSubjectOption(opt);
  pendingAuxiliaryRowId.value = row.rowid;
  emit('subject-select', row, opt);
  nextTick(() => {
    if (hasAuxiliary(row)) {
      openAuxiliaryPopoverIfNeeded(row);
      return;
    }
    pendingAuxiliaryRowId.value = '';
    navigateFrom(row, 'subject', 'right');
  });
}

function navigateFrom(row: VoucherEntry, col: ColumnKey, dir: NavigateDir) {
  const rowIndex = props.entries.findIndex((x) => x.rowid === row.rowid);
  if (rowIndex === -1) return;

  const colIndex = Math.max(0, columns.indexOf(col));
  let nextRowIndex = rowIndex;
  let nextColIndex = colIndex;

  if (dir === 'left') {
    if (colIndex > 0) nextColIndex = colIndex - 1;
    else {
      nextRowIndex = Math.max(0, rowIndex - 1);
      nextColIndex = columns.length - 1;
    }
  }

  if (dir === 'right') {
    if (colIndex < columns.length - 1) nextColIndex = colIndex + 1;
    else {
      nextRowIndex = Math.min(props.entries.length - 1, rowIndex + 1);
      nextColIndex = 0;
    }
  }

  if (dir === 'up') nextRowIndex = Math.max(0, rowIndex - 1);
  if (dir === 'down')
    nextRowIndex = Math.min(props.entries.length - 1, rowIndex + 1);

  const targetRow = props.entries[nextRowIndex];
  const targetCol = columns[nextColIndex]!;
  if (!targetRow) return;
  focusCell(targetRow.rowid, targetCol);
}

function handleCellKeydown(
  e: KeyboardEvent,
  row: VoucherEntry,
  col: ColumnKey,
) {
  if (props.mode === 'detail' || e.ctrlKey || e.metaKey || e.altKey) return;

  if (col === 'subject') {
    const inst = cellRefs.get(cellKey(row.rowid, 'subject'));
    const expanded =
      typeof inst?.isExpanded === 'function' ? inst.isExpanded() : false;

    if (expanded) {
      if (e.key === 'Tab') {
        e.preventDefault();
        closeSubjectDropdown(inst);
        navigateFrom(row, col, e.shiftKey ? 'left' : 'right');
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (
          typeof inst?.canExitByArrow === 'function' &&
          inst.canExitByArrow('left')
        ) {
          closeSubjectDropdown(inst);
          navigateFrom(row, col, 'left');
        } else if (typeof inst?.handleHorizontalArrow === 'function') {
          inst.handleHorizontalArrow('left');
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (
          typeof inst?.canExitByArrow === 'function' &&
          inst.canExitByArrow('right')
        ) {
          closeSubjectDropdown(inst);
          navigateFrom(row, col, 'right');
        } else if (typeof inst?.handleHorizontalArrow === 'function') {
          inst.handleHorizontalArrow('right');
        }
        return;
      }
      return;
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    navigateFrom(row, col, e.shiftKey ? 'left' : 'right');
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (col === 'subject') {
      const inst = cellRefs.get(cellKey(row.rowid, 'subject'));
      if (inst && typeof inst.toggleMenu === 'function') {
        inst.toggleMenu(true);
        return;
      }
    }
    navigateFrom(row, col, 'right');
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateFrom(row, col, 'left');
    return;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateFrom(row, col, 'right');
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateFrom(row, col, 'up');
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateFrom(row, col, 'down');
  }
}

function handleRemove(row: VoucherEntry) {
  if (amountEditedRowIds.value[row.rowid]) {
    const next = { ...amountEditedRowIds.value };
    delete next[row.rowid];
    amountEditedRowIds.value = next;
  }
  emit('remove', row);
}
function handleClear(row: VoucherEntry) {
  const nextMap = { ...auxiliarySummaryTextMap.value };
  delete nextMap[row.rowid];
  auxiliarySummaryTextMap.value = nextMap;
  if (amountEditedRowIds.value[row.rowid]) {
    const nextEditedMap = { ...amountEditedRowIds.value };
    delete nextEditedMap[row.rowid];
    amountEditedRowIds.value = nextEditedMap;
  }
  emit('clear', row);
}
function handleAppend() {
  emit('append');
}
function handleInsertAfter(row: VoucherEntry) {
  emit('insert-after', row);
}
function handleDebitChange(row: VoucherEntry, v?: number) {
  amountEditedRowIds.value = {
    ...amountEditedRowIds.value,
    [row.rowid]: true,
  };
  emit('debit-change', row, v);
}
function handleCreditChange(row: VoucherEntry, v?: number) {
  amountEditedRowIds.value = {
    ...amountEditedRowIds.value,
    [row.rowid]: true,
  };
  emit('credit-change', row, v);
}

function displayText(value: any) {
  return String(value ?? '').trim();
}
</script>

<template>
  <ElTable
    class="voucher-entry-table"
    :class="{ 'is-detail': props.mode === 'detail' }"
    :data="props.entries"
    border
    size="small"
    style="width: 100%"
    :height="props.tableHeight"
    :header-cell-style="{
      background: '#f5f7fa',
      color: '#303133',
      padding: '0',
    }"
    :cell-style="{ padding: '0' }"
  >
    <ElTableColumn
      label="序号"
      :width="tableCols.index"
      :fixed="tableCols.fixedIndex"
      align="center"
      header-align="center"
      class-name="voucher-index-column"
      header-class-name="voucher-index-column"
    >
      <template #default="{ $index }">
        <span>{{ $index + 1 }}</span>
      </template>
    </ElTableColumn>

    <ElTableColumn
      prop="summary"
      label="摘要"
      :min-width="tableCols.summary"
      header-align="center"
    >
      <template #default="{ row }">
        <div
          class="summary-input-wrap"
          @keydown.capture="(e) => handleCellKeydown(e as any, row, 'summary')"
        >
          <div
            v-if="props.mode === 'detail'"
            class="voucher-detail-cell-text voucher-detail-cell-text--summary"
            :title="String(row.summary || '')"
          >
            {{ displayText(row.summary) }}
          </div>
          <ElInput
            v-else
            :ref="setCellRef(row.rowid, 'summary')"
            v-model="row.summary"
            class="summary-scroll-input"
            type="textarea"
            :rows="2"
            :autosize="false"
            resize="none"
            placeholder="摘要"
            :title="row.summary || ''"
          />
        </div>
      </template>
    </ElTableColumn>

    <ElTableColumn
      prop="subject"
      label="会计科目"
      :min-width="tableCols.subject"
      header-align="center"
    >
      <template #default="{ row }">
        <div
          class="subject-cell"
          @keydown.capture="(e) => handleCellKeydown(e as any, row, 'subject')"
        >
          <div
            v-if="props.mode === 'detail'"
            class="voucher-detail-cell-text voucher-detail-cell-text--subject"
            :title="String(buildSubjectDisplayLabel(row.subject) || row.subject || '')"
          >
            {{ displayText(buildSubjectDisplayLabel(row.subject) || row.subject) }}
          </div>
          <VoucherSubjectPicker
            v-else
            :ref="setCellRef(row.rowid, 'subject')"
            v-model="row.subject"
            :options="props.subjectOptions"
            :loading="props.subjectLoading"
            :remote-method="props.subjectRemoteMethod"
            :allow-non-leaf-subject="props.allowNonLeafSubject"
            @focus="() => handleSubjectFocus(row)"
            @blur="() => handleSubjectBlur(row)"
            @select="(opt) => handleSubjectSelect(row, opt)"
          />
          <span
            v-if="row.subject && getCachedRowBalanceMeta(row)"
            class="balance-indicator"
            :class="getCachedRowBalanceMeta(row)?.toneClass"
          >
            <span class="balance-indicator__label">余额：</span>
            <span class="balance-indicator__amount">{{
              getCachedRowBalanceMeta(row)?.signedText
            }}</span>
            <span
              v-if="getCachedRowBalanceMeta(row)?.directionText"
              class="balance-indicator__direction"
            >
              （{{ getCachedRowBalanceMeta(row)?.directionText }}）
            </span>
          </span>
          <ElPopover
            v-if="hasAuxiliary(row)"
            :visible="activeAuxiliaryPopoverRowId === row.rowid"
            placement="bottom-start"
            trigger="manual"
            :offset="18"
            :width="auxiliaryPopoverWidth"
            popper-class="voucher-auxiliary-popover"
            @hide="() => closeAuxiliaryPopover(row)"
          >
            <template #reference>
              <span class="auxiliary-inline-anchor" />
            </template>
            <div class="auxiliary-popover-body">
              <div class="auxiliary-popover-title">辅助核算</div>
              <div
                v-for="aux in row.auxiliaries"
                :key="row.rowid + '-popover-' + aux.dimCode"
                class="auxiliary-popover-row"
              >
                <span class="auxiliary-popover-label">
                  <span v-if="aux.required" class="auxiliary-required-mark">*</span>{{ getDisplayAuxiliaryLabel(aux) }}
                </span>
                <ElSelect
                  v-model="aux.value"
                  filterable
                  clearable
                  size="small"
                  :teleported="false"
                  popper-class="voucher-auxiliary-select-popper"
                  :disabled="props.mode === 'detail'"
                  :placeholder="'请选择' + getDisplayAuxiliaryLabel(aux)"
                  @change="() => handleAuxiliaryValueChange(row)"
                >
                  <ElOption
                    v-for="opt in props.auxiliaryOptionsMap[aux.dimCode] || []"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </ElSelect>
              </div>
            </div>
          </ElPopover>
        </div>
      </template>
    </ElTableColumn>

    <ElTableColumn prop="debit" :min-width="tableCols.amount" align="right">
      <template #header>
        <div class="w-full">
          <div class="amount-title">借方金额</div>
          <div class="amount-header-grid">
            <div
              v-for="(p, idx) in amountHeaderPositions"
              :key="`debit-h-${p}${idx}`"
              class="amount-header-grid__cell"
              :class="{
                'is-last': idx === amountHeaderPositions.length - 1,
                'is-yuan': idx === 8,
              }"
            >
              {{ p }}
            </div>
          </div>
        </div>
      </template>
      <template #default="{ row }">
        <MoneyGridInput
          :ref="setCellRef(row.rowid, 'debit')"
          v-model="row.debit"
          :disabled="props.mode === 'detail'"
          @change="(v) => handleDebitChange(row, v)"
          @upper-change="(t) => (row.debitUpper = t)"
          @navigate="(d) => navigateFrom(row, 'debit', d)"
        />
      </template>
    </ElTableColumn>

    <ElTableColumn prop="credit" :min-width="tableCols.amount" align="right">
      <template #header>
        <div class="w-full">
          <div class="amount-title">贷方金额</div>
          <div class="amount-header-grid">
            <div
              v-for="(p, idx) in amountHeaderPositions"
              :key="`credit-h-${p}${idx}`"
              class="amount-header-grid__cell"
              :class="{
                'is-last': idx === amountHeaderPositions.length - 1,
                'is-yuan': idx === 8,
              }"
            >
              {{ p }}
            </div>
          </div>
        </div>
      </template>
      <template #default="{ row }">
        <MoneyGridInput
          :ref="setCellRef(row.rowid, 'credit')"
          v-model="row.credit"
          :disabled="props.mode === 'detail'"
          @change="(v) => handleCreditChange(row, v)"
          @upper-change="(t) => (row.creditUpper = t)"
          @navigate="(d) => navigateFrom(row, 'credit', d)"
        />
      </template>
    </ElTableColumn>

    <ElTableColumn label="操作" :width="tableCols.action" align="center" class-name="voucher-action-column" header-class-name="voucher-action-column">
      <template #default="{ row }">
        <div class="voucher-row-actions">
          <ElButton
            class="voucher-row-action-btn"
            size="small"
            type="primary"
            :disabled="props.mode === 'detail'"
            @click="handleInsertAfter(row)"
          >
            <ElIcon><Plus /></ElIcon>
          </ElButton>
          <ElButton
            class="voucher-row-action-btn"
            size="small"
            type="danger"
            plain
            :disabled="props.mode === 'detail'"
            @click="handleRemove(row)"
          >
            <ElIcon><Delete /></ElIcon>
          </ElButton>
        </div>
      </template>
    </ElTableColumn>
  </ElTable>
</template>

<style scoped>
.amount-title {
  height: 28px;
  font-size: 12px;
  font-weight: 600;
  line-height: 28px;
  text-align: center;
}

.amount-header-grid {
  display: flex;
  height: 22px;
  margin-top: 0;
  overflow: hidden;
  background: #fff;
  border-top: 1px solid #dcdfe6;
}

.amount-header-grid__cell {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #606266;
  border-right: 1px solid #e4e7ed;
}

.amount-header-grid__cell.is-last {
  border-right: 0;
}

.amount-header-grid__cell.is-yuan {
  border-right-color: #c0c4cc;
}

.subject-cell {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 64px;
  overflow: hidden;
  contain: layout paint;
}

.auxiliary-inline-trigger {
  position: absolute;
  right: 8px;
  bottom: 22px;
  left: 12px;
  z-index: 3;
  display: block;
  height: 17px;
  padding: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 17px;
  color: #409eff;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.auxiliary-inline-trigger:disabled {
  cursor: default;
  color: #606266;
}

.auxiliary-inline-anchor {
  position: absolute;
  right: 8px;
  bottom: 20px;
  left: 12px;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

:global(.voucher-auxiliary-popover) {
  max-width: calc(100vw - 32px);
}

.auxiliary-popover-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auxiliary-popover-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.auxiliary-popover-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.auxiliary-popover-label {
  font-size: 12px;
  color: #606266;
  text-align: right;
}

.auxiliary-required-mark {
  margin-right: 2px;
  color: var(--el-color-danger);
}

.balance-indicator {
  position: absolute;
  right: 8px;
  bottom: 5px;
  left: 12px;
  z-index: 2;
  display: inline-flex;
  gap: 3px;
  align-items: center;
  max-width: none;
  height: 17px;
  padding: 0 5px;
  overflow: hidden;
  font-size: 10px;
  line-height: 17px;
  white-space: nowrap;
  pointer-events: none;
  border-radius: 999px;
}


.balance-indicator.is-debit,
.balance-indicator.is-credit {
  color: #303133;
}

.balance-indicator.is-negative {
  color: var(--el-color-danger);
}



.balance-indicator__amount {
  font-variant-numeric: tabular-nums;
}

.balance-indicator__direction {
  color: inherit;
}

.voucher-row-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.voucher-row-actions :deep(.el-button) {
  margin-left: 0;
}

.voucher-row-actions :deep(.voucher-row-action-btn) {
  width: 24px;
  min-width: 24px;
  height: 20px;
  padding: 0;
  border-radius: 3px;
}

.voucher-row-actions :deep(.voucher-row-action-btn .el-icon) {
  font-size: 12px;
}

:deep(.voucher-entry-table .el-table__inner-wrapper::before) {
  height: 1px;
  background-color: #dcdfe6;
}

:deep(.voucher-entry-table .el-table__cell) {
  border-right-color: #e4e7ed;
}

:global(.voucher-entry-table.el-table) {
  height: 100% !important;
  max-height: 100% !important;
}

:global(.voucher-entry-table .el-table__inner-wrapper) {
  height: 100% !important;
  max-height: 100% !important;
}

:global(.voucher-entry-table .el-table__body-wrapper) {
  overflow-y: auto !important;
}

:global(.voucher-entry-table .cell),
:global(.voucher-entry-table.el-table--small .cell),
:global(.voucher-entry-table.el-table--small .el-table__cell .cell),
:global(.voucher-entry-table .el-table__header .cell),
:global(.voucher-entry-table .el-table__body .cell) {
  width: 100% !important;
  padding: 0 !important;
}

:global(.voucher-entry-table.el-table--small th.el-table__cell),
:global(.voucher-entry-table.el-table--small td.el-table__cell),
:global(.voucher-entry-table th.el-table__cell),
:global(.voucher-entry-table td.el-table__cell) {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

:deep(.voucher-entry-table .cell),
:deep(.voucher-entry-table.el-table--small .cell),
:deep(.voucher-entry-table.el-table--small .el-table__cell .cell) {
  width: 100%;
  padding: 0 !important;
}

:deep(.voucher-entry-table.el-table--small th.el-table__cell),
:deep(.voucher-entry-table.el-table--small td.el-table__cell) {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

:deep(.voucher-entry-table.el-table--small th.el-table__cell > .cell),
:deep(.voucher-entry-table.el-table--small td.el-table__cell > .cell) {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

:deep(.voucher-entry-table .cell > div) {
  width: 100%;
}

:deep(.voucher-entry-table .el-input),
:deep(.voucher-entry-table .el-select),
:deep(.voucher-entry-table .money-grid-input) {
  width: 100%;
}

:deep(.voucher-entry-table .el-input__wrapper),
:deep(.voucher-entry-table .el-select__wrapper) {
  height: 100%;
  min-height: 100%;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-radius: 0;
  box-shadow: none !important;
}

:global(.voucher-entry-table.el-table--small td.el-table__cell),
:global(.voucher-entry-table.el-table--small th.el-table__cell) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

:global(.voucher-entry-table.el-table--small td.el-table__cell > .cell),
:global(.voucher-entry-table.el-table--small th.el-table__cell > .cell) {
  height: 100% !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

:global(.voucher-entry-table.el-table--small .el-table__body .el-table__row) {
  height: 64px;
}

:global(
  .voucher-entry-table.el-table--small .el-table__body td.el-table__cell
) {
  height: 64px;
}

:deep(.voucher-entry-table .el-input__inner) {
  height: 100%;
  padding: 0;
  line-height: 64px;
}

:deep(.voucher-entry-table .el-input__prefix),
:deep(.voucher-entry-table .el-input__suffix) {
  margin-right: 0;
  margin-left: 0;
}

:deep(.voucher-entry-table .el-select__wrapper) {
  padding-right: 0;
  padding-left: 0;
}

:deep(.voucher-entry-table .el-select__selection),
:deep(.voucher-entry-table .el-select__selected-item),
:deep(.voucher-entry-table .el-select__placeholder) {
  padding-right: 0;
  padding-left: 0;
}

:deep(.voucher-entry-table .el-select__prefix),
:deep(.voucher-entry-table .el-select__suffix) {
  margin-right: 0;
  margin-left: 0;
}

:deep(.voucher-entry-table .el-select__selection),
:deep(.voucher-entry-table .el-select__placeholder) {
  min-height: 64px;
}

.summary-input-wrap {
  width: 100%;
  height: 100%;
}

.voucher-detail-cell-text {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 6px 8px;
  overflow: hidden;
  font-size: 12px;
  line-height: 20px;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-all;
}

.voucher-detail-cell-text--subject {
  align-items: flex-start;
  padding-bottom: 22px;
}

:deep(.voucher-entry-table .summary-scroll-input),
:deep(.voucher-entry-table .summary-scroll-input .el-textarea__inner) {
  width: 100%;
  height: 100% !important;
  min-height: 64px !important;
  max-height: 64px !important;
}

:deep(.voucher-entry-table .summary-scroll-input .el-textarea__inner) {
  padding: 6px 8px !important;
  overflow-y: hidden !important;
  line-height: 20px !important;
  white-space: pre-wrap;
  resize: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .voucher-subject-textarea .el-textarea__inner) {
  overflow-y: hidden !important;
}

:deep(.voucher-entry-table .summary-scroll-input .el-textarea__inner:focus) {
  box-shadow: none !important;
}

:deep(.voucher-entry-table .voucher-subject-inline) {
  height: 100%;
}

:deep(.voucher-entry-table .voucher-subject-inline .el-input) {
  height: 100%;
}

/* 凭证分录表格：输入组件高度填满单元格 */
:global(.voucher-entry-table.el-table--small .el-table__body .el-table__row) {
  height: 64px !important;
}

:global(
  .voucher-entry-table.el-table--small .el-table__body td.el-table__cell
) {
  height: 64px !important;
  padding: 0 !important;
  vertical-align: middle !important;
}

:global(
  .voucher-entry-table.el-table--small .el-table__body td.el-table__cell > .cell
) {
  display: flex !important;
  align-items: stretch !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 64px !important;
  padding: 0 !important;
  line-height: normal !important;
}

:global(
  .voucher-entry-table.el-table--small
    .el-table__body
    td.el-table__cell
    > .cell
    > *
) {
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 64px !important;
}

:global(.voucher-entry-table .summary-input-wrap),
:global(.voucher-entry-table .summary-scroll-input),
:global(.voucher-entry-table .subject-cell),
:global(.voucher-entry-table .voucher-subject-inline),
:global(.voucher-entry-table .voucher-subject-inline > .el-input),
:global(.voucher-entry-table .money-grid-input) {
  display: flex !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 64px !important;
}

:global(.voucher-entry-table .el-input),
:global(.voucher-entry-table .el-input__wrapper),
:global(.voucher-entry-table .el-input-group),
:global(.voucher-entry-table .el-input-group__prepend),
:global(.voucher-entry-table .el-input__inner),
:global(.voucher-entry-table .el-select),
:global(.voucher-entry-table .el-select__wrapper) {
  height: 100% !important;
  min-height: 64px !important;
}

:global(.voucher-entry-table .el-input__wrapper),
:global(.voucher-entry-table .el-select__wrapper) {
  align-items: center !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

:global(.voucher-entry-table .el-input__inner) {
  line-height: 64px !important;
}

:global(.voucher-entry-table .subject-cell .el-input-group__prepend) {
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 64px !important;
  min-width: 64px !important;
  height: 64px !important;
  padding: 0 !important;
}

:global(.voucher-entry-table .money-grid-input > div) {
  height: 100% !important;
  min-height: 64px !important;
}

/* 凭证分录表格：去除输入组件圆角 */
:global(.voucher-entry-table .el-input__wrapper),
:global(.voucher-entry-table .el-select__wrapper),
:global(.voucher-entry-table .el-input-group),
:global(.voucher-entry-table .el-input-group__prepend),
:global(.voucher-entry-table .el-input-group__append),
:global(.voucher-entry-table .voucher-subject-inline .el-input__wrapper),
:global(.voucher-entry-table .voucher-subject-inline .el-input-group__prepend),
:global(.voucher-entry-table .money-grid-input > div) {
  border-radius: 0 !important;
}

:global(.voucher-entry-table .el-input__wrapper::before),
:global(.voucher-entry-table .el-input__wrapper::after),
:global(.voucher-entry-table .el-select__wrapper::before),
:global(.voucher-entry-table .el-select__wrapper::after) {
  border-radius: 0 !important;
}

/* 凭证分录表格：去掉内部输入组件自身外框，只保留表格网格线和必要内部分隔 */
:global(.voucher-entry-table .el-input__wrapper),
:global(.voucher-entry-table .el-select__wrapper) {
  border: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .el-input__wrapper.is-focus),
:global(.voucher-entry-table .el-select__wrapper.is-focused),
:global(.voucher-entry-table .el-input.is-focus .el-input__wrapper) {
  box-shadow: none !important;
}

:global(.voucher-entry-table .money-grid-input > div) {
  border: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .money-grid-input > div > input) {
  outline: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .el-input-group),
:global(.voucher-entry-table .el-input-group__prepend),
:global(.voucher-entry-table .el-input-group__append) {
  border-top: 0 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}


:global(.voucher-entry-table .summary-single-input .el-input__wrapper) {
  border-top: 0 !important;
  border-bottom: 0 !important;
  border-left: 0 !important;
}

:global(.voucher-entry-table .money-grid-input > div) {
  border-top: 0 !important;
  border-bottom: 0 !important;
}

:global(
  .voucher-entry-table .money-grid-input > div > .relative > div:first-child
) {
  border-left: 0 !important;
}

:global(
  .voucher-entry-table .money-grid-input > div > .relative > div:last-child
) {
  border-right: 0 !important;
}

/* 凭证分录表格：序号列与左侧表头居中 */
:global(.voucher-entry-table .el-table__header th.el-table__cell .cell) {
  display: flex !important;
  align-items: center !important;
}

:global(
  .voucher-entry-table .el-table__header th.el-table__cell.is-center .cell
) {
  justify-content: center !important;
  text-align: center !important;
}

:global(
  .voucher-entry-table .el-table__body td.el-table__cell.is-center .cell
) {
  justify-content: center !important;
  text-align: center !important;
}

/* 凭证分录表格：序号列行号上下左右居中 */
:global(.voucher-entry-table .voucher-index-column .cell) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
  min-height: 64px !important;
  line-height: normal !important;
  text-align: center !important;
}

:global(
  .voucher-entry-table .el-table__body .voucher-index-column .cell > span
) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 64px !important;
  line-height: normal !important;
}

/* 凭证分录表格：摘要 textarea 去圆角、去自身外边框 */
:global(.voucher-entry-table .summary-scroll-input),
:global(.voucher-entry-table .summary-scroll-input .el-textarea__inner) {
  outline: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .summary-scroll-input .el-textarea__inner:hover),
:global(.voucher-entry-table .summary-scroll-input .el-textarea__inner:focus),
:global(
  .voucher-entry-table .summary-scroll-input.is-focus .el-textarea__inner
) {
  outline: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .summary-input-wrap) {
  overflow: hidden !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* 凭证分录表格：会计科目输入组件去圆角、去自身外边框 */
:global(.voucher-entry-table .subject-cell),
:global(.voucher-entry-table .voucher-subject-inline),
:global(.voucher-entry-table .voucher-subject-inline .el-input),
:global(.voucher-entry-table .voucher-subject-inline .el-input-group),
:global(.voucher-entry-table .voucher-subject-inline .el-input__wrapper),
:global(.voucher-entry-table .voucher-subject-inline .el-input-group__prepend),
:global(.voucher-entry-table .voucher-subject-inline .el-input-group__append) {
  outline: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

:global(.voucher-entry-table .voucher-subject-inline .el-input__wrapper:hover),
:global(
  .voucher-entry-table .voucher-subject-inline .el-input__wrapper.is-focus
),
:global(
  .voucher-entry-table
    .voucher-subject-inline
    .el-input.is-focus
    .el-input__wrapper
),
:global(
  .voucher-entry-table .voucher-subject-inline .el-input__wrapper:focus-within
) {
  outline: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}


:global(.voucher-entry-table .voucher-subject-inline .el-input__inner) {
  outline: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}
/* 凭证分录表格：操作列不固定，避免覆盖金额录入区域 */
:global(.voucher-entry-table .voucher-action-column) {
  flex: none !important;
}
:global(.voucher-entry-table .voucher-action-column .cell) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 64px !important;
}

/* 凭证分录表格：强制表格布局可压缩，避免列宽撑出导致操作列不可见 */
:global(.voucher-entry-table .el-table__header),
:global(.voucher-entry-table .el-table__body) {
  min-width: 0 !important;
}

:global(.voucher-entry-table colgroup col) {
  min-width: 0 !important;
}

/* 凭证分录表格：窄屏完整展示优先 */
@media (max-width: 1180px) {
  .auxiliary-popover-row {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 8px;
  }

  .amount-title {
    height: 24px;
    font-size: 11px;
    line-height: 24px;
  }

  .amount-header-grid {
    height: 20px;
  }

  .amount-header-grid__cell {
    font-size: 10px;
  }

  .voucher-row-actions {
    gap: 3px;
  }

  .voucher-row-actions :deep(.voucher-row-action-btn) {
    width: 22px;
    min-width: 22px;
    height: 18px;
    padding: 0;
  }

  .voucher-row-actions :deep(.voucher-row-action-btn .el-icon) {
    font-size: 11px;
  }

  .balance-indicator {
    right: 4px;
    left: 8px;
    font-size: 9px;
  }

  :global(.voucher-entry-table.el-table--small .el-table__body .el-table__row),
  :global(.voucher-entry-table.el-table--small .el-table__body td.el-table__cell),
  :global(.voucher-entry-table.el-table--small .el-table__body td.el-table__cell > .cell),
  :global(.voucher-entry-table .summary-input-wrap),
  :global(.voucher-entry-table .summary-scroll-input),
  :global(.voucher-entry-table .subject-cell),
  :global(.voucher-entry-table .voucher-subject-inline),
  :global(.voucher-entry-table .money-grid-input) {
    min-height: 60px !important;
    height: 60px !important;
  }
}

@media (max-width: 980px) {
  :global(.voucher-entry-table) {
    font-size: 11px;
  }

  .amount-header-grid__cell {
    font-size: 9px;
  }

  :global(.voucher-entry-table .subject-cell .el-input-group__prepend) {
    width: 44px !important;
    min-width: 44px !important;
  }

  :global(.voucher-entry-table .summary-scroll-input .el-textarea__inner) {
    padding: 4px 5px !important;
    font-size: 11px !important;
    line-height: 18px !important;
  }

  .voucher-subject-item__balance,
  .balance-indicator__direction {
    display: none;
  }

  .balance-indicator {
    max-width: 120px;
  }
}


@media (max-width: 768px) {
  .auxiliary-popover-row {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 6px;
  }

  .auxiliary-popover-label {
    font-size: 11px;
  }

  :global(.voucher-entry-table) {
    font-size: 10px;
  }

  :global(.voucher-entry-table.el-table--small .el-table__body .el-table__row),
  :global(.voucher-entry-table.el-table--small .el-table__body td.el-table__cell),
  :global(.voucher-entry-table.el-table--small .el-table__body td.el-table__cell > .cell),
  :global(.voucher-entry-table .summary-input-wrap),
  :global(.voucher-entry-table .summary-scroll-input),
  :global(.voucher-entry-table .subject-cell),
  :global(.voucher-entry-table .voucher-subject-inline),
  :global(.voucher-entry-table .money-grid-input) {
    min-height: 56px !important;
    height: 56px !important;
  }

  :global(.voucher-entry-table .summary-scroll-input .el-textarea__inner),
  :global(.voucher-entry-table .voucher-subject-textarea .el-textarea__inner),
  :global(.voucher-entry-table .el-input__inner) {
    min-height: 56px !important;
    height: 56px !important;
    line-height: 56px !important;
  }

  .amount-title {
    height: 22px;
    font-size: 10px;
    line-height: 22px;
  }

  .amount-header-grid {
    height: 18px;
  }

  .amount-header-grid__cell {
    font-size: 8px;
  }

  .voucher-row-actions {
    gap: 2px;
  }

  .voucher-row-actions :deep(.voucher-row-action-btn) {
    width: 18px;
    min-width: 18px;
    height: 16px;
    padding: 0;
  }

  .voucher-row-actions :deep(.voucher-row-action-btn .el-icon) {
    font-size: 10px;
  }

  .balance-indicator {
    display: none;
  }

  :global(.voucher-entry-table .subject-cell .el-input-group__prepend) {
    width: 36px !important;
    min-width: 36px !important;
    font-size: 10px !important;
  }

  :global(.voucher-entry-table .el-input__inner),
  :global(.voucher-entry-table .el-select__placeholder),
  :global(.voucher-entry-table .el-select__selected-item) {
    font-size: 10px !important;
  }
}

</style>
