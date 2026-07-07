<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { ExcelSchemeDesigner } from '#/components/excel-scheme-designer';
import {
  reorderImportFieldsByScheme,
  type FieldOrderRuleItem,
} from '#/api/erp/import-design';
import {
  createImportSolution,
  deleteImportSolution,
  getImportSolutions,
  updateImportSolution,
  type ImportSolutionRow,
} from '#/api/erp/import-solution';

import ImportSolutionCreateDialog from '#/views/managementsys/importSolution/components/ImportSolutionCreateDialog.vue';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const loading = ref(false);
const rows = ref<ImportSolutionRow[]>([]);
const keyword = ref('');
const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const designerDialogVisible = ref(false);
const createLoading = ref(false);
const saveBasicLoading = ref(false);
const currentSortKey = ref('');
const currentSolution = ref<ImportSolutionRow | null>(null);

const PURCHASE_IN_FIELD_SORT_RULES: FieldOrderRuleItem[] = [
  { label: '采购入库单号', candidates: ['no', '采购入库编号', '采购入库单号'] },
  { label: '状态', candidates: ['status', '采购状态', '状态'] },
  { label: '供应商', candidates: ['supplier_id', '供应商编号', '供应商'] },
  { label: '结算账户', candidates: ['account_id', '结算账户编号', '结算账户'] },
  { label: '入库时间', candidates: ['in_time', '入库时间'] },
  { label: '创建人', candidates: ['createuser', '创建人'] },
  { label: '应付金额', candidates: ['total_price', '合计价格，单位：元', '应付金额'] },
  { label: '已付金额', candidates: ['payment_price', '已付款金额，单位：元', '已付金额'] },
  { label: '备注', candidates: ['remark', '备注'] },
];

const PURCHASE_RETURN_FIELD_SORT_RULES: FieldOrderRuleItem[] = [
  { label: '采购退货编号', candidates: ['return_id', '采购退货编号'] },
  { label: '采购订单项编号', candidates: ['order_item_id', '采购订单项编号'] },
  { label: '仓库编号', candidates: ['warehouse_id', '仓库编号'] },
  { label: '产品编号', candidates: ['product_id', '产品编号'] },
  { label: '产品单位', candidates: ['product_unit_id', '产品单位单位', '产品单位'] },
  { label: '产品单价', candidates: ['product_price', '产品单价'] },
  { label: '数量', candidates: ['count', '数量'] },
  { label: '总价', candidates: ['total_price', '总价'] },
  { label: '税率', candidates: ['tax_percent', '税率，百分比', '税率'] },
  { label: '税额', candidates: ['tax_price', '税额，单位：元', '税额'] },
  { label: '备注', candidates: ['remark', '备注'] },
  { label: '创建人', candidates: ['createuser', '创建人'] },
  { label: '创建时间', candidates: ['createtime', 'create_time', '创建时间'] },
  { label: '修改人', candidates: ['updateuser', '修改人'] },
  { label: '修改时间', candidates: ['updatetime', 'update_time', '修改时间'] },
];

const PROJECT_INFO_FIELD_SORT_RULES: FieldOrderRuleItem[] = [
  { label: '项目名称', candidates: ['project_name', '项目名称'] },
  { label: '项目编号', candidates: ['project_code', '项目编号'] },
  { label: '项目类型', candidates: ['project_type', '项目类型'] },
  { label: '客户', candidates: ['customer_id', '客户ID', '客户'] },
  { label: '负责人', candidates: ['project_Manager', '项目负责人', '负责人'] },
  { label: '部门', candidates: ['project_depart', '部门'] },
  { label: '项目组', candidates: ['project_group', '项目组'] },
  { label: '项目开始日期', candidates: ['project_start_date', '项目开始日期'] },
  { label: '项目结束日期', candidates: ['project_end_date', '项目结束日期'] },
  { label: '项目金额', candidates: ['project_amount', '项目金额'] },
  { label: '项目状态', candidates: ['project_status', '项目状态'] },
  { label: '参与人', candidates: ['project_participant', '项目参与人', '参与人'] },
  { label: '备注', candidates: ['project_description', '备注'] },
  { label: '创建时间', candidates: ['createtime', '创建时间'] },
  { label: '创建人', candidates: ['createuser', '创建人'] },
  { label: '修改时间', candidates: ['updatetime', '修改时间'] },
  { label: '修改人', candidates: ['updateuser', '修改人'] },
];

const INCOME_CONTRACT_FIELD_SORT_RULES: FieldOrderRuleItem[] = [
  { label: '合同编号', candidates: ['contract_no', '合同编号'] },
  { label: '合同名称', candidates: ['contract_name', '合同名称'] },
  { label: '签订日期', candidates: ['contract_signing_date', '签订日期'] },
  { label: '合同开始日期', candidates: ['contract_start_date', '合同开始日期'] },
  { label: '合同终止日期', candidates: ['contract_end_date', '合同终止日期'] },
  { label: '业务员', candidates: ['salesperson', '业务员'] },
  { label: '部门', candidates: ['deptname', 'deptid', '部门名称', '部门id', '部门'] },
  { label: '项目', candidates: ['project_name', 'project_id', '项目名称', '项目id', '项目'] },
  { label: '乙方', candidates: ['contract_party_b', '乙方'] },
  { label: '甲方', candidates: ['contract_party_a', '甲方'] },
  { label: '合同金额', candidates: ['contract_amount', '合同金额'] },
  { label: '合同税率', candidates: ['contract_tax_rate', '合同税率'] },
  { label: '合同税额', candidates: ['contract_tax_amount', '合同税额'] },
  { label: '合同总金额', candidates: ['contract_total_amount', '合同总金额'] },
  { label: '收款账号', candidates: ['receiving_account', '收款账号'] },
  { label: '开票金额', candidates: ['invoice_amount', '开票金额'] },
  { label: '合同类型', candidates: ['contract_type', '合同类型'] },
  { label: '合同状态', candidates: ['ConState', '合同状态'] },
  { label: '交付地址', candidates: ['delivery_address', '交付地址'] },
  { label: '交付日期', candidates: ['delivery_date', '交付日期'] },
  { label: '备注', candidates: ['remark', '备注'] },
  { label: '摘要', candidates: ['description', '摘要'] },
  { label: '创建时间', candidates: ['createtime', '创建时间'] },
  { label: '创建人', candidates: ['createuser', '创建人'] },
  { label: '修改时间', candidates: ['updatetime', '修改时间'] },
  { label: '修改人', candidates: ['updateuser', '修改人'] },
];

const OUTCOME_CONTRACT_FIELD_SORT_RULES: FieldOrderRuleItem[] = [
  { label: '合同编号', candidates: ['contract_no', '合同编号'] },
  { label: '合同名称', candidates: ['contract_name', '合同名称'] },
  { label: '签订日期', candidates: ['contract_signing_date', '签订日期'] },
  { label: '合同开始日期', candidates: ['contract_start_date', '合同开始日期'] },
  { label: '合同终止日期', candidates: ['contract_end_date', '合同终止日期'] },
  { label: '业务员', candidates: ['salesperson', '业务员'] },
  { label: '部门', candidates: ['deptname', 'deptid', '部门名称', '部门id', '部门'] },
  { label: '项目', candidates: ['project_name', 'project_id', '项目名称', '项目id', '项目'] },
  { label: '乙方', candidates: ['contract_party_b', '乙方'] },
  { label: '甲方', candidates: ['contract_party_a', '甲方'] },
  { label: '合同金额', candidates: ['contract_amount', '合同金额'] },
  { label: '合同税率', candidates: ['contract_tax_rate', '合同税率'] },
  { label: '合同税额', candidates: ['contract_tax_amount', '合同税额'] },
  { label: '合同总金额', candidates: ['contract_total_amount', '合同总金额'] },
  { label: '收款账号', candidates: ['receiving_account', '收款账号'] },
  { label: '开票金额', candidates: ['invoice_amount', '开票金额'] },
  { label: '合同类型', candidates: ['contract_type', '合同类型'] },
  { label: '合同状态', candidates: ['ConState', '合同状态'] },
  { label: '交付地址', candidates: ['delivery_address', '交付地址'] },
  { label: '交付日期', candidates: ['delivery_date', '交付日期'] },
  { label: '备注', candidates: ['remark', '备注'] },
  { label: '摘要', candidates: ['description', '摘要'] },
  { label: '创建时间', candidates: ['createtime', '创建时间'] },
  { label: '创建人', candidates: ['createuser', '创建人'] },
  { label: '修改时间', candidates: ['updatetime', '修改时间'] },
  { label: '修改人', candidates: ['updateuser', '修改人'] },
];

const STOCK_RECORD_FIELD_SORT_RULES: FieldOrderRuleItem[] = [
  { label: '业务单号', candidates: ['biz_no', '业务单号'] },
  { label: '业务类型', candidates: ['biz_type', '业务类型'] },
  { label: '业务编号', candidates: ['biz_id', '业务编号'] },
  { label: '业务项编号', candidates: ['biz_item_id', '业务项编号'] },
  { label: '产品编号', candidates: ['product_id', '产品编号'] },
  { label: '仓库编号', candidates: ['warehouse_id', '仓库编号'] },
  { label: '出入库数量', candidates: ['count', '出入库数量'] },
  { label: '总库存量', candidates: ['total_count', '总库存量'] },
  { label: '摘要', candidates: ['description', '摘要'] },
  { label: '创建人', candidates: ['createuser', '创建人'] },
  { label: '创建时间', candidates: ['createtime', 'create_time', '创建时间'] },
  { label: '修改人', candidates: ['updateuser', '修改人'] },
  { label: '修改时间', candidates: ['updatetime', 'update_time', '修改时间'] },
];

const MAIN_FIELD_SORT_BUTTONS: Array<{
  key: string;
  label: string;
  schemeName: string;
  sheetName: string;
  fieldOrder: FieldOrderRuleItem[];
  summary: string;
}> = [
  {
    key: 'purchase-in',
    label: '采购入库字段排序',
    schemeName: '采购入库',
    sheetName: '采购入库表',
    fieldOrder: PURCHASE_IN_FIELD_SORT_RULES,
    summary:
      '采购入库单号、状态、供应商、结算账户、入库时间、创建人、应付金额、已付金额、备注',
  },
  {
    key: 'purchase-return',
    label: '采购退货字段排序',
    schemeName: '采购退货',
    sheetName: '采购退货',
    fieldOrder: PURCHASE_RETURN_FIELD_SORT_RULES,
    summary:
      '采购退货编号、采购订单项编号、仓库编号、产品编号、产品单位、产品单价、数量、总价、税率、税额、备注、创建/修改信息',
  },
  {
    key: 'stock-record',
    label: '库存明细字段排序',
    schemeName: '库存明细',
    sheetName: '库存明细',
    fieldOrder: STOCK_RECORD_FIELD_SORT_RULES,
    summary:
      '业务单号、业务类型、业务编号、业务项编号、产品编号、仓库编号、出入库数量、总库存量、摘要、创建/修改信息',
  },
  {
    key: 'project-info',
    label: '项目信息字段排序',
    schemeName: '项目信息',
    sheetName: '项目信息表',
    fieldOrder: PROJECT_INFO_FIELD_SORT_RULES,
    summary:
      '项目名称、项目编号、项目类型、客户、负责人、部门、项目组、开始/结束日期、金额、状态、参与人、备注、创建/修改信息',
  },
  {
    key: 'income-contract',
    label: '收入合同字段排序',
    schemeName: '收入合同',
    sheetName: '收入合同表',
    fieldOrder: INCOME_CONTRACT_FIELD_SORT_RULES,
    summary:
      '合同编号、合同名称、签订日期、合同期间、业务员、部门、项目、甲乙方、金额税额、收款账号、开票金额、状态、交付、备注、时间信息',
  },
  {
    key: 'outcome-contract',
    label: '支出合同字段排序',
    schemeName: '支出合同',
    sheetName: '支出合同表',
    fieldOrder: OUTCOME_CONTRACT_FIELD_SORT_RULES,
    summary:
      '合同编号、合同名称、签订日期、合同期间、业务员、部门、项目、甲乙方、金额税额、收款账号、开票金额、状态、交付、备注、时间信息',
  },
];

function filterRows(list: ImportSolutionRow[]) {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return list;
  return list.filter((item) =>
    [item.coding, item.solutionName, item.description, item.createuser]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text)),
  );
}

async function loadData() {
  loading.value = true;
  try {
    const list = await getImportSolutions();
    rows.value = list.sort((a, b) =>
      String(b.createtime || '').localeCompare(String(a.createtime || '')),
    );
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  createDialogVisible.value = true;
}

async function submitCreate(solutionName: string) {
  if (!solutionName.trim()) {
    ElMessage.warning('请填写方案名称');
    return;
  }
  createLoading.value = true;
  try {
    const result = await createImportSolution(solutionName.trim());
    if (!result.success || !result.data) {
      ElMessage.error(result.message);
      return;
    }
    ElMessage.success(result.message);
    createDialogVisible.value = false;
    await loadData();
    openDesigner(result.data);
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    createLoading.value = false;
  }
}

function openEdit(row: ImportSolutionRow) {
  currentSolution.value = { ...row };
  editDialogVisible.value = true;
}

function openDesigner(row: ImportSolutionRow) {
  currentSolution.value = { ...row };
  designerDialogVisible.value = true;
}

async function saveBasicInfo() {
  if (!currentSolution.value) return;
  if (!currentSolution.value.solutionName?.trim()) {
    ElMessage.warning('方案名称不能为空');
    return;
  }
  saveBasicLoading.value = true;
  try {
    const result = await updateImportSolution({
      ...currentSolution.value,
      solutionName: currentSolution.value.solutionName.trim(),
    });
    if (!result.success || !result.data) {
      ElMessage.error(result.message);
      return;
    }
    currentSolution.value = { ...result.data };
    ElMessage.success(result.message);
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    saveBasicLoading.value = false;
  }
}

async function removeRow(row: ImportSolutionRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除方案【${row.solutionName}】吗？删除后不可恢复。`,
      '删除确认',
      {
        type: 'warning',
      },
    );
    const result = await deleteImportSolution(row);
    if (!result.success) {
      ElMessage.error(result.message);
      return;
    }
    ElMessage.success(result.message);
    await loadData();
  } catch (error: any) {
    if (error === 'cancel') return;
    ElMessage.error(error?.message || String(error));
  }
}

function openDemo(row: ImportSolutionRow) {
  ElMessage.info(`导入示例功能待补充，当前方案：${row.solutionName}`);
}

async function handleMainFieldSort(button: (typeof MAIN_FIELD_SORT_BUTTONS)[number]) {
  try {
    await ElMessageBox.confirm(
      `将把【${button.schemeName} / ${button.sheetName}】中的主表字段按“${button.summary}”顺序从 A 开始写入 index。只会修改匹配到的字段，是否继续？`,
      '方案主表字段排序设置',
      {
        type: 'warning',
      },
    );
  } catch (error) {
    return;
  }

  currentSortKey.value = button.key;
  try {
    const result = await reorderImportFieldsByScheme({
      schemeName: button.schemeName,
      sheetName: button.sheetName,
      fieldOrder: button.fieldOrder,
    });

    if (!result.success || !result.data) {
      ElMessage.error(result.message);
      return;
    }

    ElMessage.success(result.message);
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || String(error));
  } finally {
    currentSortKey.value = '';
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="import-solution-page">
      <div class="page-header">
        <div>
          <h2>导入方案列表</h2>
          <p class="page-desc">
            先在这里维护导入方案，再通过“方案设计”弹窗进入统一方案设计器维护工作表树、字段映射和模板配置。
          </p>
        </div>
        <div class="header-actions">
          <ElInput
            v-model="keyword"
            class="search-input"
            clearable
            placeholder="筛选方案编码 / 名称 / 备注"
          />
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton type="primary" @click="openCreateDialog">新增方案</ElButton>
        </div>
      </div>

      <div class="sort-example-bar">
        <div class="sort-button-group">
          <ElButton
            v-for="button in MAIN_FIELD_SORT_BUTTONS"
            :key="button.key"
            type="warning"
            plain
            :loading="currentSortKey === button.key"
            @click="handleMainFieldSort(button)"
          >
            {{ button.label }}
          </ElButton>
        </div>
        <span class="sort-example-tip">
          当前保留 6 个独立按钮：采购入库、采购退货、库存明细、项目信息、收入合同、支出合同。采购入库按钮已去掉“未付金额”；采购退货按钮按真实 sheet「采购退货」的明细字段顺序写入 index；库存明细按钮按真实 sheet「库存明细」的字段顺序写入 index；其它功能不变。
        </span>
      </div>

      <ElCard shadow="never">
        <ElTable
          v-loading="loading"
          :data="filterRows(rows)"
          border
          stripe
          height="70vh"
        >
          <ElTableColumn type="index" width="60" label="#" />
          <ElTableColumn
            prop="coding"
            label="方案编码"
            width="180"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="solutionName"
            label="方案名称"
            min-width="220"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="createuser"
            label="创建人"
            width="120"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="createtime"
            label="创建时间"
            width="180"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="description"
            label="备注"
            min-width="220"
            show-overflow-tooltip
          />
          <ElTableColumn label="状态" width="100">
            <template #default="{ row }">
              <ElTag v-if="row.rowid" type="success">可设计</ElTag>
              <ElTag v-else type="info">未完成</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <ElButton type="primary" link @click="openEdit(row)">编辑</ElButton>
              <ElButton type="primary" link @click="openDesigner(row)">
                方案设计
              </ElButton>
              <ElButton type="info" link @click="openDemo(row)">
                导入示例
              </ElButton>
              <ElButton type="danger" link @click="removeRow(row)">
                删除
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
        <ElEmpty
          v-if="!loading && filterRows(rows).length === 0"
          description="暂无导入方案"
        />
      </ElCard>

      <ImportSolutionCreateDialog
        v-model="createDialogVisible"
        :loading="createLoading"
        @submit="submitCreate"
      />

      <ElDialog
        v-model="editDialogVisible"
        title="编辑导入方案"
        width="720px"
        destroy-on-close
      >
        <ElCard v-if="currentSolution" shadow="never" class="basic-card">
          <template #header>
            <div class="card-header">
              <span>方案基础信息</span>
              <ElButton
                type="primary"
                :loading="saveBasicLoading"
                @click="saveBasicInfo"
              >
                保存基础信息
              </ElButton>
            </div>
          </template>
          <ElForm label-width="90px" class="basic-form">
            <ElFormItem label="方案编码">
              <ElInput :model-value="currentSolution.coding || ''" disabled />
            </ElFormItem>
            <ElFormItem label="方案名称">
              <ElInput v-model="currentSolution.solutionName" clearable />
            </ElFormItem>
            <ElFormItem label="备注">
              <ElInput
                v-model="currentSolution.description"
                type="textarea"
                :rows="2"
              />
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElDialog>

      <ElDialog
        v-model="designerDialogVisible"
        :title="`${currentSolution?.solutionName || '当前方案'} - 方案设计器`"
        width="92vw"
        top="4vh"
        destroy-on-close
      >
        <div class="designer-wrap">
          <ExcelSchemeDesigner
            v-if="currentSolution?.rowid"
            :scheme-id="currentSolution.rowid"
          />
        </div>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.import-solution-page {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-desc {
  margin: 6px 0 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sort-example-bar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.sort-button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sort-example-tip {
  flex: 1;
  min-width: 280px;
  line-height: 1.7;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.search-input {
  width: 280px;
}

.basic-card {
  flex-shrink: 0;
}

.basic-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.basic-form :deep(.el-form-item:last-child) {
  grid-column: 1 / span 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.designer-wrap {
  height: 76vh;
}

@media (max-width: 1400px) {
  .basic-form {
    grid-template-columns: 1fr;
  }

  .basic-form :deep(.el-form-item:last-child) {
    grid-column: auto;
  }
}
</style>
