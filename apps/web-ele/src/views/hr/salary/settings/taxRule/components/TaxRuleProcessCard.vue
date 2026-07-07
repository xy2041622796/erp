<script lang="ts" setup>
import { ElCard } from 'element-plus';


defineProps<{
  processLinks: string[];
}>();
</script>

<template>
  <el-card shadow="never" class="process-card">
    <template #header>
      <div class="card-title">工资计算执行链路</div>
    </template>
    <div class="process-list">
      <div v-for="step in processLinks" :key="step">{{ step }}</div>
    </div>
  </el-card>
</template>

<style scoped>
.process-card { border-radius: 12px; }
.card-title { font-size:16px; font-weight:600; }
.process-list { display:grid; gap:10px; line-height:1.8; }
</style>
