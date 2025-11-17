from typing import Dict, Any, Optional
import json
import logging

from services.gemini_client import generate_description_from_media, generate_embedding
from services.pinecone_client import get_pinecone_index
from utils.datetime_utils import iso_to_unix_epoch

logger = logging.getLogger(__name__)

class IngestionService:
    """Service for ingesting entries into the vector database."""
    
    def __init__(self):
        self.pinecone_index = get_pinecone_index()
    
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
            friends_ids = entry.get("shared_with", [])
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

            friends_ids.append(user_id)
            
            if not entry_id or not content_url or not entry_type:
                logger.error(f"Missing required fields in entry: {entry}")
                return False
            
            # Generate description from media
            logger.info(f"Generating description for entry {entry_id} of type {entry_type}")
            description = await generate_description_from_media(content_url, entry_type)
            
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
            embedding = await generate_embedding(combined_text)
            
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
                "is_private": entry.get("is_private", False),
                "shared_with_everyone": entry.get("shared_with_everyone", False),
                "created_at": created_at,
                "created_at_epoch": created_at_epoch,
                "shared_with": friends_ids,
            }
            
            # Remove None values from metadata
            metadata = {k: v for k, v in metadata.items() if v is not None}
            
            # Upsert to Pinecone
            logger.info(f"Upserting entry {entry_id} to Pinecone")
            self.pinecone_index.upsert(
                vectors=[{
                    "id": entry_id,
                    "values": embedding,
                    "metadata": metadata
                }]
            )
            
            logger.info(f"Successfully ingested entry {entry_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting entry {entry.get('id', 'unknown')}: {str(e)}", exc_info=True)
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
            self.pinecone_index.delete(ids=[entry_id])
            logger.info(f"Successfully deleted entry {entry_id} from Pinecone")
            return True
        except Exception as e:
            logger.error(f"Error deleting entry {entry_id}: {str(e)}", exc_info=True)
            return False

