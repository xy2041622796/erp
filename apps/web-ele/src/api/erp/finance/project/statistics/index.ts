import { cond } from '#/api/qyapi';
import { createFinanceDataTable } from '../../common/account-set-scope';
import { buildKeywordFilter, mergeFilters, queryTable } from '../shared';
import { getBudgetList } from '../budget';

// TODO: 请替换为 project_statistics 的真实 formkey / modelId。
const PROJECT_STATISTICS_MODEL_ID = 'AA3BF5CA58B0286312A48793D1E15480';
const PROJECT_STATISTICS_TABLE = 'project_statistics';
const PROJECT_STATISTICS_DB = 'LMBill';
const PROJECT_STATISTICS_PK = 'id';

export interface ProjectExpense {
  id: string;
  project_name: string;
  budget: number;
  used: number;
  remaining: number;
  usage_rate: number;
  status: 'normal' | 'warning' | 'over';
}

export interface ExpenseCategory {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface MonthlyExpense {
  month: string;
  budget: number;
  amount: number;
}

export interface SummaryStats {
  totalBudget: number;
  totalUsed: number;
  totalRemaining: number;
  usageRate: number;
}


function getTimeValue(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function createStatisticsTable() {
  return createFinanceDataTable(
    PROJECT_STATISTICS_MODEL_ID,
    PROJECT_STATISTICS_TABLE,
    PROJECT_STATISTICS_DB,
    PROJECT_STATISTICS_PK,
  );
}

function getStatusByRate(rate: number): 'normal' | 'warning' | 'over' {
  if (rate >= 100) return 'over';
  if (rate >= 80) return 'warning';
  return 'normal';
}

function getPeriodRange(period: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (period === 'month') {
    return { year, months: [month] };
  }
  if (period === 'quarter') {
    const quarterIndex = Math.floor((month - 1) / 3);
    const startMonth = quarterIndex * 3 + 1;
    return { year, months: [startMonth, startMonth + 1, startMonth + 2] };
  }
  return { year, months: Array.from({ length: 12 }, (_, i) => i + 1) };
}

async function getStatisticsRecords(params: { keyword?: string }) {
  const table = createStatisticsTable();
  table.Filter = mergeFilters([cond('lingma_sys_is_delete', 'equal', 0)], buildKeywordFilter(['report_name', 'period_text', 'status'], params?.keyword));
  const result = await queryTable(table, 1, 0);
  result.items = [...result.items].sort((a: any, b: any) => getTimeValue(b?.updateTime || b?.updatetime) - getTimeValue(a?.updateTime || a?.updatetime));
  return result;
}

export async function getProjectStatistics(period = 'year') {
  const periodRange = getPeriodRange(period);
  const budgetResult = await getBudgetList({
    pageNo: 1,
    page: 0,
    year: periodRange.year,
  });

  const budgetList = Array.isArray(budgetResult.list)
    ? budgetResult.list.filter((item: any) => {
        if (!periodRange.months.length) return true;
        if (item?.month === undefined || item?.month === null || item?.month === '') return true;
        return periodRange.months.includes(Number(item.month));
      })
    : [];

  const projectExpenseMap = new Map<string, ProjectExpense>();
  const categoryMap = new Map<string, number>();
  const monthlyMap = new Map<number, { budget: number; amount: number }>();

  for (const row of budgetList as any[]) {
    const projectKey = String(row?.project_id || row?.project_name || '未命名项目');
    const projectName = String(row?.project_name || row?.project_id || '未命名项目');
    const budget = Number(row?.budget_amount || 0);
    const used = Number(row?.used_amount || 0);
    const remaining = Number(row?.remaining_amount ?? budget - used);
    const usageRate = budget > 0 ? Number(row?.usage_rate ?? (used / budget) * 100) : 0;

    const projectEntry = projectExpenseMap.get(projectKey) || {
      id: String(row?.project_id || row?.id || projectKey),
      project_name: projectName,
      budget: 0,
      used: 0,
      remaining: 0,
      usage_rate: 0,
      status: 'normal' as const,
    };
    projectEntry.budget += budget;
    projectEntry.used += used;
    projectEntry.remaining += remaining;
    projectEntry.usage_rate = projectEntry.budget > 0 ? Number(((projectEntry.used / projectEntry.budget) * 100).toFixed(2)) : 0;
    projectEntry.status = getStatusByRate(projectEntry.usage_rate);
    projectExpenseMap.set(projectKey, projectEntry);

    const categoryName = String(row?.category || '未分类');
    categoryMap.set(categoryName, Number(categoryMap.get(categoryName) || 0) + used);

    const month = Number(row?.month || new Date().getMonth() + 1);
    const monthEntry = monthlyMap.get(month) || { budget: 0, amount: 0 };
    monthEntry.budget += budget;
    monthEntry.amount += used;
    monthlyMap.set(month, monthEntry);
  }

  const projectExpenses = Array.from(projectExpenseMap.values()).sort((a, b) => b.used - a.used);
  const totalBudget = projectExpenses.reduce((sum, item) => sum + item.budget, 0);
  const totalUsed = projectExpenses.reduce((sum, item) => sum + item.used, 0);
  const totalRemaining = projectExpenses.reduce((sum, item) => sum + item.remaining, 0);

  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
  const expenseCategories: ExpenseCategory[] = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      percent: totalUsed > 0 ? Number(((value / totalUsed) * 100).toFixed(2)) : 0,
      color: palette[index % palette.length]!,
    }));

  const monthlyExpenses: MonthlyExpense[] = periodRange.months.map((month) => {
    const item = monthlyMap.get(month) || { budget: 0, amount: 0 };
    return {
      month: `${month}月`,
      budget: Number(item.budget || 0),
      amount: Number(item.amount || 0),
    };
  });

  const summary: SummaryStats = {
    totalBudget,
    totalUsed,
    totalRemaining,
    usageRate: totalBudget > 0 ? Number(((totalUsed / totalBudget) * 100).toFixed(2)) : 0,
  };

  const { items, total } = await getStatisticsRecords({ keyword: period });
  return {
    success: true,
    data: {
      summary,
      projectExpenses,
      expenseCategories,
      monthlyExpenses,
      reportList: items,
      reportTotal: total,
      table: budgetResult.dataTable,
    },
  };
}
