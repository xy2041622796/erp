<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElMessage,
  ElRadio,
  ElRadioGroup,
} from 'element-plus';
import { WarningFilled } from '@element-plus/icons-vue';

defineOptions({ name: 'ErpReinitialize' });

const accountSetName = ref('武汉晨虹科技有限公司');
const backupUrl = ref('javascript:void(0)');
const confirmDialogVisible = ref(false);
const consequenceChecked = ref(false);

const form = reactive({
  keepBasicData: 'yes',
  keepOpeningData: 'yes',
});

const canNext = computed(() => Boolean(form.keepBasicData && form.keepOpeningData));

function handleBackupClick() {
  ElMessage.info('这里后续接入备份下载接口');
}

function handleNext() {
  if (!canNext.value) {
    ElMessage.warning('请先选择是否保留基础资料和期初数据');
    return;
  }
  consequenceChecked.value = false;
  confirmDialogVisible.value = true;
}

function handleConfirmReset() {
  if (!consequenceChecked.value) {
    ElMessage.warning('请先勾选“我已清楚了解将产生的后果”');
    return;
  }
  confirmDialogVisible.value = false;
  ElMessage.success('重新初始化操作已提交');
}
</script>

<template>
  <Page auto-content-height>
    <div class="reinitialize-page">
      <div class="content-box">
        <div class="account-line">
          您将要重新初始化账套：
          <span class="account-name">{{ accountSetName }}</span>
        </div>

        <div class="warning-line">
          <ElIcon class="warning-icon"><WarningFilled /></ElIcon>
          <span class="warning-strong">重新初始化该账套后，所有的数据都不能再恢复！请谨慎操作！</span>
          <span class="normal-tip"> 如需保存账套数据，请先备份数据下载到本地保存</span>
        </div>

        <a class="backup-link" :href="backupUrl" @click.prevent="handleBackupClick">点击前往备份</a>

        <ElForm :model="form" class="option-form" label-position="top">
          <ElFormItem label="是否保存基础资料模块的数据？ （商品、客户、供应商等）">
            <ElRadioGroup v-model="form.keepBasicData">
              <ElRadio label="yes">是</ElRadio>
              <ElRadio label="no">否</ElRadio>
            </ElRadioGroup>
          </ElFormItem>

          <ElFormItem label="是否保存业务模块的期初数据？">
            <ElRadioGroup v-model="form.keepOpeningData">
              <ElRadio label="yes">是</ElRadio>
              <ElRadio label="no">否</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElForm>

        <div class="next-row">
          <ElButton type="primary" @click="handleNext">下一步</ElButton>
        </div>
      </div>

      <ElDialog
        v-model="confirmDialogVisible"
        title="提示"
        width="780px"
        :close-on-click-modal="false"
      >
        <div class="confirm-body">
          <div class="confirm-title">
            <ElIcon class="warning-icon"><WarningFilled /></ElIcon>
            <span>重新初始化系统将会清空你录入的所有数据，请慎重！</span>
          </div>
          <div class="confirm-list">
            <div>1、系统将删除您录入的所有业务单据数据</div>
            <div>2、系统将删除您新增的权限用户</div>
            <div>3、系统将删除您创建的打印模板</div>
            <div>4、系统将删除您的操作日志列表</div>
          </div>
          <ElCheckbox v-model="consequenceChecked" class="consequence-check">
            我已清楚了解将产生的后果
          </ElCheckbox>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <ElButton type="primary" :disabled="!consequenceChecked" @click="handleConfirmReset">
              确定
            </ElButton>
            <ElButton @click="confirmDialogVisible = false">取消</ElButton>
          </div>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.reinitialize-page {
  min-height: 100%;
  background: #fff;
}

.content-box {
  width: 1068px;
  max-width: calc(100vw - 320px);
  margin: 132px auto 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.7;
}

.account-line {
  margin-bottom: 28px;
  font-weight: 600;
}

.account-name {
  color: #1e9fff;
  font-weight: 700;
}

.warning-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.warning-icon {
  color: #ffc107;
  font-size: 22px;
}

.warning-strong {
  color: #ff1f1f;
  font-size: 20px;
  font-weight: 700;
}

.normal-tip {
  color: #1f2937;
  font-weight: 600;
}

.backup-link {
  display: inline-block;
  margin: 2px 0 42px;
  color: #1e9fff;
  font-size: 18px;
  text-decoration: none;
}

.option-form {
  font-size: 18px;
  font-weight: 700;
}

.option-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.option-form :deep(.el-form-item__label) {
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  line-height: 30px;
}

.option-form :deep(.el-radio__label) {
  font-size: 18px;
}

.next-row {
  margin-top: 40px;
  text-align: center;
}

.next-row :deep(.el-button) {
  width: 86px;
  height: 36px;
  font-size: 16px;
}

.confirm-body {
  padding: 8px 0 12px;
  color: #5d6673;
  font-size: 25px;
  line-height: 1.75;
}

.confirm-title {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ff1f1f;
  font-size: 24px;
  font-weight: 700;
}

.confirm-list {
  margin: 14px 0 18px 42px;
}

.consequence-check {
  margin-left: 0;
}

.consequence-check :deep(.el-checkbox__label) {
  color: #7a8491;
  font-size: 22px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 40px;
}

.dialog-footer :deep(.el-button) {
  width: 102px;
  height: 50px;
  font-size: 20px;
}
</style>
