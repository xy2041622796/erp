import { and, cond, DataTable } from '../../qyapi';
import { requestClient } from '#/api/request';
import { useUserStore } from '@vben/stores';

const DB_NAME = 'QYVirtualPlat';

// Dept Table
const DEPT_TABLE = 'Base_DepartInfo';
const DEPT_PK = 'DepID';
const DEPT_MODEL_ID = 'F0BA18993242D85B7EF85D41BC65E030';

const USER_BIND_TABLE = 'Base_User_DJ';
const USER_BIND_PK = 'rowid';

export namespace SystemDeptApi {
  /** 部门信息 */
  export interface Dept {
    id?: number | string;
    name: string;
    parentId?: number | string;
    status: number;
    sort: number;
    leaderUserId: number | string;
    phone: string;
    email: string;
    createTime: Date;
    children?: Dept[];
  }

  export interface CurrentUserBoundDeptInfo {
    deptId: string;
    deptName: string;
  }
}

function getCurrentUserId() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return String(info.id || raw.ROWID || raw.rowid || '').trim();
}

/** 查询部门（精简)列表 */
export async function getSimpleDeptList() {
  const deptTable = new DataTable(DEPT_MODEL_ID, DEPT_TABLE, DB_NAME, DEPT_PK);

  const filter = and(cond('lingma_sys_is_delete', 'equal', 0));
  deptTable.Filter = filter;

  const queryParam = {
    Table: [deptTable],
    PageParam: { page: 1000, index: 1 },
  };

  const res = await requestClient.post(deptTable.queryUrl, queryParam, {
    headers: deptTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  deptTable.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  const items = (Array.isArray(resultData?.Items) ? resultData.Items : []) as any[];

  return items.map((item) => ({
    id: item.DepID,
    name: item.DepName,
    parentId: item.Prowid,
    phone: '',
    email: '',
    status: item.IsCancel === '0' ? 1 : 0,
    sort: Number(item.DepLevelCode || 0),
    leaderUserId: item.CSR || '',
    createTime: item.CreateTime ? new Date(item.CreateTime) : new Date(),
  })) as SystemDeptApi.Dept[];
}

/**
 * 参考 dataMag/workflow 的口径：
 * 1. 先到 Base_User_DJ 按当前登录用户 UserID 查询绑定记录
 * 2. 再用 DepID 到 Base_DepartInfo 查询部门信息
 */
export async function getCurrentUserBoundDeptInfo(): Promise<SystemDeptApi.CurrentUserBoundDeptInfo> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return {
      deptId: '',
      deptName: '',
    };
  }

  const userBindTable = new DataTable(DEPT_MODEL_ID, USER_BIND_TABLE, DB_NAME, USER_BIND_PK);
  userBindTable.Filter = cond('UserID', 'equal', currentUserId);

  const userBindRes = await requestClient.post(
    userBindTable.queryUrl,
    {
      Table: [userBindTable],
      PageParam: { page: 1, index: 1 },
    },
    {
      headers: userBindTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  userBindTable.execQueryResult(userBindRes);
  const bindResultData = userBindRes.data?.Result?.data || userBindRes.data?.Result || userBindRes.data;
  const bindItems = Array.isArray(bindResultData?.Items) ? bindResultData.Items : [];
  const bindRow = bindItems[0] || null;
  const deptId = String(
    bindRow?.DepID ?? bindRow?.depid ?? bindRow?.DEP_ID ?? bindRow?.depId ?? '',
  ).trim();
  if (!deptId) {
    return {
      deptId: '',
      deptName: '',
    };
  }

  const deptTable = new DataTable(DEPT_MODEL_ID, DEPT_TABLE, DB_NAME, DEPT_PK);
  deptTable.Filter = cond('DepID', 'equal', deptId);

  const deptRes = await requestClient.post(
    deptTable.queryUrl,
    {
      Table: [deptTable],
      PageParam: { page: 1, index: 1 },
    },
    {
      headers: deptTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  deptTable.execQueryResult(deptRes);
  const deptResultData = deptRes.data?.Result?.data || deptRes.data?.Result || deptRes.data;
  const deptItems = Array.isArray(deptResultData?.Items) ? deptResultData.Items : [];
  const deptRow = deptItems[0] || null;

  return {
    deptId,
    deptName: String(
      deptRow?.DepName ?? deptRow?.name ?? deptRow?.NAME ?? deptRow?.deptName ?? '',
    ).trim(),
  };
}

export async function getCurrentUserBoundDeptName() {
  const result = await getCurrentUserBoundDeptInfo();
  return result.deptName;
}

/** 查询部门列表 */
export async function getDeptList() {
  return requestClient.get('/system/dept/list');
}

/** 查询部门详情 */
export async function getDept(id: number) {
  return requestClient.get<SystemDeptApi.Dept>(`/system/dept/get?id=${id}`);
}

/** 新增部门 */
export async function createDept(data: SystemDeptApi.Dept) {
  return requestClient.post('/system/dept/create', data);
}

/** 修改部门 */
export async function updateDept(data: SystemDeptApi.Dept) {
  return requestClient.put('/system/dept/update', data);
}

/** 删除部门 */
export async function deleteDept(id: number) {
  return requestClient.delete(`/system/dept/delete?id=${id}`);
}

/** 批量删除部门 */
export async function deleteDeptList(ids: number[]) {
  return requestClient.delete(`/system/dept/delete-list?ids=${ids.join(',')}`);
}
