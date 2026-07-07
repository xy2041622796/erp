<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { computed, onMounted, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';
import { buildUUID, downloadFileFromBlobPart } from '@vben/utils';

import {
  ElButton,
  ElCascader,
  ElCheckbox,
  ElDialog,
  ElDivider,
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
} from 'element-plus';

import {
  createCustomerAttachment,
  createCustomerCapitalAccount,
  createCustomerContact,
  createCustomerInvoice,
  createCustomerWithAutoCode,
  deleteCustomerAttachment,
  deleteCustomerCapitalAccount,
  deleteCustomerContact,
  deleteCustomerInvoice,
  downloadCustomerAttachment,
  getCustomer,
  getCustomerAttachments,
  getCustomerCapitalAccounts,
  getCustomerContacts,
  getCustomerInvoices,
  updateCustomerCapitalAccount,
  updateCustomerContact,
  updateCustomerInvoice,
  updateCustomerWithAutoCode,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { getCurrentUserBoundDeptName } from '#/api/system/dept';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import FileUpload from '#/components/upload/file-upload.vue';

interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

const props = defineProps<{
  attachmentOwnerType?: string;
  customerData?: CrmCustomerApi.Customer | null;
  fixedCompanyType?: number;
  permissionData?: any;
  readonly?: boolean;
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saveSuccess', id?: number | string): void;
}>();
const PUBLIC_REGION_DATA_URL =
  'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_customer_region_data_cache_v1';
const REGION_CACHE_TIME_KEY = 'erp_customer_region_data_cache_time_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);

const userStore = useUserStore();
const isReadonly = computed(() => !!props.readonly);
const resolvedAttachmentOwnerType = computed(
  () => props.attachmentOwnerType || '客户信息',
);

const formData = ref<CrmCustomerApi.Customer>({} as CrmCustomerApi.Customer);
const ownerStaffValue = ref<string | undefined>();
const regionSelection = ref<string[]>([]);
const areaTreeOptions = ref<AreaOption[]>([]);

const contacts = ref<CrmCustomerApi.Contact[]>([]);
const invoices = ref<CrmCustomerApi.Invoice[]>([]);
const capitalAccounts = ref<CrmCustomerApi.CapitalAccount[]>([]);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const uploadKey = ref(0);

const contactDialogVisible = ref(false);
const accountDialogVisible = ref(false);
const invoiceDialogVisible = ref(false);

const editingContactIndex = ref<null | number>(null);
const editingAccountIndex = ref<null | number>(null);
const editingInvoiceIndex = ref<null | number>(null);

const contactDialogTitle = computed(() =>
  editingContactIndex.value === null ? '新增联系人' : '编辑联系人',
);
const accountDialogTitle = computed(() =>
  editingAccountIndex.value === null ? '新增账号信息' : '编辑账号信息',
);
const invoiceDialogTitle = computed(() =>
  editingInvoiceIndex.value === null ? '新增发票信息' : '编辑发票信息',
);

const contactForm = ref<CrmCustomerApi.Contact>({
  contactName: '',
  gender: undefined,
  mobile: '',
  remark: '',
});

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
  return (
    value === 0 ||
    value === '0' ||
    value === null ||
    value === undefined ||
    value === ''
  );
}

function normalizeMunicipalityCodePath(codes: string[]) {
  if (
    codes.length >= 3 &&
    MUNICIPALITY_CODES.has(String(codes[0])) &&
    /^\d{6}$/.test(String(codes[1])) &&
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
    window.localStorage.setItem(REGION_CACHE_TIME_KEY, String(Date.now()));
  } catch (error) {
    console.error('写入地区缓存失败:', error);
  }
}

function buildAreaTreeFromFlatData(items: any[] = []): AreaOption[] {
  const provinces = items.filter(
    (item) =>
      isZeroValue(item?.city) &&
      isZeroValue(item?.area) &&
      isZeroValue(item?.town),
  );
  const districts = items.filter(
    (item) => !isZeroValue(item?.area) && isZeroValue(item?.town),
  );
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
    const provinceCode = `${code.slice(0, 2)}0000`;
    const districtNode = {
      label: String(item?.name || ''),
      value: code,
    };

    if (MUNICIPALITY_CODES.has(provinceCode)) {
      if (!municipalityDistrictMap.has(provinceCode))
        municipalityDistrictMap.set(provinceCode, []);
      municipalityDistrictMap.get(provinceCode)!.push(districtNode);
      continue;
    }

    const cityCode = `${code.slice(0, 4)}00`;
    if (!normalDistrictMap.has(cityCode)) normalDistrictMap.set(cityCode, []);
    normalDistrictMap.get(cityCode)!.push(districtNode);
  }

  const cityMap = new Map<string, AreaOption[]>();
  for (const item of normalCities) {
    const provinceCode = `${String(item?.code || '').slice(0, 2)}0000`;
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
    return;
  }

  areaTreeOptions.value = [];
}

function parseRegionCodePath(value?: string) {
  const codes = String(value || '')
    .split(/[/,>|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  return normalizeMunicipalityCodePath(codes);
}

function findAreaLabelsByCodes(codes: string[], options: AreaOption[]) {
  const labels: string[] = [];
  let currentOptions = options;
  for (const code of codes) {
    const current = currentOptions.find(
      (item) => String(item.value) === String(code),
    );
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
    formData.value.region = findAreaLabelsByCodes(
      codes,
      areaTreeOptions.value,
    ).join('/');
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
  formData.value.region = findAreaLabelsByCodes(
    codes,
    areaTreeOptions.value,
  ).join('/');
  formData.value.regionCode = codes.join('/');
}

async function applyNewCustomerDefaults(data: Record<string, any> = {}) {
  const deptName = data?.departName || (await getCurrentUserDeptName());
  const fixedCompanyType = props.fixedCompanyType;
  return {
    ...data,
    companyType: data?.companyType ?? fixedCompanyType,
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

function normalizeMobileInput(value: string) {
  return String(value || '')
    .replaceAll(/\D/g, '')
    .slice(0, 11);
}

function normalizeTelephoneInput(value: string) {
  return String(value || '')
    .replaceAll(/[^0-9-]/g, '')
    .replaceAll(/-{2,}/g, '-')
    .slice(0, 20);
}

function handleTelephoneInput(value: string) {
  const telephone = normalizeTelephoneInput(value);
  formData.value.telephone = telephone;
  formData.value.contactPhone = telephone;
}

function syncPrimaryContactFields(target: any) {
  const firstContact = (contacts.value || [])[0] as any;
  const contactName = String(firstContact?.contactName || '').trim();
  const contactMobile = normalizeMobileInput(
    String(firstContact?.mobile || ''),
  );
  target.contactName = contactName;
  target.mobile = contactMobile;
  target.contactMobile = contactMobile;
}

function getCurrentCustomerId(): number | string | undefined {
  return (formData.value.rowid ?? formData.value.id) as any;
}

function getCurrentCustomerIdentity() {
  return {
    customerId: getCurrentCustomerId(),
    customerName: String(formData.value.name || '').trim(),
    customerCode: String(formData.value.customerCode || '').trim(),
    companyType: Number(
      formData.value.companyType ?? props.fixedCompanyType ?? 0,
    ),
  };
}

function formatGender(gender?: number | string) {
  if (String(gender) === '1') return '男';
  if (String(gender) === '2') return '女';
  if (String(gender) === '0') return '未知';
  return '';
}

function openAddContactDialog() {
  editingContactIndex.value = null;
  contactForm.value = {
    contactName: '',
    gender: undefined,
    mobile: '',
    remark: '',
  };
  contactDialogVisible.value = true;
}

function openEditContactDialog(row: CrmCustomerApi.Contact, index: number) {
  editingContactIndex.value = index;
  contactForm.value = {
    ...row,
    contactName: row.contactName || '',
    gender: row.gender,
    mobile: row.mobile || '',
    remark: row.remark || '',
  };
  contactDialogVisible.value = true;
}

async function saveContact() {
  const item: CrmCustomerApi.Contact = {
    contactName: String(contactForm.value.contactName || '').trim(),
    gender: contactForm.value.gender,
    mobile: normalizeMobileInput(String(contactForm.value.mobile || '')),
    remark: String(contactForm.value.remark || '').trim(),
  };

  if (!item.contactName) {
    ElMessage.warning('请输入联系人姓名');
    return;
  }
  if (item.mobile && !/^1\d{10}$/.test(item.mobile)) {
    ElMessage.warning('请输入正确的11位手机号');
    return;
  }

  const cid = getCurrentCustomerId();
  const editingRow =
    editingContactIndex.value === null
      ? null
      : (contacts.value[editingContactIndex.value] as any);

  if (!cid) {
    if (editingContactIndex.value === null) {
      contacts.value.push(item);
    } else {
      contacts.value.splice(editingContactIndex.value, 1, {
        ...(contacts.value[editingContactIndex.value] as any),
        ...item,
      });
    }
    contactDialogVisible.value = false;
    ElMessage.success(
      editingContactIndex.value === null ? '新增联系人成功' : '修改联系人成功',
    );
    return;
  }

  const currentIdentity = getCurrentCustomerIdentity();
  if (editingRow?.id) {
    await updateCustomerContact({
      ...editingRow,
      ...item,
      customerId: currentIdentity.customerId,
      customerName: currentIdentity.customerName,
      customerCode: currentIdentity.customerCode,
      companyType: currentIdentity.companyType,
    });
    ElMessage.success('修改联系人成功');
  } else {
    await createCustomerContact({
      id: buildUUID(),
      ...item,
      customerId: currentIdentity.customerId,
      customerName: currentIdentity.customerName,
      customerCode: currentIdentity.customerCode,
      companyType: currentIdentity.companyType,
      isPrimary: 0,
    });
    ElMessage.success('新增联系人成功');
  }

  contactDialogVisible.value = false;
  await loadContacts(
    currentIdentity.customerId,
    currentIdentity.customerCode,
    currentIdentity.customerName,
    currentIdentity.companyType,
  );
}

async function handleDeleteContact(row: CrmCustomerApi.Contact, index: number) {
  try {
    await ElMessageBox.confirm('确认删除该联系人吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const cid = getCurrentCustomerId();
  if (cid && row.id) {
    await deleteCustomerContact(row.id as any);
    ElMessage.success('删除成功');
    const currentIdentity = getCurrentCustomerIdentity();
    await loadContacts(
      currentIdentity.customerId,
      currentIdentity.customerCode,
      currentIdentity.customerName,
      currentIdentity.companyType,
    );
    return;
  }

  contacts.value.splice(index, 1);
  ElMessage.success('删除成功');
}

async function loadContacts(
  customerId?: number | string,
  customerCode?: string,
  customerName?: string,
  companyType?: number,
) {
  if (!customerId && !customerCode && !customerName) {
    contacts.value = [];
    return;
  }
  try {
    contacts.value = await getCustomerContacts({
      customerId,
      customerCode,
      customerName,
      companyType,
    });
  } catch (error) {
    console.error('加载联系人失败:', error);
    contacts.value = [];
  }
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
    invoiceTitle: (formData.value.name || '').trim(),
    taxNumber: '',
    bankName: firstBank?.OpeningBank || '',
    address: '',
    phone: '',
    bankAccount: firstBank?.account_id || '',
  };
  invoiceDialogVisible.value = true;
}

function openEditAccountDialog(
  row: CrmCustomerApi.CapitalAccount,
  index: number,
) {
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
  const matched = bankAccountOptions.value.find(
    (item: any) => item?.OpeningBank === openingBank,
  ) as any;
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
    ElMessage.success(
      editingAccountIndex.value === null
        ? '新增账号信息成功'
        : '修改账号信息成功',
    );
    accountDialogVisible.value = false;
    if (
      accountForm.value.accountType === '银行' &&
      invoiceDialogVisible.value
    ) {
      invoiceForm.value.bankName = accountForm.value.openingBank || '';
      invoiceForm.value.bankAccount = accountForm.value.accountId || '';
    }
    return;
  }

  const editingRow =
    editingAccountIndex.value === null
      ? null
      : (capitalAccounts.value[editingAccountIndex.value] as any);
  if (editingRow?.rowid) {
    await updateCustomerCapitalAccount({
      ...editingRow,
      ...item,
      customerId: cid,
    });
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
  if (accountForm.value.accountType === '银行' && invoiceDialogVisible.value) {
    invoiceForm.value.bankName = accountForm.value.openingBank || '';
    invoiceForm.value.bankAccount = accountForm.value.accountId || '';
  }
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
    ElMessage.success(
      editingInvoiceIndex.value === null
        ? '新增发票信息成功'
        : '修改发票信息成功',
    );
    invoiceDialogVisible.value = false;
    return;
  }

  const editingRow =
    editingInvoiceIndex.value === null
      ? null
      : (invoices.value[editingInvoiceIndex.value] as any);
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

async function handleDeleteAccount(
  row: CrmCustomerApi.CapitalAccount,
  index: number,
) {
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
    owner_type: resolvedAttachmentOwnerType.value,
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

async function handleDeleteAttachment(
  row: CrmCustomerApi.Attachment,
  index: number,
) {
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
    (it) =>
      !(
        it.file_name === row.file_name &&
        it.file_path === row.file_path &&
        it.file_size === row.file_size
      ),
  );
  ElMessage.success('删除附件成功');
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

onMounted(async () => {
  await loadAreaTreeOptions();
  syncRegionSelectionFromForm();
});

watch(
  () => props.customerData,
  async (data) => {
    try {
      if (!data) {
        formData.value = await applyNewCustomerDefaults();
        syncOwnerStaffValue(formData.value);
        syncRegionSelectionFromForm();
        contacts.value = [];
        invoices.value = [];
        capitalAccounts.value = [];
        attachments.value = [];
        draftAttachments.value = [];
        uploadKey.value++;
        return;
      }

      if (!data.id) {
        formData.value = await applyNewCustomerDefaults({ ...(data as any) });
        syncOwnerStaffValue(formData.value);
        syncRegionSelectionFromForm();
        contacts.value = [];
        invoices.value = [];
        capitalAccounts.value = [];
        attachments.value = [];
        draftAttachments.value = [];
        uploadKey.value++;
        return;
      }

      const detail = await getCustomer(data.id as number);
      formData.value = {
        ...((detail || {}) as CrmCustomerApi.Customer),
        companyType: (detail as any)?.companyType ?? props.fixedCompanyType,
      } as CrmCustomerApi.Customer;
      syncOwnerStaffValue(formData.value);
      syncRegionSelectionFromForm();
      const cid = (formData.value.rowid ?? formData.value.id) as any;

      await loadContacts(
        cid,
        String(formData.value.customerCode || '').trim(),
        String(formData.value.name || '').trim(),
        Number(formData.value.companyType || 0),
      );
      await loadInvoiceList(cid);
      await loadCapitalAccounts(cid);
      await loadAttachments(cid);
      draftAttachments.value = [];
      uploadKey.value++;
    } catch (error) {
      console.error('初始化编辑弹窗失败:', error);
      contacts.value = [];
      invoices.value = [];
      capitalAccounts.value = [];
      attachments.value = [];
      draftAttachments.value = [];
    }
  },
  { immediate: true },
);

async function handleSave() {
  const payload = { ...formData.value } as CrmCustomerApi.Customer;
  if (props.fixedCompanyType !== undefined && props.fixedCompanyType !== null) {
    payload.companyType = Number(props.fixedCompanyType);
    formData.value.companyType = Number(props.fixedCompanyType);
  }

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

  syncPrimaryContactFields(payload);
  syncPrimaryContactFields(formData.value as any);

  try {
    const isUpdate = !!(
      props.customerData &&
      (props.customerData.id || props.customerData.rowid)
    );

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

    const latestCustomerName = String(payload.name || '').trim();
    const latestCustomerCode = String(
      formData.value.customerCode || payload.customerCode || '',
    ).trim();
    const cid = (formData.value.rowid ?? formData.value.id) as any;

    for (const item of contacts.value || []) {
      const contactPayload: CrmCustomerApi.Contact = {
        ...item,
        id: item.id || buildUUID(),
        contactName: String(item.contactName || '').trim(),
        gender: item.gender,
        mobile: normalizeMobileInput(String(item.mobile || '')),
        remark: String(item.remark || '').trim(),
        customerId: cid,
        customerName: latestCustomerName,
        customerCode: latestCustomerCode,
        companyType: Number(formData.value.companyType || 0),
        isPrimary: Number((item as any).isPrimary || 0),
      };
      await (item.id
        ? updateCustomerContact(contactPayload)
        : createCustomerContact(contactPayload));
    }

    const draftAccounts = (capitalAccounts.value || []).filter(
      (it: any) => !it?.rowid,
    );
    const draftInvoices = (invoices.value || []).filter(
      (it: any) => !it?.rowid,
    );

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
            owner_type: resolvedAttachmentOwnerType.value,
            pid: cid,
          }),
        ),
      );
      draftAttachments.value = [];
    }

    await loadContacts(
      cid,
      latestCustomerCode,
      latestCustomerName,
      Number(formData.value.companyType || 0),
    );
    if (cid) {
      await loadInvoiceList(cid);
      await loadCapitalAccounts(cid);
      await loadAttachments(cid);
    }

    ElMessage.success('保存成功');
    emit('saveSuccess', (formData.value.rowid ?? formData.value.id) as any);
  } catch (error) {
    console.error('保存失败:', error);
  }
}

function handleCancel() {
  emit('close');
}
</script>

<template>
  <div class="px-4" :class="{ 'readonly-panel': isReadonly }">
    <div class="supplier-form-actions">
      <ElButton @click="handleCancel">
        {{ isReadonly ? '关闭' : '取消' }}
      </ElButton>
      <ElButton v-if="!isReadonly" type="primary" @click="handleSave">
        保存
      </ElButton>
    </div>

    <div class="mb-6 grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="mb-1 block text-sm font-medium">
          <span class="mr-1" style="color: var(--el-color-danger)">*</span>
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
        <label class="mb-1 block text-sm font-medium">编号</label>
        <ElInput
          v-model="formData.customerCode"
          placeholder="系统自动生成"
          suffix="自动生成"
          disabled
        />
      </div>
      <div></div>

      <div class="col-span-2">
        <label class="mb-1 block text-sm font-medium">公司电话</label>
        <ElInput
          v-model="formData.telephone"
          placeholder="请输入公司电话"
          class="w-full"
          :disabled="isReadonly || !canEditField('contact_phone')"
          @input="handleTelephoneInput"
        />
      </div>

      <div class="col-span-2">
        <label class="mb-1 block text-sm font-medium">地区</label>
        <ElCascader
          v-model="regionSelection"
          :options="areaTreeOptions"
          :props="{
            checkStrictly: false,
            emitPath: true,
            value: 'value',
            label: 'label',
            children: 'children',
          }"
          clearable
          filterable
          placeholder="请选择省/市/区"
          class="w-full"
          :disabled="isReadonly || !canEditField('region')"
          @change="handleRegionChange"
        />
      </div>

      <div class="col-span-2">
        <label class="mb-1 block text-sm font-medium">地址</label>
        <ElInput
          v-model="formData.detailAddress"
          placeholder="请输入地址"
          class="w-full"
          :disabled="isReadonly || !canEditField('address')"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium">
          <span class="mr-1" style="color: var(--el-color-danger)">*</span>
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
        <label class="mb-1 block text-sm font-medium">归属部门</label>
        <ElInput
          v-model="formData.departName"
          placeholder="请输入归属部门"
          class="w-full"
          :disabled="isReadonly || !canEditField('depart_name')"
        />
      </div>

      <div class="col-span-2">
        <label class="mb-1 block text-sm font-medium">备注</label>
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
        <ElCheckbox
          v-model="formData.isCommonUsed"
          :true-label="1"
          :false-label="0"
          :disabled="isReadonly"
        >
          常用
        </ElCheckbox>
      </div>
    </div>

    <h4>联系人</h4>
    <ElTable
      v-if="contacts.length > 0"
      :data="contacts"
      style="width: 100%"
      size="small"
    >
      <ElTableColumn prop="contactName" label="姓名" min-width="140" />
      <ElTableColumn label="性别" min-width="100">
        <template #default="{ row }">
          {{ formatGender(row.gender) || '-' }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="mobile" label="手机号" min-width="140" />
      <ElTableColumn
        prop="remark"
        label="备注"
        min-width="200"
        show-overflow-tooltip
      />
      <ElTableColumn label="操作" width="140" fixed="right">
        <template #default="{ row, $index }">
          <ElLink
            v-if="!isReadonly"
            type="primary"
            @click="openEditContactDialog(row, $index)"
          >
            编辑
          </ElLink>
          <ElLink
            v-if="!isReadonly"
            class="ml-2"
            type="danger"
            @click="handleDeleteContact(row, $index)"
          >
            删除
          </ElLink>
        </template>
      </ElTableColumn>
    </ElTable>
    <div v-else class="py-8" style="color: #999; text-align: center">
      暂无数据
    </div>
    <ElLink v-if="!isReadonly" type="primary" @click="openAddContactDialog">
      新增联系人
    </ElLink>
    <ElDivider />

    <h4>账号信息</h4>
    <ElTable
      v-if="capitalAccounts.length > 0"
      :data="capitalAccounts"
      style="width: 100%"
      size="small"
    >
      <ElTableColumn prop="account_type" label="账号类型" min-width="160" />
      <ElTableColumn prop="OpeningBank" label="开户行" min-width="160" />
      <ElTableColumn prop="account_name" label="对方户名" min-width="160" />
      <ElTableColumn prop="account_id" label="账号" min-width="180" />
      <ElTableColumn label="操作" width="140" fixed="right">
        <template #default="{ row, $index }">
          <ElLink
            v-if="!isReadonly"
            type="primary"
            @click="openEditAccountDialog(row, $index)"
          >
            编辑
          </ElLink>
          <ElLink
            v-if="!isReadonly"
            class="ml-2"
            type="danger"
            @click="handleDeleteAccount(row, $index)"
          >
            删除
          </ElLink>
        </template>
      </ElTableColumn>
    </ElTable>
    <div v-else class="py-8" style="color: #999; text-align: center">
      暂无数据
    </div>
    <ElLink v-if="!isReadonly" type="primary" @click="openAddAccountDialog">
      新增账号信息
    </ElLink>
    <ElDivider />

    <h4>发票信息</h4>
    <ElTable
      v-if="invoices.length > 0"
      :data="invoices"
      style="width: 100%"
      size="small"
    >
      <ElTableColumn prop="invoiceTitle" label="抬头" min-width="160" />
      <ElTableColumn prop="taxNumber" label="税号" min-width="140" />
      <ElTableColumn prop="bankName" label="开户行" min-width="160" />
      <ElTableColumn
        prop="address"
        label="地址"
        min-width="180"
        show-overflow-tooltip
      />
      <ElTableColumn prop="phone" label="电话" min-width="140" />
      <ElTableColumn prop="bankAccount" label="账号" min-width="180" />
      <ElTableColumn label="操作" width="140" fixed="right">
        <template #default="{ row, $index }">
          <ElLink
            v-if="!isReadonly"
            type="primary"
            @click="openEditInvoiceDialog(row, $index)"
          >
            编辑
          </ElLink>
          <ElLink
            v-if="!isReadonly"
            class="ml-2"
            type="danger"
            @click="handleDeleteInvoice(row, $index)"
          >
            删除
          </ElLink>
        </template>
      </ElTableColumn>
    </ElTable>
    <div v-else class="py-8" style="color: #999; text-align: center">
      暂无数据
    </div>
    <ElLink v-if="!isReadonly" type="primary" @click="openAddInvoiceDialog">
      新增发票信息
    </ElLink>
    <ElDivider />

    <h4>附件</h4>
    <ElTable
      v-if="attachments.length > 0"
      :data="attachments"
      style="width: 100%"
      size="small"
    >
      <ElTableColumn
        prop="file_name"
        label="文件名"
        min-width="220"
        show-overflow-tooltip
      />
      <ElTableColumn label="文件大小" min-width="120">
        <template #default="{ row }">
          {{ row.file_size ? `${(row.file_size / 1024).toFixed(1)} KB` : '-' }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
      <ElTableColumn label="操作" width="140" fixed="right">
        <template #default="{ row, $index }">
          <ElLink type="primary" @click="handleDownloadAttachment(row)">
            下载
          </ElLink>
          <ElLink
            v-if="!isReadonly"
            class="ml-2"
            type="danger"
            @click="handleDeleteAttachment(row, $index)"
          >
            删除
          </ElLink>
        </template>
      </ElTableColumn>
    </ElTable>
    <div v-else class="py-8" style="color: #999; text-align: center">
      暂无附件
    </div>
    <div v-if="!isReadonly" class="mt-2">
      <FileUpload
        :key="uploadKey"
        :model-value="[]"
        :api="uploadCustomerAttachment"
        :limit="50"
        :file-size="100"
        :file-type="[
          'doc',
          'docx',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
          'pdf',
          'txt',
          'png',
          'jpg',
          'jpeg',
          'gif',
          'bmp',
          'zip',
          'rar',
          '7z',
        ]"
        :is-show-tip="false"
        @success="handleAttachmentUploadSuccess"
      />
      <span style="font-size: 12px; color: #999">
        你可以上传 50 个附件，每个最大 100MB
      </span>
    </div>
  </div>

  <ElDialog
    v-model="contactDialogVisible"
    :title="contactDialogTitle"
    width="520px"
  >
    <ElForm :model="contactForm" label-width="100px">
      <ElFormItem label="姓名" required>
        <ElInput
          v-model="contactForm.contactName"
          placeholder="请输入联系人姓名"
        />
      </ElFormItem>
      <ElFormItem label="性别">
        <ElSelect
          v-model="contactForm.gender"
          clearable
          placeholder="请选择性别"
          class="w-full"
        >
          <ElOption label="男" :value="1" />
          <ElOption label="女" :value="2" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="手机号">
        <ElInput v-model="contactForm.mobile" placeholder="请输入手机号" />
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput
          v-model="contactForm.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="contactDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="saveContact">保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    v-model="accountDialogVisible"
    :title="accountDialogTitle"
    width="520px"
  >
    <ElForm :model="accountForm" label-width="100px">
      <ElFormItem label="账号类型">
        <ElSelect v-model="accountForm.accountType" class="w-full">
          <ElOption label="微信" value="微信" />
          <ElOption label="支付宝" value="支付宝" />
          <ElOption label="银行" value="银行" />
          <ElOption label="其他" value="其他" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="开户行">
        <ElInput v-model="accountForm.openingBank" placeholder="请输入开户行" />
      </ElFormItem>
      <ElFormItem label="对方户名">
        <ElInput
          v-model="accountForm.accountName"
          placeholder="请输入对方户名"
        />
      </ElFormItem>
      <ElFormItem label="账号">
        <ElInput v-model="accountForm.accountId" placeholder="请输入账号" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="accountDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="saveAccount">保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    v-model="invoiceDialogVisible"
    :title="invoiceDialogTitle"
    width="560px"
  >
    <ElForm :model="invoiceForm" label-width="100px">
      <ElFormItem label="抬头" required>
        <ElInput v-model="invoiceForm.invoiceTitle" placeholder="请输入抬头" />
      </ElFormItem>
      <ElFormItem label="税号" required>
        <ElInput v-model="invoiceForm.taxNumber" placeholder="请输入税号" />
      </ElFormItem>
      <ElFormItem label="开户行">
        <div class="flex w-full gap-2">
          <ElSelect
            v-model="invoiceForm.bankName"
            class="flex-1"
            :disabled="bankAccountOptions.length === 0"
            :placeholder="
              bankAccountOptions.length > 0
                ? '请选择开户行'
                : '请先新增银行信息'
            "
            @change="handleInvoiceBankChange"
          >
            <ElOption
              v-for="item in bankAccountOptions"
              :key="item.rowid || item.account_id || item.OpeningBank"
              :label="item.OpeningBank"
              :value="item.OpeningBank"
            />
          </ElSelect>
          <ElButton type="primary" link @click="openAddAccountDialog">
            新增银行信息
          </ElButton>
        </div>
      </ElFormItem>
      <ElFormItem label="地址">
        <ElInput v-model="invoiceForm.address" placeholder="请输入地址" />
      </ElFormItem>
      <ElFormItem label="电话">
        <ElInput v-model="invoiceForm.phone" placeholder="请输入电话" />
      </ElFormItem>
      <ElFormItem label="账号">
        <ElInput v-model="invoiceForm.bankAccount" placeholder="请输入账号" />
      </ElFormItem>
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

.grid {
  width: 100%;
}

.supplier-form-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 0;
  background: #fff;
}

.readonly-panel :deep(.el-input__wrapper),
.readonly-panel :deep(.el-textarea__inner),
.readonly-panel :deep(.el-cascader .el-input__wrapper),
.readonly-panel :deep(.el-select .el-input__wrapper),
.readonly-panel :deep(.el-checkbox__inner) {
  background-color: var(--el-fill-color-light);
}
</style>
