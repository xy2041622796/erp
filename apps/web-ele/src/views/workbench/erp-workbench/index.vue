<script lang="ts" setup>
import type { MenuRecordRaw } from '@vben/types';

import type { ModuleScope } from '#/utils/module-scope';

import { computed, watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';
import { isHttpUrl, openWindow } from '@vben/utils';

import {
  Briefcase,
  Coin,
  CreditCard,
  Document,
  Files,
  Goods,
  Money,
  OfficeBuilding,
  Operation,
  Promotion,
  Reading,
} from '@element-plus/icons-vue';

import { MODULE_SCOPE_QUERY_KEY } from '#/utils/module-scope';

import {
  ElButton,
  ElCard,
  ElCol,
  ElIcon,
  ElRow,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpWorkbench' });

const router = useRouter();
const accessStore = useAccessStore();

type AppItem = {
  title: string;
  desc: string;
  path: string;
  icon?: string;
  tone: string;
  moduleScope: ModuleScope | null;
};

type TodoItem = {
  title: string;
  source: string;
  time: string;
  path: string;
  icon: any;
  tone: string;
  moduleScope: ModuleScope;
  urgent?: boolean;
};

type QuickItem = {
  title: string;
  source: string;
  path: string;
  icon: any;
  tone: string;
  moduleScope: ModuleScope;
};

const MODULE_WORKBENCH_PATHS: Record<ModuleScope, string> = {
  hr: '/erp/hr/workbench',
  oa: '/oa/workbench',
  supply: '/erp/purchase/workbench',
  finance: '/finance/workbench',
  system: '/managementsys/workbench',
};

const WORKBENCH_PATH_SET = new Set<string>([
  '/erp/workbench',
  ...Object.values(MODULE_WORKBENCH_PATHS),
]);

const MODULE_TONE_MAP: Record<ModuleScope, string> = {
  hr: 'is-violet',
  oa: 'is-blue',
  supply: 'is-orange',
  finance: 'is-green',
  system: 'is-cyan',
};

function normalizePath(path = '') {
  let normalized = String(path || '')
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

function normalizeBase(base = '/') {
  let normalized = String(base || '/').trim().replace(/\\/g, '/');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/+/g, '/');

  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

function inferModuleScopeByPath(path = ''): ModuleScope | null {
  const currentPath = normalizePath(path);
  if (!currentPath) return null;
  if (currentPath === '/hr' || currentPath.startsWith('/hr/')) return 'hr';
  if (currentPath === '/oa' || currentPath.startsWith('/oa/')) return 'oa';
  if (currentPath === '/finance' || currentPath.startsWith('/finance/')) {
    return 'finance';
  }
  if (
    currentPath === '/managementsys' ||
    currentPath.startsWith('/managementsys/')
  ) {
    return 'system';
  }
  if (
    currentPath === '/erp/client' ||
    currentPath.startsWith('/erp/client/') ||
    currentPath === '/erp/sale' ||
    currentPath.startsWith('/erp/sale/') ||
    currentPath === '/erp/purchase' ||
    currentPath.startsWith('/erp/purchase/') ||
    currentPath === '/erp/stock' ||
    currentPath.startsWith('/erp/stock/') ||
    currentPath === '/erp/inventory-accounting' ||
    currentPath.startsWith('/erp/inventory-accounting/') ||
    currentPath === '/erp/product' ||
    currentPath.startsWith('/erp/product/') ||
    currentPath === '/erp/basic_data' ||
    currentPath.startsWith('/erp/basic_data/')
  ) {
    return 'supply';
  }
  return null;
}

function getUsableSelfPath(menu?: MenuRecordRaw | null): string {
  if (!menu) return '';
  const currentPath = normalizePath(menu.path || '');
  if (!currentPath || WORKBENCH_PATH_SET.has(currentPath)) {
    return '';
  }
  return menu.path || '';
}

function findFirstChildLeafPath(menu?: MenuRecordRaw | null): string {
  if (!menu) return '';
  const children = menu.children || [];
  for (const child of children) {
    const childPath = findFirstLeafPath(child);
    if (childPath) {
      return childPath;
    }
  }
  return '';
}

function findFirstLeafPath(menu?: MenuRecordRaw | null): string {
  if (!menu) return '';
  return findFirstChildLeafPath(menu) || getUsableSelfPath(menu);
}

function resolveModuleScope(menu: MenuRecordRaw): ModuleScope | null {
  return (
    inferModuleScopeByPath(menu.path || '') ||
    inferModuleScopeByPath(findFirstLeafPath(menu))
  );
}

function resolveAppEntry(menu: MenuRecordRaw): {
  moduleScope: ModuleScope | null;
  path: string;
} {
  const selfPath = getUsableSelfPath(menu);
  const childLeafPath = findFirstChildLeafPath(menu);
  const hasChildren = (menu.children || []).length > 0;
  const moduleScope = resolveModuleScope(menu);

  if (!hasChildren && selfPath) {
    return {
      moduleScope,
      path: selfPath,
    };
  }

  if (moduleScope) {
    return {
      moduleScope,
      path: MODULE_WORKBENCH_PATHS[moduleScope],
    };
  }

  return {
    moduleScope: null,
    path: childLeafPath || selfPath,
  };
}

function buildMenuDesc(menu: MenuRecordRaw) {
  const children = menu.children || [];
  if (children.length > 0) {
    return `共 ${children.length} 个功能分组`;
  }
  return '点击进入模块';
}

const appItems = computed<AppItem[]>(() => {
  const menus = (accessStore.accessMenus || []) as MenuRecordRaw[];

  return menus
    .filter((menu) => {
      const path = normalizePath(menu.path || '');
      return !!menu.name && !WORKBENCH_PATH_SET.has(path);
    })
    .map((menu) => {
      const { moduleScope, path } = resolveAppEntry(menu);

      return {
        title: menu.name,
        desc: buildMenuDesc(menu),
        path,
        icon: typeof menu.icon === 'string' ? menu.icon : undefined,
        tone: moduleScope ? MODULE_TONE_MAP[moduleScope] : 'is-gray',
        moduleScope,
      };
    })
    .filter((item) => !!item.path);
});

const todoItems = computed<TodoItem[]>(() => [
  {
    title: '李四的差旅报销单待审核',
    source: '财务云',
    time: '10分钟前',
    path: MODULE_WORKBENCH_PATHS.finance,
    icon: Document,
    tone: 'is-blue',
    moduleScope: 'finance',
    urgent: true,
  },
  {
    title: 'XX项目的合同需要法务审核',
    source: '协同云',
    time: '30分钟前',
    path: MODULE_WORKBENCH_PATHS.oa,
    icon: Files,
    tone: 'is-blue',
    moduleScope: 'oa',
  },
  {
    title: '采购订单PO-2024-001即将到货',
    source: '供应链云',
    time: '1小时前',
    path: MODULE_WORKBENCH_PATHS.supply,
    icon: Goods,
    tone: 'is-orange',
    moduleScope: 'supply',
  },
  {
    title: '王五的请假申请待审批',
    source: '人力云',
    time: '1小时前',
    path: MODULE_WORKBENCH_PATHS.hr,
    icon: Reading,
    tone: 'is-violet',
    moduleScope: 'hr',
  },
  {
    title: '月度财务报表待确认',
    source: '财务云',
    time: '2小时前',
    path: MODULE_WORKBENCH_PATHS.finance,
    icon: Coin,
    tone: 'is-green',
    moduleScope: 'finance',
  },
]);

function flattenDynamicMenus(menus: MenuRecordRaw[], parentTitle = '') {
  return menus.flatMap((menu) => {
    const title = [parentTitle, menu.name].filter(Boolean).join(' / ');
    const children = (menu.children || []) as MenuRecordRaw[];
    const current = {
      title,
      name: menu.name,
      path: menu.path || '',
      normalizedPath: normalizePath(menu.path || ''),
      resolvedEntryPath: findFirstLeafPath(menu),
      moduleScope: resolveModuleScope(menu),
      childCount: children.length,
    };

    return [current, ...flattenDynamicMenus(children, title)];
  });
}

function printDynamicNavigation() {
  const menus = (accessStore.accessMenus || []) as MenuRecordRaw[];
  const rows = flattenDynamicMenus(menus).filter(
    (item) => item.path || item.resolvedEntryPath,
  );

  console.group('[ERP工作台] 动态导航菜单 accessMenus');
  console.table(rows);
  console.log('raw accessMenus:', menus);
  console.groupEnd();
}

watchEffect(() => {
  if ((accessStore.accessMenus || []).length > 0) {
    printDynamicNavigation();
  }
});

const quickItems = computed<QuickItem[]>(() => [
  {
    title: '请假申请',
    source: '人力云',
    path: MODULE_WORKBENCH_PATHS.hr,
    icon: Reading,
    tone: 'is-blue',
    moduleScope: 'hr',
  },
  {
    title: '费用报销',
    source: '财务云',
    path: MODULE_WORKBENCH_PATHS.finance,
    icon: Money,
    tone: 'is-green',
    moduleScope: 'finance',
  },
  {
    title: '我的工资条',
    source: '人力云',
    path: MODULE_WORKBENCH_PATHS.hr,
    icon: CreditCard,
    tone: 'is-violet',
    moduleScope: 'hr',
  },
  {
    title: '出差申请',
    source: '协同云',
    path: MODULE_WORKBENCH_PATHS.oa,
    icon: Promotion,
    tone: 'is-cyan',
    moduleScope: 'oa',
  },
  {
    title: '借款申请',
    source: '财务云',
    path: MODULE_WORKBENCH_PATHS.finance,
    icon: Briefcase,
    tone: 'is-orange',
    moduleScope: 'finance',
  },
  {
    title: '合同起草',
    source: '协同云',
    path: MODULE_WORKBENCH_PATHS.oa,
    icon: Operation,
    tone: 'is-pink',
    moduleScope: 'oa',
  },
]);

function toAbsoluteAppHref(href: string) {
  if (isHttpUrl(href)) {
    return href;
  }

  const appBase = normalizeBase(import.meta.env.VITE_BASE || '/');

  if (href.startsWith(appBase)) {
    return new URL(href, window.location.origin).href;
  }

  if (href.startsWith('/#/')) {
    return new URL(href.slice(2), window.location.origin).href;
  }

  if (href.startsWith('#/')) {
    return new URL(`/${href.slice(2)}`, window.location.origin).href;
  }

  if (href.startsWith('/')) {
    return new URL(`${appBase.replace(/\/$/, '')}${href}`, window.location.origin).href;
  }

  return new URL(`${appBase}${href}`, window.location.origin).href;
}

function buildRouteHref(path: string, moduleScope?: ModuleScope | null) {
  const resolved = router.resolve({
    path,
    query: moduleScope
      ? {
          [MODULE_SCOPE_QUERY_KEY]: moduleScope,
        }
      : {},
  });

  const targetMeta = resolved.matched.at(-1)?.meta || {};
  const link = typeof targetMeta.link === 'string' ? targetMeta.link : '';
  if (link) {
    return link;
  }

  return toAbsoluteAppHref(resolved.href);
}

const go = (path: string, moduleScope?: ModuleScope | null) => {
  if (!path) return;

  if (isHttpUrl(path)) {
    openWindow(path, { target: '_blank' });
    return;
  }

  const href = buildRouteHref(path, moduleScope);
  openWindow(href, { target: '_blank' });
};
</script>

<template>
  <Page>
    <div class="erp-workbench-page">
      <ElCard shadow="never" class="panel-card apps-panel">
        <template #header>
          <div class="panel-title">
            <span class="title-badge is-blue-soft">
              <ElIcon><OfficeBuilding /></ElIcon>
            </span>
            <span>我的应用</span>
          </div>
        </template>
        <ElRow :gutter="16">
          <ElCol v-for="item in appItems" :key="item.title" :lg="4" :md="8" :sm="12" :xs="24">
            <button class="app-card" type="button" @click="go(item.path, item.moduleScope)">
              <span class="app-icon" :class="item.tone">
                <IconifyIcon v-if="item.icon" :icon="item.icon" class="app-iconify" />
                <ElIcon v-else>
                  <OfficeBuilding />
                </ElIcon>
              </span>
              <span class="app-name">{{ item.title }}</span>
              <span class="app-desc">{{ item.desc }}</span>
            </button>
          </ElCol>
        </ElRow>
      </ElCard>

      <ElRow :gutter="16">
        <ElCol :lg="16" :md="24" :sm="24" :xs="24">
          <ElCard shadow="never" class="panel-card todo-panel">
            <template #header>
              <div class="panel-head-row">
                <div class="panel-title">
                  <span class="title-badge is-green-soft">
                    <ElIcon><Document /></ElIcon>
                  </span>
                  <span>我的待办</span>
                </div>
                <ElButton link type="success">查看全部</ElButton>
              </div>
            </template>

            <div class="todo-list">
              <button
                v-for="item in todoItems"
                :key="item.title"
                class="todo-item"
                type="button"
                @click="go(item.path, item.moduleScope)"
              >
                <span class="todo-icon" :class="item.tone">
                  <ElIcon>
                    <component :is="item.icon" />
                  </ElIcon>
                </span>
                <span class="todo-main">
                  <span class="todo-title-row">
                    <span class="todo-title">{{ item.title }}</span>
                    <ElTag v-if="item.urgent" size="small" type="danger">紧急</ElTag>
                  </span>
                  <span class="todo-meta-row">
                    <span class="todo-source" :class="item.tone">{{ item.source }}</span>
                    <span class="todo-time">{{ item.time }}</span>
                  </span>
                </span>
              </button>
            </div>
          </ElCard>
        </ElCol>

        <ElCol :lg="8" :md="24" :sm="24" :xs="24">
          <ElCard shadow="never" class="panel-card quick-panel">
            <template #header>
              <div class="panel-head-row">
                <div class="panel-title">
                  <span class="title-badge is-orange-soft">
                    <ElIcon><Operation /></ElIcon>
                  </span>
                  <span>快捷操作</span>
                </div>
              </div>
            </template>

            <div class="quick-grid">
              <button
                v-for="item in quickItems"
                :key="item.title"
                class="quick-item"
                type="button"
                @click="go(item.path, item.moduleScope)"
              >
                <span class="quick-icon" :class="item.tone">
                  <ElIcon>
                    <component :is="item.icon" />
                  </ElIcon>
                </span>
                <span class="quick-title">{{ item.title }}</span>
                <span class="quick-source">{{ item.source }}</span>
              </button>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>
    </div>
  </Page>
</template>

<style scoped>
.erp-workbench-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}

.panel-card {
  border: 1px solid #e9edf3;
  border-radius: 14px;
  background: #fff;
  box-shadow: none;
}

.panel-title,
.panel-head-row,
.todo-title-row,
.todo-meta-row {
  display: flex;
  align-items: center;
}

.panel-head-row {
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.title-badge {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
}

.apps-panel :deep(.el-card__body) {
  padding-top: 10px;
}

.app-card,
.todo-item,
.quick-item {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.app-card {
  display: flex;
  min-height: 130px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #edf1f5;
  border-radius: 14px;
  background: #fff;
  transition: all 0.2s ease;
}

.app-card:hover,
.todo-item:hover,
.quick-item:hover {
  border-color: #dbe5f0;
  background: #fafcff;
}

.app-icon,
.todo-icon,
.quick-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}

.app-icon {
  width: 54px;
  height: 54px;
  font-size: 24px;
}

.app-iconify {
  font-size: 24px;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.app-desc {
  font-size: 12px;
  color: #909399;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 14px;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  background: #fafbfc;
  text-align: left;
  transition: all 0.2s ease;
}

.todo-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  font-size: 16px;
}

.todo-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.todo-title-row {
  gap: 8px;
}

.todo-title {
  overflow: hidden;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.todo-meta-row {
  gap: 10px;
  font-size: 12px;
}

.todo-source {
  font-weight: 500;
}

.todo-time {
  color: #909399;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick-item {
  display: flex;
  min-height: 118px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 14px 10px;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  background: #fafbfc;
  transition: all 0.2s ease;
}

.quick-icon {
  width: 42px;
  height: 42px;
  font-size: 18px;
  color: #fff;
}

.quick-title {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.quick-source {
  color: #a0a7b4;
  font-size: 12px;
}

.is-violet {
  color: #6f5ef9;
  background: #efedff;
}

.is-blue {
  color: #4b8cff;
  background: #eaf2ff;
}

.is-orange {
  color: #ef9a28;
  background: #fff3e1;
}

.is-green {
  color: #16b26b;
  background: #e8f8ef;
}

.is-gray {
  color: #7b8794;
  background: #eef1f5;
}

.is-cyan {
  color: #10b7b5;
  background: #def8f7;
}

.is-pink {
  color: #9f5cf2;
  background: #f3e7ff;
}

.is-blue-soft {
  color: #4b8cff;
  background: #eaf2ff;
}

.is-green-soft {
  color: #16b26b;
  background: #e8f8ef;
}

.is-orange-soft {
  color: #ef9a28;
  background: #fff3e1;
}

@media (max-width: 992px) {
  .quick-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 576px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .app-card {
    min-height: 116px;
  }
}
</style>
