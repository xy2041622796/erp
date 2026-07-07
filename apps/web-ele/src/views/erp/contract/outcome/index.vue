<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmContractApi } from '#/api/erp/contract/contract';

import { ref, onBeforeUnmount } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getContractPage, deleteContract, exportContract } from '#/api/erp/contract/outcome';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import CustomerName from '#/components/customer-selector/CustomerName.vue';
import UserName from '#/components/user-selector/UserName.vue';

import { useDataTablePermission } from '../../shared/useDataTablePermission';
import { useGridColumns, useGridFormSchema } from '../income/data';
import Form from './modules/form.vue';
import SettlementForm from '../../../finance/revenue/settlement/modules/form.vue';
import CustomerDetailModal from '../income/modules/customer-detail-modal.vue';
import ProjectDetailModal from '../project/modules/form.vue';

import {
  ElButton,
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
} from 'element-plus';

/** 页面状态：全部/待审批/待结算/待收款/完成 */
const statusTab = ref<'all' | 'audit' | 'settle' | 'receive' | 'done'>('all');
const conState = ref<number | undefined>(undefined);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [SettlementFormModal, settlementFormModalApi] = useVbenModal({
  connectedComponent: SettlementForm,
  destroyOnClose: true,
});

const [CustomerDetailModalComp, customerDetailModalApi] = useVbenModal({
  connectedComponent: CustomerDetailModal,
  destroyOnClose: true,
});

const [ProjectDetailModalComp, projectDetailModalApi] = useVbenModal({
  connectedComponent: ProjectDetailModal,
  destroyOnClose: true,
});

const { dataTable, hasPermission } = useDataTablePermission();
const OUTCOME_CONTRACT_EXPORT_ENCODING_ID = 'AEB03F2B6455023C9087DDE83D42A092';

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 处理状态 Tab 切换 */
function handleChangeStatusTab(name: string | number) {
  statusTab.value = String(name) as any;
  switch (statusTab.value) {
    case 'all':
      conState.value = undefined;
      break;
    case 'audit':
      conState.value = 0;
      break;
    case 'settle':
      conState.value = 1;
      break;
    case 'receive':
      conState.value = 2;
      break;
    case 'done':
      conState.value = 3;
      break;
  }
  gridApi.query();
}

function handleImport() {
  ElMessage.info('导入合同功能开发中');
}

async function handleExport() {
  const data = await exportContract(
    {
      ...(conState.value === undefined ? {} : { ConState: conState.value }),
      ...(await gridApi.formApi.getValues()),
    },
    OUTCOME_CONTRACT_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '支出合同.xls', source: data });
}

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: CrmContractApi.Contract) {
  formModalApi.setData(row).open();
}

async function handleDelete(row: CrmContractApi.Contract) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [
      (row as any).contract_name ?? row.name,
    ]),
  });
  try {
    await deleteContract((row.rowid ?? (row.id as any))!);
    ElMessage.success(
      $t('ui.actionMessage.deleteSuccess', [
        (row as any).contract_name ?? row.name,
      ]),
    );
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

function handleDetail(row: CrmContractApi.Contract) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleSettlement(row: CrmContractApi.Contract) {
  const contractId = String((row as any).rowid ?? (row as any).id ?? '').trim();
  if (!contractId) {
    ElMessage.warning('未找到合同ID');
    return;
  }
  try {
    const res = await getIncomeSettlementPage({
      pageNo: 1,
      page: 50,
      contract_id: contractId,
      settlement_type: 0,
    } as any);
    const list = ((res as any)?.list ?? []) as any[];
    const ts = (v: any) => {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
      const d = new Date(v);
      const t = d.getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const target = list
      .filter((it) => it && (it.rowid ?? it.id))
      .sort(
        (a, b) =>
          ts(
            (b as any).updatetime ??
              (b as any).update_time ??
              (b as any).createtime ??
              (b as any).create_time,
          ) -
          ts(
            (a as any).updatetime ??
              (a as any).update_time ??
              (a as any).createtime ??
              (a as any).create_time,
          ),
      )[0];
    const settlementId = String(target?.rowid ?? target?.id ?? '').trim();
    if (settlementId) {
      settlementFormModalApi
        .setData({ type: 'edit', rowid: settlementId })
        .open();
      return;
    }
  } catch (e: any) {
    // ignore
  }
  settlementFormModalApi.setData({ type: 'create', contractId }).open();
}

function cleanupModals() {
  try {
    formModalApi.close?.();
  } catch {}
  try {
    settlementFormModalApi.close?.();
  } catch {}
  try {
    // Element Plus 遮罩与 body 锁
    document.body?.classList?.remove('el-popup-parent--hidden');
    const epOverlays = document.querySelectorAll?.('.el-overlay');
    epOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el));

    // Vben/Shadcn 弹窗遮罩
    const vbenOverlays = document.querySelectorAll?.('.bg-overlay');
    vbenOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el));

    // 解除滚动锁与右侧补偿（useScrollLock）
    if (document?.body?.style) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    // 恢复固定节点样式（_scroll__fixed_）
    const fixedNodes = document.querySelectorAll?.('._scroll__fixed_');
    fixedNodes?.forEach?.((node: any) => {
      try {
        node.style.paddingRight = '';
        requestAnimationFrame?.(() => {
          node.style.transition = node?.dataset?.transition || '';
        });
      } catch {}
    });
  } catch {}
}

onBeforeUnmount(() => cleanupModals());

function handleCustomerDetail(row: CrmContractApi.Contract) {
  const customerId = String((row as any).contract_party_b ?? row.customerId ?? '').trim();
  if (!customerId) {
    ElMessage.warning('未找到客户ID');
    return;
  }
  customerDetailModalApi.setData({ id: customerId }).open();
}

function handleProjectDetail(row: CrmContractApi.Contract) {
  const projectId = String((row as any).project_id ?? row.businessId ?? '').trim();
  if (!projectId) {
    ElMessage.warning('未找到项目ID');
    return;
  }
  projectDetailModalApi.setData({ type: 'detail', rowid: projectId }).open();
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
          const res = await getContractPage({
            pageNo: page.currentPage,
            page: page.page,
            ...(conState.value === undefined
              ? {}
              : { ConState: conState.value }),
            ...formValues,
          });
          dataTable.value = (res as any).dataTable;
          return res as any;
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<CrmContractApi.Contract>,
});

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function pickNumber(row: any, keys: string[]) {
  for (const key of keys) {
    const val = Number(row?.[key]);
    if (Number.isFinite(val)) return val;
  }
  return 0;
}

function getContractStatusLabel(row: any) {
  const state = Number(row?.ConState);
  if (state === 0) return '待审批';
  if (state === 1) return '待结算';
  if (state === 2) return '待收款';
  if (state === 3) return '完成';
  return '-';
}
</script>

<template>
  <Page auto-content-height>
    <!-- 将弹窗组件移出 Page，避免布局干扰导致同时显示 -->
    <FormModal @success="handleRefresh" />
    <SettlementFormModal @success="handleRefresh" />
    <CustomerDetailModalComp />
    <ProjectDetailModalComp />

    <div class="mb-4 flex items-center justify-between">
      <ElTabs
        v-model:model-value="statusTab"
        class="w-full"
        @tab-change="handleChangeStatusTab"
      >
        <ElTabPane label="全部" name="all" />
        <ElTabPane label="待审批" name="audit" />
        <ElTabPane label="待结算" name="settle" />
        <ElTabPane label="待收款" name="receive" />
        <ElTabPane label="完成" name="done" />
      </ElTabs>

      <div class="ml-4 flex shrink-0 items-center gap-2">
        <ElButton @click="handleImport">导入合同</ElButton>
        <ElButton @click="handleExport">导出</ElButton>
        <ElButton type="primary" @click="handleCreate">新增支出合同</ElButton>
      </div>
    </div>

    <div class="mb-4">
      <component :is="(gridApi as any).searchForm"></component>
    </div>

    <Grid>
      <template #date_no="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{
            formatDateOnly((row as any).contract_signing_date) || '-'
          }}</span>
          <ElButton
            type="primary"
            link
            class="h-auto p-0 text-xs"
            @click="handleDetail(row)"
          >
            {{ (row as any).contract_no }}
          </ElButton>
        </div>
      </template>

      <template #customer_project="{ row }">
        <div class="flex flex-col">
          <ElButton
            type="primary"
            link
            class="h-auto p-0"
            @click="handleCustomerDetail(row)"
          >
            <CustomerName
              :id="(row as any).contract_party_b ?? row.customerId"
            />
          </ElButton>
          <ElButton
            type="primary"
            link
            class="h-auto p-0"
            @click="handleProjectDetail(row)"
          >
            {{ (row as any).project_name ?? row.businessName }}
          </ElButton>
        </div>
      </template>

      <template #sales_dept="{ row }">
        <div class="flex flex-col">
          <span class="text-sm"
            ><UserName :id="(row as any).salesperson ?? row.ownerUserId"
          /></span>
          <span class="text-xs text-gray-500">{{
            (row as any).deptname ?? row.ownerUserDeptName
          }}</span>
        </div>
      </template>

      <template #amount_origin_total="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{
            formatAmount((row as any).contract_amount)
          }}</span>
          <span class="text-xs text-gray-500">{{
            formatAmount((row as any).contract_total_amount)
          }}</span>
        </div>
      </template>

      <template #settle_amount="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{
            formatAmount(
              pickNumber(row as any, ['settled_amount', 'settle_amount']),
            )
          }}</span>
          <span class="text-xs text-gray-500">{{
            formatAmount(
              Number((row as any).contract_total_amount ?? 0) -
                pickNumber(row as any, ['settled_amount', 'settle_amount']),
            )
          }}</span>
        </div>
      </template>

      <template #receive_amount="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{
            formatAmount(
              pickNumber(row as any, [
                'received_amount',
                'receive_amount',
                'paid_amount',
                'invoice_amount',
              ]),
            )
          }}</span>
          <span class="text-xs text-gray-500">{{
            formatAmount(
              Number((row as any).contract_total_amount ?? 0) -
                pickNumber(row as any, [
                  'received_amount',
                  'receive_amount',
                  'paid_amount',
                  'invoice_amount',
                ]),
            )
          }}</span>
        </div>
      </template>

      <template #invoice_amount="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{
            formatAmount(
              pickNumber(row as any, ['invoice_amount', 'invoiced_amount']),
            )
          }}</span>
          <span class="text-xs text-gray-500">{{
            formatAmount(
              Number((row as any).contract_total_amount ?? 0) -
                pickNumber(row as any, ['invoice_amount', 'invoiced_amount']),
            )
          }}</span>
        </div>
      </template>

      <template #remark_note="{ row }">
        <div class="truncate">{{ (row as any).remark ?? '-' }}</div>
      </template>

      <template #status="{ row }">
        <span>{{ getContractStatusLabel(row) }}</span>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.detail'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              onClick: handleDetail.bind(null, row),
              ifShow: () =>
                hasPermission('row:view', (row as any).rowid ?? row.id),
            },
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: handleEdit.bind(null, row),
              ifShow: () =>
                hasPermission('row:edit', (row as any).rowid ?? row.id),
            },
            {
              label: '结算',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: handleSettlement.bind(null, row),
              ifShow: () =>
                (row as any).ConState == 1 &&
                hasPermission('row:edit', (row as any).rowid ?? row.id),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: () =>
                hasPermission('row:delete', (row as any).rowid ?? row.id),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [
                  (row as any).contract_name ?? row.name,
                ]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
