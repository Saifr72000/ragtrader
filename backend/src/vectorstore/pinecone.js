import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const createIndex = async (indexName) => {
  const index = pc.Index(indexName);
  const exists = await index.describe();
};
