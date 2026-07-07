# lmbill（web-ele）项目 API 层表 CRUD 与权限控制规范 - 提示词（适配版）

> 适用范围：`mcp_object-master/lmbill/lmbill/apps/web-ele/src/api`
>
> 本提示词用于指导 AI **生成/修改** web-ele 前端 API 层（`src/api/**`）的“表增删改查（CRUD）”代码。
>
> ⚠️ 注意：本项目 **不是** 走 `QueryInterfaceBySql`（SQL 查询）那套；实际走的是 **模型驱动 DataTable 协议**：
> - 查询：`/api/DataOperation/GetData`
> - 保存：`/api/DataOperation/BatchTableOperateRequestByCRUD`
>
---

## 一、核心架构概述（必须遵守）

### 1.1 统一 DataTable 封装（项目现状）

- DataTable 位于：`src/api/qyapi.ts`
- 构造：`new DataTable(formKey, tableName, dbName, primaryKey)`
- 关键字段：
  - `formKey`：页面/模型 ID（字符串，必传，作为请求头 `x-FormKey`）
  - `tableName`：数据库表名（如 `erp_sale_order`）
  - `dbName`：数据库名（如 `LMBill`）
  - `primaryKey`：主键字段名（如 `id`）

### 1.2 两个核心接口（真实接口）

- 查询：`POST DataTable.queryUrl` → `.../api/DataOperation/GetData`
- 增删改：`POST DataTable.saveUrl` → `.../api/DataOperation/BatchTableOperateRequestByCRUD`

### 1.3 权限模型（真实字段）

本项目的权限 **不是** `_fieldPermissions`，而是：

- 表级：`Result.allowAdd` → 是否允许新增
- 表级：`Result.lingma_sys_key` → 保存时需要附带，用于权限/版本校验
- 行级：每条数据可能带 `lingma_sys_params`（字段权限集合）
  - `e: string[]` 可编辑字段列表
  - `h: string[]` 隐藏字段列表
  - `m: string[]` 可修改字段列表（若存在）
  - `d?: boolean` 行删除权限（可能位于 `lingma_sys_params.d` 或嵌套结构中）

前端判断权限可使用：`DataTable.authCheck` / `DataRow` / `DataRowAuth`（见 `qyapi.ts`）。

---

## 二、Filter（过滤条件）规范（必须使用项目现成工具）

### 2.1 Filter 结构

Filter 是一棵条件树，`Type` 支持：

- `and`：与条件组
- `or`：或条件组
- `cond`：单条件

项目提供构造函数（必须使用）：

- `and(...filters)`
- `or(...filters)`
- `cond(field, operator, value)`

### 2.2 Operator 枚举（常用）

- `equal` / `notequal`
- `contains` / `startswith` / `endswith`
- `greaterthan` / `greaterthanorequal`
- `lessthan` / `lessthanorequal`
- `in` / `notin`
- `isnull` / `isnotnull`
- `isempty` / `isnotempty`

> 备注：`cond()` 内部会把 `value` 包装为 `ValueFun: { Type: 'GetConstValue', Value: xxx }`（除非传入的是 ValueFun 对象）。

---

## 三、查询（Read）规范

### 3.1 请求头（必须）

通过 `dataTable.getRequestHeader()` 生成请求头，至少包含：

- `x-FormKey: <formKey>`
- `x-StepId: ''`

另外 `requestClient` 会自动注入：

- `Authorization: Bearer <token>`
- `tenant-id / visit-tenant-id`（按项目配置）
- `Accept-Language`

### 3.2 查询请求体（推荐写法，贴合现有模块）

> 实际模块里常见 PageParam 字段名是 `PageSize` / `PageIndex`（注意大小写）。

```ts
const queryParam = {
  Table: [dataTable],
  PageParam: {
    PageSize: params.pageSize || 0, // 0 表示不分页（按后端实现）
    PageIndex: params.pageNo || 1,
  },
};
```

- `Table` 必须是数组，元素是 DataTable（会被 JSON 序列化）
- `dataTable.Filter` 可选：用于过滤

### 3.3 响应解析（建议固定套路）

模块里经常使用 `responseReturn: 'raw'` 获取原始响应对象，再调用：

- `dataTable.execQueryResult(resQuery)`

然后业务数据通常从：

- `resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data` 中拿
- 列表：`Items`
- 总数：`Count`（若存在）

---

## 四、保存（Create/Update/Delete）规范

### 4.1 保存请求体结构（真实结构）

保存接口入参是数组：`SaveRequestData[]`，每个元素对应一张表：

```ts
const saveParam = dataTable.getSaveParam(
  addedRows,   // Added
  changedRows, // Changed
  deletedRows, // Deleted（对象数组，通常只带主键）
);
await requestClient.post(dataTable.saveUrl, saveParam, {
  headers: dataTable.getRequestHeader(),
});
```

并且：

- `TableName` 实际是 `${DbName}@${TableName}`（由 DataTable 内部拼接）
- `CrudModel` 字段名固定：`Added` / `Changed` / `Deleted`

### 4.2 lingma_sys_key 注入规则（必须理解）

- 查询后 `execQueryResult` 会把 `Result.lingma_sys_key` 存到 `dataTable.lmKey`
- `getSaveParam()` 会自动把 `lmKey` 注入到：
  - 新增（Added）对象：直接写 `lingma_sys_key = lmKey`
  - 修改/删除（Changed/Deleted）对象：若对象里没带 `lingma_sys_key`，会尝试从 `dataTable.items` 里用主键匹配把该行的 `lingma_sys_key` 补上

✅ 因此：**更新/删除建议先查询一次或在列表数据里操作**，确保 `items` 与 `lmKey` 有值。

### 4.3 删除参数（重要）

本项目删除不是 `deletes: string[]`，而是：

```ts
const delArr = ids.map((id) => ({ [PK]: id }));
const saveParam = dataTable.getSaveParam([], [], delArr);
```

是否软删除由后端决定；前端不要擅自改 `deleted=1`，除非模块已有既定约定。

---

## 五、标准 API 文件结构（生成代码时必须遵循）

每个业务模块建议遵循：

- `src/api/erp/<domain>/<module>/index.ts`：主表 API（分页、详情、增删改）
- `src/api/erp/<domain>/<module>/<items>.ts`：子表 API（如明细 items）

并在文件顶部写清常量：

- MODEL_ID（formKey）
- TABLE / DB / PK

---

## 六、单表 CRUD 模板（可直接复制改表名）

> 下面模板是“生成给 AI 的目标代码形态”，生成时要：
> - 使用 `DataTable`、`and/or/cond`
> - 使用 `requestClient`
> - 返回 `clientData`（若需要携带 DataTable/权限）

```ts
import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// ===== 常量定义 =====
const MODEL_ID = '替换为真实 formKey';
const TABLE = '替换为真实表名';
const DB = 'LMBill';
const PK = 'id';

export async function getPage(params: any) {
  const tb = new DataTable(MODEL_ID, TABLE, DB, PK);

  // 示例：可选过滤
  if (params.keyword) {
    tb.Filter = and(tb.Filter, cond('name', 'contains', params.keyword));
  }

  const queryParam: any = {
    Table: [tb],
    PageParam: {
      PageSize: params.pageSize || 0,
      PageIndex: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(tb.queryUrl, queryParam, {
    headers: tb.getRequestHeader(),
    responseReturn: 'raw',
  });

  tb.execQueryResult(resQuery);

  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count || items.length;

  const out = new clientData();
  out.dataTable = tb;
  out.list = items;
  out.total = total;
  return out;
}

export async function getById(id: string) {
  const tb = new DataTable(MODEL_ID, TABLE, DB, PK);
  tb.Filter = cond(PK, 'equal', id);

  const queryParam = {
    Table: [tb],
    PageParam: { PageSize: 1, PageIndex: 1 },
  };

  const resQuery = await requestClient.post(tb.queryUrl, queryParam, {
    headers: tb.getRequestHeader(),
    responseReturn: 'raw',
  });
  tb.execQueryResult(resQuery);

  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return (resultData?.Items && resultData.Items[0]) || null;
}

export async function createRow(data: any) {
  const tb = new DataTable(MODEL_ID, TABLE, DB, PK);
  const saveParam = tb.getSaveParam([data], [], []);
  return requestClient.post(tb.saveUrl, saveParam, {
    headers: tb.getRequestHeader(),
  });
}

export async function updateRow(data: any) {
  const tb = new DataTable(MODEL_ID, TABLE, DB, PK);
  const saveParam = tb.getSaveParam([], [data], []);
  return requestClient.post(tb.saveUrl, saveParam, {
    headers: tb.getRequestHeader(),
  });
}

export async function deleteRows(ids: string | string[]) {
  const tb = new DataTable(MODEL_ID, TABLE, DB, PK);
  const idArr = Array.isArray(ids) ? ids : String(ids).split(',');
  const delArr = idArr.map((id) => ({ [PK]: id }));
  const saveParam = tb.getSaveParam([], [], delArr);
  return requestClient.post(tb.saveUrl, saveParam, {
    headers: tb.getRequestHeader(),
  });
}
```

---

## 七、主子表 CRUD 模板（关键点）

1. **外键绑定**：子表必须带主表 ID（如 `order_id`）。
2. **保存顺序**：
   - 若主键由前端生成（如 UUID），可以先写子表再写主表（项目内存在这种做法）。
   - 若主键由后端生成，必须先保存主表拿到 ID，再保存子表。
3. **更新**：主表 `Changed`，子表走自己的 `updateItems`。

---

## 八、权限使用规则（替代 useFieldPermission 那套）

### 8.1 表级新增权限

```ts
const canAdd = dataTable.allowAddData();
```

### 8.2 行级字段可编辑/可见

```ts
const canEditRow = dataTable.allowEditRow(rowId);
const canDeleteRow = dataTable.allowDeleteRow(rowId);

const canEditField = dataTable.isEditField(rowId, 'field_name');
const canShowField = dataTable.isShowField(rowId, 'field_name');
```

> 说明：如果行数据不包含 `lingma_sys_params`，项目逻辑默认视为“不做限制”。

---

## 九、迁移/生成检查清单（面向 AI 生成）

- [ ] 这张表的 `MODEL_ID(formKey)` 是多少？（必须填真实值）
- [ ] 这张表的 `TABLE/DB/PK` 是什么？
- [ ] 查询必须走 `DataOperation/GetData`，保存必须走 `BatchTableOperateRequestByCRUD`
- [ ] Filter 必须用 `and/or/cond + operator`，禁止使用 `eq/like` 那套 symbol
- [ ] 删除参数必须是对象数组（`[{[PK]:id}]`），禁止 `string[]`
- [ ] 更新/删除前确保 `lingma_sys_key` 与行 `lingma_sys_key` 可用（必要时先查询）
- [ ] 权限字段以 `allowAdd/lingma_sys_params/lingma_sys_key` 为准，禁止 `_fieldPermissions`

---

## 十、把本提示词喂给 AI 时的“精简输入模板”

> 复制下面这段给 AI，并把括号内容替换为你的表信息：

- 目标：为 web-ele 项目生成（或修改）某张表的 API 层 CRUD。
- 项目规范：使用 `src/api/qyapi.ts` 的 `DataTable + and/or/cond`，查询走 `DataOperation/GetData`，保存走 `DataOperation/BatchTableOperateRequestByCRUD`。
- 表信息：
  - MODEL_ID(formKey)：（填）
  - DB：（填，如 LMBill）
  - TABLE：（填，如 erp_xxx）
  - PK：（填，如 id）
- 输出：生成 `getPage/getById/create/update/delete`，并按项目现有写法处理 `lingma_sys_key` 与 `lingma_sys_params`。
