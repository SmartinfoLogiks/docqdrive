// utils/listDirBucketUtils.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv"

dotenv.config();

/**
 * List only directories (folders) from a given bucket path (local storage).
 * @param {string} bucket - Bucket name under /buckets
 * @param {string} filepath - Subfolder path (optional)
 * @returns {object} { status, bucket, filepath, directories }
 */
export async function listLocalDirectories(bucket, filepath = "") {
  try {
    const baseDir = process.env.BASE_STORAGE_PATH || process.cwd();
    const dirPath = path.join(baseDir, "buckets", bucket, filepath);

    if (!fs.existsSync(dirPath)) {
      return { status: "error", message: `Path not found: ${dirPath}` };
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const directories = [];

    for (const item of items) {
      if (item.isDirectory()) {
        const fullPath = path.join(dirPath, item.name);
        const stats = fs.statSync(fullPath);

        directories.push({
          name: item.name,
          modified: stats.mtime,
        });
      }
    }

    return {
      status: "success",
      bucket,
      filepath,
      directories,
    };
  } catch (err) {
    console.error("Error listing directories in local bucket:", err);
    return { status: "error", message: err.message };
  }
}
