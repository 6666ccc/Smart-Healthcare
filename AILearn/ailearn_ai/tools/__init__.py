"""HuiLiao — 患者侧 AI 可调用的 LangChain Tools。

按业务域分包，各子包实现 `get_tools()`，由 `get_all_tools()` 聚合。

目录说明：
- catalog   基础查询（科室、医生、排班、价目、药品、统计）
- patient   患者档案
- outpatient 门诊（挂号、就诊、处方、缴费、检查、发药）
- inpatient  住院（在院信息、日清单、出院结算，待扩展）
"""

from . import catalog, inpatient, outpatient, patient
from .catalog import get_tools as get_catalog_tools
from .inpatient import get_tools as get_inpatient_tools
from .outpatient import get_tools as get_outpatient_tools
from .patient import get_tools as get_patient_tools

_TOOL_GETTERS = (
    get_catalog_tools,
    get_patient_tools,
    get_outpatient_tools,
    get_inpatient_tools,
)

__all__ = [
    "catalog",
    "patient",
    "outpatient",
    "inpatient",
    "get_catalog_tools",
    "get_patient_tools",
    "get_outpatient_tools",
    "get_inpatient_tools",
    "get_all_tools",
]


def get_all_tools() -> list:
    """聚合所有业务域已注册的 Tool。"""
    tools: list = []
    for getter in _TOOL_GETTERS:
        tools.extend(getter())
    return tools
