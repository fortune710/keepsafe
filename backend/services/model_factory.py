from __future__ import annotations

from enum import Enum
from typing import List

from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from config import settings
from services.gemini_client import GEMINI_FLASH_MODEL


class ModelType(str, Enum):
    GEMINI = "gemini"


@tool("route_search", description="Select which internal tools to use for a search query.")
def route_search(
    use_friends_tool: bool,
    use_search_tool: bool,
    use_metadata: bool,
) -> str:
    """
    Tool stub used for routing decisions.
    The model should call this tool with boolean flags that indicate
    which internal tools to activate.
    """
    return "ok"


def get_model(model_type: ModelType) -> ChatGoogleGenerativeAI:
    """
    Factory for LangChain chat models. Returns a model instance with
    routing tools bound (used for intent/tool selection).
    """
    if model_type == ModelType.GEMINI:
        api_key = settings.GOOGLE_GENERATIVE_AI_API_KEY
        if not api_key:
            raise ValueError(
                "GOOGLE_GENERATIVE_AI_API_KEY must be set to use Gemini models."
            )

        model = ChatGoogleGenerativeAI(
            model=GEMINI_FLASH_MODEL,
            api_key=api_key,
        )
        return model.bind_tools([route_search])

    raise ValueError(f"Unsupported model type: {model_type}")
