import { exportExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '../../finance/common/account-set-scope';

export namespace ErpProductApi {
  /** 产品信息 */
  export interface Product {
    rowid: string; // 唯一值（ID）
    createuser?: string; // 创建人
    createtime?: string; // 创建时间
    updateuser?: string; // 修改人
    updatetime?: string; // 修改时间
    wfid?: string; // 流程实例id
    flowstate?: number; // 流程状态
    ReportID?: string; // 报表id
    description?: string; // 摘要
    lingma_sys_is_delete?: number; // 是否删除
    product_image?: string; // 产品图片
    low_stock_warning_quantity?: number; // 最低库存预警数量
    stock_quantity?: number; // 库存数量
    stock_type?: string; // 库存类型
    purchase_price?: number; // 采购价
    retail_price?: number; // 销售价
    barcode?: string; // 条码
    launch_date?: string; // 上市日期
    manufacturer?: string; // 供应商
    model?: string; // 规格型号
    unit?: string; // 单位
    product_type?: string; // 产品分类（历史字段，兼容）
    category_id?: string; // 产品分类ID（关联 erp_product_category.id）
    product_description?: string; // 备注
    product_name?: string; // 产品名称
    product_code?: string; // 产品编号
    purchase_tax?: string; // 默认采购税率
    retail_tax?: string; // 默认销售税率
    is_used_purchase?: number; // 是否用于采购
    is_used_retail?: number; // 是否用于销售
    is_common_used?: number; // 是否常用
    company_name?: string; // 归属公司
    depart_name?: string; // 归属部门
    company_id?: string; // 归属公司ID
    depart_id?: string; // 归属部门ID
    defalut_expense_type?: string; // 默认支出类别
    default_income_type?: string; // 默认收入类别
    default_warehouse_id?: string; // 默认仓库ID
  }
}

function normalizeProduct(product: any) {
  const rowid = String(
    product?.rowid ?? product?.row_id ?? product?.ROWID ?? product?.id ?? '',
  ).trim();
  const name =
    product?.product_name ?? product?.name ?? product?.ProductName ?? '';
  return {
    ...product,
    rowid: rowid || product?.rowid,
    row_id: product?.row_id ?? rowid,
    id: product?.id ?? rowid,
    name,
    product_name: name,
    unitId: product?.unit ?? product?.unitId,
    unitName: product?.unit ?? product?.unitName ?? product?.unit_name,
    barCode: product?.barcode ?? product?.barCode,
    barcode: product?.barcode ?? product?.barCode,
    purchasePrice: product?.purchase_price ?? product?.purchasePrice,
    purchase_price: product?.purchase_price ?? product?.purchasePrice,
  };
}

const FORM_ID = '808171E1BEEB39628534FFE429195F38';
const TABLE_NAME = 'Bil_Product_Info';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'row_id';

/** 查询产品分页 */
export async function getProductPage(params: any) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );

  const conditions: any[] = [];
  const productName = params.product_name ?? params.name;
  const productCode = params.product_code ?? params.code;
  const barcode = params.barcode ?? params.bar_code;
  const product_category_id = params.product_category_id;
  const productType = params.product_type;

  if (productName) {
    conditions.push(cond('product_name', 'contains', productName));
  }
  if (productCode) {
    conditions.push(cond('product_code', 'contains', productCode));
  }
  if (barcode) {
    conditions.push(cond('barcode', 'contains', barcode));
  }
  if (product_category_id) {
    conditions.push(cond('product_category_id', 'equal', product_category_id));
    // conditions.push(or(cond('category_id', 'equal', categoryId), cond('product_type', 'equal', categoryId)));
  } else if (productType) {
    conditions.push(cond('product_type', 'equal', productType));
  }
  // if (params.status !== undefined && params.status !== '') {
  //   conditions.push(cond('status', 'equal', params.status));
  // }

  if (conditions.length > 0) {
    table.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 10,
      index: 1,
    },
  };

  if (params.page && params.pageNo) {
    queryParam.PageParam = {
      page: params.page,
      index: params.pageNo,
    };
  }

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;

  if (params.page && params.pageNo) {
    returnData.list = Array.isArray(resData.Items)
      ? resData.Items.map((item: any) => normalizeProduct(item))
      : [];
    returnData.total = resData.Count;
  } else {
    // If page=0, Items contains all
    returnData.list = Array.isArray(resData.Items)
      ? resData.Items.map((item: any) => normalizeProduct(item))
      : [];
    if (resData.Count) returnData.total = resData.Count;
  }
  return returnData;
}

/** 查询产品精简列表 */
export async function getProductSimpleList() {
  const res = await getProductPage({ page: 0, pageNo: 1 });
  const list = res.list;
  return list as any[];
}

/** 查询产品详情 */
export async function getProduct(id: number | string) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );

  table.Filter = and(cond(PRIMARY_KEY, 'equal', id));

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = resQuery.data.Result.data.Items;
  if (items && items.length > 0) {
    return normalizeProduct(items[0]);
  }
  return null;
}

/** 新增产品 */
export async function createProduct(data: ErpProductApi.Product) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const saveParam = table.getSaveParam([data], [], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改产品 */
export async function updateProduct(data: ErpProductApi.Product) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const saveParam = table.getSaveParam([], [data], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除产品 */
export async function deleteProduct(ids: string | string[]) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  let deleteList: Array<Record<string, any>> = [];
  if (Array.isArray(ids)) {
    deleteList = ids.map((id) => ({ [PRIMARY_KEY]: id }));
  } else if (typeof ids === 'string') {
    deleteList = ids.split(',').map((id) => ({ [PRIMARY_KEY]: id }));
  }
  const saveParam = table.getSaveParam([], [], deleteList);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 按编码前缀查询产品 */
export async function getProductListByCodePrefix(prefix: string) {
  const value = String(prefix || '').trim();
  if (!value) {
    return [] as any[];
  }
  const res = await getProductPage({
    page: 0,
    pageNo: 1,
    product_code: value,
  });
  const list = Array.isArray(res?.list) ? res.list : [];
  return list.filter((item) =>
    String(item?.product_code || '').startsWith(value),
  );
}

/** 按分类编码构建下一个产品编码：CP + 分类编码 + 三位流水号 */
export async function buildNextProductCodeByCategoryCode(categoryCode: string) {
  const cleanCode = String(categoryCode || '').trim();
  if (!cleanCode) {
    return '';
  }

  const prefix = `CP${cleanCode}`;
  const list = await getProductListByCodePrefix(prefix);

  let maxSeq = 0;
  for (const item of list) {
    const code = String(item?.product_code || '');
    if (!code.startsWith(prefix)) {
      continue;
    }
    const seqText = code.slice(prefix.length);
    if (!/^\d+$/.test(seqText)) {
      continue;
    }
    const seq = Number(seqText);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

/** 检查产品编码是否存在 */
export async function checkProductCodeExists(
  productCode?: string,
  excludeRowId?: string,
) {
  const code = String(productCode || '').trim();
  if (!code) {
    return false;
  }

  const res = await getProductPage({
    page: 0,
    pageNo: 1,
    product_code: code,
  });
  const list = Array.isArray(res?.list) ? res.list : [];
  return list.some((item) => {
    const sameCode = String(item?.product_code || '') === code;
    const notSelf = excludeRowId
      ? String(item?.rowid ?? item?.row_id ?? '') !== String(excludeRowId)
      : true;
    return sameCode && notSelf;
  });
}

/** 导出产品 Excel */
export function exportProduct(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: FORM_ID,
      tableName: TABLE_NAME,
      dbName: DB_NAME,
      primaryKey: PRIMARY_KEY,
      fileName: '产品信息',
      encodingId,
      extraData: params,
    });
  }

  return requestClient.download('/erp/product/export-excel', { params });
}
