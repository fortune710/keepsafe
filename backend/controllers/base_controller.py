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

    def _apply_filters(self, query, filters: Optional[Dict[str, Any]]):
        """Standardized filter application for queries."""
        if filters:
            for key, value in filters.items():
                if value is None:
                    query = query.is_(key, "null")
                else:
                    query = query.eq(key, value)
        return query

    def _validate_mutating_filters(self, filters: Dict[str, Any], operation: str):
        """Safety check to prevent accidental bulk updates or deletes."""
        if not filters:
            raise ValueError(f"Filters dictionary cannot be empty for {operation} operations")
        
        for key, value in filters.items():
            if value is None:
                raise ValueError(
                    f"Filter value for '{key}' cannot be None in {operation} operations. "
                    "Use explicit values or omit the filter if not needed."
                )

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
        query = self._apply_filters(query, filters)
        
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
        self._validate_mutating_filters(filters, "UPDATE")
        query = self.supabase.table(self.table_name.value).update(data)
        query = self._apply_filters(query, filters)
        return query.execute()

    def delete(self, filters: Dict[str, Any]):
        self._validate_mutating_filters(filters, "DELETE")
        query = self.supabase.table(self.table_name.value).delete()
        query = self._apply_filters(query, filters)
        return query.execute()
