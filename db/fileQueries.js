import { getDBClient } from "../utils/dbClient.js";
import { DB_CONFIG } from "../config/dbConfig.js";


export async function insertFileRecord(fileData) {
  if (DB_CONFIG.ENGINE === "mysql") {
    return await insertFileRecordMySQL(fileData);
  } else if (DB_CONFIG.ENGINE === "mongo") {
    return await insertFileRecordMongo(fileData);
  } else {
    throw new Error(`Unsupported DB engine: ${DB_CONFIG.ENGINE}`);
  }
}

async function insertFileRecordMySQL(fileData) {
  const {
    file_name,
    relative_path,
    storage_type,
    bucket,
    size,
    mimetype,
    exp,
    upload_status = "complete",
    blocked = "false",
    created_by = "root",
    edited_by = "root",
  } = fileData;

  const sql = `
    INSERT INTO file_tbl (
      id, file_name, relative_path, storage_type, bucket, size, mimetype,
      exp, upload_status, blocked, created_by, edited_by
    )
    VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    file_name,
    relative_path,
    storage_type,
    bucket,
    size,
    mimetype,
    exp,
    upload_status,
    blocked,
    created_by,
    edited_by,
  ];

  const db = await getDBClient();
  
  
  const [result] = await db.execute(sql, params);
  return result;
}

// ---------- MongoDB Implementation ----------
async function insertFileRecordMongo(fileData) {
  const db = await getDBClient();
  const collection = db.collection("file_tbl");

  // Ensure created_at and edited_at fields exist
  const record = {
    ...fileData,
    created_at: new Date(),
    edited_at: new Date(),
  };

  const result = await collection.insertOne(record);

  //console.log('uuuuu',result);
  
  return result;
}
