<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import type { AuthApi } from '#/api/core/auth';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { isTenantEnable } from '@vben/hooks';
import { $t } from '@vben/locales';
import { useAccessStore } from '@vben/stores';


import { getTenantSimpleList, register, sendRegisterSmsCode } from '#/api/core/auth';
import {
  getCachedAuthTenant,
  getTenantDisplayName,
  getTenantLogo,
  getTenantShortNameFromHost,
  isTenantShortNameSubdomain,
  setCachedAuthTenant,
} from '#/utils/tenantDomain';

import { ElMessage } from 'element-plus';

defineOptions({ name: 'Register' });

const appTitle = import.meta.env.VITE_APP_TITLE;
const accessStore = useAccessStore();
const router = useRouter();
const tenantEnable = isTenantEnable();

const registerRef = ref();
const loading = ref(false);
const codeSending = ref(false);
const CODE_LENGTH = 6;

const tenantList = ref<AuthApi.TenantResult[]>([]);
const cachedAuthTenant = ref<AuthApi.TenantResult | null>(getCachedAuthTenant<AuthApi.TenantResult>());

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
const brandTitle = computed(() => getTenantDisplayName(currentTenant.value, appTitle));
const brandLogo = computed(() => getTenantLogo(currentTenant.value));

function resolveTenantEnt(tenantId?: string) {
  const tenantShortNameFromHost = getTenantShortNameFromHost();
  return tenantShortNameFromHost || tenantId || accessStore.tenantId?.toString() || 'NewApp';
}

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
      const targetTenant = tenantList.value.find((item) => item.name === '领码科技');
      tenantId = targetTenant?.id || tenantList.value[0]?.id || null;
    }
    accessStore.setTenantId(tenantId);
    const selectedTenant =
      tenantList.value.find((item) => item.id?.toString() === tenantId?.toString()) ||
      tenantList.value[0] ||
      null;
    cachedAuthTenant.value = selectedTenant;
    setCachedAuthTenant(selectedTenant);
    registerRef.value?.getFormApi()?.setFieldValue('tenantId', tenantId?.toString());
  } catch (error) {
    console.error('获取租户列表失败:', error);
  }
}

async function handleSendRegisterCode() {
  const formApi = registerRef.value?.getFormApi();
  if (!formApi) throw new Error('表单未准备好');

  try {
    codeSending.value = true;
    await formApi.validateField('phone');
    const isPhoneValid = await formApi.isFieldValid('phone');
    if (!isPhoneValid) return;

    const values = await formApi.getValues();
    await sendRegisterSmsCode({
      ent: resolveTenantEnt(values.tenantId),
      type: 'MOBILE',
      scene: 'REGISTER',
      account: values.phone,
    });
    ElMessage.success('验证码发送成功');
  } finally {
    codeSending.value = false;
  }
}

async function handleRegister(values: any) {
  loading.value = true;
  try {
    await register({
      ent: resolveTenantEnt(values.tenantId),
      loginName: values.username,
      username: values.username,
      password: values.password,
      sex: 'M',
      phone: values.phone,
      depId: '',
      jobId: '',
      code: values.code,
    });
    ElMessage.success('注册成功，请等待审核通过后登录');
    await router.replace('/auth/login');
  } catch (error: any) {
    ElMessage.error(error?.message || '注册失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTenantList();
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
        contentClass: 'lm-register-tenant-select-content',
        placeholder: $t('authentication.tenantTip'),
      },
      fieldName: 'tenantId',
      label: $t('authentication.tenant'),
      rules: z.string().min(1, { message: $t('authentication.tenantTip') }),
      dependencies: {
        triggerFields: ['tenantId'],
        if: tenantEnable,
        trigger(values) {
          if (values.tenantId) accessStore.setTenantId(values.tenantId);
        },
      },
    },
    {
      component: 'VbenInput',
      componentProps: { placeholder: '请输入账号' },
      fieldName: 'username',
      label: '账号',
      rules: z.string().min(1, { message: '请输入账号' }),
    },
    {
      component: 'VbenInput',
      componentProps: { placeholder: '请输入手机号' },
      fieldName: 'phone',
      label: '手机号',
      rules: z
        .string()
        .min(1, { message: '请输入手机号' })
        .refine((v) => /^\d{11}$/.test(v), { message: '请输入有效的手机号码' }),
    },
    {
      component: 'VbenPinInput',
      componentProps: {
        codeLength: CODE_LENGTH,
        createText: (countdown: number) =>
          countdown > 0 ? `${countdown}秒后重试` : '获取验证码',
        handleSendCode: handleSendRegisterCode,
        placeholder: '请输入验证码',
      },
      fieldName: 'code',
      label: '验证码',
      rules: z.string().length(CODE_LENGTH, {
        message: `请输入${CODE_LENGTH}位验证码`,
      }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: $t('authentication.confirmPassword') },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
  ];
});
</script>

<template>
  <div class="lm-register-page">
    <section class="lm-brand-panel">
      <div class="brand-orbit orbit-one"></div>
      <div class="brand-orbit orbit-two"></div>

      <div class="brand-header">
        <img
          class="brand-logo-img"
          :src="brandLogo"
          :alt="brandTitle"
        />
        <div>
          <h1>{{ brandTitle }}</h1>
          <p>业务 · 财务 · 数据一体化，驱动企业高效增长</p>
        </div>
      </div>

      <div class="brand-main">
        <div class="brand-copy">
          <span class="brand-badge">业财一体化管理平台</span>
          <h2>注册领码ERP，开启业务财务一体化管理</h2>
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
          <div><strong>一站式管理</strong><p>人力云 + 协同云 + 供应链云 + 财务云</p></div>
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
          <div><strong>数据实时同步</strong><p>业务数据自动生成财务凭证</p></div>
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
          <div><strong>配置式引擎</strong><p>灵活适配企业个性化流程</p></div>
        </div>
      </div>
    </section>

    <aside class="lm-register-panel">
      <AuthenticationRegister
        ref="registerRef"
        class="lm-auth-form"
        :form-schema="formSchema"
        :loading="loading || codeSending"
        :title="brandTitle"
        @submit="handleRegister"
      />
    </aside>
  </div>
</template>

<style scoped>
.lm-register-page {
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
    radial-gradient(circle at 52% 42%, rgba(107, 166, 255, 0.28), transparent 22%),
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.88), transparent 26%),
    linear-gradient(180deg, #edf4ff 0%, #f8fbff 100%);
}
.lm-brand-panel::before,
.lm-brand-panel::after {
  position: absolute;
  inset: auto -12% 18% -10%;
  height: 44%;
  content: '';
  background: linear-gradient(12deg, transparent 18%, rgba(102, 155, 255, 0.14), transparent 76%);
  transform: skewY(-8deg);
}
.lm-brand-panel::after {
  inset: 35% -10% auto -12%;
  height: 25%;
  background: linear-gradient(-9deg, transparent 10%, rgba(255, 255, 255, 0.76), transparent 78%);
}
.brand-orbit {
  position: absolute;
  left: 56%;
  border: 2px solid rgba(255, 255, 255, 0.86);
  border-radius: 50%;
  box-shadow: 0 0 28px rgba(84, 139, 235, 0.14);
  transform: translateX(-50%) rotate(7deg);
}
.orbit-one { top: 150px; width: 880px; height: 240px; transform: translateX(-50%) rotate(-12deg); }
.orbit-two { top: 300px; width: 720px; height: 205px; border-style: dashed; transform: translateX(-50%); }
.brand-header,
.brand-main,
.brand-features { position: relative; z-index: 1; }
.brand-header { display: flex; gap: 16px; align-items: center; justify-content: center; text-align: left; }
.brand-logo-img { display: block; width: 46px; height: 46px; flex: none; object-fit: contain; user-select: none; }
.brand-header h1 { margin: 0; font-size: 28px; font-weight: 800; color: #24324a; letter-spacing: 1px; }
.brand-header p { margin: 6px 0 0; font-size: 14px; color: #667894; letter-spacing: 2px; }
.brand-main { display: grid; flex: 1; grid-template-columns: minmax(360px, 34%) minmax(0, 1fr); gap: 28px; align-items: center; min-height: 0; padding: 24px 0 20px; }
.brand-copy { max-width: 460px; }
.brand-badge { display: inline-flex; align-items: center; height: 30px; padding: 0 14px; font-size: 13px; font-weight: 700; color: #2868d8; background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(184, 211, 255, 0.8); border-radius: 999px; box-shadow: 0 10px 24px rgba(60, 116, 214, 0.1); }
.brand-copy h2 { margin: 22px 0 14px; font-size: 30px; font-weight: 900; line-height: 1.32; color: #153d7a; letter-spacing: 1px; }
.brand-desc { margin: 0; font-size: 14px; line-height: 1.9; color: #6b7d98; }
.finance-cards { display: grid; gap: 14px; margin-top: 24px; }
.finance-card { padding: 16px 18px; background: rgba(255, 255, 255, 0.78); border: 1px solid rgba(224, 234, 249, 0.92); border-radius: 16px; box-shadow: 0 16px 34px rgba(75, 119, 190, 0.12); backdrop-filter: blur(10px); }
.finance-card span { display: block; font-size: 12px; color: #788aa6; }
.finance-card strong { display: block; margin-top: 8px; font-size: 24px; color: #142f5d; }
.finance-card em { display: block; margin-top: 4px; font-size: 12px; font-style: normal; color: #15b26b; }
.todo-card ul { padding: 0; margin: 10px 0 0; list-style: none; }
.todo-card li { display: flex; align-items: center; gap: 8px; height: 24px; font-size: 12px; color: #52647e; }
.todo-card b { margin-left: auto; color: #293d5f; }
.dot { width: 7px; height: 7px; border-radius: 50%; }
.yellow { background: #f7bd24; }
.green { background: #26c36b; }
.red { background: #ff5f72; }
.visual-wrap { display: flex; align-items: center; justify-content: center; width: 100%; min-width: 0; padding: 12px; overflow: visible; background: rgba(255, 255, 255, 0.34); border: 1px solid rgba(227, 236, 250, 0.72); border-radius: 10px; box-shadow: 0 24px 58px rgba(65, 108, 184, 0.12); backdrop-filter: blur(8px); }
.brand-illustration { display: block; width: 100%; max-width: 1000px; max-height: 620px; object-fit: contain; object-position: center; border-radius: 22px; user-select: none; }
.brand-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.feature-item { display: flex; gap: 14px; align-items: center; min-width: 0; padding: 18px 20px; background: rgba(255, 255, 255, 0.82); border: 1px solid rgba(227, 234, 249, 0.9); border-radius: 14px; box-shadow: 0 14px 30px rgba(76, 119, 192, 0.1); }
.feature-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; flex: none; color: #2f7cff; background: #edf5ff; border-radius: 50%; }
.feature-icon svg { width: 25px; height: 25px; }
.feature-icon svg rect,
.feature-icon svg path,
.feature-icon svg circle { stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.feature-item strong { font-size: 14px; color: #273b5b; }
.feature-item p { margin: 6px 0 0; font-size: 12px; color: #7b8ca8; }
.lm-register-panel { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; min-height: 100vh; width: 630px; padding: 32px 90px; background: rgba(255, 255, 255, 0.96); box-shadow: -12px 0 30px rgba(56, 80, 120, 0.08); }
.lm-register-panel > :deep(.lm-auth-form),
.lm-register-panel :deep(.lm-auth-form),
.lm-register-panel :deep(.mx-auto) { width: 450px; min-width: 450px; max-width: 450px; margin-right: auto; margin-left: auto; box-sizing: border-box; }
@media (max-width: 1280px) {
  .lm-register-page { grid-template-columns: minmax(0, 1fr) 630px; }
  .lm-brand-panel { padding: 34px 44px 30px; }
  .brand-main { grid-template-columns: minmax(280px, 36%) minmax(0, 1fr); gap: 22px; }
  .brand-copy h2 { font-size: 26px; }
  .brand-illustration { max-height: 520px; }
}
@media (max-width: 1024px) {
  .lm-register-page { grid-template-columns: 1fr; overflow-y: auto; }
  .lm-brand-panel { min-height: auto; padding: 28px 24px 12px; }
  .brand-header { justify-content: flex-start; }
  .brand-main { grid-template-columns: 1fr; padding: 24px 0 18px; }
  .brand-copy { max-width: none; }
  .finance-cards,
  .brand-features { grid-template-columns: 1fr; }
  .lm-register-panel { min-height: auto; width: 100%; padding: 18px 24px 32px; background: transparent; box-shadow: none; }
}
@media (max-width: 640px) {
  .brand-header p,
  .brand-desc,
  .finance-cards,
  .brand-features { display: none; }
  .lm-brand-panel { padding: 24px 18px 0; }
  .brand-copy h2 { margin-bottom: 0; font-size: 22px; }
  .brand-illustration { max-height: 260px; }
}
:global(.lm-register-tenant-select-content) {
  z-index: 100001 !important;
}
</style>
