<script lang="ts" setup>
defineOptions({ name: 'HrAnalyticsPanel' });

interface MetricCard {
  label: string;
  value: string | number;
  tip?: string;
}

defineProps<{
  metrics: MetricCard[];
}>();
</script>

<template>
  <div class="hr-analytics-panel">
    <div v-for="item in metrics" :key="item.label" class="metric-card">
      <div class="metric-label">{{ item.label }}</div>
      <div class="metric-value">{{ item.value }}</div>
      <div v-if="item.tip" class="metric-tip">{{ item.tip }}</div>
    </div>
  </div>
</template>

<style scoped>
.hr-analytics-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.metric-card {
  padding: 16px;
  border-radius: 10px;
  background: #fff;
}
.metric-label {
  color: #909399;
  font-size: 13px;
}
.metric-value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
}
.metric-tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
