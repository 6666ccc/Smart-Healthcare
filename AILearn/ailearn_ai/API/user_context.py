"""将 Java 注入的用户/患者上下文格式化为 LLM 可读块。"""

from __future__ import annotations

from .schemas import ChatRequest

_GENDER_LABELS = {0: "女", 1: "男", 2: "未知"}


def _gender_label(value: int | None) -> str | None:
    if value is None:
        return None
    return _GENDER_LABELS.get(value, str(value))


def is_patient_role(role_code: str | None, portal_type: str | None) -> bool:
    return role_code == "patient" or portal_type == "patient"


def is_doctor_role(role_code: str | None, portal_type: str | None) -> bool:
    return role_code == "doctor" or portal_type == "doctor"


def is_admin_role(role_code: str | None) -> bool:
    return role_code == "admin"


def build_user_context_block(req: ChatRequest) -> str | None:
    """生成注入 Agent 的 <current_user> 块；无有效身份字段时返回 None。"""
    lines: list[str] = []

    if req.user_id is not None:
        lines.append(f"- 用户 ID：{req.user_id}")
    if req.username:
        lines.append(f"- 登录名：{req.username}")
    if req.real_name:
        lines.append(f"- 姓名：{req.real_name}")
    if req.role_code:
        lines.append(f"- 角色：{req.role_code}")
    if req.portal_type:
        lines.append(f"- 门户：{req.portal_type}")

    if is_doctor_role(req.role_code, req.portal_type) and req.staff_id is not None:
        lines.append(f"- 医生 staffId：{req.staff_id}")

    if is_patient_role(req.role_code, req.portal_type):
        if req.patient_id is not None:
            lines.append(f"- 患者 ID：{req.patient_id}")
        if req.patient_no:
            lines.append(f"- 病历号：{req.patient_no}")
        if req.patient_name:
            lines.append(f"- 患者姓名：{req.patient_name}")
        gender = _gender_label(req.patient_gender)
        if gender:
            lines.append(f"- 性别：{gender}")
        if req.patient_birth_date:
            lines.append(f"- 出生日期：{req.patient_birth_date}")
        if req.patient_allergy_history:
            lines.append(f"- 过敏史：{req.patient_allergy_history}")

    if not lines:
        return None

    hints: list[str] = []
    if is_patient_role(req.role_code, req.portal_type):
        hints.append(
            "当前为【患者本人】会话：默认在谈论该患者自己的就诊与档案；"
            "调用患者类工具时优先使用上述 patientId，勿向用户重复索要已知的患者 ID。"
        )
    elif is_doctor_role(req.role_code, req.portal_type):
        hints.append(
            "当前为【医生】会话：可代查任意患者；缺少患者标识时先用搜索工具，"
            "不要假设对话对象就是某位固定患者。"
        )
    elif is_admin_role(req.role_code):
        hints.append("当前为【管理员】会话：可进行管理与查询，注意权限边界。")

    block = "<current_user>\n" + "\n".join(lines)
    if hints:
        block += "\n\n" + "\n".join(hints)
    block += "\n</current_user>"
    return block
