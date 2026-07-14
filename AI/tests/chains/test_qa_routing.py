import pytest

from wenrun_ai.chains import qa


def test_run_chat_delegates_completed_execution(monkeypatch):
    class Execution:
        status = "completed"
        reply = "科普回答"

    monkeypatch.setattr(qa, "run_chat_execution", lambda *args, **kwargs: Execution())
    assert qa.run_chat("高血压是什么") == "科普回答"


def test_run_chat_does_not_turn_pending_write_into_success(monkeypatch):
    class Execution:
        status = "pending"
        reply = None

    monkeypatch.setattr(qa, "run_chat_execution", lambda *args, **kwargs: Execution())
    with pytest.raises(RuntimeError, match="pending human approval"):
        qa.run_chat("帮我挂号")


def test_resume_chat_execution_reuses_module_workflow(monkeypatch):
    calls = []

    class Workflow:
        def invoke(self, input):
            calls.append(("invoke", input.conversation_id))
            return "first"

        def resume(self, conversation_id, decision, **kwargs):
            calls.append(("resume", conversation_id, decision))
            return "second"

    workflow = Workflow()
    monkeypatch.setattr(qa, "_chat_workflow", workflow)

    assert qa.run_chat_execution("register", conversation_id="same-thread") == "first"
    assert qa.resume_chat_execution("same-thread", {"decision": "approve"}) == "second"
    assert calls == [
        ("invoke", "same-thread"),
        ("resume", "same-thread", {"decision": "approve"}),
    ]


def test_resume_chat_execution_forwards_api_key(monkeypatch):
    captured = {}
    class Workflow:
        def resume(self, conversation_id, decision, **kwargs):
            captured.update(kwargs)
            return "resumed"
    monkeypatch.setattr(qa, "_chat_workflow", Workflow())
    assert qa.resume_chat_execution("thread", {"decision": "approve"}, user_id=7, api_key="internal") == "resumed"
    assert captured == {"user_id": 7, "api_key": "internal"}
