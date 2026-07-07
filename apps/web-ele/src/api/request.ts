/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { isTenantEnable, useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore, useUserStore } from '@vben/stores';
import { createApiEncrypt } from '@vben/utils';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';
import { clearCachedNavigationMenus } from '#/utils/navigationMenuCache';
import {
  getStoredAccountSetId,
  getStoredAccountSetName,
  getStoredAccountSetUserId,
  resolveAccountSetFromUserInfo,
  setStoredAccountSet,
  setStoredAccountSetUserId,
} from '#/utils/accountSet';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const tenantEnable = isTenantEnable();
const apiEncrypt = createApiEncrypt(import.meta.env);
const AUTH_EXPIRED_MESSAGE_PATTERNS = [
  '令牌已过期',
  'token expired',
  'login expired',
  '未登录',
  '登录已过期',
  '认证失败',
  'Account not logged in',
];

/**
 * 是否启用“将账套信息注入到每一次请求参数”。
 * 通过 Vite env 控制：VITE_ENABLE_ACCOUNT_SET_PARAMS=true 才启用。
 * 默认关闭（undefined/false 都视为关闭）。
 */
const enableAccountSetParams =
  String(import.meta.env.VITE_ENABLE_ACCOUNT_SET_PARAMS ?? '')
    .trim()
    .toLowerCase() === 'true';

/**
 * 将“当前账套”注入到每一次请求参数中（不放到 headers）。
 * - GET/DELETE 等：注入到 config.params
 * - POST/PUT/PATCH 等：优先注入到 config.data
 *
 * 同时写入 camelCase 与 snake_case，便于后端兼容：
 * - accountSetId / account_set_id
 * - accountSetName / account_set_name
 */
function injectAccountSetParams(
  config: any,
  accountSetId: null | string,
  accountSetName: null | string,
) {
  if (!accountSetId) return;

  const payload = {
    accountSetId,
    account_set_id: accountSetId,
    ...(accountSetName
      ? {
          accountSetName,
          account_set_name: accountSetName,
        }
      : {}),
  };

  const method = String(config?.method || 'get').toLowerCase();

  // 1) 优先处理显式 params（常用于 GET/DELETE）
  const shouldPutInParams =
    method === 'get' || method === 'delete' || method === 'head';

  if (shouldPutInParams || config?.params) {
    const current =
      config.params && typeof config.params === 'object' ? config.params : {};
    config.params = { ...current, ...payload };
    return;
  }

  // 2) 处理 data（POST/PUT/PATCH）
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // 避免重复 append
    if (!config.data.has('accountSetId')) {
      config.data.append('accountSetId', accountSetId);
    }
    if (!config.data.has('account_set_id')) {
      config.data.append('account_set_id', accountSetId);
    }
    if (accountSetName) {
      if (!config.data.has('accountSetName')) {
        config.data.append('accountSetName', accountSetName);
      }
      if (!config.data.has('account_set_name')) {
        config.data.append('account_set_name', accountSetName);
      }
    }
    return;
  }

  if (
    config.data &&
    typeof config.data === 'object' &&
    !Array.isArray(config.data)
  ) {
    config.data = { ...config.data, ...payload };
    return;
  }

  // 3) 没有合适的载体时兜底放到 params
  const currentParams =
    config.params && typeof config.params === 'object' ? config.params : {};
  config.params = { ...currentParams, ...payload };
}

function isAuthExpiredResponse(payload: any, response?: any) {
  const code = payload?.code ?? payload?.Code ?? response?.status ?? null;
  const message = String(
    payload?.message ?? payload?.Message ?? payload?.msg ?? payload?.error ?? '',
  ).toLowerCase();

  if (code === 401 || code === '401') {
    return true;
  }

  return AUTH_EXPIRED_MESSAGE_PATTERNS.some((pattern) =>
    message.includes(pattern.toLowerCase()),
  );
}

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    timeout: 15_000,
  });
  let isHandlingAuthExpired = false;

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    clearCachedNavigationMenus();
    accessStore.setAccessToken(null);
    await authStore.logout();
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const refreshToken = accessStore.refreshToken as string;
    if (!refreshToken) {
      throw new Error('Refresh token is null!');
    }
    const resp = await refreshTokenApi(
      accessStore.accessToken as string,
      refreshToken,
    );
    const newToken = resp; // resp?.data?.data?.accessToken;
    // add by 芋艿：这里一定要抛出 resp.data，从而触发 authenticateResponseInterceptor 中，刷新令牌失败！！！
    if (!newToken) {
      throw (resp as any)?.data;
    }
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      // 添加租户编号
      config.headers['tenant-id'] = tenantEnable
        ? accessStore.tenantId
        : undefined;
      // 只有登录时，才设置 visit-tenant-id 访问租户
      config.headers['visit-tenant-id'] = tenantEnable
        ? accessStore.visitTenantId
        : undefined;

      const userStore = useUserStore();
      const currentUserId = userStore.userInfo?.id
        ? String(userStore.userInfo.id)
        : null;
      const storedUserId = getStoredAccountSetUserId();

      if (currentUserId && storedUserId && storedUserId !== currentUserId) {
        setStoredAccountSet(null, null);
      }
      if (currentUserId && storedUserId !== currentUserId) {
        setStoredAccountSetUserId(currentUserId);
      }

      const storedAccountSetId = getStoredAccountSetId();
      const storedAccountSetName = getStoredAccountSetName();
      const resolvedFromUser = resolveAccountSetFromUserInfo(
        userStore.userInfo,
      );
      const accountSetId = storedAccountSetId || resolvedFromUser?.id || null;

      if (!storedAccountSetId && resolvedFromUser?.id) {
        setStoredAccountSet(resolvedFromUser.id, resolvedFromUser.name);
      }

      // ✅ 通过 env 控制：仅在开启时才注入账套参数（默认关闭）
      if (enableAccountSetParams) {
        injectAccountSetParams(
          config,
          accountSetId,
          storedAccountSetName || resolvedFromUser?.name || null,
        );
      }

      // 是否 API 加密
      if ((config.headers || {}).isEncrypt) {
        try {
          // 加密请求数据
          if (config.data) {
            config.data = apiEncrypt.encryptRequest(config.data);
            // 设置加密标识头
            config.headers[apiEncrypt.getEncryptHeader()] = 'true';
          }
        } catch (error) {
          console.error('请求数据加密失败:', error);
          throw error;
        }
      }
      return config;
    },
  });

  // API 解密响应拦截器
  client.addResponseInterceptor({
    fulfilled: (response) => {
      // 检查是否需要解密响应数据
      const encryptHeader = apiEncrypt.getEncryptHeader();
      const isEncryptResponse =
        response.headers[encryptHeader] === 'true' ||
        response.headers[encryptHeader.toLowerCase()] === 'true';
      if (isEncryptResponse && typeof response.data === 'string') {
        try {
          // 解密响应数据
          response.data = apiEncrypt.decryptResponse(response.data);
        } catch (error) {
          console.error('响应数据解密失败:', error);
          throw new Error(`响应数据解密失败: ${(error as Error).message}`);
        }
      }
      return response;
    },
  });

  // 处理返回的响应数据格式
  // 兼容后端不同命名：在 defaultResponseInterceptor 之前标准化响应结构
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const raw = response.data ?? {};
      const isBlobResponse = typeof Blob !== 'undefined' && raw instanceof Blob;
      // 标准化响应到小写字段，便于后续统一处理。
      // 下载接口 responseType=blob 时，后端返回值本身就是 Blob；这里必须标记为成功，
      // 否则 defaultResponseInterceptor 会把 Blob 包成 { code, data, raw, Result } 对象，
      // 传给 downloadFileFromBlobPart 后会保存成损坏文件。
      const normalized = isBlobResponse
        ? {
            code: 200,
            data: raw,
            message: '',
            raw,
            Result: raw,
          }
        : {
            code: raw?.Code ?? raw?.code ?? raw?.Status ?? raw?.status ?? null,
            data: raw?.Result ?? raw?.data ?? raw,
            message: raw?.Message ?? raw?.message ?? raw?.msg ?? '',
            raw,
            Result: raw?.Result ?? raw?.data ?? raw,
          } as any;

      const okValues = [
        200,
        '200',
        0,
        '0',
        'ok',
        'OK',
        'success',
        'Success',
        true,
      ];

      if (okValues.includes(normalized.code)) {
        normalized.code = 200;
      }

      response.data = normalized;
      return response;
    },
  });

  // 统一处理业务401 / 令牌已过期，直接回到登录页
  client.addResponseInterceptor({
    fulfilled: async (response) => {
      if (!isAuthExpiredResponse(response.data, response)) {
        return response;
      }

      if (!isHandlingAuthExpired) {
        isHandlingAuthExpired = true;
        try {
          await doReAuthenticate();
        } finally {
          isHandlingAuthExpired = false;
        }
      }

      const error: any = new Error(
        response.data?.message || '登录状态已过期，请重新登录',
      );
      error.response = response;
      error.config = response.config;
      throw error;
    },
  });

  // 使用标准化后的字段进行默认响应处理
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 200,
    }),
  );

  // add by 芋艿：解决 responseReturn: 'raw' 时，不触发 401 刷新 token 的问题
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const { data } = response;
      const code = data?.code ?? data?.Code ?? response.status;
      if (code === 401) {
        const error: any = new Error('Account not logged in');
        error.response = response;
        error.config = response.config;
        throw error;
      }
      return response;
    },
  });

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? error?.data ?? {};
      const errorCode =
        responseData?.code ??
        responseData?.Code ??
        error?.response?.status ??
        null;
      if (errorCode === 401) return;

      const raw = responseData?.raw ?? responseData;
      const errorMessage =
        responseData?.Message ??
        responseData?.message ??
        responseData?.msg ??
        responseData?.error ??
        responseData?.repMsg ??
        raw?.Message ??
        raw?.message ??
        raw?.msg ??
        raw?.error ??
        raw?.repMsg ??
        error?.message ??
        msg;
      ElMessage.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({
  baseURL: apiURL,
  timeout: 15_000,
});
baseRequestClient.addRequestInterceptor({
  fulfilled: (config) => {
    const accessStore = useAccessStore();
    // 添加租户编号
    config.headers['tenant-id'] = tenantEnable
      ? accessStore.tenantId
      : undefined;
    // 只有登录时，才设置 visit-tenant-id 访问租户
    config.headers['visit-tenant-id'] = tenantEnable
      ? accessStore.visitTenantId
      : undefined;

    const userStore = useUserStore();
    const currentUserId = userStore.userInfo?.id
      ? String(userStore.userInfo.id)
      : null;
    const storedUserId = getStoredAccountSetUserId();

    if (currentUserId && storedUserId && storedUserId !== currentUserId) {
      setStoredAccountSet(null, null);
    }
    if (currentUserId && storedUserId !== currentUserId) {
      setStoredAccountSetUserId(currentUserId);
    }

    const storedAccountSetId = getStoredAccountSetId();
    const storedAccountSetName = getStoredAccountSetName();
    const resolvedFromUser = resolveAccountSetFromUserInfo(userStore.userInfo);
    const accountSetId = storedAccountSetId || resolvedFromUser?.id || null;

    if (!storedAccountSetId && resolvedFromUser?.id) {
      setStoredAccountSet(resolvedFromUser.id, resolvedFromUser.name);
    }

    // ✅ 通过 env 控制：仅在开启时才注入账套参数（默认关闭）
    if (enableAccountSetParams) {
      injectAccountSetParams(
        config,
        accountSetId,
        storedAccountSetName || resolvedFromUser?.name || null,
      );
    }

    return config;
  },
});