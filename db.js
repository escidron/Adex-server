import mysql from "mysql2";

function createDatabaseConnection() {
  return mysql.createPool({
    host: "adex-database.cem6u2n9hutt.us-east-2.rds.amazonaws.com",
    user: "admin",
    database: "adex",
    password: "Eduardo1993*",
    port: "3306",
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
