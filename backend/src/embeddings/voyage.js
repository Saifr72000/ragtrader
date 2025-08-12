import axios from "axios";
import { pc } from "../vectorstore/pinecone.js";

export const createEmbeddings = async (chunks) => {
  console.log("embedding begun");
  const inputs = chunks.map((chunk) => {
    const content = [
      {
        type: "text",
        text: chunk.text,
      },
    ];

    // Only add image_url if it exists
    if (chunk.image_data_url) {
      content.push({
        type: "image_url",
        image_url: chunk.image_data_url,
      });
    }

    return { content };
  });

  try {
    const response = await axios.post(
      "https://api.voyageai.com/v1/multimodalembeddings",
      {
        model: "voyage-multimodal-3",
        inputs: inputs,
        input_type: "document",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error in embedImages:", error);
  }
};

export const embedAndUpsert = async (docId, firstPart, secondPart) => {
  let firstChunkEmbeddings;
  let secondChunkEmbeddings;

  try {
    console.log("🔹 Step 1: Embedding first chunk set...");
    firstChunkEmbeddings = await createEmbeddings(firstPart);

    console.log("🔹 Step 2: Embedding second chunk set...");
    secondChunkEmbeddings = await createEmbeddings(secondPart);
  } catch (err) {
    console.error("❌ Embedding failed:", err?.response?.data || err.message);
    return;
  }

  const allChunks = [...firstPart, ...secondPart];
  const allEmbeddings = [...firstChunkEmbeddings, ...secondChunkEmbeddings];

  const vectors = allEmbeddings.map((embedding, i) => {
    const pageData = allChunks[i];

    return {
      id: `${docId}_p${pageData.page}`,
      values: embedding.embedding,
      metadata: {
        docId,
        page: pageData.page,
        text: pageData.text,
        image_url: pageData.image_data_url,
        has_overlap: pageData.has_overlap,
        overlap_length: pageData.overlap_length,
        overlap_strategy: pageData.overlap_strategy,
        overlap_percentage: pageData.overlap_percentage,
      },
    };
  });

  try {
    const index = pc.Index("rag-data");
    console.log("📤 Upserting", vectors.length, "vectors to Pinecone...");
    await index.upsert(vectors);
    console.log("✅ Upsert complete.");
  } catch (err) {
    console.error("❌ Upsert failed:", err?.response?.data || err.message);
  }
};
/* await embedAndUpsert("candlestick_bible", firstChunks, secondChunks); */
