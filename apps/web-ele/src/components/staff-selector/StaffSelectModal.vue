<script lang="ts" setup>
import type { Department, Staff } from '#/api/common/staff-selector';

import { nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';


import { getDepartmentList, getStaffList } from '#/api/common/staff-selector';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTree,
} from 'element-plus';

defineOptions({ name: 'StaffSelectModal' });

const props = withDefaults(
  defineProps<{
    multiple?: boolean;
    required?: boolean;
    value?: string | string[];
  }>(),
  {
    multiple: false,
    required: true,
    value: undefined,
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [value?: Staff | Staff[]];
}>();

const deptList = ref<Department[]>([]);
const deptTree = ref<Department[]>([]);
const staffList = ref<Staff[]>([]);
const loadingDepts = ref(false);
const loadingStaff = ref(false);

const selectedDeptId = ref<string>('');
const searchStaffName = ref('');
const searchDeptName = ref('');
const tableRef = ref<InstanceType<typeof ElTable>>();

const defaultProps = {
  children: 'children',
  label: 'DepName',
};

const selectedStaff = ref<null | Staff>(null);
const selectedStaffMap = ref<Record<string, Staff>>({});

function getValueIds() {
  return props.multiple
    ? Array.isArray(props.value)
      ? props.value.map((item) => String(item ?? '').trim()).filter(Boolean)
      : []
    : props.value
      ? [String(props.value).trim()]
      : [];
}

function buildTree(
  items: Department[],
  parentId: null | string = null,
): Department[] {
  const result: Department[] = [];
  const map = new Map<string, Department>();
  items.forEach((item) => {
    map.set(item.DepID, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = map.get(item.DepID);
    if (item.Prowid && map.has(item.Prowid) && item.Prowid !== item.DepID) {
      map.get(item.Prowid)!.children!.push(node!);
    } else {
      result.push(node!);
    }
  });
  return result;
}

function setInitialSelection() {
  const ids = getValueIds();
  if (props.multiple) {
    const nextMap: Record<string, Staff> = {};
    for (const id of ids) {
      const row = staffList.value.find((item) => item.ROWID === id);
      if (row) nextMap[id] = row;
    }
    selectedStaffMap.value = nextMap;
    selectedStaff.value = ids.length > 0 ? nextMap[ids[0]!] ?? null : null;
    return;
  }

  const row = ids.length > 0
    ? staffList.value.find((item) => item.ROWID === ids[0]!) ?? null
    : null;
  selectedStaff.value = row;
}

async function syncTableSelection() {
  await nextTick();
  const table = tableRef.value as any;
  if (!table) return;

  if (props.multiple) {
    table.clearSelection?.();
    const ids = new Set(Object.keys(selectedStaffMap.value));
    for (const row of staffList.value) {
      if (ids.has(row.ROWID)) {
        table.toggleRowSelection?.(row, true);
      }
    }
    return;
  }

  if (selectedStaff.value) {
    table.setCurrentRow?.(selectedStaff.value);
  } else {
    table.setCurrentRow?.();
  }
}

async function loadDepartments() {
  loadingDepts.value = true;
  try {
    const res = await getDepartmentList();
    const filtered = (res || []).filter((item) => String(item?.Prowid ?? '') !== "'");
    deptList.value = filtered;
    deptTree.value = buildTree(filtered);
  } finally {
    loadingDepts.value = false;
  }
}

async function loadStaff(deptId?: string) {
  loadingStaff.value = true;
  try {
    staffList.value = await getStaffList(deptId, searchStaffName.value);
    setInitialSelection();
    await syncTableSelection();
  } finally {
    loadingStaff.value = false;
  }
}

function handleNodeClick(data: Department) {
  selectedDeptId.value = data.DepID;
  loadStaff(data.DepID);
}

function handleStaffSearch() {
  loadStaff(selectedDeptId.value);
}

function handleStaffRowClick(row: Staff) {
  if (props.multiple) return;
  selectedStaff.value = row;
}

function handleSelectionChange(rows: Staff[]) {
  if (!props.multiple) return;
  const nextMap: Record<string, Staff> = {};
  for (const row of rows) {
    nextMap[row.ROWID] = row;
  }
  selectedStaffMap.value = nextMap;
  selectedStaff.value = rows[0] ?? null;
}

function handleStaffDblClick(row: Staff) {
  if (props.multiple) {
    const table = tableRef.value as any;
    table?.toggleRowSelection?.(row);
    return;
  }
  selectedStaff.value = row;
  handleConfirm();
}

function handleCancel() {
  modalApi.close();
  emit('cancel');
}

function handleConfirm() {
  if (props.multiple) {
    const rows = Object.values(selectedStaffMap.value);
    if (rows.length === 0 && props.required) {
      ElMessage.warning('请选择人员');
      return;
    }
    emit('confirm', rows);
    modalApi.close();
    return;
  }

  if (!selectedStaff.value && props.required) {
    ElMessage.warning('请选择一个人员');
    return;
  }
  emit('confirm', selectedStaff.value ?? undefined);
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  title: '选择人员',
  class: 'w-[800px]',
  draggable: true,
  zIndex: 4000,
  onOpenChange(isOpen) {
    if (isOpen) {
      searchDeptName.value = '';
      searchStaffName.value = '';
      selectedDeptId.value = '';
      selectedStaff.value = null;
      selectedStaffMap.value = {};
      if (deptList.value.length === 0) {
        loadDepartments();
      }
      loadStaff();
    }
  },
});
</script>
<template>
  <Modal>
    <div class="flex h-[500px] gap-4 p-4">
      <div class="flex h-full w-1/3 flex-col border-r pr-2">
        <div class="mb-2 font-bold">部门列表</div>
        <div class="flex-1 overflow-auto">
          <ElTree
            :data="deptTree"
            :props="defaultProps"
            @node-click="handleNodeClick"
            highlight-current
            default-expand-all
          />
        </div>
      </div>

      <div class="flex h-full flex-1 flex-col">
        <div class="mb-2 font-bold">人员列表</div>
        <div class="mb-2 flex gap-2">
          <ElInput
            v-model="searchStaffName"
            placeholder="输入姓名搜索"
            @keyup.enter="handleStaffSearch"
          >
            <template #prefix>
              <IconifyIcon icon="lucide:search" class="size-4" />
            </template>
          </ElInput>
          <ElButton type="primary" @click="handleStaffSearch">查询</ElButton>
        </div>

        <ElTable
          ref="tableRef"
          v-loading="loadingStaff"
          :data="staffList"
          border
          highlight-current-row
          class="flex-1"
          height="100%"
          :row-key="(row) => row.ROWID"
          @row-click="handleStaffRowClick"
          @row-dblclick="handleStaffDblClick"
          @selection-change="handleSelectionChange"
        >
          <ElTableColumn
            v-if="multiple"
            type="selection"
            width="55"
            reserve-selection
          />
          <ElTableColumn prop="UserName" label="姓名" width="120" />
          <ElTableColumn prop="DepName" label="部门" />
          <ElTableColumn prop="LoginName" label="登录名/工号" width="120" />
        </ElTable>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <div class="flex flex-1 items-center text-left text-gray-500">
          <span v-if="multiple">
            已选: {{ Object.values(selectedStaffMap).map((item) => item.UserName).join('、') || '未选择' }}
          </span>
          <span v-else-if="selectedStaff">已选: {{ selectedStaff.UserName }}</span>
          <span v-else>已选: 未选择</span>
        </div>
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton type="primary" @click="handleConfirm">确定</ElButton>
      </div>
    </template>
  </Modal>
</template>
