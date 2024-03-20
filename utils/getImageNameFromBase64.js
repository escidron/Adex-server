import fs from 'fs';

export default function getImageNameFromBase64(base64) {
  return new Promise((resolve, reject) => {
    const imageName = Date.now() + ".png";
    const path = "./images/" + imageName;
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    
    fs.writeFile(path, base64Data, { encoding: "base64" }, function (err) {
      if (err) {
        console.error("[getImageNameFromBase64] Erro ao escrever o arquivo:", err);
        reject(err);
      } else {
        resolve(imageName);
      }
    });
  });
}
