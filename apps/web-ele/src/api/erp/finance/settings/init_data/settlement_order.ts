import { generateUUID } from '@vben/utils';

import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../common/account-set-scope';

// Bil_Payment_Document_Detail（其他支出/其他收入共用的明细表）
// 期初数据通过 is_init=1 标识
// 注意：此处的 modelId/formkey 需要与后端真实配置保持一致
const MODEL_ID = '16310B11348BC13B8C0D64235A05C4F8';
const TABLE = 'Bil_Payment_Document_Detail';
const DB = 'LMBill';
const PK = 'rowid';

export type InitSettlementItem = {
  rowid?: string;
  product_id?: string; // order_id
  product_name?: string; // order_no
  amount?: number; // settle_amount
  total_tax_price?: number; // settle_tax_amount
  remark?: string;
  account_set_id?: string;
};

function createSettlementItemTable() {
  return createFinanceDataTable(MODEL_ID, TABLE, DB, PK);
}

export async function getInitSettlementItemList(
  settlementId: string,
  _settlementType: number,
) {
  const table = createSettlementItemTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('is_init', 'equal', 1),
    cond('business_doc_id', 'equal', settlementId),
  );

  if (!table.Fields || table.Fields.length === 0) {
    table.Fields = [
      { Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 },
    ];
  }

  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  } as any;

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const linkItems = (resultData.Items && Array.isArray(resultData.Items) ? resultData.Items : []);

  return linkItems.map((item: any) => {
    return {
      rowid: item.rowid,
      // 约定：payment_apply_id 存订单 id；payment_type 存订单号
      product_id: item.payment_apply_id,
      product_name: item.payment_type,
      // 约定：business_doc_amount 存金额；verification_amount 存税额
      amount: Number(item.business_doc_amount ?? 0),
      total_tax_price: Number(item.verification_amount ?? 0),
      // 约定：description 存备注
      remark: item.description,
      account_set_id: item.account_set_id,
    } as InitSettlementItem;
  });
}

export async function saveInitSettlementItems(
  settlementId: string,
  _settlementType: number,
  items: InitSettlementItem[],
) {
  const itemTable = createSettlementItemTable();

  // 读取旧项用于对比
  const oldTable = createSettlementItemTable();
  oldTable.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('is_init', 'equal', 1),
    cond('business_doc_id', 'equal', settlementId),
  );
  const oldQueryParam = { Table: [oldTable], PageParam: { page: 1000, index: 1 } } as any;
  const resOld = await requestClient.post(oldTable.queryUrl, oldQueryParam, {
    headers: oldTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  oldTable.execQueryResult(resOld);
  const oldData = resOld.data?.Result?.data || resOld.data?.Result || resOld.data;
  const oldItems = (oldData.Items && Array.isArray(oldData.Items) ? oldData.Items : []) as any[];
  const oldMap = new Map<string, any>();
  oldItems.forEach((i) => oldMap.set(String(i.rowid), i));

  const added: any[] = [];
  const changed: any[] = [];
  const deleted: any[] = [];

  const incomingIds = new Set<string>();
  for (const it of items || []) {
    const rid = it.rowid ? String(it.rowid) : generateUUID();
    incomingIds.add(rid);
    const row = {
      rowid: rid,
      business_doc_id: settlementId,
      is_init: 1,
      payment_apply_id: it.product_id,
      payment_type: it.product_name,
      business_doc_amount: it.amount,
      verification_amount: it.total_tax_price,
      description: it.remark,
      lingma_sys_is_delete: 0,
      account_set_id: it.account_set_id,
    };
    if (oldMap.has(rid)) changed.push(row);
    else added.push(row);
  }

  oldItems.forEach((i: any) => {
    const rid = String(i.rowid);
    if (!incomingIds.has(rid)) {
      deleted.push({ rowid: rid, lingma_sys_is_delete: 1 });
    }
  });

  const saveParam = itemTable.getSaveParam(added, changed, deleted);
  return await requestClient.post(itemTable.saveUrl, saveParam, {
    headers: itemTable.getRequestHeader(),
  });
}
