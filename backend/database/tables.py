from enum import Enum

class DatabaseTables(str, Enum):
    PROFILES = "profiles"
    ENTRIES = "entries"
    FRIENDSHIPS = "friendships"
    MONTHLY_DUMPS = "monthly_dumps"
    ENTRY_REACTIONS = "entry_reactions"
    ENTRY_COMMENTS = "entry_comments"
    ENTRY_SHARES = "entry_shares"
    INVITES = "invites"
    PUSH_TOKENS = "push_tokens"
    TIME_CAPSULES = "time_capsules"
    VISIBLE_ENTRIES = "visible_entries"
    SPOTIFY_CONNECTIONS = "spotify_connections"
    SPOTIFY_LISTENING_EVENTS = "spotify_listening_events"
    SPOTIFY_OAUTH_STATES = "spotify_oauth_states"
