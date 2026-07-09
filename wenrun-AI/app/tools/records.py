"""就诊结果只读查询 — 处方、检查、就诊详情（不含医生写操作）。"""

from __future__ import annotations

from langchain.tools import tool

from app.tools.client import api_call


@tool(
    "get_visit_detail",
    description="获取就诊详情（主诉、诊断、医生等），需已知 visit_id（可从已就诊挂号记录关联）",
)
def get_visit_detail(visit_id: str) -> str:
    """查询一次就诊的详情。

    输入：visit_id 字符串，通常来自已就诊挂号记录关联的就诊 ID。
    处理：去掉首尾空格后调用 GET /api/visits/{id}。
    输出：就诊详情 JSON 字符串，包括主诉、诊断、医生等信息。
    """
    return api_call("GET", f"/api/visits/{visit_id.strip()}")


@tool("list_prescriptions_by_visit", description="按 visit_id 查询该次就诊的处方列表")
def list_prescriptions_by_visit(visit_id: str) -> str:
    """按就诊 ID 查询处方列表。

    输入：visit_id 字符串，表示某一次就诊。
    处理：作为 visitId 查询参数调用 GET /api/prescriptions。
    输出：处方列表 JSON 字符串或错误文案。
    """
    return api_call("GET", "/api/prescriptions", params={"visitId": visit_id.strip()})


@tool("get_prescription_detail", description="获取处方详情（含药品明细），需传入 prescription_id")
def get_prescription_detail(prescription_id: str) -> str:
    """查询单个处方详情。

    输入：prescription_id 字符串，来自处方列表中的处方 ID。
    处理：去掉首尾空格后调用 GET /api/prescriptions/{id}。
    输出：处方详情 JSON 字符串，通常包含药品明细。
    """
    return api_call("GET", f"/api/prescriptions/{prescription_id.strip()}")


@tool("list_exam_requests_by_visit", description="按 visit_id 查询该次就诊的检查申请列表")
def list_exam_requests_by_visit(visit_id: str) -> str:
    """按就诊 ID 查询检查申请列表。

    输入：visit_id 字符串，表示某一次就诊。
    处理：作为 visitId 查询参数调用 GET /api/exam-requests。
    输出：检查申请列表 JSON 字符串或错误文案。
    """
    return api_call("GET", "/api/exam-requests", params={"visitId": visit_id.strip()})
