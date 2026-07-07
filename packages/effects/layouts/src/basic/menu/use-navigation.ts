import type { RouteRecordNormalized } from 'vue-router';

import { useRouter } from 'vue-router';

import { isHttpUrl, openRouteInNewWindow, openWindow } from '@vben/utils';

function normalizeHrRuntimePath(path: string) {
  if (!path || typeof path !== 'string') return path;
  if (path === '/hr') return '/erp/hr';
  if (path.startsWith('/hr/')) return `/erp${path}`;
  return path;
}

function resolveRoutePath(path: string, routeMetaMap: Map<string, RouteRecordNormalized>) {
  if (routeMetaMap.has(path)) {
    return path;
  }

  const runtimePath = normalizeHrRuntimePath(path);
  if (routeMetaMap.has(runtimePath)) {
    return runtimePath;
  }

  return path;
}

function useNavigation() {
  const router = useRouter();
  const routeMetaMap = new Map<string, RouteRecordNormalized>();

  const initRouteMetaMap = () => {
    const routes = router.getRoutes();
    routes.forEach((route) => {
      routeMetaMap.set(route.path, route);
    });
  };

  initRouteMetaMap();

  router.afterEach(() => {
    initRouteMetaMap();
  });

  const shouldOpenInNewWindow = (path: string): boolean => {
    if (isHttpUrl(path)) {
      return true;
    }
    const resolvedPath = resolveRoutePath(path, routeMetaMap);
    const route = routeMetaMap.get(resolvedPath);
    return !!(route?.meta?.link || route?.meta?.openInNewWindow);
  };

  const resolveHref = (path: string): string => {
    const resolvedPath = resolveRoutePath(path, routeMetaMap);
    return router.resolve(resolvedPath).href;
  };

  const navigation = async (path: string) => {
    try {
      const resolvedPath = resolveRoutePath(path, routeMetaMap);
      const route = routeMetaMap.get(resolvedPath);
      const { openInNewWindow = false, query = {}, link } = route?.meta ?? {};

      if (link && typeof link === 'string') {
        openWindow(link, { target: '_blank' });
        return;
      }

      if (isHttpUrl(path)) {
        openWindow(path, { target: '_blank' });
      } else if (openInNewWindow) {
        openRouteInNewWindow(resolveHref(resolvedPath));
      } else {
        await router.push({
          path: resolvedPath,
          query,
        });
      }
    } catch (error) {
      console.error('Navigation failed:', error);
      throw error;
    }
  };

  const willOpenedByWindow = (path: string) => {
    return shouldOpenInNewWindow(path);
  };

  return { navigation, willOpenedByWindow };
}

export { useNavigation };
