import { Template, Match } from "aws-cdk-lib/assertions";
const { schema } = require("yaml-cfn");
import { readFileSync } from "fs";
import { load } from "js-yaml";

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

let template: Template;

describe("Infra", () => {
  beforeAll(() => {
    const yamltemplate: any = load(
      readFileSync("../deploy/template.yaml", "utf-8"),
      { schema },
    );
    delete yamltemplate.Resources.F2FRestApi.Properties.DefinitionBody; // To be removed, not SAM compatible.
    template = Template.fromJSON(yamltemplate);
  });

  it.skip("Should define a DefinitionBody as part of the serverless::api", () => {
    // N.B this only passes as we currently delete it on line 14 in the test setup step.
    template.hasResourceProperties("AWS::Serverless::Api", {
      DefinitionBody: Match.anyValue(),
    });
  });

  it.skip("API specification in the spec folder should match the DefinitionBody", () => {
    const api_definition: any = load(
      readFileSync("../deploy/spec/private-api.yaml", "utf-8"),
      { schema },
    );
    template.hasResourceProperties("AWS::Serverless::Api", {
      DefinitionBody: Match.objectEquals(api_definition),
    });
  });

  it.skip("Should not define a Events section as part of the serverless::function", () => {
    // N.B this only passes as we currently delete it on line 14 in the test setup step.
    template.hasResourceProperties("AWS::Serverless::Function", {
      Events: Match.absent(),
    });
  });

  it("The template contains one API gateway resource", () => {
    template.resourceCountIs("AWS::Serverless::Api", 1);
  });

  it("Each API Gateway should have TracingEnabled", () => {
    const apiGateways = template.findResources("AWS::Serverless::Api");
    const apiGatewayList = Object.keys(apiGateways);
    apiGatewayList.forEach((apiGatewayId) => {
      expect(apiGateways[apiGatewayId].Properties.TracingEnabled).toEqual(true);
    });
  });

  it("Each API Gateway should have MethodSettings defined", () => {
    const apiGateways = template.findResources("AWS::Serverless::Api");
    const apiGatewayList = Object.keys(apiGateways);
    apiGatewayList.forEach((apiGatewayId) => {
      expect(apiGateways[apiGatewayId].Properties.MethodSettings).toBeTruthy();
    });
  });

  it("There are 20 lambdas defined, all with at least one specific permission:", () => {
    const lambdaCount = 20;
    const lambdaPermissionCount = 23;
    template.resourceCountIs("AWS::Serverless::Function", lambdaCount);
    template.resourceCountIs("AWS::Lambda::Permission", lambdaPermissionCount);
    expect(lambdaPermissionCount > lambdaCount);
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
      // These are functions we know are broken, but have to skip for now.
      // They should be resolved and removed from this list ASAP.
      const functionName = lambdas[lambda].Properties.FunctionName["Fn::Sub"];
      console.log(functionName);
      const expectedLogName = {
        "Fn::Sub": `/aws/lambda/${functionName}`,
      };
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: Match.objectLike(expectedLogName),
      });
    });
  });

  it("Each log group defined must have a retention period", () => {
    const logGroups = template.findResources("AWS::Logs::LogGroup");
    const logGroupList = Object.keys(logGroups);
    logGroupList.forEach((logGroup) => {
      expect(logGroups[logGroup].Properties.RetentionInDays).toBeTruthy();
    });
  });

  it("Each regional API Gateway should have at least one custom domain base path mapping name defined", () => {
    const gateways = template.findResources("AWS::Serverless::Api");
    const gatewayList = Object.keys(gateways);
    gatewayList.forEach((gateway) => {
      template.hasResourceProperties("AWS::ApiGateway::BasePathMapping", {
        RestApiId: {
          Ref: gateway,
        },
      });
    });
  });

  it.skip("Each custom domain referenced in a BasePathMapping should be defined", () => {
    const basePathMappings = template.findResources(
      "AWS::ApiGateway::BasePathMapping",
    );
    const basePathMappingList = Object.keys(basePathMappings);
    basePathMappingList.forEach((basePathMapping) => {
      template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: basePathMappings[basePathMapping].Properties.DomainName,
      });
    });
  });

  it.skip("should define a DNS record for each custom domain", () => {
    const customDomainNames = template.findResources(
      "AWS::ApiGateway::DomainName",
    );
    const customDomainNameList = Object.keys(customDomainNames);
    customDomainNameList.forEach((customDomainName) => {
      template.hasResourceProperties("AWS::Route53::RecordSet", {
        Name: customDomainNames[customDomainName].Properties.DomainName,
      });
    });
  });

  it("should define an output with the API Gateway ID", () => {
    template.hasOutput("F2FApiGatewayId", {
      Value: {
        "Fn::Sub": "${F2FRestApi}",
      },
    });
  });

  it("should define an output with the F2F Backend URL using the custom domain name", () => {
    template.hasOutput("F2FBackendURL", {
      Value: {
        "Fn::Sub": [
          "https://${CustomDomainName}",
          {
            CustomDomainName: {
              Ref: "F2FApiCustomDomainName",
            },
          },
        ],
      },
    });
  });

  it("should define CloudWatch alarms", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		expect(Object.keys(alarms).length).toBeGreaterThan(0);
	});

	it("Each CloudWatch alarm should have an AlarmName defined", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);
		alarmList.forEach((alarmId) => {
			expect(alarms[alarmId].Properties.AlarmName).toBeTruthy();
		});
	});

	it("Each CloudWatch alarm should have Metrics defined if TreatMissingData is not 'notBreaching'", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);

		alarmList.forEach((alarmId) => {
			const properties = alarms[alarmId].Properties;
			if (properties.TreatMissingData !== "notBreaching") {
				expect(properties.Metrics).toBeTruthy();
			}
		});
	});

	it("Each CloudWatch alarm should have a ComparisonOperator defined", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);
		alarmList.forEach((alarmId) => {
			expect(alarms[alarmId].Properties.ComparisonOperator).toBeTruthy();
		});
	});

	it("Each CloudWatch alarm should have a Threshold defined", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);
		alarmList.forEach((alarmId) => {
			expect(alarms[alarmId].Properties.Threshold).toBeTruthy();
		});
	});

	it("Each CloudWatch alarm should have an EvaluationPeriods defined", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);
		alarmList.forEach((alarmId) => {
			expect(alarms[alarmId].Properties.EvaluationPeriods).toBeTruthy();
		});
	});

	it("Each CloudWatch alarm should have an AlarmActions defined", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);
		alarmList.forEach((alarmId) => {
			expect(alarms[alarmId].Properties.AlarmActions).toBeTruthy();
		});
	});

	it("Each CloudWatch alarm should have OKActions defined", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		const alarmList = Object.keys(alarms);
		alarmList.forEach((alarmId) => {
			expect(alarms[alarmId].Properties.OKActions).toBeTruthy();
		});
	});


	it("All CloudWatch alarms should have InsufficientDataActions and DatapointsToAlarm if TreatMissingData is not 'notBreaching'", () => {
		const alarms = template.findResources("AWS::CloudWatch::Alarm");
		Object.keys(alarms).forEach((alarmKey) => {
			const alarm = alarms[alarmKey];
			if (alarm.Properties.TreatMissingData !== "notBreaching") {
				expect(alarm.Properties.InsufficientDataActions).toBeDefined();
				expect(alarm.Properties.DatapointsToAlarm).toBeDefined();
			}
		});
	});

  describe("Log group retention", () => {
    it.each`
      environment      | retention
      ${"dev"}         | ${30}
      ${"build"}       | ${30}
      ${"staging"}     | ${30}
      ${"integration"} | ${30}
      ${"production"}  | ${30}
    `(
      "Log group retention period for $environment has correct value in mappings",
      ({ environment, retention }) => {
        const mappings = template.findMappings("EnvironmentConfiguration");
        expect(
          mappings.EnvironmentConfiguration[environment].logretentionindays,
        ).toBe(retention);
      },
    );
  });
});
