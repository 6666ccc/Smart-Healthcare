"""发药 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def dispense_prescription(prescription_id: int) -> str:
    """按处方 ID 执行发药。"""
    return format_result(
        api_request("POST", f"/api/dispense/{prescription_id}")
    )


def get_tools() -> list:
    return [dispense_prescription]
