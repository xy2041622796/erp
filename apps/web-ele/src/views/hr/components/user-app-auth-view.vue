<script lang="ts" setup>
defineOptions({ name: 'HrUserAppAuthView' });

defineProps<{
  appName?: string;
  embedded?: boolean;
  showHeader?: boolean;
  sysId?: string;
  userId?: string;
  userName?: string;
}>();
</script>

<template>
  <div class="user-app-auth-view">
    <div v-if="showHeader !== false" class="user-app-auth-view__title">权限查看</div>
    <div class="user-app-auth-view__row"><span>应用：</span><b>{{ appName || '-' }}</b></div>
    <div class="user-app-auth-view__row"><span>人员：</span><b>{{ userName || '-' }}</b></div>
    <div class="user-app-auth-view__row"><span>用户ID：</span><b>{{ userId || '-' }}</b></div>
    <div class="user-app-auth-view__row"><span>系统ID：</span><b>{{ sysId || '-' }}</b></div>
    <div class="user-app-auth-view__tip">当前页面已完成权限查看入口适配，明细权限树可后续接入 web-ele 权限组件。</div>
  </div>
</template>

<style scoped>
.user-app-auth-view { padding: 16px; line-height: 1.8; color: var(--el-text-color-primary); }
.user-app-auth-view__title { margin-bottom: 12px; font-weight: 600; }
.user-app-auth-view__row { display: flex; gap: 8px; }
.user-app-auth-view__row span { color: var(--el-text-color-secondary); }
.user-app-auth-view__tip { margin-top: 12px; color: var(--el-text-color-secondary); }
</style>
