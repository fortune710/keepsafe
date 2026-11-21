from controllers.base_controller import BaseController
from database.tables import DatabaseTables


class ExternalConnectionsController(BaseController):
    def __init__(self, supabase):
        super().__init__(supabase, DatabaseTables.EXTERNAL_CONNECTIONS)

    def save_instagram(self, user_id, instagram):
        return self.supabase.table(self.table_name.value).upsert(
            {"user_id": user_id, "instagram": instagram}, on_conflict="user_id"
        ).execute()
