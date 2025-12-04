import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { uploadFileSchema } from "../validations/uploadFileValidation.js";
import { insertFileRecord } from "../db/fileQueries.js";
import {
  detectMimeFromBase64,
  detectMimeFromUrl,
  generateFileName,
} from "../utils/fileHelpers.js";
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
    if (!filename) {
      filename = generateFileName(file?.originalname, mimetype);
    }

    if (!mimetype) {
      if (mode === "attachment" && file?.mimetype) {
        mimetype = file.mimetype;
      } else if (mode === "content") {
        mimetype = detectMimeFromBase64(file);
      } else if (mode === "url") {
        mimetype = detectMimeFromUrl(file);
      } else {
        mimetype = "application/octet-stream";
      }
    }

    // Validate
    const { error } = uploadFileSchema.validate({
      bucket,
      storage_type,
      uploadPath,
      filename,
      mimetype,
      mode,
      exp,
      overwrite,
      file,
    });

    if (error) throw new Error(error.details[0].message);

    if (storage_type !== "local") {
      throw new Error(`Unsupported storage type: ${storage_type}`);
    }

    // Resolve bucket dir
    const baseDir = process.env.BASE_STORAGE_PATH
      ? path.resolve(process.env.BASE_STORAGE_PATH)
      : path.join(process.cwd(), "buckets");

    const bucketDir = path.join(baseDir, bucket);

    if (!fs.existsSync(bucketDir)) {
      throw new Error(`Bucket "${bucket}" does not exist.`);
    }

    const finalDir = uploadPath ? path.join(bucketDir, uploadPath) : bucketDir;
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

    const destFilePath = path.join(finalDir, filename);

    if (fs.existsSync(destFilePath) && !overwrite) {
      throw new Error(
        `File "${filename}" already exists in bucket "${bucket}".`
      );
    }

    // Handle modes
    if (mode === "attachment") {
      if (!file || typeof file !== "object" || !file.path) {
        throw new Error("Invalid file object in attachment mode.");
      }

      await fs.promises.copyFile(file.path, destFilePath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } else if (mode === "content") {
      const buffer = Buffer.from(file, "base64");
      await fs.promises.writeFile(destFilePath, buffer);
    } else if (mode === "url") {
      if (!file || typeof file !== "string")
        throw new Error("URL string required for url mode.");

      const result = await downloadUrlToFile(file, destFilePath);

      // Update mimetype if available from server
      if (
        (!mimetype || mimetype === "application/octet-stream") &&
        result.contentType
      ) {
        mimetype = result.contentType;
      }
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }

    // Metadata
    const stats = fs.statSync(destFilePath);
    const metadata = {
      file_name: filename,
      relative_path: `/buckets/${bucket}${
        uploadPath ? "/" + uploadPath : ""
      }/${filename}`,
      storage_type,
      bucket,
      size: stats.size,
      mimetype,
      exp,
      mode,
      uploaded_at: new Date().toISOString(),
    };

    const insertResult = await insertFileRecord(metadata);
    metadata.id = insertResult?.id || null;

    return {
      success: true,
      message: `File "${filename}" uploaded successfully.`,
      data: metadata,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
