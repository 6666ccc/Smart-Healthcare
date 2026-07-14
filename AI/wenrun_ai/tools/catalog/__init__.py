"""基础查询：科室、医生、排班、价目（挂号前选科选医生）。"""

from . import dashboard, dept, drug, medical_item, schedule, staff

_MODULES = (dept, staff, schedule, medical_item, drug, dashboard)


def get_tools() -> list:
    tools: list = []
    for module in _MODULES:
        getter = getattr(module, "get_tools", None)
        if callable(getter):
            tools.extend(getter())
    return tools


__all__ = ["dept", "staff", "schedule", "medical_item", "drug", "dashboard", "get_tools"]
