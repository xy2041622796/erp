<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

defineOptions({ name: 'ErpSettingsReinitAccountSet' });

const keepBasicData = ref('yes');
const keepOpeningData = ref('yes');
const confirmDialogVisible = ref(false);
const understood = ref(false);
const companyName = ref('武汉晟虹科技有限公司');

function handleNext() {
  confirmDialogVisible.value = true;
  understood.value = false;
}

function handleConfirm() {
  if (!understood.value) return;
  confirmDialogVisible.value = false;
  ElMessage.success('重新初始化页面演示操作完成');
}
</script>

<template>
  <Page auto-content-height>
    <div class="reinit-page">
      <div class="card-box">
        <div class="title-line">
          您将要重新初始化账套：
          <span class="company-name">{{ companyName }}</span>
        </div>

        <div class="warning-line">
          <span class="warn-icon">!</span>
          <span class="warn-main">重新初始化该账套后，所有的数据都不能再恢复！请谨慎操作！</span>
          <span class="warn-sub">如需保存账套数据，请先备份数据下载到本地保存</span>
          <el-link type="primary" :underline="false">点击前往备份</el-link>
        </div>

        <div class="section-block">
          <div class="section-title">是否保存基础资料模块的数据？（商品、客户、供应商等）</div>
          <el-radio-group v-model="keepBasicData">
            <el-radio label="yes">是</el-radio>
            <el-radio label="no">否</el-radio>
          </el-radio-group>
        </div>

        <div class="section-block">
          <div class="section-title">是否保存业务模块的期初数据？</div>
          <el-radio-group v-model="keepOpeningData">
            <el-radio label="yes">是</el-radio>
            <el-radio label="no">否</el-radio>
          </el-radio-group>
        </div>

        <div class="action-row">
          <el-button type="primary" @click="handleNext">下一步</el-button>
        </div>
      </div>

      <el-dialog v-model="confirmDialogVisible" title="提示" width="780px">
        <div class="confirm-box">
          <div class="confirm-title">
            <span class="warn-icon">!</span>
            <span class="danger-text">重新初始化系统将会清空你录入的所有数据，请慎重！</span>
          </div>

          <ol class="confirm-list">
            <li>系统将删除您录入的所有业务单据数据</li>
            <li>系统将删除您新增的权限用户</li>
            <li>系统将删除您创建的打印模板</li>
            <li>系统将删除您的操作日志列表</li>
          </ol>

          <div class="checkbox-row">
            <el-checkbox v-model="understood">我已清楚了解将产生的后果</el-checkbox>
          </div>
        </div>

        <template #footer>
          <div class="dialog-footer">
            <el-button type="primary" :disabled="!understood" @click="handleConfirm">确定</el-button>
            <el-button @click="confirmDialogVisible = false">取消</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.reinit-page {
  min-height: 100%;
  padding: 18px 8px;
  background: #f5f7fa;
}

.card-box {
  max-width: 1050px;
  padding: 32px 40px 40px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.title-line {
  margin-bottom: 28px;
  font-size: 18px;
  color: #303133;
}

.company-name {
  color: #409eff;
  font-weight: 700;
}

.warning-line {
  margin-bottom: 38px;
  font-size: 16px;
  line-height: 30px;
}

.warn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  color: #fff;
  background: #e6a23c;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
}

.warn-main {
  color: #f56c6c;
  font-weight: 700;
}

.warn-sub {
  margin-left: 8px;
  color: #606266;
}

.section-block {
  margin-bottom: 30px;
}

.section-title {
  margin-bottom: 16px;
  font-size: 18px;
  color: #303133;
}

.action-row {
  padding-top: 18px;
  text-align: center;
}

.confirm-box {
  padding: 8px 4px;
}

.confirm-title {
  margin-bottom: 20px;
  font-size: 18px;
}

.danger-text {
  color: #f56c6c;
  font-weight: 700;
}

.confirm-list {
  padding: 0;
  margin: 0 0 24px 28px;
  color: #606266;
  font-size: 16px;
  line-height: 42px;
}

.checkbox-row {
  margin-top: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
