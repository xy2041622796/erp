import { getInventoryCostCalculatePage } from '../calculate-table';

export async function getInventoryCostExceptionPage(params: any) {
  const res = await getInventoryCostCalculatePage(params);
  const list = (Array.isArray(res.list) ? res.list : []).filter((row: any) => {
    if (!row.exception_flag) return false;
    if (!params?.exception_type) return true;
    return row.exception_flag === params.exception_type;
  });
  return { ...res, list, total: list.length };
}
