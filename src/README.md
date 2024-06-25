# Face-To-Face Service 

Face-To-Face Service

## How to run build

From `src` folder run `sam build` 

## How to run tests

To run all unit tests, run `npm run test:unit`. This will compile and run all the unit tests in the `/tests` directory.

To run the infra tests, run `npm run test:infra`.

## How to run contract tests

We have Provider tests which verifies the published pact file against the provider and publishes the results on the Pact Broker.
## Running Tests Locally
### Pre-requisites for running the tests locally

Connection to GDS VPN

### Set up Environment Variables
The scripts use environment variables, which need to be set up for the current terminal session.
The following environment variables are required:
- PACT_BROKER_USER
- PACT_BROKER_PASSWORD
- PACT_BROKER_URL
- PACT_PROVIDER_NAME
- PACT_PROVIDER_VERSION

Environment variables can be defined with `export [variable_name]=[variable_value]` eg `export PACT_URL=https://pactbrokerurl.com`.

Values for these can obtained from the Dev Platform team. See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3677061716/Retrieving+Pact+Broker+credentials and https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3783131729/Transferring+Pact+Broker+Credentials+Securely

### To retrieve the pact file from PactBroker and run the provider test against the pact file
Run `npm run test:contract:ci` from `src` folder<br>

- This is setup local DynamoDB with mock data.
- A connection to the pact broker will be created using `test-pact-connection.sh` script. This authorisation is cached for 30 seconds (required for GHA workflow, doesnt matter when running locally)
- Start a mock provider app locally which has routes for /token and /userinfo endpoints.
The the Verifier test will retrieve the pact file from the broker and verify the contract against the provider app api endpoints and publish the results to the broker i.e. if the expected results matched and was able to verify successfully.

### How to perform lint checks an individual test file

To check if there are any linting issues, run `npm lint`. If there are any critical errors, this command 
will fail prompting developer to fix those issues. The report will be present under `reports` folder as an
html file. Once those critical errors are fixed, re running `npm lint` should not return any errors.
In order to fix some simple formatting issues, one can run `npm lint:fix` which should fix most of those automatically.
