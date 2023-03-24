# IPV Stub
If there are requirements for data contract changes between IPV Core and CRIs, then please do not use the default stack to build and deploy and instead use a different stack with
similar naming convention - i.e 
``` bash
sam build && sam deploy --stack-name f2f-ipv-stub-<YOUR_IDENTIFIER> --resolve-s3 
```

## Setup notes
If modifications are made to the test client and a new stack is being used, remember to update the API configuration to use your custom stack.


To fetch an ssm parameter created from this stack, use the `get-ssm-test-params.sh` by passing in the key for the ssm parameter.