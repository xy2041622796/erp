<script lang="ts" setup>
import type { BilInexpCateApi } from '#/api/erp/finance/settings/inexpcate';

import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  createInexpCate,
  getInexpCate,
  updateInexpCate,
} from '#/api/erp/finance/settings/inexpcate';
import { CASH_FLOW_OPTIONS } from '#/views/finance/funds/inexpcate/data';

import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

const emit = defineEmits(['success']);

const formType = ref<'create' | 'detail' | 'edit'>('create');
const editForm = reactive<Partial<BilInexpCateApi.Category>>({});
const readonly = computed(() => formType.value === 'detail');
const categoryTypeText = computed(() => {
  if (Number(editForm.category_type) === 1) return '收入类别';
  if (Number(editForm.category_type) === 2) return '支出类别';
  return '类别';
});

function resetForm() {
  Object.assign(editForm, {
    id: undefined,
    lingma_sys_is_delete: 0,
    code: '',
    name: '',
    parent_id: undefined,
    parent_name: '全部类别',
    category_type: undefined,
    cash_flow_code: undefined,
    cash_flow_name: undefined,
    description: '',
    enabled: 1,
    use_scope: 1,
    sort_no: 0,
  });
}

function getCashFlowCodeOf(row: any) {
  return String(row?.cash_flow_code || row?.cashFlowCode || row?.cash_flow_item_code || '').trim();
}

function getCashFlowNameOf(row: any) {
  return String(row?.cash_flow_name || row?.cashFlowName || row?.cash_flow_item_name || '').trim();
}

function syncCashFlowFields(value?: string) {
  const code = String(value ?? editForm.cash_flow_code ?? '').trim();
  const option = CASH_FLOW_OPTIONS.find((item) => String(item.value) === code);
  editForm.cash_flow_code = code || undefined;
  editForm.cash_flow_name = code ? (option?.label || getCashFlowNameOf(editForm)) : undefined;
}

function onCashFlowChange(value?: string) {
  syncCashFlowFields(value);
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (formType.value === 'detail') {
      await modalApi.close();
      return;
    }

    if (!String(editForm.name || '').trim()) {
      ElMessage.warning('请输入名称');
      return;
    }

    if (!Number(editForm.category_type || 0)) {
      ElMessage.warning('请选择类别类型');
      return;
    }

    modalApi.lock();
    try {
      syncCashFlowFields();
      const payload = {
        ...editForm,
        cashFlowCode: editForm.cash_flow_code,
        cashFlowName: editForm.cash_flow_name,
        cash_flow_item_code: editForm.cash_flow_code,
        cash_flow_item_name: editForm.cash_flow_name,
      } as BilInexpCateApi.Category;
      if (formType.value === 'create') {
        await createInexpCate(payload);
      } else if (formType.value === 'edit') {
        await updateInexpCate(payload);
      }
      await modalApi.close();
      emit('success');
      ElMessage.success('保存成功');
    } catch (error: any) {
      ElMessage.error(error?.message || '保存失败');
    } finally {
      modalApi.unlock();
    }
  },

  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetForm();
      return;
    }

    const data = modalApi.getData<{
      id?: string;
      type: 'create' | 'detail' | 'edit';
      category_type?: number;
      parent_id?: string;
      parent_name?: string;
    }>();

    formType.value = data.type;
    resetForm();

    if (!data?.id) {
      Object.assign(editForm, {
        category_type: data?.category_type,
        parent_id: data?.parent_id,
        parent_name: data?.parent_name || '全部类别',
      });
      return;
    }

    modalApi.lock();
    try {
      const res = await getInexpCate(data.id as string);
      Object.assign(editForm, {
        parent_name: '全部类别',
        ...(res || {}),
        cash_flow_code: getCashFlowCodeOf(res) || undefined,
        cash_flow_name: getCashFlowNameOf(res) || undefined,
      });
      syncCashFlowFields();
    } catch (error: any) {
      ElMessage.error(error?.message || '加载失败');
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    class="inexp-cate-modal"
    :title="
      formType === 'create'
        ? '新增' + categoryTypeText
        : formType === 'edit'
          ? '编辑' + categoryTypeText
          : categoryTypeText + '详情'
    "
    :show-confirm-button="formType !== 'detail'"
  >
    <ElForm class="inexp-cate-form" label-position="top">
      <ElFormItem label="编码" required>
        <ElInput
          v-model="editForm.code"
          :disabled="readonly"
          placeholder="不填则自动生成"
        />
      </ElFormItem>

      <ElFormItem label="名称" required>
        <ElInput
          v-model="editForm.name"
          :disabled="readonly"
          placeholder="请输入类别名称"
        />
      </ElFormItem>

      <ElFormItem label="类别类型" required>
        <ElSelect
          v-model="editForm.category_type"
          :disabled="readonly || formType === 'edit'"
          placeholder="请选择收入或支出类别"
        >
          <ElOption label="收入类别" :value="1" />
          <ElOption label="支出类别" :value="2" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="关联现金流">
        <ElSelect
          v-model="editForm.cash_flow_code"
          :disabled="readonly"
          clearable
          filterable
          placeholder="请选择"
          @change="onCashFlowChange"
        >
          <ElOption
            v-for="item in CASH_FLOW_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="智能匹配摘要关键字">
        <ElInput
          v-model="editForm.description"
          :disabled="readonly"
          :rows="4"
          placeholder="请输入关键字，多个关键词可用逗号、顿号或空格隔开"
          type="textarea"
        />
      </ElFormItem>

      <div v-if="formType !== 'detail'" class="inexp-form-help">
        <div><span class="inexp-form-help__mark">!</span> 1. 当日记账的摘要中有对应关键字时，可以自动匹配带出此收支类别</div>
        <div class="inexp-form-help__line">2. 不同关键字之间用逗号、顿号或空格隔开</div>
      </div>
    </ElForm>
  </Modal>
</template>

<style scoped>
.inexp-cate-form {
  width: 480px;
  max-width: calc(100vw - 72px);
  padding: 8px 16px 12px;
}

.inexp-cate-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.inexp-cate-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  line-height: 20px;
  font-weight: 500;
}

.inexp-cate-form :deep(.el-input),
.inexp-cate-form :deep(.el-select),
.inexp-cate-form :deep(.el-textarea) {
  width: 100%;
}

.inexp-form-help {
  margin-top: -2px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 22px;
}

.inexp-form-help__mark {
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--el-color-warning);
  color: #fff;
  font-size: 12px;
  line-height: 14px;
}

.inexp-form-help__line {
  padding-left: 20px;
}
</style>
