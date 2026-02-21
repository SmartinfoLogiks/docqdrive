import cron from "node-cron";
import fs from "fs/promises";
import path from "path";
import { getDBClient } from "../utils/dbClient.js";
import { DB_CONFIG } from "../config/dbConfig.js";
import dotenv from "dotenv"

dotenv.config();


// Helper function to get current unix timestamp
const getUnixNow = () => Math.floor(Date.now() / 1000);

// Start the cron job
export function startDeleteExpiredFilesCron() {
  console.log("Starting file cleanup cron...");

  // Take cron schedule from env (default every 1 hour)
  const cronSchedule = process.env.CRON_SCHEDULE || "*/1 * * * *"; //0 * * * *

  cron.schedule(cronSchedule, async () => {
    console.log("Running expired file cleanup...");

    try {
      const db = await getDBClient();
      const nowUnix = getUnixNow();

      if (DB_CONFIG.ENGINE === "mysql") {
        const [rows] = await db.execute(
          `
          SELECT id, relative_path, storage_type, bucket
          FROM file_tbl 
          WHERE blocked = 'false' 
            AND upload_status = 'complete'
            AND exp <= ?
        `,
          [nowUnix]
        );

        for (const file of rows) {
          await handleFileDeletion(file, db, "mysql");
        }
      } else if (DB_CONFIG.ENGINE === "mongo") {
        const collection = db.collection("file_tbl");

        const expiredFiles = await collection
          .find({
            blocked: "false",
            upload_status: "complete",
            exp: { $lte: nowUnix },
          })
          .toArray();

        for (const file of expiredFiles) {
          await handleFileDeletion(file, collection, "mongo");
        }
      }
    } catch (err) {
      console.error("Error in cleanup cron:", err);
    }
  });

  console.log(`Cron job scheduled with: "${process.env.CRON_SCHEDULE || "0 * * * *"}"`);
}

// Main file deletion handler
async function handleFileDeletion(file, db, engine) {
  try {
    const { id, storage_type } = file;

    switch (storage_type) {
      case "local":
        await deleteLocalFile(file, db, engine);
        break;

      case "s3":
        await deleteS3File(file);
        break;

      case "one_drive":
        await deleteOneDriveFile(file);
        break;

      case "google_drive":
        await deleteGoogleDriveFile(file);
        break;

      default:
        console.warn(`Unknown storage type for file ${id}: ${storage_type}`);
        return;
    }
  } catch (err) {
    console.error(`Error deleting file ${file.id}:`, err);
  }
}

// ========== Storage Handlers ==========

// Local storage
async function deleteLocalFile(file, db, engine) {
  const { id, relative_path } = file;

  // Ensure path is relative
  const safeRelativePath = relative_path.startsWith("/")
    ? relative_path.slice(1)
    : relative_path;

  // Construct absolute path
  const baseDir = process.env.BASE_STORAGE_PATH || process.cwd();
  const localPath = path.join(baseDir, safeRelativePath);

  try {
    // Check if file exists
    await fs.access(localPath);

    // Delete file
    await fs.unlink(localPath);
    console.log(`Deleted local file: ${localPath}`);

    // Mark file as blocked in DB
    if (engine === "mysql") {
      await db.execute(`UPDATE file_tbl SET blocked='true' WHERE id=?`, [id]);
    } else if (engine === "mongo") {
      await db.updateOne({ id }, { $set: { blocked: "true" } });
    }

    console.log(`File ${id} marked as expired.`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`Local file not found: ${localPath}`);
    } else {
      console.error(`Error deleting file ${localPath}:`, err);
    }
  }
}

// S3 placeholder
async function deleteS3File(file) {
  console.log(`[Pending] Delete from S3: ${file.relative_path}`);
}

// OneDrive placeholder
async function deleteOneDriveFile(file) {
  console.log(`[Pending] Delete from OneDrive: ${file.relative_path}`);
}

// Google Drive placeholder
async function deleteGoogleDriveFile(file) {
  console.log(`[Pending] Delete from Google Drive: ${file.relative_path}`);
}
