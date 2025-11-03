import mysql from "mysql2/promise";
import { DB_CONFIG } from "../config/dbConfig.js";

let dbClient;

export async function getDBClient() {
  if (DB_CONFIG.ENGINE === "mysql") {
    if (!dbClient) {
      dbClient = await mysql.createPool(DB_CONFIG.MYSQL);
    }
    return dbClient;
  }


  else if (DB_CONFIG.ENGINE === "mongo") {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(DB_CONFIG.MONGO.uri);
    await client.connect();
    return client.db();
  }

  // else if (DB_CONFIG.ENGINE === "postgres") {
  //   const { Pool } = await import("pg");
  //   const pool = new Pool(DB_CONFIG.POSTGRES);
  //   return pool;
  // }

  throw new Error(`Unsupported DB engine: ${DB_CONFIG.ENGINE}`);
}
