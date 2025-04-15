import { Template } from 'aws-cdk-lib/assertions';
const { schema } = require('yaml-cfn');
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

let template: Template;

beforeAll(() => {
  let yamlTemplate: any = load(readFileSync('../template.yaml', 'utf-8'), { schema: schema })
  template = Template.fromJSON(yamlTemplate)
})

it("should define 2 DynamoDB tables", async () => {
  template.resourceCountIs('AWS::DynamoDB::Table', 2)
})

it("each table should have an explicit DeletionPolicy", async () => {
  const tables = template.findResources('AWS::DynamoDB::Table')
  Object.keys(tables).forEach(table => {
    expect(tables[table].DeletionPolicy).toBeDefined()
  })
})

it("each table should have an explicit UpdateReplacePolicy", async () => {
  const tables = template.findResources('AWS::DynamoDB::Table')
  Object.keys(tables).forEach(table => {
    expect(tables[table].UpdateReplacePolicy).toBeDefined()
  })
})

it("each table should reference a KMS key for encryption", async() => {
  const tables = template.findResources('AWS::DynamoDB::Table')
  const keys = template.findResources('AWS::KMS::Key')
  Object.keys(tables).forEach(table => {
    expect(tables[table].Properties.SSESpecification).toBeDefined()
    expect(tables[table].Properties.SSESpecification.KMSMasterKeyId).toBeDefined()
    expect(tables[table].Properties.SSESpecification.KMSMasterKeyId.Ref).toBeDefined()
    const keyRef = tables[table].Properties.SSESpecification.KMSMasterKeyId.Ref
    expect(keys[keyRef]).toBeDefined()
  })
})

it("each KMS key should have an alias", async () => {
  const keys = template.findResources('AWS::KMS::Key')
  Object.keys(keys).forEach(key => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      TargetKeyId: {
        Ref: key,
      },
    })
  })
})
