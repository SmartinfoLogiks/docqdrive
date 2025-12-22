import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { validateBucketName } from "../../validations/validateBucketName.js";
import { createS3Client, ensureS3Config } from "./s3Helpers.js";

export async function createS3Bucket(bucket_name, s3Config) {
  try {
    await validateBucketName(bucket_name);

    await ensureS3Config(s3Config);

    const client = await createS3Client(s3Config);
    const region = s3Config.region;

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket_name }));
      return {
        status: "exists",
        message: `Bucket '${bucket_name}' already exists.`,
      };
    } catch (err) {
      if (
        err?.$metadata?.httpStatusCode !== 404 &&
        err?.name !== "NotFound" &&
        err?.Code !== "NotFound"
      ) {
        console.log(
          "HeadBucket error (ignored only for true NotFound):",
          err?.message
        );
      }
    }

    let createParams = { Bucket: bucket_name };

    if (region !== "us-east-1" && !s3Config.endpoint) {
      createParams.CreateBucketConfiguration = {
        LocationConstraint: region,
      };
    }

    await client.send(new CreateBucketCommand(createParams));

    return {
      status: "success",
      message: `S3 bucket '${bucket_name}' created successfully.`,
      region,
      bucket: bucket_name,
    };
  } catch (err) {
    console.error("Error creating S3 bucket:", err);
    return { status: "error", message: err.message };
  }
}
