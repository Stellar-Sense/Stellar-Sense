# Stellar-Sense（遥感通）

大模型驱动的高校专业自适应学习与伴学智能体（以遥感学科为例）。

前端已与后端完整对接：学科星图、节点学习、路径规划、学习记录、AI 学习助手（SSE 流式）、
学习驾驶舱与设置页均由真实 API 驱动，数据持久化到 MySQL。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 + Vite + TanStack Router/Query + shadcn/ui + Tailwind，`pnpm` 管理 |
| 后端 | FastAPI + SQLAlchemy 2.0 (async) + aiomysql + Pydantic v2，`uv` 管理 |
| 数据库 | MySQL 8（本机实例，库名 `stellar_sense`） |
| LLM | OpenAI 兼容接口（默认 DeepSeek）；未配置 key 时自动降级为内置 Mock，链路仍可跑通 |

## 目录结构

```
backend/            FastAPI 服务（app/api、app/models、app/services、app/seed）
frontend/           React 前端（src/features 按业务模块组织，各模块自带 api.ts）
data/               预留的遥感数据目录（本次未使用）
```

## 快速开始

### 1. 数据库（本机 MySQL 8）

首次执行（root 账号，按需替换密码）：

```sql
CREATE DATABASE IF NOT EXISTS stellar_sense CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'stellar'@'localhost' IDENTIFIED BY 'stellar123';
GRANT ALL PRIVILEGES ON stellar_sense.* TO 'stellar'@'localhost';
FLUSH PRIVILEGES;
```

连接信息在 `backend/.env` 的 `DATABASE_URL` 中配置。

### 2. 后端

```powershell
cd backend
uv sync                                  # 安装依赖（自动创建 .venv）
Copy-Item .env.example .env              # 首次：复制环境变量模板（按需填写 LLM_API_KEY）
uv run python -m app.seed                # 初始化表结构 + 写入演示数据（幂等，可重复执行）
uv run uvicorn app.main:app --reload --port 8000
```

- 接口文档：http://127.0.0.1:8000/api/docs
- 健康检查：http://127.0.0.1:8000/api/health
- 在 `.env` 中填入 `LLM_API_KEY`（DeepSeek）即启用真实模型；留空则使用 Mock 回复

### 3. 前端

```powershell
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:5173 —— 开发环境经 Vite 代理将 `/api` 转发到后端 8000 端口。

### 演示账号

| 账号 | 密码 |
| --- | --- |
| `learner@remote-sensing.ai` | `stellar123` |

注册页同样可用：新用户的图谱 / 进度 / 路径会自动初始化为空白档案。

## 常用命令

```powershell
# 后端（backend/）
uv run python -m app.seed     # 幂等种子（表结构 + 演示数据）
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

错误响应统一为 `{ "title": "..." }`，前端全局 toast；401 会清除登录态并跳转登录页。

