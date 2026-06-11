"""检查申请 Tools。"""

from langchain_core.tools import tool

from ailearn_ai.tools.huiliao_client import api_request, format_result


@tool
def list_exam_requests(visit_id: int) -> str:
    """查询指定就诊单下的检查申请列表。visit_id 必填。"""
    return format_result(
        api_request("GET", "/api/exam-requests", params={"visitId": visit_id})
    )


@tool
def create_exam_request(visit_id: int, item_id: int) -> str:
    """为就诊单开立检查申请。item_id 为医疗项目 ID（可先查价目表）。"""
    return format_result(
        api_request(
            "POST",
            "/api/exam-requests",
            json_body={"visitId": visit_id, "itemId": item_id},
        )
    )


def get_tools() -> list:
    return [list_exam_requests, create_exam_request]
