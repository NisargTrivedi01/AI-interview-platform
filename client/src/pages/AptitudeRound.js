import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BackendError from "../components/BackendError";
import Navbar from "../components/Navbar";  

export default function AptitudeRound() {
  const [backendError, setBackendError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(""); // 🆕 ADD: Submit validation error
  const navigate = useNavigate();

  const API = "http://localhost:5000/api/interview";

 // 🐛 DEBUG: Comprehensive round status check
const debugRoundStatus = () => {
  console.log('🐛 COMPREHENSIVE ROUND STATUS DEBUG:');
  console.log('Current Round:', currentRound);
  
  const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
  const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
  
  console.log('Selected Rounds from localStorage:', selectedRounds);
  console.log('Completed Rounds from localStorage:', completedRounds);
  console.log('Selected Rounds length:', selectedRounds.length);
  console.log('Completed Rounds length:', completedRounds.length);
  
  const nextRound = getNextRound();
  const shouldRedirect = shouldRedirectToNextRound();
  
  console.log('Next Round:', nextRound);
  console.log('Should Redirect:', shouldRedirect);
  console.log('Completion Ratio:', `${completedRounds.length}/${selectedRounds.length}`);
  
  // Check if current round is in selected rounds
  console.log('Current round in selected rounds:', selectedRounds.includes(currentRound));
  console.log('Current round in completed rounds:', completedRounds.includes(currentRound));
};

  // ---------------------- GET CURRENT ROUND NAME ----------------------
  const currentRound = localStorage.getItem("currentRound") || "aptitude";

  // 🆕 ADD: Function to check if all questions are attempted
  const areAllQuestionsAttempted = useCallback(() => {
    if (questions.length === 0) return false;
    
    for (let i = 0; i < questions.length; i++) {
      const answer = answers[i];
      if (!answer || String(answer).trim() === "") {
        return false;
      }
    }
    return true;
  }, [answers, questions]);

  // 🆕 ADD: Function to get unanswered questions
  const getUnansweredQuestions = useCallback(() => {
    const unanswered = [];
    for (let i = 0; i < questions.length; i++) {
      if (!answers[i] || String(answers[i]).trim() === "") {
        unanswered.push(i + 1);
      }
    }
    return unanswered;
  }, [answers, questions]);

  // --------------------------- LOAD QUESTIONS -------------------------
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setBackendError(null);
        const stored = localStorage.getItem(`questions_${currentRound}`);
        const interviewId = localStorage.getItem("interviewId");
        const userId = localStorage.getItem("userId");

        console.log("🔄 Loading questions for round:", currentRound);
        console.log("📝 Stored questions:", stored ? "Found" : "Not found");
        console.log("👤 User ID:", userId);
        console.log("📋 Interview ID:", interviewId);

        if (stored) {
          const parsedQuestions = JSON.parse(stored);
          setQuestions(parsedQuestions);
          console.log("✅ Loaded questions from localStorage:", parsedQuestions.length);
        } else {
          const role = localStorage.getItem("role") || "Frontend Developer";
          
          // If we have an interviewId, try to continue existing interview
          if (interviewId) {
            try {
              console.log("🔄 Continuing existing interview:", interviewId);
              const res = await axios.get(`${API}/results/${interviewId}`);
              
              if (res.data?.success && res.data.interview?.rounds?.[currentRound]?.questions) {
                const existingQuestions = res.data.interview.rounds[currentRound].questions;
                setQuestions(existingQuestions);
                localStorage.setItem(`questions_${currentRound}`, JSON.stringify(existingQuestions));
                console.log("✅ Continued existing interview questions:", existingQuestions.length);
              } else {
                throw new Error("No questions in existing interview");
              }
            } catch (continueError) {
              console.log("❌ Could not continue interview, starting new round:", continueError.message);
              await startNewRound(role, userId);
            }
          } else {
            await startNewRound(role, userId);
          }
        }
      } catch (err) {
        console.error("❌ Load Round Error:", err);
        setBackendError({
          title: "Failed to Load Aptitude Questions",
          message: "Could not connect to the backend server. Please check if the server is running.",
          error: err.message
        });
        const fallback = localStorage.getItem(`questions_${currentRound}`);
        if (fallback) {
          setQuestions(JSON.parse(fallback));
          console.log("✅ Using fallback questions from localStorage");
        }
      } finally {
        setLoading(false);
      }
    };

    const startNewRound = async (role, userId) => {
      try {
        console.log("🚀 Starting new round for role:", role);
        const res = await axios.post(`${API}/start`, {
          role,
          roundType: currentRound,
          userId,
        });

        console.log("📡 Start round response:", res.data);

        if (res.data?.questions) {
          setQuestions(res.data.questions);
          localStorage.setItem(`questions_${currentRound}`, JSON.stringify(res.data.questions));
          
          if (res.data.interviewId) {
            localStorage.setItem("interviewId", res.data.interviewId);
            console.log("✅ Set interviewId:", res.data.interviewId);
          }
          console.log("✅ New questions loaded:", res.data.questions.length);
        } else {
          alert("❌ Failed to load questions from server.");
        }
      } catch (startError) {
        console.error("❌ Start round error:", startError);
        throw startError;
      }
    };

    loadQuestions();
  }, [currentRound]);

  // 🆕 ADD RETRY FUNCTION
  const handleRetry = () => {
    setBackendError(null);
    window.location.reload();
  };

  // --------------------------- SCORE CALC ------------------------------
  const scoreCalc = useCallback(() => {
    if (!questions?.length) return 0;

    let correct = 0;
    console.log("📊 Calculating score for", questions.length, "questions");

    for (let i = 0; i < questions.length; i++) {
      const userAnswer = answers[i];
      const correctAnswer = questions[i].answer;
      const options = questions[i].options || [];

      console.log(`Q${i + 1}: User: ${userAnswer}, Correct: ${correctAnswer}, Options:`, options);

      if (userAnswer && correctAnswer) {
        // 🆕 FIX: Compare option letters instead of option text
        const userOptionIndex = options.findIndex(opt => opt === userAnswer);
        const userOptionLetter = userOptionIndex >= 0 ? String.fromCharCode(65 + userOptionIndex) : null;
        
        console.log(`🔍 User selected: "${userAnswer}" → Option ${userOptionLetter}, Correct: ${correctAnswer}`);

        if (userOptionLetter && correctAnswer) {
          if (String(userOptionLetter).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
            correct++;
            console.log(`✅ Q${i + 1} Correct!`);
          } else {
            console.log(`❌ Q${i + 1} Wrong - Expected ${correctAnswer}, Got ${userOptionLetter}`);
          }
        } else {
          console.log(`❓ Q${i + 1} Could not determine option letter`);
        }
      } else {
        console.log(`❌ Q${i + 1} Missing answer`);
      }
    }

    const score = Math.round((correct / questions.length) * 100);
    console.log(`🎯 Final Score: ${correct}/${questions.length} = ${score}%`);
    return score;
  }, [answers, questions]);


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
    const selectedRounds = JSON.parse(localStorage.getItem('selectedRounds') || '[]');
    const completedRounds = JSON.parse(localStorage.getItem('completedRounds') || '[]');
    
    // 🎯 FIX: Only mark as completed if it's in selectedRounds
    if (selectedRounds.includes(roundType) && !completedRounds.includes(roundType)) {
      const updatedCompletedRounds = [...completedRounds, roundType];
      localStorage.setItem('completedRounds', JSON.stringify(updatedCompletedRounds));
      console.log(`✅ Marked ${roundType} as completed. Progress: ${updatedCompletedRounds.length}/${selectedRounds.length}`);
    } else if (!selectedRounds.includes(roundType)) {
      console.log(`⚠️ ${roundType} not in selected rounds, skipping completion mark`);
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
    
    console.log('🔍 Should Redirect Check:');
    console.log('Selected Rounds:', selectedRounds);
    console.log('Completed Rounds:', completedRounds);
    console.log('Current Round:', currentRound);

     // 🎯 FIX: More accurate check
    const shouldRedirect = completedRounds.length < selectedRounds.length;
    console.log(`🔄 Should redirect to next round? ${shouldRedirect} (${completedRounds.length}/${selectedRounds.length} completed)`);
    
    return shouldRedirect;
  } catch (error) {
    console.error('Error in shouldRedirectToNextRound:', error);
    return false;
  }
};
  // --------------------------- SUBMIT ROUND -----------------------------
  const submitHandler = useCallback(async () => {
    if (submitting) return;

    // 🆕 IMPROVED: Check if all questions are answered with beautiful error
    if (!areAllQuestionsAttempted()) {
      const unanswered = getUnansweredQuestions();
      setSubmitError(`❌ Please attempt all ${unanswered.length} remaining questions before submitting. All questions are mandatory.`);
      
      // Scroll to error message
      setTimeout(() => {
        const errorElement = document.getElementById('submit-error');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return;
    }

    setSubmitting(true);
    setSubmitError(""); // Clear any previous errors
    
    const score = scoreCalc();
    const interviewId = localStorage.getItem("interviewId");
    const userId = localStorage.getItem("userId");

    try {
      const payload = {
        interviewId,
        userId,
        roundType: currentRound,
        answers: answers,
        answersCount: Object.keys(answers).length,
        clientScore: score,
        submittedAt: new Date().toISOString(),
      };

      const res = await axios.post(`${API}/submit`, payload);

      
    if (res.data?.success) {
  // ✅ FIXED: Mark current round as completed FIRST
      debugRoundStatus();
      markRoundCompleted(currentRound);

  
  // Save completion info
  localStorage.setItem("lastRound", currentRound);
  localStorage.setItem("lastScore", String(score));

  console.log("✅ Round completed successfully!");
  
  alert(`✅ ${currentRound.toUpperCase()} Round Completed! Score: ${score}%`);

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
      alert("❌ Submission failed: " + (res.data?.message || "Unknown error"));
    }
  } catch (err) {
    console.error("❌ Submit Error:", err);
    if (err.response) {
      console.error("❌ Server response:", err.response.data);
      alert(`❌ Submission failed: ${err.response.data.message || "Server error"}`);
    } else {
      alert("❌ Failed to submit. Check console for details.");
    }
  } finally {
    setSubmitting(false);
  }
}, [answers, questions, navigate, scoreCalc, currentRound, submitting, areAllQuestionsAttempted, getUnansweredQuestions]);

  // --------------------------- TIMER -----------------------------------
  useEffect(() => {
    // Don't start timer if no questions or already submitting
    if (!questions.length || submitting) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          console.log("⏰ Time's up! Auto-submitting...");
          submitHandler();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [questions.length, submitHandler, submitting]);

  // --------------------------- FORMAT TIME -----------------------------
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🆕 SHOW ERROR COMPONENT
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-xl">Loading {currentRound} Questions...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate answered count for progress
  const answeredCount = Object.values(answers).filter(answer => 
    answer && String(answer).trim() !== ""
  ).length;

  // --------------------------- RENDER QUESTIONS ------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white p-6">
      <Navbar />
      
      <div className="max-w-4xl mx-auto pt-4">
        {/* 🆕 ADD: Submit Error Message */}
        {submitError && (
          <div 
            id="submit-error"
            className="mb-6 p-4 bg-red-900 border border-red-700 rounded-xl text-red-200 animate-pulse shadow-lg"
          >
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <div>
                <p className="font-semibold text-lg">{submitError}</p>
                <p className="text-sm text-red-300 mt-1">
                  You have answered {answeredCount} out of {questions.length} questions.
                  {getUnansweredQuestions().length > 0 && (
                    <span className="font-semibold"> Unanswered: {getUnansweredQuestions().join(", ")}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {currentRound.toUpperCase()} ROUND
            </h1>
            <p className="text-gray-400">Complete all questions before time runs out</p>
          </div>
          
          {/* Timer */}
          <div className={`text-2xl font-bold px-6 py-3 rounded-xl border-2 ${
            timeLeft < 300 ? 'border-red-500 bg-red-500/20 text-red-400' : 
            timeLeft < 600 ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 
            'border-cyan-500 bg-cyan-500/20 text-cyan-400'
          }`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Progress</span>
            <span className={`font-bold ${
              answeredCount === questions.length ? 'text-green-400' : 'text-cyan-400'
            }`}>
              {answeredCount} / {questions.length} Answered
              {answeredCount === questions.length && ' ✅'}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                answeredCount === questions.length ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            ></div>
          </div>
          {answeredCount !== questions.length && (
            <div className="text-xs text-yellow-400 mt-2 text-center">
              ❌ {questions.length - answeredCount} questions remaining - All questions must be answered
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6 mb-24">
          {questions.map((q, i) => (
            <div key={i} className={`bg-gray-800/50 rounded-xl p-6 border transition-all ${
              answers[i] && String(answers[i]).trim() !== "" 
                ? "border-green-500/50 shadow-lg" 
                : "border-gray-700 hover:border-cyan-500/30"
            }`}>
              <div className="flex items-start mb-4">
                <span className={`rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0 font-bold ${
                  answers[i] && String(answers[i]).trim() !== "" 
                    ? "bg-green-500 text-white" 
                    : "bg-cyan-500 text-black"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-white leading-relaxed">{q.question}</p>
                  {answers[i] && String(answers[i]).trim() !== "" && (
                    <div className="text-green-400 text-sm mt-1 flex items-center">
                      <span className="mr-1">✓</span> Answered
                    </div>
                  )}
                </div>
              </div>

              {Array.isArray(q.options) && q.options.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {q.options.map((opt, j) => {
                    const optionKey = String.fromCharCode(65 + j); // A, B, C, D
                    return (
                      <button
                        key={j}
                        className={`p-4 rounded-xl border-2 text-left transition-all transform hover:scale-105 ${
                          answers[i] === opt 
                            ? "bg-green-500/20 border-green-500 text-green-300 shadow-lg" 
                            : "bg-gray-700/50 border-gray-600 text-gray-300 hover:border-cyan-400/50 hover:bg-gray-700"
                        }`}
                        onClick={() => {
                          setAnswers((prev) => ({ ...prev, [i]: opt }));
                          // Clear submit error when user answers a question
                          if (submitError) {
                            setSubmitError("");
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <span className={`font-bold mr-3 ${
                            answers[i] === opt ? "text-green-400" : "text-gray-400"
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
                  value={answers[i] || ""}
                  onChange={(e) => {
                    setAnswers((prev) => ({ ...prev, [i]: e.target.value }));
                    // Clear submit error when user types
                    if (submitError) {
                      setSubmitError("");
                    }
                  }}
                  placeholder="Type your answer here... (This question must be answered)"
                  className="w-full mt-3 p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  rows={4}
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-gray-700">
            <button
              onClick={submitHandler}
              disabled={submitting || !areAllQuestionsAttempted()}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all transform min-w-64 ${
                submitting 
                  ? "bg-gray-600 cursor-not-allowed text-gray-400" 
                  : areAllQuestionsAttempted()
                    ? "bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white shadow-lg hover:scale-105"
                    : "bg-gray-600 cursor-not-allowed text-gray-400"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Submitting...
                </span>
              ) : areAllQuestionsAttempted() ? (
                <span className="flex items-center justify-center">
                  ✅ Submit {currentRound.toUpperCase()} Round
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  ❌ Complete All Questions ({answeredCount}/{questions.length})
                </span>
              )}
            </button>
            
            {/* 🆕 ADD: Submission requirement info */}
            {!areAllQuestionsAttempted() && (
              <div className="mt-2 text-xs text-yellow-400 text-center">
                All {questions.length} questions must be attempted before submission
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-16 mb-8 text-center text-gray-400 text-sm">
          <p>All questions must be answered before submitting</p>
          <p>Time remaining: {formatTime(timeLeft)}</p>
        </div>
      </div>
    </div>
  );
}