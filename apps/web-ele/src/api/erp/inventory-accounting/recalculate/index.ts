import { getInventoryCostCalculatePage } from '../calculate-table';

export interface InventoryCostRecalculateResult {
  period: string;
  totalRows: number;
  exceptionRows: number;
  message: string;
  executedAt: string;
}

export async function recalculateInventoryCost(params: any): Promise<InventoryCostRecalculateResult> {
  const res = await getInventoryCostCalculatePage({ ...params, page: 0, pageNo: 1 });
  const rows = Array.isArray(res.list) ? res.list : [];
  const exceptionRows = rows.filter((row: any) => row.exception_flag).length;
  return {
    period: params?.period || '',
    totalRows: rows.length,
    exceptionRows,
    message: exceptionRows > 0 ? '重算完成，存在结存成本异常，请查看异常查询。' : '重算完成，未发现结存成本异常。',
    executedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  };
}
