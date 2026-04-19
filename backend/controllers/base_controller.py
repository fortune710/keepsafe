from typing import Any, Dict, List, Optional
from supabase import Client
from database.tables import DatabaseTables

class BaseController:
    """
    Base controller for Supabase CRUD operations.
    Provides flexible filtering and standardized access.
    """
    def __init__(self, supabase: Client, table_name: DatabaseTables):
        self.table_name = table_name
        self.supabase = supabase

    def get(
        self, 
        filters: Optional[Dict[str, Any]] = None, 
        select: str = "*", 
        order_by: Optional[str] = None,
        descending: bool = False,
        limit: Optional[int] = None,
        maybe_single: bool = False
    ):
        """
        Flexible GET operation with filtering.
        Filters should be a dict of {field: value}.
        """
        query = self.supabase.table(self.table_name.value).select(select)
        
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)
        
        if order_by:
            query = query.order(order_by, desc=descending)
            
        if limit:
            query = query.limit(limit)
            
        if maybe_single:
            return query.maybe_single().execute()
            
        return query.execute()

    def create(self, data: Dict[str, Any]):
        return self.supabase.table(self.table_name.value).insert(data).execute()

    def update(self, filters: Dict[str, Any], data: Dict[str, Any]):
        query = self.supabase.table(self.table_name.value).update(data)
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()

    def delete(self, filters: Dict[str, Any]):
        query = self.supabase.table(self.table_name.value).delete()
        for key, value in filters.items():
            query = query.eq(key, value)
        return query.execute()
