<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { computed, onMounted, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';
import { buildUUID, downloadFileFromBlobPart } from '@vben/utils';


import {
  createCustomerAttachment,
  createCustomerCapitalAccount,
  createCustomerInvoice,
  createCustomerWithAutoCode,
  deleteCustomerAttachment,
  deleteCustomerCapitalAccount,
  deleteCustomerInvoice,
  downloadCustomerAttachment,
  getCustomer,
  getCustomerAttachments,
  getCustomerCapitalAccounts,
  getCustomerInvoices,
  updateCustomerCapitalAccount,
  updateCustomerInvoice,
  updateCustomerWithAutoCode,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { getCurrentUserBoundDeptName } from '#/api/system/dept';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import FileUpload from '#/components/upload/file-upload.vue';

import {
  ElButton,
  ElCard,
  ElCascader,
  ElCheckbox,
  ElDialog,
  ElDivider,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

const PUBLIC_REGION_DATA_URL = 'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_customer_region_data_cache_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);

const props = defineProps<{
  customerData?: CrmCustomerApi.Customer | null;
  permissionData?: any;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-success', id?: number | string): void;
}>();

const userStore = useUserStore();
const isReadonly = computed(() => !!props.readonly);
const isCreateMode = computed(
  () => !(props.customerData && (props.customerData.id || props.customerData.rowid)),
);

const formData = ref<CrmCustomerApi.Customer>({} as CrmCustomerApi.Customer);
const ownerStaffValue = ref<string | undefined>();
const regionSelection = ref<string[]>([]);
const areaTreeOptions = ref<AreaOption[]>([]);
const invoices = ref<CrmCustomerApi.Invoice[]>([]);
const capitalAccounts = ref<CrmCustomerApi.CapitalAccount[]>([]);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const uploadKey = ref(0);

const accountDialogVisible = ref(false);
const invoiceDialogVisible = ref(false);
const editingAccountIndex = ref<null | number>(null);
const editingInvoiceIndex = ref<null | number>(null);

const accountDialogTitle = computed(() =>
  editingAccountIndex.value === null ? '新增账号信息' : '编辑账号信息',
);
const invoiceDialogTitle = computed(() =>
  editingInvoiceIndex.value === null ? '新增发票信息' : '编辑发票信息',
);
const readonlyBasicItems = computed(() => [
  { label: '名称', value: formData.value.name || formData.value.customerName || '-' },
  { label: '编号', value: formData.value.customerCode || '-' },
  { label: '公司电话', value: formData.value.telephone || '-' },
  { label: '地区', value: formData.value.region || '-' },
  { label: '地址', value: formData.value.detailAddress || formData.value.address || '-' },
  { label: '负责人', value: formData.value.ownerUserName || '-' },
  { label: '部门', value: formData.value.departName || formData.value.ownerUserDeptName || '-' },
  { label: '备注', value: formData.value.remark || '-', wide: true },
]);
const readonlyAccountPreview = computed(() => capitalAccounts.value.slice(0, 3));
const readonlyInvoicePreview = computed(() => invoices.value.slice(0, 3));
const readonlyAttachmentPreview = computed(() => attachments.value.slice(0, 4));

const accountForm = ref({
  accountType: '银行',
  openingBank: '',
  accountName: '',
  accountId: '',
});

const invoiceForm = ref({
  invoiceTitle: '',
  taxNumber: '',
  bankName: '',
  address: '',
  phone: '',
  bankAccount: '',
});

const bankAccountOptions = computed(() =>
  (capitalAccounts.value || []).filter(
    (item: any) =>
      (item?.account_type || '') === '银行' &&
      Boolean(item?.OpeningBank || item?.account_id),
  ),
);

function formatFileSize(size?: number) {
  if (!size) return '-';
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

async function getCurrentUserDeptName() {
  try {
    return await getCurrentUserBoundDeptName();
  } catch (error) {
    console.error('获取当前登录人绑定部门失败:', error);
    return '';
  }
}

function getCurrentUserName() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return info.nickname || raw.UserName || raw.userName || info.username || '';
}

function isZeroValue(value: any) {
  return value === 0 || value === '0' || value === null || value === undefined || value === '';
}

function normalizeMunicipalityCodePath(codes: string[]) {
  if (
    codes.length >= 3 &&
    MUNICIPALITY_CODES.has(String(codes[0])) &&
    /^[0-9]{6}$/.test(String(codes[1])) &&
    String(codes[1]).slice(0, 2) === String(codes[0]).slice(0, 2) &&
    String(codes[1]).endsWith('00')
  ) {
    return [String(codes[0]), ...codes.slice(2)];
  }
  return codes;
}

function getCachedRegionData() {
  try {
    const raw = window.localStorage.getItem(REGION_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('读取地区缓存失败:', error);
    return [];
  }
}

function setCachedRegionData(data: any[]) {
  try {
    window.localStorage.setItem(REGION_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('写入地区缓存失败:', error);
  }
}

function buildAreaTreeFromFlatData(items: any[] = []): AreaOption[] {
  const provinces = items.filter(
    (item) => isZeroValue(item?.city) && isZeroValue(item?.area) && isZeroValue(item?.town),
  );
  const districts = items.filter((item) => !isZeroValue(item?.area) && isZeroValue(item?.town));
  const normalCities = items.filter(
    (item) =>
      !isZeroValue(item?.city) &&
      isZeroValue(item?.area) &&
      isZeroValue(item?.town) &&
      !MUNICIPALITY_CODES.has(String(item?.code || '')),
  );

  const normalDistrictMap = new Map<string, AreaOption[]>();
  const municipalityDistrictMap = new Map<string, AreaOption[]>();

  for (const item of districts) {
    const code = String(item?.code || '');
    const provinceCode = code.slice(0, 2) + '0000';
    const districtNode = { label: String(item?.name || ''), value: code };
    if (MUNICIPALITY_CODES.has(provinceCode)) {
      if (!municipalityDistrictMap.has(provinceCode)) municipalityDistrictMap.set(provinceCode, []);
      municipalityDistrictMap.get(provinceCode)!.push(districtNode);
      continue;
    }
    const cityCode = code.slice(0, 4) + '00';
    if (!normalDistrictMap.has(cityCode)) normalDistrictMap.set(cityCode, []);
    normalDistrictMap.get(cityCode)!.push(districtNode);
  }

  const cityMap = new Map<string, AreaOption[]>();
  for (const item of normalCities) {
    const provinceCode = String(item?.code || '').slice(0, 2) + '0000';
    if (!cityMap.has(provinceCode)) cityMap.set(provinceCode, []);
    cityMap.get(provinceCode)!.push({
      label: String(item?.name || ''),
      value: String(item?.code || ''),
      children: normalDistrictMap.get(String(item?.code || '')) || [],
    });
  }

  return provinces.map((item) => {
    const provinceCode = String(item?.code || '');
    if (MUNICIPALITY_CODES.has(provinceCode)) {
      return {
        label: String(item?.name || ''),
        value: provinceCode,
        children: municipalityDistrictMap.get(provinceCode) || [],
      };
    }
    return {
      label: String(item?.name || ''),
      value: provinceCode,
      children: cityMap.get(provinceCode) || [],
    };
  });
}

async function loadAreaTreeOptions() {
  if (areaTreeOptions.value.length > 0) return;
  const cachedData = getCachedRegionData();
  if (cachedData.length > 0) {
    areaTreeOptions.value = buildAreaTreeFromFlatData(cachedData);
  }
  try {
    const response = await fetch(PUBLIC_REGION_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      setCachedRegionData(list);
      areaTreeOptions.value = buildAreaTreeFromFlatData(list);
      syncRegionSelectionFromForm();
      return;
    }
  } catch (error) {
    console.error('加载公共地区接口失败:', error);
  }
  if (cachedData.length > 0) {
    areaTreeOptions.value = buildAreaTreeFromFlatData(cachedData);
    syncRegionSelectionFromForm();
  }
}

function parseRegionCodePath(value?: string) {
  return normalizeMunicipalityCodePath(
    String(value || '')
      .split(/[\/,>|\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3),
  );
}

function findAreaLabelsByCodes(codes: string[], options: AreaOption[]) {
  const labels: string[] = [];
  let currentOptions = options;
  for (const code of codes) {
    const current = currentOptions.find((item) => String(item.value) === String(code));
    if (!current) break;
    labels.push(current.label);
    currentOptions = current.children || [];
  }
  return labels;
}

function syncRegionSelectionFromForm() {
  const codes = parseRegionCodePath(formData.value.regionCode);
  regionSelection.value = codes;
  if (codes.length > 0 && !formData.value.region) {
    formData.value.region = findAreaLabelsByCodes(codes, areaTreeOptions.value).join('/');
  }
}

function handleRegionChange(value?: string[]) {
  const codes = normalizeMunicipalityCodePath(
    Array.isArray(value) ? value.filter(Boolean).slice(0, 3) : [],
  );
  regionSelection.value = codes;
  if (codes.length === 0) {
    formData.value.region = '';
    formData.value.regionCode = '';
    return;
  }
  formData.value.region = findAreaLabelsByCodes(codes, areaTreeOptions.value).join('/');
  formData.value.regionCode = codes.join('/');
}

async function applyNewCustomerDefaults(data: Record<string, any> = {}) {
  const deptName = data?.departName || (await getCurrentUserDeptName());
  return {
    ...data,
    companyType: data?.companyType || 1,
    departName: deptName,
    ownerUserName: data?.ownerUserName || getCurrentUserName(),
  } as CrmCustomerApi.Customer;
}

function syncOwnerStaffValue(target?: CrmCustomerApi.Customer | null) {
  const raw = target?.ownerUserId ?? target?.ownerUserName;
  const text = raw === null || raw === undefined ? '' : String(raw).trim();
  ownerStaffValue.value = text || undefined;
}

function handleOwnerStaffDataChange(value?: Staff | Staff[]) {
  const row = Array.isArray(value) ? value[0] : value;
  formData.value.ownerUserId = row?.ROWID;
  formData.value.ownerUserName = row?.UserName || '';
  if (row?.DepName) {
    formData.value.departName = row.DepName;
    formData.value.ownerUserDeptName = row.DepName;
  }
  ownerStaffValue.value = row?.ROWID || undefined;
}

function normalizeTelephoneInput(value: string) {
  return String(value || '')
    .replace(/[^0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 20);
}

function handleTelephoneInput(value: string) {
  const telephone = normalizeTelephoneInput(value);
  formData.value.telephone = telephone;
  formData.value.contactPhone = telephone;
}

function getCurrentCustomerId(): number | string | undefined {
  return (formData.value.rowid ?? formData.value.id) as any;
}

function getCustomerIdForPermission() {
  return (formData.value?.id ?? formData.value?.rowid) as any;
}

function canEditField(fieldKey: string) {
  const pid = getCustomerIdForPermission();
  if (!pid) return true;
  if (!props.permissionData?.isEditField) return true;
  return !!props.permissionData.isEditField(pid, fieldKey);
}

function openAddAccountDialog() {
  editingAccountIndex.value = null;
  accountForm.value = {
    accountType: '银行',
    openingBank: '',
    accountName: '',
    accountId: '',
  };
  accountDialogVisible.value = true;
}

function openAddInvoiceDialog() {
  editingInvoiceIndex.value = null;
  const firstBank = bankAccountOptions.value[0] as any;
  invoiceForm.value = {
    invoiceTitle: String(formData.value.name || '').trim(),
    taxNumber: '',
    bankName: firstBank?.OpeningBank || '',
    address: '',
    phone: '',
    bankAccount: firstBank?.account_id || '',
  };
  invoiceDialogVisible.value = true;
}

function openEditAccountDialog(row: CrmCustomerApi.CapitalAccount, index: number) {
  editingAccountIndex.value = index;
  accountForm.value = {
    accountType: row.account_type || '银行',
    openingBank: row.OpeningBank || '',
    accountName: row.account_name || '',
    accountId: row.account_id || '',
  };
  accountDialogVisible.value = true;
}

function openEditInvoiceDialog(row: CrmCustomerApi.Invoice, index: number) {
  editingInvoiceIndex.value = index;
  invoiceForm.value = {
    invoiceTitle: row.invoiceTitle || '',
    taxNumber: row.taxNumber || '',
    bankName: row.bankName || '',
    address: row.address || '',
    phone: row.phone || '',
    bankAccount: row.bankAccount || '',
  };
  invoiceDialogVisible.value = true;
}

function handleInvoiceBankChange(openingBank: string) {
  const matched = bankAccountOptions.value.find((item: any) => item?.OpeningBank === openingBank) as any;
  if (!matched) return;
  invoiceForm.value.bankName = matched.OpeningBank || '';
  invoiceForm.value.bankAccount = matched.account_id || '';
}

async function saveAccount() {
  const cid = getCurrentCustomerId();
  const item: CrmCustomerApi.CapitalAccount = {
    account_type: accountForm.value.accountType,
    OpeningBank: accountForm.value.openingBank,
    account_name: accountForm.value.accountName,
    account_id: accountForm.value.accountId,
  } as any;

  if (!cid) {
    if (editingAccountIndex.value === null) {
      capitalAccounts.value.push(item);
    } else {
      capitalAccounts.value.splice(editingAccountIndex.value, 1, {
        ...(capitalAccounts.value[editingAccountIndex.value] as any),
        ...item,
      });
    }
    ElMessage.success(editingAccountIndex.value === null ? '新增账号信息成功' : '修改账号信息成功');
    accountDialogVisible.value = false;
    return;
  }

  const editingRow = editingAccountIndex.value === null ? null : (capitalAccounts.value[editingAccountIndex.value] as any);
  if (editingRow?.rowid) {
    await updateCustomerCapitalAccount({ ...editingRow, ...item, customerId: cid });
    ElMessage.success('修改账号信息成功');
  } else {
    await createCustomerCapitalAccount(cid, {
      accountType: accountForm.value.accountType,
      openingBank: accountForm.value.openingBank,
      accountName: accountForm.value.accountName,
      accountId: accountForm.value.accountId,
    });
    ElMessage.success('新增账号信息成功');
  }

  accountDialogVisible.value = false;
  await loadCapitalAccounts(cid);
}

async function saveInvoice() {
  if (!invoiceForm.value.invoiceTitle?.trim()) {
    ElMessage.warning('请输入抬头');
    return;
  }
  if (!invoiceForm.value.taxNumber?.trim()) {
    ElMessage.warning('请输入税号');
    return;
  }

  const cid = getCurrentCustomerId();
  const item: CrmCustomerApi.Invoice = {
    invoiceTitle: invoiceForm.value.invoiceTitle,
    taxNumber: invoiceForm.value.taxNumber,
    bankName: invoiceForm.value.bankName,
    address: invoiceForm.value.address,
    phone: invoiceForm.value.phone,
    bankAccount: invoiceForm.value.bankAccount,
  } as any;

  if (!cid) {
    if (editingInvoiceIndex.value === null) {
      invoices.value.push(item);
    } else {
      invoices.value.splice(editingInvoiceIndex.value, 1, {
        ...(invoices.value[editingInvoiceIndex.value] as any),
        ...item,
      });
    }
    ElMessage.success(editingInvoiceIndex.value === null ? '新增发票信息成功' : '修改发票信息成功');
    invoiceDialogVisible.value = false;
    return;
  }

  const editingRow = editingInvoiceIndex.value === null ? null : (invoices.value[editingInvoiceIndex.value] as any);
  if (editingRow?.rowid) {
    await updateCustomerInvoice({ ...editingRow, ...item, customerId: cid });
    ElMessage.success('修改发票信息成功');
  } else {
    await createCustomerInvoice(cid, {
      invoiceTitle: invoiceForm.value.invoiceTitle,
      taxNumber: invoiceForm.value.taxNumber,
      bankName: invoiceForm.value.bankName,
      address: invoiceForm.value.address,
      phone: invoiceForm.value.phone,
      bankAccount: invoiceForm.value.bankAccount,
    });
    ElMessage.success('新增发票信息成功');
  }

  invoiceDialogVisible.value = false;
  await loadInvoiceList(cid);
}

async function handleDeleteAccount(row: CrmCustomerApi.CapitalAccount, index: number) {
  try {
    await ElMessageBox.confirm('确认删除该账号信息吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const cid = getCurrentCustomerId();
  if (cid && row.rowid) {
    await deleteCustomerCapitalAccount(row.rowid as any);
    ElMessage.success('删除成功');
    await loadCapitalAccounts(cid);
    return;
  }

  capitalAccounts.value.splice(index, 1);
  ElMessage.success('删除成功');
}

async function handleDeleteInvoice(row: CrmCustomerApi.Invoice, index: number) {
  try {
    await ElMessageBox.confirm('确认删除该发票信息吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const cid = getCurrentCustomerId();
  if (cid && row.rowid) {
    await deleteCustomerInvoice(row.rowid as any);
    ElMessage.success('删除成功');
    await loadInvoiceList(cid);
    return;
  }

  invoices.value.splice(index, 1);
  ElMessage.success('删除成功');
}

async function loadInvoiceList(customerId?: number | string) {
  if (!customerId) {
    invoices.value = [];
    return;
  }
  try {
    invoices.value = (await getCustomerInvoices(customerId)) || [];
  } catch (error) {
    console.error('加载发票信息失败', error);
    invoices.value = [];
  }
}

async function loadCapitalAccounts(customerId?: number | string) {
  if (!customerId) {
    capitalAccounts.value = [];
    return;
  }
  try {
    capitalAccounts.value = await getCustomerCapitalAccounts(customerId);
  } catch (error) {
    console.error('加载账号信息失败:', error);
    capitalAccounts.value = [];
  }
}

async function loadAttachments(customerId?: number | string) {
  if (!customerId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(customerId);
  } catch (error) {
    console.error('加载附件列表失败:', error);
    attachments.value = [];
  }
}

async function handleAttachmentUploadSuccess(payload: any) {
  const cid = getCurrentCustomerId();
  const fileName = payload?.fileName || '';
  const item: CrmCustomerApi.Attachment = {
    file_name: fileName,
    file_path: payload?.filePath || '',
    file_size: payload?.fileSize || 0,
    file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '',
  };

  if (!cid) {
    draftAttachments.value.push(item);
    attachments.value.push(item);
    uploadKey.value++;
    return;
  }

  await createCustomerAttachment(cid, {
    fileName: item.file_name,
    file_path: item.file_path,
    fileSize: item.file_size,
    fileType: item.file_type,
    owner_type: '客户信息',
    pid: cid,
  });
  await loadAttachments(cid);
  uploadKey.value++;
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
    console.error('下载附件失败:', error);
    ElMessage.error('下载附件失败');
  }
}

async function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) {
  try {
    await ElMessageBox.confirm('确认删除该附件吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const cid = getCurrentCustomerId();
  if (cid && row.id) {
    try {
      await deleteCustomerAttachment(row.id as any);
      ElMessage.success('删除附件成功');
      await loadAttachments(cid);
    } catch (error) {
      console.error('删除附件失败:', error);
      ElMessage.error('删除附件失败');
    }
    return;
  }

  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter(
    (it) => !(it.file_name === row.file_name && it.file_path === row.file_path && it.file_size === row.file_size),
  );
  ElMessage.success('删除附件成功');
}

watch(
  () => props.customerData,
  async (data) => {
    try {
      if (!data) {
        formData.value = await applyNewCustomerDefaults();
        syncOwnerStaffValue(formData.value);
        syncRegionSelectionFromForm();
        invoices.value = [];
        capitalAccounts.value = [];
        attachments.value = [];
        draftAttachments.value = [];
        uploadKey.value++;
        return;
      }

      if (!data.id && !data.rowid) {
        formData.value = await applyNewCustomerDefaults({ ...(data as any) });
        syncOwnerStaffValue(formData.value);
        syncRegionSelectionFromForm();
        invoices.value = [];
        capitalAccounts.value = [];
        attachments.value = [];
        draftAttachments.value = [];
        uploadKey.value++;
        return;
      }

      const detail = await getCustomer((data.id ?? data.rowid) as number | string);
      formData.value = (detail || {}) as CrmCustomerApi.Customer;
      syncOwnerStaffValue(formData.value);
      syncRegionSelectionFromForm();
      const cid = (formData.value.rowid ?? formData.value.id) as any;
      await loadInvoiceList(cid);
      await loadCapitalAccounts(cid);
      await loadAttachments(cid);
      draftAttachments.value = [];
      uploadKey.value++;
    } catch (error) {
      console.error('初始化主体表单失败:', error);
      invoices.value = [];
      capitalAccounts.value = [];
      attachments.value = [];
      draftAttachments.value = [];
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await loadAreaTreeOptions();
  syncRegionSelectionFromForm();
});

async function handleSave() {
  const payload = { ...formData.value } as CrmCustomerApi.Customer;
  if (!payload.name?.trim()) {
    ElMessage.warning('名称不能为空');
    return;
  }
  if (!payload.ownerUserName?.trim()) {
    ElMessage.warning('归属人不能为空');
    return;
  }
  if (payload.telephone && !/^[0-9-]{5,20}$/.test(String(payload.telephone))) {
    ElMessage.warning('请输入正确的公司电话格式');
    return;
  }

  try {
    const isUpdate = !!(props.customerData && (props.customerData.id || props.customerData.rowid));
    if (isUpdate) {
      const updated = await updateCustomerWithAutoCode(payload);
      if (updated?.customerCode) {
        formData.value.customerCode = updated.customerCode;
      }
    } else {
      payload.rowid = buildUUID();
      const created = await createCustomerWithAutoCode(payload);
      if (created?.customerCode) {
        formData.value.customerCode = created.customerCode;
      }
      formData.value.rowid = String((created?.rowid ?? payload.rowid) as any);
    }

    const cid = (formData.value.rowid ?? formData.value.id) as any;
    const draftAccounts = (capitalAccounts.value || []).filter((it: any) => !it?.rowid);
    const draftInvoices = (invoices.value || []).filter((it: any) => !it?.rowid);

    if (draftAccounts.length > 0) {
      await Promise.all(
        draftAccounts.map((it: any) =>
          createCustomerCapitalAccount(cid, {
            accountType: it.account_type,
            openingBank: it.OpeningBank,
            accountName: it.account_name,
            accountId: it.account_id,
          }),
        ),
      );
    }
    if (draftInvoices.length > 0) {
      await Promise.all(
        draftInvoices.map((it: any) =>
          createCustomerInvoice(cid, {
            invoiceTitle: it.invoiceTitle,
            taxNumber: it.taxNumber,
            bankName: it.bankName,
            address: it.address,
            phone: it.phone,
            bankAccount: it.bankAccount,
          }),
        ),
      );
    }
    if (draftAttachments.value.length > 0) {
      await Promise.all(
        draftAttachments.value.map((it) =>
          createCustomerAttachment(cid, {
            fileName: it.file_name,
            file_path: it.file_path,
            fileSize: it.file_size,
            fileType: it.file_type,
            owner_type: '客户信息',
            pid: cid,
          }),
        ),
      );
      draftAttachments.value = [];
    }

    await loadInvoiceList(cid);
    await loadCapitalAccounts(cid);
    await loadAttachments(cid);
    ElMessage.success('保存成功');
    emit('save-success', (formData.value.rowid ?? formData.value.id) as any);
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
  }
}

function handleCancel() {
  emit(isCreateMode.value ? 'close' : 'cancel-edit');
}
</script>

<template>
  <div class="subject-form-wrapper" :class="{ 'readonly-panel': isReadonly }">
    <template v-if="isReadonly">
      <div class="archive-header">
        <div>
          <div class="archive-title">主体档案</div>
          <div class="archive-desc">默认以展示态查看主体信息，进入编辑后才切换为完整表单维护。</div>
        </div>
        <!-- <ElTag type="info" effect="plain">只读展示</ElTag> -->
      </div>

      <div class="readonly-sections">
        <ElCard shadow="never" class="section-card">
          <template #header>
            <div class="section-header">基础信息</div>
          </template>
          <div class="basic-grid">
            <div v-for="item in readonlyBasicItems" :key="item.label" class="basic-item" :class="{ wide: item.wide }">
              <div class="basic-label">{{ item.label }}</div>
              <div class="basic-value">{{ item.value }}</div>
            </div>
          </div>
        </ElCard>

        <div class="summary-grid">
          <ElCard shadow="never" class="section-card">
            <template #header>
              <div class="section-header">账户信息</div>
            </template>
            <div v-if="readonlyAccountPreview.length > 0" class="summary-list">
              <div v-for="item in readonlyAccountPreview" :key="item.rowid || item.account_id || item.OpeningBank" class="summary-row-card">
                <div class="summary-title-row">
                  <strong>{{ item.account_type || '账号' }}</strong>
                  <span>{{ item.OpeningBank || '-' }}</span>
                </div>
                <div class="summary-sub">{{ item.account_name || '-' }}</div>
                <div class="summary-sub mono">{{ item.account_id || '-' }}</div>
              </div>
              <div v-if="capitalAccounts.length > readonlyAccountPreview.length" class="more-tip">
                还有 {{ capitalAccounts.length - readonlyAccountPreview.length }} 条账户信息，请进入编辑态查看更多。
              </div>
            </div>
            <ElEmpty v-else description="暂无账户信息" :image-size="80" />
          </ElCard>

          <ElCard shadow="never" class="section-card">
            <template #header>
              <div class="section-header">发票信息</div>
            </template>
            <div v-if="readonlyInvoicePreview.length > 0" class="summary-list">
              <div v-for="item in readonlyInvoicePreview" :key="item.rowid || item.taxNumber || item.invoiceTitle" class="summary-row-card">
                <div class="summary-title-row">
                  <strong>{{ item.invoiceTitle || '-' }}</strong>
                  <span>{{ item.taxNumber || '-' }}</span>
                </div>
                <div class="summary-sub">{{ item.bankName || '未填写开户行' }}</div>
                <div class="summary-sub">{{ item.bankAccount || '未填写账号' }}</div>
              </div>
              <div v-if="invoices.length > readonlyInvoicePreview.length" class="more-tip">
                还有 {{ invoices.length - readonlyInvoicePreview.length }} 条发票信息，请进入编辑态查看更多。
              </div>
            </div>
            <ElEmpty v-else description="暂无发票信息" :image-size="80" />
          </ElCard>
        </div>

        <ElCard shadow="never" class="section-card">
          <template #header>
            <div class="section-header">附件信息</div>
          </template>
          <div class="attachment-headline">
            <div class="attachment-count">附件总数：{{ attachments.length }}</div>
            <div class="attachment-desc">保留最近附件摘要，进入编辑态后可继续上传和删除。</div>
          </div>
          <div v-if="readonlyAttachmentPreview.length > 0" class="attachment-preview-grid">
            <div
              v-for="(item, index) in readonlyAttachmentPreview"
              :key="item.id || item.file_name || `${item.file_path}-${index}`"
              class="attachment-preview-card"
            >
              <div class="attachment-name">{{ item.file_name || '-' }}</div>
              <div class="attachment-meta">{{ item.file_type || '-' }} / {{ formatFileSize(item.file_size) }}</div>
              <ElButton text type="primary" @click="handleDownloadAttachment(item)">下载附件</ElButton>
            </div>
          </div>
          <ElEmpty v-else description="暂无附件" :image-size="80" />
        </ElCard>
      </div>
    </template>

    <template v-else>
      <div class="edit-mode-header">
        <div>
          <div class="archive-title">编辑主体信息</div>
          <div class="archive-desc">保留原有主体保存能力，仅在编辑态进入完整表单维护。</div>
        </div>
        <ElTag type="warning" effect="plain">编辑态</ElTag>
      </div>

      <div class="form-block">
        <div class="form-section-title">基础信息</div>
        <div class="grid-form">
          <div class="col-span-2">
            <label class="form-label">
              <span class="required">*</span>
              名称
            </label>
            <ElInput
              v-model="formData.name"
              placeholder="请输入名称"
              class="w-full"
              :disabled="isReadonly || !canEditField('customer_name')"
            />
          </div>

          <div>
            <label class="form-label">编号</label>
            <ElInput v-model="formData.customerCode" placeholder="系统自动生成" disabled />
          </div>

          <div class="col-span-2">
            <label class="form-label">公司电话</label>
            <ElInput
              v-model="formData.telephone"
              placeholder="请输入公司电话"
              class="w-full"
              :disabled="isReadonly || !canEditField('contact_phone')"
              @input="handleTelephoneInput"
            />
          </div>

          <div class="col-span-2">
            <label class="form-label">地区</label>
            <ElCascader
              v-model="regionSelection"
              :options="areaTreeOptions"
              :props="{ checkStrictly: false, emitPath: true, value: 'value', label: 'label', children: 'children' }"
              clearable
              filterable
              placeholder="请选择省/市/区"
              class="w-full"
              :disabled="isReadonly || !canEditField('region')"
              @change="handleRegionChange"
            />
          </div>

          <div class="col-span-2">
            <label class="form-label">地址</label>
            <ElInput
              v-model="formData.detailAddress"
              placeholder="请输入地址"
              class="w-full"
              :disabled="isReadonly || !canEditField('address')"
            />
          </div>

          <div>
            <label class="form-label">
              <span class="required">*</span>
              归属人
            </label>
            <StaffPicker
              :model-value="ownerStaffValue"
              placeholder="请选择归属人"
              :disabled="isReadonly || !canEditField('ownerUserName')"
              @update:data="handleOwnerStaffDataChange"
            />
          </div>

          <div>
            <label class="form-label">归属部门</label>
            <ElInput
              v-model="formData.departName"
              placeholder="请输入归属部门"
              class="w-full"
              :disabled="isReadonly || !canEditField('depart_name')"
            />
          </div>

          <div class="col-span-2">
            <label class="form-label">备注</label>
            <ElInput
              v-model="formData.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
              class="w-full"
              :disabled="isReadonly || !canEditField('remark')"
            />
          </div>
          <div class="col-span-2">
            <ElCheckbox v-model="formData.isCommonUsed" :true-label="1" :false-label="0" :disabled="isReadonly">
              常用
            </ElCheckbox>
          </div>
        </div>
      </div>

      <ElDivider />

      <div class="table-section">
        <div class="section-toolbar">
          <div>
            <div class="form-section-title">账户信息</div>
            <div class="section-tip">维护客户默认收付款账号。</div>
          </div>
          <ElButton type="primary" plain @click="openAddAccountDialog">新增账号信息</ElButton>
        </div>
        <ElTable v-if="capitalAccounts.length > 0" :data="capitalAccounts" style="width: 100%" size="small">
          <ElTableColumn prop="account_type" label="账号类型" min-width="160" />
          <ElTableColumn prop="OpeningBank" label="开户行" min-width="160" />
          <ElTableColumn prop="account_name" label="对方户名" min-width="160" />
          <ElTableColumn prop="account_id" label="账号" min-width="180" />
          <ElTableColumn label="操作" width="140" fixed="right">
            <template #default="{ row, $index }">
              <ElLink type="primary" @click="openEditAccountDialog(row, $index)">编辑</ElLink>
              <ElLink class="ml-2" type="danger" @click="handleDeleteAccount(row, $index)">删除</ElLink>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-else class="empty-inline">暂无数据</div>
      </div>

      <ElDivider />

      <div class="table-section">
        <div class="section-toolbar">
          <div>
            <div class="form-section-title">发票信息</div>
            <div class="section-tip">默认展示摘要，编辑态下维护完整发票抬头信息。</div>
          </div>
          <ElButton type="primary" plain @click="openAddInvoiceDialog">新增发票信息</ElButton>
        </div>
        <ElTable v-if="invoices.length > 0" :data="invoices" style="width: 100%" size="small">
          <ElTableColumn prop="invoiceTitle" label="抬头" min-width="160" />
          <ElTableColumn prop="taxNumber" label="税号" min-width="140" />
          <ElTableColumn prop="bankName" label="开户行" min-width="160" />
          <ElTableColumn prop="address" label="地址" min-width="180" show-overflow-tooltip />
          <ElTableColumn prop="phone" label="电话" min-width="140" />
          <ElTableColumn prop="bankAccount" label="账号" min-width="180" />
          <ElTableColumn label="操作" width="140" fixed="right">
            <template #default="{ row, $index }">
              <ElLink type="primary" @click="openEditInvoiceDialog(row, $index)">编辑</ElLink>
              <ElLink class="ml-2" type="danger" @click="handleDeleteInvoice(row, $index)">删除</ElLink>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-else class="empty-inline">暂无数据</div>
      </div>

      <ElDivider />

      <div class="table-section">
        <div class="section-toolbar">
          <div>
            <div class="form-section-title">附件信息</div>
            <div class="section-tip">可上传合同、资质、报价单等附件。</div>
          </div>
          <FileUpload
            :key="uploadKey"
            :model-value="[]"
            :api="uploadCustomerAttachment"
            :limit="50"
            :file-size="100"
            :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']"
            :is-show-tip="false"
            :show-file-list="false"
            button-text="上传"
            @success="handleAttachmentUploadSuccess"
          />
        </div>
        <ElTable v-if="attachments.length > 0" :data="attachments" style="width: 100%" size="small">
          <ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
          <ElTableColumn label="文件大小" min-width="120">
            <template #default="{ row }">
              {{ formatFileSize(row.file_size) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
          <ElTableColumn label="操作" width="140" fixed="right">
            <template #default="{ row, $index }">
              <ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink>
              <ElLink class="ml-2" type="danger" @click="handleDeleteAttachment(row, $index)">删除</ElLink>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-else class="empty-inline">暂无附件</div>
        <div class="upload-tip mt-2">你可以上传 50 个附件，每个最大 100MB</div>
      </div>

      <div class="footer-actions">
        <ElButton @click="handleCancel">{{ isCreateMode ? '返回' : '取消编辑' }}</ElButton>
        <ElButton type="primary" @click="handleSave">保存主体信息</ElButton>
      </div>
    </template>
  </div>

  <ElDialog v-model="accountDialogVisible" :title="accountDialogTitle" width="520px">
    <ElForm :model="accountForm" label-width="100px">
      <ElFormItem label="账号类型">
        <ElSelect v-model="accountForm.accountType" class="w-full">
          <ElOption label="微信" value="微信" />
          <ElOption label="支付宝" value="支付宝" />
          <ElOption label="银行" value="银行" />
          <ElOption label="其他" value="其他" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="开户行"><ElInput v-model="accountForm.openingBank" placeholder="请输入开户行" /></ElFormItem>
      <ElFormItem label="对方户名"><ElInput v-model="accountForm.accountName" placeholder="请输入对方户名" /></ElFormItem>
      <ElFormItem label="账号"><ElInput v-model="accountForm.accountId" placeholder="请输入账号" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="accountDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="saveAccount">保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="invoiceDialogVisible" :title="invoiceDialogTitle" width="560px">
    <ElForm :model="invoiceForm" label-width="100px">
      <ElFormItem label="抬头" required><ElInput v-model="invoiceForm.invoiceTitle" placeholder="请输入抬头" /></ElFormItem>
      <ElFormItem label="税号" required><ElInput v-model="invoiceForm.taxNumber" placeholder="请输入税号" /></ElFormItem>
      <ElFormItem label="开户行">
        <div class="flex w-full gap-2">
          <ElSelect
            v-model="invoiceForm.bankName"
            class="flex-1"
            :disabled="bankAccountOptions.length === 0"
            :placeholder="bankAccountOptions.length > 0 ? '请选择开户行' : '请先新增银行信息'"
            @change="handleInvoiceBankChange"
          >
            <ElOption
              v-for="item in bankAccountOptions"
              :key="item.rowid || item.account_id || item.OpeningBank"
              :label="item.OpeningBank"
              :value="item.OpeningBank"
            />
          </ElSelect>
          <ElButton type="primary" link @click="openAddAccountDialog">新增银行信息</ElButton>
        </div>
      </ElFormItem>
      <ElFormItem label="地址"><ElInput v-model="invoiceForm.address" placeholder="请输入地址" /></ElFormItem>
      <ElFormItem label="电话"><ElInput v-model="invoiceForm.phone" placeholder="请输入电话" /></ElFormItem>
      <ElFormItem label="账号"><ElInput v-model="invoiceForm.bankAccount" placeholder="请输入账号" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="invoiceDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="saveInvoice">保存</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
:deep(.el-input),
:deep(.el-select),
:deep(.el-cascader) {
  width: 100%;
}

.readonly-panel :deep(.el-input__wrapper),
.readonly-panel :deep(.el-textarea__inner),
.readonly-panel :deep(.el-cascader .el-input__wrapper),
.readonly-panel :deep(.el-select .el-input__wrapper),
.readonly-panel :deep(.el-checkbox__inner) {
  background-color: var(--el-fill-color-light);
}

.subject-form-wrapper {
  padding: 4px;
}

.archive-header,
.edit-mode-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.archive-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.archive-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.readonly-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  border-radius: 14px;
}

.section-header,
.form-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.basic-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.basic-item {
  border-radius: 12px;
  padding: 14px;
  background: var(--el-fill-color-light);
}

.basic-item.wide {
  grid-column: span 2;
}

.basic-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.basic-value {
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row-card,
.attachment-preview-card {
  border-radius: 12px;
  padding: 14px;
  background: var(--el-fill-color-light);
}

.summary-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.summary-title-row strong,
.attachment-name {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.summary-title-row span,
.summary-sub,
.attachment-meta,
.more-tip,
.attachment-desc,
.section-tip,
.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-sub {
  margin-top: 6px;
}

.mono {
  font-family: monospace;
}

.attachment-headline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.attachment-count {
  font-size: 14px;
  font-weight: 600;
}

.attachment-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-block,
.table-section {
  margin-bottom: 8px;
}

.grid-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.col-span-2 {
  grid-column: span 2;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
}

.required {
  color: var(--el-color-danger);
  margin-right: 4px;
}

.section-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.empty-inline {
  padding: 32px 0;
  text-align: center;
  color: var(--el-text-color-placeholder);
}

.footer-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 900px) {
  .basic-grid,
  .summary-grid,
  .attachment-preview-grid,
  .grid-form {
    grid-template-columns: 1fr;
  }

  .basic-item.wide,
  .col-span-2 {
    grid-column: span 1;
  }

  .attachment-headline,
  .section-toolbar,
  .archive-header,
  .edit-mode-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
