import { ElMessageBox, ElNotification } from 'element-plus';

interface AppVersionPayload {
  buildTime?: string;
  version?: string;
}

declare const __APP_BUILD_TIME__: string;
declare const __APP_VERSION__: string;

const VERSION_FILE = `${import.meta.env.BASE_URL}version.json`;
const CURRENT_SIGNATURE = buildSignature({
  buildTime: __APP_BUILD_TIME__,
  version: __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || 'dev',
});
const STORAGE_KEY = 'web-ele:update-notifier:last-signature';
const DEFAULT_INTERVAL = 1000 * 60 * 2;

let timer: number | undefined;
let prompting = false;

function buildSignature(payload?: AppVersionPayload | null) {
  if (!payload) {
    return '';
  }
  return [payload.version || 'unknown', payload.buildTime || 'unknown'].join('__');
}

async function fetchRemoteVersion() {
  const response = await fetch(`${VERSION_FILE}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      pragma: 'no-cache',
      'cache-control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`fetch version failed: ${response.status}`);
  }

  return (await response.json()) as AppVersionPayload;
}

function markPrompted(signature: string) {
  sessionStorage.setItem(STORAGE_KEY, signature);
}

function wasPrompted(signature: string) {
  return sessionStorage.getItem(STORAGE_KEY) === signature;
}

async function promptRefresh(remote: AppVersionPayload, remoteSignature: string) {
  if (prompting || wasPrompted(remoteSignature)) {
    return;
  }

  prompting = true;
  markPrompted(remoteSignature);

  ElNotification({
    duration: 5000,
    message: '检测到系统已发布新版本，建议刷新浏览器以获取最新功能。',
    title: '发现新版本',
    type: 'warning',
  });

  try {
    await ElMessageBox.confirm(
      `当前系统已有新版本可用。\n当前版本：${__APP_VERSION__ || import.meta.env.VITE_APP_VERSION || 'dev'}\n最新版本：${remote.version || 'unknown'}\n发布时间：${remote.buildTime || 'unknown'}\n\n点击“立即刷新”后将重新加载页面。`,
      '系统更新提醒',
      {
        autofocus: true,
        cancelButtonText: '稍后再说',
        closeOnClickModal: false,
        closeOnPressEscape: true,
        confirmButtonText: '立即刷新',
        distinguishCancelAndClose: true,
        type: 'warning',
      },
    );

    window.location.reload();
  } catch {
    // 用户选择稍后处理，本次会话不重复打扰同一版本
  } finally {
    prompting = false;
  }
}

async function checkForAppUpdate() {
  if (document.visibilityState === 'hidden') {
    return;
  }

  try {
    const remote = await fetchRemoteVersion();
    const remoteSignature = buildSignature(remote);

    if (!remoteSignature || remoteSignature === CURRENT_SIGNATURE) {
      return;
    }

    await promptRefresh(remote, remoteSignature);
  } catch (error) {
    console.warn('[app-update] version check failed', error);
  }
}

function startAppUpdateNotifier(interval = DEFAULT_INTERVAL) {
  if (!import.meta.env.PROD || timer) {
    return;
  }

  void checkForAppUpdate();

  timer = window.setInterval(() => {
    void checkForAppUpdate();
  }, interval);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForAppUpdate();
    }
  });
}

export { startAppUpdateNotifier };
