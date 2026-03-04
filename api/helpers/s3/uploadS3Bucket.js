import fs from "fs";
import path from "path";
import os from "os";
import { Upload } from "@aws-sdk/lib-storage";
import { insertFileRecord } from "../../db/fileQueries.js";
import {
  generateFileName,
  detectMimeFromBase64,
  detectMimeFromUrl,
} from "../../utils/fileHelpers.js";
import { ensureS3Config, createS3Client } from "./s3Helpers.js";
import { encryptFile } from "../../utils/encryptionHelpers.js";

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
    partSize: options.partSize || 5 * 1024 * 1024,
  });
  return await upload.done();
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
    if (!bucketName) throw new Error("Bucket name required");

    if (!mimetype) {
      if (mode === "attachment" && fileOrUrl?.mimetype) mimetype = fileOrUrl.mimetype;
      else if (mode === "content") mimetype = detectMimeFromBase64(fileOrUrl);
      else if (mode === "url") mimetype = detectMimeFromUrl(fileOrUrl);
      else mimetype = "application/octet-stream";
    }
    if (!filename) filename = generateFileName(fileOrUrl?.originalname, mimetype);

    const folder = s3Config.folder || uploadPath || "";
    const key = buildKey(folder, filename);
    const s3Client = await createS3Client(s3Config);

    let tempInputPath = null;
    const encryptedTemp = path.join(os.tmpdir(), `s3_enc_${Date.now()}.tmp`);

    if (mode === "attachment") {
      if (!fileOrUrl?.path) throw new Error("Invalid multipart file");
      tempInputPath = fileOrUrl.path;
    } else if (mode === "content") {
      if (typeof fileOrUrl !== "string") throw new Error("Base64 required");
      tempInputPath = path.join(os.tmpdir(), `content_${Date.now()}.tmp`);
      await fs.promises.writeFile(tempInputPath, Buffer.from(fileOrUrl, "base64"));
    } else if (mode === "url") {
      if (typeof fileOrUrl !== "string") throw new Error("URL required");
      tempInputPath = path.join(os.tmpdir(), `url_${Date.now()}.tmp`);
      const resp = await fetch(fileOrUrl, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      await fs.promises.writeFile(tempInputPath, Buffer.from(buffer));

      const ct = resp.headers.get("content-type") || "";
      if ((!mimetype || mimetype === "application/octet-stream") && ct) mimetype = ct.split(";")[0];
    }

    await encryptFile(tempInputPath, encryptedTemp);

    const body = fs.createReadStream(encryptedTemp);
    const contentLength = fs.statSync(encryptedTemp).size;

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: mimetype || undefined,
    };
    if (s3Config.acl) params.ACL = s3Config.acl;

    const uploadResult = await uploadToS3Stream(s3Client, params);

    // Cleanup
    [encryptedTemp, tempInputPath].forEach(p => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });

    const s3UrlPublic = (() => {
      if (s3Config.acl && /public/i.test(s3Config.acl) && !s3Config.endpoint) {
        return `https://${bucketName}.s3.${s3Config.region}.amazonaws.com/${encodeURIComponent(key)}`;
      }
      if (s3Config.endpoint) {
        return `${s3Config.endpoint.replace(/\/+$/, "")}/${encodeURIComponent(key)}`;
      }
      return null;
    })();

    const metadata = {
      file_name: filename,
      relative_path: `s3://${bucketName}/${key}`,
      storage_type: "s3",
      bucket: bucketName,
      size: contentLength,
      mimetype: mimetype || null,
      exp: exp ?? null,
      mode,
      uploaded_at: new Date().toISOString(),
      s3_result: uploadResult,
      public_url: s3UrlPublic,
      encrypted: true,
      s3_access_key_id: s3Config.accessKeyId,
      s3_secret_access_key: s3Config.secretAccessKey,
      s3_region: s3Config.region,
      s3_endpoint: s3Config.endpoint || null,
    };

    const insertResult = await insertFileRecord(metadata);
    metadata.id = insertResult?.id || null;

    return { success: true, message: `File uploaded to S3 at ${key}`, data: metadata };
  } catch (err) {
    return { success: false, error: err.message };
  }
}