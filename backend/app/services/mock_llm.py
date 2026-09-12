"""内置 Mock 回复：未配置 LLM_API_KEY 时使用，保证演示链路完整。

规则移植自前端原有 mock（ai-assistant / node-learning）。
"""

import asyncio
from collections.abc import AsyncIterator

DEFAULT_REPLY = (
    "从你的当前学习阶段来看，建议优先把“概念理解”和“案例关联”结合起来。\n"
    "你可以把这个问题拆成：它解决了什么问题、适合什么数据、和前一个知识点有什么联系。\n"
    "这样能帮助你更快建立遥感知识图谱。"
)


def mock_reply(question: str) -> str:
    text = question.lower()

    if "直方图均衡化" in text:
        return (
            "直方图均衡化是一种常见的图像增强方法，它通过重新分配图像像素的灰度分布，提高图像整体的对比度。\n"
            "在遥感影像处理中，它可以帮助突出地物之间的差异，方便后续的特征提取和分类。\n"
            "结合你当前正在学习的图像增强，建议你继续了解 CLAHE 和局部对比度增强。"
        )
    if "cnn" in text and "transformer" in text:
        return (
            "CNN 更擅长提取局部特征，例如边缘、纹理和细节；Transformer 更擅长建模全局关系，"
            "例如不同区域间的语义关联。\n"
            "在遥感任务中，CNN 适合细粒度局部识别，而 Transformer 通常在大范围场景理解"
            "和复杂上下文建模中更有优势。"
        )
    if "transformer" in text:
        return (
            "Transformer 之所以适合遥感，是因为它能建立远距离空间依赖关系。\n"
            "遥感图像通常覆盖大面积区域，目标之间常常存在跨区域语义关联。\n"
            "Self-Attention 能够让模型在图像中建立“全局理解”，而不仅仅看局部纹理。"
        )
    if "大模型" in text:
        return (
            "遥感大模型的学习路线可以分为三步：\n"
            "1）先理解模型基础，如预训练、微调和迁移学习；\n"
            "2）再结合遥感任务分析数据与标注；\n"
            "3）最后进行专项实验与评估。\n"
            "建议你从遥感基础模型和多模态理解开始，而不是直接上复杂网络。"
        )
    if "图像增强" in text or "影像增强" in text:
        return (
            "遥感影像增强的核心目标是提升可见性，让地表特征更容易被识别。\n"
            "常见做法包括对比度增强、去噪、锐化和直方图均衡化。\n"
            "在你的学习阶段中，重点不是记住所有算法，而是理解它们分别解决什么样的图像问题。"
        )
    if "特征提取" in text:
        return (
            "图像增强主要是改善视觉质量，而特征提取更关注从图像中抽取任务相关的信息。\n"
            "增强可以让关键信息更清晰，特征提取则把这些信息转成模型可用的表达。"
        )
    return DEFAULT_REPLY


async def mock_stream(question: str) -> AsyncIterator[str]:
    """按小块输出，模拟打字机效果。"""
    reply = mock_reply(question)
    step = 3
    for index in range(0, len(reply), step):
        yield reply[index : index + step]
        await asyncio.sleep(0.012)
