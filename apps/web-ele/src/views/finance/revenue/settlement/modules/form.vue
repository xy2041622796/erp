<script lang="ts" setup>
import type { Department, Staff } from '#/api/common/staff-selector';
import type { ErpIncomeSettlementApi } from '#/api/erp/finance/revenue/settlement';
import type { ErpProductApi } from '#/api/erp/product/product';

import { computed, ref } from 'vue';

import { addMoney, divMoney, moneyNumber, moneyText, mulMoney, subMoney, sumByMoney } from '#/utils/finance/decimal-money';

import { useVbenModal } from '@vben/common-ui';
import { formatDateTime, generateUUID } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { getDepartmentList } from '#/api/common/staff-selector';
import {
  getContract,
  getContractOrderList,
  getContractPlanList,
  updateContract,
} from '#/api/erp/contract/contract';
import {
  createSettlementPlanRel,
  getRelBySettlementId,
  getRelListByContractId,
} from '#/api/erp/finance/common/settlement-plan-rel';
import {
  createIncomeSettlement,
  getIncomeSettlement,
  getIncomeSettlementPage,
  SETTLEMENT_MODEL_ID,
  updateIncomeSettlement,
} from '#/api/erp/finance/revenue/settlement';
import {
  getSettlementProject,
  getSettlementProjectPage,
} from '#/api/erp/finance/revenue/settlement/project';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getSaleOrder } from '#/api/erp/sale/order';
import CustomerPicker from '#/components/customer-selector/CustomerPicker.vue';
import ProjectPicker from '#/components/project-selector/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { $t } from '#/locales';

import { useFormSchema } from '#/views/finance/revenue/settlement/data';
import ContractPlanDetailDialog from '#/views/finance/revenue/settlement/modules/contract-plan-detail-dialog.vue';
import ContractSelectModal from '#/views/finance/revenue/settlement/modules/contract-select-modal.vue';
import SaleOrderSelectDialog from '#/views/finance/revenue/settlement/modules/sale-order-select-dialog.vue';
import SettlementItemForm from '#/views/finance/revenue/settlement/modules/item-form.vue';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElRadioButton,
  ElRadioGroup,
} from 'element-plus';

type SubjectType = 'contract' | 'order';

const emit = defineEmits(['success']);

const formData = ref<ErpIncomeSettlementApi.IncomeSettlement>();
const formType = ref('');
const settlementType = ref(0);
const itemFormRef = ref<InstanceType<typeof SettlementItemForm>>();
const contractPlanDetailRef = ref<InstanceType<typeof ContractPlanDetailDialog>>();
const saleOrderSelectRef = ref<InstanceType<typeof SaleOrderSelectDialog>>();
const contractSummaryText = ref('');
const targetPlan = ref<any>(null);
const currentPlanId = ref('');
const subjectType = ref<SubjectType>('contract');
const selectedSubjectName = ref('');
const selectedOrderMeta = ref<{ id: string; no: string } | null>(null);
const productSimpleList = ref<ErpProductApi.Product[]>([]);
const productMap = computed(() => {
  const map = new Map<string, ErpProductApi.Product>();
  for (const item of productSimpleList.value || []) {
    const id = String(item?.rowid || '').trim();
    if (id) map.set(id, item);
  }
  return map;
});

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

async function ensureProductSimpleListLoaded() {
  if (productSimpleList.value.length > 0) return;
  try {
    const list = await getProductSimpleList();
    productSimpleList.value = Array.isArray(list) ? (list as any) : [];
  } catch (error) {
    console.error('load products failed', error);
  }
}

function getDeptName(id: any) {
  const key = String(id ?? '').trim();
  if (!key) return '';
  return deptNameMap.value.get(key) || key;
}

function hasText(v: any) {
  return String(v ?? '').trim() !== '';
}

function normalizeSubjectType(value: any): SubjectType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (['1', 'order', '订单'].includes(raw)) return 'order';
  return 'contract';
}

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildDisplayTotal(amount: any, taxAmount: any, totalAmount: any) {
  const amountValue = moneyNumber(amount);
  const taxValue = moneyNumber(taxAmount);
  const totalValue = moneyNumber(totalAmount ?? addMoney([amountValue, taxValue]));
  return totalValue > 0 ? totalValue : moneyNumber(addMoney([amountValue, taxValue]));
}

function calcTaxRate(amount: any, taxAmount: any, rawTaxRate?: any) {
  const explicit = Number(rawTaxRate);
  if (Number.isFinite(explicit)) return explicit;
  const amountValue = moneyNumber(amount);
  const taxValue = moneyNumber(taxAmount);
  if (amountValue <= 0) return 0;
  return moneyNumber(mulMoney(divMoney(taxValue, amountValue, 'round', 6), 100));
}

function resolveProductMeta(productId: any) {
  const id = String(productId || '').trim();
  if (!id) return undefined;
  return productMap.value.get(id);
}

function buildUnifiedDisplayItem(params: {
  rowid?: any;
  productId?: any;
  fallbackName?: any;
  specification?: any;
  unit?: any;
  num?: any;
  unitPrice?: any;
  amount?: any;
  taxAmount?: any;
  totalPrice?: any;
  taxRate?: any;
  remark?: any;
  sourceNo?: any;
  sourceType?: SubjectType;
}) {
  const productMeta = resolveProductMeta(params.productId);
  const amount = toNumber(params.amount, 0);
  const taxAmount = toNumber(params.taxAmount, 0);
  const totalPrice = buildDisplayTotal(amount, taxAmount, params.totalPrice);
  const num = toNumber(params.num, 0);
  const unitPrice = toNumber(
    params.unitPrice,
    num > 0 ? moneyNumber(divMoney(amount, num)) : toNumber(productMeta?.retail_price, amount),
  );

  return {
    rowid: String(params.rowid || generateUUID()),
    product_id: String(params.productId || generateUUID()),
    product_name:
      String(
        productMeta?.product_name || params.fallbackName || params.sourceNo || '',
      ).trim() || '未命名产品',
    specification:
      String(
        params.specification || productMeta?.model || params.remark || '-',
      ).trim() || '-',
    unit: String(params.unit || productMeta?.unit || '-').trim() || '-',
    num,
    unit_price: unitPrice,
    tax_rate: calcTaxRate(amount, taxAmount, params.taxRate),
    amount,
    total_tax_price: taxAmount,
    total_price: totalPrice,
    remark: params.remark,
    source_no: String(params.sourceNo || '-').trim() || '-',
  } as any;
}

function mapContractRowsToDisplayItems(rows: any[], sourceNo: string) {
  return (rows || []).map((row: any, index: number) => {
    return buildUnifiedDisplayItem({
      rowid: row?.rowid || row?.id,
      productId: row?.product_id,
      fallbackName: row?.product_name || `产品${index + 1}`,
      specification: row?.specification || row?.order_time,
      unit: row?.unit || row?.product_unit_name,
      num: row?.num ?? row?.total_count ?? row?.count,
      unitPrice: row?.unit_price ?? row?.product_price,
      amount:
        row?.amount ??
        row?.total_product_price ??
        (moneyNumber(mulMoney(row?.unit_price ?? row?.product_price, row?.num ?? row?.total_count ?? row?.count))),
      taxAmount: row?.total_tax_price ?? row?.tax_price,
      totalPrice: row?.total_price,
      taxRate: row?.tax_rate,
      remark: row?.remark,
      sourceNo,
      sourceType: 'contract',
    });
  });
}

function mapSaleOrderToDisplayItems(order: any) {
  const sourceNo = String(order?.no || order?.id || order?.rowid || '').trim();
  const items = Array.isArray(order?.items) ? order.items : [];

  return items.map((item: any, index: number) => {
    const count = toNumber(item?.count, 0);
    const productPrice = toNumber(item?.product_price, 0);
    const amount =
      toNumber(item?.total_product_price, 0) ||
      (count > 0 && productPrice > 0 ? moneyNumber(mulMoney(productPrice, count)) : 0) ||
      Math.max(
        moneyNumber(subMoney(item?.total_price, item?.tax_price)),
        0,
      ) ||
      Math.max(
        moneyNumber(subMoney(item?.total_tax_price, item?.tax_price)),
        0,
      );
    const taxAmount =
      toNumber(item?.tax_price, 0) ||
      Math.max(moneyNumber(subMoney(item?.total_price, amount)), 0) ||
      Math.max(moneyNumber(subMoney(item?.total_tax_price, amount)), 0);
    const totalPrice =
      toNumber(item?.total_price, 0) ||
      toNumber(item?.total_tax_price, 0) ||
      moneyNumber(addMoney([amount, taxAmount]));

    return buildUnifiedDisplayItem({
      rowid: item?.id,
      productId: item?.product_id,
      fallbackName: item?.product_name || `产品${index + 1}`,
      specification: item?.product_bar_code || item?.remark,
      unit: item?.product_unit_name,
      num: item?.count,
      unitPrice:
        item?.product_price || (count > 0 ? moneyNumber(divMoney(amount, count)) : undefined),
      amount,
      taxAmount,
      totalPrice,
      taxRate: item?.tax_percent,
      remark: item?.remark,
      sourceNo,
      sourceType: 'order',
    });
  });
}

function getDisplayItemsAmount(items: any[]) {
  return moneyNumber(sumByMoney(items || [], (item: any) => item?.amount));
}

function getDisplayItemsTax(items: any[]) {
  return moneyNumber(sumByMoney(items || [], (item: any) => item?.total_tax_price));
}

async function applyDisplayItems(
  items: any[],
  options: { syncAmount?: boolean; syncProductNames?: boolean } = {},
) {
  const { syncAmount = true, syncProductNames = true } = options;
  if (!formData.value) formData.value = { items: [] } as any;
  formData.value.items = items;
  if (syncAmount) {
    await handleUpdateSummary({
      amount: getDisplayItemsAmount(items),
      taxAmount: getDisplayItemsTax(items),
      total: moneyNumber(sumByMoney(items, (item: any) => item?.total_price ?? addMoney([item?.amount, item?.total_tax_price]))),
    });
  }
  if (syncProductNames) {
    handleUpdateProductNames(
      (items || [])
        .map((item: any) => String(item?.product_name ?? '').trim())
        .filter(Boolean)
        .join('、'),
    );
  }
}

async function loadContractDisplayItems(contractId: string, contractName?: string) {
  const cid = String(contractId || '').trim();
  if (!cid) {
    await applyDisplayItems([], { syncAmount: false });
    return;
  }
  await ensureProductSimpleListLoaded();
  const rows = await getContractOrderList(cid);
  await applyDisplayItems(
    mapContractRowsToDisplayItems(
      rows,
      contractName || selectedSubjectName.value || cid,
    ),
    { syncAmount: false },
  );
}

async function loadOrderDisplayItems(orderId: string, orderNo?: string) {
  const oid = String(orderId || '').trim();
  if (!oid) {
    await applyDisplayItems([]);
    return;
  }
  await ensureProductSimpleListLoaded();
  const detail = await getSaleOrder(oid);
  const sourceNo = String(orderNo || detail?.no || oid).trim();
  selectedOrderMeta.value = { id: oid, no: sourceNo };
  await applyDisplayItems(
    mapSaleOrderToDisplayItems(detail || { id: oid, no: sourceNo, items: [] }),
  );
}

async function resetSubjectSelection(nextType: SubjectType) {
  subjectType.value = nextType;
  selectedSubjectName.value = '';
  selectedOrderMeta.value = null;
  contractSummaryText.value = '';
  targetPlan.value = null;
  currentPlanId.value = '';
  if (!formData.value) formData.value = { items: [] } as any;
  formData.value.items = [];
  await formApi.setValues(
    {
      subject_type: nextType,
      contract_id: undefined,
      product_id: undefined,
      product_name: undefined,
    },
    false,
  );
  await applyDisplayItems([]);
}

const salesmanId = ref<string | undefined>();
const departId = ref<string | undefined>();
const customerId = ref<string | undefined>();
const projectId = ref<string | undefined>();

async function handleCustomerIdChange(v?: string) {
  customerId.value = v;
  projectId.value = undefined;
  await formApi.setValues({ customer_id: v, project_id: undefined }, false);
  await resetSubjectSelection(subjectType.value);
}

function handleProjectIdChange(v?: string) {
  projectId.value = v;
  formApi.setValues({ project_id: v }, false);
}

function handleSalesmanIdChange(v?: string) {
  salesmanId.value = v;
  if (!v) {
    handleSalesmanPicked(undefined);
    return;
  }
  formApi.setValues({ salesman_id: v }, false);
}

function handleSalesmanPicked(staff?: Staff) {
  if (!staff) {
    salesmanId.value = undefined;
    departId.value = undefined;
    formApi.setValues({ salesman_id: undefined, depart_id: undefined }, false);
    return;
  }

  salesmanId.value = staff.ROWID;
  departId.value = staff.DepID;
  formApi.setValues(
    { salesman_id: staff.ROWID, depart_id: staff.DepID },
    false,
  );
}

const [ContractSelectModalComp, contractSelectModalApi] = useVbenModal({
  connectedComponent: ContractSelectModal,
});

const getTitle = computed(() => {
  const typeText = settlementType.value === 1 ? '退款结算' : '收入结算';
  if (formType.value === 'create') return `新增${typeText}`;
  if (formType.value === 'edit') return `编辑${typeText}`;
  return `${typeText}详情`;
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  wrapperClass: 'grid grid-cols-2 gap-x-6 gap-y-4',
  layout: 'vertical',
  schema: useFormSchema(formType.value),
  showDefaultActions: false,
});

function getPlanPeriodText(plan: any, fallback = '--') {
  const text = String(plan?.plan_period ?? '').trim();
  if (!text) return fallback;
  return text.includes('期') ? text : '第' + text + '期';
}

async function applyContractPlanAmount() {
  if (subjectType.value !== 'contract' || formType.value !== 'create') return;
  if (!targetPlan.value) return;
  const planAmount = toNumber(targetPlan.value?.plan_amount, 0);
  if (planAmount <= 0) return;
  await formApi.setValues(
    {
      amount: planAmount,
      total_amount: planAmount,
    },
    false,
  );
}

async function updateContractSummary(contractId: string) {
  contractSummaryText.value = '';
  if (!contractId) return;

  try {
    const plans = await getContractPlanList(contractId);
    const rels = await getRelListByContractId(SETTLEMENT_MODEL_ID, contractId);
    const existingPlanIds = new Set(
      rels
        .map((r: any) => String(r?.plan_id || '').trim())
        .filter(Boolean),
    );
    const planCount = existingPlanIds.size;

    const settlementsRes = await getIncomeSettlementPage({
      contract_id: contractId,
      page: 1,
      page: 1000,
      settlement_type: [0, 1],
    } as any);

    const settlements =
      (settlementsRes as any)?.list ||
      (settlementsRes as any)?.items ||
      (settlementsRes as any)?.Data ||
      [];

    const currentId = formData.value?.rowid;
    const otherSettlements = settlements.filter(
      (s: any) => s.rowid !== currentId,
    );
    const xth = otherSettlements.length + 1;

    const settledAmount = moneyNumber(sumByMoney(otherSettlements, (s: any) => s.total_amount));

    const contract = await getContract(contractId);
    const totalAmount = moneyNumber((contract as any)?.totalPrice || (contract as any)?.totalReceivablePrice || (contract as any)?.contract_total_amount);

    const balance = moneyNumber(subMoney(totalAmount, settledAmount));
    targetPlan.value = null;
    const sortedPlans = (plans || []).slice().sort(
      (a: any, b: any) => Number(a.plan_period || 0) - Number(b.plan_period || 0),
    );
    const currentPlan = currentPlanId.value
      ? sortedPlans.find(
          (p: any) => String(p?.rowid || '').trim() === String(currentPlanId.value || '').trim(),
        )
      : null;
    if (currentPlan) {
      targetPlan.value = currentPlan;
    } else {
      targetPlan.value = sortedPlans.find(
        (p: any) => !existingPlanIds.has(String(p?.rowid || '').trim()),
      );
      if (!currentPlanId.value && targetPlan.value?.rowid) {
        currentPlanId.value = String(targetPlan.value.rowid);
      }
    }

    const currentPeriodText = getPlanPeriodText(targetPlan.value, '第' + xth + '期');
    contractSummaryText.value = ` (${currentPeriodText}结算，已结算${planCount}期，待结算余额${moneyText(balance)})`;
  } catch (error) {
    console.error('Failed to update contract summary', error);
  }
}

async function getCurrentContractId() {
  const values = (await formApi.getValues()) as any;
  return String(values?.contract_id || '').trim();
}

async function getCurrentCustomerId() {
  const values = (await formApi.getValues()) as any;
  return values?.customer_id;
}

async function openContractPlanDetail() {
  const contractId = await getCurrentContractId();
  if (!contractId) {
    ElMessage.warning('请先选择合同');
    return;
  }
  contractPlanDetailRef.value?.open?.(contractId, currentPlanId.value);
}

function handleUpdateItems(items: ErpIncomeSettlementApi.IncomeSettlementItem[]) {
  if (!formData.value) {
    formData.value = { items: [] };
  }
  formData.value.items = items;
}

async function handleUpdateSummary(summary: {
  amount: number;
  taxAmount: number;
  total: number;
}) {
  const values = (await formApi.getValues()) as any;
  const isTaxIncluded = Number(values?.is_tax_included || 0);
  const amount = moneyNumber(summary.amount);
  const totalAmount = isTaxIncluded ? moneyNumber(summary.total) : amount;

  formApi.setValues({
    amount,
    total_amount: totalAmount,
  });
}

function handleUpdateProductNames(productNames: string) {
  if (subjectType.value === 'order') return;
  formApi.setValues({ product_name: productNames }, false);
}

async function buildPersistItems(values: any) {
  const type = normalizeSubjectType(values?.subject_type);
  if (type !== 'order') return [];

  const orderId = String(
    values?.product_id || selectedOrderMeta.value?.id || '',
  ).trim();
  const orderNo = String(
    selectedOrderMeta.value?.no || selectedSubjectName.value || values?.product_name || '',
  ).trim();
  if (!orderId || !orderNo) return [];

  const amount = moneyNumber(values?.amount);
  const totalAmount = moneyNumber(values?.total_amount ?? amount);
  const taxAmount = Math.max(moneyNumber(subMoney(totalAmount, amount)), 0);

  return [
    {
      rowid: generateUUID(),
      product_id: orderId,
      product_name: orderNo,
      amount,
      total_tax_price: taxAmount,
      total_price: totalAmount,
      remark: values?.remark,
    } as any,
  ];
}

const [Modal, modalApi] = useVbenModal({
  closeOnClickModal: false,
  closeOnPressEscape: false,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const itemFormInstance = Array.isArray(itemFormRef.value)
      ? itemFormRef.value[0]
      : itemFormRef.value;

    try {
      itemFormInstance?.validate?.();
    } catch (error: any) {
      ElMessage.error(error?.message || '产品明细验证失败');
      return;
    }

    modalApi.lock();
    try {
      const values =
        (await formApi.getValues()) as ErpIncomeSettlementApi.IncomeSettlement;
      const effectiveItems =
        itemFormInstance?.getEffectiveItems?.() ??
        formData.value?.items ??
        values.items ??
        [];
      const currentSubjectType = normalizeSubjectType(values.subject_type);
      const hasContract = hasText(values.contract_id);
      const hasOrder = hasText(values.product_id);

      if (currentSubjectType === 'contract' && !hasContract) {
        ElMessage.error('请选择合同');
        return;
      }
      if (currentSubjectType === 'order' && !hasOrder) {
        ElMessage.error('请选择订单');
        return;
      }
      if (effectiveItems.length === 0) {
        ElMessage.error('产品信息不能为空');
        return;
      }

      const persistItems = await buildPersistItems(values as any);
      const data: ErpIncomeSettlementApi.IncomeSettlement = {
        ...(formData.value || {}),
        ...values,
        subject_type: currentSubjectType,
        contract_id:
          currentSubjectType === 'contract' ? values.contract_id : undefined,
        product_id:
          currentSubjectType === 'order' ? values.product_id : undefined,
        product_name:
          currentSubjectType === 'order'
            ? String(selectedOrderMeta.value?.no || selectedSubjectName.value || values.product_name || '').trim()
            : undefined,
        items: persistItems,
      };

      if (data.settlement_date) {
        const ts = Number(data.settlement_date);
        const date = Number.isNaN(ts)
          ? new Date(data.settlement_date)
          : new Date(ts);
        data.settlement_date = formatDateTime(date);
      }
      if (data.account_period) {
        const ts = Number(data.account_period);
        const date = Number.isNaN(ts)
          ? new Date(data.account_period)
          : new Date(ts);
        data.account_period = formatDateTime(date);
      }

      const res = await (formType.value === 'create'
        ? createIncomeSettlement(data)
        : updateIncomeSettlement(data));

      if (
        formType.value === 'create' &&
        currentSubjectType === 'contract' &&
        hasText(data.contract_id) &&
        targetPlan.value &&
        (res as any)?.rowid
      ) {
        try {
          await createSettlementPlanRel(SETTLEMENT_MODEL_ID, {
            contract_id: data.contract_id,
            plan_id: targetPlan.value.rowid,
            plan_period: targetPlan.value.plan_period,
            settlement_id: (res as any).rowid,
          });
          currentPlanId.value = String(targetPlan.value.rowid || '');
        } catch (error) {
          console.error('Create settlement relation failed', error);
          ElMessage.warning('结算单创建成功，但关联计划失败，请联系管理员');
        }
      }

      if (currentSubjectType === 'contract' && hasText(data.contract_id)) {
        try {
          await updateContract({ rowid: data.contract_id, ConState: 2 } as any);
        } catch {}
      }

      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      selectedSubjectName.value = '';
      selectedOrderMeta.value = null;
      subjectType.value = 'contract';
      currentPlanId.value = '';
      return;
    }

    await ensureDeptListLoaded();
    await ensureProductSimpleListLoaded();

    const data = modalApi.getData<{
      contractId?: string;
      rowid?: string;
      settlement_type?: number;
      type: string;
    }>();
    formType.value = data.type;
    settlementType.value = data.settlement_type ?? 0;

    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));

    if (data?.contractId) {
      formType.value = 'create';
      subjectType.value = 'contract';
      currentPlanId.value = '';
      formData.value = {
        items: [],
        contract_id: data.contractId,
        product_id: undefined,
        product_name: undefined,
        subject_type: 'contract',
        settlement_type: 0,
        status: 10,
        is_tax_included: 1,
      } as any;
      await formApi.setValues(formData.value as any, false);
      selectedSubjectName.value = data.contractId;
      await updateContractSummary(data.contractId);
      try {
        const cProps = await getContract(data.contractId);
        if (cProps) {
          selectedSubjectName.value =
            cProps.contract_name || cProps.contract_no || data.contractId;
          if ((cProps as any).customerId) {
            await formApi.setFieldValue('customer_id', (cProps as any).customerId);
            customerId.value = String((cProps as any).customerId);
          }
        }
      } catch {}
      await loadContractDisplayItems(data.contractId, selectedSubjectName.value);
      await applyContractPlanAmount();

      salesmanId.value = undefined;
      departId.value = undefined;
    } else if (!data?.rowid) {
      subjectType.value = 'contract';
      currentPlanId.value = '';
      formData.value = {
        items: [],
        subject_type: 'contract',
        settlement_type: data?.settlement_type ?? 0,
        status: 10,
        is_tax_included: 1,
        tax_rate: 0,
        amount: 0,
        total_amount: 0,
      } as any;
      selectedSubjectName.value = '';
      contractSummaryText.value = '';
      targetPlan.value = null;
      selectedOrderMeta.value = null;
      await formApi.setValues(formData.value as any, false);

      salesmanId.value = undefined;
      departId.value = undefined;
      customerId.value = undefined;
      projectId.value = undefined;
      return;
    }

    modalApi.lock();
    try {
      formData.value = await getIncomeSettlement(data.rowid!);
      if (formData.value?.settlement_type) {
        settlementType.value = formData.value.settlement_type;
      }

      if (formData.value) {
        const r: any = formData.value;
        if (
          (r.remark === undefined ||
            r.remark === null ||
            String(r.remark).trim() === '') &&
          r.description !== undefined &&
          r.description !== null &&
          String(r.description).trim() !== ''
        ) {
          r.remark = r.description;
        }
      }

      const currentType = normalizeSubjectType((formData.value as any)?.subject_type);
      subjectType.value = currentType;
      await formApi.setValues(
        {
          ...(formData.value as any),
          subject_type: currentType,
        },
        false,
      );

      salesmanId.value = (formData.value as any)?.salesman_id
        ? String((formData.value as any).salesman_id)
        : undefined;
      departId.value = (formData.value as any)?.depart_id
        ? String((formData.value as any).depart_id)
        : undefined;
      customerId.value = (formData.value as any)?.customer_id
        ? String((formData.value as any).customer_id)
        : undefined;
      projectId.value = (formData.value as any)?.project_id
        ? String((formData.value as any).project_id)
        : undefined;

      contractSummaryText.value = '';
      targetPlan.value = null;
      selectedOrderMeta.value = null;
      currentPlanId.value = '';

      if (currentType === 'contract' && hasText((formData.value as any)?.contract_id)) {
        const contractId = String((formData.value as any).contract_id);
        let contractName = '';
        try {
          const [detail, rel] = await Promise.all([
            getContract(contractId),
            getRelBySettlementId(SETTLEMENT_MODEL_ID, String(data.rowid || '')),
          ]);
          if (detail) {
            contractName = detail.contract_name || detail.contract_no || contractId;
          }
          currentPlanId.value = String(rel?.plan_id || '');
        } catch (error) {
          console.error('fetch contract/plan relation error', error);
        }
        selectedSubjectName.value = contractName || contractId;
        await updateContractSummary(contractId);
        await loadContractDisplayItems(contractId, selectedSubjectName.value);
      } else if (currentType === 'order' && hasText((formData.value as any)?.product_id)) {
        const orderId = String((formData.value as any).product_id);
        const orderNo = String((formData.value as any)?.product_name || '').trim();
        selectedSubjectName.value = orderNo || orderId;
        await loadOrderDisplayItems(orderId, orderNo);
      } else if (formData.value && !formData.value.items) {
        formData.value.items = [];
      }
    } finally {
      modalApi.unlock();
    }
  },
});

async function openSubjectSelect() {
  if (formType.value === 'detail') return;

  const currentCustomerId = await getCurrentCustomerId();
  if (!currentCustomerId) {
    ElMessage.warning('请先选择客户');
    return;
  }

  if (subjectType.value === 'contract') {
    contractSelectModalApi.setData({ customerId: currentCustomerId });
    contractSelectModalApi.open();
    return;
  }

  saleOrderSelectRef.value?.open?.(currentCustomerId);
}

async function handleContractSelectConfirm(contract: any) {
  const cid = String(contract.rowid || contract.id || '');
  const cname = contract.contract_name || contract.contract_no || cid;
  selectedSubjectName.value = cname;
  selectedOrderMeta.value = null;
  subjectType.value = 'contract';
  currentPlanId.value = '';
  await formApi.setValues(
    {
      subject_type: 'contract',
      contract_id: cid,
      product_id: undefined,
      product_name: undefined,
    },
    false,
  );
  await updateContractSummary(cid);

  const pickedCustomerId =
    (contract as any).customerId ?? (contract as any).customer_id;
  if (pickedCustomerId) {
    await formApi.setFieldValue('customer_id', pickedCustomerId);
    customerId.value = String(pickedCustomerId);
  }
  const projectValue = (contract as any)?.project_id;
  if (projectValue || projectValue === 0) {
    projectId.value = String(projectValue);
    await formApi.setFieldValue('project_id', projectValue);
  }

  await loadContractDisplayItems(cid, cname);
  await applyContractPlanAmount();
}

async function handleOrderSelectConfirm(order: any) {
  const orderId = String(order?.id || order?.rowid || '').trim();
  if (!orderId) return;
  const orderNo = String(order?.no || orderId).trim();
  selectedSubjectName.value = orderNo;
  selectedOrderMeta.value = { id: orderId, no: orderNo };
  contractSummaryText.value = '';
  targetPlan.value = null;
  currentPlanId.value = '';
  subjectType.value = 'order';
  await formApi.setValues(
    {
      subject_type: 'order',
      contract_id: undefined,
      product_id: orderId,
      product_name: orderNo,
    },
    false,
  );
  if (order?.customer_id || order?.customer_id === 0) {
    await formApi.setFieldValue('customer_id', order.customer_id);
    customerId.value = String(order.customer_id);
  }
  await loadOrderDisplayItems(orderId, orderNo);
}

async function handleSubjectTypeSwitch(value: SubjectType) {
  if (value === subjectType.value) return;
  await resetSubjectSelection(value);
}
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-4/5"
    :show-confirm-button="formType !== 'detail'"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <Form class="mx-3">
      <template #customer_id>
        <CustomerPicker
          :model-value="customerId"
          :disabled="formType === 'detail'"
          placeholder="请选择客户"
          @update:model-value="handleCustomerIdChange"
        />
      </template>

      <template #salesman_id>
        <StaffPicker
          :model-value="salesmanId"
          :disabled="formType === 'detail'"
          placeholder="请选择业务员"
          @update:model-value="handleSalesmanIdChange"
          @update:data="handleSalesmanPicked"
        />
      </template>

      <template #depart_id>
        <ElInput
          :model-value="getDeptName(departId)"
          readonly
          placeholder="部门"
          class="!w-full"
        />
      </template>

      <template #subject_type>
        <ElRadioGroup
          :model-value="subjectType"
          :disabled="formType === 'detail'"
          @update:model-value="handleSubjectTypeSwitch"
        >
          <ElRadioButton label="contract">按合同</ElRadioButton>
          <ElRadioButton label="order">按订单</ElRadioButton>
        </ElRadioGroup>
      </template>

      <template #subject_selector>
        <div class="flex w-full cursor-pointer">
          <ElInput
            :model-value="selectedSubjectName"
            readonly
            :placeholder="subjectType === 'contract' ? '请选择合同' : '请选择订单'"
            @click="openSubjectSelect"
          >
            <template #append>
              <ElButton icon="ep:search" @click="openSubjectSelect" />
            </template>
          </ElInput>
        </div>
      </template>

      <template #items>
        <SettlementItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="true"
          :locked="true"
          @update:items="handleUpdateItems"
          @update:summary="handleUpdateSummary"
          @update:product-names="handleUpdateProductNames"
        />
      </template>

      <template #contract_detail_action>
        <div class="flex h-full items-center">
          <template v-if="subjectType === 'contract'">
            <ElButton type="primary" link @click="openContractPlanDetail">
              查看收款计划详情
            </ElButton>
            <span class="ml-2 text-xs text-gray-500">{{ contractSummaryText }}</span>
          </template>
          <template v-else>
            <span class="text-xs text-gray-500">已按订单加载产品信息</span>
          </template>
        </div>
      </template>

      <template #project_id>
        <ProjectPicker
          :model-value="projectId"
          :disabled="formType === 'detail'"
          :customer-id="customerId"
          placeholder="请选择项目"
          :api="getSettlementProjectPage"
          :get-by-id="getSettlementProject"
          @update:model-value="handleProjectIdChange"
        />
      </template>
    </Form>

    <ContractPlanDetailDialog ref="contractPlanDetailRef" />
    <ContractSelectModalComp @confirm="handleContractSelectConfirm" />
    <SaleOrderSelectDialog ref="saleOrderSelectRef" @confirm="handleOrderSelectConfirm" />
  </Modal>
</template>
