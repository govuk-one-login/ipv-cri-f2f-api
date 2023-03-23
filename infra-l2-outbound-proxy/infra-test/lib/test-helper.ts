import { Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { schema } from "yaml-cfn";

export class testHelper {
  private template: Template;

  public getTemplate<T extends Template>() {
    if (this.template === null || this.template === undefined) {
      const yamltemplate: any = load(
        readFileSync("../template.yaml", "utf-8"),
        {
          schema: schema,
        }
      );
      this.template = Template.fromJSON(yamltemplate);
    }
    return this.template;
  }
}
