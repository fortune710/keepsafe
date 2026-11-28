import json
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
    'PINECONE_API_KEY', 'REDIS_PASSWORD', 'REDIS_URL', 'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME',
    'ENTRY_REPORT_NOTIFICATION_TO_EMAIL', 'SUPABASE_WEBHOOK_SECRET',
)


class RenderProductionEnvTests(unittest.TestCase):
    def test_deployment_workflow_reads_optional_settings_from_secrets(self):
        workflow = (ROOT / '.github/workflows/production-deploy.yml').read_text()
        for name in (
            'META_APP_ID', 'META_APP_SECRET', 'META_INSTAGRAM_CONFIG_ID',
            'META_INSTAGRAM_REDIRECT_URI', 'META_INSTAGRAM_LOGIN_URL',
            'META_GRAPH_API_VERSION', 'INSTAGRAM_TOKEN_ENCRYPTION_KEY',
            'XAI_API_KEY', 'COHERE_API_KEY',
        ):
            with self.subTest(name=name):
                self.assertIn(f'{name}: ${{{{ secrets.{name} }}}}', workflow)

    def test_optional_settings_reach_backend_container(self):
        optional_values = {
            'XAI_API_KEY': 'example-xai-key',
            'COHERE_API_KEY': 'example-cohere-key',
            'META_APP_ID': 'example-app-id',
            'META_APP_SECRET': 'example-secret',
            'META_INSTAGRAM_CONFIG_ID': 'example-config-id',
            'META_INSTAGRAM_REDIRECT_URI': 'https://example.com/instagram/callback',
            'META_INSTAGRAM_LOGIN_URL': 'https://facebook.com/dialog/oauth?client_id=123&state=placeholder',
            'META_GRAPH_API_VERSION': 'v27.0',
            'INSTAGRAM_TOKEN_ENCRYPTION_KEY': 'example-encryption-key',
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'env'
            env = {key: 'placeholder' for key in REQUIRED}
            env.update(optional_values)
            env['PATH'] = os.environ['PATH']
            subprocess.run([sys.executable, str(RENDERER), str(output)], env=env, check=True)
            result = subprocess.run(
                ['docker', 'compose', '--env-file', str(output), '-f', str(ROOT / 'compose.production.yaml'),
                 'config', '--format', 'json'],
                env={'PATH': os.environ['PATH']}, check=True, capture_output=True, text=True,
            )
            backend_environment = json.loads(result.stdout)['services']['backend']['environment']
            for name, value in optional_values.items():
                self.assertEqual(backend_environment[name], value)

    def test_redis_url_and_password_are_required(self):
        for missing in ('REDIS_URL', 'REDIS_PASSWORD'):
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as directory:
                env = {key: 'placeholder' for key in REQUIRED if key != missing}
                result = subprocess.run(
                    [sys.executable, str(RENDERER), str(Path(directory) / 'env')],
                    env=env, capture_output=True, text=True,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(missing, result.stderr)

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
