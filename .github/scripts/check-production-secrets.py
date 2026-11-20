#!/usr/bin/env python3
"""Report missing production secret names without revealing their values."""

import os
import sys

REQUIRED = (
    'VPS_SSH_PRIVATE_KEY', 'VPS_SSH_KNOWN_HOSTS', 'SUPABASE_DB_URL',
    'SUPABASE_URL', 'SUPABASE_KEY', 'GOOGLE_GENERATIVE_AI_KEY',
    'PINECONE_API_KEY', 'REDIS_URL', 'REDIS_PASSWORD', 'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME',
    'ENTRY_REPORT_NOTIFICATION_TO_EMAIL', 'SUPABASE_WEBHOOK_SECRET',
)

missing = [name for name in REQUIRED if not os.environ.get(name)]
if missing:
    print('Missing required production secrets: ' + ', '.join(missing), file=sys.stderr)
    sys.exit(1)
print('All required production secrets are set.')
