import type { ComputedRef } from 'vue';

import type { MenuRecordRaw } from '@vben/types';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { preferences } from '@vben/preferences';
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

function useExtraMenu(useRootMenus?: ComputedRef<MenuRecordRaw[]>) {
  const accessStore = useAccessStore();
  const { navigation, willOpenedByWindow } = useNavigation();

  const menus = computed(() => useRootMenus?.value ?? accessStore.accessMenus);

  const defaultSubMap = new Map<string, string>();
  const extraRootMenus = ref<MenuRecordRaw[]>([]);
  const route = useRoute();
  const extraMenus = ref<MenuRecordRaw[]>([]);
  const sidebarExtraVisible = ref<boolean>(false);
  const extraActiveMenu = ref('');
  const parentLevel = computed(() =>
    preferences.app.layout === 'header-mixed-nav' ? 1 : 0,
  );

  const handleMixedMenuSelect = async (menu: MenuRecordRaw) => {
    const nextExtraMenus = (menu?.children || []) as MenuRecordRaw[];
    const hasChildren = nextExtraMenus.length > 0;

    if (!willOpenedByWindow(menu.path)) {
      extraMenus.value = nextExtraMenus;
      extraActiveMenu.value = menu.parents?.[parentLevel.value] ?? menu.path;
      sidebarExtraVisible.value = hasChildren;
    }

    if (!hasChildren) {
      await navigation(menu.path);
    } else if (preferences.navigation.autoActivateChild) {
      await navigation(
        defaultSubMap.has(menu.path)
          ? (defaultSubMap.get(menu.path) as string)
          : menu.path,
      );
    }
  };

  const handleDefaultSelect = async (
    menu: MenuRecordRaw,
    rootMenu?: MenuRecordRaw,
  ) => {
    extraMenus.value = ((rootMenu?.children || extraRootMenus.value) as MenuRecordRaw[]) || [];
    extraActiveMenu.value = menu.parents?.[parentLevel.value] ?? menu.path;

    if (preferences.sidebar.expandOnHover) {
      sidebarExtraVisible.value = extraMenus.value.length > 0;
    }
  };

  const handleSideMouseLeave = () => {
    if (preferences.sidebar.expandOnHover) {
      return;
    }

    calcExtraMenus(route.path);
  };

  const handleMenuMouseEnter = (menu: MenuRecordRaw) => {
    if (!preferences.sidebar.expandOnHover) {
      extraMenus.value = ((menu.children || []) as MenuRecordRaw[]) || [];
      extraActiveMenu.value = menu.parents?.[parentLevel.value] ?? menu.path;
      sidebarExtraVisible.value = extraMenus.value.length > 0;
    }
  };

  function calcExtraMenus(path: string) {
    const currentPath = normalizeMenuPath((route.meta?.activePath as string) || path);
    const matchedChain = findMatchedChain(menus.value, currentPath);
    const targetIndex = parentLevel.value;
    const rootMenu = matchedChain[targetIndex] || null;
    const nextMenu = matchedChain[targetIndex + 1] || null;

    extraRootMenus.value = ((rootMenu?.children || []) as MenuRecordRaw[]) || [];
    if (rootMenu?.path) {
      defaultSubMap.set(rootMenu.path, currentPath);
    }
    extraActiveMenu.value = rootMenu?.path ?? nextMenu?.path ?? '';
    extraMenus.value = ((rootMenu?.children || []) as MenuRecordRaw[]) || [];
    if (preferences.sidebar.expandOnHover) {
      sidebarExtraVisible.value = extraMenus.value.length > 0;
    }
  }

  watch(
    () => [route.path, preferences.app.layout, menus.value],
    ([path]) => {
      calcExtraMenus(path || '');
    },
    { immediate: true, deep: true },
  );

  return {
    extraActiveMenu,
    extraMenus,
    handleDefaultSelect,
    handleMenuMouseEnter,
    handleMixedMenuSelect,
    handleSideMouseLeave,
    sidebarExtraVisible,
  };
}

export { useExtraMenu };
