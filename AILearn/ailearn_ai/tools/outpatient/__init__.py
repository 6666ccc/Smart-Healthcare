"""门诊流程 Tools：挂号、接诊、检查、处方、收费、发药。"""

from . import charge, dispense, exam, prescription, registration, visit

_MODULES = (registration, visit, exam, prescription, charge, dispense)


def get_tools() -> list:
    tools: list = []
    for module in _MODULES:
        getter = getattr(module, "get_tools", None)
        if callable(getter):
            tools.extend(getter())
    return tools


__all__ = ["get_tools"]
