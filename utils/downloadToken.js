// utils/downloadToken.js
import crypto from "crypto";

/**
 * Create a short token that encodes {id, exp} and an HMAC to prevent tampering.
 * Format: base64url(JSON) . '.' . base64url(hmac)
 */

const ALGO = "sha256";

function base64urlEncode(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(str) {
  // pad
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

/**
 * secret: string (store in env var)
 * expiresInSeconds: integer
 */
export function createDownloadToken(secret, fileId, expiresInSeconds,bucket) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = { id: fileId, exp , bucket };
  const payloadJson = JSON.stringify(payload);
  const payloadB = Buffer.from(payloadJson, "utf8");
  const payloadEncoded = base64urlEncode(payloadB);

  const hmac = crypto.createHmac(ALGO, secret).update(payloadEncoded).digest();
  const hmacEncoded = base64urlEncode(hmac);

  return `${payloadEncoded}.${hmacEncoded}`;
}

/**
 * Validate token and return payload object or throw
 */
export function verifyDownloadToken(secret, token) {
  if (!token || typeof token !== "string") throw new Error("Invalid token");
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Malformed token");
  const [payloadEncoded, hmacEncoded] = parts;

  const expectedHmac = crypto.createHmac(ALGO, secret).update(payloadEncoded).digest();
  const expectedHmacEncoded = base64urlEncode(expectedHmac);

  // constant-time compare
  const a = Buffer.from(expectedHmacEncoded);
  const b = Buffer.from(hmacEncoded);
  if (a.length !== b.length || crypto.timingSafeEqual(a, b) === false) {
    throw new Error("Invalid token signature");
  }

  const payloadBuf = base64urlDecode(payloadEncoded);
  const payloadJson = payloadBuf.toString("utf8");
  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch (e) {
    throw new Error("Invalid token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) throw new Error("Token expired");

  if (!payload.id) throw new Error("Missing id in token");

    if (!payload.bucket) throw new Error("Missing bucket name in token");



  return payload; // { id, exp , bucket}
}
