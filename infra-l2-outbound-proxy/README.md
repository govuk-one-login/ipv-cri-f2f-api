# di-ipv-dca-infra
DCMAW Platform ReadID

## Pipeline status
[![Platform Build - Post-merge](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/platform-post-merge.yml/badge.svg)](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/platform-post-merge.yml)
[![Mock Deploy](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/mocks.yml/badge.svg)](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/mocks.yml)
[![Platform-Readid - BUILD DEPLOY](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/build-platform-readid.yml/badge.svg)](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/build-platform-readid.yml)
## Developing an HTTP API as a proxy for outbound services integrated with F2F

This HTTP proxy integration will enable us to connect an API route to outbound integrated services within F2F - currently these are Yoti, Gov.Notify and the Post Office.

1. The client submits a request to the new endpoint, routed to the new API Gateway.

2. The API Gateway forwards the request to the publicly accessible third-party endpoint.

3. The API Gateway forwards the response back to the client.

After deploy, the proxy will be available on a custom URL in non dev, as https://readid.review-b.${env}.account.gov.uk (except dropping the env in prod).

### How to deploy ###
Before you deploy the proxy you will need to login to the GDS's VPN and AWS account:
```
aws-vault exec <aws-profile-name>
```

To deploy to development environment you need to run the following command:
```
cd platform-readid
sam build
sam deploy --stack-name infra-l2-outbound-proxy --parameter-overrides Environment=dev  --confirm-changeset
```
