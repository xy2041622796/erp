<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElLink,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

import {
  getVoucherDetailAuxiliaryRows,
  getVoucherDetailsByIds,
  getVoucherPage,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';
import { addMoney, moneyNumber, subMoney, sumByMoney } from '#/utils/finance/decimal-money';
import {
  LEDGER_COLUMNS,
  monthEndDate,
  monthLabel,
  toMoney,
} from '#/views/finance/ledger/detail/data';

import type { VoucherDetailAuxRow } from '#/api/erp/finance/voucher/voucherAux';

defineOptions({ name: 'FinanceCurrentAccountLedger' });

const router = useRouter();

type CurrentAccountEntry = {
  rowid: string;
  auxText: string;
  dimCode: string;
  dimName: string;
  valueCode: string;
  valueName: string;
  voucherId: string;
  voucherNo: string;
  date: string;
  subject: string;
  subjectCode: string;
  subjectName: string;
  summary: string;
  debit: number;
  credit: number;
};

type CurrentAccountSubjectNode = {
  balance: number;
  children: CurrentAccountDetailNode[];
  credit: number;
  debit: number;
  entryCount: number;
  key: string;
  subjectCode: string;
  subjectName: string;
  type: 'subject';
};

type CurrentAccountDetailNode = {
  entry: CurrentAccountEntry;
  key: string;
  subjectCode: string;
  subjectName: string;
  type: 'detail';
};

type CurrentAccountTreeNode = CurrentAccountDetailNode | CurrentAccountSubjectNode;

type LedgerRow = {
  balanceAbs: number;
  credit: number;
  date: string;
  debit: number;
  directionText: string;
  subject: string;
  summary: string;
  type: 'entry' | 'opening' | 'sumMonth' | 'sumYear';
  voucherId?: string;
  voucherNo: string;
};

const CURRENT_ACCOUNT_COLUMNS = LEDGER_COLUMNS.filter((column) => column.key !== 'subject');

const CONTACT_DIM_OPTIONS = [
  { label: '全部辅助核算', value: 'ALL' },
  { label: '往来单位', value: 'PARTNER' },
  { label: '客户', value: 'CUSTOMER' },
  { label: '供应商', value: 'SUPPLIER' },
  { label: '部门', value: 'DEPT' },
  { label: '项目', value: 'PROJECT' },
  { label: '职员', value: 'STAFF' },
  { label: '员工', value: 'EMPLOYEE' },
  { label: '合同', value: 'CONTRACT' },
];

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(month: string) {
  const [year, rawMonth] = String(month || '').split('-').map(Number);
  const y = year || new Date().getFullYear();
  const m = rawMonth || new Date().getMonth() + 1;
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0),
    end: new Date(y, m, 0, 23, 59, 59),
  };
}

function toMysqlDateTime(date: Date) {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getRangeByPeriod(startMonth: string, endMonth: string) {
  const start = String(startMonth || endMonth || '').trim();
  const end = String(endMonth || startMonth || '').trim();
  if (!start && !end) return { startText: '', endText: '' };
  return {
    startText: toMysqlDateTime(getMonthRange(start || end).start),
    endText: toMysqlDateTime(getMonthRange(end || start).end),
  };
}

function formatDateText(value: any) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, 10) : '';
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const value = String(item ?? '').trim();
    if (value) return value;
  }
  return '';
}

function getDimName(code: string, fallback?: string) {
  const normalized = String(code || '').trim().toUpperCase();
  const matched = CONTACT_DIM_OPTIONS.find((item) => item.value === normalized);
  return matched?.label || String(fallback || normalized).trim() || '辅助核算';
}

function getDirectionTextByRunning(running: number) {
  return running >= 0 ? '借' : '贷';
}

function getSelectedDimCodes() {
  const selected = String(dimCode.value || '').trim().toUpperCase();
  // “全部辅助核算”不传 dimCodes，让接口查询 Bil_Voucher_Detail_Aux 中所有维度，
  // 避免已保存的 DEPT/PROJECT 等辅助核算被前端固定维度列表过滤掉。
  if (!selected || selected === 'ALL') return [];
  return [selected];
}

function normalizeVoucherDate(value: any) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortEntries(rows: CurrentAccountEntry[]) {
  return [...rows].sort((a, b) => {
    const da = normalizeVoucherDate(a.date);
    const db = normalizeVoucherDate(b.date);
    if (da !== db) return da - db;
    const voucherCompare = String(a.voucherNo || '').localeCompare(String(b.voucherNo || ''), 'zh-Hans-CN');
    if (voucherCompare !== 0) return voucherCompare;
    return String(a.rowid || '').localeCompare(String(b.rowid || ''));
  });
}

const periodStart = ref(getCurrentMonth());
const periodEnd = ref(getCurrentMonth());
const dimCode = ref('ALL');
const keyword = ref('');
const objectKeyword = ref('');
const loading = ref(false);
const subjectNodes = ref<CurrentAccountSubjectNode[]>([]);
const entries = ref<CurrentAccountEntry[]>([]);
const activeKey = ref('');
const expandedSubjectKeys = ref<Record<string, boolean>>({});

const displayPeriodText = computed(() => {
  const start = String(periodStart.value || '').trim();
  const end = String(periodEnd.value || '').trim();
  if (!start && !end) return '未选择期间';
  if (start && end && start !== end) return `${monthLabel(start)} 至 ${monthLabel(end)}`;
  return monthLabel(start || end);
});

const filteredSubjectNodes = computed(() => {
  const key = String(objectKeyword.value || '').trim();
  if (!key) return subjectNodes.value;
  return subjectNodes.value
    .map((subject) => {
      const subjectMatched = subject.subjectCode.includes(key) || subject.subjectName.includes(key);
      const children = subject.children.filter((child) => {
        const entry = child.entry;
        return (
          entry.voucherNo.includes(key) ||
          entry.summary.includes(key) ||
          entry.valueCode.includes(key) ||
          entry.valueName.includes(key) ||
          entry.auxText.includes(key) ||
          entry.dimName.includes(key)
        );
      });
      if (!subjectMatched && children.length === 0) return null;
      return subjectMatched ? subject : { ...subject, children };
    })
    .filter(Boolean) as CurrentAccountSubjectNode[];
});

const visibleTreeNodes = computed<CurrentAccountTreeNode[]>(() => {
  const out: CurrentAccountTreeNode[] = [];
  for (const subject of filteredSubjectNodes.value) {
    out.push(subject);
    if (expandedSubjectKeys.value[subject.key] !== false) {
      out.push(...subject.children);
    }
  }
  return out;
});

const activeNode = computed<CurrentAccountTreeNode | null>(() => {
  const key = activeKey.value;
  if (!key) return visibleTreeNodes.value[0] || null;
  return visibleTreeNodes.value.find((item) => item.key === key) || null;
});

const activeEntries = computed(() => {
  const node = activeNode.value;
  if (!node) return [];
  if (node.type === 'subject') {
    return sortEntries(entries.value.filter((item) => item.subjectCode === node.subjectCode));
  }
  return [node.entry];
});

const objectCountText = computed(() => `${filteredSubjectNodes.value.length} 个辅助科目`);

const objectTitle = computed(() => {
  const node = activeNode.value;
  if (!node) return '请选择辅助核算科目';
  if (node.type === 'subject') return `${node.subjectCode} ${node.subjectName}`.trim();
  return `${node.entry.voucherNo || '凭证明细'} / ${node.entry.auxText || `${node.entry.dimName}：${node.entry.valueName || node.entry.valueCode}`}`;
});

const objectMeta = computed(() => {
  const node = activeNode.value;
  if (!node) return '未选择辅助核算科目';
  if (node.type === 'subject') return `${node.entryCount} 笔辅助明细 · 方向借`;
  return `${node.subjectCode} ${node.subjectName} · ${node.entry.date} · 方向借`;
});

const totalDebit = computed(() => moneyNumber(sumByMoney(activeEntries.value, (item) => item.debit)));
const totalCredit = computed(() => moneyNumber(sumByMoney(activeEntries.value, (item) => item.credit)));

const rows = computed<LedgerRow[]>(() => {
  const startMonth = String(periodStart.value || periodEnd.value || '').trim();
  const endMonth = String(periodEnd.value || periodStart.value || '').trim();
  const endDate = monthEndDate(endMonth);
  let running = 0;
  let debitSum = 0;
  let creditSum = 0;

  const out: LedgerRow[] = [
    {
      type: 'opening',
      date: startMonth ? `${startMonth}-01` : '',
      voucherNo: '',
      subject: objectTitle.value,
      summary: '期初余额',
      debit: 0,
      credit: 0,
      directionText: getDirectionTextByRunning(running),
      balanceAbs: 0,
    },
  ];

  for (const entry of activeEntries.value) {
    debitSum = moneyNumber(addMoney([debitSum, entry.debit]));
    creditSum = moneyNumber(addMoney([creditSum, entry.credit]));
    running = moneyNumber(addMoney([running, subMoney(entry.debit, entry.credit)]));
    out.push({
      type: 'entry',
      date: entry.date,
      voucherId: entry.voucherId,
      voucherNo: entry.voucherNo,
      subject: entry.subject,
      summary: entry.summary,
      debit: entry.debit,
      credit: entry.credit,
      directionText: getDirectionTextByRunning(running),
      balanceAbs: moneyNumber(Math.abs(running)),
    });
  }

  out.push({
    type: 'sumMonth',
    date: endDate,
    voucherNo: '',
    subject: objectTitle.value,
    summary: '本期合计',
    debit: debitSum,
    credit: creditSum,
    directionText: getDirectionTextByRunning(running),
    balanceAbs: moneyNumber(Math.abs(running)),
  });
  out.push({
    type: 'sumYear',
    date: endDate,
    voucherNo: '',
    subject: objectTitle.value,
    summary: '本年累计',
    debit: debitSum,
    credit: creditSum,
    directionText: getDirectionTextByRunning(running),
    balanceAbs: moneyNumber(Math.abs(running)),
  });

  return out;
});

const endingBalance = computed(() => {
  const endingRow = [...rows.value].reverse().find((row) => row.type === 'sumYear' || row.type === 'sumMonth');
  return Number(endingRow?.balanceAbs || 0);
});

function buildRows(params: {
  auxRows: VoucherDetailAuxRow[];
  details: ErpVoucherApi.VoucherDetail[];
  mains: ErpVoucherApi.VoucherMain[];
}) {
  const detailMap = new Map<string, ErpVoucherApi.VoucherDetail>();
  const mainMap = new Map<string, ErpVoucherApi.VoucherMain>();

  for (const detail of params.details || []) {
    const detailId = pickNonEmptyText((detail as any)?.row_id, detail?.rowid);
    if (detailId) detailMap.set(detailId, detail);
  }
  for (const main of params.mains || []) {
    const mainId = pickNonEmptyText((main as any)?.row_id, main?.rowid);
    if (mainId) mainMap.set(mainId, main);
  }

  const auxGroupMap = new Map<string, VoucherDetailAuxRow[]>();
  for (const aux of params.auxRows || []) {
    const detailId = pickNonEmptyText(aux.voucher_detail_id);
    const voucherId = pickNonEmptyText(aux.voucher_id);
    if (!detailId || !voucherId) continue;
    const key = voucherId + '::' + detailId;
    const list = auxGroupMap.get(key) || [];
    list.push(aux);
    auxGroupMap.set(key, list);
  }

  const nextEntries: CurrentAccountEntry[] = [];
  for (const [groupKey, auxList] of auxGroupMap.entries()) {
    const [voucherId = '', detailId = ''] = groupKey.split('::');
    const detail = detailMap.get(detailId);
    const main = mainMap.get(voucherId);
    if (!detail || !main || auxList.length === 0) continue;

    const accountCode = pickNonEmptyText(detail.account_code, (auxList[0] as any)?.account_code);
    const accountName = pickNonEmptyText(detail.account_name, accountCode);
    const sortedAuxList = [...auxList].sort((a, b) =>
      String(a.dim_code || '').localeCompare(String(b.dim_code || ''), 'zh-Hans-CN'),
    );
    const auxParts = sortedAuxList
      .map((aux) => {
        const currentDimCode = String(aux.dim_code || '').trim().toUpperCase();
        const valueCode = pickNonEmptyText(aux.value_code);
        if (!currentDimCode || !valueCode) return '';
        return getDimName(currentDimCode, aux.dim_name) + '：' + pickNonEmptyText(aux.value_name, valueCode);
      })
      .filter(Boolean);
    const auxText = auxParts.join(' / ');
    const firstAux = sortedAuxList[0]!;
    const firstDimCode = String(firstAux.dim_code || '').trim().toUpperCase();
    const firstValueCode = pickNonEmptyText(firstAux.value_code);

    nextEntries.push({
      rowid: pickNonEmptyText((firstAux as any).row_id, firstAux.rowid, detailId),
      auxText,
      dimCode: sortedAuxList.map((aux) => String(aux.dim_code || '').trim().toUpperCase()).filter(Boolean).join('+') || firstDimCode,
      dimName: auxText || getDimName(firstDimCode, firstAux.dim_name),
      valueCode: sortedAuxList.map((aux) => pickNonEmptyText(aux.value_code)).filter(Boolean).join('+') || firstValueCode,
      valueName: auxText || pickNonEmptyText(firstAux.value_name, firstValueCode),
      voucherId,
      voucherNo: pickNonEmptyText(main.voucher_code, main.ReportID, main.business_code),
      date: formatDateText(pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime)),
      subject: [accountCode, accountName].filter(Boolean).join(' '),
      subjectCode: accountCode,
      subjectName: accountName,
      summary: pickNonEmptyText(detail.abstract_content, main.description),
      debit: moneyNumber(detail.debit_amount),
      credit: moneyNumber(detail.credit_amount),
    });
  }

  const mergedEntryMap = new Map<string, CurrentAccountEntry>();
  for (const entry of nextEntries) {
    const mergeKey = [entry.subjectCode, entry.voucherId || entry.voucherNo, entry.dimCode, entry.valueCode].join('::');
    const existed = mergedEntryMap.get(mergeKey);
    if (!existed) {
      mergedEntryMap.set(mergeKey, { ...entry });
      continue;
    }
    existed.debit = moneyNumber(addMoney([existed.debit, entry.debit]));
    existed.credit = moneyNumber(addMoney([existed.credit, entry.credit]));
    const summaries = [existed.summary, entry.summary].map((item) => String(item || '').trim()).filter(Boolean);
    existed.summary = Array.from(new Set(summaries)).join(' / ');
  }
  const mergedEntries = sortEntries([...mergedEntryMap.values()]);

  const subjectMap = new Map<string, CurrentAccountSubjectNode>();
  for (const entry of mergedEntries) {
    const subjectCode = String(entry.subjectCode || '').trim();
    if (!subjectCode) continue;
    const subjectKey = `subject::${subjectCode}`;
    const existed = subjectMap.get(subjectKey) || {
      key: subjectKey,
      type: 'subject' as const,
      subjectCode,
      subjectName: entry.subjectName,
      debit: 0,
      credit: 0,
      balance: 0,
      entryCount: 0,
      children: [],
    };
    existed.debit = moneyNumber(addMoney([existed.debit, entry.debit]));
    existed.credit = moneyNumber(addMoney([existed.credit, entry.credit]));
    existed.balance = moneyNumber(subMoney(existed.debit, existed.credit));
    existed.entryCount += 1;
    existed.children.push({
      key: `detail::${entry.voucherId}::${entry.rowid}::${entry.dimCode}::${entry.valueCode}`,
      type: 'detail' as const,
      subjectCode,
      subjectName: entry.subjectName,
      entry,
    });
    subjectMap.set(subjectKey, existed);
  }

  const nextSubjectNodes = [...subjectMap.values()]
    .map((subject) => ({
      ...subject,
      children: subject.children.sort((a, b) => {
        const [first] = sortEntries([a.entry, b.entry]);
        return first === a.entry ? -1 : 1;
      }),
    }))
    .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode, 'zh-Hans-CN'));

  return { nextSubjectNodes, nextEntries: mergedEntries };
}

async function loadData() {
  loading.value = true;
  try {
    const { startText, endText } = getRangeByPeriod(periodStart.value, periodEnd.value);
    const [mainsRes, auxRows] = await Promise.all([
      getVoucherPage({ pageNo: 1, page: 0, voucherDateRange: [startText, endText] } as any),
      getVoucherDetailAuxiliaryRows({
        dimCodes: getSelectedDimCodes(),
        keyword: keyword.value,
      }),
    ]);

    const mains = Array.isArray(mainsRes?.list) ? (mainsRes.list as ErpVoucherApi.VoucherMain[]) : [];
    const voucherIds = mains
      .map((item) => pickNonEmptyText((item as any)?.row_id, item.rowid))
      .filter(Boolean);
    const voucherIdSet = new Set(voucherIds);
    const filteredAuxRows = (auxRows || []).filter((item) => voucherIdSet.has(pickNonEmptyText(item.voucher_id)));
    const details = await getVoucherDetailsByIds(voucherIds);
    const built = buildRows({ auxRows: filteredAuxRows, details, mains });

    subjectNodes.value = built.nextSubjectNodes;
    entries.value = built.nextEntries;
    expandedSubjectKeys.value = Object.fromEntries(subjectNodes.value.map((item) => [item.key, true]));

    if (!activeKey.value || !visibleTreeNodes.value.some((item) => item.key === activeKey.value)) {
      activeKey.value = subjectNodes.value[0]?.key || '';
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('加载往来账失败');
    subjectNodes.value = [];
    entries.value = [];
    activeKey.value = '';
  } finally {
    loading.value = false;
  }
}

function pickTreeNode(item: CurrentAccountTreeNode) {
  activeKey.value = item.key;
}

function toggleSubjectExpand(item: CurrentAccountTreeNode) {
  if (item.type !== 'subject') return;
  expandedSubjectKeys.value = {
    ...expandedSubjectKeys.value,
    [item.key]: expandedSubjectKeys.value[item.key] === false,
  };
}

function isSubjectExpanded(item: CurrentAccountTreeNode) {
  return item.type === 'subject' && expandedSubjectKeys.value[item.key] !== false;
}

function openVoucherByRow(row: LedgerRow) {
  if (!row.voucherId || row.type !== 'entry') {
    ElMessage.warning('当前行没有可查看的凭证');
    return;
  }
  router.push({
    path: '/finance/Voucher/create',
    query: {
      moduleScope: 'finance',
      type: 'edit',
      id: row.voucherId,
      source: 'current-account-ledger',
    },
  });
}

watch(activeNode, (item) => {
  if (!item) return;
  if (activeKey.value !== item.key) activeKey.value = item.key;
});

onMounted(loadData);
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col gap-1.5">
      <div class="query-summary-card">
        <div class="query-summary-card__main">
          <div class="query-summary-card__title">
            <span>会计期间：{{ displayPeriodText || '--' }}</span>
          </div>
        </div>

        <div class="query-summary-card__actions">
          <ElDatePicker v-model="periodStart" type="month" value-format="YYYY-MM" class="period-picker" />
          <span class="period-separator">至</span>
          <ElDatePicker v-model="periodEnd" type="month" value-format="YYYY-MM" class="period-picker" />
          <ElSelect v-model="dimCode" class="dim-select" placeholder="辅助维度">
            <ElOption
              v-for="item in CONTACT_DIM_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElInput
            v-model="keyword"
            clearable
            class="keyword-input"
            placeholder="搜索辅助值/编码/科目"
            @keyup.enter="loadData"
          />
          <ElButton type="primary" :loading="loading" @click="loadData">刷新</ElButton>
        </div>
      </div>

      <div class="detail-ledger-layout min-h-0 flex-1">
        <div class="subject-panel flex h-full min-h-0 flex-col rounded-md border border-border bg-card shadow-sm">
          <div class="subject-panel__header border-b border-border p-3">
            <div class="flex items-center justify-between gap-2 text-sm font-medium">
              <span>辅助核算科目</span>
              <span class="text-xs text-muted-foreground">{{ objectCountText }}</span>
            </div>
            <div class="mt-2">
              <ElInput v-model="objectKeyword" class="subject-search" placeholder="搜索科目/凭证/往来对象" clearable />
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-auto p-2">
            <div
              v-for="item in visibleTreeNodes"
              :key="item.key"
              class="subject-tree-row flex cursor-pointer items-center gap-1 rounded px-2 py-2 text-sm hover:bg-muted"
              :class="{ 'bg-muted': activeKey === item.key, 'is-detail-node': item.type === 'detail' }"
              :title="item.type === 'subject' ? [item.subjectCode, item.subjectName].filter(Boolean).join(' ') : [item.entry.voucherNo, item.entry.auxText].filter(Boolean).join(' ')"
              :style="{ paddingLeft: item.type === 'detail' ? '30px' : '8px' }"
              @click="pickTreeNode(item)"
            >
              <button
                v-if="item.type === 'subject'"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-muted-foreground hover:bg-background"
                type="button"
                @click.stop="toggleSubjectExpand(item)"
              >
                {{ item.children.length > 0 ? (isSubjectExpanded(item) ? '▼' : '▶') : '' }}
              </button>
              <span v-else class="detail-node-dot">•</span>

              <div class="subject-tree-content">
                <template v-if="item.type === 'subject'">
                  <span class="subject-tree-code">{{ item.subjectCode }}</span>
                  <span class="subject-tree-name">{{ item.subjectName }}</span>
                  <span class="subject-tree-tag">{{ item.entryCount }}笔</span>
                </template>
                <template v-else>
                  <span class="subject-tree-code">{{ item.entry.voucherNo }}</span>
                  <span class="subject-tree-name">{{ item.entry.auxText || [item.entry.dimName, item.entry.valueName || item.entry.valueCode].filter(Boolean).join('：') }}</span>
                </template>
              </div>
            </div>

            <div
              v-if="!loading && filteredSubjectNodes.length === 0"
              class="px-2 py-6 text-center text-sm text-muted-foreground"
            >
              当前筛选条件下没有挂辅助核算的科目
            </div>
          </div>
        </div>

        <div class="ledger-panel min-h-0 rounded-md border border-border bg-card p-3 shadow-sm">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-medium">{{ objectTitle }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ objectMeta }} · {{ displayPeriodText }}</div>
            </div>
            <div class="ledger-mini-stats">
              <span>明细 {{ activeEntries.length }} 笔</span>
              <span>借 {{ toMoney(totalDebit) }}</span>
              <span>贷 {{ toMoney(totalCredit) }}</span>
              <span>余 {{ toMoney(endingBalance) }}</span>
            </div>
          </div>

          <div class="ledger-table-scroll">
            <table class="e2e-detail-ledger-table border-collapse border border-border text-sm">
              <colgroup>
                <col v-for="c in CURRENT_ACCOUNT_COLUMNS" :key="c.key" :style="c.width ? `width:${c.width}px` : ''" />
              </colgroup>
              <thead>
                <tr class="bg-background">
                  <th
                    v-for="c in CURRENT_ACCOUNT_COLUMNS"
                    :key="c.key"
                    class="border border-border px-2 py-2 font-normal text-muted-foreground"
                    :class="{
                      'text-left': (c.align || 'left') === 'left',
                      'text-center': c.align === 'center',
                      'text-right': c.align === 'right',
                    }"
                  >
                    {{ c.title }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(r, idx) in rows" :key="idx" class="transition-colors hover:bg-muted">
                  <td class="border border-border px-2 py-2">{{ r.date }}</td>
                  <td class="border border-border px-2 py-2">
                    <ElLink
                      v-if="r.type === 'entry' && r.voucherId"
                      type="primary"
                      :underline="false"
                      @click="openVoucherByRow(r)"
                    >
                      {{ r.voucherNo }}
                    </ElLink>
                    <span v-else>{{ r.voucherNo }}</span>
                  </td>
                  <td class="border border-border px-2 py-2">{{ r.summary }}</td>
                  <td class="border border-border px-2 py-2 text-right">{{ toMoney(r.debit) }}</td>
                  <td class="border border-border px-2 py-2 text-right">{{ toMoney(r.credit) }}</td>
                  <td class="border border-border px-2 py-2 text-center">{{ r.directionText }}</td>
                  <td class="border border-border px-2 py-2 text-right">{{ toMoney(r.balanceAbs) }}</td>
                </tr>

                <tr v-if="loading">
                  <td colspan="7" class="px-2 py-6 text-center text-sm text-muted-foreground">加载中...</td>
                </tr>

                <tr v-if="!loading && rows.length === 0">
                  <td colspan="7" class="px-2 py-6 text-center text-sm text-muted-foreground">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-2 text-xs text-muted-foreground">
            一级展示挂了辅助核算的科目；二级展示该科目下挂了辅助核算的凭证明细。右侧账页不展示科目列，点击“凭证字号”可查看对应凭证。
          </div>
        </div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.detail-ledger-layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}

.subject-panel,
.ledger-panel {
  min-width: 0;
}

.ledger-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.subject-tree-content {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.subject-tree-code {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.subject-tree-name {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject-tree-tag {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.detail-node-dot {
  display: inline-flex;
  width: 14px;
  flex: 0 0 14px;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.is-detail-node .subject-tree-code,
.is-detail-node .subject-tree-name {
  font-size: 12px;
}

.ledger-table-scroll {
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow-x: auto;
  overflow-y: auto;
}

.ledger-table-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.ledger-table-scroll::-webkit-scrollbar-track {
  background: var(--el-fill-color-light);
  border-radius: 999px;
}

.ledger-table-scroll::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker);
  border: 2px solid var(--el-fill-color-light);
  border-radius: 999px;
}

.ledger-table-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}

.e2e-detail-ledger-table {
  width: 100%;
  min-width: 920px;
  table-layout: fixed;
}

.e2e-detail-ledger-table th {
  white-space: nowrap;
  word-break: keep-all;
}

.e2e-detail-ledger-table td {
  word-break: normal;
}

.e2e-detail-ledger-table th:nth-child(3),
.e2e-detail-ledger-table td:nth-child(3) {
  min-width: 260px;
  white-space: normal;
  word-break: break-word;
}

.subject-search :deep(.el-input__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
}

.query-summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}

.query-summary-card__main {
  min-width: 0;
}

.query-summary-card__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.query-summary-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.period-picker {
  width: 130px;
}

.period-separator {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.dim-select {
  width: 150px;
}

.keyword-input {
  width: 220px;
}

.ledger-mini-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ledger-panel > .mb-2,
.ledger-panel > .mt-2 {
  flex: 0 0 auto;
}

@media (max-width: 1366px) {
  .detail-ledger-layout {
    grid-template-columns: minmax(200px, 230px) minmax(0, 1fr);
    gap: 10px;
  }

  .subject-panel__header {
    padding: 10px;
  }

  .subject-tree-row {
    padding-top: 7px;
    padding-bottom: 7px;
    font-size: 13px;
  }

  .query-summary-card {
    align-items: flex-start;
  }

  .query-summary-card__actions {
    gap: 6px;
  }
}

@media (max-width: 1180px) {
  .detail-ledger-layout {
    grid-template-columns: 190px minmax(0, 1fr);
  }

  .subject-panel__header {
    padding: 8px;
  }

  .subject-tree-row {
    gap: 0;
    padding-left: 4px;
    padding-right: 4px;
    font-size: 12px;
  }

  .query-summary-card {
    flex-wrap: wrap;
    padding: 8px 10px;
  }

  .query-summary-card__title {
    font-size: 14px;
  }

  .query-summary-card__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .ledger-panel {
    padding: 10px;
  }

  .ledger-mini-stats {
    display: none;
  }
}

@media (max-width: 960px) {
  .detail-ledger-layout {
    grid-template-columns: 1fr;
  }

  .subject-panel {
    max-height: 220px;
  }
}
</style>
