import type { AxiosInstance, AxiosResponse } from 'axios';

import type { RequestClientConfig, RequestClientOptions } from './types';

import { bindMethods, isString, merge } from '@vben/utils';

import axios from 'axios';
import qs from 'qs';

import { FileDownloader } from './modules/downloader';
import { InterceptorManager } from './modules/interceptor';
import { SSE } from './modules/sse';
import { FileUploader } from './modules/uploader';

const HEADER_NAME_TOKEN_RE = /^[!#$%&'*+.^\w`|~-]+$/;

function isLatin1String(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0xFF) return false;
  }
  return true;
}

function toHeaderString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}

function sanitizeAxiosHeaders(
  headers: unknown,
): Record<string, string> | undefined {
  if (!headers) return undefined;

  const entries: Array<[string, unknown]> =
    typeof (headers as any).toJSON === 'function'
      ? Object.entries((headers as any).toJSON())
      : (typeof Headers !== 'undefined' && headers instanceof Headers
        ? [...headers.entries()]
        : Object.entries(headers as any));

  const sanitized: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = String(rawKey);

    // Internal flags used by app code; should never be sent as HTTP headers.
    if (key === 'isEncrypt') continue;

    // XHR/fetch only allow "token" header names (ASCII).
    if (!HEADER_NAME_TOKEN_RE.test(key)) continue;

    const value = toHeaderString(rawValue);
    if (value === undefined) continue;

    // Disallow CR/LF/NULL to prevent header injection and XHR rejection.
    if (/[\0\r\n]/.test(value)) continue;

    // XHR rejects values containing code points outside ISO-8859-1 (Latin-1).
    if (!isLatin1String(value)) continue;

    sanitized[key] = value;
  }

  return sanitized;
}

function getParamsSerializer(
  paramsSerializer: RequestClientOptions['paramsSerializer'],
) {
  if (isString(paramsSerializer)) {
    switch (paramsSerializer) {
      case 'brackets': {
        return (params: any) =>
          qs.stringify(params, { arrayFormat: 'brackets' });
      }
      case 'comma': {
        return (params: any) => qs.stringify(params, { arrayFormat: 'comma' });
      }
      case 'indices': {
        return (params: any) =>
          qs.stringify(params, { arrayFormat: 'indices' });
      }
      case 'repeat': {
        return (params: any) => qs.stringify(params, { arrayFormat: 'repeat' });
      }
    }
  }
  return paramsSerializer;
}

class RequestClient {
  public addRequestInterceptor: InterceptorManager['addRequestInterceptor'];

  public addResponseInterceptor: InterceptorManager['addResponseInterceptor'];
  public download: FileDownloader['download'];

  public readonly instance: AxiosInstance;
  // 是否正在刷新token
  public isRefreshing = false;
  public postSSE: SSE['postSSE'];
  // 刷新token队列
  public refreshTokenQueue: ((token: string) => void)[] = [];
  public requestSSE: SSE['requestSSE'];
  public upload: FileUploader['upload'];

  /**
   * 构造函数，用于创建Axios实例
   * @param options - Axios请求配置，可选
   */
  constructor(options: RequestClientOptions = {}) {
    // 合并默认配置和传入的配置
    const defaultConfig: RequestClientOptions = {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      responseReturn: 'raw',
      // 默认超时时间
      timeout: 10_000,
      paramsSerializer: 'repeat',
    };
    const { ...axiosConfig } = options;
    const requestConfig = merge(axiosConfig, defaultConfig);
    requestConfig.paramsSerializer = getParamsSerializer(
      requestConfig.paramsSerializer,
    );
    this.instance = axios.create(requestConfig);

    // Ensure headers are safe for browser XHR/fetch (Latin-1 only).
    // This interceptor is added first so it runs last in Axios' request chain.
    this.instance.interceptors.request.use((config) => {
      const sanitized = sanitizeAxiosHeaders((config as any).headers);
      if (sanitized) (config as any).headers = sanitized;
      return config;
    });

    bindMethods(this);

    // 实例化拦截器管理器
    const interceptorManager = new InterceptorManager(this.instance);
    this.addRequestInterceptor =
      interceptorManager.addRequestInterceptor.bind(interceptorManager);
    this.addResponseInterceptor =
      interceptorManager.addResponseInterceptor.bind(interceptorManager);

    // 实例化文件上传器
    const fileUploader = new FileUploader(this);
    this.upload = fileUploader.upload.bind(fileUploader);
    // 实例化文件下载器
    const fileDownloader = new FileDownloader(this);
    this.download = fileDownloader.download.bind(fileDownloader);
    // 实例化SSE模块
    const sse = new SSE(this);
    this.postSSE = sse.postSSE.bind(sse);
    this.requestSSE = sse.requestSSE.bind(sse);
  }

  /**
   * DELETE请求方法
   */
  public delete<T = any>(
    url: string,
    config?: RequestClientConfig,
  ): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * GET请求方法
   */
  public get<T = any>(url: string, config?: RequestClientConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * 获取基础URL
   */
  public getBaseUrl() {
    return this.instance.defaults.baseURL;
  }

  /**
   * POST请求方法
   */
  public post<T = any>(
    url: string,
    data?: any,
    config?: RequestClientConfig,
  ): Promise<T> {
    return this.request<T>(url, { ...config, data, method: 'POST' });
  }

  /**
   * PUT请求方法
   */
  public put<T = any>(
    url: string,
    data?: any,
    config?: RequestClientConfig,
  ): Promise<T> {
    return this.request<T>(url, { ...config, data, method: 'PUT' });
  }

  /**
   * 通用的请求方法
   */
  public async request<T>(
    url: string,
    config: RequestClientConfig,
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance({
        url,
        ...config,
        ...(config.paramsSerializer
          ? { paramsSerializer: getParamsSerializer(config.paramsSerializer) }
          : {}),
      });
      return response as T;
    } catch (error: any) {
      throw error.response ? error.response.data : error;
    }
  }
}

/**
 * 构建排序字段，处理 vxe 排序条件
 *
 * add by 芋艿
 */
export const buildSortingField = (sorts: any[]) => {
  if (!sorts || sorts.length === 0) {
    return {};
  }
  const result: Record<string, any> = {};
  sorts.forEach((sort: any, index: number) => {
    result[`sortingFields[${index}].field`] = sort.field;
    result[`sortingFields[${index}].order`] = sort.order;
  });
  return result;
};

export { RequestClient };
