from unittest.mock import MagicMock

import pytest

from agents import embedding_model_factory as factory


def test_google_embedding_uses_existing_model_and_unspecified_task(monkeypatch):
    monkeypatch.setattr(factory.settings, "GOOGLE_GENERATIVE_AI_API_KEY", "key")
    constructor = MagicMock()
    monkeypatch.setattr(factory, "GoogleGenerativeAIEmbeddings", constructor)
    model = factory.EmbeddingModel(factory.EmbeddingProvider.GOOGLE)
    constructor.assert_called_once_with(
        model="text-embedding-004", api_key="key", task_type="TASK_TYPE_UNSPECIFIED"
    )
    assert model.aembed_query is constructor.return_value.aembed_query


def test_cohere_embedding_delegates_methods(monkeypatch):
    monkeypatch.setattr(factory.settings, "COHERE_API_KEY", "key")
    constructor = MagicMock()
    monkeypatch.setattr(factory, "CohereEmbeddings", constructor)
    model = factory.EmbeddingModel(factory.EmbeddingProvider.COHERE)
    constructor.assert_called_once_with(model="embed-multilingual-v3.0", cohere_api_key="key")
    assert model.aembed_documents is constructor.return_value.aembed_documents


def test_missing_cohere_key_and_unknown_provider(monkeypatch):
    monkeypatch.setattr(factory.settings, "COHERE_API_KEY", "")
    with pytest.raises(ValueError, match="COHERE_API_KEY"):
        factory.EmbeddingModel(factory.EmbeddingProvider.COHERE)
    with pytest.raises(ValueError, match="Unsupported embedding provider"):
        factory.EmbeddingModel("unknown")
