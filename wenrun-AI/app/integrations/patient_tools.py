"""向后兼容：请优先使用 app.tools。"""

from app.tools import PATIENT_ALL_TOOLS, set_patient_token

__all__ = ["PATIENT_ALL_TOOLS", "set_patient_token"]
