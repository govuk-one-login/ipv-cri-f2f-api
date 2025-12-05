export const VALID_DELETE_REQUEST = {
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

export const VALID_CREATE_REQUEST = {
  RequestType: 'Create',
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

export const VALID_UPDATE_REQUEST = {
  RequestType: 'Update',
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