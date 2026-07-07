<script lang="ts" setup>
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { Staff } from '#/api/common/staff-selector';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';
import { Plus, RefreshRight, Search } from '@element-plus/icons-vue';

import FileUpload from '#/components/upload/file-upload.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import {
  auditBudget,
  createBudget,
  getBudgetList,
  getBudgetStats,
} from '#/api/erp/finance/project/budget';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import {
  createCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceProjectBudgetPage' });

type BudgetRow = Record<string, any> & {
  id?: string;
  project_name?: string;
  category?: string;
  budget_amount?: number;
  used_amount?: number;
  remaining_amount?: number;
  usage_rate?: number;
  manager_name?: string;
  created_at?: string;
  createtime?: string;
  flowstate?: string | number;
};

const loading = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const detailMode = ref<'view' | 'audit'>('view');
const tableData = ref<BudgetRow[]>([]);
const total = ref(0);
const detailRow = ref<BudgetRow | null>(null);
const projectOptions = ref<any[]>([]);
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);
const ATTACH_OWNER_TYPE = '现场成本预算';
const budgetCategoryOptions = ['人工成本', '设备采购', '材料费用', '外包服务', '差旅费用', '其他'];
const stats = reactive({
  total: 0,
  totalBudget: 0,
  totalUsed: 0,
  normal: 0,
  warning: 0,
  over: 0,
});
const queryForm = reactive({
  keyword: '',
  status: 'all',
});
const formModel = reactive({
  project_id: '',
  project_name: '',
  category: '',
  budget_amount: undefined as number | undefined,
  manager_id: undefined as string | undefined,
  manager_name: '',
  remark: '',
});
const auditRemark = ref('');
const submitting = ref(false);

const { dataTable, hasPermission } = useDataTablePermission();

const usageSummary = computed(() => {
  const totalBudgetValue = Number(stats.totalBudget || 0);
  const totalUsedValue = Number(stats.totalUsed || 0);
  return totalBudgetValue > 0 ? ((totalUsedValue / totalBudgetValue) * 100).toFixed(1) : '0.0';
});

onMounted(async () => {
  await Promise.all([handleQuery(), loadProjectOptions()]);
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

function formatRate(value: unknown) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getUsageTagType(rate: number) {
  if (rate >= 100) return 'danger';
  if (rate >= 80) return 'warning';
  return 'success';
}

function getAuditStatusMeta(status: unknown) {
  const value = String(status ?? '').trim();
  if (value === '20' || value === 'approved') return { label: '已通过', type: 'success' as const };
  if (value === '-10' || value === 'rejected') return { label: '已驳回', type: 'danger' as const };
  return { label: '待审核', type: 'warning' as const };
}

function getBudgetAuditRemark(row: Record<string, any> | null | undefined) {
  return String(row?.description || row?.remark || '').trim() || '--';
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
  formModel.project_id = String(projectId || '');
  formModel.project_name = String(matched?.project_name || '').trim();
}

function getProjectName(row: Record<string, any> | null | undefined) {
  const projectId = String(row?.project_id || '').trim();
  const projectName = String(row?.project_name || '').trim();
  const matched = projectOptions.value.find((item) => String(item?.rowid || '') === projectId);
  return String(matched?.project_name || projectName || projectId || '--');
}

function formatAttachmentSize(size: unknown) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(2) + ' MB';
  if (value >= 1024) return (value / 1024).toFixed(2) + ' KB';
  return value + ' B';
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

async function loadAttachments(docId?: string | number) {
  if (!docId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE);
  } catch {
    attachments.value = [];
  }
}

async function persistDraftAttachments(docId: string) {
  for (const item of draftAttachments.value) {
    await createCustomerAttachment(docId, {
      fileName: item.file_name,
      file_path: item.file_path,
      fileSize: item.file_size,
      fileType: item.file_type,
      owner_type: ATTACH_OWNER_TYPE,
      pid: docId,
    });
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
  if (!row.file_name || !row.file_path) {
    ElMessage.warning('附件信息不完整，无法下载');
    return;
  }
  const blob = await downloadCustomerAttachment(row.file_name, row.file_path);
  downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
}

function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) {
  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter((item) => !(item.file_name === row.file_name && item.file_path === row.file_path));
}

function handleManagerPicked(staff?: Staff | Staff[]) {
  const row = Array.isArray(staff) ? staff[0] : staff;
  formModel.manager_name = String(row?.UserName || '').trim();
}

async function handleQuery() {
  loading.value = true;
  try {
    const [listRes, statsRes] = await Promise.all([
      getBudgetList({
        pageNo: 1,
        page: 0,
        keyword: queryForm.keyword,
        status: queryForm.status,
      }),
      getBudgetStats(),
    ]);
    dataTable.value = listRes.dataTable;
    tableData.value = Array.isArray(listRes.list) ? listRes.list : [];
    total.value = Number(listRes.total || 0);
    Object.assign(stats, statsRes || {});
  } catch (error: any) {
    ElMessage.error(error?.message || '加载预算数据失败');
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
  formModel.project_id = '';
  formModel.project_name = '';
  formModel.category = '';
  formModel.budget_amount = undefined;
  formModel.manager_id = undefined;
  formModel.manager_name = '';
  formModel.remark = '';
  attachments.value = [];
  draftAttachments.value = [];
  uploadKey.value++;
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!formModel.project_id || !formModel.project_name || !formModel.category || !formModel.budget_amount) {
    ElMessage.warning('请先选择项目并补全预算类别、预算金额');
    return;
  }
  submitting.value = true;
  try {
    const budgetId = crypto.randomUUID();
    await createBudget({
      id: budgetId,
      project_id: formModel.project_id,
      project_name: formModel.project_name,
      category: formModel.category,
      budget_amount: formModel.budget_amount,
      manager_id: formModel.manager_id,
      manager_name: formModel.manager_name,
      remark: formModel.remark,
      used_amount: 0,
    });
    await persistDraftAttachments(budgetId);
    ElMessage.success('预算已提交');
    dialogVisible.value = false;
    await handleQuery();
  } catch (error: any) {
    ElMessage.error(error?.message || '创建预算失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDetail(row: BudgetRow) {
  detailMode.value = 'view';
  detailRow.value = row;
  auditRemark.value = '';
  await loadAttachments(row?.id);
  detailVisible.value = true;
}

async function handleAuditOpen(row: BudgetRow) {
  detailMode.value = 'audit';
  detailRow.value = row;
  auditRemark.value = '';
  await loadAttachments(row?.id);
  detailVisible.value = true;
}

async function handleAudit(approved: boolean) {
  if (!detailRow.value?.id) return;
  submitting.value = true;
  try {
    await auditBudget(detailRow.value.id, approved, auditRemark.value);
    ElMessage.success(approved ? '已通过成本预算' : '已驳回成本预算');
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
    <div class="project-budget-page">
      <div class="project-budget-page__header">
        <div>
          <div class="project-budget-page__title">现场成本预算</div>
          <div class="project-budget-page__subtitle">保留源项目预算驾驶舱结构，当前项目以 Element Plus 卡片 + 表格实现。</div>
        </div>
        <div class="project-budget-page__header-actions">
          <el-button :icon="RefreshRight" @click="handleQuery">刷新</el-button>
          <el-button v-if="hasPermission('data:add')" type="primary" :icon="Plus" @click="openCreateDialog">
            新建预算
          </el-button>
        </div>
      </div>

      <div class="project-budget-page__stats">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-card__label">总预算</span>
            <span class="stat-card__value">¥{{ formatMoney(stats.totalBudget) }}</span>
          </div>
        </el-card>
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-card__label">已使用</span>
            <span class="stat-card__value stat-card__value--warning">¥{{ formatMoney(stats.totalUsed) }}</span>
          </div>
        </el-card>
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-card__label">执行率</span>
            <span class="stat-card__value stat-card__value--primary">{{ usageSummary }}</span>
          </div>
        </el-card>
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-card__label">正常 / 预警 / 超支</span>
            <span class="stat-card__mix">
              <span class="success">{{ stats.normal }}</span>
              <span>/</span>
              <span class="warning">{{ stats.warning }}</span>
              <span>/</span>
              <span class="danger">{{ stats.over }}</span>
            </span>
          </div>
        </el-card>
      </div>

      <el-card shadow="never">
        <el-form :model="queryForm" inline class="project-budget-page__filter">
          <el-form-item>
            <el-input v-model="queryForm.keyword" placeholder="搜索项目名称 / 预算类别 / 负责人" clearable>
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.status" placeholder="执行状态" style="width: 160px">
              <el-option label="全部状态" value="all" />
              <el-option label="正常" value="normal" />
              <el-option label="预警" value="warning" />
              <el-option label="超支" value="over" />
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
            <span>预算执行列表</span>
            <span class="card-header__extra">共 {{ total }} 条</span>
          </div>
        </template>
        <el-table v-loading="loading" :data="tableData" border stripe height="520">
          <el-table-column prop="project_name" label="项目名称" min-width="180">
            <template #default="{ row }">{{ getProjectName(row) }}</template>
          </el-table-column>
          <el-table-column prop="category" label="预算类别" min-width="140" />
          <el-table-column prop="budget_amount" label="预算金额" min-width="140" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.budget_amount) }}</template>
          </el-table-column>
          <el-table-column prop="used_amount" label="已使用" min-width="140" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.used_amount) }}</template>
          </el-table-column>
          <el-table-column prop="remaining_amount" label="剩余" min-width="140" align="right">
            <template #default="{ row }">
              <span :class="Number(row.remaining_amount || 0) < 0 ? 'danger' : ''">¥{{ formatMoney(row.remaining_amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="usage_rate" label="使用率" min-width="180">
            <template #default="{ row }">
              <div class="rate-cell">
                <el-progress :percentage="Math.min(Number(row.usage_rate || 0), 100)" :status="getUsageTagType(Number(row.usage_rate || 0)) === 'danger' ? 'exception' : getUsageTagType(Number(row.usage_rate || 0)) === 'warning' ? 'warning' : 'success'" />
                <el-tag :type="getUsageTagType(Number(row.usage_rate || 0))">{{ formatRate(row.usage_rate) }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="manager_name" label="负责人" min-width="120" />
          <el-table-column prop="created_at" label="创建日期" min-width="140">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleDetail(row)">查看</el-button>
              <el-button v-if="getAuditStatusMeta(row.flowstate).label === '待审核'" link type="warning" @click="handleAuditOpen(row)">审核</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogVisible" title="新建成本预算" width="560px">
        <el-form :model="formModel" label-width="100px">
          <el-form-item label="项目名称" required>
            <el-select v-model="formModel.project_id" filterable placeholder="请选择项目" style="width: 100%" @change="handleProjectChange">
              <el-option
                v-for="item in projectOptions"
                :key="item.rowid"
                :label="item.project_name || item.project_code || item.rowid"
                :value="item.rowid"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="预算类别" required>
            <el-select v-model="formModel.category" placeholder="请选择预算类别" style="width: 100%">
              <el-option v-for="item in budgetCategoryOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="预算金额" required>
            <el-input-number v-model="formModel.budget_amount" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="负责人">
            <StaffPicker v-model="formModel.manager_id" :required="false" placeholder="请选择负责人" @update:data="handleManagerPicked" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="formModel.remark" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="附件上传">
            <FileUpload
              :key="uploadKey"
              :model-value="[]"
              :api="uploadCustomerAttachment"
              :limit="9"
              :file-size="50"
              :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']"
              :is-show-tip="false"
              :show-file-list="false"
              @success="handleAttachmentUploadSuccess"
            />
            <span class="minor-text">你可以上传 9 个附件，每个最大 50MB</span>
          </el-form-item>
          <el-form-item v-if="attachments.length" label="已选附件">
            <div class="attachment-list">
              <el-tag v-for="(item, index) in attachments" :key="item.file_path || item.file_name" closable @close="handleDeleteAttachment(item, index)">
                {{ item.file_name }}
              </el-tag>
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="detailVisible"
        :title="detailMode === 'audit' ? '成本预算审核' : '预算详情'"
        width="760px"
        :class="['budget-detail-dialog', detailMode === 'audit' ? 'audit-dialog--top' : '']"
        :top="detailMode === 'audit' ? '4vh' : '8vh'"
      >
        <div v-if="detailRow" class="budget-detail">
          <div class="budget-detail__hero">
            <div>
              <div class="budget-detail__label">预算金额</div>
              <div class="budget-detail__amount">¥{{ formatMoney(detailRow.budget_amount) }}</div>
              <div class="budget-detail__project">{{ getProjectName(detailRow) }}</div>
            </div>
            <div class="budget-detail__status-stack">
              <el-tag :type="getAuditStatusMeta(detailRow.flowstate).type" size="large">
                {{ getAuditStatusMeta(detailRow.flowstate).label }}
              </el-tag>
              <el-tag :type="getUsageTagType(Number(detailRow.usage_rate || 0))" effect="plain">
                {{ formatRate(detailRow.usage_rate) }}
              </el-tag>
            </div>
          </div>

          <div class="budget-detail__progress-card">
            <div class="budget-detail__progress-head">
              <span>预算执行进度</span>
              <span>{{ formatRate(detailRow.usage_rate) }}</span>
            </div>
            <el-progress
              :percentage="Math.min(Number(detailRow.usage_rate || 0), 100)"
              :status="getUsageTagType(Number(detailRow.usage_rate || 0)) === 'danger' ? 'exception' : getUsageTagType(Number(detailRow.usage_rate || 0)) === 'warning' ? 'warning' : 'success'"
              :stroke-width="12"
            />
          </div>

          <div class="budget-detail__metrics">
            <div class="budget-metric-card">
              <div class="budget-detail__label">已使用</div>
              <div class="budget-metric-card__value warning">¥{{ formatMoney(detailRow.used_amount) }}</div>
            </div>
            <div class="budget-metric-card">
              <div class="budget-detail__label">剩余金额</div>
              <div class="budget-metric-card__value" :class="Number(detailRow.remaining_amount || 0) < 0 ? 'danger' : 'success'">
                ¥{{ formatMoney(detailRow.remaining_amount) }}
              </div>
            </div>
            <div class="budget-metric-card">
              <div class="budget-detail__label">预算类别</div>
              <div class="budget-metric-card__value">{{ detailRow.category || '--' }}</div>
            </div>
          </div>

          <div class="budget-detail__section">
            <div class="budget-detail__section-title">基础信息</div>
            <div class="budget-detail__info-grid">
              <div class="budget-detail__info-item">
                <span>负责人</span>
                <strong>{{ detailRow.manager_name || '--' }}</strong>
              </div>
              <div class="budget-detail__info-item">
                <span>创建日期</span>
                <strong>{{ formatDate(detailRow.created_at || detailRow.createtime) }}</strong>
              </div>
              <div class="budget-detail__info-item">
                <span>预算年度</span>
                <strong>{{ detailRow.year || '--' }}</strong>
              </div>
            </div>
          </div>

          <div class="budget-detail__section">
            <div class="budget-detail__section-title">附件</div>
            <div class="budget-detail__attachments">
              <el-tag
                v-for="item in attachments"
                :key="item.file_path || item.file_name"
                effect="plain"
                class="budget-detail__attachment"
                @click="handleDownloadAttachment(item)"
              >
                {{ item.file_name }}（{{ formatAttachmentSize(item.file_size) }}）
              </el-tag>
              <span v-if="!attachments.length" class="minor-text">无附件</span>
            </div>
          </div>

          <div v-if="detailMode === 'view'" class="budget-detail__section">
            <div class="budget-detail__section-title">审批意见</div>
            <div class="budget-detail__content">{{ getBudgetAuditRemark(detailRow) }}</div>
          </div>

          <div v-if="detailMode === 'audit' && getAuditStatusMeta(detailRow?.flowstate).label === '待审核'" class="budget-detail__section budget-detail__section--audit">
            <div class="budget-detail__section-title">审批意见</div>
            <el-input v-model="auditRemark" type="textarea" :rows="4" placeholder="请输入审核意见，可选" />
          </div>
        </div>
        <template #footer>
          <el-button @click="detailVisible = false">关闭</el-button>
          <template v-if="detailMode === 'audit' && getAuditStatusMeta(detailRow?.flowstate).label === '待审核'">
            <el-button type="danger" :loading="submitting" @click="handleAudit(false)">驳回</el-button>
            <el-button type="primary" :loading="submitting" @click="handleAudit(true)">通过</el-button>
          </template>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.project-budget-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-budget-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.project-budget-page__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.project-budget-page__subtitle {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}
.project-budget-page__header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.project-budget-page__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-card__label {
  color: var(--el-text-color-secondary);
}
.stat-card__value {
  font-size: 22px;
  font-weight: 700;
}
.stat-card__value--warning { color: var(--el-color-warning); }
.stat-card__value--primary { color: var(--el-color-primary); }
.stat-card__mix {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
  font-weight: 700;
}
.project-budget-page__filter {
  display: flex;
  flex-wrap: wrap;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-header__extra {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.rate-cell {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
.success { color: var(--el-color-success); }
.warning { color: var(--el-color-warning); }
.danger { color: var(--el-color-danger); }
.budget-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.budget-detail__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-fill-color-blank));
}
.budget-detail__label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.budget-detail__amount {
  margin-top: 4px;
  color: var(--el-color-primary);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.budget-detail__project {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 500;
}
.budget-detail__status-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.budget-detail__progress-card,
.budget-detail__section,
.budget-metric-card {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}
.budget-detail__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.budget-detail__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.budget-metric-card__value {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 700;
}
.budget-detail__section-title {
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}
.budget-detail__info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.budget-detail__info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.budget-detail__info-item span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.budget-detail__info-item strong {
  color: var(--el-text-color-primary);
  font-size: 15px;
}
.budget-detail__content {
  min-height: 42px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
  white-space: pre-wrap;
}
.budget-detail__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 28px;
}
.budget-detail__attachment {
  cursor: pointer;
}
.budget-detail__section--audit {
  background: var(--el-color-warning-light-9);
}
@media (max-width: 768px) {
  .budget-detail__hero {
    flex-direction: column;
  }
  .budget-detail__metrics,
  .budget-detail__info-grid {
    grid-template-columns: 1fr;
  }
}
:global(.audit-dialog--top.el-dialog) {
  margin-top: 4vh !important;
}
@media (max-width: 1200px) {
  .project-budget-page__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
