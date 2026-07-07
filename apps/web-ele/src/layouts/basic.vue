<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';
import type { MenuRecordRaw } from '@vben/types';

import type { BilAccountSetApi } from '#/api/erp/finance/settings/accountset';
import type { SystemTenantApi } from '#/api/system/tenant';
import type { ModuleScope } from '#/utils/module-scope';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { AuthenticationLoginExpiredModal, useVbenModal } from '@vben/common-ui';
import { isTenantEnable, useTabs, useWatermark } from '@vben/hooks';
import { AntdProfileOutlined, CircleHelp } from '@vben/icons';
import {
  BasicLayout,
  Help,
  LockScreen,
  Notification,
  TenantDropdown,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';

import { House } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import { getTenantSimpleList } from '#/api/core/auth';
import { getAccountSet } from '#/api/erp/finance/settings/accountset';
import {
  getUnreadNotifyMessageCount,
  getUnreadNotifyMessageList,
  updateAllNotifyMessageRead,
  updateNotifyMessageRead,
} from '#/api/system/notify/message';
import { getSimpleTenantList } from '#/api/system/tenant';
import { AccountSetDropdown } from '#/components/account-set';
import { $t } from '#/locales';
import { router } from '#/router';
import { useAccountSetStore, useAuthStore } from '#/store';
import {
  clearStoredModuleScope,
  filterMenusByModuleScope,
  filterWorkbenchMenus,
  getStoredModuleScope,
  normalizeModuleScope,
} from '#/utils/module-scope';
import LoginForm from '#/views/_core/authentication/login.vue';

const GLOBAL_WORKBENCH_PATH = '/erp/workbench';

const MODULE_SCOPE_MATCHERS: Record<ModuleScope, string[]> = {
  archives: ['/archives'],
  contract: ['/contract'],
  project: ['/project', '/erp/project'],
  hr: ['/erp/hr', '/hr'],
  oa: ['/oa'],
  supply: [
    '/erp/client',
    '/erp/sale',
    '/erp/purchase',
    '/erp/stock',
    '/erp/inventory-accounting',
    '/erp/product',
    '/erp/basic_data',
  ],
  finance: ['/finance'],
  system: ['/managementsys'],
};

const MODULE_ROOT_PATHS: Record<ModuleScope, string> = {
  archives: '/archives',
  contract: '/contract',
  project: '/project',
  hr: '/hr',
  oa: '/oa',
  supply: '/erp',
  finance: '/finance',
  system: '/managementsys',
};

const MODULE_WORKBENCH_CONFIG: Record<
  ModuleScope,
  { icon?: string; path: string; title: string }
> = {
  archives: {
    path: '/archives/data-management',
    title: '首页',
    icon: 'lucide:folder-archive',
  },
  contract: {
    path: '/contract/dashboard',
    title: '首页',
    icon: 'lucide:file-signature',
  },
  project: {
    path: '/project/dashboard',
    title: '首页',
    icon: 'lucide:folder-kanban',
  },
  hr: {
    path: '/erp/hr/workbench',
    title: '首页',
    icon: 'lucide:users',
  },
  oa: {
    path: '/oa/workbench',
    title: '首页',
    icon: 'lucide:briefcase',
  },
  supply: {
    path: '/erp/purchase/workbench',
    title: '首页',
    icon: 'lucide:package',
  },
  finance: {
    path: '/finance/workbench',
    title: '首页',
    icon: 'lucide:wallet',
  },
  system: {
    path: '/managementsys/workbench',
    title: '首页',
    icon: 'lucide:settings',
  },
};

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const accountSetStore = useAccountSetStore();
const route = useRoute();
const { hasAccessByCodes } = useAccess();
const { destroyWatermark, updateWatermark } = useWatermark();
const { closeOtherTabs, closeTabByKey, refreshTab } = useTabs();

type BrandTenant = {
  enterpriseIcon?: string;
  EnterpriseIcon?: string;
  id?: number | string;
  logo?: string;
  name?: string;
  shortCName?: string;
  ShortCName?: string;
  shortName?: string;
  ShortName?: string;
};

const brandTenants = ref<BrandTenant[]>([]);
const notifications = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
const showDot = computed(() => unreadCount.value > 0);
const moduleScope = computed<ModuleScope | null>(() => {
  return (
    normalizeModuleScope(route.query.moduleScope) ?? getStoredModuleScope()
  );
});
const hideWorkbenchHeaderExtras = computed(() => route.name === 'ErpWorkbench');

const ACCOUNT_SET_HIDDEN_PREFIXES = [
  '/erp/hr',
  '/hr',
  '/erp/humanresources',
  '/humanresources',
];

const showAccountSetDropdown = computed(() => {
  return !pathMatchesPrefixes(route.path, ACCOUNT_SET_HIDDEN_PREFIXES);
});

const [HelpModal, helpModalApi] = useVbenModal({
  connectedComponent: Help,
});

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: AntdProfileOutlined,
    text: $t('ui.widgets.profile'),
  },
  {
    handler: handleGoHome,
    icon: House,
    text: '回到首页',
  },
  {
    handler: () => {
      helpModalApi.open();
    },
    icon: CircleHelp,
    text: $t('ui.widgets.qa'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

function normalizePath(path = '') {
  let normalized = String(path || '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/[?#].*$/, '');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replaceAll(/\/+/g, '/');

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/$/, '');
  }

  return normalized.toLowerCase();
}

function cloneMenus(menus: MenuRecordRaw[]) {
  return JSON.parse(JSON.stringify(menus)) as MenuRecordRaw[];
}

function pathMatchesPrefixes(path: string, prefixes: string[] = []) {
  const currentPath = normalizePath(path);
  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizePath(prefix);
    return (
      currentPath === normalizedPrefix ||
      currentPath.startsWith(`${normalizedPrefix}/`)
    );
  });
}

function isWorkbenchPath(path = '') {
  const currentPath = normalizePath(path);
  return Object.values(MODULE_WORKBENCH_CONFIG).some(
    (item) => normalizePath(item.path) === currentPath,
  );
}

function menuContainsPath(item: MenuRecordRaw, currentPath: string): boolean {
  const normalizedCurrentPath = normalizePath(currentPath);
  const itemPath = normalizePath(item.path || '');

  if (
    itemPath &&
    (normalizedCurrentPath === itemPath ||
      normalizedCurrentPath.startsWith(`${itemPath}/`))
  ) {
    return true;
  }

  return (item.children || []).some((child) =>
    menuContainsPath(child as MenuRecordRaw, normalizedCurrentPath),
  );
}

function menuContainsPrefixes(
  item: MenuRecordRaw,
  prefixes: string[] = [],
): boolean {
  if (pathMatchesPrefixes(item.path || '', prefixes)) {
    return true;
  }

  return (item.children || []).some((child) =>
    menuContainsPrefixes(child as MenuRecordRaw, prefixes),
  );
}

function getScopedSourceMenus(
  sourceMenus: MenuRecordRaw[],
  scope: ModuleScope | null,
) {
  if (!scope) {
    return cloneMenus(sourceMenus);
  }

  const baseMenus = filterWorkbenchMenus(sourceMenus, scope);
  return filterMenusByModuleScope(baseMenus, scope);
}

function findMatchedTopMenu(
  menus: MenuRecordRaw[] = [],
  currentPath: string,
): MenuRecordRaw | null {
  if (menus.length === 0) {
    return null;
  }

  return menus.find((item) => menuContainsPath(item, currentPath)) || null;
}

function findMenuByExactPath(
  menus: MenuRecordRaw[] = [],
  targetPath: string,
): MenuRecordRaw | null {
  const normalizedTargetPath = normalizePath(targetPath);

  for (const item of menus) {
    if (normalizePath(item.path || '') === normalizedTargetPath) {
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

function findScopeTopMenu(
  menus: MenuRecordRaw[] = [],
  scope: ModuleScope | null,
): MenuRecordRaw | null {
  if (menus.length === 0 || !scope) {
    return null;
  }

  const prefixes = MODULE_SCOPE_MATCHERS[scope] || [];
  return menus.find((item) => menuContainsPrefixes(item, prefixes)) || null;
}

function findFirstMenuWithChildren(menus: MenuRecordRaw[] = []) {
  return menus.find((item) => (item.children || []).length > 0) || null;
}

function pickMenuLabel(item: MenuRecordRaw | null) {
  if (!item) return null;
  return item.name ? $t(item.name) : item.path || null;
}

function simplifyMenuTree(menus: MenuRecordRaw[] = []): any[] {
  return menus.map((item) => ({
    name: item.name ? $t(item.name) : '',
    path: item.path || '',
    children: simplifyMenuTree((item.children || []) as MenuRecordRaw[]),
  }));
}

function printTreeLines(menus: MenuRecordRaw[] = [], level = 0): string[] {
  return menus.flatMap((item) => {
    const children = (item.children || []) as MenuRecordRaw[];
    const prefix = `${'  '.repeat(level)}${level === 0 ? '' : '└─ '}`;
    const current = `${prefix}${item.name ? $t(item.name) : '(未命名)'} [${item.path || ''}]`;
    return [current, ...printTreeLines(children, level + 1)];
  });
}

function buildWorkbenchMenu(scope: ModuleScope): MenuRecordRaw {
  const config = MODULE_WORKBENCH_CONFIG[scope];
  return {
    name: '首页',
    path: config.path,
    icon: 'lucide:house',
    children: [],
    meta: {
      title: '首页',
    },
  } as MenuRecordRaw;
}

function resolveModuleRootMenu(
  scope: ModuleScope,
  scopedMenus: MenuRecordRaw[],
  currentPath: string,
): MenuRecordRaw | null {
  return (
    findMenuByExactPath(scopedMenus, MODULE_ROOT_PATHS[scope]) ||
    findScopeTopMenu(scopedMenus, scope) ||
    findMatchedTopMenu(scopedMenus, currentPath) ||
    findFirstMenuWithChildren(scopedMenus) ||
    scopedMenus[0] ||
    null
  );
}

function resolveModuleSecondLevelMenus(
  scope: ModuleScope,
  scopedMenus: MenuRecordRaw[],
  moduleRootMenu: MenuRecordRaw | null,
): MenuRecordRaw[] {
  const rootChildren = cloneMenus(
    ((moduleRootMenu?.children || []) as MenuRecordRaw[]) || [],
  ).filter((item) => !isWorkbenchPath(item.path || ''));

  if (rootChildren.length > 0) {
    return rootChildren;
  }

  const moduleRootPath = normalizePath(MODULE_ROOT_PATHS[scope]);
  return cloneMenus(scopedMenus).filter((item) => {
    const currentPath = normalizePath(item.path || '');
    return !isWorkbenchPath(item.path || '') && currentPath !== moduleRootPath;
  });
}

function buildModuleHeaderMenus(
  scope: ModuleScope,
  scopedMenus: MenuRecordRaw[],
  moduleRootMenu: MenuRecordRaw | null,
): MenuRecordRaw[] {
  const workbenchMenu = buildWorkbenchMenu(scope);
  const secondLevelMenus = resolveModuleSecondLevelMenus(
    scope,
    scopedMenus,
    moduleRootMenu,
  );
  return [workbenchMenu, ...secondLevelMenus];
}

const scopedMenuState = computed(() => {
  const sourceMenus = (accessStore.accessMenus || []) as MenuRecordRaw[];

  if (sourceMenus.length === 0 || !moduleScope.value) {
    return {
      currentSectionMenu: null as MenuRecordRaw | null,
      displayMenus: sourceMenus,
      headerMenus: sourceMenus,
      moduleRootMenu: null as MenuRecordRaw | null,
      scopedMenus: sourceMenus,
    };
  }

  const scopedMenus = getScopedSourceMenus(sourceMenus, moduleScope.value);
  const moduleRootMenu = resolveModuleRootMenu(
    moduleScope.value,
    scopedMenus,
    route.path,
  );

  const headerMenus = buildModuleHeaderMenus(
    moduleScope.value,
    scopedMenus,
    moduleRootMenu,
  );

  const currentSectionMenu =
    findMatchedTopMenu(headerMenus, route.path) || headerMenus[0] || null;

  const displayMenus = cloneMenus(
    ((currentSectionMenu?.children || []) as MenuRecordRaw[]) || [],
  );

  return {
    currentSectionMenu,
    displayMenus,
    headerMenus,
    moduleRootMenu,
    scopedMenus,
  };
});

const displayMenus = computed<MenuRecordRaw[]>(() => {
  return scopedMenuState.value.displayMenus;
});

const headerDisplayMenus = computed<MenuRecordRaw[]>(() => {
  if (hideWorkbenchHeaderExtras.value) {
    return [];
  }
  return scopedMenuState.value.headerMenus;
});

function normalizeTenantValue(value: unknown) {
  const text = String(value ?? '').trim();
  return text && text !== 'NaN' ? text : '';
}

function getBrandTenantId(tenant: BrandTenant | null | undefined) {
  return normalizeTenantValue(
    tenant?.id ?? tenant?.shortName ?? tenant?.ShortName,
  );
}

function getBrandTenantShortName(tenant: BrandTenant | null | undefined) {
  return normalizeTenantValue(
    tenant?.shortCName ??
      tenant?.ShortCName ??
      tenant?.name ??
      tenant?.shortName ??
      tenant?.ShortName,
  );
}

function getBrandTenantLogo(tenant: BrandTenant | null | undefined) {
  return normalizeTenantValue(
    tenant?.logo ?? tenant?.enterpriseIcon ?? tenant?.EnterpriseIcon,
  );
}

function resolveTenantLogoUrl(value: unknown) {
  const logo = normalizeTenantValue(value);
  if (!logo) return '';
  if (/^https?:\/\//i.test(logo) || logo.startsWith('data:')) return logo;
  if (logo.startsWith('/')) return logo;
  return `/entInfo/${logo.replace(/^\/+/, '')}`;
}

function buildInitialLogoDataUrl(text: string) {
  const initial = (text || '企').slice(0, 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2563eb"/><text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="30" font-weight="700" fill="#fff">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const currentBrandTenant = computed(() => {
  const selectedId = normalizeTenantValue(
    (accessStore as any).visitTenantId || (accessStore as any).tenantId,
  );
  if (brandTenants.value.length === 0) return null;
  if (!selectedId) return brandTenants.value[0] || null;
  return (
    brandTenants.value.find((item) => getBrandTenantId(item) === selectedId) ||
    null
  );
});

const currentBrandShortName = computed(
  () => getBrandTenantShortName(currentBrandTenant.value) || '领码',
);
const currentBrandLogoUrl = computed(() => {
  const logoUrl = resolveTenantLogoUrl(
    getBrandTenantLogo(currentBrandTenant.value),
  );
  return logoUrl || buildInitialLogoDataUrl(currentBrandShortName.value);
});
const currentBrandTitle = computed(() => `${currentBrandShortName.value}ERP`);

function updateFavicon(href: string) {
  if (typeof document === 'undefined' || !href) {
    return;
  }

  const normalizedHref = href.startsWith('data:')
    ? href
    : `${href}${href.includes('?') ? '&' : '?'}v=${Date.now()}`;
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.append(favicon);
  }

  favicon.href = normalizedHref;
}

watch(
  currentBrandLogoUrl,
  (url) => {
    updateFavicon(url || '/favicon.ico');
  },
  { immediate: true },
);

async function loadBrandTenantList() {
  try {
    const list = await getTenantSimpleList();
    brandTenants.value = Array.isArray(list) ? (list as BrandTenant[]) : [];
  } catch (error) {
    console.error('获取顶部租户品牌失败:', error);
    brandTenants.value = [];
  }
}
function isMenuDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage?.getItem('ERP_MENU_DEBUG') === '1';
}

const currentAppTitle = computed(() => {
  if (!moduleScope.value) {
    return preferences.app.name;
  }

  return (
    MODULE_WORKBENCH_CONFIG[moduleScope.value]?.title || preferences.app.name
  );
});

watch(
  () => ({
    currentAppTitle: currentAppTitle.value,
    displayMenuCount: displayMenus.value.length,
    headerDisplayMenuCount: headerDisplayMenus.value.length,
    moduleRootPath: scopedMenuState.value.moduleRootMenu?.path || '',
    routePath: route.path,
    scopedMenuCount: scopedMenuState.value.scopedMenus.length,
    scope: moduleScope.value,
    sourceMenuCount: (accessStore.accessMenus || []).length,
  }),
  ({
    currentAppTitle,
    displayMenuCount,
    headerDisplayMenuCount,
    moduleRootPath,
    routePath,
    scopedMenuCount,
    scope,
    sourceMenuCount,
  }) => {
    if (!isMenuDebugEnabled()) {
      return;
    }

    const sourceMenus = (accessStore.accessMenus || []) as MenuRecordRaw[];
    const scopedMenus = scopedMenuState.value.scopedMenus as MenuRecordRaw[];
    const moduleRootMenu = scopedMenuState.value.moduleRootMenu;

    const summary = {
      currentAppTitle,
      currentSectionMenu: pickMenuLabel(
        scopedMenuState.value.currentSectionMenu,
      ),
      displayMenuCount,
      headerDisplayMenuCount,
      moduleRootMenu: pickMenuLabel(moduleRootMenu),
      moduleRootPath,
      routePath,
      scope,
      scopedMenuCount,
      sourceMenuCount,
    };

    console.groupCollapsed(
      `[menu-debug] scope=${scope || 'none'} route=${routePath}`,
    );
    console.log('summary', summary);
    console.log('sourceMenus(tree)', simplifyMenuTree(sourceMenus));
    console.log('scopedMenus(tree)', simplifyMenuTree(scopedMenus));
    console.log(
      'headerDisplayMenus(tree)',
      simplifyMenuTree(headerDisplayMenus.value as MenuRecordRaw[]),
    );
    console.log(
      'displayMenus(tree)',
      simplifyMenuTree(displayMenus.value as MenuRecordRaw[]),
    );
    console.log(
      'moduleRootMenu',
      simplifyMenuTree(moduleRootMenu ? [moduleRootMenu] : []),
    );
    console.log(
      `sourceMenus(lines)\n${printTreeLines(sourceMenus).join('\n')}`,
    );
    console.log(
      `scopedMenus(lines)\n${printTreeLines(scopedMenus).join('\n')}`,
    );
    console.log(
      `headerDisplayMenus(lines)\n${printTreeLines(
        headerDisplayMenus.value as MenuRecordRaw[],
      ).join('\n')}`,
    );
    console.log(
      `displayMenus(lines)\n${printTreeLines(
        displayMenus.value as MenuRecordRaw[],
      ).join('\n')}`,
    );
    console.groupEnd();
  },
  { immediate: true },
);

function handleClickLogo() {
  handleGoHome();
}

async function handleGoHome() {
  clearStoredModuleScope();

  const target = { name: 'ErpWorkbench' as const };
  const targetHref = router.resolve(target).href;

  try {
    await router.replace(target);
  } catch (error) {
    console.error('回到主页路由跳转失败:', error);
  }

  if (normalizePath(router.currentRoute.value.path) !== normalizePath(GLOBAL_WORKBENCH_PATH)) {
    window.location.assign(targetHref || GLOBAL_WORKBENCH_PATH);
    return;
  }

  try {
    await closeOtherTabs();
  } catch (error) {
    console.warn('回到主页后关闭其它页签失败:', error);
  }
}

async function handleLogout() {
  clearStoredModuleScope();
  await authStore.logout(false);
}

async function handleNotificationGetUnreadCount() {
  unreadCount.value = await getUnreadNotifyMessageCount();
}

async function handleNotificationGetList() {
  const list = await getUnreadNotifyMessageList();
  notifications.value = list.map((item) => ({
    avatar: preferences.app.defaultAvatar,
    date: formatDateTime(item.createTime) as string,
    isRead: false,
    id: item.id,
    message: item.templateContent,
    title: item.templateNickname,
  }));
}

function handleNotificationViewAll() {
  router.push({
    name: 'MyNotifyMessage',
  });
}

async function handleNotificationMakeAll() {
  await updateAllNotifyMessageRead();
  unreadCount.value = 0;
  notifications.value = [];
}

async function handleNotificationClear() {
  await handleNotificationMakeAll();
}

async function handleNotificationRead(item: NotificationItem) {
  if (!item.id) {
    return;
  }
  await updateNotifyMessageRead([item.id]);
  await handleNotificationGetUnreadCount();
  notifications.value = notifications.value.filter((n) => n.id !== item.id);
}

function handleNotificationOpen(open: boolean) {
  if (!open) {
    return;
  }
  handleNotificationGetList();
  handleNotificationGetUnreadCount();
}

const tenants = ref<SystemTenantApi.Tenant[]>([]);
const tenantEnable = computed(
  () => hasAccessByCodes(['system:tenant:visit']) && isTenantEnable(),
);

async function handleAccountSetChange(accountSet: BilAccountSetApi.AccountSet) {
  const accountSetId = String(
    accountSet?.rowid || accountSet?.account_set_id || '',
  ).trim();
  if (!accountSetId) {
    ElMessage.error('切换账套失败');
    return;
  }
  accountSetStore.setCurrent(accountSet);
  await ensureAccountSetInfo();
  await closeOtherTabs();
  await refreshTab();
  ElMessage.success(
    `切换当前账套为: ${accountSet.account_name || accountSetId}`,
  );
}

async function ensureAccountSetInfo() {
  const id = accountSetStore.currentId;
  if (!id) return;
  if (accountSetStore.currentName && accountSetStore.currentStartDate) return;
  try {
    const data: any = await getAccountSet(String(id));
    if (data?.rowid) {
      accountSetStore.setCurrent(data);
    }
  } catch {
    // ignore
  }
}

async function handleGetTenantList() {
  if (tenantEnable.value) {
    tenants.value = await getSimpleTenantList();
  }
}

async function handleTenantChange(tenant: SystemTenantApi.Tenant) {
  if (!tenant || !tenant.id) {
    ElMessage.error('切换租户失败');
    return;
  }
  accessStore.setVisitTenantId(tenant.id as number);
  await closeOtherTabs();
  await refreshTab();
  ElMessage.success(`切换当前租户为: ${tenant.name}`);
}

watch(
  () => userStore.userInfo,
  (u) => {
    accountSetStore.initFromUserInfo(u);
    ensureAccountSetInfo();
  },
  { immediate: true },
);

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.id} - ${userStore.userInfo?.nickname}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  accountSetStore.initFromUserInfo(userStore.userInfo);
  ensureAccountSetInfo();
  handleNotificationGetUnreadCount();
  handleGetTenantList();
  loadBrandTenantList();
  setInterval(
    () => {
      if (userStore.userInfo) {
        handleNotificationGetUnreadCount();
      }
    },
    1000 * 60 * 2,
  );
});
</script>

<template>
  <BasicLayout
    :menus="headerDisplayMenus"
    :logo-src="currentBrandLogoUrl"
    :logo-text="currentBrandTitle"
    @clear-preferences-and-logout="handleLogout"
    @click-logo="handleClickLogo"
  >
    <template #logo-text>
      {{ currentBrandTitle }}
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.nickname"
        :description="userStore.userInfo?.email"
        :tag-text="userStore.userInfo?.username"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNotificationClear"
        @make-all="handleNotificationMakeAll"
        @view-all="handleNotificationViewAll"
        @open="handleNotificationOpen"
        @read="handleNotificationRead"
      />
    </template>
    <template #header-right-52>
      <button
        class="hover:bg-accent mr-2 inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm transition"
        title="回到首页"
        type="button"
        @click="handleGoHome"
      >
        <House class="size-4" />
        <span class="hidden sm:inline">回到主页</span>
      </button>
    </template>
    <template #header-right-51>
      <div class="flex items-center">
        <div v-if="!hideWorkbenchHeaderExtras && tenantEnable">
          <TenantDropdown
            class="mr-2"
            :tenant-list="tenants"
            :visit-tenant-id="accessStore.visitTenantId"
            @success="handleTenantChange"
          />
        </div>
        <AccountSetDropdown
          v-if="!hideWorkbenchHeaderExtras && showAccountSetDropdown"
          class="mr-2"
          @success="handleAccountSetChange"
        />
      </div>
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
  <HelpModal />
</template>
