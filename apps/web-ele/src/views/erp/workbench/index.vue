<script lang="ts" setup>
import type { MenuRecordRaw } from '@vben/types';
import type { ModuleScope } from '#/utils/module-scope';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { getTenantSimpleList } from '#/api/core/auth';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useUserStore } from '@vben/stores';
import { useAuthStore } from '#/store';
import { isHttpUrl } from '@vben/utils';

import {
  Bell,
  Box,
  Briefcase,
  Calendar,
  Clock,
  Coin,
  Connection,
  CreditCard,
  Document,
  Files,
  Goods,
  Grid,
  Lightning,
  Location,
  Money,
  OfficeBuilding,
  Operation,
  Promotion,
  Reading,
  Setting,
  Sunny,
  UserFilled,
  Warning,
} from '@element-plus/icons-vue';

import { MODULE_SCOPE_QUERY_KEY } from '#/utils/module-scope';

import { ElDialog, ElEmpty, ElIcon, ElTag } from 'element-plus';

defineOptions({ name: 'ErpWorkbench' });

const router = useRouter();
const { closeTabByKey } = useTabs();
const userStore = useUserStore();
const accessStore = useAccessStore();
const authStore = useAuthStore();
const allSystemsVisible = ref(false);
const SYSTEM_PREVIEW_LIMIT = 7;

function markWorkbenchPerf(label: string, extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  const now = window.performance?.now?.() ?? Date.now();
  const win = window as any;
  win.__ERP_PERF__ ||= {};
  const state = win.__ERP_PERF__ as Record<string, number>;
  const loginSuccessAt = state.loginSuccessAt;
  const firstMarkAt = state.firstMarkAt ?? now;
  if (!state.firstMarkAt) {
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

markWorkbenchPerf('workbench setup start');


type PortalAppItem = {
  title: string;
  desc: string;
  path: string;
  icon?: string;
  color: string;
  moduleScope: ModuleScope | null;
};

type TodoItem = {
  title: string;
  system: string;
  time: string;
  path: string;
  icon: any;
  color: string;
  moduleScope: ModuleScope;
  urgent?: boolean;
};

type QuickItem = {
  title: string;
  path: string;
  icon: any;
  color: string;
  moduleScope: ModuleScope;
};

type TenantOption = {
  id?: number | string;
  name?: string;
  expireTime?: string | Date;
  packageName?: string;
  packageId?: number | string;
  accountCount?: number;
  rowid?: number | string;
  ShortName?: string;
  ShortCName?: string;
};

const tenantList = ref<TenantOption[]>([]);
const tenantLoading = ref(false);
const dynamicAccessStarted = ref(false);

type WeatherInfo = {
  city: string;
  text: string;
  temperature: number | string;
  humidity: string;
  wind: string;
};

const weatherInfo = ref<WeatherInfo>({
  city: '定位中',
  text: '加载中',
  temperature: '--',
  humidity: '--',
  wind: '--',
});

const weatherCodeTextMap: Record<number, string> = {
  0: '晴',
  1: '少云',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '小毛毛雨',
  53: '毛毛雨',
  55: '大毛毛雨',
  56: '冻毛毛雨',
  57: '强冻毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '强冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '强阵雨',
  82: '暴雨',
  85: '阵雪',
  86: '强阵雪',
  95: '雷暴',
  96: '雷暴冰雹',
  99: '强雷暴冰雹',
};

function getWeatherText(code: unknown) {
  const weatherCode = Number(code);
  return weatherCodeTextMap[weatherCode] || '未知';
}

function updateWeatherFallback() {
  weatherInfo.value = {
    city: '未知位置',
    text: '获取失败',
    temperature: '--',
    humidity: '--',
    wind: '--',
  };
}

type IpLocation = {
  city: string;
  latitude: number;
  longitude: number;
};

async function fetchJsonWithTimeout<T>(url: string, timeout = 5000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeWeatherCityName(value: unknown) {
  const text = String(value ?? '').trim();
  return text && text !== 'undefined' && text !== 'null' ? text : '';
}

async function resolveChineseLocationName(location: IpLocation) {
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set('localityLanguage', 'zh');

    const data = await fetchJsonWithTimeout<any>(url.toString());
    return (
      normalizeWeatherCityName(data?.city) ||
      normalizeWeatherCityName(data?.locality) ||
      normalizeWeatherCityName(data?.principalSubdivision) ||
      normalizeWeatherCityName(data?.countryName) ||
      location.city
    );
  } catch (error) {
    console.warn('中文地名反查失败，使用定位接口原始地名:', error);
    return location.city;
  }
}
async function resolveIpLocation(): Promise<IpLocation> {
  const providers: Array<() => Promise<IpLocation>> = [
    async () => {
      const data = await fetchJsonWithTimeout<any>('https://get.geojs.io/v1/ip/geo.json');
      const latitude = Number(data?.latitude);
      const longitude = Number(data?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('GeoJS定位数据无效');
      }
      return {
        city: data?.city || data?.region || data?.country || '当前位置',
        latitude,
        longitude,
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout<any>('https://ipapi.co/json/');
      const latitude = Number(data?.latitude);
      const longitude = Number(data?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('ipapi定位数据无效');
      }
      return {
        city: data?.city || data?.region || data?.country_name || '当前位置',
        latitude,
        longitude,
      };
    },
  ];

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      lastError = error;
      console.warn('IP定位接口不可用，尝试备用接口:', error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('IP定位失败');
}

async function loadWeatherByIp() {
  try {
    const location = await resolveIpLocation();
    const city = await resolveChineseLocationName(location);
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', String(location.latitude));
    weatherUrl.searchParams.set('longitude', String(location.longitude));
    weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code');
    weatherUrl.searchParams.set('wind_speed_unit', 'kmh');
    weatherUrl.searchParams.set('timezone', 'auto');

    const weatherData = await fetchJsonWithTimeout<any>(weatherUrl.toString());
    const current = weatherData?.current;
    if (!current) {
      throw new Error('天气数据为空');
    }

    weatherInfo.value = {
      city,
      text: getWeatherText(current.weather_code),
      temperature: Math.round(Number(current.temperature_2m)),
      humidity: Math.round(Number(current.relative_humidity_2m)) + '%',
      wind: Math.round(Number(current.wind_speed_10m)) + 'km/h',
    };
  } catch (error) {
    console.error('获取天气失败:', error);
    updateWeatherFallback();
  }
}

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

const WORKBENCH_PATH_SET = new Set<string>([
  '/erp/workbench',
  ...Object.values(MODULE_WORKBENCH_PATHS),
]);

const MODULE_COLOR_MAP: Record<ModuleScope, string> = {
  archives: '#2f7bff',
  contract: '#8b5cf6',
  project: '#14b8a6',
  hr: '#f72565',
  oa: '#2f7bff',
  supply: '#ff9800',
  finance: '#10b981',
  system: '#64748b',
};

const displayUserName = computed(() => {
  const userInfo = userStore.userInfo as any;
  return userInfo?.nickname || userInfo?.realName || userInfo?.name || userInfo?.username || '张明';
});

const userMeta = computed(() => {
  const userInfo = userStore.userInfo as any;
  return userInfo?.roles?.[0]?.name || userInfo?.roleName || '管理员';
});

const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
});

function normalizeTenantValue(value: unknown) {
  const text = String(value ?? '').trim();
  return text && text !== 'NaN' ? text : '';
}

function getTenantIdValue(tenant: TenantOption | null | undefined) {
  return normalizeTenantValue(tenant?.id ?? tenant?.ShortName ?? tenant?.rowid);
}

function getTenantNameValue(tenant: TenantOption | null | undefined) {
  return normalizeTenantValue(
    tenant?.shortCName ?? tenant?.ShortCName ?? tenant?.name ?? tenant?.CName ?? tenant?.Name ?? tenant?.ShortName,
  );
}

function getTenantFullNameValue(tenant: TenantOption | null | undefined) {
  return normalizeTenantValue(tenant?.fullName ?? tenant?.CName ?? tenant?.Name ?? tenant?.name);
}

function getTenantLogoValue(tenant: TenantOption | null | undefined) {
  return normalizeTenantValue(tenant?.logo ?? tenant?.enterpriseIcon ?? tenant?.EnterpriseIcon);
}

function resolveTenantLogoUrl(value: unknown) {
  const logo = normalizeTenantValue(value);
  if (!logo) return '';
  if (/^https?:\/\//i.test(logo) || logo.startsWith('data:')) return logo;
  if (logo.startsWith('/')) return logo;
  return `/entInfo/${logo.replace(/^\/+/, '')}`;
}
const selectedTenantId = computed(() => {
  const store = accessStore as any;
  return normalizeTenantValue(store.visitTenantId || store.tenantId);
});

const currentTenant = computed<TenantOption | null>(() => {
  const selectedId = selectedTenantId.value;
  if (!tenantList.value.length) return null;
  if (!selectedId) return tenantList.value[0] || null;
  return tenantList.value.find((item) => getTenantIdValue(item) === selectedId) || null;
});

const tenantInitial = computed(() => {
  const name = getTenantNameValue(currentTenant.value) || '企';
  return name.slice(0, 1);
});

const tenantLogoUrl = computed(() => resolveTenantLogoUrl(getTenantLogoValue(currentTenant.value)));

const tenantExpireText = computed(() => {
  const expireTime = currentTenant.value?.expireTime;
  if (!expireTime) return '以租户配置为准';
  const date = new Date(expireTime);
  if (Number.isNaN(date.getTime())) return String(expireTime);
  return date.toISOString().slice(0, 10);
});

const tenantVersionText = computed(() => {
  return currentTenant.value?.packageName || '当前租户';
});

const companyInfo = computed(() => ({
  name: getTenantNameValue(currentTenant.value) || '请选择租户',
  fullName: getTenantFullNameValue(currentTenant.value),
  expireAt: tenantExpireText.value,
  version: tenantVersionText.value,
  staffCount: currentTenant.value?.accountCount || 0,
  departmentCount: 0,
  onlineCount: 0,
}));

async function loadTenantList() {
  tenantLoading.value = true;
  const tenantStart = window.performance?.now?.() ?? Date.now();
  markWorkbenchPerf('tenant list start');
  try {
    const list = await getTenantSimpleList();
    tenantList.value = Array.isArray(list) ? (list as TenantOption[]) : [];
    markWorkbenchPerf('tenant list end', {
      duration: Number(((window.performance?.now?.() ?? Date.now()) - tenantStart).toFixed(2)),
      tenantCount: tenantList.value.length,
    });
    const selectedId = selectedTenantId.value;
    if (selectedId && !tenantList.value.some((item) => getTenantIdValue(item) === selectedId)) {
      const selectedName = normalizeTenantValue(selectedId);
      tenantList.value = [{ id: selectedId, name: selectedName }, ...tenantList.value];
    }
  } catch (error) {
    markWorkbenchPerf('tenant list error', {
      duration: Number(((window.performance?.now?.() ?? Date.now()) - tenantStart).toFixed(2)),
      message: error instanceof Error ? error.message : String(error),
    });
    console.error('获取租户信息失败:', error);
    tenantList.value = [];
  } finally {
    tenantLoading.value = false;
  }
}

function runAfterFirstPaint(task: () => void) {
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(task, 0);
      });
    });
  });
}

onMounted(() => {
  markWorkbenchPerf('workbench mounted');
  nextTick(() => {
    requestAnimationFrame(() => {
      markWorkbenchPerf('workbench first paint');
    });
  });

  runAfterFirstPaint(() => {
    markWorkbenchPerf('post first paint tasks start');
    loadTenantList();
    loadWeatherByIp();
    dynamicAccessStarted.value = true;
    void authStore.loadAccessInBackground();
  });
});

watch(selectedTenantId, () => {
  if (!tenantList.value.length) {
    loadTenantList();
  }
});

function normalizePath(path = '') {
  let normalized = String(path || '').trim().replace(/\\/g, '/').replace(/[?#].*$/, '');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/$/, '');
  return normalized.toLowerCase();
}

function normalizeBase(base = '/') {
  let normalized = String(base || '/').trim().replace(/\\/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (!normalized.endsWith('/')) normalized = `${normalized}/`;
  return normalized;
}

function inferModuleScopeByPath(path = ''): ModuleScope | null {
  const currentPath = normalizePath(path);
  if (!currentPath) return null;
  if (currentPath === '/archives' || currentPath.startsWith('/archives/')) return 'archives';
  if (currentPath === '/contract' || currentPath.startsWith('/contract/')) return 'contract';
  if (currentPath === '/project' || currentPath.startsWith('/project/') || currentPath === '/erp/project' || currentPath.startsWith('/erp/project/')) return 'project';
  if (currentPath === '/hr' || currentPath.startsWith('/hr/') || currentPath === '/erp/hr' || currentPath.startsWith('/erp/hr/')) return 'hr';
  if (currentPath === '/oa' || currentPath.startsWith('/oa/')) return 'oa';
  if (currentPath === '/finance' || currentPath.startsWith('/finance/')) return 'finance';
  if (currentPath === '/managementsys' || currentPath.startsWith('/managementsys/')) return 'system';
  if (
    currentPath === '/erp/client' || currentPath.startsWith('/erp/client/') ||
    currentPath === '/erp/sale' || currentPath.startsWith('/erp/sale/') ||
    currentPath === '/erp/purchase' || currentPath.startsWith('/erp/purchase/') ||
    currentPath === '/erp/stock' || currentPath.startsWith('/erp/stock/') ||
    currentPath === '/erp/inventory-accounting' || currentPath.startsWith('/erp/inventory-accounting/') ||
    currentPath === '/erp/product' || currentPath.startsWith('/erp/product/') ||
    currentPath === '/erp/basic_data' || currentPath.startsWith('/erp/basic_data/')
  ) return 'supply';
  return null;
}

function getUsableSelfPath(menu?: MenuRecordRaw | null): string {
  if (!menu) return '';
  const currentPath = normalizePath(menu.path || '');
  if (!currentPath || WORKBENCH_PATH_SET.has(currentPath)) return '';
  return menu.path || '';
}

function findFirstChildLeafPath(menu?: MenuRecordRaw | null): string {
  if (!menu) return '';
  for (const child of menu.children || []) {
    const childPath = findFirstLeafPath(child);
    if (childPath) return childPath;
  }
  return '';
}

function findFirstLeafPath(menu?: MenuRecordRaw | null): string {
  if (!menu) return '';
  return findFirstChildLeafPath(menu) || getUsableSelfPath(menu);
}

function resolveModuleScope(menu: MenuRecordRaw): ModuleScope | null {
  return inferModuleScopeByPath(menu.path || '') || inferModuleScopeByPath(findFirstLeafPath(menu));
}

function resolveAppEntry(menu: MenuRecordRaw): { moduleScope: ModuleScope | null; path: string } {
  const selfPath = getUsableSelfPath(menu);
  const childLeafPath = findFirstChildLeafPath(menu);
  const hasChildren = (menu.children || []).length > 0;
  const moduleScope = resolveModuleScope(menu);

  if (!hasChildren && selfPath) return { moduleScope, path: selfPath };
  if (moduleScope) return { moduleScope, path: MODULE_WORKBENCH_PATHS[moduleScope] };
  return { moduleScope: null, path: childLeafPath || selfPath };
}

function getMenuTextValue(menu: MenuRecordRaw, keys: string[]) {
  const source = menu as any;
  const meta = (source.meta || {}) as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key] ?? meta[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function buildMenuDesc(menu: MenuRecordRaw) {
  const configuredDesc = getMenuTextValue(menu, [
    'desc',
    'description',
    'subTitle',
    'subtitle',
    'remark',
  ]);
  if (configuredDesc) return configuredDesc;

  const children = menu.children || [];
  const childNames = children
    .map((child) => String(child.name || '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (childNames.length > 0) {
    return childNames.join(' / ');
  }

  return getMenuTextValue(menu, ['title']) || '点击进入模块';
}

const HIDDEN_SYSTEM_ENTRY_TITLES = new Set(['采购订单', '销售订单']);

const systemEntries = computed<PortalAppItem[]>(() => {
  const menus = (accessStore.accessMenus || []) as MenuRecordRaw[];
  const entries = menus
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
        color: moduleScope ? MODULE_COLOR_MAP[moduleScope] : '#64748b',
        moduleScope,
      };
    })
    .filter((item) => !!item.path && item.moduleScope !== 'oa' && !HIDDEN_SYSTEM_ENTRY_TITLES.has(String(item.title)));
  return entries;
});

const visibleSystemEntries = computed(() => systemEntries.value.slice(0, SYSTEM_PREVIEW_LIMIT));
const hasMoreSystemEntries = computed(() => systemEntries.value.length > SYSTEM_PREVIEW_LIMIT);
const dynamicAccessLoading = computed(() =>
  dynamicAccessStarted.value && authStore.accessLoading && !accessStore.isAccessChecked,
);

const openAllSystems = () => {
  allSystemsVisible.value = true;
};

const todoList = computed<TodoItem[]>(() => [
  { title: '李四的差旅报销单待审核', system: '财务云', time: '10分钟前', urgent: true, icon: Document, color: '#10b981', path: MODULE_WORKBENCH_PATHS.finance, moduleScope: 'finance' },
  { title: 'XX项目的合同需要法务审核', system: '协同云', time: '30分钟前', urgent: true, icon: Files, color: '#3b82f6', path: MODULE_WORKBENCH_PATHS.oa, moduleScope: 'oa' },
  { title: '采购订单PO-2024-001即将到货', system: '进销存', time: '1小时前', urgent: false, icon: Goods, color: '#f59e0b', path: MODULE_WORKBENCH_PATHS.supply, moduleScope: 'supply' },
  { title: '王五的请假申请待审批', system: '人力云', time: '1小时前', urgent: false, icon: Reading, color: '#f72565', path: MODULE_WORKBENCH_PATHS.hr, moduleScope: 'hr' },
  { title: '月度财务报表待确认', system: '财务云', time: '2小时前', urgent: false, icon: Coin, color: '#10b981', path: MODULE_WORKBENCH_PATHS.finance, moduleScope: 'finance' },
]);

type FlatMenuEntry = {
  name: string;
  path: string;
  moduleScope: ModuleScope | null;
};

function flattenVisibleLeafMenus(menus: MenuRecordRaw[] = []): FlatMenuEntry[] {
  const entries: FlatMenuEntry[] = [];

  const visit = (items: MenuRecordRaw[]) => {
    for (const menu of items || []) {
      const source = menu as any;
      const meta = (source.meta || {}) as Record<string, unknown>;
      const hidden = source.show === false || meta.hideMenu === true || meta.hideInMenu === true;
      if (hidden) continue;

      const children = (menu.children || []) as MenuRecordRaw[];
      if (children.length > 0) {
        visit(children);
        continue;
      }

      const name = String(menu.name || '').trim();
      const path = String(menu.path || '').trim();
      if (!name || !path || path.includes(':pathMatch')) continue;

      const normalizedPath = normalizePath(path);
      if (WORKBENCH_PATH_SET.has(normalizedPath)) continue;

      entries.push({
        name,
        path,
        moduleScope: inferModuleScopeByPath(path),
      });
    }
  };

  visit(menus);
  return entries;
}

function findQuickMenuEntry(entries: FlatMenuEntry[], names: string[]) {
  for (const name of names) {
    const exactHit = entries.find((entry) => entry.name === name);
    if (exactHit) return exactHit;
  }

  return entries.find((entry) => names.some((name) => entry.name.includes(name)));
}

function buildQuickEntry(
  entries: FlatMenuEntry[],
  options: {
    aliases: string[];
    color: string;
    icon: any;
  },
): QuickItem | null {
  const hit = findQuickMenuEntry(entries, options.aliases);
  if (!hit || !hit.moduleScope || !hit.path) return null;

  return {
    title: hit.name,
    icon: options.icon,
    color: options.color,
    path: hit.path,
    moduleScope: hit.moduleScope,
  };
}

const quickEntries = computed<QuickItem[]>(() => {
  const menus = (accessStore.accessMenus || []) as MenuRecordRaw[];
  const entries = flattenVisibleLeafMenus(menus);
  const usedPaths = new Set<string>();
  const result: QuickItem[] = [];

  const add = (item: QuickItem | null) => {
    if (!item || !item.path) return;
    const key = normalizePath(item.path);
    if (usedPaths.has(key)) return;
    usedPaths.add(key);
    result.push(item);
  };

  // 快捷入口只展示真实动态导航里存在的叶子菜单；没有真实路径的不再显示，避免跳转到错误页面。
  [
    {
      aliases: ['请假加班', '请假申请', '请假'],
      icon: Reading,
      color: '#f72565',
    },
    {
      aliases: ['付款申请', '其他支出', '支出结算'],
      icon: Money,
      color: '#10b981',
    },
    {
      aliases: ['工资明细项管理', '工资项目管理', '工资明细'],
      icon: CreditCard,
      color: '#ff9800',
    },
    {
      aliases: ['项目建档', '日报周报'],
      icon: Promotion,
      color: '#0ea5e9',
    },
    {
      aliases: ['收款提报', '收入结算'],
      icon: Briefcase,
      color: '#6366f1',
    },
    {
      aliases: ['收入合同', '支出合同', '合同起草'],
      icon: Operation,
      color: '#f97316',
    },
  ].forEach((config) => add(buildQuickEntry(entries, config)));

  return result.slice(0, 6);
});

const notices = [
  { title: '关于2024年度总结表彰大会的通知', time: '今天 10:30', important: true },
  { title: '元旦假期值班安排表', time: '昨天 16:00', important: false },
  { title: '新OA系统上线培训通知', time: '12-20', important: false },
];

async function closeWorkbenchTabSafely() {
  try {
    await closeTabByKey('/erp/workbench');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (!message.includes('only one tab remains open')) {
      throw error;
    }
  }
}

const openEntry = async (path: string, moduleScope?: ModuleScope | null) => {
  allSystemsVisible.value = false;
  if (!path) return;
  if (isHttpUrl(path)) {
    window.location.href = path;
    return;
  }
  await router.push({
    path,
    query: moduleScope ? { [MODULE_SCOPE_QUERY_KEY]: moduleScope } : {},
  });
  await closeWorkbenchTabSafely();
};
</script>

<template>
  <Page auto-content-height>
    <div class="portal-workbench">
      <section class="top-grid">
        <div class="company-card panel-card">
          <div class="brand-box" :class="{ 'has-logo': !!tenantLogoUrl }">
            <img v-if="tenantLogoUrl" :src="tenantLogoUrl" :alt="companyInfo.name" />
            <span v-else>{{ tenantInitial }}</span>
          </div>
          <div class="company-main">
            <div class="company-title-row">
              <h2>{{ companyInfo.name }}</h2>
              <ElTag size="small" type="warning" effect="light">{{ companyInfo.version }}</ElTag>
              <span class="expire">到期：{{ companyInfo.expireAt }}</span>
            </div>
            <div class="company-meta">
              <span><ElIcon><UserFilled /></ElIcon> 账号 {{ companyInfo.staffCount || '-' }} 个</span>
              <span><ElIcon><Connection /></ElIcon> 租户 {{ selectedTenantId || '-' }}</span>
              <span class="online">● 当前选中</span>
            </div>
          </div>
          <div class="user-divider"></div>
          <div class="user-card">
            <div class="avatar">{{ displayUserName.slice(0, 1) }}</div>
            <div>
              <div class="user-name">{{ displayUserName }}</div>
              <div class="user-role">{{ userMeta }}</div>
              <div class="user-date">{{ currentDate }}</div>
            </div>
          </div>
        </div>

        <div class="weather-card panel-card">
          <div class="weather-location">
            <span><ElIcon><Location /></ElIcon>{{ weatherInfo.city }}</span>
            <ElTag size="small" type="primary" effect="light">{{ weatherInfo.text }}</ElTag>
          </div>
          <div class="weather-body"><ElIcon class="sun-icon"><Sunny /></ElIcon><strong>{{ weatherInfo.temperature }}°</strong></div>
          <div class="weather-extra"><span>湿度 {{ weatherInfo.humidity }}</span><span>风速 {{ weatherInfo.wind }}</span></div>
        </div>
      </section>

      <section class="panel-card entry-panel">
        <div class="section-head">
          <div class="section-title"><ElIcon><Grid /></ElIcon><span>子系统入口</span></div>
          <button class="text-link" type="button" :title="hasMoreSystemEntries ? '查看全部子系统入口' : '查看当前全部子系统入口'" @click="openAllSystems">查看全部</button>
        </div>
        <div v-if="dynamicAccessLoading" class="access-loading">
          <span class="access-loading-spinner"></span>
          <div>正在加载导航与权限，请稍候...</div>
        </div>
        <div v-else-if="visibleSystemEntries.length > 0" class="system-grid">
          <button v-for="item in visibleSystemEntries" :key="`${item.title}-${item.path}`" class="system-item" type="button" @click="openEntry(item.path, item.moduleScope)">
            <span class="system-icon" :style="{ backgroundColor: item.color }">
              <IconifyIcon v-if="item.icon" :icon="item.icon" class="system-iconify" />
              <ElIcon v-else><OfficeBuilding /></ElIcon>
            </span>
            <span class="system-title">{{ item.title }}</span>
            <span class="system-desc">{{ item.desc }}</span>
          </button>
        </div>
        <div v-else-if="!dynamicAccessStarted && !accessStore.isAccessChecked" class="access-placeholder">
          首页已加载，导航入口稍后显示
        </div>
        <ElEmpty v-else description="暂无可访问的子系统入口" />
      </section>

      <ElDialog v-model="allSystemsVisible" title="全部子系统入口" width="760px" class="system-dialog">
        <div v-if="systemEntries.length > 0" class="dialog-system-grid">
          <button v-for="item in systemEntries" :key="`dialog-${item.title}-${item.path}`" class="dialog-system-item" type="button" @click="openEntry(item.path, item.moduleScope)">
            <span class="system-icon" :style="{ backgroundColor: item.color }">
              <IconifyIcon v-if="item.icon" :icon="item.icon" class="system-iconify" />
              <ElIcon v-else><OfficeBuilding /></ElIcon>
            </span>
            <span class="dialog-system-main">
              <span class="system-title">{{ item.title }}</span>
              <span class="system-desc">{{ item.desc }}</span>
            </span>
          </button>
        </div>
        <ElEmpty v-else description="暂无可访问的子系统入口" />
      </ElDialog>

      <section class="content-grid">
        <div class="todo-panel panel-card">
          <div class="section-head">
            <div class="section-title dark"><ElIcon class="orange"><Clock /></ElIcon><span>待办事项</span></div>
            <ElTag size="small" type="warning" effect="light">{{ todoList.length }} 待处理</ElTag>
          </div>
          <div class="todo-list">
            <button v-for="todo in todoList" :key="todo.title" class="todo-row" type="button" @click="openEntry(todo.path, todo.moduleScope)">
              <span class="todo-icon" :style="{ color: todo.color, backgroundColor: `${todo.color}18` }"><ElIcon><component :is="todo.icon" /></ElIcon></span>
              <span class="todo-content"><span class="todo-title">{{ todo.title }}</span><span class="todo-meta"><ElTag size="small" effect="light">{{ todo.system }}</ElTag><em>{{ todo.time }}</em></span></span>
              <ElTag v-if="todo.urgent" size="small" type="danger" effect="light">加急</ElTag>
              <span v-else class="todo-muted">普通</span>
            </button>
          </div>
          <button class="more-link" type="button">查看全部待办 ＞</button>
        </div>

        <div class="side-stack">
          <div class="quick-panel panel-card">
            <div class="section-head"><div class="section-title dark"><ElIcon class="orange"><Lightning /></ElIcon><span>快捷入口</span></div><button class="text-muted" type="button">编辑</button></div>
            <div class="quick-grid">
              <button v-for="entry in quickEntries" :key="entry.title" class="quick-item" type="button" @click="openEntry(entry.path, entry.moduleScope)">
                <span class="quick-icon" :style="{ backgroundColor: entry.color }"><ElIcon><component :is="entry.icon" /></ElIcon></span>
                <span>{{ entry.title }}</span>
              </button>
            </div>
          </div>

          <div class="notice-panel panel-card">
            <div class="section-head"><div class="section-title dark"><ElIcon><Bell /></ElIcon><span>企业公告</span></div><ElTag size="small" type="info" effect="light">3</ElTag></div>
            <div class="notice-list">
              <button v-for="notice in notices" :key="notice.title" class="notice-row" type="button">
                <span v-if="notice.important" class="notice-dot">◆</span>
                <span class="notice-main"><span class="notice-title">{{ notice.title }}</span><span class="notice-time">{{ notice.time }}</span></span>
              </button>
            </div>
            <button class="more-link" type="button">查看全部公告 ＞</button>
          </div>
        </div>
      </section>

    </div>
  </Page>
</template>

<style scoped>
.portal-workbench { min-height: 100%; padding: 0 0 16px; color: #172033; background: #f6f8fb; }
.panel-card { background: rgb(255 255 255 / 96%); border: 1px solid #e9edf5; border-radius: 12px; box-shadow: 0 4px 16px rgb(30 41 59 / 4%); }
.top-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 16px; margin-bottom: 16px; }
.company-card { display: flex; min-height: 122px; padding: 28px 32px; align-items: center; }
.brand-box, .avatar { display: inline-flex; color: #fff; background: linear-gradient(135deg, #1b74ff, #2563eb); align-items: center; justify-content: center; flex-shrink: 0; }
.brand-box { width: 52px; height: 52px; margin-right: 18px; font-size: 24px; font-weight: 800; border-radius: 12px; box-shadow: 0 10px 20px rgb(37 99 235 / 25%); overflow: hidden; }
.brand-box.has-logo { background: #fff; border: 1px solid #e6edf7; }
.brand-box img { display: block; width: 100%; height: 100%; object-fit: contain; padding: 5px; }
.company-main { min-width: 0; flex: 1; }
.company-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.company-title-row h2 { margin: 0; font-size: 18px; font-weight: 700; line-height: 1.4; }
.expire, .company-meta, .user-date, .system-desc, .todo-meta, .notice-time, .text-muted, .todo-muted { font-size: 12px; color: #7b8aa6; }
.company-meta { display: flex; margin-top: 10px; align-items: center; gap: 14px; flex-wrap: wrap; }
.company-meta span, .weather-location span, .section-title { display: inline-flex; align-items: center; gap: 5px; }
.online { color: #10b981; }
.user-divider { width: 1px; height: 54px; margin: 0 32px; background: #e7edf6; }
.user-card { display: flex; min-width: 126px; align-items: center; gap: 12px; }
.avatar { width: 38px; height: 38px; font-weight: 700; border-radius: 50%; }
.user-name { font-size: 14px; font-weight: 700; }
.user-role { margin-top: 2px; font-size: 12px; color: #334155; }
.weather-card { position: relative; min-height: 122px; padding: 24px 28px; overflow: hidden; background: linear-gradient(135deg, #eef8ff 0%, #f8fcff 100%); }
.weather-card::after { position: absolute; right: -28px; bottom: -28px; width: 120px; height: 120px; content: ''; background: rgb(59 130 246 / 8%); border-radius: 50%; }
.weather-location, .weather-body { display: flex; align-items: center; justify-content: space-between; }
.weather-location { color: #4b78a8; }
.weather-body { width: 125px; margin-top: 16px; }
.sun-icon { font-size: 38px; color: #f59e0b; }
.weather-body strong { font-size: 30px; font-weight: 800; }
.weather-extra { position: absolute; right: 28px; bottom: 28px; display: flex; color: #60789c; font-size: 12px; flex-direction: column; gap: 8px; z-index: 1; }
.entry-panel { padding: 22px 26px 28px; margin-bottom: 16px; }
.section-head { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 15px; font-weight: 700; color: #1d74ff; }
.section-title.dark { color: #172033; }
.orange { color: #f59e0b; }
.text-link, .text-muted, .more-link { padding: 0; cursor: pointer; background: none; border: 0; }
.text-link { font-size: 12px; color: #2878ff; }
.system-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 20px; padding-top: 30px; }
.access-loading { display: flex; min-height: 110px; color: #5b6b84; font-size: 14px; align-items: center; justify-content: center; flex-direction: column; gap: 12px; }
.access-loading-spinner { width: 30px; height: 30px; border: 3px solid #dbeafe; border-top-color: #2f7bff; border-radius: 50%; animation: access-loading-spin 0.9s linear infinite; }
.access-placeholder { display: flex; min-height: 110px; color: #94a3b8; font-size: 14px; align-items: center; justify-content: center; }
@keyframes access-loading-spin { to { transform: rotate(360deg); } }
.dialog-system-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.system-item, .quick-item, .todo-row, .notice-row, .dialog-system-item { cursor: pointer; background: transparent; border: 0; }
.system-item { display: flex; min-height: 72px; align-items: center; flex-direction: column; justify-content: flex-start; }
.dialog-system-item { display: flex; min-height: 76px; padding: 14px; text-align: left; border: 1px solid #eef2f7; border-radius: 12px; align-items: center; gap: 12px; transition: all 0.2s; }
.dialog-system-item:hover { background: #f8fbff; border-color: #dce8f7; }
.dialog-system-main { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.system-icon, .quick-icon, .todo-icon { display: inline-flex; color: #fff; align-items: center; justify-content: center; }
.system-icon { width: 36px; height: 36px; margin-bottom: 9px; font-size: 18px; border-radius: 9px; box-shadow: 0 8px 16px rgb(15 23 42 / 12%); }
.system-iconify { font-size: 18px; }
.system-title { font-size: 13px; color: #283449; }
.system-desc { margin-top: 4px; }
.content-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 16px; }
.todo-panel { min-height: 488px; padding: 22px 0 18px; }
.todo-panel .section-head, .quick-panel .section-head, .notice-panel .section-head { padding: 0 24px; }
.todo-list { margin-top: 26px; }
.todo-row { display: flex; width: 100%; padding: 14px 24px; text-align: left; border-bottom: 1px solid #eef2f7; align-items: center; gap: 13px; transition: background 0.2s; }
.todo-row:hover, .notice-row:hover { background: #f8fbff; }
.todo-icon { width: 34px; height: 34px; font-size: 17px; border-radius: 9px; flex-shrink: 0; }
.todo-content { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 6px; }
.todo-title { overflow: hidden; font-size: 14px; color: #263247; text-overflow: ellipsis; white-space: nowrap; }
.todo-meta { display: flex; align-items: center; gap: 8px; }
.todo-meta em { font-style: normal; }
.todo-muted { opacity: 0.45; }
.more-link { display: block; margin: 24px auto 0; font-size: 13px; color: #7185a3; }
.side-stack { display: flex; flex-direction: column; gap: 16px; }
.quick-panel, .notice-panel { padding: 22px 0 24px; }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px 18px; padding: 28px 32px 0; }
.quick-item { display: flex; color: #344054; font-size: 12px; align-items: center; flex-direction: column; gap: 9px; }
.quick-icon { width: 34px; height: 34px; font-size: 17px; border-radius: 9px; }
.notice-list { padding-top: 24px; }
.notice-row { position: relative; display: flex; width: 100%; padding: 13px 24px; text-align: left; border-bottom: 1px solid #eef2f7; align-items: flex-start; gap: 8px; }
.notice-dot { margin-top: 2px; color: #ef4444; font-size: 10px; }
.notice-main { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
.notice-title { overflow: hidden; color: #273449; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1200px) { .system-grid { grid-template-columns: repeat(4, minmax(90px, 1fr)); } .top-grid, .content-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .company-card { padding: 20px; align-items: flex-start; flex-direction: column; } .brand-box { margin-right: 0; margin-bottom: 14px; } .user-divider { width: 100%; height: 1px; margin: 18px 0; } .system-grid, .quick-grid, .dialog-system-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .weather-extra { position: static; margin-top: 14px; } }
@media (max-width: 576px) { .dialog-system-grid { grid-template-columns: 1fr; } }
</style>
