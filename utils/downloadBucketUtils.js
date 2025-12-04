import fs from "fs";
import path from "path";
import { getFileById } from "../models/fileModel.js";
import { createDownloadToken } from "../utils/downloadToken.js";
import dotenv from "dotenv"

dotenv.config();



const BASE_URL = process.env.BASE_DOWNLOAD_URL || "http://192.168.0.27:8000"; // configure in env

const EXP = process.env.DOWNLOAD_TOKEN_EXPIRY || 60*60;
export async function downloadLocalBucket(fileId, bucket, downloadFlag = "false") {
  try {
    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) throw new Error("File not found or expire.");

    if (fileRecord.blocked === "true") {
      throw new Error("File is expire and cannot be downloaded.");
    }

    const baseDir = process.env.BASE_STORAGE_PATH || process.cwd(); 
    const filePath = path.join(baseDir, fileRecord.relative_path);
   
    

    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist on server.");
    }

    const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'cvbnm,defrtgyui';
    if (!secret) throw new Error("Server misconfigured: DOWNLOAD_TOKEN_SECRET missing");

    const token = createDownloadToken(
      secret,
      fileRecord.id || fileId,
      EXP,
      fileRecord.bucket
    );

    return {
      success: true,
      message: "File download URL generated successfully.",
      data: {
        file_name: fileRecord.file_name,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        download_url: `${BASE_URL}/download/${token}?download=${downloadFlag}`
      },
    };
  } catch (err) {
    console.error("Download error:", err.message);
    return { success: false, error: err.message };
  }
}


