<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { CrmCustomerLeadApi } from '#/api/erp/customer/lead';

import { computed, onMounted, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';
import { buildUUID } from '@vben/utils';

import {
  ElButton,
  ElCascader,
  ElCol,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
} from 'element-plus';

import {
  checkLeadDuplicate,
  createLeadWithAutoCode,
  updateLead,
} from '#/api/erp/customer/lead';
import { getCurrentUserBoundDeptInfo } from '#/api/system/dept';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import {
  intentLevelOptions,
  leadStatusOptions,
  sourceChannelOptions,
} from '../data';

interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

interface CurrentOwnerDefaultInfo {
  ownerUserId: string;
  ownerUserName: string;
  departId: string;
  departName: string;
}

const props = withDefaults(
  defineProps<{
    leadData?: CrmCustomerLeadApi.Lead | null;
    mode?: 'add' | 'detail' | 'edit';
  }>(),
  {
    leadData: null,
    mode: 'add',
  },
);
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saveSuccess'): void;
}>();
const PUBLIC_REGION_DATA_URL =
  'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_lead_region_data_cache_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);
let memoryRegionCache: any[] = [];

const userStore = useUserStore();
const formData = ref<CrmCustomerLeadApi.Lead>({} as CrmCustomerLeadApi.Lead);
const regionSelection = ref<string[]>([]);
const areaTreeOptions = ref<AreaOption[]>([]);
const currentOwnerDefault = ref<CurrentOwnerDefaultInfo>({
  ownerUserId: '',
  ownerUserName: '',
  departId: '',
  departName: '',
});

const isEditMode = computed(
  () => !!String(formData.value.rowid || formData.value.id || '').trim(),
);
const isConverted = computed(
  () => Number(formData.value.leadStatus || 0) === 2,
);
const isDetailMode = computed(() => props.mode === 'detail');
const isReadonly = computed(() => isDetailMode.value || isConverted.value);

function getCurrentUserInfo() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    ownerUserId: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    ownerUserName: String(
      info.nickname || raw.UserName || raw.userName || info.username || '',
    ).trim(),
  };
}

function formatTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultFormData(): CrmCustomerLeadApi.Lead {
  return {
    companyType: 1,
    leadStatus: 1,
    intentLevel: 2,
    sourceChannel: '',
    leadCode: '',
    leadName: '',
    customerName: '',
    contactName: '',
    mobile: '',
    phone: '',
    email: '',
    address: '',
    region: '',
    regionCode: '',
    ownerUserId: currentOwnerDefault.value.ownerUserId,
    ownerUserName: currentOwnerDefault.value.ownerUserName,
    departId: currentOwnerDefault.value.departId,
    departName: currentOwnerDefault.value.departName,
    nextFollowTime: formatTodayDate(),
    lastFollowContent: '',
    description: '',
  };
}

function applyLeadFormData(data?: CrmCustomerLeadApi.Lead | null) {
  formData.value = {
    ...buildDefaultFormData(),
    ...data,
    nextFollowTime:
      normalizeDateText((data as any)?.nextFollowTime) || formatTodayDate(),
  };
  syncRegionSelectionFromForm();
}

async function loadCurrentOwnerDefault() {
  const currentUser = getCurrentUserInfo();
  try {
    const deptInfo = await getCurrentUserBoundDeptInfo();
    currentOwnerDefault.value = {
      ownerUserId: currentUser.ownerUserId,
      ownerUserName: currentUser.ownerUserName,
      departId: String(deptInfo.deptId || '').trim(),
      departName: String(deptInfo.deptName || '').trim(),
    };
  } catch (error) {
    console.error('加载当前登录人默认归属失败:', error);
    currentOwnerDefault.value = {
      ownerUserId: currentUser.ownerUserId,
      ownerUserName: currentUser.ownerUserName,
      departId: '',
      departName: '',
    };
  }

  if (!props.leadData && props.mode === 'add') {
    applyLeadFormData(null);
  }
}

function clearOwnerRelatedFields() {
  formData.value.ownerUserId = '';
  formData.value.ownerUserName = '';
  formData.value.departId = '';
  formData.value.departName = '';
}

function handleOwnerModelValueChange(value?: null | number | string) {
  const nextValue = String(value || '').trim();
  if (!nextValue) {
    clearOwnerRelatedFields();
    return;
  }
  formData.value.ownerUserId = nextValue;
}

function handleOwnerPicked(staff?: Staff | Staff[]) {
  const row = Array.isArray(staff) ? staff[0] : staff;
  if (!row) {
    clearOwnerRelatedFields();
    return;
  }
  formData.value.ownerUserId = String(row.ROWID || '').trim();
  formData.value.ownerUserName = String(row.UserName || '').trim();
  formData.value.departId = String(row.DepartmentId || row.DepID || '').trim();
  formData.value.departName = String(
    row.DepartmentName || row.DepName || '',
  ).trim();
}

function normalizeMobile(value?: string) {
  return String(value || '')
    .replaceAll(/\D/g, '')
    .slice(0, 11);
}

function normalizeDateText(value?: null | string) {
  const text = String(value || '').trim();
  return text || undefined;
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
  if (memoryRegionCache.length > 0) {
    return memoryRegionCache;
  }
  try {
    const raw = window.localStorage.getItem(REGION_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed) ? parsed : [];
    if (data.length > 0) {
      memoryRegionCache = data;
    }
    return data;
  } catch {
    return [];
  }
}

function setCachedRegionData(data: any[]) {
  memoryRegionCache = Array.isArray(data) ? data : [];
  try {
    window.localStorage.setItem(
      REGION_CACHE_KEY,
      JSON.stringify(memoryRegionCache),
    );
  } catch {
    // 忽略 localStorage 容量不足，保留内存缓存即可
  }
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

function normalizePayload() {
  return {
    ...formData.value,
    leadName: String(formData.value.leadName || '').trim(),
    customerName: String(formData.value.customerName || '').trim(),
    contactName: String(formData.value.contactName || '').trim(),
    mobile: normalizeMobile(formData.value.mobile),
    phone: String(formData.value.phone || '').trim(),
    email: String(formData.value.email || '').trim(),
    address: String(formData.value.address || '').trim(),
    region: String(formData.value.region || '').trim(),
    regionCode: String(formData.value.regionCode || '').trim(),
    sourceChannel: String(formData.value.sourceChannel || '').trim(),
    ownerUserId: String(formData.value.ownerUserId || '').trim(),
    ownerUserName: String(formData.value.ownerUserName || '').trim(),
    departId: String(formData.value.departId || '').trim(),
    departName: String(formData.value.departName || '').trim(),
    nextFollowTime: normalizeDateText(formData.value.nextFollowTime),
    lastFollowContent: String(formData.value.lastFollowContent || '').trim(),
    description: String(formData.value.description || '').trim(),
    companyType: 1,
  } satisfies CrmCustomerLeadApi.Lead;
}

function getErrorMessage(error: any) {
  return String(
    error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.Message ||
      error?.response?.data?.msg ||
      '操作失败',
  );
}

async function handleSave() {
  const payload = normalizePayload();

  if (!payload.leadName) return ElMessage.warning('请输入线索名称');
  if (!payload.mobile) return ElMessage.warning('请输入手机号');
  if (!/^1\d{10}$/.test(payload.mobile))
    return ElMessage.warning('请输入正确的11位手机号');
  if (!payload.sourceChannel) return ElMessage.warning('请选择客户来源');
  if (!payload.ownerUserId || !payload.ownerUserName)
    return ElMessage.warning('请选择负责人');

  try {
    const duplicate = await checkLeadDuplicate(payload);
    if (duplicate.hasDuplicate) {
      await ElMessageBox.confirm(duplicate.message, '查重提示', {
        type: 'warning',
        confirmButtonText: '继续保存',
        cancelButtonText: '取消',
      });
    }

    if (payload.rowid || payload.id) {
      await updateLead(payload);
      ElMessage.success('修改线索成功');
    } else {
      payload.rowid = buildUUID();
      payload.id = payload.rowid;
      await createLeadWithAutoCode(payload);
      ElMessage.success('新增线索成功');
    }
    emit('saveSuccess');
  } catch (error: any) {
    ElMessage.error(getErrorMessage(error));
  }
}

onMounted(async () => {
  await Promise.all([loadAreaTreeOptions(), loadCurrentOwnerDefault()]);
  syncRegionSelectionFromForm();
});

watch(
  () => [props.leadData, props.mode],
  ([data]) => {
    applyLeadFormData(data as CrmCustomerLeadApi.Lead | null | undefined);
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="lead-form-wrapper">
    <div v-if="!isDetailMode" class="lead-form-actions">
      <ElButton @click="emit('close')">取消</ElButton>
      <ElButton v-if="!isConverted" type="primary" @click="handleSave">
        保存
      </ElButton>
    </div>

    <ElForm :model="formData" label-width="96px" class="lead-form">
      <ElRow :gutter="36">
        <ElCol :span="12">
          <ElFormItem label="线索名称" required>
            <ElInput
              v-model="formData.leadName"
              :disabled="isReadonly"
              placeholder="请输入线索名称"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="客户来源" required>
            <ElSelect
              v-model="formData.sourceChannel"
              :disabled="isReadonly"
              placeholder="请选择客户来源"
              class="w-full"
              clearable
            >
              <ElOption
                v-for="item in sourceChannelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>

        <ElCol :span="12">
          <ElFormItem label="客户名称">
            <ElInput
              v-model="formData.customerName"
              :disabled="isReadonly"
              placeholder="可选，不填时转客户默认沿用线索名称"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="手机" required>
            <ElInput
              v-model="formData.mobile"
              :disabled="isReadonly"
              placeholder="请输入手机号"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :span="12">
          <ElFormItem label="负责人" required>
            <StaffPicker
              :model-value="formData.ownerUserId"
              :disabled="isReadonly"
              placeholder="请选择负责人"
              @update:model-value="handleOwnerModelValueChange"
              @update:data="handleOwnerPicked"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="电话">
            <ElInput
              v-model="formData.phone"
              :disabled="isReadonly"
              placeholder="请输入电话"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :span="12">
          <ElFormItem label="邮箱">
            <ElInput
              v-model="formData.email"
              :disabled="isReadonly"
              placeholder="请输入邮箱"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="联系人">
            <ElInput
              v-model="formData.contactName"
              :disabled="isReadonly"
              placeholder="请输入联系人"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :span="12">
          <ElFormItem label="线索状态">
            <ElSelect
              v-model="formData.leadStatus"
              :disabled="isReadonly"
              class="w-full"
              clearable
              placeholder="请选择线索状态"
            >
              <ElOption
                v-for="item in leadStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="客户级别">
            <ElSelect
              v-model="formData.intentLevel"
              :disabled="isReadonly"
              class="w-full"
              clearable
              placeholder="请选择客户级别"
            >
              <ElOption
                v-for="item in intentLevelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="归属部门">
            <ElInput
              v-model="formData.departName"
              :disabled="isReadonly"
              readonly
              placeholder="负责人确定后自动带出"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :span="12">
          <ElFormItem label="地址">
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
              placeholder="请选择地址"
              class="w-full"
              :disabled="isReadonly"
              @change="handleRegionChange"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="详细地址">
            <ElInput
              v-model="formData.address"
              :disabled="isReadonly"
              placeholder="请输入详细地址"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :span="12">
          <ElFormItem label="下次联系时间">
            <ElDatePicker
              v-model="formData.nextFollowTime"
              :disabled="isReadonly"
              class="w-full"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择下次联系时间"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="备注">
            <ElInput
              v-model="formData.description"
              :disabled="isReadonly"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
            />
          </ElFormItem>
        </ElCol>

        <ElCol v-if="isEditMode || isDetailMode" :span="12">
          <ElFormItem label="线索编号">
            <ElInput
              v-model="formData.leadCode"
              disabled
              placeholder="保存后自动生成"
            />
          </ElFormItem>
        </ElCol>
        <ElCol v-if="isDetailMode" :span="12">
          <ElFormItem label="转化客户">
            <ElInput
              :model-value="
                [formData.customerCode, formData.customerName]
                  .filter(Boolean)
                  .join(' / ')
              "
              disabled
              placeholder="未转化"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>
  </div>
</template>

<style scoped>
.lead-form-wrapper {
  position: relative;
  padding: 0 18px 6px;
}

.lead-form-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 0;
  padding-bottom: 12px;
  background: #fff;
}

.lead-form :deep(.el-form-item) {
  margin-bottom: 26px;
}

.lead-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
}

.lead-form :deep(.el-input),
.lead-form :deep(.el-select),
.lead-form :deep(.el-cascader) {
  width: 100%;
}

.lead-form :deep(.el-input__wrapper),
.lead-form :deep(.el-textarea__inner),
.lead-form :deep(.el-cascader .el-input__wrapper),
.lead-form :deep(.el-select .el-input__wrapper),
.lead-form :deep(.el-select__wrapper) {
  min-height: 42px;
  border-radius: 10px;
}
</style>
