from typing import Any, Dict, List, Optional
from supabase import Client
from database.tables import DatabaseTables
from controllers.base_controller import BaseController

class EntryController(BaseController):
    def __init__(self, supabase: Client):
        super().__init__(supabase, DatabaseTables.ENTRIES)

    def fetch_user_entries_in_range(self, user_id: str, start_utc_iso: str, end_utc_iso: str):
        """
        Fetch all entries for a specific user within a date range.
        """
        return (
            self.supabase.table(self.table_name.value)
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", start_utc_iso)
            .lt("created_at", end_utc_iso)
            .order("created_at")
            .execute()
        )
