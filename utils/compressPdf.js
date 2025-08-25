import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export async function compressPdf(pdfBuffer) {
  try {
    const compressed = await gzip(pdfBuffer);
    return compressed;
  } catch (error) {
    console.error('PDF compression error:', error);
    throw error;
  }
}

export async function decompressPdf(compressedBuffer) {
  try {
    const decompressed = await gunzip(compressedBuffer);
    return decompressed;
  } catch (error) {
    console.error('PDF decompression error:', error);
    throw error;
  }
}