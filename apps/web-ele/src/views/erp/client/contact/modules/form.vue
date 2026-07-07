<script lang="ts" setup>
import type { CrmCustomerContactApi } from '#/api/erp/customer/contact';

import { computed, ref, watch } from 'vue';

import { buildUUID } from '@vben/utils';

import {
  ElButton,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

import {
  createContact,
  getPartyOptions,
  updateContact,
} from '#/api/erp/customer/contact';

import { companyTypeTabs, genderOptions } from '../data';

const props = defineProps<{
  companyType: number;
  contactData?: CrmCustomerContactApi.Contact | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saveSuccess'): void;
}>();

const formData = ref<CrmCustomerContactApi.Contact>(
  {} as CrmCustomerContactApi.Contact,
);
const partyOptions = ref<CrmCustomerContactApi.PartyOption[]>([]);
const loadingOptions = ref(false);

const currentCompanyTypeLabel = computed(() => {
  const matched = companyTypeTabs.find(
    (item) => Number(item.value) === Number(props.companyType || 0),
  );
  return matched?.label || '';
});

function normalizePartyId(value?: number | string) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function normalizePartyOption(
  item: CrmCustomerContactApi.PartyOption,
): CrmCustomerContactApi.PartyOption {
  return {
    ...item,
    id: normalizePartyId(item.id),
    customerCode: String(item.customerCode || ''),
    customerName: String(item.customerName || ''),
  };
}

const selectedPartyOption = computed<CrmCustomerContactApi.PartyOption | null>(
  () => {
    const currentId = normalizePartyId(formData.value.customerId);
    if (!currentId) return null;

    const matched = partyOptions.value.find(
      (item) => normalizePartyId(item.id) === currentId,
    );

    if (matched) {
      return normalizePartyOption(matched);
    }

    return normalizePartyOption({
      id: currentId,
      customerCode: formData.value.customerCode,
      customerName: formData.value.customerName,
      companyType: formData.value.companyType,
    });
  },
);

const displayPartyOptions = computed(() => {
  const currentId = normalizePartyId(selectedPartyOption.value?.id);
  const normalizedOptions = partyOptions.value.map((item) =>
    normalizePartyOption(item),
  );
  if (!currentId) return normalizedOptions;

  const hasCurrentInOptions = normalizedOptions.some(
    (item) => normalizePartyId(item.id) === currentId,
  );
  if (hasCurrentInOptions) {
    return normalizedOptions;
  }

  return [selectedPartyOption.value!, ...normalizedOptions];
});

function buildDefaultFormData() {
  return {
    companyType: Number(props.companyType || 0),
    customerId: undefined,
    customerCode: '',
    customerName: '',
    contactName: '',
    gender: undefined,
    mobile: '',
    phone: '',
    email: '',
    positionName: '',
    isPrimary: 0,
    remark: '',
  } as CrmCustomerContactApi.Contact;
}

function normalizeMobile(value?: string) {
  return String(value || '')
    .replaceAll(/\D/g, '')
    .slice(0, 11);
}

async function loadPartyOptions(keyword = '') {
  loadingOptions.value = true;
  try {
    const options = await getPartyOptions({
      companyType: Number(props.companyType || 0),
      keyword,
    });
    partyOptions.value = options.map((item) => normalizePartyOption(item));
  } finally {
    loadingOptions.value = false;
  }
}

function handlePartyChange(value?: number | string) {
  const normalizedValue = normalizePartyId(value);

  if (!normalizedValue) {
    formData.value.customerId = undefined;
    formData.value.customerCode = '';
    formData.value.customerName = '';
    formData.value.companyType = Number(props.companyType || 0);
    return;
  }

  const matched = partyOptions.value.find(
    (item) => normalizePartyId(item.id) === normalizedValue,
  );

  formData.value.customerId = normalizedValue;

  if (!matched) {
    return;
  }

  formData.value.customerCode = matched.customerCode || '';
  formData.value.customerName = matched.customerName || '';
  formData.value.companyType = Number(
    matched.companyType || props.companyType || 0,
  );
}

async function handleSave() {
  const payload: CrmCustomerContactApi.Contact = {
    ...formData.value,
    companyType: Number(props.companyType || 0),
    customerId: normalizePartyId(formData.value.customerId),
    customerCode: String(formData.value.customerCode || '').trim(),
    customerName: String(formData.value.customerName || '').trim(),
    contactName: String(formData.value.contactName || '').trim(),
    mobile: normalizeMobile(formData.value.mobile),
    phone: String(formData.value.phone || '').trim(),
    email: String(formData.value.email || '').trim(),
    positionName: String(formData.value.positionName || '').trim(),
    isPrimary: Number(formData.value.isPrimary || 0),
    remark: String(formData.value.remark || '').trim(),
  };

  if (!payload.customerId) {
    ElMessage.warning('请选择所属主体');
    return;
  }
  if (!payload.contactName) {
    ElMessage.warning('请输入联系人姓名');
    return;
  }
  if (payload.mobile && !/^1\d{10}$/.test(payload.mobile)) {
    ElMessage.warning('请输入正确的11位手机号');
    return;
  }

  if (payload.id) {
    await updateContact(payload);
    ElMessage.success('修改联系人成功');
  } else {
    payload.id = buildUUID();
    await createContact(payload);
    ElMessage.success('新增联系人成功');
  }
  emit('saveSuccess');
}

watch(
  () => props.contactData,
  async (data) => {
    formData.value = {
      ...buildDefaultFormData(),
      ...data,
      customerId: normalizePartyId(data?.customerId),
      customerCode: String(data?.customerCode || ''),
      customerName: String(data?.customerName || ''),
      companyType: Number(data?.companyType || props.companyType || 0),
      isPrimary: Number(data?.isPrimary || 0),
    } as CrmCustomerContactApi.Contact;
    await loadPartyOptions();
  },
  { immediate: true },
);
</script>

<template>
  <div class="px-4 pb-2 pt-0">
    <div
      class="sticky top-0 z-[1000] flex justify-end gap-3 bg-white pb-3 pt-0"
    >
      <ElButton @click="emit('close')">取消</ElButton>
      <ElButton type="primary" @click="handleSave">保存</ElButton>
    </div>

    <ElForm :model="formData" label-width="100px">
      <ElFormItem label="联系人类型">
        <ElInput :model-value="currentCompanyTypeLabel" disabled />
      </ElFormItem>
      <ElFormItem label="所属主体" required>
        <ElSelect
          v-model="formData.customerId"
          filterable
          remote
          reserve-keyword
          clearable
          class="w-full"
          placeholder="请输入名称或编号搜索"
          :remote-method="loadPartyOptions"
          :loading="loadingOptions"
          @change="handlePartyChange"
        >
          <ElOption
            v-for="item in displayPartyOptions"
            :key="String(item.id || '')"
            :label="`${item.customerName || ''}（${item.customerCode || '-'}）`"
            :value="String(item.id || '')"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="联系人姓名" required>
        <ElInput
          v-model="formData.contactName"
          placeholder="请输入联系人姓名"
        />
      </ElFormItem>
      <ElFormItem label="性别">
        <ElSelect
          v-model="formData.gender"
          clearable
          placeholder="请选择性别"
          class="w-full"
        >
          <ElOption
            v-for="item in genderOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="手机号">
        <ElInput v-model="formData.mobile" placeholder="请输入手机号" />
      </ElFormItem>
      <ElFormItem label="联系电话">
        <ElInput v-model="formData.phone" placeholder="请输入联系电话" />
      </ElFormItem>
      <ElFormItem label="邮箱">
        <ElInput v-model="formData.email" placeholder="请输入邮箱" />
      </ElFormItem>
      <ElFormItem label="职务/岗位">
        <ElInput
          v-model="formData.positionName"
          placeholder="请输入职务/岗位"
        />
      </ElFormItem>
      <ElFormItem label="主联系人">
        <ElCheckbox
          v-model="formData.isPrimary"
          :true-label="1"
          :false-label="0"
        >
          设为主联系人
        </ElCheckbox>
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注"
        />
      </ElFormItem>
    </ElForm>
  </div>
</template>
