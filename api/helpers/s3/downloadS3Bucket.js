import { getFileById } from "../../models/fileModel.js";
import { generateDownloadResponse } from "../downloadHelpers.js";

export async function downloadS3Bucket({
  fileId,
  bucket,
  s3Config,
  downloadFlag = "false",
  exp,
} = {}) {
  try {
    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) throw new Error("File not found.");
    if (fileRecord.blocked === "true") {
      throw new Error("File is blocked and cannot be downloaded.");
    }

    return await generateDownloadResponse(fileRecord, downloadFlag);
  } catch (err) {
    console.error("downloadS3Bucket error:", err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}