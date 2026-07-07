<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  deleteFundsAccount,
  fetchFundsAccountList,
  hasFundsAccountJournalDetails,
  saveFundsAccount,
  syncFundsAccountsFromSubjects,
  toggleFundsAccountEnable,
  type FundsAccount,
  type FundsAccountKind,
} from '#/api/erp/finance/funds/settings';
import { getClosedPeriodStatusByDate } from '#/api/erp/finance/period-status';
import { getEnabledCurrencyOptions } from '#/api/erp/finance/settings/currency';

import {
  getSubject,
  getSubjectList,
  type BilSubjectApi,
} from '#/api/erp/finance/settings/project';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

defineOptions({ name: 'FinanceFundsSettings' });

const activeTab = ref<FundsAccountKind>('现金');
const loading = ref(false);

type FundsAccountRow = FundsAccount & {
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
};

const rows = ref<FundsAccountRow[]>([]);

const query = reactive({
  keyword: '',
  enableStatus: '' as '' | 0 | 1,
});

const bankOptions = [
  '中国工商银行',
  '中国农业银行',
  '中国银行',
  '中国建设银行',
  '交通银行',
  '招商银行',
  '浦发银行',
  '中信银行',
  '兴业银行',
  '平安银行',
  '中国邮政储蓄银行',
];

const currencyOptions = ref<Array<{ code: string; label: string; name: string; value: string }>>([
  { code: 'CNY', label: '人民币(CNY)', name: '人民币', value: 'CNY' },
]);

async function loadCurrencyOptions() {
  try {
    currencyOptions.value = (await getEnabledCurrencyOptions()).map((item) => ({
      code: item.code,
      label: item.label,
      name: item.name,
      value: item.value,
    }));
  } catch (error) {
    console.error(error);
    currencyOptions.value = [{ code: 'CNY', label: '人民币(CNY)', name: '人民币', value: 'CNY' }];
  }
}

const showDialog = ref(false);
const dialogTitle = computed(() => {
  const prefix = activeTab.value;
  return editForm.id ? `编辑${prefix}账户` : `新增${prefix}账户`;
});

const editForm = reactive<FundsAccount & { balance_direction?: number | string }>({
  id: '',
  rowid: '',
  account_code: '',
  account_name: '',
  account_kind: '现金',
  bank_name: '',
  bank_account_no: '',
  currency_code: 'CNY',
  currency_name: '人民币',
  subject_id: '',
  subject_code: '',
  subject_name: '',
  balance_direction: '',
  enable_status: 1,
  union_bind_status: 0,
  bind_date: '',
  expire_date: '',
  pre_open_flag: 0,
  initial_amount: 0,
  account_balance: 0,
  remark: '',
  sort_no: 0,
});

const subjectDisplay = computed(() => {
  const code = String(editForm.subject_code || '').trim();
  const name = String(editForm.subject_name || '').trim();
  return [code, name].filter(Boolean).join(' ');
});

const subjectDirectionText = computed(() => {
  const dir = String(editForm.balance_direction || '');
  if (dir === '1') return '借';
  if (dir === '2') return '贷';
  return '未设置';
});

function applyDirectionSign(value: any, direction: any) {
  const n = Math.abs(Number(value || 0) || 0);
  return String(direction || '') === '2' ? -n : n;
}

function normalizeCurrentBalanceBySubject() {
  editForm.account_balance = applyDirectionSign(
    editForm.account_balance,
    editForm.balance_direction,
  );
}

function syncCurrencyName(code: string) {
  const item = currencyOptions.value.find((x) => x.code === code);
  editForm.currency_name = item?.name || editForm.currency_name || '人民币';
}

function resetForm(kind: FundsAccountKind) {
  editForm.id = '';
  editForm.rowid = '';
  editForm.account_code = '';
  editForm.account_name = '';
  editForm.account_kind = kind;
  editForm.bank_name = '';
  editForm.bank_account_no = '';
  editForm.currency_code = 'CNY';
  editForm.currency_name = '人民币';
  editForm.subject_id = '';
  editForm.subject_code = '';
  editForm.subject_name = '';
  editForm.balance_direction = '';
  editForm.enable_status = 1;
  editForm.union_bind_status = 0;
  editForm.bind_date = '';
  editForm.expire_date = '';
  editForm.pre_open_flag = 0;
  editForm.initial_amount = 0;
  editForm.account_balance = 0;
  editForm.remark = '';
  editForm.sort_no = 0;
}

async function fillSubjectDirection(subjectId?: string) {
  const id = String(subjectId || '').trim();
  if (!id) {
    editForm.balance_direction = '';
    return;
  }
  try {
    const row: any = await getSubject(id);
    editForm.balance_direction = row?.balance_direction ?? '';
  } catch {
    editForm.balance_direction = '';
  }
}

async function markDeleteDisabled(list: FundsAccount[]): Promise<FundsAccountRow[]> {
  const closedPeriod = await getClosedPeriodStatusByDate({ date: new Date() });
  if (closedPeriod) {
    return list.map((item) => ({
      ...item,
      deleteDisabled: true,
      deleteDisabledReason: `当前期间 ${closedPeriod.period_code} 已结账，不允许删除`,
    }));
  }

  return await Promise.all(
    list.map(async (item) => {
      const id = String(item.id || item.rowid || '').trim();
      const hasDetails = id ? await hasFundsAccountJournalDetails(id) : false;
      return {
        ...item,
        deleteDisabled: hasDetails,
        deleteDisabledReason: hasDetails ? '现金/银行日记账已存在该账户明细，不允许删除' : '',
      };
    }),
  );
}

async function reload() {
  loading.value = true;
  try {
    const list = await fetchFundsAccountList({
      kind: activeTab.value,
      keyword: query.keyword,
      enableStatus: query.enableStatus,
    });
    rows.value = await markDeleteDisabled(list);
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function onSyncSubjects() {
  loading.value = true;
  try {
    const res = await syncFundsAccountsFromSubjects();
    ElMessage.success(`同步完成：新增 ${res.addedCount} 个，更新 ${res.changedCount} 个`);
    await reload();
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '同步资金科目失败');
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  resetForm(activeTab.value);
  showDialog.value = true;
}

async function openEdit(r: FundsAccount) {
  resetForm(activeTab.value);
  Object.assign(editForm, r);
  editForm.id = String(r.id || r.rowid || '').trim();
  editForm.account_kind = activeTab.value;
  editForm.currency_code = String(r.currency_code || 'CNY');
  syncCurrencyName(editForm.currency_code);
  await fillSubjectDirection(String(r.subject_id || ''));
  showDialog.value = true;
}

const showSubjectDialog = ref(false);
const subjectLoading = ref(false);
const subjectKeyword = ref('');
const subjectRows = ref<BilSubjectApi.Subject[]>([]);

type SubjectTreeNode = BilSubjectApi.Subject & {
  children?: SubjectTreeNode[];
};

function findNearestSubjectParentCode(code: string, codes: string[]) {
  let parentCode = '';
  codes.forEach((candidate) => {
    if (!candidate || candidate === code) return;
    if (!code.startsWith(candidate)) return;
    if (candidate.length > parentCode.length) parentCode = candidate;
  });
  return parentCode;
}

function buildSubjectTree(rows: BilSubjectApi.Subject[]) {
  const source = [...(rows || [])].sort((a, b) =>
    String(a.subject_number || '').localeCompare(String(b.subject_number || ''), 'zh-Hans-CN-u-kn-true', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
  const nodeMap = new Map<string, SubjectTreeNode>();
  source.forEach((row) => {
    const code = String(row.subject_number || '').trim();
    if (!code) return;
    nodeMap.set(code, { ...row, children: [] });
  });

  const codes = [...nodeMap.keys()];
  const roots: SubjectTreeNode[] = [];
  nodeMap.forEach((node) => {
    const code = String(node.subject_number || '').trim();
    const explicitParentCode = String(node.parent_subject_number || '').trim();
    const parentCode = nodeMap.has(explicitParentCode)
      ? explicitParentCode
      : findNearestSubjectParentCode(code, codes);
    const parent = parentCode ? nodeMap.get(parentCode) : null;
    if (parent) parent.children!.push(node);
    else roots.push(node);
  });

  const cleanup = (nodes: SubjectTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.children?.length) cleanup(node.children);
      else delete node.children;
    });
    return nodes;
  };
  return cleanup(roots);
}

function filterSubjectTree(nodes: SubjectTreeNode[], keyword: string): SubjectTreeNode[] {
  const k = String(keyword || '').trim();
  if (!k) return nodes;
  const out: SubjectTreeNode[] = [];
  nodes.forEach((node) => {
    const children = filterSubjectTree(node.children || [], k);
    const matched = [node.subject_number, node.subject_name].some((value) =>
      String(value || '').includes(k),
    );
    if (matched || children.length > 0) {
      out.push({ ...node, ...(children.length > 0 ? { children } : {}) });
    }
  });
  return out;
}

const subjectTreeRows = computed(() =>
  filterSubjectTree(buildSubjectTree(subjectRows.value), subjectKeyword.value),
);

function isLeafSubject(row: BilSubjectApi.Subject) {
  return Number((row as any)?.is_leaf_subject ?? 0) === 1;
}

async function loadSubjects() {
  subjectLoading.value = true;
  try {
    const res = await getSubjectList({
      pageNo: 1,
      page: 0,
      subject_state: 1,
      lingma_sys_is_delete: 0,
    } as any);
    subjectRows.value = (res?.list || []) as any;
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '加载会计科目失败');
    subjectRows.value = [];
  } finally {
    subjectLoading.value = false;
  }
}

function openSubjectPicker() {
  subjectKeyword.value = subjectDisplay.value || '';
  showSubjectDialog.value = true;
  loadSubjects();
}

function pickSubject(row: BilSubjectApi.Subject) {
  editForm.subject_id = String(row.rowid || '').trim();
  editForm.subject_code = String((row as any).subject_number || '').trim();
  editForm.subject_name = String((row as any).subject_name || '').trim();
  editForm.balance_direction = (row as any).balance_direction ?? '';
  normalizeCurrentBalanceBySubject();
  showSubjectDialog.value = false;
}

async function onSave() {
  try {
    editForm.account_kind = activeTab.value;
    if (activeTab.value === '银行存款') {
      editForm.union_bind_status = 0;
      editForm.bind_date = '';
      editForm.expire_date = '';
    }
    syncCurrencyName(String(editForm.currency_code || 'CNY'));
    normalizeCurrentBalanceBySubject();

    if (activeTab.value === '银行存款' && !String(editForm.bank_name || '').trim()) {
      ElMessage.warning('请填写银行');
      return;
    }

    if (!String(editForm.account_name || '').trim()) {
      ElMessage.warning('请填写账户名称');
      return;
    }

    await saveFundsAccount({ ...editForm, id: String(editForm.id || '').trim() });
    ElMessage.success('保存成功');
    showDialog.value = false;
    await reload();
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '保存失败');
  }
}

async function onDelete(r: FundsAccount) {
  try {
    await deleteFundsAccount(String(r.id || r.rowid || ''), (r as any).lingma_sys_key);
    ElMessage.success('删除成功');
    await reload();
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '删除失败');
  }
}

async function onToggleEnable(r: FundsAccount, val: boolean) {
  try {
    await toggleFundsAccountEnable({
      id: String(r.id || r.rowid || ''),
      enable: val,
      lingmaSysKey: (r as any).lingma_sys_key,
    });
    ElMessage.success('已更新');
    await reload();
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e?.message || '更新失败');
  }
}


onMounted(() => {
  void loadCurrencyOptions();
  reload();
});
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col gap-3">
      <div class="funds-settings-toolbar">
        <div class="funds-settings-toolbar__filters">
          <ElInput
            v-model="query.keyword"
            class="funds-settings-keyword"
            placeholder="输入账户名称"
            clearable
            @keyup.enter="reload"
          />
          <ElSelect
            v-model="query.enableStatus"
            class="funds-settings-status"
            clearable
            placeholder="启用状态"
          >
            <ElOption :value="1" label="启用" />
            <ElOption :value="0" label="停用" />
          </ElSelect>
          <ElButton type="primary" @click="reload">查询</ElButton>
        </div>

        <div class="funds-settings-toolbar__actions">
          <ElButton @click="reload">刷新</ElButton>
          <ElButton @click="onSyncSubjects">同步科目</ElButton>
          <ElButton type="primary" @click="openAdd">新增</ElButton>
        </div>
      </div>
      <ElTabs v-model="activeTab" @tab-change="reload">
        <ElTabPane label="现金" name="现金">
          <div class="min-h-0 flex-1">
            <ElTable v-loading="loading" :data="rows" border height="100%">
              <ElTableColumn prop="account_name" label="账户名称" min-width="180" />
              <ElTableColumn prop="currency_name" label="币别" width="120" />
              <ElTableColumn label="会计科目" min-width="220">
                <template #default="{ row }">
                  {{ String(row.subject_code || '') }} {{ String(row.subject_name || '') }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="启用状态" width="120">
                <template #default="{ row }">
                  <ElSwitch
                    :model-value="Number(row.enable_status || 0) === 1"
                    @change="(val: any) => onToggleEnable(row, !!val)"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                  <ElButton
                    link
                    type="danger"
                    :disabled="!!row.deleteDisabled"
                    :title="row.deleteDisabledReason || ''"
                    @click="onDelete(row)"
                  >
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="银行存款" name="银行存款">
          <div class="min-h-0 flex-1">
            <ElTable v-loading="loading" :data="rows" border height="100%">
              <ElTableColumn prop="account_name" label="账户名称" min-width="180" />
              <ElTableColumn prop="bank_name" label="银行" width="160" />
              <ElTableColumn prop="bank_account_no" label="银行账号" min-width="180" />
              <ElTableColumn prop="currency_name" label="币别" width="120" />
              <ElTableColumn label="会计科目" min-width="220">
                <template #default="{ row }">
                  {{ String(row.subject_code || '') }} {{ String(row.subject_name || '') }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="启用状态" width="120">
                <template #default="{ row }">
                  <ElSwitch
                    :model-value="Number(row.enable_status || 0) === 1"
                    @change="(val: any) => onToggleEnable(row, !!val)"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                  <ElButton
                    link
                    type="danger"
                    :disabled="!!row.deleteDisabled"
                    :title="row.deleteDisabledReason || ''"
                    @click="onDelete(row)"
                  >
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="其他货币资金" name="其他货币资金">
          <div class="min-h-0 flex-1">
            <ElTable v-loading="loading" :data="rows" border height="100%">
              <ElTableColumn prop="account_name" label="账户名称" min-width="180" />
              <ElTableColumn prop="currency_name" label="币别" width="120" />
              <ElTableColumn label="会计科目" min-width="220">
                <template #default="{ row }">
                  {{ String(row.subject_code || '') }} {{ String(row.subject_name || '') }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="启用状态" width="120">
                <template #default="{ row }">
                  <ElSwitch
                    :model-value="Number(row.enable_status || 0) === 1"
                    @change="(val: any) => onToggleEnable(row, !!val)"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                  <ElButton
                    link
                    type="danger"
                    :disabled="!!row.deleteDisabled"
                    :title="row.deleteDisabledReason || ''"
                    @click="onDelete(row)"
                  >
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>
      </ElTabs>

      <ElDialog
        v-model="showDialog"
        :title="dialogTitle"
        width="min(47.5rem, 92vw)"
        destroy-on-close
        class="funds-account-dialog"
      >
        <div class="funds-form-wrap">
          <ElForm label-width="110px" class="funds-form">
            <template v-if="activeTab === '银行存款'">
              <ElFormItem label="银行" required>
                <ElInput
                  v-model="editForm.bank_name"
                  placeholder="请输入银行名称"
                  class="w-full"
                />
              </ElFormItem>
            </template>

            <ElFormItem label="账户名称" required>
              <ElInput
                v-model="editForm.account_name"
                :placeholder="activeTab === '银行存款' ? '示例：中国工商银行深圳宝安支行' : '请输入账户名称'"
                class="w-full"
              />
            </ElFormItem>

            <template v-if="activeTab === '银行存款'">
              <ElFormItem label="银行卡号">
                <ElInput
                  v-model="editForm.bank_account_no"
                  placeholder="请输入完整的银行卡号"
                  class="w-full"
                />
              </ElFormItem>
            </template>

            <ElFormItem label="币别" required>
              <ElSelect
                v-model="editForm.currency_code"
                class="w-full"
                placeholder="请选择币别"
                @change="(val: string) => syncCurrencyName(val)"
              >
                <ElOption
                  v-for="item in currencyOptions"
                  :key="item.code"
                  :label="item.label"
                  :value="item.code"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="会计科目">
              <div class="subject-box">
                <ElInput
                  :model-value="subjectDisplay"
                  placeholder="请选择会计科目"
                  readonly
                  class="subject-input"
                />
                <ElButton class="subject-pick-btn" @click="openSubjectPicker">···</ElButton>
              </div>
              <div class="subject-direction-tip">余额方向：{{ subjectDirectionText }}</div>
            </ElFormItem>

            <ElFormItem label="期初余额">
              <ElInputNumber
                v-model="(editForm as any).initial_amount"
                :controls="false"
                class="w-full"
              />
            </ElFormItem>

            <ElFormItem label="当前余额">
              <ElInputNumber
                v-model="(editForm as any).account_balance"
                :controls="false"
                class="w-full"
                @blur="normalizeCurrentBalanceBySubject"
              />
              <div class="subject-direction-tip">
                输入数值后将按所选科目方向保存：借方为正，贷方为负。
              </div>
            </ElFormItem>

            <ElFormItem label="备注">
              <ElInput
                v-model="editForm.remark"
                type="textarea"
                :rows="3"
                placeholder="可选"
                class="w-full"
              />
            </ElFormItem>
          </ElForm>

          <div class="funds-form-note">
            说明：编码改为保存时自动生成；关联会计科目之后，资金数据自动和总账核对是否一致，同时也支持自动生成凭证。
          </div>

          <div class="funds-form-actions">
            <ElButton type="primary" @click="onSave">保存</ElButton>
            <ElButton @click="showDialog = false">取消</ElButton>
          </div>
        </div>
      </ElDialog>

      <ElDialog v-model="showSubjectDialog" title="选择会计科目" width="min(53.75rem, 92vw)" destroy-on-close>
        <div class="flex items-center gap-2">
          <ElInput v-model="subjectKeyword" class="w-[320px]" placeholder="输入科目编码或名称" clearable />
          <ElButton type="primary" @click="loadSubjects">搜索</ElButton>
        </div>

        <div class="mt-3">
          <ElTable
            v-loading="subjectLoading"
            :data="subjectTreeRows"
            border
            height="420px"
            row-key="subject_number"
            default-expand-all
            :tree-props="{ children: 'children' }"
          >
            <ElTableColumn prop="subject_number" label="科目编码" width="160" />
            <ElTableColumn prop="subject_name" label="科目名称" min-width="220" />
            <ElTableColumn prop="balance_direction" label="方向" width="90">
              <template #default="{ row }">
                {{ String(row.balance_direction) === '1' ? '借' : String(row.balance_direction) === '2' ? '贷' : '' }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="pickSubject(row)">
                  选择
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>

        <template #footer>
          <div class="subject-dialog-footer">
            <span class="subject-picker-tip">资金账户可选择现金、银行存款及其他货币资金等资金类科目</span>
            <ElButton @click="showSubjectDialog = false">关闭</ElButton>
          </div>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.funds-settings-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 16px;
  padding: 4px 0;
}

.funds-settings-toolbar__filters {
  display: flex;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
}

.funds-settings-keyword {
  width: 280px;
  flex: 0 0 280px;
}

.funds-settings-status {
  width: 160px;
  flex: 0 0 160px;
}

.funds-settings-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 900px) {
  .funds-settings-toolbar {
    grid-template-columns: 1fr;
  }

  .funds-settings-toolbar__filters {
    flex-wrap: wrap;
  }

  .funds-settings-toolbar__actions {
    justify-content: flex-start;
  }
}
.funds-form-wrap {
  width: 420px;
  margin: 0 auto;
  padding-top: 8px;
}

.funds-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.subject-box {
  display: flex;
  width: 100%;
}

.subject-input {
  flex: 1;
}

.subject-pick-btn {
  margin-left: 8px;
  width: 44px;
}

.subject-direction-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.subject-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.subject-picker-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.funds-form-note {
  margin-top: 6px;
  margin-left: 110px;
  color: var(--el-color-danger);
  line-height: 1.5;
  font-size: 12px;
}

.funds-form-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
}
</style>
