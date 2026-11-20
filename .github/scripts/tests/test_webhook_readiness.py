import contextlib
import importlib.util
import io
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class FakeDatabaseError(Exception):
    pass


psycopg = types.ModuleType('psycopg')
psycopg.Error = FakeDatabaseError
psycopg.connect = lambda *args, **kwargs: None
script = Path(__file__).resolve().parents[1] / 'check-webhook-readiness.py'
spec = importlib.util.spec_from_file_location('webhook_readiness', script)
checker = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'psycopg': psycopg}):
    spec.loader.exec_module(checker)


class FakeConnection:
    def __init__(self, results):
        self.results = iter(results)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self):
        return self

    def execute(self, _query):
        pass

    def fetchone(self):
        return (next(self.results),)


class WebhookReadinessTests(unittest.TestCase):
    def test_legacy_and_signed_trigger_states(self):
        cases = [
            ([False, False, True, True, True], 0),
            ([True, True, False, False, True], 0),
            ([False, False, True, True, False], 1),
            ([True, False, True, False, True], 1),
        ]
        for values, expected in cases:
            with self.subTest(values=values), \
                 patch.object(checker.psycopg, 'connect', return_value=FakeConnection(values)), \
                 patch.dict(os.environ, {'SUPABASE_DB_URL': 'placeholder'}), \
                 contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(checker.main(), expected)


if __name__ == '__main__':
    unittest.main()
