import { Template } from '@aws-cdk/assertions';
const { schema } = require('yaml-cfn');
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

let template: Template;

beforeAll(() => {
  let yamlTemplate: any = load(readFileSync('./template.yaml', 'utf-8'), { schema: schema })
  template = Template.fromJSON(yamlTemplate)
})

it("should define 2 KMS keys", async () => {
  template.resourceCountIs('AWS::KMS::Key', 2)
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
