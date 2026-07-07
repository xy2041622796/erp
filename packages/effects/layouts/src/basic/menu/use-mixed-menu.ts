import type { ComputedRef } from 'vue';

import type { MenuRecordRaw } from '@vben/types';

import { computed, onBeforeMount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { useNavigation } from './use-navigation';

function normalizeMenuPath(path: string) {
  if (!path || typeof path !== 'string') return '';
  if (path === '/erp/hr') return '/hr';
  if (path.startsWith('/erp/hr/')) {
    return path.replace(/^\/erp\/hr(?=\/|$)/, '/hr');
  }
  return path;
}

function isPathMatch(currentPath: string, menuPath: string) {
  const current = normalizeMenuPath(currentPath);
  const menu = normalizeMenuPath(menuPath);
  if (!current || !menu) return false;
  return current === menu || current.startsWith(`${menu}/`);
}

function findMatchedChain(
  menus: MenuRecordRaw[] = [],
  currentPath: string,
  parents: MenuRecordRaw[] = [],
): MenuRecordRaw[] {
  for (const item of menus) {
    const chain = [...parents, item];
    const children = (item.children || []) as MenuRecordRaw[];

    if (children.length > 0) {
      const childMatched = findMatchedChain(children, currentPath, chain);
      if (childMatched.length > 0) {
        return childMatched;
      }
    }

    if (isPathMatch(currentPath, item.path || '')) {
      return chain;
    }
  }

  return [];
}

function findMenuByExactPath(
  menus: MenuRecordRaw[] = [],
  targetPath: string,
): MenuRecordRaw | null {
  const normalizedTargetPath = normalizeMenuPath(targetPath);

  for (const item of menus) {
    if (normalizeMenuPath(item.path || '') === normalizedTargetPath) {
      return item;
    }

    const childFound = findMenuByExactPath(
      (item.children || []) as MenuRecordRaw[],
      targetPath,
    );
    if (childFound) {
      return childFound;
    }
  }

  return null;
}

function findFirstLeafPath(menu: MenuRecordRaw | null): string {
  if (!menu) {
    return '';
  }

  const children = (menu.children || []) as MenuRecordRaw[];
  if (children.length === 0) {
    return menu.path || '';
  }

  for (const child of children) {
    const childLeafPath = findFirstLeafPath(child);
    if (childLeafPath) {
      return childLeafPath;
    }
  }

  return menu.path || '';
}

function resolveDefaultLeafPath(
  menus: MenuRecordRaw[] = [],
  key: string,
  defaultSubMap?: Map<string, string>,
) {
  if (defaultSubMap?.has(key)) {
    return defaultSubMap.get(key) as string;
  }

  const currentMenu = findMenuByExactPath(menus, key);
  return findFirstLeafPath(currentMenu) || key;
}

function hasChildMenus(menus: MenuRecordRaw[] = [], key: string) {
  const currentMenu = findMenuByExactPath(menus, key);
  return ((currentMenu?.children || []) as MenuRecordRaw[]).length > 0;
}

function useMixedMenu(useRootMenus?: ComputedRef<MenuRecordRaw[]>) {
  const { navigation, willOpenedByWindow } = useNavigation();
  const accessStore = useAccessStore();
  const route = useRoute();
  const splitSideMenus = ref<MenuRecordRaw[]>([]);
  const rootMenuPath = ref<string>('');
  const mixedRootMenuPath = ref<string>('');
  const mixExtraMenus = ref<MenuRecordRaw[]>([]);
  const defaultSubMap = new Map<string, string>();
  const { isMixedNav, isHeaderMixedNav } = usePreferences();

  const needSplit = computed(
    () =>
      (preferences.navigation.split && isMixedNav.value) ||
      isHeaderMixedNav.value,
  );

  const sidebarVisible = computed(() => {
    const enableSidebar = preferences.sidebar.enable;
    if (needSplit.value) {
      return enableSidebar && splitSideMenus.value.length > 0;
    }
    return enableSidebar;
  });
  const menus = computed(() => useRootMenus?.value ?? accessStore.accessMenus);

  const headerMenus = computed(() => {
    if (!needSplit.value) {
      return menus.value;
    }
    return menus.value.map((item) => ({
      ...item,
      children: [],
    }));
  });

  const sidebarMenus = computed(() => {
    return needSplit.value ? splitSideMenus.value : menus.value;
  });

  const mixHeaderMenus = computed(() => {
    return isHeaderMixedNav.value ? sidebarMenus.value : headerMenus.value;
  });

  const sidebarActive = computed(() => {
    return (route?.meta?.activePath as string) ?? route.path;
  });

  const headerActive = computed(() => {
    if (!needSplit.value) {
      return route.meta?.activePath ?? route.path;
    }
    return rootMenuPath.value;
  });

  const handleMenuSelect = (key: string, mode?: string) => {
    const autoActivateChild = preferences.navigation.autoActivateChild;

    if (!needSplit.value || mode === 'vertical') {
      if (!autoActivateChild && hasChildMenus(menus.value, key)) {
        return;
      }
      navigation(
        autoActivateChild
          ? resolveDefaultLeafPath(menus.value, key, defaultSubMap)
          : key,
      );
      return;
    }

    const rootMenu = menus.value.find((item) => item.path === key);
    const nextSideMenus = (rootMenu?.children || []) as MenuRecordRaw[];

    if (!willOpenedByWindow(key)) {
      rootMenuPath.value = rootMenu?.path ?? '';
      splitSideMenus.value = nextSideMenus;
    }

    if (nextSideMenus.length === 0) {
      navigation(key);
    } else if (rootMenu && autoActivateChild) {
      navigation(resolveDefaultLeafPath(menus.value, rootMenu.path, defaultSubMap));
    }
  };

  const handleMenuOpen = (key: string, parentsPath: string[]) => {
    if (parentsPath.length <= 1 && preferences.navigation.autoActivateChild) {
      navigation(resolveDefaultLeafPath(menus.value, key, defaultSubMap));
    }
  };

  function calcSideMenus(path: string = route.path) {
    const currentPath = normalizeMenuPath(path);
    const matchedChain = findMatchedChain(menus.value, currentPath);
    const rootMenu = matchedChain[0] || null;
    const secondLevelMenu = matchedChain[1] || null;

    rootMenuPath.value = rootMenu?.path ?? '';
    splitSideMenus.value = ((rootMenu?.children || []) as MenuRecordRaw[]) || [];
    mixedRootMenuPath.value = secondLevelMenu?.path ?? '';
    mixExtraMenus.value = ((secondLevelMenu?.children || []) as MenuRecordRaw[]) || [];
  }

  watch(
    () => [route.path, menus.value],
    ([path]) => {
      const currentPath = (route?.meta?.activePath as string) ?? (route?.meta?.link as string) ?? path;
      if (willOpenedByWindow(currentPath)) {
        return;
      }
      calcSideMenus(currentPath);
      if (rootMenuPath.value) {
        defaultSubMap.set(rootMenuPath.value, normalizeMenuPath(currentPath));
      }
    },
    { immediate: true, deep: true },
  );

  onBeforeMount(() => {
    calcSideMenus((route.meta?.activePath as string) || route.path);
  });

  return {
    handleMenuSelect,
    handleMenuOpen,
    headerActive,
    headerMenus,
    sidebarActive,
    sidebarMenus,
    mixHeaderMenus,
    mixExtraMenus,
    sidebarVisible,
  };
}

export { useMixedMenu };
