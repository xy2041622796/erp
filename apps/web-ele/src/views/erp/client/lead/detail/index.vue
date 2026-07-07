<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';


import LeadCenterView from './modules/lead-center-view.vue';

import { ElButton } from 'element-plus';

const route = useRoute();
const router = useRouter();
const tabs = useTabs();

const leadId = ref<string>('');
const pageKey = ref(0);

const pageTitle = computed(() => (leadId.value ? '线索详情' : '线索'));

function handleBack() {
  tabs.closeCurrentTab();
  if (router.hasRoute('ErpClientLead')) {
    router.push({ name: 'ErpClientLead' });
    return;
  }
  router.back();
}

watch(
  () => route.params.id,
  (id) => {
    leadId.value = String(id || '');
    pageKey.value += 1;
  },
  { immediate: true },
);
</script>

<template>
  <Page auto-content-height :title="pageTitle">
    <template #extra>
      <div class="flex gap-2">
        <ElButton @click="handleBack">返回</ElButton>
      </div>
    </template>

    <LeadCenterView
      :key="`route-lead-center-${pageKey}-${leadId}`"
      mode="route"
      :lead-id="leadId"
      @close="handleBack"
      @saved="pageKey += 1"
    />
  </Page>
</template>
