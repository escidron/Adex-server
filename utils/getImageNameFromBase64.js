import fs from 'fs';

export default function getImageNameFromBase64(base64,index) {
  const timestamp = Date.now();
  const imageName = `${timestamp + index}.png`.slice(-17)
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