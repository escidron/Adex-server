import * as fs from "fs";


export default function getImageNameFromBase64(base64) {
    
    const imageName = Date.now() + ".png";
    const path = "./images/" + imageName;
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(path, base64Data, { encoding: "base64" });

    return imageName
  }