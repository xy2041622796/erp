<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';

import {
  createAuxiliaryCate,
  deleteAuxiliaryCate,
  getAuxiliaryCatePage,
  updateAuxiliaryCate,
  type BilAuxiliaryCateApi,
} from '#/api/erp/finance/settings/auxiliary';
import {
  deleteFinanceAuxRecord,
  getFinanceAuxRecordPage,
  updateFinanceAuxRecord,
  initializeFinanceAuxDepartmentsFromSystemDept,
} from '#/api/erp/finance/settings/auxiliary/finance-aux-values';

import AuxTypeForm from '#/views/finance/settings/auxiliary/modules/aux-type-form.vue';
import FinAuxRecordForm from '#/views/finance/settings/auxiliary/modules/fin-aux-record-form.vue';

import {
  ElButton,
  ElCheckbox,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

defineOptions({ name: 'FinanceAuxiliaryAccounting' });

/**
 * Tabs（动态，但不依赖 UI 维护 apply_scope）
 * - 固定 Tab：辅助核算类别（维护分类表）
 * - 业务 Tabs：客户/供应商/职员/部门/项目/存货/现金流
 *   - Tab key: scope:<apply_scope>
 *   - Tab label: 优先取类别表中 apply_scope 对应且 enabled=1 的 name，否则用默认标题
 *
 * 说明：已按你的要求「适用范围先去掉」=> UI 不展示/不编辑 apply_scope，但仍可利用表中已存在的 apply_scope 做 Tab 映射。
 */

const route = useRoute();
const activeTab = ref<string>('scope:1');
const sourceSubject = computed(() => ({
  subjectId: String(route.query.subjectId || '').trim(),
  subjectNumber: String(route.query.subjectNumber || '').trim(),
  subjectName: String(route.query.subjectName || '').trim(),
  accountSetId: String(route.query.accountSetId || '').trim(),
}));
const sourceSubjectTitle = computed(() => [sourceSubject.value.subjectNumber, sourceSubject.value.subjectName].filter(Boolean).join(' '));

const keyword = ref('');
const showDisabled = ref(false);

// selection
const multipleSelection = ref<any[]>([]);

// pagination
const currentPage = ref(1);
const page = ref(20);
const total = ref(0);

const loading = ref(false);

// data
const tableData = ref<any[]>([]);
const filterCollapsed = ref(true);

function normalizeText(value: any) {
  return String(value ?? '').trim().toLowerCase();
}

function rowIncludesKeyword(row: any, kw: string) {
  if (!kw) return true;
  return Object.values(row || {}).some((v) => normalizeText(v).includes(kw));
}

const visibleTableData = computed(() => {
  const kw = normalizeText(keyword.value);
  const rows = Array.isArray(tableData.value) ? tableData.value : [];
  return kw ? rows.filter((row) => rowIncludesKeyword(row, kw)) : rows;
});

const visibleTotal = computed(() => {
  const kw = normalizeText(keyword.value);
  return kw ? visibleTableData.value.length : total.value;
});

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (keyword.value?.trim()) parts.push(`关键词：${keyword.value.trim()}`);
  if (showDisabled.value) parts.push('含停用');
  return parts.join(' / ');
});

type DynTab = {
  key: string;
  label: string;
  scope: number;
  raw?: BilAuxiliaryCateApi.Category;
};

type CashFlowMockItem = {
  code: string;
  name: string;
  category: string;
  remark: string;
  enabled: number;
};

const CASH_FLOW_MOCK_ITEMS: CashFlowMockItem[] = [
  { code: '1', name: '销售产成品、商品、提供劳务收到的现金', category: '经营活动产生的现金流量', remark: '', enabled: 1 },
  { code: '2', name: '收到其他与经营活动有关的现金', category: '经营活动产生的现金流量', remark: '', enabled: 1 },
  { code: '3', name: '购买原材料、商品、接受劳务支付的现金', category: '经营活动产生的现金流量', remark: '', enabled: 1 },
  { code: '4', name: '支付的职工薪酬', category: '经营活动产生的现金流量', remark: '', enabled: 1 },
  { code: '5', name: '支付的税费', category: '经营活动产生的现金流量', remark: '', enabled: 1 },
  { code: '6', name: '支付其他与经营活动有关的现金', category: '经营活动产生的现金流量', remark: '', enabled: 1 },
  { code: '7', name: '收回短期投资、长期债券投资和长期股权投资收到的现金', category: '投资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '8', name: '取得投资收益收到的现金', category: '投资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '9', name: '处置固定资产、无形资产和其他非流动资产收回的现金净额', category: '投资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '10', name: '短期投资、长期债券投资和长期股权投资支付的现金', category: '投资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '11', name: '购建固定资产、无形资产和其他非流动资产支付的现金', category: '投资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '12', name: '取得借款收到的现金', category: '筹资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '13', name: '吸收投资者投资收到的现金', category: '筹资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '14', name: '偿还借款本金支付的现金', category: '筹资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '15', name: '偿还借款利息支付的现金', category: '筹资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '16', name: '分配利润支付的现金', category: '筹资活动产生的现金流量', remark: '', enabled: 1 },
  { code: '17', name: '现金内部流转', category: '', remark: '', enabled: 1 },
  { code: '18', name: '期初现金余额', category: '', remark: '', enabled: 1 },
];

async function getCashFlowMockPage(params: { keyword?: string; showDisabled?: boolean }) {
  const kw = normalizeText(params.keyword);
  const list = CASH_FLOW_MOCK_ITEMS.filter((item) => {
    const enabledMatched = params.showDisabled || Number(item.enabled ?? 1) === 1;
    return enabledMatched && rowIncludesKeyword(item, kw);
  });
  return { list, total: list.length };
}

const APPLY_SCOPE_LABEL: Record<string, string> = {
  '1': '客户',
  '2': '供应商',
  '3': '职员',
  '4': '部门',
  '5': '项目',
  '6': '存货',
  '7': '现金流',
};

const SCOPE_ORDER: number[] = [1, 2, 3, 4, 5, 6, 7];

const dynamicTabs = ref<DynTab[]>(
  SCOPE_ORDER.map((s) => ({
    key: `scope:${s}`,
    label: APPLY_SCOPE_LABEL[String(s)]!,
    scope: s,
  })),
);

const activeScope = computed<number | null>(() => {
  if (!activeTab.value.startsWith('scope:')) return null;
  const s = activeTab.value.slice('scope:'.length);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
});

const isAuxType = computed(() => activeTab.value === 'auxType');
const isFinAuxScope = computed(() =>
  [1, 2, 3, 4, 5].includes(Number(activeScope.value || 0)),
);
const isCashFlow = computed(() => activeScope.value === 7);
const canInitializeDept = computed(() => activeDimCode.value === 'DEPT');
const canCreateRecord = computed(() => isAuxType.value || isFinAuxScope.value);

const scopeDimCodeMap: Record<number, 'CUSTOMER' | 'DEPT' | 'PROJECT' | 'STAFF' | 'SUPPLIER'> = {
  1: 'CUSTOMER',
  2: 'SUPPLIER',
  3: 'STAFF',
  4: 'DEPT',
  5: 'PROJECT',
};

const activeDimCode = computed(() =>
  activeScope.value ? scopeDimCodeMap[activeScope.value] : undefined,
);

const dimFieldMap: Record<string, { code: string; name: string }> = {
  CUSTOMER: { code: 'customer_code', name: 'customer_name' },
  SUPPLIER: { code: 'supplier_code', name: 'supplier_name' },
  STAFF: { code: 'employee_code', name: 'employee_name' },
  DEPT: { code: 'department_code', name: 'department_name' },
  PROJECT: { code: 'project_code', name: 'project_name' },
};


// ===== Finance auxiliary record CRUD dialog =====
const finAuxDialogVisible = ref(false);
const finAuxDialogMode = ref<'add' | 'edit'>('add');
const finAuxDialogRow = ref<Record<string, any> | null>(null);

function openCreateFinAuxRecord() {
  if (!activeDimCode.value) return toastNoApi();
  finAuxDialogMode.value = 'add';
  finAuxDialogRow.value = null;
  finAuxDialogVisible.value = true;
}

function openEditFinAuxRecord(row: any) {
  if (!activeDimCode.value) return toastNoApi();
  finAuxDialogMode.value = 'edit';
  finAuxDialogRow.value = row;
  finAuxDialogVisible.value = true;
}

async function handleDeleteFinAuxRecord(row: any) {
  if (!activeDimCode.value) return toastNoApi();
  const field = dimFieldMap[activeDimCode.value];
  const displayName = String(row?.[field?.name] || row?.[field?.code] || '').trim();
  try {
    await ElMessageBox.confirm(
      `确认删除【${displayName}】吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    const ins = ElLoading.service({ text: '删除中...' });
    try {
      await deleteFinanceAuxRecord(activeDimCode.value, String(row?.row_id || ''));
      ElMessage.success('删除成功');
      await loadData();
    } finally {
      ins.close();
    }
  } catch {
    // cancel ignore
  }
}

async function handleToggleFinAuxEnabled(row: any, enabled: boolean) {
  if (!activeDimCode.value) return toastNoApi();
  const ins = ElLoading.service({ text: '保存中...' });
  try {
    await updateFinanceAuxRecord(activeDimCode.value, {
      row_id: row.row_id,
      enabled: enabled ? 1 : 0,
    });
    ElMessage.success('已更新');
    await loadData();
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败');
  } finally {
    ins.close();
  }
}

// ===== AuxType CRUD dialog =====
const auxDialogVisible = ref(false);
const auxDialogMode = ref<'add' | 'edit'>('add');
const auxDialogRow = ref<BilAuxiliaryCateApi.Category | null>(null);

function openCreateAuxType() {
  auxDialogMode.value = 'add';
  auxDialogRow.value = null;
  auxDialogVisible.value = true;
}

function openEditAuxType(row: any) {
  auxDialogMode.value = 'edit';
  auxDialogRow.value = row;
  auxDialogVisible.value = true;
}

async function handleDeleteAuxType(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认删除类别【${row?.name || ''}】吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    const ins = ElLoading.service({ text: '删除中...' });
    try {
      await deleteAuxiliaryCate(String(row?.id ?? ''));
      ElMessage.success('删除成功');
      await refreshAfterAuxTypeChange();
    } finally {
      ins.close();
    }
  } catch {
    // cancel ignore
  }
}

async function handleToggleAuxEnabled(row: any, enabled: boolean) {
  const ins = ElLoading.service({ text: '保存中...' });
  try {
    await updateAuxiliaryCate({
      id: row.id,
      enabled: enabled ? 1 : 0,
    });
    ElMessage.success('已更新');
    await refreshAfterAuxTypeChange();
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败');
  } finally {
    ins.close();
  }
}

async function refreshAfterAuxTypeChange() {
  await loadDynamicTabs();
  await loadData();
}

async function loadDynamicTabs() {
  // 业务 tabs 永远存在，只是 label 可由类别表覆盖
  try {
    const res = await getAuxiliaryCatePage({ pageNo: 1, page: 0, enabled: 1 });
    const list = Array.isArray(res?.list) ? res.list : [];

    const enabledList = list
      .filter(
        (it: any) =>
          Number(it?.lingma_sys_is_delete ?? 0) !== 1 &&
          Number(it?.enabled ?? 1) === 1,
      )
      .sort(
        (a: any, b: any) => Number(a?.sort_no ?? 0) - Number(b?.sort_no ?? 0),
      );

    const byScope = new Map<number, any>();
    for (const it of enabledList) {
      const scope = Number(it?.apply_scope ?? 0);
      if (!SCOPE_ORDER.includes(scope)) continue;
      if (byScope.has(scope)) continue;
      byScope.set(scope, it);
    }

    dynamicTabs.value = SCOPE_ORDER.map((s) => {
      const raw = byScope.get(s);
      return {
        key: `scope:${s}`,
        label: String(raw?.name ?? APPLY_SCOPE_LABEL[String(s)]),
        scope: s,
        raw,
      } as DynTab;
    });

    // 若当前 activeTab 不合法，回到客户
    if (!isAuxType.value && !dynamicTabs.value.some((t) => t.key === activeTab.value)) {
      activeTab.value = 'scope:1';
    }
  } catch {
    dynamicTabs.value = SCOPE_ORDER.map((s) => ({
      key: `scope:${s}`,
      label: APPLY_SCOPE_LABEL[String(s)]!,
      scope: s,
    }));
  }
}

async function loadData() {
  loading.value = true;
  try {
    if (isAuxType.value) {
      const res = await getAuxiliaryCatePage({
        pageNo: currentPage.value,
        page: page.value,
        keyword: keyword.value?.trim() || undefined,
      });

      const list = Array.isArray(res?.list) ? res.list : [];
      const notDeleted = list.filter(
        (r: any) => Number(r?.lingma_sys_is_delete ?? 0) !== 1,
      );
      const filtered = showDisabled.value
        ? notDeleted
        : notDeleted.filter((r: any) => Number(r?.enabled ?? 1) === 1);

      tableData.value = filtered;
      total.value = Number(res?.total ?? filtered.length ?? 0);
      return;
    }

    // 财务辅助核算专用档案：客户/供应商/员工/部门/项目
    if (isFinAuxScope.value && activeDimCode.value) {
      const res = await getFinanceAuxRecordPage({
        dimCode: activeDimCode.value,
        pageNo: currentPage.value,
        page: page.value,
        keyword: keyword.value?.trim() || undefined,
        showDisabled: showDisabled.value,
        subjectId: activeDimCode.value === 'CUSTOMER' ? sourceSubject.value.subjectId : undefined,
      });
      tableData.value = Array.isArray(res?.list) ? res.list : [];
      total.value = Number(res?.total ?? tableData.value.length ?? 0);
      return;
    }

    if (activeScope.value === 7) {
      const res = await getCashFlowMockPage({
        keyword: keyword.value?.trim() || undefined,
        showDisabled: showDisabled.value,
      });
      tableData.value = Array.isArray(res?.list) ? res.list : [];
      total.value = Number(res?.total ?? tableData.value.length ?? 0);
      return;
    }

    // 5/6 暂无接口
    tableData.value = [];
    total.value = 0;
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '加载失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleQuery() {
  currentPage.value = 1;
  loadData();
}

function handleTabChange() {
  keyword.value = '';
  showDisabled.value = false;
  multipleSelection.value = [];
  currentPage.value = 1;
  loadData();
}

function handleSizeChange(size: number) {
  page.value = size;
  currentPage.value = 1;
  loadData();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadData();
}

function handleSelectionChange(rows: any[]) {
  multipleSelection.value = rows || [];
}

function toastNoApi() {
  ElMessage.warning('当前模块暂无可用接口，功能暂不可用');
}

function handleCreate() {
  if (isAuxType.value) return openCreateAuxType();
  if (isFinAuxScope.value) return openCreateFinAuxRecord();
  return toastNoApi();
}

async function handleInitializeDept() {
  if (!canInitializeDept.value) return;
  const ins = ElLoading.service({ text: '正在初始化部门...' });
  try {
    const res = await initializeFinanceAuxDepartmentsFromSystemDept();
    ElMessage.success(
      `部门初始化完成：新增 ${Number(res?.addedCount || 0)} 条，更新 ${Number(res?.updatedCount || 0)} 条，停用 ${Number(res?.deletedCount || 0)} 条`,
    );
    await loadData();
  } catch (e: any) {
    ElMessage.error(e?.message || '部门初始化失败');
  } finally {
    ins.close();
  }
}

function exportAuxTypeCsv(rows: any[]) {
  const headers = ['code', 'name', 'mnemonic_code', 'enabled', 'sort_no', 'description'];

  const esc = (v: any) => {
    const s = String(v ?? '').replace(/\r?\n/g, ' ');
    if (s.includes(',') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((k) => esc((r as any)?.[k])).join(','));
  }

  const csv = `\uFEFF${lines.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadFileFromBlobPart({ fileName: '辅助核算类别.csv', source: blob });
}

async function handleExport() {
  if (isAuxType.value) {
    exportAuxTypeCsv(visibleTableData.value);
    return;
  }

  if (isFinAuxScope.value && activeDimCode.value) {
    const field = dimFieldMap[activeDimCode.value];
    const headers = ['row_id', field.code, field.name, 'enabled', 'sort_no', 'remark'];
    const esc = (v: any) => {
      const text = String(v ?? '').replace(/\r?\n/g, ' ');
      return text.includes(',') || text.includes('\"')
        ? `\"${text.replace(/\"/g, '\"\"')}\"`
        : text;
    };
    const csv = `\uFEFF${[
      headers.join(','),
      ...visibleTableData.value.map((row) =>
        headers.map((key) => esc(row?.[key])).join(','),
      ),
    ].join('\n')}`;
    downloadFileFromBlobPart({
      fileName: `${APPLY_SCOPE_LABEL[String(activeScope.value)] || '辅助核算'}.csv`,
      source: new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    });
    return;
  }
  if (isCashFlow.value) {
    const headers = ['code', 'name', 'category', 'remark', 'enabled'];
    const esc = (v: any) => {
      const text = String(v ?? '').replace(/\r?\n/g, ' ');
      return text.includes(',') || text.includes('"')
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    };
    const rows = visibleTableData.value.map((row) => ({
      ...row,
      enabled: Number(row?.enabled ?? 1) === 1 ? '启用' : '停用',
    }));
    const csv = `\uFEFF${[
      ['现金流编码', '现金流名称', '现金流类别', '备注', '是否启用'].join(','),
      ...rows.map((row) => headers.map((key) => esc(row?.[key])).join(',')),
    ].join('\n')}`;
    downloadFileFromBlobPart({
      fileName: '现金流项目.csv',
      source: new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    });
    return;
  }

  return toastNoApi();
}

function handlePrint() {
  window.print();
}

// ===== 导入（仅辅助核算类别）：CSV =====
const importFileRef = ref<HTMLInputElement | null>(null);

function handleImport() {
  if (!isAuxType.value) return toastNoApi();
  importFileRef.value?.click?.();
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headerRaw = splitLine(lines[0]).map((h) => h.toLowerCase());
  const headers = headerRaw.includes('code')
    ? headerRaw
    : ['code', 'name', 'mnemonic_code', 'enabled', 'sort_no', 'description'];

  const startIdx = headerRaw.includes('code') ? 1 : 0;

  const rows: Array<Record<string, string>> = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = String(cols[idx] ?? '').trim();
    });
    if (row.code || row.name) rows.push(row);
  }
  return rows;
}

async function importAuxTypeFromCsv(file: File) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    ElMessage.warning('未解析到可导入的数据');
    return;
  }

  const all = await getAuxiliaryCatePage({ pageNo: 1, page: 0 });
  const list = Array.isArray(all?.list) ? all.list : [];
  const codeToId = new Map<string, string>();
  for (const it of list) {
    const c = String((it as any)?.code ?? '').trim();
    const id = String((it as any)?.id ?? '').trim();
    if (c && id) codeToId.set(c, id);
  }

  const ins = ElLoading.service({ text: `导入中（${rows.length}条）...` });
  try {
    let ok = 0;
    let fail = 0;

    for (const r of rows) {
      try {
        const payload: any = {
          code: r.code || undefined,
          name: r.name || undefined,
          mnemonic_code: r.mnemonic_code || undefined,
          enabled: r.enabled ? Number(r.enabled) : 1,
          sort_no: r.sort_no ? Number(r.sort_no) : 0,
          description: r.description || undefined,
        };

        const id = r.code ? codeToId.get(r.code) : undefined;
        if (id) {
          await updateAuxiliaryCate({ id, ...payload });
        } else {
          // 新增时仍写入默认 apply_scope=0（通用）
          await createAuxiliaryCate({ ...payload, apply_scope: 0 });
        }
        ok++;
      } catch {
        fail++;
      }
    }

    ElMessage.success(`导入完成：成功 ${ok} 条，失败 ${fail} 条`);
    await refreshAfterAuxTypeChange();
  } finally {
    ins.close();
  }
}

async function onImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  input.value = '';

  if (!file.name.toLowerCase().endsWith('.csv')) {
    ElMessage.warning('仅支持 CSV 文件');
    return;
  }

  await importAuxTypeFromCsv(file);
}

// ===== 更多操作（仅辅助核算类别） =====
function ensureSelection(): any[] {
  const rows = multipleSelection.value || [];
  if (rows.length === 0) {
    ElMessage.warning('请先勾选要操作的数据');
    return [];
  }
  return rows;
}

async function batchSetEnabled(enabled: number) {
  if (!isAuxType.value) return toastNoApi();
  const rows = ensureSelection();
  if (rows.length === 0) return;

  const ins = ElLoading.service({ text: '处理中...' });
  try {
    for (const r of rows) {
      await updateAuxiliaryCate({ id: r.id, enabled });
    }
    ElMessage.success('批量更新成功');
    await refreshAfterAuxTypeChange();
  } catch (e: any) {
    ElMessage.error(e?.message || '批量更新失败');
  } finally {
    ins.close();
  }
}

async function batchDelete() {
  if (!isAuxType.value) return toastNoApi();
  const rows = ensureSelection();
  if (rows.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${rows.length} 条类别吗？`,
      '删除确认',
      { type: 'warning' },
    );

    const ins = ElLoading.service({ text: '删除中...' });
    try {
      for (const r of rows) {
        await deleteAuxiliaryCate(String(r.id));
      }
      ElMessage.success('批量删除成功');
      await refreshAfterAuxTypeChange();
    } finally {
      ins.close();
    }
  } catch {
    // cancel
  }
}

async function mergeSelected() {
  if (!isAuxType.value) return toastNoApi();
  const rows = ensureSelection();
  if (rows.length < 2) {
    ElMessage.warning('合并至少选择 2 条');
    return;
  }

  const defaultCode = String(rows[0]?.code ?? '').trim();
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入要保留的类别编码（其余将被删除）。注意：若其它业务表引用了类别，合并前请确认一致性。',
      '合并',
      {
        inputValue: defaultCode,
        inputPlaceholder: '例如 AUX001',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      },
    );

    const keepCode = String(value ?? '').trim();
    const keep = rows.find((r) => String(r?.code ?? '').trim() === keepCode);
    if (!keep) {
      ElMessage.error('保留编码必须在已选数据中');
      return;
    }

    const ins = ElLoading.service({ text: '合并中...' });
    try {
      for (const r of rows) {
        if (r.id === keep.id) continue;
        await deleteAuxiliaryCate(String(r.id));
      }
      ElMessage.success('合并完成');
      await refreshAfterAuxTypeChange();
    } finally {
      ins.close();
    }
  } catch {
    // cancel
  }
}

async function clearAll() {
  if (!isAuxType.value) return toastNoApi();

  try {
    await ElMessageBox.confirm(
      '确认清空所有辅助核算类别吗？（将软删除所有类别）',
      '清空确认',
      { type: 'warning' },
    );

    const all = await getAuxiliaryCatePage({ pageNo: 1, page: 0 });
    const list = Array.isArray(all?.list) ? all.list : [];

    const ins = ElLoading.service({ text: '清空中...' });
    try {
      for (const r of list) {
        if (Number((r as any)?.lingma_sys_is_delete ?? 0) === 1) continue;
        await deleteAuxiliaryCate(String((r as any)?.id));
      }
      ElMessage.success('已清空');
      await refreshAfterAuxTypeChange();
    } finally {
      ins.close();
    }
  } catch {
    // cancel
  }
}

watch(() => route.query.tab, (tab) => {
  if (String(tab || '').toLowerCase() === 'customer') {
    activeTab.value = 'scope:1';
  }
}, { immediate: true });

onMounted(async () => {
  filterCollapsed.value = true;
  await loadDynamicTabs();
  await loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- hidden import input -->
      <input
        ref="importFileRef"
        type="file"
        accept=".csv"
        style="display: none"
        @change="onImportFileChange"
      />

      <!-- AuxType CRUD dialog -->
      <AuxTypeForm
        v-model="auxDialogVisible"
        :mode="auxDialogMode"
        :row="auxDialogRow"
        @success="refreshAfterAuxTypeChange"
      />

      <FinAuxRecordForm
        v-if="activeDimCode"
        v-model="finAuxDialogVisible"
        :dim-code="activeDimCode"
        :mode="finAuxDialogMode"
        :row="finAuxDialogRow"
        @success="loadData"
      />

      <!-- Tabs：动态 -->
      <ElTabs v-model="activeTab" @tab-change="handleTabChange">
        <ElTabPane label="辅助核算类别" name="auxType" />
        <ElTabPane
          v-for="t in dynamicTabs"
          :key="t.key"
          :label="t.label"
          :name="t.key"
        />
      </ElTabs>

      <div v-if="sourceSubjectTitle && activeDimCode === 'CUSTOMER'" class="aux-source-subject">
        当前科目：<b>{{ sourceSubjectTitle }}</b>
      </div>

      <div class="aux-table-card">
        <!-- Search toolbar -->
        <div class="aux-filter-toolbar">
          <div v-if="filterCollapsed" class="aux-filter-compact">
            <div class="aux-filter-compact__left">
              <ElInput
                v-model="keyword"
                class="aux-filter-compact__input"
                placeholder="输入编码或名称"
                clearable
                @keyup.enter="handleQuery"
              />
              <ElButton
                v-if="canCreateRecord"
                class="aux-filter-create"
                type="primary"
                @click="handleCreate"
              >
                新增
              </ElButton>
              <ElButton
                v-if="canInitializeDept"
                class="aux-filter-create"
                @click="handleInitializeDept"
              >
                初始化
              </ElButton>
              <div
                v-if="filterSummary"
                class="aux-filter-summary"
                :title="filterSummary"
              >
                {{ filterSummary }}
              </div>
            </div>
            <div class="aux-filter-compact__actions">
              <ElButton type="primary" @click="handleQuery">查询</ElButton>
              <ElButton @click="handlePrint">打印</ElButton>
              <ElButton @click="handleExport">导出</ElButton>
              <ElButton class="aux-filter-expand" text type="primary" @click="filterCollapsed = false">
                展开筛选
              </ElButton>
            </div>
          </div>

          <div v-else class="aux-filter-expanded">
            <div class="aux-filter-grid">
              <label class="aux-filter-item">
                <span class="aux-filter-label">输入编码或名称</span>
                <ElInput
                  v-model="keyword"
                  placeholder="请输入"
                  clearable
                  @keyup.enter="handleQuery"
                />
              </label>
              <label class="aux-filter-item aux-filter-item--check">
                <span class="aux-filter-label">状态</span>
                <ElCheckbox v-model="showDisabled" @change="handleQuery">
                  显示停用
                </ElCheckbox>
              </label>
            </div>

            <div class="aux-filter-actions">
              <ElButton class="aux-filter-collapse" text type="primary" @click="filterCollapsed = true">
                收起筛选
              </ElButton>
              <div class="aux-filter-buttons">
                <ElButton type="primary" @click="handleQuery">查询</ElButton>
                <ElButton @click="handlePrint">打印</ElButton>
                <TableAction
                  :actions="[
                    {
                      label: '新增',
                      type: 'primary',
                      icon: ACTION_ICON.ADD,
                      ifShow: () => isAuxType || isFinAuxScope,
                      onClick: handleCreate,
                    },
                    {
                      label: '初始化',
                      type: 'primary',
                      ifShow: () => canInitializeDept.value,
                      onClick: handleInitializeDept,
                    },
                    {
                      label: '导出',
                      type: 'primary',
                      icon: ACTION_ICON.DOWNLOAD,
                      ifShow: () => isAuxType || isFinAuxScope || isCashFlow,
                      onClick: handleExport,
                    },
                    {
                      label: '导入',
                      type: 'primary',
                      icon: ACTION_ICON.UPLOAD,
                      ifShow: () => isAuxType,
                      onClick: handleImport,
                    },
                  ]"
                />

                <!-- 只有辅助核算类别显示更多操作 -->
                <ElDropdown v-if="isAuxType" trigger="click">
                  <ElButton type="primary">
                    更多
                    <span class="ml-1">▾</span>
                  </ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="() => batchSetEnabled(1)">批量启用</ElDropdownItem>
                      <ElDropdownItem @click="() => batchSetEnabled(0)">批量停用</ElDropdownItem>
                      <ElDropdownItem @click="batchDelete">批量删除</ElDropdownItem>
                      <ElDropdownItem @click="mergeSelected">合并</ElDropdownItem>
                      <ElDropdownItem @click="clearAll">清空</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="aux-table-scroll">
          <ElTable
            v-loading="loading"
            :data="visibleTableData"
            stripe
            border
            style="width: 100%; min-width: 960px"
            @selection-change="handleSelectionChange"
          >
        <ElTableColumn type="selection" width="50" />

        <!-- 辅助核算类别（管理表） -->
        <template v-if="isAuxType">
          <ElTableColumn prop="code" label="类别编码" min-width="140" />
          <ElTableColumn prop="name" label="类别名称" min-width="200" />
          <ElTableColumn prop="mnemonic_code" label="助记码" min-width="140" />
          <ElTableColumn label="启用状态" min-width="110">
            <template #default="{ row }">
              <ElSwitch
                :model-value="Number(row?.enabled ?? 1) === 1"
                @change="(v:any) => handleToggleAuxEnabled(row, Boolean(v))"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="description"
            label="备注"
            min-width="200"
            show-overflow-tooltip
          />
          <ElTableColumn label="操作" fixed="right" width="180">
            <template #default="{ row }">
              <TableAction
                :actions="[
                  {
                    label: '编辑',
                    type: 'primary',
                    link: true,
                    icon: ACTION_ICON.EDIT,
                    onClick: () => openEditAuxType(row),
                  },
                  {
                    label: '删除',
                    type: 'danger',
                    link: true,
                    icon: ACTION_ICON.DELETE,
                    onClick: () => handleDeleteAuxType(row),
                  },
                ]"
              />
            </template>
          </ElTableColumn>
        </template>

        <!-- 财务辅助核算专用档案：客户/供应商/员工/部门/项目 -->
        <template v-else-if="isFinAuxScope">
          <template v-if="activeDimCode === 'CUSTOMER'">
            <ElTableColumn prop="customer_code" label="客户编码" min-width="140" />
            <ElTableColumn prop="customer_name" label="客户名称" min-width="180" />
            <ElTableColumn prop="customer_short_name" label="简称" min-width="120" />
            <ElTableColumn prop="tax_no" label="税号" min-width="160" show-overflow-tooltip />
            <ElTableColumn prop="contact_name" label="联系人" min-width="120" />
            <ElTableColumn prop="contact_mobile" label="手机" min-width="120" />
          </template>
          <template v-else-if="activeDimCode === 'SUPPLIER'">
            <ElTableColumn prop="supplier_code" label="供应商编码" min-width="140" />
            <ElTableColumn prop="supplier_name" label="供应商名称" min-width="180" />
            <ElTableColumn prop="supplier_short_name" label="简称" min-width="120" />
            <ElTableColumn prop="tax_no" label="税号" min-width="160" show-overflow-tooltip />
            <ElTableColumn prop="contact_name" label="联系人" min-width="120" />
            <ElTableColumn prop="contact_mobile" label="手机" min-width="120" />
          </template>
          <template v-else-if="activeDimCode === 'STAFF'">
            <ElTableColumn prop="employee_code" label="员工编码" min-width="140" />
            <ElTableColumn prop="employee_name" label="员工姓名" min-width="160" />
            <ElTableColumn prop="department_name" label="所属部门" min-width="180" />
            <ElTableColumn prop="position_name" label="岗位" min-width="140" />
            <ElTableColumn prop="mobile" label="手机号" min-width="120" />
          </template>
          <template v-else-if="activeDimCode === 'DEPT'">
            <ElTableColumn prop="department_code" label="部门编码" min-width="140" />
            <ElTableColumn prop="department_name" label="部门名称" min-width="180" />
            <ElTableColumn prop="department_short_name" label="简称" min-width="120" />
            <ElTableColumn prop="parent_department_code" label="上级编码" min-width="140" />
            <ElTableColumn prop="parent_department_name" label="上级名称" min-width="180" />
          </template>
          <template v-else-if="activeDimCode === 'PROJECT'">
            <ElTableColumn prop="project_code" label="项目编码" min-width="140" />
            <ElTableColumn prop="project_name" label="项目名称" min-width="200" />
            <ElTableColumn prop="project_type" label="项目类型" min-width="120" />
            <ElTableColumn prop="department_name" label="所属部门" min-width="160" />
            <ElTableColumn prop="customer_name" label="客户" min-width="160" />
            <ElTableColumn prop="manager_name" label="负责人" min-width="120" />
          </template>
          <ElTableColumn prop="remark" label="备注" min-width="160" show-overflow-tooltip />
          <ElTableColumn label="启用状态" min-width="110">
            <template #default="{ row }">
              <ElSwitch
                :model-value="Number(row?.enabled ?? 1) === 1"
                @change="(v:any) => handleToggleFinAuxEnabled(row, Boolean(v))"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" fixed="right" width="180">
            <template #default="{ row }">
              <TableAction
                :actions="[
                  {
                    label: '编辑',
                    type: 'primary',
                    link: true,
                    icon: ACTION_ICON.EDIT,
                    onClick: () => openEditFinAuxRecord(row),
                  },
                  {
                    label: '删除',
                    type: 'danger',
                    link: true,
                    icon: ACTION_ICON.DELETE,
                    onClick: () => handleDeleteFinAuxRecord(row),
                  },
                ]"
              />
            </template>
          </ElTableColumn>
        </template>
        <!-- 现金流 -->
        <template v-else-if="isCashFlow">
          <ElTableColumn prop="code" label="现金流编码" min-width="120" />
          <ElTableColumn
            prop="name"
            label="现金流名称"
            min-width="360"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="category"
            label="现金流类别"
            min-width="220"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="remark"
            label="备注"
            min-width="160"
            show-overflow-tooltip
          />
          <ElTableColumn label="是否启用" min-width="100">
            <template #default="{ row }">
              <span>{{ Number(row?.enabled ?? 1) === 1 ? '启用' : '停用' }}</span>
            </template>
          </ElTableColumn>
        </template>

        <!-- 其他 -->
        <template v-else>
          <ElTableColumn label="提示">
            <template #default>
              <span class="opacity-70">暂无可用接口，待接入</span>
            </template>
          </ElTableColumn>
        </template>
          </ElTable>
        </div>

        <!-- Pagination -->
        <div class="aux-pagination">
          <ElPagination
            v-if="canCreateRecord"
            v-model:current-page="currentPage"
            v-model:page-size="page"
            :total="visibleTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          />
          <div v-else class="text-sm opacity-70">共 {{ visibleTableData.length }} 条</div>
        </div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.aux-source-subject {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

:deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.aux-table-card {
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background: var(--el-bg-color);
}

.aux-filter-toolbar {
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  padding: 12px;
}

.aux-filter-toolbar :deep(.el-button) {
  height: 30px;
  min-width: 64px;
  min-height: 30px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.aux-filter-toolbar :deep(.el-button.is-text) {
  min-width: auto;
  padding-right: 8px;
  padding-left: 8px;
}

.aux-filter-toolbar :deep(.el-button span) {
  white-space: nowrap;
}

.aux-filter-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.aux-filter-compact__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.aux-filter-compact__input {
  width: 280px;
  flex: 0 0 280px;
}

.aux-filter-compact__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.aux-filter-compact__actions :deep(.el-button),
.aux-filter-expand,
.aux-filter-create {
  flex: 0 0 auto;
}

.aux-filter-summary {
  max-width: 360px;
  min-width: 0;
  flex: 0 1 360px;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aux-filter-expanded {
  display: grid;
  gap: 12px;
}

.aux-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.aux-filter-item {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.aux-filter-item--check {
  align-content: end;
}

.aux-filter-label {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.aux-filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.aux-filter-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.aux-filter-collapse {
  flex: 0 0 auto;
}

.aux-table-scroll {
  overflow: auto;
}

.aux-table-scroll :deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
}

.aux-table-scroll :deep(.el-table__inner-wrapper::before),
.aux-table-scroll :deep(.el-table__border-left-patch) {
  display: none;
}

.aux-table-scroll :deep(.el-table--border),
.aux-table-scroll :deep(.el-table__inner-wrapper) {
  border-top: 0;
  border-right: 0;
  border-left: 0;
}

.aux-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 1280px) {
  .aux-filter-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
}

@media (max-width: 960px) {
  .aux-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .aux-filter-grid,
  .aux-filter-actions,
  .aux-filter-buttons,
  .aux-filter-compact,
  .aux-filter-compact__left {
    display: grid;
    grid-template-columns: 1fr;
  }

  .aux-filter-compact__input {
    width: 100%;
    flex: 1 1 100%;
  }

  .aux-filter-compact__actions {
    display: grid;
    grid-template-columns: repeat(4, max-content);
    justify-content: start;
  }

  .aux-filter-summary {
    max-width: none;
    flex: 1 1 100%;
  }

  .aux-filter-buttons {
    justify-content: stretch;
  }
}


@media print {
  .aux-filter-toolbar,
  .aux-pagination,
  :deep(.el-tabs__header) {
    display: none !important;
  }

  .aux-table-card {
    border: 0;
  }

  .aux-table-scroll {
    overflow: visible;
  }
}
</style>
