import type { MenuRecordRaw } from '@vben/types';

export const MODULE_SCOPE_QUERY_KEY = 'moduleScope';
const MODULE_SCOPE_STORAGE_KEY = 'erp-module-scope';

export type ModuleScope = 'archives' | 'contract' | 'finance' | 'hr' | 'oa' | 'project' | 'supply' | 'system';

const MODULE_SCOPE_PREFIXES: Record<ModuleScope, string[]> = {
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

const MODULE_WORKBENCH_PATHS: Record<ModuleScope, string> = {
  archives: '/archives/data-management',
  contract: '/contract/dashboard',
  project: '/project/dashboard',
  hr: '/erp/hr/workbench',
  oa: '/oa/workbench',
  supply: '/erp/purchase/workbench',
  finance: '/finance/workbench',
  system: '/managementsys/workbench',
};

const MODULE_SCOPE_HIDDEN_PATHS: Partial<Record<ModuleScope, string[]>> = {};

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

function cloneMenus(menus: MenuRecordRaw[]) {
  return JSON.parse(JSON.stringify(menus)) as MenuRecordRaw[];
}

export function normalizeModuleScope(value?: unknown): ModuleScope | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === 'archives' ||
    normalized === 'contract' ||
    normalized === 'project' ||
    normalized === 'hr' ||
    normalized === 'oa' ||
    normalized === 'supply' ||
    normalized === 'finance' ||
    normalized === 'system'
  ) {
    return normalized;
  }
  return null;
}

export function getStoredModuleScope(): ModuleScope | null {
  if (typeof window === 'undefined') return null;
  return normalizeModuleScope(window.sessionStorage.getItem(MODULE_SCOPE_STORAGE_KEY));
}

export function setStoredModuleScope(scope: ModuleScope) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(MODULE_SCOPE_STORAGE_KEY, scope);
}

export function clearStoredModuleScope() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(MODULE_SCOPE_STORAGE_KEY);
}

function matchesPrefix(path: string, prefixes: string[]) {
  const currentPath = normalizePath(path);
  if (!currentPath) return false;
  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizePath(prefix);
    return currentPath === normalizedPrefix || currentPath.startsWith(`${normalizedPrefix}/`);
  });
}

export function filterMenusByModuleScope(
  menus: MenuRecordRaw[] = [],
  scope: ModuleScope,
): MenuRecordRaw[] {
  const prefixes = MODULE_SCOPE_PREFIXES[scope] || [];
  const hiddenPaths = new Set(
    (MODULE_SCOPE_HIDDEN_PATHS[scope] || []).map((path) => normalizePath(path)),
  );

  const visit = (items: MenuRecordRaw[]): MenuRecordRaw[] => {
    return items
      .map((item) => {
        const currentPath = normalizePath(item.path || '');
        const selfHidden = hiddenPaths.has(currentPath);

        if (selfHidden) {
          return null;
        }

        const children = visit(item.children || []);
        const selfMatched = matchesPrefix(item.path || '', prefixes);

        if (!selfMatched && children.length === 0) {
          return null;
        }

        return {
          ...item,
          children,
        };
      })
      .filter(Boolean) as MenuRecordRaw[];
  };

  return visit(cloneMenus(menus));
}

export function filterWorkbenchMenus(
  menus: MenuRecordRaw[] = [],
  scope: ModuleScope | null,
): MenuRecordRaw[] {
  const hiddenPaths = new Set(
    Object.entries(MODULE_WORKBENCH_PATHS)
      .filter(([moduleKey]) => !scope || moduleKey !== scope)
      .map(([, path]) => normalizePath(path)),
  );

  if (scope) {
    hiddenPaths.delete(normalizePath(MODULE_WORKBENCH_PATHS[scope]));
  }

  const visit = (items: MenuRecordRaw[]): MenuRecordRaw[] => {
    return items
      .map((item) => {
        const currentPath = normalizePath(item.path || '');
        const children = visit(item.children || []);
        const selfHidden = hiddenPaths.has(currentPath);

        if (selfHidden && children.length === 0) {
          return null;
        }

        return {
          ...item,
          children,
        };
      })
      .filter(Boolean) as MenuRecordRaw[];
  };

  return visit(cloneMenus(menus));
}
