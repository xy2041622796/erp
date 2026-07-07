<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';


import { StaffPicker } from '#/components/staff-selector';
import {
  getFunctionTreeByRole,
  saveRolePermissions,
  type FunctionWithOperations,
  type OperationInfo,
} from '#/api/erp/finance/settings/auth/permission';
import {
  addRole,
  deleteRoleUser,
  getRoleHostOptions,
  getRoleOptionsBySysId,
  saveRoleUser,
  type RoleHostOption,
  type RoleOption,
} from '#/api/erp/finance/settings/auth';

import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElEmpty,
  ElInput,
  ElMessage,
  ElTag,
  ElTree,
} from 'element-plus';

defineOptions({ name: 'FinanceSettingsAuthPage' });

interface RolePermissionRow {
  authId: string;
  key: string;
  roleId: string;
  roleName: string;
  personIds: string[];
  sourceRowId?: string;
  classId?: number | string;
}

interface AccountPermissionState extends RoleHostOption {}

interface AddRoleFormState {
  IsType: boolean;
  Memo: string;
  RoleName: string;
}

const presetMap: Record<string, Partial<Record<string, Pick<RolePermissionRow, 'personIds'>>>> = {
  '58a76dd637ff4a035549cb5ec5d518c4': {
    '236B5E8E4F154908AF748EF06B20AD72': { personIds: [] },
    '258FD30B2855426992043105878C16FC': { personIds: [] },
    '683ED052ADFD41CCA402CAB111B1A58C': { personIds: [] },
    A83223FB34524F06A34825108F9E6D62: { personIds: [] },
    ACF945988D534AEC9AE9838CC02DC7EB: { personIds: [] },
  },
  '65a161e48fa312386a79f30301e730a0': {
    '236B5E8E4F154908AF748EF06B20AD72': { personIds: [] },
    '258FD30B2855426992043105878C16FC': { personIds: [] },
    '683ED052ADFD41CCA402CAB111B1A58C': { personIds: [] },
    A83223FB34524F06A34825108F9E6D62: { personIds: [] },
  },
  f7497e4470f04a52fcaf808770c46014: {
    '236B5E8E4F154908AF748EF06B20AD72': { personIds: [] },
    '258FD30B2855426992043105878C16FC': { personIds: [] },
    '683ED052ADFD41CCA402CAB111B1A58C': { personIds: [] },
    A83223FB34524F06A34825108F9E6D62: { personIds: [] },
    ACF945988D534AEC9AE9838CC02DC7EB: { personIds: [] },
  },
};

function normalizePersonIds(value?: null | string | string[]) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean)),
    );
  }

  return Array.from(
    new Set(
      String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getRoleId(item: RoleOption) {
  return String(item.RoleIdField || item.rowid || '').trim();
}

function createPermissionRows(hostId: string, roles: RoleOption[]) {
  const preset = presetMap[hostId] || {};
  const roleMap = new Map<string, RolePermissionRow>();

  for (const item of roles) {
    const roleId = getRoleId(item);
    if (!roleId) continue;

    const entityPKValue = String(item.EntityPKValue || '').trim();
    const isCurrentAccountConfigRow = entityPKValue === hostId;
    const roleName = item.RoleName || '未命名角色';
    const nextPersonIds = normalizePersonIds(item.UserIdField);
    const existing = roleMap.get(roleId);

    if (!existing) {
      roleMap.set(roleId, {
        authId: isCurrentAccountConfigRow ? String(item.authId || '') : '',
        key: roleId,
        roleId,
        roleName,
        personIds: isCurrentAccountConfigRow
          ? nextPersonIds
          : (preset[roleId]?.personIds ?? []),
        sourceRowId: String(item.rowid || ''),
        classId: (item as any).ClassId,
      });
      continue;
    }

    if (roleName && existing.roleName === '未命名角色') {
      existing.roleName = roleName;
    }

    if (!existing.sourceRowId && item.rowid) {
      existing.sourceRowId = String(item.rowid || '');
    }
    if (existing.classId == null && (item as any).ClassId != null) {
      existing.classId = (item as any).ClassId;
    }

    if (isCurrentAccountConfigRow) {
      existing.authId = String(item.authId || existing.authId || '');
      existing.personIds = nextPersonIds;
    }
  }

  return Array.from(roleMap.values());
}

const loading = ref(false);
const roleLoading = ref(false);
const saving = ref(false);
const addingRole = ref(false);
const addRoleDialogVisible = ref(false);
const accountOptions = ref<AccountPermissionState[]>([]);
const selectedAccountId = ref('');
const permissionRowsSource = ref<RolePermissionRow[]>([]);
const savingPersonKey = ref('');
const addRoleForm = reactive<AddRoleFormState>({
  IsType: false,
  Memo: '',
  RoleName: '',
});

const permissionDialogVisible = ref(false);
const permissionLoading = ref(false);
const permissionSubmitting = ref(false);
const permissionRole = ref<RolePermissionRow | null>(null);
const permissionTreeRef = ref<InstanceType<typeof ElTree>>();
const functionTree = ref<FunctionWithOperations[]>([]);
const selectedPermissions = ref<string[]>([]);
const expandedPermissionKeys = ref<string[]>([]);
const allPermissionIds = ref<string[]>([]);

const accountList = computed(() => accountOptions.value);

const currentAccount = computed(() => {
  return (
    accountOptions.value.find((item) => item.id === selectedAccountId.value) ||
    accountList.value[0] ||
    null
  );
});

const permissionRows = computed(() => permissionRowsSource.value);

function resetAddRoleForm() {
  addRoleForm.IsType = false;
  addRoleForm.Memo = '';
  addRoleForm.RoleName = '';
}

function selectAccount(id: string) {
  if (!id || id === selectedAccountId.value) return;
  selectedAccountId.value = id;
}

function openAddRoleDialog() {
  resetAddRoleForm();
  addRoleDialogVisible.value = true;
}

function closeAddRoleDialog() {
  addRoleDialogVisible.value = false;
}

async function submitAddRole() {
  const roleName = String(addRoleForm.RoleName || '').trim();
  const isExclusive = Boolean(addRoleForm.IsType);
  const entityID = isExclusive ? String(currentAccount.value?.id || '').trim() : '';
  const entityTextFiled = isExclusive ? String(currentAccount.value?.text || '').trim() : '';

  if (isExclusive && !entityID) {
    ElMessage.error('专属角色缺少当前帐套ID');
    return;
  }
  if (!roleName) {
    ElMessage.warning('请输入角色名称');
    return;
  }

  addingRole.value = true;
  try {
    await addRole({
      RoleName: roleName,
      EntityID: isExclusive ? entityID : null,
      EntityTextFiled: isExclusive ? entityTextFiled : null,
      Memo: addRoleForm.Memo,
      IsType: isExclusive ? '1' : null,
    });

    ElMessage.success(`角色「${roleName}」新增成功`);
    addRoleDialogVisible.value = false;
    resetAddRoleForm();

    if (selectedAccountId.value) {
      await loadRolesByAccount(selectedAccountId.value);
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '新增角色失败');
  } finally {
    addingRole.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    ElMessage.success(`已保存「${currentAccount.value?.text || '当前帐套'}」权限配置`);
  } finally {
    saving.value = false;
  }
}

async function handlePersonChange(row: RolePermissionRow, value?: string | string[]) {
  const entityId = String(currentAccount.value?.id || '').trim();
  const roleId = String(row.roleId || '').trim();
  const nextUserIds = normalizePersonIds(value);
  const previousUserIds = [...row.personIds];
  const previousAuthId = String(row.authId || '').trim();
  const userIdField = nextUserIds.join(',');

  if (!entityId || !roleId) return;

  row.personIds = nextUserIds;
  savingPersonKey.value = row.key;

  try {
    if (nextUserIds.length === 0) {
      if (previousAuthId) {
        await deleteRoleUser(previousAuthId);
        row.authId = '';
        ElMessage.success(`已删除角色「${row.roleName}」的人员配置`);
      } else {
        row.authId = '';
        ElMessage.success(`已清空角色「${row.roleName}」的人员配置`);
      }
      return;
    }

    const result = await saveRoleUser({
      rowid: previousAuthId || undefined,
      RoleIdField: roleId,
      EntityPKValue: entityId,
      UserIdField: userIdField,
    });

    row.authId = String(result.rowid || row.authId || '');

    if (previousUserIds.length === 0 || !previousAuthId) {
      ElMessage.success(`已为角色「${row.roleName}」新增人员`);
    } else {
      ElMessage.success(`已更新角色「${row.roleName}」的人员配置`);
    }
  } catch (error: any) {
    row.personIds = previousUserIds;
    row.authId = previousAuthId;
    ElMessage.error(error?.message || '保存人员失败');
  } finally {
    savingPersonKey.value = '';
  }
}

async function loadRoleHosts() {
  loading.value = true;
  try {
    const rows = await getRoleHostOptions();
    accountOptions.value = rows;
    if (!selectedAccountId.value && accountOptions.value.length > 0) {
      selectedAccountId.value = accountOptions.value[0].id;
    }
  } catch (error: any) {
    console.error('加载角色宿主信息失败', error);
    ElMessage.error(error?.message || '加载角色宿主信息失败');
  } finally {
    loading.value = false;
  }
}

async function loadRolesByAccount(accountId: string) {
  if (!accountId) {
    permissionRowsSource.value = [];
    return;
  }

  roleLoading.value = true;
  try {
    const roles = await getRoleOptionsBySysId(accountId);
    permissionRowsSource.value = createPermissionRows(accountId, roles);
  } catch (error: any) {
    console.error('加载角色列表失败', error);
    permissionRowsSource.value = [];
    ElMessage.error(error?.message || '加载角色列表失败');
  } finally {
    roleLoading.value = false;
  }
}

function getAllPermissionIds(nodes: FunctionWithOperations[], ids: string[] = []) {
  nodes.forEach((node) => {
    if (node.operations?.length) {
      node.operations.forEach((op) => ids.push(String(op.id)));
    }
    if (node.children && node.children.length > 0) {
      getAllPermissionIds(node.children, ids);
    }
  });
  return ids;
}

function getExpandPermissionIds(nodes: FunctionWithOperations[], ids: string[] = []) {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      ids.push(String(node.id));
      getExpandPermissionIds(node.children, ids);
    }
  });
  return ids;
}

function getOperationTagType(code?: string): string {
  const codeText = String(code || '').toLowerCase();
  if (codeText.includes('view') || codeText.includes('query')) return 'info';
  if (codeText.includes('add') || codeText.includes('create') || codeText.includes('insert')) return 'success';
  if (codeText.includes('edit') || codeText.includes('update')) return 'warning';
  if (codeText.includes('delete') || codeText.includes('remove')) return 'danger';
  if (codeText.includes('export') || codeText.includes('download')) return 'primary';
  return '';
}

function handleOperationChange(op: OperationInfo, checked: boolean | string | number) {
  const nextChecked = Boolean(checked);
  const opId = String(op.id);
  if (nextChecked) {
    if (!selectedPermissions.value.includes(opId)) {
      selectedPermissions.value = [...selectedPermissions.value, opId];
    }
  } else {
    selectedPermissions.value = selectedPermissions.value.filter((id) => id !== opId);
  }
}

async function openPermissionDialog(row: RolePermissionRow) {
  permissionRole.value = row;
  permissionDialogVisible.value = true;
  permissionLoading.value = true;
  selectedPermissions.value = [];
  functionTree.value = [];
  expandedPermissionKeys.value = [];
  allPermissionIds.value = [];

  try {
    const result = await getFunctionTreeByRole(row.sourceRowId || row.roleId);
    functionTree.value = result.tree;
    allPermissionIds.value = getAllPermissionIds(functionTree.value);
    expandedPermissionKeys.value = getExpandPermissionIds(functionTree.value);
    selectedPermissions.value = result.boundOperationIds || [];
  } catch (error: any) {
    ElMessage.error(error?.message || '加载权限配置失败');
  } finally {
    permissionLoading.value = false;
  }
}

function handlePermissionCheck(_: any, info?: any) {
  const halfChecked = Array.isArray(info?.halfCheckedKeys)
    ? info.halfCheckedKeys.map((item: any) => String(item))
    : [];
  const checked = Array.isArray(info?.checkedKeys)
    ? info.checkedKeys.map((item: any) => String(item))
    : [];
  expandedPermissionKeys.value = [...new Set([...checked, ...halfChecked])];
}

function handlePermissionSelectAll(value: boolean | string | number) {
  const checked = Boolean(value);
  selectedPermissions.value = checked ? [...allPermissionIds.value] : [];
}

function handleExpandAll() {
  expandedPermissionKeys.value = getExpandPermissionIds(functionTree.value);
}

function handleCollapseAll() {
  expandedPermissionKeys.value = [];
}

function handleClearPermission() {
  selectedPermissions.value = [];
}

async function handlePermissionSubmit() {
  if (!permissionRole.value?.roleId) return;

  permissionSubmitting.value = true;
  try {
    const result = await saveRolePermissions(
      {
        QID: permissionRole.value.sourceRowId || permissionRole.value.roleId,
        QName: permissionRole.value.roleName,
        roleClassId: Number(permissionRole.value.classId || 0),
        roleClassName: '',
        masterName: '',
      },
      selectedPermissions.value,
      functionTree.value,
    );

    if (result.success) {
      ElMessage.success(result.message || '权限保存成功');
      permissionDialogVisible.value = false;
    } else {
      console.error('权限保存失败返回：', result);
      ElMessage.error(result.message || '权限保存失败');
    }
  } catch (error: any) {
    console.error('保存权限失败：', error);
    ElMessage.error(error?.message || '权限保存失败');
  } finally {
    permissionSubmitting.value = false;
  }
}

function handlePermissionDialogClose() {
  permissionRole.value = null;
  functionTree.value = [];
  selectedPermissions.value = [];
  expandedPermissionKeys.value = [];
  allPermissionIds.value = [];
}

watch(
  () => selectedAccountId.value,
  (value) => {
    if (value) {
      loadRolesByAccount(value);
    }
  },
);

onMounted(() => {
  loadRoleHosts();
});
</script>

<template>
  <Page auto-content-height>
    <div class="finance-auth-page" v-loading="loading">
      <div class="auth-layout">
        <section class="left-panel panel-shell">
          <div class="account-grid header-row">
            <div class="grid-cell index-col">#</div>
            <div class="grid-cell title-cell">帐套管理</div>
          </div>

          <div class="account-list">
            <div
              v-for="(item, index) in accountList"
              :key="item.id"
              :class="['account-grid', 'account-item', { active: currentAccount?.id === item.id }]"
              @click="selectAccount(item.id)"
            >
              <div class="grid-cell index-col">{{ index + 1 }}</div>
              <div class="grid-cell ellipsis-text">{{ item.text }}</div>
            </div>
          </div>
        </section>

        <section class="right-panel panel-shell" v-loading="roleLoading">
          <div class="toolbar-row">
            <div class="toolbar-actions">
              <el-button type="primary" @click="openAddRoleDialog">
                <IconifyIcon icon="mdi:plus" class="mr-1" />新增角色
              </el-button>
              <el-button type="primary" plain :loading="saving" @click="handleSave">
                <IconifyIcon icon="mdi:content-save-outline" class="mr-1" />保存
              </el-button>
            </div>
            <div class="current-host">当前帐套：{{ currentAccount?.text || '-' }}</div>
          </div>

          <div class="permission-grid header-grid">
            <div class="grid-cell">角色名称</div>
            <div class="grid-cell">人员</div>
          </div>

          <div class="permission-body" v-if="permissionRows.length">
            <div v-for="row in permissionRows" :key="row.key" class="permission-grid data-grid">
              <div class="grid-cell role-name-cell">
                <span class="role-name-text">{{ row.roleName }}</span>
                <el-button link type="primary" class="role-auth-btn" @click="openPermissionDialog(row)">
                  权限设置
                </el-button>
              </div>
              <div class="grid-cell staff-picker-cell">
                <div class="w-full" v-loading="savingPersonKey === row.key">
                  <StaffPicker
                    :model-value="row.personIds"
                    multiple
                    :required="false"
                    placeholder="请选择人员"
                    @update:model-value="(value) => handlePersonChange(row, value)"
                  />
                </div>
              </div>
            </div>
          </div>

          <el-empty v-else description="请先点击左侧帐套查询角色列表" :image-size="72" />
        </section>
      </div>
    </div>

    <el-dialog
      v-model="addRoleDialogVisible"
      title="新增角色添加/编辑"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="add-role-dialog-form">
        <div class="form-row top-row">
          <div class="form-item inline-item type-item">
            <div class="form-label">是否为专属角色</div>
            <div class="type-group">
              <el-checkbox :model-value="addRoleForm.IsType" @change="() => (addRoleForm.IsType = true)">
                是
              </el-checkbox>
              <el-checkbox :model-value="!addRoleForm.IsType" @change="() => (addRoleForm.IsType = false)">
                否
              </el-checkbox>
            </div>
          </div>

          <div class="form-item inline-item role-name-item">
            <div class="form-label">角色名称</div>
            <el-input v-model="addRoleForm.RoleName" clearable />
          </div>
        </div>

        <div class="form-item textarea-item">
          <div class="form-label">工作范围</div>
          <el-input v-model="addRoleForm.Memo" type="textarea" :rows="4" />
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="addingRole" @click="submitAddRole">确定</el-button>
          <el-button @click="closeAddRoleDialog">取消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="permissionDialogVisible"
      :title="permissionRole ? `${permissionRole.roleName} - 权限设置` : '权限设置'"
      width="860px"
      top="5vh"
      destroy-on-close
      class="permission-dialog-modal"
      @close="handlePermissionDialogClose"
    >
      <div class="permission-dialog" v-loading="permissionLoading">
        <div class="permission-dialog__toolbar">
          <el-button size="small" @click="handleExpandAll">展开全部</el-button>
          <el-button size="small" @click="handleCollapseAll">收起全部</el-button>
          <el-button size="small" type="primary" @click="handlePermissionSelectAll(true)">全选</el-button>
          <el-button size="small" @click="handleClearPermission">清空</el-button>
        </div>

        <div class="permission-dialog__panel">
          <div class="permission-table">
            <div class="permission-table__header permission-table__row">
              <div class="permission-table__cell permission-table__cell--name">功能模块</div>
              <div class="permission-table__cell permission-table__cell--ops">操作权限</div>
            </div>
            <div class="permission-table__body">
              <ElTree
                ref="permissionTreeRef"
                :data="functionTree"
                node-key="id"
                :default-expanded-keys="expandedPermissionKeys"
                :expand-on-click-node="false"
                :props="{ label: 'name', children: 'children' }"
                @check="handlePermissionCheck"
              >
                <template #default="{ data }">
                  <div class="permission-table__row permission-tree-row">
                    <div class="permission-table__cell permission-table__cell--name">
                      <span class="permission-node__name">{{ data.name }}</span>
                    </div>
                    <div class="permission-table__cell permission-table__cell--ops">
                      <div v-if="data.operations && data.operations.length > 0" class="operation-tags">
                        <label v-for="op in data.operations" :key="op.id" class="operation-item">
                          <el-checkbox
                            :model-value="selectedPermissions.includes(String(op.id))"
                            @change="(checked) => handleOperationChange(op, checked)"
                          />
                          <el-tag :type="getOperationTagType(op.code)" size="small" effect="plain">
                            {{ op.name }}
                          </el-tag>
                        </label>
                      </div>
                      <span v-else class="no-operations">—</span>
                    </div>
                  </div>
                </template>
              </ElTree>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer right-dialog-footer">
          <el-button @click="permissionDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="permissionSubmitting" @click="handlePermissionSubmit">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.finance-auth-page { min-height: calc(100vh - 120px); padding: 8px; background: #f3f4f6; }
.auth-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 12px; min-height: 560px; }
.panel-shell { overflow: hidden; border: 1px solid #dcdfe6; background: #fff; }
.left-panel { display: flex; flex-direction: column; }
.account-grid { display: grid; grid-template-columns: 42px minmax(0, 1fr); }
.permission-grid { display: grid; grid-template-columns: 220px minmax(260px, 1fr); }
.header-row, .header-grid, .data-grid, .account-item { border-bottom: 1px solid #dcdfe6; }
.grid-cell { display: flex; align-items: center; min-height: 34px; padding: 4px 10px; border-right: 1px solid #dcdfe6; color: #303133; font-size: 14px; }
.grid-cell:last-child { border-right: none; }
.header-row, .header-grid { background: #f5f7fa; font-weight: 600; }
.index-col { justify-content: center; padding: 0; }
.title-cell { justify-content: center; }
.account-list { flex: 1; overflow: auto; }
.account-item { cursor: pointer; transition: background-color 0.2s ease; }
.account-item:hover, .account-item.active { background: #ecf5ff; }
.ellipsis-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.right-panel { display: flex; flex-direction: column; }
.toolbar-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #dcdfe6; background: #f5f7fa; }
.toolbar-actions { display: flex; gap: 8px; }
.current-host { color: #606266; font-size: 14px; }
.permission-body { flex: 1; overflow: auto; }
.role-name-cell { justify-content: space-between; gap: 8px; }
.role-name-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role-auth-btn { flex-shrink: 0; padding: 0; }
.staff-picker-cell { padding-top: 2px; padding-bottom: 2px; }
.add-role-dialog-form { display: flex; flex-direction: column; gap: 16px; }
.top-row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; align-items: start; }
.form-item { display: flex; flex-direction: column; gap: 8px; }
.form-label { color: #606266; font-size: 14px; line-height: 22px; }
.type-group { display: flex; align-items: center; gap: 12px; min-height: 32px; }
.textarea-item { width: 100%; }
.dialog-footer { display: flex; justify-content: center; gap: 10px; }
.right-dialog-footer { justify-content: flex-end; }
.permission-dialog { display: flex; flex-direction: column; gap: 14px; min-height: 0; height: calc(90vh - 140px); max-height: calc(90vh - 140px); }
.permission-dialog__toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #ebeef5; border-radius: 12px; background: #f5f7fa; flex-shrink: 0; }
.permission-dialog__panel { flex: 1; min-height: 0; border: 1px solid #ebeef5; border-radius: 12px; background: #fff; overflow: auto; }
.permission-table { min-width: 100%; }
.permission-table__row { display: grid; grid-template-columns: 250px minmax(0, 1fr); border-bottom: 1px solid #ebeef5; }
.permission-table__header { position: sticky; top: 0; z-index: 2; background: #f5f7fa; font-weight: 600; }
.permission-table__cell { min-height: 40px; padding: 10px 12px; border-right: 1px solid #ebeef5; display: flex; align-items: center; }
.permission-table__cell:last-child { border-right: none; }
.permission-tree-row { width: 100%; }
.operation-tags { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.operation-item { display: inline-flex; align-items: center; gap: 6px; }
.no-operations { color: #c0c4cc; }
.permission-node__name { color: #303133; }
:deep(.permission-dialog-modal .el-dialog) { max-height: 90vh; display: flex; flex-direction: column; }
:deep(.permission-dialog-modal .el-dialog__body) { flex: 1; min-height: 0; overflow: hidden; }
:deep(.permission-dialog-modal .el-dialog__footer) { flex-shrink: 0; }
:deep(.el-tree-node__content) { height: auto; padding: 0; align-items: stretch; }
:deep(.el-tree-node) { width: 100%; }
:deep(.el-tree-node__children) { overflow: visible; }
:deep(.el-button + .el-button) { margin-left: 0; }
:deep(.staff-picker-cell .el-input), :deep(.role-name-item .el-input), :deep(.textarea-item .el-textarea) { width: 100%; }
@media (max-width: 1200px) { .permission-grid { grid-template-columns: 180px minmax(220px, 1fr); } .permission-table__row { grid-template-columns: 220px minmax(0, 1fr); } }
</style>
