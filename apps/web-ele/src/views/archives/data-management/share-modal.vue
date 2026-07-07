<script lang="ts" setup>
import { ElAlert, ElButton } from 'element-plus';


defineProps<{
  visible?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <div>
    <ElAlert
      title="当前 file_FJ 表没有 Member 或分享人员字段，不能保存分享人员；页面已隐藏分享按钮。"
      type="warning"
      :closable="false"
      show-icon
    />
    <div class="mt-4 flex justify-end">
      <ElButton type="primary" @click="emit('close')">我知道了</ElButton>
    </div>
  </div>
</template>
