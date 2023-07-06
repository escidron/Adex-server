// Function to convert image to base64
import * as fs from "fs";

export default function getImageBase64 (imagePath){
    const imageBuffer = fs.readFileSync("./images/" + imagePath.image);
    const imageBase64 = "data:image/png;base64," + imageBuffer.toString("base64");
    return imageBase64;
  };