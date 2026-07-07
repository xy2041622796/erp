<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmContractApi } from '#/api/erp/contract/contract';

import {
  ref,
  onBeforeUnmount } from 'vue';

import { Page,
  useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { createChangeRecord, createTerminationRecord } from '#/api/erp/contract/change/original';
import { deleteContract, downloadContractImportTemplate, exportContract, getContract, getContractPage, importContract } from '#/api/erp/contract/contract';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import CustomerName from '#/components/customer-selector/CustomerName.vue';
import UserName from '#/components/user-selector/UserName.vue';

import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';
import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import SettlementForm from '#/views/finance/revenue/settlement/modules/form.vue';
import CustomerDetailModal from './modules/customer-detail-modal.vue';
import ProjectDetailModal from '../../project/modules/form.vue';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElLoading,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElUpload,
} from 'element-plus';


const changeDialogVisible = ref(false);
const terminationDialogVisible = ref(false);
const selectedContract = ref<any>(null);
const changeForm = ref({
  contract_category: 0,
  contract_id: '',
  change_type: '综合变更',
  change_reason: '',
  effective_date: '',
  before_contract_amount: 0,
  after_contract_amount: 0,
  before_contract_tax_rate: 0,
  after_contract_tax_rate: 0,
  before_contract_tax_amount: 0,
  after_contract_tax_amount: 0,
  before_contract_total_amount: 0,
  after_contract_total_amount: 0,
  before_start: '',
  before_end: '',
  after_start: '',
  after_end: '',
  before_terms: '',
  after_terms: '',
});
const terminationForm = ref({
  contract_category: 0,
  contract_id: '',
  termination_type: '正常完结',
  actual_end_date: '',
  termination_reason: '',
  remarks: '',
});

type ChangePlanRow = {
  rowid?: string;
  plan_period: string;
  plan_date?: string;
  plan_amount: number;
  is_auto: number;
  remark: string;
};

const originalChangePlanRows = ref<ChangePlanRow[]>([]);
const changePlanRows = ref<ChangePlanRow[]>([]);

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
const INCOME_CONTRACT_EXPORT_ENCODING_ID = '511316A8D6E66896A720FFB46D0D8993';

/** 导入相关状态 */
const importDialogVisible = ref(false);
const importSubmitting = ref(false);
const selectedImportFile = ref<File | null>(null);
const importFileInputRef = ref<HTMLInputElement | null>(null);

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 导入合同：触发文件选择 */
function handleImport() {
  importFileInputRef.value?.click();
}

function handleUploadChange(file: any) {
  if (file.raw) {
    selectedImportFile.value = file.raw;
  }
}

/** 文件选择后校验并打开导入对话框 */
function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.xls') && !fileName.endsWith('.xlsx')) {
    ElMessage.warning('仅支持上传 xls 或 xlsx 文件');
    input.value = '';
    return;
  }
  selectedImportFile.value = file;
  importDialogVisible.value = true;
  input.value = '';
}

/** 关闭导入对话框 */
function handleCloseImportDialog() {
  importDialogVisible.value = false;
  selectedImportFile.value = null;
}

/** 确认导入 */
async function handleImportSubmit() {
  if (!selectedImportFile.value) {
    ElMessage.warning('请选择 Excel 文件');
    return;
  }
  importSubmitting.value = true;
  try {
    await importContract(selectedImportFile.value, INCOME_CONTRACT_EXPORT_ENCODING_ID);
    ElMessage.success('导入成功');
    importDialogVisible.value = false;
    selectedImportFile.value = null;
    handleRefresh();
  } catch (error: any) {
    console.error('导入失败:', error);
    ElMessage.error(error?.message || '导入失败，请检查文件格式或后端导入方案配置');
  } finally {
    importSubmitting.value = false;
  }
}

/** 下载导入模板 */
async function handleImportTemplateDownload() {
  try {
    const blob = await downloadContractImportTemplate();
    downloadFileFromBlobPart({ fileName: '合同导入模板.xlsx', source: blob });
  } catch (error) {
    console.error('下载导入模板失败:', error);
    ElMessage.error('下载导入模板失败');
  }
}

async function handleExport() {
  try {
    const formValues = await gridApi.formApi.getValues();
    const params = { ...formValues };
    if (params.ConState === '' || params.ConState == null) {
      delete params.ConState;
    }
    const data = await exportContract(
      params,
      INCOME_CONTRACT_EXPORT_ENCODING_ID,
    );
    downloadFileFromBlobPart({ fileName: '收入合同.xls', source: data });
  } catch (error: any) {
    if (typeof Blob !== 'undefined' && error instanceof Blob) {
      try {
        const text = await error.text();
        const json = JSON.parse(text);
        ElMessage.error(json?.Message || json?.message || '导出失败');
      } catch {
        ElMessage.error('导出失败，请检查导出方案配置或网络连接');
      }
    } else {
      ElMessage.error(error?.message || '导出失败');
    }
  }
}

/** 创建合同 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑合同 */
function handleEdit(row: CrmContractApi.Contract) {
  if (!canDirectEditContract(row as any)) {
    ElMessage.warning('当前合同状态不允许直接修改，请通过合同变更处理');
    return;
  }
  formModalApi.setData(row).open();
}

function normalizeDateText(value: any) {
  if (!value) return '';
  const text = String(value).trim();
  return text.includes('T') ? text.split('T')[0] : text;
}

function getContractId(row: any) {
  return String(row?.rowid ?? row?.row_id ?? row?.id ?? '').trim();
}

function getContractConState(row: any) {
  const value = row?.ConState ?? row?.conState ?? row?.constate ?? row?.con_state;
  const state = Number(value);
  return Number.isFinite(state) ? state : undefined;
}

function canDirectEditContract(row: any) {
  return getContractConState(row) === 0;
}

function canDeleteContract(row: any) {
  return getContractConState(row) === 0;
}

function canChangeContract(row: any) {
  const state = getContractConState(row);
  return state === 1 || state === 2;
}

function canTerminateContract(row: any) {
  const state = getContractConState(row);
  return state === 1 || state === 2;
}

async function handleChangeContract(row: CrmContractApi.Contract) {
  const contractId = getContractId(row);
  if (!contractId) {
    ElMessage.warning('未找到合同ID');
    return;
  }
  let detail: any = row;
  try {
    const loaded = await getContract(contractId);
    if (loaded) detail = loaded;
  } catch (error) {
    console.error('加载合同详情失败，使用列表行数据继续变更:', error);
  }
  selectedContract.value = detail;
  const contractAmount = Number((detail as any).contract_amount ?? 0) || 0;
  const taxRate = Number((detail as any).contract_tax_rate ?? 0) || 0;
  const taxAmount = Number((detail as any).contract_tax_amount ?? 0) || 0;
  const totalAmount = Number((detail as any).contract_total_amount ?? contractAmount) || 0;
  changeForm.value = {
    contract_category: 0,
    contract_id: contractId,
    change_type: '综合变更',
    change_reason: '',
    effective_date: '',
    before_contract_amount: contractAmount,
    after_contract_amount: contractAmount,
    before_contract_tax_rate: taxRate,
    after_contract_tax_rate: taxRate,
    before_contract_tax_amount: taxAmount,
    after_contract_tax_amount: taxAmount,
    before_contract_total_amount: totalAmount,
    after_contract_total_amount: totalAmount,
    before_start: normalizeDateText((detail as any).contract_start_date),
    before_end: normalizeDateText((detail as any).contract_end_date),
    after_start: normalizeDateText((detail as any).contract_start_date),
    after_end: normalizeDateText((detail as any).contract_end_date),
    before_terms: '',
    after_terms: '',
  };
  originalChangePlanRows.value = normalizeChangePlanRows((detail as any).plan_items || []);
  changePlanRows.value = originalChangePlanRows.value.map((item) => ({ ...item }));
  changeDialogVisible.value = true;
}

function handleTerminateContract(row: CrmContractApi.Contract) {
  const contractId = getContractId(row);
  if (!contractId) {
    ElMessage.warning('未找到合同ID');
    return;
  }
  selectedContract.value = row;
  terminationForm.value = {
    contract_category: 0,
    contract_id: contractId,
    termination_type: '正常完结',
    actual_end_date: '',
    termination_reason: '',
    remarks: '',
  };
  terminationDialogVisible.value = true;
}

let changeCalcLock = false;

function recalcChangeAmounts() {
  if (changeCalcLock) return;
  changeCalcLock = true;
  const amount = Number(changeForm.value.after_contract_amount ?? 0);
  const rate = Number(changeForm.value.after_contract_tax_rate ?? 0) / 100;
  const tax = Number((amount * rate).toFixed(2));
  changeForm.value.after_contract_tax_amount = tax;
  changeForm.value.after_contract_total_amount = Number((amount + tax).toFixed(2));
  changeCalcLock = false;
}

function recalcChangeRateAndTax() {
  if (changeCalcLock) return;
  changeCalcLock = true;
  const total = Number(changeForm.value.after_contract_total_amount ?? 0);
  const amount = Number(changeForm.value.after_contract_amount ?? 0);
  if (amount > 0) {
    const rate = Number(((total / amount - 1) * 100).toFixed(2));
    const tax = Number((total - amount).toFixed(2));
    changeForm.value.after_contract_tax_rate = rate;
    changeForm.value.after_contract_tax_amount = tax;
  } else {
    changeForm.value.after_contract_tax_rate = 0;
    changeForm.value.after_contract_tax_amount = 0;
  }
  changeCalcLock = false;
}

function normalizeChangePlanRows(rows: any[]): ChangePlanRow[] {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    rowid: row?.rowid ? String(row.rowid) : undefined,
    plan_period: String(row?.plan_period || index + 1).replace(/[^0-9]/g, '') || String(index + 1),
    plan_date: normalizeDateText(row?.plan_date),
    plan_amount: Number(row?.plan_amount ?? 0) || 0,
    is_auto: Number(row?.is_auto ?? 0) || 0,
    remark: String(row?.remark ?? ''),
  }));
}

function shouldShowChangePlan() {
  return changeForm.value.change_type === '收款计划变更' || changeForm.value.change_type === '付款明细变更' || changeForm.value.change_type === '综合变更';
}

function addChangePlanRow() {
  changePlanRows.value.push({
    plan_period: String(changePlanRows.value.length + 1),
    plan_date: '',
    plan_amount: 0,
    is_auto: 0,
    remark: '',
  });
}

function removeChangePlanRow(index: number) {
  changePlanRows.value.splice(index, 1);
  changePlanRows.value = changePlanRows.value.map((row, idx) => ({ ...row, plan_period: String(idx + 1) }));
}

function getChangePlanTotal() {
  return changePlanRows.value.reduce((sum, row) => sum + Number(row.plan_amount || 0), 0);
}

function validateChangePlan() {
  if (!shouldShowChangePlan()) return true;
  if (!changePlanRows.value.length) {
    ElMessage.warning('请维护收款计划');
    return false;
  }
  if (changePlanRows.value.some((row) => !row.plan_period || !row.plan_date || Number(row.plan_amount) < 0)) {
    ElMessage.warning('收款计划期次、计划日期不能为空，金额不能小于0');
    return false;
  }
  const targetAmount = Number(changeForm.value.after_contract_total_amount || 0);
  const total = getChangePlanTotal();
  if (Math.abs(total - targetAmount) > 0.01) {
    ElMessage.warning('收款计划合计必须等于变更后金额，当前合计：' + total.toFixed(2));
    return false;
  }
  return true;
}

function normalizePlanRowsForSubmit(rows: ChangePlanRow[]) {
  return rows.map((row) => ({ ...row, plan_date: row.plan_date || null }));
}

async function handleSubmitChange() {
  if (!changeForm.value.contract_id || !changeForm.value.change_reason) {
    ElMessage.warning('请填写变更原因');
    return;
  }
  if (!validateChangePlan()) return;
  await createChangeRecord({
    contract_category: 0,
    contract_id: changeForm.value.contract_id,
    change_type: changeForm.value.change_type,
    change_reason: changeForm.value.change_reason,
    effective_date: changeForm.value.effective_date,
    amount_change: {
      before_contract_amount: Number(changeForm.value.before_contract_amount || 0),
      after_contract_amount: Number(changeForm.value.after_contract_amount || 0),
      before_contract_tax_rate: Number(changeForm.value.before_contract_tax_rate || 0),
      after_contract_tax_rate: Number(changeForm.value.after_contract_tax_rate || 0),
      before_contract_tax_amount: Number(changeForm.value.before_contract_tax_amount || 0),
      after_contract_tax_amount: Number(changeForm.value.after_contract_tax_amount || 0),
      before_contract_total_amount: Number(changeForm.value.before_contract_total_amount || 0),
      after_contract_total_amount: Number(changeForm.value.after_contract_total_amount || 0),
    },
    period_change: {
      before_start: changeForm.value.before_start,
      before_end: changeForm.value.before_end,
      after_start: changeForm.value.after_start,
      after_end: changeForm.value.after_end,
    },
    payment_change: shouldShowChangePlan()
      ? { before: normalizePlanRowsForSubmit(originalChangePlanRows.value), after: normalizePlanRowsForSubmit(changePlanRows.value) }
      : { before: [], after: [] },
    terms_change: { before: changeForm.value.before_terms, after: changeForm.value.after_terms },
  });
  ElMessage.success('变更申请保存成功，审批通过后应用到合同');
  changeDialogVisible.value = false;
  handleRefresh();
}

async function handleSubmitTermination() {
  if (!terminationForm.value.contract_id || !terminationForm.value.actual_end_date || !terminationForm.value.termination_reason) {
    ElMessage.warning('请填写终结日期和终结原因');
    return;
  }
  await createTerminationRecord({ ...terminationForm.value });
  ElMessage.success('合同终结保存成功');
  terminationDialogVisible.value = false;
  handleRefresh();
}

/** 删除合同 */
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

/** 查看合同详情 */
function handleDetail(row: CrmContractApi.Contract) {
  // push({ name: 'CrmContractDetail', params: { id: row.rowid ?? row.id } });
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

/** 结算合同 */
async function handleSettlement(row: CrmContractApi.Contract) {
  const contractId = String((row as any).rowid ?? (row as any).id ?? '').trim();
  if (!contractId) {
    ElMessage.warning('未找到合同ID');
    return;
  }

  // 结算入口应打开“已生成的收入结算单”，因此先用合同ID查结算单 rowid
  try {
    const res = await getIncomeSettlementPage({
      pageNo: 1,
      page: 50,
      contract_id: contractId,
      settlement_type: 0,
    } as any);

    const list = ((res as any)?.list ?? []) as any[];
    const pickLatest = (rows: any[]) => {
      const ts = (v: any) => {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
        const d = new Date(v);
        const t = d.getTime();
        return Number.isFinite(t) ? t : 0;
      };

      return rows
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
    };

    const target = pickLatest(list);
    const settlementId = String(target?.rowid ?? target?.id ?? '').trim();

    if (settlementId) {
      settlementFormModalApi
        .setData({ type: 'edit', rowid: settlementId })
        .open();
      return;
    }
  } catch (e: any) {
    // 查询失败不阻断：回退为按合同ID创建
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
    // 处理 Element Plus 残留的 body 锁定与遮罩
    document.body?.classList?.remove('el-popup-parent--hidden');
    const epOverlays = document.querySelectorAll?.('.el-overlay');
    epOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el));

    // 处理 Vben/Shadcn 弹窗遮罩残留（DialogOverlay -> .bg-overlay）
    const vbenOverlays = document.querySelectorAll?.('.bg-overlay');
    vbenOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el));

    // 解除滚动锁与右侧补偿（useScrollLock）
    if (document?.body?.style) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    // 恢复被锁定节点的 padding 与过渡（_scroll__fixed_）
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

/** 查看客户详情 */
function handleCustomerDetail(row: CrmContractApi.Contract) {
  const customerId = String((row as any).contract_party_b ?? row.customerId ?? '').trim();
  if (!customerId) {
    ElMessage.warning('未找到客户ID');
    return;
  }
  customerDetailModalApi.setData({ id: customerId }).open();
}

/** 查看项目详情 */
function handleBusinessDetail(row: CrmContractApi.Contract) {
  const projectId = String((row as any).project_id ?? row.businessId ?? '').trim();
  if (!projectId) {
    ElMessage.warning('未找到项目ID');
    return;
  }
  projectDetailModalApi.setData({ type: 'detail', rowid: projectId }).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: false,
    wrapperClass: 'grid-cols-4',
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const params = { ...formValues };
          if (params.ConState === '' || params.ConState == null) {
            delete params.ConState;
          }
          const res = await getContractPage({
            pageNo: page.currentPage,
            page: page.page,
            ...params,
          });
          dataTable.value = (res as any).dataTable;
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
      search: false,
    },
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
  const state = getContractConState(row);
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

    <ElDialog v-model="changeDialogVisible" title="合同变更" width="760px" append-to-body>
      <ElForm label-width="110px">
        <ElFormItem label="关联合同">
          <ElInput :model-value="selectedContract?.contract_name || selectedContract?.contract_no || '-'" disabled />
        </ElFormItem>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="变更类型" required>
            <ElSelect v-model="changeForm.change_type" class="w-full">
              <ElOption label="金额变更" value="金额变更" />
              <ElOption label="收款计划变更" value="收款计划变更" />
              <ElOption label="期限变更" value="期限变更" />
              <ElOption label="条款变更" value="条款变更" />
              <ElOption label="综合变更" value="综合变更" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="生效日期">
            <ElDatePicker v-model="changeForm.effective_date" class="w-full" value-format="YYYY-MM-DD" />
          </ElFormItem>
          <ElFormItem label="原未税金额">
            <ElInputNumber v-model="changeForm.before_contract_amount" :precision="2" disabled class="!w-full" />
          </ElFormItem>
          <ElFormItem label="新未税金额">
            <ElInputNumber v-model="changeForm.after_contract_amount" :precision="2" class="!w-full" @change="recalcChangeAmounts" />
          </ElFormItem>
          <ElFormItem label="原税率">
            <ElInputNumber v-model="changeForm.before_contract_tax_rate" :precision="2" disabled class="!w-full" />
          </ElFormItem>
          <ElFormItem label="新税率">
            <ElInputNumber v-model="changeForm.after_contract_tax_rate" :precision="2" class="!w-full" @change="recalcChangeAmounts" />
          </ElFormItem>
          <ElFormItem label="原税额">
            <ElInputNumber v-model="changeForm.before_contract_tax_amount" :precision="2" disabled class="!w-full" />
          </ElFormItem>
          <ElFormItem label="新税额">
            <ElInputNumber v-model="changeForm.after_contract_tax_amount" :precision="2" disabled class="!w-full" />
          </ElFormItem>
          <ElFormItem label="原含税金额">
            <ElInputNumber v-model="changeForm.before_contract_total_amount" :precision="2" disabled class="!w-full" />
          </ElFormItem>
          <ElFormItem label="新含税金额">
            <ElInputNumber v-model="changeForm.after_contract_total_amount" :precision="2" class="!w-full" @change="recalcChangeRateAndTax" />
          </ElFormItem>
          <ElFormItem label="原开始日期">
            <ElDatePicker v-model="changeForm.before_start" disabled class="w-full" value-format="YYYY-MM-DD" />
          </ElFormItem>
          <ElFormItem label="原结束日期">
            <ElDatePicker v-model="changeForm.before_end" disabled class="w-full" value-format="YYYY-MM-DD" />
          </ElFormItem>
          <ElFormItem label="新开始日期">
            <ElDatePicker v-model="changeForm.after_start" class="w-full" value-format="YYYY-MM-DD" />
          </ElFormItem>
          <ElFormItem label="新结束日期">
            <ElDatePicker v-model="changeForm.after_end" class="w-full" value-format="YYYY-MM-DD" />
          </ElFormItem>
        </div>
        <ElFormItem v-if="shouldShowChangePlan()" label="收款计划">
          <div class="w-full">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs text-gray-500">合计：{{ getChangePlanTotal().toFixed(2) }}</span>
              <ElButton type="primary" link @click="addChangePlanRow">添加期次</ElButton>
            </div>
            <ElTable :data="changePlanRows" border size="small" style="width: 100%">
              <ElTableColumn label="期次" width="90" align="center">
                <template #default="{ row }">
                  <ElInput v-model="row.plan_period" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="计划日期" width="160">
                <template #default="{ row }">
                  <ElDatePicker v-model="row.plan_date" class="w-full" value-format="YYYY-MM-DD" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="计划金额" width="150">
                <template #default="{ row }">
                  <ElInputNumber v-model="row.plan_amount" :min="0" :precision="2" class="!w-full" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="自动结算" width="120" align="center">
                <template #default="{ row }">
                  <ElSelect v-model="row.is_auto" class="w-full">
                    <ElOption label="否" :value="0" />
                    <ElOption label="是" :value="1" />
                  </ElSelect>
                </template>
              </ElTableColumn>
              <ElTableColumn label="备注" min-width="180">
                <template #default="{ row }">
                  <ElInput v-model="row.remark" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="80" align="center">
                <template #default="{ $index }">
                  <ElButton type="danger" link @click="removeChangePlanRow($index)">删除</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElFormItem>
        <ElFormItem label="原条款">
          <ElInput v-model="changeForm.before_terms" :rows="3" type="textarea" />
        </ElFormItem>
        <ElFormItem label="新条款">
          <ElInput v-model="changeForm.after_terms" :rows="3" type="textarea" />
        </ElFormItem>
        <ElFormItem label="变更原因" required>
          <ElInput v-model="changeForm.change_reason" :rows="3" type="textarea" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="changeDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmitChange">保存变更</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="terminationDialogVisible" title="合同终结" width="680px" append-to-body>
      <ElForm label-width="110px">
        <ElFormItem label="关联合同">
          <ElInput :model-value="selectedContract?.contract_name || selectedContract?.contract_no || '-'" disabled />
        </ElFormItem>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="终结类型" required>
            <ElSelect v-model="terminationForm.termination_type" class="w-full">
              <ElOption label="正常完结" value="正常完结" />
              <ElOption label="提前终止" value="提前终止" />
              <ElOption label="协商解除" value="协商解除" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="终结日期" required>
            <ElDatePicker v-model="terminationForm.actual_end_date" class="w-full" value-format="YYYY-MM-DD" />
          </ElFormItem>
        </div>
        <ElFormItem label="终结原因" required>
          <ElInput v-model="terminationForm.termination_reason" :rows="3" type="textarea" />
        </ElFormItem>
        <ElFormItem label="归档说明">
          <ElInput v-model="terminationForm.remarks" :rows="3" type="textarea" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="terminationDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmitTermination">保存终结</ElButton>
      </template>
    </ElDialog>

    <!-- 隐藏的文件选择 input -->
    <input
      ref="importFileInputRef"
      type="file"
      accept=".xls,.xlsx"
      style="display: none"
      @change="handleImportFileChange"
    />

    <!-- 导入合同对话框 -->
    <ElDialog
      v-model="importDialogVisible"
      title="导入收入合同"
      width="520px"
      :close-on-click-modal="false"
      append-to-body
      destroy-on-close
    >
      <div class="py-2">
        <div class="mx-4">
          <div class="mb-2 text-sm font-medium">合同数据</div>
          <ElUpload
            :limit="1"
            accept=".xls,.xlsx"
            :auto-upload="false"
            @change="handleUploadChange"
          >
            <ElButton type="primary">选择 Excel 文件</ElButton>
          </ElUpload>
          <div v-if="selectedImportFile" class="mt-2 text-sm text-gray-500">
            已选择文件：{{ selectedImportFile.name }}
          </div>
          <div v-else class="mt-2 text-sm text-gray-500">
            仅支持上传 xls、xlsx 格式文件
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between px-4">
          <ElButton @click="handleImportTemplateDownload">下载导入模板</ElButton>
          <div class="flex gap-2">
            <ElButton @click="handleCloseImportDialog">取消</ElButton>
            <ElButton type="primary" :loading="importSubmitting" @click="handleImportSubmit">
              确认导入
            </ElButton>
          </div>
        </div>
      </template>
    </ElDialog>

    <Grid>
      <template #toolbar-tools>
        <ElButton @click="handleImport">导入合同</ElButton>
        <ElButton @click="handleExport">导出</ElButton>
        <ElButton
          type="primary"
          @click="handleCreate"
          :disabled="!hasPermission('data:add')"
        >
          新增收入合同
        </ElButton>
      </template>
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
            @click="handleBusinessDetail(row)"
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
          <span class="text-sm">
            {{
              formatAmount(
                pickNumber(row as any, ['settled_amount', 'settle_amount']),
              )
            }}
          </span>
          <span class="text-xs text-gray-500">
            {{
              formatAmount(
                Number((row as any).contract_total_amount ?? 0) -
                  pickNumber(row as any, ['settled_amount', 'settle_amount']),
              )
            }}
          </span>
        </div>
      </template>

      <template #receive_amount="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">
            {{
              formatAmount(
                pickNumber(row as any, [
                  'received_amount',
                  'receive_amount',
                  'paid_amount',
                  'invoice_amount',
                ]),
              )
            }}
          </span>
          <span class="text-xs text-gray-500">
            {{
              formatAmount(
                Number((row as any).contract_total_amount ?? 0) -
                  pickNumber(row as any, [
                    'received_amount',
                    'receive_amount',
                    'paid_amount',
                    'invoice_amount',
                  ]),
              )
            }}
          </span>
        </div>
      </template>

      <template #invoice_amount="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">
            {{
              formatAmount(
                pickNumber(row as any, ['invoice_amount', 'invoiced_amount']),
              )
            }}
          </span>
          <span class="text-xs text-gray-500">
            {{
              formatAmount(
                Number((row as any).contract_total_amount ?? 0) -
                  pickNumber(row as any, ['invoice_amount', 'invoiced_amount']),
              )
            }}
          </span>
        </div>
      </template>

      <template #remark_note="{ row }">
        <div class="truncate">
          {{ (row as any).remark ?? '-' }}
        </div>
      </template>

      <template #status="{ row }">
        <span>{{ getContractStatusLabel(row) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex flex-wrap items-center justify-center gap-1">
          <ElButton
            v-if="canChangeContract(row as any)"
            type="primary"
            link
            @click="handleChangeContract(row)"
          >合同变更</ElButton>
          <ElButton
            v-if="canTerminateContract(row as any)"
            type="primary"
            link
            @click="handleTerminateContract(row)"
          >合同终结</ElButton>
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
                canDirectEditContract(row as any) &&
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
                canDeleteContract(row as any) &&
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
        </div>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
:deep(.vxe-grid--form-wrapper) {
  margin-bottom: 1rem;
}
</style>
