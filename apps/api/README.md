# TOMFIC API

This will become the NestJS API for the AWS application.

Planned layers:

- `src/core`: authentication, errors, database ports, and shared infrastructure contracts.
- `src/features`: products, inventories, counts, CRM, billing, and reports.
- `src/infrastructure`: Prisma, Cognito, S3, SQS, and AWS adapters.

The API is intentionally not connected to AWS yet. Infrastructure is added only
after the contracts and use cases have tests.
