<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
onMounted(() => { router.replace('/project/dashboard'); });
</script>
<template><div /></template>
