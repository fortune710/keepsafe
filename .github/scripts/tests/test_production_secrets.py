import os
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'check-production-secrets.py'
REQUIRED = ('VPS_SSH_PRIVATE_KEY', 'VPS_SSH_KNOWN_HOSTS', 'SUPABASE_DB_URL',
            'SUPABASE_URL', 'SUPABASE_KEY', 'GOOGLE_GENERATIVE_AI_KEY',
            'PINECONE_API_KEY', 'REDIS_URL', 'REDIS_PASSWORD', 'SENDGRID_API_KEY',
            'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME',
            'ENTRY_REPORT_NOTIFICATION_TO_EMAIL', 'SUPABASE_WEBHOOK_SECRET')


class ProductionSecretsTests(unittest.TestCase):
    def test_missing_names_are_reported_without_values(self):
        env = {name: 'private-test-value' for name in REQUIRED}
        env['REDIS_URL'] = ''
        del env['GOOGLE_GENERATIVE_AI_KEY']
        result = subprocess.run([sys.executable, str(SCRIPT)], env=env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('REDIS_URL', result.stderr)
        self.assertIn('GOOGLE_GENERATIVE_AI_KEY', result.stderr)
        self.assertNotIn('private-test-value', result.stdout + result.stderr)

    def test_complete_configuration_passes(self):
        result = subprocess.run([sys.executable, str(SCRIPT)],
                                env={name: 'value' for name in REQUIRED}, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
