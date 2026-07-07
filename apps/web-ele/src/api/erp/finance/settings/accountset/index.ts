import { generateUUID } from '@vben/utils';

import {
  ASSET_CATEGORY_PRIMARY_KEY,
  ASSET_CATEGORY_TABLE_NAME,
  buildDefaultAssetCategoryList,
} from '#/api/erp/finance/assets/category';
import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTableCurrent } from '../../common/account-set-scope';

// Bil_Account_Info
const ACCOUNTSET_MODEL_ID = '3316EE356C1730749A402D4EAF8B9944';
const ACCOUNTSET_TABLE = 'Bil_Account_Info';
const ACCOUNTSET_DB = 'LMBill';
const ACCOUNTSET_PK = 'rowid';

// Bil_Subject_Template
const SUBJECT_TEMPLATE_MODEL_ID = 'DA7DA9A4728EEED1C1481C08AE63ECE7';
const SUBJECT_TEMPLATE_TABLE = 'Bil_Subject_Template';
const SUBJECT_TEMPLATE_DB = 'LMBill';
const SUBJECT_TEMPLATE_PK = 'rowid';

// Bil_Subject_Info
const SUBJECT_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_TABLE = 'Bil_Subject_Info';
const SUBJECT_DB = 'LMBill';
const SUBJECT_PK = 'rowid';

// Bil_Voucher_Word
const VOUCHER_WORD_MODEL_ID = '4F635156F967541ACB3B58DEADF01D02';
const VOUCHER_WORD_TABLE = 'Bil_Voucher_Word';
const VOUCHER_WORD_DB = 'LMBill';
const VOUCHER_WORD_PK = 'id';

// Bil_Currency
const CURRENCY_MODEL_ID = 'B6BA412BA6690E9318A9ED78BBB5ABB3';
const CURRENCY_TABLE = 'Bil_Currency';
const CURRENCY_DB = 'LMBill';
const CURRENCY_PK = 'id';

// Bil_Inexp_Categories
const INEXPCATE_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const INEXPCATE_TABLE = 'Bil_Inexp_Categories';
const INEXPCATE_DB = 'LMBill';
const INEXPCATE_PK = 'id';
const FIN_AUX_MODEL_ID = '5B21EC55F1C3FA8682C6527629FFC25F';
const FIN_AUX_DB = 'LMBill';
const FIN_AUX_DEPARTMENT_TABLE = 'Bil_Fin_Aux_Department';
const FIN_AUX_PK = 'row_id';
const ASSET_MODEL_ID = 'C9FCC66011786A6ACDEAF1BFD3631E31';
const ASSET_DB = 'LMBill';

// 进销存默认基础资料。这里接入新增账套流程，保证新账套创建后可以直接新增销售订单。
const ERP_BASE_MODEL_ID = '808171E1BEEB39628534FFE429195F38';
const ERP_DB = 'LMBill';
const PRODUCT_CATEGORY_TABLE = 'erp_product_category';
const PRODUCT_UNIT_TABLE = 'erp_product_unit';
const PRODUCT_TABLE = 'Bil_Product_Info';
const PRODUCT_PK = 'rowid';
const WAREHOUSE_MODEL_ID = 'B511CD6BEFE363890EA6DE77575D9BB5';
const WAREHOUSE_TABLE = 'erp_warehouse';
const WAREHOUSE_PK = 'rowid';
const CUSTOMER_MODEL_ID = 'F0BA18993242D85B7EF85D41BC65E030';
const CUSTOMER_TABLE = 'Bil_Customer_Info';
const CUSTOMER_PK = 'row_id';

export namespace BilAccountSetApi {
  export interface AccountSet {
    rowid?: string;
    createuser?: string;
    createtime?: Date | number | string;
    updateuser?: string;
    updatetime?: Date | number | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    account_version?: number;
    recording_currency?: string;
    account_set_status?: number;
    start_date?: Date | number | string;
    init_date?: Date | number | string;
    main_business?: string;
    staff_scale?: string;
    industry_type?: string;
    vat_rate?: string;
    tax_type?: string;
    tax_number?: string;
    account_name?: string;
    lingma_sys_ent?: string;
    account_set_id?: string;
  }

  export interface SubjectTemplateItem {
    rowid?: string;
    createuser?: string;
    createtime?: Date | number | string;
    updateuser?: string;
    updatetime?: Date | number | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    subject_state?: number;
    is_leaf_subject?: number;
    parent_subject_number?: string;
    balance_direction?: number | string;
    subject_type?: string;
    subject_name?: string;
    subject_number?: string;
    account_id?: string;
    lingma_sys_ent?: string;
    auxiliary_accounting?: string;
    account_set_id?: string;
  }
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function createSubjectTemplateTable() {
  return new DataTable(
    SUBJECT_TEMPLATE_MODEL_ID,
    SUBJECT_TEMPLATE_TABLE,
    SUBJECT_TEMPLATE_DB,
    SUBJECT_TEMPLATE_PK,
  );
}

function createSubjectInfoTable() {
  return new DataTable(SUBJECT_MODEL_ID, SUBJECT_TABLE, SUBJECT_DB, SUBJECT_PK);
}

function createInventorySeedTables() {
  return {
    categoryTable: new DataTable(
      ERP_BASE_MODEL_ID,
      PRODUCT_CATEGORY_TABLE,
      ERP_DB,
      'id',
    ),
    unitTable: new DataTable(
      ERP_BASE_MODEL_ID,
      PRODUCT_UNIT_TABLE,
      ERP_DB,
      'id',
    ),
    warehouseTable: new DataTable(
      WAREHOUSE_MODEL_ID,
      WAREHOUSE_TABLE,
      ERP_DB,
      WAREHOUSE_PK,
    ),
    productTable: new DataTable(
      ERP_BASE_MODEL_ID,
      PRODUCT_TABLE,
      ERP_DB,
      PRODUCT_PK,
    ),
    customerTable: new DataTable(
      CUSTOMER_MODEL_ID,
      CUSTOMER_TABLE,
      ERP_DB,
      CUSTOMER_PK,
    ),
  };
}

function createVoucherWordTable() {
  return new DataTable(
    VOUCHER_WORD_MODEL_ID,
    VOUCHER_WORD_TABLE,
    VOUCHER_WORD_DB,
    VOUCHER_WORD_PK,
  );
}

function createCurrencyTable() {
  return new DataTable(
    CURRENCY_MODEL_ID,
    CURRENCY_TABLE,
    CURRENCY_DB,
    CURRENCY_PK,
  );
}

function createInexpCateTable() {
  return new DataTable(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );
}

function createFinanceAuxDepartmentTable() {
  const table = new DataTable(
    FIN_AUX_MODEL_ID,
    FIN_AUX_DEPARTMENT_TABLE,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';
  return table;
}

function createAssetCategoryTable() {
  return new DataTable(
    ASSET_MODEL_ID,
    ASSET_CATEGORY_TABLE_NAME,
    ASSET_DB,
    ASSET_CATEGORY_PRIMARY_KEY,
  );
}

function buildDefaultVoucherWordList(
  accountSetPayload: BilAccountSetApi.AccountSet,
) {
  const accountSetId = String(
    accountSetPayload.account_set_id || accountSetPayload.rowid || '',
  ).trim();

  if (!accountSetId) {
    throw new Error('缺少新建账套ID，无法初始化凭证字');
  }

  return [
    { word: '付', print_title: '付款凭证', is_default: 0, sort_no: 0 },
    { word: '收', print_title: '收款凭证', is_default: 0, sort_no: 0 },
    { word: '记', print_title: '记账凭证', is_default: 1, sort_no: 0 },
    { word: '转', print_title: '转账凭证', is_default: 0, sort_no: 0 },
  ].map((item) => ({
    id: generateUUID(),
    lingma_sys_is_delete: 0,
    account_set_id: accountSetId,
    ...item,
  }));
}

function buildDefaultCurrencyList(
  accountSetPayload: BilAccountSetApi.AccountSet,
) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const accountSetId = String(
    accountSetPayload.account_set_id || accountSetPayload.rowid || '',
  ).trim();
  const ent = accountSetPayload.lingma_sys_ent || 'NewApp';
  const creator = accountSetPayload.createuser || '';

  if (!accountSetId) {
    throw new Error('缺少新建账套ID，无法初始化币别');
  }

  return [
    {
      id: generateUUID(),
      createuser: creator,
      createtime: now,
      lingma_sys_is_delete: 0,
      lingma_sys_ent: ent,
      account_set_id: accountSetId,
      currency_code: 'CNY',
      currency_name: '人民币',
      currency_symbol: '¥',
      currency_unit: '元',
      exchange_rate: 1,
      is_base_currency: 1,
      enable_status: 1,
      sort_no: 10,
      remark: '新增账套时自动初始化',
    },
  ];
}

function buildDefaultInexpCateList(
  accountSetPayload: BilAccountSetApi.AccountSet,
) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const accountSetId = String(
    accountSetPayload.account_set_id || accountSetPayload.rowid || '',
  ).trim();
  const ent = accountSetPayload.lingma_sys_ent || 'NewApp';
  const creator = accountSetPayload.createuser || '';

  if (!accountSetId) {
    throw new Error('缺少新建账套ID，无法初始化收支类别');
  }

  // description 字段用于“智能匹配摘要关键字”。
  // 内容来自当前数据库已维护的有效关键字，并统一改为逗号分割。
  const defaults = [
    {
      code: 'IN001',
      name: '销售收入',
      category_type: 1,
      sort_no: 1,
      description: '销售,收入,回款,收款,货款,款项回款,零售,主营',
    },
    {
      code: 'IN002',
      name: '服务收入',
      category_type: 1,
      sort_no: 2,
      description: '服务,劳务,计费,咨询,医疗,教育',
    },
    { code: 'IN003', name: '利息收入', category_type: 1, sort_no: 3 },
    { code: 'IN004', name: '股东投入', category_type: 1, sort_no: 4 },
    { code: 'IN005', name: '短期借款', category_type: 1, sort_no: 5 },
    {
      code: 'IN006',
      name: '长期借款',
      category_type: 1,
      sort_no: 6,
      description: '长期借款',
    },
    { code: 'IN007', name: '其他收入', category_type: 1, sort_no: 7 },
    {
      code: 'OUT001',
      name: '购买材料',
      category_type: 2,
      sort_no: 1,
      description: '购买,采购,材料,原材料,支付,付款,贷款,款项,补款',
    },
    { code: 'OUT002', name: '工资社保', category_type: 2, sort_no: 2 },
    {
      code: 'OUT003',
      name: '税费支出',
      category_type: 2,
      sort_no: 3,
      description: '税,税费,增值税,所得税,缴纳,税款,纳税,税务',
    },
    { code: 'OUT004', name: '个人所得税', category_type: 2, sort_no: 4 },
    { code: 'OUT005', name: '利息支出', category_type: 2, sort_no: 5 },
    { code: 'OUT006', name: '手续费', category_type: 2, sort_no: 6 },
    {
      code: 'OUT007',
      name: '租金物业',
      category_type: 2,
      sort_no: 7,
      description: '租金,物业,房租,租赁',
    },
    {
      code: 'OUT008',
      name: '水电费',
      category_type: 2,
      sort_no: 8,
      description: '水电,水电费,水费,电费',
    },
    {
      code: 'OUT009',
      name: '运输费',
      category_type: 2,
      sort_no: 9,
      description: '运输,运输费,运费,物流,快递费,货运,托运,空运,海运',
    },
    { code: 'OUT010', name: '差旅费', category_type: 2, sort_no: 10 },
    { code: 'OUT011', name: '招待费', category_type: 2, sort_no: 11 },
    { code: 'OUT012', name: '其他支出', category_type: 2, sort_no: 12 },
  ];

  return defaults.map((item) => ({
    id: generateUUID(),
    createuser: creator,
    createtime: now,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ent,
    account_set_id: accountSetId,
    parent_id: '0',
    enabled: 1,
    use_scope: 1,
    description: '',
    ...item,
  }));
}

function buildDefaultFinanceDepartmentList(
  accountSetPayload: BilAccountSetApi.AccountSet,
) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const accountSetId = String(
    accountSetPayload.account_set_id || accountSetPayload.rowid || '',
  ).trim();
  const ent = accountSetPayload.lingma_sys_ent || 'NewApp';
  const creator = accountSetPayload.createuser || '';

  if (!accountSetId) {
    throw new Error('缺少新建账套ID，无法初始化部门');
  }

  return [
    { code: 'BM001', name: '管理部', sort_no: 1 },
    { code: 'BM002', name: '财务部', sort_no: 2 },
    { code: 'BM003', name: '销售部', sort_no: 3 },
    { code: 'BM004', name: '采购部', sort_no: 4 },
    { code: 'BM005', name: '生产部', sort_no: 5 },
  ].map((item) => ({
    row_id: generateUUID(),
    createuser: creator,
    createtime: now,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ent,
    account_set_id: accountSetId,
    department_code: item.code,
    department_name: item.name,
    department_short_name: item.name,
    parent_department_code: '',
    parent_department_name: '',
    source_system: 'DEFAULT',
    source_table: '',
    source_row_id: item.code,
    source_code: item.code,
    enabled: 1,
    sort_no: item.sort_no,
  }));
}

function buildDefaultInventorySeedData(
  accountSetPayload: BilAccountSetApi.AccountSet,
) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const accountSetId = String(
    accountSetPayload.account_set_id || accountSetPayload.rowid || '',
  ).trim();
  const ent = accountSetPayload.lingma_sys_ent || 'NewApp';
  const creator = accountSetPayload.createuser || '';

  if (!accountSetId) {
    throw new Error('缺少新建账套ID，无法初始化进销存基础资料');
  }

  const categoryId = generateUUID();
  const unitId = generateUUID();
  const warehouseId = generateUUID();
  const productId = generateUUID();
  const customerId = generateUUID();
  const supplierId = generateUUID();

  return {
    categoryList: [
      {
        id: categoryId,
        parent_id: '0',
        name: '默认分类',
        code: 'DEFAULT',
        sort: 1,
        status: 0,
        deleted: 0,
        tenant_id: 0,
        createuser: creator,
        createtime: now,
        lingma_sys_is_delete: 0,
        lingma_sys_ent: ent,
        account_set_id: accountSetId,
      },
    ],
    unitList: [
      {
        id: unitId,
        name: '件',
        status: 0,
        tenant_id: 0,
        createuser: creator,
        createtime: now,
        lingma_sys_is_delete: 0,
        lingma_sys_ent: ent,
        account_set_id: accountSetId,
      },
    ],
    warehouseList: [
      {
        rowid: warehouseId,
        id: warehouseId,
        name: '默认仓库',
        address: '默认地址',
        sort: 1,
        remark: '新增账套时自动初始化',
        principal: '',
        warehouse_price: 0,
        truckage_price: 0,
        status: 1,
        default_status: 1,
        tenant_id: 0,
        deleted: 0,
        creator,
        create_time: now,
        createuser: creator,
        createtime: now,
        lingma_sys_is_delete: 0,
        lingma_sys_ent: ent,
        account_set_id: accountSetId,
      },
    ],
    customerList: [
      {
        row_id: customerId,
        rowid: customerId,
        customer_code: 'KH0001',
        customer_name: '默认客户',
        contact_name: '默认联系人',
        contact_mobile: '',
        company_type: 1,
        is_common_used: 1,
        is_pool: 0,
        deal_status: 1,
        remark: '新增账套时自动初始化，可按需修改或删除',
        createuser: creator,
        createtime: now,
        lingma_sys_is_delete: 0,
        lingma_sys_ent: ent,
        account_set_id: accountSetId,
      },
      {
        row_id: supplierId,
        rowid: supplierId,
        customer_code: 'GYS0001',
        customer_name: '默认供应商',
        contact_name: '默认联系人',
        contact_mobile: '',
        company_type: 2,
        is_common_used: 1,
        is_pool: 0,
        deal_status: 1,
        remark: '新增账套时自动初始化，可按需修改或删除',
        createuser: creator,
        createtime: now,
        lingma_sys_is_delete: 0,
        lingma_sys_ent: ent,
        account_set_id: accountSetId,
      },
    ],
    productList: [
      {
        rowid: productId,
        row_id: productId,
        product_code: 'SP0001',
        product_name: '默认商品',
        product_category_id: categoryId,
        product_type: categoryId,
        unit: '件',
        purchase_price: 100,
        retail_price: 120,
        purchase_tax: '0',
        retail_tax: '0',
        is_used_purchase: 1,
        is_used_retail: 1,
        is_common_used: 1,
        low_stock_warning_quantity: 0,
        stock_quantity: 0,
        default_warehouse_id: warehouseId,
        product_description: '新增账套时自动初始化，可按需修改或删除',
        createuser: creator,
        createtime: now,
        lingma_sys_is_delete: 0,
        lingma_sys_ent: ent,
        account_set_id: accountSetId,
      },
    ],
  };
}

async function getSubjectTemplateList() {
  const table = createSubjectTemplateTable();
  table.Filter = cond('lingma_sys_is_delete', 'notequal', 1);

  const queryParam: any = {
    Table: [table],
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items as BilAccountSetApi.SubjectTemplateItem[];
}

function buildSubjectAddedList(
  templateList: BilAccountSetApi.SubjectTemplateItem[],
  accountSetPayload: BilAccountSetApi.AccountSet,
) {
  const accountId = String(accountSetPayload.rowid || '').trim();
  const accountSetId = String(
    accountSetPayload.account_set_id || accountSetPayload.rowid || '',
  ).trim();

  if (!accountId) {
    throw new Error('缺少新建账套ID，无法复制初始科目模板');
  }

  return templateList.map((item) => ({
    rowid: generateUUID(),
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    wfid: item.wfid,
    flowstate: item.flowstate,
    ReportID: item.ReportID,
    description: item.description,
    lingma_sys_is_delete: item.lingma_sys_is_delete,
    subject_state: item.subject_state,
    is_leaf_subject: item.is_leaf_subject,
    parent_subject_number: item.parent_subject_number,
    balance_direction: item.balance_direction,
    subject_type: item.subject_type,
    subject_name: item.subject_name,
    subject_number: item.subject_number,
    account_id: accountId,
    lingma_sys_ent: item.lingma_sys_ent || accountSetPayload.lingma_sys_ent,
    auxiliary_accounting: item.auxiliary_accounting,
    account_set_id: accountSetId,
  }));
}

export async function getAccountCurrentAccount(params: any) {
  const table = createFinanceDataTableCurrent(
    ACCOUNTSET_MODEL_ID,
    ACCOUNTSET_TABLE,
    ACCOUNTSET_DB,
    ACCOUNTSET_PK,
  );

  const filterConds: any[] = [];
  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('account_name', 'contains', params.keyword),
        cond('tax_number', 'contains', params.keyword),
      ),
    );
  }

  if (
    params?.account_set_status !== undefined &&
    params?.account_set_status !== null
  ) {
    filterConds.push(
      cond('account_set_status', 'equal', params.account_set_status),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);

  return { dataTable: table, list: items, total };
}

export async function getAccountSetPage(params: any) {
  const table = new DataTable(
    ACCOUNTSET_MODEL_ID,
    ACCOUNTSET_TABLE,
    ACCOUNTSET_DB,
    ACCOUNTSET_PK,
  );

  const filterConds: any[] = [];
  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('account_name', 'contains', params.keyword),
        cond('tax_number', 'contains', params.keyword),
      ),
    );
  }

  if (
    params?.account_set_status !== undefined &&
    params?.account_set_status !== null
  ) {
    filterConds.push(
      cond('account_set_status', 'equal', params.account_set_status),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);

  return { dataTable: table, list: items, total };
}

export async function getAccountSet(id: string) {
  const table = new DataTable(
    ACCOUNTSET_MODEL_ID,
    ACCOUNTSET_TABLE,
    ACCOUNTSET_DB,
    ACCOUNTSET_PK,
  );
  table.Filter = cond(ACCOUNTSET_PK, 'equal', id);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items[0] || null;
}

export async function createAccountSet(data: BilAccountSetApi.AccountSet) {
  const accountTable = new DataTable(
    ACCOUNTSET_MODEL_ID,
    ACCOUNTSET_TABLE,
    ACCOUNTSET_DB,
    ACCOUNTSET_PK,
  );
  const subjectTable = createSubjectInfoTable();
  const voucherWordTable = createVoucherWordTable();
  const currencyTable = createCurrencyTable();
  const inexpCateTable = createInexpCateTable();
  const departmentTable = createFinanceAuxDepartmentTable();
  const assetCategoryTable = createAssetCategoryTable();
  const {
    categoryTable,
    unitTable,
    warehouseTable,
    productTable,
    customerTable,
  } = createInventorySeedTables();

  const rowid = data.rowid || generateUUID();
  const payload: any = {
    ...data,
    rowid,
    account_set_id: data.account_set_id || rowid,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    lingma_sys_ent: data?.lingma_sys_ent || 'NewApp',
  };

  const templateList = await getSubjectTemplateList();
  if (templateList.length === 0) {
    throw new Error('Bil_Subject_Template 没有可复制的数据，无法新增账套');
  }

  const subjectAddedList = buildSubjectAddedList(templateList, payload);
  const voucherWordAddedList = buildDefaultVoucherWordList(payload);
  const currencyAddedList = buildDefaultCurrencyList(payload);
  const inexpCateAddedList = buildDefaultInexpCateList(payload);
  const departmentAddedList = buildDefaultFinanceDepartmentList(payload);
  const assetCategoryAddedList = buildDefaultAssetCategoryList({
    accountSetId: payload.account_set_id,
    createuser: payload.createuser,
    lingmaSysEnt: payload.lingma_sys_ent,
  });
  const inventorySeed = buildDefaultInventorySeedData(payload);

  const saveParam = [
    ...accountTable.getSaveParam([payload], [], []),
    ...subjectTable.getSaveParam(subjectAddedList, [], []),
    ...voucherWordTable.getSaveParam(voucherWordAddedList, [], []),
    ...currencyTable.getSaveParam(currencyAddedList, [], []),
    ...inexpCateTable.getSaveParam(inexpCateAddedList, [], []),
    ...departmentTable.getSaveParam(departmentAddedList, [], []),
    ...assetCategoryTable.getSaveParam(assetCategoryAddedList, [], []),
    ...categoryTable.getSaveParam(inventorySeed.categoryList, [], []),
    ...unitTable.getSaveParam(inventorySeed.unitList, [], []),
    ...warehouseTable.getSaveParam(inventorySeed.warehouseList, [], []),
    ...customerTable.getSaveParam(inventorySeed.customerList, [], []),
    ...productTable.getSaveParam(inventorySeed.productList, [], []),
  ];

  return await requestClient.post(accountTable.saveUrl, saveParam, {
    headers: accountTable.getRequestHeader(),
  });
}

export async function updateAccountSet(data: BilAccountSetApi.AccountSet) {
  if (!data.rowid) throw new Error('缺少 rowid');
  const table = new DataTable(
    ACCOUNTSET_MODEL_ID,
    ACCOUNTSET_TABLE,
    ACCOUNTSET_DB,
    ACCOUNTSET_PK,
  );

  const payload: any = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteAccountSet(id: string) {
  return await updateAccountSet({ rowid: id, lingma_sys_is_delete: 1 } as any);
}
