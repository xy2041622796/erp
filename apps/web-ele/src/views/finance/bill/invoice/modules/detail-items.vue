<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilInvoiceDetailApi } from '#/api/erp/finance/bill/invoice/details';
import type { ErpProductApi } from '#/api/erp/product/product';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  generateUUID,
} from '@vben/utils';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  addMoney,
  divMoney,
  moneyNumber,
  mulMoney,
  sumByMoney,
  toDecimal,
} from '#/utils/finance/decimal-money';

import { useDetailColumns } from '#/views/finance/bill/invoice/modules/dialogData';

import { ElButton, ElInput, ElInputNumber, ElSelect } from 'element-plus';

interface Props {
  modelValue?: BilInvoiceDetailApi.InvoiceDetail[];
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  readonly: false,
});

const emit = defineEmits<{
  'update:modelValue': [v: BilInvoiceDetailApi.InvoiceDetail[]];
  'update:totalAmount': [v: number];
}>();

const tableData = ref<
  (BilInvoiceDetailApi.InvoiceDetail & { _max_product_num?: number })[]
>([]);
const productOptions = ref<ErpProductApi.Product[]>([]);

// 冻结初始值：在切换单据（全部是新数据）时记录 product_num 作为上限
const frozenProductNumByRowId = ref<Map<string, number>>(new Map());

function getRowId(row: BilInvoiceDetailApi.InvoiceDetail) {
  const id = (row as any)?.rowid;
  return id === undefined || id === null ? '' : String(id);
}

function clampProductNum(row: BilInvoiceDetailApi.InvoiceDetail) {
  const max = (row as any).product_num;
  if (max === undefined) return;

  const current = toDecimal(row.product_num);
  if (current.greaterThan(toDecimal(max))) {
    row.product_num = max as any;
  }
}

function toNumber(v: any, fallback = 0) {
  return toDecimal(v ?? fallback).toNumber();
}

function recalcRow(row: BilInvoiceDetailApi.InvoiceDetail) {
  row.invoice_amount = moneyNumber(mulMoney(row.product_num, row.price));
  row.tax_amount = moneyNumber(
    divMoney(mulMoney(row.invoice_amount, row.tax_rate), 100),
  );
  row.total_amount = moneyNumber(
    addMoney([row.invoice_amount, row.tax_amount]),
  );
}

function emitAll() {
  emit('update:modelValue', [...tableData.value]);
  emit('update:totalAmount', summaries.value.totalAmount);
}

function handleAdd() {
  const row: BilInvoiceDetailApi.InvoiceDetail = {
    rowid: generateUUID(),
    product_id: undefined,
    product_num: 1,
    invoice_content: undefined,
    invoice_amount: 0,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 0,
  };
  tableData.value.push(row);
  gridApi.grid?.reloadData(tableData.value);
  emitAll();
}

// 删除没有key 导致报错
function handleDelete(row: BilInvoiceDetailApi.InvoiceDetail) {
  const rowId = getRowId(row);
  let idx = -1;
  if (rowId) {
    idx = tableData.value.findIndex((item) => getRowId(item) === rowId);
  }
  if (idx === -1) {
    idx = tableData.value.indexOf(row);
  }
  if (idx !== -1) {
    tableData.value.splice(idx, 1);
    gridApi.grid?.reloadData(tableData.value);
    emitAll();
  }
}

function handleProductChange(
  productId: any,
  row: BilInvoiceDetailApi.InvoiceDetail,
) {
  const pid = String(productId ?? '').trim();
  row.product_id = pid || undefined;

  const product = productOptions.value.find(
    (p: any) => String(p.rowid) === pid,
  );
  if (product && !row.invoice_content) {
    // 默认用产品名称带出开票内容
    row.invoice_content = (product as any).product_name || undefined;
  }

  recalcRow(row);
  emitAll();
}

function handleRowChange(row: BilInvoiceDetailApi.InvoiceDetail) {
  clampProductNum(row);
  recalcRow(row);
  emitAll();
}

const summaries = computed(() => {
  return {
    totalAmount: moneyNumber(
      sumByMoney(tableData.value, (r) => r.total_amount),
    ),
  };
});

const columns: VxeTableGridOptions['columns'] = useDetailColumns();

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns,
    data: tableData.value,
    minHeight: 260,
    autoResize: true,
    border: true,
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    pagerConfig: { enabled: false },
    toolbarConfig: { enabled: false },
  } as VxeTableGridOptions,
});

watch(
  () => props.modelValue,
  async (items) => {
    const newItems = [...(items ?? [])].map((r: any) => ({
      ...r,
      rowid: r.rowid ? String(r.rowid) : generateUUID(),
    }));

    if (newItems.length === 0) {
      frozenProductNumByRowId.value.clear();
      tableData.value = [];
      emit('update:totalAmount', 0);
      return;
    }

    // 检查新数据中是否有已记录的 rowid
    let matchCount = 0;
    for (const r of newItems) {
      if (r.rowid && frozenProductNumByRowId.value.has(r.rowid)) {
        matchCount++;
      }
    }

    // 如果完全没有重合（说明是新的一波数据，例如切换单据或首次加载）
    // 此时重置冻结记录
    if (matchCount === 0) {
      frozenProductNumByRowId.value.clear();
      for (const r of newItems) {
        // 只冻结那些看起来是有效回填数据的行（有 product_id）
        // 避免冻结手动新增的空行（无 product_id）
        if (r.rowid && r.product_id) {
          frozenProductNumByRowId.value.set(
            r.rowid,
            toNumber((r as any).product_num),
          );
        }
      }
    }

    // 回填最大值字段
    for (const r of newItems) {
      if (r.rowid && frozenProductNumByRowId.value.has(r.rowid)) {
        (r as any)._max_product_num = frozenProductNumByRowId.value.get(
          r.rowid,
        );
      } else {
        (r as any)._max_product_num = undefined;
      }
    }

    tableData.value = newItems;

    // 兜底：外部回填后也要保证不超过冻结值
    for (const r of tableData.value) clampProductNum(r);

    // 初始化时补算
    for (const r of tableData.value) recalcRow(r);

    await nextTick();
    await gridApi.grid?.reloadData(tableData.value);

    // 外部回填时同步一次合计
    emit('update:totalAmount', summaries.value.totalAmount);
  },
  { immediate: true },
);

function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const r = tableData.value[i];
    if (!r) continue;

    if (!r.product_id) throw new Error(`第 ${i + 1} 行：请选择商品`);

    const num = toNumber(r.product_num);
    if (!Number.isFinite(num) || num <= 0)
      throw new Error(`第 ${i + 1} 行：数量必须大于 0`);

    const amount = toNumber(r.invoice_amount);
    if (!Number.isFinite(amount) || amount < 0)
      throw new Error(`第 ${i + 1} 行：未税金额不能为负数`);

    const rate = toNumber(r.tax_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      throw new Error(`第 ${i + 1} 行：税率必须在 0-100 之间`);
  }
}

defineExpose({ validate, handleAdd });

onMounted(async () => {
  const list = await getProductSimpleList();
  productOptions.value = (Array.isArray(list) ? list : []) as any;

  if (!props.readonly && tableData.value.length === 0) handleAdd();
});
</script>

<template>
  <div class="w-full">
    <Grid class="w-full">
      <template #product_id="{ row }">
        <ElSelect
          v-if="!readonly"
          v-model="row.product_id"
          :options="productOptions"
          :props="{ label: 'product_name', value: 'rowid' }"
          filterable
          class="w-full"
          disabled
          placeholder="请选择单据"
          @change="handleProductChange($event, row)"
        />
        <span v-else>
          {{
            productOptions.find(
              (p: any) => String(p.rowid) === String(row.product_id),
            )?.product_name ||
            row.product_id ||
            '-'
          }}
        </span>
      </template>

      <template #product_num="{ row }">
        <ElInputNumber
          v-if="!readonly"
          v-model="row.product_num"
          :min="0"
          :max="row._max_product_num ?? Infinity"
          :precision="3"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ erpCountInputFormatter(row.product_num) || '-' }}</span>
      </template>

      <template #invoice_content="{ row }">
        <ElInput
          v-if="!readonly"
          v-model="row.invoice_content"
          placeholder="请选输入备注"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.invoice_content || '-' }}</span>
      </template>

      <template #invoice_amount="{ row }">
        <ElInputNumber
          v-if="!readonly"
          v-model="row.invoice_amount"
          :min="0"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{
          erpPriceInputFormatter(row.invoice_amount) || '-'
        }}</span>
      </template>

      <template #tax_rate="{ row }">
        <ElInputNumber
          v-if="!readonly"
          v-model="row.tax_rate"
          :min="0"
          :max="100"
          :precision="2"
          controls-position="right"
          class="!w-full"
          @change="handleRowChange(row)"
        />
        <span v-else>{{ row.tax_rate ?? '-' }}</span>
      </template>

      <template #tax_amount="{ row }">
        <span>{{ erpPriceInputFormatter(row.tax_amount) || '-' }}</span>
      </template>

      <template #total_amount="{ row }">
        <span>{{ erpPriceInputFormatter(row.total_amount) || '-' }}</span>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="!readonly"
          type="danger"
          link
          @click="handleDelete(row)"
        >
          删除
        </ElButton>
        <span v-else class="text-muted-foreground">--</span>
      </template>

      <template #bottom>
        <div class="border-border bg-muted mt-2 rounded border p-2">
          <div class="text-muted-foreground flex justify-between text-sm">
            <span class="text-foreground font-medium">合计：</span>
            <div>
              本次开票申请价税合计：{{
                erpPriceInputFormatter(summaries.totalAmount)
              }}
            </div>
          </div>
        </div>
      </template>
    </Grid>
  </div>
</template>
