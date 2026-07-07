<script lang="ts" setup>

import type { QuickLinkItem } from '../types';

import { ElButton, ElCard, ElCol, ElRow } from 'element-plus';

defineProps<{
  quickLinks: QuickLinkItem[];
}>();

const emit = defineEmits<{
  go: [path: string];
}>();
</script>

<template>
  <el-row :gutter="16">
    <el-col v-for="link in quickLinks" :key="link.path" :xs="24" :sm="12" :lg="6">
      <el-card shadow="hover" class="link-card">
        <div class="link-title">{{ link.title }}</div>
        <div class="link-desc">{{ link.desc }}</div>
        <div class="link-actions">
          <el-button type="primary" link @click="emit('go', link.path)">{{ link.buttonText }}</el-button>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<style scoped>
.link-card { min-height: 182px; border-radius:12px; }
.link-title { font-size:18px; font-weight:600; margin-bottom:10px; }
.link-desc { min-height:88px; color:var(--el-text-color-secondary); line-height:1.8; }
.link-actions { margin-top:12px; }
</style>
