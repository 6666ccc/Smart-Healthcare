from langchain_core.messages import AIMessage

from wenrun_ai.chains.router import Intent, parse_intent_response, route_intent
from wenrun_ai.knowledge.types import KnowledgeBase


class FakeModel:
    def __init__(self, content: str):
        self.content = content

    def invoke(self, messages):
        assert "medical_agent" in messages[0].content
        return AIMessage(content=self.content)


def test_parse_intent_response_accepts_markdown_json():
    route = parse_intent_response(
        '```json\n{"intention":"medical","target_agent":"medical_agent",'
        '"confidence":0.93,"reasoning":"疾病科普"}\n```'
    )

    assert route.intent is Intent.MEDICAL
    assert route.agent_name == "medical_agent"
    assert route.confidence == 0.93


def test_route_intent_falls_back_to_chat_for_invalid_model_output():
    route = route_intent("随便聊聊", model=FakeModel("not-json"))

    assert route.intent is Intent.CHAT
    assert route.agent_name == "chat_agent"
    assert route.confidence == 0.0


def test_route_intent_normalizes_mismatched_agent_name():
    route = route_intent(
        "我要挂号",
        model=FakeModel(
            '{"intention":"registration","target_agent":"medical_agent",'
            '"confidence":0.88,"reasoning":"需要预约"}'
        ),
    )

    assert route.intent is Intent.REGISTRATION
    assert route.agent_name == "registration_agent"


def test_intents_map_to_the_expected_knowledge_bases():
    from wenrun_ai.chains.qa import knowledge_base_for_intent

    assert knowledge_base_for_intent(Intent.MEDICAL) is KnowledgeBase.MEDICAL_GENERAL
    assert knowledge_base_for_intent(Intent.REGISTRATION) is KnowledgeBase.HOSPITAL_CUSTOM
    assert knowledge_base_for_intent(Intent.CHAT) is None


def test_only_registration_agent_receives_business_tools(monkeypatch):
    from wenrun_ai.chains import qa

    captured = []
    monkeypatch.setattr(qa, "build_llm", lambda: object())
    monkeypatch.setattr(qa, "get_all_tools", lambda: ["hospital-tool"])
    monkeypatch.setattr(
        qa,
        "create_agent",
        lambda llm, tools, **kwargs: captured.append((tools, kwargs)) or object(),
    )

    qa.build_agent(Intent.MEDICAL)
    qa.build_agent(Intent.REGISTRATION)
    qa.build_agent(Intent.CHAT)

    assert captured[0][0] == []
    assert captured[1][0] == ["hospital-tool"]
    assert captured[2][0] == []
