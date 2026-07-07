<script lang="ts" setup>
import type { SystemUserApi } from '#/api/system/user';

import { computed, onMounted, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import {
  createSalaryRankEmployee,
  getSalaryRankEmployeeList,
  getSalaryRankList,
  updateSalaryRankEmployee,
} from '#/api/erp/finance/cashier/rank';
import { createUser, getUser, getUserByRowid, getUserPage, updateUser } from '#/api/system/user';
import { $t } from '#/locales';

import {
  ElCol,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRow,
  ElSelect,
} from 'element-plus';

const emit = defineEmits(['success']);
const formRef = ref();
const formData = ref<SystemUserApi.User>();
const rankOptions = ref<any[]>([]);
const rankLoading = ref(false);

const formState = reactive<Record<string, any>>({
  ID: undefined,
  ROWID: '',
  UserName: '',
  LoginName: '',
  LoginPass: '',
  entInfoUserPhone: '',
  mailbox: '',
  Sex: undefined,
  Birthday: '',
  DepID: '',
  DepName: '',
  rank_id: '',
  rank_code: '',
  rank_name: '',
  Address: '',
  State: 0,
  memo: '',
});

const rules = {
  UserName: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  LoginName: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  LoginPass: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
  State: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

const getTitle = computed(() =>
  formData.value?.ID ? '编辑员工' : '新增员工',
);

async function loadRankOptions() {
  rankLoading.value = true;
  try {
    const res = await getSalaryRankList();
    rankOptions.value = (res.list || []).filter((item: any) => Number(item.is_enabled ?? 1) === 1);
  } finally {
    rankLoading.value = false;
  }
}

function handleRankChange(rankId: string) {
  const rank = rankOptions.value.find((item) => String(item.rowid || '') === String(rankId || ''));
  formState.rank_id = rankId || '';
  formState.rank_code = rank?.rank_code || '';
  formState.rank_name = rank?.rank_name || '';
}

function resetFormState() {
  Object.assign(formState, {
    ID: undefined,
    ROWID: '',
    UserName: '',
    LoginName: '',
    LoginPass: '',
    entInfoUserPhone: '',
    mailbox: '',
    Sex: undefined,
    Birthday: '',
    DepID: '',
    DepName: '',
    rank_id: '',
    rank_code: '',
    rank_name: '',
    Address: '',
    State: 0,
    memo: '',
  });
}

function applyDept(dept: any) {
  if (!dept) return;
  formState.DepID = String(dept.id || dept.DepID || dept.ID || dept.ROWID || '');
  formState.DepName = String(dept.name || dept.DepName || dept.Name || dept.DeptName || '');
}

async function resolveSavedEmployee() {
  if (formState.ROWID || formState.ID) return formState;
  if (!formState.LoginName) return formState;
  const res = await getUserPage({ pageNo: 1, page: 1, LoginName: formState.LoginName });
  const row = Array.isArray(res.list) ? res.list[0] : null;
  if (row) Object.assign(formState, row);
  return formState;
}

async function syncRankEmployee() {
  if (!formState.rank_id) return;
  const employee = await resolveSavedEmployee();
  const employeeId = String(employee.ROWID || employee.ID || '');
  if (!employeeId) return;

  const payload = {
    rank_id: formState.rank_id,
    employee_id: employeeId,
    employee_no: String(formState.LoginName || formState.ROWID || ''),
    employee_name: String(formState.UserName || ''),
    dept_id: String(formState.DepID || ''),
    dept_name: String(formState.DepName || ''),
    is_current: 1,
    effective_date: '',
    expire_date: '',
    remark: formState.memo || '',
  };

  const existedRes = await getSalaryRankEmployeeList({ keyword: employeeId });
  const existed = (existedRes.list || []).find(
    (item: any) => String(item.employee_id || '') === employeeId,
  );

  if (existed?.rowid) {
    await updateSalaryRankEmployee({ ...payload, rowid: existed.rowid } as any);
  } else {
    await createSalaryRankEmployee(payload as any);
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await formRef.value?.validate();
    modalApi.lock();
    try {
      const data = { ...formState } as SystemUserApi.User;
      await (formData.value?.ID ? updateUser(data) : createUser(data));
      await syncRankEmployee();
      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      resetFormState();
      formRef.value?.clearValidate();
      return;
    }

    resetFormState();
    const modalData = modalApi.getData<any>();
    applyDept(modalData?.dept);

    const row = modalData?.row || modalData;
    if (!row?.ID && !row?.ROWID) return;

    modalApi.lock();
    try {
      const res = row.ID ? await getUser(row.ID) : await getUserByRowid(row.ROWID);
      formData.value = (res.list || row) as SystemUserApi.User;
      Object.assign(formState, row, formData.value || {});
    } finally {
      modalApi.unlock();
    }
  },
});

onMounted(loadRankOptions);
</script>

<template>
  <Modal :title="getTitle" class="w-2/3">
    <el-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      label-width="90px"
      class="employee-form mx-4"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="员工姓名" prop="UserName">
            <el-input v-model="formState.UserName" placeholder="请输入员工姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="登录账号" prop="LoginName">
            <el-input v-model="formState.LoginName" placeholder="请输入登录账号" />
          </el-form-item>
        </el-col>
        <el-col v-if="!formState.ID" :span="12">
          <el-form-item label="初始密码" prop="LoginPass">
            <el-input v-model="formState.LoginPass" show-password placeholder="请输入初始密码" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="部门" prop="DepName">
            <el-input v-model="formState.DepName" readonly placeholder="请先在页面左侧选择部门" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="职级" prop="rank_id">
            <el-select
              v-model="formState.rank_id"
              class="w-full"
              clearable
              filterable
              :loading="rankLoading"
              placeholder="请选择职级"
              @change="handleRankChange"
            >
              <el-option
                v-for="rank in rankOptions"
                :key="rank.rowid"
                :label="`${rank.rank_code || ''} ${rank.rank_name || ''}`"
                :value="rank.rowid"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号" prop="entInfoUserPhone">
            <el-input v-model="formState.entInfoUserPhone" placeholder="请输入手机号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮箱" prop="mailbox">
            <el-input v-model="formState.mailbox" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="性别" prop="Sex">
            <el-radio-group v-model="formState.Sex">
              <el-radio :label="1">男</el-radio>
              <el-radio :label="2">女</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="生日" prop="Birthday">
            <el-date-picker
              v-model="formState.Birthday"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择生日"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="State">
            <el-radio-group v-model="formState.State">
              <el-radio :label="0">启用</el-radio>
              <el-radio :label="1">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="地址" prop="Address">
            <el-input v-model="formState.Address" placeholder="请输入地址" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="memo">
            <el-input v-model="formState.memo" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </Modal>
</template>
