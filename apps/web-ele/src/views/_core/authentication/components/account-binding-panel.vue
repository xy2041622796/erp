<script lang="ts" setup>
import { reactive, ref } from 'vue';

const props = defineProps<{
  submit: (values: {
    password: string;
    username: string;
  }) => Promise<void> | void;
}>();

const emit = defineEmits<{
  back: [];
}>();

const form = reactive({
  username: '',
  password: '',
});
const submitting = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  const username = form.username.trim();
  const password = form.password.trim();

  if (!username || !password) {
    errorMessage.value = '请输入账号和密码完成绑定';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  try {
    await props.submit({ username, password });
  } catch (error: any) {
    errorMessage.value = error?.message || '账号绑定失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form
    class="lm-auth-form lm-mobile-login-form"
    @submit.prevent="handleSubmit"
  >
    <div class="lm-mobile-title">
      <strong>绑定系统账号</strong>
      <span>当前微信/企业微信未授权，请绑定已有账号后继续登录</span>
    </div>
    <label class="lm-mobile-field">
      <span>账号</span>
      <input
        v-model="form.username"
        autocomplete="username"
        placeholder="请输入系统账号"
        type="text"
      />
    </label>
    <label class="lm-mobile-field">
      <span>密码</span>
      <input
        v-model="form.password"
        autocomplete="current-password"
        placeholder="请输入系统密码"
        type="password"
      />
    </label>
    <div v-if="errorMessage" class="lm-qr-tip">{{ errorMessage }}</div>
    <button class="lm-mobile-submit" :disabled="submitting" type="submit">
      {{ submitting ? '绑定中...' : '确认绑定' }}
    </button>
    <button class="lm-qr-refresh" type="button" @click="emit('back')">
      返回账号登录
    </button>
  </form>
</template>
