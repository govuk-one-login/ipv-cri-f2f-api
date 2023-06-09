import {SQSBatchItemFailure} from "aws-lambda";

export class SqsBatchResponseHelper {
  constructor(
    public batchItemFailures: SQSBatchItemFailure[],
  ) {
  }
}

export const failEntireBatch: SqsBatchResponseHelper = {
  batchItemFailures: [
    {
      itemIdentifier: "",
    },
  ],
};

export const passEntireBatch: SqsBatchResponseHelper = {
  batchItemFailures: [
  ],
};
