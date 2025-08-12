import express from "express";
import multer from "multer";
//import fs from "fs/promises";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

import { pc } from "../vectorstore/pinecone.js";
import { createEmbeddings } from "../embeddings/voyage.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post("/ingest", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Get overlap parameters from request body or use defaults
    const overlapPercentage = req.body.overlap_percentage || 0.2;
    const overlapStrategy = req.body.overlap_strategy || "characters";

    // Prepare form-data for Python API
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    // Build URL with query parameters
    const pythonApiUrl = `http://localhost:8000/process?overlap_percentage=${overlapPercentage}&overlap_strategy=${overlapStrategy}`;

    const response = await axios.post(pythonApiUrl, form, {
      headers: form.getHeaders(),
    });

    // Process the result from Python
    const processedPages = response.data.chunks;
    const jsonFilePath = response.data.json_file_path;

    console.log(`Processed data saved to: ${jsonFilePath}`);

    console.log("Embedding process reached...");
    const embeddings = await createEmbeddings(processedPages);
    console.log("Embedding process completed...");
    const index = pc.Index("rag-data");

    const vectors = embeddings.map((e, i) => {
      const pageData = processedPages[i];

      return {
        id: `${req.file.filename}_p${i + 1}`,
        values: e.embedding,
        metadata: {
          docId: req.file.filename,
          page: pageData.page,
          text: pageData.text, // ← RAG retrieval context
          image_url: pageData.image_data_url, // ← Optional for UI or inspection
          has_overlap: pageData.has_overlap,
          overlap_length: pageData.overlap_length,
          overlap_strategy: pageData.overlap_strategy,
          overlap_percentage: pageData.overlap_percentage,
        },
      };
    });

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

router.post("/ingest-chunked", async (req, res) => {
  try {
    console.log("Embedding process started...");
    const embeddings = await createEmbeddings(chunkedData);
    console.log("Embedding process completed...");
    const index = pc.Index("rag-data");

    const vectors = embeddings.map((e, i) => {
      const pageData = chunkedData[i];

      return {
        id: `${req.file.filename}_p${i + 1}`,
        values: e.embedding,
        metadata: {
          docId: req.file.filename,
          page: pageData.page,
          text: pageData.text, // ← RAG retrieval context
          image_url: pageData.image_data_url, // ← Optional for UI or inspection
          has_overlap: pageData.has_overlap,
          overlap_length: pageData.overlap_length,
          overlap_strategy: pageData.overlap_strategy,
          overlap_percentage: pageData.overlap_percentage,
        },
      };
    });

    await index.upsert(vectors);

    res.json({
      status: "success",
      data: embeddings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to process PDF");
  }
});

export default router;
