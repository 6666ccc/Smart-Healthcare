# WenRun Java TODO

## P0 - Must Fix Before Real Patient Data

- [ ] Add object-level authorization for patient-facing APIs.
  - Risk: `patient` accounts can access `/api/charges`, `/api/patients`, and `/api/registrations`, but current service methods do not consistently restrict results to the logged-in patient.
  - Files to review:
    - `src/main/java/com/example/wenrun/config/AuthInterceptor.java`
    - `src/main/java/com/example/wenrun/controller/ChargeController.java`
    - `src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java`
    - `src/main/java/com/example/wenrun/controller/PatientController.java`
    - `src/main/java/com/example/wenrun/service/impl/PatientServiceImpl.java`
    - `src/main/java/com/example/wenrun/controller/RegistrationController.java`
    - `src/main/java/com/example/wenrun/service/impl/RegistrationServiceImpl.java`
  - Suggested fix: expose current account type / patient id in request context, then enforce ownership in service layer for list/detail/update/pay/cancel operations.

- [ ] Validate charge payment amount before marking an order as paid.
  - Risk: `ChargeServiceImpl.pay` accepts `paidAmount` and immediately marks the order as paid without checking that it is positive and matches `totalAmount`.
  - Files to review:
    - `src/main/java/com/example/wenrun/dto/ChargePayDTO.java`
    - `src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java`
  - Suggested fix: add DTO validation such as `@DecimalMin`, reject negative/zero amounts, and require `paidAmount.compareTo(order.getTotalAmount()) == 0` unless partial payments are an explicit product requirement.

## P1 - Correctness And Concurrency

- [ ] Make dispensing idempotent and concurrency-safe.
  - Risk: `DispenseServiceImpl.dispense` checks for an existing dispense record before inserting it, but without a database uniqueness guarantee two concurrent requests may both pass the check.
  - Files to review:
    - `src/main/java/com/example/wenrun/service/impl/DispenseServiceImpl.java`
    - `src/main/resources/mapper/DispenseRecordMapper.xml`
    - SQL migration files under `docs/SQL`
  - Suggested fix: add a unique index on `dispense_record.prescription_id`; update prescription status with a conditional `WHERE status = RX_PAID`; handle duplicate insert as an idempotent/already-dispensed response.

- [ ] Avoid loading all charge orders when fetching one order.
  - Risk: `ChargeServiceImpl.getById` calls `selectList(null, null)` and filters in memory, which is inefficient and makes authorization harder to enforce.
  - Files to review:
    - `src/main/java/com/example/wenrun/service/impl/ChargeServiceImpl.java`
    - `src/main/resources/mapper/ChargeOrderMapper.xml`
  - Suggested fix: add a mapper method like `selectVoById(Long id)` and apply ownership/role checks before returning details.

- [ ] Move registration list expiration side effects out of read paths.
  - Risk: `RegistrationServiceImpl.list` mutates expired registrations while servicing a query, so read requests can unexpectedly write data and complicate transactions/testing.
  - File to review:
    - `src/main/java/com/example/wenrun/service/impl/RegistrationServiceImpl.java`
  - Suggested fix: use a scheduled job or explicit maintenance command, or at least make the list method transactional with clear boundaries.

## P2 - Test And Configuration Hygiene

- [ ] Isolate tests from the real local MySQL database.
  - Current observation: `mvn test -q` passes, but `SpringBootTest` connects to `jdbc:mysql://localhost:3306/wenrun` and the startup runner deleted expired token blacklist rows during the test run.
  - Files to review:
    - `src/test/java/com/example/wenrun/WenRunApplicationTests.java`
    - `src/main/resources/application.yml`
    - `src/main/java/com/example/wenrun/config/BlacklistCleanupRunner.java`
  - Suggested fix: add `application-test.yml` with H2/Testcontainers or mocked datasource, activate a `test` profile, and disable startup cleanup in tests.

- [ ] Fix Maven wrapper execution on Windows/PowerShell.
  - Current observation: `mvn test -q` works, but `mvnw.cmd test -q` fails with `Cannot start maven from wrapper`.
  - Files to review:
    - `mvnw.cmd`
    - `.mvn/wrapper/*`
  - Suggested fix: regenerate Maven Wrapper with a known-good Maven version, then verify `mvnw.cmd test -q`.

- [ ] Clean up source/config encoding.
  - Risk: many Java comments, log messages, and some YAML comments display as mojibake, making maintenance difficult and increasing the chance of broken user-facing messages.
  - Files to review:
    - `src/main/java/com/example/wenrun/**/*.java`
    - `src/main/resources/application.yml`
    - `src/main/resources/application-local.yml`
  - Suggested fix: normalize files to UTF-8 and configure IDE/build encoding explicitly.

## P3 - Security Hardening

- [ ] Restrict CORS origins for credentialed requests.
  - Risk: `allowedOriginPatterns("*")` with `allowCredentials(true)` is broad. It is acceptable for local development, but should not be used unchanged in production.
  - File to review:
    - `src/main/java/com/example/wenrun/config/WebMvcConfig.java`
  - Suggested fix: move allowed origins to configuration and set explicit frontend domains per environment.

- [ ] Remove default secrets and database credentials from production configuration.
  - Risk: `application.yml` contains local MySQL credentials and default JWT/API key values.
  - File to review:
    - `src/main/resources/application.yml`
  - Suggested fix: use environment variables without production-safe defaults, and provide local defaults only in ignored local config or documented sample files.

## Verification Notes

- `mvn test -q`: passed.
- `mvnw.cmd test -q`: failed before Maven startup with wrapper script error.
- `rg`: could not run in this environment due to access denied, so PowerShell search/read commands were used instead.
