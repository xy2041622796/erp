<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
onMounted(() => { router.replace('/erp/project/dashboard'); });
</script>
<template><div /></template>
