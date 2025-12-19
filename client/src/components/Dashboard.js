import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [selectedRounds, setSelectedRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [currentInterview, setCurrentInterview] = useState(null);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // 🆕 ADD: Function to handle continuing to next round
  const handleContinueInterview = () => {
    if (!currentInterview) return;

    console.log("🔍 Checking rounds for continuation:", {
      selectedRounds: currentInterview.selectedRounds,
      completedRounds: currentInterview.completedRounds,
      roundsData: Object.keys(currentInterview.rounds || {})
    });

    // ✅ FIX: Find the first selected round that is NOT completed
    const selectedRounds = currentInterview.selectedRounds || [];
    const completedRounds = currentInterview.completedRounds || [];
    
    console.log("📊 Round Status:", {
      selected: selectedRounds,
      completed: completedRounds
    });

    // Find first selected round that hasn't been completed
    const roundToContinue = selectedRounds.find(round => 
      !completedRounds.includes(round)
    );

    if (roundToContinue) {
      console.log(`➡️ Continuing ${roundToContinue} round for interview: ${currentInterview.interviewId}`);
      
      // Store interview ID in localStorage for the round component to use
      localStorage.setItem("interviewId", currentInterview.interviewId);
      localStorage.setItem("selectedRole", currentInterview.role);
      
      // Navigate to the specific round
      navigate(`/${roundToContinue}-round`);
    } else {
      // If all rounds have scores, show results
      console.log("✅ All rounds completed, showing results");
      navigate("/interview");
    }
  };

  const syncInterviewData = async () => {
    const userId = localStorage.getItem("userId");
    const interviewId = localStorage.getItem("interviewId");
    
    if (!interviewId && userId) {
      try {
        const response = await axios.get(`http://localhost:5000/api/interview/results/user/${userId}`);
        if (response.data.success) {
          localStorage.setItem("interviewId", response.data.interview.interviewId);
          setCurrentInterview(response.data.interview);
          setCurrentFeedback(response.data.feedback);
        }
      } catch (error) {
        console.warn("Data sync failed:", error);
      }
    }
  };

  // Fetch current interview data from backend
  useEffect(() => {
    syncInterviewData();
    const fetchCurrentInterview = async () => {
      try {
        const interviewId = localStorage.getItem("interviewId");
        const userId = localStorage.getItem("userId");
        
        let response = null;

        if (interviewId) {
          try {
            response = await axios.get(`http://localhost:5000/api/interview/results/${interviewId}`);
          } catch (interviewIdError) {
            console.warn("Fetch by interviewId failed, trying userId");
            localStorage.removeItem("interviewId");
          }
        }
        
        if (!response && userId) {
          try {
            response = await axios.get(`http://localhost:5000/api/interview/results/user/${userId}`);
            if (response.data.success && response.data.interview) {
              localStorage.setItem("interviewId", response.data.interview.interviewId);
            }
          } catch (userIdError) {
            console.warn("Fetch by userId also failed");
          }
        }

        if (response && response.data.success) {
          setCurrentInterview(response.data.interview);
          setCurrentFeedback(response.data.feedback);
        } else {
          setCurrentInterview(null);
          setCurrentFeedback(null);
          localStorage.removeItem("interviewId");
          localStorage.removeItem("currentRound");
          localStorage.removeItem("selectedRounds");
        }
      } catch (error) {
        console.error("Error fetching current interview data:", error);
        setCurrentInterview(null);
        setCurrentFeedback(null);
      } finally {
        setLoadingCurrent(false);
      }
    };

    fetchCurrentInterview();
  }, []);

  // Fetch feedback specifically
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!currentInterview || currentFeedback) return;

      try {
        const response = await axios.get(`http://localhost:5000/api/interview/feedback?interviewId=${currentInterview.interviewId}`);
        if (response.data.success) {
          setCurrentFeedback(response.data.feedback);
        }
      } catch (error) {
        console.error("Error fetching specific feedback:", error);
      }
    };

    fetchFeedback();
  }, [currentInterview, currentFeedback]);

  // Load interview history
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("interviewHistory") || "[]");
    const validHistory = history.filter(interview => 
      interview && interview.role && interview.rounds && interview.rounds.length > 0
    );
    setInterviewHistory(validHistory);
  }, []);

  const roles = [
    "Frontend Developer",
    "Backend Developer", 
    "Full Stack Developer",
    "Data Scientist",
    "DevOps Engineer",
    "Software Engineer"
  ];

  const rounds = [
    { id: "coding", name: "Coding Round", icon: "💻", color: "from-purple-500 to-pink-500" },
    { id: "hr", name: "HR Round", icon: "💬", color: "from-green-500 to-teal-500" },
    { id: "aptitude", name: "Aptitude Round", icon: "🧮", color: "from-blue-500 to-cyan-500" },
    { id: "technical", name: "Technical Round", icon: "🧠", color: "from-orange-500 to-red-500" }
  ];

  const handleRoundToggle = (roundId) => {
    setSelectedRounds(prev =>
      prev.includes(roundId)
        ? prev.filter(r => r !== roundId)
        : [...prev, roundId]
    );
  };

  const startInterview = () => {
    if (!role) {
      setShowRoleWarning(true);
      setTimeout(() => {
        setShowRoleWarning(false);
      }, 5000);
      return;
    }
    
    if (selectedRounds.length === 0) {
      alert("Please select at least one round");
      return;
    }

    // Clear any previous data but keep userId
    const userId = localStorage.getItem("userId");
    localStorage.removeItem("questions_coding");
    localStorage.removeItem("questions_hr");
    localStorage.removeItem("questions_aptitude");
    localStorage.removeItem("questions_technical");
    localStorage.removeItem("interviewId");
    localStorage.removeItem("lastRound");
    localStorage.removeItem("lastScore");
    localStorage.removeItem("endTime");
    localStorage.removeItem("currentRound");
    localStorage.removeItem("selectedRounds");

    // Store new interview data
    localStorage.setItem("role", role);
    localStorage.setItem("selectedRounds", JSON.stringify(selectedRounds));
    localStorage.setItem("userId", userId);
    localStorage.setItem("startTime", new Date().toISOString());

    setLoading(true);
    
    // Navigate to the first selected round
    const firstRound = selectedRounds[0];
    if (firstRound === "aptitude") {
      navigate("/aptitude-round");
    } else if (firstRound === "coding") {
      navigate("/coding-round");
    } else if (firstRound === "technical") {
      navigate("/technical-round");
    } else if (firstRound === "hr") {
      navigate("/hr-round");
    } else {
      navigate("/interview");
    }
  };

  const handleStartFirstInterview = () => {
    const interviewSetupSection = document.getElementById('interview-setup');
    if (interviewSetupSection) {
      interviewSetupSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    
    if (!role) {
      setShowRoleWarning(true);
      setTimeout(() => {
        setShowRoleWarning(false);
      }, 5000);
    }
  };

  const generateFeedback = async () => {
    if (!currentInterview) return;
    
    try {
      setLoadingCurrent(true);
      const response = await axios.post('http://localhost:5000/api/interview/generate-feedback', {
        interviewId: currentInterview.interviewId
      }, {
        timeout: 15000
      });
      
      if (response.data.success) {
        setCurrentFeedback(response.data.feedback);
        alert("✅ AI Feedback generated successfully!");
      } else {
        alert("❌ No feedback generated. Please complete at least one round.");
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
        alert("🚨 Backend server is not responding. Please check if the server is running on port 5000.");
      } else {
        alert("❌ Failed to generate feedback. Please try again.");
      }
    } finally {
      setLoadingCurrent(false);
    }
  };

  // 🆕 ADD: Function to get round status with improved logic
  const getRoundStatus = (roundName, completedRounds = []) => {
    if (completedRounds.includes(roundName)) return "completed";
    return "not-started";
  };

  // 🆕 ADD: Function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-yellow-500";
      case "not-started": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  // 🆕 ADD: Function to get status text
  const getStatusText = (status) => {
    switch (status) {
      case "completed": return "Completed";
      case "in-progress": return "In Progress";
      case "not-started": return "Not Started";
      default: return "Not Started";
    }
  };

  const renderScoreChart = (interview) => {
    if (!interview || !interview.rounds) return null;
    
    const roundEntries = Object.entries(interview.rounds).filter(([_, roundData]) => 
      roundData && roundData.score !== null && roundData.score !== undefined
    );

    if (roundEntries.length === 0) return null;

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <span className="text-cyan-400 mr-3">📊</span>
          Performance Overview
        </h3>
        <div className="space-y-4">
          {roundEntries.map(([roundKey, roundData]) => {
            const roundConfig = rounds.find(r => r.id === roundKey);
            return (
              <div key={roundKey} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium capitalize flex items-center">
                    <span className="mr-2">{roundConfig?.icon || '📝'}</span>
                    {roundKey} Round
                  </span>
                  <span className="text-white font-bold">{roundData.score}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full bg-gradient-to-r ${roundConfig?.color || 'from-cyan-500 to-blue-500'} shadow-lg transition-all duration-1000 ease-out`}
                    style={{ width: `${roundData.score}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        {interview.overall?.averageScore && (
          <div className="mt-6 pt-6 border-t border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold text-white">Overall Score</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                {interview.overall.averageScore}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="h-4 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 shadow-lg transition-all duration-1000 ease-out"
                style={{ width: `${interview.overall.averageScore}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAIFeedback = (feedback) => {
    if (!feedback) {
      return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="text-purple-400 mr-3">🤖</span>
            AI Feedback & Analysis
          </h3>
          <div className="text-center py-8">
            <div className="text-4xl mb-4 text-gray-600">📝</div>
            <p className="text-gray-400 mb-4">No AI feedback available yet.</p>
            <button
              onClick={generateFeedback}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6 py-3 rounded-xl text-white font-semibold transition-all"
            >
              🔄 Generate Feedback
            </button>
            <p className="text-gray-500 text-sm mt-3">
              AI-powered analysis of your performance
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-6 rounded-2xl border border-purple-500/30 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="text-purple-400 mr-3">🤖</span>
          AI Feedback & Analysis
        </h3>
        
        <div className="space-y-4">
          {feedback.averageScore && (
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
              <span className="text-gray-300 font-semibold">Overall Performance</span>
              <div className="text-right">
                <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                  {feedback.averageScore}%
                </span>
                <div className="text-xs text-gray-400 mt-1">
                  {feedback.averageScore >= 90 ? "Excellent! 🎉" : 
                   feedback.averageScore >= 75 ? "Very Good! 👍" : 
                   feedback.averageScore >= 60 ? "Good! 💪" : "Keep Practicing! 🔥"}
                </div>
              </div>
            </div>
          )}

          {feedback.improvement && (
            <div className="p-4 bg-black/20 rounded-xl">
              <h4 className="text-orange-300 font-semibold mb-2">Areas for Improvement</h4>
              <p className="text-gray-200 leading-relaxed text-sm">
                {feedback.improvement}
              </p>
            </div>
          )}

          {feedback.suggestion && (
            <div className="p-4 bg-black/20 rounded-xl">
              <h4 className="text-cyan-300 font-semibold mb-2">Suggestions</h4>
              <p className="text-gray-200 leading-relaxed text-sm">
                {feedback.suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const clearCurrentInterview = () => {
    localStorage.removeItem("interviewId");
    localStorage.removeItem("currentRound");
    localStorage.removeItem("selectedRounds");
    localStorage.removeItem("questions_aptitude");
    localStorage.removeItem("questions_coding");
    localStorage.removeItem("questions_technical");
    localStorage.removeItem("questions_hr");
    setCurrentInterview(null);
    setCurrentFeedback(null);
    alert("🧹 Current interview data cleared!");
  };

  // 🆕 ADD: Calculate if there are pending rounds
  const hasPendingRounds = currentInterview && 
    currentInterview.selectedRounds && 
    currentInterview.completedRounds &&
    currentInterview.selectedRounds.length > currentInterview.completedRounds.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
              📊 Interview Dashboard
            </h1>
            <p className="text-gray-400 text-lg">
              Welcome back, {user?.name}! Track your performance and master your interview skills
            </p>
          </div>
        </div>

        {/* Role Selection Warning */}
        {showRoleWarning && (
          <div className="mb-6 p-4 bg-yellow-900 border border-yellow-700 rounded-xl text-yellow-200 animate-pulse">
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <div>
                <p className="font-semibold">Please select a role first!</p>
                <p className="text-sm text-yellow-300">Choose your target role from the options below to start your interview.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Start New Interview */}
          <div className="xl:col-span-1" id="interview-setup">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="text-cyan-400 mr-3">🚀</span>
                Start New Interview
              </h2>
              
              {/* Role Selection */}
              <div className="mb-8">
                <label className="block text-cyan-300 mb-4 font-semibold text-lg">Select Target Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Choose Your Role --</option>
                  {roles.map((role, i) => (
                    <option key={i} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Rounds Selection */}
              <div className="mb-8">
                <label className="block text-cyan-300 mb-4 font-semibold text-lg">Select Rounds</label>
                <div className="grid grid-cols-2 gap-4">
                  {rounds.map((round) => (
                    <div
                      key={round.id}
                      onClick={() => handleRoundToggle(round.id)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                        selectedRounds.includes(round.id)
                          ? `border-cyan-400 bg-gradient-to-br ${round.color} bg-opacity-20 shadow-lg`
                          : "border-gray-600 bg-gray-700 hover:border-cyan-500"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{round.icon}</div>
                        <div className="text-white font-medium text-sm">{round.name}</div>
                        {selectedRounds.includes(round.id) && (
                          <div className="text-green-400 text-xs mt-1">✓ Selected</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={startInterview}
                disabled={loading || !role || selectedRounds.length === 0}
                className={`w-full py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105 ${
                  loading || !role || selectedRounds.length === 0
                    ? "bg-gray-600 cursor-not-allowed text-gray-400"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-2xl"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Starting Interview...
                  </span>
                ) : (
                  "🎯 Begin Interview Journey"
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Current Interview & Analytics */}
          <div className="xl:col-span-2 space-y-8">
            {/* Current Interview Section */}
            {loadingCurrent ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ) : currentInterview ? (
              <div className="space-y-8">
                {/* Current Interview Header */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-cyan-500/30 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <span className="text-cyan-400 mr-3">📋</span>
                        Current Interview
                      </h2>
                      <p className="text-gray-400 mt-1">Real-time performance tracking</p>
                    </div>
                    <div className="flex gap-2">
                      {/* 🆕 ADD: Continue Interview Button */}
                      {hasPendingRounds && (
                        <button
                          onClick={handleContinueInterview}
                          className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all"
                        >
                          ➡️ Continue Interview
                        </button>
                      )}
                      <button
                        onClick={clearCurrentInterview}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all"
                      >
                        🧹 Clear Session
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-gray-600">
                      <div className="text-gray-400 text-sm mb-1">Role</div>
                      <div className="text-cyan-300 font-bold text-lg">{currentInterview.role}</div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-gray-600">
                      <div className="text-gray-400 text-sm mb-1">Status</div>
                      <div className={`font-bold text-lg ${
                        currentInterview.status === 'completed' ? 'text-green-400' : 
                        currentInterview.status === 'active' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {currentInterview.status?.toUpperCase() || 'ACTIVE'}
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-gray-600">
                      <div className="text-gray-400 text-sm mb-1">Rounds Completed</div>
                      <div className="text-white font-bold text-lg">
                        {currentInterview?.completedRounds?.length || 0} / {currentInterview?.selectedRounds?.length || 1}
                      </div>
                    </div>
                  </div>

                  {/* 🆕 ADD: Round Progress Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <span className="text-yellow-400 mr-2">📈</span>
                      Round Progress
                    </h3>
                    <div className="space-y-3">
                      {currentInterview.selectedRounds?.map((roundName) => {
                        const roundData = currentInterview.rounds?.[roundName];
                        const status = getRoundStatus(roundName, currentInterview.completedRounds || []);
                        
                        return (
                          <div key={roundName} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} mr-3`}></div>
                              <span className="text-white capitalize">
                                {roundName} Round
                              </span>
                            </div>
                            <span className={`text-sm ${
                              status === "completed" ? "text-green-400" :
                              status === "in-progress" ? "text-yellow-400" :
                              "text-gray-400"
                            }`}>
                              {getStatusText(status)}
                              {status === "completed" && roundData?.score !== null && (
                                <span className="ml-2">({roundData.score}%)</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Performance Chart */}
                {renderScoreChart(currentInterview)}

                {/* AI Feedback */}
                {renderAIFeedback(currentFeedback)}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-12 border border-gray-700 shadow-2xl text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-white mb-4">No Active Interview</h3>
                <p className="text-gray-400 mb-6">Start a new interview to begin your practice session and track your progress with AI-powered feedback.</p>
                <button
                  onClick={handleStartFirstInterview}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-8 py-4 rounded-xl text-white font-semibold transition-all hover:scale-105 shadow-lg"
                >
                  🚀 Start Your First Interview
                </button>
                <p className="text-gray-500 text-sm mt-3">
                  Click to set up your interview preferences
                </p>
              </div>
            )}

            {/* Interview History */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="text-purple-400 mr-3">📚</span>
                Interview History
              </h2>
              
              {interviewHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interviewHistory.map((interview, index) => (
                    <div key={index} className="bg-gray-700/50 p-6 rounded-xl border border-gray-600 hover:border-cyan-500/50 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-cyan-300 font-bold text-lg">{interview.role}</span>
                        <span className="text-gray-400 text-sm bg-black/30 px-2 py-1 rounded">
                          {interview.date || "Recent"}
                        </span>
                      </div>
                      <div className="text-gray-300 text-sm mb-3">
                        Rounds: {interview.rounds?.join(", ") || "N/A"}
                      </div>
                      {interview.score && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Score:</span>
                          <span className="text-green-400 font-bold text-xl">
                            {interview.score}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 text-gray-600">📊</div>
                  <p className="text-gray-400">No interview history yet. Complete an interview to see your progress here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}