"""支持 README 中的 python -m app.seed 初始化命令。"""

import asyncio

from app.seed.run import run_seed

if __name__ == "__main__":
    asyncio.run(run_seed())
