<script lang="ts" setup>
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed, reactive, ref, watch } from 'vue';

import {
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
} from 'element-plus';

import {
  checkBusinessDuplicate,
  createBusinessWithAutoCode,
  getBusinessContactOptions,
  getBusinessCustomerOptions,
  getBusinessLeadOptions,
  getBusinessOwnerOptions,
  updateBusiness,
} from '#/api/erp/client/business';

import {
  BUSINESS_STAGE_OPTIONS,
  isBusinessReadonly,
  SUCCESS_RATE_OPTIONS,
} from '../data';
import ItemForm from './item-form.vue';

const props = defineProps<{
  businessData?: CrmCustomerBusinessApi.Business | null;
  contactId?: number | string;
  customerId?: number | string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saveSuccess', id?: number | string): void;
}>();

const loadingCustomerOptions = ref(false);
const loadingContactOptions = ref(false);
const loadingLeadOptions = ref(false);
const loadingOwnerOptions = ref(false);
const customerOptions = ref<any[]>([]);
const contactOptions = ref<CrmCustomerBusinessApi.ContactOption[]>([]);
const leadOptions = ref<CrmCustomerBusinessApi.LeadOption[]>([]);
const ownerOptions = ref<CrmCustomerBusinessApi.OwnerOption[]>([]);
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const initialized = ref(false);

const formData = reactive({
  rowid: '',
  businessCode: '',
  businessName: '',
  customerId: '',
  customerCode: '',
  customerName: '',
  companyType: 1,
  primaryContactId: '',
  primaryContactName: '',
  participantContactIds: [] as string[],
  sourceLeadId: '',
  sourceLeadName: '',
  ownerUserId: '',
  ownerUserName: '',
  departId: '',
  departName: '',
  expectedSignDate: '',
  successRate: undefined as number | undefined,
  businessStage: 0,
  businessStatus: 0,
  remark: '',
  totalProductPrice: 0,
  discountPercent: 0,
  amount: 0,
  items: [] as CrmCustomerBusinessApi.BusinessProductItem[],
});

const isEditMode = computed(() => !!String(formData.rowid || '').trim());
const computedReadonly = computed(
  () => !!props.readonly || isBusinessReadonly(formData.businessStatus),
);
const participantContactOptions = computed(() => {
  const primaryId = String(formData.primaryContactId || '').trim();
  return contactOptions.value.filter(
    (item) => String(item.id || '').trim() !== primaryId,
  );
});

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function roundAmount(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(precision));
}

function syncAmount() {
  const total = roundAmount(toNumber(formData.totalProductPrice));
  const rawDiscount = roundAmount(toNumber(formData.discountPercent), 2);
  const discount = Math.min(Math.max(rawDiscount, 0), 100);
  formData.totalProductPrice = total;
  formData.discountPercent = discount;
  formData.amount = roundAmount(total * (1 - discount / 100));
}

function resetForm() {
  formData.rowid = '';
  formData.businessCode = '';
  formData.businessName = '';
  formData.customerId = '';
  formData.customerCode = '';
  formData.customerName = '';
  formData.companyType = 1;
  formData.primaryContactId = '';
  formData.primaryContactName = '';
  formData.participantContactIds = [];
  formData.sourceLeadId = '';
  formData.sourceLeadName = '';
  formData.ownerUserId = '';
  formData.ownerUserName = '';
  formData.departId = '';
  formData.departName = '';
  formData.expectedSignDate = '';
  formData.successRate = undefined;
  formData.businessStage = 0;
  formData.businessStatus = 0;
  formData.remark = '';
  formData.totalProductPrice = 0;
  formData.discountPercent = 0;
  formData.amount = 0;
  formData.items = [];
}

async function loadCustomerOptions(keyword = '') {
  loadingCustomerOptions.value = true;
  try {
    customerOptions.value = await getBusinessCustomerOptions(keyword);
  } finally {
    loadingCustomerOptions.value = false;
  }
}

async function loadLeadOptions(keyword = '') {
  loadingLeadOptions.value = true;
  try {
    leadOptions.value = await getBusinessLeadOptions(keyword);
  } finally {
    loadingLeadOptions.value = false;
  }
}

async function loadOwnerOptions(keyword = '') {
  loadingOwnerOptions.value = true;
  try {
    ownerOptions.value = await getBusinessOwnerOptions(keyword);
  } finally {
    loadingOwnerOptions.value = false;
  }
}

async function loadContactOptions(customerId?: number | string) {
  const targetCustomerId = String(
    customerId || formData.customerId || '',
  ).trim();
  if (!targetCustomerId) {
    contactOptions.value = [];
    return;
  }
  loadingContactOptions.value = true;
  try {
    contactOptions.value = await getBusinessContactOptions(targetCustomerId);
  } finally {
    loadingContactOptions.value = false;
  }
}

function fillCustomerByOption(customerId?: number | string) {
  const matched = customerOptions.value.find(
    (item) =>
      String(item.customerId || item.id || '').trim() ===
      String(customerId || '').trim(),
  );
  if (!matched) return;
  formData.customerId = String(matched.customerId || matched.id || '');
  formData.customerCode = String(matched.customerCode || '');
  formData.customerName = String(matched.customerName || '');
}

function fillOwnerByOption(ownerUserId?: number | string) {
  const matched = ownerOptions.value.find(
    (item) => String(item.id || '').trim() === String(ownerUserId || '').trim(),
  );
  if (!matched) return;
  formData.ownerUserId = String(matched.id || '');
  formData.ownerUserName = String(matched.name || '');
  formData.departId = String(matched.departId || '');
  if (!formData.departName) {
    formData.departName = String(matched.departName || '');
  }
}

function fillLeadByOption(leadId?: number | string) {
  const matched = leadOptions.value.find(
    (item) => String(item.id || '').trim() === String(leadId || '').trim(),
  );
  if (!matched) return;
  formData.sourceLeadId = String(matched.id || '');
  formData.sourceLeadName = String(matched.leadName || '');
}

function handleCustomerChange(value?: number | string) {
  const normalizedValue = String(value || '').trim();
  const matched = customerOptions.value.find(
    (item) =>
      String(item.customerId || item.id || '').trim() === normalizedValue,
  );
  formData.customerId = normalizedValue;
  formData.customerCode = String(matched?.customerCode || '');
  formData.customerName = String(matched?.customerName || '');
  if (!initialized.value) return;
  formData.primaryContactId = '';
  formData.primaryContactName = '';
  formData.participantContactIds = [];
  contactOptions.value = [];
  if (normalizedValue) {
    loadContactOptions(normalizedValue);
  }
}

function handleOwnerChange(value?: number | string) {
  const normalizedValue = String(value || '').trim();
  const matched = ownerOptions.value.find(
    (item) => String(item.id || '').trim() === normalizedValue,
  );
  formData.ownerUserId = normalizedValue;
  formData.ownerUserName = String(matched?.name || '');
  formData.departId = String(matched?.departId || '');
  formData.departName = String(matched?.departName || '');
}

function handlePrimaryContactChange(value?: number | string) {
  const normalizedValue = String(value || '').trim();
  const matched = contactOptions.value.find(
    (item) => String(item.id || '').trim() === normalizedValue,
  );
  formData.primaryContactId = normalizedValue;
  formData.primaryContactName = String(matched?.contactName || '');
  formData.participantContactIds = formData.participantContactIds.filter(
    (item) => String(item || '').trim() !== normalizedValue,
  );
}

function handleLeadChange(value?: number | string) {
  const normalizedValue = String(value || '').trim();
  const matched = leadOptions.value.find(
    (item) => String(item.id || '').trim() === normalizedValue,
  );
  formData.sourceLeadId = normalizedValue;
  formData.sourceLeadName = String(matched?.leadName || '');
}

function handleItemsChange(
  items: CrmCustomerBusinessApi.BusinessProductItem[],
) {
  formData.items = items;
  syncAmount();
}

function handleTotalProductPriceChange(value: number) {
  formData.totalProductPrice = roundAmount(toNumber(value));
  syncAmount();
}

function buildSavePayload(): CrmCustomerBusinessApi.BusinessSavePayload {
  const contacts: CrmCustomerBusinessApi.BusinessContactSelection[] = [];
  const primaryId = String(formData.primaryContactId || '').trim();
  if (primaryId) {
    const matched = contactOptions.value.find(
      (item) => String(item.id || '').trim() === primaryId,
    );
    contacts.push({
      contactId: primaryId,
      contactName: matched?.contactName || formData.primaryContactName,
      isPrimary: 1,
    });
  }
  formData.participantContactIds.forEach((item) => {
    const id = String(item || '').trim();
    if (!id || id === primaryId) return;
    const matched = contactOptions.value.find(
      (contact) => String(contact.id || '').trim() === id,
    );
    contacts.push({
      contactId: id,
      contactName: matched?.contactName,
      isPrimary: 0,
    });
  });
  return {
    business: {
      rowid: formData.rowid || undefined,
      id: formData.rowid || undefined,
      businessCode: formData.businessCode,
      businessName: formData.businessName.trim(),
      customerId: formData.customerId,
      customerCode: formData.customerCode,
      customerName: formData.customerName,
      companyType: 1,
      primaryContactId: formData.primaryContactId || undefined,
      primaryContactName: formData.primaryContactName,
      sourceLeadId: formData.sourceLeadId || undefined,
      sourceLeadName: formData.sourceLeadName,
      ownerUserId: formData.ownerUserId,
      ownerUserName: formData.ownerUserName,
      departId: formData.departId || undefined,
      departName: formData.departName,
      expectedSignDate: formData.expectedSignDate || undefined,
      successRate: formData.successRate,
      businessStage: Number(formData.businessStage || 0),
      businessStatus: Number(formData.businessStatus || 0),
      remark: formData.remark.trim(),
      totalProductPrice: formData.totalProductPrice,
      discountPercent: formData.discountPercent,
      amount: formData.amount,
      participantContactIds: [...formData.participantContactIds],
      items: [...formData.items],
    },
    contacts,
    items: [...formData.items],
  };
}

async function handleSave() {
  if (computedReadonly.value) {
    ElMessage.warning('当前商机不可编辑');
    return;
  }
  if (!formData.businessName.trim()) return ElMessage.warning('请输入商机名称');
  if (!String(formData.ownerUserId || '').trim())
    return ElMessage.warning('请选择负责人');
  if (!String(formData.customerId || '').trim())
    return ElMessage.warning('请选择客户名称');

  try {
    itemFormRef.value?.validate();
  } catch (error: any) {
    ElMessage.warning(error?.message || '请完善产品清单');
    return;
  }

  const payload = buildSavePayload();
  const duplicateResult = await checkBusinessDuplicate(payload.business);
  if (duplicateResult.hasDuplicate) {
    const duplicateMessage = duplicateResult.items
      .map(
        (item) =>
          `${item.businessName || ''} / ${item.customerName || ''} / ${item.businessCode || '-'}`,
      )
      .join('\n');
    try {
      await ElMessageBox.confirm(
        `${duplicateResult.message}\n\n${duplicateMessage}`,
        '商机查重提示',
        {
          type: 'warning',
          confirmButtonText: '继续保存',
          cancelButtonText: '取消',
        },
      );
    } catch {
      return;
    }
  }

  if (isEditMode.value) {
    await updateBusiness(payload);
    ElMessage.success('修改商机成功');
    emit('saveSuccess', formData.rowid);
    return;
  }
  const res = await createBusinessWithAutoCode(payload);
  ElMessage.success('新增商机成功');
  emit('saveSuccess', res?.rowid);
}

watch(
  () => formData.discountPercent,
  () => {
    syncAmount();
  },
);

watch(
  () => props.businessData,
  async (data) => {
    initialized.value = false;
    resetForm();
    await Promise.all([
      loadCustomerOptions(),
      loadLeadOptions(),
      loadOwnerOptions(),
    ]);
    if (data) {
      formData.rowid = String(data.rowid || data.id || '');
      formData.businessCode = String(data.businessCode || '');
      formData.businessName = String(data.businessName || '');
      formData.customerId = String(data.customerId || '');
      formData.customerCode = String(data.customerCode || '');
      formData.customerName = String(data.customerName || '');
      formData.companyType = Number(data.companyType || 1) || 1;
      formData.primaryContactId = String(data.primaryContactId || '');
      formData.primaryContactName = String(data.primaryContactName || '');
      formData.participantContactIds = (data.participantContactIds || []).map(
        (item) => String(item || ''),
      );
      formData.sourceLeadId = String(data.sourceLeadId || '');
      formData.sourceLeadName = String(data.sourceLeadName || '');
      formData.ownerUserId = String(data.ownerUserId || '');
      formData.ownerUserName = String(data.ownerUserName || '');
      formData.departId = String(data.departId || '');
      formData.departName = String(data.departName || '');
      formData.expectedSignDate = String(data.expectedSignDate || '');
      formData.successRate =
        data.successRate === undefined || data.successRate === null
          ? undefined
          : Number(data.successRate);
      formData.businessStage = Number(data.businessStage || 0);
      formData.businessStatus = Number(data.businessStatus || 0);
      formData.remark = String(data.remark || '');
      formData.totalProductPrice = roundAmount(
        toNumber(data.totalProductPrice),
      );
      formData.discountPercent = roundAmount(toNumber(data.discountPercent), 2);
      formData.amount = roundAmount(toNumber(data.amount));
      formData.items = (data.items || []).map((item) => ({ ...item }));
      fillCustomerByOption(formData.customerId);
      fillOwnerByOption(formData.ownerUserId);
      fillLeadByOption(formData.sourceLeadId);
      if (formData.customerId) {
        await loadContactOptions(formData.customerId);
        handlePrimaryContactChange(formData.primaryContactId);
      }
      syncAmount();
    } else {
      formData.businessStatus = 0;
      formData.businessStage = 0;
      if (props.customerId) {
        formData.customerId = String(props.customerId || '');
        fillCustomerByOption(formData.customerId);
        await loadContactOptions(formData.customerId);
      }
      if (props.contactId) {
        formData.primaryContactId = String(props.contactId || '');
        handlePrimaryContactChange(formData.primaryContactId);
      }
      syncAmount();
    }
    initialized.value = true;
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
      <ElButton type="primary" :disabled="computedReadonly" @click="handleSave">
        保存
      </ElButton>
    </div>

    <ElForm :model="formData" label-position="top">
      <div class="grid grid-cols-3 gap-x-6 gap-y-2">
        <ElFormItem label="商机名称" required>
          <ElInput
            v-model="formData.businessName"
            :disabled="computedReadonly"
            placeholder="请输入商机名称"
          />
        </ElFormItem>
        <ElFormItem label="负责人" required>
          <ElSelect
            v-model="formData.ownerUserId"
            filterable
            remote
            reserve-keyword
            clearable
            class="w-full"
            placeholder="请选择负责人"
            :remote-method="loadOwnerOptions"
            :loading="loadingOwnerOptions"
            :disabled="computedReadonly"
            @change="handleOwnerChange"
          >
            <ElOption
              v-for="item in ownerOptions"
              :key="String(item.id || '')"
              :label="String(item.name || '')"
              :value="String(item.id || '')"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="客户名称" required>
          <ElSelect
            v-model="formData.customerId"
            filterable
            remote
            reserve-keyword
            clearable
            class="w-full"
            placeholder="请选择客户"
            :remote-method="loadCustomerOptions"
            :loading="loadingCustomerOptions"
            :disabled="computedReadonly"
            @change="handleCustomerChange"
          >
            <ElOption
              v-for="item in customerOptions"
              :key="String(item.customerId || item.id || '')"
              :label="`${item.customerName || ''}（${item.customerCode || '-'}）`"
              :value="String(item.customerId || item.id || '')"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="主联系人">
          <ElSelect
            v-model="formData.primaryContactId"
            clearable
            class="w-full"
            placeholder="请先选择客户后选择主联系人"
            :disabled="computedReadonly || !formData.customerId"
            :loading="loadingContactOptions"
            @change="handlePrimaryContactChange"
          >
            <ElOption
              v-for="item in contactOptions"
              :key="String(item.id || '')"
              :label="`${item.contactName || ''}${item.mobile ? `（${item.mobile}）` : ''}`"
              :value="String(item.id || '')"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="来源线索">
          <ElSelect
            v-model="formData.sourceLeadId"
            filterable
            remote
            reserve-keyword
            clearable
            class="w-full"
            placeholder="请输入线索名称或编号搜索"
            :remote-method="loadLeadOptions"
            :loading="loadingLeadOptions"
            :disabled="computedReadonly"
            @change="handleLeadChange"
          >
            <ElOption
              v-for="item in leadOptions"
              :key="String(item.id || '')"
              :label="`${item.leadName || ''}${item.leadCode ? `（${item.leadCode}）` : ''}`"
              :value="String(item.id || '')"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="预计成交日期">
          <ElDatePicker
            v-model="formData.expectedSignDate"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
            placeholder="请选择预计成交日期"
            :disabled="computedReadonly"
          />
        </ElFormItem>
        <ElFormItem label="成交概率">
          <ElSelect
            v-model="formData.successRate"
            clearable
            allow-create
            filterable
            default-first-option
            class="w-full"
            placeholder="请选择或输入成交概率"
            :disabled="computedReadonly"
          >
            <ElOption
              v-for="item in SUCCESS_RATE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="商机编号">
          <ElInput
            v-model="formData.businessCode"
            disabled
            placeholder="保存后自动生成"
          />
        </ElFormItem>
        <ElFormItem label="参与联系人">
          <ElSelect
            v-model="formData.participantContactIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            class="w-full"
            placeholder="请先选择客户后选择参与联系人"
            :disabled="computedReadonly || !formData.customerId"
          >
            <ElOption
              v-for="item in participantContactOptions"
              :key="String(item.id || '')"
              :label="`${item.contactName || ''}${item.mobile ? `（${item.mobile}）` : ''}`"
              :value="String(item.id || '')"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="商机阶段">
          <ElSelect
            v-model="formData.businessStage"
            class="w-full"
            placeholder="请选择商机阶段"
            :disabled="computedReadonly"
          >
            <ElOption
              v-for="item in BUSINESS_STAGE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="所属部门">
          <ElInput
            v-model="formData.departName"
            :disabled="computedReadonly"
            placeholder="负责人选择后自动带出，可手工修改"
          />
        </ElFormItem>
        <ElFormItem label="备注" class="col-span-2">
          <ElInput
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            :disabled="computedReadonly"
            placeholder="请输入备注"
          />
        </ElFormItem>
      </div>
    </ElForm>

    <div class="mt-4">
      <div class="mb-3 text-base font-medium">产品清单</div>
      <ItemForm
        ref="itemFormRef"
        :items="formData.items"
        :disabled="computedReadonly"
        @update:items="handleItemsChange"
        @update:total-product-price="handleTotalProductPriceChange"
      />
    </div>

    <div class="mt-8 grid grid-cols-3 gap-6">
      <div>
        <div class="mb-2 text-sm text-gray-700">产品总金额</div>
        <ElInputNumber
          v-model="formData.totalProductPrice"
          :precision="2"
          :controls="false"
          class="!w-full"
          disabled
        />
      </div>
      <div>
        <div class="mb-2 text-sm text-gray-700">整单折扣（%）</div>
        <ElInputNumber
          v-model="formData.discountPercent"
          :min="0"
          :max="100"
          :precision="2"
          :controls="false"
          class="!w-full"
          :disabled="computedReadonly"
        />
      </div>
      <div>
        <div class="mb-2 text-sm text-gray-700">折扣后金额</div>
        <ElInputNumber
          v-model="formData.amount"
          :precision="2"
          :controls="false"
          class="!w-full"
          disabled
        />
      </div>
    </div>
  </div>
</template>
