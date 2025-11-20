import { DeleteBucketProcessor } from "../../../services/DeleteBucketProcessor";
import { VALID_REQUEST } from "../data/delete-bucket-events";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ListObjectVersionsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  ListObjectVersionsCommand: jest.fn().mockImplementation((args) => args),
  ListObjectsV2Command: jest.fn().mockImplementation((args) => args),
  DeleteObjectsCommand: jest.fn().mockImplementation((args) => args),
}));

let deleteBucketProcessor: DeleteBucketProcessor;
describe("DeleteBucketProcessor", () => {
    beforeEach(() => {
      deleteBucketProcessor = new DeleteBucketProcessor();
      mockSend.mockReset();
    });

    it("successfully empties buckets", async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListObjectsV2Command) {
          return Promise.resolve({
            Contents: [
              { Key: "remaining1.txt" },
              { Key: "remaining2.txt" },
            ],
          });
        }
      });
      global.fetch = jest.fn().mockResolvedValue({ status: 200 });
      const response = await deleteBucketProcessor.processRequest(VALID_REQUEST)
      expect(response).toEqual({ statusCode: HttpCodesEnum.OK, body: "Bucket deleted" })
    });
    
    it("successfully empties bucket versions", async () => {
      mockSend.mockImplementation((command) => {
      if (command instanceof ListObjectVersionsCommand) {
        return Promise.resolve({
          Versions: [
            { Key: "file1.txt", VersionId: "1" },
            { Key: "file2.txt", VersionId: "2" },
          ],
          DeleteMarkers: [
            { Key: "file3.txt", VersionId: "3" },
          ],
        });
      }
    });
      global.fetch = jest.fn().mockResolvedValue({ status: 200 });
      const response = await deleteBucketProcessor.processRequest(VALID_REQUEST)
      expect(response).toEqual({ statusCode: HttpCodesEnum.OK, body: "Bucket deleted" })
    });

    it("throws error when sendResponse fetch request fails", async () => {
      global.fetch = jest.fn().mockRejectedValue({});
      await expect(deleteBucketProcessor.processRequest(VALID_REQUEST)).rejects.toThrow();
    });
});