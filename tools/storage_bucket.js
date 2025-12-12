import {
  createLocalBucket,
  createGoogleDriveBucket,
  createOneDriveBucket,
} from "../helpers/createLocalBucket.js";
import { uploadLocalBucket } from "../helpers/uploadLocalBucket.js";
import { downloadLocalBucket } from "../helpers/downloadLocalBucket.js";
import { listLocalFiles } from "../helpers/listLocalFiles.js";
import { listLocalDirectories } from "../helpers/listLocalDirectories.js";
import { uploadS3Bucket } from "../helpers/uploadS3Bucket.js";
import { createS3Bucket } from "../helpers/createS3Bucket.js";
import { downloadS3Bucket } from "../helpers/downloadS3Bucket.js";
import { listS3Files } from "../helpers/listS3Files.js";
import { listS3Directories } from "../helpers/listS3Directories.js";

export async function run(message, params, file) {
  console.log("Storage bucket tool called with:", { message, params });

  switch (message) {
    case "list_storage_types":
      return {
        tool: "storage_bucket",
        storage_types: [
          {
            name: "local",
            description: "Will store files in local file system",
            requiredParams: ["bucket_name", "tool", "storage_type", "message"],
          },
          { name: "s3", description: "AWS S3 storage" },
          { name: "one_drive", description: "Microsoft OneDrive storage" },
          { name: "google_drive", description: "Google Drive storage" },
        ],
      };

    case "create_bucket": {
      const {
        bucket_name,
        storage_type,
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
        bucketSecurityPolicy,
      } = params;

      switch (storage_type) {
        case "local":
          return await createLocalBucket(bucket_name);
        case "s3":
          return await createS3Bucket(bucket_name, {
            accessKeyId,
            secretAccessKey,
            region,
            endpoint,
            bucketSecurityPolicy,
          });
        case "one_drive":
          return await createOneDriveBucket(bucket_name);
        case "google_drive":
          return await createGoogleDriveBucket(bucket_name);
        default:
          return { status: "error", message: "Unsupported storage type" };
      }
    }

    case "upload_file": {
      const {
        bucket,
        storage_type,
        path: uploadPath,
        filename,
        mimetype,
        mode,
        exp,
        file,
        url,
        overwrite = false,
      } = params;

      switch (storage_type) {
        case "local":
          return await uploadLocalBucket(
            bucket,
            storage_type,
            uploadPath,
            filename,
            mimetype,
            mode,
            exp,
            mode == "url" ? url : file,
            overwrite
          );

        case "s3":
          const s3Config = {
            accessKeyId: params.accessKeyId,
            secretAccessKey: params.secretAccessKey,
            region: params.region,
            bucket: params.bucket,
            folder: params.folder,
            acl:
              params.acl ||
              params.securityPolicy ||
              params.bucketSecurityPolicy ||
              "private",
            endpoint: params.endpoint,
          };

          return await uploadS3Bucket({
            s3Config,
            storage_type,
            uploadPath,
            filename,
            mimetype,
            mode,
            exp,
            fileOrUrl: mode == "url" ? url : file,
            overwrite,
          });
        case "one_drive":
          return {
            status: "error",
            message: "OneDrive upload not yet implemented",
          };
        case "google_drive":
          return {
            status: "error",
            message: "Google Drive upload not yet implemented",
          };
        default:
          return { status: "error", message: "Unsupported storage type" };
      }
    }

    case "download_file": {
      const {
        fileId,
        storage_type,
        bucket,
        download,
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
        exp,
      } = params;

      switch (storage_type) {
        case "local":
          return await downloadLocalBucket(fileId, bucket, download);

        case "s3": {
          const s3Config = {
            accessKeyId,
            secretAccessKey,
            region,
            endpoint,
          };

          return await downloadS3Bucket({
            fileId,
            bucket,
            s3Config,
            downloadFlag: download,
            exp,
          });
        }

        case "one_drive":
          return {
            status: "error",
            message: "OneDrive download not yet implemented",
          };
        case "google_drive":
          return {
            status: "error",
            message: "Google Drive download not yet implemented",
          };
        default:
          return { status: "error", message: "Unsupported storage type" };
      }
    }

    case "list_files": {
      const {
        bucket,
        filepath = "",
        storage_type,
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
      } = params;

      switch (storage_type) {
        case "local":
          return await listLocalFiles(bucket, filepath);

        case "s3": {
          const s3Config = { accessKeyId, secretAccessKey, region, endpoint };
          return await listS3Files({
            bucket,
            prefix: filepath,
            s3Config,
          });
        }

        default:
          return { status: "error", message: "Unsupported storage type" };
      }
    }

    case "list_dir": {
      const {
        bucket,
        filepath = "",
        storage_type,
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
      } = params;

      switch (storage_type) {
        case "local":
          return await listLocalDirectories(bucket, filepath);

        case "s3": {
          const s3Config = { accessKeyId, secretAccessKey, region, endpoint };
          return await listS3Directories({
            bucket,
            prefix: filepath,
            s3Config,
          });
        }

        default:
          return { status: "error", message: "Unsupported storage type" };
      }
    }

    default:
      return {
        status: "error",
        message: `Unknown message '${message}' for storage_bucket tool`,
      };
  }
}
