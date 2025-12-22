import fs from "fs";
import { Upload } from "@aws-sdk/lib-storage";
import { insertFileRecord } from "../../db/fileQueries.js";
import {
  generateFileName,
  detectMimeFromBase64,
  detectMimeFromUrl,
} from "../../utils/fileHelpers.js";
import { ensureS3Config, createS3Client } from "./s3Helpers.js";

function buildKey(folder, filename) {
  if (!folder) return filename;
  const cleanedFolder = folder.replace(/^\/+|\/+$/g, "");
  return `${cleanedFolder}/${filename}`;
}

async function uploadToS3Stream(s3Client, params, options = {}) {
  const upload = new Upload({
    client: s3Client,
    params,
    queueSize: options.queueSize || 4,
    partSize: options.partSize || 5 * 1024 * 1024, // 5MB
  });

  const result = await upload.done();
  return result;
}

export async function uploadS3Bucket({
  s3Config,
  storage_type,
  uploadPath,
  filename,
  mimetype,
  mode,
  exp,
  fileOrUrl,
  overwrite = false,
}) {
  try {
    await ensureS3Config(s3Config);

    const bucketName = s3Config.bucket || (s3Config.s3Bucket ?? null);
    if (!bucketName) {
      throw new Error(
        "Bucket name (s3Config.bucket) is required for S3 uploads."
      );
    }

    if (!mimetype) {
      if (mode === "attachment" && fileOrUrl?.mimetype) {
        mimetype = fileOrUrl.mimetype;
      } else if (mode === "content") {
        mimetype = detectMimeFromBase64(fileOrUrl);
      } else if (mode === "url") {
        mimetype = detectMimeFromUrl(fileOrUrl);
      } else {
        mimetype = "application/octet-stream";
      }
    }

    if (!filename) {
      filename = generateFileName(fileOrUrl?.originalname, mimetype);
    }

    const folder = s3Config.folder || uploadPath || "";
    const key = buildKey(folder, filename);

    const s3Client = await createS3Client(s3Config);

    let body;
    let contentLength = null;

    if (mode === "attachment") {
      if (!fileOrUrl || typeof fileOrUrl !== "object" || !fileOrUrl.path) {
        throw new Error("Invalid multipart file object for attachment mode.");
      }

      const filePath = fileOrUrl.path;
      const stat = fs.statSync(filePath);
      contentLength = stat.size;
      body = fs.createReadStream(filePath);
    } else if (mode === "content") {
      // base64 string
      if (!fileOrUrl || typeof fileOrUrl !== "string") {
        throw new Error("Base64 string required for content mode.");
      }
      const buffer = Buffer.from(fileOrUrl, "base64");
      contentLength = buffer.length;
      body = buffer;
    } else if (mode === "url") {
      if (!fileOrUrl || typeof fileOrUrl !== "string") {
        throw new Error("URL string required for url mode.");
      }

      let resp;
      try {
        resp = await fetch(fileOrUrl, {
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
        });
      } catch (err) {
        throw new Error(`Failed to fetch URL: ${err.message}`);
      }

      if (!resp.ok) {
        throw new Error(`Failed to fetch URL. HTTP ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(
          "URL returned HTML page, not a file. Use a direct file link."
        );
      }

      const contentLengthHeader = resp.headers.get("content-length");
      contentLength = contentLengthHeader
        ? parseInt(contentLengthHeader, 10)
        : null;

      body = resp.body;
    } else {
      throw new Error('Invalid mode. Use "attachment", "content", or "url".');
    }

    // S3 params
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: mimetype || undefined,
    };

    if (s3Config.acl) {
      params.ACL = s3Config.acl;
    }

    const uploadResult = await uploadToS3Stream(s3Client, params, {
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    if (mode === "attachment") {
      try {
        const tempPath = fileOrUrl.path;
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (e) {
        console.warn("Failed to remove temp file:", e?.message || e);
      }
    }

    const s3UrlPublic = (() => {
      if (s3Config.acl && /public/i.test(s3Config.acl) && !s3Config.endpoint) {
        return `https://${bucketName}.s3.${
          s3Config.region
        }.amazonaws.com/${encodeURIComponent(key)}`;
      }
      if (s3Config.endpoint) {
        const ep = s3Config.endpoint.replace(/\/+$/g, "");
        return `${ep}/${encodeURIComponent(key)}`;
      }
      return null;
    })();

    const metadata = {
      file_name: filename,
      relative_path: `s3://${bucketName}/${key}`,
      storage_type: "s3",
      bucket: bucketName,
      size: contentLength ?? null,
      mimetype: mimetype || null,
      exp: exp ?? null,
      mode,
      uploaded_at: new Date().toISOString(),
      s3_result: uploadResult || null,
      public_url: s3UrlPublic,
    };

    const insertResult = await insertFileRecord(metadata);
    metadata.id = insertResult?.id || null;

    return {
      success: true,
      message: `File uploaded to S3 bucket "${bucketName}" at key "${key}"`,
      data: metadata,
    };
  } catch (err) {
    const safeMessage = err?.message || String(err);
    return { success: false, error: safeMessage };
  }
}
