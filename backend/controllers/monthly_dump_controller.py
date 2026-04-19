from typing import Any, Dict, List, Optional
from supabase import Client
from database.tables import DatabaseTables
from controllers.base_controller import BaseController

class MonthlyDumpController(BaseController):
    def __init__(self, supabase: Client):
        super().__init__(supabase, DatabaseTables.MONTHLY_DUMPS)

    def get_dump(self, user_id: str, month_date: str, timezone: str):
        filters = {
            "user_id": user_id,
            "month": month_date,
            "timezone": timezone
        }
        return self.get(filters=filters, maybe_single=True)

    def update_status(self, dump_id: str, status: str, data: Optional[Dict[str, Any]] = None):
        update_data = data.copy() if data else {}
        update_data["status"] = status
        return self.update({"id": dump_id}, update_data)
