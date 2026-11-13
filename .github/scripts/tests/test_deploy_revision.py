import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def run(*args, cwd=None, check=True, env=None):
    return subprocess.run(args, cwd=cwd, check=check, env=env, capture_output=True, text=True)


class DeployRevisionTests(unittest.TestCase):
    def test_newer_main_is_not_deployed_and_rollback_is_rejected(self):
        workflow = (ROOT / '.github/workflows/production-deploy.yml').read_text()
        start = workflow.index('          git fetch origin main\n')
        end_marker = '          test "$(git rev-parse HEAD)" = "$deploy_sha"\n'
        end = workflow.index(end_marker, start) + len(end_marker)
        script = '\n'.join(line[10:] for line in workflow[start:end].splitlines())

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            remote, seed, vps = root / 'remote.git', root / 'seed', root / 'vps'
            run('git', 'init', '--bare', str(remote))
            run('git', 'clone', str(remote), str(seed))
            run('git', 'checkout', '-b', 'main', cwd=seed)
            run('git', 'config', 'user.email', 'test@example.invalid', cwd=seed)
            run('git', 'config', 'user.name', 'Test', cwd=seed)
            (seed / 'version').write_text('one')
            run('git', 'add', 'version', cwd=seed)
            run('git', 'commit', '-m', 'one', cwd=seed)
            run('git', 'push', '-u', 'origin', 'main', cwd=seed)
            run('git', 'clone', '--branch', 'main', str(remote), str(vps))

            (seed / 'version').write_text('two')
            run('git', 'commit', '-am', 'two', cwd=seed)
            checked_sha = run('git', 'rev-parse', 'HEAD', cwd=seed).stdout.strip()
            run('git', 'push', cwd=seed)
            (seed / 'version').write_text('three')
            run('git', 'commit', '-am', 'three', cwd=seed)
            latest_sha = run('git', 'rev-parse', 'HEAD', cwd=seed).stdout.strip()
            run('git', 'push', cwd=seed)

            env = {**os.environ, 'deploy_sha': checked_sha}
            run('bash', '-euo', 'pipefail', '-c', script, cwd=vps, env=env)
            self.assertEqual(run('git', 'rev-parse', 'HEAD', cwd=vps).stdout.strip(), checked_sha)
            run('git', 'merge', '--ff-only', latest_sha, cwd=vps)
            result = run('bash', '-euo', 'pipefail', '-c', script, cwd=vps, env=env, check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(run('git', 'rev-parse', 'HEAD', cwd=vps).stdout.strip(), latest_sha)


if __name__ == '__main__':
    unittest.main()
