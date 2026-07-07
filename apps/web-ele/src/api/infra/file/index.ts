import type { AxiosRequestConfig, PageParam, PageResult } from '@vben/request';

import {  DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
/** Axios 上传进度事件 */
export type AxiosProgressEvent = AxiosRequestConfig['onUploadProgress'];

export namespace InfraFileApi {
  /** 文件信息 */
  export interface File {
    id?: number;
    configId?: number;
    path: string;
    name?: string;
    url?: string;
    size?: number;
    type?: string;
    createTime?: Date;
  }

  /** 文件预签名地址 */
  export interface FilePresignedUrlRespVO {
    configId: number; // 文件配置编号
    uploadUrl: string; // 文件上传 URL
    url: string; // 文件 URL
    path: string; // 文件路径
  }

  /** 上传文件 */
  export interface FileUploadReqVO {
    file: globalThis.File;
    directory?: string;
    customPath?: string;
    appType?: string;
    isReplace?: boolean;
    isCrossEnt?: boolean;
  }

  /** 上传文件返回 */
  export interface FileUploadRespVO {
    url: string;
    filePath?: string;
    customPath?: string;
    appType?: string;
    isReplace?: boolean;
    isCrossEnt?: boolean;
    raw?: any;
  }
}

/** 查询文件列表 */
export function getFilePage(params: PageParam) {
  return requestClient.get<PageResult<InfraFileApi.File>>('/infra/file/page', {
    params,
  });
}

/** 删除文件 */
export function deleteFile(id: number) {
  return requestClient.delete(`/infra/file/delete?id=${id}`);
}

/** 批量删除文件 */
export function deleteFileList(ids: number[]) {
  return requestClient.delete(`/infra/file/delete-list?ids=${ids.join(',')}`);
}

/** 获取文件预签名地址 */
export function getFilePresignedUrl(name: string, directory?: string) {
  return requestClient.get<InfraFileApi.FilePresignedUrlRespVO>(
    '/infra/file/presigned-url',
    {
      params: { name, directory },
    },
  );
}

/** 创建文件 */
export function createFile(data: InfraFileApi.File) {
  return requestClient.post('/infra/file/create', data);
}

const SALE_ORDER_MODEL_ID = '58AE739462369587E5B51B79D4C57A05';
const SALE_ORDER_TABLE = 'erp_sale_order';
const SALE_ORDER_DB = 'LMBill';
const SALE_ORDER_PK = 'rowid';

/** 自定义文件上传 (File/UploadFile) */
export async function uploadFile(
  params: InfraFileApi.FileUploadReqVO,
  onUploadProgress?: AxiosProgressEvent,
): Promise<InfraFileApi.FileUploadRespVO> {
  const table = new DataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );

  const headers = table.getRequestHeader();
  delete headers['Content-Type'];

  const customPath = params.customPath || params.directory || 'image';
  const appType = params.appType || 'wwwroot';
  const isReplace = Boolean(params.isReplace ?? false);
  const isCrossEnt = Boolean(params.isCrossEnt ?? false);

  const data = {
    upCtrl_Input: params.file,
    customPath,
    appType,
    isReplace: String(isReplace),
    isCrossEnt: String(isCrossEnt),
  };

  const res = await requestClient.upload(table.uploadUrl, data, {
    headers,
    onUploadProgress,
  });
  const first = Array.isArray(res) ? res[0] : res;
  const filePath = first?.filePath;
  const url = filePath ?  "/api/"+ filePath : '';

  return {
    url,
    filePath,
    customPath,
    appType,
    isReplace,
    isCrossEnt,
    raw: res,
  };
}
