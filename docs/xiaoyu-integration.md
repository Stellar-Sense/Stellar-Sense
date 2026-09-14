# 小遇伴学接入

节点学习和完整助手复用 `/api/ai/chat`；`/api/ai/explain` 使用同一伴学服务。
流程：当前知识点 → 本地资料检索 → 入门/进阶策略 → 模型生成 → JSON 与引用校验。

## 本地运行

按项目 README 安装依赖并配置 MySQL。在 `backend/.env` 设置数据库、JWT、`LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL`，可参考 `.env.example`。不要提交真实配置。
在 backend 环境运行 `python run_local.py`，后端监听 8001；前端运行 `STELLAR_API_TARGET=http://127.0.0.1:8001 pnpm dev`。
默认模型为 DeepSeek。

资料通过团队群文件分发，不随 Git 仓库提供。下载 `knowledge.json` 放到 `backend/data/knowledge.json`（没有 data 文件夹就创建）。`RAG_INDEX_PATH` 不设置或留空即可读取，不依赖启动目录；若已有旧的自定义路径，请清空并重启后端。自定义相对路径以 backend 为基准，也支持绝对路径。

该文件已加入 .gitignore，不要强制添加到 Git。缺少文件或节点未映射时提供明确标注的模型讲解；文件损坏或无法读取时提示检索不可用。使用资料功能可选，但真实模型问答仍需在 backend/.env 配置自己的 Key。

索引由遥感组大纲整理而来，属于摘要，不包含所列教材/PDF原文或视频，来源线索不表示已经读取原文。

索引结构是 `{"nodes": [...]}`，每条含 `node_id`、`node_name`、`text`、`source_document`、`source_locator`、`original_resource_hint`。
`app/services/xiaoyu.py` 的 `NODE_SECTIONS` 暂将 7 个网页节点映射到资料小节，后续需统一知识点 ID 并替换基础匹配检索。

## 接口增量

聊天请求保留 message、conversationId，context 增加 nodeId、learnerLevel（beginner/advanced）、scene（preview/exam_review）。
完成事件及历史消息包含 metadata：mode、reason、references、suggestedAction、context。
- generated：依据本次资料生成，引用只允许来自检索结果。
- model_only：未检索到课程资料，明确标注通用模型讲解，引用为空。
- fallback：缺少模型密钥、调用/检索失败或校验不通过时展示固定摘要，说明原因。

metadata.context 内字段使用 snake_case；请求 context 支持 camelCase。新前端应保留这三种状态的区别。
会话归属校验防止访问其他用户会话。回复来源和上下文存储于新增 companion_metadata 表，由现有启动 create_all 创建；既有消息无需迁移。
节点页可携 conversationId 跳转到完整助手，继续同一知识点会话。答案当前生成完成后一次返回，并非逐字输出。

## 验证及范围

后端：`python -m unittest discover -s tests -p test_xiaoyu.py`（9 项，使用临时测试资料验证默认路径、相对路径和文件缺失，不依赖群文件）。前端：`pnpm exec tsc -b`。
已在本地验证 DeepSeek 的辐射校正回答、4 条摘要引用、跳转后历史和上下文保留；无资料讲解已通过单元测试，用户报告补充验证通过。

本次不含新版学习区、文档/视频、小测、知识库管理、悬浮窗。驾驶舱/路径规划仍使用原实现；页面原有能力列表和静态建议不代表本次已实现。
