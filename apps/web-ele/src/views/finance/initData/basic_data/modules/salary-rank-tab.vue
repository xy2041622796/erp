<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';


import {
  createRowId,
  loadSalaryRankRows,
  saveSalaryRankRows,
  type SalaryRankRow,
} from './salary-rank-storage';

import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'SalaryRankTab' });

const rows = ref<SalaryRankRow[]>(loadSalaryRankRows());
const keyword = ref('');
const dialogVisible = ref(false);
const editingId = ref('');

const form = reactive<SalaryRankRow>({
  rowid: '',
  rank_code: '',
  rank_name: '',
  rank_level: 0,
  rank_type: '',
  is_enabled: true,
  remark: '',
});

const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((item) =>
    [item.rank_code, item.rank_name, item.rank_type, item.remark]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
});

function persist() {
  saveSalaryRankRows(rows.value);
}

function resetForm() {
  form.rowid = '';
  form.rank_code = '';
  form.rank_name = '';
  form.rank_level = 0;
  form.rank_type = '';
  form.is_enabled = true;
  form.remark = '';
}

function handleCreate() {
  editingId.value = '';
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: SalaryRankRow) {
  editingId.value = row.rowid;
  Object.assign(form, row);
  dialogVisible.value = true;
}

function handleSave() {
  if (!form.rank_code.trim()) return ElMessage.warning('请输入职级编码');
  if (!form.rank_name.trim()) return ElMessage.warning('请输入职级名称');

  const payload: SalaryRankRow = {
    rowid: editingId.value || createRowId(),
    rank_code: form.rank_code.trim(),
    rank_name: form.rank_name.trim(),
    rank_level: Number(form.rank_level || 0),
    rank_type: form.rank_type.trim(),
    is_enabled: !!form.is_enabled,
    remark: form.remark.trim(),
  };

  const duplicated = rows.value.find(
    (item) => item.rank_code === payload.rank_code && item.rowid !== payload.rowid,
  );
  if (duplicated) return ElMessage.warning('职级编码不能重复');

  if (editingId.value) {
    rows.value = rows.value.map((item) => (item.rowid === payload.rowid ? payload : item));
    ElMessage.success('职级已更新');
  } else {
    rows.value = [payload, ...rows.value];
    ElMessage.success('职级已新增');
  }

  persist();
  dialogVisible.value = false;
}

async function handleDelete(row: SalaryRankRow) {
  await ElMessageBox.confirm(`确认删除职级【${row.rank_name}】吗？`, '提示', {
    type: 'warning',
  });
  rows.value = rows.value.filter((item) => item.rowid !== row.rowid);
  persist();
  ElMessage.success('职级已删除');
}
</script>

<template>
  <div class="space-y-3">
    <ElAlert type="info" :closable="false" show-icon>
      <template #title>
        这是精简后的职级主表页面，只保留 rank_code / rank_name / rank_level / rank_type / is_enabled / remark。
      </template>
    </ElAlert>

    <div class="flex items-center justify-between gap-3">
      <ElInput v-model="keyword" clearable placeholder="搜索职级编码/名称/类型" style="max-width: 320px" />
      <ElButton type="primary" @click="handleCreate">新增职级</ElButton>
    </div>

    <ElTable :data="filteredRows" border>
      <ElTableColumn type="index" label="#" width="60" />
      <ElTableColumn prop="rank_code" label="职级编码" min-width="120" />
      <ElTableColumn prop="rank_name" label="职级名称" min-width="160" />
      <ElTableColumn prop="rank_level" label="层级" width="90" />
      <ElTableColumn prop="rank_type" label="类型" min-width="120" />
      <ElTableColumn label="启用" width="90">
        <template #default="{ row }">
          <ElTag :type="row.is_enabled ? 'success' : 'info'">{{ row.is_enabled ? '启用' : '停用' }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="remark" label="备注" min-width="220" show-overflow-tooltip />
      <ElTableColumn label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div class="flex gap-2">
            <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDialog v-model="dialogVisible" :title="editingId ? '编辑职级' : '新增职级'" width="560px">
      <ElForm label-width="96px">
        <ElFormItem label="职级编码" required>
          <ElInput v-model="form.rank_code" maxlength="50" placeholder="如 P5 / M3" />
        </ElFormItem>
        <ElFormItem label="职级名称" required>
          <ElInput v-model="form.rank_name" maxlength="100" placeholder="请输入职级名称" />
        </ElFormItem>
        <ElFormItem label="职级层级">
          <ElInputNumber v-model="form.rank_level" :min="0" :step="1" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="职级类型">
          <ElInput v-model="form.rank_type" maxlength="50" placeholder="如 管理 / 技术 / 销售" />
        </ElFormItem>
        <ElFormItem label="是否启用">
          <ElSwitch v-model="form.is_enabled" />
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
