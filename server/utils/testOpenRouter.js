import dotenv from "dotenv";
dotenv.config();

async function testOpenRouter() {
  try {
    const prompt = "Generate 3 full-stack interview questions with answers.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5000", // optional but recommended
        "X-Title": "AI Interview Platform",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    console.log("✅ AI Response:\n", data.choices?.[0]?.message?.content || data);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

testOpenRouter();
