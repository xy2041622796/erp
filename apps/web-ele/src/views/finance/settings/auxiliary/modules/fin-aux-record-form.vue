<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="min(52rem, 94vw)"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <div class="fin-aux-form-grid">
        <el-form-item :label="codeLabel" :prop="codeField">
          <el-input
            v-model="form[codeField]"
            :disabled="isAutoCodeField"
            :placeholder="isAutoCodeField ? '保存后系统自动生成' : `请输入${codeLabel}`"
          />
        </el-form-item>

        <el-form-item :label="nameLabel" :prop="nameField">
          <el-input v-model="form[nameField]" :placeholder="`请输入${nameLabel}`" />
        </el-form-item>

        <el-form-item v-if="dimCode === 'CUSTOMER'" label="客户简称">
          <el-input v-model="form.customer_short_name" placeholder="可选" />
        </el-form-item>
        <el-form-item v-if="dimCode === 'SUPPLIER'" label="供应商简称">
          <el-input v-model="form.supplier_short_name" placeholder="可选" />
        </el-form-item>
        <el-form-item v-if="dimCode === 'DEPT'" label="部门简称">
          <el-input v-model="form.department_short_name" placeholder="可选" />
        </el-form-item>

        <el-form-item v-if="dimCode === 'DEPT'" label="上级部门编码">
          <el-input v-model="form.parent_department_code" placeholder="不设外键，仅记录快照" />
        </el-form-item>
        <el-form-item v-if="dimCode === 'DEPT'" label="上级部门名称">
          <el-input v-model="form.parent_department_name" placeholder="不设外键，仅记录快照" />
        </el-form-item>

        <template v-if="dimCode === 'PROJECT'">
          <el-form-item label="项目类型">
            <el-input v-model="form.project_type" placeholder="可选" />
          </el-form-item>
          <el-form-item label="项目组">
            <el-input v-model="form.project_group" placeholder="可选" />
          </el-form-item>
          <el-form-item label="客户编码快照">
            <el-input v-model="form.customer_code" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="客户名称快照">
            <el-input v-model="form.customer_name" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="部门编码快照">
            <el-input v-model="form.department_code" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="部门名称快照">
            <el-input v-model="form.department_name" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="负责人编码快照">
            <el-input v-model="form.manager_code" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="负责人名称快照">
            <el-input v-model="form.manager_name" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.start_date" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="form.end_date" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="项目金额">
            <el-input-number v-model="form.project_amount" :precision="2" :min="0" style="width: 100%" />
          </el-form-item>
        </template>

        <template v-if="dimCode === 'STAFF'">
          <el-form-item label="部门编码快照">
            <el-input v-model="form.department_code" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="部门名称快照">
            <el-input v-model="form.department_name" placeholder="不设外键" />
          </el-form-item>
          <el-form-item label="岗位名称">
            <el-input v-model="form.position_name" placeholder="可选" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="form.mobile" placeholder="可选" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="可选" />
          </el-form-item>
        </template>

        <template v-if="dimCode === 'CUSTOMER' || dimCode === 'SUPPLIER'">
          <el-form-item label="税号">
            <el-input v-model="form.tax_no" placeholder="可选" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="form.contact_name" placeholder="可选" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.contact_phone" placeholder="可选" />
          </el-form-item>
          <el-form-item label="联系人手机">
            <el-input v-model="form.contact_mobile" placeholder="可选" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="可选" />
          </el-form-item>
          <el-form-item label="地址">
            <el-input v-model="form.address" placeholder="可选" />
          </el-form-item>
          <el-form-item label="开户行">
            <el-input v-model="form.bank_name" placeholder="可选" />
          </el-form-item>
          <el-form-item label="银行账号">
            <el-input v-model="form.bank_account" placeholder="可选" />
          </el-form-item>
          <el-form-item v-if="dimCode === 'SUPPLIER'" label="开户地址">
            <el-input v-model="form.bank_address" placeholder="可选" />
          </el-form-item>
        </template>

        <el-form-item label="启用状态">
          <el-switch v-model="enabledBool" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_no" :min="0" :max="999999" style="width: 100%" />
        </el-form-item>
      </div>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  createFinanceAuxRecord,
  updateFinanceAuxRecord,
} from '#/api/erp/finance/settings/auxiliary/finance-aux-values';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSwitch,
} from 'element-plus';

type Mode = 'add' | 'edit';
type DimCode = 'CUSTOMER' | 'DEPT' | 'PROJECT' | 'STAFF' | 'SUPPLIER';

const props = withDefaults(
  defineProps<{
    dimCode: DimCode;
    modelValue: boolean;
    mode: Mode;
    row?: Record<string, any> | null;
  }>(),
  {
    modelValue: false,
    mode: 'add',
    row: null,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'success'): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const dimNameMap: Record<string, string> = {
  CUSTOMER: '客户',
  SUPPLIER: '供应商',
  DEPT: '部门',
  PROJECT: '项目',
  STAFF: '员工',
};

const codeFieldMap: Record<string, string> = {
  CUSTOMER: 'customer_code',
  SUPPLIER: 'supplier_code',
  DEPT: 'department_code',
  PROJECT: 'project_code',
  STAFF: 'employee_code',
};

const nameFieldMap: Record<string, string> = {
  CUSTOMER: 'customer_name',
  SUPPLIER: 'supplier_name',
  DEPT: 'department_name',
  PROJECT: 'project_name',
  STAFF: 'employee_name',
};

const dimCode = computed(() => props.dimCode);
const codeField = computed(() => codeFieldMap[props.dimCode]);
const nameField = computed(() => nameFieldMap[props.dimCode]);
const codeLabel = computed(() => `${dimNameMap[props.dimCode]}编码`);
const nameLabel = computed(() => `${dimNameMap[props.dimCode]}名称`);
const dialogTitle = computed(() => `${props.mode === 'edit' ? '编辑' : '新增'}${dimNameMap[props.dimCode]}`);
const isAutoCodeField = computed(() => props.dimCode === 'CUSTOMER' && props.mode === 'add');

const formRef = ref<any>();
const loading = ref(false);
const form = ref<Record<string, any>>({});

function createEmptyForm() {
  return {
    row_id: undefined,
    [codeField.value]: '',
    [nameField.value]: '',
    enabled: 1,
    sort_no: 0,
    source_system: 'FINANCE',
    lingma_sys_is_delete: 0,
  };
}

watch(
  () => [props.modelValue, props.mode, props.row, props.dimCode] as const,
  ([visibleValue]) => {
    if (!visibleValue) return;
    if (props.mode === 'edit' && props.row) {
      form.value = {
        ...createEmptyForm(),
        ...props.row,
        enabled: Number(props.row?.enabled ?? 1),
        sort_no: Number(props.row?.sort_no ?? 0),
        lingma_sys_is_delete: Number(props.row?.lingma_sys_is_delete ?? 0),
      };
    } else {
      form.value = createEmptyForm();
    }
    setTimeout(() => formRef.value?.clearValidate?.(), 0);
  },
  { immediate: true },
);

const enabledBool = computed({
  get: () => Number(form.value.enabled ?? 1) === 1,
  set: (v: boolean) => {
    form.value.enabled = v ? 1 : 0;
  },
});

const rules = computed(() => ({
  ...(isAutoCodeField.value
    ? {}
    : {
        [codeField.value]: [
          { required: true, message: `请输入${codeLabel.value}`, trigger: 'blur' },
        ],
      }),
  [nameField.value]: [{ required: true, message: `请输入${nameLabel.value}`, trigger: 'blur' }],
}));

async function handleSubmit() {
  const refIns = formRef.value;
  if (!refIns) return;
  try {
    await refIns.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    if (props.mode === 'edit') {
      await updateFinanceAuxRecord(props.dimCode, form.value);
      ElMessage.success('保存成功');
    } else {
      const payload = { ...form.value };
      if (props.dimCode === 'CUSTOMER') payload[codeField.value] = '';
      await createFinanceAuxRecord(props.dimCode, payload);
      ElMessage.success('新增成功');
    }
    visible.value = false;
    emit('success');
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.fin-aux-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

@media (max-width: 720px) {
  .fin-aux-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
