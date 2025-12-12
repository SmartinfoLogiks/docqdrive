import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getFileById } from "../models/fileModel.js";
import { createS3Client, ensureS3Config } from "../utils/s3Helpers.js";

export async function downloadS3Bucket({
  fileId,
  bucket,
  s3Config,
  downloadFlag = "false",
  exp,
} = {}) {
  try {
    if (!fileId) throw new Error("fileId is required.");

    await ensureS3Config(s3Config);

    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) throw new Error("File not found.");

    if (fileRecord.blocked === "true") {
      throw new Error("File is blocked and cannot be downloaded.");
    }

    let objectBucket = null;
    let objectKey = null;
    const rel = fileRecord.relative_path || "";
    if (rel.startsWith("s3://")) {
      const without = rel.slice("s3://".length);
      const slashIdx = without.indexOf("/");
      if (slashIdx === -1) {
        objectBucket = without;
        objectKey = "";
      } else {
        objectBucket = without.slice(0, slashIdx);
        objectKey = without.slice(slashIdx + 1);
      }
    } else {
      objectBucket = fileRecord.bucket || bucket || s3Config.bucket;
      objectKey = (rel || "").replace(/^\/+|\/+$/g, "");
    }

    if (!objectBucket)
      throw new Error("Cannot determine S3 bucket for this file record.");
    if (!objectKey) {
      objectKey = fileRecord.file_name;
    }

    // Build S3 client
    const s3Client = await createS3Client(s3Config);

    let expiresIn = 3600; // default = 1 hour

    if (typeof exp === "number" && exp > 0) {
      expiresIn = exp;
    } else if (fileRecord && fileRecord.exp && Number(fileRecord.exp) > 0) {
      expiresIn = parseInt(fileRecord.exp, 10);
    }

    const MAX_S3_EXPIRY = 604800;
    if (expiresIn > MAX_S3_EXPIRY) {
      expiresIn = MAX_S3_EXPIRY;
    }

    const getCommand = new GetObjectCommand({
      Bucket: objectBucket,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${fileRecord.file_name}"`,
      ResponseContentType: fileRecord.mimetype || undefined,
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn,
    });

    return {
      success: true,
      message: "S3 presigned download URL generated successfully.",
      data: {
        file_name: fileRecord.file_name,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        expires_in: expiresIn,
        download_url: presignedUrl,
      },
    };
  } catch (err) {
    console.error("Error in downloadS3Bucket:", err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}
