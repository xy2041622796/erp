<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

import { ElButton } from 'element-plus';


defineOptions({ name: 'PaymentTypeSelectModal' });

export type PaymentTypeItem = {
  label: string;
  help?: string;
};

const props = withDefaults(
  defineProps<{
    title?: string;
    types?: PaymentTypeItem[];
  }>(),
  {
    title: '新增付款申请',
    types: () => [
      { label: '交押金/保证金' },
      { label: '员工借支' },
      { label: '预付款' },
      { label: '借出款' },
      { label: '退回预收款' },
      { label: '业务付款' },
      { label: '直接付款' },
      { label: '工资付款' },
    ],
  },
);

const emit = defineEmits<{
  confirm: [value: { paymentType: string }];
}>();

function choose(label: string) {
  emit('confirm', { paymentType: label });
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
});

defineExpose({ modalApi });
</script>

<template>
  <Modal :title="props.title" class="!w-[260px]" :footer="false">
    <div class="px-2 py-2">
      <div class="flex flex-col">
        <ElButton
          v-for="t in props.types"
          :key="t.label"
          text
          class="!justify-start !h-10"
          @click="choose(t.label)"
        >
          <span class="text-[15px]">{{ t.label }}</span>
        </ElButton>
      </div>
    </div>
  </Modal>
</template>
