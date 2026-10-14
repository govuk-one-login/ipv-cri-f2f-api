import { DeleteBucketProcessor } from "../../../services/DeleteBucketProcessor";
import { VALID_DELETE_REQUEST, VALID_CREATE_REQUEST, VALID_UPDATE_REQUEST } from "../data/delete-bucket-events";
import { DeleteObjectsCommand, ListObjectVersionsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function () {
    return {
      send: mockSend,
    };
  }),
  ListObjectVersionsCommand: vi.fn(function (args) {
    return Object.setPrototypeOf(args, ListObjectVersionsCommand.prototype);
  }),
  ListObjectsV2Command: vi.fn(function (args) {
    return Object.setPrototypeOf(args, ListObjectsV2Command.prototype);
  }),
  DeleteObjectsCommand: vi.fn(function (args) {
    return Object.setPrototypeOf(args, DeleteObjectsCommand.prototype);
  })
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
      global.fetch = vi.fn().mockResolvedValue({ status: 200 });
      await deleteBucketProcessor.processRequest(VALID_DELETE_REQUEST)
      expect(deleteBucketProcessor).toBeInstanceOf(DeleteBucketProcessor);
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
      global.fetch = vi.fn().mockResolvedValue({ status: 200 });
      await deleteBucketProcessor.processRequest(VALID_DELETE_REQUEST);
      expect(deleteBucketProcessor).toBeInstanceOf(DeleteBucketProcessor);
    });

    it("throws error when sendResponse fetch request fails", async () => {
      global.fetch = vi.fn().mockRejectedValue({});
      expect(deleteBucketProcessor).toBeInstanceOf(DeleteBucketProcessor);
      await expect(deleteBucketProcessor.processRequest(VALID_DELETE_REQUEST)).rejects.toThrow();
    });

    it("returns SUCCESS when Create RequestType received", async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 200 });
      await deleteBucketProcessor.processRequest(VALID_CREATE_REQUEST)
    })

    it("returns SUCCESS when Update RequestType received", async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 200 });
      await deleteBucketProcessor.processRequest(VALID_UPDATE_REQUEST)
    })
});
