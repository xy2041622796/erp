<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerPoolApi } from '#/api/erp/customer/pool';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportPoolCustomers,
  getCustomerPoolLogPage,
  getPoolCustomerPage,
  receivePoolCustomers,
} from '#/api/erp/customer/pool';
import LeadCenterView from '#/views/erp/client/lead/detail/modules/lead-center-view.vue';

import DistributeForm from './modules/distribute-form.vue';
import {
  formatPoolDateTime,
  formatPoolOperateType,
  useGridColumns,
  useGridFormSchema,
} from './data';

import {
  ElButton,
  ElDialog,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const distributeDialogVisible = ref(false);
const distributeIds = ref<Array<number | string>>([]);
const detailDialogVisible = ref(false);
const currentDetailLeadId = ref<number | string | null>(null);
const logDialogVisible = ref(false);
const currentLogList = ref<any[]>([]);
const currentLogLeadName = ref('');

function formatDisplayDate(value?: null | string) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function handleRefresh() {
  gridApi.query();
}

function getSelectedIds() {
  const records = (((gridApi as any)?.grid?.getCheckboxRecords?.() ||
    (gridApi as any)?.getCheckboxRecords?.() ||
    []) as CrmCustomerPoolApi.PoolLead[]);
  return records
    .map((item) => item.id || item.rowid || item.leadId)
    .filter(Boolean) as Array<number | string>;
}

async function handleReceive(ids: Array<number | string>) {
  if (!ids.length) return;
  await receivePoolCustomers(ids);
  ElMessage.success('领取成功，已移出公海');
  handleRefresh();
}

function openDistributeDialog(ids: Array<number | string>) {
  if (!ids.length) return;
  distributeIds.value = ids;
  distributeDialogVisible.value = true;
}

function openDetail(row: CrmCustomerPoolApi.PoolLead) {
  currentDetailLeadId.value = (row.id || row.rowid || row.leadId || '') as any;
  detailDialogVisible.value = true;
}

async function openLog(row: CrmCustomerPoolApi.PoolLead) {
  const leadId = String(row.id || row.rowid || row.leadId || '');
  const res = await getCustomerPoolLogPage({ leadId, index: 1, size: 100 });
  currentLogList.value = res?.list || [];
  currentLogLeadName.value = row.leadName || '-';
  logDialogVisible.value = true;
}

async function handleExport() {
  const formValues = (gridApi.formApi?.getValues?.() || {}) as any;
  const data = await exportPoolCustomers(formValues);
  downloadFileFromBlobPart({ fileName: '线索公海.xls', source: data });
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getPoolCustomerPage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          } as any);
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
      zoom: true,
    },
  } as VxeTableGridOptions<CrmCustomerPoolApi.PoolLead>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            { label: '批量领取', type: 'primary', icon: ACTION_ICON.EDIT, disabled: getSelectedIds().length === 0, onClick: () => handleReceive(getSelectedIds()) },
            { label: '批量分配', type: 'primary', icon: ACTION_ICON.EDIT, disabled: getSelectedIds().length === 0, onClick: () => openDistributeDialog(getSelectedIds()) },
            { label: '导出', type: 'primary', icon: ACTION_ICON.DOWNLOAD, onClick: handleExport },
          ]"
        />
      </template>
      <template #leadName="{ row }">
        <ElButton type="primary" link @click="openDetail(row)">
          {{ row.leadName || '-' }}
        </ElButton>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            { label: '领取', type: 'primary', link: true, onClick: () => handleReceive([row.id || row.rowid || row.leadId].filter(Boolean) as Array<number | string>) },
            { label: '分配', type: 'primary', link: true, onClick: () => openDistributeDialog([row.id || row.rowid || row.leadId].filter(Boolean) as Array<number | string>) },
            { label: '查看详情', type: 'default', link: true, onClick: () => openDetail(row) },
            { label: '查看日志', type: 'default', link: true, onClick: () => openLog(row) },
          ]"
        />
      </template>
    </Grid>

    <ElDialog v-model="distributeDialogVisible" title="分配线索并移出公海" width="560px" destroy-on-close>
      <DistributeForm :ids="distributeIds" @close="distributeDialogVisible = false" @success="() => { distributeDialogVisible = false; handleRefresh(); }" />
    </ElDialog>

    <ElDialog v-model="detailDialogVisible" title="线索详情" width="90%" top="3vh" destroy-on-close>
      <div style="max-height: 86vh; overflow-y: auto">
        <LeadCenterView :lead-id="currentDetailLeadId" :readonly-pool-mode="true" @close="detailDialogVisible = false" @saved="handleRefresh" />
      </div>
    </ElDialog>

    <ElDialog v-model="logDialogVisible" :title="`${currentLogLeadName} - 公海日志`" width="70%" destroy-on-close>
      <ElTable :data="currentLogList" stripe style="width: 100%">
        <ElTableColumn type="index" label="序号" width="60" />
        <ElTableColumn prop="operateType" label="类型" min-width="140">
          <template #default="{ row }">{{ formatPoolOperateType(row.operateType) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="reason" label="原因" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="beforeOwnerUserName" label="变更前负责人" min-width="120" />
        <ElTableColumn prop="afterOwnerUserName" label="变更后负责人" min-width="120" />
        <ElTableColumn prop="customerCode" label="正式客户编号" min-width="140" />
        <ElTableColumn prop="operatorUserName" label="操作人" min-width="120" />
        <ElTableColumn prop="operateTime" label="操作时间" min-width="180">
          <template #default="{ row }">{{ formatPoolDateTime(row.operateTime) }}</template>
        </ElTableColumn>
      </ElTable>
    </ElDialog>
  </Page>
</template>
