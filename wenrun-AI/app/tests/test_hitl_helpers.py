import unittest
from unittest.mock import patch

from app.agents.router.hitl import (
    build_hitl_config,
    format_hitl_decision,
    normalize_session_id,
)


class HitlHelperTests(unittest.TestCase):
    def test_normalize_session_id_keeps_existing_value(self):
        session_id = normalize_session_id("  session-123  ")

        self.assertEqual(session_id, "session-123")

    def test_normalize_session_id_creates_value_when_missing(self):
        with patch("app.agents.router.hitl.uuid.uuid4") as uuid4:
            uuid4.return_value.hex = "generated-session"

            session_id = normalize_session_id(None)

        self.assertEqual(session_id, "generated-session")

    def test_build_hitl_config_uses_session_as_thread_id(self):
        config = build_hitl_config("session-123")

        self.assertEqual(config["configurable"]["thread_id"], "session-123")

    def test_format_hitl_decision_wraps_simple_approve(self):
        result = format_hitl_decision({"type": "approve"})

        self.assertEqual(result, {"decisions": [{"type": "approve"}]})

    def test_format_hitl_decision_preserves_official_payload(self):
        official_payload = {"decisions": [{"type": "reject", "message": "no"}]}

        result = format_hitl_decision(official_payload)

        self.assertEqual(result, official_payload)

    def test_format_hitl_decision_builds_edit_payload(self):
        result = format_hitl_decision(
            {
                "type": "edit",
                "tool": "create_registration",
                "args": {"patient_id": "1", "schedule_id": "2"},
            }
        )

        self.assertEqual(
            result,
            {
                "decisions": [
                    {
                        "type": "edit",
                        "edited_action": {
                            "name": "create_registration",
                            "args": {"patient_id": "1", "schedule_id": "2"},
                        },
                    }
                ]
            },
        )


if __name__ == "__main__":
    unittest.main()
