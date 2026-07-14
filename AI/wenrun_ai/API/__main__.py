"""控制台入口：``python -m wenrun_ai.API`` 与 ``wenrun-api`` 脚本。"""

import os

import uvicorn

from wenrun_ai.logging import setup_logging


def main() -> None:
    setup_logging()
    port = int(os.getenv("AI_HTTP_PORT", "8000"))
    uvicorn.run(
        "wenrun_ai.API.app:app",
        host=os.getenv("AI_HTTP_HOST", "0.0.0.0"),
        port=port,
        reload=os.getenv("AI_UVICORN_RELOAD", "0").strip() in {"1", "true", "yes"},
    )


if __name__ == "__main__":
    main()
