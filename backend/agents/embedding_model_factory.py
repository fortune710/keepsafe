from enum import Enum
from typing import Any

from langchain_cohere import CohereEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config import settings


class EmbeddingProvider(str, Enum):
    GOOGLE = "google"
    COHERE = "cohere"


class EmbeddingModel:
    """Create an embedding model and expose its LangChain methods."""

    def __init__(self, provider: EmbeddingProvider):
        if provider == EmbeddingProvider.GOOGLE:
            if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
                raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY must be set to use Google embeddings.")
            self.model = GoogleGenerativeAIEmbeddings(
                model="text-embedding-004",
                api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY,
                task_type="TASK_TYPE_UNSPECIFIED",
            )
        elif provider == EmbeddingProvider.COHERE:
            if not settings.COHERE_API_KEY:
                raise ValueError("COHERE_API_KEY must be set to use Cohere embeddings.")
            self.model = CohereEmbeddings(
                model="embed-multilingual-v3.0",
                cohere_api_key=settings.COHERE_API_KEY,
            )
        else:
            raise ValueError(f"Unsupported embedding provider: {provider}")

    def __getattr__(self, name: str) -> Any:
        return getattr(self.model, name)
