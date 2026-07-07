<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import {
  bindThirdAccountByCode,
  getUserProfile,
} from '#/api/system/user/profile';

import { ElButton, ElMessage } from 'element-plus';

type BindType = 'WECHAT_CORP_WEB' | 'WECHAT_WEB';

declare global {
  interface Window {
    WxLogin?: new (options: Record<string, any>) => any;
    WWLogin?: any;
    ww?: any;
  }
}

const route = useRoute();
const loading = ref(true);
const binding = ref(false);
const statusText = ref('二维码加载中...');
const errorText = ref('');
const qrContainerRef = ref<HTMLElement>();

const bindingCode = computed(() => String(route.query.bindingCode || 'Wx'));
const authCode = computed(() => String(route.query.code || ''));
const state = computed(() => String(route.query.state || ''));
const targetType = computed<BindType>(() =>
  bindingCode.value === 'QyWx' || bindingCode.value === 'QyWxK'
    ? 'WECHAT_CORP_WEB'
    : 'WECHAT_WEB',
);
const platformName = computed(() =>
  targetType.value === 'WECHAT_CORP_WEB' ? '企业微信' : '微信',
);

function getEntFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts.length > 0 ? parts[0] : '';
}

async function getCurrentEnt() {
  try {
    const profile = await getUserProfile();
    return profile.entId || getEntFromUrl();
  } catch {
    return getEntFromUrl();
  }
}

const THIRD_BIND_REDIRECT_ORIGIN = String(import.meta.env.VITE_THIRD_BIND_PAGE_ORIGIN || '');

function buildCurrentRedirectUrl() {
  const url = new URL(window.location.href);
  const redirectOrigin = THIRD_BIND_REDIRECT_ORIGIN.trim();

  if (redirectOrigin) {
    const originUrl = new URL(redirectOrigin);
    url.protocol = originUrl.protocol;
    url.host = originUrl.host;
  }

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  return url.toString();
}

function generateRandomState() {
  const text = `${Math.random().toString(36).slice(2, 18)}${Date.now().toString(36)}`;
  const result = text.replaceAll(/[^a-zA-Z0-9]/g, '');
  window.sessionStorage.setItem('profile_third_bind_state', result);
  return result;
}

function removeAuthQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.toString());
}

function notifyParentSuccess() {
  window.opener?.postMessage?.(
    {
      source: 'profile-third-account-bind',
      type: 'success',
      target: targetType.value,
    },
    window.location.origin,
  );
}

async function submitBind(token: string) {
  if (!token || binding.value) {
    return;
  }

  binding.value = true;
  statusText.value = '正在绑定账号...';
  errorText.value = '';

  try {
    const ent = await getCurrentEnt();
    const resp = await bindThirdAccountByCode({
      ent,
      type: 'MOBILE',
      scene: 'BIND_THIRD_ACCOUNT',
      token,
      target: targetType.value,
    });
    const data = (resp as any)?.data ?? resp;
    const result = data?.data ?? data;
    const success =
      result?.Code === 200 ||
      result?.code === 200 ||
      result?.Type === 'success' ||
      result?.success === true;

    if (!success) {
      throw new Error(result?.Message || result?.message || '绑定失败，请稍后重试');
    }

    ElMessage.success(`${platformName.value}绑定成功`);
    statusText.value = '绑定成功，窗口即将关闭...';
    notifyParentSuccess();
    window.setTimeout(() => window.close(), 800);
  } catch (error: any) {
    errorText.value = error?.message || '绑定失败，请稍后重试';
    statusText.value = '绑定失败';
  } finally {
    binding.value = false;
    removeAuthQuery();
  }
}

async function loadScript(src: string, test: () => boolean) {
  if (test()) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const existed = Array.from(document.scripts).find((item) => item.src === src);
    if (existed) {
      existed.addEventListener('load', () => resolve(), { once: true });
      existed.addEventListener('error', () => reject(new Error('脚本加载失败')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('脚本加载失败'));
    document.head.appendChild(script);
  });
}

function initWechatLogin() {
  if (!qrContainerRef.value || !window.WxLogin) {
    throw new Error('微信扫码组件加载失败');
  }

  const currentState = generateRandomState();
  const redirectUri = encodeURIComponent(buildCurrentRedirectUrl());
  qrContainerRef.value.innerHTML = '<div id="profile_wx_login_container"></div>';

  new window.WxLogin({
    self_redirect: false,
    id: 'profile_wx_login_container',
    appid: 'wx2871aa287b547c7b',
    scope: 'snsapi_login',
    redirect_uri: redirectUri,
    state: currentState,
    style: '',
    href: '',
    fast_login: 1,
    color_scheme: 'auto',
    onReady() {
      statusText.value = '请使用微信扫码绑定';
    },
    onQRcodeReady() {
      loading.value = false;
      statusText.value = '请使用微信扫码绑定';
    },
  });
}

function initWechatCorpLogin() {
  if (!qrContainerRef.value || !window.ww?.createWWLoginPanel) {
    throw new Error('企业微信扫码组件加载失败');
  }

  const currentState = generateRandomState();
  qrContainerRef.value.innerHTML = '<div id="profile_ww_login_container"></div>';

  window.ww.createWWLoginPanel({
    el: '#profile_ww_login_container',
    params: {
      login_type: 'CorpApp',
      appid: 'ww799bdfa25307a991',
      agentid: '1000025',
      redirect_uri: buildCurrentRedirectUrl(),
      state: currentState,
      panel_size: 'small',
      lang: 'zh',
      redirect_type: 'callback',
      auto_login: false,
    },
    onLoginSuccess({ code }: { code: string }) {
      submitBind(code);
    },
    onLoginFail(error: unknown) {
      console.error('企业微信扫码失败', error);
      errorText.value = '扫码失败，请重试';
    },
    onPanelReady() {
      loading.value = false;
      statusText.value = '请使用企业微信扫码绑定';
    },
  });
}

async function initQrCode() {
  errorText.value = '';
  loading.value = true;
  statusText.value = '二维码加载中...';

  if (authCode.value) {
    const storedState = window.sessionStorage.getItem('profile_third_bind_state');
    if (state.value && storedState && state.value !== storedState) {
      errorText.value = '绑定请求非法，请重新扫码';
      loading.value = false;
      removeAuthQuery();
      return;
    }
    window.sessionStorage.removeItem('profile_third_bind_state');
    await submitBind(authCode.value);
    return;
  }

  try {
    await nextTick();
    if (targetType.value === 'WECHAT_WEB') {
      await loadScript('https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js', () => Boolean(window.WxLogin));
      initWechatLogin();
      return;
    }

    await loadScript('https://wwcdn.weixin.qq.com/node/open/js/wecom-jssdk-2.0.2.js', () => Boolean(window.ww?.createWWLoginPanel));
    if (!window.ww?.createWWLoginPanel) {
      await loadScript('https://res.wx.qq.com/wwopen/js/wwlogin-1.0.0.js', () => Boolean(window.WWLogin));
      window.ww = window.ww || window.WWLogin;
    }
    initWechatCorpLogin();
  } catch (error: any) {
    console.error(error);
    errorText.value = error?.message || '二维码加载失败，请刷新重试';
    statusText.value = '二维码加载失败';
    loading.value = false;
  }
}

onMounted(initQrCode);
</script>

<template>
  <div class="bind-page">
    <div class="bind-card">
      <div class="platform-icon" :class="targetType === 'WECHAT_CORP_WEB' ? 'corp' : 'wechat'">
        <IconifyIcon :icon="targetType === 'WECHAT_CORP_WEB' ? 'ri:wechat-channels-fill' : 'ant-design:wechat-filled'" />
      </div>
      <h2>{{ platformName }}账号绑定</h2>
      <p class="bind-desc">扫码确认后，将自动完成账号绑定或换绑。</p>

      <div ref="qrContainerRef" class="qr-box">
        <div v-if="loading" class="qr-placeholder">{{ statusText }}</div>
      </div>

      <p class="status" :class="{ error: errorText }">
        {{ errorText || statusText }}
      </p>

      <div class="actions">
        <ElButton @click="window.close()">关闭</ElButton>
        <ElButton type="primary" @click="initQrCode">刷新二维码</ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bind-page {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 12px;
  box-sizing: border-box;
  overflow: auto;
  background: linear-gradient(180deg, #f5f8ff 0%, #eef3fb 100%);
}

.bind-card {
  width: 500px;
  padding: 14px 16px 16px;
  text-align: center;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgb(15 23 42 / 10%);
}

.platform-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 6px;
  font-size: 28px;
  border-radius: 50%;
  background: #f3f7ff;
}

.platform-icon.wechat {
  color: #16ba43;
}

.platform-icon.corp {
  color: #1ba8ff;
}

h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.bind-desc {
  margin: 5px 0 8px;
  font-size: 13px;
  color: #667085;
}

.qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 420px;
  min-height: 430px;
  margin: 0 auto;
  overflow: visible;
  background: #fff;
  border: 1px solid #e7edf6;
  border-radius: 12px;
}

.qr-placeholder {
  font-size: 14px;
  color: #8a94a6;
}

.status {
  min-height: 20px;
  margin: 8px 0 0;
  font-size: 13px;
  color: #667085;
}

.status.error {
  color: #f56c6c;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

:deep(#profile_wx_login_container),
:deep(#profile_ww_login_container) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 420px;
  min-height: 430px;
  overflow: visible;
}

:deep(#profile_wx_login_container iframe),
:deep(#profile_ww_login_container iframe) {
  width: 420px !important;
  min-width: 420px !important;
  height: 430px !important;
  min-height: 430px !important;
  border: 0;
}

:deep(.ww_loginPanel) {
  margin: 0 auto;
}
</style>
