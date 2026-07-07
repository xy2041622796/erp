<script lang="ts" setup>
import type { AreaOption } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { ElButton, ElDialog, ElLoading, ElMessage } from 'element-plus';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCustomer,
  exportCustomer,
  getCustomerPage,
} from '#/api/erp/customer';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import SupplierForm from './modules/form.vue';

const PUBLIC_REGION_DATA_URL =
  'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_customer_region_data_cache_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);

const dataTable = ref<any>(null);
const dialogVisible = ref(false);
const currentSupplier = ref<CrmCustomerApi.Customer | null>(null);
const currentReadonly = ref(false);
const areaTreeOptions = ref<AreaOption[]>([]);

function checkEditPermission(rowId: number | string) {
  return !!dataTable.value?.allowEditRow?.(rowId);
}

function checkDeletePermission(rowId: number | string) {
  return !!dataTable.value?.allowDeleteRow?.(rowId);
}

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const formValues = (gridApi.formApi?.getValues?.() || {}) as any;
  const createTimeRange = Array.isArray(formValues.createTime)
    ? formValues.createTime
    : [];
  const data = await exportCustomer({
    companyType: 2,
    includeAllStates: true,
    customerCode: formValues.customerCode,
    name: formValues.name,
    contactName: formValues.contactName,
    mobile: formValues.mobile,
    telephone: formValues.telephone,
    ownerUserName: formValues.ownerUserName,
    createTimeStart: createTimeRange[0],
    createTimeEnd: createTimeRange[1],
  });
  downloadFileFromBlobPart({ fileName: '供应商档案.xls', source: data });
}

function handleCreate() {
  currentSupplier.value = { companyType: 2 } as CrmCustomerApi.Customer;
  currentReadonly.value = false;
  dialogVisible.value = true;
}

function handleEdit(row: CrmCustomerApi.Customer) {
  currentSupplier.value = { ...row, companyType: 2 } as CrmCustomerApi.Customer;
  currentReadonly.value = false;
  dialogVisible.value = true;
}

function handleNameClick(row: CrmCustomerApi.Customer) {
  if (!checkEditPermission(row.id as any))
    return ElMessage.warning('暂无编辑权限');
  handleEdit(row);
}

async function handleDelete(row: CrmCustomerApi.Customer) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.name]),
  });
  try {
    await deleteCustomer(row.id as any);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } catch (error) {
    console.error('删除供应商失败:', error);
    ElMessage.error('删除供应商失败');
  } finally {
    loadingInstance.close();
  }
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentSupplier.value = null;
  currentReadonly.value = false;
}

function handleSaved() {
  handleCloseDialog();
  handleRefresh();
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
  gridApi.formApi?.updateSchema?.(useGridFormSchema(areaTreeOptions.value));
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
    schema: useGridFormSchema(),
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
          const response = await getCustomerPage({
            index: page.currentPage,
            size: page.page,
            companyType: 2,
            includeAllStates: true,
            customerCode: (formValues as any).customerCode,
            name: (formValues as any).name,
            contactName: (formValues as any).contactName,
            mobile: (formValues as any).mobile,
            telephone: (formValues as any).telephone,
            regionCodePrefix: normalizeRegionCodePrefix(
              (formValues as any).regionCode,
            ),
            ownerUserName: (formValues as any).ownerUserName,
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
  } as VxeTableGridOptions<CrmCustomerApi.Customer>,
});

onMounted(() => {
  loadAreaTreeOptions();
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '供应商',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '新增供应商', placement: 'top' },
              disabled: !(
                dataTable &&
                dataTable.allowAddData &&
                dataTable.allowAddData()
              ),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出供应商数据为Excel文件', placement: 'top' },
              disabled: false,
              onClick: handleExport,
            },
          ]"
        />
      </template>

      <template #name="{ row }">
        <ElButton type="primary" link @click="handleNameClick(row)">
          {{ row.name }}
        </ElButton>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              disabled: !checkEditPermission(row.id),
              onClick: () => handleEdit(row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              disabled: !checkDeletePermission(row.id),
              popConfirm: {
                title: `确认删除供应商【${row.name}】吗？`,
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="dialogVisible"
      :title="
        currentSupplier?.id || currentSupplier?.rowid
          ? '编辑供应商'
          : '新增供应商'
      "
      width="70%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 80vh; overflow-y: auto">
        <SupplierForm
          :customer-data="currentSupplier"
          :readonly="currentReadonly"
          @close="handleCloseDialog"
          @save-success="handleSaved"
        />
      </div>
    </ElDialog>
  </Page>
</template>
