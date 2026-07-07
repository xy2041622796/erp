<script lang="ts" setup>
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';
import {
  DEFAULT_SUBJECT_CODE_RULE,
  formatSubjectCodeRule,
  getNextSubjectCodeSegmentLength,
  getRootSubjectCodeLength,
  getSubjectCodeLevelByLength,
  getSubjectCodeRule,
  type SubjectCodeRule,
} from '#/api/erp/finance/settings/project/subject-code-rule';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  countVoucherDetailsByAccountCode,
  createSubject,
  getAllSubjectList,
  getSubject,
  getSubjectByNumber,
  getSubjectTypeOptions,
  moveVoucherDetailsToSubject,
  updateSubject,
} from '#/api/erp/finance/settings/project';
import { getSubjectAuxiliaryOptions } from '#/api/erp/finance/settings/auxiliary';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  AUXILIARY_OPTIONS,
  type AuxiliaryOption,
  getBalanceDirectionBySubjectType,
  SUBJECT_TYPE_TABS,
  useFormSchema,
} from '#/views/finance/settings/project/data';

import { ElMessage, ElMessageBox } from 'element-plus';

const emit = defineEmits(['success']);

type SubjectOption = {
  label: string;
  value: string;
  subject_name?: string;
  subject_number?: string;
  subject_type?: string;
  balance_direction?: number | string;
};

const SELECT_POPPER_CLASS = 'finance-subject-select-popper';
const SELECT_POPPER_Z_INDEX = 10050;
const SUBJECT_CONFIRM_MODAL_CLASS = 'finance-subject-confirm-box';
const SUBJECT_CONFIRM_OVERLAY_CLASS = 'finance-subject-confirm-overlay';
const SUBJECT_CONFIRM_Z_INDEX = 12000;

const formType = ref<'create' | 'detail' | 'edit'>('create');
const formData = ref<Partial<BilSubjectApi.Subject>>({
  lingma_sys_is_delete: 0,
  subject_state: 1,
  is_leaf_subject: 1,
});
const parentAuxDisabled = ref(false);
const parentAuxValue = ref<any[]>([]);
const parentSubjectOptions = ref<SubjectOption[]>([]);
const subjectTypeOptions = ref<BilSubjectApi.OptionItem[]>([]);
const loadingParentOptions = ref(false);
const loadingSubjectTypeOptions = ref(false);
const auxiliaryOptions = ref<AuxiliaryOption[]>([...AUXILIARY_OPTIONS]);
const currentSubjectCodeRule = ref<SubjectCodeRule>({
  account_set_id: '',
  subject_level: DEFAULT_SUBJECT_CODE_RULE.length,
  segment_rule: [...DEFAULT_SUBJECT_CODE_RULE],
});

const { hasFieldPermission } = useDataTablePermission();
const fieldChecker = computed(() => hasFieldPermission(formData.value));

const normalizeAuxValue = (value: any) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
  }
  return [];
};

function getAddedAuxiliaryValues(previous: unknown, next: unknown) {
  const previousSet = new Set(normalizeAuxValue(previous));
  return normalizeAuxValue(next).filter((item) => !previousSet.has(item));
}

function getAuxiliaryLabel(value: string) {
  return (
    auxiliaryOptions.value.find((item) => String(item.value) === String(value))?.label ||
    value
  );
}

async function loadAuxiliaryOptions() {
  try {
    const options = await getSubjectAuxiliaryOptions();
    auxiliaryOptions.value = options.length > 0 ? options : [...AUXILIARY_OPTIONS];
  } catch {
    auxiliaryOptions.value = [...AUXILIARY_OPTIONS];
  }
}

async function confirmAddAuxiliaryForUsedSubject(values: any) {
  if (formType.value !== 'edit') return;

  const addedValues = getAddedAuxiliaryValues(
    formData.value?.auxiliary_accounting,
    values?.auxiliary_accounting,
  );
  if (addedValues.length === 0) return;

  const subjectNumber = normalizeSubjectNumber(
    formData.value?.subject_number || values?.subject_number,
  );
  if (!subjectNumber) return;

  const voucherCount = await countVoucherDetailsByAccountCode(subjectNumber);
  if (voucherCount <= 0) return;

  const subjectName = String(formData.value?.subject_name || values?.subject_name || '').trim();
  const addedText = addedValues.map(getAuxiliaryLabel).join('、');
  await ElMessageBox.confirm(
    `科目${subjectNumber}${subjectName ? ` ${subjectName}` : ''}已存在 ${voucherCount} 条账目。继续设置辅助核算【${addedText}】后，历史账目不会自动补充对应辅助项，是否继续？`,
    '设置辅助核算提示',
    {
      type: 'warning',
      confirmButtonText: '继续设置',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    },
  );
}

function normalizeSubjectType(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeSubjectNumber(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeBalanceDirection(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (String(value) === '借' || String(value).toLowerCase() === 'debit') return 1;
  if (String(value) === '贷' || String(value).toLowerCase() === 'credit') return 2;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function getNextSegmentLength(parentNumber: string) {
  return getNextSubjectCodeSegmentLength(parentNumber, currentSubjectCodeRule.value);
}

function getRootCodeLength() {
  return getRootSubjectCodeLength(currentSubjectCodeRule.value);
}

function getCurrentRuleText() {
  return formatSubjectCodeRule(currentSubjectCodeRule.value);
}

function applyBalanceDirection(direction?: number | string) {
  const normalized = normalizeBalanceDirection(direction);
  if (normalized === undefined) return;
  formData.value.balance_direction = normalized;
  formApi.setFieldValue('balance_direction', normalized);
}

function resolveAutoBalanceDirection(subjectType?: unknown) {
  return getBalanceDirectionBySubjectType(subjectType ?? formData.value?.subject_type);
}

function syncAutoBalanceDirectionByType(subjectType?: unknown) {
  const direction = resolveAutoBalanceDirection(subjectType);
  applyBalanceDirection(direction);
}

function getAllowedRootPrefixByFormData() {
  const rawType = normalizeSubjectType(formData.value?.subject_type);
  return /^[1-5]$/.test(rawType) ? rawType : '';
}

function getDirectChildNumbers(parentNumber: string) {
  const normalizedParent = normalizeSubjectNumber(parentNumber);
  if (!normalizedParent) return [] as string[];

  const nextSegmentLength = getNextSegmentLength(normalizedParent);
  if (!nextSegmentLength) return [] as string[];

  const targetLength = normalizedParent.length + nextSegmentLength;
  return parentSubjectOptions.value
    .map((item) => normalizeSubjectNumber(item.subject_number || item.value || ''))
    .filter(
      (code) =>
        code.startsWith(normalizedParent) &&
        code.length === targetLength &&
        /^\d+$/.test(code),
    );
}

function hasExistingDirectChildren(parentNumber: string) {
  return getDirectChildNumbers(parentNumber).length > 0;
}

function buildNextChildSubjectNumber(parentNumber: string) {
  const normalizedParent = normalizeSubjectNumber(parentNumber);
  if (!normalizedParent || !/^\d+$/.test(normalizedParent)) return '';

  const nextSegmentLength = getNextSegmentLength(normalizedParent);
  if (!nextSegmentLength) return '';

  const suffixNumbers = getDirectChildNumbers(normalizedParent)
    .map((code) => Number(code.slice(-nextSegmentLength)))
    .filter((num) => Number.isInteger(num) && num >= 0);

  const nextSuffix = suffixNumbers.length > 0 ? Math.max(...suffixNumbers) + 1 : 1;
  const maxSuffix = Number('9'.repeat(nextSegmentLength));
  if (nextSuffix > maxSuffix) return '';

  return `${normalizedParent}${String(nextSuffix).padStart(nextSegmentLength, '0')}`;
}

function fillSubjectNumberByParent(parentNumber?: string) {
  if (formType.value !== 'create') return;
  const normalizedParent = normalizeSubjectNumber(parentNumber);
  if (!normalizedParent) {
    formData.value.subject_number = '';
    formApi.setFieldValue('subject_number', '');
    return;
  }

  const nextNumber = buildNextChildSubjectNumber(normalizedParent);
  formData.value.subject_number = nextNumber;
  formApi.setFieldValue('subject_number', nextNumber);
}

function assertSubjectNumberRule(value: unknown) {
  const subjectNumber = normalizeSubjectNumber(value);
  if (!subjectNumber) {
    throw new Error('请输入科目编号');
  }

  if (!/^\d+$/.test(subjectNumber)) {
    throw new Error('科目编号只能输入数字');
  }

  const parentNumber = normalizeSubjectNumber(formData.value?.parent_subject_number);
  if (parentNumber) {
    const nextSegmentLength = getNextSegmentLength(parentNumber);
    if (!nextSegmentLength) {
      throw new Error(`当前科目已达到 ${getCurrentRuleText()} 规则的末级，不能继续新增下级`);
    }

    if (!subjectNumber.startsWith(parentNumber)) {
      throw new Error(`子科目编号必须以父科目编号 ${parentNumber} 开头`);
    }

    if (subjectNumber.length !== parentNumber.length + nextSegmentLength) {
      throw new Error(
        `子科目编号必须在父科目编号后追加 ${nextSegmentLength} 位数字`,
      );
    }
    return;
  }

  const allowedPrefix = getAllowedRootPrefixByFormData();
  if (!allowedPrefix) {
    throw new Error('请先选择科目类别');
  }

  if (subjectNumber.length !== getRootCodeLength()) {
    throw new Error(`顶级科目编号必须是 ${getRootCodeLength()} 位数字`);
  }

  if (!subjectNumber.startsWith(allowedPrefix)) {
    const tabLabel =
      SUBJECT_TYPE_TABS.find((item) => String(item.value) === allowedPrefix)?.label ||
      allowedPrefix;
    throw new Error(`顶级科目编号必须归属 ${tabLabel}，并以 ${allowedPrefix} 开头`);
  }
}

async function confirmMoveParentVouchers(values: any) {
  if (formType.value !== 'create') return false;
  const parentNumber = normalizeSubjectNumber(values?.parent_subject_number);
  if (!parentNumber) return false;

  // 仅在当前父科目还没有直接子级时，第一次新增子级才提醒并按需要转移凭证
  if (hasExistingDirectChildren(parentNumber)) return false;

  const voucherCount = await countVoucherDetailsByAccountCode(parentNumber);
  const hasVouchers = voucherCount > 0;

  if (!hasVouchers) {
    return false;
  }

  await ElMessageBox.confirm(
    '亲，上级科目已存凭证，保存后新增科目将替替代凭证中的上级科目，您要继续吗？',
    '提示',
    {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
      customClass: SUBJECT_CONFIRM_MODAL_CLASS,
      modalClass: SUBJECT_CONFIRM_OVERLAY_CLASS,
      zIndex: SUBJECT_CONFIRM_Z_INDEX,
    },
  );
  return true;
}

async function loadSubjectTypeOptions() {
  loadingSubjectTypeOptions.value = true;
  try {
    const list = await getSubjectTypeOptions();
    const labelMap = Object.fromEntries(
      SUBJECT_TYPE_TABS.map((item) => [String(item.value), item.label]),
    );
    subjectTypeOptions.value = Array.isArray(list)
      ? list.map((item) => ({
          label:
            labelMap[String(item.value ?? '')] ||
            String(item.label ?? ''),
          value: String(item.value ?? ''),
        }))
      : SUBJECT_TYPE_TABS.map((item) => ({
          label: item.label,
          value: String(item.value),
        }));
  } catch (error: any) {
    subjectTypeOptions.value = SUBJECT_TYPE_TABS.map((item) => ({
      label: item.label,
      value: String(item.value),
    }));
    ElMessage.error(error?.message || '加载科目类别失败');
  } finally {
    loadingSubjectTypeOptions.value = false;
  }
}

async function loadParentSubjectOptions(currentRowId?: string) {
  loadingParentOptions.value = true;
  try {
    const res = await getAllSubjectList({
      pageNo: 1,
      page: 0,
    });

    const list = Array.isArray(res?.list) ? res.list : [];
    parentSubjectOptions.value = list
      .filter((item: any) => String(item?.rowid || '') !== String(currentRowId || ''))
      .map((item: any) => ({
        label: `${item.subject_number || ''} ${item.subject_name || ''}`.trim(),
        value: String(item.subject_number || '').trim(),
        subject_name: item.subject_name,
        subject_number: item.subject_number,
        subject_type: String(item.subject_type ?? '').trim(),
        balance_direction: item.balance_direction,
      }))
      .filter((item: SubjectOption) => item.value);
  } catch (error: any) {
    parentSubjectOptions.value = [];
    ElMessage.error(error?.message || '加载上级科目失败');
  } finally {
    loadingParentOptions.value = false;
  }
}

async function syncParentSubjectMeta(parentSubjectNumber?: string) {
  const parentNumber = normalizeSubjectNumber(parentSubjectNumber);

  if (!parentNumber) {
    (formData.value as any).parent_subject_number = '';
    (formData.value as any).parent_subject_name = '';
    formApi.setFieldValue('parent_subject_number', '');
    formApi.setFieldValue('parent_subject_name', '');
    fillSubjectNumberByParent('');
    syncAutoBalanceDirectionByType(formData.value?.subject_type);
    return;
  }

  const selected = parentSubjectOptions.value.find(
    (item) => String(item.value) === parentNumber,
  );

  try {
    const remoteParent = await getSubjectByNumber(parentNumber);
    const subjectName = remoteParent?.subject_name || selected?.subject_name || '';
    const subjectType = String(
      remoteParent?.subject_type ?? selected?.subject_type ?? '',
    ).trim();
    const balanceDirection =
      normalizeBalanceDirection(
        remoteParent?.balance_direction ?? selected?.balance_direction,
      ) ?? resolveAutoBalanceDirection(subjectType);

    (formData.value as any).parent_subject_number = parentNumber;
    (formData.value as any).parent_subject_name = subjectName;
    formData.value.subject_type = subjectType || formData.value.subject_type;

    formApi.setFieldValue('parent_subject_number', parentNumber);
    formApi.setFieldValue('parent_subject_name', subjectName);
    if (subjectType) {
      formApi.setFieldValue('subject_type', subjectType);
    }
    applyBalanceDirection(balanceDirection);
    fillSubjectNumberByParent(parentNumber);
  } catch (error: any) {
    ElMessage.error(error?.message || '获取上级科目失败');
  }
}

const buildSchema = () => {
  const lockSubjectType = !!String(formData.value?.parent_subject_number ?? '').trim();

  return useFormSchema(formType.value, formData.value, auxiliaryOptions.value).map((item) => {
    const nextItem: any = { ...item };

    if (!nextItem.componentProps) return nextItem;

    const baseDisabled =
      (nextItem.componentProps as any).disabled ||
      fieldChecker.value('fd:edit', nextItem.fieldName, formType.value) ||
      (nextItem.fieldName === 'subject_type' && lockSubjectType);

    let finalDisabled =
      nextItem.fieldName === 'auxiliary_accounting'
        ? baseDisabled || parentAuxDisabled.value
        : baseDisabled;

    if (nextItem.fieldName === 'balance_direction' && formType.value !== 'detail') {
      finalDisabled = false;
    }

    let extraProps: Record<string, any> = {};

    if (nextItem.fieldName === 'subject_number') {
      extraProps = {
        placeholder: formData.value?.parent_subject_number
          ? `选择上级科目后按 ${getCurrentRuleText()} 规则自动带入，可按规则调整`
          : '请输入科目编号（顶级 4 位，以 1/2/3/4/5 开头）',
      };
    }

    if (
      nextItem.fieldName === 'parent_subject_number' ||
      nextItem.fieldName === 'subject_type'
    ) {
      extraProps = {
        ...extraProps,
        teleported: true,
        appendTo: 'body',
        popperClass: SELECT_POPPER_CLASS,
        popperStyle: { zIndex: SELECT_POPPER_Z_INDEX },
        fitInputWidth: true,
      };
    }

    if (nextItem.fieldName === 'parent_subject_number') {
      extraProps = {
        ...extraProps,
        options: parentSubjectOptions.value,
        loading: loadingParentOptions.value,
        onChange: async (value: string) => {
          await syncParentSubjectMeta(value);
        },
      };
    }

    if (nextItem.fieldName === 'subject_type') {
      extraProps = {
        ...extraProps,
        options: subjectTypeOptions.value,
        loading: loadingSubjectTypeOptions.value,
        onChange: (value: string) => {
          formData.value.subject_type = normalizeSubjectType(value);
          syncAutoBalanceDirectionByType(value);
        },
      };
    }

    return {
      ...nextItem,
      componentProps: {
        ...(nextItem.componentProps as any),
        ...extraProps,
        disabled: finalDisabled,
      },
    };
  });
};

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-2',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

watch(
  [
    formType,
    formData,
    parentAuxDisabled,
    parentSubjectOptions,
    loadingParentOptions,
    subjectTypeOptions,
    loadingSubjectTypeOptions,
    auxiliaryOptions,
    currentSubjectCodeRule,
  ],
  () => {
    formApi.updateSchema(buildSchema());
  },
  { deep: true },
);

async function reloadAndShowNumber(rowid: string) {
  const res = await getSubject(rowid);
  if (res?.subject_number) {
    formData.value = { ...(formData.value || {}), ...(res || {}) } as any;
    formApi.setFieldValue('subject_number', res.subject_number);
    formApi.setFieldValue('rowid', rowid);
  }
}

const [Modal, modalApi] = useVbenModal({
  zIndex: 2100,
  async onConfirm() {
    if (formType.value === 'detail') {
      await modalApi.close();
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) return;
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      assertSubjectNumberRule((values as any)?.subject_number);
      const submitValues: any = {
        ...(values as any),
        balance_direction:
          normalizeBalanceDirection(formData.value?.balance_direction) ??
          resolveAutoBalanceDirection((values as any)?.subject_type),
      };
      if (!submitValues.balance_direction) {
        throw new Error('未能自动确定余额方向');
      }

      const needMoveParentVouchers = await confirmMoveParentVouchers(submitValues);

      if (formType.value === 'create') {
        const createRes: any = await createSubject(submitValues as any);
        const createdRowId = String(
          createRes?.rowid || (submitValues as any)?.rowid || (formData.value as any)?.rowid || '',
        ).trim();
        if (createdRowId) {
          await reloadAndShowNumber(createdRowId);
        }

        if (needMoveParentVouchers) {
          const moveRes = await moveVoucherDetailsToSubject({
            sourceAccountCode: String((submitValues as any)?.parent_subject_number || '').trim(),
            targetAccountCode: String((submitValues as any)?.subject_number || '').trim(),
            targetAccountName: String((submitValues as any)?.subject_name || '').trim(),
          });
          ElMessage.success(
            moveRes?.movedCount > 0
              ? `保存成功，已转移 ${moveRes.movedCount} 条凭证明细到新子级科目`
              : '保存成功',
          );
        } else {
          ElMessage.success('保存成功');
        }
      } else if (formType.value === 'edit') {
        await confirmAddAuxiliaryForUsedSubject(submitValues);
        await updateSubject(submitValues as any);
        ElMessage.success('保存成功');
      }
      emit('success');
      await modalApi.close();
    } catch (error: any) {
      if (error === 'cancel' || error === 'close') {
        return;
      }
      ElMessage.error(error?.message || '保存失败');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = {
        lingma_sys_is_delete: 0,
        subject_state: 1,
        is_leaf_subject: 1,
      };
      parentAuxDisabled.value = false;
      parentAuxValue.value = [];
      parentSubjectOptions.value = [];
      subjectTypeOptions.value = [];
      return;
    }

    const data = modalApi.getData<{
      type: 'create' | 'detail' | 'edit';
      rowid?: string;
      subject_type?: number | string;
      parent_subject_number?: string;
      parent_subject_name?: string;
      parent_aux_disabled?: boolean;
      parent_auxiliary_accounting?: any;
      parent_subject_state?: number;
    }>();

    formType.value = data?.type ?? 'create';
    parentAuxDisabled.value = Boolean(
      data?.parent_aux_disabled || data?.parent_subject_state === 0,
    );

    if (data?.parent_auxiliary_accounting) {
      parentAuxValue.value = normalizeAuxValue(data.parent_auxiliary_accounting);
    } else {
      parentAuxValue.value = [];
    }

    currentSubjectCodeRule.value = await getSubjectCodeRule(data?.subject_type);

    await Promise.all([
      loadAuxiliaryOptions(),
      loadSubjectTypeOptions(),
      loadParentSubjectOptions(String(data?.rowid || '').trim()),
    ]);

    if (data?.subject_type !== undefined) {
      formData.value.subject_type = normalizeSubjectType(data.subject_type);
      formApi.setFieldValue('subject_type', normalizeSubjectType(data.subject_type));
      syncAutoBalanceDirectionByType(data.subject_type);
    }

    if (data?.parent_subject_number) {
      formData.value.parent_subject_number = data.parent_subject_number;
      formApi.setFieldValue('parent_subject_number', data.parent_subject_number);
    }
    if (data?.parent_subject_name) {
      (formData.value as any).parent_subject_name = data.parent_subject_name;
      formApi.setFieldValue('parent_subject_name', data.parent_subject_name);
    }

    if (data?.rowid) {
      modalApi.lock();
      try {
        const res = await getSubject(data.rowid);
        const aux = normalizeAuxValue((res as any)?.auxiliary_accounting);
        formData.value = {
          ...(res || {}),
          subject_type: normalizeSubjectType((res as any)?.subject_type),
          auxiliary_accounting: aux,
        } as any;
        await Promise.all([
          loadSubjectTypeOptions(),
          loadParentSubjectOptions(String((res as any)?.rowid || data.rowid || '').trim()),
        ]);
        await formApi.setValues(formData.value as any, false);
        if ((res as any)?.parent_subject_number) {
          await syncParentSubjectMeta((res as any)?.parent_subject_number);
        } else {
          syncAutoBalanceDirectionByType((res as any)?.subject_type);
        }
      } catch (error: any) {
        ElMessage.error(error?.message || '加载失败');
      } finally {
        modalApi.unlock();
      }
      return;
    }

    if (formType.value === 'create' && !parentAuxDisabled.value) {
      (formData.value as any).auxiliary_accounting = parentAuxValue.value;
    }

    (formData.value as any).subject_number = '';

    await formApi.setValues(formData.value as any, false);
    await syncParentSubjectMeta(data?.parent_subject_number);
    if (!data?.parent_subject_number) {
      syncAutoBalanceDirectionByType(formData.value?.subject_type);
    }
  },
});
</script>

<template>
  <Modal
    :title="
      formType === 'create'
        ? '新增科目'
        : formType === 'edit'
          ? '编辑科目'
          : '科目详情'
    "
    :show-confirm-button="formType !== 'detail'"
  >
    <Form class="mx-4" />
  </Modal>
</template>

<style scoped>
:deep(.finance-subject-select-popper) {
  z-index: 10050 !important;
}

:global(.finance-subject-confirm-overlay) {
  z-index: 11999 !important;
}

:global(.finance-subject-confirm-box) {
  z-index: 12000 !important;
}
</style>
