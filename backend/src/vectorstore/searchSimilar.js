import { pc } from "./pinecone.js";

const index = pc.Index("rag-data");

export const searchSimilar = async (embedding, topK = 5) => {
  try {
    const result = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    return result.matches.map((match) => ({
      score: match.score,
      text: match.metadata?.text || "",
      image_url: match.metadata?.image_url || null,
      page: match.metadata?.page || null,
    }));
  } catch (err) {
    console.error(
      "❌ Pinecone query failed:",
      err?.response?.data || err.message
    );
    return [];
  }
};
