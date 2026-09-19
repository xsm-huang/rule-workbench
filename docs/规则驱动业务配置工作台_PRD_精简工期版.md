# 规则驱动业务配置工作台（全栈版）项目需求文档

> 文档版本：V1.0（精简工期版）  
> 项目性质：个人全栈项目  
> 目标岗位：高级前端开发工程师、前端主导型全栈工程师、Node.js BFF 工程师  
> 预计工期：每天约 2 小时，目标 5 周，最多控制在 6 周内  
> 真实性边界：基于既有复杂业务经验进行匿名化抽象，不复用公司代码、数据、接口、名称或内部标识

---

## 1. 文档目的

本文档用于明确项目的业务范围、功能需求、技术方案、验收标准、实施顺序与学习要求，避免开发过程中持续扩张范围。

项目需要同时形成两类求职证据：

1. **高级前端证据**：Vue 3、TypeScript strict、复杂业务建模、配置驱动、状态管理、异常交互、测试与 CI。
2. **前端主导型全栈 / BFF 证据**：Node.js、NestJS、接口设计、鉴权与 RBAC、PostgreSQL、事务、版本、审计、乐观并发控制与接口测试。

本项目不用于证明 Node.js 生产经验，也不用于主投纯后端、分布式、高并发或基础设施岗位。

---

## 2. 项目背景

企业内部常存在计价、激励、考核或运营规则配置场景。普通表单难以满足以下需求：

- 一套方案包含多组规则和多行区间数据。
- 不同计价模式对应不同字段与校验条件。
- 编辑、审核和查看人员拥有不同权限。
- 发布后的方案需要保留完整历史版本。
- 多人可能同时打开同一方案，需要避免后提交内容覆盖先提交内容。
- 前端需要即时提示错误，服务端又必须执行最终校验。

因此，本项目构建一个通用的规则驱动业务配置工作台，以“规则方案”为核心对象，完成创建、编辑、提交审核、发布、版本对比和操作审计闭环。

---

## 3. 项目目标与非目标

### 3.1 项目目标

- 完成一个能够独立运行和演示的 Vue 3 + Node.js 全栈项目。
- 用 TypeScript strict 建立领域模型、接口契约与视图模型边界。
- 实现具有真实复杂度的规则表格和跨行校验。
- 由 Node 服务层承担鉴权、权限、数据聚合、规则复验、状态流转、事务、版本和并发控制。
- 建立最小但完整的单元测试、接口集成测试、E2E 和 CI 质量门禁。
- 形成公开仓库、README、演示账号和可用于面试讲解的技术取舍记录。

### 3.2 非目标

本期明确不做：

- 用户注册、找回密码、短信或第三方登录。
- 用户、角色和权限的可视化管理后台。
- Refresh Token 轮换、多设备会话管理。
- 服务端自动保存和多人实时协同编辑。
- 历史版本一键恢复。
- Redis、BullMQ、SSE、WebSocket。
- 微服务、消息队列、GraphQL、Kubernetes。
- AI、Agent、RAG 或与项目主线无关的功能。
- 移动端适配和小程序。
- 追求没有真实依据的高并发或性能数字。

这些功能不影响项目对高级前端和前端主导型全栈岗位的核心证明力。

---

## 4. 核心术语

| 术语 | 说明 |
| --- | --- |
| 规则方案 Scheme | 一套可以被编辑、审核和发布的业务规则集合 |
| 草稿 Draft | 尚未提交审核，可继续修改的方案 |
| 规则组 Rule Group | 方案中的一个业务分组，每组包含多行区间规则 |
| 版本 Version | 每次提交审核时产生的不可变规则快照 |
| 当前编辑版本 editVersion | 用于检测多人编辑冲突的递增整数 |
| 发布版本 publishedVersion | 当前正式生效的版本快照 |
| BFF | 面向前端页面提供聚合数据、裁剪 DTO、统一鉴权与异常的 Node 服务层 |

---

## 5. 用户角色与权限

为缩短工期，角色通过数据库种子数据预置，不开发角色管理页面。

| 角色 | 权限 |
| --- | --- |
| Viewer | 查看已发布方案、版本记录和操作时间线 |
| Editor | 查看全部可见方案；创建方案；编辑自己负责的草稿；保存草稿；提交审核 |
| Reviewer | 查看待审核方案；审核通过或驳回；查看全部版本和审计记录 |

### 5.1 权限原则

- 前端路由、菜单和按钮权限只负责交互展示。
- Node 服务端必须对每一个受保护接口重新鉴权。
- Viewer 不能通过直接调用接口创建或修改方案。
- Editor 不能审核自己提交的方案。
- Reviewer 不能修改处于审核中的规则内容。
- 已发布版本不可被直接修改。

---

## 6. 方案状态流转

```text
DRAFT ──提交审核──> PENDING_REVIEW
   ▲                       │
   │                       ├──审核通过──> PUBLISHED
   │                       │
   └──────驳回─────────────┘
```

为控制范围，本期只实现四种状态：

| 状态 | 说明 | 允许操作 |
| --- | --- | --- |
| DRAFT | 新建或被驳回后继续编辑 | 编辑、保存、提交审核 |
| PENDING_REVIEW | 已提交，等待审核 | 查看、审核通过、驳回 |
| PUBLISHED | 已发布且只读 | 查看、版本对比 |
| REJECTED | 审核驳回 | 查看驳回原因、继续编辑；首次保存后回到 DRAFT |

所有状态流转由服务端状态机校验，不能仅依赖前端按钮控制。

---

## 7. 核心业务流程

### 7.1 创建并发布方案

1. Editor 登录。
2. 进入方案列表并点击“新建方案”。
3. 填写基本信息、规则组和规则行。
4. 前端即时执行字段与跨行校验。
5. Editor 保存草稿。
6. Editor 提交审核。
7. Node 服务端重新执行权限、状态和完整规则校验。
8. 数据库事务创建不可变版本快照、更新方案状态并写入审计日志。
9. Reviewer 登录并打开待审核方案。
10. Reviewer 审核通过，方案进入 PUBLISHED。
11. Viewer 可以查看已发布方案及版本记录。

### 7.2 审核驳回

1. Reviewer 在待审核方案中填写驳回原因。
2. 服务端将方案状态更新为 REJECTED，并记录操作日志。
3. Editor 查看驳回原因并继续编辑。
4. 再次提交审核时生成新的不可变版本快照。

### 7.3 多人编辑冲突

1. 两个页面同时获取 `editVersion = 3` 的草稿。
2. 第一个页面保存成功，数据库更新为 `editVersion = 4`。
3. 第二个页面仍以 `baseVersion = 3` 保存。
4. 服务端更新条件不匹配，返回 `409 Conflict`。
5. 前端保留本地内容并提示用户复制内容或重新加载最新数据。

本期不开发复杂的自动合并界面，只需正确检测冲突并保护本地输入。

---

## 8. 页面范围与路由

| 页面 | 路由 | 主要功能 |
| --- | --- | --- |
| 登录页 | `/login` | 账号密码登录、演示账号提示 |
| 方案工作台 | `/schemes` | 用户信息、统计摘要、筛选、分页、待办入口 |
| 新建方案 | `/schemes/new` | 基本信息、复杂规则表格、保存草稿 |
| 编辑方案 | `/schemes/:id/edit` | 编辑草稿、校验、提交审核、冲突处理 |
| 方案详情 | `/schemes/:id` | 只读详情、审核操作、版本列表、版本对比、操作时间线 |

不单独开发首页、审核中心和审计页面，全部合并到工作台或详情页中，以减少页面数量。

---

## 9. 功能需求

## 9.1 登录与会话

### 功能要求

- 使用邮箱和密码登录。
- 系统预置 Viewer、Editor、Reviewer 三个演示账号。
- 密码只保存哈希值。
- 登录成功后将短期 JWT 写入 HttpOnly Cookie。
- 本期 Token 有效期设置为一个工作时段，例如 8 小时；过期后重新登录。
- 前端启动时请求当前用户接口恢复登录状态。
- 退出时清除 Cookie 并返回登录页。
- 未登录访问业务路由时跳转至登录页。

### 验收标准

- 正确账号可以登录并进入工作台。
- 错误密码返回统一错误提示，不暴露账号是否存在。
- 浏览器脚本无法直接读取 HttpOnly Cookie。
- Viewer 直接调用创建接口时返回 `403 Forbidden`。

## 9.2 工作台与方案列表

### 功能要求

- 页面顶部展示当前用户、角色、待审核数量和最近编辑数量。
- Node 提供 `/workbench/bootstrap` 聚合接口，一次返回：
  - 当前用户及权限；
  - 状态与计价模式字典；
  - 待审核数量；
  - 最近编辑的 5 个方案。
- 方案列表支持：
  - 名称或编号关键词；
  - 状态；
  - 计价模式；
  - 创建人；
  - 更新时间范围；
  - 分页和更新时间排序。
- 筛选条件同步到 URL Query，刷新页面后能够恢复。
- 页面需要具备加载、空数据、无权限、接口失败四类状态。

### 验收标准

- 修改筛选条件后 URL Query 同步变化。
- 复制带 Query 的链接后可以恢复相同筛选条件。
- Viewer 看不到“新建方案”按钮。
- 列表接口只返回页面需要的字段，不直接暴露数据库对象。

## 9.3 方案基本信息

### 字段

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 方案名称 | string | 必填，2—50 字符 |
| 方案编号 | string | 创建时由服务端生成，只读且唯一 |
| 适用范围 | string | 必填，2—100 字符，使用虚构业务描述 |
| 计价模式 | `UNIT_PRICE` / `TOTAL_POOL` | 必填；修改后重新校验规则行 |
| 生效日期 | date | 必填，必须是有效日期 |
| 备注 | string | 选填，不超过 500 字符 |

### 功能要求

- 创建页面生成空白视图模型。
- 详情接口 DTO 通过适配层转换为编辑视图模型。
- 切换计价模式时弹出确认提示，并清理另一模式的无效字段。
- 已进入 PENDING_REVIEW 或 PUBLISHED 的方案不可编辑。

## 9.4 复杂规则编辑器

### 规则结构

- 每个方案固定包含四个规则组。
- 每个规则组可以动态新增和删除规则行。
- 每组至少保留一行。
- 表格使用两级表头和固定 11 个业务字段。
- 通用按钮、输入框可以使用 Element Plus；复杂表格布局和跨行交互由项目自行实现。

### 11 个字段

| 分组 | 字段 | 说明 |
| --- | --- | --- |
| 区间设置 | `rangeStart` | 区间起始值 |
| 区间设置 | `rangeEnd` | 区间结束值 |
| 计价设置 | `unitPrice` | 单价模式必填 |
| 计价设置 | `totalAmount` | 总盘模式必填 |
| 调整系数 | `qualityFactor` | 质量系数，默认 1 |
| 调整系数 | `timelinessFactor` | 时效系数，默认 1 |
| 调整系数 | `complexityFactor` | 复杂度系数，默认 1 |
| 调整系数 | `riskFactor` | 风险系数，默认 1 |
| 控制信息 | `effectiveDate` | 行级生效日期 |
| 控制信息 | `enabled` | 是否启用 |
| 控制信息 | `remark` | 行备注 |

字段仅用于虚构演示，不对应任何真实公司业务公式。

### 行级校验

- `rangeStart >= 0`。
- `rangeEnd > rangeStart`。
- 金额大于 0，最多两位小数。
- 系数范围为 `0—2`，最多两位小数。
- 日期必填。
- 备注最多 200 字符。

### 跨行校验

- 同一规则组的区间按起始值升序排列。
- 区间不允许重叠。
- 除第一行外，当前行 `rangeStart` 必须等于上一行 `rangeEnd`，保证连续。
- 删除中间行后立即重新计算连续性错误。
- 前端保存草稿时允许部分字段未完成，但必须提示错误数量。
- 提交审核时必须通过全部字段及跨行校验。

### 模式校验

- `UNIT_PRICE`：`unitPrice` 必填，`totalAmount` 必须为空。
- `TOTAL_POOL`：`totalAmount` 必填，`unitPrice` 必须为空。
- 切换模式后自动清理不再适用的字段。

### 配置驱动边界

- 字段元数据、标题、控件类型和基础校验通过前端本地配置定义。
- 使用组件注册表将 `number`、`date`、`switch`、`text` 映射到编辑组件。
- 本期不开发用户可操作的拖拽表单设计器或模板管理后台。

### 交互要求

- 支持新增、复制和删除规则行。
- 删除前二次确认。
- 校验失败时展示规则组、行号和字段信息。
- 点击顶部错误摘要可以定位到第一个错误字段。
- 编辑页面刷新前将未提交内容备份到 `localStorage`。
- 重新进入页面时检测本地备份，并由用户选择恢复或丢弃。
- 离开存在未保存改动的页面时进行提示。

## 9.5 保存草稿

### 功能要求

- 只有 Editor 可以保存自己负责的 DRAFT 或 REJECTED 方案。
- 保存请求包含 `baseVersion`。
- 服务端执行字段结构校验，但允许业务字段暂未完全填写。
- 保存成功后：
  - 更新方案内容；
  - REJECTED 方案重新保存后转为 DRAFT；
  - `editVersion + 1`；
  - 记录简化审计日志；
  - 返回新的 `editVersion` 和更新时间。
- 保存成功后删除相应本地备份。

### 异常要求

- `409`：提示数据已被其他页面更新，保留本地输入。
- `403`：提示没有操作权限并回到详情页。
- `422`：展示服务端字段校验结果。
- `500`：展示 Request ID，便于关联服务端日志。

## 9.6 提交审核

### 功能要求

- 提交前执行前端完整校验。
- 服务端重新执行：
  - 登录状态；
  - Editor 权限；
  - 当前状态；
  - `baseVersion`；
  - 完整字段校验；
  - 跨行与模式规则校验。
- 在一个数据库事务中：
  1. 创建不可变版本快照；
  2. 更新方案当前版本号和状态为 PENDING_REVIEW；
  3. 写入审计日志。
- 任一步失败则整体回滚。

### 验收标准

- 数据不完整时无法提交。
- 事务中故意制造异常后，不产生半条版本数据。
- 重复点击通过前端按钮锁和服务端状态校验避免生成重复审核版本。

本期不单独建设完整幂等记录表；如果开发进度提前，再补 `Idempotency-Key`。

## 9.7 审核

### 功能要求

- Reviewer 可以在详情页查看提交版本。
- 审核通过前需要填写可选审核意见。
- 驳回时审核意见必填，长度 2—200 字符。
- Reviewer 不能审核自己提交的方案。
- 审核通过事务包括：
  - 更新方案状态为 PUBLISHED；
  - 更新发布版本引用；
  - 更新版本审核状态；
  - 写入审计日志。
- 驳回后方案进入 REJECTED，Editor 可继续修改。

## 9.8 详情、版本与差异对比

### 功能要求

- 展示基本信息、四组规则、当前状态、负责人和审核意见。
- 展示版本列表：版本号、提交人、提交时间、审核结果、版本说明。
- 允许选择任意两个版本进行对比。
- 差异类型包括：
  - 基本信息修改；
  - 规则行新增；
  - 规则行删除；
  - 字段值修改。
- 差异算法放在 `packages/rule-engine` 中，使用纯 TypeScript 实现并独立测试。
- 服务端返回版本快照，前端负责差异可视化；也可以由共享规则包在浏览器端计算。
- 本期不实现一键回滚，只展示差异。

## 9.9 操作时间线

### 功能要求

- 详情页底部展示该方案的操作时间线。
- 时间线包含创建、保存、提交、审核通过、驳回操作。
- 每条记录展示操作人、时间、动作和简短说明。
- Viewer 只能查看已发布方案的时间线。

## 9.10 全局异常与日志

### 功能要求

- 每个请求生成 Request ID。
- Node 统一处理未认证、无权限、参数错误、业务校验、并发冲突和系统异常。
- 返回格式统一为：

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Array<{
      path: string;
      message: string;
    }>;
  };
  requestId: string;
}
```

- 日志至少包含 Request ID、请求方法、路径、状态码、耗时和用户 ID。
- 密码、Token 和完整规则内容不得写入日志。
- P0 使用 Nest Logger 即可；Pino 放到可选增强，不阻塞主流程。

---

## 10. BFF 职责边界

### 10.1 Node/BFF 负责

- 登录鉴权和角色权限判断。
- 根据页面需要聚合用户、权限、字典、最近方案和待办数量。
- 将数据库模型转换为稳定的前端 DTO。
- 统一请求校验、响应格式、错误码和日志。
- 服务端规则复验。
- 状态流转、版本快照、审计记录和事务。
- 乐观锁与并发冲突处理。

### 10.2 前端负责

- 表格编辑、焦点、展开、错误定位和未保存提醒。
- 即时校验和交互反馈。
- 服务端数据缓存和刷新。
- 本地草稿备份。
- 版本差异展示。

### 10.3 共享代码负责

- 请求和响应 Schema。
- TypeScript 类型。
- 纯领域校验函数。
- 状态流转规则。
- 版本差异算法。

共享代码不能依赖 Vue、NestJS、Prisma 或浏览器 API。

---

## 11. API 设计清单

### 11.1 认证

| Method | Path | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | 登录并写入 Cookie |
| POST | `/api/auth/logout` | Login | 清除 Cookie |
| GET | `/api/auth/me` | Login | 获取当前用户与角色 |

### 11.2 工作台

| Method | Path | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/workbench/bootstrap` | Login | 聚合用户、权限、字典与摘要 |

### 11.3 方案

| Method | Path | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/schemes` | Login | 筛选、分页、排序 |
| POST | `/api/schemes` | Editor | 创建草稿 |
| GET | `/api/schemes/:id` | Login | 获取详情 |
| PUT | `/api/schemes/:id/draft` | Editor | 保存草稿并校验 baseVersion |
| POST | `/api/schemes/:id/submit` | Editor | 提交审核并创建版本 |
| POST | `/api/schemes/:id/approve` | Reviewer | 审核通过 |
| POST | `/api/schemes/:id/reject` | Reviewer | 驳回 |
| GET | `/api/schemes/:id/versions` | Login | 获取版本列表 |
| GET | `/api/schemes/:id/versions/:versionId` | Login | 获取指定版本快照 |
| GET | `/api/schemes/:id/audit-logs` | Login | 获取操作时间线 |

接口实现完成后生成 Swagger/OpenAPI 文档。

---

## 12. 数据模型

为缩短工期，P0 只保留四张核心业务表，角色使用枚举，不拆分角色权限关系表。

## 12.1 users

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| email | varchar unique | 登录账号 |
| passwordHash | varchar | 密码摘要 |
| displayName | varchar | 显示名称 |
| role | enum | VIEWER / EDITOR / REVIEWER |
| enabled | boolean | 是否启用 |
| createdAt | timestamp | 创建时间 |

## 12.2 schemes

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| code | varchar unique | 服务端生成的方案编号 |
| name | varchar | 方案名称 |
| scope | varchar | 适用范围 |
| pricingMode | enum | UNIT_PRICE / TOTAL_POOL |
| effectiveDate | date | 生效日期 |
| remark | varchar | 备注 |
| status | enum | DRAFT / PENDING_REVIEW / PUBLISHED / REJECTED |
| ownerId | UUID FK | 负责人 |
| content | JSONB | 当前可编辑规则内容 |
| editVersion | integer | 乐观锁版本号 |
| currentVersionNo | integer | 最新提交版本号 |
| publishedVersionId | UUID nullable | 当前发布版本 |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

## 12.3 scheme_versions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| schemeId | UUID FK | 所属方案 |
| versionNo | integer | 方案内递增版本号 |
| snapshot | JSONB | 不可变完整快照 |
| submitterId | UUID FK | 提交人 |
| reviewStatus | enum | PENDING / APPROVED / REJECTED |
| reviewComment | varchar nullable | 审核意见 |
| reviewerId | UUID nullable | 审核人 |
| createdAt | timestamp | 创建时间 |
| reviewedAt | timestamp nullable | 审核时间 |

约束：`schemeId + versionNo` 唯一。

## 12.4 audit_logs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| schemeId | UUID FK | 所属方案 |
| actorId | UUID FK | 操作人 |
| action | enum | CREATE / SAVE / SUBMIT / APPROVE / REJECT |
| summary | varchar | 操作摘要 |
| requestId | varchar | 请求关联 ID |
| createdAt | timestamp | 操作时间 |

### 12.5 存储取舍

- 方案可搜索字段采用结构化列，便于筛选和建立索引。
- 复杂规则内容使用 JSONB，便于整套保存、创建版本快照和演进字段结构。
- 本项目不需要按任意规则行字段进行高频报表查询，因此不把每个规则单元格完全拆表。
- 前端不能直接复用 Prisma Model 类型，必须通过 DTO/Schema 隔离数据库结构。

---

## 13. 前端状态设计

### 13.1 TanStack Vue Query 管理

- 当前用户。
- 工作台初始化数据。
- 方案列表。
- 方案详情。
- 版本列表和版本快照。
- 保存、提交和审核后的缓存失效。

### 13.2 Pinia 管理

- 当前编辑器视图模型。
- 未保存状态。
- 当前校验结果和错误摘要。
- 本地草稿恢复状态。
- 不适合放入 URL 或服务端缓存的交互状态。

### 13.3 URL 管理

- 列表关键词、状态、模式、页码和排序。
- 版本对比时选择的两个版本号。

避免把所有数据都放入 Pinia，也避免将组件局部状态提升为全局状态。

---

## 14. Monorepo 与代码分层

```text
rule-workbench/
├─ apps/
│  ├─ web/                    # Vue 3 前端
│  └─ bff/                    # NestJS 服务层
├─ packages/
│  ├─ contracts/              # Zod Schema、DTO、错误码
│  ├─ rule-engine/            # 领域校验、状态机、版本差异
│  └─ shared/                 # 无业务依赖的通用工具
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ e2e/                       # Playwright
├─ docker-compose.yml         # P0 只启动 PostgreSQL
└─ .github/workflows/ci.yml
```

### 14.1 依赖约束

- `web` 和 `bff` 可以依赖 `contracts` 与 `rule-engine`。
- `contracts` 和 `rule-engine` 不能反向依赖应用层。
- `web` 不能依赖 Prisma。
- Controller 只处理 HTTP 输入输出，不直接写数据库逻辑。
- Nest Service 负责用例编排，Repository/Prisma Service 负责持久化。
- Vue 页面负责组织业务流程，复杂规则逻辑下沉到 Store、Composable 或 rule-engine。

---

## 15. 全部技术栈

## 15.1 P0 必用技术

| 分类 | 技术 | 使用位置 |
| --- | --- | --- |
| 语言 | TypeScript strict | 前端、BFF、共享包 |
| 前端框架 | Vue 3、Composition API、`<script setup>` | Web 应用 |
| 构建 | Vite | Web 构建与开发服务 |
| UI | Element Plus、原生 HTML table、CSS/Less | 页面与复杂表格 |
| 路由 | Vue Router | 路由、权限守卫、离开拦截 |
| 客户端状态 | Pinia | 编辑器和交互状态 |
| 服务端状态 | TanStack Vue Query | 查询缓存、Mutation、失效与刷新 |
| HTTP | Axios | 请求封装、错误处理、Request ID |
| Node 运行时 | Node.js 24 LTS | BFF 运行环境 |
| Node 框架 | NestJS | Module、Controller、Service、Guard、Pipe、Interceptor、Filter |
| 认证 | `@nestjs/jwt`、Cookie、密码哈希库 | 登录与会话 |
| Schema | Zod / Standard Schema | 请求、响应和领域数据运行时校验 |
| API 文档 | Swagger / OpenAPI | 接口文档 |
| 数据库 | PostgreSQL | 业务数据、版本、审计 |
| ORM | Prisma | Schema、Migration、Seed、查询、事务 |
| 单元测试 | Vitest | 规则函数、状态机、前端工具函数 |
| 组件测试 | Vue Test Utils | 规则表格和权限交互 |
| 接口测试 | Supertest、Nest Testing | 鉴权、权限、事务、冲突 |
| E2E | Playwright | 一条核心业务流程 |
| Monorepo | pnpm workspace | 管理 apps 与 packages |
| 代码质量 | ESLint、Prettier、vue-tsc | Lint、格式、类型检查 |
| CI | GitHub Actions | 类型检查、测试和构建 |
| 本地环境 | Docker Compose | 启动 PostgreSQL |
| 日志 | Nest Logger、Request ID | 基础结构化日志与问题关联 |
| 版本管理 | Git、GitHub | 代码、PR、分支保护 |

### 15.2 本期不使用或不写入简历

| 技术 | 原因 |
| --- | --- |
| Redis | 当前数据量与读取压力不需要；会增加缓存一致性工作 |
| BullMQ | 本期无必须异步执行的大任务 |
| SSE / WebSocket | 本期无实时推送需求 |
| Refresh Token Rotation | 会明显扩大安全与数据模型范围 |
| GraphQL | REST 已足够表达页面需求 |
| 微服务 | 单体模块化架构足以证明服务端能力 |
| Kubernetes | 与个人项目核心目标无关 |
| Storybook | 非组件库项目，收益不足 |
| Husky / commitlint | 可选，不作为投递版完成条件 |
| Pino | Nest Logger 足够；提前完成后再替换 |

### 15.3 版本策略

- Node.js 使用 24 LTS。
- 其他依赖在初始化项目时使用相互兼容的稳定版本并锁定 `pnpm-lock.yaml`。
- 不追逐 Current、RC 或 Beta 版本。
- README 记录 Node 与 pnpm 要求。

---

## 16. 非功能需求

### 16.1 安全

- 密码哈希存储，不保存明文。
- JWT 放入 HttpOnly Cookie。
- Cookie 设置合理的 SameSite；生产环境使用 Secure。
- 登录和所有写接口执行服务端校验。
- Zod 拒绝未知或非法字段。
- 日志中不记录密码、Token 和完整规则内容。
- 所有 SQL 通过 Prisma 参数化查询。
- 前端不使用 `v-html` 展示用户输入。

### 16.2 可维护性

- TypeScript 开启 strict，不使用无边界 `any`。
- 领域模型、接口 DTO、数据库模型和视图模型分层。
- 跨行校验、状态机和版本差异使用纯函数。
- README 记录关键取舍，而不是只写安装命令。

### 16.3 性能

- 路由级懒加载。
- 方案列表分页查询。
- 规则表格在 100 行以内保持可用，不专门实现虚拟列表。
- 避免深度 watch 整个大对象；按规则组或操作事件触发校验。
- 版本快照按需加载，不在详情首屏加载全部 JSON。

### 16.4 兼容范围

- 仅保证最新版 Chrome 和 Edge。
- 页面面向桌面端，建议最小宽度 1280px。
- 不处理 IE 和移动端布局。

---

## 17. 测试范围

为了缩短工期，不追求覆盖率数字，优先覆盖能够证明技术能力的关键风险。

## 17.1 必须完成的单元测试

- 区间合法、连续、不重叠。
- 单价/总盘模式字段切换。
- 四类系数边界。
- 状态机合法与非法流转。
- 版本差异：新增行、删除行、修改字段。

## 17.2 必须完成的组件测试

- 新增和删除规则行。
- 删除中间行后出现连续性错误。
- 切换计价模式后清理不适用字段。
- 点击错误摘要定位字段。
- Viewer 不显示编辑按钮。

## 17.3 必须完成的接口集成测试

- 登录成功与失败。
- Viewer 创建方案返回 403。
- Editor 提交完整方案成功。
- 非法规则提交返回 422。
- 旧 `baseVersion` 保存返回 409。
- 提交事务失败后版本和状态都不变化。
- Reviewer 审核自己提交的方案被拒绝。

## 17.4 必须完成的 E2E

只要求一条稳定的主流程：

```text
Editor 登录
→ 创建方案
→ 填写四组规则
→ 保存并提交
→ Reviewer 登录
→ 审核通过
→ Viewer 登录
→ 查看发布版本与操作时间线
```

如时间不足，不增加第二条 E2E，其他边界使用单元和接口测试覆盖。

---

## 18. CI 质量门禁

GitHub Actions 至少执行：

1. 安装锁定依赖。
2. `vue-tsc` 与 TypeScript 类型检查。
3. ESLint。
4. Vitest 单元和组件测试。
5. 启动测试 PostgreSQL，执行 Prisma Migration。
6. Supertest 接口集成测试。
7. Web 与 BFF 构建。

Playwright 可以在 P0 末期接入 CI；如果稳定性不足，先保证本地可重复运行，不为了“全绿”写不真实描述。

只有真实配置 GitHub 分支保护和 Required Status Check 后，简历才写“失败阻断合并”。

---

## 19. 基于当前能力的学习分级

## 19.1 已具备，不需要重新系统学习

这些能力可以直接用于项目：

- JavaScript ES6+、异步编程、浏览器基础。
- Vue 2 生产经验和组件化思维。
- 复杂 B 端页面、表格、表单和权限交互。
- 配置驱动、动态组件、权限过滤和状态展示。
- Webpack 5、动态加载、Bundle 分析和首屏优化思路。
- 微前端子应用开发、问题定位、灰度交付和线上维护。
- 需求评审、技术方案、任务拆分、Code Review 和跨团队协作。

项目开发时应把精力放在迁移与补足，不再从头复习 Vue 2、JavaScript 或 Webpack。

## 19.2 开工前必须补到“能独立解释”的基础

建议控制在 **5—7 天，每天约 2 小时**，不要求学完整门课程。

### A. TypeScript strict 最小基础

必须掌握：

- `type`、`interface`、联合类型、交叉类型。
- 类型收窄、判别联合、类型守卫。
- 泛型函数和泛型约束。
- `keyof`、`typeof`、索引访问类型。
- `Partial`、`Pick`、`Omit`、`Record`、`ReturnType`、`Awaited`。
- 可选字段、空值和 `unknown` 的处理。
- DTO、领域模型和视图模型为什么不能直接混用。

暂不需要：复杂类型体操、编译器源码、装饰器底层实现。

### B. Vue 3 最小基础

你已经开始学习 Vue 3，本项目开工前需要确保能独立完成：

- `ref`、`reactive`、`computed`、`watch`、`watchEffect` 的边界。
- `<script setup>`、`defineProps`、`defineEmits`、模板引用。
- Composition API 的 Composable 拆分。
- Vue Router 4 路由、守卫和参数。
- Pinia Store 的 state、getter、action。

暂不需要：Vue 编译器源码、SSR、手写响应式系统。

### C. Node.js 与 HTTP 基础

必须掌握：

- Node.js 与浏览器运行环境的主要差异。
- ESM、环境变量、异步 I/O、错误传播。
- HTTP Method、状态码、Header、Cookie、CORS。
- 请求生命周期和统一异常处理的基本概念。
- 为什么服务端不能信任前端校验。

暂不需要：Stream 深入、高并发调优、Cluster、Node 源码。

### D. NestJS 最小基础

必须掌握：

- Module、Controller、Service、Provider。
- 依赖注入。
- Guard、Pipe、Interceptor、Exception Filter 分别解决什么问题。
- DTO/Schema 校验。
- 如何组织 Auth、Scheme、Workbench 模块。

暂不需要：Nest 源码、微服务模块、CQRS、复杂动态模块。

### E. 数据库基础

必须掌握：

- 表、主键、外键、唯一约束。
- 一对多关系。
- `SELECT`、`INSERT`、`UPDATE`、`DELETE` 的基本 SQL。
- 索引解决什么问题，为什么不能给所有字段建索引。
- 事务和 ACID 的基本含义。
- 乐观锁与悲观锁的区别。
- JSONB 为什么适合版本快照，以及它的查询局限。

暂不需要：数据库内核、复杂执行计划、分库分表。

### F. 登录与安全基础

必须掌握：

- 认证与授权的区别。
- JWT 的组成和服务端验证过程。
- HttpOnly、Secure、SameSite。
- 密码为什么必须哈希。
- XSS、CSRF、CORS 的概念及其关系。
- `401` 与 `403` 的区别。

## 19.3 可以边做边学

这些技术不需要先学完，遇到对应任务时再学习：

| 技术 | 边做边学的任务 |
| --- | --- |
| Prisma | 建表、Migration、Seed、CRUD、事务 |
| Zod / Standard Schema | 第一个登录 DTO 和 Scheme DTO |
| TanStack Vue Query | 方案列表查询和保存 Mutation |
| Axios 拦截器 | 统一错误、401 跳转、Request ID |
| Vitest | 第一个区间校验函数 |
| Vue Test Utils | 第一版规则表格完成后 |
| Supertest | 登录接口和权限接口完成后 |
| Playwright | 核心流程打通后 |
| Swagger/OpenAPI | 接口稳定后补注解和示例 |
| GitHub Actions | 本地命令全部跑通后迁移到 CI |
| Docker Compose | 需要统一 PostgreSQL 环境时 |
| 乐观锁实现 | 草稿保存接口完成后 |
| 数据库事务 | 提交审核功能开发时 |
| 版本差异算法 | 版本快照打通后 |

原则：每次只学习当前功能所需的最小知识，完成并测试后再进入下一项。

## 19.4 本期直接后置

- Redis 与缓存一致性。
- BullMQ、任务队列、SSE。
- Node Stream 深入。
- NestJS 源码和高级微服务能力。
- PostgreSQL 高级调优、分区和复制。
- Kubernetes、服务网格、分布式锁。
- TypeScript 高难类型体操。

---

## 20. 缩短工期后的实施计划

## 第 0 阶段：前置基础，5—7 天

- TS strict 最小知识。
- Vue 3/Pinia 查漏补缺。
- Node、HTTP、NestJS 基础。
- SQL、事务、JWT/Cookie 安全基础。
- 产出：能口头解释核心概念，并分别写出一个 Vue 表单、Nest CRUD 和 Prisma 查询小练习。

## 第 1 周：骨架、登录与查询闭环

- 创建 pnpm workspace。
- 初始化 web、bff、contracts、rule-engine。
- PostgreSQL + Prisma Schema + Seed。
- 登录、退出、当前用户、路由守卫。
- 工作台聚合接口、方案列表和筛选。
- 产出：三类账号可登录，不同角色看到不同操作。

## 第 2 周：复杂规则编辑器

- 基本信息表单。
- 四组规则、11字段、动态增删行。
- 本地配置驱动和组件注册表。
- 行级、跨行、模式校验。
- Pinia 编辑状态、本地草稿、离开提醒。
- 产出：可以新建并保存包含四组规则的草稿。

## 第 3 周：审核、版本、事务与并发

- 提交审核和服务端规则复验。
- 数据库事务与不可变版本快照。
- Reviewer 审核通过和驳回。
- 操作时间线。
- 乐观锁与 `409 Conflict`。
- 版本列表和差异算法。
- 产出：完整业务闭环和主要 Node 技术证明点全部可演示。

## 第 4 周：测试与工程质量

- 补核心单元测试。
- 规则表格组件测试。
- 登录、权限、事务、冲突接口测试。
- 一条 Playwright 主流程。
- GitHub Actions、分支保护、Swagger。
- 产出：CI 可运行，核心风险有测试证据。

## 第 5 周：缓冲与投递材料

- 修复遗留问题。
- Docker Compose、Seed 和一键启动。
- README、架构图、数据模型图、演示 GIF/截图。
- 脱敏检查。
- 整理两版简历描述和面试问答。
- 有余力再部署公开演示；部署不是阻塞简历投递的绝对条件。

### 工期结论

- **最快可演示**：前置学习后约 3 周开发。
- **达到简历可写标准**：总计约 5 周。
- **保守上限**：6 周；超过 6 周时必须删减功能，不能继续增加技术栈。

---

## 21. 开发优先级与删减顺序

如果进度落后，按以下顺序删减：

1. 删除版本差异的复杂视觉效果，只保留字段级高亮列表。
2. 删除复制规则行，只保留新增和删除。
3. E2E 只保留一条主流程。
4. Pino 改为 Nest Logger。
5. 不做公开部署，只保证 Docker Compose 和 README 可复现。
6. 不做 Idempotency-Key，只保留按钮防重复、状态校验和事务。

不能删减：

- TypeScript strict。
- 复杂规则表格与跨行校验。
- 服务端鉴权与角色权限。
- 服务端规则复验。
- 提交审核事务。
- 不可变版本快照。
- 乐观并发控制。
- 至少一组单元测试、接口测试和 E2E。
- CI 中的类型检查、测试和构建。

---

## 22. 最终验收标准

只有满足以下条件，才视为达到可投递状态：

### 22.1 功能

- 三个演示账号能够登录。
- Editor 能创建、保存和提交方案。
- Reviewer 能审核通过和驳回。
- Viewer 能查看发布方案。
- 四组规则、11字段、两种计价模式可正常编辑和校验。
- 版本列表、差异和操作时间线可以查看。
- 多人编辑冲突不会静默覆盖数据。

### 22.2 Node/BFF

- 服务端真实执行身份、角色、状态和规则校验。
- 工作台聚合接口存在且有清晰 DTO。
- 提交和审核使用数据库事务。
- 能演示一次事务回滚和一次 409 冲突。
- Swagger/OpenAPI 可以查看核心接口。

### 22.3 工程质量

- strict 模式下无大面积 `any`。
- 本地一条命令可以启动 PostgreSQL。
- Migration 和 Seed 可重复执行。
- 必须测试全部通过。
- GitHub Actions 真实运行类型检查、测试和构建。
- README 能让其他开发者完成启动和演示。

### 22.4 面试准备

不依赖 AI 也能解释并修改：

- DTO、领域模型、数据库模型和视图模型的区别。
- 为什么复杂规则使用 JSONB 快照。
- 为什么前后端都要校验。
- Guard、Pipe、Interceptor、Filter 的边界。
- 提交事务包含哪些数据库操作。
- 409 冲突如何产生和处理。
- Pinia 与 Vue Query 分别管理什么状态。
- 为什么没有加入 Redis、消息队列和微服务。

---

## 23. 完成后的简历描述模板

> 下列内容是目标完成态，未完成的功能必须从实际简历中删除。

### 高级前端版

**规则驱动业务配置工作台｜个人项目｜2026.09—至今**  
Vue 3｜TypeScript strict｜Vite｜Pinia｜TanStack Vue Query｜Vitest｜Playwright｜GitHub Actions

- 使用 Vue 3 + TypeScript strict 实现规则方案查询、复杂表格编辑、审核发布及版本对比闭环；通过组件注册表驱动 11 个业务字段渲染，并将区间连续、不重叠及模式切换规则抽为独立领域函数。
- 按领域模型、接口 DTO 与视图模型划分类型边界，使用 Vue Query 管理服务端状态、Pinia 管理编辑草稿和校验状态，并通过本地草稿及 409 冲突交互避免用户输入丢失。
- 使用 Vitest、Vue Test Utils 与 Playwright 覆盖领域规则、核心组件和创建至发布流程；GitHub Actions 执行类型检查、测试和构建。

### 前端主导型全栈 / BFF 版

**规则驱动业务配置工作台｜个人全栈项目｜2026.09—至今**  
Vue 3｜TypeScript strict｜NestJS｜PostgreSQL｜Prisma｜Zod｜Vitest｜Supertest｜Playwright

- 使用 NestJS 构建面向工作台的 Node 服务层，聚合用户权限、状态字典和方案摘要，通过 Guard、Schema 校验与全局异常处理统一鉴权、运行时校验和错误响应。
- 基于 PostgreSQL + Prisma 设计方案、不可变版本和审计模型，通过事务保证版本快照、状态更新与操作日志的一致性，并使用 `baseVersion` 乐观锁处理多人编辑冲突。
- 在 pnpm workspace 中共享接口契约、状态机和规则引擎，以接口集成测试验证无权限访问、非法状态流转、事务回滚和并发冲突；GitHub Actions 执行类型检查、测试与构建。

简历中应明确为个人项目实践，不写成 Vue 3、TypeScript 或 Node.js 生产经验。

---

## 24. 开工前检查清单

- [ ] 已确认项目只使用虚构名称、数据和规则。
- [ ] 已完成 5—7 天前置基础学习。
- [ ] 已安装 Node.js 24 LTS、pnpm、Docker 和 PostgreSQL 客户端。
- [ ] 已建立 GitHub 仓库和基础 README。
- [ ] 已锁定 P0 范围，没有 Redis、队列和管理后台。
- [ ] 已先定义状态枚举、核心 Schema 和数据库表，再开始写页面。
- [ ] 已为每周设置可以运行和演示的里程碑。
- [ ] 每完成一个核心模块，都能脱离 AI 解释和修改关键代码。
