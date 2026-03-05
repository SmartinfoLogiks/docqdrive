import fs from "fs";
import path from "path";
import os from "os";
import { uploadFileSchema } from "../../validations/storage_bucket/uploadFileValidation.js";
import { insertFileRecord } from "../../db/fileQueries.js";
import {
  generateFileName,
  detectMimeFromBase64,
  detectMimeFromUrl,
} from "../../utils/fileHelpers.js";
import { encryptFile } from "../../utils/encryptionHelpers.js";
import dotenv from "dotenv";
dotenv.config();

async function downloadUrlToFile(url, destFilePath) {
  let response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
    });
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL. HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(
      "URL returned HTML page, not a file. Use a direct file link."
    );
  }

  await pipeline(response.body, fs.createWriteStream(destFilePath));

  const contentLengthHeader = response.headers.get("content-length");
  return {
    success: true,
    contentType,
    contentLength: contentLengthHeader
      ? parseInt(contentLengthHeader, 10)
      : null,
  };
}

export async function uploadLocalBucket(
  bucket,
  storage_type,
  uploadPath,
  filename,
  mimetype,
  mode,
  exp,
  file,
  overwrite = false
) {
  try {
    if (!filename) filename = generateFileName(file?.originalname, mimetype);
    if (!mimetype) {
      if (mode === "attachment" && file?.mimetype) mimetype = file.mimetype;
      else if (mode === "content") mimetype = detectMimeFromBase64(file);
      else if (mode === "url") mimetype = detectMimeFromUrl(file);
      else mimetype = "application/octet-stream";
    }

    const { error } = uploadFileSchema.validate({ bucket, storage_type, uploadPath, filename, mimetype, mode, exp, overwrite, file });
    if (error) throw new Error(error.details[0].message);

    const baseDir = process.env.BASE_STORAGE_PATH ? path.resolve(process.env.BASE_STORAGE_PATH) : path.join(process.cwd(), "buckets");
    const bucketDir = path.join(baseDir, bucket);
    if (!fs.existsSync(bucketDir)) throw new Error(`Bucket "${bucket}" does not exist.`);

    const finalDir = uploadPath ? path.join(bucketDir, uploadPath) : bucketDir;
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

    const destFilePath = path.join(finalDir, filename);
    if (fs.existsSync(destFilePath) && !overwrite) throw new Error(`File "${filename}" already exists.`);

    let tempInputPath = null;

    if (mode === "attachment") {
      if (!file?.path) throw new Error("Invalid file object in attachment mode");
      tempInputPath = file.path;
    } else if (mode === "content") {
      if (typeof file !== "string") throw new Error("Base64 string required for content mode");
      tempInputPath = path.join(os.tmpdir(), `upload_content_${Date.now()}.tmp`);
      await fs.promises.writeFile(tempInputPath, Buffer.from(file, "base64"));
    } else if (mode === "url") {
      if (typeof file !== "string") throw new Error("URL string required for url mode");
      tempInputPath = path.join(os.tmpdir(), `upload_url_${Date.now()}.tmp`);
      const response = await fetch(file, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" } });
      if (!response.ok) throw new Error(`Failed to fetch URL. HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      await fs.promises.writeFile(tempInputPath, Buffer.from(buffer));

      const contentType = response.headers.get("content-type") || "";
      if ((!mimetype || mimetype === "application/octet-stream") && contentType) {
        mimetype = contentType.split(";")[0];
      }
    } else throw new Error(`Invalid mode: ${mode}`);

    // THIS IS HAPPENING IN REAL TIME NOT IN BACKGROUD
    // MAY USE LOT OF MEMORY FOR LARGE FILES
    await encryptFile(tempInputPath, destFilePath);

    // Cleanup temp file (except original attachment which is handled by multer)
    if (mode !== "attachment" && tempInputPath && fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    } else if (mode === "attachment" && fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    }

    const stats = fs.statSync(destFilePath);
    const metadata = {
      file_name: filename,
      relative_path: `buckets/${bucket}${uploadPath ? "/" + uploadPath : ""}/${filename}`,
      storage_type,
      bucket,
      size: stats.size,
      mimetype,
      exp,
      mode,
      uploaded_at: new Date().toISOString(),
      encrypted: true,
    };

    const insertResult = await insertFileRecord(metadata);
    metadata.id = insertResult?.id || null;

    return { success: true, message: `File "${filename}" uploaded successfully.`, data: metadata };
  } catch (err) {
    return { success: false, error: err.message };
  }
}