<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';


import {
  createRowId,
  loadSalaryRankItemRows,
  loadSalaryRankRows,
  saveSalaryRankItemRows,
  type SalaryRankItemRow,
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
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'SalaryRankItemTab' });

const rows = ref<SalaryRankItemRow[]>(loadSalaryRankItemRows());
const keyword = ref('');
const dialogVisible = ref(false);
const editingId = ref('');
const rankOptions = computed(() => loadSalaryRankRows());

const rankNameMap = computed(() => {
  return new Map(rankOptions.value.map((item) => [item.rowid, `${item.rank_code} / ${item.rank_name}`]));
});

const form = reactive<SalaryRankItemRow>({
  rowid: '',
  rank_id: '',
  item_id: '',
  is_required: false,
  is_default_selected: true,
  default_amount: 0,
  sort_no: 0,
  remark: '',
});

const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((item) =>
    [item.item_id, item.remark, rankNameMap.value.get(item.rank_id) || '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
});

function persist() {
  saveSalaryRankItemRows(rows.value);
}

function resetForm() {
  form.rowid = '';
  form.rank_id = '';
  form.item_id = '';
  form.is_required = false;
  form.is_default_selected = true;
  form.default_amount = 0;
  form.sort_no = 0;
  form.remark = '';
}

function handleCreate() {
  editingId.value = '';
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: SalaryRankItemRow) {
  editingId.value = row.rowid;
  Object.assign(form, row);
  dialogVisible.value = true;
}

function handleSave() {
  if (!form.rank_id) return ElMessage.warning('请选择职级');
  if (!form.item_id.trim()) return ElMessage.warning('请输入工资项ID');

  const payload: SalaryRankItemRow = {
    rowid: editingId.value || createRowId(),
    rank_id: form.rank_id,
    item_id: form.item_id.trim(),
    is_required: !!form.is_required,
    is_default_selected: !!form.is_default_selected,
    default_amount: Number(form.default_amount || 0),
    sort_no: Number(form.sort_no || 0),
    remark: form.remark.trim(),
  };

  const duplicated = rows.value.find(
    (item) =>
      item.rank_id === payload.rank_id &&
      item.item_id === payload.item_id &&
      item.rowid !== payload.rowid,
  );
  if (duplicated) return ElMessage.warning('同一职级下工资项不能重复');

  if (editingId.value) {
    rows.value = rows.value.map((item) => (item.rowid === payload.rowid ? payload : item));
    ElMessage.success('职级工资项已更新');
  } else {
    rows.value = [payload, ...rows.value];
    ElMessage.success('职级工资项已新增');
  }

  persist();
  dialogVisible.value = false;
}

async function handleDelete(row: SalaryRankItemRow) {
  await ElMessageBox.confirm(`确认删除工资项配置【${row.item_id}】吗？`, '提示', {
    type: 'warning',
  });
  rows.value = rows.value.filter((item) => item.rowid !== row.rowid);
  persist();
  ElMessage.success('工资项配置已删除');
}
</script>

<template>
  <div class="space-y-3">
    <ElAlert type="warning" :closable="false" show-icon>
      <template #title>
        裁剪后只保留 rank_id、item_id、是否必选、默认选中、默认金额、排序和备注。
      </template>
      <div class="text-xs leading-6">
        正式接入时，item_id 应来源于 <code>Bil_Salary_Item_Meta.rowid</code>，页面展示的工资项编码/名称/分类/方向建议通过联表查询获得，不再落库冗余字段。
      </div>
    </ElAlert>

    <div class="flex items-center justify-between gap-3">
      <ElInput v-model="keyword" clearable placeholder="搜索职级/工资项ID/备注" style="max-width: 320px" />
      <ElButton type="primary" @click="handleCreate">新增工资项配置</ElButton>
    </div>

    <ElTable :data="filteredRows" border>
      <ElTableColumn type="index" label="#" width="60" />
      <ElTableColumn label="所属职级" min-width="180">
        <template #default="{ row }">
          {{ rankNameMap.get(row.rank_id) || row.rank_id }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="item_id" label="工资项ID" min-width="220" show-overflow-tooltip />
      <ElTableColumn label="必选" width="90">
        <template #default="{ row }">
          <ElTag :type="row.is_required ? 'danger' : 'info'">{{ row.is_required ? '是' : '否' }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="默认选中" width="110">
        <template #default="{ row }">
          <ElTag :type="row.is_default_selected ? 'success' : 'info'">{{ row.is_default_selected ? '是' : '否' }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="default_amount" label="默认金额" width="120" />
      <ElTableColumn prop="sort_no" label="排序" width="90" />
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

    <ElDialog v-model="dialogVisible" :title="editingId ? '编辑工资项配置' : '新增工资项配置'" width="640px">
      <ElForm label-width="110px">
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
        <ElFormItem label="工资项ID" required>
          <ElInput v-model="form.item_id" maxlength="32" placeholder="请输入 Bil_Salary_Item_Meta.rowid" />
        </ElFormItem>
        <ElFormItem label="是否必选">
          <ElSwitch v-model="form.is_required" />
        </ElFormItem>
        <ElFormItem label="默认选中">
          <ElSwitch v-model="form.is_default_selected" />
        </ElFormItem>
        <ElFormItem label="默认金额">
          <ElInputNumber v-model="form.default_amount" :min="0" :precision="2" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="排序号">
          <ElInputNumber v-model="form.sort_no" :min="0" :step="1" style="width: 100%" />
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
