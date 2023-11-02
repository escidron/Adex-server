import getDatabaseConnection from "../db.js";

const db = getDatabaseConnection();

export default function escapeText (text){

    return db.escape(text);
  };