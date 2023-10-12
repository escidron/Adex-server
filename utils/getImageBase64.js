// Function to convert image to base64
import * as fs from "fs";

export default function getImageBase64 (image){
    const imageBuffer = fs.readFileSync("./images/" + image);
    let imageBase64 = ''
    if(imageBuffer.toString("base64")){
      imageBase64 = "data:image/png;base64," + imageBuffer.toString("base64");
    }
    return imageBase64;
  };