# infra-l2-outbound-proxy

F2F Outbound Proxy API Gateway definition

## Pipeline status

[![Deploy to Dev](https://github.com/alphagov/di-ipv-cri-f2f-api/actions/workflows/post-merge-outbound-proxy-to-dev.yml/badge.svg)](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/post-merge-outbound-proxy-to-dev.yml)
[![Deploy to Build](https://github.com/alphagov/di-ipv-cri-f2f-api/actions/workflows/post-merge-outbound-proxy-to-build.yml/badge.svg)](https://github.com/alphagov/di-ipv-dca-infra/actions/workflows/post-merge-outbound-proxy-to-build.yml)

## Developing an HTTP API as a proxy for outbound services integrated with F2F

This HTTP proxy integration will enable us to connect an API route to outbound integrated services within F2F - currently these are Yoti, Gov.Notify and the Post Office.

1. The client submits a request to the new endpoint, routed to the new API Gateway.

2. The API Gateway forwards the request to the publicly accessible third-party endpoint.

3. The API Gateway forwards the response back to the client.

After deploy, the proxy will be available on a custom URL in non dev, as https://proxy.${env}.account.gov.uk (except dropping the env in prod).

### How to deploy ###

Before you deploy the proxy you will need to login to the GDS's VPN and AWS account:

```
aws-vault exec <aws-profile-name>
```

To deploy to development environment you need to run the following command:

```
cd infra-l2-outbound-proxy
sam build
sam deploy --stack-name infra-l2-outbound-proxy --parameter-overrides Environment=dev  --confirm-changeset
```
