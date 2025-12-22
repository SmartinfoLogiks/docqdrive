import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createS3Client } from "./s3Helpers.js";

export async function listS3Directories({ bucket, prefix = "", s3Config }) {
  try {
    const client = await createS3Client(s3Config);

    let normalized = prefix.replace(/^\/+/, "").replace(/\/+$/, "");
    const prefixForApi = normalized ? `${normalized}/` : "";

    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefixForApi,
      Delimiter: "/", // REQUIRED for folders
      MaxKeys: 1000,
    });

    const res = await client.send(cmd);

    const directories = (res.CommonPrefixes || []).map((entry) => {
      const full = entry.Prefix;
      const name = full.replace(prefixForApi, "").replace(/\/$/, "");

      return {
        name,
        modified: null,
      };
    });

    return {
      status: "success",
      bucket,
      filepath: prefix,
      directories,
    };
  } catch (err) {
    console.error("Error in listS3Directories:", err);
    return { status: "error", message: err.message };
  }
}
