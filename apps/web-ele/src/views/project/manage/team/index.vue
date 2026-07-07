<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  router.replace({
    path: '/project/manage/member',
    query: {
      ...route.query,
      tab: 'current',
    },
  });
});
</script>

<template>
  <div />
</template>
