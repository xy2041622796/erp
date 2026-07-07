import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { getStoredAccountSetId } from '#/utils/accountSet';

export const ARCHIVES_FORM_ID = '0AF897A90D492E985BB6692EEA84E820';
export const ARCHIVES_DB_NAME = 'LMBill';
export const CATEGORY_TABLE_NAME = 'file_BarInfo';
export const ATTACHMENT_TABLE_NAME = 'file_FJ';
export const CATEGORY_PRIMARY_KEY = 'rowid';
export const ATTACHMENT_PRIMARY_KEY = 'id';
export const ROOT_PARENT_ID = '000000';
export const ATTACHMENT_CATEGORY_FIELD = 'pid';
export const ATTACHMENT_OWNER_TYPE = '档案资料管理';

export interface ArchiveCategory {
  rowid: string;
  Name?: string;
  Prowid?: string;
  type?: number | string | null;
  account_set_id?: string | null;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  children?: ArchiveCategory[];
}

export interface ArchiveFile {
  id: string;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  owner_type?: string;
  file_type?: string;
  file_size?: number;
  file_path?: string;
  file_name?: string;
  status?: number | string | null;
  pid?: string;
  account_set_id?: string | null;
}

export interface ArchiveFileUploadResult {
  filePath: string;
  raw?: any;
  url?: string;
}

function createCategoryTable() {
  const table = createFinanceDataTableCurrent(
    ARCHIVES_FORM_ID,
    CATEGORY_TABLE_NAME,
    ARCHIVES_DB_NAME,
    CATEGORY_PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function createAttachmentTable() {
  const table = createFinanceDataTableCurrent(
    ARCHIVES_FORM_ID,
    ATTACHMENT_TABLE_NAME,
    ARCHIVES_DB_NAME,
    ATTACHMENT_PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function unwrapItems(resQuery: any) {
  return resQuery?.data?.Result?.data?.Items || resQuery?.data?.Result?.data || [];
}

export function getCurrentAccountSetId() {
  return String(getStoredAccountSetId() || '').trim();
}

export async function getArchiveCategories() {
  const table = createCategoryTable();
  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  } as any;
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = unwrapItems(resQuery) as ArchiveCategory[];
  return { dataTable: table, list: items };
}

export async function createArchiveCategory(data: ArchiveCategory) {
  const table = createCategoryTable();
  const saveParam = table.getSaveParam([data], [], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function updateArchiveCategory(data: Pick<ArchiveCategory, 'Name' | 'rowid'>) {
  const table = createCategoryTable();
  const saveParam = table.getSaveParam([], [data], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function deleteArchiveCategory(rowid: string) {
  const table = createCategoryTable();
  const saveParam = table.getSaveParam([], [], [{ rowid }]);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function getArchiveFiles(params: {
  categoryId?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createAttachmentTable();
  const conditions: any[] = [];
  if (params.categoryId) {
    conditions.push(cond(ATTACHMENT_CATEGORY_FIELD, 'equal', params.categoryId));
  }
  conditions.push(cond('lingma_sys_is_delete', 'notequal', 1));
  table.Filter = and(...conditions);

  const queryParam = {
    Table: [table],
    PageParam: {
      page: params.page || 20,
      index: params.pageNo || 1,
    },
  } as any;
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const data = resQuery?.data?.Result?.data || {};
  return {
    dataTable: table,
    list: (data.Items || []) as ArchiveFile[],
    total: Number(data.Count || 0),
  };
}

export async function createArchiveFile(data: ArchiveFile) {
  const table = createAttachmentTable();
  const saveParam = table.getSaveParam([data], [], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function deleteArchiveFile(id: string) {
  const table = createAttachmentTable();
  const saveParam = table.getSaveParam([], [], [{ id }]);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function uploadArchiveFile(file: File) {
  const table = createAttachmentTable();
  const headers = table.getRequestHeader();
  delete headers['Content-Type'];
  const data = {
    upCtrl_Input: file,
    customPath: 'archives-data-management',
    appType: 'wwwroot',
    isReplace: 'false',
    isCrossEnt: 'true',
  };
  const res = await requestClient.upload(table.uploadUrl, data, { headers });
  const first = Array.isArray(res) ? res[0] : res;
  const filePath = normalizeDownloadPath(first?.filePath || '');
  return {
    filePath,
    url: filePath ? `/api/${filePath}` : '',
    raw: res,
  } as ArchiveFileUploadResult;
}

function normalizeDownloadPath(value: string) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function splitStoredFilePath(filePath: string) {
  const normalized = normalizeDownloadPath(filePath);
  const parts = normalized.split('/').filter(Boolean);
  const storedFileName = parts.pop() || '';
  const customPath = parts.length > 0 ? parts.join('/') : '';
  return { customPath, storedFileName };
}

async function isInvalidDownloadBlob(blob: Blob) {
  if (!(blob instanceof Blob)) return false;
  const contentType = String(blob.type || '').toLowerCase();
  if (contentType.includes('json') || contentType.includes('text/html')) return true;
  if (blob.size === 0) return true;
  if (blob.size > 256 * 1024) return false;
  try {
    const text = (await blob.text()).trim().toLowerCase();
    return text.startsWith('{') || text.startsWith('[') || text.startsWith('<!doctype') || text.startsWith('<html');
  } catch {
    return false;
  }
}

function unwrapDownloadBlob(result: any): Blob {
  if (result instanceof Blob) return result;
  if (result?.data instanceof Blob) return result.data;
  if (result?.Result instanceof Blob) return result.Result;
  if (result?.raw instanceof Blob) return result.raw;
  return result as Blob;
}

async function requestDownloadFile(params: { customPath: string; fileName: string }) {
  const table = createAttachmentTable();
  const result = await requestClient.download('/api/File/DownFile', {
    method: 'POST',
    data: {
      ...params,
      customPath: normalizeDownloadPath(params.customPath),
      appType: 'wwwroot',
      isCrossEnt: true,
    },
    headers: table.getRequestHeader(),
  });
  return unwrapDownloadBlob(result);
}

export async function downloadArchiveFile(fileName: string, filePath: string) {
  // 第一种：完全对齐客户信息管理附件下载，fileName=原始文件名，customPath=file_path。
  const firstBlob = await requestDownloadFile({ fileName, customPath: filePath });
  if (!(await isInvalidDownloadBlob(firstBlob))) return firstBlob;

  // 第二种：兼容部分存储路径需要“目录 + 实际存储文件名”的下载接口。
  const { customPath, storedFileName } = splitStoredFilePath(filePath);
  if (storedFileName) {
    const fallbackBlob = await requestDownloadFile({
      fileName: storedFileName,
      customPath: customPath || filePath,
    });
    if (!(await isInvalidDownloadBlob(fallbackBlob))) return fallbackBlob;
  }

  return firstBlob;
}
