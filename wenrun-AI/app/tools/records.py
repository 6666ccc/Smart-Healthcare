"""就诊结果只读查询 — 处方、检查、就诊详情（不含医生写操作）。"""

from __future__ import annotations

from langchain.tools import tool

from app.tools.client import api_call


@tool(
    "get_visit_detail",
    description="获取就诊详情（主诉、诊断、医生等），需已知 visit_id（可从已就诊挂号记录关联）",
)
def get_visit_detail(visit_id: str) -> str:
    """GET /api/visits/{id}"""
    return api_call("GET", f"/api/visits/{visit_id.strip()}")


@tool("list_prescriptions_by_visit", description="按 visit_id 查询该次就诊的处方列表")
def list_prescriptions_by_visit(visit_id: str) -> str:
    """GET /api/prescriptions?visitId=xxx"""
    return api_call("GET", "/api/prescriptions", params={"visitId": visit_id.strip()})


@tool("get_prescription_detail", description="获取处方详情（含药品明细），需传入 prescription_id")
def get_prescription_detail(prescription_id: str) -> str:
    """GET /api/prescriptions/{id}"""
    return api_call("GET", f"/api/prescriptions/{prescription_id.strip()}")


@tool("list_exam_requests_by_visit", description="按 visit_id 查询该次就诊的检查申请列表")
def list_exam_requests_by_visit(visit_id: str) -> str:
    """GET /api/exam-requests?visitId=xxx"""
    return api_call("GET", "/api/exam-requests", params={"visitId": visit_id.strip()})
