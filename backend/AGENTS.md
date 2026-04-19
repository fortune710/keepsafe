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
