import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "kwaipilot/kat-coder-pro:free";

export async function callOpenRouter(prompt, model = OPENROUTER_MODEL) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Interview App",
        },
      }
    );

    return response.data.choices[0].message.content || "";
  } catch (err) {
    console.error("❌ Error in callOpenRouter:", err.response?.data || err.message);
    throw err.response?.data || err;
  }
}

export function extractJsonArrayFromText(text) {
  try {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");

    if (start === -1 || end === -1) return [];

    const jsonString = text.slice(start, end + 1);

    return JSON.parse(jsonString);
  } catch (err) {
    console.error("❌ Failed to extract JSON:", err.message);
    return [];
  }
}
