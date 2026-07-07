import { and, cond, DataTable, or } from '../qyapi';
import { requestClient } from '../request';

const DB_NAME = 'QYVirtualPlat';

// User Table
const USER_TABLE = 'Base_UserInfo';
const USER_PK = 'ID';
const USER_MODEL_ID = 'F0BA18993242D85B7EF85D41BC65E030';

// Dept Table
const DEPT_TABLE = 'Base_DepartInfo';
const DEPT_PK = 'DepID';
const DEPT_MODEL_ID = 'F0BA18993242D85B7EF85D41BC65E030';

// Relation Table
const REL_TABLE = 'Base_User_DJ';
const REL_PK = 'rowid';
const REL_MODEL_ID = 'F0BA18993242D85B7EF85D41BC65E030';

export interface Department {
  DepID: string;
  Prowid: string; // Parent ID
  DepName: string;
  DepLevelCode?: string;
  children?: Department[];
}

export interface Staff {
  ROWID: string;
  UserName: string;
  LoginName: string;
  DepID?: string;
  DepName?: string;
}

function buildDeptChildrenIndex(depts: Department[]) {
  const childrenMap = new Map<string, Department[]>();

  for (const dept of depts) {
    const parentId = String(dept.Prowid ?? '');
    const list = childrenMap.get(parentId) ?? [];
    list.push(dept);
    childrenMap.set(parentId, list);
  }

  return childrenMap;
}

function collectDeptAndDescendantIds(depts: Department[], rootDepId: string): string[] {
  const rootId = String(rootDepId);
  if (!rootId) return [];

  const childrenMap = buildDeptChildrenIndex(depts);
  const result: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!current || visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    const children = childrenMap.get(current) ?? [];
    for (const child of children) {
      const childId = String(child.DepID ?? '');
      if (childId && !visited.has(childId)) queue.push(childId);
    }
  }

  return result;
}

/** Get all departments */
export async function getDepartmentList() {
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
  return (Array.isArray(resultData?.Items) ? resultData.Items : []) as Department[];
}

/** Get users by department */
export async function getStaffList(deptId?: string, keywords?: string) {
  const relTable = new DataTable(REL_MODEL_ID, REL_TABLE, DB_NAME, REL_PK);

  let depIds: string[] | undefined;
  if (deptId) {
    const allDepts = await getDepartmentList();
    depIds = collectDeptAndDescendantIds(allDepts, deptId);
    if (depIds.length === 0) return [];
  }

  const keywordText = String(keywords ?? '').trim();
  let keywordMatchedUserIds: string[] | undefined;
  let userMap: Map<string, { LoginName?: string; UserName?: string }> | undefined;

  if (keywordText) {
    const userTable = new DataTable(USER_MODEL_ID, USER_TABLE, DB_NAME, USER_PK);
    userTable.Filter = and(
      cond('lingma_sys_is_delete', 'equal', 0),
      or(
        cond('UserName', 'contains', keywordText),
        cond('LoginName', 'contains', keywordText),
      ),
    );

    const userQueryParam = {
      Table: [userTable],
      PageParam: { page: 1000, index: 1 },
    };

    const userRes = await requestClient.post(userTable.queryUrl, userQueryParam, {
      headers: userTable.getRequestHeader(),
      responseReturn: 'raw',
    });

    userTable.execQueryResult(userRes);
    const userResultData =
      userRes.data?.Result?.data || userRes.data?.Result || userRes.data;
    const users = (Array.isArray(userResultData?.Items)
      ? userResultData.Items
      : []) as any[];

    keywordMatchedUserIds = users
      .map((u: any) => String(u[USER_PK] ?? u.ROWID ?? ''))
      .filter(Boolean);

    if (keywordMatchedUserIds.length === 0) return [];

    userMap = new Map();
    for (const u of users) {
      const id = String(u[USER_PK] ?? u.ROWID ?? '');
      if (!id) continue;
      userMap.set(id, {
        UserName: u.UserName,
        LoginName: u.LoginName,
      });
    }
  }

  const filters = [cond('lingma_sys_is_delete', 'equal', 0)];
  if (depIds?.length) {
    filters.push(cond('DepID', 'in', depIds));
  }
  if (keywordMatchedUserIds?.length) {
    filters.push(cond('UserID', 'in', keywordMatchedUserIds));
  }
  relTable.Filter = and(...filters);

  const queryParam = {
    Table: [relTable],
    PageParam: { page: 1000, index: 1 },
  };

  const res = await requestClient.post(relTable.queryUrl, queryParam, {
    headers: relTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  relTable.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  const items = (Array.isArray(resultData?.Items) ? resultData.Items : []) as any[];

  const uniqueUsers = new Map<string, Staff>();
  for (const item of items) {
    const userId = String(item.UserID ?? '');
    if (!userId || uniqueUsers.has(userId)) continue;

    const fallback = userMap?.get(userId);
    uniqueUsers.set(userId, {
      ROWID: userId,
      UserName: String(fallback?.UserName ?? item.UserName ?? ''),
      LoginName: userId,
      DepID: item.DepID,
      DepName: item.DepName,
    });
  }

  return Array.from(uniqueUsers.values());
}

/** Get staff by ID */
export async function getStaffById(id: string) {
  if (!id) return null;

  const list = await getStaffByIds([id]);
  return list[0] ?? null;
}

/** Get staff by IDs */
export async function getStaffByIds(ids: string[]) {
  const normalizedIds = Array.from(
    new Set(
      (ids ?? [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean),
    ),
  );

  if (normalizedIds.length === 0) return [] as Staff[];

  // 第一轮：按 ROWID 直接查 Base_UserInfo
  const userTable = new DataTable(USER_MODEL_ID, USER_TABLE, DB_NAME, USER_PK);
  userTable.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond(USER_PK, 'in', normalizedIds),
  );

  const userQueryParam = {
    Table: [userTable],
    PageParam: { page: Math.max(normalizedIds.length, 100), index: 1 },
  };

  const userRes = await requestClient.post(userTable.queryUrl, userQueryParam, {
    headers: userTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  userTable.execQueryResult(userRes);
  const userResultData =
    userRes.data?.Result?.data || userRes.data?.Result || userRes.data;
  const users = (Array.isArray(userResultData?.Items)
    ? userResultData.Items
    : []) as any[];

  const userMap = new Map<string, any>();
  for (const user of users) {
    const id = String(user[USER_PK] ?? user.ROWID ?? '');
    if (!id) continue;
    userMap.set(id, user);
  }

  // 第二轮：ROWID 查不到的 ID，通过 Base_User_DJ 关联查 UserName
  const unresolvedIds = normalizedIds.filter((id) => !userMap.has(id));
  if (unresolvedIds.length > 0) {
    const relLookupTable = new DataTable(REL_MODEL_ID, REL_TABLE, DB_NAME, REL_PK);
    relLookupTable.Filter = and(
      cond('lingma_sys_is_delete', 'equal', 0),
      cond('UserID', 'in', unresolvedIds),
    );
    const relLookupRes = await requestClient.post(
      relLookupTable.queryUrl,
      { Table: [relLookupTable], PageParam: { page: Math.max(unresolvedIds.length * 5, 100), index: 1 } },
      { headers: relLookupTable.getRequestHeader(), responseReturn: 'raw' },
    );
    relLookupTable.execQueryResult(relLookupRes);
    const relLookupItems = (
      Array.isArray(relLookupRes.data?.Result?.data?.Items)
        ? relLookupRes.data.Result.data.Items
        : Array.isArray(relLookupRes.data?.Result?.Items)
          ? relLookupRes.data.Result.Items
          : []
    ) as any[];
    for (const rel of relLookupItems) {
      const relUserId = String(rel.UserID ?? '').trim();
      if (relUserId && !userMap.has(relUserId)) {
        userMap.set(relUserId, { ROWID: relUserId, UserName: String(rel.UserName ?? ''), LoginName: relUserId });
      }
    }
  }

  if (userMap.size === 0) return [] as Staff[];

  const relTable = new DataTable(REL_MODEL_ID, REL_TABLE, DB_NAME, REL_PK);
  relTable.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('UserID', 'in', normalizedIds),
  );

  const relQueryParam = {
    Table: [relTable],
    PageParam: { page: Math.max(normalizedIds.length * 5, 100), index: 1 },
  };

  const relRes = await requestClient.post(relTable.queryUrl, relQueryParam, {
    headers: relTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  relTable.execQueryResult(relRes);
  const relResultData =
    relRes.data?.Result?.data || relRes.data?.Result || relRes.data;
  const relItems = (Array.isArray(relResultData?.Items)
    ? relResultData.Items
    : []) as any[];

  const relMap = new Map<string, any>();
  for (const rel of relItems) {
    const userId = String(rel.UserID ?? '');
    if (!userId || relMap.has(userId)) continue;
    relMap.set(userId, rel);
  }

  return normalizedIds
    .map((id) => {
      const user = userMap.get(id);
      if (!user) return null;
      const rel = relMap.get(id);
      return {
        ROWID: String(user[USER_PK] ?? user.ROWID ?? id),
        // 优先用关系表的 UserName（与弹窗列表一致），回退到用户表
        UserName: String(rel?.UserName || user.UserName || ''),
        LoginName: String(id),
        DepID: rel?.DepID,
        DepName: rel?.DepName,
      } as Staff;
    })
    .filter(Boolean) as Staff[];
}
