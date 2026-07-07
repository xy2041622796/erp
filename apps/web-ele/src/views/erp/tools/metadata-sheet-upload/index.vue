<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { uploadFile } from '#/api/infra/file';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ErpMetadataSheetUpload' });

type MetaColumn = {
  key?: string;
  field?: string;
  prop?: string;
  code?: string;
  name?: string;
  title?: string;
  label?: string;
  header?: string;
  type?: string;
};

const metadataText = ref(`[
  { "key": "invoice_no", "title": "发票号", "type": "string" },
  { "key": "customer_name", "title": "客户名称", "type": "string" },
  { "key": "amount", "title": "金额", "type": "number" },
  { "key": "bill_date", "title": "开票日期", "type": "date" }
]`);

const rowsText = ref(`[
  {
    "invoice_no": "FP20260408001",
    "customer_name": "测试客户A",
    "amount": 1200.5,
    "bill_date": "2026-04-08"
  },
  {
    "invoice_no": "FP20260408002",
    "customer_name": "测试客户B",
    "amount": 980,
    "bill_date": "2026-04-07"
  }
]`);

const uploading = ref(false);
const uploadedFilePath = ref('');
const uploadedUrl = ref('');
const generatedFileName = ref('metadata-sheet.xls');

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const metadataList = computed<MetaColumn[]>(() => {
  const parsed = safeParse<MetaColumn[]>(metadataText.value, []);
  return Array.isArray(parsed) ? parsed : [];
});

const rowList = computed<Record<string, any>[]>(() => {
  const parsed = safeParse<Record<string, any>[]>(rowsText.value, []);
  return Array.isArray(parsed) ? parsed : [];
});

const tableColumns = computed(() => {
  return metadataList.value
    .map((item, index) => {
      const key = item.key || item.field || item.prop || item.code;
      const title = item.title || item.label || item.name || item.header || key;
      if (!key || !title) {
        return null;
      }
      return {
        key,
        title,
        type: (item.type || 'string').toLowerCase(),
        index,
      };
    })
    .filter(Boolean) as Array<{ key: string; title: string; type: string; index: number }>;
});

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeCellType(type: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return { type: 'String', value: '' };
  }

  if (type === 'number') {
    const num = Number(value);
    return Number.isFinite(num)
      ? { type: 'Number', value: String(num) }
      : { type: 'String', value: escapeXml(value) };
  }

  if (type === 'boolean') {
    const boolValue =
      value === true || value === 'true' || value === '1' || value === 1 ? '1' : '0';
    return { type: 'Boolean', value: boolValue };
  }

  if (type === 'date' || type === 'datetime') {
    const date = new Date(value as any);
    return Number.isNaN(date.getTime())
      ? { type: 'String', value: escapeXml(value) }
      : { type: 'DateTime', value: date.toISOString() };
  }

  return { type: 'String', value: escapeXml(value) };
}

function buildExcelXml() {
  const columns = tableColumns.value;
  const rows = rowList.value;

  if (!columns.length) {
    throw new Error('元数据不能为空，且必须能解析出列 key 和列标题');
  }

  const headerRow = `<Row>${columns
    .map(
      (column) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(column.title)}</Data></Cell>`,
    )
    .join('')}</Row>`;

  const dataRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const cell = normalizeCellType(column.type, row[column.key]);
          return `<Cell><Data ss:Type="${cell.type}">${cell.value}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1" />
   <Interior ss:Color="#D9EAF7" ss:Pattern="Solid" />
  </Style>
 </Styles>
 <Worksheet ss:Name="Sheet1">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

async function handleGenerateAndUpload() {
  try {
    uploading.value = true;
    uploadedFilePath.value = '';
    uploadedUrl.value = '';

    const xml = buildExcelXml();
    const blob = new Blob([xml], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    const file = new File([blob], generatedFileName.value || 'metadata-sheet.xls', {
      type: 'application/vnd.ms-excel',
    });

    const result = await uploadFile({
      file,
      directory: 'metadata-sheet',
      customPath: 'metadata-sheet',
      appType: 'wwwroot',
      isReplace: false,
      isCrossEnt: false,
    });

    uploadedFilePath.value = result.filePath || '';
    uploadedUrl.value = result.url || '';

    ElMessage.success(result.filePath ? 'Excel 已上传成功' : 'Excel 已生成，但接口未返回 filePath');
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '生成或上传失败');
  } finally {
    uploading.value = false;
  }
}

async function handleCopyFilePath() {
  if (!uploadedFilePath.value) {
    ElMessage.warning('暂无 filePath 可复制');
    return;
  }
  await navigator.clipboard.writeText(uploadedFilePath.value);
  ElMessage.success('filePath 已复制');
}
</script>

<template>
  <Page auto-content-height>
    <div class="space-y-4">
      <div class="rounded bg-white p-4">
        <div class="mb-3 text-lg font-semibold">元数据转 Excel 并上传</div>
        <div class="mb-2 text-sm text-gray-500">
          规则：元数据决定列，数据数组决定行；点击按钮后会生成 Excel 兼容 .xls 文件，并调用现有上传接口拿回 filePath。
        </div>

        <ElForm label-width="120px">
          <ElFormItem label="文件名">
            <ElInput v-model="generatedFileName" placeholder="请输入文件名，如 metadata-sheet.xls" />
          </ElFormItem>

          <ElFormItem label="元数据 JSON">
            <ElInput
              v-model="metadataText"
              type="textarea"
              :rows="10"
              placeholder="请输入元数据 JSON 数组"
            />
          </ElFormItem>

          <ElFormItem label="数据 JSON">
            <ElInput
              v-model="rowsText"
              type="textarea"
              :rows="12"
              placeholder="请输入行数据 JSON 数组"
            />
          </ElFormItem>

          <ElFormItem>
            <div class="flex gap-2">
              <ElButton type="primary" :loading="uploading" @click="handleGenerateAndUpload">
                生成 Excel 并上传
              </ElButton>
              <ElButton :disabled="!uploadedFilePath" @click="handleCopyFilePath">
                复制 filePath
              </ElButton>
            </div>
          </ElFormItem>
        </ElForm>
      </div>

      <div class="rounded bg-white p-4">
        <div class="mb-3 text-base font-semibold">预览</div>
        <ElTable :data="rowList" border style="width: 100%">
          <ElTableColumn
            v-for="column in tableColumns"
            :key="column.key"
            :prop="column.key"
            :label="column.title"
            min-width="160"
            show-overflow-tooltip
          />
        </ElTable>
      </div>

      <div class="rounded bg-white p-4">
        <div class="mb-3 text-base font-semibold">上传结果</div>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="filePath">
            {{ uploadedFilePath || '-' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="url">
            {{ uploadedUrl || '-' }}
          </ElDescriptionsItem>
        </ElDescriptions>
      </div>
    </div>
  </Page>
</template>
