<script lang="ts" setup>
import { computed, ref } from 'vue';


import { getImportSchemeDetail, type ImportSchemeDetail } from '#/api/erp/import-design/scheme';
import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import { getSalarySlipItemPage } from '#/api/erp/finance/cashier/wages';

import { WAGES_OVERALL_SCHEME_ID } from '../helpers';
import {
  getCanonicalSalaryFieldCode,
  getSalaryFieldValue,
  getStandardSalaryItemMeta,
  setSalaryFieldValue,
} from '../salary-field-registry';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceCashierWagesView' });

const BASE_FIELD_NAMES = ['salary_month', 'pay_month', 'rank_code', 'rank_name', 'employee_no', 'employee_name', 'dept_name'];

type SalaryMetaItem = {
  display_name?: string;
  item_category?: string;
  item_code?: string;
  item_direction?: string;
  item_name?: string;
  sort_no?: number;
};

type DetailRow = {
  company_fund?: number;
  company_social?: number;
  deduct_total?: number;
  detail_depart_name?: string;
  detail_project_name?: string;
  employee_name?: string;
  employee_no?: string;
  expense_category?: string;
  item_category?: string;
  item_code?: string;
  item_direction?: string;
  item_name?: string;
  item_value?: number;
  line_no?: number;
  rank_code?: string;
  rank_name?: string;
  real_pay?: number;
  remark?: string;
  should_pay?: number;
  slip_id?: string;
  tax_value?: number;
};

type ViewTableRow = {
  companyFund: number;
  companySocial: number;
  deductTotal: number;
  deptName: string;
  detailProject: string;
  employeeName: string;
  employeeNo: string;
  expenseCategory: string;
  itemValues: Record<string, number>;
  lineKey: string;
  rankCode: string;
  rankName: string;
  realPay: number;
  remark: string;
  payMonth: string;
  salaryMonth: string;
  shouldPay: number;
  taxValue: number;
};

const visible = ref(false);
const loading = ref(false);
const header = ref<Record<string, any>>({});
const detailRows = ref<ViewTableRow[]>([]);
const salaryItems = ref<SalaryMetaItem[]>([]);
const detailItemMetas = ref<SalaryMetaItem[]>([]);
const schemeDetail = ref<ImportSchemeDetail | null>(null);

const prioritySalaryItemMap: Record<string, { category: string; sort_no: number; title: string }> = {
  base_salary: { category: 'BASIC', sort_no: -1000, title: '基本工资' },
  basic_salary: { category: 'BASIC', sort_no: -999, title: '基本工资' },
  post_salary: { category: 'BASIC', sort_no: -998, title: '岗位工资' },
  performance_salary: { category: 'FLOATING', sort_no: -900, title: '绩效工资' },
  month_bonus: { category: 'FLOATING', sort_no: -899, title: '月度奖金' },
  bonus: { category: 'FLOATING', sort_no: -898, title: '奖金' },
  overtime_pay: { category: 'ATTENDANCE', sort_no: -800, title: '加班费' },
  temp_allowance: { category: 'ALLOWANCE', sort_no: -700, title: '临时补贴' },
  allowance: { category: 'ALLOWANCE', sort_no: -699, title: '补贴' },
  other_deduction: { category: 'CUSTOM', sort_no: -600, title: '其他扣款' },
};

const groupSortMap: Record<string, number> = {
  BASIC: 1,
  FLOATING: 2,
  ALLOWANCE: 3,
  ATTENDANCE: 4,
  INSURANCE: 5,
  TAX: 6,
  RESULT: 7,
  CUSTOM: 8,
};

const groupMap: Record<string, string> = {
  BASIC: '固定工资',
  FLOATING: '浮动工资',
  ALLOWANCE: '补贴项目',
  ATTENDANCE: '考勤调整',
  INSURANCE: '五险一金',
  TAX: '税务项目',
  RESULT: '汇总项目',
  CUSTOM: '自定义项目',
};

function roundMoney(value: any) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function getColumnTitle(item: SalaryMetaItem) {
  return item.display_name || item.item_name || item.item_code || '-';
}

async function loadSalaryItems() {
  if (salaryItems.value.length) return;
  const res = await getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 });
  salaryItems.value = (res.list || [])
    .slice()
    .sort((a: any, b: any) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
}

async function loadSchemeDetail() {
  if (schemeDetail.value) return;
  schemeDetail.value = await getImportSchemeDetail({
    schemeId: WAGES_OVERALL_SCHEME_ID,
    table: 'LMBill@Bil_Salary_Slip_Item',
  });
}

function buildDetailItemMetas(list: DetailRow[]) {
  const metaMap = new Map<string, SalaryMetaItem>();
  list.forEach((item) => {
    const code = String(item.item_code || '').trim();
    if (!code) return;
    if (!metaMap.has(code)) {
      metaMap.set(code, {
        item_code: code,
        item_name: String(item.item_name || code),
        display_name: String(item.item_name || code),
        item_category: String(item.item_category || 'CUSTOM'),
        item_direction: String(item.item_direction || ''),
        sort_no: 9999,
      });
    }
  });
  detailItemMetas.value = Array.from(metaMap.values());
}

function buildDetailRows(list: DetailRow[]) {
  const rowMap = new Map<string, ViewTableRow>();

  list.forEach((item, index) => {
    const lineKey = String(item.line_no || index + 1);
    const realKey = `${lineKey}__${item.employee_name || ''}__${item.detail_depart_name || ''}__${item.detail_project_name || ''}`;
    if (!rowMap.has(realKey)) {
      rowMap.set(realKey, {
        lineKey,
        salaryMonth: String(header.value.salary_month || ''),
        payMonth: String(header.value.pay_month || ''),
        rankCode: String(item.rank_code || header.value.rank_code || ''),
        rankName: String(item.rank_name || header.value.rank_name || ''),
        employeeNo: String(item.employee_no || ''),
        employeeName: String(item.employee_name || ''),
        deptName: String(item.detail_depart_name || header.value.depart_name || ''),
        detailProject: String(item.detail_project_name || ''),
        expenseCategory: String(item.expense_category || ''),
        companySocial: roundMoney(item.company_social),
        companyFund: roundMoney(item.company_fund),
        shouldPay: roundMoney(item.should_pay),
        deductTotal: roundMoney(item.deduct_total),
        taxValue: roundMoney(item.tax_value),
        realPay: roundMoney(item.real_pay),
        remark: String(item.remark || ''),
        itemValues: {},
      });
    }

    const row = rowMap.get(realKey)!;
    const rawItemCode = String(item.item_code || '').trim();
    const rawItemName = String(item.item_name || '').trim();
    const itemCode = getCanonicalSalaryFieldCode(rawItemCode);
    const itemValue = roundMoney(item.item_value);
    if (itemCode) {
      row.itemValues[itemCode] = itemValue;
    }
    if (rawItemCode) {
      row.itemValues[rawItemCode] = itemValue;
    }
    if (rawItemName) {
      row.itemValues[rawItemName] = itemValue;
    }
    setSalaryFieldValue(row as any, 'company_social_insurance', row.companySocial);
    setSalaryFieldValue(row as any, 'company_housing_fund', row.companyFund);
    setSalaryFieldValue(row as any, 'should_pay_total', row.shouldPay);
    setSalaryFieldValue(row as any, 'deduct_total', row.deductTotal);
    setSalaryFieldValue(row as any, 'personal_income_tax', row.taxValue);
    setSalaryFieldValue(row as any, 'real_pay', row.realPay);
  });

  return Array.from(rowMap.values()).sort((a, b) => Number(a.lineKey || 0) - Number(b.lineKey || 0));
}

function parseSchemeDictMappings(detail: ImportSchemeDetail | null) {
  const raw = detail?.config?.dictJson;
  if (!raw) return [] as any[];

  let parsed: any = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  const dictData = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.dictData) ? parsed.dictData : [];
  if (!dictData.length) return [] as any[];

  const firstDict = dictData[0] || {};
  if (firstDict?.key || firstDict?.column || firstDict?.title) {
    return dictData;
  }

  return Array.isArray(firstDict?.mappings)
    ? firstDict.mappings.map((item: any) => ({
        key: item?.key,
        title: item?.title || item?.value || item?.key,
        column: item?.column,
      }))
    : [];
}

const mergedSalaryItems = computed(() => {
  const metaMap = new Map<string, SalaryMetaItem>();
  [...salaryItems.value, ...detailItemMetas.value].forEach((item) => {
    const code = String(item.item_code || '').trim();
    if (!code) return;
    const existed = metaMap.get(code);
    if (!existed) {
      metaMap.set(code, { ...item });
      return;
    }
    metaMap.set(code, {
      ...item,
      ...existed,
      display_name: existed.display_name || item.display_name || item.item_name || code,
      item_name: existed.item_name || item.item_name || code,
      item_category: existed.item_category || item.item_category || 'CUSTOM',
      item_direction: existed.item_direction || item.item_direction || '',
      sort_no: Number(existed.sort_no ?? item.sort_no ?? 9999),
    });
  });
  return Array.from(metaMap.values()).sort(
    (a, b) => Number(a.sort_no || 9999) - Number(b.sort_no || 9999),
  );
});

const schemeDynamicFields = computed(() => {
  const mappings = parseSchemeDictMappings(schemeDetail.value);
  if (mappings.length) {
    return mappings
      .map((item: any, index: number) => ({
        name: getCanonicalSalaryFieldCode(item?.key || ''),
        title: String(item?.title || item?.value || item?.key || ''),
        sort_no: index,
      }))
      .filter((item: any) => item.name && !BASE_FIELD_NAMES.includes(item.name));
  }

  const fields = schemeDetail.value?.fields || [];
  return fields.filter((item) => !BASE_FIELD_NAMES.includes(String(item.name || '')));
});

const groupedDynamicColumns = computed(() => {
  const codeMetaMap = new Map(
    mergedSalaryItems.value.map((item) => [String(item.item_code || ''), item]),
  );
  const groups = new Map<string, { key: string; label: string; items: SalaryMetaItem[] }>();
  const sourceMetaMap = new Map<string, SalaryMetaItem>();

  schemeDynamicFields.value.forEach((field: any, index: number) => {
    const code = getCanonicalSalaryFieldCode(field.name);
    if (!code) return;
    const standardMeta = getStandardSalaryItemMeta(code);
    const meta = codeMetaMap.get(code) || standardMeta;
    const priority = prioritySalaryItemMap[code];
    sourceMetaMap.set(code, {
      item_code: code,
      item_name: String(priority?.title || field.title || meta?.item_name || code),
      display_name: String(priority?.title || field.title || meta?.display_name || meta?.item_name || code),
      item_category: String(priority?.category || meta?.item_category || 'CUSTOM'),
      item_direction: String(meta?.item_direction || ''),
      sort_no: Number(priority?.sort_no ?? field.sort_no ?? index),
    });
  });

  mergedSalaryItems.value.forEach((item) => {
    const code = String(item.item_code || '').trim();
    if (!code || sourceMetaMap.has(code)) return;
    const priority = prioritySalaryItemMap[code];
    sourceMetaMap.set(code, {
      ...item,
      display_name: priority?.title || item.display_name || item.item_name || code,
      item_name: priority?.title || item.item_name || code,
      item_category: priority?.category || item.item_category || 'CUSTOM',
      sort_no: Number(priority?.sort_no ?? item.sort_no ?? 9999),
    });
  });

  if (!sourceMetaMap.has('base_salary') && detailRows.value.some((row) => getSalaryFieldValue(row as any, 'base_salary') !== 0)) {
    sourceMetaMap.set('base_salary', {
      item_code: 'base_salary',
      item_name: '基本工资',
      display_name: '基本工资',
      item_category: 'BASIC',
      item_direction: 'add',
      sort_no: -1000,
    });
  }

  Array.from(sourceMetaMap.values())
    .sort((a, b) => Number(a.sort_no || 9999) - Number(b.sort_no || 9999))
    .forEach((item) => {
      const key = String(item.item_category || 'CUSTOM');
      if (!groups.has(key)) {
        groups.set(key, { key, label: groupMap[key] || key, items: [] });
      }
      groups.get(key)?.items.push(item);
    });

  return Array.from(groups.values()).sort((a, b) => Number(groupSortMap[a.key] || 999) - Number(groupSortMap[b.key] || 999));
});

function getItemValue(row: ViewTableRow, code: string) {
  return roundMoney(getSalaryFieldValue(row as any, code));
}

async function openModal(row: any) {
  const rowid = String(row?.rowid || '').trim();
  if (!rowid) {
    ElMessage.warning('缺少工资表主键，无法查看');
    return;
  }

  loading.value = true;
  visible.value = true;
  header.value = { ...row };
  detailRows.value = [];
  detailItemMetas.value = [];
  try {
    await Promise.all([loadSalaryItems(), loadSchemeDetail()]);
    const res = await getSalarySlipItemPage({ pageNo: 1, page: 9999, slipId: rowid });
    buildDetailItemMetas(res.list || []);
    detailRows.value = buildDetailRows(res.list || []);
  } catch (error: any) {
    ElMessage.error(error?.message || '加载工资表详情失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ openModal });
</script>

<template>
  <el-dialog v-model="visible" width="92%" top="4vh" destroy-on-close append-to-body :z-index="1200"
    :close-on-click-modal="false" class="wage-view-dialog">
    <template #header>
      <div class="header">
        <div class="title">
          <span>查看工资表</span>
          <span class="sub">{{ header.slip_no || '-' }}</span>
        </div>
        <div class="header-actions">
          <el-button @click="visible = false">关闭</el-button>
        </div>
      </div>
    </template>

    <div class="content" v-loading="loading">
      <el-descriptions :column="3" border class="desc-card">
        <el-descriptions-item label="工资表编号">{{ header.slip_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工资月份">{{ header.salary_month || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发放月份">{{ header.pay_month || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ Number(header.status) === 1 ? '草稿' : '已保存' }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ header.depart_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ header.project_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ header.employee_count ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="应发工资合计">{{ roundMoney(header.total_should_pay).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="实发工资">{{ roundMoney(header.total_actual_pay).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="工资税费合计">{{ roundMoney(header.total_tax).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="已发工资">{{ roundMoney(header.paid_salary).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="核销金额">{{ roundMoney(header.write_off_amount).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="应发余额">{{ roundMoney(header.remaining_should_pay).toFixed(2)
          }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ header.description || header.remark || '-'
          }}</el-descriptions-item>
      </el-descriptions>

      <div class="table-title">工资明细（按导入导出方案展示）</div>

      <el-table :data="detailRows" border height="460" class="wage-table">
        <el-table-column type="index" label="序号" width="60" fixed="left" />
        <el-table-column prop="salaryMonth" label="工资月份" min-width="110" fixed="left" />
        <el-table-column prop="payMonth" label="发放月份" min-width="110" fixed="left" />
        <el-table-column prop="rankCode" label="职级编码" min-width="120" />
        <el-table-column prop="rankName" label="职级名称" min-width="120" />
        <el-table-column prop="employeeNo" label="员工工号" min-width="120" />
        <el-table-column prop="employeeName" label="员工姓名" min-width="140" fixed="left" />
        <el-table-column prop="deptName" label="部门名称" min-width="140" fixed="left" />

        <el-table-column v-for="group in groupedDynamicColumns" :key="group.key" :label="group.label" align="center">
          <el-table-column v-for="item in group.items" :key="item.item_code" :label="getColumnTitle(item)"
            min-width="130" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ getItemValue(row, String(item.item_code || '')).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="公司承担" align="center">
          <el-table-column label="公司社保" width="120" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ roundMoney(row.companySocial).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="公司公积金" width="130" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ roundMoney(row.companyFund).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="汇总结果" align="center" fixed="right">
          <el-table-column label="应发合计" width="120" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ roundMoney(row.shouldPay).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="扣减合计" width="120" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ roundMoney(row.deductTotal).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="个税合计" width="120" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ roundMoney(row.taxValue).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="实发工资" width="120" align="right">
            <template #default="{ row = {}} = {}">
              <span class="money">{{ roundMoney(row.realPay).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column prop="remark" label="备注" min-width="180" fixed="right" />
      </el-table>
    </div>
  </el-dialog>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.sub {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.7;
}

.content {
  max-height: 78vh;
  overflow: auto;
  padding: 8px 4px 0;
}

.desc-card {
  margin-bottom: 14px;
}

.table-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.money {
  display: inline-block;
  min-width: 80px;
  text-align: right;
}
</style>
