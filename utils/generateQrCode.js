import qrcode from "qrcode";
import fs from "fs/promises";
import pdf from 'html-pdf';

export async function generateQrCode(listingId) {
  try {
    const qrCodeContent = `https://adexconnect.com/market-place/details?id=${listingId}`;
    const qrCodeImage = await qrcode.toDataURL(qrCodeContent);

  const imagePath = new URL('../images/email/adex-logo-black-yellow.png', import.meta.url);
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const htmlContent = `
      <div style="background-color: white; color: white;border: 1px solid black; text-align: center; padding: 50px;">
          <img src="data:image/jpeg;base64,${base64Image}" alt="Foto do Listing" style="width: 70px; height: 70px;" />
          <p style="margin-top: 10px; font-family: 'Inter', sans-serif;">Reach more people, place your ad here.</p>
          <img src="${qrCodeImage}" alt="QR Code" style="border-radius: 10px; margin-top: 20px; width: 180px; height: 180px;" />
      </div>
    `;

    const pdfOptions = { format: 'Letter', phantomPath: "../node_modules/phantomjs-prebuilt/bin/phantomjs" } ; 
    const outputPath = `./images/email/qr_code_images/listing_qrcode${listingId}.png`;

    await new Promise((resolve, reject) => {
      pdf.create(htmlContent, pdfOptions).toFile(outputPath, async (err, res) => {
        if (err) {
          reject(err);
        } else {
          console.log('image generated')
          resolve();
        }
      });
    });
  } catch (error) {
    console.log("[generateQrCode]", error);
  }
}
