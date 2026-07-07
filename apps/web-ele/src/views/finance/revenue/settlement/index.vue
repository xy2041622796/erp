<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpIncomeSettlementApi } from '#/api/erp/finance/revenue/settlement';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getContractList, getContractPlanList } from '#/api/erp/contract/contract';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getRelBySettlementId } from '#/api/erp/finance/common/settlement-plan-rel';
import {
  deleteIncomeSettlement,
  getIncomeSettlementOrderSummaryMap,
  getIncomeSettlementPage,
  SETTLEMENT_MODEL_ID,
  updateIncomeSettlementStatus,
} from '#/api/erp/finance/revenue/settlement';
import type { Department } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import { getSettlementProjectSimpleList } from '#/api/erp/finance/revenue/settlement/project';
// import { getSimpleDeptList } from '#/api/system/dept';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import { useGridColumns, useGridFormSchema } from '#/views/finance/revenue/settlement/data';
import CollectionSubmitForm from '#/views/finance/revenue/submit/modules/form.vue';
import Form from '#/views/finance/revenue/settlement/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpIncomeSettlement' });

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

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildPlanRemark(plan: any) {
  const periodText = String(plan?.plan_period ?? '').trim();
  const amountText = moneyText(plan?.plan_amount);
  const parts = [] as string[];
  if (periodText) {
    parts.push(periodText.includes('期') ? `收款计划${periodText}` : `收款计划第${periodText}期`);
  } else {
    parts.push('收款计划');
  }
  if (plan?.plan_date) parts.push(`计划日期：${plan.plan_date}`);
  parts.push(`计划金额：${amountText}`);
  return parts.join('，');
}

async function resolveLinkedPlanForSettlement(row: any) {
  const settlementId = String(row?.rowid || '').trim();
  const contractId = String(row?.contract_id || '').trim();
  if (!settlementId || !contractId) return null;

  const rel = await getRelBySettlementId(SETTLEMENT_MODEL_ID, settlementId);
  if (!rel?.plan_id) return null;

  const plans = await getContractPlanList(contractId);
  const matched = (plans || []).find(
    (item: any) => String(item?.rowid || '') === String(rel.plan_id),
  );
  return matched ? { ...matched, __rel: rel } : null;
}

async function fillPeriodIndexForCurrentPage(rows: any[]) {
  const contractIds = Array.from(
    new Set(
      (rows || [])
        .filter(
          (r) =>
            String(r?.settlement_type ?? '') === '0' &&
            String(r?.contract_id || '').trim(),
        )
        .map((r) => String(r?.contract_id || '').trim())
        .filter(Boolean),
    ),
  );

  const needFetch = contractIds.filter((cid) => !contractPeriodCache.has(cid));
  if (needFetch.length > 0) {
    await Promise.all(
      needFetch.map(async (cid) => {
        try {
          const res = await getIncomeSettlementPage({
            contract_id: cid,
            pageNo: 1,
            page: 1000,
            settlement_type: [0, 1],
          } as any);

          const items: any[] = (res as any)?.list || (res as any)?.items || [];
          const normal = items
            .filter((s) => String(s?.settlement_type ?? '') === '0')
            .slice()
            .sort((a, b) => {
              const da = toTime(a?.settlement_date) || toTime(a?.createtime);
              const db = toTime(b?.settlement_date) || toTime(b?.createtime);
              if (da !== db) return da - db;
              return String(a?.rowid || '').localeCompare(
                String(b?.rowid || ''),
              );
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
  // deptOptions.value = await getSimpleDeptList();
  deptOptions.value = await getDepartmentList();
  projectOptions.value = await getSettlementProjectSimpleList();
  const contractRes: any = await getContractList({});
  contractOptions.value = Array.isArray(contractRes)
    ? contractRes
    : contractRes?.list || [];
});

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({ records }: { records: any[] }) {
  checkedIds.value = records.map((item) => item.rowid);
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [CollectionSubmitFormModal, collectionSubmitFormModalApi] = useVbenModal({
  connectedComponent: CollectionSubmitForm,
  destroyOnClose: true,
});

function handleRefresh() {
  clearSettlementDerivedCache();
  gridApi.query();
}

function handleCreate(settlementType: number) {
  formModalApi
    .setData({ type: 'create', settlement_type: settlementType })
    .open();
}

function handleEdit(row: ErpIncomeSettlementApi.IncomeSettlement) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: ErpIncomeSettlementApi.IncomeSettlement) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteIncomeSettlement(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleUpdateStatus(row: any, status: number) {
  const loadingInstance = ElLoading.service({
    text: `确定${status === 20 ? '审批' : status === 30 ? '完成' : '反审批'}该单据吗？`,
  });
  try {
    await updateIncomeSettlementStatus(row.rowid, status);
    ElMessage.success('操作成功');
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleGenerateCollectionSubmit(row: any) {
  let applyAmount = Number(
    row?.receive_balance ?? row?.total_amount ?? row?.receive_amount ?? 0,
  );
  const presetValues: Record<string, any> = {
    customer_id: row?.customer_id,
    project_id: row?.project_id,
    contract_id: row?.contract_id,
    collection_account: row?.receive_account,
  };

  if (String(row?.contract_id || '').trim()) {
    try {
      const linkedPlan = await resolveLinkedPlanForSettlement(row);
      if (linkedPlan) {
        applyAmount = Math.max(
          toNumber(linkedPlan?.plan_amount, applyAmount),
          0,
        );
        presetValues.remark = buildPlanRemark(linkedPlan);
      }
    } catch (error) {
      console.error('resolve linked plan for submit failed', error);
    }
  }

  const presetSettlement = {
    ...row,
    apply_amount: applyAmount > 0 ? applyAmount : 0,
  };

  collectionSubmitFormModalApi
    .setData({
      type: 'create',
      income_type: '业务收款',
      presetValues,
      presetSettlements: [presetSettlement],
    })
    .open();
}

const activeTab = ref<'all' | 'todoApprove' | 'todoSubmit' | 'collecting' | 'done'>('all');
async function handleTabChange(name: any) {
  activeTab.value = name;
  const status =
    name === 'todoApprove'
      ? 10
      : name === 'todoSubmit'
        ? 20
        : name === 'collecting'
          ? 25
          : name === 'done'
            ? 30
            : undefined;
  await gridApi.formApi.setValues({ status });
  handleRefresh();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getIncomeSettlementPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
            settlement_type: [0, 1],
          });

          const list: any[] = (res as any)?.list || (res as any)?.items || [];
          await fillPeriodIndexForCurrentPage(list);
          const summaryMap = await getIncomeSettlementOrderSummaryMap(
            list.map((item: any) => item.rowid),
          );
          list.forEach((row: any) => {
            const summary = summaryMap.get(String(row?.rowid || '').trim());
            row.__order_count = summary?.orderCount || 0;
            row.__first_order_no = summary?.firstOrderNo || '';
          });
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});

function getCustomerName(id: any) {
  const key = String(id ?? '').trim();
  if (!key) return '';
  const hit = customerOptions.value.find(
    (c) => String(c?.id ?? c?.rowid ?? '') === key,
  );
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
  return (
    deptOptions.value.find((d) => String(d.DepID) === String(id))?.DepName || ''
  );
}
function getContractNo(id: any) {
  const c = contractOptions.value.find(
    (item) => String(item.rowid) === String(id),
  );
  return c?.contract_no || c?.no || '';
}
function normalizeSubjectType(row: any) {
  const raw = String(row?.subject_type ?? '').trim().toLowerCase();
  if (['0', 'contract', '合同'].includes(raw)) return 'contract';
  if (['1', 'order', '订单'].includes(raw)) return 'order';
  return String(row?.contract_id || '').trim() ? 'contract' : 'order';
}
function isContractSubject(row: any) {
  return normalizeSubjectType(row) === 'contract';
}
function getOrderSubjectNo(row: any) {
  return row.__first_order_no || row.product_name || '订单结算';
}
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
function getWriteOffStatusMeta(row: any) {
  const total = Number(row?.total_amount ?? 0);
  const received = Number(row?.receive_amount ?? 0);
  const balanceRaw = row?.receive_balance;
  const balance =
    balanceRaw === undefined || balanceRaw === null || balanceRaw === ''
      ? total
      : Number(balanceRaw);
  if (received <= 0) return { label: '未核销', type: 'info' };
  if (balance <= 0 || received >= total) return { label: '核销完成', type: 'success' };
  return { label: '部分核销', type: 'warning' };
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <CollectionSubmitFormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审批" name="todoApprove" />
        <el-tab-pane label="待提报" name="todoSubmit" />
        <el-tab-pane label="收款中" name="collecting" />
        <el-tab-pane label="已完成" name="done" />
      </el-tabs>

      <TableAction
        :actions="[
          {
            label: '新增退款结算',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: () => handleCreate(1),
          },
          {
            label: '新增收入结算',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: () => handleCreate(0),
          },
        ]"
      />
    </div>

    <Grid table-title="收入结算列表">
      <template #date_no="{ row }">
        <div class="text-center">
          <div class="flex w-full items-center justify-center">
            <template v-if="row.settlement_type === 1">
              <ElTag type="danger" size="small" class="invisible mr-1"
                >退款</ElTag
              >
              <span>{{ formatDateOnly(row.settlement_date) || '--' }}</span>
              <ElTag type="danger" size="small" class="ml-1">退款</ElTag>
            </template>
            <template v-else>
              <span>{{ formatDateOnly(row.settlement_date) || '--' }}</span>
            </template>
          </div>
          <div class="text-center text-primary">
            {{ row.settlement_no || '--' }}
          </div>
        </div>
      </template>

      <template #subject_type="{ row }">
        <div class="flex flex-wrap items-center gap-1">
          <ElTag
            :type="isContractSubject(row) ? 'success' : 'info'"
            size="small"
            class="inline-flex leading-none"
          >
            {{ isContractSubject(row) ? '按合同' : '按订单' }}
          </ElTag>
          <ElTag
            v-if="isContractSubject(row) && row.settlement_type === 0"
            type="success"
            size="small"
            class="inline-flex leading-none"
          >
            {{ getContractPeriodLabel(row) }}
          </ElTag>
          <ElTag
            v-if="!isContractSubject(row) && getOrderCountTag(row)"
            type="info"
            size="small"
            class="inline-flex leading-none"
          >
            {{ getOrderCountTag(row) }}
          </ElTag>
        </div>
      </template>

      <template #contract_id="{ row }">
        <div>
          {{
            isContractSubject(row)
              ? (row.contract_id ? getContractNo(row.contract_id) : '按合同结算')
              : getOrderSubjectNo(row)
          }}
        </div>
      </template>

      <template #customer_project="{ row }">
        <div>
          <div class="text-primary">{{ getCustomerName(row.customer_id) }}</div>
          <div>{{ getProjectName(row.project_id) }}</div>
        </div>
      </template>

      <template #sales_dept="{ row }">
        <div>
          <div>{{ getUserName(row.salesman_id) }}</div>
          <div>{{ getDeptName(row.depart_id) }}</div>
        </div>
      </template>

      <template #writeoff_status="{ row }">
        <ElTag :type="getWriteOffStatusMeta(row).type">
          {{ getWriteOffStatusMeta(row).label }}
        </ElTag>
      </template>

      <template #receive="{ row }">
        <div>
          <div>{{ moneyText(row.receive_amount ?? 0) }}</div>
          <div>{{ moneyText(row.receive_balance ?? row.total_amount) }}</div>
        </div>
      </template>

      <template #status="{ row }">
        <ElTag
          :type="
            row.status === 10
              ? 'warning'
              : row.status === 20
                ? 'info'
                : row.status === 25
                  ? 'primary'
                  : 'success'
          "
        >
          {{
            row.status === 10
              ? '待审批'
              : row.status === 20
                ? '待提报'
                : row.status === 25
                  ? '收款中'
                  : '已完成'
          }}
        </ElTag>
      </template>

      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '批量删除',
              type: 'danger',
              disabled: isEmpty(checkedIds),
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: `是否删除所选中数据？`,
                confirm: () => handleDelete(checkedIds),
              },
            },
          ]"
        />
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.detail'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              onClick: () => handleDetail(row),
            },
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: () => handleEdit(row),
            },
            ...(row.status === 10
              ? [
                  {
                    label: '审批',
                    type: 'primary',
                    link: true,
                    icon: ACTION_ICON.AUDIT,
                    popConfirm: {
                      title: `确认审批${row.settlement_no || ''}吗？`,
                      confirm: () => handleUpdateStatus(row, 20),
                    },
                  },
                ]
              : []),
            ...((row.status === 20 || row.status === 25) && row.settlement_type === 0 && Number(row.receive_balance ?? row.total_amount ?? 0) > 0
              ? [
                  {
                    label: '生成提报单',
                    type: 'primary',
                    link: true,
                    icon: ACTION_ICON.ADD,
                    onClick: () => handleGenerateCollectionSubmit(row),
                  },
                ]
              : []),
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [
                  row.settlement_no || '该单据',
                ]),
                confirm: () => handleDelete([row.rowid]),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
