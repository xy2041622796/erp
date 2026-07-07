<script lang="ts" setup>
import type { CrmReceivableApi } from '#/api/crm/receivable';


import { useDescription } from '#/components/description';

import { useDetailBaseSchema, useDetailSystemSchema } from '../data';

import { ElDivider } from 'element-plus';

defineProps<{
  receivable: CrmReceivableApi.Receivable; // 收款信息
}>();

const [BaseDescriptions] = useDescription({
  title: '基本信息',
  border: false,
  column: 4,
  schema: useDetailBaseSchema(),
});

const [SystemDescriptions] = useDescription({
  title: '系统信息',
  border: false,
  column: 3,
  schema: useDetailSystemSchema(),
});
</script>

<template>
  <div>
    <BaseDescriptions :data="receivable" />
    <ElDivider />
    <SystemDescriptions :data="receivable" />
  </div>
</template>
