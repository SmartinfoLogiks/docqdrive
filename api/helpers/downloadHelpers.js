import { createDownloadToken } from "../utils/downloadToken.js";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.BASE_DOWNLOAD_URL || "http://localhost:8000";
const EXP = process.env.DOWNLOAD_TOKEN_EXPIRY || 60 * 60;

export async function generateDownloadResponse(fileRecord, downloadFlag = "false") {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || "cvbnm,defrtgyui";
  if (!secret) throw new Error("DOWNLOAD_TOKEN_SECRET missing");

  const token = createDownloadToken(secret, fileRecord.id, EXP, fileRecord.bucket);

  return {
    success: true,
    message: "File download URL generated successfully.",
    data: {
      file_name: fileRecord.file_name,
      mimetype: fileRecord.mimetype,
      size: fileRecord.size,
      download_url: `${BASE_URL}/download/${token}?download=${downloadFlag}`,
      encrypted: true,
    },
  };
}