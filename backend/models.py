from __future__ import annotations

from typing import Any, Dict, List, Optional, Union, Literal

from pydantic import BaseModel


# Generic JSON type compatible with Supabase metadata fields.
# NOTE: keep this non-recursive to avoid Pydantic schema recursion issues.
Json = Union[str, int, float, bool, None, Dict[str, Any], List[Any]]


class Profile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: str
    updated_at: str
    invite_code: Optional[str] = None
    max_uses: int
    current_uses: int
    is_active: bool


class MusicTag(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None


class Attachment(BaseModel):
    """
    Backend representation of a rendered attachment, aligned with
    the frontend RenderedMediaCanvasItem type and ingestion expectations.
    """

    type: Literal["text", "sticker", "music", "location"]
    text: Optional[str] = None
    music_tag: Optional[MusicTag] = None
    location: Optional[str] = None


class Entry(BaseModel):
    id: str
    user_id: str
    type: Literal["photo", "video", "audio"]
    shared_with: Optional[List[str]] = None
    attachments: List[Attachment] = []
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    music_tag: Optional[str] = None
    location_tag: Optional[str] = None
    is_private: bool
    shared_with_everyone: bool
    metadata: Optional[Json] = None
    created_at: str
    updated_at: str


class Friendship(BaseModel):
    id: str
    user_id: str
    friend_id: str
    status: Literal["pending", "accepted", "declined"]
    created_at: str
    updated_at: str


class EntryShare(BaseModel):
    id: str
    entry_id: str
    shared_with_user_id: str
    created_at: str


class EntryReaction(BaseModel):
    id: str
    entry_id: str
    user_id: str
    reaction_type: Literal["like", "love", "laugh", "wow", "sad", "angry"]
    created_at: str


class EntryComment(BaseModel):
    id: str
    entry_id: str
    user_id: str
    content: str
    created_at: str
    updated_at: str


class Invite(BaseModel):
    id: str
    inviter_id: str
    invite_code: str
    message: Optional[str] = None
    max_uses: int
    current_uses: int
    is_active: bool
    created_at: str


class FriendSummary(BaseModel):
    """Lightweight friend data for search results."""

    id: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None


class SearchResult(BaseModel):
    """Structured view over a Pinecone match for the search agent."""

    entry_id: str
    score: float
    description: Optional[str] = None
    content_url: Optional[str] = None
    is_private: Optional[bool] = None
    shared_with_everyone: Optional[bool] = None
    created_at: Optional[str] = None
    user_id: Optional[str] = None
    raw_metadata: Optional[Dict[str, Any]] = None


