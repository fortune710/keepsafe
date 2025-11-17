from __future__ import annotations

from datetime import datetime
import json
import logging
from typing import Any, Awaitable, Callable, Dict, List, Optional

from google import genai

from utils.formatting_utils import strip_backticks
from config import settings
from models import FriendSummary, SearchResult
from services.gemini_client import (
    GEMINI_FLASH_MODEL,
    generate_embedding,
    get_gemini_client,
)
from services.pinecone_client import get_pinecone_index
from services.supabase_client import get_supabase_client
from utils.datetime_utils import iso_to_unix_epoch


logger = logging.getLogger(__name__)

StreamCallback = Callable[[str], Awaitable[None]]


class SearchAgent:
    """
    Gemini-powered search agent that can:
    - fetch a user's friends from Supabase
    - search Pinecone for semantically similar entries
    and then synthesize a user-friendly answer.
    """

    def __init__(self) -> None:
        self._gemini_client: genai.Client = get_gemini_client()
        self._pinecone_index = get_pinecone_index()
        self._supabase = get_supabase_client()

    async def _decide_tools(self, query: str) -> Dict[str, bool]:
        """
        Ask Gemini which tools to use for a given query.
        The model must respond with strict JSON, e.g.:
        {
          "use_friends_tool": true,
          "use_search_tool": true,
          "use_metadata": true
        }
        """
        system_prompt = (
            "You are a routing assistant for a memory search app. "
            "Based on the user's query, decide which tools to use.\n\n"
            "Tools:\n"
            "- friends_tool: fetch the user's friends list (ids, usernames, emails)\n"
            "- search_tool: search Pinecone memories using semantic similarity\n\n"
            "Return ONLY valid JSON with keys:\n"
            '{ "use_friends_tool": bool, "use_search_tool": bool, "use_metadata": bool }\n'
            "Do not include any other text."
        )

        contents = [
            system_prompt,
            f"User query: {query}",
        ]

        response = self._gemini_client.models.generate_content(
            model=GEMINI_FLASH_MODEL,
            contents=contents,
        )

        raw = getattr(response, "text", "") or ""
        logger.info("Tool routing raw response: %s", raw)

        try:
            config = strip_backticks(raw)
            return {
                "use_friends_tool": bool(config.get("use_friends_tool", True)),
                "use_search_tool": bool(config.get("use_search_tool", True)),
                "use_metadata": bool(config.get("use_metadata", True)),
            }
        except Exception as e:
            logger.warning("Failed to parse routing JSON (%s). Using defaults.", e)
            # Sensible defaults: search memories and include metadata; friends optional.
            return {
                "use_friends_tool": True,
                "use_search_tool": True,
                "use_metadata": True,
            }

    async def _get_user_friends(self, user_id: str) -> List[FriendSummary]:
        """
        Fetch all accepted friends for a user and map to FriendSummary.
        """
        supabase = self._supabase

        # 1) Get accepted friendships where user is the requester.
        friendships_resp = (
            supabase.table("friendships")
            .select("user_id, friend_id")
            .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}")
            .eq("status", "accepted")
            .execute()
        )
        rows = getattr(friendships_resp, "data", None) or []
        friend_ids = []
        for row in rows:
            # If the current user is the requester, the friend is in friend_id
            if row.get("user_id") == user_id:
                friend_ids.append(row.get("friend_id"))
            # If the current user is the recipient, the friend is the requester
            elif row.get("friend_id") == user_id:
                friend_ids.append(row.get("user_id"))
        logger.info("Friend IDs: %s", friend_ids)
        if not friend_ids:
            return []

        # 2) Fetch friend profile info.
        profiles_resp = (
            supabase.table("profiles")
            .select("id, username, email, full_name")
            .in_("id", friend_ids)
            .execute()
        )
        profiles_rows = getattr(profiles_resp, "data", None) or []

        friends: List[FriendSummary] = [
            FriendSummary(
                id=row["id"],
                username=row.get("username"),
                email=row.get("email"),
                full_name=row.get("full_name"),
            )
            for row in profiles_rows
        ]

        return friends

    async def _build_pinecone_filter(
        self,
        user_id: str,
        query: str,
    ) -> Dict[str, Any]:
        """
        Use Gemini (with the user's friends list as context) to derive a Pinecone
        metadata filter from the natural-language query.

        The filter is expressed in Pinecone's metadata filter syntax, e.g.:
        {
          "type": {"$in": ["photo", "video"]},
          "created_at": {"$gte": "...", "$lte": "..."},
          "shared_with": {"$in": ["friend-id-1", "friend-id-2"]}
        }
        """
        try:
            friends = await self._get_user_friends(user_id)
        except Exception as e:
            logger.warning(
                "Could not fetch friends while building filters: %s", e, exc_info=True
            )
            friends = []

        friends_lines = [
            f"{f.id} | {f.username or ''} | {getattr(f, 'full_name', '') or ''} | {f.email or ''}"
            for f in friends
        ]
        friends_block = "\n".join(friends_lines) or "None"

        current_date_time = datetime.now().isoformat()

        system_prompt = (
            "You are a filter extraction assistant for a memory search app.\n"
            "User entries have the following metadata fields in Pinecone:\n"
            "- type: one of 'photo', 'video', 'audio'\n"
            "- created_at: ISO 8601 timestamp string\n"
            "- user_id: owner id\n"
            "- shared_with: list of user ids who can see the entry\n"
            "- is_private: boolean\n"
            "- shared_with_everyone: boolean\n\n"
            "You are given the user's natural language query and a list of their friends "
            "(id, username, full_name, email). Infer any explicit filters the user is asking for.\n\n"
            "Supported filters:\n"
            "- types: which media types to include (photo/video/audio)\n"
            "- friend_ids: entries shared with specific friends (by id)\n"
            "- created_from / created_to: ISO timestamps delimiting a date range\n\n\n"
            "Important:\n"
            "ONLY include the created_from/created_to keys if the user has explicitly mentioned a specific timeline/ date range. (e.g. 'last week', 'last month', 'spring 2021', '2024-01-01', '2024-01-01 to 2024-01-01')\n\n"
            f"For reference, the current date and time is: {current_date_time}\n\n"
            "Return ONLY valid JSON with keys:\n"
            '{\n'
            '  "types": string[] | null,\n'
            '  "friend_ids": string[] | null,\n'
            '  "created_from": string | null,\n'
            '  "created_to": string | null\n'
            '}\n'
            "If a filter is not mentioned, use null. Do not include any other text."
        )

        user_prompt = (
            f"User query: {query}\n\n"
            f"Friends (id | username | full_name | email):\n{friends_block}\n"
        )

        response = self._gemini_client.models.generate_content(
            model=GEMINI_FLASH_MODEL,
            contents=[system_prompt, user_prompt],
        )

        raw = getattr(response, "text", "") or ""
        logger.info("Filter extraction raw response: %s", raw)

        try:
            cfg = strip_backticks(raw)
        except Exception as e:
            logger.warning("Failed to parse filter JSON (%s). Using no filters.", e)
            return {}

        pinecone_filter: Dict[str, Any] = {}

        # Add user_id to cfg if not present and ensure it's the calling user's id
        cfg["user_id"] = user_id

        # Types -> metadata.type $in [...]
        types = cfg.get("types") or []
        if isinstance(types, list):
            normalized_types = [
                t for t in types if t in {"photo", "video", "audio"}
            ]
            if normalized_types:
                pinecone_filter["type"] = {"$in": normalized_types}

        # Date range -> metadata.created_at_epoch with $gte/$lte (numeric Unix epoch)
        created_from = cfg.get("created_from") or None
        created_to = cfg.get("created_to") or None
        if created_from or created_to:
            date_filter: Dict[str, Any] = {}
            if created_from:
                epoch_from = iso_to_unix_epoch(created_from)
                if epoch_from is not None:
                    date_filter["$gte"] = epoch_from
            if created_to:
                epoch_to = iso_to_unix_epoch(created_to)
                if epoch_to is not None:
                    date_filter["$lte"] = epoch_to
            if date_filter:
                pinecone_filter["created_at_epoch"] = date_filter

        # Friend ids -> metadata.shared_with $in [...]
        friend_ids = cfg.get("friend_ids") or []
        if isinstance(friend_ids, list) and friend_ids:
            pinecone_filter["shared_with"] = {"$in": friend_ids}

        # User id -> metadata.user_id == user_id
        if cfg.get("user_id"):
            pinecone_filter["user_id"] = cfg["user_id"]

        logger.debug("Derived Pinecone filter: %s", pinecone_filter)
        return pinecone_filter

    async def _search_pinecone(
        self,
        query: str,
        user_id: str,
        filters: Optional[Dict[str, Any]] = None,
        use_metadata: bool = True,
        top_k: int = 10,
    ) -> List[SearchResult]:
        """
        Search Pinecone for entries semantically similar to the query.
        Filters to entries visible to the given user.
        """
        embedding = await generate_embedding(query)
        if not embedding:
            return []

        index = self._pinecone_index

        # Query with optional metadata filters; still enforce visibility rules in Python.
        query_kwargs: Dict[str, Any] = {
            "vector": embedding,
            "top_k": top_k,
            "include_metadata": True,
        }
        if filters:
            query_kwargs["filter"] = filters

        response = index.query(**query_kwargs)

        matches = getattr(response, "matches", None) or []
        results: List[SearchResult] = []

        for match in matches:
            metadata: Dict[str, Any] = getattr(match, "metadata", {}) or {}

            owner_id = metadata.get("user_id")
            shared_everyone = metadata.get("shared_with_everyone", False)
            shared_with = metadata.get("shared_with") or []

            # Visibility rules: own entries, public entries, or entries shared with user.
            if not (
                owner_id == user_id
                or shared_everyone
                or (isinstance(shared_with, list) and user_id in shared_with)
            ):
                continue

            # Attachments are stored as a JSON string in Pinecone metadata; parse to Python.
            attachments_data = []
            attachments_str = metadata.get("attachments_json")
            if isinstance(attachments_str, str):
                try:
                    loaded = json.loads(attachments_str)
                    if isinstance(loaded, list):
                        attachments_data = loaded
                except Exception as e:
                    logger.warning("Failed to parse attachments_json: %s", e)

            result = SearchResult(
                entry_id=str(metadata.get("entry_id") or getattr(match, "id", "")),
                user_id=owner_id,
                type=metadata.get("type"),
                content_url=metadata.get("content_url"),
                attachments=attachments_data,
                created_at=metadata.get("created_at"),
                description=metadata.get("description"),
            )
            results.append(result)

        return results

    async def _summarize_for_user(
        self,
        user_id: str,
        query: str,
        friends: List[FriendSummary],
        results: List[SearchResult],
        send: StreamCallback,
    ) -> str:
        """
        Use Gemini to create a friendly answer summarizing friends and search results.
        """
        friends_section = [
            f"- {f.username or f.email or f.id} (id: {f.id})" for f in friends
        ]
        friends_text = "\n".join(friends_section) or "No friends were found."

        results_lines = []
        for r in results: 
            line = ""
            if r.description:
                line += f": {r.description}"
            results_lines.append(line)
        results_text = "\n".join(results_lines) or "No matching entries were found."

        system_prompt = (
            "You are a helpful assistant for a personal memory app called KeepSafe.\n"
            "Summarize search results and related friend information in a warm, concise, "
            "and easy-to-understand way. Do not expose raw user or entry IDs unless useful; prefer "
            "human-friendly wording."
        )

        user_prompt = (
            f"User id: {user_id}\n"
            f"User query: {query}\n\n"
            f"Friends:\n{friends_text}\n\n"
            f"Search results:\n{results_text}\n\n"
            "Explain what you found, and, if nothing matched, suggest how the user "
            "could rephrase or broaden their search."
        )

        response = self._gemini_client.models.generate_content_stream(
            model=GEMINI_FLASH_MODEL,
            contents=[system_prompt, user_prompt],
        )

        for chunk in response:
            logger.info("Gemini response chunk: %s", chunk.text if chunk.text else "")
            await send(str(chunk.text) if chunk.text else "")

        #return getattr(response, "text", "") or "Sorry, I couldn't generate an explanation."

    async def run(
        self,
        user_id: str,
        query: str,
        send: StreamCallback,
    ) -> None:
        """
        Orchestrate the end-to-end agent flow and stream progress messages via `send`.
        """
        await send("Analyzing your query...")
        routing = await self._decide_tools(query)

        use_friends = routing.get("use_friends_tool", True)
        use_search = routing.get("use_search_tool", True)
        use_metadata = routing.get("use_metadata", True)

        friends: List[FriendSummary] = []
        results: List[SearchResult] = []

        if use_friends:
            await send("Fetching your friends...")
            try:
                friends = await self._get_user_friends(user_id)
                await send(f"Found {len(friends)} friends linked to your account.")
            except Exception as e:
                logger.error("Error fetching friends: %s", e, exc_info=True)
                await send("I ran into an issue fetching your friends, but I'll continue the search.")

        if use_search:
            # First, try to extract structured filters from the query.
            await send(
                "Filtering your search..."
            )
            pinecone_filter: Dict[str, Any] = {}
            try:
                pinecone_filter = await self._build_pinecone_filter(
                    user_id=user_id,
                    query=query,
                )
                if pinecone_filter:
                    await send(
                        "Applying requested filters to narrow the search."
                    )
                else:
                    await send(
                        "No specific filters detected; searching across all of your visible memories."
                    )
            except Exception as e:
                logger.error(
                    "Error deriving filters from query: %s", e, exc_info=True
                )
                await send(
                    "I couldn't interpret filters from your query, so I'll search broadly."
                )
                pinecone_filter = {}

            await send("Searching your memories...")
            try:
                results = await self._search_pinecone(
                    query=query,
                    user_id=user_id,
                    filters=pinecone_filter or None,
                    use_metadata=use_metadata,
                )
                response_message = f"Found something in your memories." if len(results) > 0 else "No matching entries were found."
                await send(response_message)
            except Exception as e:
                logger.error("Error searching Pinecone: %s", e, exc_info=True)
                await send("I ran into an issue searching your memories.")

        await send("Summarizing the results...")
        try:
            summary = await self._summarize_for_user(
                user_id=user_id,
                query=query,
                friends=friends,
                results=results,
                send=send,
            )
        except Exception as e:
            logger.error("Error generating summary with Gemini: %s", e, exc_info=True)
            summary = "I had trouble generating a detailed explanation, but the search has completed."

        #await send(summary)

        # Optionally stream raw structured results as JSON for the frontend.
        if results:
            filtered_results = []
            for result in results:
                result_dict = result.model_dump()
                for field in ["description", "shared_with", "shared_with_everyone", "is_private"]:
                    result_dict.pop(field, None)
                filtered_results.append(result_dict)
            await send(f"```json\n{json.dumps(filtered_results, indent=2)}\n```")


