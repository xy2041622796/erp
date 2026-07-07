<script setup lang="ts">
import type { CrmCustomerApi } from '#/api/erp/customer';

import { computed } from 'vue';

import { ElCard, ElTag } from 'element-plus';


const props = defineProps<{
  customer?: CrmCustomerApi.Customer | null;
}>();

const customerInfo = computed(() => (props.customer || {}) as any);

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

const stageKey = computed(() => {
  const customer = customerInfo.value;
  const isPool = Number(customer.isPool || 0);
  const dealStatus = Number(customer.dealStatus ? 1 : 0);
  if (isPool === 1 && dealStatus === 0) return 'pool';
  if (isPool === 0 && dealStatus === 0) return 'resource';
  if (isPool === 0 && dealStatus === 1) return 'formal';
  return 'unknown';
});

const stageLabel = computed(() => {
  if (stageKey.value === 'pool') return '公海资源';
  if (stageKey.value === 'resource') return '跟进中资源';
  if (stageKey.value === 'formal') return '正式客户';
  return '未知状态';
});

const stageTagType = computed(() => {
  if (stageKey.value === 'pool') return 'warning';
  if (stageKey.value === 'resource') return 'success';
  if (stageKey.value === 'formal') return 'primary';
  return 'info';
});

const ownershipSummary = computed(() => [
  { label: '负责人', value: customerInfo.value?.ownerUserName || '-' },
  { label: '部门', value: customerInfo.value?.departName || customerInfo.value?.ownerUserDeptName || '-' },
  {
    label: '来源线索',
    value: [customerInfo.value?.sourceLeadCode, customerInfo.value?.sourceLeadName].filter(Boolean).join(' / ') || '-',
  },
  { label: '更新时间', value: formatDateTime(customerInfo.value?.updateTime || customerInfo.value?.updatetime) },
]);

const stageSummary = computed(() => {
  const items = [{ label: '当前阶段', value: stageLabel.value }];

  if (stageKey.value === 'pool') {
    items.push(
      { label: '进入公海时间', value: formatDateTime(customerInfo.value?.poolTime) },
      { label: '公海原因', value: customerInfo.value?.poolReason || '-' },
    );
  } else if (stageKey.value === 'resource') {
    items.push(
      { label: '领取后阶段', value: '已领取，待转正式客户' },
      { label: '最近公海原因', value: customerInfo.value?.poolReason || '-' },
    );
  } else if (stageKey.value === 'formal') {
    items.push(
      { label: '转正状态', value: '已转正式客户' },
      {
        label: '历史公海信息',
        value: customerInfo.value?.poolTime
          ? `${formatDateTime(customerInfo.value?.poolTime)}${customerInfo.value?.poolReason ? ` / ${customerInfo.value?.poolReason}` : ''}`
          : '-',
      },
    );
  } else {
    items.push(
      { label: '最近跟进时间', value: formatDateTime(customerInfo.value?.lastFollowTime) },
      { label: '下次跟进时间', value: formatDateTime(customerInfo.value?.nextFollowTime) },
    );
  }

  return items;
});
</script>

<template>
  <ElCard shadow="never" class="status-summary-card" :class="`stage-${stageKey}`">
    <div class="status-main">
      <div class="title-row">
        <div>
          <div class="subject-title">{{ customer?.name || customer?.customerName || '新建主体' }}</div>
          <div class="subject-code">主体编号：{{ customer?.customerCode || '-' }}</div>
        </div>
        <div class="title-tags">
          <ElTag :type="stageTagType">{{ stageLabel }}</ElTag>
        </div>
      </div>

      <div class="summary-grid">
        <section class="summary-group">
          <div class="group-title">归属</div>
          <div v-for="item in ownershipSummary" :key="item.label" class="summary-row">
            <span class="summary-label">{{ item.label }}</span>
            <span class="summary-value" :class="{ multiline: item.label.includes('来源') }">{{ item.value }}</span>
          </div>
        </section>

        <section class="summary-group summary-group-stage">
          <div class="group-title">阶段</div>
          <div v-for="item in stageSummary" :key="item.label" class="summary-row">
            <span class="summary-label">{{ item.label }}</span>
            <span class="summary-value" :class="{ multiline: item.label.includes('历史') || item.label.includes('原因') }">{{ item.value }}</span>
          </div>
        </section>
      </div>
    </div>
  </ElCard>
</template>

<style scoped>
.status-summary-card {
  border-radius: 16px;
  border: 1px solid var(--el-border-color-light);
}

.status-main {
  min-width: 0;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.subject-title {
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.subject-code {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.title-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.summary-group {
  min-width: 0;
  border-radius: 14px;
  padding: 16px;
  background: var(--el-fill-color-light);
}

.summary-group-stage {
  background: color-mix(in srgb, var(--el-color-primary-light-9) 70%, white);
}

.group-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.summary-row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  margin-bottom: 10px;
}

.summary-row:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  min-width: 0;
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-value.multiline {
  white-space: normal;
  line-height: 1.5;
}

.stage-pool {
  border-color: color-mix(in srgb, var(--el-color-warning) 28%, white);
}

.stage-resource {
  border-color: color-mix(in srgb, var(--el-color-success) 24%, white);
}

.stage-formal {
  border-color: color-mix(in srgb, var(--el-color-primary) 24%, white);
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .title-row {
    flex-direction: column;
  }
}
</style>
