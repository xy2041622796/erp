import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { ElMessage } from 'element-plus';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';
import {
  clearStoredModuleScope,
  getStoredModuleScope,
  MODULE_SCOPE_QUERY_KEY,
  normalizeModuleScope,
  setStoredModuleScope,
} from '#/utils/module-scope';


const FALLBACK_NOT_FOUND_ROUTE_NAME = 'FallbackNotFound';
const ERP_WORKBENCH_PATH = '/erp/workbench';

async function waitUntilRouteReady(
  router: Router,
  targetPath: string,
  maxRetries = 20,
) {
  let lastResolved = router.resolve(targetPath);

  for (let i = 0; i < maxRetries; i++) {
    await Promise.resolve();

    lastResolved = router.resolve(targetPath);
    const matched = lastResolved.matched || [];
    const hasRealMatch =
      matched.length > 0 &&
      !matched.some(
        (route) => String(route.name ?? '') === FALLBACK_NOT_FOUND_ROUTE_NAME,
      );

    if (hasRealMatch) {
      return lastResolved;
    }
  }

  return lastResolved;
}

function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);

    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    const incomingScope = normalizeModuleScope(to.query?.[MODULE_SCOPE_QUERY_KEY]);
    if (incomingScope) {
      setStoredModuleScope(incomingScope);
    } else if (to.path === LOGIN_PATH) {
      clearStoredModuleScope();
    } else {
      const storedScope = getStoredModuleScope();
      if (storedScope) {
        return {
          path: to.path,
          query: {
            ...to.query,
            [MODULE_SCOPE_QUERY_KEY]: storedScope,
          },
          hash: to.hash,
          replace: true,
        };
      }
    }

    if (to.path === ERP_WORKBENCH_PATH) {
      if (!accessStore.accessToken) {
        return {
          path: LOGIN_PATH,
          query: { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }

      return true;
    }

    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return {
          path: ERP_WORKBENCH_PATH,
          replace: true,
        };
      }
      return true;
    }

    if (!accessStore.accessToken) {
      if (to.meta.ignoreAccess) {
        return true;
      }

      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
      return to;
    }

    if (accessStore.isAccessChecked) {
      return true;
    }

    let userInfo = userStore.userInfo;
    if (!userInfo) {
      const message = ElMessage({
        message: `${$t('common.loadingMenu')}...`,
        type: 'success',
        plain: true,
      });
      try {
        const authPermissionInfo = await authStore.fetchUserInfo();
        if (authPermissionInfo) {
          userInfo = authPermissionInfo.user;
        }
      } catch (error) {
        console.error('权限信息加载失败，返回登录页:', error);
        accessStore.setAccessToken(null);
        accessStore.setRefreshToken(null);
        accessStore.setIsAccessChecked(false);

        return {
          path: LOGIN_PATH,
          query:
            to.fullPath === LOGIN_PATH
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      } finally {
        message.close();
      }
    }
    const userRoles = userStore.userRoles ?? [];

    const { generateAccess } = await import('./access');
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      routes: accessRoutes,
    });

    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
    userStore.setUserRoles(userRoles);
    const redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath || to.path === '/'
        ? ERP_WORKBENCH_PATH
        : to.fullPath)) as string;

    const resolvedTarget = await waitUntilRouteReady(
      router,
      decodeURIComponent(redirectPath),
    );

    return {
      ...resolvedTarget,
      replace: true,
    };
  });
}

function createRouterGuard(router: Router) {
  setupCommonGuard(router);
  setupAccessGuard(router);
}

export { createRouterGuard };
