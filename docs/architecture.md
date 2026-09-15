# TOMFIC AWS Architecture

## Boundaries

- `apps/web`: React presentation and feature UI.
- `apps/api`: NestJS HTTP API and application use cases.
- `packages/contracts`: shared request, response, and domain contracts.
- `infra`: AWS CDK only. It provisions infrastructure and contains no business rules.
- `packages/domain`: pure inventory rules with no React, AWS, or database imports.

## Rules

- The web app never connects directly to RDS.
- Features call use cases through repositories or API clients.
- Domain code is deterministic and testable with Vitest.
- AWS adapters live in infrastructure, not in views or domain code.
- Tenant identity comes from the authenticated backend request, never from a client-supplied tenant id.
- Offline writes use an outbox with an idempotent operation id.

## Migration Strategy

The current root application remains the legacy baseline. New AWS work is developed on `aws-migration` and is not deployed until its feature tests pass.
