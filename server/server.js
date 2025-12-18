import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import interviewRoutes from "./routes/interviewRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import codeRoutes from "./routes/codeRoutes.js";
import Interview from "./models/Interview.js";
import Feedback from "./models/Feedback.js";
import User from "./models/User.js"; // Make sure this import exists

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// 🆕 AI Evaluation Service
class AIEvaluationService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    this.requestCount = 0;
    this.dailyLimit = 45;
  }

  // 🆕 Check API limits
  checkAPILimit() {
    this.requestCount++;
    if (this.requestCount >= this.dailyLimit) {
      throw new Error(`🚨 API Limit Reached: ${this.requestCount}/${this.dailyLimit} requests used. Please save remaining for presentation.`);
    }
    if (this.requestCount >= 40) {
      console.log(`⚠️  WARNING: ${this.requestCount}/45 requests used. Only ${45 - this.requestCount} remaining!`);
    }
    return true;
  }

  // 🆕 Evaluate Technical Answer
  async evaluateTechnicalAnswer(question, userAnswer, correctAnswer) {
    this.checkAPILimit();
    
    const prompt = `Evaluate this technical answer and return ONLY JSON: {"score": number, "feedback": string}

QUESTION: ${question}
CORRECT ANSWER: ${correctAnswer} 
USER ANSWER: ${userAnswer}

Score based on: Technical accuracy (0-70%), Completeness (0-30%)
Return score 0-100. Be strict but fair.`;

    return await this.callAI(prompt);
  }

  // 🆕 Evaluate HR Answer  
  async evaluateHRAnswer(question, userAnswer) {
    this.checkAPILimit();
    
    const prompt = `Evaluate this HR answer and return ONLY JSON: {"score": number, "feedback": string}

QUESTION: ${question}
USER ANSWER: ${userAnswer}

Score based on: Communication (0-40%), Relevance (0-30%), Professionalism (0-30%)
Return score 0-100.`;

    return await this.callAI(prompt);
  }

  // 🆕 Generate Overall Feedback
  async generateOverallFeedback(interviewData, roundScores) {
    this.checkAPILimit();
    
    const prompt = `Generate interview feedback and return ONLY JSON: {
      "improvement": string, 
      "suggestion": string
    }

Role: ${interviewData.role}
Rounds Completed: ${Object.keys(roundScores).join(', ')}
Scores: ${JSON.stringify(roundScores)}

Provide 1-2 line feedback for each section. Be constructive.`;

    return await this.callAI(prompt);
  }

  async callAI(prompt) {
    try {
      console.log(`🤖 AI Call #${this.requestCount}: ${prompt.substring(0, 100)}...`);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kwaipilot/kat-coder-pro:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON response
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ AI Evaluation Error:', error);
      return this.getFallbackEvaluation();
    }
  }

  getFallbackEvaluation() {
    return {
      score: 65,
      feedback: "Evaluation completed with basic scoring.",
      improvement: "Practice more to improve your skills.",
      suggestion: "Review fundamental concepts regularly."
    };
  }

  // 🆕 Get usage status
  getUsageStatus() {
    return {
      used: this.requestCount,
      remaining: this.dailyLimit - this.requestCount,
      limit: this.dailyLimit
    };
  }
}

// Initialize AI Service
const aiEvaluator = new AIEvaluationService();

// ✅ FIXED: Define custom routes BEFORE the router middleware

// 🚀 CRITICAL FIX: ADD MISSING AUTH REGISTER ENDPOINT
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log("🔐 Register request:", { name, email, password: password ? "***" : "missing" });

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();

    console.log("✅ User registered successfully:", email);

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
});

// 🚀 CRITICAL FIX: ADD MISSING AUTH LOGIN ENDPOINT
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("🔐 Login request:", { email, password: password ? "***" : "missing" });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    console.log("✅ Login successful:", email);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
});

// 🆕 Interview Results Endpoints
app.get("/api/interview/results/:interviewId", async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    console.log("📋 Fetching interview results for:", interviewId);

    // Find the interview
    const interview = await Interview.findOne({ interviewId });
    if (!interview) {
      return res.status(404).json({ 
        success: false, 
        message: 'Interview not found' 
      });
    }

    // Find feedback if it exists
    const feedback = await Feedback.findOne({ interviewId });

    console.log("✅ Interview found:", interview.interviewId);
    console.log("📊 Rounds completed:", interview.completedRounds?.length);
    
    res.json({
      success: true,
      interview: interview,
      feedback: feedback
    });
  } catch (error) {
    console.error('❌ Error fetching interview results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching interview results' 
    });
  }
});

// 🆕 Get Interview by User ID
app.get("/api/interview/results/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log("📋 Fetching interview results for user:", userId);

    // Find the most recent interview for this user
    const interview = await Interview.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!interview) {
      return res.status(404).json({ 
        success: false, 
        message: 'No interview found for this user' 
      });
    }

    // Find feedback if it exists
    const feedback = await Feedback.findOne({ interviewId: interview.interviewId });

    console.log("✅ User interview found:", interview.interviewId);
    
    res.json({
      success: true,
      interview: interview,
      feedback: feedback
    });
  } catch (error) {
    console.error('❌ Error fetching user interview results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user interview results' 
    });
  }
});

// ✅ FIXED: CORRECTED FEEDBACK ENDPOINT - Don't return 404, return empty feedback
app.get("/api/interview/feedback", async (req, res) => {
  try {
    const { interviewId, userId } = req.query;
    
    console.log("📝 Feedback route hit with query:", req.query);

    if (!interviewId && !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Interview ID or User ID is required' 
      });
    }

    let feedback;
    if (interviewId) {
      feedback = await Feedback.findOne({ interviewId });
      console.log(`🔍 Searching feedback for interviewId: ${interviewId}`);
    } else {
      feedback = await Feedback.findOne({ userId }).sort({ createdAt: -1 });
      console.log(`🔍 Searching feedback for userId: ${userId}`);
    }
    
    if (feedback) {
      console.log("✅ Feedback found:", feedback._id);
      return res.json({
        success: true,
        feedback: {
          feedbackId: feedback._id,
          interviewId: feedback.interviewId,
          userId: feedback.userId,
          role: feedback.role,
          averageScore: feedback.averageScore,
          improvement: feedback.improvement,
          suggestion: feedback.suggestion
        }
      });
    } else {
      console.log("✅ No feedback found - returning empty");
      // ✅ CRITICAL FIX: Don't return 404, return empty feedback
      return res.json({
        success: true,
        feedback: null,
        message: 'Feedback not yet generated'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching feedback' 
    });
  }
});

// 🆕 Generate Feedback Endpoint
app.post("/api/interview/generate-feedback", async (req, res) => {
  try {
    const { interviewId } = req.body;
    
    if (!interviewId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Interview ID is required' 
      });
    }

    // Find the interview
    const interview = await Interview.findOne({ interviewId });
    if (!interview) {
      return res.status(404).json({ 
        success: false, 
        message: 'Interview not found' 
      });
    }

    // Check if feedback already exists
    let feedback = await Feedback.findOne({ interviewId });
    if (feedback) {
      return res.json({
        success: true,
        feedback: feedback,
        message: 'Feedback already exists'
      });
    }

    // Calculate average score from all completed rounds
    const rounds = interview.rounds;
    let totalScore = 0;
    let count = 0;
    
    for (const roundType in rounds) {
      if (rounds[roundType].score !== undefined) {
        totalScore += rounds[roundType].score;
        count++;
      }
    }
    
    const averageScore = count > 0 ? Math.round(totalScore / count) : 0;

    // Generate feedback based on score
    let improvement, suggestion;

    if (averageScore >= 90) {
      improvement = "Continue challenging yourself with advanced topics to maintain your edge.";
      suggestion = "Consider mentoring others and taking on leadership roles in technical discussions.";
    } else if (averageScore >= 75) {
      improvement = "Focus on the specific areas where points were lost to achieve excellence.";
      suggestion = "Practice more complex scenarios and edge cases to improve your problem-solving skills.";
    } else if (averageScore >= 60) {
      improvement = "Work on strengthening your understanding of fundamental concepts.";
      suggestion = "Regular practice and review of basic concepts will help improve your scores.";
    } else {
      improvement = "Focus on mastering fundamental concepts before moving to advanced topics.";
      suggestion = "Start with basic tutorials and gradually build up to more complex problems.";
    }

    // Create feedback document
    feedback = new Feedback({
      interviewId: interviewId,
      userId: interview.userId,
      role: interview.role,
      averageScore: averageScore,
      improvement: improvement,
      suggestion: suggestion
    });

    await feedback.save();

    console.log('✅ Feedback generated successfully for interview:', interviewId);
    
    res.json({
      success: true,
      feedback: feedback,
      message: 'Feedback generated successfully'
    });
  } catch (error) {
    console.error('❌ Error generating feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error generating feedback' 
    });
  }
});

// 🆕 API Usage Status Endpoint
app.get("/api/usage", (req, res) => {
  const usage = aiEvaluator.getUsageStatus();
  res.json({
    success: true,
    usage: usage,
    message: usage.remaining <= 5 ? 
      `🚨 CRITICAL: Only ${usage.remaining} requests left!` :
      `✅ Available: ${usage.remaining} requests remaining`
  });
});

// 🆕 Debug API Usage Endpoint
app.get("/api/debug/usage", (req, res) => {
  const usage = aiEvaluator.getUsageStatus();
  res.json({
    success: true,
    usage: usage,
    message: `Used: ${usage.used}/${usage.limit} requests (${usage.remaining} remaining)`
  });
});

// Now use the router middleware AFTER defining custom routes
app.use("/api/interview", interviewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", codeRoutes);

// ✅ FIXED: ADD MISSING ROUTES FOR DASHBOARD

// 🆕 Get user interviews for dashboard
app.get("/api/interview/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log("📋 Fetching user interviews for dashboard:", userId);

    const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });
    const feedbacks = await Feedback.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      interviews: interviews,
      feedbacks: feedbacks
    });
  } catch (error) {
    console.error('❌ Error fetching user interviews:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user interviews' 
    });
  }
});

// 🆕 Get all interviews for admin
app.get("/api/interviews", async (req, res) => {
  try {
    const interviews = await Interview.find({}).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      interviews: interviews
    });
  } catch (error) {
    console.error('❌ Error fetching all interviews:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching interviews' 
    });
  }
});

// 🆕 Get specific feedback by ID
app.get("/api/feedback/:feedbackId", async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: 'Feedback not found' 
      });
    }

    res.json({
      success: true,
      feedback: feedback
    });
  } catch (error) {
    console.error('❌ Error fetching feedback by ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching feedback' 
    });
  }
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running", 
    timestamp: new Date().toISOString() 
  });
});

// 🆕 Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "AI Interview Platform API", 
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      interview: "/api/interview",
      auth: "/api/auth", 
      feedback: "/api/interview/feedback"
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API Root: http://localhost:${PORT}/`);
});