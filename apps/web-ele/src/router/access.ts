import type {
  AppRouteRecordRaw,
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { convertServerMenuToRouteRecordStringComponent } from '@vben/utils';

import { BasicLayout, IFrameView } from '#/layouts';
import { componentKeys } from '#/router/routes';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

function isHttpUrl(url = '') {
  return /^https?:\/\//i.test(url);
}

function normalizePath(path = '') {
  if (!path) return '';

  let normalized = String(path)
    .trim()
    .replace(/\\/g, '/')
    .replace(/[?#].*$/, '');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/+/g, '/');

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/$/, '');
  }

  return normalized.toLowerCase();
}

const validComponentKeySet = new Set(
  componentKeys.map((item) => normalizePath(item)),
);

function resolveMenuPath(path = '', parent = '') {
  const normalizedParent = normalizePath(parent);
  const normalizedPath = normalizePath(path);

  if (!normalizedParent || normalizedPath === '/') {
    return normalizedPath;
  }

  if (
    normalizedPath === normalizedParent ||
    normalizedPath.startsWith(`${normalizedParent}/`)
  ) {
    return normalizedPath;
  }

  return normalizePath(`${normalizedParent}/${normalizedPath}`);
}

function resolveMenuComponent(
  menu: AppRouteRecordRaw,
  parent = '',
  hasChildren = false,
) {
  let component = (menu.component || '') as string;

  if (component === 'Layout') {
    component = 'BasicLayout';
  }

  if (hasChildren && String(menu.parentId) === '0') {
    component = 'BasicLayout';
  } else if (hasChildren && String(menu.parentId) !== '0') {
    component = '';
  }

  if (component && parent && !isHttpUrl(component)) {
    const comp = component.replace(/^\/+/, '');
    const parentNoSlash = parent.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!comp.startsWith(parentNoSlash)) {
      component = `${parent}/${comp}`;
    } else {
      component = comp;
    }
  }

  return component;
}

function hasRealPageComponent(
  menu: AppRouteRecordRaw,
  parentPath = '',
  children: AppRouteRecordRaw[] = [],
) {
  const hasChildren = children.length > 0;
  const resolvedComponent = resolveMenuComponent(menu, parentPath, hasChildren);

  if (!resolvedComponent) {
    return false;
  }

  if (resolvedComponent === 'BasicLayout' || resolvedComponent === 'IFrameView') {
    return false;
  }

  return validComponentKeySet.has(normalizePath(resolvedComponent));
}

function filterMenusByRealPage(
  menus: AppRouteRecordRaw[] = [],
  parentPath = '',
): AppRouteRecordRaw[] {
  return menus
    .map((menu) => {
      const currentPath = resolveMenuPath(menu.path || '', parentPath);
      const originalChildren = (menu.children as AppRouteRecordRaw[]) || [];
      const children = filterMenusByRealPage(originalChildren, currentPath);

      const selfHasPage = hasRealPageComponent(menu, parentPath, children);
      const hasValidDescendant = children.length > 0;

      // 只有当前节点自己也没有真实页面，且子孙链里也没有真实页面时，才整棵隐藏
      if (!selfHasPage && !hasValidDescendant) {
        return null;
      }

      // 只裁剪 children，不改写 path。convertServerMenuToRouteRecordStringComponent 会按原始父子结构生成路由；
      // 如果这里提前改成完整路径，会导致父子路径被二次拼接，快速切换或刷新时命中 404。
      return {
        ...menu,
        children,
      };
    })
    .filter(Boolean) as AppRouteRecordRaw[];
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');
  const accessStore = useAccessStore();

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      const accessMenus = accessStore.accessMenus as AppRouteRecordRaw[];
      const filteredMenus = filterMenusByRealPage(accessMenus);
      return convertServerMenuToRouteRecordStringComponent(filteredMenus);
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
