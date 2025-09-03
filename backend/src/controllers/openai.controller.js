import OpenAI from "openai";
import axios from "axios";
import { systemPrompt, tools } from "../utils/openai.utils.js";
import { executeBuySignal } from "../services/trading.service.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runChatCompletion = async ({ systemPrompt, messages }) => {
  try {
    // Check if this is a 5-minute candle message (only enable tools for these)

    // Build OpenAI request
    const requestConfig = {
      model: "gpt-5",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools,
    };

    // First OpenAI call
    const response = await openai.chat.completions.create(requestConfig);

    console.log("response", JSON.stringify(response, null, 2));

    const choice = response.choices[0];

    // If AI called functions, execute them and get final response
    if (choice.message.tool_calls?.length > 0) {
      console.log(
        `🎯 AI called ${choice.message.tool_calls.length} function(s)`
      );

      // Build conversation with tool results
      const conversationWithTools = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message, // AI's message with tool calls
      ];

      // Execute each function call
      for (const toolCall of choice.message.tool_calls) {
        console.log(`🔧 Executing: ${toolCall.function.name}`);

        let args = JSON.parse(toolCall.function.arguments);
        console.log("args", args);

        try {
          const result = await executeBuySignal(args);
          console.log("exectued buy signal", result);

          // Add tool result to conversation
          conversationWithTools.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        } catch (error) {
          console.error("💥 Function execution failed:", error.message);

          // Add error to conversation
          conversationWithTools.push({
            role: "tool",
            content: JSON.stringify({ error: error.message }),
            tool_call_id: toolCall.id,
          });
        }
      }

      // Second OpenAI call with function results
      console.log("🔄 Making second request with tool results...");
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-5",
        messages: conversationWithTools,
      });

      console.log("🎉 Final AI response received");
      return finalResponse.choices[0].message;
    }

    return choice.message;
  } catch (error) {
    console.error("❌ OpenAI Error:", error.message);
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
