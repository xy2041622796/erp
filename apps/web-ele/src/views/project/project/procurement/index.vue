<script lang="ts" setup>
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';
import { Plus, RefreshRight, Search } from '@element-plus/icons-vue';

import FileUpload from '#/components/upload/file-upload.vue';

import {
  auditProcurement,
  createProcurement,
  getProcurementList,
} from '#/api/erp/finance/project/procurement';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import { getSimpleUserList } from '#/api/system/user';
import {
  createCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceProjectProcurementPage' });

type ProcurementRow = Record<string, any> & {
  id?: string;
  project_name?: string;
  item_name?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  supplier?: string;
  reason?: string;
  status?: string | number;
  applicant_name?: string;
  department_name?: string;
  created_at?: string;
};

const loading = ref(false);
const total = ref(0);
const tableData = ref<ProcurementRow[]>([]);
const detailVisible = ref(false);
const createVisible = ref(false);
const detailMode = ref<'view' | 'audit'>('view');
const detailRow = ref<ProcurementRow | null>(null);
const projectOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const ATTACH_OWNER_TYPE = '项目采购审核';
const auditRemark = ref('');
const submitting = ref(false);
const queryForm = reactive({
  keyword: '',
  status: 'all',
});
const createForm = reactive({
  project_id: '',
  project_name: '',
  item_name: '',
  quantity: 1,
  unit: '项',
  unit_price: 0,
  supplier: '',
  reason: '',
});

const { dataTable, hasPermission } = useDataTablePermission();

onMounted(async () => {
  await Promise.all([handleQuery(), loadProjectOptions(), loadUserOptions()]);
});

function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '--';
  if (text.includes('T')) return text.split('T')[0];
  if (text.includes(' ')) return text.split(' ')[0];
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function getStatusMeta(status: unknown) {
  const value = String(status ?? '');
  if (value === '20' || value === 'approved') return { label: '已通过', type: 'success' as const };
  if (value === '-10' || value === 'rejected') return { label: '已驳回', type: 'danger' as const };
  return { label: '待审核', type: 'warning' as const };
}

async function loadProjectOptions() {
  try {
    const list = await getProjectManageSimpleList();
    projectOptions.value = Array.isArray(list) ? list : [];
  } catch (error: any) {
    projectOptions.value = [];
    ElMessage.error(error?.message || '加载项目选项失败');
  }
}

function handleProjectChange(projectId: string) {
  const matched = projectOptions.value.find((item) => String(item?.rowid || '') === String(projectId || ''));
  createForm.project_id = String(projectId || '');
  createForm.project_name = String(matched?.project_name || '').trim();
}

async function loadUserOptions() {
  try {
    const list = await getSimpleUserList();
    userOptions.value = Array.isArray(list) ? list : [];
  } catch {
    userOptions.value = [];
  }
}

function getProjectName(row: Record<string, any> | null | undefined) {
  const projectId = String(row?.project_id || '').trim();
  const projectName = String(row?.project_name || '').trim();
  const matched = projectOptions.value.find((item) => String(item?.rowid || '') === projectId);
  return String(matched?.project_name || projectName || projectId || '--');
}

function getUserName(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '--';
  const matched = userOptions.value.find((item) => {
    return [item?.ID, item?.ROWID, item?.LoginName, item?.UserName, item?.id, item?.username]
      .map((v) => String(v || '').trim())
      .includes(text);
  });
  return String(matched?.UserName || text);
}

function getAuditRemark(row: Record<string, any> | null | undefined) {
  return String(row?.audit_remark || row?.auditRemark || row?.remark || '').trim() || '--';
}

function formatAttachmentSize(size: unknown) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(2) + ' MB';
  if (value >= 1024) return (value / 1024).toFixed(2) + ' KB';
  return value + ' B';
}

function toAttachmentItem(payload: FileUploadSuccessPayload): CrmCustomerApi.Attachment {
  const fileName = payload?.fileName || '';
  return { file_name: fileName, file_path: payload?.filePath || '', file_size: payload?.fileSize || 0, file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '', owner_type: ATTACH_OWNER_TYPE };
}

async function loadAttachments(docId?: string | number) {
  if (!docId) { attachments.value = []; return; }
  try { attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE); } catch { attachments.value = []; }
}

async function persistDraftAttachments(docId: string) {
  for (const item of draftAttachments.value) {
    await createCustomerAttachment(docId, { fileName: item.file_name, file_path: item.file_path, fileSize: item.file_size, fileType: item.file_type, owner_type: ATTACH_OWNER_TYPE, pid: docId });
  }
  draftAttachments.value = [];
  await loadAttachments(docId);
}

async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) {
  const item = toAttachmentItem(payload);
  draftAttachments.value.push(item);
  attachments.value.push(item);
  uploadKey.value++;
}

async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) {
  if (!row.file_name || !row.file_path) { ElMessage.warning('附件信息不完整，无法下载'); return; }
  const blob = await downloadCustomerAttachment(row.file_name, row.file_path);
  downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
}

function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) {
  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter((item) => !(item.file_name === row.file_name && item.file_path === row.file_path));
}

async function handleQuery() {
  loading.value = true;
  try {
    const res = await getProcurementList({
      pageNo: 1,
      page: 0,
      keyword: queryForm.keyword,
      status: queryForm.status,
    });
    dataTable.value = res.dataTable;
    tableData.value = Array.isArray(res.list) ? res.list : [];
    total.value = Number(res.total || 0);
  } catch (error: any) {
    ElMessage.error(error?.message || '加载采购审核数据失败');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  queryForm.keyword = '';
  queryForm.status = 'all';
  handleQuery();
}

function openCreateDialog() {
  createForm.project_id = '';
  createForm.project_name = '';
  createForm.item_name = '';
  createForm.quantity = 1;
  createForm.unit = '项';
  createForm.unit_price = 0;
  createForm.supplier = '';
  createForm.reason = '';
  attachments.value = [];
  draftAttachments.value = [];
  uploadKey.value++;
  createVisible.value = true;
}

async function handleCreate() {
  if (!createForm.project_id || !createForm.project_name || !createForm.item_name || !createForm.supplier || !createForm.reason) {
    ElMessage.warning('请先补全采购申请信息');
    return;
  }
  submitting.value = true;
  try {
    const procurementId = crypto.randomUUID();
    await createProcurement({
      rowid: procurementId,
      project_id: createForm.project_id,
      project_name: createForm.project_name,
      item_name: createForm.item_name,
      quantity: createForm.quantity,
      unit: createForm.unit,
      unit_price: createForm.unit_price,
      total_price: Number(createForm.quantity || 0) * Number(createForm.unit_price || 0),
      supplier: createForm.supplier,
      reason: createForm.reason,
      status: 'pending',
    });
    await persistDraftAttachments(procurementId);
    ElMessage.success('采购申请已提交');
    createVisible.value = false;
    await handleQuery();
  } catch (error: any) {
    ElMessage.error(error?.message || '提交采购申请失败');
  } finally {
    submitting.value = false;
  }
}

async function openDetail(row: ProcurementRow) {
  detailMode.value = 'view';
  detailRow.value = row;
  auditRemark.value = '';
  await loadAttachments(row?.id || row?.rowid);
  detailVisible.value = true;
}

async function openAudit(row: ProcurementRow) {
  detailMode.value = 'audit';
  detailRow.value = row;
  auditRemark.value = '';
  await loadAttachments(row?.id || row?.rowid);
  detailVisible.value = true;
}

async function handleAudit(approved: boolean) {
  if (!detailRow.value?.id) return;
  submitting.value = true;
  try {
    await auditProcurement(detailRow.value.id, approved, auditRemark.value);
    ElMessage.success(approved ? '已通过采购申请' : '已驳回采购申请');
    detailVisible.value = false;
    await handleQuery();
  } catch (error: any) {
    ElMessage.error(error?.message || '审核失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <div class="project-procurement-page">
      <div class="project-procurement-page__header">
        <div>
          <div class="project-procurement-page__title">项目采购审核</div>
          <div class="project-procurement-page__subtitle">保留源项目“筛选 + 列表 + 审核弹窗”信息架构，当前项目以付款申请承载采购审核数据。</div>
        </div>
        <div class="project-procurement-page__header-actions">
          <el-button :icon="RefreshRight" @click="handleQuery">刷新</el-button>
          <el-button v-if="hasPermission('data:add')" type="primary" :icon="Plus" @click="openCreateDialog">
            新建采购
          </el-button>
        </div>
      </div>

      <el-card shadow="never">
        <el-form :model="queryForm" inline>
          <el-form-item>
            <el-input v-model="queryForm.keyword" placeholder="搜索项目 / 物品 / 供应商 / 原因" clearable>
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.status" style="width: 160px">
              <el-option label="全部状态" value="all" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleQuery">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>采购申请列表</span>
            <span class="card-header__extra">共 {{ total }} 条</span>
          </div>
        </template>
        <el-table v-loading="loading" :data="tableData" border stripe height="520">
          <el-table-column prop="project_name" label="项目名称" min-width="180">
            <template #default="{ row }">{{ getProjectName(row) }}</template>
          </el-table-column>
          <el-table-column prop="item_name" label="采购物品" min-width="180" />
          <el-table-column label="数量 / 单价" min-width="180">
            <template #default="{ row }">{{ row.quantity || 0 }}{{ row.unit || '项' }} × ¥{{ formatMoney(row.unit_price) }}</template>
          </el-table-column>
          <el-table-column prop="total_price" label="总金额" min-width="140" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.total_price) }}</template>
          </el-table-column>
          <el-table-column prop="supplier" label="供应商" min-width="180" />
          <el-table-column prop="applicant_name" label="申请人" min-width="140">
            <template #default="{ row }">
              <div>
                <div>{{ getUserName(row.applicant_name || row.createuser) }}</div>
                <div class="minor-text">{{ row.department_name || '--' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="提交日期" min-width="140">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusMeta(row.status).type">{{ getStatusMeta(row.status).label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">查看</el-button>
              <el-button v-if="getStatusMeta(row.status).label === '待审核'" link type="warning" @click="openAudit(row)">审核</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="createVisible" title="新建项目采购申请" width="620px">
        <el-form :model="createForm" label-width="100px">
          <el-form-item label="项目名称" required>
            <el-select v-model="createForm.project_id" filterable placeholder="请选择项目" style="width: 100%" @change="handleProjectChange">
              <el-option
                v-for="item in projectOptions"
                :key="item.rowid"
                :label="item.project_name || item.project_code || item.rowid"
                :value="item.rowid"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="采购物品" required><el-input v-model="createForm.item_name" /></el-form-item>
          <el-row :gutter="12">
            <el-col :span="8"><el-form-item label="数量"><el-input-number v-model="createForm.quantity" :min="1" style="width: 100%" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="单位"><el-input v-model="createForm.unit" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="单价"><el-input-number v-model="createForm.unit_price" :min="0" :precision="2" style="width: 100%" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="供应商" required><el-input v-model="createForm.supplier" /></el-form-item>
          <el-form-item label="采购原因" required><el-input v-model="createForm.reason" type="textarea" :rows="3" /></el-form-item>
          <el-form-item label="附件上传">
            <FileUpload :key="uploadKey" :model-value="[]" :api="uploadCustomerAttachment" :limit="9" :file-size="50" :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']" :is-show-tip="false" :show-file-list="false" @success="handleAttachmentUploadSuccess" />
            <span class="minor-text">你可以上传 9 个附件，每个最大 50MB</span>
          </el-form-item>
          <el-form-item v-if="attachments.length" label="已选附件">
            <div class="attachment-list">
              <el-tag v-for="(item, index) in attachments" :key="item.file_path || item.file_name" closable @close="handleDeleteAttachment(item, index)">{{ item.file_name }}</el-tag>
            </div>
          </el-form-item>
          <el-alert title="当前项目里没有独立采购审核表，页面保持源项目设计，底层先映射到付款申请表承载。" type="info" :closable="false" />
        </el-form>
        <template #footer>
          <el-button @click="createVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleCreate">提交申请</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="detailVisible"
        :title="detailMode === 'audit' ? '采购申请审核' : '采购申请详情'"
        width="760px"
        :class="['procurement-detail-dialog', detailMode === 'audit' ? 'audit-dialog--top' : '']"
        :top="detailMode === 'audit' ? '4vh' : '8vh'"
      >
        <div v-if="detailRow" class="procurement-detail">
          <div class="procurement-detail__hero">
            <div>
              <div class="procurement-detail__label">采购总金额</div>
              <div class="procurement-detail__amount">¥{{ formatMoney(detailRow.total_price) }}</div>
              <div class="procurement-detail__project">{{ getProjectName(detailRow) }}</div>
            </div>
            <el-tag :type="getStatusMeta(detailRow.status).type" size="large">
              {{ getStatusMeta(detailRow.status).label }}
            </el-tag>
          </div>

          <div class="procurement-detail__metrics">
            <div class="procurement-metric-card">
              <div class="procurement-detail__label">采购物品</div>
              <div class="procurement-metric-card__value">{{ detailRow.item_name || '--' }}</div>
            </div>
            <div class="procurement-metric-card">
              <div class="procurement-detail__label">数量 / 单价</div>
              <div class="procurement-metric-card__value">{{ detailRow.quantity || 0 }}{{ detailRow.unit || '项' }} × ¥{{ formatMoney(detailRow.unit_price) }}</div>
            </div>
            <div class="procurement-metric-card">
              <div class="procurement-detail__label">供应商</div>
              <div class="procurement-metric-card__value">{{ detailRow.supplier || '--' }}</div>
            </div>
          </div>

          <div class="procurement-detail__section">
            <div class="procurement-detail__section-title">申请信息</div>
            <div class="procurement-detail__info-grid">
              <div class="procurement-detail__info-item">
                <span>申请人</span>
                <strong>{{ getUserName(detailRow.applicant_name || detailRow.createuser) }}</strong>
              </div>
              <div class="procurement-detail__info-item">
                <span>部门</span>
                <strong>{{ detailRow.department_name || '--' }}</strong>
              </div>
              <div class="procurement-detail__info-item">
                <span>提交日期</span>
                <strong>{{ formatDate(detailRow.created_at) }}</strong>
              </div>
            </div>
          </div>

          <div class="procurement-detail__section">
            <div class="procurement-detail__section-title">采购原因</div>
            <div class="procurement-detail__content">{{ detailRow.reason || '--' }}</div>
          </div>

          <div class="procurement-detail__section">
            <div class="procurement-detail__section-title">附件</div>
            <div class="procurement-detail__attachments">
              <el-tag v-for="item in attachments" :key="item.file_path || item.file_name" effect="plain" class="procurement-detail__attachment" @click="handleDownloadAttachment(item)">
                {{ item.file_name }}（{{ formatAttachmentSize(item.file_size) }}）
              </el-tag>
              <span v-if="!attachments.length" class="minor-text">无附件</span>
            </div>
          </div>

          <div v-if="detailMode === 'view'" class="procurement-detail__section">
            <div class="procurement-detail__section-title">审批意见</div>
            <div class="procurement-detail__content">{{ getAuditRemark(detailRow) }}</div>
          </div>

          <div v-if="detailMode === 'audit' && getStatusMeta(detailRow?.status).label === '待审核'" class="procurement-detail__section procurement-detail__section--audit">
            <div class="procurement-detail__section-title">审批意见</div>
            <el-input v-model="auditRemark" type="textarea" :rows="4" placeholder="请输入审核意见，可选" />
          </div>
        </div>
        <template #footer>
          <el-button @click="detailVisible = false">关闭</el-button>
          <template v-if="detailMode === 'audit' && getStatusMeta(detailRow?.status).label === '待审核'">
            <el-button type="danger" :loading="submitting" @click="handleAudit(false)">驳回</el-button>
            <el-button type="primary" :loading="submitting" @click="handleAudit(true)">通过</el-button>
          </template>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.project-procurement-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-procurement-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.project-procurement-page__title {
  font-size: 20px;
  font-weight: 600;
}
.project-procurement-page__subtitle,
.minor-text,
.card-header__extra {
  color: var(--el-text-color-secondary);
}
.project-procurement-page__header-actions,
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.procurement-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.procurement-detail__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-fill-color-blank));
}
.procurement-detail__label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.procurement-detail__amount {
  margin-top: 4px;
  color: var(--el-color-primary);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.procurement-detail__project {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 500;
}
.procurement-detail__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.procurement-metric-card,
.procurement-detail__section {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}
.procurement-metric-card__value {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
}
.procurement-detail__section-title {
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}
.procurement-detail__info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.procurement-detail__info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.procurement-detail__info-item span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.procurement-detail__info-item strong {
  color: var(--el-text-color-primary);
  font-size: 15px;
}
.procurement-detail__content {
  min-height: 52px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
  white-space: pre-wrap;
}
.procurement-detail__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 28px;
}
.procurement-detail__attachment {
  cursor: pointer;
}
.procurement-detail__section--audit {
  background: var(--el-color-warning-light-9);
}
:global(.audit-dialog--top.el-dialog) {
  margin-top: 4vh !important;
}
@media (max-width: 768px) {
  .procurement-detail__hero {
    flex-direction: column;
  }
  .procurement-detail__metrics,
  .procurement-detail__info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
