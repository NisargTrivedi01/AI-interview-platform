import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BackendError from "../components/BackendError";
import Navbar from "../components/Navbar";  

export default function TechnicalRound() {
  const [backendError, setBackendError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [submitError, setSubmitError] = useState(""); 
  const [allQuestionsAttempted, setAllQuestionsAttempted] = useState(false);
  const navigate = useNavigate();

  const API = "http://localhost:5000/api/interview";
  const roundType = "technical";

  // 🐛 DEBUG: Check round progression status
const debugRoundStatus = () => {
  console.log('🐛 DEBUG ROUND STATUS:');
  console.log('Current Round:', roundType);
  console.log('Selected Rounds:', JSON.parse(localStorage.getItem('selectedRounds') || '[]'));
  console.log('Completed Rounds:', JSON.parse(localStorage.getItem('completedRounds') || '[]'));
  console.log('Next Round:', getNextRound());
  console.log('Should Redirect:', shouldRedirectToNextRound());
};
  // ✅ NEW: Check if all questions are attempted
  const checkAllQuestionsAttempted = useCallback((currentAnswers) => {
    const answeredCount = Object.values(currentAnswers).filter(answer => 
      answer && answer.trim() !== ""
    ).length;
    const allAttempted = answeredCount === questions.length;
    setAllQuestionsAttempted(allAttempted);
    return allAttempted;
  }, [questions.length]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);

      try {
        setBackendError(null);
        const role = localStorage.getItem("selectedRole") || localStorage.getItem("role") || "Software Developer";
        const userId = localStorage.getItem("userId") || Date.now().toString();
        
        // ✅ FIX: Get selectedRounds from localStorage
        const savedSelectedRounds = JSON.parse(localStorage.getItem("selectedRounds")) || [roundType];
        
        console.log("🔄 Fetching technical questions...", { 
          role, 
          userId, 
          selectedRounds: savedSelectedRounds 
        });

        // 🔹 Always fetch fresh questions from server
        const res = await axios.post(`${API}/start`, {
          role,
          roundType,
          userId,
          selectedRounds: savedSelectedRounds
        });

        console.log("✅ Server response:", res.data);
  debugRoundStatus();
        if (res.data?.success && res.data?.questions?.length > 0) {
          const serverQuestions = res.data.questions;
          setQuestions(serverQuestions);

          // Initialize empty answers
          const initAns = {};
          serverQuestions.forEach((_, i) => (initAns[i] = ""));
          setAnswers(initAns);

          // Store in localStorage
          localStorage.setItem(`questions_${roundType}`, JSON.stringify(serverQuestions));
          if (res.data.interviewId) {
            localStorage.setItem("interviewId", res.data.interviewId);
          }

          console.log(`✅ Loaded ${serverQuestions.length} technical questions`);
        } else {
          console.error("❌ No questions received from server");
          alert("Failed to load questions. Please try again.");
        }
      } catch (error) {
        console.error("❌ Technical round fetch error:", error);
        setBackendError({
          title: "Failed to Load Technical Questions",
          message: "Backend server connection failed. Please ensure the server is running on port 5000.",
          error: error.message
        });
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, [API]);

  // Handle answer change
  const handleAnswerChange = (questionIndex, value) => {
    const newAnswers = {
      ...answers,
      [questionIndex]: value
    };
    setAnswers(newAnswers);
    checkAllQuestionsAttempted(newAnswers);
    
    // Clear submit error when user types
    if (submitError) {
      setSubmitError("");
    }
  };

  // Handle MCQ option selection
  const handleOptionSelect = (questionIndex, option) => {
    const newAnswers = {
      ...answers,
      [questionIndex]: option
    };
    setAnswers(newAnswers);
    checkAllQuestionsAttempted(newAnswers);
    
    // Clear submit error when user selects an option
    if (submitError) {
      setSubmitError("");
    }
  };

  // Auto-save answers to localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`answers_${roundType}`, JSON.stringify(answers));
    }
  }, [answers, roundType]);

  // Load saved answers from localStorage and check completion
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`answers_${roundType}`);
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
        checkAllQuestionsAttempted(parsedAnswers);
        console.log("📝 Loaded saved answers from localStorage");
      } catch (error) {
        console.error("Error loading saved answers:", error);
      }
    }
  }, [roundType, checkAllQuestionsAttempted]);

  // Check questions attempted when questions load
  useEffect(() => {
    if (questions.length > 0) {
      checkAllQuestionsAttempted(answers);
    }
  }, [questions, answers, checkAllQuestionsAttempted]);

  // ADD RETRY FUNCTION
  const handleRetry = () => {
    setBackendError(null);
    window.location.reload();
  };


  // neww
// ✅ FIXED ROUND SEQUENCING LOGIC
const getNextRound = () => {
  try {
    const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
    const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
    
    console.log('🔍 Round Progression Debug:');
    console.log('Selected Rounds:', selectedRounds);
    console.log('Completed Rounds:', completedRounds);
    console.log('Current Round:', roundType);
    
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
  // ✅ FIXED SUBMIT HANDLER: Add validation and better error handling
  // ✅ FIX: Add submission lock to prevent double submission
const [submissionLock, setSubmissionLock] = useState(false);

const handleSubmit = useCallback(async () => {
  if (submitting || submissionLock) {
    console.log("⏳ Already submitting, please wait...");
    return;
  }

  // ✅ NEW: Validate all questions are attempted
  const answeredCount = Object.values(answers).filter(answer => 
    answer && answer.trim() !== ""
  ).length;
  
  if (answeredCount < questions.length) {
    const unansweredCount = questions.length - answeredCount;
    setSubmitError(`Please attempt all ${questions.length} questions. You have ${unansweredCount} unanswered questions.`);
    alert(`❌ Please answer all ${questions.length} questions before submitting. You have ${unansweredCount} unanswered questions.`);
    return;
  }

  console.log("🔄 Starting submission process...");
  
  if (!questions.length) {
    alert("No questions available.");
    return;
  }

  setSubmitting(true);
  setSubmissionLock(true); // 🚀 LOCK SUBMISSION
  setSubmitError("");

  try {
    const userId = localStorage.getItem("userId");
    const interviewId = localStorage.getItem("interviewId");
    const role = localStorage.getItem("selectedRole") || localStorage.getItem("role");
    const selectedRounds = JSON.parse(localStorage.getItem("selectedRounds")) || [roundType];

      const submitData = {
      interviewId: interviewId,
      userId: userId,
      roundType: roundType,
      answers: answers,
      role: role,
      selectedRounds: selectedRounds
    };

    console.log("📤 Sending SINGLE submit request");
    
    // ✅ REDUCED TIMEOUT - Server should respond quickly now
    const res = await axios.post(`${API}/submit`, submitData, {
      timeout: 120000, // 🚀 REDUCED from 45s to 15s
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ Server response received:", res.data);

    if (res.data?.success) {
      // Clean up localStorage
      localStorage.removeItem(`questions_${roundType}`);
      localStorage.removeItem(`answers_${roundType}`);
      
      // Store round completion
      localStorage.setItem("lastRound", roundType);
      localStorage.setItem("lastScore", res.data.score);
      
      console.log("🎉 Round completed successfully!");
      alert(`✅ Technical Round Completed!\nScore: ${res.data.score}%`);

      // Navigate to dashboard
      
      // ✅ FIXED: Mark current round as completed FIRST
markRoundCompleted(roundType);

// ✅ FIXED: Check if there are more rounds
setTimeout(() => {
  if (shouldRedirectToNextRound()) {
    const nextRound = getNextRound();
    
    if (nextRound && nextRound !== roundType) {
      const nextRoute = getRoundRoute(nextRound);
      console.log(`🔄 Redirecting to next round: ${nextRound} -> ${nextRoute}`);
      
      // Clear current round data
      localStorage.removeItem(`questions_${roundType}`);
      localStorage.removeItem(`answers_${roundType}`);
      
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
    localStorage.removeItem(`questions_${roundType}`);
    localStorage.removeItem(`answers_${roundType}`);
    
    navigate("/dashboard");
  }
}, 1500);

    } else {
      console.error("❌ Server returned success: false", res.data);
      alert("❌ Submission failed: " + (res.data?.message || "Unknown error"));
    }
  } catch (error) {
    console.error("❌ Technical submit error:", error);
    
    let errorMessage = "Submission failed. ";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage += "Request timed out after 15 seconds. ";
    } else if (error.response) {
      errorMessage += `Server Error: ${error.response.data.message || error.response.statusText}`;
    } else if (error.request) {
      errorMessage += "Network Error: Could not connect to server.";
    } else {
      errorMessage += error.message;
    }
    
    setSubmitError(errorMessage);
    alert(errorMessage);
  } finally {
    setSubmitting(false);
    setTimeout(() => {
      setSubmissionLock(false);
    }, 3000);
    console.log("🔄 Submission process completed");
  }
}, [answers, questions, submitting, submissionLock, navigate, API, roundType]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      console.log("⏰ Time's up! Auto-submitting...");
      
      // ✅ CHECK if all questions attempted before auto-submit
      const answeredCount = Object.values(answers).filter(answer => 
        answer && answer.trim() !== ""
      ).length;
      
      if (answeredCount < questions.length) {
        const unansweredCount = questions.length - answeredCount;
        alert(`⏰ Time's up! But you have ${unansweredCount} unanswered questions. Please answer them quickly!`);
        // Give extra 30 seconds for completion
        setTimeLeft(30);
        return;
      }
      
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit, answers, questions.length]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate answered count
  const answeredCount = Object.values(answers).filter(answer => 
    answer && answer.trim() !== ""
  ).length;

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
        <div className="min-h-screen bg-gray-900 flex justify-center items-center text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-xl">Loading Technical Questions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 relative">
      <Navbar />
      
      <div className="max-w-4xl mx-auto pt-4">
        {/* ✅ SUBMIT ERROR MESSAGE */}
        {submitError && (
          <div className="bg-red-600/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <span className="text-lg mr-2">⚠️</span>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 mb-2">
              Technical Round
            </h1>
            <p className="text-gray-400">15 minutes • {questions.length} questions</p>
          </div>

          {/* Timer */}
          <div className={`px-6 py-3 rounded-xl font-bold text-xl border-2 ${
            timeLeft < 300 ? 'border-red-500 bg-red-500/20 text-red-400' : 
            timeLeft < 600 ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 
            'border-cyan-500 bg-cyan-500/20 text-cyan-400'
          }`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Progress</span>
            <span className={`font-bold ${
              allQuestionsAttempted ? 'text-green-400' : 'text-cyan-400'
            }`}>
              {answeredCount} / {questions.length} Answered
              {allQuestionsAttempted && ' ✅'}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                allQuestionsAttempted ? 'bg-green-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            ></div>
          </div>
          {/* ✅ SHOW WARNING if not all questions attempted */}
          {!allQuestionsAttempted && (
            <div className="mt-2 text-yellow-400 text-sm">
              ⚠️ You must answer all {questions.length} questions to submit
            </div>
          )}
        </div>

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={idx} className={`bg-gray-800 p-6 rounded-lg mb-6 border transition-all ${
            answers[idx] && answers[idx].trim() !== "" 
              ? "border-green-500/50 shadow-lg" 
              : "border-gray-700 hover:border-cyan-500/30"
          }`}>
            <div className="flex items-start mb-4">
              <span className={`rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0 font-bold ${
                answers[idx] && answers[idx].trim() !== "" 
                  ? "bg-green-500 text-white" 
                  : "bg-cyan-500 text-black"
              }`}>
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-lg font-semibold text-white leading-relaxed">{q.question}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    q.type === 'mcq' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {q.type === 'mcq' ? 'Multiple Choice' : 'Text Answer'}
                  </span>
                  {answers[idx] && answers[idx].trim() !== "" && (
                    <span className="text-green-400 text-sm ml-3 flex items-center">
                      <span className="mr-1">✓</span> Answered
                    </span>
                  )}
                </div>
              </div>
            </div>

            {q.type === "mcq" && Array.isArray(q.options) && q.options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {q.options.map((opt, i) => {
                  const optionKey = String.fromCharCode(65 + i); // A, B, C, D
                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionSelect(idx, opt)}
                      className={`p-4 rounded-xl border-2 text-left transition-all transform hover:scale-105 ${
                        answers[idx] === opt 
                          ? "bg-green-500/20 border-green-500 text-green-300 shadow-lg" 
                          : "bg-gray-700/50 border-gray-600 text-gray-300 hover:border-cyan-400/50 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`font-bold mr-3 ${
                          answers[idx] === opt ? "text-green-400" : "text-gray-400"
                        }`}>
                          {optionKey}.
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={4}
                className="w-full bg-gray-700 p-4 mt-3 rounded-xl border border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                value={answers[idx] || ""}
                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                placeholder="Type your detailed technical answer here..."
              />
            )}
          </div>
        ))}

        {/* Submit Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-gray-700">
            <button
              onClick={handleSubmit}
              disabled={submitting || !allQuestionsAttempted} // ✅ CHANGED: Added !allQuestionsAttempted condition
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all transform min-w-64 ${
                submitting || !allQuestionsAttempted
                  ? "bg-gray-600 cursor-not-allowed text-gray-400" 
                  : "bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white shadow-lg hover:scale-105"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  {allQuestionsAttempted ? "✅ Submit Technical Round" : `Answer ${questions.length - answeredCount} More Questions`}
                </span>
              )}
            </button>
            
            {/* ✅ SUBMISSION REQUIREMENT INFO */}
            {!allQuestionsAttempted && (
              <div className="mt-2 text-yellow-400 text-sm text-center">
                Complete all {questions.length} questions to submit
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-16 mb-8 text-center text-gray-400 text-sm">
          <p>Time remaining: {formatTime(timeLeft)}</p>
          <p className="mt-1">
            {allQuestionsAttempted 
              ? "✅ All questions answered - Ready to submit!" 
              : `📝 ${questions.length - answeredCount} questions remaining`}
          </p>
        </div>
      </div>

      {/* Auto-submit warning */}
      {timeLeft < 60 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-20">
          ⚠️ Auto-submitting in {timeLeft} seconds!
        </div>
      )}
    </div>
  );
}