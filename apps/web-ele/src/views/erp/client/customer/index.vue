<script lang="ts" setup>
import type { AreaOption } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { CrmCustomerLeadApi } from '#/api/erp/customer/lead';
import type { CrmCustomerSubjectApi } from '#/api/erp/customer/subject';

import { computed, nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteCustomer } from '#/api/erp/customer';
import { convertLead, invalidateLead } from '#/api/erp/customer/lead';
import {
  putCustomersToPool,
  receivePoolCustomers,
} from '#/api/erp/customer/pool';
import { getCustomerSubjectPage } from '#/api/erp/customer/subject';
import { $t } from '#/locales';
import CustomerCenterView from '#/views/erp/customer/detail/modules/customer-center-view.vue';

import LeadCenterView from '../lead/detail/modules/lead-center-view.vue';
import LeadForm from '../lead/modules/form.vue';
import DistributeForm from '../pool/modules/distribute-form.vue';
import { useGridColumns, useGridFormSchema } from './data';

import {
  ElButton,
  ElDialog,
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

type SubjectTab = 'all' | 'customer' | 'lead' | 'lead_pool';

const PUBLIC_REGION_DATA_URL =
  'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_customer_region_data_cache_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);

const dataTable = ref<any>(null);
const activeSubjectType = ref<SubjectTab>('all');
const areaTreeOptions = ref<AreaOption[]>([]);

const customerDialogVisible = ref(false);
const currentCustomerId = ref<null | number | string>(null);

const leadDetailVisible = ref(false);
const currentLeadId = ref<null | number | string>(null);

const leadEditVisible = ref(false);
const currentLeadRow = ref<CrmCustomerLeadApi.Lead | null>(null);

const distributeDialogVisible = ref(false);
const distributeIds = ref<Array<number | string>>([]);

const currentLeadFormMode = computed(() =>
  currentLeadRow.value ? 'edit' : 'add',
);

function normalizeSubjectType(value?: null | string): SubjectTab {
  const normalized = String(value || '').trim();
  if (
    normalized === 'lead' ||
    normalized === 'lead_pool' ||
    normalized === 'customer'
  ) {
    return normalized;
  }
  return 'all';
}

function syncSubjectTypeToForm() {
  nextTick(() => {
    gridApi.formApi?.setValues?.({
      subjectType:
        activeSubjectType.value === 'all' ? undefined : activeSubjectType.value,
    });
  });
}

async function handleTabChange(name: number | string) {
  activeSubjectType.value = normalizeSubjectType(String(name || ''));
  syncSubjectTypeToForm();
  await nextTick();
  gridApi.query();
}

function handleRefresh() {
  gridApi.query();
}

function openCustomerDetail(
  row: CrmCustomerApi.Customer | CrmCustomerSubjectApi.SubjectRow,
) {
  currentCustomerId.value = (row.rowid || (row as any).id || '') as any;
  customerDialogVisible.value = true;
}

function openLeadDetail(
  row: CrmCustomerLeadApi.Lead | CrmCustomerSubjectApi.SubjectRow,
) {
  currentLeadId.value = String(row.rowid || (row as any).id || '').trim();
  leadDetailVisible.value = true;
}

function openLeadEdit(row: CrmCustomerSubjectApi.SubjectRow) {
  currentLeadRow.value = {
    rowid: String(row.rowid || '').trim(),
    id: String(row.rowid || '').trim(),
    leadCode: row.subjectCode,
    leadName: row.subjectName,
    contactName: row.contactName,
    mobile: row.mobile,
    phone: row.telephone,
    email: row.email,
    region: row.region,
    regionCode: row.regionCode,
    address: row.detailAddress,
    ownerUserId: row.ownerUserId,
    ownerUserName: row.ownerUserName,
    departId: row.departId,
    departName: row.departName,
    customerId:
      row.subjectType === 'customer'
        ? String(row.rowid || '').trim()
        : undefined,
    sourceChannel: '',
    leadStatus: row.leadStatus,
    isPool: row.isPool,
    companyType: row.companyType,
    description: row.remark,
  };
  leadEditVisible.value = true;
}

function handleNameClick(row: CrmCustomerSubjectApi.SubjectRow) {
  if (row.subjectType === 'customer') {
    openCustomerDetail(row);
    return;
  }
  openLeadDetail(row);
}

function checkPermissionByDataTable(
  methodName: 'allowDeleteRow' | 'allowEditRow',
  row: CrmCustomerSubjectApi.SubjectRow,
) {
  const checker = dataTable.value?.[methodName];
  if (typeof checker !== 'function') return true;
  const keys = [row.subjectId, row.rowid, row.originRowid, row.id]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  if (keys.length === 0) return true;
  let hasTrue = false;
  for (const key of keys) {
    try {
      const result = !!checker(key);
      if (result) {
        hasTrue = true;
        break;
      }
    } catch {}
  }
  return hasTrue;
}

function canEditCustomer(row: CrmCustomerSubjectApi.SubjectRow) {
  if (row.subjectType !== 'customer') return true;
  return checkPermissionByDataTable('allowEditRow', row);
}

function canDeleteCustomer(row: CrmCustomerSubjectApi.SubjectRow) {
  if (row.subjectType !== 'customer') return false;
  return checkPermissionByDataTable('allowDeleteRow', row);
}

async function handleDeleteCustomer(row: CrmCustomerSubjectApi.SubjectRow) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.subjectName || '-']),
  });
  try {
    await deleteCustomer(String(row.rowid || ''));
    ElMessage.success(
      $t('ui.actionMessage.deleteSuccess', [row.subjectName || '-']),
    );
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleConvertLead(row: CrmCustomerSubjectApi.SubjectRow) {
  const result = await convertLead({ id: String(row.rowid || '') });
  ElMessage.success(`转客户成功：${result.customerCode || '-'}`);
  handleRefresh();
}

async function handlePutPool(row: CrmCustomerSubjectApi.SubjectRow) {
  await putCustomersToPool({
    ids: [String(row.rowid || '')],
    reason: '客户管理统一列表页丢入公海',
  });
  ElMessage.success('已丢入线索公海');
  handleRefresh();
}

async function handleInvalidateLead(row: CrmCustomerSubjectApi.SubjectRow) {
  await invalidateLead(String(row.rowid || ''));
  ElMessage.success('作废成功');
  handleRefresh();
}

async function handleReceivePool(row: CrmCustomerSubjectApi.SubjectRow) {
  await ElMessageBox.confirm(
    `确认领取公海线索【${row.subjectName || '-'}】吗？`,
    '领取确认',
    {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    },
  );
  await receivePoolCustomers([String(row.rowid || '')]);
  ElMessage.success('领取成功');
  handleRefresh();
}

function openDistributeDialog(ids: Array<number | string>) {
  distributeIds.value = ids;
  distributeDialogVisible.value = true;
}

function handleDistributeSuccess() {
  distributeDialogVisible.value = false;
  distributeIds.value = [];
  handleRefresh();
}

function handleCloseCustomerDialog() {
  customerDialogVisible.value = false;
  currentCustomerId.value = null;
}

function handleCloseLeadDetailDialog() {
  leadDetailVisible.value = false;
  currentLeadId.value = null;
}

function handleCloseLeadEditDialog() {
  leadEditVisible.value = false;
  currentLeadRow.value = null;
}

function handleLeadSaved() {
  leadEditVisible.value = false;
  currentLeadRow.value = null;
  handleRefresh();
}

function handleCustomerSaved() {
  handleRefresh();
}

function buildRowActions(row: CrmCustomerSubjectApi.SubjectRow) {
  if (row.subjectType === 'lead') {
    return [
      {
        label: '查看详情',
        type: 'primary',
        link: true,
        icon: ACTION_ICON.PREVIEW,
        onClick: () => openLeadDetail(row),
      },
      {
        label: '编辑',
        type: 'primary',
        link: true,
        icon: ACTION_ICON.EDIT,
        onClick: () => openLeadEdit(row),
      },
      {
        label: '转客户',
        type: 'success',
        link: true,
        onClick: () => handleConvertLead(row),
      },
      {
        label: '丢入公海',
        type: 'primary',
        link: true,
        onClick: () => handlePutPool(row),
      },
      {
        label: '作废',
        type: 'danger',
        link: true,
        onClick: () => handleInvalidateLead(row),
      },
    ];
  }

  if (row.subjectType === 'lead_pool') {
    return [
      {
        label: '查看详情',
        type: 'primary',
        link: true,
        icon: ACTION_ICON.PREVIEW,
        onClick: () => openLeadDetail(row),
      },
      {
        label: '领取',
        type: 'primary',
        link: true,
        onClick: () => handleReceivePool(row),
      },
      {
        label: '分配',
        type: 'primary',
        link: true,
        onClick: () => openDistributeDialog([String(row.rowid || '')]),
      },
    ];
  }

  return [
    {
      label: '查看详情',
      type: 'primary',
      link: true,
      icon: ACTION_ICON.PREVIEW,
      onClick: () => openCustomerDetail(row),
    },
    {
      label: $t('common.edit'),
      type: 'primary',
      link: true,
      icon: ACTION_ICON.EDIT,
      disabled: !canEditCustomer(row),
      onClick: () => openCustomerDetail(row),
    },
    {
      label: $t('common.delete'),
      type: 'danger',
      link: true,
      icon: ACTION_ICON.DELETE,
      disabled: !canDeleteCustomer(row),
      popConfirm: {
        title: `确认删除客户【${row.subjectName || '-'}】吗？`,
        confirm: () => handleDeleteCustomer(row),
      },
    },
  ];
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
  } catch (error) {
    console.error('写入地区缓存失败:', error);
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
      if (!municipalityDistrictMap.has(provinceCode)) {
        municipalityDistrictMap.set(provinceCode, []);
      }
      municipalityDistrictMap.get(provinceCode)?.push(districtNode);
      continue;
    }

    const cityCode = `${code.slice(0, 4)}00`;
    if (!normalDistrictMap.has(cityCode)) normalDistrictMap.set(cityCode, []);
    normalDistrictMap.get(cityCode)?.push(districtNode);
  }

  const cityMap = new Map<string, AreaOption[]>();
  for (const item of normalCities) {
    const provinceCode = `${String(item?.code || '').slice(0, 2)}0000`;
    if (!cityMap.has(provinceCode)) cityMap.set(provinceCode, []);
    cityMap.get(provinceCode)?.push({
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

function normalizeRegionCodePrefix(value: unknown) {
  const codes = normalizeMunicipalityCodePath(
    Array.isArray(value)
      ? value
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 3)
      : [],
  );
  return codes.join('/');
}

function refreshRegionSchema() {
  gridApi.formApi?.updateSchema?.(
    useGridFormSchema({
      areaOptions: areaTreeOptions.value,
      onSubjectTypeChange: (value) => {
        activeSubjectType.value = normalizeSubjectType(value);
      },
    }),
  );
}

async function loadAreaTreeOptions() {
  const cachedData = getCachedRegionData();
  if (cachedData.length > 0) {
    areaTreeOptions.value = buildAreaTreeFromFlatData(cachedData);
    refreshRegionSchema();
  }

  try {
    const response = await fetch(PUBLIC_REGION_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      setCachedRegionData(list);
      areaTreeOptions.value = buildAreaTreeFromFlatData(list);
      refreshRegionSchema();
    }
  } catch (error) {
    console.error('加载地区选项失败:', error);
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema({
      onSubjectTypeChange: (value) => {
        activeSubjectType.value = normalizeSubjectType(value);
      },
    }),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const createTimeRange = Array.isArray((formValues as any).createTime)
            ? (formValues as any).createTime
            : [];
          const currentSubjectType = activeSubjectType.value;
          const response = await getCustomerSubjectPage({
            index: page.currentPage,
            size: page.page,
            subjectCode: (formValues as any).subjectCode,
            subjectName: (formValues as any).subjectName,
            contactName: (formValues as any).contactName,
            mobile: (formValues as any).mobile,
            telephone: (formValues as any).telephone,
            regionCodePrefix: normalizeRegionCodePrefix(
              (formValues as any).regionCode,
            ),
            ownerUserName: (formValues as any).ownerUserName,
            subjectType:
              currentSubjectType === 'all' ? undefined : currentSubjectType,
            createTimeStart: createTimeRange[0],
            createTimeEnd: createTimeRange[1],
          } as any);
          dataTable.value = response?.dataTable || null;
          return response;
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<CrmCustomerSubjectApi.SubjectRow>,
});

onMounted(() => {
  loadAreaTreeOptions();
});
</script>

<template>
  <Page auto-content-height>
    <ElTabs
      v-model="activeSubjectType"
      class="mb-4"
      @tab-change="handleTabChange"
    >
      <ElTabPane label="全部" name="all" />
      <ElTabPane label="线索" name="lead" />
      <ElTabPane label="公海" name="lead_pool" />
      <ElTabPane label="正式客户" name="customer" />
    </ElTabs>

    <Grid>
      <template #name="{ row }">
        <ElButton type="primary" link @click="handleNameClick(row)">
          {{ row.subjectName || '-' }}
        </ElButton>
      </template>
      <template #tag="{ row }">
        <ElTag
          :type="
            row.subjectType === 'customer'
              ? 'primary'
              : row.subjectType === 'lead_pool'
                ? 'warning'
                : 'success'
          "
          effect="plain"
        >
          {{ row.subjectTypeLabel || '-' }}
        </ElTag>
      </template>
      <template #actions="{ row }">
        <TableAction :actions="buildRowActions(row)" />
      </template>
    </Grid>

    <ElDialog
      v-model="customerDialogVisible"
      title="客户信息"
      width="90%"
      top="3vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 86vh; overflow-y: auto">
        <CustomerCenterView
          mode="dialog"
          :customer-id="currentCustomerId"
          :create-mode="false"
          @close="handleCloseCustomerDialog"
          @saved="handleCustomerSaved"
        />
      </div>
    </ElDialog>

    <ElDialog
      v-model="leadDetailVisible"
      title="线索详情"
      width="90%"
      top="3vh"
      destroy-on-close
    >
      <div style="max-height: 86vh; overflow-y: auto">
        <LeadCenterView
          :lead-id="currentLeadId"
          @close="handleCloseLeadDetailDialog"
          @saved="handleRefresh"
        />
      </div>
    </ElDialog>

    <ElDialog
      v-model="leadEditVisible"
      title="编辑线索"
      width="70%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 80vh; overflow-y: auto">
        <LeadForm
          :lead-data="currentLeadRow"
          :mode="currentLeadFormMode"
          @close="handleCloseLeadEditDialog"
          @save-success="handleLeadSaved"
        />
      </div>
    </ElDialog>

    <ElDialog
      v-model="distributeDialogVisible"
      title="分配公海线索"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <DistributeForm
        :ids="distributeIds"
        @close="distributeDialogVisible = false"
        @success="handleDistributeSuccess"
      />
    </ElDialog>
  </Page>
</template>
