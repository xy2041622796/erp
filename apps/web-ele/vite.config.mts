import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from '@vben/vite-config';
import type { Plugin } from 'vite';

import ElementPlus from 'unplugin-element-plus/vite';

function getAppBuildMeta() {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version?: string;
  };
  const buildTime = new Date().toISOString();

  return {
    buildTime,
    version: packageJson.version || '0.0.0',
  };
}
 
function createVersionFilePlugin(buildMeta: {
  buildTime: string;
  version: string;
}): Plugin {
  return {
    apply: 'build' as const,
    generateBundle() {
      this.emitFile({
        fileName: 'version.json',
        source: JSON.stringify(buildMeta, null, 2),
        type: 'asset',
      });
    },
    name: 'web-ele-version-file',
  };
}

export default defineConfig(async () => {
  const buildMeta = getAppBuildMeta();

  return {
    application: {},
    vite: {
      define: {
        __APP_BUILD_TIME__: JSON.stringify(buildMeta.buildTime),
        __APP_VERSION__: JSON.stringify(buildMeta.version),
      },
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
        createVersionFilePlugin(buildMeta),
      ],
      build: {
        outDir: 'webapp',
      },
      server: {
        allowedHosts: ['*.trycloudflare.com'],
        proxy: {
          '/api': {
            changeOrigin: true,
            // 保留 /api 前缀，与后端真实路径 https://spark.lingmacn.com/api/... 对齐
            target: 'https://spark.lingmacn.com',
            ws: true,
          },
        },
      },
    },
  };
});
