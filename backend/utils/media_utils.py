
import requests
from google.genai import types


def get_media_bytes(media_path: str) -> bytes:
    """Download media bytes from a URL or path."""
    return requests.get(media_path).content


def get_image_part(image_path: str) -> types.Part:
    """
    Build a Gemini Part for an image using inline bytes.
    """
    return types.Part.from_bytes(
        data=get_media_bytes(image_path),
        mime_type="image/png",
    )


def get_video_part(video_path: str) -> types.Part:
    """
    Build a Gemini Part for a video using inline bytes.
    """
    return types.Part(
        inline_data=types.Blob(
            data=get_media_bytes(video_path),
            mime_type="video/mp4",
        )
    )


def get_audio_part(audio_path: str) -> types.Part:
    """
    Build a Gemini Part for audio using inline bytes.
    """
    return types.Part.from_bytes(
        data=get_media_bytes(audio_path),
        mime_type="audio/mp3",
    )

def get_media_part(media_path: str, media_type: str) -> types.Part:
    if media_type == "photo":
        return get_image_part(media_path)
    elif media_type == "video":
        return get_video_part(media_path)
    elif media_type == "audio":
        return get_audio_part(media_path)
    else:
        raise ValueError(f"Unsupported media type: {media_type}")