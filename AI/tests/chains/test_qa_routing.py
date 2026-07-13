from langchain_core.messages import AIMessage

from wenrun_ai.chains import qa
from wenrun_ai.chains.router import Intent, IntentRoute


class FakeAgent:
    def __init__(self):
        self.input = None

    def invoke(self, value, config):
        self.input = value
        return {"messages": [AIMessage(content="科普回答")]}


def test_run_chat_routes_and_injects_selected_knowledge(monkeypatch):
    agent = FakeAgent()
    route = IntentRoute(Intent.MEDICAL, "medical_agent", 0.96, "医疗科普")
    monkeypatch.setattr(qa, "route_intent", lambda message: route)
    monkeypatch.setattr(
        qa,
        "_retrieve_for_intent",
        lambda message, intent: '<knowledge_context knowledge_base="medical-general">资料</knowledge_context>',
    )
    monkeypatch.setattr(qa, "get_agent", lambda intent: agent)

    reply = qa.run_chat("高血压是什么")

    assert reply == "科普回答"
    prompt = agent.input["messages"][0].content
    assert 'knowledge_base="medical-general"' in prompt
    assert "用户问题：高血压是什么" in prompt
