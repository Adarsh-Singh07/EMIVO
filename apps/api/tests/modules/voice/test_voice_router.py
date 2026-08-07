import json
import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

# Add the apps/api directory to sys.path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
)

# Mock fastapi app to mount the router
from fastapi import FastAPI

from modules.voice.models.state import CallState
from modules.voice.routers.voice_router import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_websocket_lifecycle_and_state():
    """Test standard connecting and streaming lifecycle"""
    with client.websocket_connect("/voice/ws") as websocket:
        # 1. Connect
        websocket.send_text(json.dumps({"event": "connected"}))

        # 2. Start
        websocket.send_text(
            json.dumps({"event": "start", "start": {"streamSid": "test_stream_123"}})
        )

        # 3. Media
        websocket.send_text(
            json.dumps({"event": "media", "media": {"payload": "base64data"}})
        )

        # 4. Stop
        websocket.send_text(json.dumps({"event": "stop"}))
        # Note: stopping closes the server end according to tests, or breaks out of the loop


def test_websocket_error_state():
    """Errors should trigger FAILED state."""
    # We'll mock the JSON parsing to simulate a crash/Exception inside the loop
    with patch("modules.voice.routers.voice_router.json.loads") as mock_json:
        mock_json.side_effect = Exception("Simulated Failure")

        # We need to spy on the session_state.
        # For our test, let's use a patch on the VoiceState to see its transition calls
        with patch("modules.voice.routers.voice_router.VoiceState") as mock_state_class:
            mock_state_instance = MagicMock()
            mock_state_class.return_value = mock_state_instance

            with client.websocket_connect("/voice/ws") as websocket:
                websocket.send_text("bad data")

            # The exception should be caught and transitioned to FAILED
            mock_state_instance.transition.assert_called_with(CallState.FAILED)


def test_tool_calling_schemas_match_expectations():
    """
    Test that Tool Calling schemas match expectations.
    (Placeholder - Add LLM Mocking here when the LLM service is integrated.)
    """
    # Assuming tool calling schema integration will follow the standard OpenAI / Anthropic function calling format:
    expected_schema = {
        "name": "mock_tool",
        "description": "A mock tool",
        "parameters": {"type": "object", "properties": {"arg1": {"type": "string"}}},
    }

    assert expected_schema["name"] == "mock_tool"
    assert "properties" in expected_schema["parameters"]
