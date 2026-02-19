# Face to Face (F2F) CRI service

This repository contains the F2F API, an IPV stub for end-to-end testing, and a test harness.

The F2F API is deployed to AWS as Node.js Lambda functions via AWS SAM (see `deploy/template.yaml`). API contract is `deploy/f2f-spec.yaml` (OpenAPI 3.0.1).

> [!IMPORTANT]
> This repository is **public**. Do **not** commit secrets, credentials, internal URLs, account identifiers, template IDs, or sensitive configuration values. Document **names** and **purposes** only. Use placeholders in examples.

---

## Table of contents
- [Quick links](#quick-links)
- [What this service does](#what-this-service-does)
- [Repository layout](#repository-layout)
- [API surface](#api-surface)
- [Getting started](#getting-started)
- [Environment file (.env)](#environment-file-env)
- [Local test before Deployment](#local-test-before-deployment)
- [Deployment](#deployment)
- [Running tests](#running-tests)
- [Authentication and required headers](#authentication-and-required-headers)
- [Curl examples](#curl-examples)
- [IPV stub: start journey](#ipv-stub-start-journey)
- [Integrations](#integrations)
- [Code owners](#code-owners)
- [Pre-commit checks](#pre-commit-checks)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Licence](#licence)
- [Quality Gate Tags](#quality-gate-tags)

---

## Quick links
- **API contract:** `deploy/f2f-spec.yaml`
- **SAM template:** `deploy/template.yaml`
- **SAM config:** `deploy/samconfig.toml`
- **GOV.UK Notify templates:** `gov-notify-templates/` *(currently deprecated; see below)*
- **Architecture decisions (ADRs):** `adr/`

---

## What this service does
F2F supports the asynchronous "Face to Face" in-person part of the One Login IPV journey

At a high level it:
- Provides session management and configuration for the F2F frontend, and returns encrypted person information for **pre-population** and for constructing the **Yoti payload**, where supported.
- Integrates with Yoti for in-branch verification **initiation/submission** and session results.
- Is secured using the Oauth 2 code flow. Surfacing endpoints:
  - `GET /authorization` issues an authorization code for a session.
  - `POST /token` exchanges an authorization code for a Bearer access token (`application/x-www-form-urlencoded`).
- Sends user communications via GOV.UK Notify (email and, where configured, letters).
- Receives asynchronous notifications via `POST /callback`.

> [!TIP]
> The **spec is the source of truth**. Use `deploy/f2f-spec.yaml` for request/response shapes, headers, and per-endpoint requirements.

---

## Repository layout
- `deploy/` – SAM template, OpenAPI spec, and deployment config
- `adr/` – architecture decision records (ADRs)
- `src/` – Lambda handlers and shared code
- `gov-notify-templates/` – Notify templates used by the service *(currently deprecated; see Integrations)*
- `test-harness/`, `traffic-tests/` – utilised in tests to query the database and assert against SQS audit events
- `*stub*/` – local/vendor stubs (for example, Yoti, Post Office, Notify)

---

## API surface

> [!TIP]
> For request/response shapes and required headers per endpoint, use `deploy/f2f-spec.yaml` as the source of truth.

| Path | Method | Summary |
|---|---:|---|
| `/session` | POST | Validate incoming request and create/return session material |
| `/sessionConfiguration` | GET | Return session configuration used by the frontend |
| `/person-info` | GET | Return encrypted person info for FE prepopulation |
| `/person-info-key` | GET | Return key material required to decrypt `/person-info` |
| `/addressLocations` | POST | Address lookup (postcode/address search) |
| `/documentSelection` | POST | Persist user selections and initiate Yoti session |
| `/authorization` | GET | Issue an authorization code for the session |
| `/token` | POST | Exchange authorization code for a Bearer access token (`application/x-www-form-urlencoded`) |
| `/userinfo` | POST | Return pending/final response (Bearer token required; see spec) |
| `/callback` | POST | Receive Yoti notifications (asynchronous callback) |
| `/abort` | POST | Terminate the user session in a failed state |
| `/.well-known/jwks.json` | GET | Publish service JWKS (see spec/template) |

---

## Getting started

Prerequisites:
- Node.js version per `src/package.json` (`engines.node`) for local development
- AWS Lambda runtime: nodejs20.x (see `deploy/template.yaml`)
- npm
- AWS credentials (only required to run tests against a deployed stack)

Common local dev commands are defined in `src/package.json` under `scripts`. A typical workflow is:

```sh
cd src
npm ci
npm run compile
npm run lint
npm run test:unit
```

> [!NOTE]
> This repo does not document a supported sam local start-api workflow. Integration tests are designed to run against a deployed stack.

---

## Environment file (.env)
`src/.env.example` is the source of truth for required environment variables.  
If a new variable is introduced, update `.env.example` accordingly.

```sh
cd src
cp .env.example .env
```

> [!IMPORTANT]
> Do not commit `.env` or any real secrets to this public repo.

---

## Local test before Deployment

Prior to deploying code it is important to locally test your changes to ensure testing resource best practices.

### Unit tests
```sh
cd src
npm run test:unit
```

### Lint and compile tests
Run from `src/`:

```sh
cd src
npm run compile
npm run lint
```

---

## Deployment
Deployment definition/config:
- `deploy/template.yaml`
- `deploy/samconfig.toml`

The standard deployment route is via the CI/CD pipeline for this repository. Local SAM deployments is the primary way of local testing.

> [!NOTE]
> Parameter overrides and environment-specific deployment values are intentionally not documented here (public repo hygiene). Use your organisation’s internal runbooks for environment-specific instructions.

### Dev and personal stack naming
Deploy with a custom stack name (include your initials) to avoid overwriting shared stacks (for example `f2f-cri-api-<initials>`).

Set the stack name in `deploy/samconfig.toml`, or provide it explicitly via `sam deploy --stack-name`.

Example (dev/personal stack):

```sh
cd deploy
sam build --parallel
sam deploy --resolve-s3 --stack-name "f2f-cri-api-xy" --confirm-changeset --config-env dev
```
> (Use initials + placeholders, no real env values.)

After deploying, update the test harness SAM config in `test-harness/deploy/samconfig.toml` (if used) to reference the custom API stack name so the harness targets the correct stack.

### Local and ephemeral deployment (exceptional)
```sh
cd deploy
sam build --parallel
sam deploy --resolve-s3 --stack-name "YOUR_STACK_NAME" --confirm-changeset --config-env dev
```

---

## Running tests
All scripts are defined in `src/package.json`.

### Unit tests
```sh
cd src
npm run test:unit
```

### API tests
```sh
cd src
npm run test:api
```

### E2E tests
```sh
cd src
npm run test:e2e
```

### Infra tests
```sh
cd src
npm run test:infra
```

### Log and PII checks
```sh
cd src
npm run test:pii
```

### Contract (Pact) tests
This repo includes provider verification tests that validate the provider against a published Pact and (in CI) publish results to the Pact Broker. See `src/package.json` scripts for the exact workflows.

> [!IMPORTANT]
> Keep broker credentials and broker URLs out of this public repo. Document names only and use placeholders in examples.

#### Environment variables (names only)
- `PACT_BROKER_USER`
- `PACT_BROKER_PASSWORD`
- `PACT_BROKER_URL`
- `PACT_PROVIDER_NAME`
- `PACT_PROVIDER_VERSION`

#### Run contract tests (local / CI-style)
```sh
cd src
npm run test:contract:ci
```

> [!CAUTION]
> These runners may write AWS credential environment variables into temporary files and may write stack outputs to files (for example `cf-output.txt`). Ensure these generated files are not committed.

---

## Authentication and required headers
Per `deploy/f2f-spec.yaml`, endpoints typically rely on a combination of:
- Session headers (for example `session-id` and/or `x-govuk-signin-session-id` depending on the endpoint)
- Bearer access token for protected endpoints:

```
Authorization: Bearer <token>
```

> [!TIP]
> Confirm exact header names and `required: true` flags in `deploy/f2f-spec.yaml` under each path’s `parameters:` section.

---

## Curl examples
Please refer to `f2f-ipv-stub/README.md` for specific curl commands.

---

## IPV stub: start journey
Some deployments use an IPV stub `/start` endpoint which returns an AuthorizeLocation used to enter the F2F journey.

For IPV stub usage including the `/start` endpoint, see the [IPV stub README](f2f-ipv-stub/README.md).

---

## Integrations
Yoti: third-party identity verification provider; in-branch initiation/submission and asynchronous callback via /callback.

GOV.UK Notify: templates in gov-notify-templates/ (currently deprecated/unmaintained in-repo; we plan to revisit. Treat as non-authoritative until updated.)

> [!IMPORTANT]
> Do not add Notify API keys, template IDs, internal URLs, or real customer examples to this repo.

---

## Code owners
This repo has a `CODEOWNERS` file in the root and is configured to require PRs to reviewed by Code Owners.

---

## Pre-commit checks
This repo uses pre-commit configuration:
- `.pre-commit-config.yaml`
- `.secrets.baseline`

Install hooks:

```sh
pre-commit install
```

Run hooks manually (optional):

```sh
pre-commit run --all-files
```

---

## Security
To check active vulnerabilities on this repository perform the following:

```sh
git pull
```

```sh
npm audit
```
Based on the alerts returned flag any to the team reported as 'high' or 'critical'.

Utilise descriptions preovided from audit result to directly update the vulnerable package or for transitive, the vulnerable parent version - rerunning to ensure it is no longer pulling the vulnerability.

To ensure the `package.json` and `package-lock.json` are aligned after updates ensure you have installed the fixed versions then run:

```sh
rm -rf node_modules package-lock.json
```
then re-install

---

## Troubleshooting
### Tests won't run
Ensure AWS credentials exist in your environment (CloudFormation outputs are queried).

### “Lint” or “compile” failures
Run from `src/`:

```sh
npm ci
npm run compile
npm run lint
```

### Tests failing unexpectedly
Run the relevant suite explicitly:

```sh
cd src
npm run test:unit
npm run test:api
npm run test:infra
npm run test:e2e
```
### Multiple Axios failures
Check .env varibales using `run-tests.sh` as source of truth for required parameters

### Contract tests won’t start
Ensure required Pact environment variables are set (names listed above) and required ports used by local test tooling are available. See scripts under `src/tests/contract/`.

## Licence
If you need reuse/distribution terms, consult the `LICENCE`file's guidance before redistributing.

### Quality Gate Tags

All API tests should be tagged with `//QualityGateIntegrationTest`, `//QualityGateRegressionTest`
and `//QualityGateStackTest`