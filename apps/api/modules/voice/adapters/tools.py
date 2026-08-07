from collections.abc import Callable
from typing import Any

from pydantic import BaseModel


class ToolConfig(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]


class ToolCallingInterface:
    """Setup tool-calling interfaces targeting our read endpoints."""

    def __init__(self):
        self.tools: dict[str, dict[str, Any]] = {}

    def register_tool(self, config: ToolConfig, handler: Callable):
        """Register a tool with its handler."""
        self.tools[config.name] = {"config": config, "handler": handler}

    def get_tool_configs(self) -> list[dict[str, Any]]:
        """Get configurations for all registered tools."""
        return [
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": data["config"].description,
                    "parameters": data["config"].parameters,
                },
            }
            for name, data in self.tools.items()
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Execute a registered tool."""
        if name not in self.tools:
            raise ValueError(f"Tool {name} not registered")

        handler = self.tools[name]["handler"]
        return await handler(**arguments)
