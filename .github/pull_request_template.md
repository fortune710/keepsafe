# Summary

<!-- Briefly explain what this PR changes and why. -->

## Related issue

Closes #

## Change type

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Security improvement
- [ ] Database/schema change
- [ ] Infrastructure/Compose change
- [ ] CI/CD change
- [ ] Documentation

## What changed

### Application changes

-

### Database changes

- [ ] No database changes
- [ ] New migration added
- [ ] Existing migration modified
- [ ] RLS/policy changes
- [ ] Index or constraint changes

Details:

-

### API changes

- [ ] No API changes
- [ ] New endpoint
- [ ] Modified endpoint
- [ ] Removed endpoint
- [ ] Response contract changed

Endpoints affected:

- `METHOD /api/v1/...`

### Security changes

- Authentication:
- Authorization:
- RLS:
- Secret handling:
- Logging/audit:
- Rate limiting/CSRF:

Confirm that this PR does not expose:

- [ ] Access tokens
- [ ] API keys
- [ ] Credential payloads
- [ ] Ciphertext or encryption metadata
- [ ] Owner IDs from foreign accounts
- [ ] Raw provider errors
- [ ] Request bodies in logs

### Infrastructure changes

- [ ] No infrastructure changes
- [ ] Docker Compose
- [ ] Environment variables
- [ ] Worker configuration
- [ ] External service integration
- [ ] CI workflow

New or changed environment variables:

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `VARIABLE_NAME` | Yes/No | `value` | Description |

## Design notes

<!-- Explain important implementation decisions, tradeoffs, or alternatives considered. -->

## Testing

### Automated tests

- [ ] Unit tests
- [ ] API contract tests
- [ ] PostgreSQL integration tests
- [ ] RLS tests
- [ ] Two-account authorization tests
- [ ] Credential security tests
- [ ] E2E tests
- [ ] Migration tests
- [ ] CI validation

Commands executed:

```bash
# Backend
cd backend
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy

# Frontend
bun install --frozen-lockfile --cwd frontend
bun run --cwd frontend lint
bun run --cwd frontend test
bun run --cwd frontend build
bun run --cwd frontend test:e2e
```

### Database verification

- [ ] Fresh database migration succeeds
- [ ] Upgrade from current database head succeeds
- [ ] `alembic check` reports no unexpected changes
- [ ] RLS policies verified
- [ ] Cross-account access denied
- [ ] Owner access succeeds

### Manual verification

<!-- Include reproducible steps for reviewers. -->

1.
2.
3.

Expected result:

## Authorization matrix

| Operation | Account A owns resource | Account B owns resource | Nonexistent resource |
|---|---|---|---|
| Read | Success | `403 authorization_denied` | `404 resource_not_found` |
| Update | Success | `403 authorization_denied` | `404 resource_not_found` |
| Delete/archive/revoke | Success | `403 authorization_denied` | `404 resource_not_found` |

## Audit and logging

- [ ] Audit events added or updated
- [ ] Audit events contain no secrets
- [ ] Logs contain no tokens or credential payloads
- [ ] Queue messages contain only safe identifiers
- [ ] Failure behavior is fail-safe and redacted

## Deployment notes

<!-- Explain any ordering or operational requirements. -->

-

Required secrets or GitHub Actions configuration:

- [ ] No new secrets
- [ ] `GITLEAKS_LICENSE`
- [ ] Other:

## Risk assessment

Risk level:

- [ ] Low
- [ ] Medium
- [ ] High

Potential risks:

-

Mitigations:

-

## Rollback plan

<!-- Explain how to safely revert this PR. -->

-

## Reviewer checklist

- [ ] Scope matches the linked issue
- [ ] Changes follow module boundaries
- [ ] No unrelated files or behavior changed
- [ ] Authorization uses the authenticated principal
- [ ] Owner IDs are applied directly in database predicates
- [ ] Cross-account relationships are rejected
- [ ] Error responses do not disclose foreign resources
- [ ] Secrets are not logged or returned
- [ ] Migrations are safe and reversible where applicable
- [ ] Tests cover success and failure paths
- [ ] CI configuration is valid
- [ ] Documentation is updated

## Screenshots or logs

<!-- Add screenshots, sanitized logs, migration output, or API examples if useful. -->

## Follow-up work

<!-- Document intentionally deferred work. -->

-