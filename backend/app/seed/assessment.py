"""可离线运行的演示测验；只初始化题目，不生成任何学生成绩。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KnowledgeNode
from app.models.adaptive import LearningTask

SAMPLES = [
    (
        "rs-intro-1",
        "遥感概论",
        "遥感的基本含义",
        "以下哪项属于遥感观测？",
        ["通过传感器在不接触目标的情况下获取信息", "直接用尺测量目标长度", "仅凭记忆描述地物"],
        "遥感通过与目标不直接接触的传感器获取目标信息。",
    ),
    (
        "rs-intro-2",
        "遥感概论",
        "遥感观测的组成",
        "从观测到应用，以下哪条流程更完整？",
        ["获取信号、处理数据、分析解释", "只获取图像，不处理与解释", "先给结论，再忽略观测数据"],
        "遥感应用需要将传感器获取的信息经过处理与分析后转化为可解释的结果。",
    ),
    (
        "rs-wave-1",
        "电磁波与遥感",
        "波长与频率",
        "真空中电磁波的波长增大时，频率如何变化？",
        ["减小", "增大", "不变"],
        "真空中 c=λf，光速不变，波长与频率成反比。",
    ),
    (
        "rs-wave-2",
        "电磁波与遥感",
        "光谱响应",
        "不同地物的反射光谱差异主要可以用于什么？",
        ["在适用条件下辅助区分地物", "保证任意两种地物始终完全可分", "替代所有地面验证"],
        "反射光谱差异可辅助地物识别，但受传感器、环境和地物状态影响，需要验证。",
    ),
    (
        "python-intro-1",
        "Python 基础",
        "Python 列表索引",
        "Python 列表 a=[10,20,30]，a[0] 的值是多少？",
        ["10", "20", "30"],
        "Python 列表从索引 0 开始，a[0] 是第一个元素。",
    ),
    (
        "python-intro-2",
        "Python 基础",
        "Python 遍历",
        "for item in [1,2,3] 会执行多少次循环体？",
        ["3 次", "2 次", "1 次"],
        "循环依次访问三个元素，因此在没有提前中止时执行三次。",
    ),
]


async def seed_assessments(db: AsyncSession):
    for task_id, node_id, title, prompt, options, reference in SAMPLES:
        if await db.get(KnowledgeNode, node_id) is None or await db.get(LearningTask, task_id) is not None:
            continue
        db.add(
            LearningTask(
                id=task_id,
                node_id=node_id,
                title=title,
                kind="quiz",
                difficulty=1,
                minutes=10,
                configuration={
                    "prompt": prompt,
                    "options": options,
                    "answerIndex": 0,
                    "reference": reference,
                    "source": f"平台演示题库 / {node_id} / {title}",
                    "rubric": "选项正确记 100 分，错误记 0 分。演示任务不代表完整能力评价。",
                },
            )
        )
    await db.flush()
