# ERP 发布方案落地文档（web-ele）

## 目标

将 `lmbill/apps/web-ele` 的前端产物通过一条命令发布到远程服务器目录：

- 发布命令：`npm run pub:erp`
- 目标服务器：`192.168.124.10`
- 目标目录：`/data/work/adminnet/wwwroot/qyapiCoreFront`
- 当前打包输出目录：`apps/web-ele/erp`

> 说明：当前仓库已将 `web-ele` 的 Vite 输出目录改为 `erp`，不再是默认的 `dist`。

---

## 当前现状

### 1. 构建命令

根目录 `package.json` 中已有：

```json
"build:ele": "pnpm run build --filter=@vben/web-ele",
"pub:erp": "pnpm run build:ele && node ./scripts/deploy/publish-erp.mjs"
```

子应用 `apps/web-ele/package.json` 中已有：

```json
"build": "pnpm vite build --mode production"
```

### 2. 构建产物目录

`apps/web-ele/vite.config.mts` 已配置：

```ts
build: {
  outDir: 'erp',
}
```

因此执行：

```bash
pnpm run build:ele
```

产物目录为：

```bash
apps/web-ele/erp/
```

---

## 已落地实现

本次已落地为 **本地命令发布**，不依赖 GitHub Actions。

执行：

```bash
npm run pub:erp
```

会完成以下动作：

1. 执行 `pnpm run build:ele`
2. 运行 `scripts/deploy/publish-erp.mjs`
3. 将 `apps/web-ele/erp/` 上传到服务器 `192.168.124.10:/data/work/adminnet/wwwroot/qyapiCoreFront`

---

## 当前脚本行为

发布脚本文件：

```bash
scripts/deploy/publish-erp.mjs
```

当前默认值：

- `ERP_DEPLOY_HOST=192.168.124.10`
- `ERP_DEPLOY_PORT=22`
- `ERP_DEPLOY_PATH=/data/work/adminnet/wwwroot/qyapiCoreFront`
- `ERP_DEPLOY_USER=root`
- `ERP_DEPLOY_PASSWORD=Qy@123456`

脚本优先级：

1. 若本机存在 `sshpass`，则使用：

```bash
sshpass -p <password> scp -r ...
```

2. 若没有 `sshpass`，但有 `scp`，则使用：

```bash
scp -r ...
```

此时如果服务器未配置免密登录，会要求你手工输入密码。

---

## 使用方式

在仓库根目录执行：

```bash
npm run pub:erp
```

如果需要覆盖默认账号、密码、目录，可以在执行前临时设置环境变量。

Linux / macOS：

```bash
export ERP_DEPLOY_HOST=192.168.124.10
export ERP_DEPLOY_PORT=22
export ERP_DEPLOY_USER=root
export ERP_DEPLOY_PASSWORD='Qy@123456'
export ERP_DEPLOY_PATH=/data/work/adminnet/wwwroot/qyapiCoreFront
npm run pub:erp
```

Windows PowerShell：

```powershell
$env:ERP_DEPLOY_HOST="192.168.124.10"
$env:ERP_DEPLOY_PORT="22"
$env:ERP_DEPLOY_USER="root"
$env:ERP_DEPLOY_PASSWORD="Qy@123456"
$env:ERP_DEPLOY_PATH="/data/work/adminnet/wwwroot/qyapiCoreFront"
npm run pub:erp
```

---

## 前提要求

### 方案 A：本机有 `sshpass`

优点：

- 可直接使用密码自动上传
- 整个发布过程无需手工输入密码

适用：

- Linux 环境
- WSL 环境
- 已安装对应工具的开发机

### 方案 B：本机有 `scp`

优点：

- 不需要额外 Node 依赖
- 可直接走 OpenSSH

注意：

- 如果没有免密登录，执行时会提示输入密码
- Windows 环境通常需要先安装 OpenSSH Client

---

## 当前实现的限制

1. 当前脚本默认使用 `root` 用户，这是基于你提供的服务器路径做的默认推断
2. 当前脚本为了让命令直接可用，内置了默认密码 `Qy@123456`
3. 这种方式虽然能快速落地，但不适合长期保存在多人共享仓库中

---

## 后续建议

建议后续做以下优化：

1. 将密码从脚本中移除，改为只从环境变量读取
2. 改成 SSH 密钥免密上传
3. 根据服务器环境决定是否改为 `rsync --delete`
4. 如果不再使用 GitHub Actions，可再统一清理旧的 FTP 发布配置

---

## 目录约定

本次发布相关目录：

- 构建输出：`lmbill/apps/web-ele/erp/`
- 发布脚本：`lmbill/scripts/deploy/publish-erp.mjs`
- 说明文档：`lmbill/apps/web-ele/docs/erp-publish-plan-2026-03-26.md`

---

## 结论

目前已经具备本地发布入口：

```bash
npm run pub:erp
```

它会：

- 先构建 `web-ele`
- 再把 `apps/web-ele/erp/` 上传到 `192.168.124.10:/data/work/adminnet/wwwroot/qyapiCoreFront`

这是一个可直接使用的第一版发布方案，后续再把密码和账号收敛到环境变量即可。
