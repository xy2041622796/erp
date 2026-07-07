<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { Department, Staff } from '#/api/common/staff-selector';
import type { ErpCollectionSubmitApi } from '#/api/erp/finance/revenue/submit';

import { computed, ref, watch } from 'vue';

import { moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDepartmentList } from '#/api/common/staff-selector';
import {
  getIncomeSettlementPage,
  updateIncomeSettlementStatus,
} from '#/api/erp/finance/revenue/settlement';
import {
  getSettlementProject,
  getSettlementProjectPage,
} from '#/api/erp/finance/revenue/settlement/project';
import {
  createCollectionSubmit,
  getCollectionSubmit,
  updateCollectionSubmit,
} from '#/api/erp/finance/revenue/submit';
import {
  getSubmitWriteOffList,
  saveSubmitWriteOffs,
} from '#/api/erp/finance/revenue/writeoff';
import CustomerPicker from '#/components/customer-selector/CustomerPicker.vue';
import ProjectPicker from '#/components/project-selector/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import { formatDateOnly } from '#/utils/date';

import { useFormSchema, useSelectedSettlementColumns } from '#/views/finance/revenue/submit/data';
import SettlementSelect from '#/views/finance/revenue/submit/modules/settlement-select.vue';

import { ElButton, ElInput, ElInputNumber, ElMessage } from 'element-plus';

type Mode = 'create' | 'detail' | 'edit';

const emit = defineEmits<{ (e: 'success'): void }>();

const userStore = useUserStore();

const formType = ref<Mode>('create');
const formData = ref<ErpCollectionSubmitApi.CollectionSubmit>({
  rowid: undefined,
  ReportID: undefined,
  description: undefined,
  income_type: '业务收款',
  status: 0,
  project_id: undefined,
  contract_id: undefined,
  customer_id: undefined,
  remark: undefined,
  collection_account: undefined,
  payer_bank: undefined,
  payer_account: undefined,
  // 这里存储人员ID（列表/详情展示时再映射为名称）
  user_name:
    (userStore.userInfo as any)?.id ?? (userStore.userInfo as any)?.ROWID ?? '',
  collection_amount: 0,
  collection_date: Date.now().toString(),
  // 这里存储部门ID（列表/详情展示时再映射为名称）
  depart_name: (userStore.userInfo as any)?.deptId ?? '',
});

const deptList = ref<Department[]>([]);
const deptNameMap = computed(() => {
  const map = new Map<string, string>();
  for (const d of deptList.value)
    map.set(String(d.DepID), String(d.DepName ?? d.DepID));
  return map;
});

async function ensureDeptListLoaded() {
  if (deptList.value.length > 0) return;
  try {
    deptList.value = await getDepartmentList();
  } catch (error) {
    console.error('load departments failed', error);
  }
}

function getDeptName(id: any) {
  const key = String(id ?? '').trim();
  if (!key) return '';
  return deptNameMap.value.get(key) || key;
}

const staffId = ref<string | undefined>(
  String(formData.value.user_name ?? '') || undefined,
);
const deptId = ref<string | undefined>(
  String(formData.value.depart_name ?? '') || undefined,
);

const customerId = ref<string | undefined>(
  String(formData.value.customer_id ?? '') || undefined,
);
const projectId = ref<string | undefined>(
  String(formData.value.project_id ?? '') || undefined,
);

function handleCustomerIdChange(v?: string) {
  customerId.value = v;
  formData.value.customer_id = v as any;
  // 客户变更时，项目/合同通常需要重选
  projectId.value = undefined;
  formData.value.project_id = undefined;
  formApi.setValues({ customer_id: v, project_id: undefined }, false);
}

function handleProjectIdChange(v?: string) {
  projectId.value = v;
  formData.value.project_id = v as any;
  formApi.setValues({ project_id: v }, false);
}

function handleStaffIdChange(v?: string) {
  staffId.value = v;
  // 清空时同时清部门
  if (!v) {
    handleStaffPicked(undefined);
    return;
  }
  // 仅更新人员ID；部门由 handleStaffPicked 统一回填
  formData.value.user_name = v as any;
  formApi.setValues({ user_name: v }, false);
}

function handleStaffPicked(staff?: Staff) {
  if (!staff) {
    staffId.value = undefined;
    deptId.value = undefined;
    formData.value.user_name = '' as any;
    formData.value.depart_name = '' as any;
    formApi.setValues({ user_name: undefined, depart_name: undefined }, false);
    return;
  }

  staffId.value = staff.ROWID;
  deptId.value = staff.DepID;

  // 按需求：存ID
  formData.value.user_name = staff.ROWID as any;
  formData.value.depart_name = (staff.DepID ?? '') as any;

  // 同步到表单值（用于页面展示 & 其它逻辑）
  formApi.setValues(
    { user_name: staff.ROWID, depart_name: staff.DepID },
    false,
  );
}

const selectedSettlements = ref<any[]>([]);

function safeJsonParse(text: any) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildDescriptionSummary() {
  const count = selectedSettlements.value.length;
  if (count <= 0) return undefined;
  return `关联${count}条业务单据`;
}

const totalApplyAmount = computed(() =>
  moneyNumber(sumByMoney(selectedSettlements.value, (row) => row?.apply_amount)),
);


const title = computed(() => {
  if (formType.value === 'detail')
    return `收款提报详情-${formData.value.income_type || ''}`;
  if (formType.value === 'edit')
    return `编辑收款提报-${formData.value.income_type || ''}`;
  return `新增收款提报-${formData.value.income_type || ''}`;
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 120,
  },
  wrapperClass: 'grid grid-cols-2 gap-x-6 gap-y-4',
  layout: 'vertical',
  schema: useFormSchema(formType.value),
  showDefaultActions: false,

  handleValuesChange(values, fieldsChanged) {
    if (fieldsChanged?.includes('customer_id')) {
      const v = (values as any)?.customer_id;
      customerId.value = v ? String(v) : undefined;
      formData.value.customer_id = v;
    }

    if (fieldsChanged?.includes('project_id')) {
      const v = (values as any)?.project_id;
      projectId.value = v ? String(v) : undefined;
      formData.value.project_id = v;
    }
  },
});

function syncTotalToForm() {
  formApi.setValues({ collection_amount: totalApplyAmount.value }, false);
}

function syncFromSelectedToMain() {
  // 规则：如果选中的结算单只涉及一个项目/客户/合同，则自动回填
  const projectIds = [
    ...new Set(
      selectedSettlements.value
        .map((x) => x?.project_id)
        .filter((v) => v === 0 || v),
    ),
  ];
  const customerIds = [
    ...new Set(
      selectedSettlements.value
        .map((x) => x?.customer_id)
        .filter((v) => v === 0 || v),
    ),
  ];
  const contractIds = [
    ...new Set(
      selectedSettlements.value
        .map((x) => x?.contract_id)
        .filter((v) => v === 0 || v),
    ),
  ];

  if (projectIds.length === 1) {
    const v = projectIds[0];
    projectId.value = v ? String(v) : undefined;
    formApi.setValues({ project_id: v }, false);
  }
  if (customerIds.length === 1)
    formApi.setValues({ customer_id: customerIds[0] }, false);
  if (contractIds.length === 1)
    formApi.setValues({ contract_id: contractIds[0] }, false);

  if (selectedSettlements.value.length === 0) {
    projectId.value = undefined;
    formApi.setValues(
      { project_id: undefined, customer_id: undefined, contract_id: undefined },
      false,
    );
  }
}

const [SelectedGrid, selectedGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useSelectedSettlementColumns(formType.value === 'detail'),
    height: 260,
    keepSource: true,
    data: selectedSettlements.value,
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: {
      refresh: false,
      search: false,
      tools: [
        {
          code: 'select-settlement',
          name: '选择单据',
          icon: 'vxe-icon-plus',
        },
        {
          code: 'clear-settlement',
          name: '清除',
          icon: 'vxe-icon-delete',
        },
      ],
    },
  } as VxeTableGridOptions,
  gridEvents: {
    toolbarToolClick: ({ code }: any) => {
      if (formType.value === 'detail') return;
      if (code === 'select-settlement') openSettlementSelect();
      if (code === 'clear-settlement') clearSelected();
    },
  },
});

function syncSelectedGridData() {
  selectedGridApi.setState({
    gridOptions: {
      data: selectedSettlements.value,
      columns: useSelectedSettlementColumns(formType.value === 'detail'),
    },
  });
}

watch(
  () => selectedSettlements.value,
  () => {
    syncSelectedGridData();
  },
  { immediate: true },
);

function removeSelected(row: any) {
  selectedSettlements.value = selectedSettlements.value.filter(
    (x) => x.rowid !== row.rowid,
  );
  syncSelectedGridData();
  syncTotalToForm();
  syncFromSelectedToMain();
}

function clearSelected() {
  selectedSettlements.value = [];
  syncSelectedGridData();
  syncTotalToForm();
  syncFromSelectedToMain();
}

const settlementSelectOpen = ref(false);
function openSettlementSelect() {
  if (formType.value === 'detail') return;
  settlementSelectOpen.value = true;
}

function handleSettlementSelectConfirm(rows: any[]) {
  const map = new Map<string, any>();
  for (const x of selectedSettlements.value) map.set(String(x.rowid), x);

  for (const r of rows) {
    const key = String(r.rowid);
    const prev = map.get(key);
    map.set(key, {
      ...r,
      apply_amount:
        prev?.apply_amount ??
        moneyNumber(r.receive_balance ?? r.total_amount),
    });
  }

  selectedSettlements.value = [...map.values()];
  syncSelectedGridData();
  syncTotalToForm();
  syncFromSelectedToMain();
}

function handleApplyAmountChange(row: any, value: any) {
  const nextValue = moneyNumber(value);
  selectedSettlements.value = selectedSettlements.value.map((item) =>
    String(item?.rowid) === String(row?.rowid)
      ? { ...item, apply_amount: nextValue }
      : item,
  );
  syncSelectedGridData();
  syncTotalToForm();
}

async function syncSettlementStatusAfterSubmitCreated() {
  const settlementIds = Array.from(
    new Set(
      selectedSettlements.value
        .map((x) => String(x?.rowid || '').trim())
        .filter(Boolean),
    ),
  );

  if (settlementIds.length === 0) return;

  await Promise.all(
    settlementIds.map((id) => updateIncomeSettlementStatus(id, 25)),
  );
}

async function saveWithStatus(status: number, flowstate?: number) {
  const { valid } = await formApi.validate();
  if (!valid) return;

  // 子表核销金额校验
  for (let i = 0; i < selectedSettlements.value.length; i++) {
    const row = selectedSettlements.value[i];
    const apply = moneyNumber(row?.apply_amount);
    if (apply <= 0) {
      ElMessage.warning(`第 ${i + 1} 行：本次核销必须大于 0`);
      return;
    }
    const max = moneyNumber(row?.receive_balance ?? row?.total_amount);
    if (Number.isFinite(max) && apply > max) {
      ElMessage.warning(`第 ${i + 1} 行：本次核销不能大于可申请金额`);
      return;
    }
  }

  const values =
    (await formApi.getValues()) as ErpCollectionSubmitApi.CollectionSubmit;

  if (values.collection_date) {
    const ts = Number(values.collection_date);
    const date = Number.isNaN(ts)
      ? new Date(values.collection_date as any)
      : new Date(ts);
    values.collection_date = formatDateTime(date);
  }

  values.status = status;
  if (flowstate !== undefined) values.flowstate = flowstate;
  values.income_type = formData.value.income_type;
  values.user_name = formData.value.user_name;
  values.depart_name = formData.value.depart_name;
  values.collection_amount = totalApplyAmount.value;

  // description 仅保留纯文本摘要；核销明细正式存储在 Bil_Submit_WriteOff
  values.description = buildDescriptionSummary();

  modalApi.lock();
  try {
    const res = await (formType.value === 'create'
      ? createCollectionSubmit(values)
      : updateCollectionSubmit(values));
    const submitId =
      formType.value === 'create' ? (res as any).rowid : values.rowid;

    if (submitId) {
      await saveSubmitWriteOffs(
        submitId,
        0,
        selectedSettlements.value.map((x) => ({
          rowid: x.rowid,
          apply_amount: x.apply_amount,
        })),
      );


      if (formType.value === 'create') {
        await syncSettlementStatusAfterSubmitCreated();
      }
    }

    await modalApi.close();
    emit('success');
    ElMessage.success('保存成功');
  } finally {
    modalApi.unlock();
  }
}

function handleCancel() {
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      selectedSettlements.value = [];
      return;
    }

    await ensureDeptListLoaded();

    const data = modalApi.getData<{
      income_type?: string;
      rowid?: string;
      type: Mode;
      presetValues?: Partial<ErpCollectionSubmitApi.CollectionSubmit> & { contract_id?: string };
      presetSettlements?: any[];
    }>();
    formType.value = (data?.type ?? 'create') as Mode;
    formApi.setDisabled(formType.value === 'detail');

    formData.value.income_type =
      data?.income_type || formData.value.income_type || '业务收款';

    // schema 依赖 mode
    formApi.updateSchema(useFormSchema(formType.value));

    if (!data?.rowid) {
      const presetValues = (data?.presetValues || {}) as any;
      formData.value = {
        ...formData.value,
        rowid: undefined,
        ReportID: undefined,
        status: 0,
        collection_date: Date.now().toString(),
        ...presetValues,
      };

      staffId.value = String(formData.value.user_name ?? '') || undefined;
      deptId.value = String(formData.value.depart_name ?? '') || undefined;
      customerId.value = String(formData.value.customer_id ?? '') || undefined;
      projectId.value = String(formData.value.project_id ?? '') || undefined;

      await formApi.setValues(formData.value as any, false);
      selectedSettlements.value = Array.isArray(data?.presetSettlements)
        ? data.presetSettlements.map((item: any) => ({
            ...item,
            apply_amount:
              item?.apply_amount ??
              moneyNumber(item?.receive_balance ?? item?.total_amount),
          }))
        : [];
      syncSelectedGridData();
      syncTotalToForm();
      syncFromSelectedToMain();
      return;
    }

    modalApi.lock();
    try {
      const detail: any = await getCollectionSubmit(data.rowid);
      formData.value = {
        ...detail,
        income_type: detail?.income_type ?? formData.value.income_type,
        user_name:
          detail?.user_name ??
          detail?.createuser ??
          (userStore.userInfo as any)?.id ??
          '',
        depart_name:
          detail?.depart_name ?? (userStore.userInfo as any)?.deptId ?? '',
        collection_date: (detail?.collection_date ?? Date.now()).toString(),
        collection_amount: Number(detail?.collection_amount ?? 0),
      };

      // 兼容旧数据：备注可能存在 description（且不是结构化 JSON）
      if (
        (formData.value as any)?.remark === undefined ||
        (formData.value as any)?.remark === null ||
        String((formData.value as any)?.remark).trim() === ''
      ) {
        const initRemark = String((detail as any)?.init_remark ?? '').trim();
        if (initRemark) {
          (formData.value as any).remark = initRemark;
        } else {
          const desc = String((detail as any)?.description ?? '').trim();
          const parsed = safeJsonParse((detail as any)?.description);
          if (desc && parsed === null) (formData.value as any).remark = desc;
        }
      }

      staffId.value = String(formData.value.user_name ?? '') || undefined;
      deptId.value = String(formData.value.depart_name ?? '') || undefined;
      customerId.value = String(formData.value.customer_id ?? '') || undefined;
      projectId.value = String(formData.value.project_id ?? '') || undefined;

      await formApi.setValues(formData.value, false);

      const parsed = safeJsonParse(detail?.description);
      const historyItems = (
        Array.isArray(parsed?.items) ? parsed?.items : []
      ) as any[];

      // 1. 查询核销关联表
      const writeOffs = await getSubmitWriteOffList({
        submit_id: data.rowid,
        write_off_type: 0,
      });
      const settlementIds = writeOffs
        .map((w) => w.settlement_id)
        .filter(Boolean) as string[];

      let linkedItems: any[] = [];
      if (settlementIds.length > 0) {
        // 2. 根据关联ID查询结算单详情
        const linkedRes = await getIncomeSettlementPage({
          rowids: settlementIds,
          pageNo: 1,
          page: 1000,
        } as any);
        linkedItems = (linkedRes?.list || []) as any[];
      }

      if (linkedItems.length > 0) {
        // 正式数据来源：Bil_Submit_WriteOff + Bil_Income_Settlement
        // description.items 仅作为历史兼容兜底，不再作为新数据主来源
        // 有关联数据，以库里查出来的为准，合并核销金额(从 WriteOff 表取金额)
        const applyAmountMap = new Map<string, number>();
        writeOffs.forEach((w) => {
          if (w.settlement_id) {
            applyAmountMap.set(
              w.settlement_id,
              moneyNumber(w.write_off_amount),
            );
          }
        });

        selectedSettlements.value = linkedItems.map((item: any) => ({
          ...item,
          apply_amount: applyAmountMap.get(item.rowid) ?? 0,
        }));
      } else {
        // 没有查到关联数据，回退到使用历史保存的数据（兼容旧数据）
        selectedSettlements.value = historyItems;
      }

      syncSelectedGridData();
      syncTotalToForm();
      syncFromSelectedToMain();
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-4/5" :show-confirm-button="false">
    <Form class="mx-3">
      <template #user_name>
        <StaffPicker
          :model-value="staffId"
          :disabled="formType === 'detail'"
          placeholder="请选择提报人"
          @update:model-value="handleStaffIdChange"
          @update:data="handleStaffPicked"
        />
      </template>

      <template #depart_name>
        <ElInput
          :model-value="getDeptName(deptId)"
          readonly
          placeholder="请选择部门"
          class="!w-full"
        />
      </template>

      <template #customer_id>
        <CustomerPicker
          :model-value="customerId"
          :disabled="formType === 'detail'"
          placeholder="请选择往来单位"
          @update:model-value="handleCustomerIdChange"
        />
      </template>

      <template #project_id>
        <ProjectPicker
          :model-value="projectId"
          :disabled="formType === 'detail'"
          :customer-id="customerId"
          placeholder="请选择项目"
          :api="getSettlementProjectPage as any"
          :get-by-id="getSettlementProject as any"
          @update:model-value="handleProjectIdChange"
        />
      </template>

      <template #biz_bills>
        <div class="w-full">
            <SelectedGrid class="!w-full">
              <template #table-title>
                <div class="font-medium">业务单据</div>
              </template>

              <template #date_no="{ row }">
                <div>
                  <div>{{ formatDateOnly(row.settlement_date) || '--' }}</div>
                  <div class="text-primary">
                    {{ row.settlement_no || '--' }}
                  </div>
                </div>
              </template>

              <template #sales_dept="{ row }">
                <div>
                  <div>{{ row.salesman_id || '--' }}</div>
                  <div>{{ getDeptName(row.depart_id) || '--' }}</div>
                </div>
              </template>

              <template #apply_amount="{ row }">
                <ElInputNumber
                  :model-value="row.apply_amount"
                  :min="0"
                  :controls="false"
                  class="!w-full"
                  @update:model-value="(value) => handleApplyAmountChange(row, value)"
                />
              </template>
              <template #apply_amount_view="{ row }">
                <span>{{ row.apply_amount ?? 0 }}</span>
              </template>

              <template #row_actions="{ row }">
                <TableAction
                  :actions="[
                    {
                      label: '移除',
                      type: 'danger',
                      link: true,
                      icon: ACTION_ICON.DELETE,
                      onClick: removeSelected.bind(null, row),
                    },
                  ]"
                />
              </template>

              <template #bottom-extra>
                <div class="mt-2 flex w-full justify-end px-3 py-2">
                  本次核销合计：{{ moneyText(totalApplyAmount) }}
                </div>
              </template>
            </SelectedGrid>
        </div>
      </template>
    </Form>

    <SettlementSelect
      v-model="settlementSelectOpen"
      @confirm="handleSettlementSelectConfirm"
    />

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          plain
          :disabled="formType === 'detail'"
          @click="saveWithStatus(0, 0)"
        >
          保存草稿
        </el-button>
        <el-button
          type="primary"
          :disabled="formType === 'detail'"
          @click="saveWithStatus(0, 1)"
        >
          保存并提交
        </el-button>
      </div>
    </template>
  </Modal>
</template>
