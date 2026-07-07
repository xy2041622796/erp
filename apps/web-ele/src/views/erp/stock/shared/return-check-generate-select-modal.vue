<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElButton, ElCheckbox, ElOption, ElSelect, ElTag } from 'element-plus';

const emit = defineEmits(['success']);

const title = ref('选择生成范围');
const warehouseOptions = ref<
  Array<{ warehouseId: string; warehouseName?: string; count?: number }>
>([]);
const items = ref<any[]>([]);
const selectedWarehouseId = ref('');
const selectedItemIds = ref<string[]>([]);

const currentItems = computed(() =>
  items.value.filter(
    (item) =>
      String(item.warehouse_id || '') ===
      String(selectedWarehouseId.value || ''),
  ),
);
const allChecked = computed(
  () =>
    currentItems.value.length > 0 &&
    currentItems.value.every((item) =>
      selectedItemIds.value.includes(String(item.check_item_id || '')),
    ),
);

function syncSelectedByWarehouse(warehouseId: string) {
  selectedWarehouseId.value = String(warehouseId || '');
  selectedItemIds.value = currentItems.value.map((item) =>
    String(item.check_item_id || ''),
  );
}

function handleToggleAll(val: boolean) {
  if (!selectedWarehouseId.value) return;
  if (val) {
    selectedItemIds.value = currentItems.value.map((item) =>
      String(item.check_item_id || ''),
    );
    return;
  }
  selectedItemIds.value = [];
}

function handleToggleItem(checkItemId: string, checked: boolean) {
  const id = String(checkItemId || '');
  if (!id) return;
  if (checked) {
    if (!selectedItemIds.value.includes(id)) selectedItemIds.value.push(id);
    return;
  }
  selectedItemIds.value = selectedItemIds.value.filter((item) => item !== id);
}

async function handleConfirm() {
  if (!selectedWarehouseId.value) return;
  if (selectedItemIds.value.length <= 0) return;
  await modalApi.close();
  emit('success', {
    warehouseId: selectedWarehouseId.value,
    checkItemIds: [...selectedItemIds.value],
  });
}

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      title.value = '选择生成范围';
      warehouseOptions.value = [];
      items.value = [];
      selectedWarehouseId.value = '';
      selectedItemIds.value = [];
      return;
    }
    const data = modalApi.getData<any>();
    title.value = String(data?.title || '选择生成范围');
    warehouseOptions.value = Array.isArray(data?.warehouseOptions)
      ? data.warehouseOptions
      : [];
    items.value = Array.isArray(data?.items) ? data.items : [];
    const firstWarehouseId = String(
      data?.defaultWarehouseId || warehouseOptions.value[0]?.warehouseId || '',
    );
    syncSelectedByWarehouse(firstWarehouseId);
  },
});
</script>

<template>
  <Modal
    :title="title"
    class="w-[780px]"
    content-class="pt-0"
    :show-confirm-button="false"
    :show-cancel-button="false"
    :close-on-click-modal="false"
  >
    <div class="modal-top-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton
        type="primary"
        :disabled="!selectedWarehouseId || selectedItemIds.length <= 0"
        @click="handleConfirm"
        >确认</ElButton
      >
    </div>
    <div class="px-4">
      <div class="mb-4 grid grid-cols-[140px_1fr] items-center gap-3">
        <div class="text-sm font-medium">处理仓库</div>
        <ElSelect
          :model-value="selectedWarehouseId"
          class="w-full"
          @update:model-value="syncSelectedByWarehouse(String($event || ''))"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.warehouseId"
            :label="`${item.warehouseName || item.warehouseId}（${item.count || 0}）`"
            :value="item.warehouseId"
          />
        </ElSelect>
      </div>

      <div class="mb-3 flex items-center justify-between">
        <ElCheckbox
          :model-value="allChecked"
          @update:model-value="handleToggleAll(Boolean($event))"
          >全选当前仓库产品</ElCheckbox
        >
        <div class="text-xs text-[#999]">
          请先选仓库，再勾选要生成的产品明细
        </div>
      </div>

      <div class="max-h-[420px] overflow-auto rounded border border-[#ebeef5]">
        <table class="w-full text-sm">
          <thead class="bg-[#fafafa]">
            <tr>
              <th class="w-[60px] px-3 py-2 text-left">选择</th>
              <th class="px-3 py-2 text-left">产品</th>
              <th class="w-[120px] px-3 py-2 text-left">数量</th>
              <th class="w-[160px] px-3 py-2 text-left">处理仓库</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in currentItems"
              :key="row.check_item_id"
              class="border-t border-[#f0f0f0]"
            >
              <td class="px-3 py-2 align-top">
                <ElCheckbox
                  :model-value="
                    selectedItemIds.includes(String(row.check_item_id || ''))
                  "
                  @update:model-value="
                    handleToggleItem(
                      String(row.check_item_id || ''),
                      Boolean($event),
                    )
                  "
                />
              </td>
              <td class="px-3 py-2 align-top">
                <div>{{ row.product_name || '-' }}</div>
                <div class="mt-1 text-xs text-[#999]">
                  {{ row.product_bar_code || '' }}
                </div>
              </td>
              <td class="px-3 py-2 align-top">{{ row.generate_count || 0 }}</td>
              <td class="px-3 py-2 align-top">
                <ElTag type="info">{{
                  row.warehouse_name || row.warehouse_id
                }}</ElTag>
              </td>
            </tr>
            <tr v-if="currentItems.length <= 0">
              <td colspan="4" class="px-3 py-8 text-center text-[#999]">
                当前仓库下暂无可生成产品
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.modal-top-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 0;
  background: #fff;
}
</style>
