<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { useTaxRulePage } from '#/views/finance/cashier/settings/taxRule/useTaxRulePage';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpFinanceCashierTaxRulePage' });

const {
  editing,
  loading,
  saving,
  taxRulesDraft,
  taxableSalaryItemOptions,
  beginEdit,
  saveAllRules,
  removeTaxRule,
  updateBaseItemCodes,
  formatBaseItemCodes,
  formatUpperBound,
  formatPercent,
} = useTaxRulePage();

const selectedRuleIndex = ref(0);
const ruleDialogVisible = ref(false);
const ruleDialogMode = ref<'create' | 'edit'>('edit');
const ruleForm = ref<any>(createDefaultRule());

const selectedRule = computed(() => taxRulesDraft.value[selectedRuleIndex.value] || taxRulesDraft.value[0]);

function cloneRule(rule: any) {
  return {
    ...rule,
    baseItemCodes: [...(rule?.baseItemCodes || [])],
    brackets: (rule?.brackets || []).map((item: any, index: number, arr: any[]) => ({
      upperBound: index === arr.length - 1 ? Number.POSITIVE_INFINITY : Number(item.upperBound || 0),
      rate: Number(item.rate || 0),
      quickDeduction: Number(item.quickDeduction || 0),
    })),
  };
}

function createDefaultRule() {
  const nextNo = taxRulesDraft.value.length + 1;
  return {
    code: `SALARY_TAX_RULE_${nextNo}`,
    title: `个税规则${nextNo}`,
    description: '',
    baseItemCodes: ['tax_base'],
    threshold: 5000,
    taxableIncomeMode: 'minus_threshold',
    minTaxableAmount: 0,
    roundMode: 'ROUND',
    brackets: [
      { upperBound: 3000, rate: 0.03, quickDeduction: 0 },
      { upperBound: Number.POSITIVE_INFINITY, rate: 0.1, quickDeduction: 210 },
    ],
  };
}

async function ensureEditMode() {
  if (!editing.value) await beginEdit();
}

async function openCreateRuleDialog() {
  await ensureEditMode();
  ruleDialogMode.value = 'create';
  ruleForm.value = createDefaultRule();
  ruleDialogVisible.value = true;
}

async function openEditRuleDialog(index: number) {
  await ensureEditMode();
  selectedRuleIndex.value = index;
  ruleDialogMode.value = 'edit';
  ruleForm.value = cloneRule(taxRulesDraft.value[index]);
  ruleDialogVisible.value = true;
}

async function submitRuleDialog() {
  const normalized = cloneRule(ruleForm.value);
  if (ruleDialogMode.value === 'create') {
    taxRulesDraft.value.push(normalized);
    selectedRuleIndex.value = taxRulesDraft.value.length - 1;
  } else {
    taxRulesDraft.value[selectedRuleIndex.value] = normalized;
  }
  editing.value = true;
  await saveAllRules();
  ruleDialogVisible.value = false;
}

function handleRemoveRule(index: number) {
  removeTaxRule(index);
  if (selectedRuleIndex.value >= taxRulesDraft.value.length) {
    selectedRuleIndex.value = Math.max(taxRulesDraft.value.length - 1, 0);
  }
  editing.value = true;
}

function addDialogBracket() {
  const brackets = ruleForm.value.brackets || [];
  if (brackets.length) {
    brackets[brackets.length - 1].upperBound = Math.max(Number(brackets[brackets.length - 2]?.upperBound || 0) + 3000, 3000);
  }
  brackets.push({ upperBound: Number.POSITIVE_INFINITY, rate: 0, quickDeduction: 0 });
  ruleForm.value.brackets = brackets;
}

function removeDialogBracket(index: number) {
  const brackets = ruleForm.value.brackets || [];
  if (brackets.length <= 1) return;
  brackets.splice(index, 1);
  if (brackets.length) brackets[brackets.length - 1].upperBound = Number.POSITIVE_INFINITY;
}

function selectRule(index: number) {
  selectedRuleIndex.value = index;
}
</script>

<template>
  <Page auto-content-height>
    <div v-loading="loading" class="tax-rule-page">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="本页面只维护个税税档。五险、社保、公积金比例和职级适用关系已拆到五险一金总体维护页面。"
      />

      <el-empty v-if="!taxRulesDraft.length" description="暂无个税规则">
        <el-button type="primary" @click="openCreateRuleDialog">新增税档规则</el-button>
      </el-empty>

      <div v-else class="tax-layout">
        <aside class="rule-list-panel">
          <div class="panel-head">
            <div>
              <div class="panel-title">税档描述</div>
              <div class="panel-subtitle">选择左侧规则查看右侧明细</div>
            </div>
            <el-button size="small" type="primary" @click="openCreateRuleDialog">新增</el-button>
          </div>

          <div class="rule-list">
            <div
              v-for="(rule, index) in taxRulesDraft"
              :key="rule.code || index"
              class="rule-item"
              :class="{ active: selectedRuleIndex === index }"
              @click="selectRule(index)"
            >
              <div class="rule-item-title">{{ rule.title || '未命名个税规则' }}</div>
              <div class="rule-item-code">{{ rule.code || '未设置规则编码' }}</div>
              <div class="rule-item-desc">{{ rule.description || '暂无说明' }}</div>
              <div class="rule-item-meta">
                <el-tag size="small" type="primary">起征点 {{ Number(rule.threshold || 0).toFixed(2) }}</el-tag>
                <el-tag size="small" type="success">{{ rule.brackets?.length || 0 }} 档</el-tag>
              </div>
              <div class="rule-item-actions" @click.stop>
                <el-button link type="primary" @click="openEditRuleDialog(index)">编辑</el-button>
                <el-button link type="danger" @click="handleRemoveRule(index)">删除</el-button>
              </div>
            </div>
          </div>
        </aside>

        <main class="rule-detail-panel">
          <template v-if="selectedRule">
            <el-card shadow="never" class="detail-card">
              <template #header>
                <div class="detail-head">
                  <div>
                    <div class="detail-title">{{ selectedRule.title || '未命名个税规则' }}</div>
                    <div class="detail-code">{{ selectedRule.code || '未设置规则编码' }}</div>
                  </div>
                  <div class="detail-actions">
                    <el-tag type="primary">起征点 {{ Number(selectedRule.threshold || 0).toFixed(2) }}</el-tag>
                    <el-button type="primary" @click="openEditRuleDialog(selectedRuleIndex)">编辑</el-button>
                  </div>
                </div>
              </template>

              <div class="detail-desc">{{ selectedRule.description || '暂无说明' }}</div>
              <div class="meta-grid">
                <div class="meta-item"><span class="meta-label">应税收入来源</span><strong>{{ formatBaseItemCodes(selectedRule) || '-' }}</strong></div>
                <div class="meta-item"><span class="meta-label">应税处理方式</span><strong>{{ selectedRule.taxableIncomeMode === 'minus_threshold' ? '先减起征点再进税档' : '直接按应税收入进税档' }}</strong></div>
                <div class="meta-item"><span class="meta-label">最小应税额</span><strong>{{ selectedRule.minTaxableAmount ?? 0 }}</strong></div>
                <div class="meta-item"><span class="meta-label">金额取整方式</span><strong>{{ selectedRule.roundMode || 'ROUND' }}</strong></div>
              </div>

              <div class="table-toolbar">
                <div class="table-title">详细税档</div>
                <span class="table-tip">税率 0.03 表示 3%，最后一档上限为“以上”。</span>
              </div>
              <el-table :data="selectedRule.brackets" border class="bracket-table" height="360">
                <el-table-column type="index" label="#" width="60" />
                <el-table-column label="应纳税所得额上限" min-width="180">
                  <template #default="{ row }">{{ formatUpperBound(Number(row.upperBound)) }}</template>
                </el-table-column>
                <el-table-column label="税率" width="180">
                  <template #default="{ row }">{{ formatPercent(Number(row.rate)) }}</template>
                </el-table-column>
                <el-table-column label="速算扣除数" width="180">
                  <template #default="{ row }">{{ Number(row.quickDeduction || 0).toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </el-card>
          </template>
        </main>
      </div>

      <el-dialog
        v-model="ruleDialogVisible"
        :title="ruleDialogMode === 'create' ? '新增个税规则' : '编辑个税规则'"
        width="980px"
        destroy-on-close
      >
        <el-form label-width="120px" :model="ruleForm" class="rule-dialog-form">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="规则编码" required>
                <el-input v-model="ruleForm.code" placeholder="例如 SALARY_TAX_SIMPLE_CN_MONTHLY" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规则标题" required>
                <el-input v-model="ruleForm.title" placeholder="例如 月度工资个税" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="规则说明">
            <el-input v-model="ruleForm.description" type="textarea" :rows="2" />
          </el-form-item>

          <el-form-item label="应税来源" required>
            <el-select
              :model-value="ruleForm.baseItemCodes"
              multiple
              filterable
              allow-create
              collapse-tags
              collapse-tags-tooltip
              style="width: 100%"
              placeholder="请选择应税收入来源"
              @update:model-value="updateBaseItemCodes(ruleForm, $event as string[])"
            >
              <el-option
                v-for="item in taxableSalaryItemOptions"
                :key="item.code"
                :label="item.label"
                :value="item.code"
              />
            </el-select>
          </el-form-item>

          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="起征点">
                <el-input-number v-model="ruleForm.threshold" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最小应税额">
                <el-input-number v-model="ruleForm.minTaxableAmount" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="取整方式">
                <el-select v-model="ruleForm.roundMode" style="width: 100%">
                  <el-option label="四舍五入" value="ROUND" />
                  <el-option label="向下取整" value="FLOOR" />
                  <el-option label="向上取整" value="CEIL" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="应税处理方式">
            <el-radio-group v-model="ruleForm.taxableIncomeMode">
              <el-radio value="minus_threshold">先减起征点再进税档</el-radio>
              <el-radio value="already_taxable">直接按应税收入进税档</el-radio>
            </el-radio-group>
          </el-form-item>

          <div class="dialog-table-head">
            <div class="table-title">税档明细</div>
            <el-button type="primary" link @click="addDialogBracket">新增税档</el-button>
          </div>
          <el-table :data="ruleForm.brackets" border class="bracket-table" height="300">
            <el-table-column type="index" label="#" width="60" />
            <el-table-column label="应纳税所得额上限" min-width="180">
              <template #default="{ row, $index }">
                <el-input-number v-if="$index < ruleForm.brackets.length - 1" v-model="row.upperBound" :controls="false" style="width: 100%" />
                <el-input v-else model-value="Infinity" disabled />
              </template>
            </el-table-column>
            <el-table-column label="税率" width="180">
              <template #default="{ row }">
                <el-input-number v-model="row.rate" :controls="false" :step="0.01" :min="0" :max="1" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="速算扣除数" width="180">
              <template #default="{ row }">
                <el-input-number v-model="row.quickDeduction" :controls="false" :min="0" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeDialogBracket($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form>
        <template #footer>
          <el-button @click="ruleDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitRuleDialog">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.tax-rule-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-card {
  border-radius: 12px;
}

.detail-head,
.table-toolbar,
.dialog-table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}


.panel-subtitle,
.rule-item-desc,
.detail-desc,
.table-tip {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}


.tax-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}

.rule-list-panel,
.rule-detail-panel {
  min-width: 0;
}

.rule-list-panel {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: #fff;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title,
.detail-title {
  font-size: 18px;
  font-weight: 700;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 640px;
  overflow: auto;
}

.rule-item {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.rule-item:hover,
.rule-item.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

.rule-item.active {
  background: var(--el-color-primary-light-9);
}

.rule-item-title {
  font-weight: 700;
}

.rule-item-code,
.detail-code {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.rule-item-desc {
  margin-top: 8px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rule-item-meta,
.rule-item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.meta-item {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
}

.meta-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.table-toolbar {
  align-items: center;
  margin: 16px 0 8px;
}

.table-title {
  font-size: 14px;
  font-weight: 700;
}

.bracket-table {
  margin-top: 8px;
}

.rule-dialog-form {
  padding-right: 8px;
}

.dialog-table-head {
  align-items: center;
  margin: 10px 0 6px;
}
</style>
