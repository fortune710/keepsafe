## AGENTS.md

### Calling Supabase Database
When making calls to the Supabase Database, use the `TABLES` object in `constants/supabase.ts` file. DO NOT write the table name as a plain string.

### Creating Custom Hooks
1. Data already made available from another custom hook should NOT be passed as a parameter INSTEAD it should be called inside the new custom hook itself

2. ALL custom hooks created must have docstrings.