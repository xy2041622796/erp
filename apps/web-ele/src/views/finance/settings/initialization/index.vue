<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton, ElCheckbox, ElDialog, ElMessage } from 'element-plus';

import { reinitializeCurrentFinanceAccountSet } from '#/api/erp/finance/settings/project';
import { useAccountSetStore } from '#/store';

defineOptions({ name: 'FinanceSettingsInitialization' });

const accountSetStore = useAccountSetStore();
const confirmed = ref(false);
const confirmDialogVisible = ref(false);
const secondConfirmed = ref(false);
const submitting = ref(false);
const accountSetName = computed(
  () =>
    accountSetStore.currentName || accountSetStore.displayName || '当前账套',
);

const resetScopes = [
  '新增的所有会计科目、辅助核算等基础设置',
  '部门辅助核算档案会按系统部门表重新初始化',
  '所有已录入的凭证、发票、日记账、资产及初始化数据',
  '已保存的凭证模板、数据透视表模板等个性化配置模板',
  '如果您已经结账，重新初始化后会退回到账套启用期间',
];

function handleOpenConfirm() {
  if (!confirmed.value) {
    ElMessage.warning('请先勾选确认已知晓操作风险');
    return;
  }
  secondConfirmed.value = false;
  confirmDialogVisible.value = true;
}

async function handleConfirmReinitialize() {
  if (!secondConfirmed.value) {
    ElMessage.warning('请先勾选二次确认');
    return;
  }

  submitting.value = true;
  try {
    const res = await reinitializeCurrentFinanceAccountSet();
    ElMessage.success(
      `财务数据已重新初始化：删除 ${Number(res.deletedCount || 0)} 条，账户归零 ${Number(res.resetAmountCount || 0)} 条，科目恢复 ${Number(res.subjectResult?.restoredCount || 0)} 条，部门初始化 ${Number(res.departmentResult?.sourceCount || 0)} 条`,
    );
    confirmDialogVisible.value = false;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <div class="initialization-page">
      <div class="initialization-panel">
        <h1 class="initialization-title">
          重新初始化将彻底清空您在账套中录入的所有数据，并不可恢复，请慎重！！
        </h1>

        <div class="initialization-content">
          <p class="initialization-backup-warning">
            请务必先备份当前账套数据，确认备份可用后再执行重新初始化。
          </p>
          <p class="initialization-summary">
            您将要重新初始化账套：{{ accountSetName }}，以下数据将被永久删除：
          </p>

          <ul class="initialization-list">
            <li v-for="item in resetScopes" :key="item">{{ item }}</li>
          </ul>

          <ElCheckbox v-model="confirmed" class="initialization-confirm">
            我已完成当前账套数据备份，并清楚重新初始化将会清空所有数据
          </ElCheckbox>
        </div>

        <div class="initialization-actions">
          <ElButton :disabled="!confirmed" @click="handleOpenConfirm">
            重新初始化
          </ElButton>
        </div>
      </div>

      <ElDialog
        v-model="confirmDialogVisible"
        title="重新初始化确认"
        width="min(680px, 92vw)"
        :close-on-click-modal="false"
        :close-on-press-escape="!submitting"
      >
        <div class="reinitialize-dialog">
          <div class="reinitialize-dialog__title">
            该操作将清空当前账套数据，且不可恢复。
          </div>
          <div class="reinitialize-dialog__backup">
            请确认已完成当前账套数据备份，并验证备份文件可用。
          </div>
          <div class="reinitialize-dialog__account">
            当前账套：{{ accountSetName }}
          </div>
          <ul class="reinitialize-dialog__list">
            <li v-for="item in resetScopes" :key="item">{{ item }}</li>
          </ul>
          <ElCheckbox
            v-model="secondConfirmed"
            class="reinitialize-dialog__check"
          >
            我再次确认已完成数据备份，并需要重新初始化当前账套
          </ElCheckbox>
        </div>
        <template #footer>
          <div class="reinitialize-dialog__footer">
            <ElButton
              :disabled="submitting"
              @click="confirmDialogVisible = false"
            >
              取消
            </ElButton>
            <ElButton
              type="danger"
              :disabled="!secondConfirmed"
              :loading="submitting"
              @click="handleConfirmReinitialize"
            >
              确认重新初始化
            </ElButton>
          </div>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.initialization-page {
  display: flex;
  min-height: calc(100vh - 150px);
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(28px, 6vh, 52px) 24px 40px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.initialization-panel {
  width: min(820px, 100%);
}

.initialization-title {
  margin: 0 0 32px;
  color: #ff3b47;
  font-size: clamp(18px, 1.85vw, 24px);
  font-weight: 700;
  line-height: 1.6;
  text-align: left;
  white-space: nowrap;
}

.initialization-content {
  color: #111827;
  font-size: clamp(15px, 1.55vw, 21px);
  font-weight: 600;
  line-height: 1.85;
}

.initialization-summary {
  margin: 0 0 32px;
  font-weight: 700;
}

.initialization-backup-warning {
  margin: 0 0 16px;
  color: #e6a23c;
  font-weight: 700;
}

.initialization-list {
  margin: 0 0 52px 56px;
  padding: 0;
  list-style: none;
}

.initialization-list li {
  margin: 0;
}

.initialization-confirm {
  margin-bottom: 46px;
  color: #111827;
  font-size: clamp(15px, 1.55vw, 21px);
  font-weight: 600;
  white-space: normal;
}

.initialization-confirm :deep(.el-checkbox__inner) {
  border-color: #9ca3af;
}

.initialization-confirm:hover :deep(.el-checkbox__inner) {
  border-color: #6b7280;
}

.initialization-actions {
  text-align: center;
}

.initialization-actions :deep(.el-button) {
  min-width: 152px;
  height: 48px;
  border-radius: 2px;
  font-size: clamp(16px, 1.5vw, 20px);
  font-weight: 700;
}

.reinitialize-dialog {
  color: #111827;
  font-size: 15px;
  line-height: 1.8;
}

.reinitialize-dialog__title {
  color: #ff3b47;
  font-size: 18px;
  font-weight: 700;
}

.reinitialize-dialog__account {
  margin-top: 10px;
  font-weight: 700;
}

.reinitialize-dialog__backup {
  margin-top: 10px;
  color: #e6a23c;
  font-weight: 700;
}

.reinitialize-dialog__list {
  margin: 18px 0 22px;
  padding-left: 22px;
}

.reinitialize-dialog__check :deep(.el-checkbox__inner) {
  border-color: #9ca3af;
}

.reinitialize-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 980px) {
  .initialization-panel {
    width: min(760px, 100%);
  }

  .initialization-title {
    white-space: normal;
  }
}

@media (max-width: 760px) {
  .initialization-page {
    padding: 28px 18px 36px;
  }

  .initialization-title {
    margin-bottom: 24px;
    font-size: 18px;
    line-height: 1.55;
  }

  .initialization-content,
  .initialization-confirm {
    font-size: 15px;
    line-height: 1.75;
  }

  .initialization-summary {
    margin-bottom: 22px;
  }

  .initialization-list {
    margin: 0 0 36px 24px;
  }

  .initialization-confirm {
    margin-bottom: 34px;
  }

  .initialization-actions :deep(.el-button) {
    min-width: 128px;
    height: 40px;
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .initialization-page {
    min-height: calc(100vh - 110px);
    padding: 24px 16px 32px;
  }

  .initialization-panel {
    width: 100%;
  }

  .initialization-title {
    font-size: 16px;
  }

  .initialization-list {
    margin-left: 0;
  }
}
</style>
