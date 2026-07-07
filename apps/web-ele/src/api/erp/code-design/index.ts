import { cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const CODE_DESIGN_FORM_KEY = '89FC33B9CD365F7E77EF3FC813D39B9A';
const CODE_NODE_FORM_KEY = '89FC33B9CD365F7E77EF3FC813D39B9A';
const DB_NAME = 'QYVirtualPlat';
const ENT_CODE = 'NewApp';
const DEFAULT_USER = 'U00029';

export interface ErpCodeConfig {
  busTableRowid: string;
  busTableName: string;
  name: string;
  prefix: string;
  keyField: string;
  businessCode: string;
  appId: string;
  appName: string;
  structureTypeId?: string | null;
  dateFormat: string;
  separator: string;
  sequenceFormat: string;
  note?: string;
}

export interface ApiResult {
  success: boolean;
  message: string;
  data?: any;
}

interface CodeDesignRow {
  rowid: string;
  Name: string;
  BusTableName: string;
  BusTableRowid: string;
  KeyFields: string;
  CreateDate: string;
  Creator: string | null;
  LastModDate: string;
  wfid: string | null;
  flowstate: number;
  SaveCodeField: string | null;
  BusinessCode: string;
  CodeExample: string;
  CodeDescription: string;
  StructureTypeID: string;
  AppID: string;
  ECnames: string | null;
  GetPath: string | null;
  AppName: string;
  createuser: string;
  createtime: string;
  updateuser: string;
  updatetime: string;
  ReportID: string | null;
  description: string;
  lingma_sys_is_delete: number;
  lingma_sys_ent: string;
}

interface CodeNodeRow {
  rowid: string;
  createuser: string;
  createtime: string;
  updateuser: string;
  updatetime: string;
  wfid: string | null;
  flowstate: number;
  ReportID: string | null;
  description: string;
  CodeNodeDesignJson: string;
  CodeDesignID: string;
  NodeNo: number;
  NodeType: number;
  Parameter: string | null;
  ParameterName: string;
  BusFiledName: string | null;
  lingma_sys_is_delete: number;
  lingma_sys_ent: string;
}

function getNowString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function getNewGuid() {
  let guid = '';
  for (let i = 0; i < 32; i++) {
    guid += Math.floor(Math.random() * 16).toString(16);
  }
  return guid.toUpperCase();
}

function buildCodeExample(config: ErpCodeConfig) {
  const datePart = config.dateFormat === 'yyyyMMdd' ? '20260327' : config.dateFormat === 'yyyyMM' ? '202603' : '2026';
  const prefix = config.prefix || '';
  const separator = config.separator || '';
  const seq = config.sequenceFormat?.startsWith('0') ? config.sequenceFormat : '001';
  return `${prefix}${datePart}${separator}${seq}`;
}

function isSaveSuccess(result: any) {
  const httpOk = result?.status === 200;
  const raw = result?.data?.raw ?? result?.data ?? {};
  const message = raw?.Message ?? result?.data?.message ?? raw?.message ?? '';
  const type = raw?.Type ?? raw?.type ?? raw?.status ?? raw?.Status;
  const code = result?.data?.code ?? raw?.Code ?? raw?.code ?? null;
  const success =
    code === 200 ||
    type === 'success' ||
    type === 'Success' ||
    raw?.Success === true ||
    httpOk;

  return {
    success,
    message: message || (success ? '保存成功' : '保存失败'),
    raw,
  };
}

export function createDefaultErpCodeConfigs(): ErpCodeConfig[] {
  return [
    {
      busTableRowid: 'AD41ACEA2302A751BBD396BF76D8D04C',
      busTableName: 'Bil_Customer_Info',
      name: '客户供应商编码',
      prefix: 'BS-',
      keyField: 'rowid',
      businessCode: 'customer_code',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: '82353291DF1242578145BC11733B772A',
      dateFormat: 'yyyy',
      separator: '-',
      sequenceFormat: '001-999',
      note: '点击执行后会新增 Base_CodeDesign 与 4 个 Base_CodeNodeDesign 节点。',
    },
    {
      busTableRowid: 'E0E1AE38D04A47B086687DB58615DF26',
      busTableName: 'erp_return_check',
      name: '退货检测单编号',
      prefix: 'JC-',
      keyField: 'id',
      businessCode: 'no',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 erp_return_check.no，默认前缀 JC-。',
    },
    {
      busTableRowid: '0E6BC021D5BD4FA69F741BCBBDECD463',
      busTableName: 'erp_purchase_return_out',
      name: '采购退货出库编号',
      prefix: 'CTH-',
      keyField: 'id',
      businessCode: 'no',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 erp_purchase_return_out.no，默认前缀 CTH-。',
    },
    {
      busTableRowid: 'CEED0B10368E4FF0A5F4E3B0971D5A5A',
      busTableName: 'erp_sale_return_in',
      name: '销售退货入库编号',
      prefix: 'STH-',
      keyField: 'id',
      businessCode: 'no',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 erp_sale_return_in.no，默认前缀 STH-。',
    },
    {
      busTableRowid: '703D472F95144B2EA09ABFDA398ED5DA',
      busTableName: 'erp_stock_move',
      name: '库存调拨单编号',
      prefix: 'SM-',
      keyField: 'id',
      businessCode: 'no',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 erp_stock_move.no，默认前缀 SM-。',
    },
    {
      busTableRowid: '51E7F817A8834E218F6213F261C701C4',
      busTableName: 'erp_stock_check',
      name: '库存盘点单编号',
      prefix: 'SC-',
      keyField: 'rowid',
      businessCode: 'no',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 erp_stock_check.no；表主键为 rowid，默认前缀 SC-。',
    },
    {
      busTableRowid: '1DD2D2EE4C35458192144498063C0B4F',
      busTableName: 'Bil_Business_Contact_Rel',
      name: '商机联系人关系编码',
      prefix: 'BCR-',
      keyField: 'rowid',
      businessCode: 'business_code',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '当前表缺少独立编号字段，默认先写入 business_code 快照，建议执行前确认或先补 relation_code 类字段。',
    },
    {
      busTableRowid: '3A5118D3C85D444B8DE39835687AD9D8',
      busTableName: 'Bil_Customer_Pool_Log',
      name: '客户公海流转日志编码',
      prefix: 'CPL-',
      keyField: 'rowid',
      businessCode: 'customer_code',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '当前表缺少独立编号字段，默认先写入 customer_code 快照，建议执行前确认或先补 log_code 类字段。',
    },
    {
      busTableRowid: '5B91AA85FBF64538814EAD50C2D0CBB8',
      busTableName: 'Bil_Business_Chance',
      name: '客户商机编码',
      prefix: 'BC-',
      keyField: 'rowid',
      businessCode: 'business_code',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 Bil_Business_Chance.business_code，默认前缀 BC-。',
    },
    {
      busTableRowid: '942B06D24AAB4749903BDD1D4927CB58',
      busTableName: 'Bil_Customer_Lead',
      name: '客户线索编码',
      prefix: 'CL-',
      keyField: 'rowid',
      businessCode: 'lead_code',
      appId: '359875B2804FCDBD0F2DCC567D2A22F1',
      appName: '359875B2804FCDBD0F2DCC567D2A22F1',
      structureTypeId: null,
      dateFormat: 'yyyyMMdd',
      separator: '-',
      sequenceFormat: '00001',
      note: '对应 Bil_Customer_Lead.lead_code，默认前缀 CL-。',
    },
  ];
}

function createCodeDesignTable() {
  return new DataTable(CODE_DESIGN_FORM_KEY, 'Base_CodeDesign', DB_NAME, 'rowid');
}

function createCodeNodeTable() {
  return new DataTable(CODE_NODE_FORM_KEY, 'Base_CodeNodeDesign', DB_NAME, 'rowid');
}

export async function getCodeDesignsByBusTableRowid(busTableRowid: string) {
  const table = createCodeDesignTable();
  table.Filter = cond('BusTableRowid', 'equal', busTableRowid);
  const resQuery = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(resQuery);
  return table.items || [];
}

export async function getCodeNodesByDesignId(codeDesignId: string) {
  const table = createCodeNodeTable();
  table.Filter = cond('CodeDesignID', 'equal', codeDesignId);
  const resQuery = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(resQuery);
  return table.items || [];
}

export async function checkExistingCodeDesigns(configs: ErpCodeConfig[]) {
  const existingMap = new Map<string, any[]>();
  const existingList: string[] = [];

  for (const config of configs) {
    try {
      const items = await getCodeDesignsByBusTableRowid(config.busTableRowid);
      existingMap.set(config.busTableRowid, items);
      if (items.length > 0) {
        existingList.push(config.busTableRowid);
      }
    } catch {
      existingMap.set(config.busTableRowid, []);
    }
  }

  return {
    success: true,
    message: `检查完成: ${existingList.length} 个表已存在编码配置`,
    existingMap,
    existingList,
  };
}

export async function createCodeDesign(config: ErpCodeConfig): Promise<ApiResult> {
  const table = createCodeDesignTable();
  const rowid = getNewGuid();
  const now = getNowString();
  const codeExample = buildCodeExample(config);
  const codeDescription = `固定前缀(${config.prefix}) + 时间(${config.dateFormat}) + 分隔符(${config.separator}) + 流水号(${config.sequenceFormat})`;
  const row: CodeDesignRow = {
    rowid,
    Name: config.name,
    BusTableName: config.busTableName,
    BusTableRowid: config.busTableRowid,
    KeyFields: config.keyField,
    CreateDate: now,
    Creator: null,
    LastModDate: now,
    wfid: null,
    flowstate: 0,
    SaveCodeField: null,
    BusinessCode: config.businessCode,
    CodeExample: codeExample,
    CodeDescription: codeDescription,
    StructureTypeID: config.structureTypeId ?? null,
    AppID: config.appId,
    ECnames: null,
    GetPath: null,
    AppName: config.appName,
    createuser: DEFAULT_USER,
    createtime: now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    ReportID: null,
    description: `[表]${config.busTableName} [业务主键]${config.keyField} [编码字段]${config.businessCode}`,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };

  const beforeRows = await getCodeDesignsByBusTableRowid(config.busTableRowid);
  const saveParam = table.getSaveParam([row], [], []);
  try {
    const result = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });

    const saveState = isSaveSuccess(result);
    if (saveState.success) {
      return { success: true, message: `编码设计“${config.name}”创建成功`, data: row };
    }

    const afterRows = await getCodeDesignsByBusTableRowid(config.busTableRowid);
    const createdRow =
      afterRows.find((item: any) => !beforeRows.some((before: any) => before.rowid === item.rowid)) ||
      afterRows.find(
        (item: any) =>
          item.Name === config.name &&
          item.BusTableName === config.busTableName &&
          item.BusinessCode === config.businessCode,
      );

    if (createdRow) {
      return {
        success: true,
        message: `编码设计“${config.name}”已写入，按成功继续处理节点`,
        data: createdRow,
      };
    }

    return { success: false, message: saveState.message || '创建编码设计失败' };
  } catch (error: any) {
    return { success: false, message: error?.message || String(error) };
  }
}

export async function createCodeNode(node: Partial<CodeNodeRow>) {
  const table = createCodeNodeTable();
  const now = getNowString();
  const row: CodeNodeRow = {
    rowid: getNewGuid(),
    createuser: DEFAULT_USER,
    createtime: now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    wfid: null,
    flowstate: 0,
    ReportID: null,
    description: '',
    CodeNodeDesignJson: node.CodeNodeDesignJson || '',
    CodeDesignID: node.CodeDesignID!,
    NodeNo: node.NodeNo!,
    NodeType: node.NodeType!,
    Parameter: node.Parameter || null,
    ParameterName: node.ParameterName || '',
    BusFiledName: node.BusFiledName || null,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };

  const saveParam = table.getSaveParam([row], [], []);
  try {
    const result = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });
    const saveState = isSaveSuccess(result);
    if (saveState.success) {
      return { success: true, message: '节点创建成功', data: row };
    }
    return { success: false, message: saveState.message || '创建节点失败' };
  } catch (error: any) {
    return { success: false, message: error?.message || String(error) };
  }
}

export async function createStandardCodeNodes(codeDesignId: string, config: ErpCodeConfig) {
  const existingNodes = await getCodeNodesByDesignId(codeDesignId);
  const existingNodeNos = new Set(existingNodes.map((item: any) => Number(item.NodeNo)));

  const nodes: Partial<CodeNodeRow>[] = [
    {
      CodeDesignID: codeDesignId,
      NodeNo: 1,
      NodeType: 2,
      Parameter: config.prefix,
      ParameterName: config.prefix,
      BusFiledName: null,
      CodeNodeDesignJson: JSON.stringify({ ConstString: config.prefix }),
    },
    {
      CodeDesignID: codeDesignId,
      NodeNo: 2,
      NodeType: 3,
      Parameter: config.dateFormat,
      ParameterName: config.dateFormat,
      BusFiledName: 'createtime',
      CodeNodeDesignJson: JSON.stringify({ DateFormat: config.dateFormat, RefBusTableField: '' }),
    },
    {
      CodeDesignID: codeDesignId,
      NodeNo: 3,
      NodeType: 2,
      Parameter: config.separator,
      ParameterName: config.separator,
      BusFiledName: null,
      CodeNodeDesignJson: JSON.stringify({ ConstString: config.separator }),
    },
    {
      CodeDesignID: codeDesignId,
      NodeNo: 4,
      NodeType: 4,
      Parameter: null,
      ParameterName: '数字序号(开始段:1,结束段:3)',
      BusFiledName: null,
      CodeNodeDesignJson: JSON.stringify({ Format: config.sequenceFormat, StartNo: '1', EndNo: '3', Incre: '1' }),
    },
  ].filter((item) => !existingNodeNos.has(Number(item.NodeNo)));

  if (nodes.length === 0) {
    return { success: true, message: '编码节点已存在，无需重复创建', data: existingNodes };
  }

  const results: ApiResult[] = [];
  for (const node of nodes) {
    const result = await createCodeNode(node);
    results.push(result);
    if (!result.success) {
      return { success: false, message: `节点 ${node.NodeNo} 创建失败: ${result.message}`, data: results };
    }
  }
  return { success: true, message: '编码节点创建成功', data: results };
}

export async function createFullCodeDesign(config: ErpCodeConfig) {
  const existingRows = await getCodeDesignsByBusTableRowid(config.busTableRowid);
  let designResult: ApiResult;

  if (existingRows.length > 0) {
    const matchedRow =
      existingRows.find(
        (item: any) =>
          item.Name === config.name &&
          item.BusTableName === config.busTableName &&
          item.BusinessCode === config.businessCode,
      ) || existingRows[0];
    designResult = {
      success: true,
      message: `已存在编码设计，继续补充节点`,
      data: matchedRow,
    };
  } else {
    designResult = await createCodeDesign(config);
  }

  if (!designResult.success) return designResult;

  const nodesResult = await createStandardCodeNodes(designResult.data.rowid, config);
  if (!nodesResult.success) {
    return {
      success: false,
      message: `主记录已创建，但节点创建失败: ${nodesResult.message}`,
      data: { design: designResult.data, nodes: nodesResult.data },
    };
  }

  return {
    success: true,
    message: `编码设计“${config.name}”完整处理成功（主记录 + 节点）`,
    data: { design: designResult.data, nodes: nodesResult.data },
  };
}
