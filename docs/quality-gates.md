# TOMFIC AWS Quality Gates

No feature is merged into the AWS application until these checks pass:

- `apps/api`: typecheck and unit tests.
- `apps/web`: production build and browser smoke test.
- Tenant isolation: a request cannot read or write another tenant's data.
- Product pagination: no endpoint returns the complete catalog by default.
- Idempotency: retrying an import or sync operation does not duplicate data.
- Round concurrency: closing C1 cannot close or overwrite C2.
- Offline recovery: pending operations survive reload and reconnect.
- Rollback: every database migration has a reversible or documented recovery path.

The local PostgreSQL container is for development only. No production data or
credentials belong in this environment.
