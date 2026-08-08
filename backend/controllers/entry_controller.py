from typing import Any, Dict, List, Optional
from supabase import Client
from database.tables import DatabaseTables
from controllers.base_controller import BaseController

class EntryController(BaseController):
    def __init__(self, supabase: Client):
        super().__init__(supabase, DatabaseTables.ENTRIES)

    def fetch_user_entries_by_month(
        self, 
        user_id: str, 
        start_utc_iso: str, 
        end_utc_iso: str, 
        entry_type: Optional[str] = None,
        limit: int = 10,
        offset: int = 0
    ):
        """
        Fetch entries for a user in a specific month with optional type filtering and pagination.

        Reads from `visible_entries` rather than the base table so locked/pending time capsule
        entries are excluded here too, matching the RLS-enforced direct-Supabase read path.
        """
        query = (
            self.supabase.table(DatabaseTables.VISIBLE_ENTRIES.value)
            .select("*", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", start_utc_iso)
            .lt("created_at", end_utc_iso)
        )
        
        if entry_type:
            query = query.eq("type", entry_type)
            
        return (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
