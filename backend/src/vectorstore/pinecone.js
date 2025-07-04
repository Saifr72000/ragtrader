import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

export const pc = new Pinecone({
  apiKey:
    "pcsk_2MTGZN_Cs4L4bUWBQgRVyscdCouzbjMNgj26agPDguaYDeKVc6aTeS4bATkjnKXp8J9iC9",
});

export const createIndex = async (indexName) => {
  const index = pc.Index(indexName);
  const exists = await index.describe();
};
