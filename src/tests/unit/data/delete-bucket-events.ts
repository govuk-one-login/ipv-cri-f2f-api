export const VALID_REQUEST = {
  RequestType: 'Delete',
  ServiceToken: 'test-token',
  ResponseURL: 'mockResponseURL',
  LogicalResourceId: 'EmptyJsonWebKeysBucket',
  PhysicalResourceId: 'test',
  ResourceType: 'Custom::EmptyBucket',
  ResourceProperties: {
    ServiceToken: 'test-token',
    BucketName: 'test-bucket'
  }
}