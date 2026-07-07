<script lang="ts" setup>
import { AuthenticationQrCodeLogin } from '@vben/common-ui';
import { LOGIN_PATH } from '@vben/constants';

const appTitle = import.meta.env.VITE_APP_TITLE;

defineOptions({ name: 'QrCodeLogin' });
</script>

<template>
  <AuthenticationQrCodeLogin
    :login-path="LOGIN_PATH"
    :title="appTitle"
  />
</template>
