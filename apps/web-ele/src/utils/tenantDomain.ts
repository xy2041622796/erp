export const TENANT_SHORT_NAME_DOMAIN_SUFFIX = '.erp.lingmacn.com';
export const DEFAULT_TENANT_LOGO = 'http://192.168.124.10/entInfo/NewApp/LingMa.png';

const AUTH_TENANT_CACHE_KEY = 'lm_auth_current_tenant';

function getCurrentHostname() {
  return typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
}

export function getTenantShortNameFromHost(hostname = getCurrentHostname()) {
  const host = String(hostname || '').toLowerCase();
  if (!host.endsWith(TENANT_SHORT_NAME_DOMAIN_SUFFIX)) return '';

  const shortName =
    host.slice(0, -TENANT_SHORT_NAME_DOMAIN_SUFFIX.length).split('.').pop() || '';
  return shortName && shortName !== 'www' ? shortName : '';
}

export function isTenantShortNameSubdomain(hostname = getCurrentHostname()) {
  return Boolean(getTenantShortNameFromHost(hostname));
}

export function getTenantMatchValueFromLocation() {
  if (typeof window === 'undefined') return '';

  const urlParams = new URLSearchParams(window.location.search);
  const entIdParam = urlParams.get('entid');
  return entIdParam
    ? decodeURIComponent(entIdParam)
    : getTenantShortNameFromHost(window.location.hostname);
}

export function getTenantDisplayName(tenant: any, fallback = '') {
  return tenant?.name || tenant?.shortCName || tenant?.fullName || tenant?.shortName || fallback;
}

export function getTenantLogo(tenant: any) {
  return tenant?.enterpriseIcon || tenant?.logo || DEFAULT_TENANT_LOGO;
}

export function getCachedAuthTenant<T = any>() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(AUTH_TENANT_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (cached?.host !== getCurrentHostname()) return null;
    return (cached?.tenant || null) as T | null;
  } catch {
    return null;
  }
}

export function setCachedAuthTenant(tenant: any) {
  if (typeof window === 'undefined') return;

  try {
    if (!tenant) {
      window.sessionStorage.removeItem(AUTH_TENANT_CACHE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      AUTH_TENANT_CACHE_KEY,
      JSON.stringify({
        host: getCurrentHostname(),
        shortName: getTenantShortNameFromHost(),
        tenant,
      }),
    );
  } catch {
    // 忽略隐私模式或存储不可用导致的异常，不影响登录注册主流程
  }
}
