<script setup lang="ts">
import { Page } from '@vben/common-ui';

import CustomerCenterView from './modules/customer-center-view.vue';
</script>

<template>
  <Page auto-content-height>
    <CustomerCenterView mode="route" />
  </Page>
</template>
