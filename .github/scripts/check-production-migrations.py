#!/usr/bin/env python3
"""Require the known Supabase baseline and a contiguous migration history."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

BASELINE_VERSION = "20260420044000"
MIGRATIONS = Path("frontend/supabase/migrations")


def main() -> int:
    require_current = sys.argv[1:] == ["--require-current"]
    if sys.argv[1:] and not require_current:
        print("Usage: check-production-migrations.py [--require-current]", file=sys.stderr)
        return 2
    local = sorted(path.name.split("_", 1)[0] for path in MIGRATIONS.glob("*.sql"))
    if BASELINE_VERSION not in local or len(local) != len(set(local)):
        print("Local migration baseline is missing or versions are duplicated.", file=sys.stderr)
        return 1

    try:
        with psycopg.connect(os.environ["SUPABASE_DB_URL"], connect_timeout=10) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version")
                remote = [row[0] for row in cursor.fetchall()]
    except (KeyError, psycopg.Error):
        print("Could not read production Supabase migration history.", file=sys.stderr)
        return 1

    baseline_count = local.index(BASELINE_VERSION) + 1
    if len(remote) < baseline_count or remote != local[: len(remote)]:
        print("Production migration history does not match the repository baseline; stop and reconcile it.", file=sys.stderr)
        return 1
    if require_current and len(remote) != len(local):
        print("Production Supabase still has pending migrations.", file=sys.stderr)
        return 1

    print(f"Verified {len(remote)} applied migrations; {len(local) - len(remote)} pending.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
