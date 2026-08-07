import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..models.state import CallState, VoiceState

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])


@router.websocket("/ws")
async def voice_websocket_endpoint(websocket: WebSocket):
    """FastAPI router that connects and initializes Twilio/Exotel WS streams."""
    await websocket.accept()

    # Initialize basic state
    session_state = VoiceState(
        session_id="ws_session", call_id="unknown_yet", state=CallState.INIT
    )

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle standard WebSocket connection from Twilio/Exotel
            event = message.get("event")

            if event == "connected":
                session_state.transition(CallState.CONNECTING)
                logger.info("Call connecting")

            elif event == "start":
                # Twilio specific start event
                stream_sid = message.get("start", {}).get("streamSid")
                session_state.call_id = stream_sid
                session_state.transition(CallState.IN_PROGRESS)
                logger.info(f"Stream started: {stream_sid}")

            elif event == "media":
                # Handle incoming media payloads
                pass

            elif event == "stop":
                session_state.transition(CallState.COMPLETED)
                logger.info("Call stopped")
                break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
        session_state.transition(CallState.COMPLETED)
    except Exception as e:
        logger.error(f"Error in websocket stream: {e}")
        session_state.transition(CallState.FAILED)
