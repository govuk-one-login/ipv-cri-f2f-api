import { mock } from "vitest-mock-extended";
import { lambdaHandler } from "../../DeleteBucketHandler";
import { DeleteBucketProcessor } from "../../services/DeleteBucketProcessor";
import { VALID_DELETE_REQUEST } from "./data/delete-bucket-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";

const mockDeleteBucketProcessor = mock<DeleteBucketProcessor>();

describe("DeleteBucketHandler", () => {
    it("calls DeleteBucketProcessor", async () => {
            DeleteBucketProcessor.getInstance = vi.fn().mockReturnValue(mockDeleteBucketProcessor);
            mockDeleteBucketProcessor.processRequest.mockResolvedValueOnce({ statusCode: HttpCodesEnum.OK, body: "Bucket deleted" })
            await lambdaHandler(VALID_DELETE_REQUEST);
            expect(mockDeleteBucketProcessor.processRequest).toHaveBeenCalledTimes(1);
        });
});