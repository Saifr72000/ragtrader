import axios from "axios";
import { chunkedData } from "./processedData.js";
export const createEmbeddings = async (chunks) => {
  const inputs = chunks.map((chunk) => ({
    content: [
      {
        type: "text",
        text: chunk.text,
      },
      {
        type: "image_url",
        image_url: chunk.image_data_url,
      },
    ],
  }));

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
          Authorization: `Bearer pa-Is5UHe1I_nUuqlYyhpbtqa5s5SfLHLaQkPRGXtJJJB5`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error in embedImages:", error);
  }
};
