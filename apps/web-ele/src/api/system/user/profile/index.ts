import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'QYVirtualPlat';
const PROFILE_MODEL_ID = 'F0BA18993242D85B7EF85D41BC65E030';

const USER_DEPT_JOB_TABLE = 'Base_User_DJ';
const DEPT_TABLE = 'Base_DepartInfo';
const JOB_TABLE = 'Base_JobInfo';
const LOGIN_LOG_TABLE = 'Base_UserLogin_Log';

export namespace SystemUserProfileApi {
  /** 三方账号绑定信息 */
  export interface ThirdAccountRespVO {
    provider?: string;
    type?: string;
    displayName?: string;
    providerUserId?: string;
    providerUnionId?: string;
    bindTime?: string;
  }

  /** 用户个人中心信息 */
  export interface UserProfileRespVO {
    id: number;
    userId?: string;
    userGuid?: string;
    entId?: string;
    username: string;
    nickname: string;
    email?: string;
    mobile?: string;
    sex?: number | string;
    avatar?: string;
    loginIp: string;
    loginDate: string;
    createTime: string;
    roles: any[];
    dept: any;
    posts: any[];
    thirdAccounts?: ThirdAccountRespVO[];
    rawUserInfo?: any;
  }

  /** 更新密码请求 */
  export interface UpdatePasswordReqVO {
    oldPassword: string;
    newPassword: string;
  }

  /** 更新个人信息请求 */
  export interface UpdateProfileReqVO {
    nickname?: string;
    email?: string;
    mobile?: string;
    sex?: number | string;
    avatar?: string;
  }

  /** 三方账号场景操作请求 */
  export interface ThirdAccountSceneActionReqVO {
    ent: string;
    scene: 'BIND_THIRD_ACCOUNT' | 'UNBIND_THIRD_ACCOUNT';
    target: 'WECHAT_WEB' | 'WECHAT_CORP_WEB' | string;
  }

  /** 三方账号扫码绑定请求 */
  export interface BindThirdAccountReqVO {
    ent: string;
    type: 'MOBILE' | string;
    scene: 'BIND_THIRD_ACCOUNT';
    token: string;
    target: 'WECHAT_WEB' | 'WECHAT_CORP_WEB' | string;
  }
}

function pickFirst<T = any>(source: Record<string, any>, keys: string[], fallback?: T) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value as T;
    }
  }
  return fallback as T;
}

function normalizeTime(value: unknown) {
  if (!value) {
    return '';
  }
  return String(value);
}

function uniqueText(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => (value === undefined || value === null ? '' : String(value).trim()))
        .filter(Boolean),
    ),
  );
}

function normalizeThirdAccounts(data: any): SystemUserProfileApi.ThirdAccountRespVO[] {
  const list =
    data?.thirdAccounts ??
    data?.ThirdAccounts ??
    data?.thirdAccountList ??
    data?.ThirdAccountList ??
    data?.third_account_list ??
    [];

  const accounts = Array.isArray(list) ? list : [];
  return accounts.map((item) => ({
    provider: pickFirst<string>(item, ['provider', 'Provider'], ''),
    type: pickFirst<string>(item, ['type', 'Type'], ''),
    displayName: pickFirst<string>(item, ['display_name', 'displayName', 'DisplayName'], ''),
    providerUserId: pickFirst<string>(item, ['provider_user_id', 'providerUserId', 'ProviderUserId'], ''),
    providerUnionId: pickFirst<string>(item, ['provider_union_id', 'providerUnionId', 'ProviderUnionId'], ''),
    bindTime: normalizeTime(pickFirst(item, ['createtime', 'createTime', 'CreateTime'], '')),
  }));
}

function getResponseItems(res: any) {
  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  if (Array.isArray(resultData?.Items)) {
    return resultData.Items;
  }
  if (Array.isArray(resultData)) {
    return resultData;
  }
  return [];
}

async function queryDataTable(
  tableName: string,
  primaryKey: string,
  filter: any,
  size = 50,
) {
  const table = new DataTable(PROFILE_MODEL_ID, tableName, DB_NAME, primaryKey);
  table.Filter = filter;

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { index: 1, size },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res as any);
  return getResponseItems(res);
}

function getNotDeletedFilter() {
  return cond('lingma_sys_is_delete', 'equal', 0);
}

function withEntFilter(entId?: string) {
  return entId ? [cond('lingma_sys_ent', 'equal', entId)] : [];
}

function buildOrEqualFilter(field: string, values: string[]) {
  return values.length === 1
    ? cond(field, 'equal', values[0])
    : or(...values.map((value) => cond(field, 'equal', value)));
}

function getRelationUserIds(profile: SystemUserProfileApi.UserProfileRespVO) {
  const user = profile.rawUserInfo ?? {};
  return uniqueText([
    user.row_id,
    user.ROWID,
    profile.userId,
    user.UserID,
    user.userid,
    user.userId,
    user.ID,
    user.Id,
    profile.userGuid,
  ]);
}

function mapLoginUserToProfile(data: any): SystemUserProfileApi.UserProfileRespVO {
  const user = data?.userInfo ?? data?.UserInfo ?? data ?? {};
  const deptName = pickFirst<string>(user, [
    'DepName',
    'DeptName',
    'DepartmentName',
    'deptName',
    'depName',
    'departmentName',
  ], '');
  const postName = pickFirst<string>(user, [
    'JobName',
    'PostName',
    'PositionName',
    'jobName',
    'postName',
    'positionName',
  ], '');
  const roleName = pickFirst<string>(user, ['RoleName', 'roleName', 'RoleNames', 'roleNames'], '');

  const thirdAccounts = normalizeThirdAccounts(data);

  const wechatOpenId = pickFirst<string>(user, ['WeChatOpenId', 'wechatOpenId'], '');
  if (wechatOpenId && !thirdAccounts.some((item) => item.type === 'WECHAT' || item.provider === 'WECHAT')) {
    thirdAccounts.push({
      provider: 'WECHAT',
      type: 'WECHAT',
      providerUserId: wechatOpenId,
    });
  }

  const qyWechatId = pickFirst<string>(user, ['WechatId', 'wechatId'], '');
  if (qyWechatId && !thirdAccounts.some((item) => item.type === 'QY_WECHAT' || item.provider === 'QY_WECHAT')) {
    thirdAccounts.push({
      provider: 'QY_WECHAT',
      type: 'QY_WECHAT',
      providerUserId: qyWechatId,
    });
  }

  const rowUserId = pickFirst<string>(user, ['row_id', 'ROWID', 'UserID', 'userid', 'userId'], '');
  const userGuid = pickFirst<string>(user, ['ID', 'Id', 'id'], '');

  return {
    id: Number(pickFirst(user, ['ROWID', 'rowid', 'id', 'Id'], 0)),
    // 真实库里 Base_User_DJ.UserID / Base_UserLogin_Log.userId 对应 Base_UserInfo.row_id，例如 U00029，不是 Base_UserInfo.ID 的 GUID。
    userId: rowUserId || userGuid,
    userGuid,
    entId: pickFirst<string>(user, ['lingma_sys_ent', 'EntId', 'entId'], ''),
    username: pickFirst<string>(user, ['LoginName', 'loginName', 'username', 'UserCode'], ''),
    nickname: pickFirst<string>(user, ['UserName', 'userName', 'nickname', 'Name'], ''),
    email: pickFirst<string>(user, ['mailbox', 'Email', 'email'], ''),
    mobile: pickFirst<string>(user, ['entInfoUserPhone', 'Mobile', 'Phone', 'Tel', 'mobile', 'phone', 'tel'], ''),
    sex: pickFirst<number | string | undefined>(user, ['Sex', 'sex'], undefined),
    avatar: pickFirst<string>(user, ['Avatar', 'avatar', 'HeadIcon', 'headIcon', 'Path'], ''),
    loginIp: pickFirst<string>(user, ['LoginIp', 'loginIp'], ''),
    loginDate: normalizeTime(pickFirst(user, ['LoginDate', 'LastLoginTime', 'loginDate'], '')),
    createTime: normalizeTime(pickFirst(user, ['CreateTime', 'CreatedTime', 'createTime'], '')),
    roles: roleName ? [{ name: roleName }] : [],
    dept: deptName ? { name: deptName } : undefined,
    posts: postName ? [{ name: postName }] : [],
    thirdAccounts,
    rawUserInfo: user,
  };
}

async function enrichOrgAndLoginInfo(profile: SystemUserProfileApi.UserProfileRespVO) {
  const relationUserIds = getRelationUserIds(profile);
  const loginName = profile.username;
  const entId = profile.entId;

  if (relationUserIds.length > 0) {
    const relRows = await queryDataTable(
      USER_DEPT_JOB_TABLE,
      'rowid',
      and(
        getNotDeletedFilter(),
        ...withEntFilter(entId),
        buildOrEqualFilter('UserID', relationUserIds),
      ),
      50,
    );

    const depIds = uniqueText(relRows.map((item: any) => item.DepID));
    const jobIds = uniqueText(relRows.map((item: any) => item.JobID));

    let deptMap = new Map<string, string>();
    if (depIds.length > 0) {
      const deptRows = await queryDataTable(
        DEPT_TABLE,
        'DepID',
        and(
          getNotDeletedFilter(),
          ...withEntFilter(entId),
          cond('DepID', 'in', depIds),
        ),
        Math.max(depIds.length, 20),
      );
      deptMap = new Map(
        deptRows
          .map((item: any) => [String(item.DepID ?? ''), String(item.DepName ?? '')])
          .filter(([id, name]: string[]) => id && name),
      );
    }

    let jobMap = new Map<string, string>();
    if (jobIds.length > 0) {
      const jobRows = await queryDataTable(
        JOB_TABLE,
        'ID',
        and(
          getNotDeletedFilter(),
          ...withEntFilter(entId),
          cond('ID', 'in', jobIds),
        ),
        Math.max(jobIds.length, 20),
      );
      jobMap = new Map(
        jobRows
          .map((item: any) => [String(item.ID ?? ''), String(item.JobName ?? '')])
          .filter(([id, name]: string[]) => id && name),
      );
    }

    const deptNames = uniqueText(
      relRows.map((item: any) => deptMap.get(String(item.DepID ?? '')) || item.DepName),
    );
    const jobNames = uniqueText(
      relRows.map((item: any) => jobMap.get(String(item.JobID ?? '')) || item.JobName),
    );

    if (deptNames.length > 0) {
      profile.dept = { name: deptNames.join('、') };
    }
    if (jobNames.length > 0) {
      profile.posts = jobNames.map((name) => ({ name }));
    }
  }

  if (relationUserIds.length > 0 || loginName) {
    const loginUserFilter = relationUserIds.length > 0
      ? buildOrEqualFilter('userId', relationUserIds)
      : undefined;
    const loginNameFilter = loginName ? cond('LoginName', 'equal', loginName) : undefined;

    const loginRows = await queryDataTable(
      LOGIN_LOG_TABLE,
      'row_id',
      and(
        getNotDeletedFilter(),
        ...withEntFilter(entId),
        loginUserFilter && loginNameFilter
          ? or(loginUserFilter, loginNameFilter)
          : (loginUserFilter || loginNameFilter),
      ),
      50,
    );

    const latestLogin = loginRows
      .filter((item: any) => item.IsSuccess === 1 || item.IsSuccess === '1' || item.IsSuccess === true)
      .sort((a: any, b: any) => {
        const aTime = new Date(a.LoginTime || a.createtime || 0).getTime();
        const bTime = new Date(b.LoginTime || b.createtime || 0).getTime();
        return bTime - aTime;
      })[0];

    if (latestLogin) {
      profile.loginDate = normalizeTime(latestLogin.LoginTime || latestLogin.createtime || profile.loginDate);
      profile.loginIp = pickFirst<string>(latestLogin, ['LoginIp', 'loginIp'], profile.loginIp);
    }
  }

  return profile;
}

/** 获取登录用户信息 */
export async function getUserProfile() {
  const resp = await requestClient.get('/api/LoginAuthority/GetUserInfo', {
    responseReturn: 'raw',
  });
  const res = (resp as any)?.data ?? resp;
  const profile = mapLoginUserToProfile(res?.Result ?? res);
  try {
    return await enrichOrgAndLoginInfo(profile);
  } catch (error) {
    console.error('获取用户部门、岗位或登录时间失败', error);
    return profile;
  }
}

/** 修改用户个人信息 */
export function updateUserProfile(
  data: SystemUserProfileApi.UpdateProfileReqVO,
) {
  return requestClient.put('/system/user/profile/update', data);
}

/** 修改用户个人密码 */
export function updateUserPassword(
  data: SystemUserProfileApi.UpdatePasswordReqVO,
) {
  return requestClient.put('/system/user/profile/update-password', data);
}

/** 三方账号场景操作：当前用于解绑 */
export function thirdAccountSceneAction(
  data: SystemUserProfileApi.ThirdAccountSceneActionReqVO,
) {
  return requestClient.post('/User/codeSceneAction', data, {
    responseReturn: 'raw',
  });
}


/** 三方账号扫码绑定/换绑 */
export function bindThirdAccountByCode(
  data: SystemUserProfileApi.BindThirdAccountReqVO,
) {
  return requestClient.post('/User/codeSceneAction', data, {
    responseReturn: 'raw',
  });
}
