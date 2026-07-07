<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpExpenseSettlementApi } from '#/api/erp/finance/payment/settlement';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import type { Department } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import { getContractList } from '#/api/erp/contract/contract';
import { getCustomerSimpleList } from '#/api/erp/customer';
import {
  deleteExpenseSettlement,
  getExpenseSettlementOrderSummaryMap,
  getExpenseSettlementPage,
  updateExpenseSettlementStatus,
} from '#/api/erp/finance/payment/settlement';
import { getSettlementProjectSimpleList } from '#/api/erp/finance/revenue/settlement/project';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import { useGridColumns, useGridFormSchema } from '#/views/finance/payment/settlement/data';
import PaymentApplyForm from '#/views/finance/payment/submit/modules/form.vue';
import Form from '#/views/finance/payment/settlement/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpExpenseSettlement' });

const customerOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);
const contractOptions = ref<any[]>([]);
const deptOptions = ref<Department[]>([]);

const contractPeriodCache = new Map<string, Map<string, number>>();

function clearSettlementDerivedCache() {
  contractPeriodCache.clear();
}

function toTime(v: any) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

async function fillPeriodIndexForCurrentPage(rows: any[]) {
  const contractIds = Array.from(
    new Set(
      (rows || [])
        .filter((r) => String(r?.settlement_type ?? '') === '0' && String(r?.contract_id || '').trim())
        .map((r) => String(r?.contract_id || '').trim())
        .filter(Boolean),
    ),
  );

  const needFetch = contractIds.filter((cid) => !contractPeriodCache.has(cid));
  if (needFetch.length > 0) {
    await Promise.all(
      needFetch.map(async (cid) => {
        try {
          const res = await getExpenseSettlementPage({ contract_id: cid, pageNo: 1, page: 1000, settlement_type: [0, 1] } as any);
          const items: any[] = (res as any)?.list || (res as any)?.items || [];
          const normal = items
            .filter((s) => String(s?.settlement_type ?? '') === '0')
            .slice()
            .sort((a, b) => {
              const da = toTime(a?.settlement_date) || toTime(a?.createtime);
              const db = toTime(b?.settlement_date) || toTime(b?.createtime);
              if (da !== db) return da - db;
              return String(a?.rowid || '').localeCompare(String(b?.rowid || ''));
            });
          const rowidToIndex = new Map<string, number>();
          normal.forEach((s, idx) => {
            const rid = String(s?.rowid || '').trim();
            if (rid) rowidToIndex.set(rid, idx + 1);
          });
          contractPeriodCache.set(cid, rowidToIndex);
        } catch (e) {
          console.error('fill period index failed', cid, e);
          contractPeriodCache.set(cid, new Map());
        }
      }),
    );
  }

  for (const r of rows || []) {
    if (String(r?.settlement_type ?? '') !== '0') continue;
    const cid = String(r?.contract_id || '').trim();
    const rid = String(r?.rowid || '').trim();
    const idx = cid && rid ? contractPeriodCache.get(cid)?.get(rid) : undefined;
    r.__period_index = idx;
  }
}

onMounted(async () => {
  customerOptions.value = await getCustomerSimpleList();
  userOptions.value = await getSimpleUserList();
  deptOptions.value = await getDepartmentList();
  projectOptions.value = await getSettlementProjectSimpleList();
  const contractRes: any = await getContractList({ contract_category: 1 });
  contractOptions.value = Array.isArray(contractRes) ? contractRes : contractRes?.list || [];
});

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({ records }: { records: any[] }) {
  checkedIds.value = records.map((item) => item.rowid);
}

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form, destroyOnClose: true });
const [PaymentApplyFormModal, paymentApplyFormModalApi] = useVbenModal({ connectedComponent: PaymentApplyForm, destroyOnClose: true });

function handleRefresh() {
  clearSettlementDerivedCache();
  gridApi.query();
}

function handleCreate(settlementType: number) {
  formModalApi.setData({ type: 'create', settlement_type: settlementType }).open();
}
function handleEdit(row: ErpExpenseSettlementApi.ExpenseSettlement) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}
function handleDetail(row: ErpExpenseSettlementApi.ExpenseSettlement) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({ text: $t('ui.actionMessage.deleting') });
  try {
    await deleteExpenseSettlement(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleUpdateStatus(row: any, status: number) {
  const loadingInstance = ElLoading.service({ text: `确定${status === 20 ? '审批' : status === 30 ? '完成' : '反审批'}该单据吗？` });
  try {
    await updateExpenseSettlementStatus(row.rowid, status);
    ElMessage.success('操作成功');
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

function handleGeneratePaymentApply(row: any) {
  const applyAmount = Number(row?.pay_balance ?? row?.total_amount ?? row?.pay_amount ?? 0);
  const presetSettlement = { ...row, apply_amount: applyAmount > 0 ? applyAmount : 0 };
  paymentApplyFormModalApi
    .setData({
      type: 'create',
      paymentType: '业务付款',
      presetValues: {
        customer_id: row?.supplier_id,
        project_id: row?.project_id,
        contract_id: row?.contract_id,
        pay_account: row?.pay_account,
        payee_name: row?.supplier_name,
      },
      presetSettlements: [presetSettlement],
    })
    .open();
}

const activeTab = ref<'all' | 'todoApprove' | 'todoApply' | 'paying' | 'done'>('all');
async function handleTabChange(name: any) {
  activeTab.value = name;
  const status = name === 'todoApprove' ? 10 : name === 'todoApply' ? 20 : name === 'paying' ? 25 : name === 'done' ? 30 : undefined;
  await gridApi.formApi.setValues({ status });
  handleRefresh();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getExpenseSettlementPage({ pageNo: page.currentPage, page: page.page, ...formValues, settlement_type: [0, 1] });
          const list: any[] = (res as any)?.list || (res as any)?.items || [];
          await fillPeriodIndexForCurrentPage(list);
          const summaryMap = await getExpenseSettlementOrderSummaryMap(list.map((item: any) => item.rowid));
          list.forEach((row: any) => {
            const summary = summaryMap.get(String(row?.rowid || '').trim());
            row.__order_count = summary?.orderCount || 0;
            row.__first_order_no = summary?.firstOrderNo || '';
          });
          return res;
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions,
  gridEvents: { checkboxAll: handleRowCheckboxChange, checkboxChange: handleRowCheckboxChange },
});

function getCustomerName(id: any) {
  const key = String(id ?? '').trim();
  if (!key) return '';
  const hit = customerOptions.value.find((c) => String(c?.id ?? c?.rowid ?? '') === key);
  return hit?.name || hit?.customerName || hit?.customer_name || '';
}
function getProjectName(id: any) {
  return projectOptions.value.find((p) => p.rowid === id)?.project_name || '';
}
function getUserName(id: any) {
  return userOptions.value.find((u) => u.ROWID === id)?.UserName || '';
}
function getDeptName(id: any) {
  if (!id) return '';
  return deptOptions.value.find((d) => String(d.DepID) === String(id))?.DepName || '';
}
function getContractNo(id: any) {
  const c = contractOptions.value.find((item) => String(item.rowid) === String(id));
  return c?.contract_no || c?.no || '';
}
function normalizeSubjectType(row: any) {
  const raw = String(row?.subject_type ?? '').trim().toLowerCase();
  if (['0', 'contract', '合同'].includes(raw)) return 'contract';
  if (['1', 'order', '订单'].includes(raw)) return 'order';
  return String(row?.contract_id || '').trim() ? 'contract' : 'order';
}
function isContractSubject(row: any) { return normalizeSubjectType(row) === 'contract'; }
function getOrderSubjectNo(row: any) { return row.__first_order_no || row.product_name || '采购订单结算'; }
function getOrderCountTag(row: any) {
  const count = Number(row?.__order_count || 0);
  if (count > 1) return '共' + count + '单';
  return '';
}
function getContractPeriodLabel(row: any) {
  if (row?.settlement_period) {
    const text = String(row.settlement_period);
    return text.includes('期') ? text : '第' + text + '期';
  }
  if (row?.__period_index) return '第' + row.__period_index + '期';
  return '第--期';
}
function getPayStatusMeta(row: any) {
  const total = Number(row?.total_amount ?? 0);
  const paid = Number(row?.pay_amount ?? 0);
  const balanceRaw = row?.pay_balance;
  const balance = balanceRaw === undefined || balanceRaw === null || balanceRaw === '' ? total : Number(balanceRaw);
  if (paid <= 0) return { label: '未付款', type: 'info' };
  if (balance <= 0 || paid >= total) return { label: '付款完成', type: 'success' };
  return { label: '部分付款', type: 'warning' };
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <PaymentApplyFormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审批" name="todoApprove" />
        <el-tab-pane label="待申请" name="todoApply" />
        <el-tab-pane label="付款中" name="paying" />
        <el-tab-pane label="已完成" name="done" />
      </el-tabs>
      <TableAction
        :actions="[
          { label: '新增退款结算', type: 'primary', icon: ACTION_ICON.ADD, onClick: () => handleCreate(1) },
          { label: '新增支出结算', type: 'primary', icon: ACTION_ICON.ADD, onClick: () => handleCreate(0) },
        ]"
      />
    </div>

    <Grid table-title="支出结算列表">
      <template #date_no="{ row }">
        <div class="text-center">
          <div class="flex w-full items-center justify-center">
            <template v-if="row.settlement_type === 1">
              <ElTag type="danger" size="small" class="invisible mr-1">退款</ElTag>
              <span>{{ formatDateOnly(row.settlement_date) || '--' }}</span>
              <ElTag type="danger" size="small" class="ml-1">退款</ElTag>
            </template>
            <template v-else><span>{{ formatDateOnly(row.settlement_date) || '--' }}</span></template>
          </div>
          <div class="text-center text-primary">{{ row.settlement_no || '--' }}</div>
        </div>
      </template>
      <template #subject_type="{ row }">
        <div class="flex flex-wrap items-center gap-1">
          <ElTag :type="isContractSubject(row) ? 'success' : 'info'" size="small" class="inline-flex leading-none">
            {{ isContractSubject(row) ? '按合同' : '按订单' }}
          </ElTag>
          <ElTag v-if="isContractSubject(row) && row.settlement_type === 0" type="success" size="small" class="inline-flex leading-none">
            {{ getContractPeriodLabel(row) }}
          </ElTag>
          <ElTag v-if="!isContractSubject(row) && getOrderCountTag(row)" type="info" size="small" class="inline-flex leading-none">
            {{ getOrderCountTag(row) }}
          </ElTag>
        </div>
      </template>
      <template #contract_id="{ row }">
        <div>{{ isContractSubject(row) ? (row.contract_id ? getContractNo(row.contract_id) : '按合同结算') : getOrderSubjectNo(row) }}</div>
      </template>
      <template #supplier_project="{ row }">
        <div><div class="text-primary">{{ getCustomerName(row.supplier_id) }}</div><div>{{ getProjectName(row.project_id) }}</div></div>
      </template>
      <template #sales_dept="{ row }">
        <div><div>{{ getUserName(row.salesman_id) }}</div><div>{{ getDeptName(row.depart_id) }}</div></div>
      </template>
      <template #writeoff_status="{ row }"><ElTag :type="getPayStatusMeta(row).type">{{ getPayStatusMeta(row).label }}</ElTag></template>
      <template #pay="{ row }">
        <div>
          <div>{{ moneyText(row.pay_amount ?? 0) }}</div>
          <div>{{ moneyText(row.pay_balance ?? row.total_amount) }}</div>
        </div>
      </template>
      <template #status="{ row }">
        <ElTag :type="row.status === 10 ? 'warning' : row.status === 20 ? 'info' : row.status === 25 ? 'primary' : 'success'">
          {{ row.status === 10 ? '待审批' : row.status === 20 ? '待申请' : row.status === 25 ? '付款中' : '已完成' }}
        </ElTag>
      </template>
      <template #toolbar-tools>
        <TableAction :actions="[{ label: '批量删除', type: 'danger', disabled: isEmpty(checkedIds), icon: ACTION_ICON.DELETE, popConfirm: { title: `是否删除所选中数据？`, confirm: () => handleDelete(checkedIds) } }]" />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            { label: $t('common.detail'), type: 'primary', link: true, icon: ACTION_ICON.VIEW, onClick: () => handleDetail(row) },
            { label: $t('common.edit'), type: 'primary', link: true, icon: ACTION_ICON.EDIT, onClick: () => handleEdit(row) },
            ...(row.status === 10 ? [{ label: '审批', type: 'primary', link: true, icon: ACTION_ICON.AUDIT, popConfirm: { title: `确认审批${row.settlement_no || ''}吗？`, confirm: () => handleUpdateStatus(row, 20) } }] : []),
            ...((row.status === 20 || row.status === 25) && row.settlement_type === 0 && Number(row.pay_balance ?? row.total_amount ?? 0) > 0 ? [{ label: '生成付款申请', type: 'primary', link: true, icon: ACTION_ICON.ADD, onClick: () => handleGeneratePaymentApply(row) }] : []),
            { label: $t('common.delete'), type: 'danger', link: true, icon: ACTION_ICON.DELETE, popConfirm: { title: $t('ui.actionMessage.deleteConfirm', [row.settlement_no || '该单据']), confirm: () => handleDelete([row.rowid]) } },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
