from supabase import Client
from database.tables import DatabaseTables
from controllers.base_controller import BaseController


class TimeCapsuleController(BaseController):
    def __init__(self, supabase: Client):
        super().__init__(supabase, DatabaseTables.TIME_CAPSULES)

    def fetch_due_date_unlocks(self, now_iso: str, limit: int):
        """
        Locked date-reveal capsules whose unlock_at has passed.
        """
        return (
            self.supabase.table(self.table_name.value)
            .select("id, entry_id, user_id")
            .eq("status", "locked")
            .eq("reveal_type", "date")
            .lte("unlock_at", now_iso)
            .limit(limit)
            .execute()
        )

    def fetch_due_pending_releases(self, now_iso: str, limit: int):
        """
        Pending-release capsules (either reveal type) whose release_available_at has passed.
        """
        return (
            self.supabase.table(self.table_name.value)
            .select("id, entry_id, user_id")
            .eq("status", "pending_release")
            .lte("release_available_at", now_iso)
            .limit(limit)
            .execute()
        )

    def mark_unlocked(self, capsule_ids: list, now_iso: str):
        return (
            self.supabase.table(self.table_name.value)
            .update({"status": "unlocked", "unlocked_at": now_iso, "updated_at": now_iso})
            .in_("id", capsule_ids)
            .execute()
        )
