# Offline Outbox

The new web client will write offline mutations to the Dexie `outbox` before
showing them as synchronized. Every operation has a unique `operationId`.

## States

- `PENDING`: waiting to be sent.
- `RETRY`: failed and eligible for retry.
- `DONE`: acknowledged by the API.

The API must treat `operationId` as idempotent. Retrying the same operation
must return the original result and must not create a duplicate capture.

This module is not connected to the legacy application yet. It will be wired
into the new `apps/web` capture flow after the web application is moved into
the AWS monorepo.

`apps/web/src/core/offline/captureOutbox.js` now provides the first adapter for capture
operations. It queues a capture before sending it and retries failed requests
with exponential backoff. The API's unique `operationId` makes retries safe.
