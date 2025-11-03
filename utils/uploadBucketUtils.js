import fs from "fs";
import path from "path";
import { uploadFileSchema } from "../validations/uploadFileValidation.js";
import { insertFileRecord } from "../db/fileQueries.js"; // 👈 new import

/**
 * Upload a file to a local bucket folder.
 *
 * @param {string} bucket - Name of the target bucket.
 * @param {string} storage_type - Storage type (should be 'local' for this function).
 * @param {string} uploadPath - Subpath inside the bucket (optional).
 * @param {string} filename - Final filename to store.
 * @param {string} mimetype - MIME type of the file (e.g. 'application/pdf').
 * @param {string} mode - 'attachment' or 'content' mode.
 * @param {number} exp - Expiration time in seconds (optional).
 * @param {object} file - The uploaded file object (from multer/form-data).
 * @param {boolean} overwrite - Whether to overwrite existing file (default false).
 * @returns {Promise<object>} Upload metadata.
 */
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
    const { error } = uploadFileSchema.validate({
      bucket,
      storage_type,
      uploadPath,
      filename,
      mimetype,
      mode,
      exp,
      overwrite,
    });
    if (error) throw new Error(error.details[0].message);
    
    if (storage_type !== "local") {
      throw new Error(`Unsupported storage type: ${storage_type}`);
    }

    const baseDir = path.join(process.cwd(), "buckets");
    const bucketDir = path.join(baseDir, bucket);

    // Check if bucket exists
    if (!fs.existsSync(bucketDir)) {
      throw new Error(`Bucket "${bucket}" does not exist.`);
    }

    // Determine target directory
    const finalDir = uploadPath ? path.join(bucketDir, uploadPath) : bucketDir;
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

    const destFilePath = path.join(finalDir, filename);

    // Prevent overwrite unless allowed
    if (fs.existsSync(destFilePath) && !overwrite) {
      throw new Error(`File "${filename}" already exists in bucket "${bucket}".`);
    }

    // Handle file saving based on mode
    if (mode === "attachment") {
      // Expect file object from multer
      if (!file || !file.path) {
        throw new Error("No file uploaded in attachment mode.");
      }

      await fs.promises.copyFile(file.path, destFilePath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    else if (mode === "content") {
      // Expect file as base64 string
      if (!file || typeof file !== "string") {
        throw new Error("File content must be a base64 string in content mode.");
      }

      // Decode base64
      const buffer = Buffer.from(file, "base64");
      await fs.promises.writeFile(destFilePath, buffer);
    }

    else {
      throw new Error(`Invalid mode: ${mode}. Use "attachment" or "content".`);
    }

    const stats = fs.statSync(destFilePath);
    const fileSize = stats.size;

   // console.log('',fileSize);

    //console.log('uuuuuuu',filename);
    
    

    // Build metadata
    const metadata = {
      file_name: filename,  // correct key name for DB,
      relative_path: `/buckets/${bucket}${uploadPath ? `/${uploadPath}` : ""}/${filename}`,
      storage_type,
      bucket,
      size: fileSize || 0,  // ensure number
      mimetype,
      exp,
      mode,
   // path: `/buckets/${bucket}${uploadPath ? `/${uploadPath}` : ""}/${filename}`,
      uploaded_at: new Date().toISOString(),
      url: `/buckets/${bucket}${uploadPath ? `/${uploadPath}` : ""}/${filename}`,
    };

    console.log('meta',metadata);
    

    await insertFileRecord(metadata);

    console.log("File uploaded and metadata inserted:", metadata);

  //console.log("File uploaded successfully:", metadata);

    return {
      success: true,
      message: `File "${filename}" uploaded successfully to bucket "${bucket}"`,
      data: metadata,
    };

  } catch (error) {
    console.error("Error uploading file:", error.message);
    return { success: false, error: error.message };
  }
}
