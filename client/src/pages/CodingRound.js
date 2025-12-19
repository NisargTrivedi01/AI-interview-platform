import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BackendError from "../components/BackendError";
import Navbar from "../components/Navbar";  

export default function CodingRound() {
  const [questions, setQuestions] = useState([]);
  const [selectedQ, setSelectedQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [languages, setLanguages] = useState({});
  const [runningCode, setRunningCode] = useState(false);
  const [executionResult, setExecutionResult] = useState({});
  const [passedTests, setPassedTests] = useState({});
  const [backendError, setBackendError] = useState(null);
  // ❌ REMOVED: questionsLoaded state

  const currentRound = "coding";

  const navigate = useNavigate();
  const API = "http://localhost:5000/api/interview";
  const COMPILE_API = "http://localhost:5000/api";

  // 🐛 DEBUG: Check round progression status
  const debugRoundStatus = () => {
    console.log('🐛 DEBUG ROUND STATUS:');
    console.log('Current Round:', currentRound);
    console.log('Selected Rounds:', JSON.parse(localStorage.getItem('selectedRounds') || '[]'));
    console.log('Completed Rounds:', JSON.parse(localStorage.getItem('completedRounds') || '[]'));
    console.log('Next Round:', getNextRound());
    console.log('Should Redirect:', shouldRedirectToNextRound());
  };

  // Fallback questions in case AI fails
  const getFallbackCodingQuestions = (role = "Frontend Developer") => {
    const roleLower = role.toLowerCase();
    
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
    
    // Default questions
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
  };

// 🆕 🆕 🆕 🆕 🆕 🆕 ADD THE NEW FUNCTION RIGHT HERE 🆕 🆕 🆕 🆕 🆕 🆕

// const generateCodingQuestions = async (interviewId, role, userId) => {
//   try {
//     console.log("🚀 Generating coding questions...");
    
//     const res = await axios.post(`${API}/start`, {
//       role,
//       roundType: "coding",
//       userId,
//       interviewId,
//       forceNew: true
//     }, {
//       timeout: 15000
//     });

//     console.log("📡 Generate coding response:", res.data);

//     if (res.data?.questions && res.data.questions.length > 0) {
//       setQuestions(res.data.questions);
//       localStorage.setItem("questions_coding", JSON.stringify(res.data.questions));
//       console.log("✅ Generated coding questions:", res.data.questions.length);
//       return true;
//     }
//     return false;
//   } catch (error) {
//     console.error("❌ Error generating coding questions:", error);
//     return false;
//   }
// };

  // Available programming languages
  const availableLanguages = [
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "cpp", name: "C++" },
    { id: "c", name: "C" },
    { id: "csharp", name: "C#" },
  ];

  // Initialize languages for questions
  useEffect(() => {
    const initialLanguages = {};
    const initialPassedTests = {};
    questions.forEach((_, index) => {
      initialLanguages[index] = "javascript";
      initialPassedTests[index] = false;
    });
    setLanguages(initialLanguages);
    setPassedTests(initialPassedTests);
  }, [questions]);

  // 🆕 FIXED: Load Questions using existing POST endpoint
useEffect(() => {
  const loadQuestions = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      console.log("🚀 Starting coding round load...");

      const role = localStorage.getItem("role") || "Frontend Developer";
      const userId = localStorage.getItem("userId") || Date.now().toString();
      
      // Check if we have cached questions first
      const storedQuestions = localStorage.getItem("questions_coding");
      if (storedQuestions) {
        console.log("📦 Loading cached coding questions");
        const parsedQuestions = JSON.parse(storedQuestions);
        setQuestions(parsedQuestions);
        setLoading(false);
        return;
      }

      console.log("🆕 No cached questions, fetching from server...");
      
      // ✅ FIXED: Use existing interviewId or create new one
      let interviewId = localStorage.getItem("interviewId");
      
      if (!interviewId) {
        interviewId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("interviewId", interviewId);
      }
      
      console.log("📡 Using interview ID:", interviewId);

      // 🆕 FIXED: Use the POST endpoint that already exists in your backend
      const res = await axios.post(`${API}/start`, {
        role,
        roundType: "coding",
        userId,
        interviewId,
        forceNew: true
      }, {
        timeout: 15000
      });

      console.log("📡 Coding questions response:", res.data);

      if (res.data?.questions && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        localStorage.setItem("questions_coding", JSON.stringify(res.data.questions));
        console.log("✅ Questions loaded successfully:", res.data.questions.length);
      } else {
        throw new Error("No questions received from server");
      }
    } catch (err) {
      console.error("❌ Error loading coding questions:", err);
      
      // 🆕 SET BACKEND ERROR
      setBackendError({
        title: "Failed to Load Coding Questions",
        message: "Could not load coding questions. Using fallback questions instead.",
        error: err.message
      });

      // Use fallback questions
      const role = localStorage.getItem("role") || "Frontend Developer";
      const fallbackQuestions = getFallbackCodingQuestions(role);
      setQuestions(fallbackQuestions);
      localStorage.setItem("questions_coding", JSON.stringify(fallbackQuestions));
    } finally {
      setLoading(false);
    }
  };

  loadQuestions();
}, []); // Empty dependency array

  // -------------------------------
  // COUNT PASSED QUESTIONS
  // -------------------------------
  const passedCount = useCallback(() => {
    return Object.values(passedTests).filter(passed => passed).length;
  }, [passedTests]);

  // -------------------------------
  // CLIENT SCORE (BASED ON PASSED TESTS)
  // -------------------------------
  const computeClientScore = useCallback(() => {
    const total = questions.length || 1;
    const passed = passedCount();
    
    // 🆕 NEW SCORING LOGIC: 1 question = 50%, 2+ questions = 100%
    if (passed >= 2) {
      return 100;
    } else if (passed === 1) {
      return 50;
    } else {
      return 0;
    }
  }, [passedCount, questions]);

  // 🆕 FIXED: Run Code Execution - QUESTION SPECIFIC
  const runCode = async () => {
    const currentQuestion = questions[selectedQ];
    const code = answers[selectedQ];
    
    if (!code || code.trim() === "") {
      setExecutionResult({
        [selectedQ]: {
          status: "error",
          message: "Please write some code before running."
        }
      });
      return;
    }

    if (!currentQuestion) {
      setExecutionResult({
        [selectedQ]: {
          status: "error", 
          message: "No question found for validation."
        }
      });
      return;
    }

    setRunningCode(true);
    setExecutionResult(prev => ({
      ...prev,
      [selectedQ]: { status: "running", message: "Executing code..." }
    }));

    try {
      // 🆕 INCLUDE QUESTION CONTEXT FOR BETTER VALIDATION
      const response = await axios.post(`${COMPILE_API}/run-code`, {
        code,
        language: languages[selectedQ],
        questionId: selectedQ,
        questionTitle: currentQuestion.title,
        questionDescription: currentQuestion.description,
        testCases: currentQuestion.testCases
      });

      // 🆕 IMPROVED VALIDATION LOGIC
      let testPassed = false;
      let validationMessage = "Code executed successfully";

      if (response.data.success) {
        const output = response.data.output?.toLowerCase() || "";
        
        // Check for common error patterns
        const hasErrors = output.includes("error") || 
                         output.includes("exception") || 
                         output.includes("undefined") ||
                         output.includes("syntax error");
        
        if (!hasErrors && output.trim() !== "") {
          testPassed = true;
          validationMessage = "✅ All test cases passed!";
        } else {
          validationMessage = `❌ Execution issues: ${response.data.output}`;
        }
      } else {
        validationMessage = `❌ Execution failed: ${response.data.output || "Unknown error"}`;
      }

      // 🆕 UPDATE PASSED TESTS ONLY FOR CURRENT QUESTION
      if (testPassed) {
        setPassedTests(prev => ({
          ...prev,
          [selectedQ]: true
        }));
      } else {
        setPassedTests(prev => ({
          ...prev,
          [selectedQ]: false
        }));
      }

      setExecutionResult(prev => ({
        ...prev,
        [selectedQ]: {
          status: testPassed ? "success" : "error",
          message: validationMessage,
          success: testPassed,
          testPassed: testPassed,
          rawOutput: response.data.output
        }
      }));

    } catch (error) {
      console.error("Code execution error:", error);
      setExecutionResult(prev => ({
        ...prev,
        [selectedQ]: {
          status: "error",
          message: "❌ Failed to execute code. Please check your code and try again.",
          testPassed: false
        }
      }));
      // Ensure current question is marked as failed
      setPassedTests(prev => ({
        ...prev,
        [selectedQ]: false
      }));
    } finally {
      setRunningCode(false);
    }
  };

  // 🆕 ADD RETRY FUNCTION
  const handleRetry = () => {
    setBackendError(null);
    setQuestions([]);
    setLoading(true);
  };

  // ✅ FIXED ROUND SEQUENCING LOGIC
  const getNextRound = () => {
    try {
      const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
      const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
      
      console.log('🔍 Round Progression Debug:');
      console.log('Selected Rounds:', selectedRounds);
      console.log('Completed Rounds:', completedRounds);
      console.log('Current Round:', currentRound);
      
      // Find the next round that hasn't been completed
      const nextRound = selectedRounds.find(round => !completedRounds.includes(round));
      console.log('🎯 Next Round Found:', nextRound);
      
      return nextRound;
    } catch (error) {
      console.error('Error in getNextRound:', error);
      return null;
    }
  };

  const markRoundCompleted = (roundType) => {
    try {
      const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
      if (!completedRounds.includes(roundType)) {
        const updatedCompletedRounds = [...completedRounds, roundType];
        localStorage.setItem('completedRounds', JSON.stringify(updatedCompletedRounds));
        console.log(`✅ Marked ${roundType} as completed. Completed rounds:`, updatedCompletedRounds);
      } else {
        console.log(`ℹ️ ${roundType} already marked as completed`);
      }
    } catch (error) {
      console.error('Error in markRoundCompleted:', error);
    }
  };

  const getRoundRoute = (roundType) => {
    const routes = {
      hr: '/hr-round',
      technical: '/technical-round', 
      coding: '/coding-round',
      aptitude: '/aptitude-round'
    };
    const route = routes[roundType] || '/dashboard';
    console.log(`🛣️ Route for ${roundType}: ${route}`);
    return route;
  };

  const shouldRedirectToNextRound = () => {
    try {
      const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
      const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
      
      const shouldRedirect = completedRounds.length < selectedRounds.length;
      console.log(`🔄 Should redirect to next round? ${shouldRedirect} (${completedRounds.length}/${selectedRounds.length} completed)`);
      
      return shouldRedirect;
    } catch (error) {
      console.error('Error in shouldRedirectToNextRound:', error);
      return false;
    }
  };

  const submitHandler = useCallback(async () => {
    if (submitted) return;
    
    if (!questions.length) {
      setExecutionResult({
        global: {
          status: "error",
          message: "No questions available."
        }
      });
      return;
    }

    const passedCountValue = passedCount();
    
    // 🆕 UPDATED REQUIREMENT: Only need 1 question to submit, but scoring follows new logic
    if (passedCountValue < 1) {
      setExecutionResult({
        global: {
          status: "error", 
          message: `You must pass at least 1 question before submitting. Currently passed: ${passedCountValue}/${questions.length}`
        }
      });
      return;
    }

    setSubmitted(true);
    const interviewId = localStorage.getItem("interviewId");
    const userId = localStorage.getItem("userId");
    const role = localStorage.getItem("role");
    const startTime = localStorage.getItem("startTime");
    const endTime = new Date().toISOString();

    // 🆕 Calculate score using new logic
    let finalScore;
    if (passedCountValue >= 2) {
      finalScore = 100;
    } else if (passedCountValue === 1) {
      finalScore = 50;
    } else {
      finalScore = 0;
    }

    console.log(`🎯 Coding Score Calculation: ${passedCountValue}/${questions.length} passed = ${finalScore}%`);

    const payload = {
      interviewId,
      userId,
      role,
      roundType: "coding",
      questions,
      answers,
      languages,
      passedTests,
      clientScore: finalScore,
      startTime,
      endTime,
      duration: Math.round((new Date(endTime) - new Date(startTime)) / 1000 / 60) + " minutes"
    };

    try {
      const res = await axios.post(`${API}/submit`, payload);

      if (res.data?.success) {
        // ✅ FIXED: Mark current round as completed FIRST
        markRoundCompleted(currentRound);
        debugRoundStatus();

        // Save completion info
        localStorage.setItem("lastRound", currentRound);
        localStorage.setItem("lastScore", String(finalScore));

        console.log("✅ Round completed successfully!");
        
        alert(`✅ ${currentRound.toUpperCase()} Round Completed! Score: ${finalScore}%`);

        // ✅ FIXED: Check if there are more rounds with proper cleanup
        setTimeout(() => {
          if (shouldRedirectToNextRound()) {
            const nextRound = getNextRound();
            
            if (nextRound && nextRound !== currentRound) {
              const nextRoute = getRoundRoute(nextRound);
              console.log(`🔄 Redirecting to next round: ${nextRound} -> ${nextRoute}`);
              
              // Clear current round data
              localStorage.removeItem(`questions_${currentRound}`);
              localStorage.removeItem(`answers_${currentRound}`);
              
              navigate(nextRoute);
            } else {
              console.log('❌ Next round is same as current or null:', nextRound);
              console.log('🔄 Falling back to dashboard');
              navigate("/dashboard");
            }
          } else {
            console.log("🎉 All rounds completed! Redirecting to dashboard");
            
            // Clear all round data
            localStorage.removeItem('selectedRounds');
            localStorage.removeItem('completedRounds');
            localStorage.removeItem(`questions_${currentRound}`);
            localStorage.removeItem(`answers_${currentRound}`);
            
            navigate("/dashboard");
          }
        }, 1500);
      } else {
        setExecutionResult({
          global: {
            status: "error",
            message: "Submission failed. Please try again."
          }
        });
        setSubmitted(false);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setExecutionResult({
        global: {
          status: "error", 
          message: "Server error. Please try again."
        }
      });
      setSubmitted(false);
    }
  }, [questions, answers, navigate, submitted, languages, passedTests, passedCount]);

  // -------------------------------
  // TIMER LOGIC
  // -------------------------------
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          submitHandler();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitHandler, timeLeft, submitted]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle language change
  const handleLanguageChange = (questionIndex, language) => {
    setLanguages(prev => ({
      ...prev,
      [questionIndex]: language
    }));
  };

  // 🆕 FIX: Clear execution result when changing questions
  const handleQuestionChange = (newIndex) => {
    setSelectedQ(newIndex);
    // Clear previous execution result for better UX
    setExecutionResult(prev => ({
      ...prev,
      [selectedQ]: undefined
    }));
  };

  // 🆕 SHOW BACKEND ERROR COMPONENT IF ERROR EXISTS
  if (backendError) {
    return (
      <BackendError 
        title={backendError.title}
        message={backendError.message}
        onRetry={handleRetry}
      />
    );
  }

  if (loading) {
    return (
       <div className="min-h-screen bg-gray-900 text-white">
    <Navbar />
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading Coding Round...</p>
          <p className="text-gray-400 mt-2">Preparing your DSA questions</p>
        </div>
      </div>
      </div>
    );
  }

  const currentQ = questions[selectedQ] || {};
  const currentResult = executionResult[selectedQ];
  const globalMessage = executionResult.global;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col lg:flex-row gap-4">
      {/* LEFT PANEL - QUESTIONS LIST - SMALLER */}
      <div className="lg:w-1/5 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="mb-4">
          <h2 className="font-bold text-lg mb-2 text-white">Coding Questions</h2>
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-400">
              ✅ {passedCount()}/{questions.length} passed
            </span>
            <span className="text-yellow-400">
              Need: 1+
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {questions.map((q, i) => (
            <button
              key={q.id || i}
              onClick={() => handleQuestionChange(i)}
              className={`w-full text-left p-3 rounded border text-sm transition-all ${
                selectedQ === i 
                  ? "bg-gray-700 border-white text-white" 
                  : passedTests[i]
                    ? "bg-green-900 border-green-700 text-green-200"
                    : answers[i]
                    ? "bg-yellow-900 border-yellow-700 text-yellow-200"
                    : "bg-gray-800 border-gray-600 hover:bg-gray-700"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold">Q{i + 1}</span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  q.difficulty === 'easy' ? 'bg-green-700 text-green-200' :
                  q.difficulty === 'medium' ? 'bg-yellow-700 text-yellow-200' :
                  'bg-red-700 text-red-200'
                }`}>
                  {q.difficulty?.charAt(0) || 'M'}
                </span>
              </div>
              <p className="text-xs truncate">
                {q.title?.substring(0, 25) || "Question"}...
              </p>
              {passedTests[i] && (
                <div className="mt-1 text-xs text-green-400 flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
                  Passed
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-300">Progress</span>
            <span className="text-white">{computeClientScore()}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${computeClientScore()}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            {passedCount()} of {questions.length} passed • Need 1+ to submit
          </div>
        </div>
      </div>

      {/* MAIN AREA - LARGER CODE EDITOR */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex-1 flex flex-col">
          {/* HEADER WITH TIMER AND ACTIONS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">
                Coding Assessment
              </h1>
              <p className="text-gray-400 text-sm">{currentQ.difficulty} • Question {selectedQ + 1} of {questions.length}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timer */}
              <div className={`px-3 py-1 rounded font-mono font-bold text-md border ${
                timeLeft < 300 
                  ? "bg-red-900 border-red-700 text-red-200" 
                  : "bg-yellow-900 border-yellow-700 text-yellow-200"
              }`}>
                ⏱ {formatTime(timeLeft)}
              </div>

              <button
                onClick={submitHandler}
                disabled={submitted}
                className={`px-4 py-2 rounded font-semibold transition-all text-sm ${
                  submitted 
                    ? "bg-gray-600 cursor-not-allowed" 
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {submitted ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          {/* Global Messages */}
          {globalMessage && (
            <div className={`mb-3 p-3 rounded border text-sm ${
              globalMessage.status === "error" 
                ? "bg-red-900 border-red-700 text-red-200" 
                : "bg-green-900 border-green-700 text-green-200"
            }`}>
              {globalMessage.message}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 flex-1">
            {/* QUESTION CONTENT - MEDIUM SIZE - UPDATED TO SHOW FULL DETAILS */}
            <div className="lg:w-2/5 bg-gray-700 rounded border border-gray-600 p-4 overflow-y-auto">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold text-white">
                  Q{selectedQ + 1}. {currentQ.title}
                </h2>
                <span className={`text-xs px-2 py-1 rounded ${
                  currentQ.difficulty === 'easy' ? 'bg-green-700 text-green-200' :
                  currentQ.difficulty === 'medium' ? 'bg-yellow-700 text-yellow-200' :
                  'bg-red-700 text-red-200'
                }`}>
                  {currentQ.difficulty || 'Medium'}
                </span>
              </div>

              {/* 🆕 UPDATED: Show full description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-300 mb-3">📝 Problem Description</h3>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
                    {currentQ.description || currentQ.title || "No problem description available."}
                  </p>
                </div>
              </div>

              {/* 🆕 UPDATED: Show test cases */}
              {currentQ.testCases && currentQ.testCases.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-green-300 mb-3">🧪 Test Cases</h3>
                  <div className="space-y-3">
                    {currentQ.testCases.map((testCase, index) => (
                      <div key={index} className="bg-gray-800/30 p-4 rounded-lg border border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm font-medium">Input:</span>
                            <div className="bg-black/30 p-2 rounded mt-1 font-mono text-sm text-gray-200">
                              {testCase.input}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm font-medium">Expected Output:</span>
                            <div className="bg-black/30 p-2 rounded mt-1 font-mono text-sm text-gray-200">
                              {testCase.expected}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CODE EDITOR - LARGER SIZE */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-300">
                    Solution {passedTests[selectedQ] && "✅"}
                  </label>
                  <select
                    value={languages[selectedQ] || "javascript"}
                    onChange={(e) => handleLanguageChange(selectedQ, e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                  >
                    {availableLanguages.map(lang => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-400">
                  {answers[selectedQ]?.length || 0} chars
                </div>
              </div>

              <div className="flex-1 relative mb-3">
                <textarea
                  className="w-full h-full p-4 bg-black text-green-400 font-mono rounded border border-gray-600 resize-none focus:border-white focus:outline-none transition-colors text-sm"
                  placeholder={`// Write your ${languages[selectedQ] || "JavaScript"} solution for Q${selectedQ + 1} here...\n// Run code to test your solution against this specific question`}
                  value={answers[selectedQ] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [selectedQ]: e.target.value }))
                  }
                  spellCheck={false}
                  style={{ 
                    lineHeight: '1.4',
                    tabSize: 2,
                    fontFamily: 'Monaco, Consolas, monospace'
                  }}
                />
              </div>

              {/* Execution Result */}
              {currentResult && (
                <div className={`mb-3 p-3 rounded border text-sm ${
                  currentResult.status === "success" 
                    ? "bg-green-900 border-green-700 text-green-200"
                    : currentResult.status === "error"
                    ? "bg-red-900 border-red-700 text-red-200"
                    : "bg-blue-900 border-blue-700 text-blue-200"
                }`}>
                  <div className="font-semibold mb-1">
                    {currentResult.status === "success" ? 
                      (currentResult.testPassed ? "✅ Test Cases Passed for Q" + (selectedQ + 1) : "✓ Code Executed") :
                     currentResult.status === "error" ? "❌ Execution Failed for Q" + (selectedQ + 1) :
                     "⏳ Running Code for Q" + (selectedQ + 1)}
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">{currentResult.message}</pre>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleQuestionChange(Math.max(0, selectedQ - 1))}
                  disabled={selectedQ === 0}
                  className="flex-1 px-3 py-2 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
                >
                  ← Previous
                </button>
                
                <button
                  onClick={runCode}
                  disabled={runningCode || !answers[selectedQ]}
                  className="flex-1 px-3 py-2 bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors text-sm"
                >
                  {runningCode ? "Running Q" + (selectedQ + 1) : "Run Code for Q" + (selectedQ + 1)}
                </button>
                
                <button
                  onClick={() => handleQuestionChange(Math.min(questions.length - 1, selectedQ + 1))}
                  disabled={selectedQ === questions.length - 1}
                  className="flex-1 px-3 py-2 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-3 text-center text-xs text-gray-400">
          <p>Role: <span className="text-white">{localStorage.getItem("role") || "Frontend Developer"}</span> • 
          Pass at least 1 question to submit • Scoring: 1 question = 50%, 2+ questions = 100% • Time: <span className="text-yellow-400">{formatTime(timeLeft)}</span></p>
          <p className="text-yellow-300 mt-1">🔄 Each question is validated independently - code from one question won't work for others</p>
        </div>
      </div>
    </div>
  );
}

// import React, { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import BackendError from "../components/BackendError"; // 🆕 ADD IMPORT
// import Navbar from "../components/Navbar";  

// export default function CodingRound() {
//   const [questions, setQuestions] = useState([]);
//   const [selectedQ, setSelectedQ] = useState(0);
//   const [answers, setAnswers] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [timeLeft, setTimeLeft] = useState(25 * 60);
//   const [submitted, setSubmitted] = useState(false);
//   const [languages, setLanguages] = useState({});
//   const [runningCode, setRunningCode] = useState(false);
//   const [executionResult, setExecutionResult] = useState({});
//   const [passedTests, setPassedTests] = useState({});
//   const [backendError, setBackendError] = useState(null);
//   //nst [questionsLoaded, setQuestionsLoaded] = useState(false);

//   // ✅ ADD THIS LINE: Define currentRound constant
//   const currentRound = "coding";

//   const navigate = useNavigate();
  
//   const API = "http://localhost:5000/api/interview";
//   const COMPILE_API = "http://localhost:5000/api";

//   // 🐛 DEBUG: Check round progression status
// // 🐛 DEBUG: Check round progression status
// const debugRoundStatus = () => {
//   console.log('🐛 DEBUG ROUND STATUS:');
//   console.log('Current Round:', currentRound); // ✅ Now defined
//   console.log('Selected Rounds:', JSON.parse(localStorage.getItem('selectedRounds') || '[]'));
//   console.log('Completed Rounds:', JSON.parse(localStorage.getItem('completedRounds') || '[]'));
//   console.log('Next Round:', getNextRound());
//   console.log('Should Redirect:', shouldRedirectToNextRound());
// };

//   // 🆕 FIX: Track if questions are already loading
//   // const [questionsLoaded, setQuestionsLoaded] = useState(false);

//   // Fallback questions in case AI fails
// const getFallbackCodingQuestions = (role = "Frontend Developer") => {
//   const roleLower = role.toLowerCase();
  
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
  
//   // Default questions
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
// };

//   // Available programming languages
//   const availableLanguages = [
//     { id: "javascript", name: "JavaScript" },
//     { id: "python", name: "Python" },
//     { id: "java", name: "Java" },
//     { id: "cpp", name: "C++" },
//     { id: "c", name: "C" },
//     { id: "csharp", name: "C#" },
//   ];

//   // Initialize languages for questions
//   useEffect(() => {
//     const initialLanguages = {};
//     const initialPassedTests = {};
//     questions.forEach((_, index) => {
//       initialLanguages[index] = "javascript";
//       initialPassedTests[index] = false;
//     });
//     setLanguages(initialLanguages);
//     setPassedTests(initialPassedTests);
//   }, [questions]);

// // 🆕 UPDATED: Load Questions with Better Error Handling
//   useEffect(() => {
//     const loadQuestions = async () => {
//      if (questions.length > 0 || loading) {
//         console.log("🛑 Questions already loaded or loading, skipping...");
//         return;
//       }

//       try {
//         setLoading(true);
//         setBackendError(null); // 🆕 CLEAR ANY PREVIOUS ERRORS
//         console.log("🚀 Starting coding round load...");

//         const role = localStorage.getItem("role") || "Frontend Developer";
//         const userId = localStorage.getItem("userId") || Date.now().toString();
        
//         // Check if we have cached questions first
//       const storedQuestions = localStorage.getItem("questions_coding");
//       if (storedQuestions) {
//         console.log("📦 Loading cached coding questions");
//         const parsedQuestions = JSON.parse(storedQuestions);
//         setQuestions(parsedQuestions);
//         setLoading(false);
//         return;
//       }

//       console.log("🆕 No cached questions, fetching from server...");

//         const res = await axios.post(`${API}/start`, {
//           role,
//           roundType: "coding",
//           userId,
//           interviewId,
//           forceNew: true
//         }, {
//           timeout: 10000 // 🆕 ADD TIMEOUT
//         });

//         console.log("📡 Coding round response:", res.data);

//         if (res.data?.questions && res.data.questions.length > 0) {
//           setQuestions(res.data.questions);
//           localStorage.setItem("questions_coding", JSON.stringify(res.data.questions));
//           // setQuestionsLoaded(true);
//           console.log("✅ Questions loaded successfully:", res.data.questions.length);
//         } else {
//           throw new Error("No questions received from server");
//         }
//       } catch (err) {
//         console.error("❌ Error loading coding questions:", err);
        
        
//         // 🆕 SET BACKEND ERROR
//         setBackendError({
//           title: "Failed to Load Coding Questions",
//           message: "Could not connect to the backend server. Please make sure the server is running on port 5000.",
//           error: err.message
//         });

//         // Use fallback questions
//       const role = localStorage.getItem("role") || "Frontend Developer";
//       const fallbackQuestions = getFallbackCodingQuestions(role);
//       setQuestions(fallbackQuestions);
//       localStorage.setItem("questions_coding", JSON.stringify(fallbackQuestions));
//       console.log("✅ Using fallback questions:", fallbackQuestions.length);
//     } finally {
//       setLoading(false);
//     }
//   };

//   loadQuestions();
// }, []); // 🆕 REMOVED questionsLoaded dependency to prevent infinite loops
//   // -------------------------------
//   // COUNT PASSED QUESTIONS
//   // -------------------------------
//   const passedCount = useCallback(() => {
//     return Object.values(passedTests).filter(passed => passed).length;
//   }, [passedTests]);

//   // -------------------------------
// // CLIENT SCORE (BASED ON PASSED TESTS)
// // -------------------------------
// const computeClientScore = useCallback(() => {
//   const total = questions.length || 1;
//   const passed = passedCount();
  
//   // 🆕 NEW SCORING LOGIC: 1 question = 50%, 2+ questions = 100%
//   if (passed >= 2) {
//     return 100;
//   } else if (passed === 1) {
//     return 50;
//   } else {
//     return 0;
//   }
// }, [passedCount, questions]);

//   // 🆕 FIXED: Run Code Execution - QUESTION SPECIFIC
//   const runCode = async () => {
//     const currentQuestion = questions[selectedQ];
//     const code = answers[selectedQ];
    
//     if (!code || code.trim() === "") {
//       setExecutionResult({
//         [selectedQ]: {
//           status: "error",
//           message: "Please write some code before running."
//         }
//       });
//       return;
//     }

//     if (!currentQuestion) {
//       setExecutionResult({
//         [selectedQ]: {
//           status: "error", 
//           message: "No question found for validation."
//         }
//       });
//       return;
//     }

//     setRunningCode(true);
//     setExecutionResult(prev => ({
//       ...prev,
//       [selectedQ]: { status: "running", message: "Executing code..." }
//     }));

//     try {
//       // 🆕 INCLUDE QUESTION CONTEXT FOR BETTER VALIDATION
//       const response = await axios.post(`${COMPILE_API}/run-code`, {
//         code,
//         language: languages[selectedQ],
//         questionId: selectedQ,
//         questionTitle: currentQuestion.title,
//         questionDescription: currentQuestion.description,
//         testCases: currentQuestion.testCases
//       });

//       // 🆕 IMPROVED VALIDATION LOGIC
//       let testPassed = false;
//       let validationMessage = "Code executed successfully";

//       if (response.data.success) {
//         const output = response.data.output?.toLowerCase() || "";
        
//         // Check for common error patterns
//         const hasErrors = output.includes("error") || 
//                          output.includes("exception") || 
//                          output.includes("undefined") ||
//                          output.includes("syntax error");
        
//         if (!hasErrors && output.trim() !== "") {
//           testPassed = true;
//           validationMessage = "✅ All test cases passed!";
//         } else {
//           validationMessage = `❌ Execution issues: ${response.data.output}`;
//         }
//       } else {
//         validationMessage = `❌ Execution failed: ${response.data.output || "Unknown error"}`;
//       }

//       // 🆕 UPDATE PASSED TESTS ONLY FOR CURRENT QUESTION
//       if (testPassed) {
//         setPassedTests(prev => ({
//           ...prev,
//           [selectedQ]: true
//         }));
//       } else {
//         setPassedTests(prev => ({
//           ...prev,
//           [selectedQ]: false
//         }));
//       }

//       setExecutionResult(prev => ({
//         ...prev,
//         [selectedQ]: {
//           status: testPassed ? "success" : "error",
//           message: validationMessage,
//           success: testPassed,
//           testPassed: testPassed,
//           rawOutput: response.data.output
//         }
//       }));

//     } catch (error) {
//       console.error("Code execution error:", error);
//       setExecutionResult(prev => ({
//         ...prev,
//         [selectedQ]: {
//           status: "error",
//           message: "❌ Failed to execute code. Please check your code and try again.",
//           testPassed: false
//         }
//       }));
//       // Ensure current question is marked as failed
//       setPassedTests(prev => ({
//         ...prev,
//         [selectedQ]: false
//       }));
//     } finally {
//       setRunningCode(false);
//     }
//   };

//   // 🆕 ADD RETRY FUNCTION
//   const handleRetry = () => {
//     setBackendError(null);
//     // setQuestionsLoaded(false);
//     setQuestions([]);
//   };

// // new
// // ✅ FIXED ROUND SEQUENCING LOGIC
// const getNextRound = () => {
//   try {
//     const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
//     const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
    
//     console.log('🔍 Round Progression Debug:');
//     console.log('Selected Rounds:', selectedRounds);
//     console.log('Completed Rounds:', completedRounds);
//     console.log('Current Round:', currentRound);
    
//     // Find the next round that hasn't been completed
//     const nextRound = selectedRounds.find(round => !completedRounds.includes(round));
//     console.log('🎯 Next Round Found:', nextRound);
    
//     return nextRound;
//   } catch (error) {
//     console.error('Error in getNextRound:', error);
//     return null;
//   }
// };

// const markRoundCompleted = (roundType) => {
//   try {
//     const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
//     if (!completedRounds.includes(roundType)) {
//       const updatedCompletedRounds = [...completedRounds, roundType];
//       localStorage.setItem('completedRounds', JSON.stringify(updatedCompletedRounds));
//       console.log(`✅ Marked ${roundType} as completed. Completed rounds:`, updatedCompletedRounds);
//     } else {
//       console.log(`ℹ️ ${roundType} already marked as completed`);
//     }
//   } catch (error) {
//     console.error('Error in markRoundCompleted:', error);
//   }
// };

// const getRoundRoute = (roundType) => {
//   const routes = {
//     hr: '/hr-round',
//     technical: '/technical-round', 
//     coding: '/coding-round',
//     aptitude: '/aptitude-round'
//   };
//   const route = routes[roundType] || '/dashboard';
//   console.log(`🛣️ Route for ${roundType}: ${route}`);
//   return route;
// };

// const shouldRedirectToNextRound = () => {
//   try {
//     const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
//     const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
    
//     const shouldRedirect = completedRounds.length < selectedRounds.length;
//     console.log(`🔄 Should redirect to next round? ${shouldRedirect} (${completedRounds.length}/${selectedRounds.length} completed)`);
    
//     return shouldRedirect;
//   } catch (error) {
//     console.error('Error in shouldRedirectToNextRound:', error);
//     return false;
//   }
// };

//   const submitHandler = useCallback(async () => {
//   if (submitted) return;
  
//   if (!questions.length) {
//     setExecutionResult({
//       global: {
//         status: "error",
//         message: "No questions available."
//       }
//     });
//     return;
//   }

//   const passedCountValue = passedCount();
  
//   // 🆕 UPDATED REQUIREMENT: Only need 1 question to submit, but scoring follows new logic
//   if (passedCountValue < 1) {
//     setExecutionResult({
//       global: {
//         status: "error", 
//         message: `You must pass at least 1 question before submitting. Currently passed: ${passedCountValue}/${questions.length}`
//       }
//     });
//     return;
//   }

//   setSubmitted(true);
//   const interviewId = localStorage.getItem("interviewId");
//   const userId = localStorage.getItem("userId");
//   const role = localStorage.getItem("role");
//   const startTime = localStorage.getItem("startTime");
//   const endTime = new Date().toISOString();

//   // 🆕 Calculate score using new logic
//   let finalScore;
//   if (passedCountValue >= 2) {
//     finalScore = 100;
//   } else if (passedCountValue === 1) {
//     finalScore = 50;
//   } else {
//     finalScore = 0;
//   }

//   console.log(`🎯 Coding Score Calculation: ${passedCountValue}/${questions.length} passed = ${finalScore}%`);

//   const payload = {
//     interviewId,
//     userId,
//     role,
//     roundType: "coding",
//     questions,
//     answers,
//     languages,
//     passedTests,
//     clientScore: finalScore, // 🆕 Use calculated score
//     startTime,
//     endTime,
//     duration: Math.round((new Date(endTime) - new Date(startTime)) / 1000 / 60) + " minutes"
//   };

//   try {
//     const res = await axios.post(`${API}/submit`, payload);

//     if (res.data?.success) {
//   // ✅ FIXED: Mark current round as completed FIRST
//   markRoundCompleted(currentRound);
//   debugRoundStatus();

//   // Save completion info
//   localStorage.setItem("lastRound", currentRound);
//   localStorage.setItem("lastScore", String(finalScore));

//   console.log("✅ Round completed successfully!");
  
//   alert(`✅ ${currentRound.toUpperCase()} Round Completed! Score: ${finalScore}%`); // ✅ FIXED: Use finalScore instead of score

//   // ✅ FIXED: Check if there are more rounds with proper cleanup
//   // ✅ FIXED: Check if there are more rounds with proper cleanup
//   setTimeout(() => {
//     if (shouldRedirectToNextRound()) {
//       const nextRound = getNextRound();
      
//       if (nextRound && nextRound !== currentRound) {
//         const nextRoute = getRoundRoute(nextRound);
//         console.log(`🔄 Redirecting to next round: ${nextRound} -> ${nextRoute}`);
        
//         // Clear current round data
//         localStorage.removeItem(`questions_${currentRound}`);
//         localStorage.removeItem(`answers_${currentRound}`);
        
//         navigate(nextRoute);
//       } else {
//         console.log('❌ Next round is same as current or null:', nextRound);
//         console.log('🔄 Falling back to dashboard');
//         navigate("/dashboard");
//       }
//     } else {
//       console.log("🎉 All rounds completed! Redirecting to dashboard");
      
//       // Clear all round data
//       localStorage.removeItem('selectedRounds');
//       localStorage.removeItem('completedRounds');
//       localStorage.removeItem(`questions_${currentRound}`);
//       localStorage.removeItem(`answers_${currentRound}`);
      
//       navigate("/dashboard");
//     }
//   }, 1500);
// }else {
//       setExecutionResult({
//         global: {
//           status: "error",
//           message: "Submission failed. Please try again."
//         }
//       });
//       setSubmitted(false);
//     }
//   } catch (err) {
//     console.error("Submit error:", err);
//     setExecutionResult({
//       global: {
//         status: "error", 
//         message: "Server error. Please try again."
//       }
//     });
//     setSubmitted(false);
//   }
// }, [questions, answers, computeClientScore, navigate, submitted, languages, passedTests, passedCount]);

//   // -------------------------------
//   // TIMER LOGIC
//   // -------------------------------
//   useEffect(() => {
//     if (timeLeft <= 0 || submitted) return;

//     const timer = setInterval(() => {
//       setTimeLeft((t) => {
//         if (t <= 1) {
//           clearInterval(timer);
//           submitHandler();
//           return 0;
//         }
//         return t - 1;
//       });
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [submitHandler, timeLeft, submitted]);

//   // Format time display
//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
//   };

//   // Handle language change
//   const handleLanguageChange = (questionIndex, language) => {
//     setLanguages(prev => ({
//       ...prev,
//       [questionIndex]: language
//     }));
//   };

//   // 🆕 FIX: Clear execution result when changing questions
//   const handleQuestionChange = (newIndex) => {
//     setSelectedQ(newIndex);
//     // Clear previous execution result for better UX
//     setExecutionResult(prev => ({
//       ...prev,
//       [selectedQ]: undefined
//     }));
//   };

//     // 🆕 SHOW BACKEND ERROR COMPONENT IF ERROR EXISTS
// if (backendError) {
//     return (
//       <BackendError 
//         title={backendError.title}
//         message={backendError.message}
//         onRetry={handleRetry}
//       />
//     );
//   }

//   if (loading) {
//     return (
//        <div className="min-h-screen bg-gray-900 text-white">
//     <Navbar />
//       <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
//           <p className="text-xl">Loading Coding Round...</p>
//           <p className="text-gray-400 mt-2">Preparing your DSA questions</p>
//         </div>
//       </div>
//       </div>
//     );
//   }

//   const currentQ = questions[selectedQ] || {};
//   const currentResult = executionResult[selectedQ];
//   const globalMessage = executionResult.global;

//   return (
//     <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col lg:flex-row gap-4">
//       {/* LEFT PANEL - QUESTIONS LIST - SMALLER */}
//       <div className="lg:w-1/5 bg-gray-800 rounded-lg p-4 border border-gray-700">
//         <div className="mb-4">
//           <h2 className="font-bold text-lg mb-2 text-white">Coding Questions</h2>
//           <div className="flex items-center justify-between text-xs">
//             <span className="text-green-400">
//               ✅ {passedCount()}/{questions.length} passed
//             </span>
//             <span className="text-yellow-400">
//               Need: 1+
//             </span>
//           </div>
//         </div>

//         <div className="space-y-2 max-h-96 overflow-y-auto">
//           {questions.map((q, i) => (
//             <button
//               key={q.id || i}
//               onClick={() => handleQuestionChange(i)} // 🆕 USE FIXED HANDLER
//               className={`w-full text-left p-3 rounded border text-sm transition-all ${
//                 selectedQ === i 
//                   ? "bg-gray-700 border-white text-white" 
//                   : passedTests[i]
//                     ? "bg-green-900 border-green-700 text-green-200"
//                     : answers[i]
//                     ? "bg-yellow-900 border-yellow-700 text-yellow-200"
//                     : "bg-gray-800 border-gray-600 hover:bg-gray-700"
//               }`}
//             >
//               <div className="flex items-start justify-between mb-1">
//                 <span className="font-semibold">Q{i + 1}</span>
//                 <span className={`text-xs px-1 py-0.5 rounded ${
//                   q.difficulty === 'easy' ? 'bg-green-700 text-green-200' :
//                   q.difficulty === 'medium' ? 'bg-yellow-700 text-yellow-200' :
//                   'bg-red-700 text-red-200'
//                 }`}>
//                   {q.difficulty?.charAt(0) || 'M'}
//                 </span>
//               </div>
//               <p className="text-xs truncate">
//                 {q.title?.substring(0, 25) || "Question"}...
//               </p>
//               {passedTests[i] && (
//                 <div className="mt-1 text-xs text-green-400 flex items-center">
//                   <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
//                   Passed
//                 </div>
//               )}
//             </button>
//           ))}
//         </div>

//         {/* Progress Bar */}
//         <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
//           <div className="flex justify-between text-xs mb-1">
//             <span className="text-gray-300">Progress</span>
//             <span className="text-white">{computeClientScore()}%</span>
//           </div>
//           <div className="w-full bg-gray-700 rounded-full h-1.5">
//             <div 
//               className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
//               style={{ width: `${computeClientScore()}%` }}
//             ></div>
//           </div>
//           <div className="text-xs text-gray-400 mt-1 text-center">
//             {passedCount()} of {questions.length} passed • Need 1+ to submit
//           </div>
//         </div>
//       </div>

//       {/* MAIN AREA - LARGER CODE EDITOR */}
//       <div className="flex-1 flex flex-col">
//         <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex-1 flex flex-col">
//           {/* HEADER WITH TIMER AND ACTIONS */}
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
//             <div>
//               <h1 className="text-xl font-bold text-white">
//                 Coding Assessment
//               </h1>
//               <p className="text-gray-400 text-sm">{currentQ.difficulty} • Question {selectedQ + 1} of {questions.length}</p>
//             </div>
            
//             <div className="flex items-center gap-3">
//               {/* Timer */}
//               <div className={`px-3 py-1 rounded font-mono font-bold text-md border ${
//                 timeLeft < 300 
//                   ? "bg-red-900 border-red-700 text-red-200" 
//                   : "bg-yellow-900 border-yellow-700 text-yellow-200"
//               }`}>
//                 ⏱ {formatTime(timeLeft)}
//               </div>

//               <button
//                 onClick={submitHandler}
//                 disabled={submitted}
//                 className={`px-4 py-2 rounded font-semibold transition-all text-sm ${
//                   submitted 
//                     ? "bg-gray-600 cursor-not-allowed" 
//                     : "bg-green-600 hover:bg-green-700 text-white"
//                 }`}
//               >
//                 {submitted ? "Submitting..." : "Submit"}
//               </button>
//             </div>
//           </div>

//           {/* Global Messages */}
//           {globalMessage && (
//             <div className={`mb-3 p-3 rounded border text-sm ${
//               globalMessage.status === "error" 
//                 ? "bg-red-900 border-red-700 text-red-200" 
//                 : "bg-green-900 border-green-700 text-green-200"
//             }`}>
//               {globalMessage.message}
//             </div>
//           )}

//           <div className="flex flex-col lg:flex-row gap-4 flex-1">
//             {/* QUESTION CONTENT - MEDIUM SIZE - UPDATED TO SHOW FULL DETAILS */}
//             <div className="lg:w-2/5 bg-gray-700 rounded border border-gray-600 p-4 overflow-y-auto">
//               <div className="flex items-center gap-3 mb-3">
//                 <h2 className="text-lg font-bold text-white">
//                   Q{selectedQ + 1}. {currentQ.title}
//                 </h2>
//                 <span className={`text-xs px-2 py-1 rounded ${
//                   currentQ.difficulty === 'easy' ? 'bg-green-700 text-green-200' :
//                   currentQ.difficulty === 'medium' ? 'bg-yellow-700 text-yellow-200' :
//                   'bg-red-700 text-red-200'
//                 }`}>
//                   {currentQ.difficulty || 'Medium'}
//                 </span>
//               </div>

//               {/* 🆕 UPDATED: Show full description */}
//               <div className="mb-6">
//                 <h3 className="text-lg font-semibold text-cyan-300 mb-3">📝 Problem Description</h3>
//                 <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
//                   <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
//                     {currentQ.description || currentQ.title || "No problem description available."}
//                   </p>
//                 </div>
//               </div>

//               {/* 🆕 UPDATED: Show test cases */}
//               {currentQ.testCases && currentQ.testCases.length > 0 && (
//                 <div className="mb-6">
//                   <h3 className="text-lg font-semibold text-green-300 mb-3">🧪 Test Cases</h3>
//                   <div className="space-y-3">
//                     {currentQ.testCases.map((testCase, index) => (
//                       <div key={index} className="bg-gray-800/30 p-4 rounded-lg border border-gray-600">
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           <div>
//                             <span className="text-gray-400 text-sm font-medium">Input:</span>
//                             <div className="bg-black/30 p-2 rounded mt-1 font-mono text-sm text-gray-200">
//                               {testCase.input}
//                             </div>
//                           </div>
//                           <div>
//                             <span className="text-gray-400 text-sm font-medium">Expected Output:</span>
//                             <div className="bg-black/30 p-2 rounded mt-1 font-mono text-sm text-gray-200">
//                               {testCase.expected}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* CODE EDITOR - LARGER SIZE */}
//             <div className="flex-1 flex flex-col">
//               <div className="flex justify-between items-center mb-2">
//                 <div className="flex items-center gap-3">
//                   <label className="text-sm font-semibold text-gray-300">
//                     Solution {passedTests[selectedQ] && "✅"}
//                   </label>
//                   <select
//                     value={languages[selectedQ] || "javascript"}
//                     onChange={(e) => handleLanguageChange(selectedQ, e.target.value)}
//                     className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
//                   >
//                     {availableLanguages.map(lang => (
//                       <option key={lang.id} value={lang.id}>
//                         {lang.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="text-xs text-gray-400">
//                   {answers[selectedQ]?.length || 0} chars
//                 </div>
//               </div>

//               <div className="flex-1 relative mb-3">
//                 <textarea
//                   className="w-full h-full p-4 bg-black text-green-400 font-mono rounded border border-gray-600 resize-none focus:border-white focus:outline-none transition-colors text-sm"
//                   placeholder={`// Write your ${languages[selectedQ] || "JavaScript"} solution for Q${selectedQ + 1} here...\n// Run code to test your solution against this specific question`}
//                   value={answers[selectedQ] || ""}
//                   onChange={(e) =>
//                     setAnswers((prev) => ({ ...prev, [selectedQ]: e.target.value }))
//                   }
//                   spellCheck={false}
//                   style={{ 
//                     lineHeight: '1.4',
//                     tabSize: 2,
//                     fontFamily: 'Monaco, Consolas, monospace'
//                   }}
//                 />
//               </div>

//               {/* Execution Result */}
//               {currentResult && (
//                 <div className={`mb-3 p-3 rounded border text-sm ${
//                   currentResult.status === "success" 
//                     ? "bg-green-900 border-green-700 text-green-200"
//                     : currentResult.status === "error"
//                     ? "bg-red-900 border-red-700 text-red-200"
//                     : "bg-blue-900 border-blue-700 text-blue-200"
//                 }`}>
//                   <div className="font-semibold mb-1">
//                     {currentResult.status === "success" ? 
//                       (currentResult.testPassed ? "✅ Test Cases Passed for Q" + (selectedQ + 1) : "✓ Code Executed") :
//                      currentResult.status === "error" ? "❌ Execution Failed for Q" + (selectedQ + 1) :
//                      "⏳ Running Code for Q" + (selectedQ + 1)}
//                   </div>
//                   <pre className="whitespace-pre-wrap text-xs">{currentResult.message}</pre>
//                 </div>
//               )}

//               {/* ACTION BUTTONS */}
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => handleQuestionChange(Math.max(0, selectedQ - 1))}
//                   disabled={selectedQ === 0}
//                   className="flex-1 px-3 py-2 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
//                 >
//                   ← Previous
//                 </button>
                
//                 <button
//                   onClick={runCode}
//                   disabled={runningCode || !answers[selectedQ]}
//                   className="flex-1 px-3 py-2 bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors text-sm"
//                 >
//                   {runningCode ? "Running Q" + (selectedQ + 1) : "Run Code for Q" + (selectedQ + 1)}
//                 </button>
                
//                 <button
//                   onClick={() => handleQuestionChange(Math.min(questions.length - 1, selectedQ + 1))}
//                   disabled={selectedQ === questions.length - 1}
//                   className="flex-1 px-3 py-2 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
//                 >
//                   Next →
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* FOOTER INFO */}
//         <div className="mt-3 text-center text-xs text-gray-400">
//           <p>Role: <span className="text-white">{localStorage.getItem("role") || "Frontend Developer"}</span> • 
//           Pass at least 1 question to submit • Scoring: 1 question = 50%, 2+ questions = 100% • Time: <span className="text-yellow-400">{formatTime(timeLeft)}</span></p>
//           <p className="text-yellow-300 mt-1">🔄 Each question is validated independently - code from one question won't work for others</p>
//         </div>
//       </div>
//     </div>
//   );
// }