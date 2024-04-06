import puppeteer from "puppeteer";
import qrcode from "qrcode";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

export async function generateQrCode(listingId) {
  try {
    const qrCodeContent = `https://adexconnect.com/market-place/details?id=${listingId}`;
    const qrCodeImage = await qrcode.toDataURL(qrCodeContent);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 800, height: 1000 }); // Ajuste as dimensões conforme necessário

    // Convertendo o URL do arquivo para o caminho do arquivo local
    const __filename = fileURLToPath(import.meta.url);

    const imagePath = path.join(
      path.dirname(__filename),
      "../images/email/qrcode-header.png"
    );
    const base64Image = await fs.readFile(imagePath, { encoding: "base64" });
    const footerImagePath = path.join(
      path.dirname(__filename),
      "../images/email/adex-logo-black-yellow.png"
    );
    const footerBase64Image = await fs.readFile(footerImagePath, {
      encoding: "base64",
    });

    await page.setContent(`
      <div style="position: relative background-color: white;width: 600px;height: 760px; color: white; border: 1px solid black; text-align: center; padding: 50px;border-radius: 20px;display: flex;flex-direction: column;align-items: center;margin: 0 auto;margin-top: 50px">
          <img src="data:image/jpeg;base64,${base64Image}" alt="header" style="width: 365px; height: 185px;" />
          <div style="background-color: white; color: white;border: 1px solid gray;border-radius: 10px; text-align: center">
            <img src="${qrCodeImage}" alt="QR Code" style="border-radius: 10px; width: 450px; height: 450px;" />
          </div>
          <p style="font-family: 'Inter', sans-serif;color: black; font-weight: 500; margin-top: 30px; font-size: 20px">Scan this code now with your phone</p>
          <p style="font-family: 'Inter', sans-serif;color: black; font-weight: 500; padding-bottom: 50px; font-size: 20px;margin-top: -10px">to book this space using <b style="font-size: 22px;font-family: 'Inter', sans-serif">adexconnect.com</b></p>
          <div style="background-color: white;padding: 10px;position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%);display: flex;align-items: center;gap: 10px;">
            <img src="data:image/jpeg;base64,${footerBase64Image}" alt="footer" style="width: 70px; height: 70px" />
            <p style="font-family: 'Inter', sans-serif;color: black;font-size: 20px">Advertisement Reimagined...</p>
          </div>
      </div>
    `);

    // Injecting a script to trigger download of the PDF
    // await page.evaluate(() => {
    //   const pdfButton = document.createElement('a');
    //   pdfButton.setAttribute('href', 'data:application/pdf;base64,');
    //   pdfButton.setAttribute('download', 'listing_qrcode.pdf');
    //   pdfButton.click();
    // });

    const pdfPath = `./images/email/qr_code_images/listing_qrcode${listingId}.png`;
    await page.screenshot({ path: pdfPath });

    console.log("PDF gerado com sucesso.");

    await browser.close();
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
  }
}
