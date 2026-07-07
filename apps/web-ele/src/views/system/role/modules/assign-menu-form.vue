<script lang="ts" setup>
import type { SystemMenuApi } from '#/api/system/menu';
import type { SystemRoleApi } from '#/api/system/role';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { handleTree } from '@vben/utils';


import { getSimpleMenusList } from '#/api/system/menu';
import { assignRoleMenu, getRoleMenuList } from '#/api/system/permission';
import { $t } from '#/locales';

import { ElCheckbox, ElMessage, ElTree } from 'element-plus';

const emit = defineEmits(['success']);

const treeRef = ref<InstanceType<typeof ElTree>>();
const menuTree = ref<SystemMenuApi.Menu[]>([]);
const menuLoading = ref(false);
const checkedMenuIds = ref<number[]>([]);
const expandedKeys = ref<number[]>([]);
const roleInfo = ref<SystemRoleApi.Role | null>(null);
const allMenuIds = ref<number[]>([]);

const selectedCount = computed(() => checkedMenuIds.value.length);
const totalCount = computed(() => allMenuIds.value.length);
const isAllSelected = computed(
  () => totalCount.value > 0 && selectedCount.value === totalCount.value,
);
const isIndeterminate = computed(
  () => selectedCount.value > 0 && selectedCount.value < totalCount.value,
);
const isExpanded = computed(
  () => expandedKeys.value.length > 0 && expandedKeys.value.length === totalCount.value,
);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!roleInfo.value?.id) {
      return;
    }
    modalApi.lock();
    try {
      await assignRoleMenu({
        roleId: roleInfo.value.id,
        menuIds: checkedMenuIds.value,
      });
      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<SystemRoleApi.Role>();
    roleInfo.value = data ?? null;
    checkedMenuIds.value = [];
    expandedKeys.value = [];

    if (!data?.id) {
      menuTree.value = [];
      allMenuIds.value = [];
      return;
    }

    modalApi.lock();
    try {
      await loadMenuTree();
      const menuIds = await getRoleMenuList(data.id);
      checkedMenuIds.value = Array.isArray(menuIds) ? menuIds : [];
      expandedKeys.value = getExpandNodeIds(menuTree.value);
      await nextTick();
      treeRef.value?.setCheckedKeys(checkedMenuIds.value, false);
    } finally {
      modalApi.unlock();
    }
  },
});

async function loadMenuTree() {
  menuLoading.value = true;
  try {
    const data = await getSimpleMenusList();
    menuTree.value = handleTree(data) as SystemMenuApi.Menu[];
    allMenuIds.value = getAllNodeIds(menuTree.value);
  } finally {
    menuLoading.value = false;
  }
}

function getAllNodeIds(nodes: SystemMenuApi.Menu[], ids: number[] = []): number[] {
  nodes.forEach((node) => {
    ids.push(node.id);
    if (node.children && node.children.length > 0) {
      getAllNodeIds(node.children as SystemMenuApi.Menu[], ids);
    }
  });
  return ids;
}

function getExpandNodeIds(nodes: SystemMenuApi.Menu[], ids: number[] = []): number[] {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      ids.push(node.id);
      getExpandNodeIds(node.children as SystemMenuApi.Menu[], ids);
    }
  });
  return ids;
}

function syncCheckedMenuIds() {
  checkedMenuIds.value = (treeRef.value?.getCheckedKeys(false) ?? []) as number[];
}

function handleCheck() {
  syncCheckedMenuIds();
}

function handleSelectAllChange(value: boolean | string | number) {
  const checked = Boolean(value);
  const nextKeys = checked ? [...allMenuIds.value] : [];
  checkedMenuIds.value = nextKeys;
  treeRef.value?.setCheckedKeys(nextKeys, false);
}

function handleExpandAll() {
  expandedKeys.value = isExpanded.value ? [] : getExpandNodeIds(menuTree.value);
}

function handleClearAll() {
  checkedMenuIds.value = [];
  treeRef.value?.setCheckedKeys([], false);
}
</script>

<template>
  <Modal title="权限设置" class="w-[860px] max-w-[92vw]">
    <div class="permission-dialog" v-loading="menuLoading">
      <div class="permission-dialog__header">
        <div>
          <div class="permission-dialog__title">{{ roleInfo?.name || '角色权限设置' }}</div>
          <div class="permission-dialog__desc">
            角色标识：{{ roleInfo?.code || '-' }}
          </div>
        </div>
        <div class="permission-dialog__summary">
          已选 <span>{{ selectedCount }}</span> / {{ totalCount }} 项
        </div>
      </div>

      <div class="permission-dialog__toolbar">
        <ElCheckbox
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="handleSelectAllChange"
        >
          全选
        </ElCheckbox>
        <button class="toolbar-btn toolbar-btn--primary" type="button" @click="handleExpandAll">
          {{ isExpanded ? '收起全部' : '展开全部' }}
        </button>
        <button class="toolbar-btn" type="button" @click="handleClearAll">清空</button>
      </div>

      <div class="permission-dialog__panel">
        <ElTree
          ref="treeRef"
          :data="menuTree"
          node-key="id"
          show-checkbox
          check-strictly
          default-expand-all
          :default-expanded-keys="expandedKeys"
          :expand-on-click-node="false"
          :check-on-click-node="true"
          :props="{ label: 'name', children: 'children' }"
          @check="handleCheck"
        >
          <template #default="{ data }">
            <div class="permission-node">
              <div class="permission-node__main">
                <span class="permission-node__name">{{ data.name }}</span>
                <span v-if="data.permission" class="permission-node__code">
                  {{ data.permission }}
                </span>
              </div>
              <span class="permission-node__meta">
                {{ data.path || data.component || '—' }}
              </span>
            </div>
          </template>
        </ElTree>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.permission-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 520px;
}

.permission-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.permission-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.permission-dialog__desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.permission-dialog__summary {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.permission-dialog__summary span {
  color: var(--el-color-primary);
  font-size: 18px;
  font-weight: 700;
}

.permission-dialog__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
}

.toolbar-btn {
  padding: 4px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
}

.toolbar-btn--primary {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.permission-dialog__panel {
  flex: 1;
  min-height: 0;
  padding: 12px 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-bg-color);
  overflow: auto;
}

.permission-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 34px;
  padding-right: 8px;
}

.permission-node__main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.permission-node__name {
  color: var(--el-text-color-primary);
}

.permission-node__code {
  display: inline-flex;
  max-width: 280px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.permission-node__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-tree-node__content) {
  height: 38px;
  border-radius: 8px;
}

:deep(.el-tree-node__content:hover) {
  background: var(--el-fill-color-light);
}
</style>
