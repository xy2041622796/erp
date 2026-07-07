<script setup lang="ts">
import type { CrmCustomerLeadApi } from '#/api/erp/customer/lead';

import { computed, ref, watch } from 'vue';

import { ElButton, ElCard, ElTabPane, ElTabs, ElTag } from 'element-plus';

import { getLead } from '#/api/erp/customer/lead';
import FollowRecordPanel from '#/views/erp/customer/detail/modules/follow-record-panel.vue';

import LeadForm from '../../modules/form.vue';
import ParticipantPanel from './participant-panel.vue';
import PoolLogPanel from './pool-log-panel.vue';

const props = withDefaults(
  defineProps<{
    leadId?: null | number | string;
    mode?: 'dialog' | 'route';
    readonlyPoolMode?: boolean;
  }>(),
  {
    leadId: null,
    mode: 'dialog',
    readonlyPoolMode: false,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const loading = ref(false);
const activeTab = ref('basic');
const lead = ref<CrmCustomerLeadApi.Lead | null>(null);
const participantPanelRef = ref<null | { reload: () => Promise<void> | void }>(
  null,
);
const participantPanelKey = ref(0);
const basicEditMode = ref(false);

const stageLabel = computed(() => {
  if (Number(lead.value?.leadStatus || 0) === 2) return '已转客户';
  if (Number(lead.value?.leadStatus || 0) === 3) return '已作废';
  if (Number(lead.value?.isPool || 0) === 1) return '线索公海';
  return '跟进中线索';
});
const allowEdit = computed(() => Number(lead.value?.leadStatus || 0) !== 2);
const allowFollow = computed(
  () =>
    Number(lead.value?.leadStatus || 0) === 1 &&
    Number(lead.value?.isPool || 0) === 0 &&
    !props.readonlyPoolMode,
);
const readonlyAllHistory = computed(
  () => Number(lead.value?.leadStatus || 0) === 2,
);
const participantReadonly = computed(
  () => Number(lead.value?.leadStatus || 0) === 2,
);
const canCreateParticipant = computed(
  () =>
    Number(lead.value?.leadStatus || 0) !== 2 &&
    !!String(lead.value?.rowid || '').trim(),
);
const basicFormMode = computed(() => (basicEditMode.value ? 'edit' : 'detail'));

async function loadLead() {
  if (!String(props.leadId || '').trim()) {
    lead.value = null;
    return;
  }
  loading.value = true;
  try {
    lead.value = await getLead(String(props.leadId || ''));
  } finally {
    loading.value = false;
  }
}

function rebuildParticipantPanel() {
  participantPanelKey.value += 1;
}

async function reloadParticipantPanel() {
  await participantPanelRef.value?.reload?.();
}

function openBasicEdit() {
  if (!allowEdit.value) return;
  basicEditMode.value = true;
}

async function handleBasicSaveSuccess() {
  basicEditMode.value = false;
  await loadLead();
  rebuildParticipantPanel();
  await reloadParticipantPanel();
  emit('saved');
}

function handleBasicClose() {
  if (basicEditMode.value) {
    basicEditMode.value = false;
    loadLead();
    return;
  }
  emit('close');
}

watch(
  () => props.leadId,
  async () => {
    basicEditMode.value = false;
    await loadLead();
    rebuildParticipantPanel();
    await reloadParticipantPanel();
  },
  { immediate: true },
);

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'participant') {
      await reloadParticipantPanel();
    }
  },
);
</script>

<template>
  <div v-loading="loading" class="lead-center-view">
    <div class="header-row">
      <div>
        <div class="lead-title">{{ lead?.leadName || '-' }}</div>
        <div class="lead-subtitle">线索编号：{{ lead?.leadCode || '-' }}</div>
        <div class="tag-row">
          <ElTag type="primary" effect="plain">{{ stageLabel }}</ElTag>
          <ElTag v-if="lead?.ownerUserName" type="info" effect="plain">
            负责人：{{ lead.ownerUserName }}
          </ElTag>
        </div>
      </div>
    </div>

    <ElCard shadow="never" class="tabs-card">
      <ElTabs v-model="activeTab">
        <ElTabPane label="基础信息" name="basic">
          <div class="basic-tab-content">
            <LeadForm
              :lead-data="lead"
              :mode="basicFormMode as any"
              @close="handleBasicClose"
              @save-success="handleBasicSaveSuccess"
            />
            <div v-if="!basicEditMode" class="basic-action-row">
              <ElButton v-if="allowEdit" type="primary" @click="openBasicEdit">
                编辑基础信息
              </ElButton>
            </div>
          </div>
        </ElTabPane>
        <ElTabPane label="跟进记录" name="follow">
          <FollowRecordPanel
            biz-type="LEAD"
            :biz-id="lead?.rowid"
            :biz-code="lead?.leadCode"
            :biz-name="lead?.leadName"
            :lead-id="lead?.rowid"
            :customer-id="lead?.customerId"
            :customer-code="lead?.customerCode"
            :owner-user-id="lead?.ownerUserId"
            :allow-create="allowFollow"
            :readonly-all-history="readonlyAllHistory"
            @updated="loadLead"
          />
        </ElTabPane>
        <ElTabPane label="参与人列表" name="participant">
          <ParticipantPanel
            :key="`main-${participantPanelKey}-${lead?.rowid || ''}`"
            ref="participantPanelRef"
            :lead-id="lead?.rowid"
            :lead-code="lead?.leadCode"
            :lead-name="lead?.leadName"
            :readonly="participantReadonly"
            :allow-create="canCreateParticipant"
            @updated="emit('saved')"
          />
        </ElTabPane>
        <ElTabPane label="转化记录" name="log">
          <PoolLogPanel :lead-id="lead?.rowid" />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<style scoped>
.lead-center-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-row,
.tag-row,
.basic-action-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.lead-title {
  font-size: 22px;
  font-weight: 700;
}

.lead-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tag-row {
  justify-content: flex-start;
  margin-top: 10px;
}

.tabs-card {
  border-radius: 14px;
}

.basic-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.basic-action-row {
  justify-content: flex-end;
}
</style>
