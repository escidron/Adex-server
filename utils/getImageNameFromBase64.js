import fs from "fs";

export default function getImageNameFromBase64(base64, index) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const imageName = `${timestamp + index}.png`.slice(-17);
    const path = "./images/" + imageName;
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFile(path, base64Data, { encoding: "base64" }, function (err) {
      if (err) {
        console.error("[getImageNameFromBase64]Erro ao escrever o arquivo:",err);
        reject(err);
      } else {
        resolve(imageName);
      }
    });
  });
}
