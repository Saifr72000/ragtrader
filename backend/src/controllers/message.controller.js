import { Message } from "../models/message.js";
import { Chat } from "../models/chat.js";
import { createEmbeddings } from "../embeddings/voyage.js";
import { searchSimilar } from "../vectorstore/searchSimilar.js";
import { runChatCompletion } from "../controllers/openai.controller.js";
import { systemPrompt } from "../utils/openai.utils.js";
import { uploadImageToGCS } from "../utils/gcs.utils.js";
// Store file in memory for direct upload to GCS

export const createMessage = async (req, res) => {
  try {
    const chatId = req.body.chatId;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const role = req.body.role;
    const text = req.body["content[text]"];
    const image = req.file;

    let imageUrl = null;

    if (image) {
      imageUrl = await uploadImageToGCS(image.buffer, "queries");
    }

    return res.status(200).json({ imageUrl });

    let content = {
      text,
      image_url: imageUrl,
    };

    const userMessage = await Message.create({
      chatId,
      role,
      content,
    });

    const embeddingInput = [
      {
        text: text,
        image_data_url: imageUrl,
      },
    ];

    const [embedUserMessage] = await createEmbeddings(embeddingInput);

    const queryEmbedding = embedUserMessage.embedding;
    const retrievedDocs = await searchSimilar(queryEmbedding, 4);

    // All of the retrieved Docs will be passed to the LLM along with the original Query
    // to interpret the knowledge base and provide a response

    const contextMessages = retrievedDocs.map((doc) => ({
      role: "system",
      content: [
        { type: "text", text: doc.text },
        ...(doc.image_url
          ? [{ type: "image_url", image_url: { url: doc.image_url } }]
          : []),
      ],
    }));

    // Gets the entire chat history between system and user
    const chatHistory = await Message.find({ chatId }).sort({ timestamp: 1 });

    // Formats that history
    const formattedHistory = chatHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Constructs the entire payload sent to OpenAI for each time a new message in a chat is sent
    // to maintain context and understanding of the user's query
    const promptMessages = [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: systemPrompt,
          },
        ],
      },
      ...contextMessages,
      ...formattedHistory,
      // Add the current user's query
      {
        role: "user",
        content: [
          { type: "text", text: content.text },
          ...(content.image_url
            ? [{ type: "image_url", image_url: { url: content.image_url } }]
            : []),
        ],
      },
    ];

    // Sends the payload to OpenAI and gets the response
    const assistantMessage = await runChatCompletion({
      systemPrompt,
      messages: promptMessages.slice(1), // Remove the system prompt since it's passed separately
    });

    // Saves the assistant reply to the DB
    const savedAssistantMessage = await Message.create({
      chatId,
      role: "assistant",
      content: assistantMessage,
    });

    res.status(200).json({ reply: savedAssistantMessage });
  } catch (error) {
    console.error("❌ Error in createMessage:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error.message,
    });
  }
};
