from unittest.mock import MagicMock

import pytest

from agents import model_factory


def test_gemini_model_is_unbound_and_delegates_methods(monkeypatch):
    monkeypatch.setattr(model_factory.settings, "GOOGLE_GENERATIVE_AI_API_KEY", "key")
    constructor = MagicMock()
    monkeypatch.setattr(model_factory, "ChatGoogleGenerativeAI", constructor)

    model = model_factory.AgentModel(model_factory.ModelProvider.GEMINI)

    constructor.assert_called_once_with(model=model_factory.GEMINI_FLASH_MODEL, api_key="key")
    constructor.return_value.bind_tools.assert_not_called()
    assert model.ainvoke is constructor.return_value.ainvoke
    assert model.with_structured_output is constructor.return_value.with_structured_output


def test_xai_model_is_unbound_and_configured_without_reasoning(monkeypatch):
    monkeypatch.setattr(model_factory.settings, "XAI_API_KEY", "key")
    constructor = MagicMock()
    monkeypatch.setattr(model_factory, "ChatXAI", constructor)

    model = model_factory.AgentModel(model_factory.ModelProvider.XAI)

    constructor.assert_called_once_with(model="grok-4.3", api_key="key", reasoning_effort="none")
    constructor.return_value.bind_tools.assert_not_called()
    assert model.ainvoke is constructor.return_value.ainvoke


def test_missing_key_and_unsupported_provider(monkeypatch):
    monkeypatch.setattr(model_factory.settings, "XAI_API_KEY", "")
    with pytest.raises(ValueError, match="XAI_API_KEY"):
        model_factory.AgentModel(model_factory.ModelProvider.XAI)
    with pytest.raises(ValueError, match="Unsupported model provider"):
        model_factory.AgentModel("unknown")
