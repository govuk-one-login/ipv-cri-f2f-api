# IPV Stub

If there are requirements for data contract changes between IPV Core and CRIs, then please do not use the default stack to build and deploy and instead use a different stack with similar naming convention - i.e 

``` bash
sam build && sam deploy --stack-name f2f-ipv-stub-<YOUR_IDENTIFIER> --resolve-s3 
```

## Setup notes
If modifications are made to the stub and a new stack is being used, remember to update the API configuration to point your custom stack. i.e 
``` bash
sam deploy --capabilities CAPABILITY_NAMED_IAM --resolve-s3 --stack-name "<YOUR_IDENTIFIER>-f2f-cri-api" --confirm-changeset --config-env dev --parameter-overrides \  "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"f2f-cri-ddb\" L2KMSStackName=\"f2f-cri-kms\" PowertoolsLogLevel=\"INFO\" IPVStubStackName=\"jb-f2f-ipv-stub\""
```

## Interface

When you deploy this stack you will have access to 3 endpoints.

### Start
To start a session use the start endpoint:
```http 
POST https://ipvstub.review-o.build.account.gov.uk/start
Content-Type: application/json

{
    "clientId": "<OPTIONAL_CLIENT_ID>",
    "gov_uk_signin_journey_id": "<OPTIONAL_UNIQUE_IDENTIFIER>",
    "shared_claims": "<OPTIONAL_SHARED_CLAIMS>",
    "frontendURL": "<OPTIONAL_FRONTEND_URL>"
}
```
### Callback
The callback endpoint is the intended recipient of the consumer of the Authorization flow.
It will then simulate IPV Core using the auth code to make subsequent calls to the /token and /userinfo endpoints.
It will then return a `200` response with the VC provided the CRI was able to issue one successfully.

```http 
POST https://ipvstub.review-o.build.account.gov.uk/callback?code=ACBCADD6-10A4-49AC-B3F9-6DBC18B79B02&state=DC19A346249E679B02
Content-Type: application/json

```

### JWKs
To enable the authorization code flow to complete successfully the CRI must be able to read the public encryption key of the stub. These are made available on the stubs well-known endpoint:

```http
GET https://ipvstub.review-o.build.account.gov.uk/.well-known/jwks.json
Accept: application/json
```

## Using the stub.

### local

#### start a session using the stub

``` bash
curl -v -XPOST -H "Content-type: application/json" -d '{
    "frontendURL": "http://localhost:5030",
    "shared_claims": {
        "name": [
            {
                "nameParts": [
                    {
                        "value": "Kenneth",
                        "type": "GivenName"
                    },
                    {
                        "value": "Decerqueira",
                        "type": "FamilyName"
                    }
                ]
            }
        ],
        "birthDate": [
            {
                "value": "1965-07-08"
            }
        ],
        "emailAddress": "test@localhost.com",
        "address": [
          {
              "uprn": "123456789",
              "buildingNumber": "32",
              "buildingName": "London",
              "subBuildingName": "Flat 20",
              "streetName": "Demo",
              "addressLocality": "London",
              "addressCountry": "GB",
              "postalCode": "SW19"
          }
      ]
    }
}' 'https://f2f-ipv-stub-ipvstub.review-o.dev.account.gov.uk/start'
```

This will return 6 fields:
1. request - The JWT used for the session request
2. responseType - The type of OAuth journey being performed
3. clientId - The clientId in use (Controls whether journeys are run against UAT or stubs)
4. *AuthorizeLocation* - The frontend location to kick of the journey. Navigating here in the browser will commence the F2F journey.
5. sub - Unique identifier for the journey
6. state - State of the OAuth journey

Navigating to the AuthorizeLocation endpoint in a browser will run a journey in the F2F CRI

Journey permutations for thin file can be accessed with the following.

##### Thin file
``` bash
curl -v -XPOST -H "Content-type: application/json" -d '{
    "evidence_requested": { "strengthScore": 4 },
    "frontendURL": "http://localhost:5030",
    "shared_claims": {
        "name": [
            {
                "nameParts": [
                    {
                        "value": "Kenneth",
                        "type": "GivenName"
                    },
                    {
                        "value": "Decerqueira",
                        "type": "FamilyName"
                    }
                ]
            }
        ],
        "birthDate": [
            {
                "value": "1965-07-08"
            }
        ],
        "emailAddress": "jambentham@gmail.com",
        "address": [
          {
              "uprn": "123456789",
              "buildingNumber": "32",
              "buildingName": "London",
              "subBuildingName": "Flat 20",
              "streetName": "Demo",
              "addressLocality": "London",
              "addressCountry": "GB",
              "postalCode": "SW19"
          }
      ]
    }
}' 'https://f2f-ipv-stub-ipvstub.review-o.dev.account.gov.uk/start'
```

Additional scenarios can also be triggered by changing the name or adding the field 'yotiMockID' at the same level as evidence requested.

#### Replicate PO visit

``` bash
curl -v -XPOST -H "Content-type: application/json" -d '{"session_id": "<yoti session id>", "topic": "session_completion"}' 'https://api-f2f-cri-api.review-o.dev.account.gov.uk/callback'
```

The yoti session id can either be manually set above or retreived from the database session table. Filtering on the sub value returned by the pending VC.

#### Get VC

The F2F VC now lives on the queue and can be retrieved using the sub in the test harness. This will simulate IPV core retrieving the VC when the user returns to F2F.
(**Note due to a syntax issue this can currently only be done via the AWS console**)

1. Make a request to /bucket in the testharness like below. Note subject is returned in the pending VC when the journey was completed
``` bash
curl -v -XGET -H "Content-type: application/json" https://f2f-test-harness-testharness.review-o.dev.account.gov.uk/bucket?ipv-core/<sbject> 
```
This will return a list of enteries. The latest should be taken and will look something like
03c8c9e9-06aa-489b-a4dd-35ce0108e390-2026-01-15T16:18:34.501Z-d1df62a8-104d-469a-9b9f-847711db3caf

2. Make a request to /object in the testharness like below. Using the object from above as the identifier.
``` bash
curl -v -XGET -H "Content-type: application/json" https://f2f-test-harness-testharness.review-o.dev.account.gov.uk/bucket?ipv-core/<subject> 
```
This will return a JWT that can be decoded to inspect the VC details

### dev

#### start a session using the stub

``` bash
curl -v -XPOST -H "Content-type: application/json" -d '{
    "frontendURL": "http://localhost:5030",
    "shared_claims": {
        "name": [
            {
                "nameParts": [
                    {
                        "value": "Kenneth",
                        "type": "GivenName"
                    },
                    {
                        "value": "Decerqueira",
                        "type": "FamilyName"
                    }
                ]
            }
        ],
        "birthDate": [
            {
                "value": "1965-07-08"
            }
        ],
        "emailAddress": "test@localhost.com",
        "address": [
          {
              "uprn": "123456789",
              "buildingNumber": "32",
              "buildingName": "London",
              "subBuildingName": "Flat 20",
              "streetName": "Demo",
              "addressLocality": "London",
              "addressCountry": "GB",
              "postalCode": "SW19"
          }
      ]
    }
}' 'https://f2f-ipv-stub-ipvstub.review-o.dev.account.gov.uk/start'
```

See above - journey remains the same across all environments

#### build

``` bash
curl -v -XPOST -H "Content-type: application/json" -d '{
    "frontendURL": "http://localhost:5030",
    "shared_claims": {
        "name": [
            {
                "nameParts": [
                    {
                        "value": "Kenneth",
                        "type": "GivenName"
                    },
                    {
                        "value": "Decerqueira",
                        "type": "FamilyName"
                    }
                ]
            }
        ],
        "birthDate": [
            {
                "value": "1965-07-08"
            }
        ],
        "emailAddress": "test@localhost.com",
        "address": [
          {
              "uprn": "123456789",
              "buildingNumber": "32",
              "buildingName": "London",
              "subBuildingName": "Flat 20",
              "streetName": "Demo",
              "addressLocality": "London",
              "addressCountry": "GB",
              "postalCode": "SW19"
          }
      ]
    }
}' 'https://ipvstub.review-o.build.account.gov.uk/start'
```

See above - journey remains the same across all environments
