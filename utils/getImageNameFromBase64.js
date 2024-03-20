import fs from 'fs';

export default function getImageNameFromBase64(base64) {
  const imageName = Date.now() + ".png";
  const path = "./images/" + imageName;
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

  try {
      fs.writeFileSync(path, base64Data, { encoding: "base64" });
      console.log("[getImageNameFromBase64] Arquivo escrito com sucesso:", path);
      return imageName;
  } catch (err) {
      console.error("[getImageNameFromBase64] Erro ao escrever o arquivo:", err);
      throw err;
  }
}