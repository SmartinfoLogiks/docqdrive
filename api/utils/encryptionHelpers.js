import crypto from "crypto";
import fs from "fs";
import { pipeline } from "stream/promises";

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = SALT_LENGTH + IV_LENGTH;

const getPassword = () => {
  if (!process.env.ENCRYPTION_PASSWORD) {
    throw new Error("ENCRYPTION_PASSWORD is required in .env");
  }
  return process.env.ENCRYPTION_PASSWORD;
};

export async function encryptFile(inputPath, outputPath) {
  const password = getPassword();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  // Write header (salt + iv)
  output.write(Buffer.concat([salt, iv]));

  // Encrypt content
  await pipeline(input, cipher, output);

  // Append auth tag at the end
  const tag = cipher.getAuthTag();
  fs.appendFileSync(outputPath, tag);
}

// ====================== DECRYPT STREAM FOR LOCAL ======================
export function getDecryptedLocalStream(filePath) {
  const password = getPassword();
  const fd = fs.openSync(filePath, "r");

  const header = Buffer.alloc(HEADER_LENGTH);
  fs.readSync(fd, header, 0, HEADER_LENGTH, 0);
  const salt = header.slice(0, SALT_LENGTH);
  const iv = header.slice(SALT_LENGTH, HEADER_LENGTH);

  const size = fs.statSync(filePath).size;
  const tag = Buffer.alloc(TAG_LENGTH);
  fs.readSync(fd, tag, 0, TAG_LENGTH, size - TAG_LENGTH);
  fs.closeSync(fd);

  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const readStream = fs.createReadStream(filePath, {
    start: HEADER_LENGTH,
    end: size - TAG_LENGTH - 1,
  });

  return { readStream, decipher };
}

// ====================== DECRYPT STREAM FOR S3 (range requests) ======================
export async function getDecryptedS3Stream(s3Client, bucket, key) {
  const password = getPassword();

  const { HeadObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");

  // Get file size
  const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const size = head.ContentLength;

  // Get tag (last 16 bytes)
  const tagResp = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=${size - TAG_LENGTH}-${size - 1}`,
  }));
  const tag = await tagResp.Body.transformToBuffer();

  // Get header (first 28 bytes)
  const headerResp = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=0-${HEADER_LENGTH - 1}`,
  }));
  const headerBuf = await headerResp.Body.transformToBuffer();
  const salt = headerBuf.slice(0, SALT_LENGTH);
  const iv = headerBuf.slice(SALT_LENGTH, HEADER_LENGTH);

  const keyBuf = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(tag);

  // Get ciphertext (middle part)
  const dataResp = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=${HEADER_LENGTH}-${size - TAG_LENGTH - 1}`,
  }));

  return { encryptedStream: dataResp.Body, decipher };
}