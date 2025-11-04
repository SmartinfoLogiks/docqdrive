// utils/downloadHandler.js
import fs from "fs";
import path from "path";
import { verifyDownloadToken } from "./downloadToken.js";
import { getFileById } from "../models/fileModel.js";

/**
 * Handles secure file download logic.
 * @param {string} token - Signed download token
 * @param {object} res - Express response (used for res.download)
 */
export async function handleSecureDownload(token, res) {
  try {
    const secret = process.env.DOWNLOAD_TOKEN_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "Server misconfigured" });
    }

    // 1. Verify token → get payload
    let payload;
    try {
      payload = verifyDownloadToken(secret, token);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const { id: fileId, bucket } = payload;

    // 2. Fetch file metadata
    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) return res.status(404).json({ success: false, error: "File not found" });

    if (fileRecord.blocked === "true") {
      return res.status(403).json({ success: false, error: "File is blocked" });
    }

    // 3. Verify file existence
    const filePath = path.join(process.cwd(), fileRecord.relative_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File missing on server" });
    }

    // 4. Stream file (download)
    return res.download(filePath, fileRecord.file_name, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: "Failed to download file" });
        } else {
          res.end();
        }
      }
    });
  } catch (err) {
    console.error("Unexpected error in download handler:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
