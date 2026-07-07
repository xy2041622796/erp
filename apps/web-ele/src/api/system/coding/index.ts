import { baseApiUrl } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace SystemCodingApi {
  export interface CodeStringResult {
    Code: number;
    Message: string;
    [key: string]: any;
  }
}

/**
 * 获取编码
 * @param rowId 行ID
 * @param menuId 菜单ID
 * @param headers 请求头
 */
export function getCodeString(
  rowId: number | string,
  menuId: string = 'A3A38857F7584319844A826EF9AAA881',
  headers?: Record<string, any>,
) {
  return requestClient.get<SystemCodingApi.CodeStringResult>(
    `${baseApiUrl}Codeing/GetCodeString/${rowId}/${menuId}`,
    { headers },
  );
}
