<script lang="ts" setup>
import { computed } from 'vue';

import { Page } from '@vben/common-ui';

const props = defineProps<{
  title: string;
  navigationUrl: string;
  navFormId?: string;
  apiModule?: string;
  note?: string;
}>();

const fullPath = computed(() => `/project/${props.navigationUrl}`.replace(/\/+/g, '/'));
</script>

<template>
  <Page auto-content-height>
    <div class="rounded-xl border border-dashed border-gray-300 bg-white p-6">
      <div class="text-lg font-semibold">{{ title }}</div>
      <div class="mt-2 text-sm text-gray-600">页面路径：{{ fullPath }}</div>
      <div class="mt-1 text-sm text-gray-600">导航 formId：{{ navFormId || '-' }}</div>
      <div class="mt-1 text-sm text-gray-600">对应 API：{{ apiModule || '-' }}</div>
      <div class="mt-4 text-sm text-amber-600">
        {{ note || '当前页面已建立宿主目录、入口页面与 skill 文件；业务 UI 尚未迁入。' }}
      </div>
    </div>
  </Page>
</template>
