<script setup lang="ts">
import type { SystemUserProfileApi } from '#/api/system/user/profile';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { preferences } from '@vben/preferences';
import { formatDateTime } from '@vben/utils';

import { updateUserProfile } from '#/api/system/user/profile';
import { CropperAvatar } from '#/components/cropper';
import { useUpload } from '#/components/upload/use-upload';

import { ElTooltip } from 'element-plus';

const props = defineProps<{
  profile?: SystemUserProfileApi.UserProfileRespVO;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const avatar = computed(
  () => props.profile?.avatar || preferences.app.defaultAvatar,
);

const roleText = computed(() =>
  props.profile?.roles?.length
    ? props.profile.roles.map((role) => role.name).join('、')
    : '普通用户',
);

const postText = computed(() =>
  props.profile?.posts?.length
    ? props.profile.posts.map((post) => post.name).join('、')
    : '-',
);

const infoItems = computed(() => [
  {
    icon: 'ant-design:user-outlined',
    label: '用户账号',
    value: props.profile?.username || '-',
  },
  {
    icon: 'ant-design:user-switch-outlined',
    label: '所属角色',
    value: roleText.value,
  },
  {
    icon: 'ant-design:phone-outlined',
    label: '手机号码',
    value: props.profile?.mobile || '-',
  },
  {
    icon: 'ant-design:mail-outlined',
    label: '用户邮箱',
    value: props.profile?.email || '-',
  },
  {
    icon: 'ant-design:team-outlined',
    label: '所属部门',
    value: props.profile?.dept?.name || '-',
  },
  {
    icon: 'ant-design:solution-outlined',
    label: '所属岗位',
    value: postText.value,
  },
  {
    icon: 'ant-design:clock-circle-outlined',
    label: '创建时间',
    value: props.profile?.createTime ? formatDateTime(props.profile.createTime) : '-',
  },
  {
    icon: 'ant-design:login-outlined',
    label: '登录时间',
    value: props.profile?.loginDate ? formatDateTime(props.profile.loginDate) : '-',
  },
]);

async function handelUpload({
  file,
  filename,
}: {
  file: Blob;
  filename: string;
}) {
  const { httpRequest } = useUpload();
  const fileObj = new File([file], filename, { type: file.type });
  const avatar = await httpRequest(fileObj);
  await updateUserProfile({ avatar });
}
</script>

<template>
  <div v-if="profile" class="profile-user-card">
    <div class="profile-hero">
      <ElTooltip content="点击上传头像">
        <CropperAvatar
          :show-btn="false"
          :upload-api="handelUpload"
          :value="avatar"
          :width="128"
          @change="emit('success')"
        />
      </ElTooltip>
      <div class="profile-name">{{ profile.nickname || profile.username || '-' }}</div>
      <div class="profile-account">
        <span>{{ profile.username || '-' }}</span>
        <span class="profile-badge">用户</span>
      </div>
    </div>

    <div class="profile-info-grid">
      <div v-for="item in infoItems" :key="item.label" class="profile-info-item">
        <div class="profile-info-icon">
          <IconifyIcon :icon="item.icon" />
        </div>
        <div class="profile-info-content">
          <div class="profile-info-label">{{ item.label }}</div>
          <div class="profile-info-value">{{ item.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-user-card {
  min-height: 100%;
}

.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 26px;
}

.profile-name {
  margin-top: 18px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2937;
}

.profile-account {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
  font-size: 17px;
  color: #667085;
}

.profile-badge {
  padding: 3px 13px;
  font-size: 14px;
  font-weight: 600;
  color: #1677ff;
  background: linear-gradient(180deg, #edf4ff 0%, #dfeaff 100%);
  border: 1px solid #d7e6ff;
  border-radius: 999px;
}

.profile-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
}

.profile-info-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-height: 78px;
  padding: 18px 6px;
  border-top: 1px solid #eef2f7;
}

.profile-info-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-top: 1px;
  font-size: 24px;
  color: #1677ff;
}

.profile-info-label {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  color: #1f2937;
}

.profile-info-value {
  margin-top: 8px;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.35;
  color: #667085;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
