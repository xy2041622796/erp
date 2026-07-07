import { clientData } from '#/api/qyapi';
import { getContractPage } from '#/api/erp/contract/contract';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';
import { getExpenseSettlementPage } from '#/api/erp/finance/payment/settlement';

function amount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dateText(value: any) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return String(value);
  }
}

function getContractId(row: any) {
  return String(row?.rowid ?? row?.id ?? '');
}

function getContractNo(row: any) {
  return row?.contract_no ?? row?.no ?? '';
}

function getContractName(row: any) {
  return row?.contract_name ?? row?.name ?? '';
}

function getClientName(row: any) {
  return row?.client_name ?? row?.customerName ?? row?.contract_party_b ?? row?.contract_party_a ?? '';
}

function getContractAmount(row: any) {
  return amount(row?.contract_total_amount ?? row?.contract_amount);
}

function getSignDate(row: any) {
  return dateText(row?.contract_signing_date ?? row?.sign_date ?? row?.created_at);
}

function getStatusLabel(row: any) {
  const state = Number(row?.ConState);
  if (state === 3) return '已完成';
  if (state === 2) return '履行中';
  if (state === 1) return '待结算';
  if (state === 0) return '待审批';
  return row?.status || '未知';
}

async function getAllContracts() {
  const [income, outcome] = await Promise.all([
    getContractPage({ pageNo: 1, page: 0, contract_category: 0 }),
    getContractPage({ pageNo: 1, page: 0, contract_category: 1 }),
  ]);
  return [...(((income as any)?.list ?? []) as any[]), ...(((outcome as any)?.list ?? []) as any[])];
}

async function getIncomeSettlementRows() {
  const res = await getIncomeSettlementPage({ pageNo: 1, page: 0 });
  return (((res as any)?.list ?? []) as any[]);
}

async function getExpenseSettlementRows() {
  const res = await getExpenseSettlementPage({ pageNo: 1, page: 0 });
  return (((res as any)?.list ?? []) as any[]);
}

function buildIncomeSettlementMap(settlements: any[]) {
  const map: Record<string, number> = {};
  settlements.forEach((row) => {
    const id = String(row?.contract_id ?? '');
    if (!id) return;
    map[id] = (map[id] || 0) + amount(row?.receive_amount ?? row?.total_amount ?? row?.amount);
  });
  return map;
}

function sumExpenseSettlements(settlements: any[]) {
  return settlements.reduce((sum, row) => sum + amount(row?.pay_amount ?? row?.total_amount ?? row?.amount), 0);
}

function filterByYear(rows: any[], year?: string) {
  if (!year) return rows;
  return rows.filter((row) => getSignDate(row).startsWith(`${year}-`));
}

function monthlyStats(rows: any[], incomeSettlements: any[], year: string) {
  return Array.from({ length: 12 }).map((_, i) => {
    const month = `${i + 1}月`;
    const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
    const monthContracts = rows.filter((row) => getSignDate(row).startsWith(prefix));
    const signed = monthContracts.reduce((sum, row) => sum + getContractAmount(row), 0);
    const received = incomeSettlements
      .filter((row) => dateText(row?.settlement_date ?? row?.createtime).startsWith(prefix))
      .reduce((sum, row) => sum + amount(row?.receive_amount ?? row?.total_amount ?? row?.amount), 0);
    return { month, count: monthContracts.length, amount: signed, signed, received };
  });
}

export async function getOverviewData(params: { year?: string } = {}) {
  const year = params.year || String(new Date().getFullYear());
  const all = await getAllContracts();
  const rows = filterByYear(all, year);
  const totalAmount = rows.reduce((sum, row) => sum + getContractAmount(row), 0);
  const completed = rows.filter((row) => Number(row?.ConState) === 3).length;
  const statusGroups = rows.reduce<Record<string, number>>((acc, row) => {
    const label = getStatusLabel(row);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const typeGroups = rows.reduce<Record<string, { count: number; amount: number }>>((acc, row) => {
    const label = row?.contract_type || (Number(row?.contract_category) === 1 ? '支出合同' : '收入合同');
    if (!acc[label]) acc[label] = { count: 0, amount: 0 };
    acc[label].count += 1;
    acc[label].amount += getContractAmount(row);
    return acc;
  }, {});
  const monthlyData = monthlyStats(rows, [], year);
  const ret = new clientData();
  ret.list = rows;
  ret.total = rows.length;
  return {
    success: true,
    data: {
      table: ret,
      overview: {
        stats: {
          totalContracts: rows.length,
          totalAmount,
          avgAmount: rows.length ? totalAmount / rows.length : 0,
          completionRate: rows.length ? Number(((completed / rows.length) * 100).toFixed(2)) : 0,
          contractGrowth: 0,
          amountGrowth: 0,
          avgGrowth: 0,
        },
        statusDistribution: Object.entries(statusGroups).map(([label, value]) => ({
          label,
          value,
          percentage: rows.length ? Number(((value / rows.length) * 100).toFixed(2)) : 0,
        })),
        monthlyData,
        typeStats: Object.entries(typeGroups).map(([type, item]) => ({
          type,
          count: item.count,
          amount: item.amount,
          percentage: totalAmount ? Number(((item.amount / totalAmount) * 100).toFixed(2)) : 0,
        })),
      },
    },
  };
}

export async function getForecastData(params: { year?: string } = {}) {
  const all = await getAllContracts();
  const rows = filterByYear(all, params.year).filter((row) => Number(row?.contract_category) !== 1);
  const incomeSettlements = await getIncomeSettlementRows();
  const paymentMap = buildIncomeSettlementMap(incomeSettlements);
  const list = rows.map((row) => {
    const id = getContractId(row);
    const contractAmount = getContractAmount(row);
    const paidAmount = paymentMap[id] || 0;
    const remainingAmount = Math.max(0, contractAmount - paidAmount);
    return {
      id,
      contract_no: getContractNo(row),
      contract_name: getContractName(row),
      client_name: getClientName(row),
      contract_amount: contractAmount,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      forecast_date: dateText(row?.contract_end_date ?? row?.end_date),
      risk_level: remainingAmount <= 0 ? 'done' : remainingAmount > contractAmount * 0.5 ? 'high' : 'normal',
      status: remainingAmount <= 0 ? '已完成' : '待回款',
    };
  });
  const totalAmount = list.reduce((sum, row) => sum + row.contract_amount, 0);
  const paidAmount = list.reduce((sum, row) => sum + row.paid_amount, 0);
  return {
    success: true,
    data: {
      list,
      stats: {
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        riskCount: list.filter((row) => row.risk_level === 'high').length,
      },
    },
  };
}

export async function getDashboardData(params: { year?: string } = {}) {
  const year = params.year || String(new Date().getFullYear());
  const all = await getAllContracts();
  const rows = filterByYear(all, year);
  const incomeSettlements = await getIncomeSettlementRows();
  const expenseSettlements = await getExpenseSettlementRows();
  const paymentMap = buildIncomeSettlementMap(incomeSettlements);

  const incomeRows = rows.filter((row) => Number(row?.contract_category) !== 1);
  const outcomeRows = rows.filter((row) => Number(row?.contract_category) === 1);
  const incomeAmount = incomeRows.reduce((sum, row) => sum + getContractAmount(row), 0);
  const outcomeAmount = outcomeRows.reduce((sum, row) => sum + getContractAmount(row), 0) || sumExpenseSettlements(expenseSettlements);
  const totalReceived = rows.reduce((sum, row) => sum + (paymentMap[getContractId(row)] || 0), 0);
  const clientGroups = rows.reduce<Record<string, { id: string; name: string; contracts: number; totalAmount: number; receivedAmount: number }>>((acc, row) => {
    const id = String(row?.contract_party_b ?? row?.contract_party_a ?? getClientName(row) ?? 'unknown');
    if (!acc[id]) acc[id] = { id, name: getClientName(row) || '未知客户', contracts: 0, totalAmount: 0, receivedAmount: 0 };
    acc[id].contracts += 1;
    acc[id].totalAmount += getContractAmount(row);
    acc[id].receivedAmount += paymentMap[getContractId(row)] || 0;
    return acc;
  }, {});
  const monthlyTrend = monthlyStats(rows, incomeSettlements, year);

  return {
    success: true,
    data: {
      dashboard: {
        yearlyStats: {
          totalContracts: rows.length,
          totalAmount: incomeAmount,
          totalReceived,
          totalReceivable: incomeAmount - totalReceived,
          outcomeAmount,
          profit: incomeAmount - outcomeAmount,
          profitRate: incomeAmount ? Number((((incomeAmount - outcomeAmount) / incomeAmount) * 100).toFixed(2)) : 0,
          incomeContractCount: incomeRows.length,
          completionRate: rows.length ? Number(((rows.filter((row) => Number(row?.ConState) === 3).length / rows.length) * 100).toFixed(2)) : 0,
          clientCount: Object.keys(clientGroups).length,
          newClientCount: 0,
          avgContractAmount: rows.length ? incomeAmount / rows.length : 0,
        },
        monthlyTrend,
        topContracts: rows
          .slice()
          .sort((a, b) => getContractAmount(b) - getContractAmount(a))
          .slice(0, 5)
          .map((row) => ({ id: getContractId(row), name: getContractName(row), client: getClientName(row), amount: getContractAmount(row), status: getStatusLabel(row) })),
        topClients: Object.values(clientGroups).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5),
      },
    },
  };
}
