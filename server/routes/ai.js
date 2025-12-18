// server/routes/ai.js
import express from "express";
import { generateAIResponse } from "../utils/ai.js";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const { role } = req.body;
    const prompt = `Generate 3 aptitude questions for the role of ${role}.`;

    const aiOutput = await generateAIResponse(prompt);

    res.json({ success: true, response: aiOutput });
  } catch (error) {
    console.error("❌ Route error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
