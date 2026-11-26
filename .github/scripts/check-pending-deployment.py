#!/usr/bin/env python3
"""Check whether deployment-relevant files changed since the last healthy deploy."""
import re
import subprocess
import sys

DEPLOY_PATHS = (
    'backend', 'compose.production.yaml', 'config/nginx',
    '.github/scripts', '.github/workflows/production-deploy.yml',
)


def pending_deployment(deployed: str, target: str) -> bool:
    if not re.fullmatch(r'[0-9a-f]{40}', target):
        raise ValueError('Invalid target revision')
    # No marker means no successful deployment has been recorded by this workflow.
    if not deployed:
        return True
    if not re.fullmatch(r'[0-9a-f]{40}', deployed):
        raise ValueError('Invalid deployed revision')
    subprocess.run(['git', 'merge-base', '--is-ancestor', deployed, target], check=True)
    result = subprocess.run(['git', 'diff', '--quiet', deployed, target, '--', *DEPLOY_PATHS], check=False)
    if result.returncode not in (0, 1):
        raise RuntimeError('Unable to compare deployment revisions')
    return result.returncode == 1


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: check-pending-deployment.py DEPLOYED_SHA TARGET_SHA')
    print(str(pending_deployment(sys.argv[1], sys.argv[2])).lower())
