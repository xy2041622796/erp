<script lang="ts" setup>
import type { Department, Staff } from '#/api/common/staff-selector';
import type { ErpPaymentDetailApi } from '#/api/erp/finance/payment/other/paymentDetails';
import type { ErpPaymentApplyApi } from '#/api/erp/finance/payment/submit';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { moneyNumber, moneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDepartmentList } from '#/api/common/staff-selector';
import { getContract } from '#/api/erp/contract/contract';
import {
  getOtherExpenseProject,
  getOtherExpenseProjectPage,
} from '#/api/erp/finance/payment/other/project';
import {
  createPaymentApply,
  getPaymentApply,
  markExpenseSettlementsInPaymentProcess,
  updatePaymentApply,
} from '#/api/erp/finance/payment/submit';
import { getExpenseSettlementPage } from '#/api/erp/finance/payment/settlement';
import {
  getSubmitWriteOffList,
  saveSubmitWriteOffs,
} from '#/api/erp/finance/revenue/writeoff';
import CustomerPicker from '#/components/customer-selector/CustomerPicker.vue';
import ProjectPicker from '#/components/project-selector/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { $t } from '#/locales';
import { formatDateOnly } from '#/utils/date';

import OtherExpenseItemForm from '#/views/finance/payment/other/modules/item-form.vue';
import ContractSelectModal from '#/views/finance/payment/settlement/modules/contract-select-modal.vue';
import { useFormSchema, useSelectedSettlementColumns } from '#/views/finance/payment/submit/data';
import PreReceiptBillSelectModal from '#/views/finance/payment/submit/modules/pre-receipt-bill-select-modal.vue';

import { ElButton, ElInput, ElInputNumber, ElMessage } from 'element-plus';

type Mode = 'create' | 'detail' | 'edit';

const emit = defineEmits<{ (e: 'success'): void }>();

const userStore = useUserStore();

const formType = ref<Mode>('create');
const formData = ref<ErpPaymentApplyApi.PaymentApply>({
  rowid: undefined,
  apply_no: undefined,
  status: 0,
  customer_id: undefined,
  project_id: undefined,
  contract_id: undefined,
  payment_type: undefined,
  payee_name: undefined,
  payment_purpose: undefined,
  payment_amount: 0,
  pay_account: undefined,
  apply_date: Date.now().toString(),
  repay_date: undefined,
  remark: undefined,
  applicant_name:
    (userStore.userInfo as any)?.id ?? (userStore.userInfo as any)?.ROWID ?? '',
  apply_depart: (userStore.userInfo as any)?.deptId ?? '',
  pay_amount: 0,
  pay_balance: 0,
});

type PreReceiptBillRow = any & {
  apply_amount?: number;
  balance?: any;
  pre_receipt_balance?: any;
  receive_balance?: any;
  rowid?: string;
  settlement_date?: any;
  settlement_no?: string;
};

const preReceiptSelectOpen = ref(false);
const selectedPreReceiptBills = ref<PreReceiptBillRow[]>([]);

const expenseDetails = ref<ErpPaymentDetailApi.PaymentDetail[]>([]);
const expenseTaxIncluded = ref<number>(1);
const expenseSummaries = ref<{
  amount: number;
  taxAmount: number;
  total: number;
}>({ amount: 0, taxAmount: 0, total: 0 });
const initializingForm = ref(false);
const skipPaymentTypeResetOnce = ref(false);

function handleExpenseTaxIncludedChange(v: number) {
  expenseTaxIncluded.value = v;
}

function handleExpenseSummaryChange(s: {
  amount: number;
  taxAmount: number;
  total: number;
}) {
  expenseSummaries.value = s;
}

function safeJsonParse(text: any) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toFiniteNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return undefined;
    const normalized = text.replaceAll(',', '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function getPreReceiptBalanceValue(row: any): number | undefined {
  const candidateKeys = [
    'receive_balance',
    'pre_receipt_balance',
    'balance',
  ] as const;
  for (const key of candidateKeys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) {
      const n = toFiniteNumber((row as any)[key]);
      if (n !== undefined) return n;
      // 字段存在但值不可解析时：继续尝试下一个字段
    }
  }
  return undefined;
}

function getApplyableBalanceMax(row: any): number | undefined {
  const v = getPreReceiptBalanceValue(row);
  if (v !== undefined) return v;

  // 若行数据根本不含余额字段（如旧数据从 description 回显），则不限制 max，避免输入被强制归零
  const hasAnyBalanceField =
    row &&
    (Object.prototype.hasOwnProperty.call(row, 'receive_balance') ||
      Object.prototype.hasOwnProperty.call(row, 'pre_receipt_balance') ||
      Object.prototype.hasOwnProperty.call(row, 'balance'));
  return hasAnyBalanceField ? 0 : undefined;
}

function getPreReceiptBalance(row: any): number {
  return getPreReceiptBalanceValue(row) ?? 0;
}

function getApplyableBalance(row: any): number {
  // 当前规则：可付款余额与余额一致；后续如有专门字段可在此替换
  return getPreReceiptBalance(row);
}

const preReceiptApplyTotal = computed(() =>
  moneyNumber(sumByMoney(selectedPreReceiptBills.value, (row) => row?.apply_amount)),
);

const paymentTypeText = computed(() =>
  String(formData.value.payment_type ?? '').trim(),
);
const showPreReceiptSection = computed(() =>
  ['业务付款', '退回预收款'].includes(paymentTypeText.value),
);
const showExpenseDetailsSection = computed(
  () => paymentTypeText.value === '直接付款',
);

function isPreReceiptPaymentType(paymentType: any) {
  return ['业务付款', '退回预收款'].includes(String(paymentType ?? '').trim());
}

function syncExtraToHiddenDescription() {
  // 额外信息统一写入 description（字段在表单中隐藏）
  const extra = {
    preReceiptBills: selectedPreReceiptBills.value.map((x) => ({
      rowid: x.rowid,
      settlement_no: x.settlement_no,
      settlement_date: x.settlement_date,
      project_id: (x as any)?.project_id,
      project_name: (x as any)?.project_name,
      salesman_id: (x as any)?.salesman_id,
      salesman_name: (x as any)?.salesman_name,
      depart_id: (x as any)?.depart_id,
      remark: (x as any)?.remark,
      receive_balance: (x as any)?.receive_balance,
      pre_receipt_balance: (x as any)?.pre_receipt_balance,
      balance: (x as any)?.balance,
      apply_amount: moneyNumber(x.apply_amount),
    })),
    expenseDetails: expenseDetails.value,
    expenseTaxIncluded: expenseTaxIncluded.value,
  };

  formApi.setValues({ description: JSON.stringify(extra) }, false);
}

function syncAmountFromExtras() {
  if (showPreReceiptSection.value) {
    formApi.setValues({ payment_amount: preReceiptApplyTotal.value }, false);
    return;
  }
  if (showExpenseDetailsSection.value) {
    formApi.setValues(
      { payment_amount: moneyNumber(expenseSummaries.value.total) },
      false,
    );
  }
}

function handlePreReceiptConfirm(rows: any[]) {
  const map = new Map<string, PreReceiptBillRow>();
  for (const x of selectedPreReceiptBills.value) {
    if (x?.rowid) map.set(String(x.rowid), x);
  }

  for (const r of rows || []) {
    const id = String(r?.rowid ?? '');
    if (!id) continue;
    if (map.has(id)) continue;
    map.set(id, {
      ...r,
      apply_amount: 0,
    });
  }

  selectedPreReceiptBills.value = [...map.values()];
  preReceiptSelectOpen.value = false;
}

function removePreReceipt(row: any) {
  const rid = String(row?.rowid ?? '');
  selectedPreReceiptBills.value = selectedPreReceiptBills.value.filter(
    (x) => String(x?.rowid ?? '') !== rid,
  );
}

function handleApplyAmountChange(row: any, value: any) {
  const nextValue = Number(value ?? 0);
  selectedPreReceiptBills.value = selectedPreReceiptBills.value.map((item) =>
    String(item?.rowid) === String(row?.rowid)
      ? { ...item, apply_amount: Number.isFinite(nextValue) ? nextValue : 0 }
      : item,
  );
  syncSelectedGridData();
}

const [SelectedGrid, selectedGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useSelectedSettlementColumns(formType.value === 'detail'),
    height: 260,
    keepSource: true,
    data: selectedPreReceiptBills.value,
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: {
      refresh: false,
      search: false,
      tools: [
        { code: 'select-settlement', name: '选择单据', icon: 'vxe-icon-plus' },
        { code: 'clear-settlement', name: '清除', icon: 'vxe-icon-delete' },
      ],
    },
  } as VxeTableGridOptions,
  gridEvents: {
    toolbarToolClick: ({ code }: any) => {
      if (formType.value === 'detail') return;
      if (code === 'select-settlement') preReceiptSelectOpen.value = true;
      if (code === 'clear-settlement') selectedPreReceiptBills.value = [];
    },
  },
});

function syncSelectedGridData() {
  selectedGridApi.setState({
    gridOptions: {
      data: selectedPreReceiptBills.value,
      columns: useSelectedSettlementColumns(formType.value === 'detail'),
    },
  });
}

const deptList = ref<Department[]>([]);
const deptNameMap = computed(() => {
  const map = new Map<string, string>();
  for (const d of deptList.value)
    map.set(String(d.DepID), String(d.DepName ?? d.DepID));
  return map;
});

async function ensureDeptListLoaded() {
  if (deptList.value.length > 0) return;
  try {
    deptList.value = await getDepartmentList();
  } catch (error) {
    console.error('load departments failed', error);
  }
}

function getDeptName(id: any) {
  const key = String(id ?? '').trim();
  if (!key) return '';
  return deptNameMap.value.get(key) || key;
}

const staffId = ref<string | undefined>(
  String(formData.value.applicant_name ?? '') || undefined,
);
const deptId = ref<string | undefined>(
  String(formData.value.apply_depart ?? '') || undefined,
);
const customerId = ref<string | undefined>(
  String(formData.value.customer_id ?? '') || undefined,
);
const projectId = ref<string | undefined>(
  String(formData.value.project_id ?? '') || undefined,
);

const selectedContractName = ref('');
const [ContractSelectModalComp, contractSelectModalApi] = useVbenModal({
  connectedComponent: ContractSelectModal,
});

function handleCustomerIdChange(v?: string) {
  customerId.value = v;
  formData.value.customer_id = v as any;
  selectedContractName.value = '';
  formData.value.contract_id = undefined;
  projectId.value = undefined;
  formData.value.project_id = undefined;
  formApi.setValues(
    { customer_id: v, contract_id: undefined, project_id: undefined },
    false,
  );
}

function handleProjectIdChange(v?: string) {
  projectId.value = v;
  formData.value.project_id = v as any;
  formApi.setValues({ project_id: v }, false);
}

function handleStaffIdChange(v?: string) {
  staffId.value = v;
  if (!v) {
    handleStaffPicked(undefined);
    return;
  }
  formData.value.applicant_name = v as any;
  formApi.setValues({ applicant_name: v }, false);
}

function handleStaffPicked(staff?: Staff) {
  if (!staff) {
    staffId.value = undefined;
    deptId.value = undefined;
    formData.value.applicant_name = '' as any;
    formData.value.apply_depart = '' as any;
    formApi.setValues(
      { applicant_name: undefined, apply_depart: undefined },
      false,
    );
    return;
  }

  staffId.value = staff.ROWID;
  deptId.value = staff.DepID;

  formData.value.applicant_name = staff.ROWID as any;
  formData.value.apply_depart = (staff.DepID ?? '') as any;

  formApi.setValues(
    { applicant_name: staff.ROWID, apply_depart: staff.DepID },
    false,
  );
}

const title = computed(() => {
  if (formType.value === 'detail') return '支出申请详情';
  if (formType.value === 'edit') return '编辑支出申请';
  return '新增支出申请';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 120,
  },
  wrapperClass: 'grid grid-cols-2 gap-x-6 gap-y-4',
  layout: 'vertical',
  schema: useFormSchema(formType.value),
  showDefaultActions: false,
  handleValuesChange(values, fieldsChanged) {
    if (fieldsChanged?.includes('customer_id')) {
      const v = (values as any)?.customer_id;
      customerId.value = v ? String(v) : undefined;
      formData.value.customer_id = v;
    }
    if (fieldsChanged?.includes('project_id')) {
      const v = (values as any)?.project_id;
      projectId.value = v ? String(v) : undefined;
      formData.value.project_id = v;
    }

    if (fieldsChanged?.includes('payment_type')) {
      formData.value.payment_type = (values as any)?.payment_type;
      if (skipPaymentTypeResetOnce.value) {
        skipPaymentTypeResetOnce.value = false;
      } else if (!initializingForm.value) {
        // 类型切换时清空与类型相关的数据，避免混淆
        selectedPreReceiptBills.value = [];
        expenseDetails.value = [];
        expenseSummaries.value = { amount: 0, taxAmount: 0, total: 0 };
        syncExtraToHiddenDescription();
      }
    }
    if (fieldsChanged?.includes('payment_amount')) {
      const amt = Number((values as any)?.payment_amount ?? 0);
      if (Number.isFinite(amt)) {
        formApi.setValues(
          { pay_balance: moneyNumber(subMoney(amt, (values as any)?.pay_amount)) },
          false,
        );
      }
    }
    if (fieldsChanged?.includes('pay_amount')) {
      const amt = Number((values as any)?.payment_amount ?? 0);
      const paid = Number((values as any)?.pay_amount ?? 0);
      if (Number.isFinite(amt) && Number.isFinite(paid)) {
        formApi.setValues({ pay_balance: moneyNumber(subMoney(amt, paid)) }, false);
      }
    }
  },
});

async function getCurrentContractId() {
  const values = (await formApi.getValues()) as any;
  return String(values?.contract_id || '').trim();
}

async function openContractSelect() {
  if (formType.value === 'detail') return;

  const values = (await formApi.getValues()) as any;
  const cid = values?.customer_id;
  if (!cid) {
    ElMessage.warning('请先选择往来单位');
    return;
  }

  contractSelectModalApi.setData({ customerId: cid });
  contractSelectModalApi.open();
}

async function handleContractSelectConfirm(contract: any) {
  const cid = String(contract.rowid || contract.id || '');
  const cname = contract.contract_name || contract.contract_no || cid;
  selectedContractName.value = cname;
  await formApi.setFieldValue('contract_id', cid);

  // 选合同后：若合同带出项目且当前未选项目，则自动回填项目
  const pid = (contract as any)?.project_id;
  if (!projectId.value && (pid || pid === 0)) {
    const pv = String(pid);
    projectId.value = pv;
    await formApi.setFieldValue('project_id', pv);
  }
}

watch(
  () => selectedPreReceiptBills.value,
  () => {
    syncSelectedGridData();
    syncExtraToHiddenDescription();
    syncAmountFromExtras();
  },
  { deep: true },
);

watch(
  () => expenseDetails.value,
  () => {
    syncExtraToHiddenDescription();
    syncAmountFromExtras();
  },
  { deep: true },
);

const [Modal, modalApi] = useVbenModal({
  closeOnClickModal: false,
  closeOnPressEscape: false,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    syncExtraToHiddenDescription();

    modalApi.lock();
    try {
      const values =
        (await formApi.getValues()) as ErpPaymentApplyApi.PaymentApply;

      if (values.apply_date) {
        const ts = Number(values.apply_date);
        const date = Number.isNaN(ts)
          ? new Date(values.apply_date)
          : new Date(ts);
        values.apply_date = formatDateTime(date);
      }
      if (values.repay_date) {
        const ts = Number(values.repay_date);
        const date = Number.isNaN(ts)
          ? new Date(values.repay_date)
          : new Date(ts);
        values.repay_date = formatDateTime(date);
      }

      const res = await (formType.value === 'create'
        ? createPaymentApply(values)
        : updatePaymentApply(values));

      // 关联单据落库：复用 Bil_Submit_WriteOff
      const submitId = String(
        (res as any)?.rowid ?? (values as any)?.rowid ?? '',
      ).trim();
      if (submitId) {
        if (isPreReceiptPaymentType((values as any)?.payment_type)) {
          const settlements = selectedPreReceiptBills.value
            .filter((x) => !!x?.rowid)
            .map((x) => ({
              rowid: String(x.rowid),
              apply_amount: moneyNumber(x.apply_amount),
            }));
          await saveSubmitWriteOffs(submitId, 1, settlements);
          await markExpenseSettlementsInPaymentProcess(submitId);
        } else {
          // 非“带单据”的类型，清空支出侧关联
          await saveSubmitWriteOffs(submitId, 1, []);
        }
      }

      void res;
      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      return;
    }

    await ensureDeptListLoaded();

    const data = modalApi.getData<{
      paymentType?: string;
      rowid?: string;
      type: Mode;
      presetValues?: Record<string, any>;
      presetSettlements?: any[];
    }>();
    formType.value = data.type;

    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));

    if (formType.value === 'create') {
      const init: ErpPaymentApplyApi.PaymentApply = {
        rowid: undefined,
        apply_no: undefined,
        status: 0,
        customer_id: undefined,
        project_id: undefined,
        contract_id: undefined,
        payment_type: data.paymentType, // 接收传入的类型（中文）
        payee_name: undefined,
        payment_purpose: undefined,
        payment_amount: 0,
        pay_account: undefined,
        apply_date: Date.now().toString(),
        repay_date: undefined,
        remark: undefined,
        description: JSON.stringify({
          preReceiptBills: [],
          expenseDetails: [],
          expenseTaxIncluded: 1,
        }),
        applicant_name:
          (userStore.userInfo as any)?.id ??
          (userStore.userInfo as any)?.ROWID ??
          '',
        apply_depart: (userStore.userInfo as any)?.deptId ?? '',
        pay_amount: 0,
        pay_balance: 0,
      };
      const mergedInit = { ...init, ...(data?.presetValues || {}) } as any;
      formData.value = mergedInit;
      staffId.value = String((formData.value as any).applicant_name ?? '') || undefined;
      deptId.value = String((formData.value as any).apply_depart ?? '') || undefined;
      customerId.value = (formData.value as any).customer_id ? String((formData.value as any).customer_id) : undefined;
      projectId.value = (formData.value as any).project_id ? String((formData.value as any).project_id) : undefined;
      selectedContractName.value = String((formData.value as any).contract_id ?? '') || '';

      expenseDetails.value = [];
      expenseTaxIncluded.value = 1;
      expenseSummaries.value = { amount: 0, taxAmount: 0, total: 0 };
      skipPaymentTypeResetOnce.value = true;
      initializingForm.value = true;
      try {
        await formApi.setValues(formData.value as any);
      } finally {
        initializingForm.value = false;
      }
      selectedPreReceiptBills.value = Array.isArray(data?.presetSettlements)
        ? data.presetSettlements.map((x:any)=>({ ...x }))
        : [];
      if (selectedPreReceiptBills.value.length > 0) {
        syncExtraToHiddenDescription();
        syncAmountFromExtras();
      }
      return;
    }

    if (!data?.rowid) return;

    modalApi.lock();
    try {
      const detail = await getPaymentApply(data.rowid);
      formData.value = detail || ({} as any);

      // 兼容旧数据：备注可能存在 description（且不是结构化 JSON）
      if (
        (formData.value as any)?.remark === undefined ||
        (formData.value as any)?.remark === null ||
        String((formData.value as any)?.remark).trim() === ''
      ) {
        const initRemark = String((detail as any)?.init_remark ?? '').trim();
        if (initRemark) {
          (formData.value as any).remark = initRemark;
        } else {
          const desc = String((detail as any)?.description ?? '').trim();
          const parsed = safeJsonParse((detail as any)?.description);
          if (desc && parsed === null) (formData.value as any).remark = desc;
        }
      }
      await formApi.setValues(formData.value as any);

      // 回显合同名称
      const currentContractId = String(
        (formData.value as any)?.contract_id ?? '',
      ).trim();
      selectedContractName.value = currentContractId;
      if (currentContractId) {
        try {
          const cProps = await getContract(currentContractId);
          if (cProps) {
            selectedContractName.value =
              (cProps as any).contract_name ||
              (cProps as any).contract_no ||
              currentContractId;
          }
        } catch {}
      }

      // 从隐藏字段恢复额外信息
      const extra = safeJsonParse((formData.value as any)?.description);
      if (extra && typeof extra === 'object') {
        selectedPreReceiptBills.value = Array.isArray(extra.preReceiptBills)
          ? extra.preReceiptBills.map((x: any) => ({ ...x }))
          : [];
        expenseDetails.value = Array.isArray(extra.expenseDetails)
          ? extra.expenseDetails
          : [];
        expenseTaxIncluded.value = Number(extra.expenseTaxIncluded ?? 1) || 1;
      } else {
        selectedPreReceiptBills.value = [];
        expenseDetails.value = [];
        expenseTaxIncluded.value = 1;
      }

      // 优先从 Bil_Submit_WriteOff 回显预收款关联（write_off_type=1 支出）
      const submitId = String((formData.value as any)?.rowid ?? '').trim();
      const paymentType = String(
        (formData.value as any)?.payment_type ?? '',
      ).trim();
      if (submitId && isPreReceiptPaymentType(paymentType)) {
        try {
          const writeOffs = await getSubmitWriteOffList({
            submit_id: submitId,
            write_off_type: 1,
          });

          if (Array.isArray(writeOffs) && writeOffs.length > 0) {
            const settlementRowids = writeOffs
              .map((w: any) => String(w?.settlement_id ?? '').trim())
              .filter((x: string) => !!x);

            const settlementRes = await getExpenseSettlementPage({
              pageNo: 1,
              page: 1000,
              rowids: settlementRowids,
            } as any);

            const settlementList = ((settlementRes as any)?.list ??
              []) as any[];
            const settlementMap = new Map<string, any>();
            for (const s of settlementList) {
              const sid = String(s?.rowid ?? '').trim();
              if (sid) settlementMap.set(sid, s);
            }

            selectedPreReceiptBills.value = writeOffs
              .map((w: any) => {
                const sid = String(w?.settlement_id ?? '').trim();
                const base = settlementMap.get(sid) || { rowid: sid };
                return {
                  ...base,
                  rowid: sid,
                  apply_amount: moneyNumber(w?.write_off_amount),
                } as PreReceiptBillRow;
              })
              .filter((x: any) => !!x?.rowid);
          }
        } catch (error) {
          console.error('load writeoff list failed', error);
        }
      }

      staffId.value = (formData.value as any)?.applicant_name
        ? String((formData.value as any).applicant_name)
        : undefined;
      deptId.value = (formData.value as any)?.apply_depart
        ? String((formData.value as any).apply_depart)
        : undefined;
      customerId.value = (formData.value as any)?.customer_id
        ? String((formData.value as any).customer_id)
        : undefined;
      projectId.value = (formData.value as any)?.project_id
        ? String((formData.value as any).project_id)
        : undefined;
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="title"
    class="w-4/5"
    :show-confirm-button="formType !== 'detail'"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <Form class="mx-3">
      <template #applicant_name>
        <StaffPicker
          :model-value="staffId"
          :disabled="formType === 'detail'"
          placeholder="请选择申请人"
          @update:model-value="handleStaffIdChange"
          @update:data="handleStaffPicked"
        />
      </template>

      <template #apply_depart>
        <ElInput
          :model-value="getDeptName(deptId)"
          readonly
          placeholder="部门"
          class="!w-full"
        />
      </template>

      <template #customer_id>
        <CustomerPicker
          :model-value="customerId"
          :disabled="formType === 'detail'"
          placeholder="请选择往来单位"
          @update:model-value="handleCustomerIdChange"
        />
      </template>

      <template #project_id>
        <ProjectPicker
          :model-value="projectId"
          :disabled="formType === 'detail'"
          :customer-id="customerId"
          placeholder="请选择项目"
          :api="getOtherExpenseProjectPage as any"
          :get-by-id="getOtherExpenseProject as any"
          @update:model-value="handleProjectIdChange"
        />
      </template>

      <template #contract_id>
        <div class="flex w-full cursor-pointer">
          <ElInput
            v-model="selectedContractName"
            readonly
            placeholder="请选择关联合同"
            @click="openContractSelect"
          >
            <template #append>
              <ElButton icon="ep:search" @click="openContractSelect" />
            </template>
          </ElInput>
        </div>
      </template>

      <template #pre_receipt_bills>
        <div class="w-full">
          <SelectedGrid class="!w-full">
            <template #table-title>
              <div class="font-medium">结算单据</div>
            </template>

            <template #date_no="{ row }">
              <div>
                <div>{{ formatDateOnly(row.settlement_date) || '--' }}</div>
                <div class="text-primary">{{ row.settlement_no || '--' }}</div>
              </div>
            </template>

            <template #sales_dept="{ row }">
              <div>
                <div>{{ row.salesman_name || row.salesman_id || '--' }}</div>
                <div>{{ getDeptName(row.depart_id) || '--' }}</div>
              </div>
            </template>

            <template #apply_amount="{ row }">
              <ElInputNumber
                :model-value="row.apply_amount"
                :min="0"
                :max="getApplyableBalanceMax(row)"
                :controls="false"
                class="!w-full"
                @update:model-value="(value) => handleApplyAmountChange(row, value)"
              />
            </template>
            <template #apply_amount_view="{ row }">
              <span>{{ row.apply_amount ?? 0 }}</span>
            </template>

            <template #row_actions="{ row }">
              <TableAction
                :actions="[
                  {
                    label: '移除',
                    type: 'danger',
                    link: true,
                    icon: ACTION_ICON.DELETE,
                    onClick: removePreReceipt.bind(null, row),
                  },
                ]"
              />
            </template>

            <template #bottom-extra>
              <div class="mt-2 flex w-full justify-end px-3 py-2">
                本次付款合计：{{ moneyText(preReceiptApplyTotal) }}
              </div>
            </template>
          </SelectedGrid>

          <PreReceiptBillSelectModal
            v-model="preReceiptSelectOpen"
            :customer-id="customerId"
            :disabled="formType === 'detail'"
            @confirm="handlePreReceiptConfirm"
          />
        </div>
      </template>

      <template #expense_details>
        <div class="w-full">
          <OtherExpenseItemForm
            v-model:items="expenseDetails"
            :disabled="formType === 'detail'"
            :tax-included="expenseTaxIncluded"
            @update:tax-included="handleExpenseTaxIncludedChange"
            @update:summary="handleExpenseSummaryChange"
          />
        </div>
      </template>
    </Form>

    <ContractSelectModalComp @confirm="handleContractSelectConfirm" />
  </Modal>
</template>
