import type { CrmCustomerApi } from '#/api/erp/customer';

import {
  createCustomerAttachment,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';

export const PROJECT_MANAGE_ATTACH_OWNER_TYPE = '项目';

export type ProjectManageAttachment = CrmCustomerApi.Attachment;

export async function getProjectManageCreateAttachments(projectId: number | string) {
  return await getCustomerAttachments(projectId, PROJECT_MANAGE_ATTACH_OWNER_TYPE);
}

export async function createProjectManageCreateAttachment(
  projectId: number | string,
  data: {
    file_path?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    owner_type?: string;
    pid?: number | string;
  },
) {
  return await createCustomerAttachment(projectId, {
    ...data,
    owner_type: data.owner_type || PROJECT_MANAGE_ATTACH_OWNER_TYPE,
    pid: data.pid || projectId,
  });
}

export async function deleteProjectManageCreateAttachment(rowid: number | string) {
  return await deleteCustomerAttachment(rowid);
}

export async function uploadProjectManageCreateAttachment(file: File, customPath = 'project-manage-attachment') {
  return await uploadCustomerAttachment(file, customPath);
}

export async function downloadProjectManageCreateAttachment(fileName: string, filePath: string): Promise<Blob> {
  return await downloadCustomerAttachment(fileName, filePath);
}
