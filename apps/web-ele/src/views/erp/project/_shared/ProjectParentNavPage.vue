<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ElButton, ElCard, ElTag } from 'element-plus';


export interface ProjectParentNavItem {
  title: string;
  description: string;
  path: string;
  tag?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
}

const props = defineProps<{
  title: string;
  description: string;
  items: ProjectParentNavItem[];
}>();

const router = useRouter();

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <Page auto-content-height>
    <div class="mb-5 rounded-xl bg-white p-5 shadow-sm">
      <div class="text-xl font-semibold">{{ props.title }}</div>
      <div class="mt-2 text-sm text-gray-500">{{ props.description }}</div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ElCard
        v-for="item in props.items"
        :key="item.path"
        shadow="hover"
        class="rounded-xl"
      >
        <div class="flex min-h-[170px] flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-3">
              <div class="text-base font-semibold">{{ item.title }}</div>
              <ElTag v-if="item.tag" size="small" type="info">{{ item.tag }}</ElTag>
            </div>
            <div class="mt-3 text-sm leading-6 text-gray-500">{{ item.description }}</div>
          </div>

          <div class="mt-5 flex items-center gap-2">
            <ElButton type="primary" @click="go(item.path)">
              {{ item.primaryActionText || '进入' }}
            </ElButton>
            <ElButton v-if="item.secondaryActionText" @click="go(item.path)">
              {{ item.secondaryActionText }}
            </ElButton>
          </div>
        </div>
      </ElCard>
    </div>
  </Page>
</template>
