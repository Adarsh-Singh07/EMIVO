from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict


class CallState(str, Enum):
    INIT = "init"
    CONNECTING = "connecting"
    IN_PROGRESS = "in_progress"
    TOOL_CALLING = "tool_calling"
    COMPLETED = "completed"
    FAILED = "failed"


class VoiceState(BaseModel):
    """Stateless state machine model to capture webhook context."""

    model_config = ConfigDict(extra="allow")

    session_id: str
    call_id: str
    state: CallState = CallState.INIT
    context: dict[str, Any] = {}

    def transition(self, new_state: CallState) -> "VoiceState":
        """Transition to a new state."""
        self.state = new_state
        return self
