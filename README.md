# 规则驱动业务配置工作台

一个用于配置业务计价规则的全栈项目。前端提供方案工作台和规则表格，NestJS BFF 负责登录鉴权、接口校验与数据持久化；前后端通过共享类型和 Schema 约定数据结构。

> 当前阶段可体验登录、方案查询和新建草稿。审核发布、版本对比、已有草稿的再次编辑等流程尚未实现。

## 当前功能

- **登录与权限**：邮箱密码登录、退出、会话恢复；使用 HttpOnly Cookie 保存 JWT。前端控制页面入口，BFF 校验受保护接口和创建权限。
- **方案工作台**：展示方案总数、待审核数和最近更新数；支持按关键词、状态、计价模式、创建人及更新时间筛选，并提供排序和分页。
- **新建方案草稿**：填写基本信息，在四组规则表格中新增、复制或删除规则行；根据单价或总盘模式显示不同金额字段。保存时写入方案和创建审计记录。
- **规则检查**：前端检查必填项、金额、系数以及区间重叠或断档，并可定位到对应单元格。草稿允许规则暂未填完；BFF 会校验提交内容的结构。
- **统一接口响应**：成功和失败响应都包含 `requestId`，方便定位请求。

## 技术栈与目录

| 路径 | 用途 | 主要技术 |
| --- | --- | --- |
| `apps/web` | 页面与交互 | Vue 3、TypeScript、Vite、Element Plus、Pinia、TanStack Query |
| `apps/bff` | HTTP API 与业务逻辑 | NestJS、Prisma、PostgreSQL、JWT |
| `packages/contracts` | 前后端共享类型与数据结构 | TypeScript、Zod |
| `packages/rule-engine` | 独立于 UI 的规则校验 | TypeScript |

仓库使用 pnpm workspace 管理，单元与接口测试使用 Vitest，GitHub Actions 执行质量检查。

## 本地启动

需要 Node.js `>=24.15.0`、pnpm `>=12.0.0`（仓库指定 `12.4.2`）以及 Docker Compose。以下命令均在仓库根目录执行。

1. 安装依赖，并将 `apps/bff/.env.example` 复制为 `apps/bff/.env`。示例命令适用于 PowerShell：

   ```powershell
   pnpm install
   Copy-Item apps/bff/.env.example apps/bff/.env
   ```

   `.env.example` 中的数据库连接与 `compose.yaml` 一致；可按需调整端口，并为 `JWT_SECRET` 设置本地密钥。

2. 启动数据库，构建共享包，再生成 Prisma Client、应用迁移并写入演示数据：

   ```powershell
   docker compose up -d
   pnpm build:libs
   pnpm prisma:generate
   pnpm db:migrate:deploy
   pnpm db:seed
   ```

3. 启动 Web 和 BFF：

   ```powershell
   pnpm dev
   ```

打开 [http://localhost:5173](http://localhost:5173)。Web 默认使用 `5173` 端口，BFF 使用 `3000` 端口，PostgreSQL 使用 `5432` 端口。开发环境中的 `/api` 请求由 Vite 代理到 BFF。可通过 [http://localhost:3000/api/health](http://localhost:3000/api/health) 检查服务状态。

只启动单个服务可使用 `pnpm dev:web` 或 `pnpm dev:bff`；停止数据库容器可使用 `docker compose stop`。

### 演示账号

运行 `pnpm db:seed` 后可使用以下本地账号：

| 角色 | 邮箱 | 密码 | 当前可体验的操作 |
| --- | --- | --- | --- |
| 查看者 | `viewer@example.com` | `Viewer123` | 查看工作台与方案列表 |
| 编辑者 | `editor@example.com` | `Editor123` | 查看列表、新建方案草稿 |
| 审核者 | `reviewer@example.com` | `Reviewer123` | 查看工作台与方案列表 |

这些账号仅用于本地演示。审核者的审核操作属于后续开发范围。

用编辑者账号登录后，可进入“新建方案”，选择计价模式并填写规则行；点击“检查区间”查看定位提示，再保存草稿并回到方案列表。

## 主要 API

所有路径均以 `/api` 为前缀；除健康检查和登录外，需要先登录。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `POST` | `/auth/login` | 登录并设置 Cookie |
| `GET` | `/auth/me` | 获取当前会话 |
| `POST` | `/auth/logout` | 退出登录 |
| `GET` | `/workbench/bootstrap` | 获取工作台统计、字典和最近方案 |
| `GET` | `/schemes/getSchemeList` | 分页查询方案 |
| `POST` | `/schemes/createSchemeDraft` | 创建草稿，仅编辑者可用 |

## 开发与检查

```powershell
pnpm lint          # 代码检查
pnpm typecheck     # 类型检查
pnpm test:unit     # 单元与组件测试
pnpm test:e2e      # BFF 接口测试，需先完成上面的环境初始化
pnpm build         # 构建各子项目
pnpm check         # Lint、类型检查、单元测试与构建
```

修改 `apps/bff/prisma/schema.prisma` 后，先在 `apps/bff` 中创建迁移，再运行 `pnpm prisma:generate`。已有迁移在初始化环境时通过 `pnpm db:migrate:deploy` 应用。
