import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../DeleteBucketHandler";
import { DeleteBucketProcessor } from "../../services/DeleteBucketProcessor";
import { VALID_DELETE_REQUEST } from "./data/delete-bucket-events";
import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";

const mockDeleteBucketProcessor = mock<DeleteBucketProcessor>();

describe("DeleteBucketHandler", () => {
    it("calls DeleteBucketProcessor", async () => {
            DeleteBucketProcessor.getInstance = jest.fn().mockReturnValue(mockDeleteBucketProcessor);
            mockDeleteBucketProcessor.processRequest.mockResolvedValueOnce({ statusCode: HttpCodesEnum.OK, body: "Bucket deleted" })
            await lambdaHandler(VALID_DELETE_REQUEST);
            expect(mockDeleteBucketProcessor.processRequest).toHaveBeenCalledTimes(1);
        });
    it("return error response when bucket deletion fails", async () => {
            DeleteBucketProcessor.getInstance = jest.fn().mockReturnValue(mockDeleteBucketProcessor);
            mockDeleteBucketProcessor.processRequest.mockRejectedValueOnce({})
            const response = await lambdaHandler({})
            expect(response).toEqual(Response(HttpCodesEnum.SERVER_ERROR, "An error has occured"))
            expect(response.statusCode).toEqual(500)
        });
});