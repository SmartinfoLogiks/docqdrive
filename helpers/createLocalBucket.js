import fs from "fs";
import path from "path";
import { createBucketSchema } from "../validations/createBucketValidation.js";
import dotenv from "dotenv";

dotenv.config();

export async function createLocalBucket(bucket_name) {
  try {
    const { error } = createBucketSchema.validate({
      bucket_name,
    });

    if (error) throw new Error(error.details[0].message);

    const baseDirt = process.env.BASE_STORAGE_PATH || process.cwd();
    const parentdir = path.resolve(baseDirt, "");
    const basedir = path.join(parentdir, "buckets");

    if (!fs.existsSync(basedir)) {
      fs.mkdirSync(basedir);
      console.log("created base bucket folder", basedir);
    }

    const bucketDir = path.join(basedir, bucket_name);
    if (fs.existsSync(bucketDir)) {
      return {
        status: "exists",
        message: `Bucket '${bucket_name}' already exists.`,
        path: `buckets/${bucket_name}`,
      };
    }

    fs.mkdirSync(bucketDir);
    console.log("created bucket", bucketDir);

    return {
      status: "success",
      message: `local bucket ${bucket_name} created successfully`,
      bucket: bucket_name,
      path: `buckets/${bucket_name}`,
    };
  } catch (error) {
    console.error("Error creating local bucket:", error);
    return { status: "error", message: error.message };
  }
}

export async function createOneDriveBucket(bucket_name) {
  return {
    status: "todo",
    message: `OneDrive bucket '${bucket_name}' creation pending implementation.`,
  };
}

export async function createGoogleDriveBucket(bucket_name) {
  return {
    status: "todo",
    message: `Google Drive bucket '${bucket_name}' creation pending implementation.`,
  };
}
