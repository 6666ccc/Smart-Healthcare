from wenrun_ai.chains import qa


def test_run_chat_delegates_completed_execution(monkeypatch):
    class Execution:
        status = "completed"
        reply = "科普回答"

    monkeypatch.setattr(qa, "run_chat_execution", lambda *args, **kwargs: Execution())
    assert qa.run_chat("高血压是什么") == "科普回答"


def test_run_chat_rejects_empty_reply(monkeypatch):
    class Execution:
        status = "completed"
        reply = None

    monkeypatch.setattr(qa, "run_chat_execution", lambda *args, **kwargs: Execution())
    try:
        qa.run_chat("帮我挂号")
        raise AssertionError("expected RuntimeError")
    except RuntimeError as exc:
        assert "no reply" in str(exc)


def test_run_chat_execution_reuses_module_workflow(monkeypatch):
    calls = []

    class Workflow:
        def invoke(self, input):
            calls.append(("invoke", input.conversation_id))
            return "first"

    workflow = Workflow()
    monkeypatch.setattr(qa, "_chat_workflow", workflow)

    assert qa.run_chat_execution("register", conversation_id="same-thread") == "first"
    assert calls == [("invoke", "same-thread")]
