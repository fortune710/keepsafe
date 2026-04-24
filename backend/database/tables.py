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
