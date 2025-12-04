import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { createS3Client } from "./s3Helpers.js";

export async function listS3Files({ bucket, prefix = "", s3Config }) {
  try {
    const client = await createS3Client(s3Config);

    let normalized = prefix.replace(/^\/+/, "").replace(/\/+$/, "");
    const prefixForApi = normalized ? `${normalized}/` : "";

    const files = [];
    let continuationToken = undefined;

    do {
      const cmd = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefixForApi,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const res = await client.send(cmd);

      (res.Contents || []).forEach((obj) => {
        // Skip folder markers
        if (obj.Key.endsWith("/") && obj.Size === 0) return;

        const key = obj.Key;
        const name = key.split("/").pop();
        const mimetype = mime.lookup(name) || "application/octet-stream";

        files.push({
          name,
          size: obj.Size,
          modified: obj.LastModified,
          mimetype,
        });
      });

      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return {
      status: "success",
      bucket,
      filepath: prefix,
      files,
    };
  } catch (err) {
    console.error("Error in listS3Files:", err);
    return { status: "error", message: err.message };
  }
}
