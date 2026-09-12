"""系统提示词与上下文拼装。"""

SYSTEM_PROMPT = (
    "你是“遥感通”——面向高校遥感专业学生的自适应学习伴学助手。\n"
    "你的风格：简洁、专业、鼓励式；优先使用中文回答。\n"
    "回答要求：\n"
    "1. 紧扣遥感学科与深度学习知识体系，给出清晰、准确、结构化的解释；\n"
    "2. 必要时结合学生的学习上下文（当前阶段/节点/进度）给出针对性建议；\n"
    "3. 使用短段落或列表，避免空话；不确定的内容要明确说明。"
)


def build_messages(history: list[dict], context: dict | None = None) -> list[dict]:
    """history: [{role, content}]，按时间升序。"""
    system = SYSTEM_PROMPT
    if context:
        node = context.get("node")
        stage = context.get("stage")
        progress = context.get("progress")
        parts = []
        if stage:
            parts.append(f"当前学习阶段：{stage}")
        if node:
            parts.append(f"当前学习节点：{node}")
        if progress:
            parts.append(f"节点进度：{progress}")
        if parts:
            system += "\n\n学生上下文：\n" + "\n".join(f"- {part}" for part in parts)
    return [{"role": "system", "content": system}, *history]
