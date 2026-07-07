<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

defineOptions({ name: 'ErpSettingsCloseReopen' });

const selectedDate = ref('2026-04-27');
const checkDialogVisible = ref(false);
const records = ref([
  {
    closeDate: '2026-04-27',
    operateDate: '2026-04-27 15:52:21',
    operator: '管理员',
  },
]);

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function handleClose() {
  checkDialogVisible.value = true;
}

function handleRecheck() {
  ElMessage.success('已重新检查，当前负库存检查已完成');
}

function confirmClose() {
  records.value = [
    {
      closeDate: selectedDate.value,
      operateDate: formatDateTime(new Date()),
      operator: '管理员',
    },
    ...records.value,
  ];
  checkDialogVisible.value = false;
  ElMessage.success('结账页面演示操作完成');
}

function handleReverseClose() {
  ElMessage.warning('当前为页面壳子，反结账逻辑后续再接接口');
}
</script>

<template>
  <Page auto-content-height>
    <div class="close-page">
      <div class="top-bar">
        <div class="left-box">
          <span class="label">日期：</span>
          <el-date-picker
            v-model="selectedDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="请选择日期"
            style="width: 190px"
          />
        </div>
        <div class="right-box">
          <el-button type="primary" @click="handleClose">结账</el-button>
          <el-button @click="handleReverseClose">反结账</el-button>
        </div>
      </div>

      <div class="tip-text">
        结账日期不能小于系统启用日期：<b>2026-02-25</b>，也不能小于或等于上次结账日期：<b>2026-04-27</b>，结账日期之前的数据只能查询，不能修改。
      </div>

      <div class="table-wrap">
        <el-table :data="records" border stripe>
          <el-table-column prop="closeDate" label="结账日" min-width="220" />
          <el-table-column prop="operateDate" label="操作日期" min-width="260" />
          <el-table-column prop="operator" label="操作员" min-width="180" />
        </el-table>
      </div>

      <el-dialog
        v-model="checkDialogVisible"
        title="影响结账检查提示"
        width="640px"
      >
        <div class="check-body">
          <div class="check-row">
            <span class="check-label">负库存检查：</span>
            <span class="check-ok">
              <span class="ok-icon">!</span>
              已完成
            </span>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="handleRecheck">重新检查</el-button>
            <el-button type="primary" @click="confirmClose">结账</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.close-page {
  min-height: 100%;
  padding: 8px;
  background: #f5f7fa;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.left-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 14px;
  color: #303133;
}

.right-box {
  display: flex;
  gap: 12px;
}

.tip-text {
  margin-bottom: 14px;
  color: #7f8c9d;
  font-size: 14px;
  line-height: 22px;
}

.table-wrap {
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.check-body {
  min-height: 120px;
  padding: 8px 0;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #303133;
}

.check-label {
  min-width: 110px;
}

.check-ok {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-weight: 500;
}

.ok-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: #fff;
  background: #2ac06d;
  border-radius: 50%;
  font-size: 13px;
  line-height: 18px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
