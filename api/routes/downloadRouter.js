// routes/download.js
import express from "express";
import fs from "fs";
import path from "path";
// import { handleSecureDownload } from "../utils/downloadHandler.js";
import { verifyDownloadToken } from "../utils/downloadToken.js";
import { getFileById } from "../models/fileModel.js";
import { getDecryptedLocalStream, getDecryptedS3Stream } from "../utils/encryptionHelpers.js";
import { createS3Client } from "../helpers/s3/s3Helpers.js";
// import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";


const router = express.Router();

// router.get("/download/:token", async (req, res) => {
//   const { token } = req.params;
//   const { download } = req.query;        // <-- flag from URL
//   console.log("token, download: ", token, download)

//   // Pass it to the handler
//   return handleSecureDownload(token, res, download);
// });

router.get("/download/:token", async (req, res) => {
  const { token } = req.params;
  const downloadFlag = req.query.download || "false";

  try {
    const secret = process.env.DOWNLOAD_TOKEN_SECRET || "cvbnm,defrtgyui";
    const payload = verifyDownloadToken(secret, token);

    const fileRecord = await getFileById(payload.id, payload.bucket);
    if (!fileRecord) throw new Error("File not found");
    if (fileRecord.blocked === "true") throw new Error("File blocked");

    res.set({
      "Content-Type": fileRecord.mimetype || "application/octet-stream",
      "Content-Disposition": downloadFlag === "true"
        ? `attachment; filename="${encodeURIComponent(fileRecord.file_name)}"`
        : `inline; filename="${encodeURIComponent(fileRecord.file_name)}"`,
    });

    if (fileRecord.storage_type === "local") {
      const baseDir = process.env.BASE_STORAGE_PATH || process.cwd();
      const cleanPath = fileRecord.relative_path.replace(/^\/+/, "");
      const filePath = path.join(baseDir, cleanPath);

      if (!fs.existsSync(filePath)) throw new Error("File missing on disk");

      const { readStream, decipher } = getDecryptedLocalStream(filePath);
      readStream.pipe(decipher).pipe(res);

    } else if (fileRecord.storage_type === "s3") {
      if (!fileRecord.s3_access_key_id) throw new Error("S3 credentials missing – re-upload the file");

      const s3Config = {
        accessKeyId: fileRecord.s3_access_key_id,
        secretAccessKey: fileRecord.s3_secret_access_key,
        region: fileRecord.s3_region,
        endpoint: fileRecord.s3_endpoint,
      };

      const s3Client = await createS3Client(s3Config);
      const objectBucket = fileRecord.bucket;
      let objectKey = (fileRecord.relative_path || "").replace(/^s3:\/\/[^/]+\//, "");
      if (!objectKey) objectKey = fileRecord.file_name;

      const { encryptedStream, decipher } = await getDecryptedS3Stream(s3Client, objectBucket, objectKey);
      encryptedStream.pipe(decipher).pipe(res);

    } else {
      throw new Error("Unsupported storage type");
    }
  } catch (err) {
    console.error("Download route error:", err.message);
    if (!res.headersSent) res.status(400).json({ success: false, error: err.message });
  }
});

export default router;


