import { readdir } from "fs/promises";
import getDatabaseConnection from "./db.js";

const db = getDatabaseConnection();

async function createTables() {
  const modelFiles = await readdir("./models");
  
  const modelPromises = modelFiles.map(async (file) => {
    const modelModule = await import(`./models/${file}`);
    const model = modelModule.default;

    return new Promise((resolve, reject) => {
      db.query(model, (err, result) => {
        if (err) {
          reject(err);
        }
        console.log(`[Table ${file} created]`);
        resolve(result);
      });
    });
  });

  // Aguarde a resolução de todas as promessas
  await Promise.all(modelPromises);
}

createTables();
