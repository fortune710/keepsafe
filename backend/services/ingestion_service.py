from typing import Dict, Any
import json
import logging
import asyncio
import base64

from langchain_core.messages import HumanMessage

from config.pinecone_client import get_pinecone_index
from utils.datetime_utils import iso_to_unix_epoch
from utils.media_utils import get_media_bytes

logger = logging.getLogger(__name__)

class IngestionService:
    """Service for ingesting entries into the vector database."""
    
    def __init__(self, model: Any, embedding_model: Any):
        """
        Initialize the ingestion service.

        Note:
            Pinecone initialization is deferred until first use so unit tests and
            environments without Pinecone credentials can still construct this service.
        """
        self._pinecone_index = None
        self._index_lock = asyncio.Lock()
        self._model = model
        self._embedding_model = embedding_model

    async def describe_media(self, media_url: str, media_type: str) -> str:
        """Describe media using the supplied LangChain chat model."""
        formats = {
            "photo": ("image", "image/png", "Describe this image in detail. Include any visible text, objects, people, scenes, colors, and overall context. Be specific and comprehensive."),
            "video": ("video", "video/mp4", "Describe this video in detail. Include the main content, actions, scenes, people, objects, and overall context. Be specific and comprehensive."),
            "audio": ("audio", "audio/mp3", "Transcribe and describe this audio. Include what is being said, the tone, background sounds, and overall context. Be specific and comprehensive."),
        }
        if media_type not in formats:
            raise ValueError(f"Unsupported media type: {media_type}")
        block_type, mime_type, prompt = formats[media_type]
        media_bytes = await asyncio.to_thread(get_media_bytes, media_url)
        message = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {
                "type": block_type,
                "base64": base64.b64encode(media_bytes).decode("ascii"),
                "mime_type": mime_type,
            },
        ])
        response = await self._model.ainvoke([message])
        if not response.text or not response.text.strip():
            raise ValueError("Model returned an empty description")
        return response.text

    async def generate_embedding(self, text: str) -> list[float]:
        """Embed a document for insertion into the search index."""
        vectors = await self._embedding_model.aembed_documents([text])
        if not vectors or not vectors[0]:
            raise ValueError("Embedding model returned no vector.")
        return vectors[0]

    async def _get_index(self):
        """
        Lazily initialize and return the Pinecone index.
        
        Uses an asyncio.Lock to serialize concurrent initialization attempts,
        preventing race conditions and multiple initializations.

        Returns:
            Any: Pinecone index instance.
        """
        if self._pinecone_index is None:
            async with self._index_lock:
                # Double-check pattern: another coroutine may have initialized while waiting
                if self._pinecone_index is None:
                    # Offload blocking network I/O to a thread pool
                    self._pinecone_index = await asyncio.to_thread(get_pinecone_index)
        return self._pinecone_index
    
    async def ingest_entry(self, entry: Dict[str, Any]) -> bool:
        """
        Process an entry: generate description, create embeddings, and store in Pinecone.
        
        Args:
            entry: Entry dictionary with fields from the database
        
        Returns:
            True if successful, False otherwise
        """
        try:
            entry_id = entry.get("id")
            content_url = entry.get("content_url")
            entry_type = entry.get("type")
            user_id = entry.get("user_id")
            friends_ids = list(entry.get("shared_with") or [])
            attachments = entry.get("attachments", [])
            created_at = entry.get("created_at")
            created_at_epoch = iso_to_unix_epoch(created_at) if created_at else None
            attachment_lines = []
            for attachment in attachments:
                att_type = attachment.get("type")
                if att_type == "text":
                    value = attachment.get("text", "")
                    attachment_lines.append(f"- text: {value}")
                elif att_type == "sticker":
                    attachment_lines.append(f"- sticker: Sticker")
                elif att_type == "music":
                    music_obj = attachment.get("music_tag", {})
                    title = music_obj.get("title", "")
                    artist = music_obj.get("artist", "")
                    attachment_lines.append(f"- music: {title} by {artist}")
                elif att_type == "location":
                    location = attachment.get("location", "")
                    attachment_lines.append(f"- location: {location}")
            attachments_text = "\n".join(attachment_lines)

            if user_id not in friends_ids:
                friends_ids.append(user_id)
            
            if not entry_id or not content_url or not entry_type:
                logger.error("Entry missing required fields", extra={"entry_id": entry_id, "user_id": user_id, "entry_type": entry_type, "failure_stage": "validation"})
                return False
            if entry_type not in {"photo", "video", "audio"}:
                logger.error("Unsupported media type", extra={"entry_id": entry_id, "user_id": user_id, "entry_type": entry_type, "failure_stage": "validation"})
                return False
            
            # Generate description from media
            logger.info(f"Generating description for entry {entry_id} of type {entry_type}")
            description = await self.describe_media(content_url, entry_type)
            
            # Combine description with existing text content if available
            combined_text = f"{description}"
            
            if len(attachments) > 0:
                combined_text = f"""
                {description}

                Additional context:
                {attachments_text}
                """
            
            # Generate embedding
            logger.info(f"Generating embedding for entry {entry_id}")
            embedding = await self.generate_embedding(combined_text)
            
            # Prepare metadata for Pinecone
            created_at = entry.get("created_at")
            created_at_epoch = iso_to_unix_epoch(created_at) if created_at else None

            metadata = {
                "entry_id": entry_id,
                "user_id": entry.get("user_id"),
                "type": entry_type,
                "description": description,
                "content_url": content_url,
                # Store attachments as a JSON string for Pinecone metadata.
                "attachments_json": json.dumps(attachments) if attachments else None,
                "created_at": created_at,
                "created_at_epoch": created_at_epoch,
                "shared_with": friends_ids,
            }
            
            # Remove None values from metadata
            metadata = {k: v for k, v in metadata.items() if v is not None}
            
            # Upsert to Pinecone
            logger.info(f"Upserting entry {entry_id} to Pinecone")
            index = await self._get_index()
            index.upsert(
                vectors=[{
                    "id": entry_id,
                    "values": embedding,
                    "metadata": metadata
                }]
            )
            
            logger.info(f"Successfully ingested entry {entry_id}")
            return True
            
        except Exception as e:
            logger.exception("Entry ingestion failed", extra={"entry_id": entry.get("id"), "user_id": entry.get("user_id"), "entry_type": entry.get("type"), "error_type": type(e).__name__})
            return False
    
    async def update_entry(self, entry: Dict[str, Any]) -> bool:
        """
        Update an existing entry in Pinecone.
        
        Args:
            entry: Updated entry dictionary
        
        Returns:
            True if successful, False otherwise
        """
        return await self.ingest_entry(entry)
    
    async def delete_entry(self, entry_id: str) -> bool:
        """
        Delete an entry from Pinecone.
        
        Args:
            entry_id: ID of the entry to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            index = await self._get_index()
            index.delete(ids=[entry_id])
            logger.info(f"Successfully deleted entry {entry_id} from Pinecone")
            return True
        except Exception as e:
            logger.error(f"Error deleting entry {entry_id}: {str(e)}", exc_info=True)
            return False


def create_ingestion_service() -> IngestionService:
    """Construct ingestion with the providers used by the search pipeline."""
    from agents.embedding_model_factory import EmbeddingModel, EmbeddingProvider
    from agents.model_factory import AgentModel, ModelProvider

    return IngestionService(
        model=AgentModel(ModelProvider.GEMINI),
        embedding_model=EmbeddingModel(EmbeddingProvider.GOOGLE),
    )

