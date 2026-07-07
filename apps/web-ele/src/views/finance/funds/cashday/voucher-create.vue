<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowLeft,
  Document,
  FolderOpened,
} from '@element-plus/icons-vue';
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import {
  fetchCashAccounts,
  fetchCashdayRowsByIds,
  fetchIoTypes,
  linkCashdayVoucher,
  type CashAccount,
  type CashdayItem,
  type IoType,
} from '#/api/erp/finance/funds/cashday';
import {
  createVoucher,
  getNextVoucherCodeByDate,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';
import { getAllSubjectList, type BilSubjectApi } from '#/api/erp/finance/settings/project';
import { moneyNumber, moneyText } from '#/utils/finance/decimal-money';

defineOptions({ name: 'FinanceFundsCashdayVoucherCreate' });

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const rows = ref<CashdayItem[]>([]);
const accounts = ref<CashAccount[]>([]);
const ioTypes = ref<IoType[]>([]);
const subjects = ref<BilSubjectApi.Subject[]>([]);

const form = reactive({
  voucherWord: '记',
  voucherDate: '',
  relink: false,
});

type VoucherPreviewRow = {
  id: string;
  journalNo: string;
  summary: string;
  ioTypeName: string;
  direction: '收入' | '支出';
  amount: number;
  cashSubjectCode: string;
  cashSubjectName: string;
  oppositeSubjectCode: string;
  oppositeSubjectName: string;
  cashFlowCode: string;
  cashFlowName: string;
};

const previewRows = ref<VoucherPreviewRow[]>([]);

const cashFlowItems = [
  { code: '1', name: '销售产成品、商品、提供劳务收到的现金', category: '经营活动产生的现金流量', type: 'in', keywords: ['销售', '服务', '收入', '收款', '货款'] },
  { code: '2', name: '收到其他与经营活动有关的现金', category: '经营活动产生的现金流量', type: 'in', keywords: ['其他收入', '利息收入', '押金', '备用'] },
  { code: '3', name: '购买原材料、商品、接受劳务支付的现金', category: '经营活动产生的现金流量', type: 'out', keywords: ['购买材料', '采购', '材料', '货款'] },
  { code: '4', name: '支付的职工薪酬', category: '经营活动产生的现金流量', type: 'out', keywords: ['工资', '社保', '薪酬', '公积金'] },
  { code: '5', name: '支付的税费', category: '经营活动产生的现金流量', type: 'out', keywords: ['税', '税费', '个人所得税'] },
  { code: '6', name: '支付其他与经营活动有关的现金', category: '经营活动产生的现金流量', type: 'out', keywords: ['手续费', '租金', '水电', '运输', '差旅', '招待', '其他支出'] },
  { code: '7', name: '收回短期投资、长期债券投资和长期股权投资收到的现金', category: '投资活动产生的现金流量', type: 'in', keywords: ['投资收回', '收回投资'] },
  { code: '8', name: '取得投资收益收到的现金', category: '投资活动产生的现金流量', type: 'in', keywords: ['投资收益', '股利'] },
  { code: '9', name: '处置固定资产、无形资产和其他非流动资产收回的现金净额', category: '投资活动产生的现金流量', type: 'in', keywords: ['处置固定资产', '处置资产'] },
  { code: '10', name: '短期投资、长期债券投资和长期股权投资支付的现金', category: '投资活动产生的现金流量', type: 'out', keywords: ['投资支付', '购买股权'] },
  { code: '11', name: '购建固定资产、无形资产和其他非流动资产支付的现金', category: '投资活动产生的现金流量', type: 'out', keywords: ['固定资产', '无形资产', '设备'] },
  { code: '12', name: '取得借款收到的现金', category: '筹资活动产生的现金流量', type: 'in', keywords: ['短期借款', '长期借款', '借款'] },
  { code: '13', name: '吸收投资者投资收到的现金', category: '筹资活动产生的现金流量', type: 'in', keywords: ['股东投入', '投资者投资', '注资'] },
  { code: '14', name: '偿还借款本金支付的现金', category: '筹资活动产生的现金流量', type: 'out', keywords: ['偿还借款', '还款本金'] },
  { code: '15', name: '偿还借款利息支付的现金', category: '筹资活动产生的现金流量', type: 'out', keywords: ['利息支出', '付息'] },
  { code: '16', name: '分配利润支付的现金', category: '筹资活动产生的现金流量', type: 'out', keywords: ['分红', '利润分配'] },
];

const totalAmount = computed(() => previewRows.value.reduce((sum, row) => sum + moneyNumber(row.amount), 0));
const accountDisplayName = computed(() => currentAccount.value?.name || '现金账户');
const currentAccount = computed(() => {
  const accountId = String(route.query.accountId || '').trim();
  return accounts.value.find((item: any) => String(item.id || item.rowid || '') === accountId) as any;
});

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function getRouteIds() {
  return String(route.query.ids || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMatchText(value: unknown) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function subjectCodeOf(subject: any) {
  return String(subject?.subject_number || subject?.subjectCode || subject?.subject_code || '').trim();
}

function subjectNameOf(subject: any) {
  return String(subject?.subject_name || subject?.subjectName || subject?.subject_name || '').trim();
}

function isLeafEnabledSubject(subject: any) {
  return subjectCodeOf(subject) && subjectNameOf(subject) && Number(subject?.lingma_sys_is_delete || 0) !== 1 && Number(subject?.subject_state || 1) !== 0 && Number(subject?.is_leaf_subject ?? 1) === 1;
}

function makeSubjectResult(subject: any) {
  return { code: subjectCodeOf(subject), name: subjectNameOf(subject) };
}

function matchSubjectByTexts(texts: unknown[], options: { subjectTypes?: string[] } = {}) {
  const keywords = texts.map(normalizeMatchText).filter(Boolean);
  const candidates = (subjects.value || []).filter((subject: any) => {
    if (!isLeafEnabledSubject(subject)) return false;
    if (options.subjectTypes?.length && !options.subjectTypes.includes(String(subject?.subject_type || '').trim())) return false;
    return true;
  });
  let best: any = null;
  let bestScore = 0;
  for (const subject of candidates) {
    const name = normalizeMatchText(subjectNameOf(subject));
    const code = normalizeMatchText(subjectCodeOf(subject));
    let score = 0;
    for (const keyword of keywords) {
      if (!keyword) continue;
      if (name === keyword || code === keyword) score += 100;
      else if (name.includes(keyword) || keyword.includes(name)) score += 60;
      else {
        for (let len = Math.min(keyword.length, name.length); len >= 2; len -= 1) {
          if (name.includes(keyword.slice(0, len))) {
            score += len * 3;
            break;
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = subject;
    }
  }
  return best ? makeSubjectResult(best) : { code: '', name: '' };
}

function getCashSubject() {
  const account = currentAccount.value as any;
  const accountName = String(account?.name || account?.account_name || '').trim();
  const accountCode = String(account?.code || account?.account_code || '').trim();
  const matched = matchSubjectByTexts([accountName, accountCode, '库存现金', '现金'], { subjectTypes: ['1'] });
  if (matched.code && matched.name) return matched;
  return matchSubjectByTexts(['库存现金', '现金'], { subjectTypes: ['1'] });
}

function findIoType(row: CashdayItem) {
  return ioTypes.value.find((item) => String(item.id) === String(row.ioType || ''));
}

function getOppositeSubject(row: CashdayItem) {
  const income = moneyNumber(row.income || 0);
  const ioType = findIoType(row);
  const categoryName = String((ioType as any)?.name || row.ioTypeName || '').trim();
  const summary = String(row.summary || '').trim();
  const counterpartyName = String(row.counterpartyName || '').trim();
  const directionText = income > 0 ? '收入 收款 主营 其他业务' : '支出 费用 采购 付款 成本';
  return matchSubjectByTexts([categoryName, summary, counterpartyName, directionText], { subjectTypes: ['5', '4', '2', '1'] });
}

function matchCashFlow(row: CashdayItem) {
  const type = Number(row.income || 0) > 0 ? 'in' : 'out';
  const text = [row.ioTypeName, row.summary].join(' ');
  const matched = cashFlowItems.find((item) => item.type === type && item.keywords.some((kw) => text.includes(kw)));
  return matched || cashFlowItems.find((item) => item.type === type)!;
}

function buildPreviewRows() {
  const cashSubject = getCashSubject();
  previewRows.value = rows.value.map((row) => {
    const income = moneyNumber(row.income || 0);
    const expense = moneyNumber(row.expense || 0);
    const amount = income > 0 ? income : expense;
    const opposite = getOppositeSubject(row);
    const cashFlow = matchCashFlow(row);
    return {
      id: String(row.id || ''),
      journalNo: String(row.journalNo || ''),
      summary: String(row.summary || (income > 0 ? '现金收入' : '现金支出')),
      ioTypeName: String(row.ioTypeName || ''),
      direction: income > 0 ? '收入' : '支出',
      amount,
      cashSubjectCode: cashSubject.code,
      cashSubjectName: cashSubject.name,
      oppositeSubjectCode: opposite.code,
      oppositeSubjectName: opposite.name,
      cashFlowCode: cashFlow.code,
      cashFlowName: cashFlow.name,
    };
  });
}

function onCashFlowChange(row: VoucherPreviewRow) {
  const item = cashFlowItems.find((x) => x.code === row.cashFlowCode);
  row.cashFlowName = item?.name || '';
}


function getLinkedVoucherMainId(row: CashdayItem) {
  return String((row as any)?.voucherMainId || (row as any)?.voucher_main_id || (row as any)?.voucherId || '').trim();
}

function getLinkedVoucherNo(row: CashdayItem) {
  return String((row as any)?.voucherNo || (row as any)?.voucher_no || '').trim();
}


function buildVoucherDraftEntries() {
  return previewRows.value.flatMap((row) => {
    const common = {
      summary: row.summary,
    };
    if (row.direction === '收入') {
      return [
        { ...common, subject: row.cashSubjectCode, debit: row.amount, credit: undefined },
        { ...common, subject: row.oppositeSubjectCode, debit: undefined, credit: row.amount },
      ];
    }
    return [
      { ...common, subject: row.oppositeSubjectCode, debit: row.amount, credit: undefined },
      { ...common, subject: row.cashSubjectCode, debit: undefined, credit: row.amount },
    ];
  });
}

function openVoucherCreateWithDraft() {
  if (previewRows.value.length === 0) {
    ElMessage.warning('没有可生成凭证的数据');
    return;
  }
  const invalid = previewRows.value.find((row) => !row.cashSubjectCode || !row.oppositeSubjectCode || !(row.amount > 0));
  if (invalid) {
    ElMessage.warning('未能按账户、收支类别或摘要模糊匹配到现有末级科目，请检查科目名称或类别名称');
    return;
  }
  const firstRow = rows.value[0];
  const voucherDate = String((firstRow as any)?.date || form.voucherDate || todayISO()).slice(0, 10);
  const entries = buildVoucherDraftEntries();
  const draft = {
    source: 'cashday',
    accountId: String(route.query.accountId || ''),
    rowIds: rows.value.map((row: any) => String(row.id || '').trim()).filter(Boolean),
    relink: form.relink,
    voucherWord: form.voucherWord || '记',
    date: new Date(voucherDate + ' 00:00:00').getTime(),
    attachmentsCount: 0,
    note: rows.value.length === 1 ? String((firstRow as any)?.summary || '') : '现金日记账生成凭证：' + rows.value.length + ' 条',
    entries,
  };
  try {
    window.sessionStorage.setItem('finance_voucher_create_draft', JSON.stringify(draft));
  } catch (error) {
    console.error(error);
    ElMessage.error('凭证草稿缓存失败');
    return;
  }
  router.replace({
    name: 'FinanceVoucherCreate',
    query: {
      date: voucherDate.slice(0, 7),
      moduleScope: 'finance',
      source: 'cashday',
      returnPath: '/finance/funds/cashday',
    },
  });
}

function openVoucherDetail(voucherMainId: string, row?: CashdayItem) {
  const dateText = String((row as any)?.date || route.query.date || '').slice(0, 7);
  router.replace({
    name: 'FinanceVoucherCreate',
    query: {
      id: voucherMainId,
      type: 'detail',
      date: dateText || undefined,
      moduleScope: 'finance',
      source: 'cashday',
      returnPath: '/finance/funds/cashday',
    },
  });
}

function buildVoucherDetails(row: VoucherPreviewRow): ErpVoucherApi.VoucherDetail[] {
  if (row.direction === '收入') {
    return [
      { account_code: row.cashSubjectCode, account_name: row.cashSubjectName, abstract_content: row.summary, debit_amount: row.amount, credit_amount: 0, sort_no: 1, cash_flow_code: row.cashFlowCode, cash_flow_name: row.cashFlowName } as any,
      { account_code: row.oppositeSubjectCode, account_name: row.oppositeSubjectName, abstract_content: row.summary, debit_amount: 0, credit_amount: row.amount, sort_no: 2, cash_flow_code: row.cashFlowCode, cash_flow_name: row.cashFlowName } as any,
    ];
  }
  return [
    { account_code: row.oppositeSubjectCode, account_name: row.oppositeSubjectName, abstract_content: row.summary, debit_amount: row.amount, credit_amount: 0, sort_no: 1, cash_flow_code: row.cashFlowCode, cash_flow_name: row.cashFlowName } as any,
    { account_code: row.cashSubjectCode, account_name: row.cashSubjectName, abstract_content: row.summary, debit_amount: 0, credit_amount: row.amount, sort_no: 2, cash_flow_code: row.cashFlowCode, cash_flow_name: row.cashFlowName } as any,
  ];
}

async function loadPage() {
  loading.value = true;
  try {
    form.relink = String(route.query.relink || '') === '1';
    form.voucherDate = todayISO();
    const accountId = String(route.query.accountId || '').trim();
    const ids = getRouteIds();
    if (!accountId || ids.length === 0) {
      ElMessage.warning('缺少现金账户或日记账行参数');
      return;
    }
    const [accountList, ioTypeList, rowList, subjectRes] = await Promise.all([
      fetchCashAccounts(),
      fetchIoTypes(),
      fetchCashdayRowsByIds({ accountId, ids }),
      getAllSubjectList({ pageNo: 1, page: 0, lingma_sys_is_delete: 0 } as any),
    ]);
    accounts.value = accountList;
    ioTypes.value = ioTypeList;
    subjects.value = (subjectRes?.list || []) as BilSubjectApi.Subject[];
    const linkedRows = rowList.filter((row) => getLinkedVoucherMainId(row) || getLinkedVoucherNo(row));
    if (!form.relink && linkedRows.length > 0) {
      const firstLinked = linkedRows[0]!;
      const voucherMainId = getLinkedVoucherMainId(firstLinked);
      if (voucherMainId) {
        openVoucherDetail(voucherMainId, firstLinked);
        return;
      }
      ElMessage.warning('该日记账已关联凭证，但缺少凭证 ID，无法打开凭证详情');
      return;
    }
    rows.value = form.relink ? rowList : rowList.filter((row) => !getLinkedVoucherMainId(row) && !getLinkedVoucherNo(row));
    if (rows.value.length === 0) {
      ElMessage.warning(form.relink ? '未找到可制证的日记账行' : '所选日记账均已关联凭证，无需生成');
      return;
    }
    buildPreviewRows();
    openVoucherCreateWithDraft();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载制证数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave(closeAfter = true) {
  if (previewRows.value.length === 0) {
    ElMessage.warning('没有可生成凭证的数据');
    return;
  }
  const invalid = previewRows.value.find((row) => !row.cashSubjectCode || !row.oppositeSubjectCode || !(row.amount > 0) || !row.cashFlowCode);
  if (invalid) {
    ElMessage.warning('请补齐科目、金额和现金流量项目后再生成凭证；科目会按账户、收支类别或摘要模糊匹配');
    return;
  }

  saving.value = true;
  try {
    let success = 0;
    for (const row of previewRows.value) {
      const voucherCode = await getNextVoucherCodeByDate(form.voucherDate, form.voucherWord);
      const created = await createVoucher(
        {
          business_code: row.journalNo || row.id,
          business_name: '现金日记账',
          credit_amount: row.amount,
          debit_amount: row.amount,
          description: row.summary,
          is_posted: 0,
          voucher_code: voucherCode,
          voucher_date: form.voucherDate,
          voucher_type: '现金日记账',
          cash_flow_code: row.cashFlowCode,
          cash_flow_name: row.cashFlowName,
        } as any,
        buildVoucherDetails(row),
      );
      const voucherMainId = String((created as any)?.rowid || (created as any)?.row_id || '');
      const sourceRow = rows.value.find((item) => String(item.id || '') === row.id);
      if (sourceRow) await linkCashdayVoucher({ rows: [sourceRow], voucherMainId, voucherCode });
      success += 1;
    }
    ElMessage.success('生成凭证完成：' + success + ' 条');
    if (closeAfter) closePage();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '生成凭证失败');
  } finally {
    saving.value = false;
  }
}

function closePage() {
  router.push({ path: '/finance/funds/cashday' });
}

onMounted(loadPage);
</script>

<template>
  <Page auto-content-height class="h-full cashday-voucher-create-page">
    <div class="cashday-voucher-shell">
      <div class="voucher-toolbar">
        <div class="voucher-toolbar__actions">
          <ElButton text @click="closePage">
            <ArrowLeft class="toolbar-icon" /> 返回
          </ElButton>
          <ElButton type="primary" :icon="Document" :loading="saving" @click="handleSave(true)">生成凭证并返回</ElButton>
          <ElButton plain :icon="FolderOpened" :loading="saving" @click="handleSave(false)">生成凭证并留在本页</ElButton>
        </div>
        <div class="voucher-toolbar__summary">
          <span>账户：{{ accountDisplayName }}</span>
          <span>制证行数：{{ previewRows.length }}</span>
          <span>合计：{{ moneyText(totalAmount) }}</span>
          <span v-if="form.relink" class="relink-tip">覆盖关联模式</span>
        </div>
      </div>

      <div class="voucher-info-strip">
        <div class="voucher-grid-field">
          <span class="voucher-grid-field__label">凭证字</span>
          <ElSelect v-model="form.voucherWord" class="field-control">
            <ElOption label="记" value="记" />
            <ElOption label="收" value="收" />
            <ElOption label="付" value="付" />
            <ElOption label="转" value="转" />
          </ElSelect>
        </div>
        <div class="voucher-grid-field">
          <span class="voucher-grid-field__label">凭证日期</span>
          <ElDatePicker v-model="form.voucherDate" type="date" value-format="YYYY-MM-DD" class="field-control" />
        </div>
        <div class="voucher-grid-field voucher-grid-field--wide">
          <span class="voucher-grid-field__label">说明</span>
          <span class="voucher-grid-field__text">本页用于生成前调整科目和现金流量表项目，保存后回写日记账关联凭证。</span>
        </div>
      </div>

      <ElCard v-loading="loading" shadow="never" class="preview-card">
        <template #header>
          <div class="preview-card__header">
            <span>现金日记账制证明细</span>
            <span class="preview-card__sub">每一行日记账生成一张凭证，可在生成前调整对方科目和现金流量项目</span>
          </div>
        </template>

        <ElTable :data="previewRows" border height="100%" row-key="id">
          <ElTableColumn prop="journalNo" label="日记账序号" width="150" />
          <ElTableColumn prop="summary" label="摘要" min-width="180">
            <template #default="{ row }">
              <ElInput v-model="row.summary" />
            </template>
          </ElTableColumn>
          <ElTableColumn prop="direction" label="方向" width="70" />
          <ElTableColumn prop="amount" label="金额" width="120" align="right">
            <template #default="{ row }">{{ moneyText(row.amount) }}</template>
          </ElTableColumn>
          <ElTableColumn label="现金科目" min-width="180">
            <template #default="{ row }">
              <div class="subject-pair">
                <ElInput v-model="row.cashSubjectCode" placeholder="科目编码" />
                <ElInput v-model="row.cashSubjectName" placeholder="科目名称" />
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="对方科目" min-width="210">
            <template #default="{ row }">
              <div class="subject-pair">
                <ElInput v-model="row.oppositeSubjectCode" placeholder="科目编码" />
                <ElInput v-model="row.oppositeSubjectName" placeholder="科目名称" />
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="现金流量表项目" min-width="280">
            <template #default="{ row }">
              <ElSelect v-model="row.cashFlowCode" filterable class="w-full" @change="() => onCashFlowChange(row)">
                <ElOption
                  v-for="item in cashFlowItems"
                  :key="item.code"
                  :label="item.code + ' ' + item.name"
                  :value="item.code"
                >
                  <div class="cash-flow-option">
                    <span>{{ item.code }} {{ item.name }}</span>
                    <small>{{ item.category }}</small>
                  </div>
                </ElOption>
              </ElSelect>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.cashday-voucher-create-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.cashday-voucher-shell {
  display: flex;
  height: calc(100vh - 150px);
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.voucher-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  padding: 0 4px 6px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.voucher-toolbar__actions,
.voucher-toolbar__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.voucher-toolbar__summary {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.toolbar-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
}

.relink-tip {
  color: var(--el-color-warning);
}

.voucher-info-strip {
  display: grid;
  grid-template-columns: 180px 220px minmax(260px, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  background: var(--el-fill-color-blank);
  border-bottom: 1px solid var(--el-border-color-light);
}

.voucher-grid-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}

.voucher-grid-field--wide {
  grid-template-columns: auto minmax(0, 1fr);
}

.voucher-grid-field__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.voucher-grid-field__text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.field-control {
  width: 100%;
}

.preview-card {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  margin-top: 8px;
}

.preview-card :deep(.el-card__body) {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.preview-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-card__sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.subject-pair {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 6px;
}

.cash-flow-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cash-flow-option small {
  color: var(--el-text-color-secondary);
}

@media (max-width: 900px) {
  .voucher-info-strip {
    grid-template-columns: 1fr;
  }

  .voucher-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
