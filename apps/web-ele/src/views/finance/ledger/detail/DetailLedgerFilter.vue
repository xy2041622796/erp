<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';

import {
  ElButton,
  ElCheckbox,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElPopover,
  ElRadio,
  ElRadioGroup,
} from 'element-plus';


export type DetailLedgerFilterParams = {
  periodStart: string;
  periodEnd: string;
  startSubject: string;
  endSubject: string;
  subjectLevelStart: number;
  subjectLevelEnd: number;
  summary: string;
  sortBy: 'voucherDate' | 'voucherNo';
  showAssistAccounting: boolean;
  onlyShowLowestDetail: boolean;
  showOppositeDirectionSubjects: boolean;
  hideZeroBalance: boolean;
  hideNoOccurrenceAndZeroBalance: boolean;
  hideNoOccurrenceSummaryRows: boolean;
};

const props = withDefaults(defineProps<{
  value: DetailLedgerFilterParams;
  embedded?: boolean;
}>(), {
  embedded: false,
});

const emit = defineEmits<{
  confirm: [params: DetailLedgerFilterParams];
}>();

const popoverVisible = defineModel<boolean>('visible', { default: false });

const form = reactive<DetailLedgerFilterParams>({ ...props.value });

watch(
  () => props.value,
  (value) => {
    Object.assign(form, value || {});
  },
  { deep: true, immediate: true },
);

const periodText = computed(() => {
  const start = String(props.value?.periodStart || '').trim();
  const end = String(props.value?.periodEnd || '').trim();
  if (!start && !end) return '未选择期间';
  if (start && end && start !== end) return `${start} 至 ${end}`;
  return start || end;
});

const periodRange = computed<[string, string]>({
  get() {
    const start = String(form.periodStart || form.periodEnd || '').trim();
    const end = String(form.periodEnd || form.periodStart || '').trim();
    return [start, end];
  },
  set(value) {
    const [start = '', end = ''] = Array.isArray(value) ? value : [];
    form.periodStart = String(start || '').trim();
    form.periodEnd = String(end || start || '').trim();
  },
});

function normalizePeriod() {
  const start = String(form.periodStart || '').trim();
  const end = String(form.periodEnd || '').trim();

  if (!start && end) {
    form.periodStart = end;
    return;
  }
  if (!end && start) {
    form.periodEnd = start;
    return;
  }
  if (start && end && start > end) {
    form.periodStart = end;
    form.periodEnd = start;
  }
}

function handleConfirm() {
  normalizePeriod();

  emit('confirm', {
    ...form,
    periodStart: String(form.periodStart || '').trim(),
    periodEnd: String(form.periodEnd || '').trim(),
  });
  popoverVisible.value = false;
}

function handleCancel() {
  Object.assign(form, props.value || {});
  popoverVisible.value = false;
}

function handleReset() {
  Object.assign(form, {
    ...props.value,
    startSubject: '',
    endSubject: '',
    subjectLevelStart: 1,
    subjectLevelEnd: 4,
    summary: '',
    sortBy: 'voucherNo',
    showAssistAccounting: false,
    onlyShowLowestDetail: false,
    showOppositeDirectionSubjects: false,
    hideZeroBalance: false,
    hideNoOccurrenceAndZeroBalance: false,
    hideNoOccurrenceSummaryRows: false,
  });
}
</script>

<template>
  <div
    :class="
      embedded
        ? 'inline-flex'
        : 'rounded-md border border-border bg-card px-3 py-2 shadow-sm'
    "
  >
    <div
      :class="
        embedded
          ? 'inline-flex'
          : 'flex w-full items-center justify-between gap-3'
      "
    >
      <div v-if="!embedded" class="flex min-w-0 items-center gap-3">
        <span class="shrink-0 text-sm text-muted-foreground">会计期间：</span>
        <span class="truncate text-sm font-medium">{{ periodText }}</span>
      </div>

      <ElPopover
        v-model:visible="popoverVisible"
        trigger="click"
        placement="bottom-end"
        :width="660"
        :show-arrow="true"
      >
        <template #reference>
          <slot name="reference">
            <div class="cursor-pointer select-none text-sm text-primary">筛选条件</div>
          </slot>
        </template>

        <div class="p-1">
          <div class="grid grid-cols-[88px_1fr] items-center gap-x-3 gap-y-4 text-sm">
            <div class="text-right text-muted-foreground">会计期间：</div>
            <div>
              <ElDatePicker
                v-model="periodRange"
                type="monthrange"
                value-format="YYYY-MM"
                range-separator="至"
                start-placeholder="开始期间"
                end-placeholder="结束期间"
                class="w-[360px]"
                :teleported="false"
              />
            </div>

            <div class="text-right text-muted-foreground">起始科目：</div>
            <div>
              <ElInput v-model="form.startSubject" placeholder="请输入起始科目" />
            </div>

            <div class="text-right text-muted-foreground">结束科目：</div>
            <div>
              <ElInput v-model="form.endSubject" placeholder="请输入结束科目" />
            </div>

            <div class="text-right text-muted-foreground">科目级别：</div>
            <div class="flex items-center gap-2">
              <ElInputNumber v-model="form.subjectLevelStart" :min="1" :max="10" class="w-[110px]" />
              <span>至</span>
              <ElInputNumber v-model="form.subjectLevelEnd" :min="1" :max="10" class="w-[110px]" />
            </div>

            <div class="text-right text-muted-foreground">摘要：</div>
            <div>
              <ElInput v-model="form.summary" placeholder="请输入摘要" />
            </div>

            <div class="text-right text-muted-foreground">排序方式：</div>
            <div>
              <ElRadioGroup v-model="form.sortBy">
                <ElRadio value="voucherNo">月份+凭证号排序</ElRadio>
                <ElRadio value="voucherDate">凭证日期排序</ElRadio>
              </ElRadioGroup>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 pl-[91px] text-sm">
            <ElCheckbox v-model="form.showAssistAccounting">显示辅助核算</ElCheckbox>
            <ElCheckbox v-model="form.onlyShowLowestDetail">只显示最明细科目</ElCheckbox>
            <ElCheckbox v-model="form.showOppositeDirectionSubjects">显示对方科目</ElCheckbox>
            <ElCheckbox v-model="form.hideZeroBalance">余额为0不显示</ElCheckbox>
            <ElCheckbox v-model="form.hideNoOccurrenceAndZeroBalance">
              无发生额且余额为0不显示
            </ElCheckbox>
            <ElCheckbox v-model="form.hideNoOccurrenceSummaryRows">
              无发生额不显示本期合计、本年累计
            </ElCheckbox>
          </div>

          <div class="mt-5 flex items-center gap-3 pl-[91px]">
            <ElButton type="primary" @click="handleConfirm">确定</ElButton>
            <ElButton @click="handleCancel">取消</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </div>
        </div>
      </ElPopover>
    </div>
  </div>
</template>
