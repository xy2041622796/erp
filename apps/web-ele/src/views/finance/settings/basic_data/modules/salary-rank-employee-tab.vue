<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';


import {
  createRowId,
  loadSalaryRankEmployeeRows,
  loadSalaryRankRows,
  saveSalaryRankEmployeeRows,
  type SalaryRankEmployeeRow,
} from '#/views/finance/settings/basic_data/modules/salary-rank-storage';

import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'SalaryRankEmployeeTab' });

const rows = ref<SalaryRankEmployeeRow[]>(loadSalaryRankEmployeeRows());
const keyword = ref('');
const dialogVisible = ref(false);
const editingId = ref('');
const rankOptions = computed(() => loadSalaryRankRows());

const rankNameMap = computed(() => {
  return new Map(rankOptions.value.map((item) => [item.rowid, `${item.rank_code} / ${item.rank_name}`]));
});

const form = reactive<SalaryRankEmployeeRow>({
  rowid: '',
  rank_id: '',
  employee_id: '',
  employee_no: '',
  employee_name: '',
  dept_id: '',
  dept_name: '',
  is_current: true,
  effective_date: '',
  expire_date: '',
  remark: '',
});

const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((item) =>
    [
      item.employee_id,
      item.employee_no,
      item.employee_name,
      item.dept_name,
      rankNameMap.value.get(item.rank_id) || '',
      item.remark,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
});

function persist() {
  saveSalaryRankEmployeeRows(rows.value);
}

function resetForm() {
  form.rowid = '';
  form.rank_id = '';
  form.employee_id = '';
  form.employee_no = '';
  form.employee_name = '';
  form.dept_id = '';
  form.dept_name = '';
  form.is_current = true;
  form.effective_date = '';
  form.expire_date = '';
  form.remark = '';
}

function handleCreate() {
  editingId.value = '';
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: SalaryRankEmployeeRow) {
  editingId.value = row.rowid;
  Object.assign(form, row);
  dialogVisible.value = true;
}

function handleSave() {
  if (!form.rank_id) return ElMessage.warning('请选择职级');
  if (!form.employee_id.trim()) return ElMessage.warning('请输入员工ID');
  if (!form.employee_name.trim()) return ElMessage.warning('请输入员工姓名');

  const payload: SalaryRankEmployeeRow = {
    rowid: editingId.value || createRowId(),
    rank_id: form.rank_id,
    employee_id: form.employee_id.trim(),
    employee_no: form.employee_no.trim(),
    employee_name: form.employee_name.trim(),
    dept_id: form.dept_id.trim(),
    dept_name: form.dept_name.trim(),
    is_current: !!form.is_current,
    effective_date: form.effective_date || '',
    expire_date: form.expire_date || '',
    remark: form.remark.trim(),
  };

  if (editingId.value) {
    rows.value = rows.value.map((item) => (item.rowid === payload.rowid ? payload : item));
    ElMessage.success('职级人员已更新');
  } else {
    rows.value = [payload, ...rows.value];
    ElMessage.success('职级人员已新增');
  }

  persist();
  dialogVisible.value = false;
}

async function handleDelete(row: SalaryRankEmployeeRow) {
  await ElMessageBox.confirm(`确认删除员工【${row.employee_name}】的职级分配吗？`, '提示', {
    type: 'warning',
  });
  rows.value = rows.value.filter((item) => item.rowid !== row.rowid);
  persist();
  ElMessage.success('职级分配已删除');
}
</script>

<template>
  <div class="space-y-3">
    <ElAlert type="info" :closable="false" show-icon>
      <template #title>
        精简后仅保留 rank_id、员工主键与姓名/工号、部门、当前标记、生失效日期和备注；不再冗余职级名称字段。
      </template>
    </ElAlert>

    <div class="flex items-center justify-between gap-3">
      <ElInput
        v-model="keyword"
        clearable
        placeholder="搜索员工ID/工号/姓名/部门"
        style="max-width: 320px"
      />
      <ElButton type="primary" @click="handleCreate">新增人员分配</ElButton>
    </div>

    <ElTable :data="filteredRows" border>
      <ElTableColumn type="index" label="#" width="60" />
      <ElTableColumn label="所属职级" min-width="180">
        <template #default="{ row }">
          {{ rankNameMap.get(row.rank_id) || row.rank_id }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="employee_id" label="员工ID" min-width="120" />
      <ElTableColumn prop="employee_no" label="工号" min-width="120" />
      <ElTableColumn prop="employee_name" label="姓名" min-width="120" />
      <ElTableColumn prop="dept_name" label="部门" min-width="140" />
      <ElTableColumn label="当前" width="90">
        <template #default="{ row }">
          <ElTag :type="row.is_current ? 'success' : 'info'">{{ row.is_current ? '是' : '否' }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="effective_date" label="生效日期" min-width="120" />
      <ElTableColumn prop="expire_date" label="失效日期" min-width="120" />
      <ElTableColumn prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <ElTableColumn label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div class="flex gap-2">
            <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDialog v-model="dialogVisible" :title="editingId ? '编辑人员分配' : '新增人员分配'" width="640px">
      <ElForm label-width="96px">
        <ElFormItem label="所属职级" required>
          <ElSelect v-model="form.rank_id" placeholder="请选择职级" style="width: 100%">
            <ElOption
              v-for="item in rankOptions"
              :key="item.rowid"
              :label="`${item.rank_code} / ${item.rank_name}`"
              :value="item.rowid"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="员工ID" required>
          <ElInput v-model="form.employee_id" maxlength="32" placeholder="请输入员工ID" />
        </ElFormItem>
        <ElFormItem label="员工工号">
          <ElInput v-model="form.employee_no" maxlength="50" placeholder="请输入员工工号" />
        </ElFormItem>
        <ElFormItem label="员工姓名" required>
          <ElInput v-model="form.employee_name" maxlength="100" placeholder="请输入员工姓名" />
        </ElFormItem>
        <ElFormItem label="部门ID">
          <ElInput v-model="form.dept_id" maxlength="32" placeholder="请输入部门ID" />
        </ElFormItem>
        <ElFormItem label="部门名称">
          <ElInput v-model="form.dept_name" maxlength="100" placeholder="请输入部门名称" />
        </ElFormItem>
        <ElFormItem label="是否当前">
          <ElSwitch v-model="form.is_current" />
        </ElFormItem>
        <ElFormItem label="生效日期">
          <ElDatePicker v-model="form.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="失效日期">
          <ElDatePicker v-model="form.expire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
