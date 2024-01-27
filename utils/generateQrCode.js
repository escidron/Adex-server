import puppeteer from "puppeteer";
import qrcode from "qrcode";
import fs from "fs/promises";

export async function generateQrCode(listingId) {
  try {

    const qrCodeContent = `https://adexconnect.com/market-place/details?id=${listingId}`;
    const qrCodeImage = await qrcode.toDataURL(qrCodeContent);

    const imagePath = new URL('../images/email/adex-logo-white-yellow.png', import.meta.url);
    
    const imageBuffer = await fs.readFile(imagePath);

    const base64Image = imageBuffer.toString('base64');



    const htmlContent = `
    <div style="background-color: black; color: white; text-align: center; padding: 50px;">
        <img src="data:image/jpeg;base64,${base64Image}" alt="Foto do Listing" style="width: 70px; height: 70px;" />
        <p style="margin-top: 10px; font-family: 'Inter', sans-serif;">Reach more people, place your ad here.</p>
        <img src="${qrCodeImage}" alt="QR Code" style="border-radius: 10px; margin-top: 20px; width: 180px; height: 180px;" />
      </div>
    `;

    // Inicialize o navegador Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Configure o conteúdo HTML na página
    await page.setContent(htmlContent);

    // Ajuste a largura e a altura da página para evitar o fundo branco extra
    await page.setViewport({ width: 800, height: 150 });

    // Capture uma captura de tela como Buffer
    const screenshotBuffer = await page.screenshot({
      clip: { x: 8, y: 8, width: 784, height: 412 },
    });
    // Caminho do arquivo de imagem
    const cardImagePath = `./images/email/qr_code_images/listing_qrcode${listingId}.png`;

    // Salve a imagem no arquivo
    await fs.writeFile(cardImagePath, screenshotBuffer);

    // Feche o navegador Puppeteer
    await browser.close();
  } catch (error) {
    console.log("[generateQrCode]", error);
  }

  return null;
}
