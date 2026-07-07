import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const FORM_ID = 'F0BA18993242D85B7EF85D41BC65E030';
const TABLE_NAME = 'Bil_Customer_Info';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';
const CUSTOMER_CODE_RULE_ID = '54EC19DB5426C42CA6042AF763A3AA93';

export interface CustomerCodeTarget {
  tblname: string;
  rowid: string;
  customerCode?: string;
  customerName?: string;
  companyType?: number;
  contactName?: string;
  contactMobile?: string;
  createtime?: string;
}

function createCustomerTable() {
  const table = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

export async function getCustomerCodeTarget(rowid: string) {
  const customerTable = createCustomerTable();
  customerTable.Filter = and(cond('rowid', 'equal', rowid));

  const queryParam = {
    Table: [customerTable],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  customerTable.execQueryResult(resQuery);

  const first = resQuery?.data?.Result?.data?.Items?.[0];
  if (!first) {
    return null;
  }

  return {
    tblname: TABLE_NAME,
    rowid: first.rowid,
    customerCode: first.customer_code,
    customerName: first.customer_name,
    companyType: first.company_type,
    contactName: first.contact_name,
    contactMobile: first.contact_mobile,
    createtime: first.createtime,
  } as CustomerCodeTarget;
}

export async function fetchCustomerCodeByRowid(
  rowid: string,
  codeRuleId: string = CUSTOMER_CODE_RULE_ID,
) {
  const customerTable = createCustomerTable();
  return await getCodeString(rowid, codeRuleId, customerTable.getRequestHeader());
}

export { CUSTOMER_CODE_RULE_ID, TABLE_NAME };
