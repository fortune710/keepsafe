from typing import Optional, List

from google import genai

from utils.media_utils import get_media_part
from config import settings

"""
Gemini client utilities using the new `google-genai` SDK.

Docs: https://ai.google.dev/gemini-api/docs
"""

_client: Optional[genai.Client] = None

GEMINI_FLASH_MODEL = "gemini-2.5-flash"          # Fast multimodal model
GEMINI_EMBED_MODEL = "text-embedding-004"       # Latest embedding model


def get_gemini_client() -> genai.Client:
    """
    Initialize and cache the Gemini client.
    """
    global _client

    if _client is None:
        api_key = settings.GOOGLE_GENERATIVE_AI_API_KEY
        if not api_key:
            raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY must be set in environment variables")

        _client = genai.Client(api_key=api_key)

    return _client


async def generate_description_from_media(media_url: str, media_type: str) -> str:
    """
    Generate a text description of an image, video, or audio file using Gemini Flash.

    Args:
        media_url: URL of the media file
        media_type: Type of media ('photo', 'video', or 'audio')

    Returns:
        Text description of the media.
    """
    client = get_gemini_client()

    if media_type == "photo":
        prompt = (
            "Describe this image in detail. Include any visible text, objects, "
            "people, scenes, colors, and overall context. Be specific and comprehensive."
        )
    elif media_type == "video":
        prompt = (
            "Describe this video in detail. Include the main content, actions, scenes, "
            "people, objects, and overall context. Be specific and comprehensive."
        )
    elif media_type == "audio":
        prompt = (
            "Transcribe and describe this audio. Include what is being said, the tone, "
            "background sounds, and overall context. Be specific and comprehensive."
        )
    else:
        raise ValueError(f"Unsupported media type: {media_type}")

    # With the new SDK we call models.generate_content on the client.
    # We pass the media URL as-is; if you later proxy or upload the file,
    # you can swap this to use actual bytes or a File object.
    response = client.models.generate_content(
        model=GEMINI_FLASH_MODEL,
        contents=[
            prompt,
            get_media_part(media_url, media_type),
        ],
    )

    return getattr(response, "text", "") or ""


async def generate_embedding(text: str) -> List[float]:
    """
    Generate a vector embedding for text using Gemini Embed.

    Args:
        text: Text to generate embedding for

    Returns:
        List of floats representing the embedding vector.
    """
    client = get_gemini_client()

    # New SDK uses models.embed_content on the client.
    result = client.models.embed_content(
        model=GEMINI_EMBED_MODEL,
        contents=text,
    )

    # The response contains an `embeddings` list; each item has a `values` list.
    embeddings = getattr(result, "embeddings", None)
    if not embeddings:
        return []

    first = embeddings[0]
    values = getattr(first, "values", None)
    return list(values or [])
