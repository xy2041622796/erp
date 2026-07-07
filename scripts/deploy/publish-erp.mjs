import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import SftpClient from 'ssh2-sftp-client';

const DEFAULT_HOST = '192.168.124.10';
const DEFAULT_PORT = 22;
const DEFAULT_PATH = '/data/work/adminnet/wwwroot/qyapiCoreFront/erp';
const DEFAULT_USER = 'root';
const DEFAULT_PASSWORD = 'lm@2025!';

const host = process.env.ERP_DEPLOY_HOST || DEFAULT_HOST;
const port = Number(process.env.ERP_DEPLOY_PORT || DEFAULT_PORT);
const remotePath = process.env.ERP_DEPLOY_PATH || DEFAULT_PATH;
const user = process.env.ERP_DEPLOY_USER || DEFAULT_USER;
const password = process.env.ERP_DEPLOY_PASSWORD || DEFAULT_PASSWORD;

const repoRoot = process.cwd();
const localDir = resolve(repoRoot, 'apps/web-ele/erp');

async function main() {
  if (!existsSync(localDir)) {
    throw new Error(
      `打包目录不存在: ${localDir}。请先确认 build:ele 已成功，并且输出目录为 apps/web-ele/erp。`,
    );
  }

  const client = new SftpClient('pub:erp');

  try {
    console.log('[pub:erp] 开始发布 ERP 前端');
    console.log(`[pub:erp] 本地目录: ${localDir}`);
    console.log(`[pub:erp] 远程地址: ${user}@${host}:${remotePath}`);

    await client.connect({
      host,
      port,
      username: user,
      password,
    });

    const exists = await client.exists(remotePath);
    if (!exists) {
      await client.mkdir(remotePath, true);
    }

    await client.uploadDir(localDir, remotePath);

    console.log('[pub:erp] 发布完成');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error('[pub:erp] 发布失败');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
