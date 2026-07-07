<script setup lang="ts">
import { useVbenModal } from '@vben/common-ui';

import ProjectForm from '#/views/erp/contract/project/modules/form.vue';

const [Modal, modalApi] = useVbenModal({
  footer: false,
  class: 'w-[1200px]',
});
</script>

<template>
  <Modal title="项目详情">
    <ProjectForm />
  </Modal>
</template>
