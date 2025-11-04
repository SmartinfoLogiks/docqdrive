// // utils/downloadBucketUtils.js
// import fs from "fs";
// import path from "path";
// import { getFileById } from "../models/fileModel.js";

// export async function downloadLocalBucket(fileId,bucket) {
//   try {
//     // 1. Fetch metadata from DB
//     const fileRecord = await getFileById(fileId,bucket);
    
//     if (!fileRecord) throw new Error("File not found or blocked.");


//     if (fileRecord.blocked === "true") {
//       throw new Error("File is blocked and cannot be downloaded.");
//     }

//     // 2. Build absolute file path
//     const filePath = path.join(process.cwd(), fileRecord.relative_path);

//     if (!fs.existsSync(filePath)) {
//       throw new Error("File does not exist on server.");
//     }

//     // 3. Return downloadable info
//     return {
//       success: true,
//       message: "File download URL generated successfully.",
//       data: {
//         file_name: fileRecord.file_name,
//         mimetype: fileRecord.mimetype,
//         size: fileRecord.size,
//         download_url: fileRecord.relative_path, // or your static-serving URL
//         abs_path: filePath, // optional for internal use
//       },
//     };
//   } catch (err) {
//     console.error("Download error:", err.message);
//     return { success: false, error: err.message };
//   }
// }

// services/downloadService.js (or wherever your function is)
import fs from "fs";
import path from "path";
import { getFileById } from "../models/fileModel.js";
import { createDownloadToken } from "../utils/downloadToken.js";



const BASE_URL = process.env.BASE_DOWNLOAD_URL || "http://localhost:8000"; // configure in env

const EXP = process.env.DOWNLOAD_TOKEN_EXPIRY
export async function downloadLocalBucket(fileId, bucket) {
  try {
    // 1. Fetch metadata from DB
    const fileRecord = await getFileById(fileId, bucket);
    if (!fileRecord) throw new Error("File not found or blocked.");

    if (fileRecord.blocked === "true") {
      throw new Error("File is blocked and cannot be downloaded.");
    }

    // 2. Build absolute file path (internal use only)
    const filePath = path.join(process.cwd(), fileRecord.relative_path);
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist on server.");
    }

    // 3. Create signed token (short-lived)
    const secret = process.env.DOWNLOAD_TOKEN_SECRET;

    //console.log('uuuuuu',secret);
    
    if (!secret) throw new Error("Server misconfigured: DOWNLOAD_TOKEN_SECRET missing");
    // token lifetime example: 10 minutes (adjust as needed)
    const token = createDownloadToken(secret, fileRecord.id || fileId,EXP,fileRecord.bucket);

    // 4. Return public URL only (no abs_path)
    return {
      success: true,
      message: "File download URL generated successfully.",
      data: {
        file_name: fileRecord.file_name,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        download_url: `${BASE_URL}/download/${token}`, // public short-lived link
      },
    };
  } catch (err) {
    console.error("Download error:", err.message);
    return { success: false, error: err.message };
  }
}

