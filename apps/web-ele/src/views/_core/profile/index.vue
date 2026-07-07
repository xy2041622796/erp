<script setup lang="ts">
import type { SystemUserProfileApi } from '#/api/system/user/profile';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  getUserProfile,
  thirdAccountSceneAction,
} from '#/api/system/user/profile';
import { useAuthStore } from '#/store';

import BaseInfo from './modules/base-info.vue';
import ProfileUser from './modules/profile-user.vue';

import {
  ElButton,
  ElCard,
  ElMessage,
  ElMessageBox,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

const authStore = useAuthStore();
const activeName = ref('basicInfo');

const profile = ref<SystemUserProfileApi.UserProfileRespVO>();

const thirdPlatforms = [
  {
    key: 'WECHAT',
    name: '微信',
    icon: 'ant-design:wechat-filled',
    iconClass: 'wechat',
    matchers: ['WECHAT', 'WECHAT_MINIAPP', 'WeChatOpenId'],
    bindTarget: 'WECHAT_WEB',
    unbindTarget: 'WECHAT_WEB',
    thirdBinding: 'wx',
    bindingCode: 'Wx',
  },
  {
    key: 'QY_WECHAT',
    name: '企业微信',
    icon: 'ri:wechat-channels-fill',
    iconClass: 'qywechat',
    matchers: ['QY_WECHAT', 'WECHAT_CORP', 'WECHAT_WORK', 'WechatId', 'CORP_WECHAT'],
    bindTarget: 'WECHAT_CORP_WEB',
    unbindTarget: 'WECHAT_CORP_WEB',
    thirdBinding: 'qywx',
    bindingCode: 'QyWx',
  },
  {
    key: 'DINGTALK',
    name: '钉钉',
    icon: 'simple-icons:dingtalk',
    iconClass: 'dingtalk',
    matchers: ['DINGTALK', 'DING_TALK', 'DING'],
  },
  {
    key: 'GITHUB',
    name: 'GitHub',
    icon: 'mdi:github',
    iconClass: 'github',
    matchers: ['GITHUB'],
  },
];

type ThirdAccountRow = (typeof thirdPlatforms)[number] & {
  accountText: string;
  bound: boolean;
};

function maskAccount(value?: string) {
  if (!value) {
    return '';
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 8)}***${value.slice(-4)}`;
}

function getEntFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts.length > 0 ? parts[0] : '';
}

function getCurrentEnt() {
  return profile.value?.entId || getEntFromUrl();
}

function getEntFullPath(path: string) {
  const ent = getCurrentEnt();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return ent ? `/${ent}${normalizedPath}` : normalizedPath;
}

function getThirdBindPageOrigin() {
  return String(import.meta.env.VITE_THIRD_BIND_PAGE_ORIGIN || '').replace(/\/$/, '');
}

function getAppRouteUrl(path: string, origin = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedOrigin = origin ? origin.replace(/\/$/, '') : '';

  if (import.meta.env.VITE_ROUTER_HISTORY === 'hash') {
    return `${normalizedOrigin}${normalizedBase}#${normalizedPath}`;
  }

  return `${normalizedOrigin}${normalizedBase}${normalizedPath.slice(1)}`;
}

function openCenterWindow(url: string, title: string, width = 380, height = 380) {
  const left = Math.max((window.screen.width - width) / 2, 0);
  const top = Math.max((window.screen.height - height) / 2, 0);
  const popup = window.open(
    url,
    title,
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    ElMessage.error(`${title}页面打开失败，请检查浏览器弹窗权限`);
    return;
  }

  const checkClosedTimer = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(checkClosedTimer);
      refreshProfile();
    }
  }, 500);
}

function openAuthPopup(row: ThirdAccountRow) {
  const bindingCode = row.bindingCode;
  if (!bindingCode) {
    ElMessage.info(`${row.name}绑定正在开发中`);
    return;
  }

  const url = getAppRouteUrl(
    `/profile/third-account-bind?bindingCode=${bindingCode}`,
    row.key === 'QY_WECHAT' ? getThirdBindPageOrigin() : '',
  );
  openCenterWindow(url, `${row.name}${row.bound ? '换绑' : '绑定'}`, 560, 720);
}

const thirdAccountRows = computed<ThirdAccountRow[]>(() => {
  const accounts = profile.value?.thirdAccounts ?? [];
  return thirdPlatforms.map((platform) => {
    const account = accounts.find((item) => {
      const provider = String(item.provider || '').toUpperCase();
      const type = String(item.type || '').toUpperCase();
      return platform.matchers.some((matcher) => {
        const key = matcher.toUpperCase();
        return provider.includes(key) || type.includes(key);
      });
    });
    const accountName = account?.displayName || account?.providerUserId || account?.providerUnionId || '';
    return {
      ...platform,
      bound: Boolean(account),
      accountText: accountName ? `已绑定账号：${maskAccount(accountName)}` : '-',
    };
  });
});

async function loadProfile() {
  profile.value = await getUserProfile();
}

async function refreshProfile() {
  await loadProfile();
  await authStore.fetchUserInfo();
}

function handleThirdAccountAction(row: ThirdAccountRow) {
  if (!row.bindTarget) {
    ElMessage.info(`${row.name}绑定正在开发中`);
    return;
  }
  openAuthPopup(row);
}

async function handleThirdAccountUnbind(row: ThirdAccountRow) {
  if (!row.bound || !row.unbindTarget) {
    return;
  }

  try {
    await ElMessageBox.confirm(`确定解绑${row.name}？`, '操作确认', {
      confirmButtonText: '确定解绑',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const resp = await thirdAccountSceneAction({
      ent: getCurrentEnt(),
      scene: 'UNBIND_THIRD_ACCOUNT',
      target: row.unbindTarget,
    });
    const data = (resp as any)?.data ?? resp;
    const code = data?.Code ?? data?.code;
    if (code === 200 || data?.success === true) {
      ElMessage.success(`${row.name}解绑成功`);
      await refreshProfile();
      return;
    }
    ElMessage.error(data?.Message || data?.message || '解绑失败，请稍后重试');
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
    }
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }
  if (event.data?.source === 'profile-third-account-bind' && event.data?.type === 'success') {
    refreshProfile();
  }
});

onMounted(loadProfile);
</script>

<template>
  <Page auto-content-height class="profile-page">
    <div class="profile-layout">
      <ElCard class="profile-card profile-left" shadow="never">
        <ProfileUser :profile="profile" @success="refreshProfile" />
      </ElCard>

      <ElCard class="profile-card profile-right" shadow="never">
        <ElTabs v-model="activeName" class="profile-tabs">
          <ElTabPane name="basicInfo">
            <template #label>
              <span class="tab-label">
                <IconifyIcon icon="ant-design:setting-outlined" />
                基本设置
              </span>
            </template>

            <BaseInfo :profile="profile" @success="refreshProfile" />

            <div class="third-section">
              <div class="section-title">
                <IconifyIcon icon="ant-design:link-outlined" />
                <span>第三方账号绑定</span>
              </div>

              <div class="third-account-list">
                <div
                  v-for="row in thirdAccountRows"
                  :key="row.key"
                  class="third-account-row"
                >
                  <div class="platform-info">
                    <span class="platform-icon" :class="row.iconClass">
                      <IconifyIcon :icon="row.icon" />
                    </span>
                    <span class="platform-name">{{ row.name }}</span>
                  </div>

                  <div class="platform-status">
                    <ElTag
                      :type="row.bound ? 'success' : 'info'"
                      effect="plain"
                      round
                    >
                      {{ row.bound ? '已绑定' : '未绑定' }}
                    </ElTag>
                  </div>

                  <div class="platform-account">
                    {{ row.bound ? row.accountText : '-' }}
                  </div>

                  <div class="platform-actions">
                    <ElButton
                      :type="row.bound ? 'primary' : 'primary'"
                      :plain="row.bound"
                      class="platform-action"
                      @click="handleThirdAccountAction(row)"
                    >
                      {{ row.bound ? '换绑' : '绑定' }}
                    </ElButton>
                    <ElButton
                      v-if="row.bound && row.unbindTarget"
                      text
                      type="danger"
                      class="platform-unbind"
                      @click="handleThirdAccountUnbind(row)"
                    >
                      解绑
                    </ElButton>
                  </div>
                </div>
              </div>
            </div>
          </ElTabPane>
        </ElTabs>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.profile-page {
  background: #f5f7fb;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(380px, 0.94fr) minmax(680px, 1.72fr);
  gap: 20px;
  min-height: calc(100vh - 132px);
}

.profile-card {
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  border: 1px solid #edf1f7;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 8%);
}

.profile-card :deep(.el-card__body) {
  height: 100%;
  padding: 30px 34px;
}

.profile-right :deep(.el-card__body) {
  padding: 22px 34px 28px;
}

.profile-tabs :deep(.el-tabs__header) {
  margin-bottom: 26px;
}

.profile-tabs :deep(.el-tabs__item) {
  height: 38px;
  padding: 0 22px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: #1677ff;
}

.profile-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  background-color: #1677ff;
}

.tab-label {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}

.tab-label .iconify {
  font-size: 22px;
}

.third-section {
  padding-top: 20px;
  margin-top: 10px;
  border-top: 1px dashed #dbe4f0;
}

.section-title {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding-bottom: 11px;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  color: #1677ff;
  border-bottom: 3px solid #1677ff;
}

.section-title .iconify {
  font-size: 22px;
}

.third-account-list {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

.third-account-row {
  display: grid;
  grid-template-columns: 220px 130px 1fr 150px;
  gap: 16px;
  align-items: center;
  min-height: 48px;
  padding: 7px 14px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid #e4eaf2;
  border-radius: 8px;
  transition: all 0.18s ease;
}

.third-account-row:hover {
  border-color: #b8d7ff;
  box-shadow: 0 8px 22px rgb(22 119 255 / 8%);
  transform: translateY(-1px);
}

.platform-info {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.platform-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 27px;
  border-radius: 50%;
}

.platform-icon.wechat {
  color: #16ba43;
}

.platform-icon.qywechat {
  color: #1ba8ff;
}

.platform-icon.dingtalk {
  color: #1296db;
}

.platform-icon.github {
  color: #111827;
}

.platform-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-account {
  overflow: hidden;
  font-size: 14px;
  color: #667085;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-actions {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.platform-action {
  width: 76px;
  height: 34px;
  font-weight: 600;
  border-radius: 7px;
}

.platform-unbind {
  height: 34px;
  padding: 0 4px;
}

@media (max-width: 1200px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .third-account-row {
    grid-template-columns: 180px 110px 1fr 132px;
  }
}
</style>
