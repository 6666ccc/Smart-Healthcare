"""
患者端 LangChain 工具集 — 封装 Java 门诊 API。

按业务域分组，仅包含患者自助场景（查、约、付、看结果），不含医生/药房写操作。
"""

from app.tools.billing import get_charge_detail, list_charges, list_pending_charges, pay_charge
from app.tools.catalog import (
    get_department_detail,
    get_doctor_detail,
    get_schedule_detail,
    list_departments,
    list_doctors,
    list_schedules,
)
from app.tools.client import set_patient_token
from app.tools.profile import get_patient_detail, update_user_profile
from app.tools.records import (
    get_prescription_detail,
    get_visit_detail,
    list_exam_requests_by_visit,
    list_prescriptions_by_visit,
)
from app.tools.registration import (
    cancel_registration,
    create_registration,
    get_patient_registration_records,
    list_registrations,
)

# 挂号 Agent 可用工具（按推荐调用顺序：浏览 → 预约 → 账单 → 查结果）
PATIENT_CATALOG_TOOLS = [
    list_departments,
    get_department_detail,
    list_doctors,
    get_doctor_detail,
    list_schedules,
    get_schedule_detail,
]

PATIENT_REGISTRATION_TOOLS = [
    list_registrations,
    get_patient_registration_records,
    create_registration,
    cancel_registration,
]

PATIENT_BILLING_TOOLS = [
    list_charges,
    list_pending_charges,
    get_charge_detail,
    pay_charge,
]

PATIENT_RECORD_TOOLS = [
    get_visit_detail,
    list_prescriptions_by_visit,
    get_prescription_detail,
    list_exam_requests_by_visit,
]

PATIENT_PROFILE_TOOLS = [
    get_patient_detail,
    update_user_profile,
]

PATIENT_ALL_TOOLS = [
    *PATIENT_PROFILE_TOOLS,
    *PATIENT_CATALOG_TOOLS,
    *PATIENT_REGISTRATION_TOOLS,
    *PATIENT_BILLING_TOOLS,
    *PATIENT_RECORD_TOOLS,
]

__all__ = [
    "PATIENT_ALL_TOOLS",
    "PATIENT_BILLING_TOOLS",
    "PATIENT_CATALOG_TOOLS",
    "PATIENT_PROFILE_TOOLS",
    "PATIENT_RECORD_TOOLS",
    "PATIENT_REGISTRATION_TOOLS",
    "set_patient_token",
]
