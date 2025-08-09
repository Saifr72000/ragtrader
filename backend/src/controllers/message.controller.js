import { Message } from "../models/message.js";
import { Chat } from "../models/chat.js";
import { createEmbeddings } from "../embeddings/voyage.js";
import { searchSimilar } from "../vectorstore/searchSimilar.js";
import { runChatCompletion } from "../controllers/openai.controller.js";
import { systemPrompt } from "../utils/openai.utils.js";
import { pythonUploadImage } from "../utils/gcs.utils.js";

export const createMessage = async (req, res) => {
  try {
    const chatId = req.body.chatId;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    const role = req.body.role;
    const text = req.body.content?.text;

    let imageUrl = null;
    let content = { text, image_url: null };

    // Handle image upload if present
    if (req.file) {
      const imageBuffer = req.file.buffer;
      const filename = req.file.originalname;
      const folder = req.body.folder || "queries";

      imageUrl = await pythonUploadImage(imageBuffer, filename, folder);
      content.image_url = imageUrl;
    }

    // Save user message first (for both text-only and image messages)
    // All messages go through RAG to maintain context and retrieve relevant information
    const userMessage = await Message.create({
      chatId,
      role,
      content: [content],
    });

    const embeddingInput = [
      {
        text: text,
        image_data_url: imageUrl || undefined,
      },
    ];

    const embedResult = await createEmbeddings(embeddingInput);

    console.log("🔍 Embedding result:", embedResult);
    console.log("🔍 Embedding input:", embeddingInput);

    if (!embedResult || !embedResult[0]) {
      console.error("❌ Embedding failed or returned empty result");
      res.status(500).json({
        error: "Failed to process message",
        details: "Embedding service unavailable",
      });
      return;
    }

    const embedUserMessage = embedResult[0];
    const queryEmbedding = embedUserMessage.embedding;
    const retrievedDocs = await searchSimilar(queryEmbedding, 3);

    /* return res.status(200).json({ retrievedDocs }); */

    // All of the retrieved Docs will be passed to the LLM along with the original Query
    // to interpret the knowledge base and provide a response

    // Gets the entire chat history between system and user
    const chatHistory = await Message.find({ chatId }).sort({ timestamp: 1 });

    // Formats that history for OpenAI
    const formattedHistory = chatHistory.map((m) => {
      if (m.role === "user" && m.content && m.content.length > 0) {
        // User message - can have text and/or image
        const content = [];
        if (m.content[0].text) {
          content.push({ type: "text", text: m.content[0].text });
        }
        if (m.content[0].image_url) {
          content.push({
            type: "image_url",
            image_url: { url: m.content[0].image_url },
          });
        }
        return { role: m.role, content };
      } else if (m.role === "assistant" && m.content && m.content.length > 0) {
        // Assistant message - text only
        return {
          role: m.role,
          content: m.content[0].text || "No content available",
        };
      }
      return { role: m.role, content: "No content available" };
    });

    // Build the user message for the current turn (context + query + image)
    const userMessageContent = [
      ...(retrievedDocs && Array.isArray(retrievedDocs)
        ? retrievedDocs.flatMap((doc) => [
            { type: "text", text: doc.text },
            ...(doc.image_url
              ? [{ type: "image_url", image_url: { url: doc.image_url } }]
              : []),
          ])
        : []),
      { type: "text", text: "-----" },
      { type: "text", text: content.text },
      ...(content.image_url
        ? [{ type: "image_url", image_url: { url: content.image_url } }]
        : []),
    ];

    /* return res.status(200).json({ userMessageContent }); */

    // Construct the prompt messages: system, full chat history, then the new user message
    const promptMessages = [
      { role: "system", content: [{ type: "text", text: systemPrompt }] },
      ...formattedHistory, // previous user/assistant messages
      { role: "user", content: userMessageContent },
    ];

    /* return res.status(200).json({ promptMessages }); */

    // User message already created above, no need to create again
    /* return res.status(200).json({ promptMessages }); */
    // Sends the payload to OpenAI and gets the response
    const assistantMessage = await runChatCompletion({
      systemPrompt,
      messages: promptMessages.slice(1), // Remove the system prompt since it's passed separately
    });

    // Saves the assistant reply to the DB
    const savedAssistantMessage = await Message.create({
      chatId,
      role: "assistant",
      content: [
        {
          text: assistantMessage.content,
          image_url: null,
        },
      ],
    });

    // Update the chat's lastMessage with the assistant's response
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: assistantMessage.content || "Assistant response",
    });

    // Return both the assistant's reply and the retrieved chunks for transparency
    res.status(200).json({
      reply: assistantMessage,
      retrievedChunks: retrievedDocs || [],
    });
  } catch (error) {
    console.error("❌ Error in createMessage:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error.message,
    });
  }
};
