import { getDBClient } from "../utils/dbClient.js";
import { DB_CONFIG } from "../config/dbConfig.js";

export async function getFileById(fileId, bucket) {
  if (DB_CONFIG.ENGINE === "mysql") {
    return await getFileByIdMySQL(fileId, bucket);
  } else if (DB_CONFIG.ENGINE === "mongo") {
    return await getFileByIdMongo(fileId, bucket);
  } else {
    throw new Error(`Unsupported DB engine: ${DB_CONFIG.ENGINE}`);
  }
}

export async function deleteFileById(fileId, bucket) {
  console.log("deleteFileById: ", fileId, bucket)
  if (DB_CONFIG.ENGINE === "mysql") {
    return await deleteFileByIdMySQL(fileId, bucket);
  } else {
    throw new Error(`Unsupported DB engine: ${DB_CONFIG.ENGINE}`);
  }
}

// ---------- MySQL Implementation ----------
async function getFileByIdMySQL(fileId, bucket) {
  const db = await getDBClient();

  const sql = `
    SELECT *
    FROM file_tbl
    WHERE id = ? AND bucket = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [fileId, bucket]);
  return rows.length > 0 ? rows[0] : null;
}

async function deleteFileByIdMySQL(fileId, bucket) {
  const db = await getDBClient();

  const sql = `
    UPDATE file_tbl SET blocked = "true" WHERE id = '${fileId}'
  `;

  const [result] = await db.execute(sql, []);
  console.log("result:" , result)
  return true;
}

// ---------- MongoDB Implementation ----------
async function getFileByIdMongo(fileId, bucket) {
  const db = await getDBClient();
  const collection = db.collection("file_tbl");

  const record = await collection.findOne({
    id: fileId,
    bucket: bucket,
    blocked: "false",
  });

  return record || null;
}
