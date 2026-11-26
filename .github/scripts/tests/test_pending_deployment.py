import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

path = Path(__file__).resolve().parents[1] / 'check-pending-deployment.py'
spec = importlib.util.spec_from_file_location('pending_deployment', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PendingDeploymentTests(unittest.TestCase):
    old = 'a' * 40
    target = 'b' * 40

    def test_missing_marker_requires_deployment(self):
        self.assertTrue(module.pending_deployment('', self.target))

    @patch.object(module.subprocess, 'run')
    def test_migration_only_changes_do_not_require_deployment(self, run):
        run.return_value = subprocess.CompletedProcess([], 0)
        self.assertFalse(module.pending_deployment(self.old, self.target))
        self.assertIn('backend', run.call_args.args[0])
        self.assertNotIn('frontend/supabase/migrations', run.call_args.args[0])

    @patch.object(module.subprocess, 'run')
    def test_backend_changes_require_deployment(self, run):
        run.side_effect = [subprocess.CompletedProcess([], 0), subprocess.CompletedProcess([], 1)]
        self.assertTrue(module.pending_deployment(self.old, self.target))

    def test_invalid_marker_fails_closed(self):
        with self.assertRaises(ValueError):
            module.pending_deployment('invalid', self.target)

    @patch.object(module.subprocess, 'run')
    def test_git_failure_is_not_treated_as_pending_or_current(self, run):
        run.side_effect = [subprocess.CompletedProcess([], 0), subprocess.CompletedProcess([], 128)]
        with self.assertRaises(RuntimeError):
            module.pending_deployment(self.old, self.target)
