<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createTerminationRecord,
  getOurContractsForChange,
  getTerminationPage,
} from '#/api/erp/contract/change/original';

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
  ElMessage,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

type ContractCategory = 0 | 1;

const route = useRoute();

const pageRows = ref<any[]>([]);
const contractOptions = ref<any[]>([]);
const selectedRecord = ref<any>(null);
const formData = ref({
  contract_category: 0 as ContractCategory,
  contract_id: '',
  termination_type: '正常完结',
  actual_end_date: '',
  termination_reason: '',
  remarks: '',
});

const summary = computed(() => ({
  total: pageRows.value.length,
  normal: pageRows.value.filter((row) => row.termination_type === '正常完结').length,
  early: pageRows.value.filter((row) => row.termination_type === '提前终止').length,
  agreement: pageRows.value.filter((row) => row.termination_type === '协商解除').length,
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
    termination_type: '正常完结',
    actual_end_date: '',
    termination_reason: '',
    remarks: '',
  };
}

function handleCreate() {
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

function handleView(row: any) {
  selectedRecord.value = row;
  detailModalApi.open();
}

async function handleSubmit() {
  if (!formData.value.contract_id || !formData.value.actual_end_date || !formData.value.termination_reason) {
    ElMessage.warning('请选择合同并填写终结日期、终结原因');
    return;
  }
  await createTerminationRecord({ ...formData.value });
  ElMessage.success('合同终结记录保存成功');
  formModalApi.close();
  gridApi.query();
}

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getContractCategoryLabel(value: any) {
  return Number(value) === 1 ? '支出合同' : '收入合同';
}

function getContractCategoryTagType(value: any) {
  return Number(value) === 1 ? 'warning' : 'success';
}

function getPaidLabel(value: any) {
  return Number(value) === 1 ? '已付款' : '已回款';
}

function getUnpaidLabel(value: any) {
  return Number(value) === 1 ? '未付款' : '未回款';
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
          const res = await getTerminationPage({ pageNo: page.currentPage, page: page.page, ...formValues });
          pageRows.value = ((res as any)?.list ?? []) as any[];
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
    <FormModal title="新建合同终结记录" class="w-[760px]">
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
          <template #header>终结信息</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="终结类型" required>
              <ElSelect v-model="formData.termination_type" class="w-full">
                <ElOption label="正常完结" value="正常完结" />
                <ElOption label="提前终止" value="提前终止" />
                <ElOption label="协商解除" value="协商解除" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="终结日期" required>
              <ElDatePicker v-model="formData.actual_end_date" class="w-full" value-format="YYYY-MM-DD" />
            </ElFormItem>
          </div>
          <ElFormItem label="终结原因" required>
            <ElInput v-model="formData.termination_reason" :rows="3" type="textarea" />
          </ElFormItem>
          <ElFormItem label="归档说明">
            <ElInput v-model="formData.remarks" :rows="3" type="textarea" />
          </ElFormItem>
        </ElCard>

        <ElCard shadow="never">
          <template #header>结算提示</template>
          <div class="rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            收入合同终结摘要读取收入结算；支出合同终结摘要读取支出结算。保存终结记录本身不修改结算单据。
          </div>
        </ElCard>
      </ElForm>
      <template #footer>
        <ElButton @click="formModalApi.close()">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </FormModal>

    <DetailModal title="合同终结详情" class="w-[760px]">
      <ElDescriptions v-if="selectedRecord" :column="2" border>
        <ElDescriptionsItem label="终结编号">{{ selectedRecord.apply_no || '-' }}</ElDescriptionsItem>
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
        <ElDescriptionsItem label="终结类型"><ElTag effect="plain">{{ selectedRecord.termination_type }}</ElTag></ElDescriptionsItem>
        <ElDescriptionsItem label="终结日期">{{ selectedRecord.actual_end_date || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同金额">{{ formatAmount(selectedRecord.contract_amount) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem :label="getPaidLabel(selectedRecord.contract_category)">{{ formatAmount(selectedRecord.paid_amount) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem :label="getUnpaidLabel(selectedRecord.contract_category)">{{ formatAmount(selectedRecord.unpaid_amount) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem label="终结原因" :span="2">{{ selectedRecord.termination_reason || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="归档说明" :span="2">{{ selectedRecord.remarks || '-' }}</ElDescriptionsItem>
      </ElDescriptions>
      <template #footer><ElButton @click="detailModalApi.close()">关闭</ElButton></template>
    </DetailModal>

    <ElCard class="mb-4" shadow="never">
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div class="rounded bg-gray-50 p-3">全部：{{ summary.total }}</div>
        <div class="rounded bg-green-50 p-3 text-green-700">正常完结：{{ summary.normal }}</div>
        <div class="rounded bg-yellow-50 p-3 text-yellow-700">提前终止：{{ summary.early }}</div>
        <div class="rounded bg-blue-50 p-3 text-blue-700">协商解除：{{ summary.agreement }}</div>
      </div>
    </ElCard>
    <ElCard class="contract-list-card" shadow="never">
      <Grid>
        <template #toolbar-tools><TableAction :actions="[{ label: '新建终结记录', type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate }]" /></template>
        <template #contract_category="{ row }">
          <ElTag :type="getContractCategoryTagType((row as any).contract_category)" effect="plain">
            {{ getContractCategoryLabel((row as any).contract_category) }}
          </ElTag>
        </template>
        <template #client_name="{ row }">
          <CustomerName :id="(row as any).client_name || (row as any).contract_party_b" />
        </template>
        <template #termination_type="{ row }"><ElTag effect="plain">{{ (row as any).termination_type }}</ElTag></template>
        <template #contract_amount="{ row }">{{ formatAmount((row as any).contract_amount) }}</template>
        <template #paid_amount="{ row }">{{ formatAmount((row as any).paid_amount) }}</template>
        <template #unpaid_amount="{ row }">{{ formatAmount((row as any).unpaid_amount) }}</template>
        <template #actions="{ row }"><TableAction :actions="[{ label: '详情', type: 'primary', link: true, icon: ACTION_ICON.VIEW, onClick: () => handleView(row) }]" /></template>
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
