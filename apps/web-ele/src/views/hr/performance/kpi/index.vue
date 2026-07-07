<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';


/** siweiOA 指标设定静态业务页迁移 */
defineOptions({ name: 'HrPerformanceKpiPage' });

interface KpiRow {
  kpiId: string;
  kpiName: string;
  kpiType: string;
  department: string;
  weight: string;
  target: string;
  cycle: string;
  status: string;
}

const rows = ref<KpiRow[]>([
  { kpiId: 'KPI-001', kpiName: '项目完成率', kpiType: 'KPI', department: '技术部', weight: '40', target: '≥95%', cycle: '季度', status: '有效' },
  { kpiId: 'KPI-002', kpiName: '代码质量评分', kpiType: 'KPI', department: '技术部', weight: '30', target: '≥85分', cycle: '月度', status: '有效' },
  { kpiId: 'KPI-003', kpiName: '客户满意度', kpiType: 'OKR', department: '产品部', weight: '35', target: '≥4.5分', cycle: '季度', status: '有效' },
  { kpiId: 'KPI-004', kpiName: '销售额完成率', kpiType: 'KPI', department: '市场部', weight: '50', target: '≥100%', cycle: '月度', status: '有效' },
]);

const dialogOpen = ref(false);
const editing = ref<KpiRow | null>(null);
const form = reactive<KpiRow>({
  kpiId: '',
  kpiName: '',
  kpiType: 'KPI',
  department: '',
  weight: '',
  target: '',
  cycle: '月度',
  status: '有效',
});

const kpiCount = computed(() => rows.value.filter((row) => row.kpiType === 'KPI').length);
const okrCount = computed(() => rows.value.filter((row) => row.kpiType === 'OKR').length);

function resetForm() {
  form.kpiId = '';
  form.kpiName = '';
  form.kpiType = 'KPI';
  form.department = '';
  form.weight = '';
  form.target = '';
  form.cycle = '月度';
  form.status = '有效';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: KpiRow) {
  editing.value = row;
  Object.assign(form, row);
  dialogOpen.value = true;
}

function openView(row: KpiRow) {
  ElMessage.info(`查看指标：${row.kpiName}`);
}

async function handleDelete(row: KpiRow) {
  try {
    await ElMessageBox.confirm(`确认删除指标「${row.kpiName}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  rows.value = rows.value.filter((item) => item.kpiId !== row.kpiId);
  ElMessage.success('删除成功');
}

function submit() {
  if (!form.kpiId.trim()) {
    ElMessage.warning('请输入指标编号');
    return;
  }
  if (!form.kpiName.trim()) {
    ElMessage.warning('请输入指标名称');
    return;
  }
  if (!form.department.trim()) {
    ElMessage.warning('请输入适用部门');
    return;
  }

  const payload = { ...form };
  if (editing.value) Object.assign(editing.value, payload);
  else rows.value = [payload, ...rows.value];
  ElMessage.success('保存成功');
  dialogOpen.value = false;
}
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-kpi">
      <div class="page-header">
        <div>
          <h2>指标设定</h2>
          <p>灵活配置 KPI 或 OKR 等绩效考核指标，支持多维度考核体系。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增指标</el-button>
      </div>

      <div class="summary-grid">
        <el-card shadow="never">
          <div class="summary-number">{{ rows.length }}</div>
          <div class="summary-label">指标总数</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ kpiCount }}</div>
          <div class="summary-label">KPI 指标</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ okrCount }}</div>
          <div class="summary-label">OKR 指标</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">5</div>
          <div class="summary-label">本月更新</div>
        </el-card>
      </div>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">绩效指标列表</div>
        </template>
        <el-table :data="rows" row-key="kpiId" border height="100%">
          <el-table-column prop="kpiId" label="指标编号" width="120" />
          <el-table-column prop="kpiName" label="指标名称" min-width="180" show-overflow-tooltip />
          <el-table-column label="指标类型" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.kpiType === 'KPI' ? 'primary' : 'warning'" effect="plain">{{ row.kpiType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="department" label="适用部门" width="120" />
          <el-table-column prop="weight" label="权重(%)" width="100" />
          <el-table-column prop="target" label="目标值" width="120" />
          <el-table-column prop="cycle" label="考核周期" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '有效' ? 'success' : 'info'" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="170">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑指标' : '新增指标'" width="720px" destroy-on-close>
        <el-form :model="form" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="指标编号" required>
                <el-input v-model="form.kpiId" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="指标名称" required>
                <el-input v-model="form.kpiName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="指标类型">
                <el-select v-model="form.kpiType" style="width: 100%">
                  <el-option label="KPI" value="KPI" />
                  <el-option label="OKR" value="OKR" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用部门" required>
                <el-input v-model="form.department" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="权重(%)">
                <el-input v-model="form.weight" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="目标值">
                <el-input v-model="form.target" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="考核周期">
                <el-select v-model="form.cycle" style="width: 100%">
                  <el-option label="月度" value="月度" />
                  <el-option label="季度" value="季度" />
                  <el-option label="年度" value="年度" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="有效" value="有效" />
                  <el-option label="停用" value="停用" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="dialogOpen = false">取消</el-button>
          <el-button type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-kpi {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-header p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-number {
  font-size: 24px;
  font-weight: 700;
}

.summary-label {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

.card-title {
  font-weight: 600;
}
</style>
