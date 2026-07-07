<script lang="ts" setup>
defineOptions({ name: 'HrPageIntro' });

defineProps<{
  title: string;
  description?: string;
  tags?: string[];
}>();
</script>

<template>
  <div class="hr-page-intro">
    <div class="intro-main">
      <div class="intro-text">
        <h2>{{ title }}</h2>
        <p>{{ description || 'ERP 人力资源模块页面。' }}</p>
      </div>
      <div v-if="tags?.length" class="intro-tags">
        <span v-for="tag in tags" :key="tag" class="intro-tag">{{ tag }}</span>
      </div>
    </div>
    <div v-if="$slots.actions" class="intro-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.hr-page-intro {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 10px;
  background: #fff;
}
.intro-main {
  min-width: 0;
}
.intro-text h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.intro-text p {
  margin: 8px 0 0;
  color: #909399;
  line-height: 1.6;
}
.intro-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.intro-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #606266;
  font-size: 12px;
}
.intro-actions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
</style>
