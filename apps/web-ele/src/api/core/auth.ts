import type { AppRouteRecordRaw } from '@vben/types';

import { ElMessage } from 'element-plus';

import { baseApiUrl } from '#/api/qyapi';
import { baseRequestClient, requestClient } from '#/api/request';
import { resolveAccountSetFromUserInfo } from '#/utils/accountSet';
import {
  getCachedNavigationMenus,
  setCachedNavigationMenus,
} from '#/utils/navigationMenuCache';

function getBackendErrorMessage(payload: any, fallback: string) {
  const raw = payload?.raw ?? payload;
  return String(
    payload?.Message ??
      payload?.message ??
      payload?.msg ??
      payload?.error ??
      payload?.repMsg ??
      raw?.Message ??
      raw?.message ??
      raw?.msg ??
      raw?.error ??
      raw?.repMsg ??
      fallback,
  );
}

function assertBackendCode200(payload: any, fallback: string) {
  const code =
    payload?.Code ?? payload?.code ?? payload?.Status ?? payload?.status;
  const type = String(payload?.Type ?? payload?.type ?? '').toLowerCase();

  if (code !== undefined && String(code) !== '200') {
    throw new Error(getBackendErrorMessage(payload, fallback));
  }

  if (type === 'error') {
    throw new Error(getBackendErrorMessage(payload, fallback));
  }
}

function normalizeBackendLoginResult(payload: any, fallback = '登录失败') {
  const result = payload?.Result ?? payload?.result ?? payload;
  const token = result?.token ?? result?.accessToken;
  const refreshToken = result?.refreshToken ?? result?.xAccessToken;
  const userId =
    result?.userinfo?.ROWID ??
    result?.userinfo?.rowid ??
    result?.userInfo?.ROWID ??
    result?.userId ??
    result?.id;

  if (!token || !refreshToken) {
    throw new Error(getBackendErrorMessage(payload, fallback));
  }

  return {
    id: userId,
    accessToken: String(token).replace(/Bearer\s+/i, ''),
    refreshToken: String(refreshToken).replace(/Bearer\s+/i, ''),
    userId: userId ?? 0,
  };
}

async function runWithBackendMessage<T>(promise: Promise<T>, fallback: string) {
  try {
    const response = (await promise) as any;
    const payload = response?.data ?? response;
    assertBackendCode200(payload, fallback);
    return response;
  } catch (error: any) {
    const payload = error?.response?.data ?? error?.data;
    if (payload) {
      throw new Error(
        getBackendErrorMessage(payload, error?.message || fallback),
      );
    }
    throw error;
  }
}

function getTenantShortNameFromHost() {
  const host = window.location.hostname.toLowerCase();
  const suffix = '.erp.lingmacn.com';
  if (!host.endsWith(suffix)) return '';
  const shortName = host.slice(0, -suffix.length).split('.').pop() || '';
  return shortName && shortName !== 'www' ? shortName : '';
}

function getTenantMatchValueFromLocation() {
  const urlParams = new URLSearchParams(window.location.search);
  const entIdParam = urlParams.get('entid');
  return entIdParam
    ? decodeURIComponent(entIdParam)
    : getTenantShortNameFromHost();
}

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
    captchaVerification?: string;
    // 绑定社交登录时，需要传递如下参数
    socialType?: number;
    socialCode?: string;
    socialState?: string;
    tenantId?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    userId: number;
    expiresTime: number;
  }

  /** 租户信息返回值 */
  export interface TenantResult {
    id: number | string;
    name: string;
    fullName?: string;
    shortName?: string;
    shortCName?: string;
    enterpriseIcon?: string;
    logo?: string;
    rowid?: number | string;
    raw?: any;
  }

  /** 手机验证码获取接口参数 */
  export interface SmsCodeParams {
    mobile: string;
    scene: number;
  }

  /** 登录公开验证码接口参数 */
  export interface PublicLoginCodeParams {
    ent: string;
    type: 'EMAIL' | 'MOBILE';
    scene: 'LOGIN';
    account: string;
  }

  /** 手机/邮箱验证码登录接口参数 */
  export interface CodeLoginParams {
    ent: string;
    type: 'EMAIL' | 'MOBILE';
    account: string;
    scene: 'LOGIN';
    code: string;
  }

  /** 第三方扫码登录参数 */
  export interface ThirdPartyLoginParams {
    code?: string;
    type: 'WECHAT' | 'WECHAT_CORP_WEB' | 'WECHAT_WEB' | 'wwx' | 'wx' | string;
    ent?: string;
    entShortName?: string;
  }

  /** 第三方账号绑定参数 */
  export interface ThirdPartyBindParams {
    ent: string;
    type: string;
    token: string;
    username: string;
    password: string;
  }

  /** 公开短信验证码接口参数 */
  export interface PublicSmsCodeParams {
    ent: string;
    type: 'MOBILE';
    scene: 'REGISTER';
    account: string;
  }

  /** 手机验证码登录接口参数 */
  export interface SmsLoginParams {
    mobile: string;
    code: string;
  }

  /** 注册接口参数 */
  export interface RegisterParams {
    ent?: string;
    loginName?: string;
    username: string;
    password: string;
    sex?: string;
    phone?: string;
    depId?: string;
    jobId?: string;
    code?: string;
    captchaVerification?: string;
  }

  /** 重置密码接口参数 */
  export interface ResetPasswordParams {
    password: string;
    mobile: string;
    code: string;
  }

  /** 社交快捷登录接口参数 */
  export interface SocialLoginParams {
    type: number;
    code: string;
    state: string;
  }
}

/** 登录 */
export async function loginApi(data: AuthApi.LoginParams) {
  // return requestClient.post<AuthApi.LoginResult>('/system/auth/login', data, {
  //   headers: {
  //     isEncrypt: false,
  //   },
  // });

  // 多租户登录
  // 登录调用优先使用表单选中的租户原始 ShortName，保留租户自身大小写；
  // 域名解析值只作为兜底，不覆盖已选中的租户，避免大小写跟顶部/域名走。
  const tenantShortNameFromHost = getTenantShortNameFromHost();
  const loginTenantName = data?.tenantId || tenantShortNameFromHost || 'NewApp';
  const loginParam = {
    strUser: data.username,
    strPwd: data.password,
    entName: loginTenantName, // data.tenantName,
  };
  // 该接口返回的格式与系统统一响应格式不同，会被默认的 responseInterceptor 认为是失败并抛出。
  // 使用 responseReturn: 'raw' 保留后端原始响应；如果 Java 返回 HTTP 非 200，也要把响应体 Message 透传给页面。
  let resp: any;
  try {
    resp = await requestClient.post(
      `/api/LoginAuthority/UserLoginByEnt`,
      loginParam,
      {
        headers: {
          isEncrypt: false,
        },
        responseReturn: 'raw',
      },
    );
  } catch (error: any) {
    const payload = error?.response?.data ?? error?.data ?? error;
    throw new Error(
      getBackendErrorMessage(
        payload,
        error?.message || '登录失败，请检查用户名或密码',
      ),
    );
  }

  const res = resp?.data ?? resp;
  assertBackendCode200(res, '登录失败，请检查用户名或密码');
  const message = getBackendErrorMessage(res, '登录失败，后端返回数据异常');

  return normalizeBackendLoginResult(res, message);
}

/** 刷新 accessToken */
export async function refreshTokenApi(
  accessToken: string,
  refreshToken: string,
) {
  // return baseRequestClient.post(
  //   `/system/auth/refresh-token?refreshToken=${refreshToken}`,
  // );

  const resp = await requestClient.post(
    `${baseApiUrl}LoginAuthority/refresh`,
    null,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Authorization': `Bearer ${refreshToken}`,
      },
      responseReturn: 'raw',
    },
  );
  const res = resp?.data ?? resp;
  assertBackendCode200(res, '刷新登录状态失败');

  const resData = res.Result;
  return resData.token.replace(/Bearer /, '');
}

/** 退出登录 */
export async function logoutApi(accessToken: string) {
  return baseRequestClient.post(
    '/system/auth/logout',
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

/** 获取权限信息 */
export async function getAuthPermissionInfoApi() {
  // return requestClient.get<AuthPermissionInfo>(
  //   '/system/auth/get-permission-info',
  // );
  let navMenus = getCachedNavigationMenus<any>();
  if (!navMenus) {
    const navRes = await requestClient.get(
      `/api/FormDesign/GetNavigationMenus/359875B2804FCDBD0F2DCC567D2A22F1/359875B2804FCDBD0F2DCC567D2A22F1`,
      {
        responseReturn: 'raw',
      },
    );
    navMenus = navRes.data.Result;
    setCachedNavigationMenus(navMenus);
  }

  const userRes = await requestClient.get(`/api/LoginAuthority/GetUserInfo`, {
    responseReturn: 'raw',
  });

  const userInfo = userRes.data.Result;

  const menus = convertNavMenus(navMenus.TopMenus, navMenus.LeftMenus);
  const resolvedAccountSet = resolveAccountSetFromUserInfo(userInfo);
  const user = {
    id: userInfo.userInfo.ROWID,
    username: userInfo.userInfo.LoginName,
    nickname: userInfo.userInfo.UserName,
    deptId: '',
    email: '',
    avatar: '',
    accountSetId: resolvedAccountSet?.id,
    accountSetName: resolvedAccountSet?.name,
    rawUserInfo: userInfo.userInfo,
  };
  return { menus, permissions: [], roles: [], user };
}

function normalizeRouteNamePart(value: unknown) {
  return String(value ?? '')
    .trim()
    .replaceAll(/^\/+|\/+$/g, '')
    .replace(/\.(vue|tsx?|jsx?)$/i, '')
    .replace(/\/index$/i, '')
    .replaceAll(/[^a-z0-9]+/gi, '_')
    .replaceAll(/^_+|_+$/g, '');
}

function buildMenuRouteName(node: any, path: string, component: string) {
  const routePart =
    normalizeRouteNamePart(component) || normalizeRouteNamePart(path);
  if (routePart) return `Route_${routePart}`;

  const titlePart = normalizeRouteNamePart(
    node?.NavigationCaption || node?.text || node?.name,
  );
  const idPart = normalizeRouteNamePart(node?.id || node?.ROWID || node?.rowid);
  const fallbackPart = [titlePart, idPart].filter(Boolean).join('_');
  return fallbackPart ? `Route_${fallbackPart}` : 'Route_Menu';
}

function normalizeNavigationPath(value: unknown) {
  return String(value ?? '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/[?#].*$/, '')
    .replaceAll(/^\/+|\/+$/g, '');
}

function resolveMenuFullPath(path = '', parentPath = '') {
  const normalizedParent = normalizeNavigationPath(parentPath);
  const normalizedPath = normalizeNavigationPath(path);
  const fullPath = (() => {
    if (!normalizedParent) return normalizedPath;
    if (!normalizedPath) return normalizedParent;
    if (
      normalizedPath === normalizedParent ||
      normalizedPath.startsWith(`${normalizedParent}/`)
    ) {
      return normalizedPath;
    }
    return `${normalizedParent}/${normalizedPath}`;
  })()
    .replaceAll(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
  return fullPath ? `/${fullPath}` : '';
}

function getNodeNavigationUrl(node: any) {
  return node?.NavigationUrl ?? node?.navigationUrl ?? '';
}

function isInventoryAccountingMenu(node: any) {
  const caption = String(
    node?.text ?? node?.NavigationCaption ?? node?.name ?? '',
  );
  const url = normalizeNavigationPath(getNodeNavigationUrl(node));
  return (
    caption.includes('存货核算') ||
    url.includes('stock/inventory-accounting') ||
    url.includes('inventory-accounting')
  );
}

function isStockManagementMenu(node: any) {
  const caption = String(
    node?.text ?? node?.NavigationCaption ?? node?.name ?? '',
  );
  const url = normalizeNavigationPath(getNodeNavigationUrl(node));
  return caption.includes('库存管理') || url === 'erp/stock';
}

function normalizeInventoryAccountingUrl(url: unknown) {
  const normalized = normalizeNavigationPath(url);
  if (!normalized) return normalized;

  if (normalized.includes('erp/stock/inventory-accounting')) {
    return normalized.replace(
      /(^|\/)erp\/stock\/inventory-accounting(?=\/|$)/,
      '$1erp/inventory-accounting',
    );
  }

  if (normalized === 'inventory-accounting') {
    return 'erp/inventory-accounting';
  }

  if (normalized.startsWith('inventory-accounting/')) {
    return normalized.replace(
      /^inventory-accounting(?=\/)/,
      'erp/inventory-accounting',
    );
  }

  return normalized;
}

function normalizeInventoryAccountingMenus(
  topMenus = [] as any[],
  leftMenus = [] as any[],
) {
  const clonedTopMenus = structuredClone(topMenus || []);
  const clonedLeftMenus = structuredClone(leftMenus || []);

  const stockNode = clonedLeftMenus.find((node: any) =>
    isStockManagementMenu(node),
  );

  for (const node of clonedLeftMenus) {
    if (!isInventoryAccountingMenu(node)) continue;

    node.NavigationUrl = normalizeInventoryAccountingUrl(getNodeNavigationUrl(node));

    if (stockNode && node.pid === stockNode.id) {
      node.pid = stockNode.pid;
      const stockSort = Number(stockNode.sort ?? stockNode.Sort ?? 0);
      const currentSort = Number(node.sort ?? node.Sort ?? 0);
      const nextSort = currentSort > stockSort ? currentSort : stockSort + 1;
      node.sort = nextSort;
      node.Sort = nextSort;
    }
  }

  const walkTree = (nodes: any[] = []) => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (isInventoryAccountingMenu(node)) {
        node.NavigationUrl = normalizeInventoryAccountingUrl(
          getNodeNavigationUrl(node),
        );
      }

      const children = Array.isArray(node?.items) ? node.items : [];
      const inventoryIndex = children.findIndex((child: any) =>
        isInventoryAccountingMenu(child),
      );

      if (isStockManagementMenu(node) && inventoryIndex >= 0) {
        const [inventoryMenu] = children.splice(inventoryIndex, 1);
        inventoryMenu.NavigationUrl = normalizeInventoryAccountingUrl(
          getNodeNavigationUrl(inventoryMenu),
        );
        nodes.splice(index + 1, 0, inventoryMenu);
        return true;
      }

      if (walkTree(children)) return true;
    }
    return false;
  };
  walkTree(clonedTopMenus);

  return { topMenus: clonedTopMenus, leftMenus: clonedLeftMenus };
}
const INITIALIZATION_MENU_ID = 'frontend-finance-settings-initialization';
const INITIALIZATION_MENU_PATH = 'initialization';

function isFinanceSettingsGroup(menu: AppRouteRecordRaw) {
  const children = ((menu.children as AppRouteRecordRaw[]) ||
    []) as AppRouteRecordRaw[];

  const childPaths = children.map((child) =>
    normalizeNavigationPath(child.path),
  );
  const childNames = children.map((child) => String(child.name || ''));

  return (
    childPaths.some((path) => path.endsWith('project')) &&
    childPaths.some((path) => path.endsWith('auxiliary')) &&
    childNames.some((name) => name.includes('科目')) &&
    childNames.some((name) => name.includes('辅助核算'))
  );
}

function resolveInitializationPath(children: AppRouteRecordRaw[]) {
  const referencePath =
    children
      .map((child) => normalizeNavigationPath(child.path))
      .find(
        (path) => path.endsWith('project') || path.endsWith('auxiliary'),
      ) || '';

  if (referencePath.includes('/')) {
    return referencePath.replace(/\/[^/]+$/, `/${INITIALIZATION_MENU_PATH}`);
  }

  return INITIALIZATION_MENU_PATH;
}

function createInitializationMenu(
  parent: AppRouteRecordRaw,
  children: AppRouteRecordRaw[],
): AppRouteRecordRaw {
  const maxSort = children.reduce(
    (max, child) => Math.max(max, Number(child.sort ?? 0)),
    0,
  );
  const path = resolveInitializationPath(children);

  return {
    id: INITIALIZATION_MENU_ID,
    parentId: String(parent.id || ''),
    name: '初始化',
    path,
    component: `${path}/index`,
    componentName: buildMenuRouteName(
      {
        id: INITIALIZATION_MENU_ID,
        NavigationCaption: '初始化',
      },
      path,
      `${path}/index`,
    ),
    icon: '',
    visible: true,
    keepAlive: true,
    sort: maxSort + 1,
    alwaysShow: true,
    children: [],
  } as AppRouteRecordRaw;
}

function appendInitializationMenu(menus: AppRouteRecordRaw[] = []) {
  const visit = (items: AppRouteRecordRaw[]) => {
    for (const item of items) {
      const children = ((item.children as AppRouteRecordRaw[]) ||
        []) as AppRouteRecordRaw[];

      if (isFinanceSettingsGroup(item)) {
        const hasInitialization = children.some((child) => {
          const childPath = normalizeNavigationPath(child.path);
          const childName = String(child.name || '');

          return (
            child.id === INITIALIZATION_MENU_ID ||
            childPath.endsWith('initialization') ||
            childName === '初始化'
          );
        });

        if (!hasInitialization) {
          item.children = [
            ...children,
            createInitializationMenu(item, children),
          ];
        } else {
          item.children = children;
        }

        return true;
      }

      if (children.length > 0) {
        item.children = children;
        if (visit(children)) return true;
      }
    }

    return false;
  };

  visit(menus);
  return menus;
}

function convertNavMenus(topMenus = [] as any[], leftMenus = [] as any[]) {
  const normalizedMenus = normalizeInventoryAccountingMenus(
    topMenus,
    leftMenus,
  );
  topMenus = normalizedMenus.topMenus;
  leftMenus = normalizedMenus.leftMenus;

  const toMenu = (
    node: any,
    parentId: string = '0',
    parentPath: string = '',
  ): AppRouteRecordRaw => {
    const childrenSource =
      node.items && node.items.length > 0
        ? node.items
        : leftMenus.filter((m) => m.pid === node.id);
    const path = normalizeNavigationPath(getNodeNavigationUrl(node));
    const fullPath = resolveMenuFullPath(path, parentPath);
    const component = path ? `${path}/index` : '';
    const fullComponent = fullPath
      ? `${normalizeNavigationPath(fullPath)}/index`
      : '';
    const children =
      Array.isArray(childrenSource) && childrenSource.length > 0
        ? childrenSource.map((c) => toMenu(c, node.id, fullPath))
        : [];

    return {
      id: node.id,
      parentId,
      name: node.text || node.NavigationCaption || '',
      path,
      // page component string should point to the view folder, generateRoutesByBackend will resolve it
      component,
      componentName: buildMenuRouteName(
        node,
        fullPath || path,
        fullComponent || component,
      ),
      icon: node.icon || '',
      visible: typeof node.visible === 'boolean' ? node.visible : true,
      keepAlive: node.keepAlive ?? true,
      sort: node.sort ?? node.Sort ?? 0,
      alwaysShow: true,
      children,
    };
  };
  return appendInitializationMenu(topMenus.map((m) => toMenu(m, '0')));
}

/** 获取租户列表 */
export async function getTenantSimpleList() {
  // return requestClient.get<AuthApi.TenantResult[]>(
  //   `/system/tenant/simple-list`,
  // );

  // 获取 URL 参数中的 entid，优先级高于域名解析；无 entid 时解析正式环境租户 shortName 子域。
  const tenantMatchValue = getTenantMatchValueFromLocation();

  const fields = [
    {
      Name: 'row_id',
      FieldType: 'varchar',
      IsOutput: true,
    },
    {
      Name: 'Name',
      FieldType: 'varchar',
      IsOutput: true,
    },
    {
      Name: 'CName',
      FieldType: 'varchar',
      IsOutput: true,
    },
    {
      Name: 'ShortCName',
      FieldType: 'varchar',
      IsOutput: true,
    },
    {
      Name: 'ShortName',
      FieldType: 'varchar',
      IsOutput: true,
    },
    {
      Name: 'EnterpriseIcon',
      FieldType: 'varchar',
      IsOutput: true,
    },
  ];

  const query: any = {
    Table: [
      {
        Name: 'Base_Enterprise_Info',
        Type: '数据库表',
        DbName: 'QYVirtualPlat',
        Fields: fields,
      },
    ],
  };

  if (tenantMatchValue) {
    query.Table[0].Filter = {
      Type: 'and',
      Filters: [
        {
          Type: 'or',
          Filters: [
            {
              Type: 'cond',
              Field: 'ShortName',
              Operator: 'equal',
              Value: null,
              ValueFun: {
                Type: 'GetConstValue',
                Value: tenantMatchValue,
              },
            },
          ],
        },
      ],
    };
  }

  const fetchTenantItems = async (tenantQuery: any) => {
    const resp = await requestClient.post(
      '/api/DataOperation/GetBaseData',
      tenantQuery,
      {
        responseReturn: 'raw',
      },
    );

    const res = resp?.data ?? resp;
    const resData = res?.Result;
    return resData?.data?.Items || resData?.Items || [];
  };

  let items = await fetchTenantItems(query);

  // 后端 ShortName equal 在不同数据库/排序规则下可能大小写敏感。
  // 精确查询没有结果时，兜底拉取租户列表并在前端做大小写不敏感匹配。
  if (tenantMatchValue && items.length === 0) {
    const queryWithoutFilter = {
      ...query,
      Table: query.Table.map((table: any) => {
        const { Filter: _filter, ...rest } = table;
        return rest;
      }),
    };
    const normalizedTenantMatchValue = tenantMatchValue.toLowerCase();
    items = (await fetchTenantItems(queryWithoutFilter)).filter(
      (item: any) =>
        String(item.ShortName || '').toLowerCase() ===
        normalizedTenantMatchValue,
    );
  }

  return items.map((item: any) => ({
    id: item.ShortName || item.row_id || item.Name,
    name: item.ShortCName || item.CName || item.Name || item.ShortName,
    fullName: item.CName || item.Name || item.ShortCName,
    shortName: item.ShortName,
    shortCName: item.ShortCName,
    enterpriseIcon: item.EnterpriseIcon,
    logo: item.EnterpriseIcon,
    rowid: item.row_id,
    raw: item,
  }));
}

/** 使用租户域名，获得租户信息 */
export async function getTenantByWebsite(website: string) {
  return requestClient.get<AuthApi.TenantResult>(
    `/system/tenant/get-by-website?website=${website}`,
  );
}

/** 获取验证码 */
export async function getCaptcha(data: any) {
  try {
    return await runWithBackendMessage(
      baseRequestClient.post('/system/captcha/get', data),
      '获取验证码失败',
    );
  } catch (error: any) {
    ElMessage.error(error?.message || '获取验证码失败');
    throw error;
  }
}

/** 校验验证码 */
export async function checkCaptcha(data: any) {
  try {
    return await runWithBackendMessage(
      baseRequestClient.post('/system/captcha/check', data),
      '验证码校验失败',
    );
  } catch (error: any) {
    ElMessage.error(error?.message || '验证码校验失败');
    throw error;
  }
}

/** 获取登录验证码 */
export async function sendSmsCode(data: AuthApi.SmsCodeParams) {
  return requestClient.post('/system/auth/send-sms-code', data);
}

/** 获取注册公开短信验证码 */
export async function sendRegisterSmsCode(data: AuthApi.PublicSmsCodeParams) {
  const resp = await requestClient.post('/api/message/code/send/public', data, {
    headers: {
      isEncrypt: false,
    },
    responseReturn: 'raw',
  });
  const res = resp?.data ?? resp;
  assertBackendCode200(res, '发送验证码失败');
  return res;
}

/** 获取登录公开验证码 */
export async function sendLoginCode(data: AuthApi.PublicLoginCodeParams) {
  const resp = await requestClient.post('/api/message/code/send/public', data, {
    headers: {
      isEncrypt: false,
    },
    responseReturn: 'raw',
  });
  const res = resp?.data ?? resp;
  assertBackendCode200(res, '发送验证码失败');
  return res;
}

/** 手机/邮箱验证码登录 */
export async function smsLogin(
  data: AuthApi.CodeLoginParams | AuthApi.SmsLoginParams,
) {
  const payload =
    'account' in data
      ? data
      : {
          ent: getTenantShortNameFromHost() || 'NewApp',
          type: 'MOBILE' as const,
          account: data.mobile,
          scene: 'LOGIN' as const,
          code: data.code,
        };

  const resp = await requestClient.post(
    '/api/LoginAuthority/UserLoginWithCode',
    payload,
    {
      headers: {
        isEncrypt: false,
      },
      responseReturn: 'raw',
    },
  );
  const res = resp?.data ?? resp;
  assertBackendCode200(res, '验证码登录失败');
  return normalizeBackendLoginResult(res, '验证码登录失败');
}

/** 第三方扫码登录 */
export async function thirdPartyLogin(data: AuthApi.ThirdPartyLoginParams) {
  // 对齐根目录 Login.html 的扫码登录实现：
  // QB.CreateRequest(webApiRoot + 'thirdParty/login', 'GET', { code, ent, type }, false)
  // 微信/企业微信 code 登录统一交给后端 thirdParty/login 处理，避免走 /thirdParty/auth/login 时缺少后端要求的上下文参数。
  const ent = data.ent || data.entShortName;
  const params = {
    code: data.code,
    ent,
    type: data.type,
  };

  const resp = await requestClient.get('/api/thirdParty/login', {
    params,
    responseReturn: 'raw',
  });
  const res = resp?.data ?? resp;
  assertBackendCode200(res, '扫码登录失败');
  return res;
}

/** 绑定第三方账号到系统账号 */
export async function thirdPartyBindAccount(
  data: AuthApi.ThirdPartyBindParams,
) {
  const resp = await requestClient.post('/api/thirdParty/auth/bind', data, {
    headers: {
      isEncrypt: false,
    },
    responseReturn: 'raw',
  });
  const res = resp?.data ?? resp;
  assertBackendCode200(res, '账号绑定失败');
  return res;
}

/** 注册 */
export async function register(data: AuthApi.RegisterParams) {
  const ent = data.ent || 'NewApp';
  const loginName = data.loginName || data.username;

  const resp = await requestClient.post(
    '/api/LoginAuthority/register',
    {
      ent,
      loginName,
      username: data.username,
      password: data.password,
      sex: data.sex || 'M',
      phone: data.phone || '',
      depId: data.depId || '',
      jobId: data.jobId || '',
      code: data.code || '',
    },
    {
      headers: {
        isEncrypt: false,
      },
      responseReturn: 'raw',
    },
  );

  const res = (resp as any)?.data ?? resp;
  assertBackendCode200(res, '注册失败');

  return res;
}

/** 通过短信重置密码 */
export async function smsResetPassword(data: AuthApi.ResetPasswordParams) {
  return requestClient.post('/system/auth/reset-password', data);
}

/** 社交授权的跳转 */
export async function socialAuthRedirect(type: number, redirectUri: string) {
  return requestClient.get('/system/auth/social-auth-redirect', {
    params: {
      type,
      redirectUri,
    },
  });
}

/** 社交快捷登录 */
export async function socialLogin(data: AuthApi.SocialLoginParams) {
  return requestClient.post<AuthApi.LoginResult>(
    '/system/auth/social-login',
    data,
  );
}
