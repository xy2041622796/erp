<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import type { AuthApi } from '#/api/core/auth';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { AuthenticationLogin, Verification, z } from '@vben/common-ui';
import { isCaptchaEnable, isTenantEnable } from '@vben/hooks';
import { $t } from '@vben/locales';
import { useAccessStore } from '@vben/stores';

import { Iphone, User } from '@element-plus/icons-vue';
import { Icon as IconifyIcon } from '@iconify/vue';
import { ElMessage } from 'element-plus';

import {
  checkCaptcha,
  getCaptcha,
  getTenantSimpleList,
  sendLoginCode,
  socialAuthRedirect,
  thirdPartyBindAccount,
  thirdPartyLogin,
} from '#/api/core/auth';
import { useAuthStore } from '#/store';
import {
  getCachedAuthTenant,
  getTenantDisplayName,
  getTenantLogo,
  isTenantShortNameSubdomain,
  setCachedAuthTenant,
} from '#/utils/tenantDomain';

import AccountBindingPanel from './components/account-binding-panel.vue';

defineOptions({ name: 'Login' });

const appTitle = import.meta.env.VITE_APP_TITLE;
const route = useRoute();
const { query } = route;
const router = useRouter();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const tenantEnable = isTenantEnable();
const captchaEnable = isCaptchaEnable();

const loginRef = ref();
const verifyRef = ref();

const captchaType = 'blockPuzzle';

const ERP_WORKBENCH_PATH = '/erp/workbench';
const mobileCodeCountdown = ref(0);
const authMode = ref<'account' | 'bind' | 'mobile' | 'wechat'>('account');
const phoneLoginForm = reactive({
  phone: '',
  code: '',
});
const qrContainerRef = ref<HTMLElement | null>(null);
const qrLoading = ref(false);
const qrError = ref('');
const SPARK_AUTH_BASE_URL = 'https://spark.lingmacn.com/';
const SPARK_AUTH_ORIGIN = new URL(SPARK_AUTH_BASE_URL).origin;
const WECHAT_WEB_APPID =
  import.meta.env.VITE_WX_OPEN_APP_ID ||
  import.meta.env.VITE_WECHAT_OPEN_APP_ID ||
  import.meta.env.VITE_WX_APP_ID ||
  'wx2871aa287b547c7b';
let mobileCodeTimer: null | ReturnType<typeof setInterval> = null;
let wxLoginScriptPromise: null | Promise<void> = null;
let thirdPartyLoginSubmitting = false;
const submittedThirdPartyCodeMap: Record<string, boolean> = {};

function stripBearer(token: unknown) {
  return String(token || '').replace(/Bearer\s+/i, '');
}

function getLoginPayload(result: any) {
  return result?.Result ?? result?.result ?? result?.data ?? result;
}

function isThirdPartyLoginSuccess(result: any) {
  const code = result?.Code ?? result?.code ?? result?.Status ?? result?.status;
  const type = String(result?.Type ?? result?.type ?? '').toLowerCase();
  return (
    (code === undefined || String(code) === '200') &&
    (!type || type === 'success')
  );
}

function getBackendMessage(result: any, fallback: string) {
  return String(result?.Message ?? result?.message ?? result?.msg ?? fallback);
}

function saveLoginToken(result: any) {
  const data = getLoginPayload(result);
  const token =
    data?.token ?? data?.accessToken ?? data?.access_token ?? data?.AccessToken;
  const refreshToken =
    data?.refreshToken ??
    data?.xAccessToken ??
    data?.refresh_token ??
    data?.RefreshToken;

  // 对齐根目录 login/Login.html 的扫码登录实现：扫码成功后必须使用后端返回的
  // token / refreshToken 写入本地登录态，然后再拉取用户信息并跳转。
  // 不再伪造临时 token，避免后续接口 Authorization 无效导致被守卫打回登录页。
  if (!token || !refreshToken) {
    throw new Error(
      getBackendMessage(result, '登录成功但后端未返回 token 或 refreshToken'),
    );
  }

  accessStore.setAccessToken(stripBearer(token));
  accessStore.setRefreshToken(stripBearer(refreshToken));
  accessStore.setIsAccessChecked(false);
  accessStore.setLoginExpired(false);
}

function switchAuthMode(
  mode: 'account' | 'bind' | 'mobile' | 'wechat',
) {
  authMode.value = mode;
  qrError.value = '';
  if (mode === 'wechat') {
    void renderInlineQrLogin(mode);
  }
}

function resolveTenantEnt(tenantId?: string) {
  const selectedId = tenantId || accessStore.tenantId?.toString();
  const selectedTenant =
    tenantList.value.find((item) => item.id?.toString() === selectedId) ||
    currentTenant.value;
  return (
    selectedTenant?.shortName ||
    selectedTenant?.id?.toString() ||
    selectedId ||
    'NewApp'
  );
}

function validateMobile(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function startMobileCodeCountdown(seconds = 60) {
  if (mobileCodeTimer) clearInterval(mobileCodeTimer);
  mobileCodeCountdown.value = seconds;
  mobileCodeTimer = setInterval(() => {
    mobileCodeCountdown.value -= 1;
    if (mobileCodeCountdown.value <= 0 && mobileCodeTimer) {
      clearInterval(mobileCodeTimer);
      mobileCodeTimer = null;
    }
  }, 1000);
}

async function handleSendMobileCode() {
  const phone = phoneLoginForm.phone.trim();
  if (!validateMobile(phone)) {
    ElMessage.error('请输入有效的手机号码');
    return;
  }
  if (mobileCodeCountdown.value > 0) return;

  await sendLoginCode({
    ent: resolveTenantEnt(),
    type: 'MOBILE',
    scene: 'LOGIN',
    account: phone,
  });
  ElMessage.success('验证码已发送');
  startMobileCodeCountdown();
}

async function handleMobileLogin() {
  const phone = phoneLoginForm.phone.trim();
  const code = phoneLoginForm.code.trim();
  if (!validateMobile(phone)) {
    ElMessage.error('请输入有效的手机号码');
    return;
  }
  if (!code) {
    ElMessage.error('请输入验证码');
    return;
  }
  await authStore.authLogin('mobile', {
    ent: resolveTenantEnt(),
    type: 'MOBILE',
    scene: 'LOGIN',
    account: phone,
    code,
  });
}

function getSparkAuthUrl(path = window.location.pathname) {
  return new URL(path || '/', SPARK_AUTH_BASE_URL);
}

function getCurrentAppOrigin() {
  return window.location.origin;
}

function getThirdPartyLoginType(type: 'wechat') {
  // 扫码拿到 code 后统一调用 /api/thirdParty/auth/login。
  // 微信开放平台使用 WECHAT_WEB。
  return type === 'wechat' ? 'WECHAT_WEB' : 'WECHAT_WEB';
}

function getThirdPartyEnt() {
  return resolveTenantEnt();
}

function buildWechatWebCallbackUrl(ent: string, loginType: string, state: string) {
  // 微信扫码后的 redirect_uri 仍使用已授权的 spark 域名，但必须落到登录页回调模式。
  // 否则微信 iframe 只会打开 spark 首页，父页面拿不到 code，也不会调用第三方登录接口。
  const callbackUrl = getSparkAuthUrl('/NewApp/UserLoginManagement/wechat-callback.html');
  callbackUrl.searchParams.set('wechat_callback', '1');
  callbackUrl.searchParams.set('ent', ent);
  callbackUrl.searchParams.set('type', loginType);
  callbackUrl.searchParams.set('state', state);
  callbackUrl.searchParams.set('app_origin', getCurrentAppOrigin());
  return callbackUrl.toString();
}

function buildThirdPartyLoginUrl(params: Record<string, string>) {
  const url = getSparkAuthUrl('/api/thirdParty/login');
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function createThirdPartyState(type: string, ent: string) {
  const state = [
    type,
    ent,
    Date.now(),
    Math.random().toString(36).slice(2),
  ].join('_');
  window.sessionStorage.setItem('thirdParty-login-state', state);
  return state;
}

function loadWechatLoginScript() {
  const currentWindow = window as any;
  if (currentWindow.WxLogin) return Promise.resolve();

  wxLoginScriptPromise ||= new Promise<void>((resolve, reject) => {
    const existed = document.querySelector(
      'script[data-lm-auth="wx-login-sdk"]',
    );
    if (existed) {
      existed.addEventListener('load', () => resolve(), { once: true });
      existed.addEventListener(
        'error',
        () => reject(new Error('微信登录脚本加载失败')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;
    script.dataset.lmAuth = 'wx-login-sdk';
    script.addEventListener('load', () => resolve());
    script.onerror = () => reject(new Error('微信登录脚本加载失败'));
    document.head.append(script);
  });
  return wxLoginScriptPromise;
}

function clearWechatQrContainer() {
  if (qrContainerRef.value) qrContainerRef.value.innerHTML = '';
}

async function submitThirdPartyCode(
  code: string,
  loginType: string,
  ent: string,
) {
  if (!code) {
    qrError.value = '登录失败：未获取到扫码 code';
    return;
  }

  const codeKey = [loginType, ent, code].join(':');
  if (thirdPartyLoginSubmitting || submittedThirdPartyCodeMap[codeKey]) {
    return;
  }
  thirdPartyLoginSubmitting = true;
  submittedThirdPartyCodeMap[codeKey] = true;

  qrError.value = '';
  qrLoading.value = true;
  try {
    const result = await thirdPartyLogin({
      code,
      ent,
      entShortName: ent,
      type: loginType,
    });
    if (!isThirdPartyLoginSuccess(result)) {
      qrError.value = getBackendMessage(result, '扫码登录失败');
      return;
    }
    const data = getLoginPayload(result);
    if (data?.isBound || data?.bindings) {
      const bindToken = data.token || data.bindToken || data.id || '';
      if (!bindToken) {
        qrError.value = '绑定失败：接口未返回临时 token';
        return;
      }
      await router.replace({
        path: '/auth/account-binding',
        query: {
          isBound: 'true',
          ent,
          type: loginType,
          token: bindToken,
        },
      });
      authMode.value = 'bind';
      return;
    }
    saveLoginToken(result);
    // 对齐根目录 Login.html：写入 token 后立即调用 GetUserInfo 补全用户信息，再跳转首页。
    await authStore.fetchUserInfo();
    await router.replace(ERP_WORKBENCH_PATH);
  } catch (error: any) {
    qrError.value = error?.message || '扫码登录失败，请重新扫码';
    console.error('扫码登录处理失败:', error);
  } finally {
    thirdPartyLoginSubmitting = false;
    qrLoading.value = false;
  }
}

function isAllowedWechatMessageOrigin(origin: string) {
  return origin === window.location.origin || origin === SPARK_AUTH_ORIGIN;
}

function bindWechatCallbackMessage() {
  if ((window as any).__lmWechatCallbackMessageBound) return;
  (window as any).__lmWechatCallbackMessageBound = true;
  window.addEventListener('message', (event) => {
    if (!isAllowedWechatMessageOrigin(event.origin)) return;
    let data = event.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (!data || data.from !== 'WECHAT_CALLBACK') return;
    const result = data.result || {};
    const expectedState = window.sessionStorage.getItem(
      'thirdParty-login-state',
    );
    if (expectedState && result.state && expectedState !== result.state) {
      qrError.value = '微信登录失败：state 校验失败，请重新扫码';
      return;
    }
    if (result.type === 'code') {
      void submitThirdPartyCode(
        result.code,
        result.loginType || 'WECHAT_WEB',
        result.ent || getThirdPartyEnt(),
      );
      return;
    }

    if (result.type === 'success') {
      try {
        saveLoginToken(result);
        void authStore.fetchUserInfo().then(() => router.replace(ERP_WORKBENCH_PATH));
      } catch (error: any) {
        qrError.value = error?.message || '微信登录失败';
      }
    } else if (result.type === 'error') {
      qrError.value = result.message || '微信登录失败，请稍后重试';
    }
  });
}

async function handleWechatCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('wechat_callback') !== '1') return false;

  const code =
    typeof route.query.code === 'string'
      ? route.query.code
      : params.get('code') || '';
  const state =
    typeof route.query.state === 'string'
      ? route.query.state
      : params.get('state') || '';
  const ent =
    typeof route.query.ent === 'string'
      ? route.query.ent
      : params.get('ent') || getThirdPartyEnt();
  const loginType =
    typeof route.query.type === 'string'
      ? route.query.type
      : params.get('type') || 'WECHAT_WEB';
  const appOrigin =
    typeof route.query.app_origin === 'string'
      ? route.query.app_origin
      : params.get('app_origin') || window.location.origin;

  if (!code) {
    qrError.value = '微信登录失败：未获取到扫码 code';
    return true;
  }

  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        from: 'WECHAT_CALLBACK',
        result: {
          type: 'code',
          code,
          state,
          ent,
          loginType,
        },
      },
      appOrigin,
    );
    return true;
  }

  await submitThirdPartyCode(code, loginType, ent);
  return true;
}

async function renderWechatQrCode() {
  // 按要求使用微信官方 WxLogin 组件，不再生成系统二维码。
  // self_redirect=true：扫码后的授权跳转只发生在微信 iframe 内，不跳转当前主页面。
  clearWechatQrContainer();
  await nextTick();
  const container = qrContainerRef.value;
  if (!container) return;
  container.innerHTML = '';

  const ent = getThirdPartyEnt();
  const loginType = getThirdPartyLoginType('wechat');
  await loadWechatLoginScript();
  const WxLogin = (window as any).WxLogin;
  if (!WxLogin)
    throw new Error('微信扫码组件加载失败，请检查 wxLogin.js 是否可访问');

  const state = createThirdPartyState(loginType, ent);
  const redirectUri = buildWechatWebCallbackUrl(ent, loginType, state);
  console.info('[wechat-login] redirect_uri:', redirectUri);
  new WxLogin({
    self_redirect: true,
    id: 'lm-qr-container',
    appid: WECHAT_WEB_APPID,
    scope: 'snsapi_login',
    redirect_uri: encodeURIComponent(redirectUri),
    response_type: 'code',
    state,
    style: '',
    href: '',
    fast_login: 1,
    color_scheme: 'auto',
  });
}

async function renderInlineQrLogin(type: 'wechat') {
  qrError.value = '';
  qrLoading.value = true;
  try {
    await renderWechatQrCode();
  } catch (error: any) {
    qrError.value = error?.message || '二维码加载失败';
  } finally {
    qrLoading.value = false;
  }
}

function getBindQueryValue(key: string) {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
}

function shouldShowBindPanel() {
  return (
    route.name === 'AuthAccountBinding' ||
    getBindQueryValue('isBound') === 'true'
  );
}

function enterBindPanelFromRoute() {
  if (!shouldShowBindPanel()) return;
  authMode.value = 'bind';
}

async function handleBindAccount(values: {
  password: string;
  username: string;
}) {
  const token = getBindQueryValue('token');
  const ent = getBindQueryValue('ent') || getThirdPartyEnt();
  const type = getBindQueryValue('type') || 'WECHAT_WEB';

  if (!token) {
    throw new Error('缺少绑定授权信息，请返回登录页重新扫码');
  }

  const result = await thirdPartyBindAccount({
    ent,
    type,
    token,
    username: values.username,
    password: values.password,
  });
  const data = result?.Result ?? result?.result ?? result;
  if (data?.token || data?.accessToken) {
    saveLoginToken(result);
    await authStore.fetchUserInfo();
    await router.replace(ERP_WORKBENCH_PATH);
    return;
  }
  ElMessage.success('绑定成功，请重新登录');
  await router.replace('/auth/login');
  authMode.value = 'account';
}

const tenantList = ref<AuthApi.TenantResult[]>([]);
const cachedAuthTenant = ref<AuthApi.TenantResult | null>(
  getCachedAuthTenant<AuthApi.TenantResult>(),
);

const isTenantDomainLocked = computed(() => isTenantShortNameSubdomain());
const currentTenant = computed(() => {
  const selectedTenantId = accessStore.tenantId?.toString();
  return (
    tenantList.value.find((item) => item.id?.toString() === selectedTenantId) ||
    tenantList.value[0] ||
    cachedAuthTenant.value ||
    null
  );
});
const brandTitle = computed(() =>
  getTenantDisplayName(currentTenant.value, appTitle),
);
const brandLogo = computed(() => getTenantLogo(currentTenant.value));

async function fetchTenantList() {
  if (!tenantEnable) {
    return;
  }
  try {
    tenantList.value = await getTenantSimpleList();

    let tenantId: null | number | string = null;
    if (isTenantDomainLocked.value && tenantList.value.length > 0) {
      tenantId = tenantList.value[0]?.id || null;
    } else if (accessStore.tenantId) {
      tenantId = accessStore.tenantId;
    }
    if (!tenantId && tenantList.value.length > 0) {
      const targetTenant = tenantList.value.find(
        (item) => item.name === '领码科技',
      );
      tenantId = targetTenant?.id || tenantList.value[0]?.id || null;
    }

    accessStore.setTenantId(tenantId);
    const selectedTenant =
      tenantList.value.find(
        (item) => item.id?.toString() === tenantId?.toString(),
      ) ||
      tenantList.value[0] ||
      null;
    cachedAuthTenant.value = selectedTenant;
    setCachedAuthTenant(selectedTenant);
    loginRef.value
      ?.getFormApi()
      ?.setFieldValue('tenantId', tenantId?.toString());
  } catch (error) {
    console.error('获取租户列表失败:', error);
  }
}

async function handleLogin(values: any) {
  if (captchaEnable) {
    verifyRef.value.show();
    return;
  }
  await authStore.authLogin('username', values);
}

async function handleVerifySuccess({ captchaVerification }: any) {
  try {
    await authStore.authLogin('username', {
      ...(await loginRef.value.getFormApi().getValues()),
      captchaVerification,
    });
  } catch (error) {
    console.error('Error in handleLogin:', error);
  }
}

const redirect = query?.redirect;
async function handleThirdLogin(type: number) {
  if (type <= 0) {
    return;
  }
  try {
    const redirectUrl = getSparkAuthUrl('/auth/social-login');
    redirectUrl.searchParams.set('type', String(type));
    redirectUrl.searchParams.set('redirect', String(redirect || '/'));
    const redirectUri = redirectUrl.toString();

    window.location.href = await socialAuthRedirect(type, redirectUri);
  } catch (error) {
    console.error('第三方登录处理失败:', error);
  }
}

onMounted(async () => {
  bindWechatCallbackMessage();
  if (await handleWechatCallback()) return;
  enterBindPanelFromRoute();
  await fetchTenantList();
});

onBeforeUnmount(() => {
  if (mobileCodeTimer) clearInterval(mobileCodeTimer);
});

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenSelect',
      componentProps: {
        disabled: isTenantDomainLocked.value,
        options: tenantList.value.map((item) => ({
          label: item.name,
          value: item.id.toString(),
        })),
        contentClass: 'lm-login-tenant-select-content',
        placeholder: $t('authentication.tenantTip'),
      },
      fieldName: 'tenantId',
      label: $t('authentication.tenant'),
      rules: z.string().min(1, { message: $t('authentication.tenantTip') }),
      dependencies: {
        triggerFields: ['tenantId'],
        if: tenantEnable,
        trigger(values) {
          if (values.tenantId) {
            accessStore.setTenantId(values.tenantId);
          }
        },
      },
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.usernameTip') })
        .default(import.meta.env.VITE_APP_DEFAULT_USERNAME),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.passwordTip'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.passwordTip') })
        .default(import.meta.env.VITE_APP_DEFAULT_PASSWORD),
    },
  ];
});
</script>

<template>
  <div class="lm-login-page">
    <section class="lm-brand-panel">
      <div class="brand-orbit orbit-one"></div>
      <div class="brand-orbit orbit-two"></div>

      <div class="brand-header">
        <img class="brand-logo-img" :src="brandLogo" :alt="brandTitle" />
        <div>
          <h1>{{ brandTitle }}</h1>
          <p>业务 · 财务 · 数据一体化，驱动企业高效增长</p>
        </div>
      </div>

      <div class="brand-main">
        <div class="brand-copy">
          <span class="brand-badge">业财一体化管理平台</span>
          <h2>业务财务一体化，让企业管理更简单</h2>
          <p class="brand-desc">
            打通人资、协同、供应链、财务与数据中台，让业务单据、财务凭证和管理报表实时联动。
          </p>

          <div class="finance-cards">
            <div class="finance-card primary-card">
              <span>应收账款</span>
              <strong>3,210,123.45</strong>
              <em>同比 +6.7%</em>
            </div>
            <div class="finance-card todo-card">
              <span>待办事项</span>
              <ul>
                <li><i class="dot yellow"></i> 待审批 <b>12</b></li>
                <li><i class="dot green"></i> 待办任务 <b>8</b></li>
                <li><i class="dot red"></i> 待处理异常 <b>15</b></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="visual-wrap">
          <img
            class="brand-illustration"
            src="/static/imgs/assets/lingma_erp_middle_illustration_asset.png"
            alt="领码ERP业务财务一体化展示图"
          />
        </div>
      </div>

      <div class="brand-features">
        <div class="feature-item">
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <rect x="8" y="10" width="32" height="28" rx="6" />
              <path d="M15 31V21" />
              <path d="M24 31V16" />
              <path d="M33 31V25" />
              <path d="M14 34H35" />
              <circle cx="34" cy="17" r="4" />
            </svg>
          </span>
          <div>
            <strong>一站式管理</strong>
            <p>人力云 + 协同云 + 供应链云 + 财务云</p>
          </div>
        </div>
        <div class="feature-item">
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M10 30C15 22 20 24 24 19C29 13 35 15 39 10" />
              <path d="M10 37H40" />
              <path d="M10 12V37" />
              <circle cx="15" cy="25" r="2.5" />
              <circle cx="24" cy="19" r="2.5" />
              <circle cx="33" cy="15" r="2.5" />
              <path d="M34 10H39V15" />
            </svg>
          </span>
          <div>
            <strong>数据实时同步</strong>
            <p>业务数据自动生成财务凭证</p>
          </div>
        </div>
        <div class="feature-item">
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <rect x="7" y="9" width="12" height="10" rx="3" />
              <rect x="29" y="9" width="12" height="10" rx="3" />
              <rect x="18" y="29" width="12" height="10" rx="3" />
              <path d="M19 14H29" />
              <path d="M24 19V29" />
              <path d="M35 19V24C35 27 33 29 30 29H24" />
              <path d="M13 19V24C13 27 15 29 18 29H24" />
            </svg>
          </span>
          <div>
            <strong>配置式引擎</strong>
            <p>灵活适配企业个性化流程</p>
          </div>
        </div>
      </div>
    </section>

    <aside class="lm-login-panel">
      <div class="lm-auth-shell">
        <div class="lm-auth-content">
          <AuthenticationLogin
            ref="loginRef"
            v-show="authMode === 'account'"
            class="lm-auth-form"
            :form-schema="formSchema"
            :show-code-login="false"
            :show-qrcode-login="false"
            :show-third-party-login="false"
            :loading="authStore.loginLoading"
            :title="brandTitle"
            @submit="handleLogin"
            @third-login="handleThirdLogin"
          />

          <form
            v-show="authMode === 'mobile'"
            class="lm-auth-form lm-mobile-login-form"
            @submit.prevent="handleMobileLogin"
          >
            <div class="lm-mobile-title">
              <strong>手机验证码登录</strong>
              <span>使用当前企业下的手机号和验证码登录</span>
            </div>
            <label class="lm-mobile-field">
              <span>手机号</span>
              <input
                v-model="phoneLoginForm.phone"
                autocomplete="tel"
                placeholder="请输入手机号"
                type="tel"
              />
            </label>
            <label class="lm-mobile-field">
              <span>验证码</span>
              <div class="lm-code-row">
                <input
                  v-model="phoneLoginForm.code"
                  autocomplete="one-time-code"
                  placeholder="请输入验证码"
                  type="text"
                />
                <button
                  type="button"
                  :disabled="mobileCodeCountdown > 0"
                  @click="handleSendMobileCode"
                >
                  {{
                    mobileCodeCountdown > 0
                      ? `${mobileCodeCountdown}s`
                      : '获取验证码'
                  }}
                </button>
              </div>
            </label>
            <button class="lm-mobile-submit" type="submit">登录</button>
          </form>

          <AccountBindingPanel
            v-show="authMode === 'bind'"
            :submit="handleBindAccount"
            @back="switchAuthMode('account')"
          />

          <div
            v-show="authMode === 'wechat'"
            class="lm-auth-form lm-inline-qr-panel"
          >
            <div class="lm-mobile-title">
              <strong>微信扫码登录</strong>
              <span>请使用微信扫一扫二维码登录</span>
            </div>
            <div class="lm-qr-pic">
              <div
                id="lm-qr-container"
                ref="qrContainerRef"
                class="lm-qr-container"
              ></div>
              <div v-if="qrLoading" class="lm-qr-loading">加载中...</div>
            </div>
            <div class="lm-qr-tip">
              {{ qrError || '二维码有效期内扫码完成登录' }}
            </div>
            <button
              class="lm-qr-refresh"
              type="button"
              @click="renderInlineQrLogin('wechat')"
            >
              刷新二维码
            </button>
          </div>
        </div>

        <div class="lm-auth-mode-icons" aria-label="选择登录方式">
          <button
            type="button"
            class="lm-auth-icon-btn is-system"
            :class="[{ active: authMode === 'account' }]"
            title="账号登录"
            aria-label="账号登录"
            @click="switchAuthMode('account')"
          >
            <User />
          </button>
          <button
            type="button"
            class="lm-auth-icon-btn is-system"
            :class="[{ active: authMode === 'mobile' }]"
            title="手机验证码"
            aria-label="手机验证码"
            @click="switchAuthMode('mobile')"
          >
            <Iphone />
          </button>
          <button
            type="button"
            class="lm-auth-icon-btn is-wechat"
            :class="[{ active: authMode === 'wechat' }]"
            title="微信扫码"
            aria-label="微信扫码"
            @click="switchAuthMode('wechat')"
          >
            <IconifyIcon icon="simple-icons:wechat" />
          </button>
        </div>
      </div>
    </aside>

    <Verification
      v-if="captchaEnable"
      ref="verifyRef"
      :captcha-type="captchaType"
      :check-captcha-api="checkCaptcha"
      :get-captcha-api="getCaptcha"
      :img-size="{ width: '400px', height: '200px' }"
      mode="pop"
      @on-success="handleVerifySuccess"
    />
  </div>
</template>

<style scoped>
.lm-login-page {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 630px;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  background: #f6f9ff;
}

.lm-brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
  padding: 42px 64px 38px;
  overflow: hidden;
  background:
    radial-gradient(circle at 52% 42%, rgb(107 166 255 / 28%), transparent 22%),
    radial-gradient(circle at 18% 20%, rgb(255 255 255 / 88%), transparent 26%),
    linear-gradient(180deg, #edf4ff 0%, #f8fbff 100%);
}

.lm-brand-panel::before,
.lm-brand-panel::after {
  position: absolute;
  inset: auto -12% 18% -10%;
  height: 44%;
  content: '';
  background: linear-gradient(
    12deg,
    transparent 18%,
    rgb(102 155 255 / 14%),
    transparent 76%
  );
  transform: skewY(-8deg);
}

.lm-brand-panel::after {
  inset: 35% -10% auto -12%;
  height: 25%;
  background: linear-gradient(
    -9deg,
    transparent 10%,
    rgb(255 255 255 / 76%),
    transparent 78%
  );
}

.brand-orbit {
  position: absolute;
  left: 56%;
  border: 2px solid rgb(255 255 255 / 86%);
  border-radius: 50%;
  box-shadow: 0 0 28px rgb(84 139 235 / 14%);
  transform: translateX(-50%) rotate(7deg);
}

.orbit-one {
  top: 150px;
  width: 880px;
  height: 240px;
  transform: translateX(-50%) rotate(-12deg);
}

.orbit-two {
  top: 300px;
  width: 720px;
  height: 205px;
  border-style: dashed;
  transform: translateX(-50%);
}

.brand-header,
.brand-main,
.brand-features {
  position: relative;
  z-index: 1;
}

.brand-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  text-align: left;
}

.brand-logo-img {
  display: block;
  flex: none;
  width: 46px;
  height: 46px;
  user-select: none;
  object-fit: contain;
}

.brand-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #24324a;
  letter-spacing: 1px;
}

.brand-header p {
  margin: 6px 0 0;
  font-size: 14px;
  color: #667894;
  letter-spacing: 2px;
}

.brand-main {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(360px, 34%) minmax(0, 1fr);
  gap: 28px;
  align-items: center;
  min-height: 0;
  padding: 24px 0 20px;
}

.brand-copy {
  max-width: 460px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  color: #2868d8;
  background: rgb(255 255 255 / 72%);
  border: 1px solid rgb(184 211 255 / 80%);
  border-radius: 999px;
  box-shadow: 0 10px 24px rgb(60 116 214 / 10%);
}

.brand-copy h2 {
  margin: 22px 0 14px;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.32;
  color: #153d7a;
  letter-spacing: 1px;
}

.brand-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  color: #6b7d98;
}

.finance-cards {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}

.finance-card {
  padding: 16px 18px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(224 234 249 / 92%);
  border-radius: 16px;
  box-shadow: 0 16px 34px rgb(75 119 190 / 12%);
  backdrop-filter: blur(10px);
}

.finance-card span {
  display: block;
  font-size: 12px;
  color: #788aa6;
}

.finance-card strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  color: #142f5d;
}

.finance-card em {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-style: normal;
  color: #15b26b;
}

.todo-card ul {
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.todo-card li {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 24px;
  font-size: 12px;
  color: #52647e;
}

.todo-card b {
  margin-left: auto;
  color: #293d5f;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.yellow {
  background: #f7bd24;
}

.green {
  background: #26c36b;
}

.red {
  background: #ff5f72;
}

.visual-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  padding: 12px;
  overflow: visible;
  background: rgb(255 255 255 / 34%);
  border: 1px solid rgb(227 236 250 / 72%);
  border-radius: 10px;
  box-shadow: 0 24px 58px rgb(65 108 184 / 12%);
  backdrop-filter: blur(8px);
  transform: none;
}

.brand-illustration {
  display: block;
  width: 100%;
  max-width: 1000px;
  max-height: 620px;
  user-select: none;
  object-fit: contain;
  object-position: center;
  border-radius: 22px;
  transform: none;
}

.brand-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.feature-item {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
  padding: 18px 20px;
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(227 234 249 / 90%);
  border-radius: 14px;
  box-shadow: 0 14px 30px rgb(76 119 192 / 10%);
}

.feature-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: #2f7cff;
  background: #edf5ff;
  border-radius: 50%;
}

.feature-icon svg {
  width: 25px;
  height: 25px;
}

.feature-icon svg rect,
.feature-icon svg path,
.feature-icon svg circle {
  stroke: currentcolor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.feature-item strong {
  font-size: 14px;
  color: #273b5b;
}

.feature-item p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7b8ca8;
}

.lm-login-panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 630px;
  min-height: 100vh;
  padding: 32px 90px;
  background: rgb(255 255 255 / 96%);
  box-shadow: -12px 0 30px rgb(56 80 120 / 8%);
}

.lm-auth-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 450px;
  min-height: 560px;
}

.lm-auth-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.lm-login-panel > :deep(.lm-auth-form),
.lm-login-panel :deep(.lm-auth-form),
.lm-login-panel :deep(.mx-auto),
.lm-auth-form {
  box-sizing: border-box;
  width: 450px;
  min-width: 450px;
  max-width: 450px;
  margin-right: auto;
  margin-left: auto;
}

.lm-auth-mode-icons {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  width: 450px;
  max-width: 450px;
  padding-top: 14px;
  margin: 16px auto 0;
  border-top: 1px solid #e6eef8;
}

.lm-auth-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  cursor: pointer;
  background: #f8fbff;
  border: 1px solid #e3ecfa;
  border-radius: 10px;
  transition: all 0.16s ease;
}

.lm-auth-icon-btn svg {
  width: 16px;
  height: 16px;
}

.lm-auth-icon-btn.is-system {
  color: #6b7d98;
}

.lm-auth-icon-btn.is-wechat {
  color: #07c160;
}


.lm-auth-icon-btn:hover,
.lm-auth-icon-btn.active {
  background: #edf5ff;
  border-color: #b8d3ff;
  box-shadow: 0 6px 14px rgb(47 124 255 / 10%);
}

.lm-auth-icon-btn.is-system:hover,
.lm-auth-icon-btn.is-system.active {
  color: #2f7cff;
}

.lm-auth-icon-btn.is-wechat:hover,
.lm-auth-icon-btn.is-wechat.active {
  color: #07c160;
}


.lm-mobile-login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.lm-mobile-title strong {
  display: block;
  font-size: 22px;
  color: #1e293b;
}

.lm-mobile-title span {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.lm-mobile-field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.lm-mobile-field input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  background: #fff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
}

.lm-mobile-field input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 18%);
}

.lm-code-row {
  display: flex;
  gap: 10px;
}

.lm-code-row button {
  min-width: 112px;
  height: 42px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  cursor: pointer;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
}

.lm-code-row button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.lm-mobile-submit {
  height: 42px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: #2f7cff;
  border: 0;
  border-radius: 10px;
}

.lm-auth-extra {
  margin-top: 20px;
}

.lm-auth-divider {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 12px;
  color: #94a3b8;
}

.lm-auth-divider::before,
.lm-auth-divider::after {
  flex: 1;
  height: 1px;
  content: '';
  background: #e2e8f0;
}

.lm-auth-extra-buttons {
  display: flex;
  gap: 14px;
  justify-content: center;
}

.lm-auth-extra-buttons button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  height: 38px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.wechat-dot,
.workwechat-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  color: #fff;
  border-radius: 50%;
}

.wechat-dot {
  background: #16a34a;
}

.workwechat-dot {
  background: #0ea5e9;
}

.lm-qr-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 28%);
}

.lm-qr-modal-box {
  position: relative;
  width: min(92vw, 420px);
  padding: 24px 24px 20px;
  background: #fff;
  border: 1px solid rgb(59 130 246 / 18%);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgb(15 23 42 / 24%);
}

.lm-qr-close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 34px;
  height: 34px;
  font-size: 26px;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 999px;
}

.lm-qr-close:hover {
  color: #ef4444;
  background: #f8fafc;
}

.lm-qr-title {
  font-size: 15px;
  font-weight: 800;
  color: #0284c7;
  text-align: center;
  letter-spacing: 1px;
}

.lm-qr-pic {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(92vw, 320px);
  height: 380px;
  margin: 18px auto 12px;
  overflow: hidden;
  background: transparent;
  border: 0;
  border-radius: 16px;
}

.lm-qr-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(92vw, 320px);
  height: 380px;
}

.lm-qr-container iframe {
  position: static !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  border: 0 !important;
  transform: none !important;
}

.lm-qr-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #64748b;
  background: rgb(248 250 252 / 82%);
}

.lm-qr-tip {
  min-height: 20px;
  font-size: 14px;
  color: #0284c7;
  text-align: center;
}

.lm-inline-qr-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}

.lm-qr-pic img {
  width: 208px;
  height: 208px;
}

.lm-qr-refresh {
  height: 36px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  cursor: pointer;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
}

@media (max-width: 1280px) {
  .lm-login-page {
    grid-template-columns: minmax(0, 1fr) 630px;
  }

  .lm-brand-panel {
    padding: 34px 44px 30px;
  }

  .brand-main {
    grid-template-columns: minmax(280px, 36%) minmax(0, 1fr);
    gap: 22px;
  }

  .brand-copy h2 {
    font-size: 26px;
  }

  .brand-illustration {
    max-height: 520px;
  }
}

@media (max-width: 1024px) {
  .lm-login-page {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .lm-brand-panel {
    min-height: auto;
    padding: 28px 24px 12px;
  }

  .brand-header {
    justify-content: flex-start;
  }

  .brand-main {
    grid-template-columns: 1fr;
    padding: 24px 0 18px;
  }

  .brand-copy {
    max-width: none;
  }

  .finance-cards,
  .brand-features {
    grid-template-columns: 1fr;
  }

  .visual-wrap {
    padding: 12px;
  }

  .lm-login-panel {
    width: 100%;
    min-height: auto;
    padding: 18px 24px 32px;
    background: transparent;
    box-shadow: none;
  }

  .lm-auth-shell,
  .lm-auth-content,
  .lm-login-panel > :deep(.lm-auth-form),
  .lm-login-panel :deep(.lm-auth-form),
  .lm-login-panel :deep(.mx-auto),
  .lm-auth-form,
  .lm-auth-mode-icons {
    width: min(450px, 100%);
    min-width: 0;
    max-width: 450px;
  }

  .lm-auth-shell {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .lm-auth-mode-icons {
    gap: 8px;
    padding-top: 10px;
  }

  .lm-auth-icon-btn {
    width: 30px;
    height: 30px;
  }

  .lm-auth-icon-btn svg {
    width: 15px;
    height: 15px;
  }

  .lm-code-row {
    flex-direction: column;
  }

  .lm-code-row button {
    width: 100%;
  }

  .brand-header p,
  .brand-desc,
  .finance-cards,
  .brand-features {
    display: none;
  }

  .lm-brand-panel {
    padding: 24px 18px 0;
  }

  .brand-copy h2 {
    margin-bottom: 0;
    font-size: 22px;
  }

  .brand-illustration {
    max-height: 260px;
  }
}


/* 移动端登录页强化适配：小屏只保留登录卡片，避免品牌区挤占表单 */
@media (max-width: 768px) {
  .lm-login-page {
    position: fixed;
    inset: 0;
    display: block;
    width: 100vw;
    min-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
    background:
      radial-gradient(circle at 20% 0%, rgb(90 154 255 / 18%), transparent 32%),
      linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
  }

  .lm-brand-panel {
    display: none;
  }

  .lm-login-panel {
    width: 100%;
    min-height: 100dvh;
    padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
    background: transparent;
    box-shadow: none;
  }

  .lm-auth-shell {
    width: min(100%, 430px);
    min-height: auto;
    padding: 22px 18px 18px;
    background: rgb(255 255 255 / 96%);
    border: 1px solid rgb(222 232 248 / 88%);
    border-radius: 20px;
    box-shadow: 0 18px 42px rgb(42 95 170 / 13%);
  }

  .lm-auth-content,
  .lm-login-panel > :deep(.lm-auth-form),
  .lm-login-panel :deep(.lm-auth-form),
  .lm-login-panel :deep(.mx-auto),
  .lm-auth-form,
  .lm-auth-mode-icons {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .lm-auth-content {
    justify-content: flex-start;
  }

  .lm-login-panel :deep(.vben-auth-title),
  .lm-login-panel :deep(h1),
  .lm-login-panel :deep(h2) {
    font-size: 28px !important;
    line-height: 1.25 !important;
  }

  .lm-login-panel :deep(.ant-form-item),
  .lm-login-panel :deep(.el-form-item) {
    margin-bottom: 14px !important;
  }

  .lm-login-panel :deep(input),
  .lm-login-panel :deep(.el-input__wrapper),
  .lm-login-panel :deep(.ant-input),
  .lm-mobile-field input,
  .lm-mobile-submit,
  .lm-code-row button {
    min-height: 42px;
  }

  .lm-auth-mode-icons {
    gap: 10px;
    padding-top: 12px;
    margin-top: 14px;
  }

  .lm-auth-icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .lm-qr-pic,
  .lm-qr-container {
    width: min(100%, 300px);
    height: 340px;
  }
}

@media (max-width: 420px) {
  .lm-login-panel {
    padding-right: 10px;
    padding-left: 10px;
  }

  .lm-auth-shell {
    padding: 18px 14px 16px;
    border-radius: 18px;
  }

  .lm-login-panel :deep(.vben-auth-title),
  .lm-login-panel :deep(h1),
  .lm-login-panel :deep(h2) {
    font-size: 24px !important;
  }

  .lm-mobile-title strong {
    font-size: 20px;
  }

  .lm-auth-mode-icons {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) and (max-height: 640px) {
  .lm-login-panel {
    align-items: center;
    justify-content: flex-start;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .lm-auth-shell {
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .lm-login-panel :deep(.vben-auth-title),
  .lm-login-panel :deep(h1),
  .lm-login-panel :deep(h2) {
    font-size: 22px !important;
  }

  .lm-auth-mode-icons {
    padding-top: 8px;
    margin-top: 10px;
  }

  .lm-qr-pic,
  .lm-qr-container {
    height: 300px;
  }
}

:global(.lm-login-tenant-select-content) {
  z-index: 100001 !important;
}

/* 登录页本身使用 z-index: 99999，Element Plus Message 默认层级会被盖住；登录错误提示必须浮在登录页之上。 */
:global(.el-message) {
  z-index: 100200 !important;
}
</style>
