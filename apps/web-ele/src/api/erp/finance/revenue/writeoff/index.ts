import { generateUUID } from '@vben/utils';

import { and, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../common/account-set-scope';

export namespace SubmitWriteOffApi {
  export interface SubmitWriteOff {
    /** 表主键（后端实际主键字段） */
    id?: string;
    /** 兼容字段：部分表/接口可能仍返回 rowid */
    rowid?: string;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
    remark?: string;

    write_off_status?: number;
    write_off_amount?: number;
    settlement_id?: string;
    submit_id?: string;
    /** 0=收入，1=支出 */
    write_off_type?: number;
  }
}

// 按页面/业务类型区分的 FORMKEY (MODELID)
// - 收入提报页面：write_off_type=0
// - 付款申请(支出)页面：write_off_type=1
export const REVENUE_WRITEOFF_MODEL_ID = '33B22E86D2F2B11CFDCBBD786A00058E';
export const PAYMENT_WRITEOFF_MODEL_ID = '869CE3A9780CEC1BA75E9193D9C4EC33';
const WRITEOFF_TABLE = 'Bil_Submit_WriteOff';
const WRITEOFF_DB = 'LMBill';
const WRITEOFF_PK = 'id';

function resolveWriteOffModelId(writeOffType: 0 | 1, modelIdOverride?: string) {
  if (modelIdOverride) return modelIdOverride;
  if (writeOffType === 0) return REVENUE_WRITEOFF_MODEL_ID;

  // 支出侧未配置时，先回退到收入侧 modelId，避免直接不可用
  if (!PAYMENT_WRITEOFF_MODEL_ID) {
    console.warn(
      '[writeoff] PAYMENT_WRITEOFF_MODEL_ID is empty; fallback to REVENUE_WRITEOFF_MODEL_ID',
    );
    return REVENUE_WRITEOFF_MODEL_ID;
  }
  return PAYMENT_WRITEOFF_MODEL_ID;
}

function createWriteOffTable(writeOffType: 0 | 1, modelIdOverride?: string) {
  const modelId = resolveWriteOffModelId(writeOffType, modelIdOverride);
  return createFinanceDataTable(modelId, WRITEOFF_TABLE, WRITEOFF_DB, WRITEOFF_PK);
}

export async function getSubmitWriteOffList(
  params: { submit_id: string; write_off_type: 0 | 1 },
  options?: { modelId?: string },
) {
  const table = createWriteOffTable(params.write_off_type, options?.modelId);

  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.submit_id) {
    conditions.push(cond('submit_id', 'equal', params.submit_id));
  }

  table.Filter = and(...conditions);

  // 重要：始终显式指定字段，确保主键/外键一定返回
  table.Fields = [
    { Name: 'id', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'submit_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
    {
      Name: 'write_off_type',
      AsName: '',
      OrderType: null,
      Order: 0,
      Group: 0,
    },
    {
      Name: 'settlement_id',
      AsName: '',
      OrderType: null,
      Order: 0,
      Group: 0,
    },
    {
      Name: 'write_off_amount',
      AsName: '',
      OrderType: null,
      Order: 0,
      Group: 0,
    },
    {
      Name: 'write_off_status',
      AsName: '',
      OrderType: null,
      Order: 0,
      Group: 0,
    },
    { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
    {
      Name: 'lingma_sys_is_delete',
      AsName: '',
      OrderType: null,
      Order: 0,
      Group: 0,
    },
    {
      Name: 'createtime',
      AsName: '',
      OrderType: 'descending',
      Order: 1,
      Group: 0,
    },
  ];
  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  const items = (
    resultData && Array.isArray(resultData.Items) ? resultData.Items : []
  ) as SubmitWriteOffApi.SubmitWriteOff[];

  const exact = items.filter(
    (item) => Number(item?.write_off_type) === Number(params.write_off_type),
  );
  if (exact.length > 0) return exact;

  // 兼容历史脏数据：如果按类型筛不出，但 submit_id 已经命中，则回退返回该提报下全部关联
  return items;
}

export async function saveSubmitWriteOffs(
  submitId: string,
  writeOffType: 0 | 1,
  settlements: { apply_amount: number; rowid: string }[],
  options?: { modelId?: string },
) {
  return saveSubmitWriteOffsInternal(
    submitId,
    writeOffType,
    settlements,
    options,
  );
}

async function saveSubmitWriteOffsInternal(
  submitId: string,
  writeOffType: 0 | 1,
  settlements: { apply_amount: number; rowid: string }[],
  options?: { modelId?: string },
) {
  const table = createWriteOffTable(writeOffType, options?.modelId);

  // 1. 查询已存在的关联
  const oldList = await getSubmitWriteOffList(
    { submit_id: submitId, write_off_type: writeOffType },
    options,
  );
  const oldMap = new Map<string, SubmitWriteOffApi.SubmitWriteOff>();
  oldList.forEach((item) => {
    const settlementId = String(item.settlement_id ?? '').trim();
    if (!settlementId) return;
    oldMap.set(settlementId, item);
  });

  const incomingMap = new Map<string, number>();
  settlements.forEach((s) => incomingMap.set(s.rowid, s.apply_amount));

  const added: any[] = [];
  const changed: any[] = [];
  const deleted: any[] = [];

  // 判断新增和更新
  for (const s of settlements) {
    const existing = oldMap.get(s.rowid);
    if (existing) {
      // 如果金额有变化，或者其他属性需要更新
      if (Number(existing.write_off_amount) !== Number(s.apply_amount)) {
        const pk = String(
          (existing as any)?.id ?? (existing as any)?.rowid ?? '',
        ).trim();
        if (!pk) {
          console.warn('[writeoff] update row missing id', existing);
          continue;
        }
        changed.push({
          id: pk,
          write_off_amount: s.apply_amount,
          lingma_sys_is_delete: 0,
        });
      }
    } else {
      added.push({
        id: generateUUID(),
        submit_id: submitId,
        write_off_type: writeOffType,
        settlement_id: s.rowid,
        write_off_amount: s.apply_amount,
        lingma_sys_is_delete: 0,
      });
    }
  }

  // 判断删除
  for (const old of oldList) {
    const settlementId = String(old.settlement_id ?? '').trim();
    if (!settlementId) continue;
    if (!incomingMap.has(settlementId)) {
      const pk = String((old as any)?.id ?? (old as any)?.rowid ?? '').trim();
      if (!pk) {
        console.warn('[writeoff] delete row missing id', old);
        continue;
      }
      deleted.push({
        id: pk,
        lingma_sys_is_delete: 1,
      });
    }
  }

  if (added.length === 0 && changed.length === 0 && deleted.length === 0) {
    return;
  }

  const saveParam = table.getSaveParam(added, changed, deleted);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}


export async function updateSubmitWriteOffStatus(
  rows: { id: string; write_off_status: number }[],
  writeOffType: 0 | 1,
  options?: { modelId?: string },
) {
  if (!rows || rows.length === 0) return;
  const table = createWriteOffTable(writeOffType, options?.modelId);
  const changed = rows
    .map((item) => ({
      id: String(item?.id || '').trim(),
      write_off_status: item.write_off_status,
      lingma_sys_is_delete: 0,
    }))
    .filter((item) => item.id);
  if (changed.length === 0) return;
  const saveParam = table.getSaveParam([], changed as any, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}


export async function deleteSubmitWriteOffsBySubmitIds(
  submitIds: string[],
  writeOffType: 0 | 1,
  options?: { modelId?: string },
) {
  const ids = Array.from(
    new Set((submitIds || []).map((id) => String(id || '').trim()).filter(Boolean)),
  );
  if (ids.length === 0) return;
  const table = createWriteOffTable(writeOffType, options?.modelId);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('submit_id', 'in', ids),
    cond('write_off_type', 'equal', writeOffType),
  );
  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData?.Items || [];
  const deleted = items
    .map((item: any) => ({
      id: String(item?.id ?? item?.rowid ?? '').trim(),
      lingma_sys_is_delete: 1,
    }))
    .filter((item: any) => item.id);
  if (deleted.length === 0) return;
  const saveParam = table.getSaveParam([], [], deleted as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
