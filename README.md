# di-ipv-cri-f2f-api

Face to Face (F2F) CRI backend API. Deployed via AWS SAM from `deploy/template.yaml` as Node.js Lambdas (built with `esbuild` from `src/`). API contract is defined in `deploy/f2f-spec.yaml` (OpenAPI 3.0.1).

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
- [Troubleshooting](#troubleshooting)

---

## Quick links
- **API contract:** `deploy/f2f-spec.yaml`
- **SAM stack:** `deploy/template.yaml` + `deploy/samconfig.toml`
- **Run tests against a deployed stack:** `./run-tests-locally.sh <stack-name>`
- **GOV.UK Notify templates:** `gov-notify-templates/`

---

## What this service does
- Implements OAuth2-style flows:
  - `GET /authorization` issues an authorization code for a session.
  - `POST /token` exchanges an authorization code for a bearer access token (`application/x-www-form-urlencoded`).
- Exposes F2F CRI endpoints for session management and retrieval of user/person information.
- Integrates with Yoti for in-branch verification and session results.
- Sends user communications via GOV.UK Notify.
- Receives asynchronous notifications via `/callback` (processed out-of-band).

---

## Repository layout
- `deploy/` SAM template, OpenAPI spec, and deployment config
- `src/` Lambda handlers and shared code
- `gov-notify-templates/` Notify templates used by the service
- `test-harness/`, `traffic-tests/` Test tooling and harnesses
- `*stub/` Local/vendor stubs (Yoti, Post Office, GOV Notify)

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
| `/token` | POST | Exchanges authorization code for a bearer access token (`application/x-www-form-urlencoded`) |
| `/userinfo` | POST | Returns pending/final response (bearer token required; see spec) |
| `/callback` | POST | Receives Yoti notifications (API Gateway → queue) |
| `/abort` | POST | Terminates the user session in a failed state |
| `/.well-known/jwks.json` | GET | Publishes service JWKS (see spec/template) |

---

## Getting started

Prerequisites:
- Node.js version per `src/package.json`
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

Suites executed (from `run-tests.sh`):
- If `SAM_STACK_NAME=f2f-yoti-stub`: runs `npm run test:yoti`
- If `SAM_STACK_NAME=f2f-cri-api`: runs:
  - `npm run test:api`
  - `npm run test:api-third-party`
  - then installs `jq` and runs `npm run test:pii`

### Test environment variables (names only)

Set by `run-tests-locally.sh`:

| Variable | Purpose |
|---|---|
| `SAM_STACK` / `SAM_STACK_NAME` | Stack name (arg) |
| `AWS_REGION` | Region used for CFN output lookup (script sets `eu-west-2`) |
| `ENVIRONMENT` | Target env identifier (script sets `dev`) |
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

## Authentication and required headers

From `deploy/f2f-spec.yaml`:
- `x-govuk-signin-session-id` (UUID): `sessionId` returned by `POST /session` (required by some endpoints).
- `session-id` (string/UUID): session identifier used as DynamoDB primary key for some endpoints.
- `Authorization: bearer <token>`: bearer access token issued by `POST /token` (required by some endpoints, e.g. `/userinfo` per spec).
- Optional: `txma-audit-encoded` (audit metadata from FE).

> [!TIP]
> Endpoint-by-endpoint header requirements are defined on each path in `deploy/f2f-spec.yaml` under `parameters:`.

---

## Curl examples (sanitised)

> [!IMPORTANT]
> Replace placeholders; do not commit tokens or environment-specific values.

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
  -H "Authorization: bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

POST `/callback` (Yoti async callback)
```sh
curl -sS -X POST "https://<service-base-url>/callback" \
  -H "Content-Type: application/json" \
  -d '<callback_payload_json>'
```

---

## IPV stub: start journey (curl)
Some environments provide an IPV stub `/start` endpoint which returns an `AuthorizeLocation` used to enter the F2F journey.

> [!NOTE]
> The `/start` endpoint belongs to the IPV stub service, not this repository. It is included here as a convenience for manual end-to-end testing.

> [!IMPORTANT]
> Do not add real internal environment hostnames to this public repo. Use placeholders and refer to internal documentation for current URLs.

```sh
curl --location --request POST "https://<ipv-stub-host>/start" \
  --header "Cookie: lng=en" \
  --data "" | grep -o '"AuthorizeLocation":"[^"]*' | cut -d'"' -f4
```

---

## Async processing
- `POST /callback` uses API Gateway → queue integration (see `deploy/f2f-spec.yaml`) to accept asynchronous notifications from Yoti.
- A queue consumer triggers a Step Function workflow (`src/stepFunctions/yotiCallback.asl.json`) which routes notifications to handler Lambdas.
- Notifications drive downstream processing such as session completion handling and user communications (e.g. instruction/thank-you emails).
- Notification handling may trigger Notify comms and publish messages to downstream queues (see `deploy/template.yaml`).

---

## Integrations
- **Yoti:** asynchronous callback via `/callback` and session retrieval/processing in `src/`.
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

This repo does not include the pipeline configuration; follow your internal platform/pipeline documentation for triggers, approvals, and status.

Local / ephemeral stack deployment in Dev (exceptional):
```sh
cd ./deploy
sam build --parallel
sam deploy --resolve-s3 --stack-name "YOUR_STACK_NAME" --confirm-changeset --config-env dev --parameter-overrides \
  "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"infra-l2-dynamo\" L2KMSStackName=\"infra-l2-kms\" PowertoolsLogLevel=\"DEBUG\""
```

---

## Further documentation
- API contract: `deploy/f2f-spec.yaml`
- Architecture decisions: `adr/`
- Internal (requires access): Confluence — “F2F CRI Guide”

---

## Code owners
A `CODEOWNERS` file exists at repo root and PRs require review by code owners.

---

## Pre-commit checks
This repo uses pre-commit via `.pre-commit-config.yaml`.

Install and enable:
```sh
pre-commit install
```

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
  - Bearer token: `Authorization: bearer <access_token>`

chrome error responses:
- When recieveing a (`"chrome-error:chromewebdata/“`) error when expecting (`https://www.gov.uk/`)
  - Turn off VPN and re-run
  - Clear browser cache
  - Change search engine to firefox/ internet explorer and re-run
