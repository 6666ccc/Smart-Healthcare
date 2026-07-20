# WenRun Security and Correctness Design

## Scope

Implement the P0, P1, and CORS hardening items from `WenRun/docs/TODO.md`.
Test isolation, Maven Wrapper, encoding, and default-secret configuration are explicitly out of scope.

## Authorization

`UserContext` will carry the authenticated user ID and account type. Service-layer ownership checks will restrict patient accounts to their own patient record, registrations, and charge orders. Staff and internal accounts retain their existing access.

## Payments and charge lookup

Charge details will be queried directly by order ID. Payment will require a positive amount exactly equal to the order total and verify that a patient owns the order before changing its state.

## Dispensing

The schema will enforce one dispense record per prescription. Dispensing will use a conditional prescription status transition from `RX_PAID` to a processing-safe terminal path, with duplicate requests reported as already dispensed and transactional rollback protecting stock on failure.

## Registration reads

Listing registrations will be read-only. It will no longer cancel expired registrations as a query side effect.

## CORS

Credentialed API requests will use explicitly configured allowed origins rather than a wildcard pattern. Local development origins remain configurable through application configuration.

## Verification

Add focused unit tests for authorization, payment validation, and dispensing behavior, run Maven tests, and inspect the resulting diff. The database migration is additive and must be applied separately to existing databases.
