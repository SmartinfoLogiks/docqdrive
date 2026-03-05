import { getFileById } from "../../models/fileModel.js";
import { generateDownloadResponse } from "../downloadHelpers.js";
import path from "path"
import fs from "fs"

export async function downloadLocalBucket(fileId, bucket, downloadFlag = "false") {
  try {
    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) throw new Error("File not found or expired.");
    if (fileRecord.blocked === "true") {
      throw new Error("File is expired and cannot be downloaded.");
    }

    const baseDir = process.env.BASE_STORAGE_PATH || process.cwd();
    const filePath = path.join(baseDir, fileRecord.relative_path); // or import path
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist on server.");
    }

    return await generateDownloadResponse(fileRecord, downloadFlag);
  } catch (err) {
    console.error("DownloadLocal error:", err.message);
    return { success: false, error: err.message };
  }
}