import { Template, Capture, Match } from "@aws-cdk/assertions";
import path from "path";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";

describe("IPV Stub Infrastructure", () => {
  let template: Template;

  beforeAll(() => {
    const templateYaml: any = load(
      readFileSync(path.resolve("./template.yaml"), "utf-8"),
      { schema }
    );
    delete templateYaml.Resources.IPVStubApiGw.Properties.DefinitionBody; // To be removed, not SAM compatible.
    template = Template.fromJSON(templateYaml);
  });

  it("The template contains one API gateway resource", () => {
    template.resourceCountIs("AWS::ApiGateway::RestApi", 1);
  });

  it("There are 3 lambdas defined, all with a specific permission:", () => {
    const lambdaCount = 3;
    template.resourceCountIs("AWS::Serverless::Function", lambdaCount);
    template.resourceCountIs("AWS::Lambda::Permission", lambdaCount);
  });

  it("All lambdas must have a FunctionName defined", () => {
    const lambdas = template.findResources("AWS::Serverless::Function");
    const lambdaList = Object.keys(lambdas);
    lambdaList.forEach((lambda) => {
      expect(lambdas[lambda].Properties.FunctionName).toBeTruthy();
    });
  });

  it("All Lambdas must have an associated LogGroup named after their FunctionName.", () => {
    const lambdas = template.findResources("AWS::Serverless::Function");
    const lambdaList = Object.keys(lambdas);
    lambdaList.forEach((lambda) => {
      const functionName = lambdas[lambda].Properties.FunctionName[
        "Fn::Sub"
      ] as string;

      const expectedLogName = {
        "Fn::Sub": `/aws/lambda/${functionName}`,
      };

      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: Match.objectLike(expectedLogName),
      });
    });
  });

  it("All lambdas should have a FunctionName defined", () => {
    const functionNameCapture = new Capture(Match.anyValue());
    template.hasResourceProperties("AWS::Serverless::Function", {
      FunctionName: functionNameCapture,
    });
  });

  it("Each log group defined must have a retention period", () => {
    const logGroups = template.findResources("AWS::Logs::LogGroup");
    const logGroupList = Object.keys(logGroups);
    logGroupList.forEach((logGroup) => {
      expect(logGroups[logGroup].Properties.RetentionInDays).toEqual(30);
    });
  });

  it("API execute URL is in Outputs", () => {
    template.hasOutput("*", {
      Export: { Name: { "Fn::Sub": "${AWS::StackName}-IPVStubExecuteUrl" } },
      Value: {
        "Fn::Sub":
          "https://${IPVStubApiGw}.execute-api.${AWS::Region}.amazonaws.com/${Environment}/",
      },
    });
  });
});
