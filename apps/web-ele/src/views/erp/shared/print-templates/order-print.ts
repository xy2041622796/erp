import {
  buildErpPrintDocument,
  escapeHtml,
  formatDate,
  toCount,
  toMoney,
  toMoneyText,
  toNumber,
  toRmbUpper,
} from './common';

export type ErpPrintDocType =
  | 'purchase-in'
  | 'purchase-order'
  | 'sale-order'
  | 'sale-out'
  | 'sale-return'
  | 'stock-move';

export type ErpOrderPrintOptions = {
  categoryList?: any[];
  companyName?: string;
  data: any;
  previewOnly?: boolean;
  productList?: any[];
  type: ErpPrintDocType;
  warehouseList?: any[];
};

const TITLE_MAP: Record<ErpPrintDocType, string> = {
  'purchase-in': '采购入库单',
  'purchase-order': '采购订单',
  'sale-order': '销售订单',
  'sale-out': '销售出库单',
  'sale-return': '销售退货单',
  'stock-move': '调拨单',
};

function pick(data: any, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function statusLabel(type: ErpPrintDocType, status: any) {
  const n = Number(status);
  if (type === 'sale-order')
    return (
      ({ 10: '未出库', 20: '全部出库', 30: '部分出库' } as any)[n] ||
      String(status ?? '')
    );
  if (type === 'purchase-order')
    return (
      ({ 10: '未入库', 20: '全部入库', 30: '部分入库' } as any)[n] ||
      String(status ?? '')
    );
  return (
    ({ 10: '待审批', 20: '审核通过', 30: '审核不通过' } as any)[n] ||
    String(status ?? '')
  );
}

function findByIdentity(list: any[] = [], value: any) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return (
    list.find((item) =>
      [item?.rowid, item?.row_id, item?.id, item?.ROWID].some(
        (key) => String(key ?? '') === text,
      ),
    ) || null
  );
}

function productName(row: any, productList: any[] = []) {
  const direct = pick(row, [
    '_product_name',
    'product_name',
    'productName',
    'name',
  ]);
  if (direct) return direct;
  const product = findByIdentity(
    productList,
    row?.product_id ?? row?.productId,
  );
  return pick(product, ['product_name', 'productName', 'name']) || '';
}

function unitName(row: any) {
  return pick(row, [
    'product_unit_name',
    'productUnitName',
    'unit_name',
    'unit',
    'product_unit_id',
  ]);
}

function warehouseName(row: any, warehouseList: any[] = []) {
  const direct = pick(row, [
    '_warehouse_name',
    'warehouse_name',
    'warehouseName',
  ]);
  if (direct) return direct;
  const warehouse = findByIdentity(
    warehouseList,
    row?.warehouse_id ?? row?.warehouseId,
  );
  return pick(warehouse, ['name', 'warehouse_name', 'warehouseName']) || '';
}

function productInfo(row: any, productList: any[] = []) {
  return findByIdentity(productList, row?.product_id ?? row?.productId) || {};
}

function isIdLike(value: any) {
  const text = String(value ?? '').trim();
  if (!text) return true;
  return /^[a-f0-9]{32}$/i.test(text) || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(text);
}

function productField(row: any, productList: any[] = [], keys: string[]) {
  const direct = pick(row, keys);
  if (direct && !isIdLike(direct)) return direct;
  const fromProduct = pick(productInfo(row, productList), keys);
  if (fromProduct && !isIdLike(fromProduct)) return fromProduct;
  return '';
}

function findCategoryById(categoryList: any[] = [], value: any): any {
  const text = String(value ?? '').trim();
  if (!text) return null;
  for (const item of categoryList) {
    if (
      [item?.id, item?.rowid, item?.row_id, item?.ROWID, item?.code].some(
        (key) => String(key ?? '') === text,
      )
    ) {
      return item;
    }
    const child = findCategoryById(item?.children || [], text);
    if (child) return child;
  }
  return null;
}

function productCategoryName(
  row: any,
  productList: any[] = [],
  categoryList: any[] = [],
) {
  const name = productField(row, productList, [
    'category_name',
    'categoryName',
    'product_category_name',
    'productCategoryName',
  ]);
  if (name) return name;

  const product = productInfo(row, productList);
  const categoryId =
    pick(row, [
      'product_category_id',
      'productCategoryId',
      'category_id',
      'categoryId',
      'product_type',
      'productType',
    ]) ||
    pick(product, [
      'product_category_id',
      'productCategoryId',
      'category_id',
      'categoryId',
      'product_type',
      'productType',
    ]);
  const category = findCategoryById(categoryList, categoryId);
  const categoryName = pick(category, [
    'name',
    'category_name',
    'categoryName',
  ]);
  if (categoryName) return categoryName;
  return categoryList.length > 0 ? '' : categoryId;
}

function totalPrice(row: any) {
  const total = toNumber(row?.total_price ?? row?.totalPrice);
  if (total) return total;
  const count = toNumber(row?.count);
  const price = toNumber(
    row?.tax_included_price ??
      row?.taxIncludedPrice ??
      row?.product_price ??
      row?.productPrice,
  );
  return count * price;
}

function unitPrice(row: any) {
  const price = toNumber(
    row?.tax_included_price ??
      row?.taxIncludedPrice ??
      row?.product_price ??
      row?.productPrice,
  );
  if (price) return price;
  const count = toNumber(row?.count);
  return count ? totalPrice(row) / count : 0;
}

function rowDiscountPrice(row: any) {
  const direct = toNumber(row?.discount_price ?? row?.discountPrice);
  if (direct) return direct;
  const percent = toNumber(row?.discount_percent ?? row?.discountPercent);
  return percent ? totalPrice(row) * (percent / 100) : 0;
}

function makerName(data: any) {
  return pick(data, [
    '_creator_name',
    'creator_name',
    'creatorName',
    'create_user_name',
    'createUserName',
    'createuser',
    'creator',
  ]);
}

function buildOrderRows(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map(
      (row: any, index: number) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>${escapeHtml(productName(row, productList))}</td>
      <td>${escapeHtml(warehouseName(row, warehouseList))}</td>
      <td class="text-center">${escapeHtml(unitName(row))}</td>
      <td class="text-right">${toCount(row?.count)}</td>
      <td class="text-right">${toMoney(unitPrice(row))}</td>
      <td class="text-right">${toMoney(totalPrice(row))}</td>
      <td>${escapeHtml(row?.remark ?? '')}</td>
    </tr>`,
    )
    .join('');
}

function buildPurchaseOrderDetailRows(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((row: any, index: number) => {
      const discountPercent = pick(row, [
        'discount_percent',
        'discountPercent',
      ]);
      const discount = rowDiscountPrice(row);
      return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${escapeHtml(productField(row, productList, ['product_code', 'productCode', 'product_bar_code', 'productBarCode', 'barcode']))}</td>
        <td>${escapeHtml(productName(row, productList))}</td>
        <td>${escapeHtml(productField(row, productList, ['model', 'spec', 'specification', 'specification_model']))}</td>
        <td>${escapeHtml(productCategoryName(row, productList, categoryList))}</td>
        <td>${escapeHtml(productField(row, productList, ['brand', 'brand_name', 'brandName']))}</td>
        <td>${escapeHtml(productField(row, productList, ['origin', 'place_of_origin', 'producing_area', 'manufacturer']))}</td>
        <td>${escapeHtml(unitName(row))}</td>
        <td>${escapeHtml(warehouseName(row, warehouseList))}</td>
        <td class="text-right">${toCount(row?.count)}</td>
        <td class="text-right">${toMoney(unitPrice(row))}</td>
        <td class="text-right">${escapeHtml(discountPercent)}</td>
        <td class="text-right">${toMoney(discount)}</td>
        <td class="text-right">${toMoney(totalPrice(row))}</td>
        <td class="text-right">${toMoney(row?.allocated_discount_price ?? row?.discount_allocate_price ?? row?.discountSharePrice)}</td>
        <td>${escapeHtml(pick(row, ['source_no', 'sourceNo', 'in_no', 'inNo', 'purchase_in_no', 'purchaseInNo']))}</td>
        <td>${escapeHtml(row?.remark ?? '')}</td>
      </tr>`;
    })
    .join('');
}

function buildStockRows(
  type: ErpPrintDocType,
  data: any,
  productList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const hasSource = Boolean(
    data?.order_id ||
      data?.order_no ||
      items.some((row: any) => row?.order_item_id),
  );
  const isIn = type === 'purchase-in';
  return {
    hasSource,
    rows: items
      .map((row: any, index: number) => {
        if (!hasSource) {
          return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${escapeHtml(productName(row, productList))}</td>
            <td class="text-center">${escapeHtml(unitName(row))}</td>
            <td class="text-right">${toCount(row?.count)}</td>
            <td>${escapeHtml(row?.remark ?? '')}</td>
          </tr>`;
        }
        return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${escapeHtml(productName(row, productList))}</td>
          <td class="text-center">${escapeHtml(unitName(row))}</td>
          <td class="text-right">${toCount(row?.total_count ?? row?.totalCount)}</td>
          <td class="text-right">${toCount(isIn ? (row?.in_count ?? row?.inCount) : (row?.out_count ?? row?.outCount))}</td>
          <td class="text-right">${toCount(row?.return_count ?? row?.returnCount)}</td>
          <td class="text-right">${toCount(row?.count)}</td>
          <td>${escapeHtml(row?.remark ?? '')}</td>
        </tr>`;
      })
      .join(''),
  };
}

function totalCount(data: any) {
  return (
    data?.total_count ??
    (Array.isArray(data?.items)
      ? data.items.reduce(
          (sum: number, row: any) => sum + toNumber(row?.count),
          0,
        )
      : 0)
  );
}

function orderTable(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
) {
  const rows = buildOrderRows(data, productList, warehouseList);
  return `
    <table class="erp-print-table">
      <colgroup>
        <col style="width: 36px" /><col /><col style="width: 78px" /><col style="width: 54px" />
        <col style="width: 64px" /><col style="width: 72px" /><col style="width: 78px" /><col style="width: 100px" />
      </colgroup>
      <thead><tr><th>序号</th><th>产品名称</th><th>仓库</th><th>单位</th><th>数量</th><th>含税单价</th><th>含税合计</th><th>备注</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="text-center muted">暂无明细</td></tr>'}</tbody>
    </table>
    <div class="erp-print-summary">
      <div>合计数量：${toCount(totalCount(data))}</div>
      <div>优惠金额：${toMoney(data?.discount_price)}</div>
      <div>优惠后金额：${toMoney(data?.total_price)}</div>
    </div>`;
}

function purchaseOrderWideTable(
  type: ErpPrintDocType,
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const rows = buildPurchaseOrderDetailRows(
    data,
    productList,
    warehouseList,
    categoryList,
  );
  const sourceHeader = type === 'sale-order' ? '关联销售出库单号' : '关联采购入库单号';
  return `
    <table class="erp-purchase-print-table">
      <colgroup>
        <col style="width: 5.5%" /><col style="width: 6.2%" /><col style="width: 5.6%" />
        <col style="width: 5.6%" /><col style="width: 5.6%" /><col style="width: 5.4%" />
        <col style="width: 5.4%" /><col style="width: 5.6%" /><col style="width: 5.6%" />
        <col style="width: 5.6%" /><col style="width: 5.6%" /><col style="width: 5.6%" />
        <col style="width: 5.6%" /><col style="width: 5.6%" /><col style="width: 5.6%" />
        <col style="width: 5.6%" /><col style="width: 9.3%" />
      </colgroup>
      <thead>
        <tr>
          <th>序号</th><th>商品编码</th><th>商品名称</th><th>规格型号</th>
          <th>商品类别</th><th>品牌</th><th>产地</th><th>单位</th><th>仓库</th>
          <th>数量</th><th>单价</th><th>折扣率(%)</th><th>折扣额</th><th>金额</th>
          <th>优惠金额分配</th><th>${escapeHtml(sourceHeader)}</th><th>商品备注</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="17" class="text-center muted">暂无明细</td></tr>'}
        <tr class="erp-purchase-print-total-row">
          <td>合计</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td class="text-right">${toCount(totalCount(data))}</td>
          <td></td><td></td><td></td><td class="text-right">${toMoney(data?.total_product_price)}</td>
          <td></td><td></td><td></td>
        </tr>
        <tr>
          <td colspan="17" class="erp-purchase-print-upper">合计金额大写：${escapeHtml(toRmbUpper(data?.total_price))}</td>
        </tr>
      </tbody>
    </table>
    <div class="erp-purchase-print-summary">
      <div>优惠率（%）： ${toMoneyText(data?.discount_percent)}</div>
      <div>优惠金额： ${toMoneyText(data?.discount_price)}</div>
      <div>优惠后金额： ${toMoneyText(data?.total_price)}</div>
    </div>`;
}

function stockTable(type: ErpPrintDocType, data: any, productList: any[] = []) {
  const { hasSource, rows } = buildStockRows(type, data, productList);
  if (!hasSource) {
    return `
      <table class="erp-print-table">
        <colgroup><col style="width:36px" /><col /><col style="width:60px" /><col style="width:90px" /><col style="width:130px" /></colgroup>
        <thead><tr><th>序号</th><th>产品名称</th><th>单位</th><th>${type === 'purchase-in' ? '本次入库数量' : '本次出库数量'}</th><th>备注</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="text-center muted">暂无明细</td></tr>'}</tbody>
      </table>
      <div class="erp-print-summary"><div>合计数量：${toCount(totalCount(data))}</div><div></div><div></div></div>`;
  }
  return `
    <table class="erp-print-table">
      <colgroup><col style="width:36px" /><col /><col style="width:56px" /><col style="width:72px" /><col style="width:82px" /><col style="width:72px" /><col style="width:88px" /><col style="width:100px" /></colgroup>
      <thead><tr><th>序号</th><th>产品名称</th><th>单位</th><th>计划数量</th><th>${type === 'purchase-in' ? '历史累计入库' : '历史累计出库'}</th><th>退货数量</th><th>${type === 'purchase-in' ? '本次入库数量' : '本次出库数量'}</th><th>备注</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="text-center muted">暂无明细</td></tr>'}</tbody>
    </table>
    <div class="erp-print-summary"><div>合计数量：${toCount(totalCount(data))}</div><div></div><div></div></div>`;
}

function meta(type: ErpPrintDocType, data: any) {
  const isSale = type === 'sale-order' || type === 'sale-out';
  const isStock = type === 'sale-out' || type === 'purchase-in';
  const partnerLabel = isSale ? '客户' : '供应商';
  const partner = isSale
    ? pick(data, [
        '_customer_name',
        'customer_name',
        'customerName',
      ])
    : pick(data, [
        '_supplier_name',
        'supplier_name',
        'supplierName',
      ]);
  let staffLabel = '经手人';
  if (type === 'purchase-order') {
    staffLabel = '采购员';
  } else if (type === 'sale-order' || type === 'sale-out') {
    staffLabel = '销售员';
  }
  const staff =
    type === 'purchase-order'
      ? pick(data, [
          '_purchase_user_name',
          'purchase_user_name',
          'purchaseUserName',
          'purchase_user_id',
        ])
      : pick(data, [
          '_sale_user_name',
          'sale_user_name',
          'saleUserName',
          'sale_user_id',
          'createuser',
        ]);
  let date = data?.order_time;
  if (type === 'purchase-in') {
    date = data?.in_time;
  } else if (type === 'sale-out') {
    date = data?.out_time;
  }
  return `
    <div class="erp-print-meta">
      <div>单据编号：${escapeHtml(pick(data, ['no', 'code'])) || '-'}</div>
      <div>单据日期：${escapeHtml(formatDate(date)) || '-'}</div>
      <div>${partnerLabel}：${escapeHtml(partner) || '-'}</div>
      <div>${staffLabel}：${escapeHtml(staff) || '-'}</div>
      ${isStock ? `<div>来源订单：${escapeHtml(pick(data, ['order_no', 'orderNo'])) || '无源单'}</div>` : ''}
      ${isStock ? `<div>执行仓库：${escapeHtml(pick(data, ['_warehouse_name', 'warehouse_name', 'warehouseName', 'warehouse_id'])) || '-'}</div>` : ''}
      <div>单据状态：${escapeHtml(statusLabel(type, data?.status)) || '-'}</div>
      <div></div>
    </div>`;
}

function sign(type: ErpPrintDocType) {
  if (type === 'sale-order') return ['销售员', '制单人'];
  if (type === 'purchase-order') return ['采购员', '制单人'];
  return ['仓库员', '审核人', '制单人'];
}

function wideOrderMeta(type: ErpPrintDocType, data: any) {
  const isSale = type === 'sale-order';
  const partnerLabel = isSale ? '客户' : '供应商';
  const staffLabel = isSale ? '销售人员' : '采购人员';
  const contactLabel = isSale ? '客户联系人' : '供应商联系人';
  const phoneLabel = isSale ? '客户联系电话' : '供应商联系电话';

  const partner = isSale
    ? pick(data, ['_customer_name', 'customer_name', 'customerName'])
    : pick(data, ['_supplier_name', 'supplier_name', 'supplierName']);

  const staff = isSale
    ? pick(data, ['_sale_user_name', 'sale_user_name', 'saleUserName'])
    : pick(data, ['_purchase_user_name', 'purchase_user_name', 'purchaseUserName']);

  const contactName = pick(data, ['contact_name', 'contactName', 'supplier_contact']);
  const contactPhone = pick(data, ['contact_phone', 'contactPhone', 'telephone', 'mobile', 'supplier_phone']);

  return `
    <div class="erp-purchase-print-meta">
      <div>${partnerLabel}： <span>${escapeHtml(partner)}</span></div>
      <div>${staffLabel}： <span>${escapeHtml(staff)}</span></div>
      <div>单据日期： <span>${escapeHtml(formatDate(data?.order_time))}</span></div>
      <div>交货日期： <span>${escapeHtml(formatDate(data?.delivery_date ?? data?.arrival_date ?? data?.order_time))}</span></div>
      <div>单据编号： <span>${escapeHtml(pick(data, ['no', 'code']))}</span></div>
      <div>币别： <span>${escapeHtml(pick(data, ['currency', 'currency_code', 'currencyCode'])) || 'RMB'}</span></div>
      <div>${contactLabel}： <span>${escapeHtml(contactName)}</span></div>
      <div>${phoneLabel}： <span>${escapeHtml(contactPhone)}</span></div>
      <div></div>
    </div>`;
}

function wideOrderFooter(type: ErpPrintDocType, data: any) {
  const isSale = type === 'sale-order';
  const signLabel1 = isSale ? '客户签字' : '供应商签字';
  const signLabel2 = isSale ? '销售员签字' : '采购人签字';

  return `
    <div class="erp-purchase-print-footer">
      <div>制单人： <span>${escapeHtml(makerName(data))}</span></div>
      <div>收货人： <span>${escapeHtml(pick(data, ['receiver', 'receiver_name', 'receiverName', 'consignee']))}</span></div>
      <div>收货电话： <span>${escapeHtml(pick(data, ['receiver_phone', 'receiverPhone', 'consignee_phone', 'consigneePhone']))}</span></div>
      <div>收货地址： <span>${escapeHtml(pick(data, ['receiver_address', 'receiverAddress', 'shipping_address', 'shippingAddress', 'address']))}</span></div>
      <div>${signLabel1}： <span class="erp-purchase-print-line"></span></div>
      <div>${signLabel2}： <span class="erp-purchase-print-line"></span></div>
      <div>公司电话： <span>${escapeHtml(pick(data, ['company_phone', 'companyPhone']))}</span></div>
      <div>公司传真： <span>${escapeHtml(pick(data, ['company_fax', 'companyFax', 'fax']))}</span></div>
      <div>公司地址： <span>${escapeHtml(pick(data, ['company_address', 'companyAddress']))}</span></div>
      <div class="erp-purchase-print-remark">单据备注： <span>${escapeHtml(data?.remark ?? '')}</span></div>
    </div>`;
}

function saleOutWideMeta(data: any) {
  return `
    <div class="erp-purchase-print-meta">
      <div>客户： <span>${escapeHtml(pick(data, ['_customer_name', 'customer_name', 'customerName']))}</span></div>
      <div>销售人员： <span>${escapeHtml(pick(data, ['_sale_user_name', 'sale_user_name', 'saleUserName']))}</span></div>
      <div>单据日期： <span>${escapeHtml(formatDate(data?.out_time))}</span></div>
      <div>单据编号： <span>${escapeHtml(pick(data, ['no', 'code']))}</span></div>
      <div>币别： <span>${escapeHtml(pick(data, ['currency', 'currency_code', 'currencyCode'])) || 'RMB'}</span></div>
      <div>客户收货人： <span>${escapeHtml(pick(data, ['contact_name', 'contactName', 'receiver', 'receiver_name', 'receiverName']))}</span></div>
      <div>客户收货电话： <span>${escapeHtml(pick(data, ['contact_phone', 'contactPhone', 'telephone', 'mobile', 'receiver_phone', 'receiverPhone']))}</span></div>
      <div>客户收货地址： <span>${escapeHtml(pick(data, ['address', 'receiver_address', 'receiverAddress', 'shipping_address', 'shippingAddress']))}</span></div>
      <div></div>
    </div>`;
}

function buildSaleOutDetailRows(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((row: any, index: number) => {
      const discountPercent = pick(row, ['discount_percent', 'discountPercent']);
      const discount = rowDiscountPrice(row);
      return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${escapeHtml(productField(row, productList, ['product_code', 'productCode', 'product_bar_code', 'productBarCode', 'barcode']))}</td>
        <td>${escapeHtml(productName(row, productList))}</td>
        <td>${escapeHtml(productField(row, productList, ['model', 'spec', 'specification', 'specification_model']))}</td>
        <td>${escapeHtml(productCategoryName(row, productList, categoryList))}</td>
        <td>${escapeHtml(productField(row, productList, ['brand', 'brand_name', 'brandName']))}</td>
        <td>${escapeHtml(productField(row, productList, ['origin', 'place_of_origin', 'producing_area', 'manufacturer']))}</td>
        <td>${escapeHtml(unitName(row))}</td>
        <td>${escapeHtml(warehouseName(row, warehouseList))}</td>
        <td class="text-right">${toCount(row?.count)}</td>
        <td class="text-right">${toMoney(unitPrice(row))}</td>
        <td class="text-right">${escapeHtml(discountPercent)}</td>
        <td class="text-right">${toMoney(discount)}</td>
        <td class="text-right">${toMoney(totalPrice(row))}</td>
        <td class="text-right">${toMoney(row?.allocated_discount_price ?? row?.discount_allocate_price ?? row?.discountSharePrice)}</td>
        <td>${escapeHtml(pick(row, ['source_no', 'sourceNo', 'order_no', 'orderNo']))}</td>
        <td class="text-right">${toMoney(pick(row, ['sale_expense', 'saleExpense', 'expense', 'other_price', 'otherPrice']))}</td>
        <td>${escapeHtml(row?.remark ?? '')}</td>
      </tr>`;
    })
    .join('');
}

function saleOutWideTable(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const rows = buildSaleOutDetailRows(data, productList, warehouseList, categoryList);
  return `
    <table class="erp-purchase-print-table">
      <colgroup>
        <col style="width: 4.5%" /><col style="width: 5.5%" /><col style="width: 5%" />
        <col style="width: 5%" /><col style="width: 5%" /><col style="width: 4.8%" />
        <col style="width: 4.8%" /><col style="width: 5%" /><col style="width: 5%" />
        <col style="width: 5%" /><col style="width: 5%" /><col style="width: 5%" />
        <col style="width: 5%" /><col style="width: 5%" /><col style="width: 5%" />
        <col style="width: 5.5%" /><col style="width: 5.5%" /><col style="width: 9.6%" />
      </colgroup>
      <thead>
        <tr>
          <th>序号</th><th>商品编码</th><th>商品名称</th><th>规格型号</th>
          <th>商品类别</th><th>品牌</th><th>产地</th><th>单位</th><th>仓库</th>
          <th>数量</th><th>单价</th><th>折扣率(%)</th><th>折扣额</th><th>金额</th>
          <th>优惠金额分配额</th><th>关联销售单号</th><th>销售费用</th><th>商品备注</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="18" class="text-center muted">暂无明细</td></tr>'}
        <tr class="erp-purchase-print-total-row">
          <td>合计</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td class="text-right">${toCount(totalCount(data))}</td>
          <td></td><td></td><td></td><td class="text-right">${toMoney(data?.total_product_price)}</td>
          <td></td><td></td><td></td><td></td>
        </tr>
        <tr>
          <td colspan="18" class="erp-purchase-print-upper">合计金额大写：${escapeHtml(toRmbUpper(data?.total_price))}</td>
        </tr>
      </tbody>
    </table>`;
}

function saleOutSummary(data: any) {
  return `
    <div class="erp-purchase-print-summary">
      <div>优惠率（%）： ${toMoneyText(data?.discount_percent)}</div>
      <div>优惠金额： ${toMoneyText(data?.discount_price)}</div>
      <div>优惠后金额： ${toMoneyText(data?.total_price)}</div>
    </div>
    <div class="erp-purchase-print-summary">
      <div>客户承担费： ${toMoneyText(pick(data, ['customer_expense', 'customerExpense', 'other_price', 'otherPrice']))}</div>
      <div>本次收款： ${toMoneyText(data?.receipt_price)}</div>
      <div>收款账户：</div>
    </div>
    <div class="erp-purchase-print-summary">
      <div>销售费用： ${toMoneyText(pick(data, ['other_price', 'otherPrice', 'sale_expense', 'saleExpense']))}</div>
      <div>本次欠款： ${toMoneyText(pick(data, ['debt_price', 'debt', 'debtPrice', 'balance', 'balance_price', 'balancePrice']))}</div>
      <div></div>
    </div>`;
}

function saleOutFooter(data: any) {
  return `
    <div class="erp-purchase-print-footer">
      <div>制单人： <span>${escapeHtml(makerName(data))}</span></div>
      <div>收货人： <span>${escapeHtml(pick(data, ['receiver', 'receiver_name', 'receiverName', 'consignee']))}</span></div>
      <div>收货电话： <span>${escapeHtml(pick(data, ['receiver_phone', 'receiverPhone', 'consignee_phone', 'consigneePhone']))}</span></div>
      <div>收货地址： <span>${escapeHtml(pick(data, ['receiver_address', 'receiverAddress', 'shipping_address', 'shippingAddress', 'address']))}</span></div>
      <div>发货人签字： <span class="erp-purchase-print-line"></span></div>
      <div>客户签字： <span class="erp-purchase-print-line"></span></div>
      <div>公司电话： <span>${escapeHtml(pick(data, ['company_phone', 'companyPhone']))}</span></div>
      <div>公司传真： <span>${escapeHtml(pick(data, ['company_fax', 'companyFax', 'fax']))}</span></div>
      <div>公司地址： <span>${escapeHtml(pick(data, ['company_address', 'companyAddress']))}</span></div>
      <div class="erp-purchase-print-remark">单据备注： <span>${escapeHtml(data?.remark ?? '')}</span></div>
    </div>`;
}

function saleReturnWideMeta(data: any) {
  return `
    <div class="erp-purchase-print-meta">
      <div>客户： <span>${escapeHtml(pick(data, ['_customer_name', 'customer_name', 'customerName']))}</span></div>
      <div>销售人员： <span>${escapeHtml(pick(data, ['_sale_user_name', 'sale_user_name', 'saleUserName']))}</span></div>
      <div>单据日期： <span>${escapeHtml(formatDate(data?.return_time))}</span></div>
      <div>单据编号： <span>${escapeHtml(pick(data, ['no', 'code']))}</span></div>
      <div>币别： <span>${escapeHtml(pick(data, ['currency', 'currency_code', 'currencyCode'])) || 'RMB'}</span></div>
      <div>客户收货人： <span>${escapeHtml(pick(data, ['contact_name', 'contactName', 'receiver', 'receiver_name', 'receiverName']))}</span></div>
      <div>客户收货电话： <span>${escapeHtml(pick(data, ['contact_phone', 'contactPhone', 'telephone', 'mobile', 'receiver_phone', 'receiverPhone']))}</span></div>
      <div>客户收货地址： <span>${escapeHtml(pick(data, ['address', 'receiver_address', 'receiverAddress', 'shipping_address', 'shippingAddress']))}</span></div>
      <div></div>
    </div>`;
}

function buildSaleReturnDetailRows(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((row: any, index: number) => {
      const discountPercent = pick(row, ['discount_percent', 'discountPercent']);
      const discount = rowDiscountPrice(row);
      return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${escapeHtml(productField(row, productList, ['product_code', 'productCode', 'product_bar_code', 'productBarCode', 'barcode']))}</td>
        <td>${escapeHtml(productName(row, productList))}</td>
        <td>${escapeHtml(productField(row, productList, ['model', 'spec', 'specification', 'specification_model']))}</td>
        <td>${escapeHtml(productCategoryName(row, productList, categoryList))}</td>
        <td>${escapeHtml(productField(row, productList, ['brand', 'brand_name', 'brandName']))}</td>
        <td>${escapeHtml(productField(row, productList, ['origin', 'place_of_origin', 'producing_area', 'manufacturer']))}</td>
        <td>${escapeHtml(unitName(row))}</td>
        <td>${escapeHtml(warehouseName(row, warehouseList))}</td>
        <td class="text-right">${toCount(row?.count)}</td>
        <td class="text-right">${toMoney(unitPrice(row))}</td>
        <td class="text-right">${escapeHtml(discountPercent)}</td>
        <td class="text-right">${toMoney(discount)}</td>
        <td class="text-right">${toMoney(totalPrice(row))}</td>
        <td class="text-right">${toMoney(row?.allocated_discount_price ?? row?.discount_allocate_price ?? row?.discountSharePrice)}</td>
        <td>${escapeHtml(pick(row, ['source_no', 'sourceNo', 'order_no', 'orderNo']))}</td>
        <td>${escapeHtml(pick(row, ['out_no', 'outNo', 'sale_out_no', 'saleOutNo', 'delivery_no', 'deliveryNo']))}</td>
        <td class="text-right">${toMoney(pick(row, ['sale_expense', 'saleExpense', 'expense', 'other_price', 'otherPrice']))}</td>
        <td>${escapeHtml(row?.remark ?? '')}</td>
      </tr>`;
    })
    .join('');
}

function saleReturnWideTable(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const rows = buildSaleReturnDetailRows(data, productList, warehouseList, categoryList);
  return `
    <table class="erp-purchase-print-table">
      <colgroup>
        <col style="width: 4.0%" /><col style="width: 5.2%" /><col style="width: 4.8%" />
        <col style="width: 4.5%" /><col style="width: 4.5%" /><col style="width: 4.3%" />
        <col style="width: 4.3%" /><col style="width: 4.3%" /><col style="width: 4.5%" />
        <col style="width: 4.5%" /><col style="width: 4.5%" /><col style="width: 4.5%" />
        <col style="width: 4.5%" /><col style="width: 4.8%" /><col style="width: 5.0%" />
        <col style="width: 5.2%" /><col style="width: 5.2%" /><col style="width: 5.0%" />
        <col style="width: 9.4%" />
      </colgroup>
      <thead>
        <tr>
          <th>序号</th><th>商品编码</th><th>商品名称</th><th>规格型号</th>
          <th>商品类别</th><th>品牌</th><th>产地</th><th>单位</th><th>仓库</th>
          <th>数量</th><th>单价</th><th>折扣率(%)</th><th>折扣额</th><th>金额</th>
          <th>优惠金额分配额</th><th>关联销售订单号</th><th>关联销售出库单号</th><th>销售费用</th><th>商品备注</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="19" class="text-center muted">暂无明细</td></tr>'}
        <tr class="erp-purchase-print-total-row">
          <td>合计</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td class="text-right">${toCount(totalCount(data))}</td>
          <td></td><td></td><td></td><td class="text-right">${toMoney(data?.total_product_price)}</td>
          <td></td><td></td><td></td><td></td><td></td>
        </tr>
        <tr>
          <td colspan="19" class="erp-purchase-print-upper">合计金额大写：${escapeHtml(toRmbUpper(data?.total_price))}</td>
        </tr>
      </tbody>
    </table>`;
}

function saleReturnSummary(data: any) {
  return `
    <div class="erp-purchase-print-summary">
      <div>优惠率（%）： ${toMoneyText(data?.discount_percent)}</div>
      <div>优惠金额： ${toMoneyText(data?.discount_price)}</div>
      <div>优惠后金额： ${toMoneyText(data?.total_price)}</div>
    </div>
    <div class="erp-purchase-print-summary">
      <div>客户承担费： ${toMoneyText(pick(data, ['customer_expense', 'customerExpense', 'other_price', 'otherPrice']))}</div>
      <div>本次退款： ${toMoneyText(data?.refund_price)}</div>
      <div>付款账户：</div>
    </div>
    <div class="erp-purchase-print-summary">
      <div>销售费用： ${toMoneyText(pick(data, ['other_price', 'otherPrice', 'sale_expense', 'saleExpense']))}</div>
      <div>本次欠款： ${toMoneyText(pick(data, ['debt_price', 'debt', 'debtPrice', 'balance', 'balance_price', 'balancePrice']))}</div>
      <div></div>
    </div>`;
}

function saleReturnFooter(data: any) {
  return `
    <div class="erp-purchase-print-footer">
      <div>制单人： <span>${escapeHtml(makerName(data))}</span></div>
      <div>收货人： <span>${escapeHtml(pick(data, ['receiver', 'receiver_name', 'receiverName', 'consignee']))}</span></div>
      <div>收货电话： <span>${escapeHtml(pick(data, ['receiver_phone', 'receiverPhone', 'consignee_phone', 'consigneePhone']))}</span></div>
      <div>收货地址： <span>${escapeHtml(pick(data, ['receiver_address', 'receiverAddress', 'shipping_address', 'shippingAddress', 'address']))}</span></div>
      <div>发货人签字： <span class="erp-purchase-print-line"></span></div>
      <div>客户签字： <span class="erp-purchase-print-line"></span></div>
      <div>公司电话： <span>${escapeHtml(pick(data, ['company_phone', 'companyPhone']))}</span></div>
      <div>公司传真： <span>${escapeHtml(pick(data, ['company_fax', 'companyFax', 'fax']))}</span></div>
      <div>公司地址： <span>${escapeHtml(pick(data, ['company_address', 'companyAddress']))}</span></div>
      <div class="erp-purchase-print-remark">单据备注： <span>${escapeHtml(data?.remark ?? '')}</span></div>
    </div>`;
}

function stockMoveWideMeta(data: any, warehouseList: any[] = []) {
  const fromName = pick(data, ['_from_warehouse_name', 'from_warehouse_name', 'fromWarehouseName']) || warehouseName({ warehouse_id: data?.from_warehouse_id }, warehouseList);
  const toName = pick(data, ['_to_warehouse_name', 'to_warehouse_name', 'toWarehouseName']) || warehouseName({ warehouse_id: data?.to_warehouse_id }, warehouseList);
  return `
    <div class="erp-purchase-print-meta">
      <div>单据日期： <span>${escapeHtml(formatDate(data?.move_time))}</span></div>
      <div>单据编码： <span>${escapeHtml(pick(data, ['no', 'code']))}</span></div>
      <div>调出仓库： <span>${escapeHtml(fromName)}</span></div>
      <div>调入仓库： <span>${escapeHtml(toName)}</span></div>
      <div></div>
      <div></div>
    </div>`;
}

function buildStockMoveDetailRows(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((row: any, index: number) => {
      const unitCost = pick(row, ['product_price', 'productPrice', 'unit_cost', 'unitCost', 'price']);
      const totalCost = pick(row, ['total_price', 'totalPrice', 'total_cost', 'totalCost']);
      return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${escapeHtml(productField(row, productList, ['product_code', 'productCode', 'product_bar_code', 'productBarCode', 'barcode']))}</td>
        <td>${escapeHtml(productName(row, productList))}</td>
        <td>${escapeHtml(productField(row, productList, ['model', 'spec', 'specification', 'specification_model']))}</td>
        <td>${escapeHtml(productCategoryName(row, productList, categoryList))}</td>
        <td>${escapeHtml(productField(row, productList, ['brand', 'brand_name', 'brandName']))}</td>
        <td>${escapeHtml(productField(row, productList, ['origin', 'place_of_origin', 'producing_area', 'manufacturer']))}</td>
        <td>${escapeHtml(unitName(row))}</td>
        <td class="text-right">${toCount(row?.count)}</td>
        <td class="text-right">${toMoney(unitCost)}</td>
        <td class="text-right">${toMoney(totalCost)}</td>
        <td>${escapeHtml(row?.remark ?? '')}</td>
      </tr>`;
    })
    .join('');
}

function stockMoveWideTable(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const rows = buildStockMoveDetailRows(data, productList, warehouseList, categoryList);
  return `
    <table class="erp-purchase-print-table">
      <colgroup>
        <col style="width: 4.5%" /><col style="width: 7%" /><col style="width: 7%" />
        <col style="width: 6.5%" /><col style="width: 6.5%" /><col style="width: 6.5%" />
        <col style="width: 6.5%" /><col style="width: 6%" /><col style="width: 6.5%" />
        <col style="width: 8%" /><col style="width: 8%" /><col style="width: 26%" />
      </colgroup>
      <thead>
        <tr>
          <th>序号</th><th>商品编码</th><th>商品名称</th><th>规格型号</th>
          <th>商品类别</th><th>品牌</th><th>产地</th><th>单位</th>
          <th>数量</th><th>调拨单位成本</th><th>调拨成本</th><th>商品备注</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="12" class="text-center muted">暂无明细</td></tr>'}
        <tr class="erp-purchase-print-total-row">
          <td>合计</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td class="text-right">${toCount(totalCount(data))}</td>
          <td></td><td></td><td></td>
        </tr>
        <tr>
          <td colspan="12" class="erp-purchase-print-upper">合计金额大写：${escapeHtml(toRmbUpper(data?.total_price))}</td>
        </tr>
      </tbody>
    </table>`;
}

function stockMoveFooter(data: any) {
  return `
    <div class="erp-purchase-print-footer">
      <div>制单人： <span>${escapeHtml(makerName(data))}</span></div>
      <div>发货人签字： <span class="erp-purchase-print-line"></span></div>
      <div>收货人签字： <span class="erp-purchase-print-line"></span></div>
      <div>公司电话： <span>${escapeHtml(pick(data, ['company_phone', 'companyPhone']))}</span></div>
      <div>公司传真： <span>${escapeHtml(pick(data, ['company_fax', 'companyFax', 'fax']))}</span></div>
      <div>公司地址： <span>${escapeHtml(pick(data, ['company_address', 'companyAddress']))}</span></div>
      <div class="erp-purchase-print-remark">单据备注： <span>${escapeHtml(data?.remark ?? '')}</span></div>
    </div>`;
}

function purchaseInWideMeta(data: any) {
  return `
    <div class="erp-purchase-print-meta">
      <div>供应商： <span>${escapeHtml(pick(data, ['_supplier_name', 'supplier_name', 'supplierName'])) || '-'}</span></div>
      <div>采购员： <span>${escapeHtml(pick(data, ['_purchase_user_name', 'purchase_user_name', 'purchaseUserName', 'createuser'])) || '-'}</span></div>
      <div>单据日期： <span>${escapeHtml(formatDate(data?.in_time))}</span></div>
      <div>单据编号： <span>${escapeHtml(pick(data, ['no', 'code'])) || '-'}</span></div>
      <div>币别： <span>${escapeHtml(pick(data, ['currency', 'currency_code', 'currencyCode'])) || 'RMB'}</span></div>
      <div></div>
    </div>`;
}

function buildPurchaseInDetailRows(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((row: any, index: number) => {
      const discountPercent = pick(row, ['discount_percent', 'discountPercent']);
      const discount = rowDiscountPrice(row);
      return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${escapeHtml(productField(row, productList, ['product_code', 'productCode', 'product_bar_code', 'productBarCode', 'barcode']))}</td>
        <td>${escapeHtml(productName(row, productList))}</td>
        <td>${escapeHtml(productField(row, productList, ['model', 'spec', 'specification', 'specification_model']))}</td>
        <td>${escapeHtml(productCategoryName(row, productList, categoryList))}</td>
        <td>${escapeHtml(productField(row, productList, ['brand', 'brand_name', 'brandName']))}</td>
        <td>${escapeHtml(productField(row, productList, ['origin', 'place_of_origin', 'producing_area', 'manufacturer']))}</td>
        <td>${escapeHtml(unitName(row))}</td>
        <td>${escapeHtml(warehouseName(row, warehouseList))}</td>
        <td class="text-right">${toCount(row?.count)}</td>
        <td class="text-right">${toMoney(unitPrice(row))}</td>
        <td class="text-right">${escapeHtml(discountPercent)}</td>
        <td class="text-right">${toMoney(discount)}</td>
        <td class="text-right">${toMoney(totalPrice(row))}</td>
        <td class="text-right">${toMoney(row?.allocated_discount_price ?? row?.discount_allocate_price ?? row?.discountSharePrice)}</td>
        <td class="text-right">${toMoney(pick(row, ['purchase_expense', 'purchaseExpense', 'expense', 'other_price', 'otherPrice']))}</td>
        <td>${escapeHtml(pick(row, ['source_no', 'sourceNo', 'order_no', 'orderNo']))}</td>
        <td>${escapeHtml(row?.remark ?? '')}</td>
      </tr>`;
    })
    .join('');
}

function purchaseInWideTable(
  data: any,
  productList: any[] = [],
  warehouseList: any[] = [],
  categoryList: any[] = [],
) {
  const rows = buildPurchaseInDetailRows(data, productList, warehouseList, categoryList);
  return `
    <table class="erp-purchase-print-table">
      <colgroup>
        <col style="width: 4.5%" /><col style="width: 5.5%" /><col style="width: 5%" />
        <col style="width: 5%" /><col style="width: 5%" /><col style="width: 4.8%" />
        <col style="width: 4.8%" /><col style="width: 5%" /><col style="width: 5%" />
        <col style="width: 5%" /><col style="width: 5%" /><col style="width: 5%" />
        <col style="width: 5%" /><col style="width: 5%" /><col style="width: 5%" />
        <col style="width: 5.5%" /><col style="width: 5.5%" /><col style="width: 9.6%" />
      </colgroup>
      <thead>
        <tr>
          <th>序号</th><th>商品编码</th><th>商品名称</th><th>规格型号</th>
          <th>商品类别</th><th>品牌</th><th>产地</th><th>单位</th><th>仓库</th>
          <th>数量</th><th>单价</th><th>折扣率(%)</th><th>折扣额</th><th>金额</th>
          <th>优惠金额分配额</th><th>采购费用</th><th>关联采购单号</th><th>商品备注</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="18" class="text-center muted">暂无明细</td></tr>'}
        <tr class="erp-purchase-print-total-row">
          <td>合计</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          <td class="text-right">${toCount(totalCount(data))}</td>
          <td></td><td></td><td></td><td class="text-right">${toMoney(data?.total_product_price)}</td>
          <td></td><td></td><td></td><td></td>
        </tr>
        <tr>
          <td colspan="18" class="erp-purchase-print-upper">合计金额大写：${escapeHtml(toRmbUpper(data?.total_price))}</td>
        </tr>
      </tbody>
    </table>`;
}

function purchaseInSummary(data: any) {
  return `
    <div class="erp-purchase-print-summary">
      <div>本次付款： ${toMoneyText(data?.payment_price)}</div>
      <div>付款账户： ${escapeHtml(pick(data, ['payment_account', 'account_name', 'accountName', 'account_id']))}</div>
      <div>优惠率（%）： ${toMoneyText(data?.discount_percent)}</div>
    </div>
    <div class="erp-purchase-print-summary">
      <div>优惠金额： ${toMoneyText(data?.discount_price)}</div>
      <div>优惠后金额： ${toMoneyText(data?.total_price)}</div>
      <div>采购费用： ${toMoneyText(pick(data, ['other_price', 'otherPrice', 'purchase_expense', 'purchaseExpense']))}</div>
    </div>
    <div class="erp-purchase-print-summary">
      <div>本次欠款： ${toMoneyText(pick(data, ['debt_price', 'debt', 'debtPrice', 'balance', 'balance_price', 'balancePrice']))}</div>
      <div></div>
      <div></div>
    </div>`;
}

function purchaseInFooter(data: any) {
  return `
    <div class="erp-purchase-print-footer">
      <div>制单人： <span>${escapeHtml(makerName(data))}</span></div>
      <div>供应商签字： <span class="erp-purchase-print-line"></span></div>
      <div>收货人签字： <span class="erp-purchase-print-line"></span></div>
      <div>公司电话： <span>${escapeHtml(pick(data, ['company_phone', 'companyPhone']))}</span></div>
      <div>公司传真： <span>${escapeHtml(pick(data, ['company_fax', 'companyFax', 'fax']))}</span></div>
      <div>公司地址： <span>${escapeHtml(pick(data, ['company_address', 'companyAddress']))}</span></div>
      <div class="erp-purchase-print-remark">单据备注： <span>${escapeHtml(data?.remark ?? '')}</span></div>
    </div>`;
}

function purchaseOrderPrintStyle() {
  return `
      @page { size: A4 landscape; margin: 8mm 10mm; }
      html, body { font-size: 12px; color: #222; }
      .erp-print-root { width: 100%; }
      .erp-purchase-print-sheet {
        width: 92%;
        margin: 0 auto;
        break-after: auto;
        page-break-after: auto;
        page-break-inside: avoid;
      }
      .erp-purchase-print-company {
        text-align: center;
        font-size: 24px;
        font-weight: 700;
        line-height: 1.15;
        margin-top: 2mm;
      }
      .erp-purchase-print-title {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.15;
        margin-top: 4mm;
        margin-bottom: 7mm;
      }
      .erp-purchase-print-meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9mm 24mm;
        margin-bottom: 10mm;
      }
      .erp-purchase-print-meta div {
        min-height: 16px;
        white-space: nowrap;
      }
      .erp-purchase-print-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 11px;
      }
      .erp-purchase-print-table th,
      .erp-purchase-print-table td {
        border: 1px solid #222;
        padding: 3px 2px;
        vertical-align: middle;
        word-break: break-all;
        overflow-wrap: anywhere;
      }
      .erp-purchase-print-table th {
        font-weight: 400;
        text-align: left;
        line-height: 1.2;
      }
      .erp-purchase-print-table td { height: 28px; }
      .erp-purchase-print-total-row td { height: 28px; }
      .erp-purchase-print-upper { height: 34px; padding-left: 6px !important; }
      .erp-purchase-print-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 24mm;
        margin: 8px 0 7mm;
      }
      .erp-purchase-print-footer {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7mm 24mm;
      }
      .erp-purchase-print-footer div {
        min-height: 16px;
        white-space: nowrap;
      }
      .erp-purchase-print-footer .erp-purchase-print-remark { grid-column: 1 / -1; }
      .erp-purchase-print-line { display: inline-block; width: 88px; border-bottom: 1px solid #222; vertical-align: -2px; }
      @media print {
        .erp-purchase-print-sheet { overflow: hidden; }
      }
  `;
}

export function buildErpOrderPrintHtml(options: ErpOrderPrintOptions) {
  const { type, data, companyName, previewOnly } = options;
  const title = TITLE_MAP[type];
  if (type === 'purchase-order' || type === 'sale-order' || type === 'sale-out' || type === 'sale-return' || type === 'stock-move' || type === 'purchase-in') {
    if (type === 'sale-out') {
      const body = `
        <section class="erp-purchase-print-sheet">
          ${companyName ? `<div class="erp-purchase-print-company">${escapeHtml(companyName)}</div>` : ''}
          <div class="erp-purchase-print-title">${escapeHtml(title)}</div>
          ${saleOutWideMeta(data)}
          ${saleOutWideTable(data, options.productList, options.warehouseList, options.categoryList)}
          ${saleOutSummary(data)}
          ${saleOutFooter(data)}
        </section>`;
      return buildErpPrintDocument(title, body, purchaseOrderPrintStyle());
    }
    if (type === 'sale-return') {
      const body = `
        <section class="erp-purchase-print-sheet">
          ${companyName ? `<div class="erp-purchase-print-company">${escapeHtml(companyName)}</div>` : ''}
          <div class="erp-purchase-print-title">${escapeHtml(title)}</div>
          ${saleReturnWideMeta(data)}
          ${saleReturnWideTable(data, options.productList, options.warehouseList, options.categoryList)}
          ${saleReturnSummary(data)}
          ${saleReturnFooter(data)}
        </section>`;
      return buildErpPrintDocument(title, body, purchaseOrderPrintStyle());
    }
    if (type === 'stock-move') {
      const body = `
        <section class="erp-purchase-print-sheet">
          ${companyName ? `<div class="erp-purchase-print-company">${escapeHtml(companyName)}</div>` : ''}
          <div class="erp-purchase-print-title">${escapeHtml(title)}</div>
          ${stockMoveWideMeta(data, options.warehouseList)}
          ${stockMoveWideTable(data, options.productList, options.warehouseList, options.categoryList)}
          ${stockMoveFooter(data)}
        </section>`;
      return buildErpPrintDocument(title, body, purchaseOrderPrintStyle());
    }
    if (type === 'purchase-in') {
      const body = `
        <section class="erp-purchase-print-sheet">
          ${companyName ? `<div class="erp-purchase-print-company">${escapeHtml(companyName)}</div>` : ''}
          <div class="erp-purchase-print-title">${escapeHtml(title)}</div>
          ${purchaseInWideMeta(data)}
          ${purchaseInWideTable(data, options.productList, options.warehouseList, options.categoryList)}
          ${purchaseInSummary(data)}
          ${purchaseInFooter(data)}
        </section>`;
      return buildErpPrintDocument(title, body, purchaseOrderPrintStyle());
    }
    const body = `
      <section class="erp-purchase-print-sheet">
        ${companyName ? `<div class="erp-purchase-print-company">${escapeHtml(companyName)}</div>` : ''}
        <div class="erp-purchase-print-title">${escapeHtml(title)}</div>
        ${wideOrderMeta(type, data)}
        ${purchaseOrderWideTable(type, data, options.productList, options.warehouseList, options.categoryList)}
        ${wideOrderFooter(type, data)}
      </section>`;
    return buildErpPrintDocument(title, body, purchaseOrderPrintStyle());
  }
  const table = stockTable(type, data, options.productList);
  const signItems = sign(type)
    .map((item) => `<span>${escapeHtml(item)}：</span>`)
    .join('');
  const previewMark = previewOnly
    ? '<div class="muted text-center" style="margin-bottom:4px;">打印预览：审核通过后才能正式打印</div>'
    : '';
  const body = `
    <section class="erp-print-sheet">
      ${companyName ? `<div class="erp-print-company">${escapeHtml(companyName)}</div>` : ''}
      <div class="erp-print-title">${escapeHtml(title)}</div>
      ${previewMark}
      ${meta(type, data)}
      ${table}
      <div class="erp-print-remark">备注：${escapeHtml(data?.remark ?? '')}</div>
      <div class="erp-print-sign">${signItems}</div>
    </section>`;
  return buildErpPrintDocument(title, body);
}
