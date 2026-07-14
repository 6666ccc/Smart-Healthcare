"""仪表盘统计 Tools。"""

from langchain_core.tools import tool

from wenrun_ai.tools.wenrun_client import api_request, format_result


@tool
def get_dashboard_summary() -> str:
    """获取今日门诊统计摘要（挂号、接诊、收费、发药等汇总数据）。"""
    return format_result(api_request("GET", "/api/dashboard"))


def get_tools() -> list:
    return [get_dashboard_summary]
