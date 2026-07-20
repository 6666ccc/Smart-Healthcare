# WenRun Security and Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent cross-patient data access, invalid payments, and duplicate dispensing while making CORS explicit and registration reads side-effect free.

**Architecture:** Authentication places the authenticated account type in `UserContext`; service methods derive the patient-owned resource from that context. MyBatis performs direct order reads and atomic prescription state transitions; an additive MySQL migration enforces one dispense record per prescription. CORS origins are supplied through configuration binding.

**Tech Stack:** Java 17, Spring Boot 3, Jakarta Validation, MyBatis, MySQL, JUnit 5, Mockito.

---

### Task 1: Establish authentication context and service-level ownership checks

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/common/context/UserContext.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/config/AuthInterceptor.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/PatientServiceImpl.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/RegistrationServiceImpl.java`
- Test: `WenRun/src/test/java/com/example/wenrun/service/impl/PatientServiceImplTest.java`

- [ ] Write a failing Mockito unit test that sets a patient account in `UserContext`, requests another patient's record, and expects `BusinessException`.
- [ ] Run `mvn -q -Dtest=PatientServiceImplTest test` from `WenRun`; confirm the test fails because no ownership check exists.
- [ ] Store `accountType` in `UserContext`, set it from the verified JWT, and add reusable service-local checks so patient accounts may only list, read, update, register for, list registrations for, or cancel their own patient resources.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Query charge orders directly and validate patient payments

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/dto/ChargePayDTO.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/mapper/ChargeOrderMapper.java`
- Modify: `WenRun/src/main/resources/mapper/ChargeOrderMapper.xml`
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java`
- Test: `WenRun/src/test/java/com/example/wenrun/service/impl/ChargeServiceImplTest.java`

- [ ] Write failing tests for an amount of zero, a mismatched amount, and a patient paying another patient's order.
- [ ] Run `mvn -q -Dtest=ChargeServiceImplTest test`; confirm each test fails against the current implementation.
- [ ] Add `@NotNull` and `@DecimalMin(value = "0.01")` to `paidAmount`, add `selectVoById`, replace the full-list lookup, and reject amounts that do not compare equal to `totalAmount` before calling `updatePay`.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Make dispensing atomic and idempotent

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/mapper/PrescriptionMapper.java`
- Modify: `WenRun/src/main/resources/mapper/PrescriptionMapper.xml`
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/DispenseServiceImpl.java`
- Create: `WenRun/docs/SQL/migration_add_dispense_prescription_unique.sql`
- Test: `WenRun/src/test/java/com/example/wenrun/service/impl/DispenseServiceImplTest.java`

- [ ] Write a failing test for a prescription that cannot transition from `RX_PAID`, expecting an already-dispensed response and no stock mutation.
- [ ] Run `mvn -q -Dtest=DispenseServiceImplTest test`; confirm it fails because the mapper has no conditional transition.
- [ ] Add `updateStatusIfCurrent(id, fromStatus, toStatus)` with `WHERE status = #{fromStatus}`; claim the prescription before stock changes, preserve transaction rollback on errors, and add a migration that removes duplicate legacy rows only after reporting them and creates `uk_dispense_record_prescription`.
- [ ] Re-run the focused test and confirm it passes.

### Task 4: Remove registration read side effects and configure CORS origins

**Files:**
- Modify: `WenRun/src/main/java/com/example/wenrun/service/impl/RegistrationServiceImpl.java`
- Modify: `WenRun/src/main/java/com/example/wenrun/config/WebMvcConfig.java`
- Modify: `WenRun/src/main/resources/application.yml`

- [ ] Remove the expiration mutation loop from `RegistrationServiceImpl.list` so it only invokes `registrationMapper.selectList`.
- [ ] Bind a comma-delimited `wenrun.cors.allowed-origins` value and pass its explicit values to Spring's CORS registration; retain local frontend origins as defaults.
- [ ] Run `mvn -q test` and confirm compilation and existing tests pass.

### Task 5: Apply and verify the database migration

**Files:**
- Verify: `WenRun/docs/SQL/migration_add_dispense_prescription_unique.sql`

- [ ] Inspect `dispense_record` for duplicate `prescription_id` values in the configured local MySQL database.
- [ ] Apply the additive unique-index migration only if no duplicates exist; otherwise stop with the duplicate IDs for manual remediation.
- [ ] Run `mvn -q test`, inspect `git diff --check`, and review the changed files.
