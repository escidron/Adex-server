import fs from 'fs';
import path from 'path';
import { decompressPdf } from '../utils/compressPdf.js';

export const pdfDecompressMiddleware = async (req, res, next) => {
  try {
    if (!req.url.endsWith('.pdf')) {
      return next();
    }

    const filePath = path.join('./pdfs', path.basename(req.url));
    
    if (!fs.existsSync(filePath)) {
      return next();
    }

    const compressedBuffer = fs.readFileSync(filePath);
    const decompressedBuffer = await decompressPdf(compressedBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', decompressedBuffer.length);
    res.send(decompressedBuffer);
  } catch (error) {
    next();
  }
};