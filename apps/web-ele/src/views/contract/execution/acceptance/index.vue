<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createAcceptanceRecord,
  getAcceptancePage,
  getOurContractOptions,
} from '#/api/erp/contract/execution/original';

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

const contractOptions = ref<any[]>([]);
const pageRows = ref<any[]>([]);
const selectedRecord = ref<any>(null);
const formData = ref({
  acceptance_date: '',
  acceptance_result: 'pass',
  acceptance_type: 'phase',
  contract_category: 0 as ContractCategory,
  contract_id: '',
  remark: '',
});

async function loadContractOptions() {
  formData.value.contract_id = '';
  contractOptions.value = await getOurContractOptions(formData.value.contract_category);
}

const [FormModal, formModalApi] = useVbenModal({
  async onOpenChange(open) {
    if (open) contractOptions.value = await getOurContractOptions(formData.value.contract_category);
  },
});

const [DetailModal, detailModalApi] = useVbenModal();

const acceptanceSummary = computed(() => {
  const rows = pageRows.value;
  return {
    conditionalPass: rows.filter((row) => row.acceptance_result === 'conditional_pass').length,
    fail: rows.filter((row) => row.acceptance_result === 'fail').length,
    pass: rows.filter((row) => row.acceptance_result === 'pass').length,
    total: rows.length,
  };
});

function resetForm() {
  formData.value = {
    acceptance_date: '',
    acceptance_result: 'pass',
    acceptance_type: 'phase',
    contract_category: 0,
    contract_id: '',
    remark: '',
  };
}

function handleCreate() {
  resetForm();
  formModalApi.open();
}

function handleView(row: any) {
  selectedRecord.value = row;
  detailModalApi.open();
}

async function handleSubmit() {
  if (!formData.value.contract_id || !formData.value.acceptance_date) {
    ElMessage.warning('请选择合同并填写验收日期');
    return;
  }
  await createAcceptanceRecord(formData.value);
  ElMessage.success('验收记录保存成功');
  formModalApi.close();
  gridApi.query();
}

function getContractCategoryLabel(value: any) {
  return Number(value) === 1 ? '支出合同' : '收入合同';
}

function getContractCategoryTagType(value: any) {
  return Number(value) === 1 ? 'warning' : 'success';
}

function getTypeLabel(value: string) {
  return value === 'final' ? '最终验收' : '阶段性验收';
}

function getTypeTagType(value: string) {
  return value === 'final' ? 'primary' : 'info';
}

function getResultLabel(value: string) {
  if (value === 'conditional_pass') return '整改后通过';
  if (value === 'fail') return '不通过';
  return '通过';
}

function getResultTagType(value: string) {
  if (value === 'conditional_pass') return 'warning';
  if (value === 'fail') return 'danger';
  return 'success';
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useGridColumns(),
    height: '100%',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getAcceptancePage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
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
    <FormModal title="新建验收记录" class="w-[680px]">
      <ElForm label-width="100px">
        <ElCard class="mb-4" shadow="never">
          <template #header>关联合同</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="合同类型" required>
              <ElSelect v-model="formData.contract_category" class="w-full" @change="loadContractOptions">
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

        <ElCard shadow="never">
          <template #header>验收信息</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="验收类型" required>
              <ElSelect v-model="formData.acceptance_type" class="w-full">
                <ElOption label="阶段性验收" value="phase" />
                <ElOption label="最终验收" value="final" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="验收日期" required>
              <ElDatePicker v-model="formData.acceptance_date" class="w-full" value-format="YYYY-MM-DD" />
            </ElFormItem>
            <ElFormItem label="验收结果">
              <ElSelect v-model="formData.acceptance_result" class="w-full">
                <ElOption label="通过" value="pass" />
                <ElOption label="整改后通过" value="conditional_pass" />
                <ElOption label="不通过" value="fail" />
              </ElSelect>
            </ElFormItem>
          </div>
          <ElFormItem label="验收说明">
            <ElInput v-model="formData.remark" :rows="3" type="textarea" />
          </ElFormItem>
          <div class="rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            源项目包含“验收附件”上传区。当前未接附件保存接口，本次仅保留页面结构提醒，不改保存逻辑。
          </div>
        </ElCard>
      </ElForm>
      <template #footer>
        <ElButton @click="formModalApi.close()">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </FormModal>

    <DetailModal title="验收详情" class="w-[720px]">
      <ElDescriptions v-if="selectedRecord" :column="2" border>
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
        <ElDescriptionsItem label="验收阶段">
          <ElTag :type="getTypeTagType(selectedRecord.acceptance_type)" effect="plain">
            {{ getTypeLabel(selectedRecord.acceptance_type) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="验收日期">{{ selectedRecord.acceptance_date || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="验收结果">
          <ElTag :type="getResultTagType(selectedRecord.acceptance_result)" effect="plain">
            {{ getResultLabel(selectedRecord.acceptance_result) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="验收说明" :span="2">{{ selectedRecord.remark || '-' }}</ElDescriptionsItem>
      </ElDescriptions>
      <template #footer>
        <ElButton @click="detailModalApi.close()">关闭</ElButton>
      </template>
    </DetailModal>

    <ElCard class="mb-4" shadow="never">
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div class="rounded bg-gray-50 p-3">全部记录：{{ acceptanceSummary.total }}</div>
        <div class="rounded bg-green-50 p-3 text-green-700">通过：{{ acceptanceSummary.pass }}</div>
        <div class="rounded bg-yellow-50 p-3 text-yellow-700">整改后通过：{{ acceptanceSummary.conditionalPass }}</div>
        <div class="rounded bg-red-50 p-3 text-red-700">不通过：{{ acceptanceSummary.fail }}</div>
      </div>
    </ElCard>
    <ElCard class="contract-list-card" shadow="never">
<Grid>
        <template #toolbar-tools>
          <TableAction
            :actions="[
              { label: '新建验收记录', type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate },
            ]"
          />
        </template>
        <template #contract_category="{ row }">
          <ElTag :type="getContractCategoryTagType((row as any).contract_category)" effect="plain">
            {{ getContractCategoryLabel((row as any).contract_category) }}
          </ElTag>
        </template>
        <template #client_name="{ row }">
          <CustomerName :id="(row as any).client_name || (row as any).contract_party_b" />
        </template>
        <template #acceptance_type="{ row }">
          <ElTag :type="getTypeTagType((row as any).acceptance_type)" effect="plain">
            {{ getTypeLabel((row as any).acceptance_type) }}
          </ElTag>
        </template>
        <template #acceptance_result="{ row }">
          <ElTag :type="getResultTagType((row as any).acceptance_result)" effect="plain">
            {{ getResultLabel((row as any).acceptance_result) }}
          </ElTag>
        </template>
        <template #actions="{ row }">
          <TableAction
            :actions="[
              { label: '详情', type: 'primary', link: true, icon: ACTION_ICON.VIEW, onClick: () => handleView(row) },
            ]"
          />
        </template>
      </Grid>
    </ElCard>
  </Page>
</template>

<style scoped>
.contract-list-card {
  height: calc(100vh - 310px);
  min-height: 420px;
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
