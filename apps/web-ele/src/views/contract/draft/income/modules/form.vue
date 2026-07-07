<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, onBeforeUnmount, ref } from 'vue';
import { useVbenForm, useVbenModal } from '@vben/common-ui';
import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  erpPriceMultiply,
  formatDateTime,
  generateUUID,
  downloadFileFromBlobPart,
} from '@vben/utils';
import { Delete } from '@element-plus/icons-vue';


import {
  createCustomerAttachment,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import {
  getContract,
  createContractWithProductsAndPlans,
  updateContractWithProductsAndPlans,
  CONTRACT_MODEL_ID,
} from '#/api/erp/contract/contract';
import { createIncomeSettlement } from '#/api/erp/finance/revenue/settlement';
import { createSettlementPlanRel } from '#/api/erp/finance/common/settlement-plan-rel';
import { getProject, getProjectPage } from '#/api/erp/contract/project';
import { StaffPicker } from '#/components/staff-selector';
import { CustomerPicker } from '#/components/customer-selector';
import FileUpload from '#/components/upload/file-upload.vue';
import { $t } from '#/locales';

import { useFormSchema } from '../data';
import ProductSelectModal from './product-select-modal.vue';
import { ProjectSelectModal } from '#/components/project-selector';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElLink,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = '收入合同';

type ReceivablePlanRow = {
  rowid: string | null;
  term: string;
  planDate?: number | string;
  planAmount: number;
  ratio: number;
  autoSettle: boolean;
  remark: string;
};

const emit = defineEmits(['success']);
const formData = ref<any>();
const autoCreateProject = ref(false);
const saving = ref(false);
const modalMode = ref<'create' | 'edit' | 'detail'>('create');
const selectedProductId = ref<string>();
const selectedProductLabel = ref<string>('');
const selectedProjectId = ref<string | any>();
const selectedProjectLabel = ref<string>('');
const selectedProjectName = ref<string>('');
const currentCustomerId = ref<any>();
const isInitializingForm = ref(false);
const selectedProductMeta = ref<any>(null);
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);

function getCurrentDocId() {
  return String(formData.value?.rowid || '').trim() || undefined;
}
async function loadAttachments(docId?: string | number) {
  if (!docId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE);
  } catch (error) {
    console.error('加载收入合同附件失败:', error);
    attachments.value = [];
  }
}
function formatAttachmentSize(size?: number) {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function toAttachmentItem(payload: FileUploadSuccessPayload): CrmCustomerApi.Attachment {
  const fileName = payload?.fileName || '';
  return {
    file_name: fileName,
    file_path: payload?.filePath || '',
    file_size: payload?.fileSize || 0,
    file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '',
    owner_type: ATTACH_OWNER_TYPE,
  };
}
async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) {
  const docId = getCurrentDocId();
  const item = toAttachmentItem(payload);
  if (!docId) {
    draftAttachments.value.push(item);
    attachments.value.push(item);
    uploadKey.value++;
    return;
  }
  await createCustomerAttachment(docId, {
    fileName: item.file_name,
    file_path: item.file_path,
    fileSize: item.file_size,
    fileType: item.file_type,
    owner_type: ATTACH_OWNER_TYPE,
    pid: docId,
  });
  await loadAttachments(docId);
  uploadKey.value++;
}
async function persistDraftAttachments(docId: string | number) {
  if (!draftAttachments.value.length) return;
  await Promise.all(
    draftAttachments.value.map((it) =>
      createCustomerAttachment(docId, {
        fileName: it.file_name,
        file_path: it.file_path,
        fileSize: it.file_size,
        fileType: it.file_type,
        owner_type: ATTACH_OWNER_TYPE,
        pid: docId,
      }),
    ),
  );
  draftAttachments.value = [];
  await loadAttachments(docId);
}
async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) {
  if (!row.file_name || !row.file_path) {
    ElMessage.warning('附件信息不完整，无法下载');
    return;
  }
  try {
    const blob = await downloadCustomerAttachment(row.file_name, row.file_path);
    downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
  } catch (error) {
    console.error('下载收入合同附件失败:', error);
    ElMessage.error('下载附件失败');
  }
}
async function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) {
  const docId = getCurrentDocId();
  if (docId && row.id) {
    await deleteCustomerAttachment(row.id as any);
    ElMessage.success('删除附件成功');
    await loadAttachments(docId);
    return;
  }
  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter(
    (it) => !(it.file_name === row.file_name && it.file_path === row.file_path && it.file_size === row.file_size),
  );
  ElMessage.success('删除附件成功');
}

function handleCustomerUpdate(v: any, setValue: (val: any) => void) {
  currentCustomerId.value = v;
  setValue(v);
}
function openProductSelect() { productSelectModalApi.open(); }
function clearProducts() { orderRows.value = []; syncAmountFromOrders(); }
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
function normalizeTaxRate(value: any) { return Number(String(value ?? 0).replace('%', '').trim()) || 0; }
function normalizeMoney(value: any) { return Number(Number(value ?? 0).toFixed(2)) || 0; }
function recalcOrderRowAmounts(row: any) {
  const num = Number(row.num ?? 0) || 0;
  const taxRate = normalizeTaxRate(row.tax_rate ?? 0);
  const taxIncludedPrice = Number(row.tax_included_price ?? 0) || 0;
  const rate = taxRate / 100;
  row.num = num;
  row.tax_rate = taxRate;
  row.remark = String(row.remark ?? '');
  if (!(num > 0) || !(taxIncludedPrice > 0)) {
    row.tax_included_price = taxIncludedPrice;
    row.product_price = 0;
    row.total_product_price = 0;
    row.tax_price = 0;
    row.total_price = 0;
    row.unit_price = 0;
    row.amount = 0;
    return row;
  }
  const totalPrice = normalizeMoney(taxIncludedPrice * num);
  const totalProductPrice = normalizeMoney(totalPrice / (1 + rate));
  const taxPrice = normalizeMoney(totalPrice - totalProductPrice);
  const productPrice = normalizeMoney(totalProductPrice / num);
  row.tax_included_price = taxIncludedPrice;
  row.product_price = productPrice;
  row.total_product_price = totalProductPrice;
  row.tax_price = taxPrice;
  row.total_price = totalPrice;
  row.unit_price = productPrice;
  row.amount = totalProductPrice;
  return row;
}
function hydrateOrderRowAmounts(row: any) {
  const num = Number(row.num ?? 0) || 0;
  const taxRate = normalizeTaxRate(row.tax_rate ?? 0);
  const amount = Number(row.amount ?? 0) || 0;
  const unitPrice = Number(row.unit_price ?? 0) || 0;
  const totalProductPrice = amount || normalizeMoney(erpPriceMultiply(num, unitPrice) ?? 0);
  const productPrice = unitPrice || (num > 0 ? normalizeMoney(totalProductPrice / num) : 0);
  const taxPrice = normalizeMoney(totalProductPrice * taxRate / 100);
  const totalPrice = normalizeMoney(totalProductPrice + taxPrice);
  const taxIncludedPrice = num > 0 ? normalizeMoney(totalPrice / num) : 0;
  row.num = num;
  row.tax_rate = taxRate;
  row.tax_included_price = taxIncludedPrice;
  row.product_price = productPrice;
  row.total_product_price = totalProductPrice;
  row.tax_price = taxPrice;
  row.total_price = totalPrice;
  row.unit_price = productPrice;
  row.amount = totalProductPrice;
  row.remark = String(row.remark ?? '');
  return row;
}

const orderRows = ref<any[]>([]);
const planRows = ref<ReceivablePlanRow[]>([]);
const orderSummaries = computed(() => {
  const rows = (orderRows.value || []).map((row) => recalcOrderRowAmounts(row));
  const count = rows.reduce((sum, row) => sum + Number(row.num ?? 0), 0);
  const totalProductPrice = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.total_product_price ?? 0), 0));
  const taxPrice = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.tax_price ?? 0), 0));
  const totalPrice = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.total_price ?? 0), 0));
  const taxRate = totalProductPrice > 0 ? (taxPrice / totalProductPrice) * 100 : 0;
  return { count, totalProductPrice, taxPrice, totalPrice, taxRate: normalizeMoney(taxRate) };
});
const isDetailMode = computed(() => modalMode.value === 'detail');
const getTitle = computed(() => {
  if (modalMode.value === 'detail') return '收入合同详情';
  return formData.value?.rowid ? '编辑收入合同' : '新增收入合同';
});
function getContractTotalAmount() { return normalizeMoney(orderSummaries.value.totalPrice); }
function calcPlanAmountByRatio(total: number, ratio: number) { return normalizeMoney((total * Number(ratio || 0)) / 100); }
function calcPlanRatioByAmount(total: number, amount: number) { if (total <= 0) return 0; return normalizeMoney((Number(amount || 0) / total) * 100); }
function getPlanRatioTotal() { return normalizeMoney((planRows.value || []).reduce((sum, row) => sum + Number(row.ratio ?? 0), 0)); }
function validatePlanRatioTotal() { if (!planRows.value.length) return true; const ratioTotal = getPlanRatioTotal(); if (Math.abs(ratioTotal - 100) > 0.01) { ElMessage.error(`收款计划比例合计必须等于100%，当前为 ${ratioTotal}%`); return false; } return true; }
function refreshPlanTerms() { planRows.value = planRows.value.map((r, i) => ({ ...r, term: `第${i + 1}期` })); }
function syncPlanRatiosFromAmounts() { const total = getContractTotalAmount(); planRows.value = planRows.value.map((row, index) => ({ ...row, term: `第${index + 1}期`, planAmount: normalizeMoney(row.planAmount), ratio: calcPlanRatioByAmount(total, Number(row.planAmount ?? 0)) })); }
async function syncAmountFromOrders() { orderRows.value = (orderRows.value || []).map((row) => recalcOrderRowAmounts(row)); await formApi.setFieldValue('contract_amount', orderSummaries.value.totalProductPrice); await formApi.setFieldValue('contract_tax_rate', orderSummaries.value.taxRate); await formApi.setFieldValue('contract_tax_amount', orderSummaries.value.taxPrice); await formApi.setFieldValue('contract_total_amount', orderSummaries.value.totalPrice); syncPlanRatiosFromAmounts(); }
async function handleOrderRowChange(row: any) { recalcOrderRowAmounts(row); await syncAmountFromOrders(); }
async function handleProductSelectConfirm(product: any) {
  const products = Array.isArray(product) ? product : [product];
  const validProducts = products.filter(Boolean);
  if (!validProducts.length) {
    ElMessage.warning('未选择产品');
    return;
  }

  const names: string[] = [];
  let duplicateCount = 0;

  for (const item of validProducts) {
    const productId = String(item.id ?? item.rowid ?? '').trim();
    const productName = String(item.name ?? item.product_name ?? '').trim();
    const label = productName || productId;
    if (label) names.push(label);
    if (!productId) continue;
    const existed = orderRows.value.some((r: any) => String(r.product_id) === productId);
    if (existed) { duplicateCount++; continue; }
    const rawTaxRate = item.tax_rate ?? item.retail_tax ?? 0;
    const taxRate = normalizeTaxRate(rawTaxRate);
    const taxIncludedPrice = Number(item.tax_included_price ?? item.retail_price ?? 0) || 0;
    const num = Number(item.num ?? 1) || 1;
    orderRows.value.push(recalcOrderRowAmounts({ id: generateUUID(), product_id: productId, product_name: productName, specification: item.specification || item.model, unit: item.unit, num, tax_included_price: taxIncludedPrice, tax_rate: taxRate, remark: String(item.remark ?? '') }));
  }

  selectedProductLabel.value = names.join('、');
  selectedProductMeta.value = validProducts.length === 1 ? validProducts[0] : validProducts;

  if (duplicateCount > 0) {
    ElMessage.warning(`有 ${duplicateCount} 个产品已存在，已自动跳过`);
  }

  await syncAmountFromOrders();
}
async function openProjectSelect() { const values = (await formApi.getValues()) as any; const customerId = values?.contract_party_b; if (!customerId) { ElMessage.warning('请先选择客户'); return; } projectSelectModalApi.setData({ customer_id: customerId }).open(); }
async function handleProjectSelectConfirm(project: any) { selectedProjectId.value = String(project.rowid ?? ''); selectedProjectLabel.value = `${project.project_code ?? ''} ${project.project_name ?? ''}`.trim(); selectedProjectName.value = `${project.project_name ?? ''}`.trim(); await formApi.setFieldValue('project_id', selectedProjectId.value); await formApi.setFieldValue('project_name', selectedProjectName.value); }
function handleSalespersonChange(staff: any) { if (staff && staff.DepID) formApi.setFieldValue('deptid', staff.DepID); }
async function addPlanRow() { const total = getContractTotalAmount(); const isFirst = planRows.value.length === 0; planRows.value.push({ rowid: generateUUID(), term: `第${planRows.value.length + 1}期`, planDate: undefined, planAmount: isFirst ? total : 0, ratio: isFirst ? 100 : 0, autoSettle: false, remark: '' }); refreshPlanTerms(); }
function removePlanRow(index: number) { planRows.value.splice(index, 1); refreshPlanTerms(); syncPlanRatiosFromAmounts(); }
function clearPlans() { planRows.value = []; }
function handlePlanAmountChange(row: ReceivablePlanRow) { const total = getContractTotalAmount(); row.planAmount = normalizeMoney(row.planAmount); row.ratio = calcPlanRatioByAmount(total, row.planAmount); }
function handlePlanRatioChange(row: ReceivablePlanRow) { const total = getContractTotalAmount(); row.ratio = normalizeMoney(row.ratio); row.planAmount = calcPlanAmountByRatio(total, row.ratio); }
async function autoGeneratePlan() { const total = getContractTotalAmount(); if (total <= 0) { ElMessage.warning('合同总金额为空，无法生成收款计划'); return; } const firstAmount = calcPlanAmountByRatio(total, 30); const secondAmount = normalizeMoney(total - firstAmount); planRows.value = [{ rowid: generateUUID(), term: '第1期', planDate: undefined, planAmount: firstAmount, ratio: 30, autoSettle: false, remark: '' }, { rowid: generateUUID(), term: '第2期', planDate: undefined, planAmount: secondAmount, ratio: 70, autoSettle: false, remark: '' }]; }
function normalizeDateString(value: any): string | undefined { if (value === null || value === undefined) return undefined; const str = String(value).trim(); if (!str || str === 'null' || str === 'undefined') return undefined; return str.includes('T') ? str.split('T')[0] : str; }

async function handleSave(submit: boolean) {
  if (isDetailMode.value) return;
  const { valid } = await formApi.validate();
  if (!valid) return;
  saving.value = true;
  const api = safeGetModalApi();
  api?.lock?.();
  try {
    await syncAmountFromOrders();
    if (!validatePlanRatioTotal()) return;
    const values = (await formApi.getValues()) as any;
    const isEdit = !!values?.rowid;
    if (isEdit && Number((formData.value as any)?.ConState ?? values?.ConState) !== 0) {
      ElMessage.warning('当前收入合同状态不允许直接修改，请通过合同变更处理');
      return;
    }
    const contractId = isEdit ? String(values.rowid) : generateUUID();
    const payload: Record<string, any> = { ...values, rowid: contractId };
    formData.value = { ...(formData.value || {}), rowid: contractId };
    payload.contract_category = 0;
    payload.contract_signing_date = normalizeDateString(payload.contract_signing_date);
    payload.contract_start_date = normalizeDateString(payload.contract_start_date);
    payload.contract_end_date = normalizeDateString(payload.contract_end_date);
    payload.delivery_date = normalizeDateString(payload.delivery_date);
    if (isEdit) delete payload.ConState; else payload.ConState = submit ? 1 : 0;
    delete payload.contract_period; delete payload.taxIncluded; delete payload.attachment; delete payload.sale_order; delete payload.receivable_plan; delete payload.product_items; delete payload.type;
    payload.flowstate = submit ? 1 : 0;
    const rowsSource: any[] = (orderRows.value || []).map((row) => recalcOrderRowAmounts({ ...row }));
    const productSubRows = rowsSource.map((r: any) => ({ id: String(r.id || generateUUID()), contract_id: contractId, product_id: r.product_id, product_name: r.product_name, specification: r.specification, unit: r.unit, num: Number(r.num ?? 1), unit_price: Number(r.product_price ?? r.unit_price ?? 0), amount: Number(r.total_product_price ?? r.amount ?? 0), tax_rate: Number(r.tax_rate ?? 0), remark: String(r.remark ?? ''), lingma_sys_is_delete: 0 }));
    const planSubRows = (planRows.value || []).filter((r) => Number(r.planAmount ?? 0) > 0 || r.planDate).map((r) => ({ rowid: r.rowid || generateUUID(), contract_id: contractId, plan_period: String(r.term ?? '').replace(/[^0-9]/g, ''), plan_date: normalizeDateString(r.planDate), plan_amount: Number(r.planAmount ?? 0), is_auto: r.autoSettle ? 1 : 0, is_overdue: 0, settlement_type: 0, remark: String(r.remark ?? ''), lingma_sys_is_delete: 0 }));
    if (isEdit) {
      await updateContractWithProductsAndPlans(payload, productSubRows, planSubRows);
    } else {
      await createContractWithProductsAndPlans(payload, productSubRows, planSubRows);
      try {
        const firstPlan = planSubRows.find((p) => String(p.plan_period) === '1');
        if (firstPlan) {
          const settlementId = generateUUID();
          await createIncomeSettlement({ rowid: settlementId, contract_id: contractId, customer_id: payload.contract_party_b, project_id: payload.project_id, salesman_id: payload.salesperson, depart_id: payload.deptid, product_name: productSubRows.length > 0 ? String((productSubRows[0] as any)?.product_name || '') || '' : '', settlement_type: 0, status: 0, amount: firstPlan.plan_amount, total_amount: firstPlan.plan_amount, settlement_date: formatDateTime(new Date()), items: [] } as any);
          await createSettlementPlanRel(CONTRACT_MODEL_ID, { contract_id: contractId, plan_id: firstPlan.rowid, plan_period: '1', settlement_id: settlementId });
        }
      } catch (e) { console.error('Auto-generate settlement failed', e); }
    }
    await persistDraftAttachments(contractId);
    await api?.close?.();
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    api?.unlock?.();
    saving.value = false;
  }
}

const [Form, formApi] = useVbenForm({ commonConfig: { componentProps: { class: 'w-full' } }, wrapperClass: 'grid-cols-2 gap-x-6', layout: 'vertical', schema: useFormSchema(), showDefaultActions: false, handleValuesChange(values, fieldsChanged) { if (fieldsChanged?.includes('contract_party_b')) { currentCustomerId.value = (values as any).contract_party_b; if (isInitializingForm.value) return; selectedProjectId.value = undefined; selectedProjectLabel.value = ''; selectedProjectName.value = ''; formApi.setFieldValue('project_id', undefined); formApi.setFieldValue('project_name', ''); } } });
const [ProductSelectModalComp, productSelectModalApi] = useVbenModal({ connectedComponent: ProductSelectModal, destroyOnClose: true });
const [ProjectSelectModalComp, projectSelectModalApi] = useVbenModal({ connectedComponent: ProjectSelectModal, destroyOnClose: true });
let modalApiRef: any;
function safeGetModalApi() { return modalApiRef; }

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    try {
      const api = safeGetModalApi();
      if (!isOpen) {
        modalMode.value = 'create';
        formData.value = undefined; autoCreateProject.value = false; clearPlans(); orderRows.value = []; attachments.value = []; draftAttachments.value = []; uploadKey.value++;
        await formApi.resetForm();
        try { productSelectModalApi.close?.(); } catch {}
        try { projectSelectModalApi.close?.(); } catch {}
        try { document.body?.classList?.remove('el-popup-parent--hidden'); const epOverlays = document.querySelectorAll?.('.el-overlay'); epOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el)); const vbenOverlays = document.querySelectorAll?.('.bg-overlay'); vbenOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el)); if (document?.body?.style) { document.body.style.overflow = ''; document.body.style.paddingRight = ''; } const fixedNodes = document.querySelectorAll?.('._scroll__fixed_'); fixedNodes?.forEach?.((node: any) => { try { node.style.paddingRight = ''; requestAnimationFrame?.(() => { node.style.transition = node?.dataset?.transition || ''; }); } catch {} }); } catch {}
        return;
      }
      const data = (api?.getData?.() as any) ?? undefined;
      modalMode.value = data?.type === 'detail' ? 'detail' : data?.rowid || data?.id ? 'edit' : 'create';
      formData.value = data;
      const detailId = String(data?.rowid ?? data?.id ?? '').trim();
      if (!api || !data || !detailId) {
        selectedProjectId.value = undefined; selectedProjectLabel.value = ''; selectedProjectName.value = '';
        attachments.value = []; draftAttachments.value = []; uploadKey.value++;
        const today = getTodayDateString();
        await formApi.setValues({ contract_signing_date: today, delivery_date: today });
        await syncAmountFromOrders();
        return;
      }
      api.lock();
      try {
        const detail = await getContract(detailId);
        formData.value = detail;
        if (detail) {
          const formatDetail = { ...detail };
          formatDetail.contract_signing_date = normalizeDateString(detail.contract_signing_date);
          formatDetail.contract_start_date = normalizeDateString(detail.contract_start_date);
          formatDetail.contract_end_date = normalizeDateString(detail.contract_end_date);
          formatDetail.delivery_date = normalizeDateString(detail.delivery_date);
          if (formatDetail.contract_start_date && formatDetail.contract_end_date) formatDetail.contract_period = [formatDetail.contract_start_date, formatDetail.contract_end_date];
          if (formatDetail.ConState !== undefined && formatDetail.ConState !== null) formatDetail.ConState = String(formatDetail.ConState);
          currentCustomerId.value = (formatDetail as any).contract_party_b;
          if ((formatDetail as any).project_id) {
            selectedProjectId.value = String((formatDetail as any).project_id);
            const contractProjectName = (formatDetail as any).project_name || '';
            const contractProjectCode = (formatDetail as any).project_code || '';
            selectedProjectName.value = contractProjectName ? (contractProjectCode ? `${contractProjectCode} ${contractProjectName}` : contractProjectName) : '';
            if (!selectedProjectName.value) {
              try { const p = await getProject(String((formatDetail as any).project_id)); if (p) { selectedProjectName.value = `${p.project_code ?? ''} ${p.project_name ?? ''}`.trim() || p.project_name || ''; } } catch (e) { console.error('获取项目名称失败:', e); selectedProjectName.value = ''; }
            }
            selectedProjectLabel.value = selectedProjectName.value;
          } else { selectedProjectId.value = undefined; selectedProjectName.value = ''; selectedProjectLabel.value = ''; }
          isInitializingForm.value = true;
          try {
            await formApi.setValues(formatDetail);
            await formApi.setFieldValue('project_id', selectedProjectId.value);
            await formApi.setFieldValue('project_name', selectedProjectName.value);
          } finally {
            isInitializingForm.value = false;
          }
          const items = (detail as any).product_items as any[] | undefined;
          if (Array.isArray(items) && items.length) {
            orderRows.value = items.map((it) => hydrateOrderRowAmounts({ id: String(it.id ?? generateUUID()), product_id: String(it.product_id ?? ''), product_name: String(it.product_name ?? ''), specification: String(it.specification ?? it.spec ?? it.model ?? ''), unit: String(it.unit ?? ''), num: Number(it.num ?? 0), unit_price: Number(it.unit_price ?? 0), amount: Number(it.amount ?? 0), tax_rate: Number(it.tax_rate ?? 0), remark: String(it.remark ?? '') }));
            await syncAmountFromOrders();
          } else { orderRows.value = []; await syncAmountFromOrders(); }
          const planItems = (detail as any).plan_items as any[] | undefined;
          if (Array.isArray(planItems) && planItems.length) {
            planRows.value = planItems.map((it, idx) => ({ rowid: it.rowid || generateUUID(), term: it.plan_period ? `第${it.plan_period}期` : `第${idx + 1}期`, planDate: normalizeDateString(it.plan_date), planAmount: normalizeMoney(it.plan_amount ?? 0), ratio: 0, autoSettle: Number(it.is_auto ?? 0) === 1, remark: String(it.remark ?? '') }));
            syncPlanRatiosFromAmounts();
          } else { clearPlans(); }
          await formApi.setValues(formatDetail);
          await loadAttachments(detailId);
          draftAttachments.value = [];
          uploadKey.value++;
        }
      } finally { api.unlock(); }
    } catch (error) { console.error('[income-contract-form] onOpenChange failed:', error); }
  },
});
modalApiRef = modalApi;
async function handleCancel() { await safeGetModalApi()?.close?.(); }

onBeforeUnmount(() => {
  try { productSelectModalApi.close?.(); } catch {}
  try { projectSelectModalApi.close?.(); } catch {}
  try { document.body?.classList?.remove('el-popup-parent--hidden'); const epOverlays = document.querySelectorAll?.('.el-overlay'); epOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el)); const vbenOverlays = document.querySelectorAll?.('.bg-overlay'); vbenOverlays?.forEach?.((el: any) => el?.parentNode?.removeChild?.(el)); if (document?.body?.style) { document.body.style.overflow = ''; document.body.style.paddingRight = ''; } const fixedNodes = document.querySelectorAll?.('._scroll__fixed_'); fixedNodes?.forEach?.((node: any) => { try { node.style.paddingRight = ''; requestAnimationFrame?.(() => { node.style.transition = node?.dataset?.transition || ''; }); } catch {} }); } catch {}
});
</script>

<template>
  <Modal :title="getTitle" class="!w-[80vw]">
    <div class="px-6 pb-4">
      <div :class="{ 'readonly-panel': isDetailMode }">
      <Form>
        <template #contract_party_b="slotProps">
          <CustomerPicker :model-value="slotProps.value" placeholder="请选择客户" @update:model-value="(v?: string) => handleCustomerUpdate(v, slotProps.setValue)" />
        </template>
        <template #product="slotProps"><div class="w-full"><ElInput :model-value="selectedProductLabel" readonly placeholder="请选择产品" class="!w-full" @click="openProductSelect"><template #append><ElButton @click="openProductSelect">查询</ElButton></template></ElInput><div class="hidden">{{ slotProps }}</div></div></template>
        <template #salesperson="slotProps"><StaffPicker :model-value="slotProps.value" @update:model-value="slotProps.setValue" @update:data="handleSalespersonChange" /></template>
        <template #project_id><div class="w-full"><ElInput :model-value="selectedProjectName" readonly placeholder="请选择项目" class="!w-full" :disabled="!currentCustomerId" :input-style="{ cursor: 'pointer' }" @click="openProjectSelect" /></div></template>
        <template #receivable_plan>
          <div class="mt-4 w-full border-t pt-4"><div class="mb-2 flex items-center justify-between"><div class="font-medium">收款计划</div><div class="flex gap-2"><ElButton type="primary" link @click="autoGeneratePlan">自动生成</ElButton><ElButton type="primary" link @click="addPlanRow">添加</ElButton><ElButton link @click="clearPlans">清除</ElButton></div></div><div class="mt-2"><ElTable :data="planRows" border style="width: 100%"><template #empty><div class="py-8 text-center text-gray-500">暂无数据</div></template><ElTableColumn label="期次" width="110" align="center"><template #default="{ row, $index }">{{ row.term || `第${$index + 1}期` }}</template></ElTableColumn><ElTableColumn label="计划日期" width="160"><template #default="{ row }"><ElDatePicker v-model="row.planDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" class="!w-full" /></template></ElTableColumn><ElTableColumn label="计划金额" width="160"><template #default="{ row }"><ElInputNumber v-model="row.planAmount" :min="0" :precision="2" controls-position="right" class="!w-full" @change="handlePlanAmountChange(row)" /></template></ElTableColumn><ElTableColumn label="比例(%)" width="130"><template #default="{ row }"><ElInputNumber v-model="row.ratio" :min="0" :max="100" :precision="2" controls-position="right" class="!w-full" @change="handlePlanRatioChange(row)" /></template></ElTableColumn><ElTableColumn label="自动结算" width="120" align="center"><template #default="{ row }"><ElCheckbox v-model="row.autoSettle" /></template></ElTableColumn><ElTableColumn label="说明" min-width="220"><template #default="{ row }"><ElInput v-model="row.remark" /></template></ElTableColumn><ElTableColumn width="70" align="center"><template #default="{ $index }"><ElButton link type="danger" @click="removePlanRow($index)"><ElIcon><Delete /></ElIcon></ElButton></template></ElTableColumn></ElTable></div></div>
        </template>
        <template #product_items>
          <div class="w-full"><div class="flex items-center justify-between"><div class="font-medium">产品/服务</div><div class="flex gap-2"><ElButton type="primary" link @click="clearProducts">清空</ElButton><ElButton type="primary" link @click="openProductSelect">添加产品</ElButton></div></div><div class="mt-2"><ElTable :data="orderRows" border style="width: 100%"><ElTableColumn type="index" label="序号" width="80" align="center" /><ElTableColumn prop="product_name" label="产品名称" min-width="200" /><ElTableColumn prop="specification" label="规格" width="120" /><ElTableColumn prop="unit" label="单位" width="80" /><ElTableColumn label="数量" width="120" align="right"><template #default="{ row }"><ElInputNumber v-model="row.num" :min="0" :precision="3" controls-position="right" class="!w-full" @change="handleOrderRowChange(row)" /></template></ElTableColumn><ElTableColumn label="含税单价" width="140" align="right"><template #default="{ row }"><ElInputNumber v-model="row.tax_included_price" :min="0" :precision="2" controls-position="right" class="!w-full" @change="handleOrderRowChange(row)" /></template></ElTableColumn><ElTableColumn label="未税单价" width="140" align="right"><template #default="{ row }">{{ erpPriceInputFormatter(Number(row.product_price ?? 0)) }}</template></ElTableColumn><ElTableColumn label="未税金额" width="140" align="right"><template #default="{ row }">{{ erpPriceInputFormatter(Number(row.total_product_price ?? 0)) }}</template></ElTableColumn><ElTableColumn label="税率(%)" width="120" align="right"><template #default="{ row }"><ElInputNumber v-model="row.tax_rate" :min="0" :max="100" :precision="2" controls-position="right" class="!w-full" @change="handleOrderRowChange(row)" /></template></ElTableColumn><ElTableColumn label="税额" width="140" align="right"><template #default="{ row }">{{ erpPriceInputFormatter(Number(row.tax_price ?? 0)) }}</template></ElTableColumn><ElTableColumn label="含税金额" width="140" align="right"><template #default="{ row }">{{ erpPriceInputFormatter(Number(row.total_price ?? 0)) }}</template></ElTableColumn><ElTableColumn label="备注" min-width="180"><template #default="{ row }"><ElInput v-model="row.remark" @change="handleOrderRowChange(row)" /></template></ElTableColumn><ElTableColumn width="80" align="center"><template #default="{ $index }"><ElButton link type="danger" @click="async () => { orderRows.splice($index, 1); await syncAmountFromOrders(); }"><ElIcon><Delete /></ElIcon></ElButton></template></ElTableColumn></ElTable></div><div class="mt-2 rounded border border-border bg-muted p-2"><div class="flex justify-between text-sm text-muted-foreground"><span class="font-medium text-foreground">合计：</span><div class="flex flex-wrap gap-4"><span>数量：{{ erpCountInputFormatter(orderSummaries.count) }}</span><span>未税金额：{{ erpPriceInputFormatter(orderSummaries.totalProductPrice) }}</span><span>税额：{{ erpPriceInputFormatter(orderSummaries.taxPrice) }}</span><span>含税合计：{{ erpPriceInputFormatter(orderSummaries.totalPrice) }}</span></div></div></div></div>
        </template>
      </Form>
      </div>

      <div class="mt-6">
        <div class="mb-2 flex items-center justify-between">
          <h4>附件</h4>
          <div v-if="!isDetailMode" class="flex items-center gap-2">
            <FileUpload :key="uploadKey" :model-value="[]" :api="uploadCustomerAttachment" :limit="9" :file-size="50" :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']" :is-show-tip="false" :show-file-list="false" @success="handleAttachmentUploadSuccess" />
            <span class="text-xs text-[#999]">你可以上传 9 个附件，每个最大 50MB</span>
          </div>
        </div>
        <ElTable :data="attachments" style="width: 100%" size="small">
          <template #empty><div class="py-8 text-center text-[#999]">暂无附件</div></template>
          <ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
          <ElTableColumn label="文件大小" min-width="120"><template #default="{ row }">{{ formatAttachmentSize(row.file_size) }}</template></ElTableColumn>
          <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
          <ElTableColumn label="操作" width="140" fixed="right"><template #default="{ row, $index }"><ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink><ElLink v-if="!isDetailMode" class="ml-2" type="danger" @click="handleDeleteAttachment(row, $index)">删除</ElLink></template></ElTableColumn>
        </ElTable>
      </div>

      <ProductSelectModalComp v-model="selectedProductId" title="选择产品" multiple @confirm="handleProductSelectConfirm" />
      <ProjectSelectModalComp :api="getProjectPage" title="选择项目" @confirm="handleProjectSelectConfirm" />
    </div>
    <template #footer>
      <div class="flex w-full items-center justify-end gap-3"><template v-if="!isDetailMode"><ElButton type="primary" :loading="saving" @click="handleSave(true)">保存并提交</ElButton><ElButton :loading="saving" @click="handleSave(false)">保存草稿</ElButton></template><ElButton :disabled="saving" @click="handleCancel">{{ isDetailMode ? '关闭' : '取消' }}</ElButton></div>
    </template>
  </Modal>
</template>

<style scoped>
.readonly-panel :deep(.el-form-item__content),
.readonly-panel :deep(.el-table),
.readonly-panel :deep(.el-button),
.readonly-panel :deep(.el-input),
.readonly-panel :deep(.el-input-number),
.readonly-panel :deep(.el-date-editor),
.readonly-panel :deep(.el-select),
.readonly-panel :deep(.el-checkbox) {
  pointer-events: none;
}

.readonly-panel :deep(.el-input__wrapper),
.readonly-panel :deep(.el-textarea__inner),
.readonly-panel :deep(.el-input-number__wrapper),
.readonly-panel :deep(.el-date-editor.el-input__wrapper),
.readonly-panel :deep(.el-checkbox__inner) {
  background-color: var(--el-fill-color-light);
  box-shadow: 0 0 0 1px var(--el-border-color-light) inset;
}

.readonly-panel :deep(.el-button) {
  opacity: 0.65;
}
</style>
