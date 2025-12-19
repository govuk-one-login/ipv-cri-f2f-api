# IPV Stub 
If there are requirements for data contract changes between IPV Core and CRIs, then please do not use the default stack to build and deploy and instead use a different stack with
similar naming convention - i.e 
``` bash
sam build && sam deploy --stack-name f2f-ipv-stub-<YOUR_IDENTIFIER> --resolve-s3 
```

## Setup notes
If modifications are made to the test client and a new stack is being used, remember to update the API configuration to use your custom stack.


To fetch an ssm parameter created from this stack, use the `get-ssm-test-params.sh` by passing in the key for the ssm parameter.

## Usage

When you deploy this stack you will have access to 3 endpoints.

To start a session use the start endpoint:
```http 
POST https://base.uri/stage/start
Content-Type: application/json

{
    "target":"<OPTIONAL_TARGET_URI>",
    "gov_uk_signin_journey_id": "<OPTIONAL_UNIQUE_IDENTIFIER>",
    "shared_claims": <OPTIONAL_SHARED_CLAIMS>
}
```

The callback endpoint is the intended recipient of the consumer of the Authorization flow.

It will return a `200` response with a message saying whether the outcome was a success or failure, i.e to return a success message it must receive and authorization code.

```http 
POST https://base.uri/stage/callback?code=ACBCADD6-10A4-49AC-B3F9-6DBC18B79B02&state=DC19A346249E679B02
Content-Type: application/json

```

To enable the authorization code flow to complete successfully the CRI must be able to read the public encryption key of the stub. These are made available on the stubs well-known endpoint:

```http
GET https://base.uri/stage/.well-known/jwks.json
Accept: application/json
```

## CURL commands to start session in dev & build environments

#### dev

curl --location --request POST 'https://f2f-ipv-stub-ipvstub.review-o.dev.account.gov.uk/start' \
--header 'Cookie: lng=en' \
--data '' | grep -o '"AuthorizeLocation":"[^"]*' | cut -d'"' -f4

#### build

curl --location --request POST 'https://ipvstub.review-o.build.account.gov.uk/start' \
--header 'Cookie: lng=en' \
--data '' | grep -o '"AuthorizeLocation":"[^"]*' | cut -d'"' -f4
