<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import {
  getSalaryRuleBundle,
  resetSalaryRulesByType,
  upsertSalaryRulesByType,
} from '#/api/erp/finance/cashier/salaryRule';
import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import {
  defaultAttendanceSettlementRules,
  type AttendanceSettlementRule,
} from '#/views/finance/cashier/wages/attendance-settlement-rules';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElCol,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRow,
  ElSelect,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpFinanceCashierAttendanceSettlementRulePage' });

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const salaryItemOptions = ref<Array<{ code: string; label: string }>>([]);
const form = reactive<AttendanceSettlementRule>({ ...defaultAttendanceSettlementRules[0]! });

const overtimeItemLabel = computed(() => salaryItemOptions.value.find((item) => item.code === form.overtimeItemCode)?.label || form.overtimeItemCode || '未指定');
const deductionItemLabel = computed(() => salaryItemOptions.value.find((item) => item.code === form.attendanceDeductionItemCode)?.label || form.attendanceDeductionItemCode || '未指定');

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function buildSalaryItemOptions(list: any[]) {
  return (list || [])
    .map((item) => {
      const code = normalizeText(item.item_code);
      const name = normalizeText(item.display_name || item.item_name || item.item_code);
      return { code, label: `${name}（${code}）` };
    })
    .filter((item) => item.code)
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

function applyRule(rule?: AttendanceSettlementRule) {
  Object.assign(form, { ...defaultAttendanceSettlementRules[0]!, ...(rule || {}) });
}

async function loadData() {
  loading.value = true;
  try {
    const [bundle, itemMetaRes] = await Promise.all([
      getSalaryRuleBundle(),
      getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
    ]);
    salaryItemOptions.value = buildSalaryItemOptions(itemMetaRes.list || []);
    applyRule(bundle.attendanceSettlementRules?.[0]);
  } catch (error: any) {
    ElMessage.error(error?.message || '加载月度结算规则失败');
  } finally {
    loading.value = false;
  }
}

function validateForm() {
  if (!normalizeText(form.code)) throw new Error('规则编码不能为空');
  if (!normalizeText(form.title)) throw new Error('规则标题不能为空');
  if (Number(form.overtimeMultiplierWorkday) < 0) throw new Error('加班倍率不能小于 0');
  if (Number(form.sickLeaveDeductRate) < 0 || Number(form.sickLeaveDeductRate) > 1) throw new Error('病假折算比例必须在 0 到 1 之间');
  if (Number(form.personalLeaveDeductRate) < 0 || Number(form.personalLeaveDeductRate) > 1) throw new Error('事假折算比例必须在 0 到 1 之间');
  if (Number(form.annualLeaveDeductRate) < 0 || Number(form.annualLeaveDeductRate) > 1) throw new Error('年假折算比例必须在 0 到 1 之间');
  if (Number(form.absentDeductRate) < 0 || Number(form.absentDeductRate) > 1) throw new Error('旷工折算比例必须在 0 到 1 之间');
  if (Number(form.dailySalaryDays) <= 0) throw new Error('月计薪天数必须大于 0');
  if (Number(form.workHoursPerDay) <= 0) throw new Error('日工时必须大于 0');
}

async function handleSave() {
  saving.value = true;
  try {
    validateForm();
    await upsertSalaryRulesByType('ATTENDANCE', [{ ...form }]);
    ElMessage.success('月度结算规则已保存');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleResetDefault() {
  saving.value = true;
  try {
    await resetSalaryRulesByType('ATTENDANCE');
    ElMessage.success('已恢复默认月度结算规则');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '恢复默认失败');
  } finally {
    saving.value = false;
  }
}

function go(path: string) {
  router.push(path);
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div v-loading="loading" class="attendance-settlement-page">
      <el-card shadow="never" class="hero-card">
        <div class="hero-row">
          <div>
            <div class="hero-title">月度结算规则维护</div>
            <div class="hero-desc">
              用于参数化“考勤扣款 / 加班工资 / 病假折算”三类月度工资汇总规则。工资表页的“汇总计算当月工资”会读取这里的规则。
            </div>
          </div>
          <div class="hero-actions">
            <el-button @click="go('/erp/finance/cashier/settings')">返回基础设置</el-button>
            <el-button type="warning" plain :loading="saving" @click="handleResetDefault">恢复默认</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">保存规则</el-button>
          </div>
        </div>
        <div class="hero-tags">
          <el-tag type="success">加班项目：{{ overtimeItemLabel }}</el-tag>
          <el-tag type="warning">考勤扣款项目：{{ deductionItemLabel }}</el-tag>
        </div>
      </el-card>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="第一版参数化范围：工作日加班倍率、病假/事假/年假/旷工折算比例、迟到早退固定扣款、月计薪天数、日工时，以及结算归集到哪个工资项。"
      />

      <el-card shadow="never" class="rule-card">
        <el-form :model="form" label-width="140px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="规则编码" required>
                <el-input v-model="form.code" placeholder="例如 ATTENDANCE_SETTLEMENT_DEFAULT" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规则标题" required>
                <el-input v-model="form.title" placeholder="例如 默认月度考勤结算规则" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="规则说明">
            <el-input v-model="form.description" type="textarea" :rows="2" />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="工作日加班倍率">
                <el-input-number v-model="form.overtimeMultiplierWorkday" :min="0" :step="0.1" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="病假折算比例">
                <el-input-number v-model="form.sickLeaveDeductRate" :min="0" :max="1" :step="0.1" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="事假折算比例">
                <el-input-number v-model="form.personalLeaveDeductRate" :min="0" :max="1" :step="0.1" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="年假折算比例">
                <el-input-number v-model="form.annualLeaveDeductRate" :min="0" :max="1" :step="0.1" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="旷工折算比例">
                <el-input-number v-model="form.absentDeductRate" :min="0" :max="1" :step="0.1" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="迟到早退扣款">
                <el-input-number v-model="form.lateEarlyFixedAmount" :min="0" :step="10" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="月计薪天数">
                <el-input-number v-model="form.dailySalaryDays" :min="1" :step="0.25" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="日工时">
                <el-input-number v-model="form.workHoursPerDay" :min="1" :step="0.5" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="加班归集工资项">
                <el-select v-model="form.overtimeItemCode" filterable allow-create style="width: 100%">
                  <el-option v-for="item in salaryItemOptions" :key="item.code" :label="item.label" :value="item.code" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="考勤扣款工资项">
            <el-select v-model="form.attendanceDeductionItemCode" filterable allow-create style="width: 100%">
              <el-option v-for="item in salaryItemOptions" :key="item.code" :label="item.label" :value="item.code" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </Page>
</template>

<style scoped>
.attendance-settlement-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-card,
.rule-card {
  border-radius: 12px;
}

.hero-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.hero-title {
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 700;
}

.hero-desc {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.hero-actions,
.hero-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-tags {
  margin-top: 14px;
}
</style>
