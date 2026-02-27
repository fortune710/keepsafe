## AGENTS.md

## General Guidelines
1. Always try to make optimistic updates and save data locally where possible to make UX feel snappy.

### Calling Supabase Database
1. When making calls to the Supabase Database, use the `TABLES` object in `constants/supabase.ts` file. DO NOT write the table name as a plain string.

2. DO NOT use the `supabase` object directly. Use the `supabase` object from `lib/supabase.ts` file.

3. DO NOT call supabase tables inside of useEffect, ALWAYS use useQuery for fetching data from supabase, UNLESS you are using Supabase Realtime.


### Creating Custom Hooks
1. Data already made available from another custom hook should NOT be passed as a parameter INSTEAD it should be called inside the new custom hook itself

2. ALL custom hooks created must have docstrings.

### Calling Backend APIs or Service Methods
1. All calls to backend APIs or service methods must use either `useQuery` for fetching data, or `useMutation` for updating/creating data. When updating data, favour optimistic updates over query invalidation.

2. When Calling backend APIs use the `apiFetch` helper (or `apiFetchStream` if streaming endpoint)

### Code Style
1. Always evaulate negative conditions first eg.
```js
const friends = await getFriends();
if (friends) {
    doSomething(); // ❌ bad
}

if (!friends) return;
doSomething(); // ✅ good
```

2. Always removed unused imports 