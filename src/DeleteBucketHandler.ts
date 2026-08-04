import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { DeleteBucketProcessor } from "./services/DeleteBucketProcessor";

export class DeleteBucketHandler implements LambdaInterface {
  async handler(event: any): Promise<any> {
      await DeleteBucketProcessor.getInstance().processRequest(event);
  }
}

const handlerClass = new DeleteBucketHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
