"""学习路径提示词回归测试。"""

from app.api.path import REGENERATE_PROMPT


def test_regenerate_prompt_formats_summary_without_key_error() -> None:
    """JSON 示例中的花括号曾被 str.format 当作占位符，导致 /path/regenerate 返回 500。"""
    summary = "- 当前掌握度：70%\n- 当前阶段：图像增强（完成度 80%）"
    text = REGENERATE_PROMPT.format(summary=summary)
    assert summary in text
    assert '"title"' in text
    assert "{summary}" not in text
