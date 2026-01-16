# di-ipv-cri-f2f-api

Face to Face (F2F) CRI backend API. Deployed to AWS as Node.js Lambda functions via AWS SAM (see `deploy/template.yaml`). API contract is `deploy/f2f-spec.yaml` (OpenAPI 3.0.1).

> [!IMPORTANT]
> This repository is **public**. Do **not** commit secrets, credentials, internal URLs, account identifiers, or sensitive configuration values. Document **names** and **purposes** only.

---

## Table of contents
- [Quick links](#quick-links)
- [What this service does](#what-this-service-does)
- [Repository layout](#repository-layout)
- [API surface](#api-surface)
- [Getting started](#getting-started)
- [Running tests](#running-tests)
- [Authentication](#authentication-and-required-headers)
- [Curl examples](#curl-examples-sanitised)
- [IPV stub: start journey (curl)](#ipv-stub-start-journey-curl)
- [Async processing](#async-processing)
- [Integrations](#integrations)
- [Deployment](#deployment)
- [Further documentation](#further-documentation)
- [Code owners](#code-owners)
- [Pre-commit checks](#pre-commit-checks)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Licence](#licence)

---

## Quick links
- **API contract:** `deploy/f2f-spec.yaml`
- **SAM stack:** `deploy/template.yaml` + `deploy/samconfig.toml`
- **Run tests against a deployed stack:** `./run-tests-locally.sh <stack-name>`
- **GOV.UK Notify templates:** `gov-notify-templates/`
- **Architecture decisions (ADRs):** `adr/`

---

## What this service does
- Implements OAuth2-style flows:
  - `GET /authorization` issues an authorization code for a session.
  - `POST /token` exchanges an authorization code for a Bearer access token (`application/x-www-form-urlencoded`).
- Provides session management and configuration for the F2F frontend, and returns encrypted person information for pre-population where supported.
- Integrates with Yoti for in-branch verification and session results.
- Sends user communications via GOV.UK Notify (email and, where configured, letters).
- Receives asynchronous notifications via `POST /callback`.

---

## Repository layout
- `deploy/` SAM template, OpenAPI spec, and deployment config
- `adr/` Architecture Decision Records (ADRs)
- `src/` Lambda handlers and shared code
- `gov-notify-templates/` Notify templates used by the service
- `test-harness/`, `traffic-tests/` Test tooling and harnesses
- `*stub*/` Local/vendor stubs (for example, Yoti, Post Office, Notify)

---

## API surface

> [!TIP]
> For request/response shapes and required headers per endpoint, use `deploy/f2f-spec.yaml` as the source of truth.

| Path | Method | Summary |
|---|---:|---|
| `/session` | POST | Validates the incoming request and creates/returns session material |
| `/sessionConfiguration` | GET | Returns session configuration used by the frontend |
| `/person-info` | GET | Returns encrypted person info for FE prepopulation |
| `/person-info-key` | GET | Returns key material required to decrypt `/person-info` |
| `/addressLocations` | POST | Address lookup (postcode/address search) |
| `/documentSelection` | POST | Persists user selections and initiates Yoti session |
| `/authorization` | GET | Issues an authorization code for the session |
| `/token` | POST | Exchanges authorization code for a Bearer access token (`application/x-www-form-urlencoded`) |
| `/userinfo` | POST | Returns pending/final response (Bearer token required) |
| `/callback` | POST | Receives Yoti notifications (asynchronous callback) |
| `/abort` | POST | Terminates the user session in a failed state |
| `/.well-known/jwks.json` | GET | Publishes service JWKS (see spec/template) |

---

## Getting started

Prerequisites:
- Node.js version per `src/package.json` (`engines.node`)
- AWS Lambda runtime: nodejs20.x (see `deploy/template.yaml`)
- npm
- Docker and AWS credentials (required for the containerised integration tests)

Common local dev commands are defined in `src/package.json` under `scripts`. A typical workflow is:
```sh
cd src
npm ci
npm run compile
npm run lint
npm run test:unit
```

> [!NOTE]
> This repo does not document a supported `sam local start-api` workflow. Integration tests are designed to run against a deployed stack.

---

## Running tests

Run:
```sh
./run-tests-locally.sh <stack-name>
```

Example:
```sh
./run-tests-locally.sh f2f-cri-api
```

What it does:
- Queries CloudFormation outputs and exports them as `CFN_*`.
- Writes `docker_vars.env` and `cf-output.txt`, builds a Docker image, and runs tests in a container.
- Writes results to `./results`.

> [!CAUTION]
> The runner writes AWS credential env vars into `docker_vars.env` and writes stack outputs to `cf-output.txt`. Ensure these files are not committed.

Suites executed (defined in `run-tests.sh`; common paths include):
- If `SAM_STACK_NAME=f2f-yoti-stub`: runs `npm run test:yoti`
- If `SAM_STACK_NAME=f2f-cri-api`: runs:
  - `npm run test:api`
  - `npm run test:api-third-party`
  - then runs `npm run test:pii`

### Test environment variables (names only)

Only variable names are documented here. Do not commit values derived from stack outputs or local credentials.

Set by `run-tests-locally.sh`:

| Variable | Purpose |
|---|---|
| `SAM_STACK` / `SAM_STACK_NAME` | Stack name (arg) |
| `AWS_REGION` | Region used for CFN output lookup (default in scripts) |
| `ENVIRONMENT` | Target env identifier (default in scripts) |
| `TEST_REPORT_DIR` / `TEST_REPORT_ABSOLUTE_DIR` | Test output dir |

AWS credentials are passed through to the container if present:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`

Derived from CloudFormation outputs (mapped in `run-tests.sh` for `f2f-cri-api`):

| Variable | Derived from |
|---|---|
| `DEV_CRI_F2F_API_URL` | `CFN_F2FBackendURL` |
| `DEV_IPV_F2F_STUB_URL` | `CFN_F2FIPVStubExecuteURL` |
| `DEV_F2F_TEST_HARNESS_URL` | `CFN_F2FTestHarnessURL` |
| `GOV_NOTIFY_API` | `CFN_F2FGovNotifyURL` |
| `DEV_F2F_PO_STUB_URL` | `CFN_F2FPostOfficeStubURL` |
| `VC_SIGNING_KEY_ID` | `CFN_VcSigningKeyId` |
| `DNS_SUFFIX` | `CFN_DNSSuffix` |
| `DEV_F2F_SESSION_TABLE_NAME` | `CFN_SessionTableName` |
| `DEV_EXPIRED_SESSIONS_LAMBDA_NAME` | `CFN_ExpiredSessionsLambdaName` |
| `DEV_F2F_PERSON_IDENTITY_TABLE_NAME` | `CFN_PersonIdentityTableName` |

For `f2f-yoti-stub`:
- `DEV_F2F_YOTI_STUB_URL` from `CFN_F2FYotiStubURL`

---

### Local environment variables (.env)
- Local development and some local test runs use `src/.env` (typically created from `src/.env.example` if present). 
- `run-tests-locally.sh`/`run-tests.sh` run tests against a deployed stack and populate required env vars from CloudFormation outputs, writing temporary env files for Docker.
- Do not commit `.env` or generated env/output files.

---

## Authentication and required headers

From `deploy/f2f-spec.yaml`:
- `x-govuk-signin-session-id`: session identifier returned by `POST /session` (required by some endpoints).
- `session-id`: session identifier used by some endpoints.
- `Authorization: Bearer <token>`: Bearer access token issued by `POST /token` (required by some endpoints).
- `txma-audit-encoded`: optional audit metadata header (where supported).

> [!TIP]
> Endpoint-by-endpoint header requirements are defined on each path in `deploy/f2f-spec.yaml` under `parameters:`.

---

## Curl examples

> [!IMPORTANT]
> Replace placeholders; do not commit tokens or environment-specific values.

> [!NOTE]
> Full curl documentation for IPV stubs is still being finalised and will be completed under KIWI-1753. Examples here are placeholders.

POST `/token` (form-encoded)
```sh
curl -sS -X POST "https://<service-base-url>/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=<authorization_code_uuid>" \
  --data-urlencode "redirect_uri=https://www.example.com/receiveToken"
```

GET `/authorization` (session header)
```sh
curl -sS -X GET "https://<service-base-url>/authorization" \
  -H "x-govuk-signin-session-id: <session_uuid>"
```

POST `/userinfo` (bearer token)
```sh
curl -sS -X POST "https://<service-base-url>/userinfo" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

POST `/callback` (Yoti async callback)
```sh
curl -sS -X POST "https://<service-base-url>/callback" \
  -H "Content-Type: application/json" \
  -d '{"example":"payload"}'
```

---

## IPV stub: start journey (curl)
Some deployments use an IPV stub `/start` endpoint which returns an `AuthorizeLocation` used to enter the F2F journey.

> [!NOTE]
> The `/start` endpoint belongs to the IPV stub service, not this repository. It is included here as a convenience for manual end-to-end testing.

> [!IMPORTANT]
> Do not add real environment hostnames to this public repo. Use placeholders and refer to your team documentation for environment-specific URLs.

```sh
curl --location --request POST "https://<ipv-stub-host>/start" \
  --header "Cookie: lng=en" \
  --data "" | grep -o '"AuthorizeLocation":"[^"]*' | cut -d'"' -f4
```

---

## Async processing
- `POST /callback` is an asynchronous integration point. Events are processed out-of-band and may trigger workflow orchestration (for example, Step Functions) and downstream actions such as session completion and user communications. Infrastructure wiring is defined in `deploy/template.yaml`.
- Where configured, callback processing may invoke Step Functions workflows defined under `src/stepFunctions/` (see `deploy/template.yaml`).

### Printed customer letters (optional journey path)
Where configured for postal delivery, the service can request a PDF letter via GOV.UK Notify.

---

## Integrations
- **Yoti:** third-party identity verification provider; asynchronous callback via `/callback` and session retrieval/processing.
- **GOV.UK Notify:** templates in `gov-notify-templates/` (used by Lambda handlers in `src/`).

> [!IMPORTANT]
> Do not add Notify API keys, template IDs, internal URLs, or real customer examples to this repo.

---

## Deployment

Deployment definition/config: `deploy/template.yaml` and `deploy/samconfig.toml`.

The standard deployment route is via the CI/CD pipeline for this repository; use local SAM deployments only when explicitly required.

Pipeline-provided parameters referenced in `deploy/template.yaml` (injected by the deployment pipeline):
- `CodeSigningConfigArn`
- `TestRoleArn`
- `TrafficTestRoleArn`
- `LambdaDeploymentPreference`

This repository does not include pipeline configuration; deployment is typically managed via the owning team’s CI/CD tooling.

Local / ephemeral stack deployment in Dev (exceptional):
```sh
cd deploy
sam build --parallel
sam deploy --resolve-s3 --stack-name "YOUR_STACK_NAME" --confirm-changeset --config-env dev
```

---

### Dev / personal stack naming
Deploy with a custom stack name (include your initials) to avoid overwriting a shared API stack. Set the stack name in `deploy/samconfig.toml` (for example, `f2f-cri-api-<initials>` or similar). After deploying, update the test harness SAM config in `test-harness/deploy/samconfig.toml` to reference the custom API stack name so the harness targets the correct stack.

---

## Further documentation
- API contract: `deploy/f2f-spec.yaml`
- Architecture decisions: `adr/`
- Further documentation may exist for team members (not included in this repository).

---

## Code owners
If a `CODEOWNERS` file is present at the repo root, PRs require review by code owners.

---

## Pre-commit checks
This repo uses pre-commit via `.pre-commit-config.yaml`.

Install and enable:
```sh
pre-commit install
```

---

## Security
If you believe you have found a security vulnerability, please do not raise it in a public GitHub issue. Follow your organisation’s responsible disclosure process.

---

## Troubleshooting
See `run-tests-locally.sh` and `run-tests.sh` for test execution details and environment variable mapping.

Tests won’t run:
- Use `./run-tests-locally.sh <stack-name>`.
- Ensure AWS credentials exist in your environment (CFN outputs are queried).
- Ensure Docker is running (tests execute in a container).

Token exchange fails (`POST /token`):
- Must be `application/x-www-form-urlencoded`.
- Must include: `grant_type`, `code`, `redirect_uri`.

401/403 responses:
- Confirm required headers per endpoint in `deploy/f2f-spec.yaml`:
  - Session headers (`x-govuk-signin-session-id` or `session-id`)
  - Bearer token: `Authorization: Bearer <access_token>`

---

## Licence
This repository does not currently publish a `LICENSE`/`LICENCE` file. If you need reuse/distribution terms, consult the owning organisation’s guidance before redistributing.
