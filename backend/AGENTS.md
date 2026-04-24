# Backend Agent Guidelines

## Database Access Rules
- **NEVER** use raw strings for database table names.
- **ALWAYS** use the `DatabaseTables` enum from `backend.database.tables`.
- **NEVER** call Supabase client directly in routers.
- **ALWAYS** use the `controllers` layer for CRUD operations.
- **NEVER** implement complex logic in controllers; keep them focused on data access.

## Controller Layer
- Use `BaseController` for standard CRUD operations.
- Controllers should provide flexible GET operations for multi-field filtering.
- Inherit from `BaseController` for table-specific logic.

## Routing
- Routers should call controllers for data access.
- Avoid business logic in routers where possible.

## Logging
- **ALWAYS** use the standard Python `logging` module.
- **ALWAYS** get a logger via `logging.getLogger(__name__)` — never pass a hardcoded string name.
- **NEVER** use the `utils/logging.py` `Logger` factory class; it is deprecated.
- **ALWAYS** pass structured context as a dict to the `extra` keyword argument:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  logger.info("Message here", extra={"key": "value", "other": 123})
  ```
- Use `logger.exception(...)` inside `except` blocks to automatically capture the traceback.
- Do **not** embed dynamic data inside the message string — put it in `extra` instead.
