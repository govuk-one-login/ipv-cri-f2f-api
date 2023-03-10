import { Template } from '@aws-cdk/assertions';
const { schema } = require('yaml-cfn');
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { expect, it, beforeAll} from '@jest/globals';

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

let template: Template;

beforeAll(() => {
    let yamltemplate: any = load(readFileSync('template.yaml', 'utf-8'), { schema: schema })
    template = Template.fromJSON(yamltemplate)
}) 

it("The template contains one WAFACL Resource", () => {
    template.resourceCountIs('AWS::WAFv2::WebACL', 1)
})

it("The Override Action should be set to None on all ManagedRules", () => {
    let Waf = template.findResources('AWS::WAFv2::WebACL')
    let ruleList = Waf.webAcl.Properties.Rules
    const WafRulesList = Object.keys(ruleList)
    WafRulesList.forEach(wafRule => {
        // If using a ManagedRuleGroup, ensure that the default action is not overridden, but OverrideAction must be specified.
        if (ruleList[wafRule].Statement.ManagedRuleGroupStatement) {
            expect(ruleList[wafRule].OverrideAction).toStrictEqual({None: {}})
        }
        // If not using a ManagdRuleGroup, ensure that an action is set.
        else {
            expect(ruleList[wafRule].Action).toBeTruthy()
        }
    })

})

it("Ensure the Log4J bad inputs are blocked", () => {
    let Waf = template.findResources('AWS::WAFv2::WebACL')
    let ruleList = Waf.webAcl.Properties.Rules
    let badInputs = ruleList.find(object => object.Name =='Bad-Inputs')
    expect(badInputs.Statement.ManagedRuleGroupStatement.Name).toBe('AWSManagedRulesKnownBadInputsRuleSet')
    var log4jRule = [{ Name: "Log4JRCE"}]
    expect(badInputs.Statement.ManagedRuleGroupStatement.ExcludedRules).toEqual(
        expect.not.arrayContaining(log4jRule)
    );

})