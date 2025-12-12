import fs from "fs";
import path from "path";
import mime from "mime-types";
import dotenv from "dotenv";

dotenv.config();

/**
 * List only files from a given bucket path (local storage).
 * Returns name, size, mimetype, and last modified timestamp for each file.
 */
export async function listLocalFiles(bucket, filepath = "") {
  try {
    const baseDir = process.env.BASE_STORAGE_PATH || process.cwd();
    const dirPath = path.join(baseDir, "buckets", bucket, filepath);

    if (!fs.existsSync(dirPath)) {
      return { status: "error", message: `Path not found: ${dirPath}` };
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];

    for (const item of items) {
      if (item.isFile()) {
        const fullPath = path.join(dirPath, item.name);
        const stats = fs.statSync(fullPath);

        const mimetype = mime.lookup(item.name) || "application/octet-stream";

        files.push({
          name: item.name,
          size: stats.size,
          modified: stats.mtime,
          mimetype,
        });
      }
    }

    return {
      status: "success",
      bucket,
      filepath,
      files,
    };
  } catch (err) {
    console.error("Error listing local bucket:", err);
    return { status: "error", message: err.message };
  }
}
