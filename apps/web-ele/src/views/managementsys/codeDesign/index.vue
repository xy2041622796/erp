<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  checkExistingCodeDesigns,
  createDefaultErpCodeConfigs,
  createFullCodeDesign,
  type ApiResult,
  type ErpCodeConfig,
} from '#/api/erp/code-design';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElEmpty,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

interface ExecutionLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface ConfigStatus {
  config: ErpCodeConfig;
  status: 'pending' | 'running' | 'success' | 'error';
  exists: boolean;
  existingCount: number;
  result?: ApiResult;
}

function buildStatuses(): ConfigStatus[] {
  return createDefaultErpCodeConfigs().map((config) => ({
    config,
    status: 'pending',
    exists: false,
    existingCount: 0,
  }));
}

const isRunning = ref(false);
const isChecking = ref(false);
const keyword = ref('');
const logs = ref<ExecutionLog[]>([]);
const summary = ref<{ failed: number; success: number } | null>(null);
const existsSummary = ref<{ exists: number; notExists: number } | null>(null);
const configStatuses = ref<ConfigStatus[]>(buildStatuses());

const totalCount = computed(() => configStatuses.value.length);
const pendingCount = computed(() => configStatuses.value.filter((item) => !item.exists).length);
const existsCount = computed(() => configStatuses.value.filter((item) => item.exists).length);
const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return configStatuses.value;
  return configStatuses.value.filter((item) =>
    [
      item.config.busTableName,
      item.config.busTableRowid,
      item.config.name,
      item.config.prefix,
      item.config.businessCode,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text)),
  );
});

function addLog(type: ExecutionLog['type'], message: string) {
  logs.value.unshift({
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    type,
    message,
  });
}

function resetState() {
  configStatuses.value = buildStatuses();
  logs.value = [];
  summary.value = null;
  existsSummary.value = null;
  ElMessage.success('已恢复默认配置');
}

async function checkExisting() {
  isChecking.value = true;
  addLog('info', '开始检查现有编码配置状态...');
  try {
    const result = await checkExistingCodeDesigns(configStatuses.value.map((item) => item.config));
    if (result.success) {
      configStatuses.value = configStatuses.value.map((item) => {
        const existingRows = result.existingMap.get(item.config.busTableRowid) || [];
        return {
          ...item,
          exists: existingRows.length > 0,
          existingCount: existingRows.length,
        };
      });
      const exists = configStatuses.value.filter((item) => item.exists).length;
      existsSummary.value = { exists, notExists: configStatuses.value.length - exists };
      addLog('success', result.message);
    } else {
      addLog('error', result.message);
      ElMessage.error(result.message);
    }
  } catch (error: any) {
    const msg = error?.message || String(error);
    addLog('error', `检查异常: ${msg}`);
    ElMessage.error(msg);
  } finally {
    isChecking.value = false;
  }
}

async function executeSingle(index: number) {
  const current = configStatuses.value[index];
  if (!current) return;
  current.status = 'running';
  addLog('info', `开始执行: ${current.config.name}`);

  try {
    const result = await createFullCodeDesign(current.config);
    current.result = result;
    current.status = result.success ? 'success' : 'error';
    if (result.success) {
      current.exists = true;
      current.existingCount += 1;
      addLog('success', `✓ ${current.config.name} 创建成功`);
      ElMessage.success(`${current.config.name} 创建成功`);
    } else {
      addLog('error', `✗ ${current.config.name} 创建失败: ${result.message}`);
      ElMessage.error(result.message);
    }
  } catch (error: any) {
    const msg = error?.message || String(error);
    current.status = 'error';
    current.result = { success: false, message: msg };
    addLog('error', `✗ ${current.config.name} 执行异常: ${msg}`);
    ElMessage.error(msg);
  }
}

async function executeAll() {
  isRunning.value = true;
  addLog('info', '开始批量创建编码配置...');
  let success = 0;
  let failed = 0;

  for (let i = 0; i < configStatuses.value.length; i++) {
    const item = configStatuses.value[i];
    item.status = 'running';
    try {
      const result = await createFullCodeDesign(item.config);
      item.result = result;
      item.status = result.success ? 'success' : 'error';
      if (result.success) {
        item.exists = true;
        item.existingCount += 1;
        success++;
        addLog('success', `[${i + 1}/${configStatuses.value.length}] ${item.config.name} 创建成功`);
      } else {
        failed++;
        addLog('error', `[${i + 1}/${configStatuses.value.length}] ${item.config.name} 创建失败: ${result.message}`);
      }
    } catch (error: any) {
      failed++;
      const msg = error?.message || String(error);
      item.status = 'error';
      item.result = { success: false, message: msg };
      addLog('error', `[${i + 1}/${configStatuses.value.length}] ${item.config.name} 执行异常: ${msg}`);
    }
  }

  summary.value = { success, failed };
  addLog('info', `批量执行完成：成功 ${success} 个，失败 ${failed} 个`);
  isRunning.value = false;
}

onMounted(() => {
  checkExisting();
});
</script>

<template>
  <Page auto-content-height>
    <div class="erp-code-design-page">
      <div class="page-header">
        <div>
          <h2>ERP / CRM 编码设计初始化</h2>
          <p class="page-desc">
            按照 ArchiveCodeDesign 的逻辑执行：点击“执行”后，直接创建 Base_CodeDesign 主记录与 Base_CodeNodeDesign 节点记录。
          </p>
        </div>
        <div class="header-actions">
          <ElButton :loading="isChecking" @click="checkExisting">检查状态</ElButton>
          <ElButton :disabled="isRunning" @click="resetState">重置默认</ElButton>
          <ElButton type="primary" :loading="isRunning" @click="executeAll">批量执行</ElButton>
        </div>
      </div>

      <ElAlert type="warning" :closable="false" show-icon>
        <template #title>当前预置配置</template>
        <div>
          已预置 {{ totalCount }} 条编码配置，已包含客户、退货、库存调拨、库存盘点、客户商机、客户线索等表；关系表与日志表默认先写入业务快照字段，执行前建议确认。
        </div>
      </ElAlert>

      <div class="summary-row">
        <ElCard shadow="never">
          <div class="summary-value">{{ totalCount }}</div>
          <div class="summary-label">配置总数</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-value primary">{{ pendingCount }}</div>
          <div class="summary-label">待确认</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-value success">{{ existsSummary?.exists || existsCount }}</div>
          <div class="summary-label">已存在配置</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-value warning">{{ summary?.failed || 0 }}</div>
          <div class="summary-label">执行失败</div>
        </ElCard>
      </div>

      <div class="content-grid">
        <ElCard shadow="never" class="left-card">
          <template #header>
            <div class="card-header">
              <span>编码配置列表</span>
              <ElInput v-model="keyword" class="search-input" clearable placeholder="按表名 / rowid / 规则名筛选" />
            </div>
          </template>

          <ElTable :data="filteredRows" stripe border height="560" size="small">
            <ElTableColumn type="index" width="55" label="#" />
            <ElTableColumn label="状态" width="110" fixed="left">
              <template #default="{ row }">
                <ElTag v-if="row.status === 'running'" type="primary">执行中</ElTag>
                <ElTag v-else-if="row.status === 'success'" type="success">成功</ElTag>
                <ElTag v-else-if="row.status === 'error'" type="danger">失败</ElTag>
                <ElTag v-else-if="row.exists" type="info">已存在</ElTag>
                <ElTag v-else>待执行</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="config.busTableName" label="表名" min-width="170" show-overflow-tooltip />
            <ElTableColumn prop="config.busTableRowid" label="表ID" min-width="240" show-overflow-tooltip />
            <ElTableColumn label="规则名称" min-width="180">
              <template #default="{ row }">
                <ElInput v-model="row.config.name" size="small" :disabled="isRunning" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="前缀" width="110">
              <template #default="{ row }">
                <ElInput v-model="row.config.prefix" size="small" :disabled="isRunning" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="编码字段" min-width="140">
              <template #default="{ row }">
                <ElInput v-model="row.config.businessCode" size="small" :disabled="isRunning" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="主键字段" width="110">
              <template #default="{ row }">
                <ElInput v-model="row.config.keyField" size="small" :disabled="isRunning" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="日期格式" width="120">
              <template #default="{ row }">
                <ElInput v-model="row.config.dateFormat" size="small" :disabled="isRunning" />
              </template>
            </ElTableColumn>
            <ElTableColumn label="已存在条数" width="100">
              <template #default="{ row }">
                {{ row.existingCount }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="说明" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.config.note || '-' }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="100" fixed="right">
              <template #default="{ $index }">
                <ElButton type="primary" link :disabled="isRunning" @click="executeSingle($index)">执行</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>

        <ElCard shadow="never" class="right-card">
          <template #header>
            <div class="card-header">
              <span>执行日志</span>
              <span class="sub-text" v-if="summary">成功 {{ summary.success }}，失败 {{ summary.failed }}</span>
            </div>
          </template>

          <div class="log-panel" v-if="logs.length > 0">
            <div v-for="(log, index) in logs" :key="index" class="log-item" :class="`log-${log.type}`">
              <span class="log-time">[{{ log.timestamp }}]</span>
              <span class="log-text">{{ log.message }}</span>
            </div>
          </div>
          <ElEmpty v-else description="点击“检查状态”或“执行”后显示日志" />
        </ElCard>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.erp-code-design-page {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-desc {
  margin: 6px 0 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.summary-value {
  font-size: 26px;
  font-weight: 700;
}

.summary-value.primary {
  color: var(--el-color-primary);
}

.summary-value.success {
  color: var(--el-color-success);
}

.summary-value.warning {
  color: var(--el-color-warning);
}

.summary-label {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.content-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 2.1fr 1fr;
  gap: 16px;
}

.left-card,
.right-card {
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sub-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.search-input {
  width: 260px;
}

.log-panel {
  height: 560px;
  overflow: auto;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.log-item {
  display: flex;
  gap: 8px;
  line-height: 1.7;
  word-break: break-all;
}

.log-success {
  color: #86efac;
}

.log-error {
  color: #fca5a5;
}

.log-warning {
  color: #fde68a;
}

.log-info {
  color: #bfdbfe;
}

.log-time {
  color: #94a3b8;
  flex-shrink: 0;
}

@media (max-width: 1400px) {
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
