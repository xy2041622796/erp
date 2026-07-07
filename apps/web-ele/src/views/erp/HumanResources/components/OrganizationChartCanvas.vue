<script lang="ts" setup>
import { computed } from 'vue';

defineOptions({ name: 'OrganizationChartCanvas' });

export interface ChartNodeItem {
  id: string;
  title: string;
  subtitle?: string;
  metrics?: Array<{ label: string; value: string | number }>;
  children?: ChartNodeItem[];
}

const props = defineProps<{
  nodes: ChartNodeItem[];
  activeId?: string;
}>();

const emit = defineEmits<{
  select: [node: ChartNodeItem];
}>();

const innerNodes = computed(() => props.nodes || []);
</script>

<template>
  <div class="chart-canvas">
    <div v-for="node in innerNodes" :key="node.id" class="chart-node-wrap">
      <div
        class="chart-card"
        :class="{ active: node.id === activeId }"
        @click="emit('select', node)"
      >
        <div class="chart-card__title">{{ node.title }}</div>
        <div v-if="node.subtitle" class="chart-card__subtitle">{{ node.subtitle }}</div>
        <div v-if="node.metrics?.length" class="chart-card__metrics">
          <div v-for="metric in node.metrics" :key="metric.label" class="metric-item">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </div>
        </div>
      </div>
      <div v-if="node.children?.length" class="chart-children">
        <OrganizationChartCanvas :nodes="node.children" :active-id="activeId" @select="emit('select', $event)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-canvas {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.chart-node-wrap {
  position: relative;
  padding-left: 16px;
  border-left: 1px dashed #dcdfe6;
}
.chart-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  cursor: pointer;
}
.chart-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 24%, #fff);
}
.chart-card__title {
  font-size: 15px;
  font-weight: 600;
}
.chart-card__subtitle {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}
.chart-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.metric-item {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #606266;
}
.metric-item strong {
  color: #303133;
}
.chart-children {
  margin-top: 10px;
}
</style>
