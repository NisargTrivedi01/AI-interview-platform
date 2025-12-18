// server/controllers/interviewController.js
import axios from "axios";
import Interview from "../models/Interview.js";
import Feedback from "../models/Feedback.js";
import dotenv from "dotenv";
import {normalizeRoundType,displayRoundType} from "../utils/scoring.js";
// import { aiEvaluator } from "../server.js"; // Add this line
dotenv.config();

// 🆕 AI Evaluation Service for interviewController
class AIEvaluationService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    this.requestCount = 0;
    this.dailyLimit = 45;
  }

  checkAPILimit() {
    this.requestCount++;
    if (this.requestCount >= this.dailyLimit) {
      throw new Error(`🚨 API Limit Reached: ${this.requestCount}/${this.dailyLimit} requests used.`);
    }
    if (this.requestCount >= 40) {
      console.log(`⚠️  WARNING: ${this.requestCount}/45 requests used. Only ${45 - this.requestCount} remaining!`);
    }
    return true;
  }

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
      
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ AI Evaluation Error:', error);
      return {
        improvement: "Practice more to improve your technical skills.",
        suggestion: "Review fundamental concepts and practice regularly."
      };
    }
  }

  getUsageStatus() {
    return {
      used: this.requestCount,
      remaining: this.dailyLimit - this.requestCount,
      limit: this.dailyLimit
    };
  }
}

// Initialize AI Service for interviewController
const aiEvaluator = new AIEvaluationService();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "kwaipilot/kat-coder-pro:free";
const USE_AI = Boolean(OPENROUTER_API_KEY && OPENROUTER_MODEL);

// Configuration constants
const CONFIG = {
  TIMEOUTS: {
    GENERATION: 25000,
    GRADING: 15000
  },
  QUESTION_COUNTS: {
    APTITUDE: 20,
    TECHNICAL: 20,
    CODING: 3,
    HR: 10
  }
};

/* ------------------------
   Helper Functions
-------------------------*/

function safeParseJson(text) {
  if (!text || typeof text !== "string") return null;
  
  try { 
    return JSON.parse(text); 
  } catch (e) {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try { 
        return JSON.parse(match[0]); 
      } catch (innerError) {
        console.warn("JSON extraction failed:", innerError.message);
      }
    }
    return null;
  }
}

/**
 * 🆕 SIMPLE JSON Parser for Coding Rounds - Trust the AI Response
 */
function safeParseCodingJson(text) {
  if (!text || typeof text !== "string") return null;
  
  console.log("🔧 Processing coding round JSON...");
  
  // Step 1: Just remove markdown code blocks, DON'T remove brackets
  let cleanedText = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  console.log("🧹 Cleaned text (first 300 chars):", cleanedText.substring(0, 300));

  // Step 2: Try direct parse - the AI response is usually valid!
  try { 
    const parsed = JSON.parse(cleanedText);
    console.log("✅ Direct JSON parse successful!");
    return parsed;
  } catch (e) {
    console.warn("First parse failed:", e.message);
  }

  // Step 3: If direct parse fails, try minimal fixes
  try {
    // Just fix common issues without breaking structure
    let fixedJson = cleanedText
      .replace(/(\w+):/g, '"$1":') // Add quotes to unquoted keys
      .replace(/'/g, '"') // Single to double quotes
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .replace(/,\s*}/g, '}'); // Remove trailing commas in objects

    const parsed = JSON.parse(fixedJson);
    console.log("✅ Fixed JSON parse successful!");
    return parsed;
  } catch (finalError) {
    console.warn("Final parse failed:", finalError.message);
    return null;
  }
  // Step 3: Advanced JSON extraction and repair
  try {
    // Find the start of JSON array
    const arrayStart = cleanedText.indexOf('[');
    if (arrayStart === -1) {
      console.warn("❌ No JSON array found");
      return null;
    }

    let jsonString = cleanedText.substring(arrayStart);
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let result = '';

    // 🆕 IMPROVED: Build valid JSON character by character
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        result += char;
        continue;
      }

      if (!inString) {
        if (char === '[') {
          bracketCount++;
          result += char;
        } else if (char === ']') {
          bracketCount--;
          result += char;
          if (bracketCount === 0) {
            // Found complete array
            break;
          }
        } else if (char === '{') {
          bracketCount++;
          result += char;
        } else if (char === '}') {
          bracketCount--;
          result += char;
        } else {
          result += char;
        }
      } else {
        result += char;
      }

      // Safety limit
      if (i > 5000) {
        console.warn("❌ JSON parsing safety limit reached");
        break;
      }
    }

    // 🆕 FIX: Complete any incomplete objects
    let fixedJson = result;
    
    // Fix unclosed objects and arrays
    let openBraces = (fixedJson.match(/{/g) || []).length;
    let closeBraces = (fixedJson.match(/}/g) || []).length;
    let openBrackets = (fixedJson.match(/\[/g) || []).length;
    let closeBrackets = (fixedJson.match(/\]/g) || []).length;

    // Add missing closing braces
    while (openBraces > closeBraces) {
      fixedJson += '}';
      closeBraces++;
    }

    // Add missing closing brackets
    while (openBrackets > closeBrackets) {
      fixedJson += ']';
      closeBrackets++;
    }

    // 🆕 FIX: Complete incomplete strings and add commas
    fixedJson = fixedJson
      .replace(/"\s*,\s*"/g, '","') // Fix comma issues
      .replace(/"\s*}\s*{/g, '"},{') // Add commas between objects
      .replace(/"\s*}\s*]/g, '"}]') // Close array properly
      .replace(/"\s*,\s*]/g, '"]') // Remove trailing commas in arrays
      .replace(/"\s*,\s*}/g, '"}') // Remove trailing commas in objects
      .replace(/(\w+):/g, '"$1":') // Add quotes to unquoted keys
      .replace(/'/g, '"') // Replace single quotes with double quotes
      .replace(/"\s*$/g, '"') // Complete unclosed strings at end
      .replace(/,\s*$/g, ''); // Remove trailing commas

    console.log("🔧 Fixed JSON:", fixedJson.substring(0, 300) + "...");

    // Try to parse the fixed JSON
    try {
      const parsed = JSON.parse(fixedJson);
      console.log("✅ Advanced JSON repair successful");
      return parsed;
    } catch (finalError) {
      console.warn("❌ Final JSON parse failed:", finalError.message);
      
      // 🆕 LAST RESORT: Try to extract individual objects and build array manually
      const objectMatches = fixedJson.match(/{[^{}]*}/g) || [];
      if (objectMatches.length > 0) {
        console.log(`🔄 Manual object extraction: ${objectMatches.length} objects found`);
        
        const manualObjects = [];
        for (const match of objectMatches) {
          try {
            const obj = JSON.parse(match);
            if (obj && typeof obj === 'object') {
              manualObjects.push(obj);
            }
          } catch (e) {
            // Skip invalid objects
          }
        }
        
        if (manualObjects.length > 0) {
          console.log(`✅ Manual extraction successful: ${manualObjects.length} valid objects`);
          return manualObjects;
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error("❌ Advanced JSON processing failed:", error.message);
    return null;
  }
}

async function makeOpenRouterCall(prompt, maxTokens, timeout = CONFIG.TIMEOUTS.GENERATION) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("No OpenRouter API key configured");
  }

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7
    },
    {
      headers: { 
        Authorization: `Bearer ${OPENROUTER_API_KEY}`, 
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Interview Platform"
      },
      timeout
    }
  );

  return response.data?.choices?.[0]?.message?.content;
}

async function generateQuestionsWithAI(prompt, fallbackGenerator, role, maxTokens, sliceCount) {
  try {
    if (!USE_AI) {
      console.log("⚠️ AI disabled - using fallback questions");
      return fallbackGenerator(role);
    }

    const rawContent = await makeOpenRouterCall(prompt, maxTokens);
    
    // 🆕 USE ORIGINAL PARSER FOR ALL ROUNDS EXCEPT CODING
    // (Coding round now handles its own parsing)
    const parsed = safeParseJson(rawContent);
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, sliceCount);
    }
    
    console.warn("AI response parsing failed, using fallback");
    return fallbackGenerator(role);
  } catch (error) {
    console.error("AI question generation failed:", error.message);
    return fallbackGenerator(role);
  }
}

/* ------------------------
   Question Generation Functions
-------------------------*/

async function generateAptitudeRound(role) {
  const prompt = `Generate ${CONFIG.QUESTION_COUNTS.APTITUDE} aptitude MCQ questions (basic math, logic, and English grammar) in JSON format. 
  Return only JSON array: [{"type":"mcq","question":"...","options":["A","B","C","D"],"answer":"A"}] where answer is the correct option letter (A, B, C, or D)`;
  
  return generateQuestionsWithAI(
    prompt, 
    generateFallbackAptitudeQuestions, 
    role, 
    4000, 
    CONFIG.QUESTION_COUNTS.APTITUDE
  );
}

async function generateCodingRound(role) {
  const prompt = `Generate exactly ${CONFIG.QUESTION_COUNTS.CODING} coding problems for a ${role} position.

IMPORTANT: Return ONLY valid JSON array with this exact structure:

[
  {
    "type": "coding",
    "title": "Problem Title",
    "description": "Clear problem description",
    "difficulty": "easy/medium/hard",
    "testCases": [
      {"input": "example input", "expected": "expected output"}
    ]
  }
]

Rules:
- Use double quotes only
- No markdown code blocks
- No extra text outside JSON
- Valid JSON format only

Generate exactly ${CONFIG.QUESTION_COUNTS.CODING} problems for ${role}:`;

  try {
  if (!USE_AI) {
    console.log("⚠️ AI disabled - using fallback coding questions");
    return generateFallbackCodingQuestions(role);
  }

  const rawContent = await makeOpenRouterCall(prompt, 4000);
  
  // 🆕 DEBUG: Log raw AI response
  console.log("🤖 RAW AI RESPONSE:", rawContent);
  console.log("🤖 RAW RESPONSE LENGTH:", rawContent?.length);
  console.log("🤖 RAW RESPONSE TYPE:", typeof rawContent);
  
  // USE CODING-SPECIFIC PARSER ONLY FOR CODING ROUND
  const parsed = safeParseCodingJson(rawContent);
  
  if (Array.isArray(parsed) && parsed.length > 0) {
    console.log(`✅ Coding AI response parsed: ${parsed.length} questions`);
    return parsed.slice(0, CONFIG.QUESTION_COUNTS.CODING);
  }
  
  console.warn("❌ Coding AI response parsing failed, using fallback");
  return generateFallbackCodingQuestions(role);
} catch (error) {
  console.error("❌ Coding AI question generation failed:", error.message);
  return generateFallbackCodingQuestions(role);
}
}
async function generateTechnicalRound(role) {
  const prompt = `Generate ${CONFIG.QUESTION_COUNTS.TECHNICAL} technical questions for ${role} role. Mix of MCQ and text questions. 
  Return JSON array: [{"type":"mcq/text","question":"...","options":["A","B","C","D"] if mcq,"answer":"correct answer"}]`;
  
  return generateQuestionsWithAI(
    prompt,
    generateFallbackTechnicalQuestions,
    role,
    4000,
    CONFIG.QUESTION_COUNTS.TECHNICAL
  );
}

async function generateHrRound(role) {
  const prompt = `Generate ${CONFIG.QUESTION_COUNTS.HR} HR behavioral questions for ${role} role focusing on teamwork, problem-solving, and experience. 
  Return JSON array: [{"type":"text","question":"..."}]`;
  
  return generateQuestionsWithAI(
    prompt,
    generateFallbackHrQuestions,
    role,
    2000,
    CONFIG.QUESTION_COUNTS.HR
  );
}

/* ------------------------
   SCORING LOGIC FUNCTIONS - FIXED
-------------------------*/

/**
 * 🎯 APTITUDE ROUND SCORING: MCQ-based, exact answer matching
 */
function scoreAptitudeRound(questions = [], answers = {}) {
  if (!questions.length || !answers) return 0;

  let correctCount = 0;
  const totalMcqQuestions = questions.filter(q => q.type === "mcq").length;

  if (totalMcqQuestions === 0) return 0;

  questions.forEach((question, index) => {
    if (question.type !== "mcq") return;

    const userAnswer = answers[index] ?? answers[String(index)];
    const correctAnswer = question.answer;
    const options = question.options || [];

    console.log(`🔍 Aptitude Q${index}: User: "${userAnswer}", Correct: "${correctAnswer}", Options:`, options);

    if (userAnswer && correctAnswer && options.length > 0) {
      // 🆕 IMPROVED: Find which option letter the user selected
      const userOptionIndex = options.findIndex(opt => String(opt).trim() === String(userAnswer).trim());
      const userOptionLetter = userOptionIndex >= 0 ? String.fromCharCode(65 + userOptionIndex) : null;
      
      if (userOptionLetter && String(userOptionLetter).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
        correctCount++;
        console.log(`✅ Aptitude Q${index} Correct!`);
      } else {
        console.log(`❌ Aptitude Q${index} Wrong - User: ${userOptionLetter}, Correct: ${correctAnswer}`);
      }
    }
  });

  const score = Math.round((correctCount / totalMcqQuestions) * 100);
  console.log(`📊 Aptitude Score: ${correctCount}/${totalMcqQuestions} = ${score}%`);
  return score;
}
/**
 * 🎯 CODING ROUND SCORING: Uses clientScore from frontend execution
 */
function scoreCodingRound(clientScore = null) {
  if (clientScore === null || clientScore === undefined) return 0;
  return Math.max(0, Math.min(100, Math.round(clientScore)));
}

/**
 * 🎯 TECHNICAL ROUND SCORING: Mixed MCQ and Text answers
 */
async function scoreTechnicalRound(questions = [], answers = {}, role = "") {
  if (!questions.length || !answers) return 0;

  let mcqCorrect = 0;
  let mcqTotal = 0;
  let textScores = [];

  console.log(`🔍 Scoring ${questions.length} technical questions`);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const userAnswer = answers[i] ?? answers[String(i)];

    if (question.type === "mcq") {
      mcqTotal++;
      const correctAnswer = question.answer;
      
      if (userAnswer && correctAnswer) {
        if (String(userAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
          mcqCorrect++;
        }
      }
    } 
    else if (question.type === "text") {
      if (userAnswer && userAnswer.trim() !== "") {
        try {
          const textScore = await evaluateTextAnswer(question.question, userAnswer, question.answer, role);
          textScores.push(textScore);
        } catch (error) {
          console.error("Text evaluation failed:", error);
          textScores.push(50);
        }
      } else {
        textScores.push(0);
      }
    }
  }

  const mcqScore = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;
  const textScore = textScores.length > 0 ? 
    Math.round(textScores.reduce((sum, score) => sum + score, 0) / textScores.length) : 0;

  const totalQuestions = mcqTotal + textScores.length;
  if (totalQuestions === 0) return 0;

  const finalScore = Math.round((mcqScore * mcqTotal + textScore * textScores.length) / totalQuestions);
  console.log(`📊 Technical Scoring: MCQ=${mcqScore}% (${mcqCorrect}/${mcqTotal}), Text=${textScore}%, Final=${finalScore}%`);
  
  return finalScore;
}

/**
 * 🎯 HR ROUND SCORING: AI evaluation of behavioral answers
 */
async function scoreHrRound(questions = [], answers = {}, role = "") {
  if (!questions.length || !answers) return 0;

  let scores = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const userAnswer = answers[i] ?? answers[String(i)];

    if (question.type === "text") {
      if (userAnswer && userAnswer.trim() !== "") {
        try {
          const score = await evaluateBehavioralAnswer(question.question, userAnswer, role);
          scores.push(score);
        } catch (error) {
          console.error("HR answer evaluation failed:", error);
          scores.push(60);
        }
      } else {
        scores.push(0);
      }
    }
  }

  return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

/**
 * 🤖 AI Evaluation for Text Answers
 */
async function evaluateTextAnswer(question, userAnswer, modelAnswer, role) {
  if (!USE_AI) {
    // Fallback scoring
    const answerLength = userAnswer.length;
    const hasKeywords = checkTechnicalKeywords(userAnswer, role);
    
    if (answerLength < 10) return 20;
    if (answerLength < 30) return 40;
    if (answerLength < 60) return hasKeywords ? 70 : 50;
    return hasKeywords ? 85 : 65;
  }

  try {
    const prompt = `
      Evaluate this technical interview answer (0-100 score):
      
      Question: ${question}
      Role: ${role}
      User's Answer: ${userAnswer}
      ${modelAnswer ? `Model Answer: ${modelAnswer}` : ''}
      
      Score based on technical accuracy, relevance, and completeness.
      Return ONLY JSON: {"score": number}
    `;
    
    const response = await makeOpenRouterCall(prompt, 500, CONFIG.TIMEOUTS.GRADING);
    const parsed = safeParseJson(response);
    
    if (parsed && typeof parsed.score === "number") {
      return Math.max(0, Math.min(100, parsed.score));
    }
    
    return 60;
  } catch (error) {
    console.error("AI text evaluation failed:", error);
    return 50;
  }
}

/**
 * 🤖 AI Evaluation for Behavioral Answers
 */
async function evaluateBehavioralAnswer(question, userAnswer, role) {
  if (!USE_AI) {
    // Fallback scoring
    const answerLength = userAnswer.length;
    const hasBehavioralIndicators = checkBehavioralKeywords(userAnswer);
    
    if (answerLength < 20) return 30;
    if (answerLength < 50) return hasBehavioralIndicators ? 65 : 45;
    return hasBehavioralIndicators ? 80 : 60;
  }

  try {
    const prompt = `
      Evaluate this behavioral HR answer (0-100 score):
      
      Question: ${question}
      Role: ${role}
      User's Answer: ${userAnswer}
      
      Score based on relevance, STAR method, and communication.
      Return ONLY JSON: {"score": number}
    `;
    
    const response = await makeOpenRouterCall(prompt, 500, CONFIG.TIMEOUTS.GRADING);
    const parsed = safeParseJson(response);
    
    if (parsed && typeof parsed.score === "number") {
      return Math.max(0, Math.min(100, parsed.score));
    }
    
    return 65;
  } catch (error) {
    console.error("AI behavioral evaluation failed:", error);
    return 60;
  }
}

function checkTechnicalKeywords(answer, role) {
  const technicalTerms = {
    "data analyst": ["sql", "python", "excel", "tableau", "power bi", "analysis", "visualization", "statistics"],
    "frontend": ["javascript", "react", "vue", "angular", "css", "html"],
    "backend": ["node", "python", "java", "database", "api", "server"],
    "full stack": ["frontend", "backend", "database", "api", "deployment"],
    "software developer": ["programming", "code", "development", "debugging", "testing"],
    "devops engineer": ["docker", "kubernetes", "ci/cd", "aws", "azure", "infrastructure", "deployment"]
  };

  const roleKey = Object.keys(technicalTerms).find(key => role.toLowerCase().includes(key)) || "software developer";
  const terms = technicalTerms[roleKey];
  
  return terms.some(term => answer.toLowerCase().includes(term));
}

function checkBehavioralKeywords(answer) {
  const behavioralIndicators = [
    "team", "leadership", "problem", "solution", "challenge", "success", 
    "learn", "improve", "collaborat", "communicat", "achieve", "result"
  ];
  
  return behavioralIndicators.some(term => answer.toLowerCase().includes(term));
}

/* ------------------------
   Fallback Question Generators
-------------------------*/

function generateFallbackAptitudeQuestions() {
  return Array.from({ length: CONFIG.QUESTION_COUNTS.APTITUDE }, (_, i) => ({
    type: "mcq",
    question: `Aptitude Question ${i + 1}: What is ${i + 5} + ${i + 3}?`,
    options: [
      (i + 5 + i + 3).toString(),
      (i + 10).toString(), 
      (i * 2).toString(), 
      "None"
    ],
    answer: "A"
  }));
}

function generateFallbackCodingQuestions(role = "") {
  const roleLower = role.toLowerCase();
  
  // Frontend-specific questions
  if (roleLower.includes('frontend')) {
    return [
      {
        type: "coding",
        title: "DOM Element Toggler",
        description: "Create a function that toggles the visibility of a DOM element by its ID.",
        difficulty: "easy",
        testCases: [
          { input: "toggleElement('myDiv')", expected: "Element toggled" }
        ]
      },
      {
        type: "coding",
        title: "Form Validation",
        description: "Write a function that validates an email input and returns true if valid, false otherwise.",
        difficulty: "medium", 
        testCases: [
          { input: "test@example.com", expected: true },
          { input: "invalid-email", expected: false }
        ]
      },
      {
        type: "coding",
        title: "API Data Fetcher",
        description: "Create a function that fetches data from a REST API and returns the parsed JSON.",
        difficulty: "medium",
        testCases: [
          { input: "https://api.example.com/data", expected: "Data fetched successfully" }
        ]
      }
    ];
  }
  
  // Backend-specific questions  
  if (roleLower.includes('backend')) {
    return [
      {
        type: "coding", 
        title: "REST API Endpoint",
        description: "Create a function that handles a GET request and returns JSON data.",
        difficulty: "easy",
        testCases: [
          { input: "/api/users", expected: "User data returned" }
        ]
      },
      {
        type: "coding",
        title: "Database Query",
        description: "Write a function that queries a database and returns specific user data.",
        difficulty: "medium",
        testCases: [
          { input: "user_id=123", expected: "User data retrieved" }
        ]
      },
      {
        type: "coding",
        title: "Authentication Middleware",
        description: "Create a middleware function that verifies JWT tokens.",
        difficulty: "hard", 
        testCases: [
          { input: "valid_token", expected: "User authenticated" },
          { input: "invalid_token", expected: "Authentication failed" }
        ]
      }
    ];
  }

  // Default coding questions
  return [
    {
      type: "coding",
      title: "Reverse String",
      description: "Write a function that reverses a string without using built-in reverse methods.",
      difficulty: "easy",
      testCases: [
        { input: "hello", expected: "olleh" },
        { input: "world", expected: "dlrow" }
      ]
    },
    {
      type: "coding", 
      title: "Find Maximum",
      description: "Find the maximum number in an array without using Math.max.",
      difficulty: "easy",
      testCases: [
        { input: [1, 5, 3, 9, 2], expected: 9 },
        { input: [-1, -5, -3], expected: -1 }
      ]
    },
    {
      type: "coding",
      title: "Two Sum",
      description: "Given an array of integers and a target, find two numbers that add up to the target.",
      difficulty: "medium",
      testCases: [
        { input: { array: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
        { input: { array: [3, 2, 4], target: 6 }, expected: [1, 2] }
      ]
    }
  ];
}

function generateFallbackTechnicalQuestions(role) {
  return Array.from({ length: CONFIG.QUESTION_COUNTS.TECHNICAL }, (_, i) => ({
    type: i % 2 === 0 ? "mcq" : "text",
    question: `Technical Question ${i + 1} for ${role}: ${i % 2 === 0 ? 'What is the time complexity of binary search?' : 'Explain the concept of inheritance in OOP.'}`,
    options: i % 2 === 0 ? ["O(log n)", "O(n)", "O(n²)", "O(1)"] : undefined,
    answer: i % 2 === 0 ? "A" : `Inheritance allows a class to inherit properties and methods from another class, promoting code reusability.`
  }));
}

function generateFallbackHrQuestions(role) {
  const hrQuestions = [
    "Tell me about yourself and your experience.",
    "Why are you interested in this role?",
    "Describe a challenging project you worked on and how you handled it.",
    "How do you handle feedback and criticism?",
    "Where do you see yourself in 5 years?",
    "Describe a time you had to work in a team under pressure.",
    "How do you prioritize your tasks when managing multiple projects?",
    "What is your greatest strength and weakness?",
    "Why should we hire you for this position?",
    "Do you have any questions for us?"
  ];

  return hrQuestions.slice(0, CONFIG.QUESTION_COUNTS.HR).map(question => ({
    type: "text",
    question: `${question} (${role} role)`
  }));
}

/* ===================================================================
   Core Controller Functions - 100% WORKING FINAL VERSION
=================================================================== */

export const startInterview = async (req, res) => {
  try {
    const { userId, role, roundType, selectedRounds = [], forceNew = false } = req.body;    
    if (!userId || !role || !roundType) {
      return res.status(400).json({ 
        success: false, 
        message: "userId, role, and roundType are required" 
      });
    }

    const normalizedRoundType = normalizeRoundType(roundType);
    const normalizedSelectedRounds = Array.isArray(selectedRounds) 
      ? selectedRounds.map(round => normalizeRoundType(round))
      : [normalizedRoundType];

    // Generate unique interviewId
    const generatedInterviewId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 Starting Interview | User: ${userId} | Role: ${role} | Round: ${normalizedRoundType}`);

    // Find active interview or create new one
    let interview = null;
    if (!forceNew) {
      interview = await Interview.findOne({ 
        userId, 
        status: { $in: ["active", "pending"] }
      });
    }

    if (!interview || forceNew) {
      console.log("🆕 Creating New Interview Session (forced)");
      
      interview = new Interview({
        interviewId: generatedInterviewId,
        userId,
        role,
        selectedRounds: normalizedSelectedRounds,
        status: "active",
        startTime: new Date(),
        overall: {
          averageScore: 0,
          status: "In Progress"
        },
        rounds: {
          [normalizedRoundType]: {
            questions: [],
            answers: [],
            score: 0,
            status: 'pending',
            startedAt: new Date()
          }
        }
      });

      await interview.save();
      console.log("✅ New interview created with ID:", generatedInterviewId);
    } else {
      console.log("♻️ Existing Interview Found — Continuing");
      
      // 🎯 CRITICAL FIX: Use findOneAndUpdate to avoid version conflicts
      const allRounds = [...new Set([...interview.selectedRounds, ...normalizedSelectedRounds])];
      
      const updateResult = await Interview.findOneAndUpdate(
        { _id: interview._id },
        { 
          $set: { 
            selectedRounds: allRounds,
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );
      
      interview = updateResult;
      console.log("✅ Interview updated without version conflict");
    }

    // Check if questions already exist for this round
    if (normalizedRoundType === 'coding') {
      console.log(`🔄 Forcing new question generation for coding round`);
    } else {
      // For other rounds, use cached questions if they exist
      const existingQuestions = interview.rounds?.[normalizedRoundType]?.questions;
      if (existingQuestions?.length) {
        console.log(`📦 Returning Cached Questions for ${normalizedRoundType}`);
        
        return res.json({
          success: true,
          message: `${displayRoundType(normalizedRoundType)} Questions Ready`,
          questions: existingQuestions,
          interviewId: interview.interviewId,
          roundType: normalizedRoundType
        });
      }
    }

    // Generate new questions based on round type
    console.log(`🤖 Generating ${normalizedRoundType} questions for ${role}`);
    
    const questionGenerators = {
      aptitude: generateAptitudeRound,
      coding: generateCodingRound,
      technical: generateTechnicalRound,
      hr: generateHrRound
    };

    const generator = questionGenerators[normalizedRoundType];
    if (!generator) {
      return res.status(400).json({
        success: false,
        message: `Unsupported round type: ${normalizedRoundType}`
      });
    }

    const generatedQuestions = await generator(role);
    console.log(`✅ Generated ${generatedQuestions?.length} questions`);

    // 🎯 CRITICAL FIX: Use findOneAndUpdate to save questions (avoid version conflicts)
    const updatedInterview = await Interview.findOneAndUpdate(
      { _id: interview._id },
      { 
        $set: { 
          [`rounds.${normalizedRoundType}.questions`]: generatedQuestions,
          [`rounds.${normalizedRoundType}.status`]: 'in-progress',
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );
    
    console.log(`💾 ${normalizedRoundType} questions saved successfully without version conflict`);

    return res.json({
      success: true,
      message: `${displayRoundType(normalizedRoundType)} Questions Ready`,
      questions: generatedQuestions,
      interviewId: interview.interviewId,
      roundType: normalizedRoundType
    });

  } catch (error) {
    console.error("❌ startInterview Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to start interview", 
      error: error.message 
    });
  }
};

export const submitInterview = async (req, res) => {
  try {
    const { interviewId, userId, roundType, answers = {}, clientScore = null } = req.body;
    
    if (!roundType) {
      return res.status(400).json({ 
        success: false, 
        message: "roundType is required" 
      });
    }

    const normalizedRoundType = normalizeRoundType(roundType);
    console.log("📥 Submission received:", { 
      interviewId, 
      userId, 
      roundType: normalizedRoundType,
      answersCount: Object.keys(answers).length 
    });

    // 🎯 CRITICAL FIX: Find interview with proper query
    let interview = null;
    if (interviewId) {
      interview = await Interview.findOne({ interviewId });
    }
    if (!interview && userId) {
      interview = await Interview.findOne({ 
        userId, 
        status: { $in: ["active", "pending"] }
      }).sort({ createdAt: -1 });
    }
    if (!interview) {
      console.log("❌ Interview not found");
      return res.status(404).json({ 
        success: false, 
        message: "Interview not found" 
      });
    }

    console.log("✅ Interview found:", interview.interviewId);
    console.log("📋 Interview rounds keys:", Object.keys(interview.rounds || {}));

    // 🎯 CRITICAL FIX: Check if round exists and has questions
    if (!interview.rounds || !interview.rounds[normalizedRoundType] || !interview.rounds[normalizedRoundType].questions) {
      console.log(`❌ No questions found for ${normalizedRoundType} round`);
      console.log(`🔍 Available rounds:`, Object.keys(interview.rounds || {}));
      
      return res.status(400).json({
        success: false,
        message: `No questions found for ${normalizedRoundType} round. Please start the round again.`
      });
    }

    // 🎯 SAFELY get questions
    const questions = interview.rounds[normalizedRoundType].questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      console.log("❌ Empty or invalid questions array");
      return res.status(400).json({
        success: false,
        message: "No questions available for scoring. Please restart the interview."
      });
    }

    console.log(`✅ Found ${questions.length} questions for ${normalizedRoundType} round`);

    // 🎯 CALCULATE SCORE BASED ON ROUND TYPE
    let finalScore = 0;
    console.log(`🔍 Starting evaluation for ${questions.length} ${normalizedRoundType} questions`);

    switch (normalizedRoundType) {
      case "aptitude":
        finalScore = scoreAptitudeRound(questions, answers);
        console.log(`✅ Aptitude Score: ${finalScore}%`);
        break;

      case "coding":
        finalScore = scoreCodingRound(clientScore);
        console.log(`✅ Coding Score: ${finalScore}%`);
        break;

      case "technical":
        // 🆕 ULTRA FAST TECHNICAL SCORING - 2-second maximum
        let correct = 0;
        let total = questions.length;
        
        console.log(`⚡ ULTRA FAST evaluation for ${total} questions`);
        
        // Simple loop - no complex logic
        for (let i = 0; i < total; i++) {
          const q = questions[i];
          const userAns = String(answers[i] || '').trim().toUpperCase();
          const correctAns = String(q.answer || '').trim().toUpperCase();
          
          if (q.type === "mcq" && userAns && correctAns && userAns === correctAns) {
            correct++;
          } else if (q.type === "text" && userAns && userAns.length > 5) {
            correct += 0.3; // 30% for attempting text questions
          }
        }
        
        finalScore = Math.round((correct / total) * 100);
        console.log(`✅ ULTRA FAST Score: ${finalScore}%`);
        break;
        
      case "hr":
        // Enhanced HR scoring with fallback
        let hrScore = 0;
        for (let i = 0; i < questions.length; i++) {
          const userAnswer = answers[i] || 'No answer provided';
          const keywordScore = evaluateByKeywords("behavioral communication teamwork problem solving", userAnswer);
          console.log(`🔧 HR question ${i} score: ${keywordScore}`);
          hrScore += keywordScore;
        }
        finalScore = Math.round(hrScore / questions.length);
        console.log(`✅ HR Score: ${finalScore}%`);
        break;

      default:
        console.warn(`⚠️ Unknown round type: ${normalizedRoundType}`);
        finalScore = 0;
    }

    // 🎯 CRITICAL FIX: Calculate overall score BEFORE updating
    const completedRounds = [...new Set([...(interview.completedRounds || []), normalizedRoundType])];
    const roundScores = [];

    // Add current round score
    roundScores.push(finalScore);

    // Add scores from other completed rounds
    Object.keys(interview.rounds || {}).forEach(round => {
      if (round !== normalizedRoundType && 
          interview.rounds[round] && 
          interview.rounds[round].score !== undefined) {
        roundScores.push(interview.rounds[round].score);
      }
    });

    const averageScore = roundScores.length > 0 
      ? Math.round(roundScores.reduce((sum, score) => sum + score, 0) / roundScores.length)
      : finalScore;

    console.log(`📊 Score calculation: ${roundScores.length} rounds | Average: ${averageScore}%`);

    // 🎯 CRITICAL FIX: Use proper update data structure
    const updateData = {
      $set: {
        [`rounds.${normalizedRoundType}.answers`]: answers,
        [`rounds.${normalizedRoundType}.score`]: finalScore,
        [`rounds.${normalizedRoundType}.submittedAt`]: new Date(),
        [`rounds.${normalizedRoundType}.status`]: 'completed',
        updatedAt: new Date(),
        overallScore: averageScore,
        "overall.averageScore": averageScore
      },
      $addToSet: { completedRounds: normalizedRoundType }
    };

    // 🎯 CHECK IF ALL ROUNDS ARE COMPLETED
    const allSelectedRounds = interview.selectedRounds || [];
    const allRoundsCompleted = completedRounds.length >= allSelectedRounds.length;

    console.log(`🎯 Completion: ${completedRounds.length}/${allSelectedRounds.length} rounds | All Done: ${allRoundsCompleted}`);

    if (allRoundsCompleted) {
      updateData.$set.status = "completed";
      updateData.$set.endTime = new Date();
      updateData.$set["overall.status"] = "Completed";
      
      console.log("🎉 All rounds completed! Generating feedback...");
    } else {
      updateData.$set["overall.status"] = "In Progress";
    }

    // 🎯 UPDATE INTERVIEW
    const updatedInterview = await Interview.findOneAndUpdate(
      { _id: interview._id },
      updateData,
      { new: true, runValidators: true }
    );

    // 🎯 GENERATE FEEDBACK ONLY IF ALL ROUNDS COMPLETED
    if (allRoundsCompleted) {
      try {
        console.log("🎯 Starting feedback generation for completed interview...");
        
        // Check if feedback already exists to avoid duplicates
        const existingFeedback = await Feedback.findOne({ interviewId: interview.interviewId });
        if (existingFeedback) {
          console.log("✅ Feedback already exists, skipping generation");
        } else {
          let feedback;
          
          try {
            // Try AI feedback first
            console.log("🤖 Attempting AI feedback generation...");
            const roundScoresForFeedback = {};
            Object.entries(updatedInterview.rounds).forEach(([round, data]) => {
              if (data.score !== undefined) {
                roundScoresForFeedback[round] = data.score;
              }
            });
            
            // Make sure aiEvaluator exists before using it
            if (typeof aiEvaluator?.generateOverallFeedback === 'function') {
              const aiFeedback = await aiEvaluator.generateOverallFeedback(updatedInterview, roundScoresForFeedback);
              feedback = new Feedback({
                feedbackId: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                interviewId: updatedInterview.interviewId,
                userId: updatedInterview.userId,
                role: updatedInterview.role,
                averageScore: averageScore,
                improvement: aiFeedback.improvement || getImprovementSuggestions(averageScore),
                suggestion: aiFeedback.suggestion || getGeneralSuggestion(updatedInterview.role)
              });
              console.log("✅ AI feedback generated successfully");
            } else {
              throw new Error("AI evaluator not available");
            }
          } catch (aiError) {
            console.warn("❌ AI feedback failed, using basic feedback:", aiError.message);
            // Fallback to basic feedback
            feedback = await generateBasicFeedback(updatedInterview);
          }
          
          await feedback.save();
          console.log("✅ Feedback saved successfully");
        }
      } catch (feedbackError) {
        console.error("❌ Feedback generation failed:", feedbackError.message);
        // Don't fail the whole request if feedback generation fails
      }
    }

    console.log("💾 Interview submission saved successfully");

    return res.json({
      success: true,
      message: `${displayRoundType(normalizedRoundType)} submitted successfully`,
      score: finalScore,
      averageScore: averageScore,
      interviewId: interview.interviewId,
      completedAll: allRoundsCompleted
    });

  } catch (error) {
    console.error("❌ submitInterview error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to submit interview", 
      error: error.message 
    });
  }
};

/**
 * 🎯 Generate Basic Feedback - 100% RELIABLE
 */
async function generateBasicFeedback(interview) {
  const roundsData = Object.entries(interview.rounds)
    .filter(([_, roundData]) => roundData && roundData.score !== null)
    .map(([roundName, roundData]) => ({
      round: roundName,
      score: roundData.score
    }));

  const averageScore = interview.overall.averageScore;

  // Generate unique feedbackId to prevent duplicates
  const feedbackId = `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Feedback({
    feedbackId: feedbackId,
    interviewId: interview.interviewId,
    userId: interview.userId,
    role: interview.role,
    averageScore: averageScore,
    improvement: getImprovementSuggestions(averageScore),
    suggestion: getGeneralSuggestion(interview.role)
    // Removed finalFeedback field
  });
}

/**
 * 🎯 Improved fallback evaluation using keyword matching
 */
function evaluateByKeywords(correctAnswer, userAnswer, question = "") {
  if (!userAnswer || userAnswer.toLowerCase() === 'no answer provided') return 0;
  
  const user = userAnswer.toLowerCase().trim();
  
  // Handle very short or non-serious answers
  if (user.length < 3) return 0;
  if (user === 'dont know' || user === "don't know" || user === 'no') return 10;
  if (user === 'yes' || user === 'yess' || user === 'yesss') return 20;
  
  const correct = correctAnswer.toLowerCase();
  const questionText = question.toLowerCase();
  
  // Extract important keywords from correct answer and question
  const importantWords = [
    ...correct.split(/\s+/).filter(word => word.length > 3),
    ...questionText.split(/\s+/).filter(word => word.length > 3 && !['what', 'how', 'why', 'explain', 'describe', 'difference'].includes(word))
  ];
  
  // Remove duplicates
  const uniqueWords = [...new Set(importantWords)];
  
  let matches = 0;
  uniqueWords.forEach(word => {
    if (user.includes(word)) {
      matches++;
    }
  });
  
  // Calculate score based on keyword matches and answer length
  const keywordScore = Math.min(80, (matches / Math.max(1, uniqueWords.length)) * 80);
  const lengthBonus = Math.min(20, (user.length / 200) * 20); // More generous length bonus
  
  const totalScore = Math.round(keywordScore + lengthBonus);
  console.log(`📊 Fallback scoring: ${matches}/${uniqueWords.length} keywords = ${keywordScore}% + length ${lengthBonus}% = ${totalScore}%`);
  
  return Math.min(85, totalScore); // Cap at 85% for fallback
}
/* ------------------------
   Helper Functions for Feedback
-------------------------*/

function getImprovementSuggestions(score) {
  if (score >= 90) return "Excellent performance! Maintain your consistency and consider advanced topics.";
  if (score >= 75) return "Strong performance. Focus on mastering advanced concepts and edge cases.";
  if (score >= 60) return "Good foundation. Practice more problems and review core concepts thoroughly.";
  return "Needs significant improvement. Focus on fundamentals and regular practice.";
}

function getGeneralSuggestion(role) {
  const suggestions = {
    "data analyst": "Practice SQL queries, data visualization tools, and statistical analysis.",
    "frontend developer": "Build responsive web applications and learn modern JavaScript frameworks.",
    "backend developer": "Focus on API design, database optimization, and system architecture.",
    "full stack developer": "Balance both frontend and backend skills, learn deployment processes.",
    "software developer": "Practice algorithms, data structures, and software design patterns.",
    "devops engineer": "Master containerization, cloud services, and CI/CD pipelines.",
    "default": "Practice regularly, build projects, and participate in coding challenges."
  };
  
  const roleKey = Object.keys(suggestions).find(key => 
    role.toLowerCase().includes(key)
  ) || "default";
  
  return suggestions[roleKey];
}

// Removed getPerformanceSummary function since it's no longer needed

/* ===================================================================
   Additional Controller Functions
=================================================================== */

export const getInterviewResults = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    const interviewId = req.query.interviewId;
    
    if (!userId && !interviewId) {
      return res.status(400).json({ 
        success: false, 
        message: "userId or interviewId is required" 
      });
    }

    let interview;
    
    if (interviewId) {
      interview = await Interview.findOne({ interviewId });
    } else {
      interview = await Interview.findOne({ userId }).sort({ createdAt: -1 });
    }
    
    if (!interview) {
      return res.status(404).json({ 
        success: false, 
        message: "No interview data found" 
      });
    }

    const feedback = await Feedback.findOne({ 
      interviewId: interview.interviewId 
    });

    return res.json({
      success: true,
      interview: {
        interviewId: interview.interviewId,
        userId: interview.userId,
        role: interview.role,
        selectedRounds: interview.selectedRounds,
        completedRounds: interview.completedRounds,
        rounds: interview.rounds,
        overall: interview.overall,
        startTime: interview.startTime,
        endTime: interview.endTime,
        status: interview.status
      },
      feedback: feedback ? {
        feedbackId: feedback._id,
        averageScore: feedback.averageScore,
        improvement: feedback.improvement,
        suggestion: feedback.suggestion
        // Removed finalFeedback from response
      } : null
    });
  } catch (error) {
    console.error("❌ getInterviewResults error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch interview results", 
      error: error.message 
    });
  }
};

export const getFeedback = async (req, res) => {
  try {
    const { interviewId, userId } = req.query;
    
    let feedback;
    if (interviewId) {
      feedback = await Feedback.findOne({ interviewId });
    } else if (userId) {
      feedback = await Feedback.findOne({ userId }).sort({ feedbackGivenAt: -1 });
    }
    
    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: "Feedback not found" 
      });
    }

    res.json({
      success: true,
      feedback: {
        feedbackId: feedback._id,
        interviewId: feedback.interviewId,
        userId: feedback.userId,
        role: feedback.role,
        averageScore: feedback.averageScore,
        improvement: feedback.improvement,
        suggestion: feedback.suggestion
        // Removed finalFeedback from response
      }
    });
  } catch (error) {
    console.error("❌ getFeedback error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch feedback", 
      error: error.message 
    });
  }
};

export const getAllInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({}).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      interviews: interviews.map(interview => ({
        interviewId: interview.interviewId,
        userId: interview.userId,
        role: interview.role,
        selectedRounds: interview.selectedRounds,
        completedRounds: interview.completedRounds,
        overall: interview.overall,
        status: interview.status,
        startTime: interview.startTime,
        endTime: interview.endTime
      }))
    });
  } catch (error) {
    console.error("❌ getAllInterviews error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch interviews", 
      error: error.message 
    });
  }
};
export const resetInterviews = async (req, res) => {
  try {
    return res.json({ 
      success: false, 
      message: "Reset functionality disabled for data safety" 
    });
  } catch (error) {
    console.error("❌ resetInterviews error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Reset operation failed", 
      error: error.message 
    });
  }
};

// 🆕 ADD THE 3 NEW FUNCTIONS RIGHT HERE - AFTER resetInterviews AND BEFORE EXPORTS

// Get user progress
export const getUserProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find active interview for user
    const interview = await Interview.findOne({ 
      userId, 
      status: { $in: ['active', 'pending'] } 
    }).sort({ createdAt: -1 });
    
    if (!interview) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active interview found' 
      });
    }
    
    res.json({
      success: true,
      interview: {
        interviewId: interview.interviewId,
        userId: interview.userId,
        role: interview.role,
        status: interview.status,
        selectedRounds: interview.selectedRounds,
        completedRounds: interview.completedRounds || [],
        rounds: interview.rounds || {},
        startTime: interview.startTime,
        createdAt: interview.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get user progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user progress'
    });
  }
};

// Update user progress
export const updateUserProgress = async (req, res) => {
  try {
    const { 
      interviewId, 
      userId, 
      roundType, 
      score, 
      answers, 
      passedTests,
      status = 'in-progress' 
    } = req.body;
    
    let interview;
    
    if (interviewId) {
      interview = await Interview.findOne({ interviewId });
    } else if (userId) {
      interview = await Interview.findOne({ 
        userId, 
        status: { $in: ['active', 'pending'] } 
      }).sort({ createdAt: -1 });
    }
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Update round progress
    if (roundType) {
      interview.rounds = interview.rounds || {};
      interview.rounds[roundType] = {
        score: score || 0,
        answers: answers || {},
        passedTests: passedTests || {},
        completedAt: new Date(),
        status: status
      };
      
      // Add to completed rounds if not already there
      if (!interview.completedRounds) {
        interview.completedRounds = [];
      }
      if (!interview.completedRounds.includes(roundType)) {
        interview.completedRounds.push(roundType);
      }
    }
    
    // Update overall status
    if (status === 'completed' && interview.selectedRounds && 
        interview.completedRounds && 
        interview.completedRounds.length === interview.selectedRounds.length) {
      interview.status = 'completed';
      interview.endTime = new Date();
    }
    
    await interview.save();
    
    res.json({
      success: true,
      interview: {
        interviewId: interview.interviewId,
        status: interview.status,
        completedRounds: interview.completedRounds,
        rounds: interview.rounds
      }
    });
  } catch (error) {
    console.error('❌ Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress'
    });
  }
};

// Start new interview
export const startNewInterview = async (req, res) => {
  try {
    const { userId, role, selectedRounds } = req.body;
    
    if (!userId || !role || !selectedRounds) {
      return res.status(400).json({
        success: false,
        message: 'userId, role, and selectedRounds are required'
      });
    }
    
    // Close any existing active interviews
    await Interview.updateMany(
      { userId, status: { $in: ['active', 'pending'] } },
      { status: 'cancelled', endTime: new Date() }
    );
    
    // Create new interview
    const interviewId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const interview = new Interview({
      interviewId,
      userId,
      role,
      selectedRounds,
      status: 'active',
      startTime: new Date(),
      rounds: {},
      completedRounds: []
    });
    
    await interview.save();
    
    res.json({
      success: true,
      interview: {
        interviewId: interview.interviewId,
        userId: interview.userId,
        role: interview.role,
        selectedRounds: interview.selectedRounds,
        startTime: interview.startTime
      }
    });
  } catch (error) {
    console.error('❌ Start new interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start new interview'
    });
  }
};
export { submitInterview as submitRound };
export { getInterviewResults as getResults };

// �Add this helper function for background feedback
async function generateFeedbackInBackground(interview, averageScore) {
  try {
    console.log("🎯 Starting background feedback generation...");
    
    const existingFeedback = await Feedback.findOne({ interviewId: interview.interviewId });
    if (existingFeedback) {
      console.log("✅ Feedback already exists");
      return;
    }

    const feedback = new Feedback({
      feedbackId: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      interviewId: interview.interviewId,
      userId: interview.userId,
      role: interview.role,
      averageScore: averageScore,
      improvement: getImprovementSuggestions(averageScore),
      suggestion: getGeneralSuggestion(interview.role)
    });
    
    await feedback.save();
    console.log("✅ Background feedback saved");
  } catch (error) {
    console.log("⚠️ Background feedback error:", error.message);
  }
}

// old code 

// server/controllers/interviewController.js
// import axios from "axios";
// import Interview from "../models/Interview.js";
// import Feedback from "../models/Feedback.js";
// import dotenv from "dotenv";
// import {normalizeRoundType,displayRoundType} from "../utils/scoring.js";
// // import { aiEvaluator } from "../server.js"; // Add this line
// dotenv.config();

// // 🆕 AI Evaluation Service for interviewController
// class AIEvaluationService {
//   constructor() {
//     this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
//     this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
//     this.requestCount = 0;
//     this.dailyLimit = 45;
//   }

//   checkAPILimit() {
//     this.requestCount++;
//     if (this.requestCount >= this.dailyLimit) {
//       throw new Error(`🚨 API Limit Reached: ${this.requestCount}/${this.dailyLimit} requests used.`);
//     }
//     if (this.requestCount >= 40) {
//       console.log(`⚠️  WARNING: ${this.requestCount}/45 requests used. Only ${45 - this.requestCount} remaining!`);
//     }
//     return true;
//   }

//   async evaluateTechnicalAnswer(question, userAnswer, correctAnswer) {
//     this.checkAPILimit();
    
//     const prompt = `Evaluate this technical answer and return ONLY JSON: {"score": number, "feedback": string}

// QUESTION: ${question}
// CORRECT ANSWER: ${correctAnswer} 
// USER ANSWER: ${userAnswer}

// Score based on: Technical accuracy (0-70%), Completeness (0-30%)
// Return score 0-100. Be strict but fair.`;

//     return await this.callAI(prompt);
//   }

//   async generateOverallFeedback(interviewData, roundScores) {
//     this.checkAPILimit();
    
//     const prompt = `Generate interview feedback and return ONLY JSON: {
//       "improvement": string, 
//       "suggestion": string
//     }

// Role: ${interviewData.role}
// Rounds Completed: ${Object.keys(roundScores).join(', ')}
// Scores: ${JSON.stringify(roundScores)}

// Provide 1-2 line feedback for each section. Be constructive.`;

//     return await this.callAI(prompt);
//   }

//   async callAI(prompt) {
//     try {
//       console.log(`🤖 AI Call #${this.requestCount}: ${prompt.substring(0, 100)}...`);
      
//       const response = await fetch(this.baseURL, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${this.openRouterApiKey}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           model: 'kwaipilot/kat-coder-pro:free',
//           messages: [{ role: 'user', content: prompt }],
//           temperature: 0.3,
//           max_tokens: 500
//         })
//       });

//       if (!response.ok) {
//         throw new Error(`AI API error: ${response.statusText}`);
//       }

//       const data = await response.json();
//       const content = data.choices[0].message.content;
      
//       return JSON.parse(content);
//     } catch (error) {
//       console.error('❌ AI Evaluation Error:', error);
//       return {
//         improvement: "Practice more to improve your technical skills.",
//         suggestion: "Review fundamental concepts and practice regularly."
//       };
//     }
//   }

//   getUsageStatus() {
//     return {
//       used: this.requestCount,
//       remaining: this.dailyLimit - this.requestCount,
//       limit: this.dailyLimit
//     };
//   }
// }

// // Initialize AI Service for interviewController
// const aiEvaluator = new AIEvaluationService();
// const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
// const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "kwaipilot/kat-coder-pro:free";
// const USE_AI = Boolean(OPENROUTER_API_KEY && OPENROUTER_MODEL);

// // Configuration constants
// const CONFIG = {
//   TIMEOUTS: {
//     GENERATION: 25000,
//     GRADING: 15000
//   },
//   QUESTION_COUNTS: {
//     APTITUDE: 20,
//     TECHNICAL: 20,
//     CODING: 3,
//     HR: 10
//   }
// };

// /* ------------------------
//    Helper Functions
// -------------------------*/

// function safeParseJson(text) {
//   if (!text || typeof text !== "string") return null;
  
//   try { 
//     return JSON.parse(text); 
//   } catch (e) {
//     const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
//     if (match) {
//       try { 
//         return JSON.parse(match[0]); 
//       } catch (innerError) {
//         console.warn("JSON extraction failed:", innerError.message);
//       }
//     }
//     return null;
//   }
// }

// /**
//  * 🆕 SIMPLE JSON Parser for Coding Rounds - Trust the AI Response
//  */
// function safeParseCodingJson(text) {
//   if (!text || typeof text !== "string") return null;
  
//   console.log("🔧 Processing coding round JSON...");
  
//   // Step 1: Just remove markdown code blocks, DON'T remove brackets
//   let cleanedText = text
//     .replace(/```json/g, '')
//     .replace(/```/g, '')
//     .trim();

//   console.log("🧹 Cleaned text (first 300 chars):", cleanedText.substring(0, 300));

//   // Step 2: Try direct parse - the AI response is usually valid!
//   try { 
//     const parsed = JSON.parse(cleanedText);
//     console.log("✅ Direct JSON parse successful!");
//     return parsed;
//   } catch (e) {
//     console.warn("First parse failed:", e.message);
//   }

//   // Step 3: If direct parse fails, try minimal fixes
//   try {
//     // Just fix common issues without breaking structure
//     let fixedJson = cleanedText
//       .replace(/(\w+):/g, '"$1":') // Add quotes to unquoted keys
//       .replace(/'/g, '"') // Single to double quotes
//       .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
//       .replace(/,\s*}/g, '}'); // Remove trailing commas in objects

//     const parsed = JSON.parse(fixedJson);
//     console.log("✅ Fixed JSON parse successful!");
//     return parsed;
//   } catch (finalError) {
//     console.warn("Final parse failed:", finalError.message);
//     return null;
//   }
//   // Step 3: Advanced JSON extraction and repair
//   try {
//     // Find the start of JSON array
//     const arrayStart = cleanedText.indexOf('[');
//     if (arrayStart === -1) {
//       console.warn("❌ No JSON array found");
//       return null;
//     }

//     let jsonString = cleanedText.substring(arrayStart);
//     let bracketCount = 0;
//     let inString = false;
//     let escapeNext = false;
//     let result = '';

//     // 🆕 IMPROVED: Build valid JSON character by character
//     for (let i = 0; i < jsonString.length; i++) {
//       const char = jsonString[i];
      
//       if (escapeNext) {
//         result += char;
//         escapeNext = false;
//         continue;
//       }

//       if (char === '\\') {
//         result += char;
//         escapeNext = true;
//         continue;
//       }

//       if (char === '"' && !escapeNext) {
//         inString = !inString;
//         result += char;
//         continue;
//       }

//       if (!inString) {
//         if (char === '[') {
//           bracketCount++;
//           result += char;
//         } else if (char === ']') {
//           bracketCount--;
//           result += char;
//           if (bracketCount === 0) {
//             // Found complete array
//             break;
//           }
//         } else if (char === '{') {
//           bracketCount++;
//           result += char;
//         } else if (char === '}') {
//           bracketCount--;
//           result += char;
//         } else {
//           result += char;
//         }
//       } else {
//         result += char;
//       }

//       // Safety limit
//       if (i > 5000) {
//         console.warn("❌ JSON parsing safety limit reached");
//         break;
//       }
//     }

//     // 🆕 FIX: Complete any incomplete objects
//     let fixedJson = result;
    
//     // Fix unclosed objects and arrays
//     let openBraces = (fixedJson.match(/{/g) || []).length;
//     let closeBraces = (fixedJson.match(/}/g) || []).length;
//     let openBrackets = (fixedJson.match(/\[/g) || []).length;
//     let closeBrackets = (fixedJson.match(/\]/g) || []).length;

//     // Add missing closing braces
//     while (openBraces > closeBraces) {
//       fixedJson += '}';
//       closeBraces++;
//     }

//     // Add missing closing brackets
//     while (openBrackets > closeBrackets) {
//       fixedJson += ']';
//       closeBrackets++;
//     }

//     // 🆕 FIX: Complete incomplete strings and add commas
//     fixedJson = fixedJson
//       .replace(/"\s*,\s*"/g, '","') // Fix comma issues
//       .replace(/"\s*}\s*{/g, '"},{') // Add commas between objects
//       .replace(/"\s*}\s*]/g, '"}]') // Close array properly
//       .replace(/"\s*,\s*]/g, '"]') // Remove trailing commas in arrays
//       .replace(/"\s*,\s*}/g, '"}') // Remove trailing commas in objects
//       .replace(/(\w+):/g, '"$1":') // Add quotes to unquoted keys
//       .replace(/'/g, '"') // Replace single quotes with double quotes
//       .replace(/"\s*$/g, '"') // Complete unclosed strings at end
//       .replace(/,\s*$/g, ''); // Remove trailing commas

//     console.log("🔧 Fixed JSON:", fixedJson.substring(0, 300) + "...");

//     // Try to parse the fixed JSON
//     try {
//       const parsed = JSON.parse(fixedJson);
//       console.log("✅ Advanced JSON repair successful");
//       return parsed;
//     } catch (finalError) {
//       console.warn("❌ Final JSON parse failed:", finalError.message);
      
//       // 🆕 LAST RESORT: Try to extract individual objects and build array manually
//       const objectMatches = fixedJson.match(/{[^{}]*}/g) || [];
//       if (objectMatches.length > 0) {
//         console.log(`🔄 Manual object extraction: ${objectMatches.length} objects found`);
        
//         const manualObjects = [];
//         for (const match of objectMatches) {
//           try {
//             const obj = JSON.parse(match);
//             if (obj && typeof obj === 'object') {
//               manualObjects.push(obj);
//             }
//           } catch (e) {
//             // Skip invalid objects
//           }
//         }
        
//         if (manualObjects.length > 0) {
//           console.log(`✅ Manual extraction successful: ${manualObjects.length} valid objects`);
//           return manualObjects;
//         }
//       }
      
//       return null;
//     }
//   } catch (error) {
//     console.error("❌ Advanced JSON processing failed:", error.message);
//     return null;
//   }
// }

// async function makeOpenRouterCall(prompt, maxTokens, timeout = CONFIG.TIMEOUTS.GENERATION) {
//   if (!OPENROUTER_API_KEY) {
//     throw new Error("No OpenRouter API key configured");
//   }

//   const response = await axios.post(
//     "https://openrouter.ai/api/v1/chat/completions",
//     {
//       model: OPENROUTER_MODEL,
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: maxTokens,
//       temperature: 0.7
//     },
//     {
//       headers: { 
//         Authorization: `Bearer ${OPENROUTER_API_KEY}`, 
//         "Content-Type": "application/json",
//         "HTTP-Referer": "http://localhost:3000",
//         "X-Title": "AI Interview Platform"
//       },
//       timeout
//     }
//   );

//   return response.data?.choices?.[0]?.message?.content;
// }

// async function generateQuestionsWithAI(prompt, fallbackGenerator, role, maxTokens, sliceCount) {
//   try {
//     if (!USE_AI) {
//       console.log("⚠️ AI disabled - using fallback questions");
//       return fallbackGenerator(role);
//     }

//     const rawContent = await makeOpenRouterCall(prompt, maxTokens);
    
//     // 🆕 USE ORIGINAL PARSER FOR ALL ROUNDS EXCEPT CODING
//     // (Coding round now handles its own parsing)
//     const parsed = safeParseJson(rawContent);
    
//     if (Array.isArray(parsed) && parsed.length > 0) {
//       return parsed.slice(0, sliceCount);
//     }
    
//     console.warn("AI response parsing failed, using fallback");
//     return fallbackGenerator(role);
//   } catch (error) {
//     console.error("AI question generation failed:", error.message);
//     return fallbackGenerator(role);
//   }
// }

// /* ------------------------
//    Question Generation Functions
// -------------------------*/

// async function generateAptitudeRound(role) {
//   const prompt = `Generate ${CONFIG.QUESTION_COUNTS.APTITUDE} aptitude MCQ questions (basic math, logic, and English grammar) in JSON format. 
//   Return only JSON array: [{"type":"mcq","question":"...","options":["A","B","C","D"],"answer":"A"}] where answer is the correct option letter (A, B, C, or D)`;
  
//   return generateQuestionsWithAI(
//     prompt, 
//     generateFallbackAptitudeQuestions, 
//     role, 
//     4000, 
//     CONFIG.QUESTION_COUNTS.APTITUDE
//   );
// }

// async function generateCodingRound(role) {
//   const prompt = `Generate exactly ${CONFIG.QUESTION_COUNTS.CODING} coding problems for a ${role} position.

// IMPORTANT: Return ONLY valid JSON array with this exact structure:

// [
//   {
//     "type": "coding",
//     "title": "Problem Title",
//     "description": "Clear problem description",
//     "difficulty": "easy/medium/hard",
//     "testCases": [
//       {"input": "example input", "expected": "expected output"}
//     ]
//   }
// ]

// Rules:
// - Use double quotes only
// - No markdown code blocks
// - No extra text outside JSON
// - Valid JSON format only

// Generate exactly ${CONFIG.QUESTION_COUNTS.CODING} problems for ${role}:`;

//   try {
//   if (!USE_AI) {
//     console.log("⚠️ AI disabled - using fallback coding questions");
//     return generateFallbackCodingQuestions(role);
//   }

//   const rawContent = await makeOpenRouterCall(prompt, 4000);
  
//   // 🆕 DEBUG: Log raw AI response
//   console.log("🤖 RAW AI RESPONSE:", rawContent);
//   console.log("🤖 RAW RESPONSE LENGTH:", rawContent?.length);
//   console.log("🤖 RAW RESPONSE TYPE:", typeof rawContent);
  
//   // USE CODING-SPECIFIC PARSER ONLY FOR CODING ROUND
//   const parsed = safeParseCodingJson(rawContent);
  
//   if (Array.isArray(parsed) && parsed.length > 0) {
//     console.log(`✅ Coding AI response parsed: ${parsed.length} questions`);
//     return parsed.slice(0, CONFIG.QUESTION_COUNTS.CODING);
//   }
  
//   console.warn("❌ Coding AI response parsing failed, using fallback");
//   return generateFallbackCodingQuestions(role);
// } catch (error) {
//   console.error("❌ Coding AI question generation failed:", error.message);
//   return generateFallbackCodingQuestions(role);
// }
// }
// async function generateTechnicalRound(role) {
//   const prompt = `Generate ${CONFIG.QUESTION_COUNTS.TECHNICAL} technical questions for ${role} role. Mix of MCQ and text questions. 
//   Return JSON array: [{"type":"mcq/text","question":"...","options":["A","B","C","D"] if mcq,"answer":"correct answer"}]`;
  
//   return generateQuestionsWithAI(
//     prompt,
//     generateFallbackTechnicalQuestions,
//     role,
//     4000,
//     CONFIG.QUESTION_COUNTS.TECHNICAL
//   );
// }

// async function generateHrRound(role) {
//   const prompt = `Generate ${CONFIG.QUESTION_COUNTS.HR} HR behavioral questions for ${role} role focusing on teamwork, problem-solving, and experience. 
//   Return JSON array: [{"type":"text","question":"..."}]`;
  
//   return generateQuestionsWithAI(
//     prompt,
//     generateFallbackHrQuestions,
//     role,
//     2000,
//     CONFIG.QUESTION_COUNTS.HR
//   );
// }

// /* ------------------------
//    SCORING LOGIC FUNCTIONS - FIXED
// -------------------------*/

// /**
//  * 🎯 APTITUDE ROUND SCORING: MCQ-based, exact answer matching
//  */
// function scoreAptitudeRound(questions = [], answers = {}) {
//   if (!questions.length || !answers) return 0;

//   let correctCount = 0;
//   const totalMcqQuestions = questions.filter(q => q.type === "mcq").length;

//   if (totalMcqQuestions === 0) return 0;

//   questions.forEach((question, index) => {
//     if (question.type !== "mcq") return;

//     const userAnswer = answers[index] ?? answers[String(index)];
//     const correctAnswer = question.answer;
//     const options = question.options || [];

//     console.log(`🔍 Aptitude Q${index}: User: "${userAnswer}", Correct: "${correctAnswer}", Options:`, options);

//     if (userAnswer && correctAnswer && options.length > 0) {
//       // 🆕 IMPROVED: Find which option letter the user selected
//       const userOptionIndex = options.findIndex(opt => String(opt).trim() === String(userAnswer).trim());
//       const userOptionLetter = userOptionIndex >= 0 ? String.fromCharCode(65 + userOptionIndex) : null;
      
//       if (userOptionLetter && String(userOptionLetter).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
//         correctCount++;
//         console.log(`✅ Aptitude Q${index} Correct!`);
//       } else {
//         console.log(`❌ Aptitude Q${index} Wrong - User: ${userOptionLetter}, Correct: ${correctAnswer}`);
//       }
//     }
//   });

//   const score = Math.round((correctCount / totalMcqQuestions) * 100);
//   console.log(`📊 Aptitude Score: ${correctCount}/${totalMcqQuestions} = ${score}%`);
//   return score;
// }
// /**
//  * 🎯 CODING ROUND SCORING: Uses clientScore from frontend execution
//  */
// function scoreCodingRound(clientScore = null) {
//   if (clientScore === null || clientScore === undefined) return 0;
//   return Math.max(0, Math.min(100, Math.round(clientScore)));
// }

// /**
//  * 🎯 TECHNICAL ROUND SCORING: Mixed MCQ and Text answers
//  */
// async function scoreTechnicalRound(questions = [], answers = {}, role = "") {
//   if (!questions.length || !answers) return 0;

//   let mcqCorrect = 0;
//   let mcqTotal = 0;
//   let textScores = [];

//   console.log(`🔍 Scoring ${questions.length} technical questions`);

//   for (let i = 0; i < questions.length; i++) {
//     const question = questions[i];
//     const userAnswer = answers[i] ?? answers[String(i)];

//     if (question.type === "mcq") {
//       mcqTotal++;
//       const correctAnswer = question.answer;
      
//       if (userAnswer && correctAnswer) {
//         if (String(userAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
//           mcqCorrect++;
//         }
//       }
//     } 
//     else if (question.type === "text") {
//       if (userAnswer && userAnswer.trim() !== "") {
//         try {
//           const textScore = await evaluateTextAnswer(question.question, userAnswer, question.answer, role);
//           textScores.push(textScore);
//         } catch (error) {
//           console.error("Text evaluation failed:", error);
//           textScores.push(50);
//         }
//       } else {
//         textScores.push(0);
//       }
//     }
//   }

//   const mcqScore = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;
//   const textScore = textScores.length > 0 ? 
//     Math.round(textScores.reduce((sum, score) => sum + score, 0) / textScores.length) : 0;

//   const totalQuestions = mcqTotal + textScores.length;
//   if (totalQuestions === 0) return 0;

//   const finalScore = Math.round((mcqScore * mcqTotal + textScore * textScores.length) / totalQuestions);
//   console.log(`📊 Technical Scoring: MCQ=${mcqScore}% (${mcqCorrect}/${mcqTotal}), Text=${textScore}%, Final=${finalScore}%`);
  
//   return finalScore;
// }

// /**
//  * 🎯 HR ROUND SCORING: AI evaluation of behavioral answers
//  */
// async function scoreHrRound(questions = [], answers = {}, role = "") {
//   if (!questions.length || !answers) return 0;

//   let scores = [];

//   for (let i = 0; i < questions.length; i++) {
//     const question = questions[i];
//     const userAnswer = answers[i] ?? answers[String(i)];

//     if (question.type === "text") {
//       if (userAnswer && userAnswer.trim() !== "") {
//         try {
//           const score = await evaluateBehavioralAnswer(question.question, userAnswer, role);
//           scores.push(score);
//         } catch (error) {
//           console.error("HR answer evaluation failed:", error);
//           scores.push(60);
//         }
//       } else {
//         scores.push(0);
//       }
//     }
//   }

//   return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
// }

// /**
//  * 🤖 AI Evaluation for Text Answers
//  */
// async function evaluateTextAnswer(question, userAnswer, modelAnswer, role) {
//   if (!USE_AI) {
//     // Fallback scoring
//     const answerLength = userAnswer.length;
//     const hasKeywords = checkTechnicalKeywords(userAnswer, role);
    
//     if (answerLength < 10) return 20;
//     if (answerLength < 30) return 40;
//     if (answerLength < 60) return hasKeywords ? 70 : 50;
//     return hasKeywords ? 85 : 65;
//   }

//   try {
//     const prompt = `
//       Evaluate this technical interview answer (0-100 score):
      
//       Question: ${question}
//       Role: ${role}
//       User's Answer: ${userAnswer}
//       ${modelAnswer ? `Model Answer: ${modelAnswer}` : ''}
      
//       Score based on technical accuracy, relevance, and completeness.
//       Return ONLY JSON: {"score": number}
//     `;
    
//     const response = await makeOpenRouterCall(prompt, 500, CONFIG.TIMEOUTS.GRADING);
//     const parsed = safeParseJson(response);
    
//     if (parsed && typeof parsed.score === "number") {
//       return Math.max(0, Math.min(100, parsed.score));
//     }
    
//     return 60;
//   } catch (error) {
//     console.error("AI text evaluation failed:", error);
//     return 50;
//   }
// }

// /**
//  * 🤖 AI Evaluation for Behavioral Answers
//  */
// async function evaluateBehavioralAnswer(question, userAnswer, role) {
//   if (!USE_AI) {
//     // Fallback scoring
//     const answerLength = userAnswer.length;
//     const hasBehavioralIndicators = checkBehavioralKeywords(userAnswer);
    
//     if (answerLength < 20) return 30;
//     if (answerLength < 50) return hasBehavioralIndicators ? 65 : 45;
//     return hasBehavioralIndicators ? 80 : 60;
//   }

//   try {
//     const prompt = `
//       Evaluate this behavioral HR answer (0-100 score):
      
//       Question: ${question}
//       Role: ${role}
//       User's Answer: ${userAnswer}
      
//       Score based on relevance, STAR method, and communication.
//       Return ONLY JSON: {"score": number}
//     `;
    
//     const response = await makeOpenRouterCall(prompt, 500, CONFIG.TIMEOUTS.GRADING);
//     const parsed = safeParseJson(response);
    
//     if (parsed && typeof parsed.score === "number") {
//       return Math.max(0, Math.min(100, parsed.score));
//     }
    
//     return 65;
//   } catch (error) {
//     console.error("AI behavioral evaluation failed:", error);
//     return 60;
//   }
// }

// function checkTechnicalKeywords(answer, role) {
//   const technicalTerms = {
//     "data analyst": ["sql", "python", "excel", "tableau", "power bi", "analysis", "visualization", "statistics"],
//     "frontend": ["javascript", "react", "vue", "angular", "css", "html"],
//     "backend": ["node", "python", "java", "database", "api", "server"],
//     "full stack": ["frontend", "backend", "database", "api", "deployment"],
//     "software developer": ["programming", "code", "development", "debugging", "testing"],
//     "devops engineer": ["docker", "kubernetes", "ci/cd", "aws", "azure", "infrastructure", "deployment"]
//   };

//   const roleKey = Object.keys(technicalTerms).find(key => role.toLowerCase().includes(key)) || "software developer";
//   const terms = technicalTerms[roleKey];
  
//   return terms.some(term => answer.toLowerCase().includes(term));
// }

// function checkBehavioralKeywords(answer) {
//   const behavioralIndicators = [
//     "team", "leadership", "problem", "solution", "challenge", "success", 
//     "learn", "improve", "collaborat", "communicat", "achieve", "result"
//   ];
  
//   return behavioralIndicators.some(term => answer.toLowerCase().includes(term));
// }

// /* ------------------------
//    Fallback Question Generators
// -------------------------*/

// function generateFallbackAptitudeQuestions() {
//   return Array.from({ length: CONFIG.QUESTION_COUNTS.APTITUDE }, (_, i) => ({
//     type: "mcq",
//     question: `Aptitude Question ${i + 1}: What is ${i + 5} + ${i + 3}?`,
//     options: [
//       (i + 5 + i + 3).toString(),
//       (i + 10).toString(), 
//       (i * 2).toString(), 
//       "None"
//     ],
//     answer: "A"
//   }));
// }

// function generateFallbackCodingQuestions(role = "") {
//   const roleLower = role.toLowerCase();
  
//   // Frontend-specific questions
//   if (roleLower.includes('frontend')) {
//     return [
//       {
//         type: "coding",
//         title: "DOM Element Toggler",
//         description: "Create a function that toggles the visibility of a DOM element by its ID.",
//         difficulty: "easy",
//         testCases: [
//           { input: "toggleElement('myDiv')", expected: "Element toggled" }
//         ]
//       },
//       {
//         type: "coding",
//         title: "Form Validation",
//         description: "Write a function that validates an email input and returns true if valid, false otherwise.",
//         difficulty: "medium", 
//         testCases: [
//           { input: "test@example.com", expected: true },
//           { input: "invalid-email", expected: false }
//         ]
//       },
//       {
//         type: "coding",
//         title: "API Data Fetcher",
//         description: "Create a function that fetches data from a REST API and returns the parsed JSON.",
//         difficulty: "medium",
//         testCases: [
//           { input: "https://api.example.com/data", expected: "Data fetched successfully" }
//         ]
//       }
//     ];
//   }
  
//   // Backend-specific questions  
//   if (roleLower.includes('backend')) {
//     return [
//       {
//         type: "coding", 
//         title: "REST API Endpoint",
//         description: "Create a function that handles a GET request and returns JSON data.",
//         difficulty: "easy",
//         testCases: [
//           { input: "/api/users", expected: "User data returned" }
//         ]
//       },
//       {
//         type: "coding",
//         title: "Database Query",
//         description: "Write a function that queries a database and returns specific user data.",
//         difficulty: "medium",
//         testCases: [
//           { input: "user_id=123", expected: "User data retrieved" }
//         ]
//       },
//       {
//         type: "coding",
//         title: "Authentication Middleware",
//         description: "Create a middleware function that verifies JWT tokens.",
//         difficulty: "hard", 
//         testCases: [
//           { input: "valid_token", expected: "User authenticated" },
//           { input: "invalid_token", expected: "Authentication failed" }
//         ]
//       }
//     ];
//   }

//   // Default coding questions
//   return [
//     {
//       type: "coding",
//       title: "Reverse String",
//       description: "Write a function that reverses a string without using built-in reverse methods.",
//       difficulty: "easy",
//       testCases: [
//         { input: "hello", expected: "olleh" },
//         { input: "world", expected: "dlrow" }
//       ]
//     },
//     {
//       type: "coding", 
//       title: "Find Maximum",
//       description: "Find the maximum number in an array without using Math.max.",
//       difficulty: "easy",
//       testCases: [
//         { input: [1, 5, 3, 9, 2], expected: 9 },
//         { input: [-1, -5, -3], expected: -1 }
//       ]
//     },
//     {
//       type: "coding",
//       title: "Two Sum",
//       description: "Given an array of integers and a target, find two numbers that add up to the target.",
//       difficulty: "medium",
//       testCases: [
//         { input: { array: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
//         { input: { array: [3, 2, 4], target: 6 }, expected: [1, 2] }
//       ]
//     }
//   ];
// }

// function generateFallbackTechnicalQuestions(role) {
//   return Array.from({ length: CONFIG.QUESTION_COUNTS.TECHNICAL }, (_, i) => ({
//     type: i % 2 === 0 ? "mcq" : "text",
//     question: `Technical Question ${i + 1} for ${role}: ${i % 2 === 0 ? 'What is the time complexity of binary search?' : 'Explain the concept of inheritance in OOP.'}`,
//     options: i % 2 === 0 ? ["O(log n)", "O(n)", "O(n²)", "O(1)"] : undefined,
//     answer: i % 2 === 0 ? "A" : `Inheritance allows a class to inherit properties and methods from another class, promoting code reusability.`
//   }));
// }

// function generateFallbackHrQuestions(role) {
//   const hrQuestions = [
//     "Tell me about yourself and your experience.",
//     "Why are you interested in this role?",
//     "Describe a challenging project you worked on and how you handled it.",
//     "How do you handle feedback and criticism?",
//     "Where do you see yourself in 5 years?",
//     "Describe a time you had to work in a team under pressure.",
//     "How do you prioritize your tasks when managing multiple projects?",
//     "What is your greatest strength and weakness?",
//     "Why should we hire you for this position?",
//     "Do you have any questions for us?"
//   ];

//   return hrQuestions.slice(0, CONFIG.QUESTION_COUNTS.HR).map(question => ({
//     type: "text",
//     question: `${question} (${role} role)`
//   }));
// }

// /* ===================================================================
//    Core Controller Functions - 100% WORKING FINAL VERSION
// =================================================================== */

// export const startInterview = async (req, res) => {
//   try {
//     const { userId, role, roundType, selectedRounds = [], forceNew = false } = req.body;    
//     if (!userId || !role || !roundType) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "userId, role, and roundType are required" 
//       });
//     }

//     const normalizedRoundType = normalizeRoundType(roundType);
//     const normalizedSelectedRounds = Array.isArray(selectedRounds) 
//       ? selectedRounds.map(round => normalizeRoundType(round))
//       : [normalizedRoundType];

//     // Generate unique interviewId
//     const generatedInterviewId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//     console.log(`🚀 Starting Interview | User: ${userId} | Role: ${role} | Round: ${normalizedRoundType}`);

//     // Find active interview or create new one
// let interview = null;
// if (!forceNew) {
//   interview = await Interview.findOne({ 
//     userId, 
//     status: { $in: ["active", "pending"] }
//   });
// }

// if (!interview || forceNew) {
//   console.log("🆕 Creating New Interview Session (forced)");
  
//   const initialRounds = {};

//   interview = new Interview({
//     interviewId: generatedInterviewId,
//     userId,
//     role,
//     selectedRounds: normalizedSelectedRounds,
//     status: "active",
//     startTime: new Date(),
//      rounds: initialRounds, // ✅ ADD THIS LINE
//     overall: {
//       averageScore: 0,
//       status: "In Progress"
//     }
//   });

//   await interview.save();
//   console.log("✅ New interview created with ID:", generatedInterviewId);
// } else {
//   console.log("♻️ Existing Interview Found — Continuing");

//   const allRounds = [...new Set([...interview.selectedRounds, ...normalizedSelectedRounds])];
//    const updatedInterview = await Interview.findOneAndUpdate(
//     { _id: interview._id },
//     { 
//       $set: { 
//         selectedRounds: allRounds,
//         updatedAt: new Date()
//       } 
//     },
//     { 
//       new: true, // Return the updated document
//       runValidators: true 
//     }
//   );
//   interview = updatedInterview;
//   console.log("✅ Interview updated without version conflict");
// }

//     // Check if questions already exist for this round
//     // 🆕 FORCE NEW QUESTIONS FOR CODING ROUNDS - Don't use cached questions
// if (normalizedRoundType === 'coding') {
//   console.log(`🔄 Forcing new question generation for coding round`);
// } else {
//   // For other rounds, use cached questions if they exist
//   const existingQuestions = interview.rounds?.[normalizedRoundType]?.questions;
//   if (existingQuestions?.length) {
//     console.log(`📦 Returning Cached Questions for ${normalizedRoundType}`);
    
//     return res.json({
//       success: true,
//       message: `${displayRoundType(normalizedRoundType)} Questions Ready`,
//       questions: existingQuestions,
//       interviewId: interview.interviewId,
//       roundType: normalizedRoundType
//     });
//   }
// }

//     // Generate new questions based on round type
//     console.log(`🤖 Generating ${normalizedRoundType} questions for ${role}`);
    
//     const questionGenerators = {
//       aptitude: generateAptitudeRound,
//       coding: generateCodingRound,
//       technical: generateTechnicalRound,
//       hr: generateHrRound
//     };

//     const generator = questionGenerators[normalizedRoundType];
//     if (!generator) {
//       return res.status(400).json({
//         success: false,
//         message: `Unsupported round type: ${normalizedRoundType}`
//       });
//     }

//     const generatedQuestions = await generator(role);
//     console.log(`✅ Generated ${generatedQuestions?.length} questions`);

//     // ✅ FIX: Use findOneAndUpdate to set rounds to avoid version conflicts
// const updateData = {
//   rounds: {
//     ...interview.rounds,
//     [normalizedRoundType]: {
//       questions: generatedQuestions,
//       answers: {},
//       score: null,
//       submittedAt: null,
//       startedAt: new Date()
//     }
//   },
//   updatedAt: new Date()
// };

// // Update using findOneAndUpdate to avoid version conflicts
// const updatedInterview = await Interview.findOneAndUpdate(
//   { _id: interview._id },
//   { $set: updateData },
//   { 
//     new: true, // Return updated document
//     runValidators: true 
//   }
// );

// interview = updatedInterview;
// console.log(`💾 ${normalizedRoundType} round saved successfully without version conflict`);

//     return res.json({
//       success: true,
//       message: `${displayRoundType(normalizedRoundType)} Questions Ready`,
//       questions: generatedQuestions,
//       interviewId: interview.interviewId,
//       roundType: normalizedRoundType
//     });

//   } catch (error) {
//     console.error("❌ startInterview Error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Failed to start interview", 
//       error: error.message 
//     });
//   }
// };

// export const submitInterview = async (req, res) => {
//   try {
//     const { interviewId, userId, roundType, answers = {}, clientScore = null } = req.body;
    
//     if (!roundType) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "roundType is required" 
//       });
//     }

//     const normalizedRoundType = normalizeRoundType(roundType);
//     console.log("📥 Submission received:", { 
//       interviewId, 
//       userId, 
//       roundType: normalizedRoundType,
//       answersCount: Object.keys(answers).length 
//     });

//     // 🎯 CRITICAL FIX: Find interview with proper query
//     let interview = null;
//     if (interviewId) {
//       interview = await Interview.findOne({ interviewId });
//     }
//     if (!interview && userId) {
//       interview = await Interview.findOne({ 
//         userId, 
//         status: { $in: ["active", "pending"] }
//       }).sort({ createdAt: -1 });
//     }
//     if (!interview) {
//       console.log("❌ Interview not found");
//       return res.status(404).json({ 
//         success: false, 
//         message: "Interview not found" 
//       });
//     }

//     console.log("✅ Interview found:", interview.interviewId);
//     // console.log("📋 Interview rounds keys:", Object.keys(interview.rounds || {}));

//     // 🎯 CRITICAL FIX: Debug the rounds structure
//     if (interview.rounds && interview.rounds[normalizedRoundType]) {
//       const currentRound = interview.rounds[normalizedRoundType];
//       console.log(`🔍 Round ${normalizedRoundType} exists:`, {
//         hasQuestions: !!currentRound.questions,
//         questionsCount: currentRound.questions?.length || 0,
//         questionsType: typeof currentRound.questions,
//         isArray: Array.isArray(currentRound.questions)
//       });
//     } else {
//       console.log(`❌ Round ${normalizedRoundType} not found in interview rounds`);
//     }

//     // 🎯 CRITICAL FIX: Ensure rounds data exists and has questions
//     interview.rounds = interview.rounds || {};
    
//     const currentRound = interview.rounds[normalizedRoundType];
//     if (!currentRound || !currentRound.questions) {
//       console.log(`❌ No questions found for ${normalizedRoundType} round`);
//       console.log(`🔍 Available rounds:`, Object.keys(interview.rounds));
      
//       return res.status(400).json({
//         success: false,
//         message: `No questions found for ${normalizedRoundType} round. Please start the round again.`
//       });
//     }

//     const questions = Array.isArray(currentRound.questions) ? currentRound.questions : [];
//     console.log(`📊 Calculating score for ${questions.length} ${normalizedRoundType} questions`);

//     if (questions.length === 0) {
//       console.log("❌ Empty questions array");
//       return res.status(400).json({
//         success: false,
//         message: "No questions available for scoring. Please restart the interview."
//       });
//     }

//     // 🎯 CALCULATE SCORE BASED ON ROUND TYPE
//     // 🎯 CALCULATE SCORE BASED ON ROUND TYPE
// let finalScore = 0;
// let evaluationResults = [];

// console.log(`🔍 Starting evaluation for ${questions.length} ${normalizedRoundType} questions`);

// switch (normalizedRoundType) {
//   case "aptitude":
//     finalScore = scoreAptitudeRound(questions, answers);
//     console.log(`✅ Aptitude Score: ${finalScore}%`);
//     break;

//   case "coding":
//     finalScore = scoreCodingRound(clientScore);
//     console.log(`✅ Coding Score: ${finalScore}%`);
//     break;

//   // In your technical round scoring section, replace with this faster version:

// case "technical":
//   // 🚀 INSTANT TECHNICAL SCORING - No processing, just count answers
//   console.log(`🚀 Starting INSTANT evaluation for ${questions.length} technical questions`);
  
//   // Count answered questions and give score based on completion
//   const answeredCount = Object.values(answers).filter(a => a && a.trim() !== "").length;
//   finalScore = Math.round((answeredCount / questions.length) * 100);
  
//   console.log(`🎯 INSTANT Technical Score: ${finalScore}% (${answeredCount}/${questions.length} answered)`);
//   break;
  
//   case "hr":
//     // Enhanced HR scoring with fallback
//     for (let i = 0; i < questions.length; i++) {
//       const question = questions[i];
//       const userAnswer = answers[i] || 'No answer provided';
      
//       const keywordScore = evaluateByKeywords("behavioral communication teamwork problem solving", userAnswer);
//       console.log(`🔧 HR question ${i} score: ${keywordScore}`);
//       finalScore += keywordScore;
//     }
//     finalScore = Math.round(finalScore / questions.length);
//     console.log(`✅ HR Score: ${finalScore}%`);
//     break;

//   default:
//     console.warn(`⚠️ Unknown round type: ${normalizedRoundType}`);
//     finalScore = 0;
// }

//     // 🎯 UPDATE ROUND DATA
//     const currentRoundData = interview.rounds.get(normalizedRoundType) || {};
//     interview.rounds.set(normalizedRoundType, {
//       ...currentRoundData,
//       answers: answers,
//       score: finalScore,
//       submittedAt: new Date()
//     });

//     // 🎯 UPDATE COMPLETED ROUNDS
//     interview.completedRounds = interview.completedRounds || [];
//     if (!interview.completedRounds.includes(normalizedRoundType)) {
//       interview.completedRounds.push(normalizedRoundType);
//     }

//     // 🎯 CALCULATE OVERALL AVERAGE SCORE
//     const completedRoundsWithScores = Object.values(interview.rounds)
//       .filter(round => round && round.score !== null && round.score !== undefined);
    
//     console.log(`📈 Completed rounds with scores: ${completedRoundsWithScores.length}`);

//     const totalScore = completedRoundsWithScores.reduce((sum, round) => sum + round.score, 0);
//     const averageScore = completedRoundsWithScores.length > 0 
//       ? Math.round(totalScore / completedRoundsWithScores.length) 
//       : 0;

//     // 🎯 UPDATE OVERALL STATUS
//     interview.overall = interview.overall || {};
//     interview.overall.averageScore = averageScore;
    
//     // Check if all selected rounds are completed
//     const allSelectedRounds = interview.selectedRounds || [];
//     const completedRoundCount = interview.completedRounds.length;
//     const allRoundsCompleted = completedRoundCount >= allSelectedRounds.length;

//     console.log(`🎯 Completion: ${completedRoundCount}/${allSelectedRounds.length} rounds | Average: ${averageScore}% | All Done: ${allRoundsCompleted}`);

//     if (allRoundsCompleted) {
//       interview.status = "completed";
//       interview.overall.status = "Completed";
//       interview.endTime = new Date();

//       console.log("🎉 All rounds completed! Generating feedback...");

//      // 🎯 GENERATE FEEDBACK
//       // 🎯 GENERATE FEEDBACK - Only generate if all rounds completed
// if (allRoundsCompleted) {
//   try {
//     console.log("🎯 Starting feedback generation for completed interview...");
    
//     // Check if feedback already exists to avoid duplicates
//     const existingFeedback = await Feedback.findOne({ interviewId: interview.interviewId });
//     if (existingFeedback) {
//       console.log("✅ Feedback already exists, skipping generation");
//     } else {
//       // Use AI feedback generation if available, otherwise use basic
//       let feedback;
      
//       try {
//         // Try AI feedback first
//         console.log("🤖 Attempting AI feedback generation...");
//         const roundScores = {};
//         Object.entries(interview.rounds).forEach(([round, data]) => {
//           if (data.score !== undefined) {
//             roundScores[round] = data.score;
//           }
//         });
        
//         const aiFeedback = await aiEvaluator.generateOverallFeedback(interview, roundScores);
//         feedback = new Feedback({
//           feedbackId: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           interviewId: interview.interviewId,
//           userId: interview.userId,
//           role: interview.role,
//           averageScore: averageScore,
//           improvement: aiFeedback.improvement || getImprovementSuggestions(averageScore),
//           suggestion: aiFeedback.suggestion || getGeneralSuggestion(interview.role)
//         });
//         console.log("✅ AI feedback generated successfully");
//       } catch (aiError) {
//         console.warn("❌ AI feedback failed, using basic feedback:", aiError.message);
//         // Fallback to basic feedback
//         feedback = await generateBasicFeedback(interview);
//       }
      
//       await feedback.save();
//       console.log("✅ Feedback saved successfully");
//     }
//   } catch (feedbackError) {
//     console.error("❌ Feedback generation failed:", feedbackError.message);
//   }
// } else {
//   interview.overall.status = "In Progress";
//   console.log(`📊 Interview progress: ${interview.completedRounds.length}/${interview.selectedRounds.length} rounds completed`);
// }

//     // ✅ FIX: Use findOneAndUpdate to avoid version conflicts in submission
// const updatedInterview = await Interview.findOneAndUpdate(
//   { _id: interview._id },
//   { 
//     $set: {
//       rounds: interview.rounds,
//       completedRounds: interview.completedRounds,
//       overall: interview.overall,
//       status: interview.status,
//       endTime: interview.endTime,
//       updatedAt: new Date()
//     }
//   },
//   { 
//     new: true,
//     runValidators: true 
//   }
// );

// interview = updatedInterview;
// console.log("💾 Interview submission saved without version conflict");

//     return res.json({
//       success: true,
//       message: `${displayRoundType(normalizedRoundType)} submitted successfully`,
//       score: finalScore,
//       averageScore: averageScore,
//       interviewId: interview.interviewId,
//       completedAll: allRoundsCompleted
//     });

//   }} catch (error) {
//     console.error("❌ submitInterview error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Failed to submit interview", 
//       error: error.message 
//     });
//   }
// };

// /**
//  * 🎯 Generate Basic Feedback - 100% RELIABLE
//  */
// async function generateBasicFeedback(interview) {
//   const roundsData = Object.entries(interview.rounds)
//     .filter(([_, roundData]) => roundData && roundData.score !== null)
//     .map(([roundName, roundData]) => ({
//       round: roundName,
//       score: roundData.score
//     }));

//   const averageScore = interview.overall.averageScore;

//   // Generate unique feedbackId to prevent duplicates
//   const feedbackId = `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//   return new Feedback({
//     feedbackId: feedbackId,
//     interviewId: interview.interviewId,
//     userId: interview.userId,
//     role: interview.role,
//     averageScore: averageScore,
//     improvement: getImprovementSuggestions(averageScore),
//     suggestion: getGeneralSuggestion(interview.role)
//     // Removed finalFeedback field
//   });
// }

// /**
//  * 🎯 Improved fallback evaluation using keyword matching
//  */
// function evaluateByKeywords(correctAnswer, userAnswer, question = "") {
//   if (!userAnswer || userAnswer.toLowerCase() === 'no answer provided') return 0;
  
//   const user = userAnswer.toLowerCase().trim();
  
//   // Handle very short or non-serious answers
//   if (user.length < 3) return 0;
//   if (user === 'dont know' || user === "don't know" || user === 'no') return 10;
//   if (user === 'yes' || user === 'yess' || user === 'yesss') return 20;
  
//   const correct = correctAnswer.toLowerCase();
//   const questionText = question.toLowerCase();
  
//   // Extract important keywords from correct answer and question
//   const importantWords = [
//     ...correct.split(/\s+/).filter(word => word.length > 3),
//     ...questionText.split(/\s+/).filter(word => word.length > 3 && !['what', 'how', 'why', 'explain', 'describe', 'difference'].includes(word))
//   ];
  
//   // Remove duplicates
//   const uniqueWords = [...new Set(importantWords)];
  
//   let matches = 0;
//   uniqueWords.forEach(word => {
//     if (user.includes(word)) {
//       matches++;
//     }
//   });
  
//   // Calculate score based on keyword matches and answer length
//   const keywordScore = Math.min(80, (matches / Math.max(1, uniqueWords.length)) * 80);
//   const lengthBonus = Math.min(20, (user.length / 200) * 20); // More generous length bonus
  
//   const totalScore = Math.round(keywordScore + lengthBonus);
//   console.log(`📊 Fallback scoring: ${matches}/${uniqueWords.length} keywords = ${keywordScore}% + length ${lengthBonus}% = ${totalScore}%`);
  
//   return Math.min(85, totalScore); // Cap at 85% for fallback
// }
// /* ------------------------
//    Helper Functions for Feedback
// -------------------------*/

// function getImprovementSuggestions(score) {
//   if (score >= 90) return "Excellent performance! Maintain your consistency and consider advanced topics.";
//   if (score >= 75) return "Strong performance. Focus on mastering advanced concepts and edge cases.";
//   if (score >= 60) return "Good foundation. Practice more problems and review core concepts thoroughly.";
//   return "Needs significant improvement. Focus on fundamentals and regular practice.";
// }

// function getGeneralSuggestion(role) {
//   const suggestions = {
//     "data analyst": "Practice SQL queries, data visualization tools, and statistical analysis.",
//     "frontend developer": "Build responsive web applications and learn modern JavaScript frameworks.",
//     "backend developer": "Focus on API design, database optimization, and system architecture.",
//     "full stack developer": "Balance both frontend and backend skills, learn deployment processes.",
//     "software developer": "Practice algorithms, data structures, and software design patterns.",
//     "devops engineer": "Master containerization, cloud services, and CI/CD pipelines.",
//     "default": "Practice regularly, build projects, and participate in coding challenges."
//   };
  
//   const roleKey = Object.keys(suggestions).find(key => 
//     role.toLowerCase().includes(key)
//   ) || "default";
  
//   return suggestions[roleKey];
// }

// // Removed getPerformanceSummary function since it's no longer needed

// /* ===================================================================
//    Additional Controller Functions
// =================================================================== */

// export const getInterviewResults = async (req, res) => {
//   try {
//     const userId = req.params.userId || req.query.userId;
//     const interviewId = req.query.interviewId;
    
//     if (!userId && !interviewId) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "userId or interviewId is required" 
//       });
//     }

//     let interview;
    
//     if (interviewId) {
//       interview = await Interview.findOne({ interviewId });
//     } else {
//       interview = await Interview.findOne({ userId }).sort({ createdAt: -1 });
//     }
    
//     if (!interview) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "No interview data found" 
//       });
//     }

//     const feedback = await Feedback.findOne({ 
//       interviewId: interview.interviewId 
//     });

//     return res.json({
//       success: true,
//       interview: {
//         interviewId: interview.interviewId,
//         userId: interview.userId,
//         role: interview.role,
//         selectedRounds: interview.selectedRounds,
//         completedRounds: interview.completedRounds,
//         rounds: interview.rounds,
//         overall: interview.overall,
//         startTime: interview.startTime,
//         endTime: interview.endTime,
//         status: interview.status
//       },
//       feedback: feedback ? {
//         feedbackId: feedback._id,
//         averageScore: feedback.averageScore,
//         improvement: feedback.improvement,
//         suggestion: feedback.suggestion
//         // Removed finalFeedback from response
//       } : null
//     });
//   } catch (error) {
//     console.error("❌ getInterviewResults error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Failed to fetch interview results", 
//       error: error.message 
//     });
//   }
// };

// export const getFeedback = async (req, res) => {
//   try {
//     const { interviewId, userId } = req.query;
    
//     let feedback;
//     if (interviewId) {
//       feedback = await Feedback.findOne({ interviewId });
//     } else if (userId) {
//       feedback = await Feedback.findOne({ userId }).sort({ feedbackGivenAt: -1 });
//     }
    
//     if (!feedback) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Feedback not found" 
//       });
//     }

//     res.json({
//       success: true,
//       feedback: {
//         feedbackId: feedback._id,
//         interviewId: feedback.interviewId,
//         userId: feedback.userId,
//         role: feedback.role,
//         averageScore: feedback.averageScore,
//         improvement: feedback.improvement,
//         suggestion: feedback.suggestion
//         // Removed finalFeedback from response
//       }
//     });
//   } catch (error) {
//     console.error("❌ getFeedback error:", error);
//     res.status(500).json({ 
//       success: false, 
//       message: "Failed to fetch feedback", 
//       error: error.message 
//     });
//   }
// };

// export const getAllInterviews = async (req, res) => {
//   try {
//     const interviews = await Interview.find({}).sort({ createdAt: -1 });
    
//     return res.json({
//       success: true,
//       interviews: interviews.map(interview => ({
//         interviewId: interview.interviewId,
//         userId: interview.userId,
//         role: interview.role,
//         selectedRounds: interview.selectedRounds,
//         completedRounds: interview.completedRounds,
//         overall: interview.overall,
//         status: interview.status,
//         startTime: interview.startTime,
//         endTime: interview.endTime
//       }))
//     });
//   } catch (error) {
//     console.error("❌ getAllInterviews error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Failed to fetch interviews", 
//       error: error.message 
//     });
//   }
// };
// export const resetInterviews = async (req, res) => {
//   try {
//     return res.json({ 
//       success: false, 
//       message: "Reset functionality disabled for data safety" 
//     });
//   } catch (error) {
//     console.error("❌ resetInterviews error:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Reset operation failed", 
//       error: error.message 
//     });
//   }
// };

// // 🆕 ADD THE 3 NEW FUNCTIONS RIGHT HERE - AFTER resetInterviews AND BEFORE EXPORTS

// // Get user progress
// export const getUserProgress = async (req, res) => {
//   try {
//     const { userId } = req.params;
    
//     // Find active interview for user
//     const interview = await Interview.findOne({ 
//       userId, 
//       status: { $in: ['active', 'pending'] } 
//     }).sort({ createdAt: -1 });
    
//     if (!interview) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'No active interview found' 
//       });
//     }
    
//     res.json({
//       success: true,
//       interview: {
//         interviewId: interview.interviewId,
//         userId: interview.userId,
//         role: interview.role,
//         status: interview.status,
//         selectedRounds: interview.selectedRounds,
//         completedRounds: interview.completedRounds || [],
//         rounds: interview.rounds || {},
//         startTime: interview.startTime,
//         createdAt: interview.createdAt
//       }
//     });
//   } catch (error) {
//     console.error('❌ Get user progress error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch user progress'
//     });
//   }
// };

// // Update user progress
// export const updateUserProgress = async (req, res) => {
//   try {
//     const { 
//       interviewId, 
//       userId, 
//       roundType, 
//       score, 
//       answers, 
//       passedTests,
//       status = 'in-progress' 
//     } = req.body;
    
//     let interview;
    
//     if (interviewId) {
//       interview = await Interview.findOne({ interviewId });
//     } else if (userId) {
//       interview = await Interview.findOne({ 
//         userId, 
//         status: { $in: ['active', 'pending'] } 
//       }).sort({ createdAt: -1 });
//     }
    
//     if (!interview) {
//       return res.status(404).json({
//         success: false,
//         message: 'Interview not found'
//       });
//     }
    
//     // Update round progress
//     if (roundType) {
//       interview.rounds = interview.rounds || {};
//       interview.rounds[roundType] = {
//         score: score || 0,
//         answers: answers || {},
//         passedTests: passedTests || {},
//         completedAt: new Date(),
//         status: status
//       };
      
//       // Add to completed rounds if not already there
//       if (!interview.completedRounds) {
//         interview.completedRounds = [];
//       }
//       if (!interview.completedRounds.includes(roundType)) {
//         interview.completedRounds.push(roundType);
//       }
//     }
    
//     // Update overall status
//     if (status === 'completed' && interview.selectedRounds && 
//         interview.completedRounds && 
//         interview.completedRounds.length === interview.selectedRounds.length) {
//       interview.status = 'completed';
//       interview.endTime = new Date();
//     }
    
//     await interview.save();
    
//     res.json({
//       success: true,
//       interview: {
//         interviewId: interview.interviewId,
//         status: interview.status,
//         completedRounds: interview.completedRounds,
//         rounds: interview.rounds
//       }
//     });
//   } catch (error) {
//     console.error('❌ Update progress error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update progress'
//     });
//   }
// };

// // Start new interview
// export const startNewInterview = async (req, res) => {
//   try {
//     const { userId, role, selectedRounds } = req.body;
    
//     if (!userId || !role || !selectedRounds) {
//       return res.status(400).json({
//         success: false,
//         message: 'userId, role, and selectedRounds are required'
//       });
//     }
    
//     // Close any existing active interviews
//     await Interview.updateMany(
//       { userId, status: { $in: ['active', 'pending'] } },
//       { status: 'cancelled', endTime: new Date() }
//     );
    
//     // Create new interview
//     const interviewId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
//     const interview = new Interview({
//       interviewId,
//       userId,
//       role,
//       selectedRounds,
//       status: 'active',
//       startTime: new Date(),
//       rounds: {},
//       completedRounds: []
//     });
    
//     await interview.save();
    
//     res.json({
//       success: true,
//       interview: {
//         interviewId: interview.interviewId,
//         userId: interview.userId,
//         role: interview.role,
//         selectedRounds: interview.selectedRounds,
//         startTime: interview.startTime
//       }
//     });
//   } catch (error) {
//     console.error('❌ Start new interview error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to start new interview'
//     });
//   }
// };
// export { submitInterview as submitRound };
// export { getInterviewResults as getResults };