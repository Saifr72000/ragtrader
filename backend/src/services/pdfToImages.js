/* import { fromPath } from "pdf2pic";

export const convertPdfToImages = async (pdfPath) => {
  const converter = fromPath(pdfPath, {
    density: 600,
    format: "png",
    width: 1024,
    height: 1448,
    saveFilename: "page",
    savePath: "./tmp",
  });

  const pageRange = Array.from({ length: 50 }, (_, i) => i + 1); // Pages 1 to 50
  const pages = await converter.bulk(pageRange);
  return pages.map((p) => p.path); 
};
 */

/* import { fromPath } from "pdf2pic";
import fs from "fs/promises";
import {
  getDocument,
  GlobalWorkerOptions,
  version,
} from "pdfjs-dist/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

export const extractPdfPages = async (pdfPath) => {
  // Step 1: Convert pages to images
  const converter = fromPath(pdfPath, {
    density: 600,
    format: "png",
    width: 1024,
    height: 1448,
    saveFilename: "page",
    savePath: "./tmp",
  });

  const imagePages = await converter.bulk(-1); // all pages
  const imagePaths = imagePages.map((p) => p.path);

  // Step 2: Extract text per page
  const rawData = await fs.readFile(pdfPath);
  const pdf = await getDocument({ data: rawData }).promise;

  const textPages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    textPages.push(text.trim());
  }

  // Step 3: Combine
  return imagePaths.map((path, i) => ({
    imagePath: path,
    text: textPages[i] || "",
    page: i + 1,
  }));
};
 */
