import type { AuthPermissionInfo, Recordable, UserInfo } from '@vben/types';

import type { AuthApi } from '#/api';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { ElMessage, ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import {
  getAuthPermissionInfoApi,
  loginApi,
  logoutApi,
  register,
  smsLogin,
  socialLogin,
} from '#/api';
import { $t } from '#/locales';
import { accessRoutes } from '#/router/routes';
import { clearCachedNavigationMenus } from '#/utils/navigationMenuCache';

import { useAccountSetStore } from './account-set';

const ERP_WORKBENCH_PATH = '/erp/workbench';

function getErpPerfState() {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as any;
  win.__ERP_PERF__ ||= {};
  return win.__ERP_PERF__ as Record<string, number>;
}

function markErpPerf(label: string, extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  const now = window.performance?.now?.() ?? Date.now();
  const state = getErpPerfState();
  const loginSuccessAt = state?.loginSuccessAt;
  const firstMarkAt = state?.firstMarkAt ?? now;
  if (state && !state.firstMarkAt) {
    state.firstMarkAt = firstMarkAt;
  }

  console.info('[erp-perf]', label, {
    at: Number(now.toFixed(2)),
    fromFirstMark: Number((now - firstMarkAt).toFixed(2)),
    fromLoginSuccess:
      typeof loginSuccessAt === 'number'
        ? Number((now - loginSuccessAt).toFixed(2))
        : null,
    ...extra,
  });
}

function buildLoginFallbackUrl(redirect: boolean, currentFullPath: string) {
  if (typeof window === 'undefined') {
    return LOGIN_PATH;
  }

  const appBase = String(import.meta.env.VITE_BASE || '/').replace(/\//g, '');
  const base = appBase && appBase !== '/' ? appBase : '';
  const query = redirect
    ? '?redirect=' + encodeURIComponent(encodeURIComponent(currentFullPath))
    : '';
  return base + '/#' + LOGIN_PATH + query;
}

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const accountSetStore = useAccountSetStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const accessLoading = ref(false);

  async function loadAccessInBackground() {
    if (accessStore.isAccessChecked || accessLoading.value) {
      markErpPerf('dynamic access skipped', {
        isAccessChecked: accessStore.isAccessChecked,
        accessLoading: accessLoading.value,
      });
      return;
    }

    const totalStart = window.performance?.now?.() ?? Date.now();
    markErpPerf('dynamic access start');
    accessLoading.value = true;
    try {
      const fetchStart = window.performance?.now?.() ?? Date.now();
      markErpPerf('fetch user/menu start');
      const authPermissionInfo = await fetchUserInfo();
      const fetchEnd = window.performance?.now?.() ?? Date.now();
      markErpPerf('fetch user/menu end', {
        duration: Number((fetchEnd - fetchStart).toFixed(2)),
        menuCount: authPermissionInfo.menus?.length ?? 0,
        permissionCount: authPermissionInfo.permissions?.length ?? 0,
      });

      const userInfo = authPermissionInfo.user;
      const userRoles = userStore.userRoles ?? [];
      const generateStart = window.performance?.now?.() ?? Date.now();
      markErpPerf('generate/register routes start', {
        sourceRouteCount: accessRoutes.length,
        roleCount: userRoles.length,
      });
      const { generateAccess } = await import('../router/access');
      const { accessibleMenus, accessibleRoutes } = await generateAccess({
        roles: userRoles,
        router,
        routes: accessRoutes,
      });
      const generateEnd = window.performance?.now?.() ?? Date.now();
      markErpPerf('generate/register routes end', {
        duration: Number((generateEnd - generateStart).toFixed(2)),
        accessibleMenuCount: accessibleMenus.length,
        accessibleRouteCount: accessibleRoutes.length,
      });

      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setAccessRoutes(accessibleRoutes);
      accessStore.setIsAccessChecked(true);
      userStore.setUserRoles(userRoles);
      markErpPerf('dynamic access store committed', {
        totalDuration: Number(
          ((window.performance?.now?.() ?? Date.now()) - totalStart).toFixed(2),
        ),
      });

      if (userInfo?.nickname) {
        ElNotification.success({
          message: `${$t('authentication.loginSuccessDesc')}:${userInfo?.nickname}`,
          duration: 3,
          title: $t('authentication.loginSuccess'),
        });
      }
    } catch (error) {
      markErpPerf('dynamic access error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('后台权限信息/动态路由加载失败:', error);
    } finally {
      accessLoading.value = false;
      markErpPerf('dynamic access finally');
    }
  }

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param type 登录类型
   * @param params 登录表单数据
   * @param onSuccess 登录成功后的回调函数
   */
  async function authLogin(
    type: 'mobile' | 'register' | 'social' | 'username',
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      let loginResult: AuthApi.LoginResult;
      loginLoading.value = true;
      clearCachedNavigationMenus();
      switch (type) {
        case 'mobile': {
          loginResult = await smsLogin(params as AuthApi.SmsLoginParams);
          break;
        }
        case 'register': {
          loginResult = await register(params as AuthApi.RegisterParams);
          break;
        }
        case 'social': {
          loginResult = await socialLogin(params as AuthApi.SocialLoginParams);
          break;
        }
        default: {
          loginResult = await loginApi(params);
        }
      }
      const { accessToken, refreshToken } = loginResult;

      // 如果成功获取到 accessToken，先进入当前本地首页；动态导航和路由由首页挂载后触发加载。
      if (accessToken) {
        const state = getErpPerfState();
        if (state) {
          state.loginSuccessAt = window.performance?.now?.() ?? Date.now();
          state.firstMarkAt = state.loginSuccessAt;
        }
        markErpPerf('login api success');
        accessStore.setAccessToken(accessToken);
        accessStore.setRefreshToken(refreshToken);
        markErpPerf('token saved');

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else if (onSuccess) {
          markErpPerf('login onSuccess start');
          await onSuccess?.();
          markErpPerf('login onSuccess end');
        } else {
          markErpPerf('router replace workbench start');
          await router.replace(ERP_WORKBENCH_PATH);
          markErpPerf('router replace workbench end');
        }
      }
    } catch (error: any) {
      const message = error?.message || '登录失败，请稍后重试';
      ElMessage.error(message);
      throw error;
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    const accessToken = accessStore.accessToken as null | string;
    const currentFullPath = router.currentRoute.value.fullPath;

    console.info('[auth-logout] start', { currentFullPath, redirect });

    clearCachedNavigationMenus();
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 本地退出必须优先完成，避免本地环境后端退出接口跨域/超时导致无法跳转登录页。
    const loginLocation = {
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(currentFullPath),
          }
        : {},
      replace: true,
    };

    try {
      await router.replace(loginLocation);
      console.info('[auth-logout] router.replace login done', {
        fullPath: router.currentRoute.value.fullPath,
      });
    } catch (error) {
      console.warn(
        '[auth-logout] router.replace login failed, use location fallback',
        error,
      );
      window.location.replace(buildLoginFallbackUrl(redirect, currentFullPath));
      return;
    }

    if (router.currentRoute.value.path !== LOGIN_PATH) {
      console.warn(
        '[auth-logout] current route is not login, use location fallback',
        {
          current: router.currentRoute.value.fullPath,
          expected: LOGIN_PATH,
        },
      );
      window.location.replace(buildLoginFallbackUrl(redirect, currentFullPath));
      return;
    }

    // 后端退出接口仅做后台通知，不阻塞本地清状态和页面跳转。
    if (accessToken) {
      void logoutApi(accessToken).catch((error) => {
        console.warn('后端退出接口调用失败，已完成本地退出:', error);
      });
    }
  }

  async function fetchUserInfo() {
    // 加载
    const authPermissionInfo: AuthPermissionInfo | null =
      await getAuthPermissionInfoApi();

    if (!authPermissionInfo?.user) {
      throw new Error('获取用户信息失败，请重新登录');
    }
    if (
      !Array.isArray(authPermissionInfo.menus) ||
      authPermissionInfo.menus.length === 0
    ) {
      throw new Error('获取导航菜单失败，请重新登录');
    }

    // userStore
    userStore.setUserInfo(authPermissionInfo.user);
    userStore.setUserRoles(authPermissionInfo.roles || []);
    // accessStore
    accessStore.setAccessMenus(authPermissionInfo.menus);
    accessStore.setAccessCodes(authPermissionInfo.permissions || []);

    await accountSetStore.ensureCurrentLoaded(authPermissionInfo.user);

    return authPermissionInfo;
  }

  function $reset() {
    loginLoading.value = false;
    accessLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    accessLoading,
    loadAccessInBackground,
    loginLoading,
    logout,
  };
});
