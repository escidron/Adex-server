// const mysql = require('mysql2');
import mysql from "mysql2";
var connection = mysql.createConnection({
  host: "adex-database.cem6u2n9hutt.us-east-2.rds.amazonaws.com",
  user: "admin",
  database: "adex",
  password: "Eduardo1993*",
  port: "3306",
  keepAlive: true
});

connection.connect(function (err) {
  if (err) {
    console.log("database conection error", err);
  } else {
    console.log("success");
  }
});
export default connection;
