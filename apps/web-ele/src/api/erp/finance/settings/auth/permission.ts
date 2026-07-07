import QB, { and, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export interface FunctionInfo {
  id: string;
  pageId?: string;
  name: string;
  code: string;
  parentId: null | string;
  icon?: string;
  sort?: number;
  children?: FunctionInfo[];
}

export interface OperationInfo {
  id: string;
  name: string;
  code: string;
  functionId: string;
}

export interface FunctionWithOperations extends FunctionInfo {
  operations: OperationInfo[];
  children?: FunctionWithOperations[];
}

export interface FunctionTreeResult {
  tree: FunctionWithOperations[];
  boundOperationIds: string[];
}

export interface SaveRolePermissionRole {
  QID: string;
  QName: string;
  roleClassId: number;
  roleClassName: string;
  masterName?: string;
}

export interface ApiResult {
  success: boolean;
  message: string;
  data?: any;
}

const FORM_KEY = 'DCD7A3915DFA5184B8407F72C58F9CC8';
const SYS_ID = '359875B2804FCDBD0F2DCC567D2A22F1';

function convertToTree(flatData: any[]): FunctionTreeResult {
  const nodeMap = new Map<string, FunctionWithOperations>();
  const boundOperationIds: string[] = [];

  flatData.forEach((item) => {
    const operations: OperationInfo[] = [];
    if (item._Base_FunctionNode && Array.isArray(item._Base_FunctionNode)) {
      item._Base_FunctionNode.forEach((op: any) => {
        operations.push({
          id: String(op.rowid || ''),
          name: op.Nodetext || op.NodeText || '',
          code: op.NodeCode || String(op.rowid || ''),
          functionId: String(item.rowid || ''),
        });
      });
    }

    if (item.FunctionNodeAuth && Array.isArray(item.FunctionNodeAuth)) {
      item.FunctionNodeAuth.forEach((auth: any) => {
        if (auth.functionoption) {
          const opIds = String(auth.functionoption)
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean);
          boundOperationIds.push(...opIds);
        }
      });
    }

    const node: FunctionWithOperations = {
      id: String(item.rowid || ''),
      pageId: String(item.rowid || ''),
      name: item.FunName || item.NavName || '',
      code: item.FunCode || String(item.rowid || ''),
      parentId: item.prowid ? String(item.prowid) : null,
      icon: item.icon || item.Icon || '',
      sort: Number(item.sort || item.Sort || 0),
      operations,
      children: [],
    };

    nodeMap.set(String(item.rowid || ''), node);
  });

  const roots: FunctionWithOperations[] = [];
  flatData.forEach((item) => {
    const node = nodeMap.get(String(item.rowid || ''));
    if (!node) return;

    const parentId = item.prowid ? String(item.prowid) : '';
    if (parentId && nodeMap.has(parentId)) {
      const parent = nodeMap.get(parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (nodes: FunctionWithOperations[]) => {
    nodes.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    nodes.forEach((node) => {
      if (node.children?.length) sortChildren(node.children);
    });
  };
  sortChildren(roots);

  return {
    tree: roots,
    boundOperationIds: [...new Set(boundOperationIds)],
  };
}

function isSaveSuccess(saveData: any) {
  if (!saveData) return false;
  if (saveData.Type === 'success') return true;
  if (saveData.Code === 200) return true;
  if (saveData.code === 200) return true;
  if (saveData.success === true) return true;
  if (saveData.Message === '操作成功' || saveData.message === '操作成功') return true;
  return false;
}

export async function getFunctionTreeByRole(roleId?: string): Promise<FunctionTreeResult> {
  try {
    const table: any = new DataTable(FORM_KEY, 'Base_NavigationInfo', 'QYVirtualPlat', 'rowid');
    table.OutputType = 'Navigation';
    table.Filter = cond('SysId', 'equal', SYS_ID);

    const funTable: any = new DataTable(FORM_KEY, '_Base_FunctionNode', 'QYVirtualPlat', 'rowid');
    funTable.JoinFilter = cond('prowid', 'equal', {
      Field: 'Base_NavigationInfo.rowid',
      Type: 'GetTableField',
    });
    funTable.Fields = [
      { Name: 'updatetime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 },
    ];

    const operateTable: any = new DataTable(FORM_KEY, 'FunctionNodeAuth', 'QYVirtualPlat', 'rowid');
    operateTable.JoinFilter = cond('pageID', 'equal', {
      Field: 'Base_NavigationInfo.rowid',
      Type: 'GetTableField',
    });
    if (roleId) {
      operateTable.Filter = cond('QID', 'equal', roleId);
    }

    table.ChildTables = [funTable, operateTable];

    const result = await requestClient.post(
      table.queryUrl,
      { Table: [table] },
      { headers: table.getRequestHeader(), responseReturn: 'raw' },
    );

    const flatData = result?.data?.Result?.data || [];
    return convertToTree(Array.isArray(flatData) ? flatData : []);
  } catch (error) {
    console.error('获取功能模块树失败:', error);
    return { tree: [], boundOperationIds: [] };
  }
}

export async function saveRolePermissions(
  role: SaveRolePermissionRole,
  operationIds: string[],
  functionTree?: FunctionWithOperations[],
): Promise<ApiResult> {
  const table: any = new DataTable(FORM_KEY, 'FunctionNodeAuth', 'QYVirtualPlat', 'rowid');

  try {
    const tree = functionTree?.length ? functionTree : (await getFunctionTreeByRole(role.QID)).tree;

    const desiredByPage = new Map<string, string>();
    const collect = (nodes: FunctionWithOperations[]) => {
      nodes.forEach((node) => {
        const pageId = node.pageId || node.id;
        const ops = Array.isArray(node.operations) ? node.operations : [];
        if (ops.length > 0) {
          const selectedOps = ops.map((op) => op.id).filter((id) => operationIds.includes(id));
          desiredByPage.set(pageId, selectedOps.join(','));
        }
        if (node.children?.length) collect(node.children);
      });
    };
    collect(tree);

    const pageIds = [...desiredByPage.keys()];
    const filters: any[] = [cond('QID', 'equal', role.QID)];
    if (pageIds.length > 0) {
      filters.push(cond('pageID', 'in', pageIds));
    }
    table.Filter = filters.length > 1 ? and(...filters) : filters[0];

    const resQuery = await requestClient.post(
      table.queryUrl,
      { Table: [table] },
      { headers: table.getRequestHeader(), responseReturn: 'raw' },
    );
    table.execQueryResult(resQuery);

    const resultData = resQuery?.data?.Result?.data || resQuery?.data?.Result || resQuery?.data;
    const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];

    const existingByPage = new Map<string, any>();
    items.forEach((it: any) => {
      const key = it.pageID || it.pageId || it.PageID || it.PAGEID;
      if (key) existingByPage.set(String(key), it);
    });

    const added: any[] = [];
    const changed: any[] = [];
    const deleted: any[] = [];

    desiredByPage.forEach((functionoption, pageId) => {
      const exist = existingByPage.get(String(pageId));

      if (!functionoption) {
        if (exist?.rowid) deleted.push({ rowid: exist.rowid });
        return;
      }

      if (exist?.rowid) {
        if (String(exist.functionoption || '') !== functionoption) {
          changed.push({
            rowid: exist.rowid,
            QID: role.QID,
            granttype: 1,
            contenttype: 0,
            pageID: pageId,
            functionoption,
            masterName: role.masterName || '',
            QName: role.QName,
            isDefault: 0,
            roleClassId: role.roleClassId,
            roleClassName: role.roleClassName,
            status: 1,
          });
        }
      } else {
        added.push({
          rowid: QB.GetNewGUID(),
          QID: role.QID,
          granttype: 1,
          contenttype: 0,
          pageID: pageId,
          functionoption,
          masterName: role.masterName || '',
          QName: role.QName,
          isDefault: 0,
          roleClassId: role.roleClassId,
          roleClassName: role.roleClassName,
          status: 1,
        });
      }
    });

    if (desiredByPage.size === 0 && items.length > 0) {
      items.forEach((it: any) => {
        if (it?.rowid) deleted.push({ rowid: it.rowid });
      });
    }

    const saveParam = table.getSaveParam(added, changed, deleted);
    const resSave = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });
    const saveData = resSave.data;

    if (isSaveSuccess(saveData)) {
      return {
        success: true,
        message: saveData?.Message || saveData?.message || '权限保存成功',
        data: saveData?.Result ?? saveData,
      };
    }

    return {
      success: false,
      message: saveData?.Message || saveData?.message || '保存失败',
      data: saveData,
    };
  } catch (error: any) {
    console.error('保存角色权限失败:', error);
    return { success: false, message: error?.message || '保存失败' };
  }
}
