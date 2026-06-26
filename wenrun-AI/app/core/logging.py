"""
统一日志配置 — 供 FastAPI 启动时初始化，各模块通过 logging.getLogger(__name__) 使用。
"""

import logging
import os


def setup_logging() -> None:
    """
    初始化根日志器。

    通过环境变量 LOG_LEVEL 控制级别（默认 INFO）：
    - INFO  ：输出意图分析、路由决策、图节点执行等关键链路
    - DEBUG ：额外输出 LLM 原始 JSON 响应等调试信息
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    # 避免 uvicorn 热重载时重复添加 handler
    root = logging.getLogger()
    if root.handlers:
        root.setLevel(level)
        return

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # 压低第三方库噪音，只保留业务日志
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
