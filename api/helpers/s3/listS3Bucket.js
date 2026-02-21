import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { createS3Client, ensureS3Config } from "./s3Helpers";

export async function listS3Bucket({ bucket, prefix = "", s3Config } = {}) {
  try {
    if (!bucket) throw new Error("bucket is required");
    ensureS3Config(s3Config);

    const client = createS3Client(s3Config);

    let normalized = (prefix || "").toString().trim();
    normalized = normalized.replace(/^\/+/, "");
    normalized = normalized.replace(/\/+$/, "");

    const prefixForApi = normalized ? `${normalized}/` : "";

    let folders = [];
    try {
      const cmdFolders = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefixForApi,
        Delimiter: "/",
        MaxKeys: 1000,
      });

      const resFolders = await client.send(cmdFolders);
      if (
        resFolders.CommonPrefixes &&
        Array.isArray(resFolders.CommonPrefixes)
      ) {
        folders = resFolders.CommonPrefixes.map((p) => p.Prefix);
        if (prefixForApi) {
          folders = folders.map((p) => p.replace(prefixForApi, ""));
        }
      }
    } catch (err) {
      console.warn("Warning listing folders:", err?.message || err);
      folders = [];
    }

    const files = [];
    let continuationToken = undefined;
    do {
      const cmd = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefixForApi,
        ContinuationToken: continuationToken,
        MaxKeys: 1000, // up to 1000 per page
      });

      const res = await client.send(cmd);

      const contents = res.Contents || [];
      for (const obj of contents) {
        if (obj.Key && obj.Key.endsWith("/") && obj.Size === 0) {
          continue;
        }

        const key = obj.Key;
        const name = key.split("/").pop();
        const size = obj.Size || 0;
        const lastModified = obj.LastModified || null;
        const mimetype = mime.lookup(name) || "application/octet-stream";

        files.push({
          key,
          name,
          size,
          lastModified,
          mimetype,
        });
      }

      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return {
      success: true,
      bucket,
      prefix: prefix || "",
      folders,
      files,
    };
  } catch (err) {
    console.error("Error listing S3 bucket:", err);
    return { success: false, error: err?.message || String(err) };
  }
}
