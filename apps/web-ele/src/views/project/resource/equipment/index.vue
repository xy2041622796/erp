<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { FullScreen, Refresh } from '@element-plus/icons-vue';

import { useUserStore } from '@vben/stores';

import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import {
  createData as createEquipmentData,
  deleteData as deleteEquipmentData,
  getDetail as getEquipmentDetail,
  listData as listEquipmentData,
  updateData as updateEquipmentData,
} from '#/api/erp/project/resource/equipment';
import {
  createData as createRecordData,
  deleteData as deleteRecordData,
  getDetail as getRecordDetail,
  listData as listRecordData,
  updateData as updateRecordData,
} from '#/api/erp/project/resource/equipment-record';
import Form from '#/views/project/_shared/ProjectSubmoduleCrudForm.vue';
import { buildSystemCode, inferCreateDefaultValues, inferReadonlyFormSchema, normalizeDateFields } from '#/views/project/_shared/crud';

import { resourceEquipmentConfig } from './data';
import { resourceEquipmentRecordConfig } from './record-data';

import {
  ElButton,
  ElCard,
  ElCol,
  ElEmpty,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElTabPane,
  ElTabs,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'OaProjectResourceEquipment' });

const route = useRoute();
const userStore = useUserStore();
const equipmentApis = {
  listData: listEquipmentData,
  getDetail: getEquipmentDetail,
  createData: createEquipmentData,
  updateData: updateEquipmentData,
  deleteData: deleteEquipmentData,
};
const recordApis = {
  listData: listRecordData,
  getDetail: getRecordDetail,
  createData: createRecordData,
  updateData: updateRecordData,
  deleteData: deleteRecordData,
};

const recordNormalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['borrow_date', 'return_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['borrow_date', 'return_date']);
  },
};

const activeTab = ref<'ledger' | 'records'>('ledger');
const loading = ref(false);
const equipmentRowsRaw = ref<Record<string, any>[]>([]);
const recordRowsRaw = ref<Record<string, any>[]>([]);
const equipmentDataTable = ref<any>(null);
const recordDataTable = ref<any>(null);
const projectOptions = ref<Record<string, any>[]>([]);
const selectedCategory = ref('');
const selectedType = ref('');
const selectedStatus = ref('');
const selectedProjectId = ref('');
const contentCardRef = ref<HTMLElement>();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function getRouteProjectId() {
  const projectId = Array.isArray(route.query.project_id) ? route.query.project_id[0] : route.query.project_id;
  return String(projectId || '').trim();
}

function getCurrentUserName() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return String(info.nickname || raw.UserName || raw.userName || info.username || '').trim();
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function fetchText(row: Record<string, any>, fields: string[]) {
  for (const field of fields) {
    const text = normalizeText(row?.[field]);
    if (text) return text;
  }
  return '';
}

function getStatusDisplay(status: string) {
  if (['领用中', '使用中'].includes(status)) return '在用';
  return status || '-';
}

function getStatusTagType(status: string) {
  if (status === '维修中') return 'warning';
  if (status === '在库' || status === '已归还') return 'success';
  if (['领用中', '使用中', '在用'].includes(status)) return 'primary';
  if (['已报废', '已取消'].includes(status)) return 'danger';
  return 'info';
}

function inferCategory(row: Record<string, any>) {
  const text = [row?.equipment_name, row?.remark, row?.description, row?.status, row?.project_id, row?.owner_user_name]
    .map((item) => normalizeText(item).toLowerCase())
    .join(' ');
  const isOutdoor =
    !!normalizeText(row?.project_id) ||
    !!normalizeText(row?.owner_user_name) ||
    ['领用中', '使用中', '维修中'].includes(normalizeText(row?.status)) ||
    ['外业', 'rtk', '测量', '无人机', 'gps', '手簿', '航测'].some((word) => text.includes(word));
  return isOutdoor ? '外业设备' : '内业设备';
}

function inferType(row: Record<string, any>) {
  const equipmentName = normalizeText(row?.equipment_name);
  if (!equipmentName) return '未分类';
  if (equipmentName.includes('无人机')) return '无人机';
  if (equipmentName.toUpperCase().includes('RTK')) return 'RTK';
  if (equipmentName.includes('电脑') || equipmentName.includes('工作站')) return '电脑';
  return equipmentName;
}

function inferBrandModel(row: Record<string, any>) {
  const text = fetchText(row, ['description', 'remark']);
  return text || '-';
}

function inferSerialNo(row: Record<string, any>) {
  const equipmentCode = normalizeText(row?.equipment_code);
  if (!equipmentCode || equipmentCode.includes('空')) return 'SN-000';
  const normalized = equipmentCode.replace(/\s+/g, '').replace(/-/g, '');
  return normalized.startsWith('SN') ? normalized : `SN-${normalized}`;
}

function getProjectLabelById(projectId: unknown) {
  const id = normalizeText(projectId);
  if (!id) return '-';
  const project = projectOptions.value.find((item) => normalizeText(item?.rowid) === id);
  return normalizeText(project?.project_name) || normalizeText(project?.project_code) || id;
}

function getProjectLabel(row: Record<string, any>) {
  return getProjectLabelById(row?.project_id);
}

function getOwnerLabel(row: Record<string, any>) {
  return fetchText(row, ['owner_user_name', 'owner_user_rowid']) || '-';
}

function formatDateTime(value: unknown) {
  const text = normalizeText(value);
  if (!text) return '-';
  if (text.includes('T')) return text.replace('T', ' ').slice(0, 16);
  return text.slice(0, 16);
}

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

async function fetchAllRows(listFn: Function, baseParams: Record<string, any> = {}, dataTableRef?: typeof equipmentDataTable) {
  const page = 500;
  let pageNo = 1;
  let total = Infinity;
  const rows: Record<string, any>[] = [];

  while (rows.length < total && pageNo <= 20) {
    const res = await listFn({ ...baseParams, pageNo, page });
    if (dataTableRef && !dataTableRef.value) dataTableRef.value = res?.dataTable || null;
    const list = getList(res);
    const count = Number(res?.total || res?.data?.total || list.length || 0);
    total = Number.isFinite(count) && count > 0 ? count : list.length;
    rows.push(...list);
    if (list.length < page) break;
    pageNo += 1;
  }

  return rows;
}

async function loadProjectOptions() {
  const rows = await getProjectManageSimpleList();
  projectOptions.value = Array.isArray(rows) ? rows : [];
}

async function loadEquipmentData() {
  const baseParams = selectedProjectId.value ? { project_id: selectedProjectId.value } : {};
  equipmentRowsRaw.value = await fetchAllRows(listEquipmentData, baseParams, equipmentDataTable);
}

async function loadRecordData() {
  const baseParams = selectedProjectId.value ? { project_id: selectedProjectId.value } : {};
  recordRowsRaw.value = await fetchAllRows(listRecordData, baseParams, recordDataTable);
}

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([loadEquipmentData(), loadRecordData()]);
  } finally {
    loading.value = false;
  }
}

async function toggleFullscreen() {
  const el = contentCardRef.value;
  if (!el) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await el.requestFullscreen();
}

const equipmentRows = computed(() => {
  return equipmentRowsRaw.value.map((row) => {
    const status = normalizeText(row?.status) || '在库';
    return {
      ...row,
      category_label: inferCategory(row),
      type_label: inferType(row),
      brand_model_label: inferBrandModel(row),
      serial_no_label: inferSerialNo(row),
      project_name_label: getProjectLabel(row),
      owner_name_label: getOwnerLabel(row),
      status_display: getStatusDisplay(status),
      status_tag_type: getStatusTagType(status),
    };
  });
});

const recordRows = computed(() => {
  return recordRowsRaw.value.map((row) => {
    const status = normalizeText(row?.status) || '领用中';
    return {
      ...row,
      project_name_label: getProjectLabel(row),
      owner_name_label: getOwnerLabel(row),
      status_display: status || '-',
      status_tag_type: getStatusTagType(status),
    };
  });
});

const categoryOptions = computed(() => [...new Set(equipmentRows.value.map((row) => row.category_label).filter(Boolean))].map((item) => ({ label: item, value: item })));
const typeOptions = computed(() => [...new Set(equipmentRows.value.map((row) => row.type_label).filter(Boolean))].map((item) => ({ label: item, value: item })));
const statusOptions = computed(() => {
  const rows = activeTab.value === 'ledger' ? equipmentRows.value : recordRows.value;
  return [...new Set(rows.map((row) => row.status_display).filter(Boolean))].map((item) => ({ label: item, value: item }));
});

const ledgerRows = computed(() => {
  return equipmentRows.value.filter((row) => {
    if (selectedCategory.value && row.category_label !== selectedCategory.value) return false;
    if (selectedType.value && row.type_label !== selectedType.value) return false;
    if (selectedStatus.value && row.status_display !== selectedStatus.value) return false;
    return true;
  });
});

const filteredRecordRows = computed(() => {
  return recordRows.value.filter((row) => {
    if (selectedStatus.value && row.status_display !== selectedStatus.value) return false;
    return true;
  });
});

const activeRows = computed(() => (activeTab.value === 'ledger' ? ledgerRows.value : filteredRecordRows.value));

const stats = computed(() => {
  const rows = equipmentRows.value;
  return {
    total: rows.length,
    indoor: rows.filter((row) => row.category_label === '内业设备').length,
    outdoor: rows.filter((row) => row.category_label === '外业设备').length,
    using: rows.filter((row) => ['领用中', '使用中'].includes(normalizeText(row.status))).length,
    repairing: rows.filter((row) => normalizeText(row.status) === '维修中').length,
  };
});

function getActiveConfig() {
  return activeTab.value === 'ledger' ? resourceEquipmentConfig : resourceEquipmentRecordConfig;
}

function getActiveApis() {
  return activeTab.value === 'ledger' ? equipmentApis : recordApis;
}

function getActiveDataTable() {
  return activeTab.value === 'ledger' ? equipmentDataTable.value : recordDataTable.value;
}

function getActivePrimaryKey() {
  return getActiveConfig().primaryKey;
}

function checkAddPermission() {
  return !!getActiveDataTable()?.allowAddData?.();
}
function checkEditPermission(row: Record<string, any>) {
  return !!getActiveDataTable()?.allowEditRow?.(row?.[getActivePrimaryKey()]);
}
function checkDeletePermission(row: Record<string, any>) {
  return !!getActiveDataTable()?.allowDeleteRow?.(row?.[getActivePrimaryKey()]);
}
function checkViewPermission(row: Record<string, any>) {
  const rowKey = row?.[getActivePrimaryKey()];
  const dataTable = getActiveDataTable();
  if (!dataTable || !rowKey) return true;
  if (typeof dataTable.hasShowField === 'function') {
    try {
      return !!dataTable.hasShowField(rowKey);
    } catch (error) {
      console.error('[project-resource-equipment] checkViewPermission failed:', error);
      return true;
    }
  }
  return true;
}

function inferRecordDefaultValues(row?: Record<string, any>) {
  return {
    ...(resourceEquipmentRecordConfig.defaultValues || {}),
    ...(selectedProjectId.value ? { project_id: selectedProjectId.value } : {}),
    owner_user_name: getCurrentUserName() || resourceEquipmentRecordConfig.defaultValues?.owner_user_name || '',
    equipment_code: row?.equipment_code || buildSystemCode('equipment_code'),
    ...(row?.id && activeTab.value === 'ledger'
      ? {
          equipment_id: row.id,
          equipment_code: row.equipment_code,
          equipment_name: row.equipment_name,
          project_id: row.project_id || selectedProjectId.value || '',
        }
      : {}),
  };
}

function openForm(type: 'create' | 'edit' | 'detail', row?: Record<string, any>) {
  const config = getActiveConfig();
  const apis = getActiveApis();
  const formSchema = inferReadonlyFormSchema(config.formSchema || []);
  const defaultValues =
    activeTab.value === 'records'
      ? inferRecordDefaultValues(row)
      : type === 'create'
        ? inferCreateDefaultValues(
            {
              ...(resourceEquipmentConfig.defaultValues || {}),
              ...(selectedProjectId.value ? { project_id: selectedProjectId.value } : {}),
              owner_user_name: getCurrentUserName() || resourceEquipmentConfig.defaultValues?.owner_user_name || '',
            },
            formSchema,
          )
        : { ...(resourceEquipmentConfig.defaultValues || {}) };

  if (activeTab.value === 'ledger' && type === 'create' && !normalizeText(defaultValues.equipment_code)) {
    defaultValues.equipment_code = buildSystemCode('equipment_code');
  }

  const titlePrefix = activeTab.value === 'ledger' ? '设备' : '领用记录';
  formModalApi
    .setData({
      type,
      title: type === 'create' ? `新增${titlePrefix}` : type === 'edit' ? `编辑${titlePrefix}` : `${titlePrefix}详情`,
      primaryKey: config.primaryKey,
      schema: formSchema,
      defaultValues,
      values: row,
      apis,
      normalizers: activeTab.value === 'records' ? recordNormalizers : undefined,
      staffPickerFields: config.staffPickerFields || [],
      customSelectFields: config.customSelectFields || [],
    })
    .open();
}

async function handleDelete(row: Record<string, any>) {
  const rowKey = normalizeText(row?.[getActivePrimaryKey()]);
  if (!rowKey || !checkDeletePermission(row)) return;
  await ElMessageBox.confirm(`确认删除当前${activeTab.value === 'ledger' ? '设备' : '领用记录'}？`, '提示', { type: 'warning' });
  if (activeTab.value === 'ledger') {
    await deleteEquipmentData(rowKey);
  } else {
    await deleteRecordData(rowKey);
  }
  ElMessage.success('删除成功');
  await loadData();
}

watch(selectedProjectId, () => {
  loadData();
});

watch(activeTab, () => {
  selectedStatus.value = '';
});

onMounted(async () => {
  selectedProjectId.value = getRouteProjectId();
  await loadProjectOptions();
  await loadData();
});
</script>

<template>
  <Page auto-content-height class="project-fixed-page">
    <FormModal @success="loadData" />

    <ElRow :gutter="16" class="mb-4">
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">设备总数</div>
          <div class="stat-value">{{ stats.total }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">内业设备</div>
          <div class="stat-value">{{ stats.indoor }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">外业设备</div>
          <div class="stat-value text-success">{{ stats.outdoor }}</div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="project-stat-card">
          <div class="stat-label">在用 / 维修中</div>
          <div class="stat-value text-warning">{{ stats.using }} / {{ stats.repairing }}</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard ref="contentCardRef" shadow="never" class="content-card">
      <ElTabs v-model="activeTab">
        <ElTabPane label="设备台账" name="ledger">
          <div class="resource-toolbar-row">
            <div class="resource-toolbar-left">
              <ElSelect v-model="selectedCategory" clearable placeholder="全部分类" class="filter-select">
                <ElOption label="全部分类" value="" />
                <ElOption v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
              <ElSelect v-model="selectedType" clearable placeholder="全部类型" class="filter-select">
                <ElOption label="全部类型" value="" />
                <ElOption v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
              <ElSelect v-model="selectedStatus" clearable placeholder="全部状态" class="filter-status">
                <ElOption label="全部状态" value="" />
                <ElOption v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
              <span class="filter-count">共 {{ ledgerRows.length }} 条记录</span>
            </div>
            <div class="resource-toolbar-right">
              <TableAction
                :actions="[
                  {
                    label: '新增设备',
                    type: 'primary',
                    icon: ACTION_ICON.ADD,
                    disabled: !checkAddPermission(),
                    onClick: () => openForm('create'),
                  },
                ]"
              />
              <ElButton class="resource-toolbar-icon-button" :icon="Refresh" circle title="刷新" @click="loadData" />
              <ElButton class="resource-toolbar-icon-button" :icon="FullScreen" circle title="全屏" @click="toggleFullscreen" />
            </div>
          </div>

          <div v-if="!loading && ledgerRows.length === 0" class="empty-wrap">
            <ElEmpty description="暂无设备数据" />
          </div>

          <ElTable v-else v-loading="loading" :data="ledgerRows" border stripe height="520">
            <ElTableColumn prop="equipment_code" label="设备编号" min-width="140" fixed="left" />
            <ElTableColumn prop="equipment_name" label="设备名称" min-width="160" />
            <ElTableColumn prop="category_label" label="分类" min-width="120" align="center">
              <template #default="{ row }"><ElTag type="info" size="small">{{ row.category_label }}</ElTag></template>
            </ElTableColumn>
            <ElTableColumn prop="type_label" label="类型" min-width="120" />
            <ElTableColumn prop="brand_model_label" label="品牌型号" min-width="160" />
            <ElTableColumn prop="serial_no_label" label="序列号" min-width="140" />
            <ElTableColumn prop="status_display" label="状态" min-width="110" align="center">
              <template #default="{ row }"><ElTag :type="row.status_tag_type" size="small">{{ row.status_display }}</ElTag></template>
            </ElTableColumn>
            <ElTableColumn prop="project_name_label" label="使用项目" min-width="220" />
            <ElTableColumn prop="owner_name_label" label="使用人" min-width="120" />
            <ElTableColumn label="操作" width="260" fixed="right" align="center">
              <template #default="{ row }">
                <TableAction
                  :actions="[
                    {
                      label: '详情',
                      type: 'primary',
                      link: true,
                      icon: ACTION_ICON.VIEW,
                      disabled: !checkViewPermission(row),
                      onClick: () => openForm('detail', row),
                    },
                    {
                      label: '编辑',
                      type: 'primary',
                      link: true,
                      icon: ACTION_ICON.EDIT,
                      disabled: !checkEditPermission(row),
                      onClick: () => openForm('edit', row),
                    },
                    {
                      label: '删除',
                      type: 'danger',
                      link: true,
                      icon: ACTION_ICON.DELETE,
                      disabled: !checkDeletePermission(row),
                      onClick: () => handleDelete(row),
                    },
                  ]"
                />
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <ElTabPane label="领用记录" name="records">
          <div class="resource-toolbar-row">
            <div class="resource-toolbar-left">
              <ElSelect v-model="selectedStatus" clearable placeholder="全部状态" class="filter-status">
                <ElOption label="全部状态" value="" />
                <ElOption v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
              <span class="filter-count">共 {{ filteredRecordRows.length }} 条记录</span>
            </div>
            <div class="resource-toolbar-right">
              <TableAction
                :actions="[
                  {
                    label: '新增领用记录',
                    type: 'primary',
                    icon: ACTION_ICON.ADD,
                    disabled: !checkAddPermission(),
                    onClick: () => openForm('create'),
                  },
                ]"
              />
              <ElButton class="resource-toolbar-icon-button" :icon="Refresh" circle title="刷新" @click="loadData" />
              <ElButton class="resource-toolbar-icon-button" :icon="FullScreen" circle title="全屏" @click="toggleFullscreen" />
            </div>
          </div>

          <div v-if="!loading && filteredRecordRows.length === 0" class="empty-wrap">
            <ElEmpty description="暂无领用记录" />
          </div>

          <ElTable v-else v-loading="loading" :data="filteredRecordRows" border stripe height="520">
            <ElTableColumn prop="equipment_code" label="设备编号" min-width="140" fixed="left" />
            <ElTableColumn prop="equipment_name" label="设备名称" min-width="180" />
            <ElTableColumn prop="project_name_label" label="领用项目" min-width="220" />
            <ElTableColumn prop="owner_name_label" label="领用人" min-width="120" />
            <ElTableColumn prop="borrow_date" label="领用日期" min-width="130">
              <template #default="{ row }">{{ formatDateTime(row.borrow_date).slice(0, 10) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="return_date" label="归还日期" min-width="130">
              <template #default="{ row }">{{ formatDateTime(row.return_date).slice(0, 10) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="status_display" label="状态" min-width="110" align="center">
              <template #default="{ row }"><ElTag :type="row.status_tag_type" size="small">{{ row.status_display }}</ElTag></template>
            </ElTableColumn>
            <ElTableColumn prop="remark" label="备注" min-width="220">
              <template #default="{ row }">{{ row.remark || '-' }}</template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="260" fixed="right" align="center">
              <template #default="{ row }">
                <TableAction
                  :actions="[
                    {
                      label: '详情',
                      type: 'primary',
                      link: true,
                      icon: ACTION_ICON.VIEW,
                      disabled: !checkViewPermission(row),
                      onClick: () => openForm('detail', row),
                    },
                    {
                      label: '编辑',
                      type: 'primary',
                      link: true,
                      icon: ACTION_ICON.EDIT,
                      disabled: !checkEditPermission(row),
                      onClick: () => openForm('edit', row),
                    },
                    {
                      label: '删除',
                      type: 'danger',
                      link: true,
                      icon: ACTION_ICON.DELETE,
                      disabled: !checkDeletePermission(row),
                      onClick: () => handleDelete(row),
                    },
                  ]"
                />
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

  </Page>
</template>

<style scoped>
.content-card,
.project-stat-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.stat-value {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
}

.text-success {
  color: var(--el-color-success);
}

.text-warning {
  color: var(--el-color-warning);
}

.resource-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.resource-toolbar-left,
.resource-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.resource-toolbar-right {
  flex-shrink: 0;
}

.resource-toolbar-icon-button {
  width: 32px;
  height: 32px;
  padding: 0;
}

.filter-select {
  width: 220px;
}

.filter-status {
  width: 160px;
}

.filter-count {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.empty-wrap {
  padding: 40px 0;
}

@media (max-width: 768px) {
  .resource-toolbar-row,
  .resource-toolbar-left,
  .resource-toolbar-right {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-select,
  .filter-status {
    width: 100%;
  }
}
</style>
