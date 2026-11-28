from __future__ import annotations

from enum import Enum
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_xai import ChatXAI

from config import settings

GEMINI_FLASH_MODEL = "gemini-2.5-flash"


class ModelProvider(str, Enum):
    GEMINI = "gemini"
    XAI = "xai"


class AgentModel:
    """Create an unbound chat model and expose its LangChain methods."""

    def __init__(self, provider: ModelProvider):
        if provider == ModelProvider.GEMINI:
            if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
                raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY must be set to use Gemini models.")
            self.model = ChatGoogleGenerativeAI(
                model=GEMINI_FLASH_MODEL,
                api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY,
            )
        elif provider == ModelProvider.XAI:
            if not settings.XAI_API_KEY:
                raise ValueError("XAI_API_KEY must be set to use xAI models.")
            self.model = ChatXAI(
                model="grok-4.3",
                api_key=settings.XAI_API_KEY,
                reasoning_effort="none",
            )
        else:
            raise ValueError(f"Unsupported model provider: {provider}")

    def __getattr__(self, name: str) -> Any:
        return getattr(self.model, name)
