<script lang="ts" setup>
import type { PropType } from 'vue';

import { computed, nextTick, onBeforeUnmount, onDeactivated, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Plus } from '@element-plus/icons-vue';
import {
  ElButton,
  ElInput,
  ElPopover,
  ElScrollbar,
  ElTabPane,
  ElTabs,
} from 'element-plus';

import SubjectForm from '#/views/finance/settings/project/modules/form.vue';

export type SubjectOption = { label: string; raw: any; value: string };

type SubjectTabKey =
  | 'all'
  | 'asset'
  | 'cost'
  | 'equity'
  | 'liability'
  | 'profit';
type ArrowDir = 'left' | 'right';
type DisplayOption = {
  disabled: boolean;
  isDescendantExpanded: boolean;
  option: SubjectOption;
};

type CreateContext = {
  parent_aux_disabled?: boolean;
  parent_auxiliary_accounting?: any;
  parent_subject_name?: string;
  parent_subject_number?: string;
  parent_subject_state?: number;
  subject_type?: number;
};

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  options: { type: Array as PropType<SubjectOption[]>, default: () => [] },
  loading: { type: Boolean, default: false },
  remoteMethod: {
    type: Function as PropType<(reason?: string) => Promise<void> | void>,
    required: true,
  },
  popperZIndex: {
    type: [Number, String] as PropType<number | string>,
    default: 2050,
  },
  bordered: { type: Boolean, default: false },
  allowNonLeafSubject: { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
  (e: 'select', value: SubjectOption): void;
}>();

const SUBJECT_TABS: Array<{
  key: SubjectTabKey;
  label: string;
  subjectType?: number;
}> = [
  { key: 'all', label: '全部' },
  { key: 'asset', label: '资产', subjectType: 1 },
  { key: 'liability', label: '负债', subjectType: 2 },
  { key: 'equity', label: '权益', subjectType: 3 },
  { key: 'cost', label: '成本', subjectType: 4 },
  { key: 'profit', label: '损益', subjectType: 5 },
];

const subjectPopperOptions = {
  modifiers: [
    {
      name: 'flip',
      options: {
        fallbackPlacements: ['bottom-start'],
        padding: 8,
      },
    },
    {
      name: 'preventOverflow',
      options: {
        boundary: 'viewport',
        padding: 8,
      },
    },
  ],
};

function guessSubjectTab(opt: SubjectOption): SubjectTabKey {
  const v = String(opt?.value ?? '');
  const raw = opt?.raw ?? {};

  const firstDigit = v.replaceAll(/\s/g, '')?.[0];
  if (firstDigit === '1') return 'asset';
  if (firstDigit === '2') return 'liability';
  if (firstDigit === '3') return 'equity';
  if (firstDigit === '4') return 'cost';
  if (firstDigit === '5') return 'profit';

  const candidate = String(
    raw?.category ??
      raw?.type ??
      raw?.subjectType ??
      raw?.subjectClass ??
      raw?.classify ??
      raw?.kind ??
      '',
  );
  if (candidate.includes('资产')) return 'asset';
  if (candidate.includes('负债')) return 'liability';
  if (candidate.includes('权益')) return 'equity';
  if (candidate.includes('成本')) return 'cost';
  if (
    candidate.includes('损益') ||
    candidate.includes('收入') ||
    candidate.includes('费用') ||
    candidate.includes('利润')
  ) {
    return 'profit';
  }
  return 'all';
}

function getOptBalance(opt?: SubjectOption): number | string | undefined {
  const raw = opt?.raw ?? {};
  // 凭证科目下拉中的余额必须与分录格下方余额同口径：
  // 优先使用 create.vue 按当前月份科目余额表封装的 currentBalance / endingBalance，
  // 最后才兼容原始 balance 字段，避免把接口里的其它余额字段误当作本期科目余额。
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

function formatMaybeNumber(v: any) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function normalizeBoolFlag(value: any, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return (
    ['1', 'true', 'yes'].includes(String(value).trim().toLowerCase()) ||
    value === 1 ||
    value === true
  );
}

function isLeafSubject(opt?: SubjectOption) {
  if (!opt) return false;
  return normalizeBoolFlag(opt?.raw?.is_leaf_subject, true);
}

function getSubjectNo(opt?: SubjectOption) {
  return String(opt?.raw?.subject_number ?? opt?.value ?? '').trim();
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
  if (code && label.startsWith(code)) {
    return label.slice(code.length).trim();
  }
  return label;
}

function getSearchText(opt?: SubjectOption) {
  const raw = opt?.raw ?? {};
  return [
    opt?.label,
    raw?.subject_number,
    raw?.subject_name,
    raw?.subjectName,
    raw?.account_name,
    raw?.accountName,
    raw?.name,
    raw?.description,
    raw?.subject_name_py,
    raw?.subjectNamePy,
    raw?.pinyin,
    raw?.py,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function uniqueOptions(list: SubjectOption[]) {
  const map = new Map<string, SubjectOption>();
  for (const item of list) {
    const key = String(item?.value ?? '').trim();
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return [...map.values()];
}

const visible = ref(false);
const active = ref<SubjectTabKey>('all');
const q = ref('');
const activeIndex = ref(-1);
const currentPlacement = ref<'bottom-start' | 'top-start'>('bottom-start');
const panelMaxHeight = ref(300);
const listMaxHeight = ref(190);
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth);
const popperFixedStyle = ref<Record<string, string>>({});
const triggerRef = ref<InstanceType<typeof ElInput> | null>(null);
const scrollbarRef = ref<InstanceType<typeof ElScrollbar> | null>(null);
const virtualScrollTop = ref(0);
const searchText = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let pendingScrollSync = false;
const suppressNextAutoOpen = ref(false);
const subjectModalOpen = ref(false);
const optionCache = ref<Record<string, SubjectOption>>({});
const VIRTUAL_ITEM_HEIGHT = 46;
const VIRTUAL_OVERSCAN = 8;
const uid = Math.random().toString(36).slice(2, 9);
const popperClass = `voucher-subject-inline-popper voucher-subject-inline-popper-${uid}`;
const subjectPopoverWidth = computed(() => {
  const width = viewportWidth.value;
  if (width <= 768) return 280;
  if (width <= 980) return 320;
  if (width <= 1280) return 360;
  if (width <= 1600) return 420;
  return 500;
});

function rememberOption(opt?: null | SubjectOption) {
  const key = String(opt?.value ?? '').trim();
  if (!key || !opt) return;
  optionCache.value = {
    ...optionCache.value,
    [key]: opt,
  };
}

function rememberOptions(_list?: SubjectOption[]) {
  // 科目列表可能非常大；不要在每个单元格组件里复制整份列表到响应式缓存。
  // 仅在用户真正选择科目时通过 rememberOption 精准缓存当前项。
}

function getTriggerInputElement() {
  const el =
    ((triggerRef.value as any)?.$el as HTMLElement | undefined) ?? null;
  return (
    (el?.querySelector?.('textarea,input') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null) ?? null
  );
}

function blurTriggerInputOnly() {
  getTriggerInputElement()?.blur?.();
}

function updatePopupLayout() {
  if (typeof window === 'undefined') return;
  viewportWidth.value = window.innerWidth;
  const input = getTriggerInputElement();
  if (!input) return;

  const rect = input.getBoundingClientRect();
  const safeGap = 12;
  const footerAndHeaderHeight = viewportWidth.value <= 980 ? 74 : 84;
  const minPanelHeight = viewportWidth.value <= 980 ? 110 : 130;
  const maxPanelHeight =
    viewportWidth.value <= 768
      ? 170
      : viewportWidth.value <= 980
        ? 190
        : viewportWidth.value <= 1280
          ? 220
          : viewportWidth.value <= 1600
            ? 250
            : 300;
  const minListHeight = 56;
  const viewportSafeWidth = Math.max(240, window.innerWidth - safeGap * 2);
  const targetWidth = Math.min(subjectPopoverWidth.value, viewportSafeWidth);
  const maxLeft = Math.max(safeGap, window.innerWidth - targetWidth - safeGap);
  const fixedLeft = Math.min(Math.max(rect.left, safeGap), maxLeft);
  const spaceBelow = Math.max(window.innerHeight - rect.bottom - safeGap, 0);
  // 小屏/放大时也固定在当前科目输入框下方，避免盖住当前已选择的科目内容。
  const availableHeight = spaceBelow;

  currentPlacement.value = 'bottom-start';
  panelMaxHeight.value = Math.max(
    minPanelHeight,
    Math.min(maxPanelHeight, Math.floor(availableHeight)),
  );
  listMaxHeight.value = Math.max(
    minListHeight,
    panelMaxHeight.value - footerAndHeaderHeight,
  );

  popperFixedStyle.value = {
    left: fixedLeft + 'px',
    width: targetWidth + 'px',
    maxWidth: 'calc(100vw - ' + safeGap * 2 + 'px)',
  };
}

function handleWindowResize() {
  if (!visible.value) return;
  updatePopupLayout();
}

const [SubjectFormModal, subjectFormModalApi] = useVbenModal({
  connectedComponent: SubjectForm,
  destroyOnClose: true,
  zIndex: 2100,
  onOpenChange(isOpen) {
    subjectModalOpen.value = isOpen;
    if (isOpen) {
      blurTriggerInputOnly();
      return;
    }
    nextTick(() => {
      if (visible.value) syncActiveIndex();
    });
  },
});

const selectedOption = computed(() => {
  const key = String(props.modelValue ?? '').trim();
  if (!key) return undefined;
  return (
    optionCache.value[key] ||
    (props.options ?? []).find(
      (item) => String(item?.value ?? '').trim() === key,
    )
  );
});

const tabbedOptions = computed(() => {
  if (!visible.value) return [];
  const list = props.options ?? [];
  if (active.value === 'all') return list;
  return list.filter((opt) => guessSubjectTab(opt) === active.value);
});

const mergedOptionByNumber = computed(() => {
  const map = new Map<string, SubjectOption>();
  for (const item of props.options ?? []) {
    const no = getSubjectNo(item);
    if (no && !map.has(no)) map.set(no, item);
  }
  for (const item of Object.values(optionCache.value)) {
    const no = getSubjectNo(item);
    if (no && !map.has(no)) map.set(no, item);
  }
  return map;
});

const allOptions = computed(() => uniqueOptions(tabbedOptions.value));

const childrenByParentNo = computed(() => {
  const map = new Map<string, SubjectOption[]>();
  for (const item of allOptions.value) {
    const parentNo = getParentSubjectNo(item);
    if (!parentNo) continue;
    const children = map.get(parentNo);
    if (children) children.push(item);
    else map.set(parentNo, [item]);
  }
  return map;
});

function collectDescendants(option: SubjectOption) {
  const rootNo = getSubjectNo(option);
  if (!rootNo) return [];

  const result: SubjectOption[] = [];
  const queue = [...(childrenByParentNo.value.get(rootNo) ?? [])];
  const visited = new Set<string>([rootNo]);

  while (queue.length > 0 && visited.size <= allOptions.value.length + 1) {
    const current = queue.shift();
    if (!current) continue;
    const currentNo = getSubjectNo(current);
    const currentKey = String(current.value ?? currentNo).trim();
    const visitKey = currentNo || currentKey;
    if (!visitKey || visited.has(visitKey)) continue;

    visited.add(visitKey);
    result.push(current);
    queue.push(...(childrenByParentNo.value.get(currentNo) ?? []));
  }

  return result;
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
    current = mergedOptionByNumber.value.get(parentNo);
    guard += 1;
  }

  return names;
}

function buildSubjectDisplayLabel(opt?: SubjectOption) {
  const code = getSubjectNo(opt);
  const path = buildSubjectNamePath(opt).join('-');
  if (code && path) return `${code} ${path}`;
  return code || path || String(opt?.label ?? '').trim();
}

const inputDisplayValue = computed(() => {
  if (visible.value) return q.value;
  return (
    buildSubjectDisplayLabel(selectedOption.value) ||
    String(props.modelValue ?? '').trim()
  );
});

const subjectPlaceholder = computed(() =>
  props.disabled ? '' : '请输入科目编码/名称',
);

function isHiddenRootParent(opt?: SubjectOption) {
  return !getParentSubjectNo(opt) && !isLeafSubject(opt);
}

function shouldShowInDefault(opt?: SubjectOption) {
  if (!opt) return false;
  if (props.allowNonLeafSubject) return true;
  if (isHiddenRootParent(opt)) return false;
  return true;
}

function canSelectSubject(opt?: SubjectOption) {
  if (!opt) return false;
  return props.allowNonLeafSubject || isLeafSubject(opt);
}

function buildDisplayOption(
  option: SubjectOption,
  isDescendantExpanded = false,
): DisplayOption {
  return {
    option,
    disabled: !canSelectSubject(option),
    isDescendantExpanded,
  };
}

function getDisplayMeta(item: DisplayOption) {
  if (!isLeafSubject(item.option) && props.allowNonLeafSubject) return '非末级科目可选';
  if (item.disabled && item.isDescendantExpanded)
    return '由上级科目展开｜已有下级，不可选';
  return '末级科目';
}

const displayOptions = computed<DisplayOption[]>(() => {
  if (!visible.value) return [];
  const list = allOptions.value;
  const keyword = String(searchText.value ?? '')
    .trim()
    .toLowerCase();

  if (!keyword) {
    return list
      .filter((item) => shouldShowInDefault(item))
      .map((item) => buildDisplayOption(item));
  }

  const directMatches = list.filter((item) =>
    getSearchText(item).includes(keyword),
  );
  const includedKeys = new Set<string>();
  const descendantKeys = new Set<string>();
  const hiddenKeys = new Set<string>();

  for (const item of directMatches) {
    const itemKey = String(item.value ?? '').trim();
    if (!itemKey) continue;

    if (isLeafSubject(item)) {
      includedKeys.add(itemKey);
      continue;
    }

    if (!props.allowNonLeafSubject && isHiddenRootParent(item)) {
      hiddenKeys.add(itemKey);
    } else {
      includedKeys.add(itemKey);
    }

    for (const child of collectDescendants(item)) {
      const childKey = String(child.value ?? '').trim();
      if (childKey) {
        includedKeys.add(childKey);
        descendantKeys.add(childKey);
      }
    }
  }

  return list
    .filter((item) => {
      const key = String(item.value ?? '').trim();
      if (!key || !includedKeys.has(key)) return false;
      if (hiddenKeys.has(key)) return false;
      return true;
    })
    .map((item) =>
      buildDisplayOption(
        item,
        descendantKeys.has(String(item.value ?? '').trim()),
      ),
    );
});

const virtualStartIndex = computed(() =>
  Math.max(
    0,
    Math.floor(virtualScrollTop.value / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_OVERSCAN,
  ),
);

const virtualVisibleCount = computed(() =>
  Math.ceil(listMaxHeight.value / VIRTUAL_ITEM_HEIGHT) + VIRTUAL_OVERSCAN * 2,
);

const virtualEndIndex = computed(() =>
  Math.min(
    displayOptions.value.length,
    virtualStartIndex.value + virtualVisibleCount.value,
  ),
);

const virtualTopPadding = computed(
  () => virtualStartIndex.value * VIRTUAL_ITEM_HEIGHT,
);

const virtualBottomPadding = computed(
  () =>
    Math.max(0, displayOptions.value.length - virtualEndIndex.value) *
    VIRTUAL_ITEM_HEIGHT,
);

const virtualDisplayOptions = computed(() =>
  displayOptions.value
    .slice(virtualStartIndex.value, virtualEndIndex.value)
    .map((item, offset) => ({ index: virtualStartIndex.value + offset, item })),
);

function setVirtualScrollTop(top: number) {
  const nextTop = Math.max(0, Math.floor(top));
  virtualScrollTop.value = nextTop;
  if (pendingScrollSync) return;
  pendingScrollSync = true;
  nextTick(() => {
    pendingScrollSync = false;
    if (!visible.value) return;
    (scrollbarRef.value as any)?.setScrollTop?.(virtualScrollTop.value);
  });
}

function resetVirtualScroll() {
  setVirtualScrollTop(0);
}

function clearSearchTimer() {
  if (!searchTimer) return;
  clearTimeout(searchTimer);
  searchTimer = undefined;
}

function scheduleSearch(value: string) {
  clearSearchTimer();
  searchTimer = setTimeout(() => {
    searchTimer = undefined;
    if (!visible.value) return;
    searchText.value = String(value ?? '');
    resetVirtualScroll();
  }, 80);
}

function handleVirtualScroll(payload: { scrollTop?: number }) {
  virtualScrollTop.value = Number(payload?.scrollTop ?? 0) || 0;
}

function ensureActiveVisible() {
  const index = activeIndex.value;
  if (index < 0) return;

  const viewportTop = virtualScrollTop.value;
  const viewportBottom = viewportTop + listMaxHeight.value;
  const itemTop = index * VIRTUAL_ITEM_HEIGHT;
  const itemBottom = itemTop + VIRTUAL_ITEM_HEIGHT;

  if (itemTop < viewportTop) {
    setVirtualScrollTop(itemTop);
    return;
  }
  if (itemBottom > viewportBottom) {
    setVirtualScrollTop(itemBottom - listMaxHeight.value);
  }
}

const createSubjectContext = computed<CreateContext>(() => {
  const tab = SUBJECT_TABS.find((item) => item.key === active.value);
  const selected = selectedOption.value;
  const subjectType =
    Number(selected?.raw?.subject_type ?? tab?.subjectType ?? 0) || undefined;

  if (selected) {
    return {
      subject_type: subjectType,
      parent_subject_number: getSubjectNo(selected),
      parent_subject_name:
        getSubjectName(selected) ||
        String(selected.raw?.subject_name ?? selected.label ?? '').trim(),
      parent_aux_disabled: Number(selected.raw?.can_add_subordinate ?? 1) !== 1,
      parent_auxiliary_accounting: selected.raw?.auxiliary_accounting,
      parent_subject_state: selected.raw?.subject_state,
    };
  }

  const keyword = String(q.value ?? '').trim();
  if (keyword) {
    const exactParent = (props.options ?? []).find((item) => {
      if (isLeafSubject(item)) return false;
      const code = getSubjectNo(item);
      const name = getSubjectName(item);
      return (
        code === keyword ||
        name === keyword ||
        String(item.label ?? '').trim() === keyword
      );
    });
    if (exactParent) {
      return {
        subject_type:
          Number(exactParent.raw?.subject_type ?? subjectType ?? 0) ||
          undefined,
        parent_subject_number: getSubjectNo(exactParent),
        parent_subject_name:
          getSubjectName(exactParent) ||
          String(
            exactParent.raw?.subject_name ?? exactParent.label ?? '',
          ).trim(),
        parent_aux_disabled:
          Number(exactParent.raw?.can_add_subordinate ?? 1) !== 1,
        parent_auxiliary_accounting: exactParent.raw?.auxiliary_accounting,
        parent_subject_state: exactParent.raw?.subject_state,
      };
    }
  }

  return {
    subject_type: subjectType,
    parent_subject_name: tab?.label,
  };
});

const createSubjectDisabled = computed(() =>
  Boolean(createSubjectContext.value.parent_aux_disabled),
);

function focusTriggerInput(select = false) {
  nextTick(() => {
    if (subjectModalOpen.value) return;
    triggerRef.value?.focus?.();
    const input = getTriggerInputElement();
    if (select) input?.select?.();
  });
}

function syncActiveIndex() {
  if (displayOptions.value.length === 0) {
    activeIndex.value = -1;
    return;
  }
  const firstEnabled = displayOptions.value.findIndex((item) => !item.disabled);
  activeIndex.value = Math.max(firstEnabled, 0);
  ensureActiveVisible();
}

function open(selectText = false) {
  if (props.disabled || subjectModalOpen.value) return;
  const wasVisible = visible.value;
  if (!wasVisible) {
    visible.value = true;
    q.value = String(props.modelValue ?? '').trim();
    searchText.value = q.value;
    emit('focus');
    resetVirtualScroll();
    syncActiveIndex();
    nextTick(() => updatePopupLayout());
  }
  if (selectText || !wasVisible) {
    focusTriggerInput(selectText);
  }
}

function close(resetToModel = true) {
  if (!visible.value) return;
  visible.value = false;
  activeIndex.value = -1;
  clearSearchTimer();
  if (resetToModel) q.value = String(props.modelValue ?? '').trim();
  searchText.value = q.value;
  emit('blur');
}

function focus() { open(true); }
function blur() { if (visible.value) close(true); blurTriggerInputOnly(); }
function toggleMenu(next?: boolean) { if (typeof next === 'boolean') { next ? open() : close(true); return; } visible.value ? close(true) : open(); }
function isExpanded() { return visible.value; }
function canExitByArrow(_dir: ArrowDir) { return true; }
function handleHorizontalArrow(_dir: ArrowDir) { return 'exit'; }
function consumeSuppressAutoOpen() { if (!suppressNextAutoOpen.value) return false; suppressNextAutoOpen.value = false; return true; }

function selectOption(opt: SubjectOption) {
  if (!canSelectSubject(opt) || subjectModalOpen.value) return;
  const next = String(opt?.value ?? '').trim();
  rememberOption(opt);
  q.value = next;
  emit('update:modelValue', next);
  emit('select', opt);
  suppressNextAutoOpen.value = true;
  close(false);
  focusTriggerInput();
}

function handleTriggerFocus() { if (subjectModalOpen.value) return; if (consumeSuppressAutoOpen()) return; if (!visible.value) open(); }
function handleTriggerClick() { if (subjectModalOpen.value) return; if (consumeSuppressAutoOpen()) return; if (!visible.value) open(); }
function handleTriggerInput(value: string) {
  q.value = String(value ?? '');
  scheduleSearch(q.value);
  if (subjectModalOpen.value) return;
  if (!visible.value) open();
}

function handleTriggerKeydown(e: KeyboardEvent) {
  if (props.disabled || subjectModalOpen.value) return;
  if (!visible.value && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) { e.preventDefault(); open(); return; }
  if (!visible.value) return;
  if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); if (displayOptions.value.length === 0) return; activeIndex.value = Math.min(activeIndex.value + 1, displayOptions.value.length - 1); ensureActiveVisible(); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); if (displayOptions.value.length === 0) return; activeIndex.value = Math.max(activeIndex.value - 1, 0); ensureActiveVisible(); return; }
  if (e.key === 'Enter') { e.preventDefault(); const item = displayOptions.value[activeIndex.value] ?? displayOptions.value[0]; if (item && !item.disabled) selectOption(item.option); }
}

function openCreateSubject() {
  const ctx = createSubjectContext.value;
  subjectFormModalApi.setData({ type: 'create', ...ctx }).open();
}

async function handleCreateSubjectSuccess() { await props.remoteMethod?.('reload'); await nextTick(); if (!visible.value && !subjectModalOpen.value) open(); }

function handleDocumentMousedown(event: MouseEvent) {
  if (!visible.value || subjectModalOpen.value) return;
  const target = event.target as Node | null;
  if (!target) return;
  const triggerEl = ((triggerRef.value as any)?.$el as HTMLElement | undefined) ?? null;
  const popperEl = document.querySelector(`.${popperClass.split(' ').join('.')}`) as HTMLElement | null;
  if (triggerEl?.contains(target) || popperEl?.contains(target)) return;
  close(true);
}

watch(() => props.options, (list) => { rememberOptions(list); }, { immediate: true });
watch(() => props.modelValue, (value) => { const key = String(value ?? '').trim(); if (key && optionCache.value[key]) rememberOption(optionCache.value[key]); if (!visible.value) q.value = key; }, { immediate: true });
watch(() => displayOptions.value, () => { syncActiveIndex(); }, { deep: false });
watch(() => active.value, () => { resetVirtualScroll(); syncActiveIndex(); });
function cleanupSubjectPickerEffects() {
  clearSearchTimer();
  pendingScrollSync = false;
  if (typeof document !== 'undefined') {
    document.removeEventListener('mousedown', handleDocumentMousedown, true);
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleWindowResize);
    window.removeEventListener('scroll', handleWindowResize, true);
  }
}

watch(() => visible.value, (value) => {
  if (!value) {
    cleanupSubjectPickerEffects();
    return;
  }
  cleanupSubjectPickerEffects();
  if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', handleDocumentMousedown, true);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleWindowResize, true);
    nextTick(() => {
      if (visible.value) updatePopupLayout();
    });
  }
});

onDeactivated(() => {
  close(true);
  cleanupSubjectPickerEffects();
});

onBeforeUnmount(() => {
  cleanupSubjectPickerEffects();
});

defineExpose({ focus, blur, toggleMenu, isExpanded, canExitByArrow, handleHorizontalArrow });
</script>

<template>
  <div class="voucher-subject-inline" :class="{ 'is-bordered': props.bordered }">
    <SubjectFormModal @success="handleCreateSubjectSuccess" />

    <ElPopover
      :visible="visible"
      trigger="manual"
      :placement="currentPlacement"
      :offset="8"
      :teleported="true"
      :show-arrow="false"
      :width="subjectPopoverWidth"
      :popper-options="subjectPopperOptions"
      :popper-style="{
        ...popperFixedStyle,
        zIndex: props.popperZIndex,
        '--voucher-subject-popper-z-index': String(props.popperZIndex),
        '--voucher-subject-popper-width': subjectPopoverWidth + 'px',
      }"
      :popper-class="`${popperClass}${subjectModalOpen ? ' is-subject-modal-open' : ''}`"
    >
      <template #reference>
        <div class="voucher-subject-trigger">
          <ElInput
            ref="triggerRef"
            :model-value="inputDisplayValue"
            :disabled="props.disabled"
            class="voucher-subject-textarea"
            type="textarea"
            :rows="2"
            :autosize="false"
            resize="none"
            :placeholder="subjectPlaceholder"
            @focus="handleTriggerFocus"
            @click="handleTriggerClick"
            @update:model-value="handleTriggerInput"
            @keydown="handleTriggerKeydown"
          />
        </div>
      </template>

      <div class="voucher-subject-panel" :style="{ maxHeight: `${panelMaxHeight}px` }">
        <div class="voucher-subject-tabs">
          <ElTabs
            :model-value="active"
            @update:model-value="
              (value: string | number) => {
                active = value as SubjectTabKey;
              }
            "
          >
            <ElTabPane v-for="tab in SUBJECT_TABS" :key="tab.key" :name="tab.key" :label="tab.label" />
          </ElTabs>
        </div>

        <div class="voucher-subject-list">
          <ElScrollbar
            ref="scrollbarRef"
            class="voucher-subject-scrollbar"
            :max-height="listMaxHeight"
            @scroll="handleVirtualScroll"
          >
            <div class="voucher-subject-items">
              <div v-if="props.loading" class="voucher-subject-empty">加载中...</div>
              <template v-else-if="displayOptions.length > 0">
                <div
                  class="voucher-subject-virtual-spacer"
                  :style="{ height: virtualTopPadding + 'px' }"
                />
                <div
                  v-for="entry in virtualDisplayOptions"
                  :key="entry.item.option.value"
                  class="voucher-subject-item"
                  :class="{
                    'is-active': entry.index === activeIndex,
                    'is-disabled': entry.item.disabled,
                    'is-descendant-expanded': entry.item.isDescendantExpanded,
                  }"
                  @mouseenter="activeIndex = entry.index"
                  @mousedown.prevent
                  @click="() => !entry.item.disabled && selectOption(entry.item.option)"
                >
                  <div class="voucher-subject-item__main">
                    <div class="voucher-subject-item__label">{{ buildSubjectDisplayLabel(entry.item.option) }}</div>
                    <div class="voucher-subject-item__meta">{{ getDisplayMeta(entry.item) }}</div>
                  </div>
                  <div class="voucher-subject-item__balance">{{ formatMaybeNumber(getOptBalance(entry.item.option)) }}</div>
                </div>
                <div
                  class="voucher-subject-virtual-spacer"
                  :style="{ height: virtualBottomPadding + 'px' }"
                />
              </template>
              <div
                v-else-if="!props.loading && displayOptions.length === 0"
                class="voucher-subject-empty"
              >
                暂无匹配科目
              </div>
            </div>
          </ElScrollbar>
        </div>

        <div class="voucher-subject-footer">
          <ElButton type="primary" link :icon="Plus" :disabled="createSubjectDisabled" @mousedown.prevent @click="openCreateSubject">
            新增科目
          </ElButton>
        </div>
      </div>
    </ElPopover>
  </div>
</template>

<style scoped>
.voucher-subject-inline { width: 100%; height: 100%; }
.voucher-subject-inline.is-bordered { min-height: 32px; overflow: hidden; background: var(--el-fill-color-blank); border: 1px solid var(--el-border-color); border-radius: var(--el-border-radius-base); transition: border-color var(--el-transition-duration), box-shadow var(--el-transition-duration); }
.voucher-subject-inline.is-bordered:hover { border-color: var(--el-border-color-hover); }
.voucher-subject-inline.is-bordered:focus-within { border-color: var(--el-color-primary); box-shadow: 0 0 0 1px var(--el-color-primary) inset; }
.voucher-subject-inline.is-bordered .voucher-subject-trigger { min-height: 32px; }
.voucher-subject-inline.is-bordered .voucher-subject-textarea :deep(.el-textarea__inner) { height: 32px !important; min-height: 32px !important; max-height: 32px !important; padding: 5px 11px !important; line-height: 20px !important; }
.voucher-subject-trigger { display: flex; width: 100%; height: 100%; min-height: 64px; overflow: hidden; }
.voucher-subject-textarea { flex: 1 1 auto; min-width: 0; height: 100%; }
.voucher-subject-textarea :deep(.el-textarea__inner) { width: 100%; height: 64px !important; min-height: 64px !important; max-height: 64px !important; padding: 6px 10px 24px !important; overflow: hidden !important; line-height: 20px !important; white-space: pre-wrap; resize: none !important; outline: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
.voucher-subject-textarea :deep(.el-textarea__inner:hover), .voucher-subject-textarea :deep(.el-textarea__inner:focus) { outline: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
.voucher-subject-panel { box-sizing: border-box; display: flex; flex-direction: column; padding: 6px 10px 6px; overflow: hidden; }
.voucher-subject-tabs { flex: none; min-width: 0; }
.voucher-subject-tabs :deep(.el-tabs__header) { margin: 0; }
.voucher-subject-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; }
.voucher-subject-tabs :deep(.el-tabs__nav-wrap) { overflow: hidden; }
.voucher-subject-tabs :deep(.el-tabs__nav-scroll) { overflow-x: auto; overflow-y: hidden; }
.voucher-subject-list { flex: 1 1 auto; min-height: 72px; margin-top: 4px; overflow: hidden; }
.voucher-subject-scrollbar { height: 100%; }
.voucher-subject-items { display: flex; flex-direction: column; gap: 2px; }
.voucher-subject-virtual-spacer { flex: none; }
.voucher-subject-item { display: flex; gap: 10px; align-items: center; justify-content: space-between; padding: 5px 8px; cursor: pointer; border-radius: 4px; }
.voucher-subject-item:hover, .voucher-subject-item.is-active { background: var(--el-fill-color-light); }
.voucher-subject-item.is-disabled { cursor: not-allowed; }
.voucher-subject-item.is-disabled .voucher-subject-item__label, .voucher-subject-item.is-disabled .voucher-subject-item__balance, .voucher-subject-item.is-disabled .voucher-subject-item__meta { color: var(--el-text-color-disabled); }
.voucher-subject-item.is-descendant-expanded .voucher-subject-item__meta { color: var(--el-color-warning); }
.voucher-subject-item__main { flex: 1; min-width: 0; }
.voucher-subject-item__label { overflow: hidden; font-size: 13px; line-height: 16px; color: var(--el-text-color-primary); text-overflow: ellipsis; white-space: nowrap; }
.voucher-subject-item__meta { margin-top: 1px; overflow: hidden; font-size: 11px; color: var(--el-text-color-secondary); text-overflow: ellipsis; white-space: nowrap; }
.voucher-subject-item__balance { flex: none; max-width: 86px; overflow: hidden; font-size: 11px; color: var(--el-text-color-secondary); text-overflow: ellipsis; white-space: nowrap; }
.voucher-subject-empty,
.voucher-subject-limit-tip { padding: 16px 8px; color: var(--el-text-color-secondary); text-align: center; }
.voucher-subject-footer { display: flex; flex: none; justify-content: flex-end; padding-top: 5px; border-top: 1px solid var(--el-border-color-lighter); }
:global(.voucher-subject-inline-popper) { z-index: var(--voucher-subject-popper-z-index, 2050) !important; width: min(var(--voucher-subject-popper-width, 500px), calc(100vw - 24px)) !important; max-width: calc(100vw - 24px) !important; max-height: calc(100vh - 16px) !important; padding: 0 !important; overflow: hidden !important; }
:global(.voucher-subject-inline-popper.is-subject-modal-open) { z-index: var(--voucher-subject-popper-z-index, 2050) !important; pointer-events: none !important; }
@media (max-height: 560px) { .voucher-subject-panel { padding: 6px; } .voucher-subject-item { padding: 4px 7px; } }
@media (max-width: 1280px) { :global(.voucher-subject-inline-popper) { max-width: min(360px, calc(100vw - 24px)) !important; } .voucher-subject-panel { padding: 5px 8px; } .voucher-subject-item { padding: 4px 7px; } .voucher-subject-item__balance { max-width: 72px; } }
@media (max-width: 980px) { :global(.voucher-subject-inline-popper) { max-width: min(320px, calc(100vw - 24px)) !important; } .voucher-subject-panel { padding: 4px 8px; } .voucher-subject-tabs :deep(.el-tabs__item) { height: 30px; padding: 0 9px; line-height: 30px; } .voucher-subject-list { margin-top: 2px; } .voucher-subject-item { padding: 3px 7px; } .voucher-subject-footer { padding-top: 3px; } }
@media (max-width: 640px) { .voucher-subject-panel { padding: 8px; } .voucher-subject-tabs :deep(.el-tabs__nav) { max-width: 100%; overflow-x: auto; overflow-y: hidden; } .voucher-subject-item { gap: 8px; padding: 7px 8px; } .voucher-subject-item__balance { max-width: 72px; } }
</style>
