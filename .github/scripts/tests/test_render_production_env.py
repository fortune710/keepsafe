import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
RENDERER = ROOT / '.github/scripts/render-production-env.py'
REQUIRED = (
    'SUPABASE_URL', 'SUPABASE_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY',
    'PINECONE_API_KEY', 'REDIS_PASSWORD', 'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME',
    'ENTRY_REPORT_NOTIFICATION_TO_EMAIL', 'SUPABASE_WEBHOOK_SECRET',
)


class RenderProductionEnvTests(unittest.TestCase):
    def test_compose_round_trips_special_characters(self):
        values = [
            'trailing\\', 'multiple\\\\', "quote'and\"double",
            'dollar$NAME and ${OTHER} and $$', "\\'\"$\\", 'spaces = # :',
            r'literal\n\t\r',
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            compose = root / 'compose.yaml'
            compose.write_text('services:\n  app:\n    image: example\n    environment:\n      PASSWORD: ${REDIS_PASSWORD}\n')
            for index, value in enumerate(values):
                with self.subTest(value=value):
                    env = {key: 'placeholder' for key in REQUIRED}
                    env['REDIS_PASSWORD'] = value
                    env['PATH'] = os.environ['PATH']
                    output = root / f'env-{index}'
                    subprocess.run([sys.executable, str(RENDERER), str(output)], env=env, check=True)
                    self.assertEqual(output.stat().st_mode & 0o777, 0o600)
                    result = subprocess.run(
                        ['docker', 'compose', '--env-file', str(output), '-f', str(compose),
                         'config', '--environment'],
                        env={'PATH': os.environ['PATH']}, check=True, capture_output=True, text=True,
                    )
                    parsed = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
                    self.assertEqual(parsed['REDIS_PASSWORD'], value)
                    subprocess.run(
                        ['docker', 'compose', '--env-file', str(output), '-f', str(compose),
                         'config', '--quiet'],
                        env={'PATH': os.environ['PATH']}, check=True, capture_output=True, text=True,
                    )


if __name__ == '__main__':
    unittest.main()
