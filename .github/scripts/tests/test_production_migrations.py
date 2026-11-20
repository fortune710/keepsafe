import contextlib
import importlib.util
import io
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class FakeDatabaseError(Exception):
    def __init__(self, message, sqlstate=None):
        super().__init__(message)
        self.sqlstate = sqlstate


psycopg = types.ModuleType('psycopg')
psycopg.Error = FakeDatabaseError
psycopg.connect = lambda *args, **kwargs: None
script = Path(__file__).resolve().parents[1] / 'check-production-migrations.py'
spec = importlib.util.spec_from_file_location('check_production_migrations', script)
checker = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'psycopg': psycopg}):
    spec.loader.exec_module(checker)


class MigrationErrorTests(unittest.TestCase):
    def test_safe_error_categories(self):
        cases = [
            (FakeDatabaseError('password authentication failed', '28P01'), 'authentication failed'),
            (FakeDatabaseError('permission denied', '42501'), 'permission denied'),
            (FakeDatabaseError('missing table', '42P01'), 'does not exist'),
            (FakeDatabaseError('could not translate host name'), 'could not be resolved'),
            (FakeDatabaseError('network is unreachable'), 'network is unreachable'),
            (FakeDatabaseError('connection timed out'), 'timed out'),
            (FakeDatabaseError('invalid percent-encoded token'), 'connection string'),
            (FakeDatabaseError('SSL certificate error'), 'TLS connection failed'),
        ]
        for error, expected in cases:
            with self.subTest(expected=expected):
                self.assertIn(expected, checker.database_error_category(error))

    def test_main_does_not_log_database_error_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, '20260420044000_baseline.sql').touch()
            error = FakeDatabaseError('password authentication failed: private-secret', '28P01')
            output = io.StringIO()
            with patch.object(checker, 'MIGRATIONS', Path(directory)), \
                 patch.object(checker.psycopg, 'connect', side_effect=error), \
                 patch.dict(os.environ, {'SUPABASE_DB_URL': 'postgresql://private-secret'}), \
                 patch.object(sys, 'argv', ['check-production-migrations.py']), \
                 contextlib.redirect_stderr(output):
                self.assertEqual(checker.main(), 1)
            self.assertIn('authentication failed', output.getvalue())
            self.assertNotIn('private-secret', output.getvalue())


if __name__ == '__main__':
    unittest.main()
