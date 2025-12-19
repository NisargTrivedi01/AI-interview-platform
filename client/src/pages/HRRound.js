import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BackendError from "../components/BackendError";
import Navbar from "../components/Navbar";  

export default function HRRound() {
    const [backendError, setBackendError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 🆕 CHANGED: 15 to 20 minutes
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitError, setSubmitError] = useState(""); // 🆕 ADD: Submit validation error
  const navigate = useNavigate();
  const API = "http://localhost:5000/api/interview";

    // 🆕 ADD RETRY FUNCTION
  const handleRetry = () => {
    setBackendError(null);
    window.location.reload();
  };

  // Memoized auto-submit handler to fix useEffect warning
  const handleAutoSubmit = useCallback(() => {
    if (submitted) return;
    alert("Time's up! Auto-submitting your HR round.");
    submitHandler();
  }, [submitted]);

  useEffect(() => {
    const load = async () => {
      try {
                setBackendError(null);
        setLoading(true);
        const stored = localStorage.getItem("questions_hr");

        if (stored) {
          const qs = JSON.parse(stored);
          setQuestions(qs);
          const initAnswers = {};
          qs.forEach((_, i) => (initAnswers[i] = ""));
          setAnswers(initAnswers);
        } else {
          const role = localStorage.getItem("role") || "Frontend Developer";
          const userId = localStorage.getItem("userId") || Date.now().toString();
          localStorage.setItem("userId", userId);

          const res = await axios.post(`${API}/start`, {
            role,
            roundType: "hr",
            userId,
          },{
             timeout: 30000 
          });

          if (res.data?.questions && res.data.questions.length > 0) {
            setQuestions(res.data.questions);
            localStorage.setItem("questions_hr", JSON.stringify(res.data.questions));
            if (res.data.interviewId) {
              localStorage.setItem("interviewId", res.data.interviewId);
            }
            const initAnswers = {};
            res.data.questions.forEach((_, i) => (initAnswers[i] = ""));
            setAnswers(initAnswers);
          } else {
            alert("No HR questions received");
          }
        }
            } catch (err) {
        console.error("HR load error:", err);
        setBackendError({
          title: "Failed to Load HR Questions",
          message: "Unable to connect to backend server. Please check server status and try again.",
          error: err.message
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (loading || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitted, handleAutoSubmit]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleChange = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
    // 🆕 Clear submit error when user types
    if (submitError) {
      setSubmitError("");
    }
  };

  const calculateProgress = () => {
    const answered = Object.values(answers).filter(answer => 
      answer && answer.trim() !== ""
    ).length;
    return Math.round((answered / questions.length) * 100) || 0;
  };

  // 🆕 ADD: Function to check if all questions are attempted
  const areAllQuestionsAttempted = () => {
    if (questions.length === 0) return false;
    
    for (let i = 0; i < questions.length; i++) {
      const answer = answers[i];
      if (!answer || answer.trim() === "") {
        return false;
      }
    }
    return true;
  };

//new
// 🆕 ROUND SEQUENCING LOGIC - Add this inside HRRound component
const getNextRound = () => {
  const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
  const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
  
  // Find the next round that hasn't been completed
  const nextRound = selectedRounds.find(round => !completedRounds.includes(round));
  console.log('🎯 Next Round:', nextRound);
  return nextRound;
};

const markRoundCompleted = (roundType) => {
  const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
  if (!completedRounds.includes(roundType)) {
    completedRounds.push(roundType);
    localStorage.setItem('completedRounds', JSON.stringify(completedRounds));
    console.log(`✅ Marked ${roundType} as completed`);
  }
};

const getRoundRoute = (roundType) => {
  const routes = {
    hr: '/hr-round',
    technical: '/technical-round', 
    coding: '/coding-round',
    aptitude: '/aptitude-round'
  };
  return routes[roundType] || '/dashboard';
};

const shouldRedirectToNextRound = () => {
  const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
  const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
  return completedRounds.length < selectedRounds.length;
};


  const submitHandler = async (e) => {
    if (e) e.preventDefault();
    if (submitted) return;

    // 🆕 ADD: Validation check before submission
    if (!areAllQuestionsAttempted()) {
      setSubmitError("❌ Please attempt all questions before submitting. All questions are mandatory.");
      
      // 🆕 ADD: Scroll to error message
      setTimeout(() => {
        const errorElement = document.getElementById('submit-error');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return;
    }

    setSubmitted(true);
    setSubmitError(""); // Clear any previous errors
    
    try {
      const interviewId = localStorage.getItem("interviewId");
      const progress = calculateProgress();

       const payload = {
      interviewId,
      roundType: "hr",
      questions: questions.map(q => ({ // 🆕 CONVERT to plain objects
        question: q.question,
        id: q.id,
        answer: q.answer || '',
        feedback: q.feedback || '',
        score: q.score || 0
      })),
      answers,
      clientScore: progress,
    };


const res = await axios.post(`${API}/submit`, payload, {
      timeout: 30000 // 🆕 ADD timeout
    });      

    if (res.data?.success) {
      alert(`✅ HR Round Completed! Score: ${res.data.score}%`);
      
      // 🆕 ROUND SEQUENCING - Mark completed and check next round
      markRoundCompleted("hr");
      localStorage.removeItem("questions_hr");
      localStorage.setItem("lastRound", "HR");
      localStorage.setItem("lastScore", String(res.data.score));

      // Check if there are more rounds
      if (shouldRedirectToNextRound()) {
        const nextRound = getNextRound();
        const nextRoute = getRoundRoute(nextRound);
        console.log(`🔄 Redirecting to next round: ${nextRound}`);
        setTimeout(() => {
          navigate(nextRoute);
        }, 1500);
      } else {
        console.log("🎉 All rounds completed! Redirecting to dashboard");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } else {
      alert("Submission failed");
      setSubmitted(false);
    }
  } catch (err) {
    console.error("HR submit error:", err);
    alert("Server error");
    setSubmitted(false);
  }
};

  const navigateQuestion = (direction) => {
    if (direction === 'next' && currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading HR Questions...</p>
        </div>
      </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion] || {};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">HR Round</h1>
            <p className="text-gray-400 mt-2">
              {questions.length} behavioral questions • 20 minutes {/* 🆕 UPDATED: 20 minutes */}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className={`px-4 py-2 rounded font-mono text-lg font-bold border ${
              timeLeft < 300 ? "bg-red-900 border-red-600 text-red-200" : "bg-yellow-900 border-yellow-600 text-yellow-200"
            }`}>
              ⏱ {formatTime()}
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Progress</div>
              <div className="w-20 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 🆕 ADD: Submit Error Message */}
        {submitError && (
          <div 
            id="submit-error"
            className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200 animate-pulse"
          >
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <div>
                <p className="font-semibold">{submitError}</p>
                <p className="text-sm text-red-300 mt-1">
                  You have answered {Object.values(answers).filter(a => a && a.trim() !== "").length} out of {questions.length} questions.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/4 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="font-bold text-lg mb-4 text-white">Questions</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((q, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    currentQuestion === index
                      ? "bg-blue-600 text-white border-blue-500"
                      : answers[index] && answers[index].trim() !== ""
                        ? "bg-green-900 border-green-600 text-green-200"
                        : "bg-gray-700 border-gray-600 hover:bg-gray-600 text-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-sm">Q{index + 1}</span>
                    {answers[index] && answers[index].trim() !== "" && (
                      <span className="text-green-400 text-xs">✓</span>
                    )}
                  </div>
                  <p className="text-xs truncate text-gray-300">
                    {q.question?.substring(0, 40)}...
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-600">
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Completion</span>
                  <span>{calculateProgress()}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      calculateProgress() === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-1 text-center">
                  {Object.values(answers).filter(a => a && a.trim() !== "").length} of {questions.length} answered
                </div>
              </div>

              <button
                onClick={submitHandler}
                disabled={submitted}
                className={`w-full py-3 rounded font-semibold transition-all ${
                  submitted 
                    ? "bg-gray-600 cursor-not-allowed text-gray-400" 
                    : areAllQuestionsAttempted()
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-lg"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {submitted ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </span>
                ) : areAllQuestionsAttempted() ? (
                  "✅ Submit HR Round"
                ) : (
                  "❌ Complete All Questions"
                )}
              </button>
              
              {/* 🆕 ADD: Submission requirement info */}
              {!areAllQuestionsAttempted() && (
                <div className="mt-2 text-xs text-yellow-400 text-center">
                  All {questions.length} questions must be attempted
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => navigateQuestion('prev')}
                disabled={currentQuestion === 0}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                ← Previous
              </button>

              <div className="text-center">
                <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                {answers[currentQuestion] && answers[currentQuestion].trim() !== "" && (
                  <div className="text-xs text-green-400 mt-1">✓ Answered</div>
                )}
              </div>

              <button
                onClick={() => navigateQuestion('next')}
                disabled={currentQuestion === questions.length - 1}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                Next →
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {currentQ.question}
              </h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-300">
                Your Response {answers[currentQuestion] && answers[currentQuestion].trim() !== "" && (
                  <span className="text-green-400 ml-2">✓ Answered</span>
                )}
              </label>
              <textarea
                value={answers[currentQuestion] || ""}
                onChange={(e) => handleChange(currentQuestion, e.target.value)}
                rows={8}
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none transition-colors"
                placeholder="Type your detailed answer here... (This question must be answered before submission)"
              />
              <div className="text-xs text-gray-400 mt-2">
                {answers[currentQuestion] ? `${answers[currentQuestion].length} characters` : "Please provide your answer"}
              </div>
            </div>

            <div className="bg-blue-900 border border-blue-700 rounded p-4">
              <h3 className="font-semibold text-blue-200 mb-2">💡 Answer Tips</h3>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• Use specific examples from your experience (STAR method)</li>
                <li>• Be honest and authentic in your responses</li>
                <li>• Focus on your contributions and learnings</li>
                <li>• Keep answers concise but comprehensive</li>
                <li>• All questions are mandatory for submission</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}