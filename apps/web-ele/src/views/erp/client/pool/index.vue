<script lang="ts" setup>
import type { CrmCustomerPoolApi } from '#/api/erp/customer/pool';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import {
  exportPoolCustomers,
  getPoolCustomerPage,
  receivePoolCustomers,
} from '#/api/erp/customer/pool';
import { $t } from '#/locales';
import LeadCenterView from '#/views/erp/client/lead/detail/modules/lead-center-view.vue';

import {
  createDefaultPoolSearchForm,
  formatPoolDateTime,
  formatPoolDealStatus,
  poolTableColumns,
} from './data';
import DistributeForm from './modules/distribute-form.vue';
import LogModal from './modules/log-modal.vue';

import {
  ElButton,
  ElCascader,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

const PUBLIC_REGION_DATA_URL =
  'https://cdn.jsdelivr.net/npm/province-city-china@8.5.8/dist/data.json';
const REGION_CACHE_KEY = 'erp_customer_region_data_cache_v1';
const MUNICIPALITY_CODES = new Set(['110000', '120000', '310000', '500000']);

const loading = ref(false);
const currentPage = ref(1);
const page = ref(10);
const total = ref(0);
const tableData = ref<CrmCustomerPoolApi.PoolCustomer[]>([]);
const selectedRows = ref<CrmCustomerPoolApi.PoolCustomer[]>([]);
const searchForm = ref(createDefaultPoolSearchForm());
const dataTable = ref<any>(null);
const areaTreeOptions = ref<AreaOption[]>([]);

const distributeDialogVisible = ref(false);
const distributeIds = ref<Array<number | string>>([]);
const detailDialogVisible = ref(false);
const currentDetailLeadId = ref<null | number | string>(null);
const logDialogVisible = ref(false);
const currentLogCustomer = ref<CrmCustomerPoolApi.PoolCustomer | null>(null);

const selectedIds = computed(
  () =>
    selectedRows.value
      .map((item) => item.id || item.rowid || item.customerId)
      .filter(Boolean) as Array<number | string>,
);

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

async function loadAreaTreeOptions() {
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
    }
  } catch (error) {
    console.error('加载地区选项失败:', error);
  }
}

function buildSearchParams() {
  const poolTimeRange = searchForm.value.poolTimeRange || [];
  const lastFollowTimeRange = searchForm.value.lastFollowTimeRange || [];
  return {
    customerCode: String(searchForm.value.customerCode || '').trim(),
    customerName: String(searchForm.value.customerName || '').trim(),
    regionCodePrefix: normalizeRegionCodePrefix(searchForm.value.regionCode),
    ownerUserName: String(searchForm.value.ownerUserName || '').trim(),
    poolReason: String(searchForm.value.poolReason || '').trim(),
    poolTimeStart: poolTimeRange[0] || '',
    poolTimeEnd: poolTimeRange[1] || '',
    lastFollowTimeStart: lastFollowTimeRange[0] || '',
    lastFollowTimeEnd: lastFollowTimeRange[1] || '',
  };
}

async function loadTableData() {
  loading.value = true;
  try {
    const response = await getPoolCustomerPage({
      index: currentPage.value,
      size: page.value,
      ...buildSearchParams(),
    } as any);
    tableData.value = response?.list || [];
    total.value = response?.total || 0;
    dataTable.value = response?.dataTable || null;
    selectedRows.value = [];
  } catch (error) {
    console.error('加载公海客户失败:', error);
    ElMessage.error('加载公海客户失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadTableData();
}

function handleReset() {
  searchForm.value = createDefaultPoolSearchForm();
  currentPage.value = 1;
  loadTableData();
}

function handleSelectionChange(rows: CrmCustomerPoolApi.PoolCustomer[]) {
  selectedRows.value = rows;
}

function handleSizeChange(size: number) {
  page.value = size;
  currentPage.value = 1;
  loadTableData();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadTableData();
}

function canOperateRow(row: CrmCustomerPoolApi.PoolCustomer) {
  return Number(row.isPool || 0) === 1;
}

function handleDetail(row: CrmCustomerPoolApi.PoolCustomer) {
  currentDetailLeadId.value = (row.id ||
    row.rowid ||
    row.leadId ||
    row.customerId ||
    '') as any;
  detailDialogVisible.value = true;
}

function handleCloseDetailDialog() {
  detailDialogVisible.value = false;
  currentDetailLeadId.value = null;
}

function handleDetailSaved() {
  loadTableData();
}

async function handleExport() {
  const data = await exportPoolCustomers(buildSearchParams());
  downloadFileFromBlobPart({ fileName: '客户公海.xls', source: data });
}

async function handleReceive(ids: Array<number | string>, rowName?: string) {
  if (ids.length === 0) {
    ElMessage.warning('请选择需要领取的公海客户');
    return;
  }
  await ElMessageBox.confirm(
    rowName
      ? `确认领取客户【${rowName}】吗？`
      : `确认领取选中的 ${ids.length} 个公海客户吗？`,
    '领取确认',
    {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    },
  );
  const loadingInstance = ElLoading.service({ text: '领取中...' });
  try {
    await receivePoolCustomers(ids);
    ElMessage.success('领取成功');
    await loadTableData();
  } finally {
    loadingInstance.close();
  }
}

function handleBatchReceive() {
  handleReceive(selectedIds.value).catch(() => {});
}

function openDistributeDialog(ids: Array<number | string>) {
  if (ids.length === 0) {
    ElMessage.warning('请选择需要分配的公海客户');
    return;
  }
  distributeIds.value = ids;
  distributeDialogVisible.value = true;
}

function handleRowDistribute(row: CrmCustomerPoolApi.PoolCustomer) {
  openDistributeDialog(
    [row.id || row.rowid || row.customerId].filter(Boolean) as Array<
      number | string
    >,
  );
}

function handleBatchDistribute() {
  openDistributeDialog(selectedIds.value);
}

function handleDistributeSuccess() {
  distributeDialogVisible.value = false;
  loadTableData();
}

function handleViewLogs(row: CrmCustomerPoolApi.PoolCustomer) {
  currentLogCustomer.value = row;
  logDialogVisible.value = true;
}

function checkEditPermission(row: CrmCustomerPoolApi.PoolCustomer) {
  if (!dataTable.value?.allowEditRow) return true;
  return !!dataTable.value.allowEditRow(row.id as any);
}

onMounted(() => {
  loadAreaTreeOptions();
  loadTableData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="search-form-wrapper mb-4">
        <ElForm :model="searchForm" inline @submit.prevent="handleSearch">
          <ElFormItem label="客户编号">
            <ElInput
              v-model="searchForm.customerCode"
              clearable
              placeholder="请输入客户编号"
              style="width: 180px"
              @clear="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="客户名称">
            <ElInput
              v-model="searchForm.customerName"
              clearable
              placeholder="请输入客户名称"
              style="width: 180px"
              @clear="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="地区">
            <ElCascader
              v-model="searchForm.regionCode"
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
              style="width: 220px"
            />
          </ElFormItem>
          <ElFormItem label="原负责人">
            <ElInput
              v-model="searchForm.ownerUserName"
              clearable
              placeholder="请输入原负责人"
              style="width: 180px"
              @clear="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="公海原因">
            <ElInput
              v-model="searchForm.poolReason"
              clearable
              placeholder="请输入公海原因"
              style="width: 180px"
              @clear="handleSearch"
            />
          </ElFormItem>
          <ElFormItem label="进入公海时间">
            <ElDatePicker
              v-model="searchForm.poolTimeRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 280px"
            />
          </ElFormItem>
          <ElFormItem label="最近跟进时间">
            <ElDatePicker
              v-model="searchForm.lastFollowTimeRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 280px"
            />
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </ElFormItem>
        </ElForm>
      </div>

      <div class="toolbar-wrapper flex justify-end">
        <TableAction
          :actions="[
            {
              label: '批量领取',
              type: 'primary',
              icon: ACTION_ICON.EDIT,
              disabled: selectedIds.length === 0,
              onClick: handleBatchReceive,
            },
            {
              label: '批量分配',
              type: 'primary',
              icon: ACTION_ICON.EDIT,
              disabled: selectedIds.length === 0,
              onClick: handleBatchDistribute,
            },
            {
              label: $t('ui.actionTitle.export'),
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              onClick: handleExport,
            },
          ]"
        />
      </div>

      <ElTable
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" fixed="left" width="50" />
        <ElTableColumn type="index" label="序号" fixed="left" width="60" />
        <ElTableColumn
          v-for="column in poolTableColumns"
          :key="column.field"
          :prop="column.field"
          :label="column.label"
          :min-width="column.minWidth"
          :show-overflow-tooltip="column.slot !== 'customerName'"
        >
          <template #default="{ row }">
            <template v-if="column.slot === 'customerName'">
              <ElButton type="primary" link @click="handleDetail(row)">
                {{ row.customerName || '-' }}
              </ElButton>
            </template>
            <template v-else-if="column.slot === 'dealStatus'">
              {{ formatPoolDealStatus(row.dealStatus) }}
            </template>
            <template v-else-if="column.slot === 'datetime'">
              {{
                formatPoolDateTime(
                  row[column.field as keyof typeof row] as string,
                )
              }}
            </template>
            <template v-else>
              {{ row[column.field as keyof typeof row] || '-' }}
            </template>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" fixed="right" width="320">
          <template #default="{ row }">
            <TableAction
              :actions="[
                {
                  label: '领取',
                  type: 'primary',
                  link: true,
                  icon: ACTION_ICON.EDIT,
                  disabled: !canOperateRow(row),
                  onClick: () =>
                    handleReceive(
                      [row.id || row.rowid || row.customerId].filter(
                        Boolean,
                      ) as Array<number | string>,
                      row.customerName,
                    ),
                },
                {
                  label: '分配',
                  type: 'primary',
                  link: true,
                  icon: ACTION_ICON.EDIT,
                  disabled: !canOperateRow(row) || !checkEditPermission(row),
                  onClick: () => handleRowDistribute(row),
                },
                {
                  label: '查看日志',
                  type: 'default',
                  link: true,
                  icon: ACTION_ICON.PREVIEW,
                  onClick: () => handleViewLogs(row),
                },
                {
                  label: '查看详情',
                  type: 'default',
                  link: true,
                  icon: ACTION_ICON.PREVIEW,
                  onClick: () => handleDetail(row),
                },
              ]"
            />
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pagination-container mt-4">
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="page"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <ElDialog
        v-model="distributeDialogVisible"
        title="分配公海客户"
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

      <ElDialog
        v-model="logDialogVisible"
        :title="`公海日志 - ${currentLogCustomer?.customerName || ''}`"
        width="1100px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <LogModal
          :customer-id="currentLogCustomer?.id || currentLogCustomer?.rowid"
        />
      </ElDialog>

      <ElDialog
        v-model="detailDialogVisible"
        title="公海线索详情"
        width="90%"
        top="3vh"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        destroy-on-close
      >
        <div style="max-height: 86vh; overflow-y: auto">
          <LeadCenterView
            mode="dialog"
            :lead-id="currentDetailLeadId"
            :readonly-pool-mode="true"
            @close="handleCloseDetailDialog"
            @saved="handleDetailSaved"
          />
        </div>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.search-form-wrapper {
  padding: 16px 16px 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.toolbar-wrapper {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
}
</style>
