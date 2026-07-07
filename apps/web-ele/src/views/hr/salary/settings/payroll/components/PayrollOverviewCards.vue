<script lang="ts" setup>
import { ElCard, ElCol, ElRow } from 'element-plus';


defineProps<{
  overviewCards: Array<{
    key: string;
    label: string;
    total: number;
    enabled: number;
  }>;
}>();
</script>

<template>
  <el-row :gutter="12" class="overview-row">
    <el-col v-for="card in overviewCards" :key="card.key" :xs="12" :sm="8" :md="6" :lg="3">
      <el-card shadow="hover" class="overview-card">
        <div class="overview-title">{{ card.label }}</div>
        <div class="overview-value">{{ card.total }}</div>
        <div class="overview-sub">启用 {{ card.enabled }} 项</div>
      </el-card>
    </el-col>
  </el-row>
</template>

<style scoped>
.overview-row {
  margin-bottom: 4px;
}

.overview-card {
  border-radius: 10px;
}

.overview-title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-bottom: 8px;
}

.overview-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.overview-sub {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 6px;
}
</style>
