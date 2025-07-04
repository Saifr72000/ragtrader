import express from "express";
import multer from "multer";
//import fs from "fs/promises";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

/* import { extractPdfPages } from "../services/pdfToImages.js";
import { embedImages } from "../embeddings/voyage.js"; */
import { pc } from "../vectorstore/pinecone.js";
import { embedImages } from "../embeddings/voyage.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

/* router.post("/ingest", upload.single("pdf"), async (req, res) => {
  try {
    const pdfPath = req.file.path;
    const imagePaths = await convertPdfToImages(pdfPath);

    const buffers = await Promise.all(imagePaths.map((p) => fs.readFile(p)));

    const base64Images = buffers.map((buffer) => {
      const base64String = buffer.toString("base64");
      const fullDataUrl = `data:image/png;base64,${base64String}`;

      return {
        type: "image_base64",
        image_base64: fullDataUrl,
      };
    });

    const embeddings = await embedImages(base64Images);
    const index = pc.Index("pdf-embeddings");

    const vectors = embeddings.map((e, i) => ({
      id: `${req.file.filename}_p${i + 1}`,
      values: e.embedding,
      metadata: {
        docId: req.file.filename,
        page: i + 1,
      },
    }));

    await index.upsert(vectors);

    res.json({ status: "success", pages: vectors.length });
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to process PDF");
  }
}); */

/* router.post("/ingest", upload.single("pdf"), async (req, res) => {
  try {
    const pdfPath = req.file.path;
    console.log("pdfPath", pdfPath);

    const extractedPages = await extractPdfPages(pdfPath);

    const inputs = await Promise.all(
      extractedPages.map(async (page) => {
        const buffer = await fs.readFile(page.imagePath);
        const base64 = buffer.toString("base64");
        return {
          content: [
            { type: "text", text: page.text || "" },
            {
              type: "image_base64",
              image_base64: `data:image/png;base64,${base64}`,
            },
          ],
        };
      })
    );

    console.log("inputs", inputs);

    const embeddings = await embedImages(inputs);
    const index = pc.Index("pdf-embeddings");

    const vectors = embeddings.map((e, i) => ({
      id: `${req.file.filename}_p${i + 1}`,
      values: e.embedding,
      metadata: {
        docId: req.file.filename,
        page: i + 1,
        text: extractedPages[i].text, 
      },
    }));

    await index.upsert({ vectors });

    res.json({ status: "success", pages: vectors.length });
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to process PDF");
  }
}); */

router.post("/ingest", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Prepare form-data for Python API
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const response = await axios.post("http://localhost:8000/process", form, {
      headers: form.getHeaders(),
    });

    // Process the result from Python
    /* const processedPages = response.data; */

    const result = response.data;

    return res.json({
      status: "success",
      result: result,
    });

    console.log("Embedding process reached...");
    const embeddings = await embedImages(processedPages);
    console.log("Embedding process completed...");
    const index = pc.Index("b64-pdf");

    const vectors = embeddings.map((e, i) => ({
      id: `${req.file.filename}_p${i + 1}`,
      values: e.embedding,
      metadata: {
        docId: req.file.filename,
        page: i + 1,
      },
    }));

    await index.upsert(vectors);

    // You can now embed/store the processed result as needed
    res.json({
      status: "success",
      pages: processedPages.length,
      data: processedPages,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to process PDF");
  }
});

export default router;
