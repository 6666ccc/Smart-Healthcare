from __future__ import annotations

import json
import re
from dataclasses import dataclass
from enum import Enum
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage


class Intent(str, Enum):
    MEDICAL = "medical"
    REGISTRATION = "registration"
    CHAT = "chat"

    @property
    def agent_name(self) -> str:
        return f"{self.value}_agent"


@dataclass(frozen=True)
class IntentRoute:
    intent: Intent
    agent_name: str
    confidence: float
    reasoning: str


INTENT_SYSTEM_PROMPT = """你是温润医院 AI 助手的意图路由器。请将用户消息严格分为三类之一：
1. medical：疾病、症状、药物、检查指标、健康建议等通用医疗科普，交给 medical_agent。
2. registration：挂号、科室、医生、排班、院内位置、院内就诊步骤及其他医院定制服务，交给 registration_agent。
3. chat：问候、闲聊、情绪交流等非医疗服务问题，交给 chat_agent。

只返回 JSON：
{"intention":"medical|registration|chat","target_agent":"medical_agent|registration_agent|chat_agent","confidence":0.0,"reasoning":"简短理由"}
"""


def parse_intent_response(raw: str) -> IntentRoute:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if match:
        raw = match.group(1)
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0)

    try:
        body: dict[str, Any] = json.loads(raw)
        intent = Intent(str(body.get("intention", "")))
        confidence = min(1.0, max(0.0, float(body.get("confidence", 0.0))))
        reasoning = str(body.get("reasoning", "")).strip()
        return IntentRoute(intent, intent.agent_name, confidence, reasoning)
    except (TypeError, ValueError, json.JSONDecodeError):
        return IntentRoute(Intent.CHAT, Intent.CHAT.agent_name, 0.0, "意图识别结果无效")


def route_intent(message: str, *, model=None) -> IntentRoute:
    if model is None:
        from .qa import build_llm

        model = build_llm()
    try:
        response = model.invoke(
            [
                SystemMessage(content=INTENT_SYSTEM_PROMPT),
                HumanMessage(content=message),
            ]
        )
        content = getattr(response, "content", "")
        return parse_intent_response(content if isinstance(content, str) else str(content))
    except Exception:
        return IntentRoute(Intent.CHAT, Intent.CHAT.agent_name, 0.0, "意图识别服务不可用")

