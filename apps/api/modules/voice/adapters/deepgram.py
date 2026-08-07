from typing import Any


class DeepgramConfig:
    """Implement Deepgram streaming configs."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_streaming_config(self) -> dict[str, Any]:
        """Return streaming config for Deepgram."""
        return {
            "model": "nova-2",
            "language": "en-US",
            "smart_format": True,
            "encoding": "linear16",
            "sample_rate": 8000,
            "channels": 1,
            "endpointing": 300,
            "interim_results": True,
        }

    def generate_ws_headers(self) -> dict[str, str]:
        return {"Authorization": f"Token {self.api_key}"}
