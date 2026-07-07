import type { RouteRecordRaw } from 'vue-router';

import { h } from 'vue';
import { RouterView } from 'vue-router';

import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben-core/typings';

import { mapTree } from '@vben-core/shared/utils';

/**
 * 动态生成路由 - 后端方式
 */
async function generateRoutesByBackend(
  options: GenerateMenuAndRoutesOptions,
): Promise<RouteRecordRaw[]> {
  const { fetchMenuListAsync, layoutMap = {}, pageMap = {} } = options;

  try {
    const menuRoutes = await fetchMenuListAsync?.();
    if (!menuRoutes) {
      return [];
    }

    const normalizePageMap: ComponentRecordType = {};

    for (const [key, value] of Object.entries(pageMap)) {
      normalizePageMap[normalizeViewPath(key)] = value;
    }

    const routes = convertRoutes(menuRoutes, layoutMap, normalizePageMap);

    // add by 芋艿：合并静态路由和动态路由
    return [...options.routes, ...routes];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const NestedRouteView = {
  name: 'NestedRouteView',
  render: () => h(RouterView),
};

function convertRoutes(
  routes: RouteRecordStringComponent[],
  layoutMap: ComponentRecordType,
  pageMap: ComponentRecordType,
): RouteRecordRaw[] {
  return mapTree(routes, (node) => {
    const route = node as unknown as RouteRecordRaw;
    const { component, name } = node;

    if (!name) {
      console.error('route name is required', route);
    }

    // layout转换
    if (component && layoutMap[component]) {
      route.component = layoutMap[component];
      // 页面组件转换
    } else if (component) {
      const normalizePath = normalizeViewPath(component);
      // 尝试多种候选路径以兼容不同的页面目录结构
      const candidateKeys = [
        normalizePath.endsWith('.vue') ? normalizePath : `${normalizePath}.vue`,
        `${normalizePath}/index.vue`,
        normalizePath.endsWith('/index')
          ? `${normalizePath.replace(/\/index$/, '')}.vue`
          : undefined,
      ].filter(Boolean) as string[];

      let foundKey: string | undefined;
      for (const key of candidateKeys) {
        if (pageMap[key]) {
          foundKey = key;
          break;
        }
      }

      if (foundKey) {
        const loader = pageMap[foundKey];
        // 包装 loader 确保返回 default（兼容不同的打包/导出方式），并捕获加载错误
        route.component = async () => {
          try {
            const mod = await (loader as any)();
            return (mod && (mod as any).default) ? (mod as any).default : mod;
          } catch (e) {
            console.error(`Failed to load component ${foundKey}`, e, route);
            // 尝试返回 not-found 作为兜底
            const fallback = pageMap['/_core/fallback/not-found.vue'];
            if (fallback) {
              const fm = await (fallback as any)();
              return (fm && (fm as any).default) ? (fm as any).default : fm;
            }
            return undefined;
          }
        };
        // 记录解析出的组件路径，便于排查
        (route.meta ??= {} as any).__componentPath = foundKey;
      } else {
        console.error(`route component is invalid: attempted ${candidateKeys.join(', ')}`, route);
        route.component = pageMap['/_core/fallback/not-found.vue'];
      }
    }

    // 当没有 component 且存在子路由时，补 RouterView 占位，避免嵌套路由父节点渲染为空组件
    if (!route.component && route.children && route.children.length > 0) {
      route.component = NestedRouteView;
    }

    // 当没有 component 且为叶子节点时，使用后备视图，避免 RouterView 中拿到 undefined 导致报错
    if (!route.component && (!route.children || route.children.length === 0)) {
      if (pageMap['/_core/fallback/not-found.vue']) {
        route.component = pageMap['/_core/fallback/not-found.vue'];
        console.warn('route component is missing, using fallback not-found view', route);
      } else {
        console.error('fallback view not found, route may render undefined', route);
      }
    }

    return route;
  });
}

function normalizeViewPath(path: string): string {
  // 去除相对路径前缀
  const normalizedPath = path.replace(/^(\.\/|\.\.\/)+/, '');

  // 确保路径以 '/' 开头
  const viewPath = normalizedPath.startsWith('/')
    ? normalizedPath
    : `/${normalizedPath}`;

  // 这里耦合了vben-admin的目录结构
  return viewPath.replace(/^\/views/, '');
}
export { generateRoutesByBackend };
