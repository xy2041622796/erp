const NAVIGATION_MENU_CACHE_KEY = 'lmbill:navigation-menus';
const NAVIGATION_MENU_BUILD_SIGNATURE_KEY = 'lmbill:navigation-menus:build-signature';

declare const __APP_BUILD_TIME__: string | undefined;
declare const __APP_VERSION__: string | undefined;

function canUseLocalStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function getCurrentBuildSignature() {
  const version =
    typeof __APP_VERSION__ === 'undefined'
      ? import.meta.env.VITE_APP_VERSION || 'dev'
      : __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || 'dev';
  const buildTime =
    typeof __APP_BUILD_TIME__ === 'undefined'
      ? import.meta.env.VITE_APP_BUILD_TIME || ''
      : __APP_BUILD_TIME__ || import.meta.env.VITE_APP_BUILD_TIME || '';

  return [version, buildTime].filter(Boolean).join('__') || 'dev';
}

function ensureNavigationMenuCacheBuildSignature() {
  if (!canUseLocalStorage()) return;

  try {
    const currentSignature = getCurrentBuildSignature();
    const storedSignature = window.localStorage.getItem(
      NAVIGATION_MENU_BUILD_SIGNATURE_KEY,
    );

    if (storedSignature !== currentSignature) {
      window.localStorage.removeItem(NAVIGATION_MENU_CACHE_KEY);
      window.localStorage.setItem(
        NAVIGATION_MENU_BUILD_SIGNATURE_KEY,
        currentSignature,
      );
    }
  } catch {
    clearCachedNavigationMenus();
  }
}

export function getCachedNavigationMenus<T = any>() {
  if (!canUseLocalStorage()) return null;

  ensureNavigationMenuCacheBuildSignature();

  try {
    const raw = window.localStorage.getItem(NAVIGATION_MENU_CACHE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    clearCachedNavigationMenus();
    return null;
  }
}

export function setCachedNavigationMenus(data: any) {
  if (!canUseLocalStorage()) return;

  ensureNavigationMenuCacheBuildSignature();

  try {
    window.localStorage.setItem(NAVIGATION_MENU_CACHE_KEY, JSON.stringify(data));
  } catch {
    clearCachedNavigationMenus();
  }
}

export function clearCachedNavigationMenus() {
  if (!canUseLocalStorage()) return;

  window.localStorage.removeItem(NAVIGATION_MENU_CACHE_KEY);
}
