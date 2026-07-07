<script lang="ts" setup>
defineOptions({ name: 'HrListDetailPage' });

defineProps<{
  asideWidth?: string;
}>();
</script>

<template>
  <div class="hr-list-detail-page" :style="{ '--hr-aside-width': asideWidth || '320px' }">
    <aside class="page-aside">
      <slot name="aside"></slot>
    </aside>
    <section class="page-main">
      <slot></slot>
    </section>
  </div>
</template>

<style scoped>
.hr-list-detail-page {
  display: grid;
  grid-template-columns: minmax(260px, var(--hr-aside-width)) minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}
.page-aside,
.page-main {
  min-width: 0;
}
@media (max-width: 1200px) {
  .hr-list-detail-page {
    grid-template-columns: 1fr;
  }
}
</style>
