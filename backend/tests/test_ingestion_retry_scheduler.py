from unittest.mock import AsyncMock

import pytest

from schedulers.entry_ingestion_scheduler import EntryIngestionScheduler


@pytest.mark.asyncio
async def test_scheduler_retries_dead_letter_queue():
    scheduler = EntryIngestionScheduler.__new__(EntryIngestionScheduler)
    scheduler.entry_ingestion_service = AsyncMock()
    await scheduler._process_queue_job()
    scheduler.entry_ingestion_service.process_dlq.assert_awaited_once()
