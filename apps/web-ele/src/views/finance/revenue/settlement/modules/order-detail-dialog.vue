<script lang="ts" setup>
import { ref } from 'vue';


import { getProduct } from '#/api/erp/product/product';
import { getSaleOrder } from '#/api/erp/sale/order';
import { getSaleOrderStatusMeta } from '#/views/erp/sale/order/data';
import { formatDateOnly } from '#/utils/date';

import { ElDialog, ElTable, ElTableColumn, ElTag } from 'element-plus';

const visible = ref(false);
const loading = ref(false);
const title = ref('订单详情');
const orderInfo = ref<any>(null);
const items = ref<any[]>([]);

async function enrichItems(rawItems: any[]) {
  const list = Array.isArray(rawItems) ? rawItems : [];
  return await Promise.all(
    list.map(async (item: any) => {
      const productId = String(item?.product_id || '').trim();
      let productDetail: any = null;
      if (productId) {
        try {
          productDetail = await getProduct(productId);
        } catch (error) {
          console.error('load product detail failed', productId, error);
        }
      }

      return {
        ...item,
        __product_name:
          item?.product_name || productDetail?.product_name || productId || '--',
        __unit:
          item?.product_unit_name ||
          productDetail?.unit ||
          item?.product_unit_id ||
          '--',
        __remark: item?.remark || item?.description || '--',
      };
    }),
  );
}

async function open(orderId?: string, orderNo?: string) {
  if (!orderId) return;
  visible.value = true;
  loading.value = true;
  title.value = `订单详情${orderNo ? ` - ${orderNo}` : ''}`;
  try {
    const detail = await getSaleOrder(orderId);
    orderInfo.value = detail || null;
    items.value = await enrichItems((detail as any)?.items || []);
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <ElDialog v-model="visible" :title="title" width="900px" append-to-body>
    <div v-loading="loading">
      <div class="mb-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span class="text-gray-500">订单号：</span>
          <span class="font-medium">{{ orderInfo?.no || '--' }}</span>
        </div>
        <div>
          <span class="text-gray-500">下单时间：</span>
          <span>{{ formatDateOnly(orderInfo?.order_time) || '--' }}</span>
        </div>
        <div>
          <span class="text-gray-500">数量合计：</span>
          <span>{{ orderInfo?.total_count ?? '--' }}</span>
        </div>
        <div>
          <span class="text-gray-500">状态：</span>
          <ElTag size="small" :type="getSaleOrderStatusMeta(orderInfo?.status)?.tagType || 'info'">
            {{ getSaleOrderStatusMeta(orderInfo?.status)?.label || '--' }}
          </ElTag>
        </div>
      </div>

      <ElTable :data="items" border size="small" style="width: 100%">
        <ElTableColumn type="index" label="#" width="60" />
        <ElTableColumn prop="__product_name" label="产品名称" min-width="220" />
        <ElTableColumn prop="count" label="数量" min-width="100" />
        <ElTableColumn prop="__unit" label="单位" min-width="100" />
        <ElTableColumn prop="__remark" label="备注" min-width="180" show-overflow-tooltip />
      </ElTable>
    </div>
  </ElDialog>
</template>
