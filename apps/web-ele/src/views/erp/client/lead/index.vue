<script lang="ts" setup>
import type { AreaOption } from './data';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerLeadApi } from '#/api/erp/customer/lead';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElDialog, ElMessage, ElTabPane, ElTabs } from 'element-plus';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  convertLead,
  getLeadPage,
  invalidateLead,
} from '#/api/erp/customer/lead';
import { putCustomersToPool } from '#/api/erp/customer/pool';
import FollowRecordForm from '#/views/erp/customer/detail/modules/follow-record-form.vue';

import { useGridColumns, useGridFormSchema } from './data';
import LeadCenterView from './detail/modules/lead-center-view.vue';
import Form from './modules/form.vue';

const PUBLIC_REGION_DATA_URL =
  'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_customer_region_data_cache_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);

const dataTable = ref<any>(null);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const quickFollowVisible = ref(false);
const currentFormRow = ref<CrmCustomerLeadApi.Lead | null>(null);
const currentLeadId = ref<null | number | string>(null);
const currentQuickFollowLead = ref<CrmCustomerLeadApi.Lead | null>(null);
const quickFollowFormKey = ref(0);
const sceneType = ref<'pending' | 'tracking'>('tracking');
const areaTreeOptions = ref<AreaOption[]>([]);

const currentFormMode = computed(() => (currentFormRow.value ? 'edit' : 'add'));
const currentQuickFollowContext = computed(() => {
  const row = currentQuickFollowLead.value || {};
  return {
    bizId: String(row.rowid || row.id || '').trim(),
    bizCode: String(row.leadCode || '').trim(),
    bizName: String(row.leadName || '').trim(),
  };
});

function handleRefresh() {
  gridApi.query();
}

function handleSceneChange() {
  handleRefresh();
}

function handleCreate() {
  currentFormRow.value = null;
  dialogVisible.value = true;
}

function handleEdit(row: CrmCustomerLeadApi.Lead) {
  currentFormRow.value = row;
  dialogVisible.value = true;
}

function handleDetail(row: CrmCustomerLeadApi.Lead) {
  currentLeadId.value = String(row.rowid || row.id || '');
  detailVisible.value = true;
}

function openQuickFollow(row: CrmCustomerLeadApi.Lead) {
  currentQuickFollowLead.value = { ...row };
  quickFollowFormKey.value += 1;
  quickFollowVisible.value = true;
}

async function handlePutPool(row: CrmCustomerLeadApi.Lead) {
  await putCustomersToPool({
    ids: [String(row.rowid || row.id || '')],
    reason: '线索列表页丢入公海',
  });
  ElMessage.success('已丢入线索公海');
  handleRefresh();
}

async function handleInvalidate(row: CrmCustomerLeadApi.Lead) {
  await invalidateLead(String(row.rowid || row.id || ''));
  ElMessage.success('作废成功');
  handleRefresh();
}

async function handleConvert(row: CrmCustomerLeadApi.Lead) {
  const result = await convertLead({ id: String(row.rowid || row.id || '') });
  ElMessage.success(`转客户成功：${result.customerCode || '-'}`);
  handleRefresh();
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentFormRow.value = null;
}

function handleSaveSuccess() {
  dialogVisible.value = false;
  currentFormRow.value = null;
  handleRefresh();
}

function handleQuickFollowSaved() {
  quickFollowVisible.value = false;
  currentQuickFollowLead.value = null;
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
          const response = await getLeadPage({
            index: page.currentPage,
            size: page.page,
            leadStatus: 1,
            isPool: 0,
            pendingFollow: sceneType.value === 'pending' ? 1 : 0,
            ...formValues,
            regionCodePrefix: normalizeRegionCodePrefix(
              (formValues as any).regionCode,
            ),
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
  } as VxeTableGridOptions<CrmCustomerLeadApi.Lead>,
});

onMounted(() => {
  loadAreaTreeOptions();
});
</script>

<template>
  <Page auto-content-height>
    <ElTabs v-model="sceneType" class="mb-4" @tab-change="handleSceneChange">
      <ElTabPane label="已跟进" name="tracking" />
      <ElTabPane label="待跟进" name="pending" />
    </ElTabs>

    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增线索',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !(
                dataTable &&
                dataTable.allowAddData &&
                dataTable.allowAddData()
              ),
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #name="{ row }">
        <ElButton type="primary" link @click="handleDetail(row)">
          {{ row.leadName || '-' }}
        </ElButton>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '查看详情',
              type: 'primary',
              link: true,
              onClick: () => handleDetail(row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: () => handleEdit(row),
            },
            {
              label: '新建跟进记录',
              type: 'primary',
              link: true,
              onClick: () => openQuickFollow(row),
            },
            {
              label: '丢入公海',
              type: 'primary',
              link: true,
              onClick: () => handlePutPool(row),
            },
            {
              label: '转客户',
              type: 'success',
              link: true,
              onClick: () => handleConvert(row),
            },
            {
              label: '作废',
              type: 'danger',
              link: true,
              onClick: () => handleInvalidate(row),
            },
          ]"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="dialogVisible"
      :title="currentFormRow ? '编辑线索' : '新增线索'"
      width="70%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 80vh; overflow-y: auto">
        <Form
          :lead-data="currentFormRow"
          :mode="currentFormMode"
          @close="handleCloseDialog"
          @save-success="handleSaveSuccess"
        />
      </div>
    </ElDialog>

    <ElDialog
      v-model="detailVisible"
      title="线索详情"
      width="90%"
      top="3vh"
      destroy-on-close
    >
      <div style="max-height: 86vh; overflow-y: auto">
        <LeadCenterView
          :lead-id="currentLeadId"
          @close="detailVisible = false"
          @saved="handleRefresh"
        />
      </div>
    </ElDialog>

    <ElDialog
      v-model="quickFollowVisible"
      title="新建线索跟进"
      width="520px"
      destroy-on-close
    >
      <FollowRecordForm
        :key="quickFollowFormKey"
        biz-type="LEAD"
        :biz-id="currentQuickFollowContext.bizId"
        :biz-code="currentQuickFollowContext.bizCode"
        :biz-name="currentQuickFollowContext.bizName"
        @close="quickFollowVisible = false"
        @save-success="handleQuickFollowSaved"
      />
    </ElDialog>
  </Page>
</template>
