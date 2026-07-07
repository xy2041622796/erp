<script lang="ts" setup>
import { computed } from 'vue';

import { Page } from '@vben/common-ui';
import { useRoute } from 'vue-router';

import ImportDesignEditor from './components/ImportDesignEditor.vue';

const route = useRoute();
const schemeId = computed(() => String(route.query.schemeid || route.query.rowid || ''));
</script>

<template>
  <Page auto-content-height>
    <div class="import-design-wrapper">
      <ImportDesignEditor :scheme-id="schemeId" />
    </div>
  </Page>
</template>

<style scoped>
.import-design-wrapper {
  height: 100%;
  padding: 16px;
}
</style>
