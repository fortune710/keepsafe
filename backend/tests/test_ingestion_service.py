import os
import sys

import pytest
from unittest.mock import AsyncMock

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
        "generate_description_from_media",
        fake_generate_description_from_media,
    )
    monkeypatch.setattr(
        ingestion_module,
        "generate_embedding",
        fake_generate_embedding,
    )
    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService()

    entry = {
        "id": "entry-123",
        "content_url": "https://example.com/image.jpg",
        "type": "image",
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

    service = IngestionService()

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
        "generate_description_from_media",
        fake_generate_description_from_media,
    )
    monkeypatch.setattr(
        ingestion_module,
        "generate_embedding",
        fake_generate_embedding,
    )
    monkeypatch.setattr(
        ingestion_module,
        "get_pinecone_index",
        lambda: fake_index,
    )

    service = IngestionService()

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

    service = IngestionService()

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

    service = IngestionService()

    result = await service.delete_entry("entry-999")

    assert result is False


@pytest.mark.asyncio
async def test_update_entry_delegates_to_ingest(monkeypatch):
    """update_entry should delegate to ingest_entry."""

    from services import ingestion_service as ingestion_module

    # Use a real service instance but stub ingest_entry
    service = IngestionService()
    service.ingest_entry = AsyncMock(return_value=True)

    entry = {"id": "entry-777"}
    result = await service.update_entry(entry)

    assert result is True
    service.ingest_entry.assert_called_once_with(entry)


