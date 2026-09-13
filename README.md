# Stellar-Sense（遥感通）

大模型驱动的高校专业自适应学习与伴学智能体（以遥感学科为例）。

学科星图、节点学习、路径规划、学习记录、AI 学习助手（SSE 流式）、学习驾驶舱，
以及个人资料、账号和通知设置已接入后端 API，相关业务数据持久化到 MySQL。
AI 支持真实模型调用和内置 Mock 演示两种模式；部分界面仍保留演示功能，见下方说明。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 + Vite + TanStack Router/Query + shadcn/ui + Tailwind，`pnpm` 管理 |
| 后端 | FastAPI + SQLAlchemy 2.0 (async) + aiomysql + Pydantic v2，`uv` 管理 |
| 数据库 | MySQL 8（本机实例，库名 `stellar_sense`） |
| LLM | OpenAI 兼容接口（默认 DeepSeek）；未配置 Key 或调用失败时使用内置 Mock 回复 |

## 目录结构

```
backend/
  app/
    main.py         FastAPI 入口、启动建表和异常处理
    config.py       读取 backend/.env
    database.py     数据库引擎与异步会话
    deps.py         当前用户与身份校验依赖
    api/            HTTP 接口
    models/         数据库模型
    schemas/        请求与响应模型
    services/       模型调用、提示词、学习进度和认证工具
    seed/           演示数据及初始化入口
  tests/            后端测试
frontend/
  src/features/     按业务模块组织的页面与 API 调用
  src/lib/          API 客户端、SSE 流解析等工具
  src/stores/       登录状态等全局状态
  vite.config.ts    开发代理与测试配置
```

## 快速开始

准备 MySQL 8、Python 3.12、`uv`、Node.js 和 `pnpm`。前端当前依赖支持
Node.js `20.19+`（20.x）、`22.13+`（22.x）或 `24+`。
以下使用 PowerShell；后端和前端分别在两个终端启动，命令均从仓库根目录开始。

### 1. 数据库（本机 MySQL 8）

首次执行（root 账号，按需替换密码）：

```sql
CREATE DATABASE IF NOT EXISTS stellar_sense CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'stellar'@'localhost' IDENTIFIED BY 'stellar123';
GRANT ALL PRIVILEGES ON stellar_sense.* TO 'stellar'@'localhost';
FLUSH PRIVILEGES;
```

连接信息在 `backend/.env` 的 `DATABASE_URL` 中配置。上述账号和密码用于本地演示；
如果数据库用户已经存在，`CREATE USER IF NOT EXISTS` 不会修改其密码，请使用实际密码配置连接。

### 2. 后端

```powershell
cd backend
uv sync                                 # 安装依赖（自动创建 .venv）
if (!(Test-Path .env)) {
    Copy-Item .env.example .env          # 仅首次复制，保留已有配置
}
```

编辑 `backend/.env`，确认 `DATABASE_URL` 与本机 MySQL 一致，并设置自己的 `JWT_SECRET`。
然后在同一个后端终端执行：

```powershell
uv run python -m app.seed                # 建表并写入演示账号、知识节点等数据
uv run uvicorn app.main:app --reload --port 8000
```

- 接口文档：http://127.0.0.1:8000/api/docs
- 健康检查：http://127.0.0.1:8000/api/health

后端启动只会创建缺失的表，**不会自动创建演示账号或导入知识节点**。
必须先成功运行种子命令，并看到“种子数据完成”提示。
`python -m app.seed` 通过 `app/seed/__main__.py` 调用初始化逻辑；
也可以运行 `uv run python -m app.seed.run`。

### 3. 前端

另开一个终端，从仓库根目录执行：

```powershell
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:5173；若端口被占用，以 Vite 终端输出的地址为准。
开发环境经 Vite 代理将 `/api` 转发到 `http://127.0.0.1:8000`，默认不需要创建前端 `.env`。
如需覆盖 API 地址，可参考 `frontend/.env.example` 配置 `VITE_API_URL`，地址应包含 `/api`，修改后重启前端。
部署生产构建时，需要由服务器配置 `/api` 反向代理，或在构建前指定 `VITE_API_URL`；
跨域直连还需在后端 `CORS_ORIGINS` 中加入实际前端地址。

### 演示账号

| 账号 | 密码 |
| --- | --- |
| `learner@remote-sensing.ai` | `stellar123` |

演示账号仅在种子脚本成功执行后可用。种子脚本可重复执行，不会重复创建已有演示账号，
也不会重置其密码；知识节点等内容数据会按主键更新，已有演示学习记录和进度会保留。

注册接口会创建新用户及基础设置，不会复制演示账号的学习记录和聊天记录；
学习路径在首次读取时按模板创建。目前 AI 助手页面对没有会话的新用户缺少空状态入口，
建议使用演示账号体验完整聊天流程。

## 启用真实 AI 对话

在 **`backend/.env`** 中设置以下配置（仓库根目录的 `.env` 不用于后端配置）：

```dotenv
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=替换为你自己的API密钥
LLM_MODEL=deepseek-chat
```

`LLM_BASE_URL` 填基础地址，代码会追加 `/chat/completions`。
Key 留空时使用预置 Mock 回复。

**保存后重启后端**：在运行 Uvicorn 的终端按 `Ctrl+C`，再执行：

```powershell
uv run uvicorn app.main:app --reload --port 8000
```

配置在进程启动时读取；仅编辑 `.env` 不应依赖 `--reload` 自动生效。
真实密钥仅保存在本地 `backend/.env`，不要填写到 `.env.example` 或前端配置中。

### 验证连接

后端和前端启动后，在 PowerShell 中执行：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://localhost:5173/api/health
```

第二条请求经过前端代理。检查响应中的 `database` 是否为 `up`；
`llm` 为 `mock` 表示未加载 Key，`deepseek` 表示已加载非空 Key。
当前该字段是固定模式标签，即使配置其他兼容服务也会显示 `deepseek`；
**健康检查不会请求模型服务，不能证明 Key 有效或本次回答来自真实模型**。

登录演示账号，进入 AI 学习助手，新建对话并发送问题。正常流程为：
收到分段回复 → 回复完成 → 刷新页面后仍能看到聊天记录。
若真实模型调用失败，后端会输出“LLM 调用失败”或“LLM 流式调用失败”的日志并降级为 Mock；
因此仅收到回复或 HTTP 200 也不能证明真实模型调用成功。

### 常见问题

| 现象 | 排查方式 |
| --- | --- |
| 演示账号提示邮箱或密码不正确 | 在 `backend/` 运行 `uv run python -m app.seed`，确认成功；核对种子脚本与服务使用的数据库配置 |
| 提示缺少 `app.seed.__main__` | 确认已拉取 `backend/app/seed/__main__.py`；旧版本可运行 `uv run python -m app.seed.run` |
| 后端无法启动或数据库显示 `down` | 检查 MySQL 服务、数据库是否已创建，以及 `DATABASE_URL` 中的用户名、密码和端口 |
| 前端请求失败或代理报连接拒绝 | 确认后端已在 8000 端口启动；核对 Vite 代理和 `VITE_API_URL` |
| 填了 Key 仍显示 `mock` | 确认修改的是 `backend/.env`，重启后端；同名系统环境变量会覆盖 `.env` |
| 显示 `deepseek` 但回复仍是预置内容 | 查看后端降级日志，检查 Key、账户可用额度、模型名称和网络连接 |

## 当前功能边界

- GitHub / Facebook 登录按钮尚未接入第三方登录。
- 找回密码目前只有验证码生成和校验；没有邮件发送及设置新密码的完整流程。
- 外观设置由前端管理，显示设置仍为演示表单，并非所有设置都保存到 MySQL。
- AI 对话框的“添加资料”按钮尚未接入上传处理。

## 常用命令

```powershell
# 后端（backend/）
uv run python -m app.seed     # 幂等种子（表结构 + 演示数据）
uv run pytest                # 后端测试
uv run ruff check .           # 代码检查
uv run ruff format .          # 格式化

# 前端（frontend/）
pnpm lint                     # ESLint
pnpm test                     # Vitest（浏览器模式，需先安装 Chromium）
pnpm build                    # 类型检查 + 生产构建
pnpm test:browser:install     # 安装 Playwright Chromium（首次）
```

## API 一览（前缀 `/api`）

- `auth`：login / register / me / logout / forgot-password / verify-otp
- `knowledge/graph`：学科星图（节点状态与掌握度按当前用户返回）
- `learning/nodes`、`learning/nodes/{id}`、`learning/nodes/{id}/complete`、`learning/history?range=7d|30d|90d`
- `path/plan`、`path/regenerate`（重算阶段并按最新进度生成分析文案）
- `dashboard/summary`：驾驶舱聚合数据
- `ai/conversations`、`ai/chat`（SSE 流式）、`ai/explain`
- `user/profile`、`user/account`、`user/preferences`

常规 HTTP 错误响应包含 `{ "title": "..." }`，部分响应还包含 `detail`。
前端 Query 查询遇到 401 会清除登录态并跳转登录页；提交操作显示错误提示。
聊天使用独立的 SSE 流，回复片段为 `data: {"delta":"..."}`，
结束事件为 `data: {"done":true,...}`，流内错误通过 `error` 字段返回。

## 后端阅读入口

| 文件 | 作用 |
| --- | --- |
| [app/main.py](backend/app/main.py) | 应用启动、路由注册、异常处理 |
| [app/config.py](backend/app/config.py) / [app/database.py](backend/app/database.py) | 配置加载与数据库会话 |
| [app/api/auth.py](backend/app/api/auth.py) / [app/deps.py](backend/app/deps.py) / [app/services/security.py](backend/app/services/security.py) | 登录注册、身份校验、密码哈希与 JWT |
| [app/api/ai.py](backend/app/api/ai.py) | 会话、SSE 对话和消息保存 |
| [app/services/prompts.py](backend/app/services/prompts.py) / [app/services/llm.py](backend/app/services/llm.py) | 提示词组织、模型调用和 Mock 降级 |
| [app/api/path.py](backend/app/api/path.py) / [app/services/progress.py](backend/app/services/progress.py) | 学习路径与进度计算 |
| [app/seed/run.py](backend/app/seed/run.py) | 演示数据初始化 |

