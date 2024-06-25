# Post Office Stub 
### Stub for the Post Office Location & Data Services (‘Branch Finder’) API service which mocks the Post Office POST (https://locations.pol-platform.co.uk/v1/locations/search) endpoint and responds with success or error responses.
### Returns the following HTTP response based on the last 3 characters of the postcode request payload
* No postcode suffix - Successful response
* 400 - 400 response
* 403 - 403 response
* 429 - 429 response
* 500 - 500 response
* 503 - 503 response

### See [F2F confluence page](https://govukverify.atlassian.net/wiki/spaces/FTFCRI/pages/3713859597/Post+Office+Lookup+Mock) for more info 