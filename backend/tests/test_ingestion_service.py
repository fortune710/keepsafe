import os
import sys
import base64

import pytest
from unittest.mock import AsyncMock
from langchain_core.messages import AIMessage
from langchain_google_genai.chat_models import _convert_to_parts

# Ensure the backend directory (which contains `services/`) is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.ingestion_service import IngestionService


@pytest.mark.asyncio
async def test_ingest_entry_success(monkeypatch):
    """Ingesting a valid entry should call Pinecone upsert and return True."""

    # Arrange: fake external services
    async def fake_generate_description_from_media(content_url, entry_type):
        return "Test description"

    async def fake_generate_embedding(text):
        return [0.1, 0.2, 0.3]

    class FakeIndex:
        def __init__(self):
            self.upsert_called_with = None

        def upsert(self, vectors):
            self.upsert_called_with = vectors

    fake_index = FakeIndex()

    # Patch functions used inside IngestionService
    from services import ingestion_service as ingestion_module

    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService(model=object(), embedding_model=object())
    monkeypatch.setattr(service, "describe_media", fake_generate_description_from_media)
    monkeypatch.setattr(service, "generate_embedding", fake_generate_embedding)

    entry = {
        "id": "entry-123",
        "content_url": "https://example.com/image.jpg",
        "type": "photo",
        "user_id": "user-1",
        "is_private": False,
        "shared_with_everyone": False,
        "shared_with": ["friend-1"],
        "created_at": "2025-01-01T00:00:00Z",
        "attachments": [],
    }

    # Act
    result = await service.ingest_entry(entry)

    # Assert
    assert result is True
    assert fake_index.upsert_called_with is not None
    vectors = fake_index.upsert_called_with
    assert len(vectors) == 1
    stored = vectors[0]
    assert stored["id"] == entry["id"]
    assert stored["values"] == [0.1, 0.2, 0.3]
    metadata = stored["metadata"]
    assert metadata["entry_id"] == entry["id"]
    assert metadata["user_id"] == entry["user_id"]
    assert metadata["type"] == entry["type"]
    assert metadata["description"] == "Test description"
    assert metadata["shared_with"] == ["friend-1", "user-1"]


@pytest.mark.asyncio
async def test_ingest_entry_missing_required_fields(monkeypatch):
    """If required fields are missing, ingest_entry should return False and not upsert."""

    class FakeIndex:
        def __init__(self):
            self.upsert_called = False

        def upsert(self, vectors):
            self.upsert_called = True

    fake_index = FakeIndex()

    from services import ingestion_service as ingestion_module

    # Still need to patch get_pinecone_index because __init__ uses it
    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService(model=object(), embedding_model=object())

    # Missing content_url and type
    entry = {
        "id": "entry-123",
    }

    result = await service.ingest_entry(entry)

    assert result is False
    assert fake_index.upsert_called is False


@pytest.mark.asyncio
async def test_ingest_entry_with_attachments_builds_combined_text(monkeypatch):
    """Attachments should be included in the text passed to generate_embedding."""

    async def fake_generate_description_from_media(content_url, entry_type):
        return "Base description"

    async def fake_generate_embedding(text):
        fake_generate_embedding.last_text = text
        return [0.4, 0.5, 0.6]

    fake_generate_embedding.last_text = None

    class FakeIndex:
        def upsert(self, vectors):
            self.vectors = vectors

    fake_index = FakeIndex()

    from services import ingestion_service as ingestion_module

    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService(model=object(), embedding_model=object())
    monkeypatch.setattr(service, "describe_media", fake_generate_description_from_media)
    monkeypatch.setattr(service, "generate_embedding", fake_generate_embedding)

    entry = {
        "id": "entry-456",
        "content_url": "https://example.com/video.mp4",
        "type": "video",
        "user_id": "user-2",
        "attachments": [
            {"type": "text", "text": "Hello world"},
            {
                "type": "music",
                "music_tag": {"title": "Song", "artist": "Artist"},
            },
            {"type": "location", "location": "New York"},
        ],
    }

    result = await service.ingest_entry(entry)

    assert result is True
    assert fake_generate_embedding.last_text is not None
    text = fake_generate_embedding.last_text
    # Check the base description and attachment lines are present
    assert "Base description" in text
    assert "- text: Hello world" in text
    assert "- music: Song by Artist" in text
    assert "- location: New York" in text


@pytest.mark.asyncio
@pytest.mark.parametrize("media_type,block_type,mime_type", [
    ("photo", "image", "image/png"),
    ("video", "video", "video/mp4"),
    ("audio", "audio", "audio/mp3"),
])
async def test_describe_media_sends_media_to_supplied_model(monkeypatch, media_type, block_type, mime_type):
    from services import ingestion_service as ingestion_module

    monkeypatch.setattr(ingestion_module, "get_media_bytes", lambda url: b"media bytes")
    model = AsyncMock()
    model.ainvoke.return_value = AIMessage(content="Description")
    description = await IngestionService(model=model, embedding_model=object()).describe_media("https://example.com/media", media_type)

    assert description == "Description"
    message = model.ainvoke.await_args.args[0][0]
    assert message.content[1] == {
        "type": block_type,
        "mime_type": mime_type,
        "base64": base64.b64encode(b"media bytes").decode("ascii"),
    }
    parts = _convert_to_parts(message.content, model="gemini-2.5-flash")
    assert parts[1].inline_data.data == b"media bytes"
    assert parts[1].inline_data.mime_type == mime_type


@pytest.mark.asyncio
async def test_describe_media_rejects_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported media type"):
        await IngestionService(model=AsyncMock(), embedding_model=object()).describe_media("https://example.com/media", "pdf")


@pytest.mark.asyncio
async def test_generate_embedding_uses_injected_document_model():
    embedding_model = AsyncMock()
    embedding_model.aembed_documents.return_value = [[0.1, 0.2]]
    service = IngestionService(model=object(), embedding_model=embedding_model)

    assert await service.generate_embedding("memory") == [0.1, 0.2]
    embedding_model.aembed_documents.assert_awaited_once_with(["memory"])


@pytest.mark.asyncio
async def test_generate_embedding_rejects_empty_result():
    embedding_model = AsyncMock()
    embedding_model.aembed_documents.return_value = []
    service = IngestionService(model=object(), embedding_model=embedding_model)

    with pytest.raises(ValueError, match="no vector"):
        await service.generate_embedding("memory")


@pytest.mark.asyncio
async def test_description_rejects_empty_response(monkeypatch):
    from services import ingestion_service as ingestion_module
    monkeypatch.setattr(ingestion_module, "get_media_bytes", lambda _: b"media")
    model = AsyncMock()
    model.ainvoke.return_value = AIMessage(content="")
    with pytest.raises(ValueError, match="empty description"):
        await IngestionService(model, object()).describe_media("https://example.com", "photo")


@pytest.mark.asyncio
async def test_ingestion_does_not_mutate_shared_with():
    embedding = AsyncMock()
    embedding.aembed_documents.return_value = [[0.1]]
    service = IngestionService(object(), embedding)
    service.describe_media = AsyncMock(return_value="description")
    index = AsyncMock()
    index.upsert = __import__('unittest.mock', fromlist=['MagicMock']).MagicMock()
    service._get_index = AsyncMock(return_value=index)
    entry = {"id": "entry", "content_url": "https://example.com", "type": "photo", "user_id": "owner", "shared_with": ["friend"]}
    assert await service.ingest_entry(entry)
    assert entry["shared_with"] == ["friend"]


@pytest.mark.asyncio
async def test_delete_entry_success(monkeypatch):
    """delete_entry should call index.delete and return True on success."""

    class FakeIndex:
        def __init__(self):
            self.deleted_ids = None

        def delete(self, ids):
            self.deleted_ids = ids

    fake_index = FakeIndex()

    from services import ingestion_service as ingestion_module

    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService(model=object(), embedding_model=object())

    result = await service.delete_entry("entry-999")

    assert result is True
    assert fake_index.deleted_ids == ["entry-999"]


@pytest.mark.asyncio
async def test_delete_entry_failure(monkeypatch):
    """If index.delete raises, delete_entry should return False."""

    class FakeIndex:
        def delete(self, ids):
            raise RuntimeError("Delete failed")

    fake_index = FakeIndex()

    from services import ingestion_service as ingestion_module

    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService(model=object(), embedding_model=object())

    result = await service.delete_entry("entry-999")

    assert result is False


@pytest.mark.asyncio
async def test_update_entry_delegates_to_ingest(monkeypatch):
    """update_entry should delegate to ingest_entry."""

    from services import ingestion_service as ingestion_module

    # Use a real service instance but stub ingest_entry
    service = IngestionService(model=object(), embedding_model=object())
    service.ingest_entry = AsyncMock(return_value=True)

    entry = {"id": "entry-777"}
    result = await service.update_entry(entry)

    assert result is True
    service.ingest_entry.assert_called_once_with(entry)


