import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

function createDatabaseConnection() {
  return mysql.createPool({
    host: process.env.MySQL_HOST,
    user: process.env.MySQL_USER,
    database: process.env.MySQL_DATABASE,
    password: process.env.MySQL_PASSWORD,
    port: process.env.MySQL_PORTA,
  });
}

export default function getDatabaseConnection() {
  const pool = createDatabaseConnection();

  pool.on("error", (err) => {
    console.error("MySQL Pool Error:", err.message);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.log("Attempting to re-establish the database connection...");
      pool = createDatabaseConnection();
    } else {
      throw err;
    }
  });

  return pool;
}
