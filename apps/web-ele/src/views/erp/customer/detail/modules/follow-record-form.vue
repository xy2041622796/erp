<script setup lang="ts">
import type { CrmCustomerFollowRecordApi } from '#/api/erp/customer/follow-record';

import { useUserStore } from '@vben/stores';
import { buildUUID } from '@vben/utils';
import { computed, ref, watch } from 'vue';


import { createFollowRecord, updateFollowRecord } from '#/api/erp/customer/follow-record';
import { getCurrentUserBoundDeptInfo } from '#/api/system/dept';

import {
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

const FOLLOW_TYPE_OPTIONS = ['微信', '电话', '拜访'];
const DEFAULT_FOLLOW_TYPE = '电话';

interface CurrentOperatorDefaults {
  operatorUserId: string;
  operatorUserName: string;
  departId: string;
  departName: string;
}

const props = defineProps<{
  bizType: 'CUSTOMER' | 'LEAD';
  bizId?: number | string;
  bizCode?: string;
  bizName?: string;
  customerId?: number | string;
  customerCode?: string;
  companyType?: number;
  followRecordData?: CrmCustomerFollowRecordApi.FollowRecord | null;
  inline?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save-success'): void;
}>();

const userStore = useUserStore();
const formData = ref<CrmCustomerFollowRecordApi.FollowRecord>({} as CrmCustomerFollowRecordApi.FollowRecord);
const currentOperatorDefaults = ref<CurrentOperatorDefaults>({
  operatorUserId: '',
  operatorUserName: '',
  departId: '',
  departName: '',
});
const isEditMode = computed(() => !!String(props.followRecordData?.id || props.followRecordData?.rowid || '').trim());

function getCurrentUserInfo() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    operatorUserId: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    operatorUserName: String(info.nickname || raw.UserName || raw.userName || info.username || '').trim(),
  };
}

function formatNow() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function buildDefaultFormData() {
  return {
    bizType: props.bizType,
    bizId: props.bizId,
    bizCode: props.bizCode,
    bizName: props.bizName,
    customerId: props.customerId,
    customerCode: props.customerCode,
    companyType: props.companyType || 1,
    followTime: formatNow(),
    followType: DEFAULT_FOLLOW_TYPE,
    followContent: '',
    nextFollowTime: '',
    nextFollowContent: '',
    operatorUserId: currentOperatorDefaults.value.operatorUserId,
    operatorUserName: currentOperatorDefaults.value.operatorUserName,
    departId: currentOperatorDefaults.value.departId,
    departName: currentOperatorDefaults.value.departName,
    remark: '',
  } as CrmCustomerFollowRecordApi.FollowRecord;
}

function syncFormDataFromProps() {
  formData.value = {
    ...buildDefaultFormData(),
    ...(props.followRecordData || {}),
    bizType: props.bizType,
    bizId: props.bizId,
    bizCode: props.bizCode,
    bizName: props.bizName,
    customerId: props.customerId,
    customerCode: props.customerCode,
    companyType: props.companyType || 1,
  } as CrmCustomerFollowRecordApi.FollowRecord;
}

async function loadCurrentOperatorDefaults() {
  const currentUser = getCurrentUserInfo();
  try {
    const deptInfo = await getCurrentUserBoundDeptInfo();
    currentOperatorDefaults.value = {
      operatorUserId: currentUser.operatorUserId,
      operatorUserName: currentUser.operatorUserName,
      departId: String(deptInfo.deptId || '').trim(),
      departName: String(deptInfo.deptName || '').trim(),
    };
  } catch (error) {
    console.error('获取默认跟进人部门失败:', error);
    currentOperatorDefaults.value = {
      operatorUserId: currentUser.operatorUserId,
      operatorUserName: currentUser.operatorUserName,
      departId: '',
      departName: '',
    };
  }

  syncFormDataFromProps();
}

async function handleSave() {
  const payload: CrmCustomerFollowRecordApi.FollowRecord = {
    ...formData.value,
    bizType: props.bizType,
    bizId: props.bizId,
    bizCode: props.bizCode,
    bizName: props.bizName,
    customerId: props.customerId,
    customerCode: props.customerCode,
    companyType: props.companyType || 1,
    followTime: String(formData.value.followTime || '').trim(),
    followType: String(formData.value.followType || '').trim(),
    followContent: String(formData.value.followContent || '').trim(),
    nextFollowTime: String(formData.value.nextFollowTime || '').trim(),
    nextFollowContent: String(formData.value.nextFollowContent || '').trim(),
    operatorUserId: String(formData.value.operatorUserId || '').trim(),
    operatorUserName: String(formData.value.operatorUserName || '').trim(),
    departId: String(formData.value.departId || '').trim(),
    departName: String(formData.value.departName || '').trim(),
    remark: String(formData.value.remark || '').trim(),
  };

  if (!String(payload.bizId || '').trim()) {
    ElMessage.warning('缺少业务ID，无法保存跟进记录');
    return;
  }
  if (!payload.followTime) {
    ElMessage.warning('请选择跟进时间');
    return;
  }
  if (!payload.followContent) {
    ElMessage.warning('请输入跟进内容');
    return;
  }

  if (payload.id || payload.rowid) {
    await updateFollowRecord(payload);
    ElMessage.success('修改跟进记录成功');
  } else {
    payload.id = buildUUID();
    payload.rowid = payload.id;
    await createFollowRecord(payload);
    ElMessage.success('新增跟进记录成功');
  }
  emit('save-success');
  if (props.inline) {
    formData.value = buildDefaultFormData();
  }
}

watch(
  () => [
    props.followRecordData,
    props.bizType,
    props.bizId,
    props.bizCode,
    props.bizName,
    props.customerId,
    props.customerCode,
    props.companyType,
  ],
  () => {
    syncFormDataFromProps();
  },
  { immediate: true },
);

loadCurrentOperatorDefaults();
</script>

<template>
  <div class="follow-record-form" :class="{ inline: inline }">
    <ElForm :model="formData" label-width="110px">
      <ElFormItem label="跟进时间" required>
        <ElDatePicker
          v-model="formData.followTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择跟进时间"
          class="w-full"
        />
      </ElFormItem>
      <ElFormItem label="跟进方式">
        <ElSelect v-model="formData.followType" placeholder="请选择跟进方式" class="w-full">
          <ElOption v-for="item in FOLLOW_TYPE_OPTIONS" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="跟进内容" required>
        <ElInput v-model="formData.followContent" type="textarea" :rows="inline ? 3 : 4" placeholder="请输入跟进内容" />
      </ElFormItem>
      <ElFormItem label="下次跟进时间">
        <ElDatePicker
          v-model="formData.nextFollowTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择下次跟进时间"
          class="w-full"
        />
      </ElFormItem>
      <ElFormItem label="下次跟进计划">
        <ElInput v-model="formData.nextFollowContent" type="textarea" :rows="inline ? 2 : 3" placeholder="请输入下次跟进计划" />
      </ElFormItem>
      <ElFormItem label="跟进人">
        <ElInput :model-value="formData.operatorUserName || ''" readonly placeholder="系统自动带出当前登录人" />
      </ElFormItem>
      <ElFormItem label="跟进部门">
        <ElInput :model-value="formData.departName || ''" readonly placeholder="系统自动带出当前部门" />
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput v-model="formData.remark" type="textarea" :rows="inline ? 2 : 3" placeholder="请输入备注" />
      </ElFormItem>
    </ElForm>

    <div class="form-actions" :class="{ inline: inline }">
      <ElButton v-if="!inline" @click="emit('close')">取消</ElButton>
      <ElButton type="primary" @click="handleSave">{{ inline ? '快速保存' : '确定' }}</ElButton>
    </div>
  </div>
</template>

<style scoped>
.follow-record-form.inline {
  padding: 4px 0 0;
}

.form-actions {
  text-align: right;
}

.form-actions.inline {
  display: flex;
  justify-content: flex-end;
}
</style>
