import sys
from pathlib import Path

import pytest


sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from wenrun_ai.chains.router import Intent, IntentRoute
from wenrun_ai.graph.workflow import ChatInput, ChatWorkflow


def _route(intent):
    return IntentRoute(intent, intent.agent_name, 1.0, "test")


@pytest.mark.parametrize(
    ("intent", "expected_base"),
    [
        (Intent.MEDICAL, "medical-general"),
        (Intent.REGISTRATION, "hospital-custom"),
    ],
)
def test_workflow_injects_selected_rag_context(intent, expected_base):
    received = []
    workflow = ChatWorkflow(
        router=lambda _: _route(intent),
        retriever=lambda message, base: f'<knowledge_context knowledge_base="{base.value}">source</knowledge_context>',
        memory_search=lambda *_: None,
        memory_store=lambda *_: None,
        agent_runner=lambda selected, human_message, state: received.append(human_message.content) or {"reply": "done"},
    )

    execution = workflow.invoke(ChatInput(message="question", conversation_id=" medical-1 "))

    assert execution.status == "completed"
    assert execution.reply == "done"
    assert execution.conversation_id == "medical-1"
    assert f'knowledge_base="{expected_base}"' in received[0]


def test_workflow_skips_rag_for_chat():
    calls = []
    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.CHAT),
        retriever=lambda *args: calls.append(args) or "unexpected",
        memory_search=lambda *_: None,
        memory_store=lambda *_: None,
        agent_runner=lambda *_: {"reply": "hello"},
    )

    execution = workflow.invoke(ChatInput(message="hello", conversation_id="chat-1"))

    assert execution.reply == "hello"
    assert calls == []


def test_rag_failure_still_completes():
    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.MEDICAL),
        retriever=lambda *_: (_ for _ in ()).throw(RuntimeError("qdrant down")),
        memory_search=lambda *_: None,
        memory_store=lambda *_: None,
        agent_runner=lambda selected, human_message, state: {"reply": "fallback reply"},
    )

    execution = workflow.invoke(ChatInput(message="question", conversation_id="failure-1"))

    assert execution.status == "completed"
    assert execution.reply == "fallback reply"


def test_memory_and_profile_retrieval_failures_degrade_independently():
    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.CHAT),
        memory_search=lambda *_: (_ for _ in ()).throw(RuntimeError("memory unavailable")),
        profile_search=lambda *_: (_ for _ in ()).throw(RuntimeError("profile unavailable")),
        memory_store=lambda *_: None,
        agent_runner=lambda *_: {"reply": "still works"},
    )

    execution = workflow.invoke(ChatInput(message="hello", conversation_id="degrade-1", user_id=3))

    assert execution.status == "completed"
    assert execution.reply == "still works"


def test_memory_is_stored_for_completed_reply():
    stored = []

    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.REGISTRATION),
        agent_runner=lambda *_: {"reply": "created"},
        memory_search=lambda *_: None,
        memory_store=lambda conversation_id, user_id, message, reply: stored.append((conversation_id, reply)),
    )
    workflow.invoke(ChatInput(message="register", conversation_id="memory-1"))
    assert stored == [("memory-1", "created")]


def test_memory_store_failure_does_not_fail_completed_reply():
    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.CHAT),
        memory_search=lambda *_: None,
        memory_store=lambda *_: (_ for _ in ()).throw(RuntimeError("store unavailable")),
        agent_runner=lambda *_: {"reply": "reply survives"},
    )

    execution = workflow.invoke(ChatInput(message="hello", conversation_id="store-failure"))

    assert execution.status == "completed"
    assert execution.reply == "reply survives"


def test_agent_runner_receives_auth_context(monkeypatch):
    from contextlib import contextmanager
    from wenrun_ai.graph import workflow as module
    observed = []

    @contextmanager
    def context(api_key, user_id):
        observed.append((api_key, user_id))
        yield

    monkeypatch.setattr(module, "wenrun_api_context", context)
    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.REGISTRATION),
        memory_search=lambda *_: None,
        profile_search=lambda *_: None,
        memory_store=lambda *_: None,
        agent_runner=lambda *_: {"reply": "ok"},
    )
    workflow.invoke(ChatInput(message="register", conversation_id="auth", api_key="internal", user_id=7))
    assert observed == [("internal", 7)]
