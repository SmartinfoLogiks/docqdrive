import path from "path";
import mime from "mime-types";

/**
 * Generate a unique filename if missing.
 * Example: file_20250112_145200_123.pdf
 */
export function generateFileName(originalName, mimetype) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 15);

  let ext = "";

  if (originalName && originalName.includes(".")) {
    ext = path.extname(originalName);
  } else if (mimetype) {
    ext = mime.extension(mimetype) ? "." + mime.extension(mimetype) : "";
  }

  if (!ext) ext = ".bin";

  return `file_${timestamp}${ext}`;
}

/**
 * Detect mimetype from base64
 */
export function detectMimeFromBase64(base64) {
  const header = base64.substring(0, 50);

  if (header.startsWith("JVBER")) return "application/pdf";
  if (header.startsWith("iVBOR")) return "image/png";
  if (header.startsWith("/9j/")) return "image/jpeg";

  return "application/octet-stream";
}

/**
 * Detect mimetype from URL if filename present
 */
export function detectMimeFromUrl(url) {
  const ext = path.extname(url.split("?")[0]);
  if (ext) return mime.lookup(ext) || "application/octet-stream";
  return "application/octet-stream";
}
