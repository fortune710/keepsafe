import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.search_agent import SearchAgent


router = APIRouter(prefix="/search", tags=["search"])

agent = SearchAgent()


class SearchRequest(BaseModel):
    user_id: str
    query: str


async def _sse_event_stream(user_id: str, query: str) -> AsyncGenerator[str, None]:
    """
    Async generator that streams server-sent events for the search agent.
    """
    queue: asyncio.Queue[str] = asyncio.Queue()

    async def send(message: str) -> None:
        # Each message is wrapped as an SSE 'data' event.
        await queue.put(f"data: {message}")

    # Run the agent in the background to push messages into the queue.
    task = asyncio.create_task(agent.run(user_id=user_id, query=query, send=send))

    try:
        while True:
            if task.done() and queue.empty():
                break
            msg = await queue.get()
            yield msg
    finally:
        await task


@router.post("/stream")
async def search_stream(payload: SearchRequest) -> StreamingResponse:
    """
    Streaming endpoint that runs the search agent and sends user-friendly
    status updates and the final summary over Server-Sent Events (SSE).
    """
    event_source = _sse_event_stream(user_id=payload.user_id, query=payload.query)
    return StreamingResponse(event_source, media_type="text/event-stream")


