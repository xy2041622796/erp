<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/resource/equipment';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';

import { resourceEquipmentConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
</script>

<template>
  <ProjectSubmoduleCrudPage :config="resourceEquipmentConfig" :apis="apis" />
</template>
