import OpenAI from "openai";
import axios from "axios";
import { systemPrompt } from "../utils/openai.utils.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runChatCompletion = async ({ systemPrompt, messages }) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return response.choices[0].message;
  } catch (error) {
    console.error(
      "❌ OpenAI Chat Completion Error:",
      error?.response || error.message
    );
    throw error;
  }
};

export const openTest = async (req, res) => {
  console.log("call to openai");
  const { text, imageUrl } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: text },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });
    res.status(200).json({ response: response.choices[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
