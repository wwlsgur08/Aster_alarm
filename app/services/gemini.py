from __future__ import annotations

from typing import Any, Dict


class GeminiClient:
    """
    Placeholder Gemini client.
    Intended usage: refine/validate spec JSON or expand narrative text.
    Wire up with Vertex AI Python SDK or REST when credentials are available.
    """

    def __init__(self, model_name: str = "gemini-2.5-pro", project: str | None = None, location: str | None = None):
        self.model_name = model_name
        self.project = project
        self.location = location

    def refine_spec(self, draft_spec: Dict[str, Any]) -> Dict[str, Any]:
        # Stub: return draft as-is for now
        return draft_spec
