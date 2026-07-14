import sys
from pathlib import Path

import pytest


sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from wenrun_ai.graph.hitl import (
    WRITE_TOOL_POLICIES,
    format_interrupt,
    normalize_decision,
)


WRITE_TOOLS = {
    "create_patient",
    "create_registration",
    "cancel_registration",
    "start_visit",
    "update_visit",
    "create_exam_request",
    "create_prescription",
    "cancel_prescription",
    "create_charge_from_visit",
    "pay_charge",
    "dispense_prescription",
}


def test_write_tool_policies_cover_only_protected_write_tools():
    assert set(WRITE_TOOL_POLICIES) == WRITE_TOOLS
    assert all(
        policy["allowed_decisions"] == ["approve", "edit", "reject"]
        for policy in WRITE_TOOL_POLICIES.values()
    )


def test_format_interrupt_exposes_ui_contract():
    payload = format_interrupt(
        "create_registration",
        {"patient_id": 7, "doctor_id": 9},
    )

    assert payload["tool"] == "create_registration"
    assert payload["args"] == {"patient_id": 7, "doctor_id": 9}
    assert payload["allowedDecisions"] == ["approve", "edit", "reject"]
    assert payload["title"]
    assert payload["summary"]
    assert payload["details"]


def test_normalize_decision_uses_hitl_middleware_shape():
    assert normalize_decision("create_registration", {"decision": "approve"}) == {
        "decisions": [{"type": "approve"}]
    }
    assert normalize_decision(
        "create_registration",
        {"decision": "edit", "args": {"doctor_id": 11}},
    ) == {
        "decisions": [
            {
                "type": "edit",
                "edited_action": {
                    "name": "create_registration",
                    "args": {"doctor_id": 11},
                },
            }
        ]
    }
    assert normalize_decision(
        "create_registration",
        {"decision": "reject", "message": "时间不合适"},
    ) == {"decisions": [{"type": "reject", "message": "时间不合适"}]}


@pytest.mark.parametrize(
    ("tool", "decision"),
    [("get_patient", "approve"), ("create_patient", "unknown")],
)
def test_normalize_decision_rejects_unknown_tools_and_decisions(tool, decision):
    with pytest.raises(ValueError):
        normalize_decision(tool, {"decision": decision})


def test_normalize_decision_uses_the_specific_tools_allowed_decisions(monkeypatch):
    monkeypatch.setitem(
        WRITE_TOOL_POLICIES["create_patient"], "allowed_decisions", ["approve"]
    )

    with pytest.raises(ValueError):
        normalize_decision("create_patient", {"decision": "edit", "args": {}})


@pytest.mark.parametrize(
    "payload",
    [
        {"decision": "edit"},
        {"decision": "edit", "args": []},
        {"decision": "reject"},
        {"decision": "respond", "message": ""},
    ],
)
def test_normalize_decision_validates_decision_payload(payload):
    with pytest.raises(ValueError):
        normalize_decision("create_patient", payload)
