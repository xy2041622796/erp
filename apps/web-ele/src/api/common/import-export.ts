import { baseApiUrl, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export interface TableRequestConfig {
  formId: string;
  tableName: string;
  dbName: string;
  primaryKey: string;
}

export interface ImportExcelConfig extends TableRequestConfig {
  file: File;
  encodingId: string;
  customPath: string;
  isReplace?: boolean | string;
  isCrossEnt?: boolean | string;
  extraData?: Record<string, any>;
}

export interface ExportExcelConfig extends TableRequestConfig {
  fileName: string;
  encodingId: string;
  extraData?: Record<string, any>;
}

export interface TableDownloadConfig extends TableRequestConfig {
  url: string;
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
  data?: FormData | Record<string, any>;
}

function createTable(config: TableRequestConfig) {
  return new DataTable(
    config.formId,
    config.tableName,
    config.dbName,
    config.primaryKey,
  );
}

function normalizeBooleanString(
  value: boolean | string | undefined,
  defaultValue: boolean,
) {
  if (typeof value === 'string') {
    return value;
  }
  return String(value ?? defaultValue);
}

function unwrapDownloadBlob(result: any): Blob {
  if (result instanceof Blob) return result;
  if (result?.data instanceof Blob) return result.data;
  if (result?.data?.data instanceof Blob) return result.data.data;
  if (result?.data?.Result instanceof Blob) return result.data.Result;
  if (result?.data?.raw instanceof Blob) return result.data.raw;
  if (result?.Result instanceof Blob) return result.Result;
  if (result?.raw instanceof Blob) return result.raw;
  return result as Blob;
}

/**
 * 通用 Excel 导入请求。
 * 通过传入不同表配置和导入参数，复用 File/importExcel。
 */
export async function importExcelByConfig(config: ImportExcelConfig) {
  const table = createTable(config);
  const headers = table.getRequestHeader();
  delete headers['Content-Type'];

  const payload = {
    upCtrl_Input: config.file,
    encodingId: config.encodingId,
    customPath: config.customPath,
    isReplace: normalizeBooleanString(config.isReplace, false),
    isCrossEnt: normalizeBooleanString(config.isCrossEnt, false),
    ...(config.extraData || {}),
  };

  return await requestClient.upload(`${baseApiUrl}File/importExcel`, payload, {
    headers,
  });
}

/**
 * 通用 Excel 导出请求。
 * 使用 requestClient.post + FormData 方式调用 File/ExportExcel。
 */
export async function exportExcelByConfig(
  config: ExportExcelConfig,
): Promise<Blob> {
  const table = createTable(config);
  const headers = table.getRequestHeader();
  delete headers['Content-Type'];

  const formData = new FormData();
  formData.append('fileName', config.fileName);
  formData.append('encodingId', config.encodingId);

  Object.entries(config.extraData || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, String(value));
  });

  const result = await requestClient.post(
    `${baseApiUrl}File/ExportExcel`,
    formData,
    {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      responseReturn: 'raw',
    },
  );

  return unwrapDownloadBlob(result);
}

/**
 * 通用带表头的下载请求。
 * 通过传入不同表配置和 URL/参数，复用导出、模板下载等下载类接口。
 */
export function downloadByTableConfig(config: TableDownloadConfig) {
  const table = createTable(config);
  return requestClient.download(config.url, {
    method: config.method || 'GET',
    params: config.params,
    data: config.data,
    headers: table.getRequestHeader(),
  });
}
