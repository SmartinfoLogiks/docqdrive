import fs from "fs";
import path from "path";
import mime from "mime-types";
import { verifyDownloadToken } from "./downloadToken.js";
import { getFileById } from "../models/fileModel.js";

/**
 * Handles secure file download logic.
 * @param {string} token - Signed download token
 * @param {object} res - Express response
 * @param {string} downloadFlag - "true" or "false" (from req.query.download)
 */
export async function handleSecureDownload(token, res, downloadFlag) {
  try {
    const secret = process.env.DOWNLOAD_TOKEN_SECRET || "cvbnm,defrtgyui";
    if (!secret) {
      console.error("DOWNLOAD_TOKEN_SECRET missing in environment.");
      return res.status(500).json({ success: false, error: "Server misconfigured" });
    }

    console.log("🔹 Incoming download request with token:", token);
    console.log("Requested downloadFlag:", downloadFlag);

    // 1. Verify token → get payload
    let payload;
    try {
      payload = verifyDownloadToken(secret, token);
      console.log("Token verified. Payload:", payload);
    } catch (err) {
      console.error("Token verification failed:", err.message);
      return res.status(400).json({ success: false, error: err.message });
    }

    const { id: fileId, bucket } = payload;

    // 2. Fetch file metadata
    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) {
      console.error("File metadata not found for ID:", fileId);
      return res.status(404).json({ success: false, error: "File not found" });
    }

    console.log("File record found:", {
      file_name: fileRecord.file_name,
      relative_path: fileRecord.relative_path,
      storage_type: fileRecord.storage_type,
    });

    if (fileRecord.blocked === "true") {
      console.warn("File is marked as expired:", fileRecord.file_name);
      return res.status(403).json({ success: false, error: "File is expired" });
    }

    // 3. Check physical file
    const filePath = path.join(process.cwd(), fileRecord.relative_path);
    if (!fs.existsSync(filePath)) {
      console.error("File not found on disk:", filePath);
      return res.status(404).json({ success: false, error: "File missing on server" });
    }

    const stat = fs.statSync(filePath);
    const fileName = fileRecord.file_name;

    console.log(`File exists at ${filePath} with size: ${stat.size} bytes`);

    // 4. Detect correct MIME
    const mimeType = mime.lookup(fileName) || "application/octet-stream";
    console.log("Detected MIME type:", mimeType);

    // 5. Inline or attachment?
    const disposition =
      downloadFlag === "true"
        ? `attachment; filename="${fileName}"`
        : `inline; filename="${fileName}"`;

    res.setHeader("Content-Disposition", disposition);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-transform, no-store");

    console.log(`Content-Disposition applied: ${disposition}`);
    console.log("Starting file stream...");

    // 6. Stream file
    const fileStream = fs.createReadStream(filePath);
    let bytesSent = 0;

    fileStream.on("data", chunk => {
      bytesSent += chunk.length;
    });

    fileStream.on("error", err => {
      console.error("Error streaming file:", err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: "Failed to download file" });
      }
      res.end();
    });

    fileStream.on("end", () => {
      console.log(`File download complete: ${fileName}`);
      console.log(`Bytes sent: ${bytesSent}/${stat.size}`);
      if (bytesSent !== stat.size) {
        console.warn("WARNING: Streamed bytes do not match file size!");
      }
    });

    fileStream.pipe(res);

  } catch (err) {
    console.error("Unexpected error in download handler:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
