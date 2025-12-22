import { S3Client } from "@aws-sdk/client-s3";

export const createS3Client = (s3Config) => {
  const { accessKeyId, secretAccessKey, region, endpoint } = s3Config;

  const clientConfig = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: !!endpoint,
  };

  if (endpoint) clientConfig.endpoint = endpoint;

  return new S3Client(clientConfig);
};

export const ensureS3Config = (s3Config) => {
  if (!s3Config || typeof s3Config !== "object") {
    throw new Error("Missing s3 configuration in request.");
  }
  const { accessKeyId, secretAccessKey, region } = s3Config;
  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error(
      "S3 credentials (accessKeyId, secretAccessKey, region) are required."
    );
  }
};
