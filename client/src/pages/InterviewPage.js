import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";  

export default function InterviewPage() {
  const [interviewData, setInterviewData] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const API = "http://localhost:5000/api";

  // Data sync function
  const syncInterviewData = async () => {
    const userId = localStorage.getItem("userId");
    const interviewId = localStorage.getItem("interviewId");
    
    if (!interviewId && userId) {
      try {
        const response = await axios.get(`http://localhost:5000/api/interview/results/user/${userId}`);
        if (response.data.success) {
          localStorage.setItem("interviewId", response.data.interview.interviewId);
          setInterviewData(response.data.interview);
          setFeedback(response.data.feedback);
        }
      } catch (error) {
        console.warn("Data sync failed:", error);
      }
    }
  };

  useEffect(() => {
    syncInterviewData();
    loadInterviewData();
  }, []);

  // Data consistency logic
  useEffect(() => {
    const checkDataConsistency = async () => {
      const interviewId = localStorage.getItem("interviewId");
      const userId = localStorage.getItem("userId");
      
      if (!interviewId && userId) {
        try {
          const response = await axios.get(`http://localhost:5000/api/interview/results/user/${userId}`);
          if (response.data.success && response.data.interview) {
            localStorage.setItem("interviewId", response.data.interview.interviewId);
            setInterviewData(response.data.interview);
            setFeedback(response.data.feedback);
          }
        } catch (error) {
          console.warn("Could not sync interview data:", error);
        }
      }
    };

    checkDataConsistency();
  }, []);

  const loadInterviewData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      const interviewId = localStorage.getItem("interviewId");

      console.log("🔄 Loading interview data for:", { interviewId, userId });

      let interviewResponse = null;
      let feedbackResponse = null;

      // Try to get data from backend first by interviewId
      if (interviewId) {
        try {
          interviewResponse = await axios.get(`${API}/interview/results/${interviewId}`);
          console.log("✅ Interview data loaded from backend:", interviewResponse.data);
          
          if (interviewResponse.data.success) {
            setInterviewData(interviewResponse.data.interview);
            
            // Try to load feedback separately
            try {
              feedbackResponse = await axios.get(`${API}/interview/feedback?interviewId=${interviewId}`);
              if (feedbackResponse.data.success) {
                setFeedback(feedbackResponse.data.feedback);
              }
            } catch (feedbackError) {
              console.log("No feedback available yet");
            }
            
            setLoading(false);
            return;
          }
        } catch (interviewError) {
          console.log("❌ Could not fetch interview by ID, trying user ID:", interviewError.message);
        }
      }

      // Fallback to userId if interviewId fails
      if (userId && !interviewResponse) {
        try {
          interviewResponse = await axios.get(`${API}/interview/results/user/${userId}`);
          console.log("✅ Interview data loaded by user ID:", interviewResponse.data);
          
          if (interviewResponse.data.success) {
            setInterviewData(interviewResponse.data.interview);
            setFeedback(interviewResponse.data.feedback);
            setLoading(false);
            return;
          }
        } catch (userError) {
          console.log("❌ Could not fetch by user ID either:", userError.message);
        }
      }

      // Final fallback to localStorage data
      console.log("📦 Using localStorage fallback data");
      const role = localStorage.getItem("role");
      const selectedRounds = JSON.parse(localStorage.getItem("selectedRounds") || "[]");
      const startTime = localStorage.getItem("startTime");
      const lastRound = localStorage.getItem("lastRound");
      const lastScore = localStorage.getItem("lastScore");
      
      if (role && selectedRounds.length > 0) {
        setInterviewData({
          userId,
          interviewId,
          role,
          selectedRounds,
          lastRound,
          lastScore,
          startTime,
          status: "active",
          rounds: {},
          overall: { averageScore: lastScore || 0, status: "In Progress" },
          completedRounds: lastRound ? [lastRound] : []
        });
      }
    } catch (error) {
      console.error("❌ Error loading interview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadInterviewData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  const calculateDuration = () => {
    const startTime = interviewData?.startTime;
    const endTime = interviewData?.endTime;
    
    if (!startTime) return "N/A";
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const getStatusColor = (status) => {
    return status === "completed" ? "text-green-400" : "text-yellow-400";
  };

  // ✅ FIX: Filter rounds to only show selected ones
  const getFilteredRounds = () => {
    if (!interviewData?.rounds || !interviewData?.selectedRounds) return {};
    
    const filtered = {};
    Object.keys(interviewData.rounds).forEach(roundKey => {
      if (interviewData.selectedRounds.includes(roundKey)) {
        filtered[roundKey] = interviewData.rounds[roundKey];
      }
    });
    return filtered;
  };

  // Calculate rounds completed properly
  const filteredRounds = getFilteredRounds();
  const roundsCompleted = interviewData?.completedRounds?.length || 0;
  const totalRounds = interviewData?.selectedRounds?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading Interview Data...</p>
        </div>
      </div>
    );
  }

  if (!interviewData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">No Active Interview</h1>
          <p className="text-gray-400 mb-8">Start a new interview from the dashboard</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Interview Summary</h1>
              <p className="text-gray-400">Detailed overview of your interview performance</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                📊 Back to Dashboard
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-2">User ID</h3>
              <p className="text-gray-300 font-mono text-sm">{interviewData.userId}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Role</h3>
              <p className="text-gray-300">{interviewData.role}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Status</h3>
              <p className={`font-semibold text-lg ${getStatusColor(interviewData.status)}`}>
                {interviewData.status?.toUpperCase() || "ACTIVE"}
              </p>
            </div>
          </div>

          {/* Overall Performance */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold mb-6">Overall Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Average Score</h3>
                <p className="text-4xl font-bold text-blue-400">
                  {interviewData.overall?.averageScore || 0}%
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Rounds Completed</h3>
                <div className="text-gray-400">Rounds Completed</div>
                <div className="text-white font-semibold">
                  {roundsCompleted} / {totalRounds}
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Duration</h3>
                <p className="text-2xl text-gray-300">{calculateDuration()}</p>
              </div>
            </div>
          </div>

          {/* AI Feedback Section */}
          {feedback && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
              <h2 className="text-2xl font-bold mb-4">AI Feedback & Analysis</h2>
              <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500/30">
                <div className="space-y-4">
                  {feedback.averageScore && (
                    <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
                      <span className="text-gray-300 font-semibold">Overall Score</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                        {feedback.averageScore}%
                      </span>
                    </div>
                  )}
                  {feedback.improvement && (
                    <div className="p-4 bg-black/20 rounded-xl">
                      <h4 className="text-orange-300 font-semibold mb-2">Areas for Improvement</h4>
                      <p className="text-gray-200 leading-relaxed">{feedback.improvement}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rounds Summary - ✅ FIXED: Only show selected rounds */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold mb-4">Rounds Summary</h2>
            <div className="space-y-4">
              {/* Show completed rounds - ONLY SELECTED ONES */}
              {Object.entries(filteredRounds).map(([roundType, roundData]) => (
                <div key={roundType} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <h3 className="text-lg font-semibold capitalize">{roundType} Round</h3>
                    <div className="flex gap-2">
                      <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
                        Completed
                      </span>
                      <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">
                        Score: {roundData.score || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <span className="font-semibold">Submitted:</span> {formatDate(roundData.submittedAt)}
                    </div>
                    <div>
                      <span className="font-semibold">Questions:</span> {roundData.questions?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show pending rounds - ONLY SELECTED ONES */}
              {interviewData.selectedRounds?.map((roundType, index) => {
                const isCompleted = filteredRounds[roundType];
                if (!isCompleted) {
                  return (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg border border-gray-600 opacity-75">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold capitalize">{roundType} Round</h3>
                        <span className="bg-gray-600 px-3 py-1 rounded-full text-sm">
                          Pending
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">This round has not been started yet.</p>
                    </div>
                  );
                }
                return null;
              })}

              {/* Show message if no rounds */}
              {Object.keys(filteredRounds).length === 0 && (!interviewData.selectedRounds || interviewData.selectedRounds.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  No rounds available. Please start an interview from the dashboard.
                </div>
              )}
            </div>
          </div>

          {/* Interview Details */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Interview Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Selected Rounds</h3>
                <p className="text-gray-300">
                  {interviewData.selectedRounds?.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ") || "N/A"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Start Time</h3>
                <p className="text-gray-300">{formatDate(interviewData.startTime)}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">End Time</h3>
                <p className="text-gray-300">
                  {interviewData.endTime ? formatDate(interviewData.endTime) : "Interview in progress"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Total Duration</h3>
                <p className="text-gray-300">
                  {interviewData.status === "completed" ? "Completed" : "In Progress"} • {calculateDuration()}
                </p>
              </div>
            </div>
          </div>

          {/* Continue Buttons */}
          {interviewData.status === "active" && (
            <div className="mt-8 flex gap-4 justify-center">
              {interviewData.selectedRounds?.includes("aptitude") && 
               !filteredRounds.aptitude && (
                <button
                  onClick={() => navigate("/aptitude-round")}
                  className="bg-cyan-600 px-6 py-3 rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Start Aptitude Round
                </button>
              )}
              {interviewData.selectedRounds?.includes("technical") && 
               !filteredRounds.technical && (
                <button
                  onClick={() => navigate("/technical-round")}
                  className="bg-orange-600 px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Start Technical Round
                </button>
              )}
              {interviewData.selectedRounds?.includes("coding") && 
               !filteredRounds.coding && (
                <button
                  onClick={() => navigate("/coding-round")}
                  className="bg-purple-600 px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Coding Round
                </button>
              )}
              {interviewData.selectedRounds?.includes("hr") && 
               !filteredRounds.hr && (
                <button
                  onClick={() => navigate("/hr-round")}
                  className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start HR Round
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import Navbar from "../components/Navbar";  

// export default function InterviewPage() {
//   const [interviewData, setInterviewData] = useState(null);
//   const [feedback, setFeedback] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const navigate = useNavigate();
//   const API = "http://localhost:5000/api";

//   // In InterviewPage.js - ADD THIS CODE after line 11 (after state declarations but before useEffects)

// // 🔧 FIX 8: Add data sync function
// const syncInterviewData = async () => {
//   const userId = localStorage.getItem("userId");
//   const interviewId = localStorage.getItem("interviewId");
  
//   if (!interviewId && userId) {
//     try {
//       const response = await axios.get(`http://localhost:5000/api/interview/results/user/${userId}`);
//       if (response.data.success) {
//         localStorage.setItem("interviewId", response.data.interview.interviewId);
//         setInterviewData(response.data.interview);
//         setFeedback(response.data.feedback);
//       }
//     } catch (error) {
//       console.warn("Data sync failed:", error);
//     }
//   }
// };

// // THEN MODIFY your existing useEffect on line 14 to call this:
// useEffect(() => {
//   syncInterviewData(); // Add this line
//   loadInterviewData(); // Keep this line
// }, []);
//   // In InterviewPage.js - ADD THIS CODE after line 14 (after the existing useEffect)

// // 🔧 FIX 6: Add data consistency logic
// useEffect(() => {
//   const checkDataConsistency = async () => {
//     const interviewId = localStorage.getItem("interviewId");
//     const userId = localStorage.getItem("userId");
    
//     if (!interviewId && userId) {
//       // Try to find latest interview by userId
//       try {
//         const response = await axios.get(`http://localhost:5000/api/interview/results/user/${userId}`);
//         if (response.data.success && response.data.interview) {
//           localStorage.setItem("interviewId", response.data.interview.interviewId);
//           setInterviewData(response.data.interview);
//           setFeedback(response.data.feedback);
//         }
//       } catch (error) {
//         console.warn("Could not sync interview data:", error);
//       }
//     }
//   };

//   checkDataConsistency();
// }, []);

// // KEEP YOUR EXISTING loadInterviewData function below this

//   const loadInterviewData = async () => {
//     try {
//       setLoading(true);
//       const userId = localStorage.getItem("userId");
//       const interviewId = localStorage.getItem("interviewId");

//       console.log("🔄 Loading interview data for:", { interviewId, userId });

//       let interviewResponse = null;
//       let feedbackResponse = null;

//       // Try to get data from backend first by interviewId
//       if (interviewId) {
//         try {
//           interviewResponse = await axios.get(`${API}/interview/results/${interviewId}`);
//           console.log("✅ Interview data loaded from backend:", interviewResponse.data);
          
//           if (interviewResponse.data.success) {
//             setInterviewData(interviewResponse.data.interview);
            
//             // Try to load feedback separately
//             try {
//               feedbackResponse = await axios.get(`${API}/interview/feedback?interviewId=${interviewId}`);
//               if (feedbackResponse.data.success) {
//                 setFeedback(feedbackResponse.data.feedback);
//               }
//             } catch (feedbackError) {
//               console.log("No feedback available yet");
//             }
            
//             setLoading(false);
//             return;
//           }
//         } catch (interviewError) {
//           console.log("❌ Could not fetch interview by ID, trying user ID:", interviewError.message);
//         }
//       }

//       // Fallback to userId if interviewId fails
//       if (userId && !interviewResponse) {
//         try {
//           interviewResponse = await axios.get(`${API}/interview/results/user/${userId}`);
//           console.log("✅ Interview data loaded by user ID:", interviewResponse.data);
          
//           if (interviewResponse.data.success) {
//             setInterviewData(interviewResponse.data.interview);
//             setFeedback(interviewResponse.data.feedback);
//             setLoading(false);
//             return;
//           }
//         } catch (userError) {
//           console.log("❌ Could not fetch by user ID either:", userError.message);
//         }
//       }

//       // Final fallback to localStorage data
//       console.log("📦 Using localStorage fallback data");
//       const role = localStorage.getItem("role");
//       const selectedRounds = JSON.parse(localStorage.getItem("selectedRounds") || "[]");
//       const startTime = localStorage.getItem("startTime");
//       const lastRound = localStorage.getItem("lastRound");
//       const lastScore = localStorage.getItem("lastScore");
      
//       if (role && selectedRounds.length > 0) {
//         setInterviewData({
//           userId,
//           interviewId,
//           role,
//           selectedRounds,
//           lastRound,
//           lastScore,
//           startTime,
//           status: "active",
//           rounds: {},
//           overall: { averageScore: lastScore || 0, status: "In Progress" },
//           completedRounds: lastRound ? [lastRound] : []
//         });
//       }
//     } catch (error) {
//       console.error("❌ Error loading interview data:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const refreshData = async () => {
//     setRefreshing(true);
//     await loadInterviewData();
//     setTimeout(() => setRefreshing(false), 1000);
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return "N/A";
//     try {
//       return new Date(dateString).toLocaleString();
//     } catch {
//       return "N/A";
//     }
//   };

//   const calculateDuration = () => {
//     const startTime = interviewData?.startTime;
//     const endTime = interviewData?.endTime;
    
//     if (!startTime) return "N/A";
    
//     const start = new Date(startTime);
//     const end = endTime ? new Date(endTime) : new Date();
//     const diffMs = end - start;
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffHours = Math.floor(diffMins / 60);
    
//     if (diffHours > 0) {
//       return `${diffHours}h ${diffMins % 60}m`;
//     }
//     return `${diffMins}m`;
//   };

//   const getStatusColor = (status) => {
//     return status === "completed" ? "text-green-400" : "text-yellow-400";
//   };

//   // Calculate rounds completed properly
//   const roundsCompleted = interviewData?.completedRounds?.length || 0;
//   const totalRounds = interviewData?.selectedRounds?.length || 0;

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
//           <p>Loading Interview Data...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!interviewData) {
//     return (
//       <div className="min-h-screen bg-gray-900 text-white p-8">
//         <div className="max-w-4xl mx-auto text-center">
//           <h1 className="text-3xl font-bold mb-4">No Active Interview</h1>
//           <p className="text-gray-400 mb-8">Start a new interview from the dashboard</p>
//           <button
//             onClick={() => navigate("/dashboard")}
//             className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Go to Dashboard
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//      <div className="min-h-screen bg-gray-900 text-white">
//     <Navbar />
//     <div className="min-h-screen bg-gray-900 text-white p-6">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
//           <div>
//             <h1 className="text-3xl font-bold text-white">Interview Summary</h1>
//             <p className="text-gray-400">Detailed overview of your interview performance</p>
//           </div>
//           <div className="flex gap-4">
//             <button
//               onClick={refreshData}
//               disabled={refreshing}
//               className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
//             >
//               {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
//             </button>
//             <button
//               onClick={() => navigate("/dashboard")}
//               className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
//             >
//               📊 Back to Dashboard
//             </button>
//           </div>
//         </div>
//         </div>
        

//         {/* Basic Info */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
//             <h3 className="text-lg font-semibold mb-2">User ID</h3>
//             <p className="text-gray-300 font-mono text-sm">{interviewData.userId}</p>
//           </div>
//           <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
//             <h3 className="text-lg font-semibold mb-2">Role</h3>
//             <p className="text-gray-300">{interviewData.role}</p>
//           </div>
//           <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
//             <h3 className="text-lg font-semibold mb-2">Status</h3>
//             <p className={`font-semibold text-lg ${getStatusColor(interviewData.status)}`}>
//               {interviewData.status?.toUpperCase() || "ACTIVE"}
//             </p>
//           </div>
//         </div>

//         {/* Overall Performance */}
//         <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
//           <h2 className="text-2xl font-bold mb-6">Overall Performance</h2>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div className="text-center">
//               <h3 className="text-lg font-semibold mb-2">Average Score</h3>
//               <p className="text-4xl font-bold text-blue-400">
//                 {interviewData.overall?.averageScore || 0}%
//               </p>
//             </div>
//             <div className="text-center">
//               <h3 className="text-lg font-semibold mb-2">Rounds Completed</h3>
//               <div className="text-gray-400">Rounds Completed</div>
//               <div className="text-white font-semibold">
//                 {interviewData?.completedRounds?.length || 0} / {interviewData?.selectedRounds?.length || 1}
//               </div>
//             </div>
//             <div className="text-center">
//               <h3 className="text-lg font-semibold mb-2">Duration</h3>
//               <p className="text-2xl text-gray-300">{calculateDuration()}</p>
//             </div>
//           </div>
//         </div>

//         {/* AI Feedback Section */}
//         {feedback && (
//           <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
//             <h2 className="text-2xl font-bold mb-4">AI Feedback & Analysis</h2>
//             <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500/30">
//               <div className="space-y-4">
//                 {feedback.averageScore && (
//                   <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
//                     <span className="text-gray-300 font-semibold">Overall Score</span>
//                     <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
//                       {feedback.averageScore}%
//                     </span>
//                   </div>
//                 )}
//                 {feedback.finalFeedback && (
//                   <div className="p-4 bg-black/20 rounded-xl">
//                     <h4 className="text-cyan-300 font-semibold mb-2">Overall Assessment</h4>
//                     <p className="text-gray-200 leading-relaxed">{feedback.finalFeedback}</p>
//                   </div>
//                 )}
//                 {feedback.improvement && (
//                   <div className="p-4 bg-black/20 rounded-xl">
//                     <h4 className="text-orange-300 font-semibold mb-2">Areas for Improvement</h4>
//                     <p className="text-gray-200 leading-relaxed">{feedback.improvement}</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Rounds Summary */}
//         <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
//           <h2 className="text-2xl font-bold mb-4">Rounds Summary</h2>
//           <div className="space-y-4">
//             {/* Show completed rounds */}
//             {interviewData.rounds && Object.entries(interviewData.rounds).map(([roundType, roundData]) => (
//               <div key={roundType} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
//                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
//                   <h3 className="text-lg font-semibold capitalize">{roundType} Round</h3>
//                   <div className="flex gap-2">
//                     <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
//                       Completed
//                     </span>
//                     <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">
//                       Score: {roundData.score || 0}%
//                     </span>
//                   </div>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
//                   <div>
//                     <span className="font-semibold">Submitted:</span> {formatDate(roundData.submittedAt)}
//                   </div>
//                   <div>
//                     <span className="font-semibold">Questions:</span> {roundData.questions?.length || 0}
//                   </div>
//                 </div>
//               </div>
//             ))}
            
//             {/* Show pending rounds */}
//             {interviewData.selectedRounds?.map((roundType, index) => {
//               const isCompleted = interviewData.rounds && interviewData.rounds[roundType];
//               if (!isCompleted) {
//                 return (
//                   <div key={index} className="bg-gray-700 p-4 rounded-lg border border-gray-600 opacity-75">
//                     <div className="flex justify-between items-center">
//                       <h3 className="text-lg font-semibold capitalize">{roundType} Round</h3>
//                       <span className="bg-gray-600 px-3 py-1 rounded-full text-sm">
//                         Pending
//                       </span>
//                     </div>
//                     <p className="text-gray-400 text-sm mt-2">This round has not been started yet.</p>
//                   </div>
//                 );
//               }
//               return null;
//             })}
//           </div>
//         </div>

//         {/* Interview Details */}
//         <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
//           <h2 className="text-2xl font-bold mb-4">Interview Details</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <h3 className="font-semibold mb-2">Selected Rounds</h3>
//               <p className="text-gray-300">
//                 {interviewData.selectedRounds?.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ") || "N/A"}
//               </p>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-2">Start Time</h3>
//               <p className="text-gray-300">{formatDate(interviewData.startTime)}</p>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-2">End Time</h3>
//               <p className="text-gray-300">
//                 {interviewData.endTime ? formatDate(interviewData.endTime) : "Interview in progress"}
//               </p>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-2">Total Duration</h3>
//               <p className="text-gray-300">
//                 {interviewData.status === "completed" ? "Completed" : "In Progress"} • {calculateDuration()}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Continue Buttons */}
//         {interviewData.status === "active" && (
//           <div className="mt-8 flex gap-4 justify-center">
//             {interviewData.selectedRounds?.includes("aptitude") && 
//              !interviewData.rounds?.aptitude && (
//               <button
//                 onClick={() => navigate("/aptitude")}
//                 className="bg-cyan-600 px-6 py-3 rounded-lg hover:bg-cyan-700 transition-colors"
//               >
//                 Start Aptitude Round
//               </button>
//             )}
//             {interviewData.selectedRounds?.includes("technical") && 
//              !interviewData.rounds?.technical && (
//               <button
//                 onClick={() => navigate("/technical")}
//                 className="bg-orange-600 px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
//               >
//                 Start Technical Round
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";

// export default function InterviewPage() {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const userId = localStorage.getItem("userId");
//   const API_BASE = "http://localhost:5000";

//   const fetchInterview = async () => {
//     if (!userId) {
//       setError("❌ User not found — please start an interview.");
//       return;
//     }

//     setLoading(true);
//     setError("");
//     try {
//       const res = await axios.get(`${API_BASE}/api/interview/results?userId=${userId}`);
//       if (!res.data.success) {
//         setError("❌ No interview record found.");
//         setData(null);
//         return;
//       }

//       // Remove duplicate rounds by unique _id
//       const uniqueRounds = Array.from(
//         new Map(res.data.rounds.map((r) => [r._id, r])).values()
//       );

//       // Calculate average score
//       const avgScore =
//         uniqueRounds.length > 0
//           ? Math.round(
//               uniqueRounds.reduce((acc, r) => acc + (r.score || 0), 0) / uniqueRounds.length
//             )
//           : 0;

//       setData({
//         userId: res.data.userId,
//         role: res.data.role,
//         rounds: uniqueRounds,
//         averageScore: avgScore,
//         overallFeedback: res.data.overallFeedback || "",
//       });
//     } catch (err) {
//       console.error("Fetch error:", err);
//       setError("❌ Server error — ensure backend is running.");
//       setData(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchInterview();
//   }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   if (!userId)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-black text-white">
//         <h2 className="text-xl">⚠ No interview started. Please go back.</h2>
//       </div>
//     );

//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-black text-white">
//         Loading...
//       </div>
//     );

//   return (
//     <div className="min-h-screen bg-black text-white p-6">
//       <div className="max-w-4xl mx-auto space-y-6">
//         <h1 className="text-3xl font-bold text-cyan-400">Interview Summary</h1>

//         <div className="flex gap-3">
//           <button
//             onClick={fetchInterview}
//             className="px-4 py-2 bg-cyan-500 text-black rounded font-semibold"
//           >
//             Refresh
//           </button>
//           <button
//             onClick={() => navigate("/dashboard")}
//             className="px-4 py-2 bg-gray-800 rounded border border-gray-700"
//           >
//             Back to Dashboard
//           </button>
//         </div>

//         {error && <p className="text-red-400">{error}</p>}

//         {!data ? (
//           <p className="text-gray-400">No results yet.</p>
//         ) : (
//           <div className="bg-gray-900 p-6 rounded space-y-4">
//             {/* User Info */}
//             <div>
//               <p className="text-sm text-gray-400">User ID</p>
//               <p className="text-lg font-semibold">{data.userId}</p>
//               <p className="text-sm text-gray-400">Role: {data.role}</p>
//             </div>

//             {/* Average Score */}
//             <div>
//               <h3 className="font-semibold text-cyan-300">Average Score</h3>
//               <p className="text-3xl font-bold text-green-400">{data.averageScore}%</p>
//               {data.overallFeedback && (
//                 <p className="italic text-gray-300 mt-1">{data.overallFeedback}</p>
//               )}
//             </div>

//             {/* Rounds Summary */}
//             <div>
//               <h3 className="font-semibold text-cyan-300">Rounds Summary</h3>
//               {data.rounds.length === 0 ? (
//                 <p className="text-gray-400">No rounds submitted.</p>
//               ) : (
//                 <div className="space-y-4 mt-2">
//                   {data.rounds.map((r, i) => (
//                     <div key={r._id || i} className="bg-gray-800 p-4 rounded border border-gray-700">
//                       <div className="flex justify-between">
//                         <div>
//                           <p className="text-xs text-gray-400">
//                             {new Date(r.completedAt || r.createdAt).toLocaleString()}
//                           </p>
//                           <p className="text-lg font-semibold text-cyan-300">{r.roundType}</p>
//                         </div>

//                         <div className="text-right">
//                           <p className="text-xs text-gray-400">Score</p>
//                           <p className="text-2xl font-bold text-green-300">{r.score ?? 0}%</p>
//                         </div>
//                       </div>

//                       {r.feedback && (
//                         <div className="grid md:grid-cols-2 gap-4 mt-3 text-sm">
//                           <div className="bg-gray-900 p-3 rounded">
//                             <p className="text-xs text-gray-400">Strength</p>
//                             <p>{r.feedback.strength || "—"}</p>
//                           </div>
//                           <div className="bg-gray-900 p-3 rounded">
//                             <p className="text-xs text-gray-400">Improvement</p>
//                             <p>{r.feedback.improvement || "—"}</p>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Debug Data */}
//             <div>
//               <h3 className="font-semibold text-cyan-300">Debug Data</h3>
//               <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto">
//                 {JSON.stringify(data, null, 2)}
//               </pre>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



// // client/src/pages/InterviewPage.js
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";

// export default function InterviewPage() {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const userId = localStorage.getItem("userId");
//   const API_BASE = "http://localhost:5000";

//   const fetchInterview = async () => {
//     if (!userId) {
//       setError("❌ User not found — please start an interview.");
//       return;
//     }

//     setLoading(true);
//     setError("");

//     try {
//       const res = await axios.get(`${API_BASE}/api/interview/results?userId=${userId}`);

//       if (!res.data.success) {
//         setError("❌ No interview record found.");
//         setData(null);
//       } else {
//         setData({
//           userId: res.data.userId,
//           role: res.data.role,
//           rounds: res.data.rounds || [],
//           averageScore: res.data.averageScore || 0,
//           overallFeedback: res.data.overallFeedback || ""
//         });
//       }
//     } catch (err) {
//       console.error("Fetch error:", err);
//       setError("❌ Server error — ensure backend is running.");
//       setData(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchInterview(); }, []);

//   if (!userId) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-black text-white">
//         <h2 className="text-xl">⚠ No interview started. Please go back.</h2>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-black text-white">
//         Loading...
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-6">
//       <div className="max-w-4xl mx-auto space-y-6">

//         <h1 className="text-3xl font-bold text-cyan-400">Interview Summary</h1>

//         <div className="flex gap-3">
//           <button
//             onClick={fetchInterview}
//             className="px-4 py-2 bg-cyan-500 text-black rounded font-semibold"
//           >
//             Refresh
//           </button>

//           <button
//             onClick={() => navigate("/dashboard")}
//             className="px-4 py-2 bg-gray-800 rounded border border-gray-700"
//           >
//             Back to Dashboard
//           </button>
//         </div>

//         {error && <p className="text-red-400">{error}</p>}

//         {!data ? (
//           <p className="text-gray-400">No results yet.</p>
//         ) : (
//           <div className="bg-gray-900 p-6 rounded space-y-4">

//             <div>
//               <p className="text-sm text-gray-400">User ID</p>
//               <p className="text-lg font-semibold">{data.userId}</p>
//               <p className="text-sm text-gray-400">Role: {data.role}</p>
//             </div>

//             <div>
//               <h3 className="font-semibold text-cyan-300">Average Score</h3>
//               <p className="text-3xl font-bold text-green-400">{data.averageScore}%</p>
//               {data.overallFeedback && (
//                 <p className="italic text-gray-300 mt-1">{data.overallFeedback}</p>
//               )}
//             </div>

//             <div>
//               <h3 className="font-semibold text-cyan-300">Rounds Summary</h3>
//               {data.rounds.length === 0 ? (
//                 <p className="text-gray-400">No rounds submitted.</p>
//               ) : (
//                 <div className="space-y-4 mt-2">
//                   {data.rounds.map((r, i) => (
//                     <div key={i} className="bg-gray-800 p-4 rounded border border-gray-700">
//                       <div className="flex justify-between">
//                         <div>
//                           <p className="text-xs text-gray-400">{new Date(r.date).toLocaleString()}</p>
//                           <p className="text-lg font-semibold text-cyan-300">{r.roundType}</p>
//                         </div>

//                         <div className="text-right">
//                           <p className="text-xs text-gray-400">Score</p>
//                           <p className="text-2xl font-bold text-green-300">{r.score}%</p>
//                         </div>
//                       </div>

//                       {r.feedback && (
//                         <div className="grid md:grid-cols-2 gap-4 mt-3 text-sm">
//                           <div className="bg-gray-900 p-3 rounded">
//                             <p className="text-xs text-gray-400">Strength</p>
//                             <p>{r.feedback.strength}</p>
//                           </div>
//                           <div className="bg-gray-900 p-3 rounded">
//                             <p className="text-xs text-gray-400">Improvement</p>
//                             <p>{r.feedback.improvement}</p>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             <div>
//               <h3 className="font-semibold text-cyan-300">Debug Data</h3>
//               <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto">
//                 {JSON.stringify(data, null, 2)}
//               </pre>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
