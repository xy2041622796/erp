<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  applyChangeRecord,
  approveChangeRecord,
  createChangeRecord,
  deleteChangeRecord,
  getChangePage,
  getOurContractsForChange,
  updateChangeRecord,
} from '#/api/erp/contract/change/original';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useGridColumns, useGridFormSchema } from './data';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

// import CustomerName from '#/components/customer-selector/CustomerName.vue';

// import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
// import {
//   applyChangeRecord,
//   createChangeRecord,
//   getChangePage,
//   getOurContractsForChange,
// } from '#/api/erp/contract/change/original';

// import { useGridColumns, useGridFormSchema } from './data';

type ContractCategory = 0 | 1;

const route = useRoute();

const { dataTable, hasPermission } = useDataTablePermission();
const pageRows = ref<any[]>([]);
const contractOptions = ref<any[]>([]);
const selectedRecord = ref<any>(null);
const editingId = ref('');
const formModalTitle = computed(() => editingId.value ? '修改合同变更记录' : '新建合同变更记录');
const formData = ref({
  contract_category: 0 as ContractCategory,
  contract_id: '',
  change_type: '综合变更',
  change_reason: '',
  effective_date: '',
  before_amount: 0,
  after_amount: 0,
  before_start: '',
  before_end: '',
  after_start: '',
  after_end: '',
  before_terms: '',
  after_terms: '',
});

const summary = computed(() => ({
  total: pageRows.value.length,
  comprehensive: pageRows.value.filter((row) => row.change_type === '综合变更').length,
  amount: pageRows.value.filter((row) => row.change_type === '金额变更').length,
  payment: pageRows.value.filter((row) => row.change_type === '付款明细变更').length,
  period: pageRows.value.filter((row) => row.change_type === '期限变更').length,
  terms: pageRows.value.filter((row) => row.change_type === '条款变更').length,
}));

async function loadContractOptions(resetContract = true) {
  if (resetContract) formData.value.contract_id = '';
  contractOptions.value = await getOurContractsForChange(formData.value.contract_category);
}

const [FormModal, formModalApi] = useVbenModal({
  async onOpenChange(open) {
    if (open) contractOptions.value = await getOurContractsForChange(formData.value.contract_category);
  },
});
const [DetailModal, detailModalApi] = useVbenModal();

function resetForm() {
  formData.value = {
    contract_category: 0,
    contract_id: '',
    change_type: '综合变更',
    change_reason: '',
    effective_date: '',
    before_amount: 0,
    after_amount: 0,
    before_start: '',
    before_end: '',
    after_start: '',
    after_end: '',
    before_terms: '',
    after_terms: '',
  };
}

function handleCreate() {
  editingId.value = '';
  resetForm();
  formModalApi.open();
}

async function openPrefilledFromRoute() {
  const contractId = String(route.query.contract_id || '').trim();
  if (!contractId) return;
  const cat = Number(route.query.contract_category);
  resetForm();
  formData.value.contract_category = cat === 1 ? 1 : 0;
  await loadContractOptions(false);
  formData.value.contract_id = contractId;
  formModalApi.open();
}

onMounted(() => {
  openPrefilledFromRoute();
});

async function handleEdit(row: any) {
  editingId.value = String(row?.id || '');
  formData.value = {
    contract_category: Number(row?.contract_category) === 1 ? 1 : 0,
    contract_id: String(row?.contract_id || ''),
    change_type: row?.change_type || '综合变更',
    change_reason: row?.change_reason || row?.reason || '',
    effective_date: row?.effective_date || '',
    before_amount: Number(row?.amount_change_detail?.before_contract_total_amount ?? row?.amount_change_detail?.before ?? 0),
    after_amount: Number(row?.amount_change_detail?.after_contract_total_amount ?? row?.amount_change_detail?.after ?? row?.contract_amount ?? 0),
    before_start: row?.period_change?.before_start || '',
    before_end: row?.period_change?.before_end || '',
    after_start: row?.period_change?.after_start || '',
    after_end: row?.period_change?.after_end || '',
    before_terms: row?.terms_change?.before || '',
    after_terms: row?.terms_change?.after || '',
  };
  await loadContractOptions(false);
  formModalApi.open();
}

function canApproveChange(row: any) {
  return row?.id && row?.status !== 'approved';
}

async function handleApprove(row: any) {
  if (row?.status === 'approved') {
    ElMessage.info('该合同变更已审批');
    return;
  }
  const changeId = String(row?.id || '').trim();
  if (!changeId) {
    ElMessage.warning('未找到变更记录ID');
    return;
  }
  await ElMessageBox.confirm('确认审批通过当前合同变更？', '审批确认', { type: 'warning' });
  await approveChangeRecord(changeId);
  ElMessage.success('审批通过');
  gridApi.query();
}

async function handleApply(row: any) {
  const changeId = String(row?.id || '').trim();
  if (!changeId) {
    ElMessage.warning('未找到变更记录ID');
    return;
  }
  if (!canApplyChange(row)) {
    ElMessage.info('该变更已应用');
    return;
  }
  if (row?.status && row.status !== 'approved') {
    ElMessage.warning('只有已审批的合同变更才能应用');
    return;
  }
  if (Number(row?.ConState) === 3) {
    ElMessage.warning('该合同已终结，无法应用修改');
    return;
  }
  await applyChangeRecord(changeId);
  ElMessage.success('变更已应用到合同');
  gridApi.query();
}

async function handleSubmit() {
  if (!formData.value.contract_id || !formData.value.change_reason) {
    ElMessage.warning('请选择合同并填写变更原因');
    return;
  }
  const payload = {
    contract_category: formData.value.contract_category,
    contract_id: formData.value.contract_id,
    change_type: formData.value.change_type,
    change_reason: formData.value.change_reason,
    effective_date: formData.value.effective_date,
    amount_change: { before: Number(formData.value.before_amount || 0), after: Number(formData.value.after_amount || 0) },
    period_change: {
      before_start: formData.value.before_start,
      before_end: formData.value.before_end,
      after_start: formData.value.after_start,
      after_end: formData.value.after_end,
    },
    terms_change: { before: formData.value.before_terms, after: formData.value.after_terms },
  };
  if (editingId.value) await updateChangeRecord(editingId.value, payload);
  else await createChangeRecord(payload);
  ElMessage.success(editingId.value ? '合同变更记录修改成功' : '合同变更记录保存成功');
  formModalApi.close();
  gridApi.query();
}

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function formatAmountChange(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function getContractCategoryLabel(value: any) {
  return Number(value) === 1 ? '支出合同' : '收入合同';
}

function getContractCategoryTagType(value: any) {
  return Number(value) === 1 ? 'warning' : 'success';
}

function getApplyStatusLabel(value: any) {
  if (value === 'applied') return '已应用';
  if (value === 'failed') return '应用失败';
  if (value === 'pending') return '待应用';
  return '待应用';
}

function getApplyStatusTagType(value: any) {
  if (value === 'applied') return 'success';
  if (value === 'failed') return 'danger';
  return 'warning';
}

function canApplyChange(row: any) {
  return row?.id && row?.status === 'approved' && row?.apply_status !== 'applied';
}

async function handleDelete(row: any) {
  const changeId = String(row?.id || '').trim();
  if (!changeId) {
    ElMessage.warning('未找到变更记录ID');
    return;
  }
  await ElMessageBox.confirm('确认删除当前合同变更记录？', '删除确认', { type: 'warning' });
  await deleteChangeRecord(changeId);
  ElMessage.success('删除成功');
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), showCollapseButton: false },
  gridOptions: {
    columns: useGridColumns(),
    height: '100%',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getChangePage({ pageNo: page.currentPage, page: page.page, ...formValues });
          pageRows.value = ((res as any)?.list ?? []) as any[];
          dataTable.value = (res as any)?.dataTable ?? null;
          return res;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: false },
  } as VxeTableGridOptions<any>,
});
</script>

<template>
  <Page auto-content-height class="contract-business-page">
    <FormModal :title="formModalTitle" class="w-[820px]">
      <ElForm label-width="110px">
        <ElCard class="mb-4" shadow="never">
          <template #header>关联合同</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="合同类型" required>
              <ElSelect v-model="formData.contract_category" class="w-full" @change="() => loadContractOptions(true)">
                <ElOption label="收入合同" :value="0" />
                <ElOption label="支出合同" :value="1" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="关联合同" required>
              <ElSelect v-model="formData.contract_id" class="w-full" filterable placeholder="请选择合同">
                <ElOption
                  v-for="item in contractOptions"
                  :key="`${item.contract_category}-${item.id}`"
                  :label="`${item.contract_no || '-'} - ${item.contract_name || '-'}`"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
          </div>
        </ElCard>

        <ElCard class="mb-4" shadow="never">
          <template #header>变更信息</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="变更类型" required>
              <ElSelect v-model="formData.change_type" class="w-full">
                <ElOption label="金额变更" value="金额变更" />
                <ElOption label="付款明细变更" value="付款明细变更" />
                <ElOption label="期限变更" value="期限变更" />
                <ElOption label="条款变更" value="条款变更" />
                <ElOption label="综合变更" value="综合变更" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="生效日期">
              <ElDatePicker v-model="formData.effective_date" class="w-full" value-format="YYYY-MM-DD" />
            </ElFormItem>
          </div>
          <ElFormItem label="变更原因" required>
            <ElInput v-model="formData.change_reason" :rows="3" type="textarea" />
          </ElFormItem>
        </ElCard>

        <ElCard class="mb-4" shadow="never">
          <template #header>金额变更</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="变更前金额"><ElInputNumber v-model="formData.before_amount" :precision="2" class="!w-full" /></ElFormItem>
            <ElFormItem label="变更后金额"><ElInputNumber v-model="formData.after_amount" :precision="2" class="!w-full" /></ElFormItem>
          </div>
        </ElCard>

        <ElCard class="mb-4" shadow="never">
          <template #header>期限变更</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="原开始日期"><ElDatePicker v-model="formData.before_start" class="w-full" value-format="YYYY-MM-DD" /></ElFormItem>
            <ElFormItem label="原结束日期"><ElDatePicker v-model="formData.before_end" class="w-full" value-format="YYYY-MM-DD" /></ElFormItem>
            <ElFormItem label="新开始日期"><ElDatePicker v-model="formData.after_start" class="w-full" value-format="YYYY-MM-DD" /></ElFormItem>
            <ElFormItem label="新结束日期"><ElDatePicker v-model="formData.after_end" class="w-full" value-format="YYYY-MM-DD" /></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>条款变更</template>
          <ElFormItem label="原条款"><ElInput v-model="formData.before_terms" :rows="3" type="textarea" /></ElFormItem>
          <ElFormItem label="新条款"><ElInput v-model="formData.after_terms" :rows="3" type="textarea" /></ElFormItem>
        </ElCard>
      </ElForm>
      <template #footer>
        <ElButton @click="formModalApi.close()">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </FormModal>

    <DetailModal title="合同变更详情" class="w-[760px]">
      <ElDescriptions v-if="selectedRecord" :column="2" border>
        <ElDescriptionsItem label="变更编号">{{ selectedRecord.change_no || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同类型">
          <ElTag :type="getContractCategoryTagType(selectedRecord.contract_category)" effect="plain">
            {{ getContractCategoryLabel(selectedRecord.contract_category) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="合同编号">{{ selectedRecord.contract_no || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同名称">{{ selectedRecord.contract_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="客户名称">
          <CustomerName :id="selectedRecord.client_name || selectedRecord.contract_party_b" />
        </ElDescriptionsItem>
        <ElDescriptionsItem label="变更类型"><ElTag effect="plain">{{ selectedRecord.change_type }}</ElTag></ElDescriptionsItem>
        <ElDescriptionsItem label="金额变更">{{ formatAmount(selectedRecord.amount_change) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem label="生效日期">{{ selectedRecord.effective_date || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="应用状态">
          <ElTag :type="getApplyStatusTagType(selectedRecord.apply_status)" effect="plain">
            {{ getApplyStatusLabel(selectedRecord.apply_status) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="变更原因" :span="2">{{ selectedRecord.change_reason || '-' }}</ElDescriptionsItem>
      </ElDescriptions>
      <template #footer><ElButton @click="detailModalApi.close()">关闭</ElButton></template>
    </DetailModal>

    <ElCard class="mb-4" shadow="never">
      <div class="grid grid-cols-6 gap-4 text-sm">
        <div class="rounded bg-gray-50 p-3">全部：{{ summary.total }}</div>
        <div class="rounded bg-purple-50 p-3 text-purple-700">综合变更：{{ summary.comprehensive }}</div>
        <div class="rounded bg-green-50 p-3 text-green-700">金额变更：{{ summary.amount }}</div>
        <div class="rounded bg-orange-50 p-3 text-orange-700">付款明细变更：{{ summary.payment }}</div>
        <div class="rounded bg-blue-50 p-3 text-blue-700">期限变更：{{ summary.period }}</div>
        <div class="rounded bg-yellow-50 p-3 text-yellow-700">条款变更：{{ summary.terms }}</div>
      </div>
    </ElCard>
    <ElCard class="contract-list-card" shadow="never">
      <Grid>
        <template #toolbar-tools><TableAction :actions="[{ label: '新建变更记录', type: 'primary', icon: ACTION_ICON.ADD, ifShow: hasPermission('data:add'), onClick: handleCreate }]" /></template>
        <template #contract_category="{ row }">
          <ElTag :type="getContractCategoryTagType((row as any).contract_category)" effect="plain">
            {{ getContractCategoryLabel((row as any).contract_category) }}
          </ElTag>
        </template>
        <template #client_name="{ row }">
          <CustomerName :id="(row as any).client_name || (row as any).contract_party_b" />
        </template>
        <template #change_type="{ row }"><ElTag effect="plain">{{ (row as any).change_type }}</ElTag></template>
        <template #apply_status="{ row }">
          <ElTag :type="getApplyStatusTagType((row as any).apply_status)" effect="plain">
            {{ getApplyStatusLabel((row as any).apply_status) }}
          </ElTag>
        </template>
        <template #amount_change="{ row }">{{ formatAmountChange((row as any).amount_change) }}</template>
        <template #actions="{ row }">
          <TableAction
            :actions="[
              {
                label: '修改',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.EDIT,
                ifShow: hasPermission('row:edit', row?.id),
                onClick: () => handleEdit(row),
              },
              {
                label: row?.status === 'approved' ? '已审批' : '审批',
                type: 'success',
                link: true,
                disabled: row?.status === 'approved',
                ifShow: hasPermission('row:edit', row?.id),
                onClick: () => handleApprove(row),
              },
              {
                label: '应用变更',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.EDIT,
                ifShow: () => canApplyChange(row) && hasPermission('row:edit', row?.id),
                onClick: () => handleApply(row),
              },
              {
                label: '删除',
                type: 'danger',
                link: true,
                icon: ACTION_ICON.DELETE,
                ifShow: hasPermission('row:delete', row?.id),
                popConfirm: {
                  title: '确认删除该合同变更记录？',
                  confirm: () => handleDelete(row),
                },
              },
            ]"
          />
        </template>
      </Grid>
    </ElCard>
  </Page>
</template>

<style scoped>
.contract-list-card {
  height: calc(100vh - 390px);
  min-height: 360px;
  overflow: hidden;
}

.contract-list-card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;
}

.contract-list-card :deep(.vben-vxe-grid),
.contract-list-card :deep(.vxe-grid) {
  height: 100%;
  min-height: 0;
}

</style>
