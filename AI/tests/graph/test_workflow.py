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
        agent_runner=lambda selected, human_message, state, decision=None: received.append(human_message.content) or {"reply": "done"},
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
        agent_runner=lambda selected, human_message, state, decision=None: {"reply": "fallback reply"},
    )

    execution = workflow.invoke(ChatInput(message="question", conversation_id="failure-1"))

    assert execution.status == "completed"
    assert execution.reply == "fallback reply"


def test_write_action_pauses_then_resume_same_thread_completes():
    calls = []

    def run_agent(selected, human_message, state, decision=None):
        calls.append(decision)
        if decision is None:
            return {"interrupts": [{"tool": "create_registration", "args": {"patient_id": 7}}]}
        assert decision == {"decisions": [{"type": "approve"}]}
        return {"reply": "registration created"}

    workflow = ChatWorkflow(router=lambda _: _route(Intent.REGISTRATION), memory_search=lambda *_: None, memory_store=lambda *_: None, agent_runner=run_agent)
    pending = workflow.invoke(ChatInput(message="register", conversation_id="thread-7"))

    assert pending.status == "pending"
    assert pending.reply is None
    assert pending.interrupts[0]["tool"] == "create_registration"

    completed = workflow.resume(" thread-7 ", {"decision": "approve"})

    assert completed.status == "completed"
    assert completed.reply == "registration created"
    assert calls == [None, {"decisions": [{"type": "approve"}]}]


def test_workflow_adapts_real_hitl_action_requests_payload():
    def run_agent(selected, human_message, state, decision=None):
        if decision is None:
            return {"__interrupt__": [{"action_requests": [{"name": "create_registration", "args": {"patient_id": 7}}], "review_configs": [{"action_name": "create_registration", "allowed_decisions": ["approve", "edit", "reject"]}]}]}
        return {"reply": "created"}

    workflow = ChatWorkflow(router=lambda _: _route(Intent.REGISTRATION), memory_search=lambda *_: None, memory_store=lambda *_: None, agent_runner=run_agent)

    pending = workflow.invoke(ChatInput(message="register", conversation_id="middleware-1"))

    assert pending.status == "pending"
    assert pending.interrupts == [
        {**pending.interrupts[0], "tool": "create_registration", "args": {"patient_id": 7}}
    ]
    assert pending.interrupts[0]["allowedDecisions"] == ["approve", "edit", "reject"]


def test_workflow_preserves_hitl_review_config_decisions():
    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.REGISTRATION),
        memory_search=lambda *_: None,
        memory_store=lambda *_: None,
        agent_runner=lambda *_: {
            "__interrupt__": [{
                "action_requests": [{"name": "pay_charge", "args": {"charge_id": 9}}],
                "review_configs": [{"action_name": "pay_charge", "allowed_decisions": ["approve", "reject"]}],
            }]
        },
    )

    pending = workflow.invoke(ChatInput(message="pay", conversation_id="middleware-decisions"))

    assert pending.interrupts[0]["tool"] == "pay_charge"
    assert pending.interrupts[0]["allowedDecisions"] == ["approve", "reject"]


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


@pytest.mark.parametrize("conversation_id", [None, "missing-thread"])
def test_resume_requires_existing_conversation(conversation_id):
    workflow = ChatWorkflow(agent_runner=lambda *_: {"reply": "unused"})

    with pytest.raises(LookupError):
        workflow.resume(conversation_id, {"decision": "approve"})


def test_memory_is_stored_only_for_completed_reply():
    stored = []

    def run_agent(selected, human_message, state, decision=None):
        if decision is None:
            return {"interrupts": [{"tool": "create_registration", "args": {}}]}
        return {"reply": "created"}

    workflow = ChatWorkflow(
        router=lambda _: _route(Intent.REGISTRATION),
        agent_runner=run_agent,
        memory_search=lambda *_: None,
        memory_store=lambda conversation_id, user_id, message, reply: stored.append((conversation_id, reply)),
    )
    workflow.invoke(ChatInput(message="register", conversation_id="memory-1"))
    assert stored == []

    workflow.resume("memory-1", {"decision": "reject", "message": "stop"})
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


def test_agent_runner_receives_auth_context_on_initial_and_resume(monkeypatch):
    from contextlib import contextmanager
    from wenrun_ai.graph import workflow as module
    observed = []

    @contextmanager
    def context(api_key, user_id):
        observed.append((api_key, user_id))
        yield

    monkeypatch.setattr(module, "wenrun_api_context", context)
    workflow = ChatWorkflow(router=lambda _: _route(Intent.REGISTRATION), memory_search=lambda *_: None, profile_search=lambda *_: None, memory_store=lambda *_: None,
        agent_runner=lambda *args: {"interrupts": [{"tool": "create_registration", "args": {}}]} if args[-1] is None else {"reply": "ok"})
    workflow.invoke(ChatInput(message="register", conversation_id="auth", api_key="internal", user_id=7))
    workflow.resume("auth", {"decision": "approve"}, user_id=7)
    assert observed == [("internal", 7), ("internal", 7)]


def test_multi_action_requires_one_decision_per_tool_and_resumes():
    def runner(*args):
        decision = args[-1]
        if decision is None:
            return {"__interrupt__": [{"action_requests": [
                {"name": "create_registration", "args": {}}, {"name": "pay_charge", "args": {}},
            ], "review_configs": []}]}
        assert decision == {"decisions": [{"type": "approve"}, {"type": "approve"}]}
        return {"reply": "done"}
    workflow = ChatWorkflow(router=lambda _: _route(Intent.REGISTRATION), memory_search=lambda *_: None, memory_store=lambda *_: None, agent_runner=runner)
    pending = workflow.invoke(ChatInput(message="go", conversation_id="multi"))
    assert len(pending.interrupts) == 2
    with pytest.raises(ValueError):
        workflow.resume("multi", {"decision": "approve"})
    assert workflow.resume("multi", {"decisions": [{"decision": "approve"}, {"decision": "approve"}]}).reply == "done"


def test_resume_honors_checkpoint_review_decisions_before_invoking_agent():
    workflow = ChatWorkflow(router=lambda _: _route(Intent.REGISTRATION), memory_search=lambda *_: None, memory_store=lambda *_: None,
        agent_runner=lambda *args: {"__interrupt__": [{"action_requests": [{"name": "pay_charge", "args": {}}],
            "review_configs": [{"action_name": "pay_charge", "allowed_decisions": ["approve", "reject"]}]}]})
    workflow.invoke(ChatInput(message="pay", conversation_id="restricted"))
    with pytest.raises(ValueError, match="not allowed"):
        workflow.resume("restricted", {"decision": "edit", "args": {}})


def test_conversation_isolated_by_user_scope():
    workflow = ChatWorkflow(router=lambda _: _route(Intent.REGISTRATION), memory_search=lambda *_: None, profile_search=lambda *_: None, memory_store=lambda *_: None,
        agent_runner=lambda *args: {"interrupts": [{"tool": "create_registration", "args": {}}]})
    workflow.invoke(ChatInput(message="go", conversation_id="same", user_id=1))
    with pytest.raises(LookupError):
        workflow.resume("same", {"decision": "approve"}, user_id=2)
