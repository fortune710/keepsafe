#!/usr/bin/env python3
"""Render an untracked Docker Compose env file from Actions environment values."""

from __future__ import annotations

import os
import sys
from pathlib import Path

REQUIRED = (
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "PINECONE_API_KEY",
    "REDIS_PASSWORD",
    "SENDGRID_API_KEY",
    "SENDGRID_FROM_EMAIL",
    "SENDGRID_FROM_NAME",
    "ENTRY_REPORT_NOTIFICATION_TO_EMAIL",
)

OPTIONAL = (
    "PINECONE_INDEX_NAME",
    "PINECONE_ENVIRONMENT",
    "POSTHOG_API_KEY",
    "POSTHOG_HOST",
    "SUPABASE_WEBHOOK_SECRET",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: render-production-env.py OUTPUT_PATH", file=sys.stderr)
        return 2

    missing = [name for name in REQUIRED if not os.environ.get(name)]
    if missing:
        print("Missing required Actions secrets: " + ", ".join(missing), file=sys.stderr)
        return 1

    values = {name: os.environ[name] for name in REQUIRED}
    values.update({name: os.environ[name] for name in OPTIONAL if os.environ.get(name)})
    for name, value in values.items():
        if any(char in value for char in "\r\n\0"):
            print(f"{name} must be a single-line value.", file=sys.stderr)
            return 1

    path = Path(sys.argv[1])
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        for name in sorted(values):
            # Single quotes prevent Compose interpolation of dollar signs in secrets.
            output.write(f"{name}='{values[name].replace(chr(39), chr(92) + chr(39))}'\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
