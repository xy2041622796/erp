<script lang="ts" setup>
import type { InfraCodegenApi } from '#/api/infra/codegen';

import { ref, unref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';


import { getCodegenTable, updateCodegenTable } from '#/api/infra/codegen';
import { $t } from '#/locales';

import BasicInfo from '../modules/basic-info.vue';
import ColumnInfo from '../modules/column-info.vue';
import GenerationInfo from '../modules/generation-info.vue';

import {
  ElButton,
  ElLoading,
  ElMessage,
  ElStep,
  ElSteps,
} from 'element-plus';

const route = useRoute();
const router = useRouter();
const loading = ref(false);

/** 当前所在步骤 */
const currentStep = ref(0);
/** 已经“跑到/完成”的最大步骤（用于限制提前点击） */
const maxStepReached = ref(0);

const formData = ref<InfraCodegenApi.CodegenDetail>({
  table: {} as InfraCodegenApi.CodegenTable,
  columns: [],
});

/** 表单引用 */
const basicInfoRef = ref<InstanceType<typeof BasicInfo>>();
const columnInfoRef = ref<InstanceType<typeof ColumnInfo>>();
const generateInfoRef = ref<InstanceType<typeof GenerationInfo>>();

/** 获取详情数据 */
async function getDetail() {
  const id = route.query.id as any;
  if (!id) {
    return;
  }
  loading.value = true;
  try {
    formData.value = await getCodegenTable(id);
  } finally {
    loading.value = false;
  }
}

/** 是否允许跳转到某一步：未跑到的步骤不允许提前点击 */
function canJumpTo(stepIndex: number) {
  return stepIndex <= maxStepReached.value;
}

/** 点击步骤（受 maxStepReached 限制） */
function onStepClick(stepIndex: number) {
  if (!canJumpTo(stepIndex)) {
    return;
  }
  currentStep.value = stepIndex;
}

/** 提交表单 */
async function submitForm() {
  // 表单验证
  const basicInfoValid = await basicInfoRef.value?.validate();
  if (!basicInfoValid) {
    ElMessage.warning('保存失败，原因：基本信息表单校验失败请检查！！！');
    return;
  }
  const generateInfoValid = await generateInfoRef.value?.validate();
  if (!generateInfoValid) {
    ElMessage.warning('保存失败，原因：生成信息表单校验失败请检查！！！');
    return;
  }

  // 提交表单
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.updating'),
  });
  try {
    // 拼接相关信息
    const basicInfo = await basicInfoRef.value?.getValues();
    const columns = columnInfoRef.value?.getData() || unref(formData).columns;
    const generateInfo = await generateInfoRef.value?.getValues();
    await updateCodegenTable({
      table: { ...unref(formData).table, ...basicInfo, ...generateInfo },
      columns,
    });
    // 关闭并提示
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    close();
  } catch (error) {
    console.error('保存失败', error);
  } finally {
    loadingInstance.close();
  }
}

/** 返回列表 */
const tabs = useTabs();
function close() {
  tabs.closeCurrentTab();
  router.push({ name: 'InfraCodegen' });
}

/** 下一步 */
function nextStep() {
  if (currentStep.value >= steps.length - 1) {
    return;
  }
  currentStep.value += 1;
  if (currentStep.value > maxStepReached.value) {
    maxStepReached.value = currentStep.value;
  }
}

/** 上一步 */
function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value -= 1;
  }
}

/** 步骤配置 */
const steps = [
  {
    title: '基本信息',
  },
  {
    title: '字段信息',
  },
  {
    title: '生成信息',
  },
];

// 初始化
getDetail();
</script>

<template>
  <Page auto-content-height v-loading="loading">
    <div class="flex h-[95%] flex-col rounded-md bg-card p-4">
      <ElSteps :active="currentStep" class="mb-8 rounded shadow-sm" simple>
        <ElStep
          v-for="(step, index) in steps"
          :key="index"
          :title="step.title"
          :class="[
            canJumpTo(index)
              ? 'cursor-pointer'
              : 'cursor-not-allowed opacity-60',
          ]"
          @click="() => onStepClick(index)"
        />
      </ElSteps>

      <div class="flex-1 overflow-auto py-4">
        <!-- 根据当前步骤显示对应的组件 -->
        <BasicInfo
          v-show="currentStep === 0"
          ref="basicInfoRef"
          :table="formData.table"
        />
        <ColumnInfo
          v-show="currentStep === 1"
          ref="columnInfoRef"
          :columns="formData.columns"
        />
        <GenerationInfo
          v-show="currentStep === 2"
          ref="generateInfoRef"
          :table="formData.table"
          :columns="formData.columns"
        />
      </div>

      <div class="mt-4 flex justify-end space-x-2">
        <ElButton :disabled="currentStep === 0" @click="prevStep">
          上一步
        </ElButton>
        <ElButton
          :disabled="currentStep === steps.length - 1"
          @click="nextStep"
        >
          下一步
        </ElButton>
        <ElButton type="primary" :loading="loading" @click="submitForm">
          保存
        </ElButton>
      </div>
    </div>
  </Page>
</template>
