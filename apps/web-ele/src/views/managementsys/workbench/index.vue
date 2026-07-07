<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { Bell, Lock, Setting, User } from '@element-plus/icons-vue';

import { ElCard, ElCol, ElRow, ElTag } from 'element-plus';

defineOptions({ name: 'SystemWorkbench' });

const metrics = [
  { label: '用户总数', value: '126', trend: '启用账号 118', icon: User },
  { label: '角色权限', value: '24', trend: '待调整 3', icon: Lock },
  { label: '系统配置', value: '17', trend: '近期变更', icon: Setting },
  { label: '通知告警', value: '8', trend: '未处理', icon: Bell },
];

const todos = [
  '待审核权限变更 3 条',
  '待处理系统告警 2 条',
  '待检查维度结果 1 条',
  '待发布系统通知 2 条',
];

const shortcuts = ['权限配置', '维度结果', '导入方案', '系统设置', '消息通知', '编码设计'];
</script>

<template>
  <Page>
    <div class="module-workbench-page">
      <ElCard shadow="never" class="hero-card">
        <div class="hero-header">
          <div>
            <div class="hero-title">首页</div>
            <div class="hero-desc">聚合权限、维度、导入方案与系统配置入口，作为系统模块专属首页。</div>
          </div>
          <ElTag type="info" size="large">SYSTEM</ElTag>
        </div>
      </ElCard>

      <ElRow :gutter="16">
        <ElCol v-for="item in metrics" :key="item.label" :lg="6" :md="12" :sm="12" :xs="24">
          <ElCard shadow="never" class="metric-card">
            <div class="metric-head">
              <component :is="item.icon" class="metric-icon" />
              <span>{{ item.label }}</span>
            </div>
            <div class="metric-value">{{ item.value }}</div>
            <div class="metric-trend">{{ item.trend }}</div>
          </ElCard>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16">
        <ElCol :lg="14" :md="24" :sm="24" :xs="24">
          <ElCard shadow="never" header="重点待办">
            <div class="list-wrap">
              <div v-for="item in todos" :key="item" class="list-item">{{ item }}</div>
            </div>
          </ElCard>
        </ElCol>
        <ElCol :lg="10" :md="24" :sm="24" :xs="24">
          <ElCard shadow="never" header="常用入口">
            <div class="shortcut-wrap">
              <span v-for="item in shortcuts" :key="item" class="shortcut-item">{{ item }}</span>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>
    </div>
  </Page>
</template>

<style scoped>
.module-workbench-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hero-card,
.metric-card {
  border-radius: 14px;
}
.hero-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.hero-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}
.hero-desc,
.metric-trend {
  margin-top: 8px;
  color: #909399;
  line-height: 1.6;
}
.metric-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}
.metric-icon {
  width: 18px;
  height: 18px;
}
.metric-value {
  margin-top: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}
.list-wrap,
.shortcut-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.list-item {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
}
.shortcut-item {
  padding: 10px 14px;
  border-radius: 999px;
  background: #eef2f6;
  color: #475569;
}
</style>
