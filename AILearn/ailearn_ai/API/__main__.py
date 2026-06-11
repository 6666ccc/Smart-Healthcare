"""控制台入口：``python -m ailearn_ai.API`` 与 ``ailearn-api`` 脚本。"""

import os

import uvicorn

from ailearn_ai.logging import setup_logging


def main() -> None:
    setup_logging()
    port = int(os.getenv("AI_HTTP_PORT", "8000"))
    uvicorn.run(
        "ailearn_ai.API.app:app",
        host=os.getenv("AI_HTTP_HOST", "0.0.0.0"),
        port=port,
        reload=os.getenv("AI_UVICORN_RELOAD", "0").strip() in {"1", "true", "yes"},
    )


if __name__ == "__main__":
    main()
